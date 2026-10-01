import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import "./App.css";
import StudyComparison from "./StudyComparison";

const DEFAULT_CLAIM =
  "CD24 expression is higher in primary breast carcinoma tissue than in patient-matched normal breast tissue.";

type Paper = {
  paper_id: string;
  title: string;
  authors: string;
  year: string;
  journal: string;
  source_url: string;
  study_type: string;
  population: string;
  sample_size: string;
  biological_material: string;
  gene: string;
  measurement_method: string;
  main_finding: string;
  evidence_passage: string;
  classification: string;
  classification_reason: string;
  limitations: string;
  relevance_score: number;
  matched_terms: string[];
  match_explanation: string;
};

type ClassificationCounts = {
  support: number;
  contradict: number;
  unclear: number;
  "not applicable": number;
  "not assessed": number;
};

type InvestigationResponse = {
  claim: string;
  total_screened: number;
  relevant_count: number;
  classification_counts: ClassificationCounts;
  papers: Paper[];
};

type AnalysisResult = {
  dataset: string;
  gene: string;
  pair_count: number;
  median_paired_fold_change: number;
  tumor_higher_pair_count: number;
  p_value: number;
  supports_claim: boolean;
  plot_url: string;
  interpretation: string;
  validation_type: string;
};

function App() {
  const [claimInput, setClaimInput] = useState(DEFAULT_CLAIM);
  const [submittedClaim, setSubmittedClaim] = useState("");
  const [papers, setPapers] = useState<Paper[]>([]);
  const [totalScreened, setTotalScreened] = useState(0);
  const [counts, setCounts] = useState<ClassificationCounts | null>(null);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  async function investigateClaim(claim: string) {
    setLoading(true);
    setError("");

    try {
      const investigationResponse = await fetch(
        "http://127.0.0.1:8000/investigate",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ claim }),
        },
      );

      if (!investigationResponse.ok) {
        throw new Error("The investigation request failed.");
      }

      const investigationData: InvestigationResponse =
        await investigationResponse.json();

      setSubmittedClaim(investigationData.claim);
      setPapers(investigationData.papers);
      setTotalScreened(investigationData.total_screened);
      setCounts(investigationData.classification_counts);

      if (
  claim.trim().toLowerCase()
  === DEFAULT_CLAIM.toLowerCase()
) {
        const analysisResponse = await fetch(
          "http://127.0.0.1:8000/analysis/cd24",
        );

        if (!analysisResponse.ok) {
          throw new Error("The dataset analysis could not be loaded.");
        }

        const analysisData: AnalysisResult =
          await analysisResponse.json();

        setAnalysis(analysisData);
      } else {
        setAnalysis(null);
      }
    } catch {
      setError(
        "Could not complete the investigation. Make sure the backend is running.",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    investigateClaim(DEFAULT_CLAIM);
  }, []);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const cleanedClaim = claimInput.trim();

    if (cleanedClaim.length < 10) {
      setError("Please enter a more specific biomedical claim.");
      return;
    }

    investigateClaim(cleanedClaim);
  }

  return (
    <main className="page">
      <header className="hero">
        <p className="eyebrow">BIOMEDICAL EVIDENCE INVESTIGATION</p>
        <h1>EvidenceLens</h1>
        <p className="description">
          Inspect the evidence behind biomedical claims instead of accepting
          simple answers.
        </p>
      </header>

      <section className="claim-panel">
        <p className="label">INVESTIGATE A CLAIM</p>

        <form className="claim-form" onSubmit={handleSubmit}>
          <label htmlFor="claim">Biomedical claim</label>

          <textarea
            id="claim"
            value={claimInput}
            onChange={(event) => setClaimInput(event.target.value)}
            rows={4}
            disabled={loading}
          />

          <div className="claim-actions">
            <span>{claimInput.trim().length} characters</span>

            <button type="submit" disabled={loading}>
              {loading ? "Investigating..." : "Investigate claim"}
            </button>
          </div>
        </form>
      </section>

      {error && <p className="error">{error}</p>}

      {!loading && !error && submittedClaim && (
        <>
          <section className="submitted-claim">
            <p className="label">CURRENT INVESTIGATION</p>
            <h2>{submittedClaim}</h2>
          </section>

          <section className="results">
            <div className="results-heading">
              <div>
                <p className="label">SCREENED LITERATURE</p>
                <h2>Evidence results</h2>
              </div>

              <span className="paper-count">
                {papers.length} relevant of {totalScreened} screened
              </span>
            </div>

            {counts && (
              <div className="evidence-summary">
                <span className="summary-support">
                  {counts.support} supporting
                </span>
                <span className="summary-contradict">
                  {counts.contradict} contradicting
                </span>
                <span className="summary-unclear">
                  {counts.unclear} unclear
                </span>
                <span className="summary-na">
                  {counts["not applicable"]} not applicable
                </span>
{counts["not assessed"] > 0 && (
  <span className="summary-not-assessed">
    {counts["not assessed"]} not assessed
  </span>
)}
              </div>
            )}

            {papers.length === 0 ? (
              <div className="empty-state">
                <h3>No relevant papers found</h3>
                <p>
                  The current pilot library may not contain evidence for this
                  claim.
                </p>
              </div>
            ) : (
              <div className="paper-grid">
                {papers.map((paper) => (
                  <article className="paper-card" key={paper.paper_id}>
                    <div className="card-top">
                      <span
                        className={`badge ${paper.classification.replace(
                          /\s+/g,
                          "-",
                        )}`}
                      >
                        {paper.classification}
                      </span>

                      <div className="paper-ranking">
  <span className="relevance-score">
    {Math.round(paper.relevance_score * 100)}% match
  </span>

  <span className="paper-id">{paper.paper_id}</span>
</div>
</div>

<h3>{paper.title}</h3>

                    <p className="citation">
                      {paper.authors} | {paper.journal} | {paper.year}
                    </p>
		<div className="retrieval-note">
  <strong>Why this paper matched</strong>
  <p>{paper.match_explanation}</p>
</div>

                    {paper.sample_size && (
                      <p>
                        <strong>Samples:</strong> {paper.sample_size}
                      </p>
                    )}

                    <p>
                      <strong>Finding:</strong> {paper.main_finding}
                    </p>

                    {paper.evidence_passage && (
                      <blockquote className="evidence-passage">
                        <strong>Evidence passage</strong>
                        <p>{paper.evidence_passage}</p>
                      </blockquote>
                    )}

                    <div className="reason">
                      <strong>Why this classification?</strong>
                      <p>{paper.classification_reason}</p>
                    </div>

                    <p className="limitation">
                      <strong>Limitation:</strong> {paper.limitations}
                    </p>

                    <a
                      href={paper.source_url}
                      target="_blank"
                      rel="noreferrer"
                    >
                      View original source
                    </a>
                  </article>
                ))}
                           </div>
            )}

            <StudyComparison
              key={submittedClaim}
              papers={papers}
            />
          </section>

          {analysis && (
            <section className="validation">
              <div className="validation-heading">
                <div>
                  <p className="label">GENE-EXPRESSION ANALYSIS</p>
                  <h2>Dataset validation</h2>
                </div>

                <span
                  className={
                    analysis.supports_claim
                      ? "conclusion supports"
                      : "conclusion does-not-support"
                  }
                >
                  {analysis.supports_claim
                    ? "Supports claim"
                    : "Does not support claim"}
                </span>
              </div>

              <div className="metrics">
                <div className="metric">
                  <span>Dataset</span>
                  <strong>{analysis.dataset}</strong>
                </div>

                <div className="metric">
                  <span>Matched pairs</span>
                  <strong>{analysis.pair_count}</strong>
                </div>

                <div className="metric">
                  <span>Tumour higher</span>
                  <strong>
                    {analysis.tumor_higher_pair_count}/{analysis.pair_count}
                  </strong>
                </div>

                <div className="metric">
                  <span>Median fold change</span>
                  <strong>
                    {analysis.median_paired_fold_change.toFixed(2)}x
                  </strong>
                </div>

                <div className="metric">
                  <span>Wilcoxon p-value</span>
                  <strong>{analysis.p_value.toExponential(2)}</strong>
                </div>
              </div>

              <div className="validation-content">
                <img
                  src={analysis.plot_url}
                  alt="Paired CD24 expression in normal and breast tumour tissues"
                />

                <div className="interpretation">
                  <h3>Interpretation</h3>
                  <p>{analysis.interpretation}</p>

                  <div className="method-note">
                    <strong>Validation note</strong>
                    <p>{analysis.validation_type}</p>
                  </div>
                </div>
              </div>
            </section>
          )}
        </>
      )}
    </main>
  );
}

export default App;