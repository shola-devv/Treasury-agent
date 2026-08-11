# Treasury Disbursement Agent

> **An AI-powered treasury agent that decides when recurring payouts are economically worth executing, then uses KeeperHub to simulate, execute, and verify the transaction.**

**Treasury Disbursement Agent** is an autonomous treasury management system built around a simple idea:

**Don't blindly pay on a schedule. Let the agent evaluate whether paying is worth the cost first.**

For every disbursement cycle, the agent reads the treasury balance and current network gas conditions, evaluates each recipient payout with Groq, and decides whether to **pay** or **hold**. When the decision is to pay, the transaction is passed to KeeperHub through its MCP server, simulated before execution, broadcast through KeeperHub's secured wallet infrastructure, and then polled until completion.

The system maintains an auditable decision log containing both successful payments and held payouts, including the reasoning behind each decision.

**YouTube demo** https://youtu.be/uWtQdyf4ddo?si=qFKHrXNsNjyG_M5y
---

## Why This Exists

Recurring treasury payments are often implemented as simple scheduled jobs:

```text
Every hour
    â†“
Send payment
    â†“
Repeat
```

The problem is that the value of a payment does not remain constant relative to transaction costs.

A small recurring payment can make sense when network costs are low but become inefficient when gas increases.

Treasury Disbursement Agent changes the model:

```text
Scheduled cycle
      â†“
Read treasury balance
      â†“
Read current gas conditions
      â†“
Evaluate each recipient
      â†“
 â”Œâ”€â”€â”€â”€â”´â”€â”€â”€â”€â”
 â”‚         â”‚
PAY       HOLD
 â”‚         â”‚
 â†“         â†“
KeeperHub  Record decision
 â”‚
 â†“
Simulate
 â”‚
 â†“
Execute
 â”‚
 â†“
Poll status
 â”‚
 â†“
Confirmed
```

The agent therefore acts as a **decision layer**, rather than a simple timer-based transaction bot.

---

## One-Line Pitch

> **An agent that decides, each cycle, whether paying a fixed disbursement to each recipient wallet is worth the gas cost right now, and executes through KeeperHub only when the numbers support it.**

---

## Key Features

### ðŸ¤– AI-Powered Payment Decisions

Each payout is evaluated independently.

The agent provides the reasoning model with information such as:

- Treasury balance
- Current gas price
- Fixed disbursement amount
- Estimated transaction cost
- Minimum net-benefit threshold
- Recipient wallet

Groq, using `llama-3.3-70b-versatile`, produces a structured **pay-or-hold** decision together with plain-English reasoning.

### â›½ Gas-Aware Treasury Management

The agent does not assume that a scheduled payment is always economically sensible.

It evaluates the expected value of the disbursement against the estimated cost of executing the transaction.

Conceptually:

```text
Net Benefit = Disbursement Amount - Estimated Gas Cost
```

The configured threshold determines whether the payment is worth executing.

### ðŸ” KeeperHub Execution

The agent does not manage private keys or directly sign transactions.

Instead:

```text
Agent
  â†“
KeeperHub MCP
  â†“
Simulate
  â†“
Execute
  â†“
Poll
  â†“
Confirmed
```

KeeperHub provides the execution layer and its secured organizational wallet handles transaction signing.

### ðŸ§ª Simulation Before Execution

A payout is simulated before it is broadcast.

This creates an additional execution check between the agent's decision and the actual transaction.

### ðŸ“‹ Decision and Execution Audit Trail

The agent records every decision, including:

- Recipient wallet
- Decision
- Payout amount
- Gas information
- Treasury balance
- Reasoning
- Execution information
- Transaction hash
- Status

Decisions are stored in `agent/decisions.jsonl`.

KeeperHub also maintains its own execution history, giving the system two complementary audit layers.

### ðŸ“Š Web Dashboard

The project includes a Next.js dashboard for monitoring the agent.

The dashboard provides:

- Treasury statistics
- Recipient payout cards
- Recent decisions
- Full decision history
- Pay/hold filtering
- Wallet filtering
- Configuration settings
- Initial setup flow
- Sample data before the agent has produced real decisions

The dashboard reads the agent's decision ledger directly, so no separate database is required.

---

# Architecture

The system has two main components.

```text

â”‚                    Treasury Agent                       â”‚
â”‚                                                         â”‚
â”‚  Python Agent                                           â”‚
â”‚       â”‚                                                 â”‚
â”‚       â”œâ”€â”€ Chain Reader                                  â”‚
â”‚       â”‚      â””â”€â”€ Sepolia RPC                            â”‚
â”‚       â”‚                                                 â”‚
â”‚       â”œâ”€â”€ Groq Reasoner                                 â”‚
â”‚       â”‚      â””â”€â”€ Pay / Hold decision                    â”‚
â”‚       â”‚                                                 â”‚
â”‚       â””â”€â”€ KeeperHub MCP Client                          â”‚
â”‚              â””â”€â”€ Simulate â†’ Execute â†’ Poll              â”‚
â”‚                                                         â”‚
â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
                        â”‚
                        â–¼
                â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
                â”‚   KeeperHub   â”‚
                â”‚      MCP      â”‚
                â””â”€â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”€â”˜
                        â”‚
                        â–¼
                â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
                â”‚ Turnkey Walletâ”‚
                â”‚   Execution   â”‚
                â””â”€â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”€â”˜
                        â”‚
                        â–¼
                    Sepolia
                        â”‚
                        â–¼
                 Recipient Wallets


                        â”‚
                        â”‚ decisions.jsonl
                        â–¼

                â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
                â”‚   Dashboard   â”‚
                â”‚ Next.js +     â”‚
                â”‚ Tailwind CSS  â”‚
                â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
```

---

# Agent Workflow

Each cycle follows the same high-level process.

### 1. Read Treasury State

The agent reads the treasury wallet's current balance and network gas information directly from Sepolia.

### 2. Evaluate Recipients

Each configured payout wallet is evaluated independently.

For example:

```text
Treasury
   â”‚
   â”œâ”€â”€ Recipient A â†’ Evaluate
   â”œâ”€â”€ Recipient B â†’ Evaluate
   â””â”€â”€ Recipient C â†’ Evaluate
```

### 3. Ask the Reasoning Model

The current treasury and gas conditions are passed to Groq.

The model determines whether the payout should happen under the configured policy.

The output contains:

```text
Decision: PAY
Reason: The expected value of the disbursement
        remains above the configured net-benefit threshold.
```

or:

```text
Decision: HOLD
Reason: Current execution cost makes the payout
        uneconomical under the configured policy.
```

### 4. Hold or Execute

If the decision is `HOLD`, the agent records the decision and moves on.

If the decision is `PAY`, execution begins.

### 5. Simulate Through KeeperHub

The proposed transaction is sent to KeeperHub for simulation.

The agent does not immediately broadcast the transaction.

### 6. Execute Through KeeperHub

If simulation succeeds, the agent requests execution through KeeperHub.

KeeperHub signs from its secured organizational wallet.

### 7. Poll for Completion

The agent does not treat transaction submission as success.

It polls the execution status until the transaction reaches its final state.

### 8. Record the Result

The final decision and execution details are written to the decision ledger.

---

# Why KeeperHub Matters

KeeperHub is not simply being used as a transaction sender.

It acts as the **execution and reliability layer** between the agent's decision and the blockchain.

The architecture separates responsibilities:

| Component | Responsibility |
|---|---|
| Agent | Decide whether a payout should happen |
| Groq | Provide reasoning for the decision |
| Chain reader | Read balance and gas information |
| KeeperHub MCP | Provide transaction execution tools |
| KeeperHub | Simulate and execute transactions |
| Turnkey | Secure transaction signing |
| Sepolia | Blockchain settlement |
| Decision ledger | Store the agent's reasoning and results |
| Dashboard | Monitor the system |

This separation is important.

The agent decides.

**KeeperHub executes.**

---

# KeeperHub Integration

The project uses KeeperHub through its **Model Context Protocol (MCP)** interface.

The agent communicates with KeeperHub's execution tools rather than implementing its own wallet-signing system.

The execution path is:

```text
Agent
  â”‚
  â”‚ MCP
  â–¼
KeeperHub
  â”‚
  â”œâ”€â”€ Simulate transaction
  â”‚
  â”œâ”€â”€ Execute transaction
  â”‚
  â””â”€â”€ Poll execution status
          â”‚
          â–¼
       Completed
```

## Wallet Architecture

KeeperHub signs transactions from the organization's secured wallet.

The agent therefore does **not** require private keys for the treasury wallet.

The treasury address configured in the environment must correspond to the KeeperHub organization wallet used for execution.

This is an intentional part of the architecture rather than a workaround.

The system sends value **from the KeeperHub-controlled treasury wallet to recipient wallets**, which matches the execution model directly.

---

# Repository Structure

```text
Treasury-agent/
â”‚
â”œâ”€â”€ README.md
â”œâ”€â”€ SETUP.md
â”‚
â”œâ”€â”€ agent/
â”‚   â”œâ”€â”€ env.example
â”‚   â”œâ”€â”€ requirements.txt
â”‚   â”œâ”€â”€ decisions.sample.jsonl
â”‚   â”œâ”€â”€ agent.log
â”‚   â”œâ”€â”€ agent.pid
â”‚   â”‚
â”‚   â””â”€â”€ src/
â”‚       â”œâ”€â”€ agent.py
â”‚       â”œâ”€â”€ chain_reader.py
â”‚       â”œâ”€â”€ reasoner.py
â”‚       â””â”€â”€ mcp_client.py
â”‚
â””â”€â”€ dashboard/
    â”œâ”€â”€ app/
    â”œâ”€â”€ components/
    â”œâ”€â”€ lib/
    â”œâ”€â”€ public/
    â”œâ”€â”€ package.json
    â”œâ”€â”€ package-lock.json
    â”œâ”€â”€ next.config.js
    â”œâ”€â”€ postcss.config.js
    â”œâ”€â”€ tailwind.config.js
    â”œâ”€â”€ README.md
    â””â”€â”€ SETUP.md
```

The Python agent contains the reasoning and execution loop. The dashboard is a separate Next.js application that reads the agent's configuration and decision ledger.

---

# Technology Stack

## Agent

- **Python 3.10+**
- **Groq**
- `llama-3.3-70b-versatile`
- **KeeperHub MCP**
- **Sepolia**
- **Requests**
- **python-dotenv**

The agent dependencies are intentionally lightweight. The current `requirements.txt` contains `requests`, `python-dotenv`, and `groq`.

## Dashboard

- **Next.js 14**
- **React 18**
- **Tailwind CSS**
- **PostCSS**
- **Fontsource**

The dashboard is configured as a Next.js 14 App Router application.

---

# Getting Started

## Prerequisites

You need:

- Python 3.10+
- Node.js and npm
- A KeeperHub account
- A KeeperHub organization API key
- A KeeperHub organization wallet
- A Groq API key
- Sepolia ETH for the treasury wallet
- Three recipient wallet addresses

For a detailed Windows/WSL setup, see [`SETUP.md`](./SETUP.md).

---

## 1. Clone the Repository

```bash
git clone https://github.com/shola-devv/Treasury-agent.git
cd Treasury-agent
```

---

# 2. Configure the Agent

Move into the agent directory:

```bash
cd agent
```

Create your environment file:

```bash
cp env.example .env
```

Open `.env` and configure the required values.

```env
# KeeperHub
KEEPERHUB_API_KEY=kh_your_key_here
KEEPERHUB_MCP_URL=https://app.keeperhub.com/mcp

# Sepolia
CHAIN_ID=11155111

# KeeperHub organization wallet
TREASURY_WALLET_ADDRESS=0xYourTreasuryWalletHere

# Recipient wallets
PAYOUT_WALLET_1=0xYourPayoutWallet1
PAYOUT_WALLET_2=0xYourPayoutWallet2
PAYOUT_WALLET_3=0xYourPayoutWallet3

# Groq
GROQ_API_KEY=gsk_your_key_here
GROQ_MODEL=llama-3.3-70b-versatile

# Agent policy
DISBURSEMENT_AMOUNT_ETH=0.002
SWEEP_THRESHOLD_ETH=0.0005
POLL_INTERVAL_SECONDS=600
```

These variables correspond to the configuration currently used by the agent.

> **Important:** Never commit your `.env` file or API keys to Git.

---

# 3. Install Python Dependencies

Create a virtual environment:

```bash
python3 -m venv venv
```

Activate it:

```bash
source venv/bin/activate
```

Install dependencies:

```bash
pip install -r requirements.txt
```

The repository's setup guide recommends using a virtual environment for the agent.

---

# 4. Get Your KeeperHub Credentials

Create a KeeperHub account and organization.

Your organization provides the wallet that the agent uses as its treasury.

You will need:

- KeeperHub organization API key
- KeeperHub organization wallet address

The API key is configured as:

```env
KEEPERHUB_API_KEY=kh_your_key_here
```

The organization wallet is configured as:

```env
TREASURY_WALLET_ADDRESS=0x...
```

Make sure the treasury address exactly matches the KeeperHub organization wallet.

---

# 5. Configure Groq

Create a Groq API key and add it to:

```env
GROQ_API_KEY=gsk_your_key_here
```

The default reasoning model is:

```env
GROQ_MODEL=llama-3.3-70b-versatile
```

The agent uses Groq as its reasoning layer.

---

# 6. Fund the Treasury

The project runs on **Sepolia**, so the treasury requires Sepolia ETH.

Send test ETH to the KeeperHub organization wallet.

The recipient wallets do not need private keys because they are only destinations. KeeperHub sends the funds from the treasury wallet.

---

# 7. Run the Agent

From the `agent` directory:

```bash
python3 src/agent.py
```

The agent will begin its configured disbursement cycle.

It will:

1. Read treasury state.
2. Read current gas conditions.
3. Evaluate each payout.
4. Ask Groq for a pay/hold decision.
5. Simulate approved payouts through KeeperHub.
6. Execute approved payouts.
7. Poll for completion.
8. Write the result to `decisions.jsonl`.

---

# 8. Run the Dashboard

Open a second terminal.

From the project root:

```bash
cd dashboard
```

Install the dashboard dependencies:

```bash
npm install
```

Start the development server:

```bash
npm run dev
```

Open:

```text
http://localhost:3000
```

The dashboard contains the setup flow, live monitoring view, decision history, and settings interface.

---

# Dashboard

The dashboard is designed as the monitoring and control surface for the agent.

## Setup

The `/setup` flow allows configuration of:

- KeeperHub MCP URL
- KeeperHub API key
- Groq API key
- Chain ID
- Treasury wallet
- Recipient wallets
- Disbursement amount
- Net-benefit threshold
- Cycle configuration

The dashboard writes configuration to `agent/.env`.

## Dashboard Overview

The `/dashboard` page provides:

- Treasury statistics
- Recipient information
- Recent decisions
- Agent activity
- Execution results

The dashboard refreshes its decision data periodically by reading the decision ledger.

## Decision History

The `/decisions` page provides a complete view of agent decisions.

Decisions can be filtered by:

- Outcome
- Recipient wallet

Each decision includes the reasoning produced by the AI layer.

## Settings

The `/settings` page provides an editable version of the agent configuration.

After changing configuration, restart the Python agent because it reads the environment configuration when it starts.

---

# Data Flow Between Agent and Dashboard

There is intentionally no database between the two applications.

They communicate through files:

```text
                 â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
                 â”‚      agent/.env      â”‚
                 â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
                            â”‚
                 Dashboard writes
                            â”‚
                            â–¼
                         Agent
                            â”‚
                            â”‚ writes
                            â–¼
                 â”Œâ”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”
                 â”‚ agent/decisions.jsonlâ”‚
                 â””â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”¬â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”˜
                            â”‚
                     Dashboard reads
                            â”‚
                            â–¼
                       Dashboard
```

The current implementation uses:

| File | Written by | Read by |
|---|---|---|
| `agent/.env` | Dashboard | Agent |
| `agent/decisions.jsonl` | Agent | Dashboard |

This keeps the project simple and makes the agent and dashboard easy to run locally without a separate database or backend service.

---

# Configuration

The main agent policy values are:

| Variable | Purpose | Example |
|---|---|---|
| `DISBURSEMENT_AMOUNT_ETH` | Fixed payout per recipient | `0.002` |
| `SWEEP_THRESHOLD_ETH` | Minimum net benefit required | `0.0005` |
| `POLL_INTERVAL_SECONDS` | Execution polling interval | `600` |
| `CHAIN_ID` | Target blockchain | `11155111` |
| `GROQ_MODEL` | Reasoning model | `llama-3.3-70b-versatile` |

The example configuration uses a `0.002 ETH` payout and a `0.0005 ETH` minimum net-benefit threshold.

---

# Example Decision

Suppose:

```text
Payout:              0.002 ETH
Estimated gas cost:  0.0003 ETH
Threshold:           0.0005 ETH
```

The estimated net benefit is:

```text
0.002 - 0.0003
= 0.0017 ETH
```

Because:

```text
0.0017 ETH > 0.0005 ETH
```

the payout can be considered economically worthwhile.

The agent may therefore produce:

```text
PAY
```

If gas becomes significantly more expensive:

```text
Payout:              0.002 ETH
Estimated gas cost:  0.0017 ETH
Threshold:           0.0005 ETH
```

then:

```text
0.002 - 0.0017
= 0.0003 ETH
```

Since:

```text
0.0003 ETH < 0.0005 ETH
```

the agent can choose:

```text
HOLD
```

The important difference is that the decision changes with the current execution conditions.

---

# Testing and Demonstration

The system has been tested with three recipient wallets in a single cycle.

The agent:

- Evaluated all three recipients.
- Decided to pay all three.
- Sent each approved payout through KeeperHub.
- Simulated each execution before broadcasting.
- Broadcast the transactions through KeeperHub.
- Polled the executions to completion.
- Recorded execution IDs and transaction hashes.
- confirmed successful transaction hashes (confirmed on https://sepolia.etherscan.io):
   0x64c849200ae1cd327defe4e5ebd1f2cd4f68dac8d22959a7b835df9f841b9cd5
           0xb8ea0ae19ed1f73d67cbe48aeaba7677ac8df7ddd6e09aeee745ed27874d68ed                0xa4e019ad1317ddc346c81e8a2abf9abaf82a9893686a572854993039d0723311               0x65d442d5219817ab5ebcff29799ddaa10bc8a2c25e220901fe71748d5ab52286
         0x2128d9212bde6e4f2f76d90031f9b3d2e829d6076a4822b32383d374005dfe96

The result demonstrates the complete path:

```text
Agent decision
      â†“
KeeperHub MCP
      â†“
Simulation
      â†“
Execution
      â†“
Polling
      â†“
Completed
      â†“
Decision ledger
```

---

# Safety and Execution Model

The project separates **decision-making** from **transaction execution**.

The AI model does not hold or manage a private key.

Instead:

```text
AI
 â”‚
 â”‚ decision
 â–¼
Python Agent
 â”‚
 â”‚ execution request
 â–¼
KeeperHub
 â”‚
 â”‚ secure signing
 â–¼
Sepolia
```

This reduces the responsibility of the reasoning layer to deciding **whether** a transaction should happen.

The execution layer remains responsible for actually submitting the transaction.

---

# What Makes This Different From a Timer Bot?

A traditional payout bot might look like:

```python
while True:
    send_payment()
    sleep(3600)
```

This project instead follows:

```python
while True:
    state = read_treasury_state()

    decision = ask_agent(state)

    if decision == "PAY":
        execute_through_keeperhub()
    else:
        record_hold()

    wait_for_ne
