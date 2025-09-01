import { PublicKey } from "@solana/web3.js";
import BN from "bn.js";

/**
 * Parse a string input into the correct type based on IDL type definition.
 * @param {string} text - The user input (raw string).
 * @param {any} typeDef - The IDL type definition.
 */
export function parseIdlValue(text, typeDef) {
  if (typeof typeDef === "string") {
    switch (typeDef) {
      case "publicKey":
        return new PublicKey(text.trim());
      case "i64":
      case "u64":
      case "u32":
      case "u16":
      case "u8":
        return new BN(text); // Anchor expects BN for integers

      case "bool":
        return text.toLowerCase() === "true" || text === "1";

      case "string":
        return text;

      case "bytes":
        // interpret hex or utf8 input
        if (/^[0-9a-fA-F]+$/.test(text)) {
          return Buffer.from(text, "hex");
        }
        return Buffer.from(text, "utf8");

      default:
        throw new Error("Unsupported primitive type: " + typeDef);
    }
  }

  // Fixed array type: { array: ["u8", 8] }
  if (typeDef.array) {
    debugger
    const [innerType, len] = typeDef.array;
    if (Array.isArray(text)) {
      return text; // already array of u8
    }
    // If it's a string representation of an array, e.g. "[1,2,3]"
    if (typeof text === "string" && text.trim().startsWith("[")) {
      try {
        const arr = JSON.parse(text);
        if (!Array.isArray(arr)) throw new Error("Not an array");
        return arr.map((v) => {
          if (typeof v !== "number") throw new Error("Array must contain numbers");
          return v;
        });
      } catch (e) {
        throw new Error("Invalid array string: " + e.message);
      }
    }
    
    if (innerType === "u8") {
      // For token symbols, pad/trim to length
      const buf = Buffer.alloc(len);
      const inputBuf = Buffer.from(text, "utf8");
      inputBuf.copy(buf, 0, 0, Math.min(len, inputBuf.length));
      return [...buf];
    }
    throw new Error("Unsupported array inner type: " + innerType);
  }

  // Vec type: { vec: "publicKey" } or { vec: "u64" }
  if (typeDef.vec) {
    debugger
    const innerType = typeDef.vec;
    return text
      .map((t) => parseIdlValue(t.trim(), innerType));
  }

  throw new Error("Unsupported type definition: " + JSON.stringify(typeDef));
}
