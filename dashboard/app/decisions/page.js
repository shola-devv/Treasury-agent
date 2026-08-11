"use client";

import { useEffect, useMemo, useState } from "react";
import Nav from "../../components/Nav";
import Badge from "../../components/Badge";
import { shortAddress, shortHash, formatEth, timeAgo, explorerTxUrl } from "../../lib/format";

const FILTERS = [
  { key: "all", label: "All" },
  { key: "pay", label: "Paid" },
  { key: "hold", label: "Held" },
];

export default function DecisionsPage() {
  const [decisions, setDecisions] = useState([]);
  const [source, setSource] = useState("demo");
  const [filter, setFilter] = useState("all");
  const [walletFilter, setWalletFilter] = useState("all");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch("/api/decisions?limit=500");
        const json = await res.json();
        if (cancelled) return;
        setDecisions(json.decisions ?? []);
        setSource(json.source ?? "demo");
      } catch {
        // keep prior state on transient failure
      }
    }
    load();
    const interval = setInterval(load, 15000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  const wallets = useMemo(
    () => Array.from(new Set(decisions.map((d) => d.wallet))),
    [decisions]
  );

  const filtered = decisions.filter((d) => {
    if (filter !== "all" && d.decision !== filter) return false;
    if (walletFilter !== "all" && d.wallet !== walletFilter) return false;
    return true;
  });

  return (
    <main className="min-h-screen">
      <Nav tone="dark" />

      <div className="mx-auto max-w-6xl px-6 pb-24 pt-4 sm:pt-8">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="font-display text-3xl text-ink sm:text-4xl">Decision log</h1>
            <p className="mt-1 font-body text-sm text-clay">
              Every cycle, per wallet — paid and held alike, with the reasoning attached.
            </p>
          </div>
          {source === "demo" && <Badge tone="neutral">Showing sample data</Badge>}
        </div>

        <div className="mb-6 flex flex-wrap items-center gap-3">
          <div className="flex gap-1.5 rounded-full border border-ink/10 bg-white/70 p-1">
            {FILTERS.map((f) => (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={`rounded-full px-4 py-1.5 font-body text-xs font-semibold transition-colors ${
                  filter === f.key ? "bg-ink text-cream" : "text-clay hover:text-ink"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          <select
            value={walletFilter}
            onChange={(e) => setWalletFilter(e.target.value)}
            className="rounded-full border border-ink/10 bg-white/70 px-4 py-2 font-mono text-xs text-ink outline-none"
          >
            <option value="all">All wallets</option>
            {wallets.map((w) => (
              <option key={w} value={w}>
                {shortAddress(w)}
              </option>
            ))}
          </select>
        </div>

        <div className="overflow-hidden rounded-4xl border border-ink/5 bg-white/70 shadow-card">
          <div className="hidden grid-cols-[1fr_1fr_1fr_2fr_auto] gap-4 border-b border-ink/5 px-6 py-3 font-body text-xs font-semibold uppercase tracking-wide text-clay sm:grid">
            <span>Wallet</span>
            <span>Decision</span>
            <span>Net benefit</span>
            <span>Reasoning</span>
            <span>When</span>
          </div>
          <ul className="divide-y divide-ink/5">
            {filtered.map((d, i) => (
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
                <span className="font-mono text-xs text-ink">{formatEth(d.net_benefit_eth)} ETH</span>
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
            {filtered.length === 0 && (
              <li className="px-6 py-10 text-center font-body text-sm text-clay">
                No decisions match this filter.
              </li>
            )}
          </ul>
        </div>
      </div>
    </main>
  );
}
