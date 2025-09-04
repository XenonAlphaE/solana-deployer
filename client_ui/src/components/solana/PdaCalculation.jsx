"use client";
import React, { useEffect, useState } from "react";
import { PublicKey } from "@solana/web3.js";
export const TOKEN_PROGRAM_ID = new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');
export const TOKEN_2022_PROGRAM_ID = new PublicKey('TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb');
export const ASSOCIATED_TOKEN_PROGRAM_ID = new PublicKey('ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL');

function toPaddedSymbol(symbolStr, padChar = '_', length = 8) {
  const buf = Buffer.alloc(length, padChar);
  buf.write(symbolStr);
  return buf;
}

const PDA_DEFAULTS = {
  programId: '3kSaeAAJgos9yyDWtf7cb758wLfuyVYnwTdHDR1yWcqx',
  tokenInfo: { tokenSymbol: "PEPENODE" },
  buyerAta: {
    mint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
    buyerPubkey: "BvgfzcLQoBnTrhJdifvPPTJD7pV8F3yVxFWegtTurCVC",
  },
  vaultAta: {
    mint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v",
    vaultPubkey: "BvgfzcLQoBnTrhJdifvPPTJD7pV8F3yVxFWegtTurCVC",
  },
};


const PDA_RECIPES = {
  state: () => [Buffer.from("state")],
  tokenInfo: ({ tokenSymbol="HYPE" }) => [toPaddedSymbol(tokenSymbol)],
  buyerInfoPda: ({ tokenSymbol, buyerPubkey }) => [
    Buffer.from("buyer___"),
    toPaddedSymbol(tokenSymbol),
    new PublicKey(buyerPubkey).toBuffer(),
  ],
  buyerAta: ({ mint ="GcSQxdgYUhh4EJTcGRdd3wJ9MugLtLh2JKLCdy2AyPJn", buyerPubkey="HG4kZrbYRYuPQc5KEaSdh5JAoyHH7p4gX2AFertYckcx" }) => [
    new PublicKey(buyerPubkey).toBuffer(),
    TOKEN_PROGRAM_ID.toBuffer(),
    new PublicKey(mint).toBuffer(),
  ],
  vaultAta: ({ mint ="GcSQxdgYUhh4EJTcGRdd3wJ9MugLtLh2JKLCdy2AyPJn", vaultPubkey="8d25nPi2uqeEHx8qxfpYgqTYpS37Jcgi6VMT6pvA543D" }) => [
    new PublicKey(vaultPubkey).toBuffer(),
    TOKEN_PROGRAM_ID.toBuffer(),
    new PublicKey(mint).toBuffer(),
  ],
};

const PDA_PARAMS = {
  state: [],
  tokenInfo: ["tokenSymbol"],
  buyerInfoPda: ["tokenSymbol", "buyerPubkey"],
  buyerAta: ["mint", "buyerPubkey"],
  vaultAta: ["mint", "vaultPubkey"],
};

export default function PdaCalculator() {
  const [programId, setProgramId] = useState(PDA_DEFAULTS.programId);
  const defaultInputs = Object.assign({}, ...Object.values(PDA_DEFAULTS));

  const [inputs, setInputs] = useState(defaultInputs);
  const [results, setResults] = useState([]);

  const handleChange = (field, value) => {
    setInputs((prev) => ({ ...prev, [field]: value }));
  };

  const handleCalculate = () => {
    try {
      const programKey = new PublicKey(programId);
      const newResults = Object.keys(PDA_RECIPES).map((type) => {
        const seeds = PDA_RECIPES[type](inputs);
        if (type.toLowerCase().includes("ata")) {
          const [pda, bump] = PublicKey.findProgramAddressSync(
            seeds,
            ASSOCIATED_TOKEN_PROGRAM_ID
          );
          return { type, pda: pda.toBase58(), bump };
        }
        const [pda, bump] = PublicKey.findProgramAddressSync(seeds, programKey);
        return { type, pda: pda.toBase58(), bump };
      });
      setResults(newResults);
    } catch (e) {
      alert("Error: " + e.message);
    }
  };

  const allFields = Array.from(new Set(Object.values(PDA_PARAMS).flat()));

  return (
    <div className="form-container">
      <h2>PDA Calculator</h2>

      <div
        className="pda-form"
      >
        <div className="form-group">
          <label>Program ID</label>
          <input
            type="text"
            value={programId}
            onChange={(e) => setProgramId(e.target.value)}
            placeholder="Enter programId"
          />
        </div>

        {allFields.map((field) => (
          <div key={field} className="form-group">
            <label>{field}</label>
            <input
              type="text"
              value={inputs[field] || ""}
              onChange={(e) => handleChange(field, e.target.value)}
              placeholder={`Enter ${field}`}
            />
            {/* Show formatted symbol if field is tokenSymbol and value is entered */}
            {field === "tokenSymbol" && inputs[field] && (
              <div className="info">
                Formatted Symbol:{" "}
                <code>
                  {toPaddedSymbol(inputs[field]).toString()}
                </code>
              </div>
            )}
            </div>
        ))}

        <button  className="btn" onClick={handleCalculate}>
          Calculate All PDAs
        </button>
      </div>

      {results.length > 0 && (
        <table className="results-table">
          <thead>
            <tr>
              <th>Type</th>
              <th>PDA</th>
              <th>Bump</th>
            </tr>
          </thead>
          <tbody>         
            {results.map((r) => (
              <tr key={r.type}>
                <td>{r.type}</td>
                <td className="mono">{r.pda}</td>
                <td>{r.bump}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* Pure CSS styles */}
      <style jsx>{`
        .form-container {
          max-width: 600px;
          margin: 20px auto;
          padding: 20px;
          border: 1px solid #ddd;
          border-radius: 8px;
          font-family: Arial, sans-serif;
        }
        h2 {
          margin-bottom: 16px;
          font-size: 20px;
          font-weight: bold;
        }
        .pda-form {
          display: flex;
          flex-direction: column;
          gap: 12px;
          margin-bottom: 16px;
        }
        .form-group {
          display: flex;
          flex-direction: column;
        }
        label {
          margin-bottom: 4px;
          font-weight: 600;
        }
        input {
          padding: 8px;
          border: 1px solid #bbb;
          border-radius: 4px;
          font-size: 14px;
        }
        .btn {
          align-self: flex-start;
          background: #0066cc;
          color: #fff;
          border: none;
          padding: 8px 16px;
          border-radius: 4px;
          cursor: pointer;
          font-size: 14px;
          font-weight: 600;
        }
        .btn:hover {
          background: #005bb5;
        }
        .info {
          margin-top: 10px;
          font-size: 14px;
          color: #333;
        }
        .results-table {
          margin-top: 20px;
          width: 100%;
          border-collapse: collapse;
          font-size: 14px;
        }
        .results-table th,
        .results-table td {
          border: 1px solid #ccc;
          padding: 6px 8px;
          text-align: left;
        }
        .results-table th {
          background: #f2f2f2;
        }
        .mono {
          font-family: monospace;
          font-size: 13px;
          word-break: break-all;
        }
      `}</style>
    </div>
  );
}
