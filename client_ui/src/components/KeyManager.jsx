"use client";
import React, { useState } from "react";
import API from "./api";
import { useAppContext } from "./appcontext";

export default function KeyManager() {
  const [keyFile, setKeyFile] = useState(null);
  const [payerName, setPayerName] = useState("");

  const { availableKeys, selectedSignerKey, setSelectedSignerKey, loadLists } =
    useAppContext();

  // Upload existing keypair
  const handleUploadKey = async () => {
    if (!keyFile) return alert("Please select a file first.");
    const formData = new FormData();
    formData.append("keystore", keyFile);

    const res = await API.post("/api/keystore", formData);
    alert(`Uploaded: ${JSON.stringify(res.data)}`);
    setKeyFile(null);
    loadLists?.();
  };

  // Generate new payer keypair
  const handleGenerateKey = async () => {
    if (!payerName) return alert("Please enter a name for the new payer.");

    const res = await API.post("/api/generate-payer", { name: payerName });
    const data = res.data;
    if (data.error) return alert("Error: " + data.error);

    alert(`Generated new payer: ${data.name}\nPublic Key: ${data.publicKey}`);
    setPayerName("");
    loadLists?.();
  };

  return (
    <div className="space-y-4">
      <h3>Manage Keys</h3>

      {/* Upload existing keypair */}
      <div>
        <h5>Upload Keypair (.json)</h5>
        <input
          type="file"
          accept=".json"
          onChange={(e) => setKeyFile(e.target.files[0])}
        />
        <button onClick={handleUploadKey}>Upload Keypair</button>
      </div>

      {/* Generate new keypair */}
      <div>
        <h5>Generate New Payer</h5>
        <input
          type="text"
          placeholder="Enter name (e.g. mypayer)"
          value={payerName}
          onChange={(e) => setPayerName(e.target.value)}
        />
        <button onClick={handleGenerateKey}>Generate Payer</button>
      </div>

      {/* Table of available keys */}
      <div>
        <h5>Select Signer Key</h5>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr>
              <th style={{ border: "1px solid #ddd", padding: "8px" }}>Select</th>
              <th style={{ border: "1px solid #ddd", padding: "8px" }}>Filename</th>
              <th style={{ border: "1px solid #ddd", padding: "8px" }}>Public Key</th>
            </tr>
          </thead>
          <tbody>
            {availableKeys.map((item) => (
              <tr key={item.filename}>
                <td
                  style={{
                    border: "1px solid #ddd",
                    padding: "8px",
                    textAlign: "center",
                  }}
                >
                  <input
                    type="radio"
                    name="selectedKey"
                    value={item.filename}
                    checked={selectedSignerKey === item.filename}
                    onChange={() => setSelectedSignerKey(item.filename)}
                  />
                </td>
                <td style={{ border: "1px solid #ddd", padding: "8px" }}>
                  {item.filename}
                </td>
                <td style={{ border: "1px solid #ddd", padding: "8px" }}>
                  {item.publicKey}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selectedSignerKey && (
        <p>
          Selected Public Key:{" "}
          {
            availableKeys.find((x) => x.filename === selectedSignerKey)
              ?.publicKey
          }
        </p>
      )}
    </div>
  );
}
