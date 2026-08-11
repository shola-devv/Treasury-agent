"use client";

import { useEffect, useState } from "react";
import Nav from "../../components/Nav";
import Badge from "../../components/Badge";
import StatCard from "../../components/StatCard";
import {
  shortAddress,
  shortHash,
  formatEth,
  timeAgo,
  explorerTxUrl,
} from "../../lib/format";

const REFRESH_MS = 15000;

export default function DashboardPage() {
  const [decisions, setDecisions] = useState([]);
  const [source, setSource] = useState("demo");
  const [status, setStatus] = useState({ state: "not_configured", configured: false });
  const [logLines, setLogLines] = useState([]);
  const [logSource, setLogSource] = useState("empty");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const [dRes, sRes, lRes] = await Promise.all([
          fetch("/api/decisions?limit=100"),
          fetch("/api/status"),
          fetch("/api/logs?limit=80"),
        ]);
        const dJson = await dRes.json();
        const sJson = await sRes.json();
        const lJson = await lRes.json();
        if (cancelled) return;
        setDecisions(dJson.decisions ?? []);
        setSource(dJson.source ?? "demo");
        setStatus(sJson);
        setLogLines(lJson.lines ?? []);
        setLogSource(lJson.source ?? "empty");
        if (sJson.configured && !sJson.agentRunning) {
          fetch("/api/agent/start").catch(() => null);
        }
      } catch {
        // network hiccup — keep showing whatever we had
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    const interval = setInterval(load, REFRESH_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  const wallets = groupByWallet(decisions);
  const paidCount = decisions.filter((d) => d.decision === "pay" && d.tx_status === "completed").length;
  const heldCount = decisions.filter((d) => d.decision === "hold").length;
  const totalPaidEth = decisions
    .filter((d) => d.decision === "pay" && d.tx_status === "completed")
    .reduce((sum, d) => sum + Number(d.disbursement_amount_eth || 0), 0);
  const avgGas =
    decisions.length > 0
      ? decisions.reduce((sum, d) => sum + Number(d.gas_cost_eth || 0), 0) / decisions.length
      : 0;

  return (
    <main className="min-h-screen">
      <Nav tone="dark" />

      <div className="mx-auto max-w-6xl px-6 pb-24 pt-4 sm:pt-8">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="font-display text-3xl text-ink sm:text-4xl">Treasury overview</h1>
            <p className="mt-1 font-body text-sm text-clay">
              Refreshes every 15s from the agent's own decision log and workflow output.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {source === "demo" && (
              <Badge tone="neutral">Showing sample data</Badge>
            )}
            <Badge tone={status.state === "running" ? "running" : status.state === "not_configured" ? "not_configured" : status.state}>
              {status.state === "running"
                ? "Agent running"
                : status.state === "waiting"
                ? "Configured, waiting for first cycle"
                : status.state === "stalled"
                ? "No recent cycles"
                : "Not configured"}
            </Badge>
          </div>
        </div>

        <section className="mb-10 rounded-[2.5rem] border border-ink/10 bg-slate-950/95 p-6 shadow-soft text-white">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-3">
                <h2 className="font-display text-2xl text-white sm:text-3xl">Live agent workflow</h2>
                <div className="workflow-loader" aria-hidden="true">
                  <span className="workflow-dot workflow-dot-1" />
                  <span className="workflow-dot workflow-dot-2" />
                  <span className="workflow-dot workflow-dot-3" />
                  <span className="workflow-dot workflow-dot-4" />
                </div>
              </div>
              <p className="mt-2 max-w-2xl font-body text-sm text-slate-300">
                View the agent's running process and workflow output as it logs cycles, checks gas, reasons, and executes transactions.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone={logSource === "live" ? "running" : logSource === "empty" ? "neutral" : "default"}>
                {logSource === "live" ? "Live workflow" : logSource === "empty" ? "No workflow log yet" : "Workflow loaded"}
              </Badge>
              <Badge tone="neutral">{logLines.length} lines</Badge>
            </div>
          </div>

          <div className="mt-6 overflow-hidden rounded-4xl border border-white/10 bg-slate-900/90 p-4 shadow-inner">
            {logLines.length === 0 ? (
              <p className="font-body text-sm text-slate-400">Waiting for agent workflow output...</p>
            ) : (
              <pre className="max-h-[8rem] overflow-y-auto whitespace-pre-wrap text-xs leading-6 text-slate-100 sm:max-h-[12rem]">
{logLines.join("\n")}
              </pre>
            )}
          </div>
        </section>

        {status.state === "not_configured" && (
          <div className="mb-8 rounded-4xl border border-amber-200 bg-amber-50 p-6">
            <p className="font-body text-sm text-amber-600">
              You haven't finished setup yet — this dashboard is showing sample data so
              you can see the layout. <a href="/setup" className="font-semibold underline">Run the setup wizard</a> to
              connect KeeperHub and your wallets.
            </p>
          </div>
        )}

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard label="Paid this session" value={paidCount} unit="txns" accent="sage" />
          <StatCard label="Held this session" value={heldCount} unit="cycles" accent="amber" />
          <StatCard label="Total disbursed" value={formatEth(totalPaidEth, 4)} unit="ETH" accent="plum" />
          <StatCard label="Avg. gas / transfer" value={formatEth(avgGas, 5)} unit="ETH" accent="rust" />
        </div>

        <section className="mt-10">
          <h2 className="mb-4 font-display text-xl italic text-ink">Payout wallets</h2>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {wallets.length === 0 && !loading && (
              <p className="font-body text-sm text-clay">No decisions logged yet.</p>
            )}
            {wallets.map((w) => (
              <WalletCard key={w.wallet} wallet={w} />
            ))}
          </div>
        </section>

        <section className="mt-10">
          <h2 className="mb-4 font-display text-xl italic text-ink">Recent decisions</h2>
          <div className="overflow-hidden rounded-4xl border border-ink/5 bg-white/70 shadow-card">
            <div className="hidden grid-cols-[1fr_1fr_1fr_2fr_auto] gap-4 border-b border-ink/5 px-6 py-3 font-body text-xs font-semibold uppercase tracking-wide text-clay sm:grid">
              <span>Wallet</span>
              <span>Decision</span>
              <span>Net benefit</span>
              <span>Reasoning</span>
              <span>When</span>
            </div>
            <ul className="divide-y divide-ink/5">
              {decisions.slice(0, 25).map((d, i) => (
                <li
                  key={`${d.wallet}-${d.logged_at}-${i}`}
                  className="grid grid-cols-1 gap-2 px-6 py-4 sm:grid-cols-[1fr_1fr_1fr_2fr_auto] sm:items-center sm:gap-4"
                >
                  <span className="font-mono text-xs text-ink">{shortAddress(d.wallet)}</span>
                  <span>
                    <Badge tone={d.decision === "pay" ? (d.tx_status ?? "pay") : "hold"}>
                      {d.decision === "pay" ? d.tx_status ?? "pending" : "held"}
                    </Badge>
                  </span>
                  <span className="font-mono text-xs text-ink">
                    {formatEth(d.net_benefit_eth)} ETH
                  </span>
                  <span className="font-body text-xs text-clay">{d.reasoning}</span>
                  <span className="flex items-center justify-between gap-3 font-body text-xs text-clay sm:justify-end">
                    {timeAgo(d.logged_at)}
                    {d.tx_hash && (
                      <a
                        href={explorerTxUrl(d.tx_hash)}
                        target="_blank"
                        rel="noreferrer"
                        className="font-mono text-amber-600 underline underline-offset-2"
                      >
                        {shortHash(d.tx_hash)}
                      </a>
                    )}
                  </span>
                </li>
              ))}
              {decisions.length === 0 && (
                <li className="px-6 py-8 text-center font-body text-sm text-clay">
                  Nothing logged yet — decisions will appear here as the agent runs.
                </li>
              )}
            </ul>
          </div>
        </section>

      </div>
    </main>
  );
}

function groupByWallet(decisions) {
  const map = new Map();
  for (const d of decisions) {
    if (!map.has(d.wallet)) {
      map.set(d.wallet, { wallet: d.wallet, decisions: [] });
    }
    map.get(d.wallet).decisions.push(d);
  }
  return Array.from(map.values());
}

function WalletCard({ wallet }) {
  const latest = wallet.decisions[0];
  const paidCount = wallet.decisions.filter(
    (d) => d.decision === "pay" && d.tx_status === "completed"
  ).length;

  return (
    <div className="rounded-4xl border border-ink/5 bg-white/70 p-6 shadow-card">
      <div className="flex items-center justify-between">
        <span className="font-mono text-xs text-ink">{shortAddress(wallet.wallet)}</span>
        {latest && (
          <Badge tone={latest.decision === "pay" ? (latest.tx_status ?? "pay") : "hold"}>
            {latest.decision === "pay" ? latest.tx_status ?? "pending" : "held"}
          </Badge>
        )}
      </div>
      <p className="mt-4 font-body text-xs text-clay">Confirmed payouts</p>
      <p className="font-display text-2xl text-ink">{paidCount}</p>
      {latest && (
        <p className="mt-3 line-clamp-2 font-body text-xs text-clay">{latest.reasoning}</p>
      )}
    </div>
  );
}
