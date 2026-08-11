import { NextResponse } from "next/server";
import fs from "fs";
import { DECISIONS_PATH, ENV_PATH, AGENT_PID_PATH } from "../../../lib/paths";
import { readEnvFile } from "../../../lib/env";
import { REQUIRED_KEYS } from "../../../lib/fields";

// Without this, Next statically optimizes a GET-only route handler and
// would serve a build-time snapshot instead of re-reading agent/.env and
// decisions.jsonl on every request.
export const dynamic = "force-dynamic";

function lastLine(filePath) {
  if (!fs.existsSync(filePath)) return null;
  const raw = fs.readFileSync(filePath, "utf-8").trim();
  if (!raw) return null;
  const lines = raw.split("\n");
  try {
    return JSON.parse(lines[lines.length - 1]);
  } catch {
    return null;
  }
}

export async function GET() {
  const values = readEnvFile(ENV_PATH);
  const configured = REQUIRED_KEYS.every((k) => (values[k] ?? "").trim() !== "");
  const pollSeconds = Number(values.POLL_INTERVAL_SECONDS || 600);

  const last = lastLine(DECISIONS_PATH);

  let agentRunning = false;
  if (fs.existsSync(AGENT_PID_PATH)) {
    try {
      const pid = Number(fs.readFileSync(AGENT_PID_PATH, "utf-8").trim());
      if (Number.isInteger(pid) && pid > 0) {
        process.kill(pid, 0);
        agentRunning = true;
      }
    } catch {
      agentRunning = false;
    }
  }

  let state = "not_configured";
  if (configured) {
    if (agentRunning) {
      state = "running";
    } else {
      state = "waiting"; // configured, but no live decisions yet
      if (last?.logged_at) {
        const ageMs = Date.now() - new Date(last.logged_at).getTime();
        state = ageMs < pollSeconds * 2 * 1000 ? "running" : "stalled";
      }
    }
  }

  return NextResponse.json({
    state,
    configured,
    agentRunning,
    lastDecisionAt: last?.logged_at ?? null,
  });
}
