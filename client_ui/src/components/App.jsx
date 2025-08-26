"use client";

import React, { useEffect, useState } from "react";
import API from './api';
import UploadPanel from "./UploadPanel";
import { useAppContext } from "./appcontext";
import KeyManager from "./KeyManager";
import ProgramManager from "./ProgramManager";
import ProgramMethods from "./ProgramMethods";
import CustomWalletButton from "./solana/CustomWalletButton";
import MintTokenForm from "./MinToken";

function App() {
  const { availablePrograms, loadLists, selectedSignerKey , selectedProgram, setSelectedProgram} = useAppContext();

  const [rpc, setRpc] = useState("devnet");
  const [customRpc, setCustomRpc] = useState("");
  const [feeMultiplier, setFeeMultiplier] = useState(1);
  const [computeUnitPrice, setComputeUnitPrice] = useState(""); // NEW
  const [computeUnitLimit, setComputeUnitLimit] = useState(""); // NEW

  const [previewResult, setPreviewResult] = useState(null);
  const [deployResult, setDeployResult] = useState(null); // NEW
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadLists();
  }, []);

  const resolveRpcUrl = () => {
    if (rpc === "devnet") return "https://api.devnet.solana.com";
    if (rpc === "testnet") return "https://api.testnet.solana.com";
    if (rpc === "mainnet") return "https://api.mainnet-beta.solana.com";
    if (rpc === "custom") return customRpc;
    return "https://api.devnet.solana.com";
  };

  const handlePreview = async () => {
    if (!selectedProgram || !selectedSignerKey) {
      alert("Select a signer and program first!");
      return;
    }

    setLoading(true);
    setPreviewResult(null);
    setDeployResult(null);

    try {
      const res = await API.post("/api/deploy/preview", {
        signerFile: selectedSignerKey,
        programFile: selectedProgram.binary,
        rpcUrl: resolveRpcUrl(),
        programId: selectedProgram.publicKey,
        feeMultiplier: Number(feeMultiplier) || 1,
      });

      setPreviewResult(res.data);
    } catch (err) {
      console.error("Preview failed", err);
      alert("Preview failed: " + (err.response?.data?.error || err.message));
    } finally {
      setLoading(false);
    }
  };

  const handleDeploy = async () => {
    if (!selectedProgram || !selectedSignerKey) {
      alert("Select a signer and program first!");
      return;
    }

    setLoading(true);
    setDeployResult(null);

    try {
      const res = await API.post("/api/deployment/cli", {
        signerFile: selectedSignerKey,
        programFile: selectedProgram.binary,
        programName: selectedProgram.name,
        rpcUrl: resolveRpcUrl(),
        programId: selectedProgram.publicKey,
        computeUnitPrice: computeUnitPrice ? Number(computeUnitPrice) : undefined,
        computeUnitLimit: computeUnitLimit ? Number(computeUnitLimit) : undefined,
      });

      setDeployResult(res.data);
    } catch (err) {
      console.error("Deploy failed", err);
      alert("Deploy failed: " + (err.response?.data?.error || err.message));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: 20, maxWidth: 700 }}>
      <h2>⚡ Solana Program Deployer</h2>

      <MintTokenForm/>
      <UploadPanel />
      <hr />
      <KeyManager />
      <hr />

      {/* Program selection */}
      <ProgramManager />

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

      {/* Collapsible PREVIEW section */}
      <details style={{ marginTop: 20 }}>
        <summary style={{ cursor: "pointer", fontWeight: "bold" }}>
          🔍 Preview Deployment
        </summary>
        <div style={{ padding: 15, border: "1px solid #ccc", borderRadius: 8, marginTop: 10 }}>
          {/* Fee multiplier input */}
          <div>
            <label>Fee Multiplier (preview only): </label>
            <input
              type="number"
              min="1"
              step="1"
              value={feeMultiplier}
              onChange={e => setFeeMultiplier(e.target.value)}
              style={{ width: 80, marginLeft: 10 }}
            />
          </div>

          <button onClick={handlePreview} disabled={loading} style={{ marginTop: 10 }}>
            {loading ? "⏳ Checking..." : "🔍 Run Preview"}
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
              <p><b>Base Fee per Signature:</b> {previewResult.lamportsPerSignature} lamports</p>
              <p><b>Multiplier Applied:</b> {previewResult.multiplier}x</p>
              <p><b>Estimated Tx Fees:</b> {previewResult.estimatedTxFees} lamports</p>
              <p><b>Total Required:</b> {previewResult.totalSolRequired} SOL</p>
              <p><b>Already Deployed:</b> {previewResult.alreadyDeployed ? "✅ Yes" : "❌ No"}</p>
              <p><b>PrioritizationFeeReference:</b> {JSON.stringify(previewResult?.prioritizationFeeReference)}</p>
            </div>
          )}
        </div>
      </details>

      {/* Collapsible DEPLOY section */}
      <details style={{ marginTop: 20 }}>
        <summary style={{ cursor: "pointer", fontWeight: "bold" }}>
          🚀 Deploy Program
        </summary>
        <div style={{ padding: 15, border: "1px solid green", borderRadius: 8, marginTop: 10 }}>
          <h3>Deployment Reference</h3>
      <table border="1"  >
        <thead >
          <tr>
            <th>Tier</th>
            <th>Compute Unit Limit</th>
            <th>Compute Unit Price (µLamports)</th>
            <th>Description</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Default</td>
            <td>200,000</td>
            <td>0</td>
            <td>Standard deployment, no priority fee</td>
          </tr>
          <tr>
            <td>Boosted</td>
            <td>300,000 (or sim result ×1.1)</td>
            <td>50,000–100,000</td>
            <td>Faster confirmation during congestion</td>
          </tr>
          <tr>
            <td>High</td>
            <td>400,000</td>
            <td>200,000+</td>
            <td>Aggressive priority (higher cost)</td>
          </tr>
        </tbody>
      </table>
      <div style={{ marginBottom: 10 }}>
            <label>Compute Unit Limit: </label>
            <input
              type="number"
              placeholder="200000"
              value={computeUnitLimit}
              onChange={e => setComputeUnitLimit(e.target.value)}
              style={{ width: 120, marginLeft: 10 }}
            />
          </div>

          {/* Compute budget inputs */}
          <div style={{ marginBottom: 10 }}>
            <label>Compute Unit Price (μLamports): </label>
            <input
              type="number"
              placeholder="80000"
              value={computeUnitPrice}
              onChange={e => setComputeUnitPrice(e.target.value)}
              style={{ width: 120, marginLeft: 10 }}
            />
          </div>
          
          <button onClick={handleDeploy} disabled={loading}>
            {loading ? "⏳ Deploying..." : "🚀 Get Deploy CLI Now"}
          </button>





            {/* Show deploy results */}
            {deployResult && deployResult.cliCommands && (
              <div style={{ marginTop: 20, padding: 15, border: "1px solid green", borderRadius: 8 }}>
                <h4>🚀 Deploy Result</h4>
                <ul style={{ listStyleType: "none", paddingLeft: 0 }}>
                  {Object.entries(deployResult.cliCommands).map(([key, value]) => (
                    <li key={key} style={{ marginBottom: "8px" }}>
                      <b>{key.toUpperCase()}:</b> <code>{value}</code>
                    </li>
                  ))}
                </ul>
              </div>
            )}
        </div>
      </details>

      <CustomWalletButton/>
      
      <ProgramMethods />

    </div>
  );
}

export default App;
