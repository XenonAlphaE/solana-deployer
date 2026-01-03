const fs = require("fs");
const path = require("path");
const { encryptPhase } = require("../utils/encodePhase");


const folderUtils = require('../utils/folderUtils')

function resolveProgramFilename(req, file) {
  const baseName =
    req.body?.name?.trim() ||
    req.soBaseName ||
    path.parse(file.originalname).name;

  if (file.originalname.endsWith(".so")) {
    return `${baseName}.so`;
  }

  if (file.originalname.endsWith("-keypair.json")) {
    return `${baseName}-keypair.txt`;
  }

  if (file.originalname.endsWith(".json")) {
    return `${baseName}.json`;
  }

  return file.originalname;
}


function saveProgramFile(req, file, password) {
  const filename = resolveProgramFilename(req, file);
  const filePath = path.join(folderUtils.PROGRAM_DIR, filename);

  // 🔐 Encrypt ONLY keypair
  if (filename.endsWith("-keypair.txt")) {
    const plaintext = file.buffer.toString("utf8");

    const encrypted = encryptPhase(password, plaintext);

    fs.writeFileSync(
      filePath,
      encrypted,
    );
  } else {
    // normal binary/json write
    fs.writeFileSync(filePath, file.buffer);
  }

  return filename;
}


function saveKeystoreFile(filename, file, password) {
  const filePath = path.join(folderUtils.KEYSTORE_DIR, `${filename}.txt`);

 
    const plaintext = file.buffer.toString("utf8");

    const encrypted = encryptPhase(password, plaintext);

    fs.writeFileSync(
      filePath,
      encrypted,
    );
 
  return filename;
}




module.exports ={
  resolveProgramFilename,
  saveProgramFile,
  saveKeystoreFile
}