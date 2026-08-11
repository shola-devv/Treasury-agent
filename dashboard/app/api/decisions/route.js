import { NextResponse } from "next/server";
import fs from "fs";
import { DECISIONS_PATH, DECISIONS_SAMPLE_PATH } from "../../../lib/paths";

export const dynamic = "force-dynamic";

function readJsonl(filePath) {
  if (!fs.existsSync(filePath)) return [];
  const raw = fs.readFileSync(filePath, "utf-8");
  const rows = [];
  for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    try {
      rows.push(JSON.parse(trimmed));
    } catch {
      // skip malformed / partially-written lines
    }
  }
  return rows;
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const limit = Number(searchParams.get("limit") ?? 200);
  const forceDemo = searchParams.get("demo") === "1";

  let rows = forceDemo ? [] : readJsonl(DECISIONS_PATH);
  let source = "live";

  if (rows.length === 0) {
    rows = readJsonl(DECISIONS_SAMPLE_PATH);
    source = "demo";
  }

  rows.sort((a, b) => (a.logged_at < b.logged_at ? 1 : -1));

  return NextResponse.json({
    source,
    count: rows.length,
    decisions: rows.slice(0, limit),
  });
}
