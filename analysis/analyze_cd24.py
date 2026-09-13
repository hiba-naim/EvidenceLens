import csv
import gzip
import json
import re
from io import StringIO
from pathlib import Path

import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
import seaborn as sns
from scipy.stats import wilcoxon


PROJECT_ROOT = Path(__file__).resolve().parents[1]
DATA_DIR = PROJECT_ROOT / "data" / "datasets"
OUTPUT_DIR = PROJECT_ROOT / "analysis" / "outputs"

MATRIX_PATH = DATA_DIR / "GSE15852_series_matrix.txt.gz"
ANNOTATION_PATH = DATA_DIR / "GPL96.annot.gz"

GENE = "CD24"


def read_series_matrix():
    """Read sample metadata and the expression table from the GEO file."""

    sample_titles = []
    matrix_lines = []
    inside_matrix = False

    with gzip.open(MATRIX_PATH, "rt", encoding="utf-8") as file:
        for line in file:
            if line.startswith("!Sample_title"):
                sample_titles = next(csv.reader([line], delimiter="\t"))[1:]
                sample_titles = [title.strip('"') for title in sample_titles]

            elif line.startswith("!series_matrix_table_begin"):
                inside_matrix = True

            elif line.startswith("!series_matrix_table_end"):
                inside_matrix = False

            elif inside_matrix:
                matrix_lines.append(line)

    expression = pd.read_csv(
        StringIO("".join(matrix_lines)),
        sep="\t",
        index_col=0,
    )

    expression.index = expression.index.astype(str)
    expression.columns = [column.strip('"') for column in expression.columns]

    return expression, sample_titles


def read_platform_annotation():
    """Read the GPL96 probe-to-gene annotation table."""

    annotation_lines = []
    table_started = False

    with gzip.open(ANNOTATION_PATH, "rt", encoding="utf-8") as file:
        for line in file:
            if line.startswith("ID\t"):
                table_started = True

            if table_started and not line.startswith("!"):
                annotation_lines.append(line)

    return pd.read_csv(
        StringIO("".join(annotation_lines)),
        sep="\t",
        dtype=str,
        low_memory=False,
    )


def main():
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    expression, sample_titles = read_series_matrix()
    annotation = read_platform_annotation()

    cd24_annotation = annotation[
        annotation["Gene symbol"].fillna("").eq(GENE)
    ]

    cd24_probes = cd24_annotation["ID"].tolist()

    if not cd24_probes:
        raise ValueError("No CD24 probes were found in the GPL96 annotation.")

    available_probes = [
        probe for probe in cd24_probes if probe in expression.index
    ]

    if not available_probes:
        raise ValueError("The CD24 probes were not found in the expression matrix.")

    # Microarray intensities are right-skewed, so transform them to log2 scale.
    cd24_log2 = np.log2(expression.loc[available_probes].astype(float) + 1)

    # CD24 has several probes. Use their median for each sample.
    gene_expression = cd24_log2.median(axis=0)

    records = []

    for sample_accession, sample_title in zip(
        expression.columns,
        sample_titles,
    ):
        patient_match = re.search(r"BC\d+", sample_title)

        if not patient_match:
            raise ValueError(f"Could not find patient ID in {sample_title}")

        group = "Normal" if sample_title.startswith("Normal") else "Tumor"

        records.append(
            {
                "patient_id": patient_match.group(),
                "sample_accession": sample_accession,
                "sample_title": sample_title,
                "group": group,
                "cd24_log2_expression": gene_expression[sample_accession],
            }
        )

    long_data = pd.DataFrame(records)

    paired_data = long_data.pivot(
        index="patient_id",
        columns="group",
        values="cd24_log2_expression",
    ).dropna()

    if len(paired_data) != 43:
        raise ValueError(
            f"Expected 43 complete pairs, but found {len(paired_data)}."
        )

    statistic, p_value = wilcoxon(
        paired_data["Tumor"],
        paired_data["Normal"],
        alternative="two-sided",
    )

    paired_differences = paired_data["Tumor"] - paired_data["Normal"]
    median_log2_difference = float(paired_differences.median())
    median_fold_change = float(2 ** median_log2_difference)

    tumor_higher_count = int((paired_differences > 0).sum())

    supports_claim = bool(
        median_log2_difference > 0
        and p_value < 0.05
    )

    results = {
        "dataset": "GSE15852",
        "gene": GENE,
        "platform": "GPL96",
        "probe_ids": available_probes,
        "pair_count": int(len(paired_data)),
        "normal_median_log2_expression": float(
            paired_data["Normal"].median()
        ),
        "tumor_median_log2_expression": float(
            paired_data["Tumor"].median()
        ),
        "median_paired_log2_difference": median_log2_difference,
        "median_paired_fold_change": median_fold_change,
        "tumor_higher_pair_count": tumor_higher_count,
        "wilcoxon_statistic": float(statistic),
        "p_value": float(p_value),
        "supports_claim": supports_claim,
    }

    long_data.to_csv(
        OUTPUT_DIR / "cd24_expression_by_sample.csv",
        index=False,
    )

    with open(
        OUTPUT_DIR / "cd24_results.json",
        "w",
        encoding="utf-8",
    ) as file:
        json.dump(results, file, indent=2)

    sns.set_theme(style="whitegrid")
    plt.figure(figsize=(9, 6))

    for patient_id, row in paired_data.iterrows():
        plt.plot(
            ["Normal", "Tumor"],
            [row["Normal"], row["Tumor"]],
            color="#91a7a2",
            alpha=0.45,
            linewidth=1,
        )

    sns.pointplot(
        data=long_data,
        x="group",
        y="cd24_log2_expression",
        order=["Normal", "Tumor"],
        color="#197566",
        markers="D",
        errorbar=("ci", 95),
    )

    plt.title("CD24 expression in paired breast tissues")
    plt.xlabel("")
    plt.ylabel("Median CD24 probe expression (log2)")
    plt.tight_layout()

    plt.savefig(
        OUTPUT_DIR / "cd24_paired_expression.png",
        dpi=300,
    )

    plt.close()

    print("CD24 analysis completed successfully.")
    print(f"CD24 probes: {', '.join(available_probes)}")
    print(f"Complete patient pairs: {len(paired_data)}")
    print(f"Tumor higher in: {tumor_higher_count}/43 pairs")
    print(f"Median paired fold change: {median_fold_change:.3f}")
    print(f"Wilcoxon p-value: {p_value:.6g}")
    print(f"Dataset supports claim: {supports_claim}")


if __name__ == "__main__":
    main()