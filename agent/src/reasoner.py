"""
The actual "agent" reasoning step, powered by Groq.

The math (net benefit after gas) is computed deterministically in agent.py —
we don't want an LLM doing arithmetic that ends up in an audit trail. Groq's
job is narrower and more honest: given the numbers, decide pay-or-hold
against the threshold, and write a short, clear justification for the log.
This is also where Groq's speed is a real asset — this call should return
in well under a second, so the whole check-and-decide loop stays fast even
across three wallets every cycle.
"""

import json
import os
from groq import Groq

_client = Groq(api_key=os.environ["GROQ_API_KEY"])
_MODEL = os.environ.get("GROQ_MODEL", "llama-3.3-70b-versatile")

SYSTEM_PROMPT = """You are a treasury operations agent. You are given a fixed \
payout amount owed to a wallet, the estimated gas cost of sending it, and the \
minimum net-benefit threshold worth acting on. Decide whether to pay now or \
hold until gas is cheaper, strictly using the numbers given — do not invent \
figures. Respond ONLY with JSON matching this shape, no prose outside the JSON:
{"decision": "pay" | "hold", "reasoning": "<one or two plain-English sentences>"}
"""


def decide(wallet_address: str, disbursement_amount_eth: float, gas_cost_eth: float,
           threshold_eth: float) -> dict:
    net_benefit = disbursement_amount_eth - gas_cost_eth

    user_prompt = (
        f"Payout wallet: {wallet_address}\n"
        f"Payout amount owed: {disbursement_amount_eth:.6f} ETH\n"
        f"Estimated gas cost to send it: {gas_cost_eth:.6f} ETH\n"
        f"Net benefit if paid now: {net_benefit:.6f} ETH\n"
        f"Minimum net benefit worth acting on: {threshold_eth:.6f} ETH\n"
    )

    completion = _client.chat.completions.create(
        model=_MODEL,
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": user_prompt},
        ],
        temperature=0,
        response_format={"type": "json_object"},
    )

    raw = completion.choices[0].message.content
    parsed = json.loads(raw)

    # Belt-and-suspenders: never trust the LLM's decision if it contradicts
    # the actual threshold math. Override if needed, but keep its reasoning
    # text (it's usually right — this just guards against a bad JSON day).
    should_pay = net_benefit > threshold_eth
    if parsed.get("decision") not in ("pay", "hold"):
        parsed["decision"] = "pay" if should_pay else "hold"
    elif (parsed["decision"] == "pay") != should_pay:
        parsed["decision"] = "pay" if should_pay else "hold"
        parsed["reasoning"] += " (decision corrected to match threshold math.)"

    parsed["net_benefit_eth"] = net_benefit
    return parsed