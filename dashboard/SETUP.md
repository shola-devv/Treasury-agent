# Setup — Windows (WSL)

Everything below assumes Ubuntu-on-WSL2 and runs in the WSL terminal, not
PowerShell. If `wsl --version` fails, install WSL first:

```powershell
# In PowerShell, as Administrator, then reboot when prompted
wsl --install -d Ubuntu
```

## 1. Get the folders onto your WSL filesystem

Work from inside the Linux filesystem (`~/projects/...`), not `/mnt/c/...`
— builds are dramatically faster there and file-watching is more
reliable.

```bash
mkdir -p ~/projects && cd ~/projects
# copy or clone your project so you end up with:
#   ~/projects/treasury-sweep-agent/agent/
#   ~/projects/treasury-sweep-agent/dashboard/
```

## 2. Install Node.js (for the dashboard)

```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
source ~/.bashrc
nvm install 20
node -v   # v20.x
```

## 3. Install Python (for the agent)

Ubuntu-on-WSL ships Python 3.12 already; confirm and add venv support:

```bash
python3 --version
sudo apt update && sudo apt install -y python3-venv python3-pip
```

## 4. Run the dashboard

```bash
cd ~/projects/treasury-sweep-agent/dashboard
npm install
npm run dev
```

Open `http://localhost:3000` in your Windows browser — WSL2 forwards
`localhost` automatically, no extra config needed.

You'll land on the landing page. Click **Get started** to run the setup
wizard — it walks through KeeperHub connection details, your treasury +
payout wallet addresses, and the disbursement policy (amount, threshold,
cycle interval), then writes all of it to `agent/.env`.

Until you've done that, `/dashboard` and `/decisions` show sample data
(`agent/decisions.sample.jsonl`) so you can see the full layout without
any live config.

## 5. Run the agent

In a **second** WSL terminal, alongside the dashboard (don't close the one
running `npm run dev`):

```bash
cd ~/projects/treasury-sweep-agent/agent
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python src/agent.py
```

The agent reads `agent/.env` once at startup — if you change config in
the dashboard's `/setup` or `/settings` afterward, stop the agent
(`Ctrl+C`) and restart it to pick up the new values. Each cycle appends a
line to `agent/decisions.jsonl`, which the dashboard polls every 15
seconds.

## Demo flow (no live wallets needed)

To see the full dashboard without configuring anything real:

1. `npm run dev` inside `dashboard/`, open `http://localhost:3000`.
2. Go straight to `/dashboard` — it's pre-populated from
   `agent/decisions.sample.jsonl` and clearly labeled `Showing sample data`.
3. Walk through `/setup` with placeholder values to see the wizard end to
   end; the review step shows exactly what will be written before you
   save anything.
4. To see the "live" state, copy the sample file over the real one and
   touch its last line's timestamp so it looks recent:
   ```bash
   cd agent
   cp decisions.sample.jsonl decisions.jsonl
   ```
   The status badge on `/dashboard` will flip from "waiting" to
   "running" once `.env` is also filled in.

## Deployment

The dashboard reads and writes plain files (`agent/.env`,
`agent/decisions.jsonl`) on the local filesystem next to the agent
process — by design, so there's no database and no extra API surface
between the two. That has one consequence for deployment:

**The dashboard and the agent must run on the same host**, as sibling
folders. Don't deploy the dashboard to a serverless platform (Vercel,
Netlify, etc.) expecting it to reach a `.env` file or `decisions.jsonl`
sitting on a different machine — serverless functions don't share a
persistent filesystem with a long-running Python process.

Recommended: a small always-on VPS (e.g. a $5–6/mo box — DigitalOcean,
Hetzner, Linode) running both processes under a process manager.

```bash
# On the server, after cloning both folders side by side:

# Dashboard
cd treasury-sweep-agent/dashboard
npm install
npm run build
npx pm2 start npm --name treasury-dashboard -- start

# Agent
cd ../agent
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
npx pm2 start .venv/bin/python --name treasury-agent -- src/agent.py

pm2 save
pm2 startup   # follow the printed instructions to survive reboots
```

Put the dashboard behind a reverse proxy (nginx or Caddy) for TLS if
you're exposing it beyond `localhost` — `KEEPERHUB_API_KEY` and
`GROQ_API_KEY` live in `agent/.env` on that box, so treat SSH access to
it with the same care as any other server holding API keys.

If you'd rather not manage a VPS, the same two-process-on-one-box shape
works fine on a Raspberry Pi, a spare machine, or WSL itself left running
in the background — anywhere `agent/.env` and `agent/decisions.jsonl` are
on disk next to both processes.
