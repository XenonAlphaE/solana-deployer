"use client";

import React, { useState } from "react";
import axios from "axios";
import API from "./api";

export default function MintTokenForm() {
  const [signerFile, setSignerFile] = useState("");
  const [decimals, setDecimals] = useState(6);
  const [amount, setAmount] = useState(100);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setResult(null);

    try {
      const res = await API.post("/api/spl/mint", {
        signerFile,
        decimals,
        amount,
      });
      setResult(res.data);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ marginTop: 20, padding: 20, border: "1px solid #ccc", borderRadius: 8 }}>
      <h3>Mint Test Token</h3>
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: 10 }}>
          <label>Signer File: </label>
          <input
            type="text"
            value={signerFile}
            onChange={(e) => setSignerFile(e.target.value)}
            placeholder="devnet.json"
            required
          />
        </div>

        <div style={{ marginBottom: 10 }}>
          <label>Decimals: </label>
          <input
            type="number"
            value={decimals}
            onChange={(e) => setDecimals(Number(e.target.value))}
            min="0"
            max="18"
          />
        </div>

        <div style={{ marginBottom: 10 }}>
          <label>Amount: </label>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(Number(e.target.value))}
            min="1"
          />
        </div>

        <button type="submit" disabled={loading}>
          {loading ? "Minting..." : "Mint Token"}
        </button>
      </form>

      {error && <p style={{ color: "red" }}>❌ {error}</p>}

      {result && (
        <div style={{ marginTop: 15 }}>
          <p><b>✅ Mint Created!</b></p>
          <p><b>Mint:</b> {result.mint}</p>
          <p><b>ATA:</b> {result.ata}</p>
          <p><b>Amount:</b> {result.amount}</p>
          <p><b>Decimals:</b> {result.decimals}</p>
        </div>
      )}
    </div>
  );
}
