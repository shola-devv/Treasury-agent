# Architecture Transplant — repo-specific mapping

This document maps the "Universal Architectural Principles (One Solid Set)" to this repository, notes which principles are already implemented, and gives concise, actionable recommendations (document-only; no code changes applied).

Summary:
- Scope: `agent/` (producer) and `dashboard/` (consumer).
- Primary producer: `agent/src/agent.py` writes an append-only `decisions.jsonl` ledger and a `decisions.latest` fingerprint pointer. The dashboard reads both.

Mapping (principle → status, evidence, recommended action):

1) Single Canonical Computation
- Status: Implemented (producer present).
- Evidence: `agent/src/agent.py` uses `log_decision()` to append canonical decision records to `agent/decisions.jsonl`; the dashboard reads `decisions.jsonl` in `dashboard/app/api/decisions/route.js`.
- Recommendation: Document the contract that *only* the agent process may write `decisions.jsonl` or `decisions.latest`. Add a short note to `SETUP.md` stating this invariant and how to verify it.

2) Fingerprint Staleness Detection
- Status: Implemented.
- Evidence: `log_decision()` writes `agent/decisions.latest` (SHA256) and `dashboard/app/api/status/route.js` exposes `latestFingerprint`.
- Recommendation: Keep the fingerprint contract documented (how it's computed: canonical JSON without `fingerprint` field). Archive a single canonical example in this repo for consumer test fixtures.

3) Immutable Audit Trail
- Status: Implemented.
- Evidence: `decisions.jsonl` is appended to, not rewritten, by `log_decision()` in `agent/src/agent.py`.
- Recommendation: Add a short retention/rotation policy to `SETUP.md` (how to archive old logs, protect perms), and ensure backups include `decisions.jsonl`.

4) Boundary Enforcement
- Status: Mostly OK.
- Evidence: Reads (balance, gas) are done directly by `agent/src/chain_reader.py`; writes (transfers) go through `agent/src/mcp_client.py` which calls KeeperHub tools. Dashboard only reads files and env.
- Recommendation: Explicitly record this boundary in `ARCHITECTURE_TRANSPLANT.md` and `SETUP.md`: web tier must not call MCP or vendors. Add a developer note to audit new code for accidental vendor calls.

5) Config as Immutable Law
- Status: Partially implemented.
- Evidence: Many runtime thresholds (`DISBURSEMENT_AMOUNT_ETH`, `SWEEP_THRESHOLD_ETH`, `POLL_INTERVAL_SECONDS`) are read from the agent `.env`. Some constants (e.g., `TRANSFER_GAS_UNITS` in `agent/src/chain_reader.py`) are in code.
- Recommendation: Move any operational knobs that operators will tune into `.env` or a single `config/` file and document which values are authoritative. At minimum, add a short section listing which parameters are in `.env` and which remain code constants.

6) Null as Intent, Not Absence
- Status: Partially followed.
- Evidence: Agent records use `null`/`None` for `tx_status`/`tx_hash` when nothing occurred. `dashboard/app/api/status/route.js` returns `lastDecisionAt: null` when no decisions exist.
- Recommendation: Define a small review workflow in docs: what a `null` `tx_status` or a special `decision: "requires_review"` means and how operators triage it (manual queue or spreadsheet). Add that to `SETUP.md` or `ARCHITECTURE_TRANSPLANT.md`.

7) Centralized Cost Enforcement
- Status: Implemented at agent-level but not formally documented.
- Evidence: `agent/src/agent.py` computes `needed = DISBURSEMENT_AMOUNT_ETH + gas_cost_eth` and refuses to pay if treasury balance is insufficient.
- Recommendation: Document that the agent is the single cost gate. Include a developer note: any new code that triggers transfers must be routed through the agent.

8) Fail Visibly, Warn Honestly
- Status: Partially implemented.
- Evidence: Agent logs warnings (`log()`), and dashboard `status` reports `stalled` vs `running`. There is not yet a rich FAIL/WARN UI in the dashboard.
- Recommendation: Add a short UI/ops guideline to surface FAIL vs WARN states. At minimum document what `stalled`, `waiting`, and `running` mean and how operators should respond.

9) Disposable Fast State
- Status: Not applicable / no fast-state present.
- Evidence: There is no Redis-like cache; state is file-based (`agent.pid`, `decisions.latest`) and authoritative is `decisions.jsonl`.
- Recommendation: Document that `agent.pid` and `decisions.latest` are ephemeral pointers; never rely on them as authoritative data.

10) One Path, No Alternatives
- Status: Mostly implemented.
- Evidence: Decision flow: `agent` → `decisions.jsonl` → `dashboard` (single path). The decision step goes through `reasoner.decide()` (Groq) with a local guard.
- Recommendation: Keep the interface stable by documenting the decision record schema (fields, types) in this document. Add a sample JSON line as canonical contract.

11) Round-Then-Derive
- Status: Practically followed.
- Evidence: `reasoner.decide()` computes `net_benefit` and the agent enforces threshold math; the agent derives resulting behavior after constraint checks (balance/gas).
- Recommendation: Add an explicit note that numerical constraints (minimums, increments) are applied before the final decision is made and recorded. Add a checklist for auditors to verify the order.

12) Advisory vs Contract Separation
- Status: Not explicitly separated.
- Evidence: `decisions.jsonl` mixes `reasoning` (advisory) and `decision`/`tx_hash` (contract) but there is no formal classification.
- Recommendation: Split or at least tag fields in the schema as `advisory_*` vs `contract_*` (or document the separation). For example, keep `reasoning` as advisory; once a transfer is submitted, `tx_hash` and `tx_status` are contract-bound.

13) Phase-Gated Deployment
- Status: Not documented.
- Evidence: The repo runs as a single agent loop; no phased feature flags or migration strategy in repo.
- Recommendation: Add a short Phase 0 / Phase 1 checklist to `SETUP.md`. Make Phase 0 the minimal no-external-dependencies run (e.g., use `decisions.sample.jsonl`), Phase 1 the live agent with MCP.

14) Boundary-Shaped Data
- Status: Implemented.
- Evidence: `agent/src/agent.py` shapes a compact record before writing; `dashboard` expects that shaped form when it parses `decisions.jsonl`.
- Recommendation: Include the record schema sample and a note that downstream consumers should not assume vendor shapes.

15) Single Consumer, Single Producer
- Status: Implemented.
- Evidence: `agent` is the producer; `dashboard` and possibly manual scripts are consumers. No other writers observed in the repo.
- Recommendation: Add a short contributor note: new consumers adapt to producer schema; producers must avoid breaking changes without versioning.

16) Immutable Job Isolation + Approval-Bound Snapshots
- Status: Partially implemented (fingerprint exists) but not fully realized.
- Evidence: `log_decision()` writes a SHA256 fingerprint for each decision record, stored on the record itself; `decisions.latest` points to the most recent fingerprint. There is no baked-render snapshot process or approval-bound artifact beyond the fingerprint.
- Recommendation: If approvals or human-signoff are required, add a documented approval snapshot process: at approval time write a `baked_snapshot_{fingerprint}.json` artifact (SHA256 verifiable) and include it in the ledger. Document how to verify snapshots.

Concrete next steps (document-only):
- Add this file to the repo root (done). No code changes were made.
- Add a short sample decision record JSON (line) and a canonical fingerprint example to this document or `SETUP.md`.
- Add a brief section in `SETUP.md` stating the invariants the operator must preserve (single producer, fingerprint contract, cost gate).

If you'd like, I can now:
- Expand this doc with a canonical sample decision line and a small validation script (document-only), or
- Implement non-invasive code changes to emit additional artifacts (only if you later request it).

— end
