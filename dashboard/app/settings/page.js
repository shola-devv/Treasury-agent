"use client";

import { useEffect, useState } from "react";
import Nav from "../../components/Nav";
import Field from "../../components/Field";
import Badge from "../../components/Badge";
import { FIELD_GROUPS } from "../../lib/fields";

export default function SettingsPage() {
  const [values, setValues] = useState({});
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch("/api/config")
      .then((r) => r.json())
      .then((data) => {
        setValues(data.values ?? {});
        setLoaded(true);
      })
      .catch(() => setLoaded(true));
  }, []);

  function update(key, val) {
    setSaved(false);
    setValues((prev) => ({ ...prev, [key]: val }));
  }

  async function save() {
    setSaving(true);
    setError(null);
    setSaved(false);
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
      setSaved(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="min-h-screen">
      <Nav tone="dark" />

      <div className="mx-auto max-w-3xl px-6 pb-24 pt-4 sm:pt-8">
        <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="font-display text-3xl text-ink sm:text-4xl">Settings</h1>
            <p className="mt-1 font-body text-sm text-clay">
              Edits write straight to <code className="rounded bg-ink/5 px-1.5 py-0.5 font-mono text-xs">agent/.env</code>.
              Restart the agent process for changes to take effect.
            </p>
          </div>
          {saved && <Badge tone="running">Saved</Badge>}
        </div>

        {!loaded && <p className="font-body text-sm text-clay">Loading current configuration…</p>}

        {loaded && (
          <div className="space-y-8">
            {FIELD_GROUPS.map((group) => (
              <div
                key={group.step}
                className="rounded-4xl border border-ink/5 bg-white/80 p-7 shadow-card"
              >
                <h2 className="font-display text-xl text-ink">{group.title}</h2>
                <p className="mt-1 font-body text-sm text-clay">{group.description}</p>
                <div className="mt-5 space-y-5">
                  {group.fields.map((field) => (
                    <Field
                      key={field.key}
                      field={field}
                      value={values[field.key]}
                      onChange={update}
                    />
                  ))}
                </div>
              </div>
            ))}

            {error && (
              <p className="rounded-2xl bg-rust-50 px-4 py-3 font-body text-sm text-rust-600">
                {error}
              </p>
            )}

            <div className="flex justify-end">
              <button
                type="button"
                onClick={save}
                disabled={saving}
                className="rounded-full bg-ink px-7 py-3 font-body text-sm font-semibold text-cream shadow-card transition-transform hover:scale-[1.03] active:scale-[0.98] disabled:opacity-60"
              >
                {saving ? "Saving…" : "Save changes"}
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
