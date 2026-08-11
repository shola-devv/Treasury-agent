import path from "path";

// dashboard/ and agent/ are siblings inside treasury-sweep-agent/.
// process.cwd() is the dashboard/ folder when `next dev` / `next start`
// runs from there, so we go up one level to reach agent/.
export const AGENT_DIR = path.join(process.cwd(), "..", "agent");
export const ENV_PATH = path.join(AGENT_DIR, ".env");
export const ENV_EXAMPLE_PATH = path.join(AGENT_DIR, ".env.example");
export const DECISIONS_PATH = path.join(AGENT_DIR, "decisions.jsonl");
export const DECISIONS_SAMPLE_PATH = path.join(AGENT_DIR, "decisions.sample.jsonl");
export const AGENT_PID_PATH = path.join(AGENT_DIR, "agent.pid");
