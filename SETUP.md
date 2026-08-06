# Setup — Windows / WSL

Do everything below **inside WSL** (Ubuntu), not native Windows PowerShell.
Mixed Windows-Python + WSL-Python environments are a common source of
"works on my machine" bugs — pick one and stay in it.

## 0. Confirm WSL2 is set up

Open PowerShell as Administrator:

```powershell
wsl --status
```

If WSL isn't installed yet:

```powershell
wsl --install -d Ubuntu
```

Restart if prompted, then open "Ubuntu" from the Start menu and finish the
first-run username/password setup.

From here on, everything happens inside that Ubuntu terminal.

## 1. Base tools inside WSL

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y python3 python3-venv python3-pip git curl
python3 --version   # want 3.10+
```

## 2. Pick a folder location

Two options:

- **Inside the Linux filesystem** (recommended — faster, fewer permission
  headaches): `~/projects/`
- **On your Windows drive, accessible from WSL:** `/mnt/c/Users/<you>/projects/`
  (works, but file I/O is noticeably slower across the WSL/Windows boundary,
  and you'll want to open it in VS Code via `code .` either way)

```bash
mkdir -p ~/projects
cd ~/projects
```

## 3. Get the project files in

If you're putting this in git (recommended so you can also submit via a
repo link):

```bash
cd ~/projects
git init treasury-sweep-agent
cd treasury-sweep-agent
```

Then copy in the files from this conversation (README.md, .gitignore,
agent/, dashboard/) — either drag-and-drop into the WSL path via Windows
Explorer (`\\wsl$\Ubuntu\home\<you>\projects\treasury-sweep-agent`), or
recreate them with the content already shown. If you'd rather I hand you a
single zip/tarball to unpack, say so and I'll package one.

## 4. VS Code (optional but recommended)

Install the "WSL" extension in VS Code on Windows, then from inside your
WSL terminal:

```bash
cd ~/projects/treasury-sweep-agent
code .
```

This opens VS Code running against the WSL filesystem directly — no path
confusion, integrated terminal already in the right environment.

## 5. Python environment for the agent

```bash
cd ~/projects/treasury-sweep-agent/agent
python3 -m venv venv
source venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
```

You'll need to run `source venv/bin/activate` again every time you open a
new terminal to work on this.

## 6. Accounts and keys (all free)

| What | Where | Notes |
|---|---|---|
| KeeperHub account + org | [app.keeperhub.com](https://app.keeperhub.com) | Org wallet auto-created via Turnkey — this is your treasury address |
| KeeperHub API key | Settings → API Keys → Organisation tab | Starts with `kh_` |
| Sepolia ETH ×3 | any public faucet, e.g. [sepoliafaucet.com](https://sepoliafaucet.com) | One faucet claim per wallet; some faucets rate-limit by IP/account, so space these out or use different faucets |
| 3 throwaway wallets | MetaMask (create account ×3) or `cast wallet new` | Never reuse these anywhere real |
| Groq API key | [console.groq.com](https://console.groq.com) | No credit card for free tier |

## 7. Configure

```bash
cd ~/projects/treasury-sweep-agent/agent
cp .env.example .env
nano .env   # or open in VS Code
```

Fill in every value. Double-check `TREASURY_WALLET_ADDRESS` matches your
KeeperHub org wallet exactly.

## 8. First run

```bash
source venv/bin/activate
cd src
python agent.py
```

Watch the terminal output. First things to verify:
- Does `KeeperHubMCPClient._initialize()` succeed, or does it error? This is
  the part most likely to need debugging — MCP session handling against a
  live server is the one piece I couldn't test ahead of time.
- Do the three balance reads come back with sane numbers?
- Does Groq return a decision within a second or two?

If `_initialize()` throws, the fastest debug step is a raw `curl` against
the MCP endpoint to see exactly what KeeperHub sends back, e.g.:

```bash
curl -i -X POST https://app.keeperhub.com/mcp \
  -H "Authorization: Bearer $KEEPERHUB_API_KEY" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{"jsonrpc":"2.0","id":"1","method":"initialize","params":{"protocolVersion":"2025-06-18","capabilities":{},"clientInfo":{"name":"debug","version":"0.1"}}}'
```

Paste me the raw response if it doesn't match what `mcp_client.py` expects
and I'll fix the parsing.

## 9. Confirm decisions are logging

After one cycle completes:

```bash
cat ~/projects/treasury-sweep-agent/agent/decisions.jsonl
```

You should see one JSON line per wallet per cycle. This file is what the
dashboard will read.
