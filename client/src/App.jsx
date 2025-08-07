import React, { useEffect, useState } from "react";
import API from './api';

function App() {
  const [soFile, setSoFile] = useState(null);
  const [keyFile, setKeyFile] = useState(null);
  const [programFile, setProgramFile] = useState(null);

  const [availablePrograms, setAvailablePrograms] = useState([]);
  const [availableKeys, setAvailableKeys] = useState([]);

  const [selectedProgram, setSelectedProgram] = useState("");
  const [selectedSignerKey, setSelectedSignerKey] = useState("");
  const [selectedProgramKey, setSelectedProgramKey] = useState("");

  const [logs, setLogs] = useState("");
  const [programId, setProgramId] = useState("");

  // Fetch list of uploaded programs and keys
  const loadLists = async () => {
    const [progRes, keyRes] = await Promise.all([
      API.get("/api/programs"),
      API.get("/api/keystores")
    ]);

    setAvailablePrograms(progRes.data ?? []);
    setAvailableKeys(keyRes.data);
  };

  useEffect(() => {
    loadLists();
  }, []);

  const handleUploadSo = async () => {
    if (!soFile) return alert("Select .so file");

    const formData = new FormData();
    formData.append("program", soFile);
    formData.append("name", soFile.name);

    await API.post("/api/upload-program", formData);
    await loadLists();
    alert("✅ Program uploaded");
  };

  const handleUploadKey = async () => {
    if (!keyFile) return alert("Select keypair file");

    const formData = new FormData();
    formData.append("key", keyFile);
    formData.append("name", keyFile.name);

    await API.post("/api/upload-key", formData);
    await loadLists();
    alert("✅ Key uploaded");
  };

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

      <h4>Upload .so file</h4>
      <input type="file" accept=".so" onChange={e => setSoFile(e.target.files[0])} />
      <button onClick={handleUploadSo}>Upload Program</button>

      <h4>Upload Keypair (.json)</h4>
      <input type="file" accept=".json" onChange={e => setKeyFile(e.target.files[0])} />
      <button onClick={handleUploadKey}>Upload Keypair</button>

      <hr />

      <div>
        <label>Select Program:</label>
        <select
          value={selectedProgram}
          onChange={e => setSelectedProgram(e.target.value)}
        >
          <option value="">-- Select --</option>
          {availablePrograms?.map(file => (
            <option key={file} value={file}>{file}</option>
          ))}
        </select>
      </div>

      <div>
        <label>Select Signer Key:</label>
        <select
          value={selectedSignerKey}
          onChange={e => setSelectedSignerKey(e.target.value)}
        >
          <option value="">-- Select --</option>
          {availableKeys.map(file => (
            <option key={file} value={file}>{file}</option>
          ))}
        </select>
      </div>

      <div>
        <label>Select Program Key:</label>
        <select
          value={selectedProgramKey}
          onChange={e => setSelectedProgramKey(e.target.value)}
        >
          <option value="">-- Select --</option>
          {availableKeys.map(file => (
            <option key={file} value={file}>{file}</option>
          ))}
        </select>
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
