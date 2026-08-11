import path from "path";
import fs from "fs";
import { NextResponse } from "next/server";
import { AGENT_DIR } from "../../../lib/paths";

export const dynamic = "force-dynamic";

const LOG_PATH = path.join(AGENT_DIR, "agent.log");

function readLines(filePath) {
  if (!fs.existsSync(filePath)) return [];
  const raw = fs.readFileSync(filePath, "utf-8").trim();
  if (!raw) return [];
  return raw.split("\n").map((line) => line.trim()).filter(Boolean);
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const limit = Number(searchParams.get("limit") ?? 80);
  const lines = readLines(LOG_PATH);
  return NextResponse.json({
    source: fs.existsSync(LOG_PATH) ? "live" : "empty",
    count: lines.length,
    lines: lines.slice(-limit),
  });
}
