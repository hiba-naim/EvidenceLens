import { useEffect, useState } from "react";

type ComparisonPaper = {
  paper_id: string;
  title: string;
  year: string;
  study_type: string;
  population: string;
  sample_size: string;
  biological_material: string;
  gene: string;
  measurement_method: string;
  main_finding: string;
  limitations: string;
  classification: string;
  relevance_score: number;
};

type StudyComparisonProps = {
  papers: ComparisonPaper[];
};

function displayValue(value: string) {
  return value.trim() || "Not reported";
}

function StudyComparison({ papers }: StudyComparisonProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  useEffect(() => {
    setSelectedIds([]);
  }, [papers]);

  function togglePaper(paperId: string) {
    setSelectedIds((currentIds) => {
      if (currentIds.includes(paperId)) {
        return currentIds.filter((id) => id !== paperId);
      }

      if (currentIds.length >= 4) {
        return currentIds;
      }

      return [...currentIds, paperId];
    });
  }

  const selectedPapers = papers.filter((paper) =>
    selectedIds.includes(paper.paper_id),
  );

  if (papers.length < 2) {
    return null;
  }

  return (
    <section className="comparison">
      <div className="comparison-heading">
        <div>
          <p className="label">CROSS-STUDY ANALYSIS</p>
          <h2>Compare studies</h2>
          <p>
            Select between two and four papers to compare their study
            designs and findings.
          </p>
        </div>

        <span className="selection-count">
          {selectedIds.length}/4 selected
        </span>
      </div>

      <div className="comparison-selector">
        {papers.map((paper) => {
          const isSelected = selectedIds.includes(paper.paper_id);
          const selectionLimitReached =
            selectedIds.length >= 4 && !isSelected;

          return (
            <button
              className={isSelected ? "selected" : ""}
              disabled={selectionLimitReached}
              key={paper.paper_id}
              onClick={() => togglePaper(paper.paper_id)}
              type="button"
            >
              <span>{isSelected ? "Selected" : "Select"}</span>
              <strong>{paper.paper_id}</strong>
              <small>{paper.title}</small>
            </button>
          );
        })}
      </div>

      {selectedPapers.length < 2 ? (
        <p className="comparison-message">
          Select at least two papers to open the comparison table.
        </p>
      ) : (
        <div className="comparison-table-wrapper">
          <table className="comparison-table">
            <thead>
              <tr>
                <th>Study detail</th>

                {selectedPapers.map((paper) => (
                  <th key={paper.paper_id}>
                    <span>{paper.paper_id}</span>
                    {paper.title}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              <tr>
                <th>Year</th>
                {selectedPapers.map((paper) => (
                  <td key={paper.paper_id}>{paper.year}</td>
                ))}
              </tr>

              <tr>
                <th>Gene</th>
                {selectedPapers.map((paper) => (
                  <td key={paper.paper_id}>
                    {displayValue(paper.gene)}
                  </td>
                ))}
              </tr>

              <tr>
                <th>Study type</th>
                {selectedPapers.map((paper) => (
                  <td key={paper.paper_id}>
                    {displayValue(paper.study_type)}
                  </td>
                ))}
              </tr>

              <tr>
                <th>Population</th>
                {selectedPapers.map((paper) => (
                  <td key={paper.paper_id}>
                    {displayValue(paper.population)}
                  </td>
                ))}
              </tr>

              <tr>
                <th>Sample size</th>
                {selectedPapers.map((paper) => (
                  <td key={paper.paper_id}>
                    {displayValue(paper.sample_size)}
                  </td>
                ))}
              </tr>

              <tr>
                <th>Biological material</th>
                {selectedPapers.map((paper) => (
                  <td key={paper.paper_id}>
                    {displayValue(paper.biological_material)}
                  </td>
                ))}
              </tr>

              <tr>
                <th>Measurement method</th>
                {selectedPapers.map((paper) => (
                  <td key={paper.paper_id}>
                    {displayValue(paper.measurement_method)}
                  </td>
                ))}
              </tr>

              <tr>
                <th>Main finding</th>
                {selectedPapers.map((paper) => (
                  <td key={paper.paper_id}>
                    {displayValue(paper.main_finding)}
                  </td>
                ))}
              </tr>

              <tr>
                <th>Limitation</th>
                {selectedPapers.map((paper) => (
                  <td key={paper.paper_id}>
                    {displayValue(paper.limitations)}
                  </td>
                ))}
              </tr>

              <tr>
                <th>Evidence stance</th>
                {selectedPapers.map((paper) => (
                  <td key={paper.paper_id}>
                    <span
                      className={`badge ${paper.classification.replace(
                        /\s+/g,
                        "-",
                      )}`}
                    >
                      {paper.classification}
                    </span>
                  </td>
                ))}
              </tr>

              <tr>
                <th>Relevance</th>
                {selectedPapers.map((paper) => (
                  <td key={paper.paper_id}>
                    {Math.round(paper.relevance_score * 100)}% match
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

export default StudyComparison;