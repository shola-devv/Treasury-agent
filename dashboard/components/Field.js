export default function Field({ field, value, onChange }) {
  return (
    <label className="block">
      <span className="font-body text-sm font-semibold text-ink">{field.label}</span>
      <input
        type={field.secret ? "password" : "text"}
        value={value ?? ""}
        onChange={(e) => onChange(field.key, e.target.value)}
        placeholder={field.placeholder}
        autoComplete="off"
        spellCheck={false}
        className={`mt-1.5 w-full rounded-2xl border border-ink/10 bg-white px-4 py-3 text-sm text-ink shadow-sm outline-none transition-colors placeholder:text-clay/50 focus:border-amber-400 ${
          field.mono ? "font-mono" : "font-body"
        }`}
      />
      {field.help && <span className="mt-1.5 block font-body text-xs text-clay">{field.help}</span>}
    </label>
  );
}
