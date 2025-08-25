import React, { useState } from "react";
import API from "./api";
import { useAppContext } from "./appcontext";

const ProgramManager = () => {
  const {
    availablePrograms,
    loadLists,
    selectedProgram,
    setSelectedProgram,
  } = useAppContext();

  const [loading, setLoading] = useState(false);

  const handleDelete = async (prog) => {
    if (!window.confirm(`Delete program "${prog.name}" completely?`)) return;
    setLoading(true);
    try {
      await API.delete(`/api/programs/${prog.name}`);
      await loadLists(); // refresh list
      if (selectedProgram?.name === prog.name) {
        setSelectedProgram(null);
      }
    } catch (err) {
      alert("Delete failed: " + (err.response?.data?.error || err.message));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ marginTop: 20 }}>
      <h3>📦 Available Programs</h3>
      {availablePrograms.length === 0 ? (
        <p>No programs uploaded yet.</p>
      ) : (
        <table border="1" cellPadding="6" cellSpacing="0" style={{ width: "100%" }}>
          <thead>
            <tr>
              <th>Select</th>
              <th>Name</th>
              <th>Program Key</th>
              <th>Binary</th>
              <th>Keystore</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {availablePrograms.map((prog) => (
              <tr
                key={prog.name}
                style={{
                  backgroundColor:
                    selectedProgram?.name === prog.name ? "#eef" : "transparent",
                }}
              >
                <td>
                  <input
                    type="radio"
                    name="selectedProgram"
                    checked={selectedProgram?.name === prog.name}
                    onChange={() => setSelectedProgram(prog)}
                  />
                </td>
                <td>{prog.name}</td>
                <td>{prog.publicKey}</td>
                <td>{prog.program}</td>
                <td>{prog.keystore}</td>
                <td>
                  <button onClick={() => handleDelete(prog)} disabled={loading}>
                    🗑 Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default ProgramManager;
