# Treasury Sweep Agent — KeeperHub Hackathon

An agent that watches inflow wallets on Sepolia, reasons (via Groq) about
whether sweeping each one to the treasury is worth the gas, and executes the
sweep through KeeperHub's MCP server — simulated first, then broadcast, with
a full audit trail.

**Agent decides. KeeperHub executes.**

## Layout

```
treasury-sweep-agent/
├── SETUP.md              ← start here (Windows/WSL setup, step by step)
├── agent/                ← the reasoning + execution loop (built, see below)
│   ├── .env.example
│   ├── requirements.txt
│   ├── decisions.jsonl   ← created at runtime, the agent's own decision ledger
│   └── src/
│       ├── agent.py          main loop
│       ├── chain_reader.py   reads balances/gas directly from Sepolia RPC
│       ├── reasoner.py       Groq: sweep-or-hold + plain-English reasoning
│       └── mcp_client.py     minimal MCP client for KeeperHub's execution tools
└── dashboard/             ← NOT built yet — next step
```

