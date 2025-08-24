import React, { useEffect, useState } from "react";
import API from './api';
import UploadPanel from "./UploadPanel";
import { useAppContext } from "./appcontext";
import KeyManager from "./KeyManager";

function App() {
  const { availablePrograms, loadLists, selectedSignerKey } = useAppContext();

  const [selectedProgram, setSelectedProgram] = useState(null);
  const [rpc, setRpc] = useState("devnet");
  const [customRpc, setCustomRpc] = useState("");
  const [previewResult, setPreviewResult] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadLists();
  }, []);

  const handlePreview = async () => {
    if (!selectedProgram || !selectedSignerKey) {
      alert("Select a signer and program first!");
      return;
    }

    setLoading(true);
    setPreviewResult(null);

    try {
      // resolve rpc endpoint
      let rpcUrl = "";
      if (rpc === "devnet") rpcUrl = "https://api.devnet.solana.com";
      else if (rpc === "testnet") rpcUrl = "https://api.testnet.solana.com";
      else if (rpc === "mainnet") rpcUrl = "https://api.mainnet-beta.solana.com";
      else if (rpc === "custom") rpcUrl = customRpc;
      debugger
      const res = await API.post("/api/deploy/preview", {
        signerFile: selectedSignerKey,
        programFile: selectedProgram.binary,
        rpcUrl,
        programId: selectedProgram.publicKey, // 👈 add this

      });

      setPreviewResult(res.data);
    } catch (err) {
      console.error("Preview failed", err);
      alert("Preview failed: " + (err.response?.data?.error || err.message));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: 20, maxWidth: 700 }}>
      <h2>⚡ Solana Program Deployer</h2>

      {/* Upload existing keypair */}
      <UploadPanel />
      <hr />
      <KeyManager />
      <hr />

      {/* Program selection */}
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
        {selectedProgram?.publicKey}
      </div>

      {/* RPC selection */}
      <div style={{ marginTop: 10 }}>
        <label>RPC Cluster: </label>
        <select value={rpc} onChange={e => setRpc(e.target.value)}>
          <option value="devnet">Devnet</option>
          <option value="testnet">Testnet</option>
          <option value="mainnet">Mainnet</option>
          <option value="custom">Custom</option>
        </select>
        {rpc === "custom" && (
          <input
            type="text"
            placeholder="Enter custom RPC URL"
            value={customRpc}
            onChange={e => setCustomRpc(e.target.value)}
            style={{ marginLeft: 10, width: "60%" }}
          />
        )}
      </div>
      

      {/* Preview button */}
      <button onClick={handlePreview} style={{ marginTop: 15 }}>
        {loading ? "⏳ Checking..." : "🚀 Preview to Deploy"}
      </button>

      {/* Show preview results */}
      {previewResult && (
        <div style={{ marginTop: 20, padding: 15, border: "1px solid #ccc", borderRadius: 8 }}>
          <h4>🔍 Preview Result</h4>
          <p><b>RPC:</b> {previewResult.rpcUrl}</p>
          <p><b>Signer:</b> {previewResult.signer}</p>
          <p><b>Balance:</b> {previewResult.balanceSol} SOL</p>
          <p><b>Program Size:</b> {previewResult.programSize} bytes</p>
          <p><b>Rent Exempt:</b> {previewResult.rentExemptLamports} lamports</p>
          <p><b>Estimated Tx Fees:</b> {previewResult.estimatedTxFees} lamports</p>
          <p><b>Total Required:</b> {previewResult.totalSolRequired} SOL</p>
          <p><b>Already Deployed:</b> {previewResult.alreadyDeployed ? "✅ Yes" : "❌ No"}</p>
        </div>
      )}
    </div>
  );
}

export default App;
