import csv
import json
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse


app = FastAPI(
    title="EvidenceLens API",
    description="Backend API for biomedical claim investigation.",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


PROJECT_ROOT = Path(__file__).resolve().parents[1]

PAPERS_PATH = (
    PROJECT_ROOT / "data" / "metadata" / "papers.csv"
)

RESULTS_PATH = (
    PROJECT_ROOT / "analysis" / "outputs" / "cd24_results.json"
)

PLOT_PATH = (
    PROJECT_ROOT / "analysis" / "outputs" / "cd24_paired_expression.png"
)


def read_papers():
    if not PAPERS_PATH.exists():
        raise FileNotFoundError("The papers.csv file was not found.")

    with open(PAPERS_PATH, encoding="utf-8-sig", newline="") as file:
        return list(csv.DictReader(file))


@app.get("/")
def root():
    return {
        "name": "EvidenceLens API",
        "status": "running",
    }


@app.get("/health")
def health_check():
    return {"status": "healthy"}


@app.get("/papers")
def get_papers():
    try:
        papers = read_papers()
    except FileNotFoundError as error:
        raise HTTPException(
            status_code=404,
            detail=str(error),
        ) from error

    return {
        "count": len(papers),
        "papers": papers,
    }


@app.get("/analysis/cd24")
def get_cd24_analysis():
    if not RESULTS_PATH.exists():
        raise HTTPException(
            status_code=404,
            detail="CD24 analysis results were not found.",
        )

    with open(RESULTS_PATH, encoding="utf-8") as file:
        results = json.load(file)

    results["plot_url"] = (
        "http://127.0.0.1:8000/analysis/cd24/plot"
    )

    results["interpretation"] = (
        "CD24 expression was higher in 41 of 43 paired breast tumors. "
        "The median paired increase was approximately 6.1-fold, and the "
        "paired Wilcoxon test indicated strong statistical evidence of "
        "a difference. Within GSE15852, the data support the claim."
    )

    results["validation_type"] = (
        "Computational reproduction using the dataset associated with "
        "the supporting publication; not an independent external validation."
    )

    return results


@app.get("/analysis/cd24/plot")
def get_cd24_plot():
    if not PLOT_PATH.exists():
        raise HTTPException(
            status_code=404,
            detail="CD24 analysis plot was not found.",
        )

    return FileResponse(
        PLOT_PATH,
        media_type="image/png",
        filename="cd24_paired_expression.png",
    )