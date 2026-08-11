import { NextResponse } from "next/server";
import path from "path";
import fs from "fs";
import { spawn } from "child_process";
import { AGENT_DIR, AGENT_PID_PATH } from "../../../../lib/paths";

export const dynamic = "force-dynamic";

function isProcessAlive(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return false;
  }
}

function readPid() {
  if (!fs.existsSync(AGENT_PID_PATH)) return null;
  const raw = fs.readFileSync(AGENT_PID_PATH, "utf-8").trim();
  const pid = Number(raw);
  return Number.isInteger(pid) && pid > 0 ? pid : null;
}

export async function GET() {
  const existingPid = readPid();
  if (existingPid && isProcessAlive(existingPid)) {
    return NextResponse.json({ status: "already_running", pid: existingPid });
  }

  if (existingPid) {
    try {
      fs.unlinkSync(AGENT_PID_PATH);
    } catch {
      // ignore cleanup failures
    }
  }

  const agentScript = path.join(AGENT_DIR, "src", "agent.py");

  const child = spawn("python3", [agentScript], {
    cwd: path.join(AGENT_DIR, "src"),
    detached: true,
    stdio: "ignore",
  });

  child.unref();

  fs.writeFileSync(AGENT_PID_PATH, String(child.pid), "utf-8");

  return NextResponse.json({ status: "started", pid: child.pid });
}
