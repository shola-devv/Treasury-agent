import { NextResponse } from "next/server";
import fs from "fs";
import { ENV_PATH, AGENT_DIR } from "../../../lib/paths";
import { readEnvFile, serializeEnv, maskSecret } from "../../../lib/env";
import { ALL_FIELDS, REQUIRED_KEYS } from "../../../lib/fields";

export const dynamic = "force-dynamic";

export async function GET() {
  const values = readEnvFile(ENV_PATH);
  const configured = REQUIRED_KEYS.every((k) => (values[k] ?? "").trim() !== "");

  const safeValues = {};
  for (const field of ALL_FIELDS) {
    const raw = values[field.key] ?? "";
    safeValues[field.key] = field.secret ? maskSecret(raw) : raw;
  }

  return NextResponse.json({
    configured,
    exists: fs.existsSync(ENV_PATH),
    values: safeValues,
  });
}

export async function POST(request) {
  const body = await request.json();
  const incoming = body?.values ?? {};

  const existing = readEnvFile(ENV_PATH);
  const merged = { ...existing };

  for (const field of ALL_FIELDS) {
    const next = incoming[field.key];
    if (next === undefined) continue;
    // Secret fields: if the form still holds the masked placeholder
    // (unchanged by the user), keep whatever was already on disk.
    if (field.secret && /^•+/.test(next)) continue;
    merged[field.key] = next;
  }

  try {
    if (!fs.existsSync(AGENT_DIR)) {
      fs.mkdirSync(AGENT_DIR, { recursive: true });
    }
    fs.writeFileSync(ENV_PATH, serializeEnv(merged), "utf-8");
  } catch (err) {
    return NextResponse.json(
      { error: `Could not write agent/.env: ${err.message}` },
      { status: 500 }
    );
  }

  const configured = REQUIRED_KEYS.every((k) => (merged[k] ?? "").trim() !== "");
  return NextResponse.json({ ok: true, configured });
}
