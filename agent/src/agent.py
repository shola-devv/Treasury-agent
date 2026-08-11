"""
Treasury Disbursement Agent — main loop.

Architecture, matching the hackathon's own framing:
  - The AGENT (this script + Groq) reasons and decides.
  - KEEPERHUB executes: simulate, then broadcast, with retries and an
    audit trail, via native MCP tool calls.

IMPORTANT MODEL, corrected from an earlier draft: KeeperHub can only sign
transactions FROM its own Turnkey-managed org wallet (the treasury). It
cannot sign from arbitrary wallets you hold private keys for. So the flow
here is disbursement OUT of the treasury to payout wallets, not sweeping
funds INTO the treasury from elsewhere.

Flow per payout wallet, per cycle:
  1. Read the treasury's live balance + current gas price (chain_reader.py)
  2. Ask Groq: is paying this wallet's fixed disbursement amount worth the
     gas right now, or should it hold? (reasoner.py)
  3. If pay, and the treasury can afford it:
       a. call execute_transfer with simulate=true  (catch reverts, no signing)
       b. if simulation is clean, call execute_transfer for real with a
          unique idempotency_key
       c. poll get_direct_execution_status until completed/failed
  4. Log the decision, reasoning, and (if any) tx hash
"""

import json
import os
import time
import uuid
from datetime import datetime, timezone
from pathlib import Path

from dotenv import load_dotenv

# Load .env FIRST, before importing reasoner.py — reasoner.py reads
# GROQ_API_KEY the moment it's imported (to build the Groq client), so the
# .env file must already be loaded before that import happens. Explicit path
# so this works regardless of which folder you run agent.py from.
_ENV_PATH = Path(__file__).resolve().parent.parent / ".env"
load_dotenv(dotenv_path=_ENV_PATH)

if not os.environ.get("GROQ_API_KEY"):
    raise SystemExit(
        f"GROQ_API_KEY not found. Checked for a .env file at: {_ENV_PATH}\n"
        f"Does that file exist? Does it contain a real GROQ_API_KEY=... line?"
    )

from chain_reader import get_balance_eth, estimate_transfer_cost_eth  # noqa: E402
from reasoner import decide  # noqa: E402
from mcp_client import KeeperHubMCPClient  # noqa: E402

# One JSON object per line, appended to as the agent runs. The dashboard
# reads this directly — it's the agent's own decision ledger, separate from
# (and a nice complement to) KeeperHub's own execution audit trail.
DECISIONS_LOG_PATH = Path(__file__).resolve().parent.parent / "decisions.jsonl"
LOG_PATH = Path(__file__).resolve().parent.parent / "agent.log"


def log_decision(record: dict):
    record["logged_at"] = datetime.now(timezone.utc).isoformat(timespec="seconds")
    with open(DECISIONS_LOG_PATH, "a", encoding="utf-8") as f:
        f.write(json.dumps(record) + "\n")


def log(message: str):
    ts = datetime.now(timezone.utc).isoformat(timespec="seconds")
    line = f"[{ts}] {message}"
    print(line, flush=True)
    with open(LOG_PATH, "a", encoding="utf-8") as f:
        f.write(line + "\n")


TREASURY_WALLET = os.environ["TREASURY_WALLET_ADDRESS"]
PAYOUT_WALLETS = [
    os.environ["PAYOUT_WALLET_1"],
    os.environ["PAYOUT_WALLET_2"],
    os.environ["PAYOUT_WALLET_3"],
]
CHAIN_ID = os.environ.get("CHAIN_ID", "11155111")  # Sepolia
DISBURSEMENT_AMOUNT_ETH = float(os.environ.get("DISBURSEMENT_AMOUNT_ETH", "0.002"))
SWEEP_THRESHOLD_ETH = float(os.environ.get("SWEEP_THRESHOLD_ETH", "0.0005"))
POLL_INTERVAL_SECONDS = int(os.environ.get("POLL_INTERVAL_SECONDS", "600"))

STATUS_POLL_ATTEMPTS = 10
STATUS_POLL_DELAY_SECONDS = 3


def pay_wallet(mcp: KeeperHubMCPClient, wallet: str, amount_eth: float):
    """Simulate, then execute, a transfer from the treasury to `wallet`."""
    base_args = {
        "chain_id": CHAIN_ID,
        "from_address": TREASURY_WALLET,
        "to_address": wallet,
        "amount": f"{amount_eth:.6f}",
    }

    log(f"  Simulating payout of {amount_eth:.6f} ETH to {wallet} ...")
    sim_raw = mcp.call_tool("execute_transfer", {**base_args, "simulate": True})
    sim = KeeperHubMCPClient.extract_json(sim_raw)
    log(f"  Simulation result: {sim}")

    if not sim.get("success") or sim.get("wouldRevert"):
        log("  Simulation failed or would revert — skipping execution.")
        return None

    idem_key = str(uuid.uuid4())
    log(f"  Executing real transfer (idempotency_key={idem_key}) ...")
    exec_raw = mcp.call_tool(
        "execute_transfer", {**base_args, "idempotency_key": idem_key}
    )
    exec_result = KeeperHubMCPClient.extract_json(exec_raw)
    execution_id = exec_result.get("executionId") or exec_result.get("execution_id")
    log(f"  Submitted. execution_id={execution_id}")

    for attempt in range(STATUS_POLL_ATTEMPTS):
        time.sleep(STATUS_POLL_DELAY_SECONDS)
        status_raw = mcp.call_tool(
            "get_direct_execution_status", {"execution_id": execution_id}
        )
        status = KeeperHubMCPClient.extract_json(status_raw)
        state = status.get("status")
        log(f"  Poll {attempt + 1}: status={state}")
        if state in ("completed", "failed"):
            tx_hash = status.get("transactionHash") or status.get("tx_hash")
            if tx_hash:
                log(f"  Confirmed. tx hash: {tx_hash}")
                log(f"  https://sepolia.etherscan.io/tx/{tx_hash}")
            return status

    log("  Gave up polling after max attempts — check the KeeperHub dashboard.")
    return None


def run_cycle(mcp: KeeperHubMCPClient):
    log("=== New cycle ===")
    gas_cost_eth = estimate_transfer_cost_eth()
    treasury_balance = get_balance_eth(TREASURY_WALLET)
    log(f"Treasury balance: {treasury_balance:.6f} ETH")
    log(f"Estimated transfer gas cost right now: {gas_cost_eth:.6f} ETH")

    for wallet in PAYOUT_WALLETS:
        result = decide(
            wallet_address=wallet,
            disbursement_amount_eth=DISBURSEMENT_AMOUNT_ETH,
            gas_cost_eth=gas_cost_eth,
            threshold_eth=SWEEP_THRESHOLD_ETH,
        )
        log(f"  {wallet}: {result['decision']} — {result['reasoning']}")

        record = {
            "wallet": wallet,
            "disbursement_amount_eth": DISBURSEMENT_AMOUNT_ETH,
            "gas_cost_eth": gas_cost_eth,
            "net_benefit_eth": result["net_benefit_eth"],
            "decision": result["decision"],
            "reasoning": result["reasoning"],
            "tx_status": None,
            "tx_hash": None,
        }

        if result["decision"] == "pay":
            needed = DISBURSEMENT_AMOUNT_ETH + gas_cost_eth
            if treasury_balance < needed:
                log(f"  Treasury balance too low to cover this payout + gas — holding.")
                record["decision"] = "hold"
                record["reasoning"] += " (treasury balance insufficient this cycle.)"
                log_decision(record)
                continue
            status = pay_wallet(mcp, wallet, DISBURSEMENT_AMOUNT_ETH)
            if status:
                record["tx_status"] = status.get("status")
                record["tx_hash"] = status.get("transactionHash") or status.get("tx_hash")
                if status.get("status") == "completed":
                    treasury_balance -= needed
            log_decision(record)
        else:
            log("  No action taken this cycle.")
            log_decision(record)


def main():
    mcp_url = os.environ["KEEPERHUB_MCP_URL"]
    api_key = os.environ["KEEPERHUB_API_KEY"]
    mcp = KeeperHubMCPClient(mcp_url, api_key)

    log("Treasury Disbursement Agent started.")
    log(f"Treasury: {TREASURY_WALLET}")
    log(f"Disbursement amount per wallet per cycle: {DISBURSEMENT_AMOUNT_ETH} ETH")
    log(f"Watching {len(PAYOUT_WALLETS)} payout wallets on chain {CHAIN_ID}")

    while True:
        try:
            run_cycle(mcp)
        except Exception as exc:  # noqa: BLE001 - top-level loop, log and continue
            log(f"ERROR during cycle: {exc}")
        log(f"Sleeping {POLL_INTERVAL_SECONDS}s until next cycle.\n")
        time.sleep(POLL_INTERVAL_SECONDS)


if __name__ == "__main__":
    main()