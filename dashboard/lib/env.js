import fs from "fs";
import { REQUIRED_KEYS } from "./fields";

// Deliberately hand-rolled instead of pulling in `dotenv` — the format
// we write is simple (KEY=value, one per line, # comments) and this way
// the dashboard has zero runtime dependency on the agent's own tooling.

export function parseEnv(text) {
  const values = {};
  for (const rawLine of text.split("\n")) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    values[key] = value;
  }
  return values;
}

export function readEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return {};
  return parseEnv(fs.readFileSync(filePath, "utf-8"));
}

export function serializeEnv(values) {
  const lines = REQUIRED_KEYS.map((key) => `${key}=${values[key] ?? ""}`);
  return lines.join("\n") + "\n";
}

export function maskSecret(value) {
  if (!value) return "";
  if (value.length <= 4) return "•".repeat(value.length);
  return `${"•".repeat(Math.max(value.length - 4, 4))}${value.slice(-4)}`;
}
