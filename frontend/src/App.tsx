import { useEffect, useState } from "react";
import "./App.css";

type ApiStatus = "checking" | "connected" | "error";

function App() {
  const [apiStatus, setApiStatus] = useState<ApiStatus>("checking");

  useEffect(() => {
    async function checkBackend() {
      try {
        const response = await fetch("http://127.0.0.1:8000/health");

        if (!response.ok) {
          throw new Error("Backend returned an error");
        }

        const data = await response.json();

        if (data.status === "healthy") {
          setApiStatus("connected");
        } else {
          setApiStatus("error");
        }
      } catch {
        setApiStatus("error");
      }
    }

    checkBackend();
  }, []);

  return (
    <main>
      <h1>EvidenceLens</h1>

      <p>
        Investigate biomedical claims across scientific literature and
        gene-expression data.
      </p>

      {apiStatus === "checking" && <p>Checking backend connection...</p>}

      {apiStatus === "connected" && (
        <p>Backend connected successfully ✅</p>
      )}

      {apiStatus === "error" && (
        <p>Could not connect to the backend.</p>
      )}
    </main>
  );
}

export default App;