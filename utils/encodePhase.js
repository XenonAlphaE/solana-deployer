const crypto = require("crypto");

function chunkAndReverseSafe(arr, size) {
  const n = arr.length;

  // Find nearest valid chunk size >= input size
  let chunkSize = size;
  while (n % chunkSize !== 0 && chunkSize <= n) {
    chunkSize++;
  }
  if (chunkSize > n) chunkSize = n; // fallback

  // Chunk logic
  const chunks = [];
  for (let i = 0; i < n; i += chunkSize) {
    chunks.push(arr.slice(i, i + chunkSize));
  }

  return chunks.reverse().flat();
}

function safeChunkSize(len, size) {
  let s = size;
  while (len % s !== 0 && s <= len) s++;
  if (s > len) s = len;
  return s;
}

function mergeAlternate(arr1, arr2, chunkSize) {
  const len = Math.max(arr1.length, arr2.length);

  // auto-adjust to ensure reversibility
  const safeSize = safeChunkSize(len, chunkSize);

  const makeChunk = (arr, size) => {
    const out = [];
    for (let i = 0; i < arr.length; i += size) {
      out.push(arr.slice(i, i + size));
    }
    return out;
  };

  const c1 = makeChunk(arr1, safeSize);
  const c2 = makeChunk(arr2, safeSize);

  const result = [];
  const max = Math.max(c1.length, c2.length);

  for (let i = 0; i < max; i++) {
    if (i < c1.length) result.push(...c1[i]);
    if (i < c2.length) result.push(...c2[i]);
  }

  return result;
}


function generatePassword(rawPassword){
    const encodeSteps = rawPassword.trim().split(" ")
    const arr1 = chunkAndReverseSafe(rawPassword.trim().split(""), encodeSteps.length)
    const arr2 = rawPassword.trim().split("")

    const initArr = mergeAlternate(arr1, arr2, encodeSteps[0].length)
    let finalResult = initArr

    for(let i = 1; i< encodeSteps.length; i++){
        finalResult = chunkAndReverseSafe(finalResult, encodeSteps[i].length + i)
        finalResult.push(...finalResult)
    }
    return finalResult.join("")
}

function passwordToAESKey(password, salt) {
  return crypto.scryptSync(password, salt, 32); // 32 bytes
}


function encryptPhase(password, plaintext) {
  const key = passwordToAESKey(password, generatePassword(password));
  const iv = crypto.randomBytes(12); // recommended IV size for GCM
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);

  const encrypted = Buffer.concat([
    cipher.update(plaintext, "utf8"),
    cipher.final()
  ]);

  const tag = cipher.getAuthTag();

  return Buffer.concat([iv, tag, encrypted]).toString("hex");
}

// Decrypt text
function decryptPhase(password, encryptedBase64) {
  const key = passwordToAESKey(password, generatePassword(password));
  const data = Buffer.from(encryptedBase64, "hex");

  const iv = data.slice(0, 12);
  const tag = data.slice(12, 28);
  const ciphertext = data.slice(28);

  const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);

  const decrypted = Buffer.concat([
    decipher.update(ciphertext),
    decipher.final()
  ]);

  return decrypted.toString("utf8");
}





module.exports  = {
decryptPhase,
encryptPhase
}