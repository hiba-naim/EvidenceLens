import csv
import json
import re
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from pydantic import BaseModel


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

class InvestigationRequest(BaseModel):
    claim: str


SEARCH_FIELDS = (
    "title",
    "gene",
    "main_finding",
    "evidence_passage",
    "classification_reason",
)

STOP_WORDS = {
    "a",
    "an",
    "and",
    "are",
    "as",
    "at",
    "be",
    "breast",
    "by",
    "cancer",
    "expression",
    "for",
    "from",
    "higher",
    "in",
    "is",
    "normal",
    "of",
    "patient",
    "primary",
    "than",
    "the",
    "tissue",
    "to",
    "tumor",
}


def extract_search_terms(claim):
    words = re.findall(r"[a-zA-Z0-9]+", claim.lower())

    return {
        word
        for word in words
        if len(word) > 2 and word not in STOP_WORDS
    }


def find_relevant_papers(claim, papers):
    claim_upper = claim.upper()

    known_genes = {
        paper["gene"].strip().upper()
        for paper in papers
        if paper.get("gene", "").strip()
    }

    mentioned_genes = {
        gene
        for gene in known_genes
        if re.search(
            rf"\b{re.escape(gene)}\b",
            claim_upper,
        )
    }

    if mentioned_genes:
        return [
            paper
            for paper in papers
            if paper.get("gene", "").strip().upper()
            in mentioned_genes
        ]

    search_terms = extract_search_terms(claim)
    relevant_papers = []

    for paper in papers:
        searchable_text = " ".join(
            paper.get(field, "")
            for field in SEARCH_FIELDS
        ).lower()

        matched_terms = {
            term
            for term in search_terms
            if term in searchable_text
        }

        if matched_terms:
            paper_with_score = dict(paper)
            paper_with_score["matched_terms"] = sorted(
                matched_terms
            )
            paper_with_score["relevance_score"] = len(
                matched_terms
            )
            relevant_papers.append(paper_with_score)

    return sorted(
        relevant_papers,
        key=lambda paper: paper.get(
            "relevance_score",
            0,
        ),
        reverse=True,
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

@app.post("/investigate")
def investigate_claim(request: InvestigationRequest):
    claim = request.claim.strip()

    if len(claim) < 10:
        raise HTTPException(
            status_code=400,
            detail="Please enter a more specific claim.",
        )

    try:
        papers = read_papers()
    except FileNotFoundError as error:
        raise HTTPException(
            status_code=404,
            detail=str(error),
        ) from error

    relevant_papers = find_relevant_papers(
        claim,
        papers,
    )

    classification_counts = {
        "support": 0,
        "contradict": 0,
        "unclear": 0,
        "not applicable": 0,
    }

    for paper in relevant_papers:
        classification = paper.get(
            "classification",
            "",
        ).strip().lower()

        if classification in classification_counts:
            classification_counts[classification] += 1

    return {
        "claim": claim,
        "total_screened": len(papers),
        "relevant_count": len(relevant_papers),
        "classification_counts": classification_counts,
        "papers": relevant_papers,
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