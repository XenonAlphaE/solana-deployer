"use client";
import React, { useEffect, useState } from "react";
import { PublicKey } from "@solana/web3.js";
export const TOKEN_PROGRAM_ID = new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');

/** Address of the SPL Token 2022 program */
export const TOKEN_2022_PROGRAM_ID = new PublicKey('TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb');

/** Address of the SPL Associated Token Account program */
export const ASSOCIATED_TOKEN_PROGRAM_ID = new PublicKey('ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL');


function toPaddedSymbol(symbolStr, padChar = '_', length = 8) {
  const buf = Buffer.alloc(length, padChar); // fill with padChar
  buf.write(symbolStr); // write string into buffer
  return buf;
}


// ---- PDA recipes ----
const PDA_RECIPES = {
  state: () => [
    Buffer.from("state"),
  ],
  tokenInfo:({ tokenSymbol }) => [
    toPaddedSymbol(tokenSymbol),
  ],
  buyerInfoPda:({ tokenSymbol, buyerPubkey }) => [
    Buffer.from("buyer___"),
    toPaddedSymbol(tokenSymbol),
    new PublicKey(buyerPubkey).toBuffer(),
  ],
  buyerAta:({ mint, buyerPubkey }) => [
      new PublicKey(buyerPubkey).toBuffer(),
      TOKEN_PROGRAM_ID.toBuffer(),
      new PublicKey(mint).toBuffer(),
  ],
  vaultAta: ({ mint, vaultPubkey }) => [
      new PublicKey(vaultPubkey).toBuffer(),
      TOKEN_PROGRAM_ID.toBuffer(),
      new PublicKey(mint).toBuffer(),
  ],
};

// define inputs required per PDA
const PDA_PARAMS = {
  state: [],
  tokenInfo: ["tokenSymbol"],
  buyerInfoPda: ["tokenSymbol", "buyerPubkey"],
  buyerAta:["mint", "buyerPubkey"],
  vaultAta:["mint", "vaultPubkey"],
};

export default function PdaCalculator() {
  const [programId, setProgramId] = useState("");
  const [inputs, setInputs] = useState({});
  const [results, setResults] = useState([]);

  const [feedpricePda, setFeedpricePda] = useState()
  
  const handleChange = (field, value) => {
    setInputs((prev) => ({ ...prev, [field]: value }));
  };

  const handleCalculate = () => {
    try {
      const programKey = new PublicKey(programId);
      const newResults = Object.keys(PDA_RECIPES).map((type) => {
          const seeds = PDA_RECIPES[type](inputs);

          // handle ATAs
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

  // collect all unique fields across PDAs
  const allFields = Array.from(
    new Set(Object.values(PDA_PARAMS).flat())
  );

  return (
    <div className="p-4 space-y-4">
      <h2 className="text-xl font-bold">PDA Calculator</h2>

      <div className="space-y-2">
        <label className="block">
          Program ID:
          <input
            className="border p-1 w-full"
            value={programId}
            onChange={(e) => setProgramId(e.target.value)}
            placeholder="Enter programId"
          />
        </label>

        {allFields.map((field) => (
          <label key={field} className="block">
            {field}:
            <input
              className="border p-1 w-full"
              value={inputs[field] || ""}
              onChange={(e) => handleChange(field, e.target.value)}
              placeholder={`Enter ${field}`}
            />
          </label>
        ))}
      </div>

      <button
        onClick={handleCalculate}
        className="bg-blue-600 text-white px-3 py-1 rounded"
      >
        Calculate All PDAs
      </button>
      <div>
        Pyth Pricefeed address {feedpricePda}
      </div>
      {results.length > 0 && (
        <table className="border-collapse border border-gray-400 w-full mt-4">
          <thead>
            <tr className="bg-gray-100">
              <th className="border px-2 py-1">Type</th>
              <th className="border px-2 py-1">PDA</th>
              <th className="border px-2 py-1">Bump</th>
            </tr>
          </thead>
          <tbody>
            {results.map((r) => (
              <tr key={r.type}>
                <td className="border px-2 py-1">{r.type}</td>
                <td className="border px-2 py-1 font-mono">{r.pda}</td>
                <td className="border px-2 py-1">{r.bump}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
