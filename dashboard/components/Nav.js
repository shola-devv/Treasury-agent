"use client";

import Link from "next/link";

const LINKS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/decisions", label: "Decisions" },
  { href: "/settings", label: "Settings" },
];

export default function Nav({ tone = "dark" }) {
  const isLight = tone === "light";

  return (
    <header className="relative z-20 flex items-center justify-between px-6 py-5 sm:px-10">
      <Link
        href="/"
        className={`flex items-center gap-2 font-display text-lg italic tracking-tight ${
          isLight ? "text-ink" : "text-cream"
        }`}
      >
        <span aria-hidden>◈</span>
        <span>Treasury Agent</span>
      </Link>

      <nav
        className={`hidden items-center gap-7 rounded-full px-2 py-2 font-body text-sm font-medium sm:flex ${
          isLight ? "text-clay" : "text-cream/90"
        }`}
      >
        {LINKS.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={`transition-colors underline underline-offset-4 decoration-current ${
              isLight ? "hover:text-ink" : "hover:text-white"
            }`}
          >
            {link.label}
          </Link>
        ))}
      </nav>

      <Link
        href="/setup"
        className="rounded-full bg-ink px-5 py-2.5 font-body text-sm font-semibold text-cream shadow-card transition-transform hover:scale-[1.03] active:scale-[0.98]"
      >
        Get started
      </Link>
    </header>
  );
}
