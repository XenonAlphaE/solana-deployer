import React, { useState } from "react";
import axios from "axios";

function App() {
  const [soFile, setSoFile] = useState(null);
  const [signerJson, setSignerJson] = useState("");
  const [programJson, setProgramJson] = useState("");
  const [logs, setLogs] = useState("");
  const [programId, setProgramId] = useState("");

  const handleDeploy = async () => {
    if (!soFile || !signerJson || !programJson) {
      alert("Missing input");
      return;
    }

    const formData = new FormData();
    formData.append("program", soFile);
    formData.append("signerKeypair", signerJson);
    formData.append("programKeypair", programJson);

    setLogs("Deploying...");
    try {
      const res = await axios.post("/deploy", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setLogs("✅ Deployed!");
      setProgramId(res.data.programId);
    } catch (err) {
      setLogs("❌ Deploy failed: " + err?.response?.data?.error || err.message);
    }
  };

  return (
    <div style={{ padding: 20, maxWidth: 600 }}>
      <h2>Solana Program Deployer</h2>

      <div>
        <label>Program (.so file):</label>
        <input type="file" accept=".so" onChange={e => setSoFile(e.target.files[0])} />
      </div>

      <div>
        <label>Signer Keypair (JSON):</label>
        <textarea
          rows="4"
          value={signerJson}
          onChange={e => setSignerJson(e.target.value)}
          placeholder="Paste your wallet keypair JSON"
          style={{ width: "100%" }}
        />
      </div>

      <div>
        <label>Program Keypair (JSON):</label>
        <textarea
          rows="4"
          value={programJson}
          onChange={e => setProgramJson(e.target.value)}
          placeholder="Paste your program keypair JSON"
          style={{ width: "100%" }}
        />
      </div>

      <button onClick={handleDeploy} style={{ marginTop: 10 }}>
        🚀 Deploy to Devnet
      </button>

      <pre style={{ marginTop: 20 }}>{logs}</pre>
      {programId && (
        <p>
          View on explorer:{" "}
          <a
            href={`https://explorer.solana.com/address/${programId}?cluster=devnet`}
            target="_blank"
            rel="noopener noreferrer"
          >
            {programId}
          </a>
        </p>
      )}
    </div>
  );
}

export default App;
