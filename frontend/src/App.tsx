import { useEffect, useState } from "react";
import "./App.css";

type Paper = {
  paper_id: string;
  title: string;
  authors: string;
  year: string;
  journal: string;
  source_url: string;
  study_type: string;
  sample_size: string;
  biological_material: string;
  measurement_method: string;
  main_finding: string;
  classification: string;
  classification_reason: string;
  limitations: string;
  review_status: string;
};

type PapersResponse = {
  count: number;
  papers: Paper[];
};

function App() {
  const [papers, setPapers] = useState<Paper[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchPapers() {
      try {
        const response = await fetch("http://127.0.0.1:8000/papers");

        if (!response.ok) {
          throw new Error("The backend could not return the papers.");
        }

        const data: PapersResponse = await response.json();
        setPapers(data.papers);
      } catch {
        setError("Could not connect to the EvidenceLens backend.");
      } finally {
        setLoading(false);
      }
    }

    fetchPapers();
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

      <section className="results">
        <div className="results-heading">
          <div>
            <p className="label">SCREENED LITERATURE</p>
            <h2>Evidence results</h2>
          </div>

          <span className="paper-count">{papers.length} papers</span>
        </div>

        {loading && <p>Loading evidence…</p>}

        {error && <p className="error">{error}</p>}

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
    </main>
  );
}

export default App;