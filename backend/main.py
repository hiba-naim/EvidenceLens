import csv
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware


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


# main.py is inside backend/.
# parent.parent moves from backend/main.py to the EvidenceLens folder.
PROJECT_ROOT = Path(__file__).resolve().parent.parent
PAPERS_FILE = PROJECT_ROOT / "data" / "metadata" / "papers.csv"


def load_papers() -> list[dict]:
    """Read all paper records from the CSV file."""

    if not PAPERS_FILE.exists():
        raise FileNotFoundError("The papers.csv file was not found.")

    with PAPERS_FILE.open(
        mode="r",
        encoding="utf-8-sig",
        newline="",
    ) as csv_file:
        return list(csv.DictReader(csv_file))


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
        papers = load_papers()
    except FileNotFoundError as error:
        raise HTTPException(status_code=404, detail=str(error)) from error

    return {
        "count": len(papers),
        "papers": papers,
    }