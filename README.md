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

## Status

- [x] Agent reasoning loop (Groq)
- [x] KeeperHub MCP execution client (simulate → execute → poll)
- [x] Local decision ledger for the dashboard to read
- [ ] **First live run against KeeperHub — needs debugging, see SETUP.md step 8**
- [ ] Dashboard
- [ ] Demo video

## What's next: the dashboard

Once the agent runs cleanly end to end at least once, the dashboard is the
last major piece. Its job is narrow and specific: make the reasoning
visible, since that's the project's actual differentiator.

**Planned stack:** a small Next.js app (or plain HTML if you want zero
build tooling) with two data sources:
1. `agent/decisions.jsonl` — the agent's own reasoning ledger (read via a
   tiny local API endpoint, or a static JSON fetch during the demo)
2. KeeperHub's `/api/executions` REST endpoint — the *official* audit trail,
   so you can show the two side by side and prove you're not just making up
   your own logs

**Planned screens:**
- Current balances across the 3 inflow wallets + treasury
- Live decision feed: timestamp, wallet, decision, reasoning, tx hash (linked
  to Sepolia Etherscan) if one exists
- A "run agent now" trigger for the live demo, if time allows — otherwise a
  refresh button that re-reads the log

Say the word when you're ready and I'll scaffold it the same way we did the
agent.
