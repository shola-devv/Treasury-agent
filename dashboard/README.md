# Treasury Disbursement Agent — Dashboard

A Next.js + Tailwind control panel for the Treasury Disbursement Agent: a
Python loop that reads the treasury's live balance and gas price each cycle,
asks Groq whether paying each recipient wallet is worth it, and executes
through KeeperHub's MCP tools — simulate, then broadcast, then confirm.

This repo has two halves that live side by side:

```
treasury-sweep-agent/
├── SETUP.md              ← Windows/WSL setup, step by step
├── README.md              ← you are here
├── agent/                 ← the reasoning + execution loop (Python)
│   ├── .env.example        template for every config value below
│   ├── decisions.sample.jsonl   demo data, shown until the agent has run
│   ├── decisions.jsonl     created at runtime — the agent's own decision ledger
│   └── src/                agent.py, chain_reader.py, reasoner.py, mcp_client.py
└── dashboard/              ← this Next.js app
    ├── app/                pages + API routes
    ├── components/
    └── lib/
```

**This package builds and ships the `dashboard/` half.** The `agent/`
folder here only holds the config template (`.env.example`) and sample
data the dashboard needs to run standalone — drop your existing
`agent/src/*.py` and `requirements.txt` in alongside it to run the real
loop.

## What the dashboard does

- **Onboarding wizard** (`/setup`) — a guided, 5-step flow that writes
  `agent/.env` directly: KeeperHub MCP URL + API key, Groq API key, chain
  ID, treasury + payout wallet addresses, and the disbursement policy
  (amount, net-benefit threshold, cycle interval).
- **Live dashboard** (`/dashboard`) — treasury-level stats, one card per
  payout wallet, and a running feed of decisions, refreshed every 15s by
  reading `agent/decisions.jsonl`.
- **Full decision log** (`/decisions`) — every cycle's pay/hold call with
  the reasoning attached, filterable by outcome and by wallet.
- **Settings** (`/settings`) — the same config fields as `/setup`, as a
  single editable form for after you've gone live.

Until `agent/decisions.jsonl` has real entries, every view falls back to
`agent/decisions.sample.jsonl` so the layout, filters, and stats are all
visible immediately — a `Showing sample data` badge makes that explicit
wherever it happens.

## How the dashboard talks to the agent

There's no database and no API between the two — the dashboard reads and
writes the same two files `agent.py` already uses:

| File | Written by | Read by |
|---|---|---|
| `agent/.env` | Dashboard (`/setup`, `/settings`) | `agent.py` on startup |
| `agent/decisions.jsonl` | `agent.py` every cycle | Dashboard (`/dashboard`, `/decisions`) |

That means **the dashboard and the agent process must run on the same
machine**, with `dashboard/` and `agent/` kept as siblings (see the tree
above). Restart `agent.py` after changing config in `/setup` or
`/settings` — it only reads `.env` once, at startup.

## Design

Styled after a soft, painterly editorial look: a `Fraunces`/`Quicksand`
pairing (self-hosted via `@fontsource`, no runtime dependency on Google
Fonts), a warm cream/amber/sage/plum palette, and a hero background image
you can swap in at `dashboard/public/background.jpg` (see
`dashboard/public/BACKGROUND_IMAGE.md`) — it layers over a matching
gradient, so the page looks intentional even before you add one.

## Tech stack

- Next.js 14 (App Router), Tailwind CSS
- Self-hosted Google Fonts via `@fontsource`
- No external database — config and decisions live in plain files next to
  the agent
- Agent side (already built, not part of this package): Python, Groq
  (`llama-3.3-70b-versatile`), KeeperHub MCP, Sepolia testnet

See `SETUP.md` for install and run instructions on Windows/WSL, including
deployment notes.
