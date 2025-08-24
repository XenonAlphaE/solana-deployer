import React, { useEffect, useState } from "react";
import API from './api';
import UploadPanel from "./UploadPanel";
import { useAppContext } from "./appcontext";
import KeyManager from "./KeyManager";

function App() {

  const {availablePrograms, loadLists} = useAppContext();

  const [selectedProgram, setSelectedProgram] = useState("");
  const [selectedSignerKey, setSelectedSignerKey] = useState("");
  const [selectedProgramKey, setSelectedProgramKey] = useState("");

  const [logs, setLogs] = useState("");
  const [programId, setProgramId] = useState("");

  useEffect( () => {
    loadLists()
  }, [])

  // const handleGenerateKey = async () => {
  //   if (!payerName) return alert("Please enter a name for the new payer.");

  //   const res = await fetch("/api/generate-payer", {
  //     method: "POST",
  //     headers: { "Content-Type": "application/json" },
  //     body: JSON.stringify({ name: payerName }),
  //   });

  //   const data = await res.json();
  //   if (data.error) return alert("Error: " + data.error);

  //   alert(`Generated new payer: ${data.name}\nPublic Key: ${data.publicKey}`);
  // };

  const handleDeploy = async () => {
    if (!selectedProgram || !selectedSignerKey || !selectedProgramKey) {
      alert("Select program and keypairs");
      return;
    }

    const formData = new FormData();
    formData.append("programName", selectedProgram);
    formData.append("signerName", selectedSignerKey);
    formData.append("programKeyName", selectedProgramKey);

    setLogs("Deploying...");

    try {
      const res = await API.post("/api/deploy", formData);
      setLogs("✅ Deployed!");
      setProgramId(res.data.programId);
    } catch (err) {
      setLogs("❌ Deploy failed: " + err?.response?.data?.error || err.message);
    }
  };

  return (
    <div style={{ padding: 20, maxWidth: 600 }}>
      <h2>Solana Program Deployer</h2>

      {/* Upload existing keypair */}
      <UploadPanel/>


      <hr />
      <KeyManager />
     
      <div>
        <label>Select Program:</label>
        <select
          value={selectedProgram?.name || ""}
          onChange={e => {
            const prog = availablePrograms.find(p => p.name === e.target.value);
            setSelectedProgram(prog || null);
          }}
        >
          <option value="">-- Select --</option>
          {availablePrograms.map(p => (
            <option key={p.name} value={p.name}>
              {p.name} ({p.program}, {p.keystore})
            </option>
          ))}
        </select>
      </div>

      <div>
        <label>Program Key (auto from selection):</label>
        <input type="text" value={selectedProgram?.keystore || ""} readOnly />
        {selectedProgram?.publicKey}
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
