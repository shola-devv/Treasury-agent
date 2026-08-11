"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Nav from "../../components/Nav";
import Field from "../../components/Field";
import { FIELD_GROUPS, ALL_FIELDS } from "../../lib/fields";

const TOTAL_STEPS = FIELD_GROUPS.length + 2; // + review + run

export default function SetupPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [values, setValues] = useState({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const [showAgentKey, setShowAgentKey] = useState(false);
  const [blankedWalletKeys, setBlankedWalletKeys] = useState({});

  useEffect(() => {
    fetch("/api/config")
      .then((r) => r.json())
      .then((data) => {
        const incoming = data.values ?? {};
        setValues(incoming);
        setLoaded(true);
        setBlankedWalletKeys((prev) => ({
          ...prev,
          ...(incoming.TREASURY_WALLET_ADDRESS ? { TREASURY_WALLET_ADDRESS: true } : {}),
          ...(incoming.PAYOUT_WALLET_1 ? { PAYOUT_WALLET_1: true } : {}),
          ...(incoming.PAYOUT_WALLET_2 ? { PAYOUT_WALLET_2: true } : {}),
          ...(incoming.PAYOUT_WALLET_3 ? { PAYOUT_WALLET_3: true } : {}),
        }));
      })
      .catch(() => setLoaded(true));
  }, []);

  function update(key, val) {
    setValues((prev) => ({ ...prev, [key]: val }));
    if (blankedWalletKeys[key]) {
      setBlankedWalletKeys((prev) => ({ ...prev, [key]: false }));
    }
  }

  async function saveAndContinue() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ values }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "Could not save configuration.");
      }
      setStep((s) => s + 1);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  const group = FIELD_GROUPS[step - 1];
  const customAgentField = group?.fields.find((field) => field.key === "GROQ_API_KEY");
  const isReviewStep = step === FIELD_GROUPS.length + 1;
  const isFinalStep = step === TOTAL_STEPS;

  return (
    <main className="min-h-screen">
      <Nav tone="dark" />

      <div className="mx-auto max-w-2xl px-6 pb-24 pt-6 sm:pt-10">
        <div className="mb-8 text-center">
          <span className="font-body text-xs font-semibold uppercase tracking-wide text-amber-500">
            Setup · step {step} of {TOTAL_STEPS}
          </span>
          <h1 className="mt-2 font-display text-3xl text-ink sm:text-4xl">
            {isFinalStep ? "Run the agent" : isReviewStep ? "Review & save" : group.title}
          </h1>
          {!isFinalStep && !isReviewStep && (
            <p className="mx-auto mt-2 max-w-md font-body text-sm text-clay">
              {group.description}
            </p>
          )}
        </div>

        <div className="mb-8 flex items-center justify-center gap-2">
          {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
            <span
              key={i}
              className={`h-1.5 rounded-full transition-all ${
                i + 1 === step ? "w-8 bg-ink" : i + 1 < step ? "w-4 bg-amber-400" : "w-4 bg-ink/10"
              }`}
            />
          ))}
        </div>

        <div className="rounded-5xl border border-ink/5 bg-white/80 p-8 shadow-card">
          {!loaded && <p className="font-body text-sm text-clay">Loading current configuration…</p>}

          {loaded && group && !isReviewStep && !isFinalStep && (
            <div className="space-y-5">
              {group.fields
                .filter((field) => !(step === 1 && field.key === "GROQ_API_KEY"))
                .map((field) => {
                  const isBlankedWallet =
                    step === 2 &&
                    ["TREASURY_WALLET_ADDRESS", "PAYOUT_WALLET_1", "PAYOUT_WALLET_2", "PAYOUT_WALLET_3"].includes(field.key) &&
                    blankedWalletKeys[field.key];
                  return (
                    <Field
                      key={field.key}
                      field={field}
                      value={isBlankedWallet ? "" : values[field.key] ?? ""}
                      onChange={update}
                    />
                  );
                })}

              {step === 1 && customAgentField && (
                <div className="rounded-4xl border border-ink/10 bg-cream/80 p-4">
                  <button
                    type="button"
                    onClick={() => setShowAgentKey((open) => !open)}
                    className="flex w-full items-center justify-between rounded-3xl bg-white px-4 py-3 text-left font-body text-sm font-semibold text-ink shadow-sm transition hover:bg-ink/5"
                  >
                    <span>Add custom agent API key</span>
                    <span className="text-ink/70">{showAgentKey ? "−" : "+"}</span>
                  </button>
                  <p className="mt-3 text-sm text-clay">
                    Go to KeeperHub dashboard and add an API key, then paste it here.
                  </p>

                  {showAgentKey && (
                    <div className="mt-4">
                      <Field
                        field={{
                          ...customAgentField,
                          label: "Agent API key",
                          help: "Powers the pay-or-hold reasoning step each cycle.",
                        }}
                        value={values[customAgentField.key]}
                        onChange={update}
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {loaded && isReviewStep && (
            <ReviewStep values={values} />
          )}

          {loaded && isFinalStep && <RunStep />}

          {error && (
            <p className="mt-4 rounded-2xl bg-rust-50 px-4 py-3 font-body text-sm text-rust-600">
              {error}
            </p>
          )}
        </div>

        <div className="mt-6 flex items-center justify-between">
          <button
            type="button"
            onClick={() => setStep((s) => Math.max(1, s - 1))}
            disabled={step === 1}
            className="rounded-full border border-ink/10 px-6 py-3 font-body text-sm font-semibold text-ink transition-opacity disabled:opacity-0"
          >
            Back
          </button>

          {isReviewStep ? (
            <button
              type="button"
              onClick={saveAndContinue}
              disabled={saving}
              className="rounded-full bg-ink px-7 py-3 font-body text-sm font-semibold text-cream shadow-card transition-transform hover:scale-[1.03] active:scale-[0.98] disabled:opacity-60"
            >
              {saving ? "Saving…" : "Save configuration"}
            </button>
          ) : isFinalStep ? (
            <button
              type="button"
              onClick={() => router.push("/dashboard")}
              className="rounded-full bg-ink px-7 py-3 font-body text-sm font-semibold text-cream shadow-card transition-transform hover:scale-[1.03] active:scale-[0.98]"
            >
              Go to dashboard
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setStep((s) => s + 1)}
              className="rounded-full bg-ink px-7 py-3 font-body text-sm font-semibold text-cream shadow-card transition-transform hover:scale-[1.03] active:scale-[0.98]"
            >
              Continue
            </button>
          )}
        </div>
      </div>
    </main>
  );
}

function ReviewStep({ values }) {
  return (
    <div className="space-y-6">
      <p className="font-body text-sm text-clay">
        This writes <code className="rounded bg-ink/5 px-1.5 py-0.5 font-mono text-xs">agent/.env</code> —
        the same file <code className="rounded bg-ink/5 px-1.5 py-0.5 font-mono text-xs">agent.py</code> reads
        on startup. Nothing is sent anywhere else.
      </p>
      {FIELD_GROUPS.map((group) => (
        <div key={group.step}>
          <h3 className="font-body text-xs font-semibold uppercase tracking-wide text-amber-500">
            {group.title}
          </h3>
          <dl className="mt-2 divide-y divide-ink/5 overflow-hidden rounded-2xl border border-ink/5">
            {group.fields.map((field) => {
              const raw = values[field.key];
              const display = field.secret
                ? raw
                  ? "set"
                  : "not set"
                : raw || "not set";
              return (
                <div key={field.key} className="flex items-center justify-between gap-4 bg-white px-4 py-2.5">
                  <dt className="font-body text-sm text-clay">{field.label}</dt>
                  <dd
                    className={`font-mono text-xs ${
                      raw ? "text-ink" : "text-rust-500"
                    }`}
                  >
                    {display}
                  </dd>
                </div>
              );
            })}
          </dl>
        </div>
      ))}
    </div>
  );
}

function RunStep() {
  return (
    <div className="space-y-5">
      <p className="font-body text-sm text-clay">
        Your configuration is saved to <code className="rounded bg-ink/5 px-1.5 py-0.5 font-mono text-xs">agent/.env</code>.
        Start the agent from a terminal (WSL) to begin logging real cycles — the
        dashboard reads <code className="rounded bg-ink/5 px-1.5 py-0.5 font-mono text-xs">agent/decisions.jsonl</code> as
        it grows.
      </p>
      <CodeBlock
        label="From the project root"
        lines={[
          "cd agent",
          "python3 -m venv .venv",
          "source .venv/bin/activate",
          "pip install -r requirements.txt",
          "python src/agent.py",
        ]}
      />
      <p className="font-body text-xs text-clay">
        Until the agent has run at least one cycle, the dashboard shows sample data
        so you can see the layout in action.
      </p>
    </div>
  );
}

function CodeBlock({ label, lines }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-ink/10 bg-ink text-cream">
      <div className="border-b border-cream/10 px-4 py-2 font-body text-xs text-cream/60">
        {label}
      </div>
      <pre className="overflow-x-auto px-4 py-3 font-mono text-xs leading-relaxed">
        {lines.join("\n")}
      </pre>
    </div>
  );
}
