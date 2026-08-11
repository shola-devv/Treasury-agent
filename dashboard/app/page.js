import Link from "next/link";
import Nav from "../components/Nav";

const SIGNALS = [
  {
    tag: "01 · Read",
    title: "Balance & gas, live",
    body: "Every cycle starts by reading the treasury's real balance and the current gas price off-chain — no assumptions carried over from last time.",
  },
  {
    tag: "02 · Reason",
    title: "Agent decides pay or hold",
    body: "The disbursement amount is weighed against gas, in plain language, per wallet — with the reasoning logged, not just the outcome.",
  },
  {
    tag: "03 · Execute",
    title: "Simulate, then KeeperHub",
    body: "Every payout is dry-run tested before it's signed from KeeperHub's Turnkey-managed treasury wallet, then polled to a confirmed status.",
  },
];

export default function LandingPage() {
  return (
    <main className="min-h-screen">
      <section className="bg-hero relative overflow-hidden">
        <Nav tone="light" />

        <div className="relative z-10 mx-auto flex min-h-[82vh] max-w-4xl flex-col items-center px-6 pb-24 pt-[52vh] text-center text-white sm:min-h-[84vh] sm:pb-32 sm:pt-[48vh] lg:pt-[44vh] xl:pt-[40vh]">
          <h1 className="font-display text-4xl leading-[1.06] tracking-tight text-white sm:text-5xl md:text-6xl">
            # Pay only when it's
            <br />
            <span className="italic text-white">worth the gas</span>
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-base leading-8 text-white/90 sm:text-lg">
            a treasury agent executed on keeper hub
          </p>

          <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row sm:gap-4">
            <Link
              href="/setup"
              className="inline-flex items-center justify-center rounded-full bg-white px-8 py-3.5 text-sm font-semibold text-ink transition-transform hover:-translate-y-0.5 active:translate-y-0"
            >
              Get started
            </Link>
            <Link
              href="/dashboard?demo=1"
              className="inline-flex items-center justify-center rounded-full border border-white/20 bg-white/10 px-8 py-3.5 text-sm font-semibold text-white transition hover:border-white/30 hover:bg-white/15"
            >
              View dashboard
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-20 sm:py-28">
        <div className="mb-14 text-center">
          <p className="font-body text-sm uppercase tracking-[0.32em] text-slate-500 sm:text-base">
            Fast, transparent treasury flow
          </p>
          <h2 className="mt-4 font-display text-3xl italic text-ink sm:text-4xl">
            One loop, three honest steps
          </h2>
          <p className="mx-auto mt-4 max-w-xl font-body text-base leading-8 text-clay sm:text-lg">
            Nothing is sent on a timer alone. Each recipient is judged on its own merits every cycle.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {SIGNALS.map((s) => (
            <div
              key={s.title}
              className="group overflow-hidden rounded-[2rem] border border-ink/10 bg-white/95 p-7 shadow-card transition-transform duration-300 hover:-translate-y-1 hover:shadow-soft sm:p-8"
            >
              <span className="inline-flex rounded-full bg-amber-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.25em] text-amber-600 shadow-[0_1px_4px_rgba(201,148,61,0.12)]">
                {s.tag}
              </span>
              <h3 className="mt-5 font-display text-2xl text-ink">{s.title}</h3>
              <p className="mt-3 font-body text-sm leading-relaxed text-clay sm:text-base">
                {s.body}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-5xl px-6 pb-24">
        <div className="flex flex-col items-center justify-between gap-6 rounded-5xl border border-ink/5 bg-white/70 p-10 text-center shadow-card sm:flex-row sm:text-left">
          <div>
            <h3 className="font-display text-2xl text-ink">Ready to configure your treasury?</h3>
            <p className="mt-2 font-body text-sm text-clay">
              Add your KeeperHub connection, wallets, and disbursement policy — takes
              about three minutes.
            </p>
          </div>
          <Link
            href="/setup"
            className="shrink-0 rounded-full bg-ink px-7 py-3.5 font-body text-sm font-semibold text-cream shadow-card transition-transform hover:scale-[1.03] active:scale-[0.98]"
          >
            Start setup
          </Link>
        </div>
      </section>

      <footer className="border-t border-ink/5 px-6 py-8 text-center font-body text-xs text-clay">
        Treasury Disbursement Agent — built on KeeperHub's MCP execution layer.
      </footer>
    </main>
  );
}
