const fs = require("fs");
const path = require("path");

const KEYSTORE_DIR = path.join(process.cwd(),  "uploadkeys", "keystores");
const PROGRAM_DIR = path.join(process.cwd(), "uploads","programs");
const RECOVERY_DIR = path.join(process.cwd(), "uploadkeys","recoverykeys");

const creteaFolders = () => {
    // Ensure folders exist
    fs.mkdirSync(KEYSTORE_DIR, { recursive: true });
    fs.mkdirSync(PROGRAM_DIR, { recursive: true });
    fs.mkdirSync(RECOVERY_DIR, { recursive: true });
}

module.exports = {
    KEYSTORE_DIR,
    PROGRAM_DIR,
    RECOVERY_DIR,
    creteaFolders
}