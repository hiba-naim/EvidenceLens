import re

from sklearn.feature_extraction.text import (
    ENGLISH_STOP_WORDS,
    TfidfVectorizer,
)
from sklearn.metrics.pairwise import cosine_similarity


SEARCH_FIELDS = (
    "title",
    "gene",
    "study_type",
    "population",
    "biological_material",
    "measurement_method",
    "main_finding",
    "evidence_passage",
)


def tokenize(text):
    tokens = set(
        re.findall(
            r"[a-zA-Z0-9]+",
            text.lower(),
        )
    )

    return tokens - ENGLISH_STOP_WORDS

def build_paper_document(paper):
    field_values = [
        paper.get(field, "").strip()
        for field in SEARCH_FIELDS
    ]

    return " ".join(
        value
        for value in field_values
        if value
    )


def find_relevant_papers(
    claim,
    papers,
    minimum_score=0.10,
):
    if not papers:
        return []

    documents = [
        build_paper_document(paper)
        for paper in papers
    ]

    vectorizer = TfidfVectorizer(
        stop_words="english",
        ngram_range=(1, 2),
    )

    matrix = vectorizer.fit_transform(
        [claim, *documents]
    )

    claim_vector = matrix[0:1]
    paper_vectors = matrix[1:]

    similarity_scores = cosine_similarity(
        claim_vector,
        paper_vectors,
    ).flatten()

    known_genes = {
        paper.get("gene", "").strip().upper()
        for paper in papers
        if paper.get("gene", "").strip()
    }

    claim_upper = claim.upper()

    mentioned_genes = {
        gene
        for gene in known_genes
        if re.search(
            rf"\b{re.escape(gene)}\b",
            claim_upper,
        )
    }

    claim_terms = tokenize(claim)
    relevant_papers = []

    for paper, similarity in zip(
        papers,
        similarity_scores,
    ):
        paper_gene = (
            paper.get("gene", "")
            .strip()
            .upper()
        )

        if (
            mentioned_genes
            and paper_gene not in mentioned_genes
        ):
            continue

        score = float(similarity)

        if paper_gene in mentioned_genes:
            score += 0.35

        if score < minimum_score:
            continue

        document = build_paper_document(paper)
        matched_terms = sorted(
            claim_terms & tokenize(document)
        )

        result = dict(paper)
        result["relevance_score"] = round(
            min(score, 1.0),
            3,
        )
        result["matched_terms"] = matched_terms

        if matched_terms:
            result["match_explanation"] = (
                "Matched scientific terms: "
                + ", ".join(matched_terms)
                + "."
            )
        else:
            result["match_explanation"] = (
                "Matched the overall language "
                "of the claim."
            )

        relevant_papers.append(result)

    return sorted(
        relevant_papers,
        key=lambda paper: paper["relevance_score"],
        reverse=True,
    )