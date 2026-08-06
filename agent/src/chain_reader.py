"""
Direct, read-only chain access for the agent's own decision-making.

We deliberately do NOT go through KeeperHub for reads — KeeperHub is the
execution layer, not the agent's eyes. The agent should be able to reason
about chain state using any source it likes; only the WRITE (the sweep
transfer) needs to go through KeeperHub's execution guarantees.

Uses a free public Sepolia RPC. Swap SEPOLIA_RPC_URL for your own
(Alchemy/Infura free tier) if the public one rate-limits you.
"""

import requests

SEPOLIA_RPC_URL = "https://ethereum-sepolia-rpc.publicnode.com"

# Rough, static gas estimate for a plain ETH transfer (21000 gas units).
# Sepolia gas price is fetched live; this just fixes the unit count.
TRANSFER_GAS_UNITS = 21_000


def _rpc_call(method: str, params: list):
    resp = requests.post(
        SEPOLIA_RPC_URL,
        json={"jsonrpc": "2.0", "id": 1, "method": method, "params": params},
        timeout=15,
    )
    resp.raise_for_status()
    data = resp.json()
    if "error" in data:
        raise RuntimeError(f"RPC error calling {method}: {data['error']}")
    return data["result"]


def get_balance_eth(address: str) -> float:
    """Native ETH balance of an address, in ETH (not wei)."""
    result_hex = _rpc_call("eth_getBalance", [address, "latest"])
    wei = int(result_hex, 16)
    return wei / 1e18


def get_gas_price_gwei() -> float:
    result_hex = _rpc_call("eth_gasPrice", [])
    wei = int(result_hex, 16)
    return wei / 1e9


def estimate_transfer_cost_eth() -> float:
    """Estimated cost, in ETH, of one plain ETH transfer at current gas price."""
    gas_price_gwei = get_gas_price_gwei()
    gas_price_wei = gas_price_gwei * 1e9
    cost_wei = gas_price_wei * TRANSFER_GAS_UNITS
    return cost_wei / 1e18
