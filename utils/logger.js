// logger.js
const fs = require("fs");
const path = require("path");

class SessionLogger {
    constructor(baseDir = "./logs") {
        if (!fs.existsSync(baseDir)) {
            fs.mkdirSync(baseDir, { recursive: true });
        }

        const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
        this.file = path.join(baseDir, `session-${timestamp}.log`);

        fs.writeFileSync(
            this.file,
            `=== SESSION START ${new Date().toISOString()} ===\n`
        );
    }

    // --------------------------------------------------
    // console.log-like behavior
    // --------------------------------------------------
    log(...args) {
        const line = args
            .map(v => this.format(v))
            .join(", ");

        fs.appendFileSync(this.file, line + "\n");
    }

    // --------------------------------------------------
    // Safe formatter
    // --------------------------------------------------
    format(value) {
        if (value === null) return "null";
        if (value === undefined) return "undefined";

        if (typeof value === "bigint") {
            return value.toString();
        }

        if (value instanceof Set) {
            return `Set(${value.size}) ` + JSON.stringify([...value]);
        }

        if (value instanceof Map) {
            return `Map(${value.size}) ` + JSON.stringify([...value.entries()]);
        }

        if (typeof value === "object") {
            try {
                return JSON.stringify(
                    value,
                    (_, v) => (typeof v === "bigint" ? v.toString() : v),
                    2
                );
            } catch {
                return String(value);
            }
        }

        return String(value);
    }
}

module.exports = SessionLogger;
