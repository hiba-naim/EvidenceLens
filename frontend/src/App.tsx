import { useEffect, useState } from "react";
import "./App.css";

type Paper = {
  paper_id: string;
  title: string;
  authors: string;
  year: string;
  journal: string;
  source_url: string;
  sample_size: string;
  main_finding: string;
  classification: string;
  classification_reason: string;
  limitations: string;
};

type PapersResponse = {
  count: number;
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
  const [papers, setPapers] = useState<Paper[]>([]);
  const [analysis, setAnalysis] = useState<AnalysisResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadInvestigation() {
      try {
        const [papersResponse, analysisResponse] = await Promise.all([
          fetch("http://127.0.0.1:8000/papers"),
          fetch("http://127.0.0.1:8000/analysis/cd24"),
        ]);

        if (!papersResponse.ok || !analysisResponse.ok) {
          throw new Error("The backend returned an error.");
        }

        const papersData: PapersResponse = await papersResponse.json();
        const analysisData: AnalysisResult = await analysisResponse.json();

        setPapers(papersData.papers);
        setAnalysis(analysisData);
      } catch {
        setError("Could not load the EvidenceLens investigation.");
      } finally {
        setLoading(false);
      }
    }

    loadInvestigation();
  }, []);

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
        <p className="label">PILOT CLAIM</p>
        <h2>
          CD24 expression is higher in primary breast carcinoma tissue than in
          patient-matched normal breast tissue.
        </h2>
      </section>

      {loading && <p className="status-message">Loading investigation…</p>}
      {error && <p className="error">{error}</p>}

      {!loading && !error && (
        <>
          <section className="results">
            <div className="results-heading">
              <div>
                <p className="label">SCREENED LITERATURE</p>
                <h2>Evidence results</h2>
              </div>

              <span className="paper-count">{papers.length} papers</span>
            </div>

            <div className="paper-grid">
              {papers.map((paper) => (
                <article className="paper-card" key={paper.paper_id}>
                  <div className="card-top">
                    <span className={`badge ${paper.classification}`}>
                      {paper.classification}
                    </span>

                    <span className="paper-id">{paper.paper_id}</span>
                  </div>

                  <h3>{paper.title}</h3>

                  <p className="citation">
                    {paper.authors} · {paper.journal} · {paper.year}
                  </p>

                  {paper.sample_size && (
                    <p>
                      <strong>Samples:</strong> {paper.sample_size}
                    </p>
                  )}

                  <p>
                    <strong>Finding:</strong> {paper.main_finding}
                  </p>

                  <div className="reason">
                    <strong>Why this classification?</strong>
                    <p>{paper.classification_reason}</p>
                  </div>

                  <p className="limitation">
                    <strong>Limitation:</strong> {paper.limitations}
                  </p>

                  <a href={paper.source_url} target="_blank" rel="noreferrer">
                    View original source →
                  </a>
                </article>
              ))}
            </div>
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
                    {analysis.median_paired_fold_change.toFixed(2)}×
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