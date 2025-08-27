"use client";
import React, { useState } from "react";
import { PublicKey } from "@solana/web3.js";

// ---- PDA recipes ----
const PDA_RECIPES = {
  buyer: ({ buyerPubkey, tokenSymbol }) => [
    Buffer.from("buyer___"),
    Buffer.from(tokenSymbol.padEnd(8, "\0")),
    new PublicKey(buyerPubkey).toBuffer(),
  ],
  vault: ({ tokenMint }) => [
    Buffer.from("vault"),
    new PublicKey(tokenMint).toBuffer(),
  ],
  config: () => [Buffer.from("config")],
};

// helper to derive PDA
function derivePda(type, params, programId) {
  const recipe = PDA_RECIPES[type];
  if (!recipe) throw new Error(`Unknown PDA type: ${type}`);
  const seeds = recipe(params);
  return PublicKey.findProgramAddressSync(seeds, new PublicKey(programId));
}

// define inputs required per PDA
const PDA_PARAMS = {
  buyer: ["buyerPubkey", "tokenSymbol"],
  vault: ["tokenMint"],
  config: [],
};

export default function PdaCalculator() {
  const [programId, setProgramId] = useState("");
  const [inputs, setInputs] = useState({});
  const [results, setResults] = useState([]);

  const handleChange = (field, value) => {
    setInputs((prev) => ({ ...prev, [field]: value }));
  };

  const handleCalculate = () => {
    try {
      const programKey = new PublicKey(programId);
      const newResults = Object.keys(PDA_RECIPES).map((type) => {
        const [pda, bump] = derivePda(type, inputs, programKey);
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
