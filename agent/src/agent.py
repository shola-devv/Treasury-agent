"""
Treasury Sweep Agent — main loop.

Architecture, matching the hackathon's own framing:
  - The AGENT (this script + Groq) reasons and decides.
  - KEEPERHUB executes: simulate, then broadcast, with retries and an
    audit trail, via native MCP tool calls.

Flow per inflow wallet, per cycle:
  1. Read balance + current gas price directly from chain (chain_reader.py)
  2. Ask Groq: sweep or hold, and why (reasoner.py)
  3. If sweep:
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

from chain_reader import get_balance_eth, estimate_transfer_cost_eth
from reasoner import decide
from mcp_client import KeeperHubMCPClient

load_dotenv()

# One JSON object per line, appended to as the agent runs. The dashboard
# reads this directly — it's the agent's own decision ledger, separate from
# (and a nice complement to) KeeperHub's own execution audit trail.
DECISIONS_LOG_PATH = Path(__file__).resolve().parent.parent / "decisions.jsonl"


def log_decision(record: dict):
    record["logged_at"] = datetime.now(timezone.utc).isoformat(timespec="seconds")
    with open(DECISIONS_LOG_PATH, "a") as f:
        f.write(json.dumps(record) + "\n")

TREASURY_WALLET = os.environ["TREASURY_WALLET_ADDRESS"]
INFLOW_WALLETS = [
    os.environ["INFLOW_WALLET_1"],
    os.environ["INFLOW_WALLET_2"],
    os.environ["INFLOW_WALLET_3"],
]
CHAIN_ID = os.environ.get("CHAIN_ID", "11155111")  # Sepolia
SWEEP_THRESHOLD_ETH = float(os.environ.get("SWEEP_THRESHOLD_ETH", "0.001"))
POLL_INTERVAL_SECONDS = int(os.environ.get("POLL_INTERVAL_SECONDS", "600"))

STATUS_POLL_ATTEMPTS = 10
STATUS_POLL_DELAY_SECONDS = 3


def log(message: str):
    ts = datetime.now(timezone.utc).isoformat(timespec="seconds")
    print(f"[{ts}] {message}")


def sweep_wallet(mcp: KeeperHubMCPClient, wallet: str, amount_eth: float):
    """Simulate, then execute, a transfer from `wallet` to the treasury."""
    base_args = {
        "chain_id": CHAIN_ID,
        "from_address": wallet,
        "to_address": TREASURY_WALLET,
        "amount": f"{amount_eth:.6f}",
    }

    log(f"  Simulating sweep of {amount_eth:.6f} ETH from {wallet} ...")
    sim = mcp.call_tool("execute_transfer", {**base_args, "simulate": True})
    log(f"  Simulation result: {sim}")

    if not sim.get("success") or sim.get("wouldRevert"):
        log("  Simulation failed or would revert — skipping execution.")
        return None

    idem_key = str(uuid.uuid4())
    log(f"  Executing real transfer (idempotency_key={idem_key}) ...")
    exec_result = mcp.call_tool(
        "execute_transfer", {**base_args, "idempotency_key": idem_key}
    )
    execution_id = exec_result.get("executionId") or exec_result.get("execution_id")
    log(f"  Submitted. execution_id={execution_id}")

    for attempt in range(STATUS_POLL_ATTEMPTS):
        time.sleep(STATUS_POLL_DELAY_SECONDS)
        status = mcp.call_tool(
            "get_direct_execution_status", {"execution_id": execution_id}
        )
        state = status.get("status")
        log(f"  Poll {attempt + 1}: status={state}")
        if state in ("completed", "failed"):
            return status

    log("  Gave up polling after max attempts — check the KeeperHub dashboard.")
    return None


def run_cycle(mcp: KeeperHubMCPClient):
    log("=== New cycle ===")
    gas_cost_eth = estimate_transfer_cost_eth()
    log(f"Estimated transfer gas cost right now: {gas_cost_eth:.6f} ETH")

    for wallet in INFLOW_WALLETS:
        balance = get_balance_eth(wallet)
        log(f"Wallet {wallet}: balance={balance:.6f} ETH")

        result = decide(
            wallet_address=wallet,
            balance_eth=balance,
            gas_cost_eth=gas_cost_eth,
            threshold_eth=SWEEP_THRESHOLD_ETH,
        )
        log(f"  Decision: {result['decision']} — {result['reasoning']}")

        record = {
            "wallet": wallet,
            "balance_eth": balance,
            "gas_cost_eth": gas_cost_eth,
            "net_benefit_eth": result["net_benefit_eth"],
            "decision": result["decision"],
            "reasoning": result["reasoning"],
            "tx_status": None,
            "tx_hash": None,
        }

        if result["decision"] == "sweep":
            sweep_amount = balance - gas_cost_eth
            if sweep_amount <= 0:
                log("  Net amount after gas is non-positive — holding instead.")
                record["decision"] = "hold"
                record["reasoning"] += " (net amount after gas was non-positive.)"
                log_decision(record)
                continue
            status = sweep_wallet(mcp, wallet, sweep_amount)
            if status:
                record["tx_status"] = status.get("status")
                record["tx_hash"] = status.get("transactionHash") or status.get("tx_hash")
            log_decision(record)
        else:
            log("  No action taken this cycle.")
            log_decision(record)


def main():
    mcp_url = os.environ["KEEPERHUB_MCP_URL"]
    api_key = os.environ["KEEPERHUB_API_KEY"]
    mcp = KeeperHubMCPClient(mcp_url, api_key)

    log("Treasury Sweep Agent started.")
    log(f"Treasury: {TREASURY_WALLET}")
    log(f"Watching {len(INFLOW_WALLETS)} inflow wallets on chain {CHAIN_ID}")

    while True:
        try:
            run_cycle(mcp)
        except Exception as exc:  # noqa: BLE001 - top-level loop, log and continue
            log(f"ERROR during cycle: {exc}")
        log(f"Sleeping {POLL_INTERVAL_SECONDS}s until next cycle.\n")
        time.sleep(POLL_INTERVAL_SECONDS)


if __name__ == "__main__":
    main()
