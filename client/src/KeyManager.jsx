import React, { useState } from "react";
import API from "./api";
import { useAppContext } from "./appcontext";

export default function KeyManager() {
  const [keyFile, setKeyFile] = useState(null);
  const [payerName, setPayerName] = useState("");

  const { availableKeys, selectedSignerKey, setSelectedSignerKey, loadLists } = useAppContext()

  // Upload an existing keypair
  const handleUploadKey = async () => {
    if (!keyFile) return alert("Please select a file first.");
    const formData = new FormData();
    formData.append("keystore", keyFile);

    const res = await API.post("/api/keystore", formData);
    alert(`Uploaded: ${JSON.stringify(res.data)}`);
    setKeyFile(null);
    loadLists?.();
  };

  // Generate a new payer keypair
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
        <input type="file" accept=".json" onChange={e => setKeyFile(e.target.files[0])} />
        <button onClick={handleUploadKey}>Upload Keypair</button>
      </div>

      {/* Generate new keypair */}
      <div>
        <h5>Generate New Payer</h5>
        <input
          type="text"
          placeholder="Enter name (e.g. mypayer)"
          value={payerName}
          onChange={e => setPayerName(e.target.value)}
        />
        <button onClick={handleGenerateKey}>Generate Payer</button>
      </div>

      {/* List of available signer keys */}
      <div>
        <label>Select Signer Key:</label>
        <select
          value={selectedSignerKey}
          onChange={e => setSelectedSignerKey(e.target.value)}
        >
          <option value="">-- Select --</option>
          {availableKeys.map(file => (
            <option key={file} value={file}>
              {file}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
