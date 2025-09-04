"use client";
import React, { useState } from "react";
import API from "./api";
import { useAppContext } from "./appcontext";

export default function UploadPanel() {
    const [name, setName] = useState("");
    const [soFile, setSoFile] = useState(null);
    const [programIdFile, setProgramIdFile] = useState(null);
    const [idlFile, setIdlFile] = useState(null);
    const { loadLists } = useAppContext();

    const handleUploadSo = async () => {
        if (!name.trim()) return alert("Enter program name");
        if (!soFile) return alert("Select .so file");
        if (!programIdFile) return alert("Select .json program keypair");

        const formData = new FormData();
        formData.append("name", name);
        formData.append("program", soFile);
        formData.append("keystore", programIdFile);
        if (idlFile) formData.append("idl", idlFile);

        await API.post("/api/program", formData);
        alert("✅ Program uploaded");

        await loadLists?.();
        setName("");
        setSoFile(null);
        setProgramIdFile(null);
        setIdlFile(null);
    };

    return (
        <div className="space-y-6">
            <h3>Upload Files</h3>

            <div className="space-y-4">
                <div>
                    <h5>Program Name</h5>
                    <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Enter program name"
                        className="border px-2 py-1 rounded"
                    />
                </div>

                <div>
                    <h5>Upload Program (.so)</h5>
                    <input
                        type="file"
                        accept=".so"
                        onChange={(e) => setSoFile(e.target.files[0])}
                    />
                </div>

                <div>
                    <h5>Upload Program (program-keypair.json)</h5>
                    <input
                        type="file"
                        accept=".json"
                        onChange={(e) => setProgramIdFile(e.target.files[0])}
                    />
                </div>

                <div>
                    <h5>Upload Program (idl.json)</h5>
                    <input
                        type="file"
                        accept=".json"
                        onChange={(e) => setIdlFile(e.target.files[0])}
                    />
                </div>

                <button
                    onClick={handleUploadSo}
                    className="px-4 py-2 bg-blue-600 text-white rounded"
                >
                    Upload Program
                </button>
            </div>
        </div>
    );
}
