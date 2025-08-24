import React, { useState } from "react";
import API from "./api";
import { useAppContext } from "./appcontext";

export default function UploadPanel() {
    const [soFile, setSoFile] = useState(null);
    const [programIdFile, setProgramIdFile] = useState(null);
    const [idlFile, setIdlFile] = useState(null);
    const {loadLists} =  useAppContext()

    const handleUploadSo = async () => {
        if (!soFile) return alert("Select .so file");
        if (!programIdFile) return alert("Select .json program keypair");

        const formData = new FormData();
        formData.append("program", soFile);
        formData.append("keystore", programIdFile);
        formData.append("idl", idlFile);

        await API.post("/api/program", formData);
        alert("✅ Program uploaded");
        await loadLists?.();
    };

    return (
        <div className="space-y-6">
            <h3>Upload Files</h3>

            <div>
                <h5>Upload Program (.so)</h5>
                <input type="file" accept=".so" onChange={e => setSoFile(e.target.files[0])} />
                <h5>Upload Program (program-keypair.json)</h5>
                <input type="file" accept=".json" onChange={e => setProgramIdFile(e.target.files[0])} />
                <h5>Upload Program (idl.json)</h5>
                <input type="file" accept=".json" onChange={e => setIdlFile(e.target.files[0])} />
                <button onClick={handleUploadSo}>Upload Program</button>
            </div>


        </div>
    );
}
