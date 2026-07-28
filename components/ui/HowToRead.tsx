"use client";

import { useState } from "react";

export interface HowToReadItem {
  label: string;
  text: string;
}

export function HowToRead({ title = "What am I looking at?", items }: { title?: string; items: HowToReadItem[] }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="mt-3">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex items-center gap-1.5 text-xs font-medium text-ink-tertiary transition-colors hover:text-brand-500"
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10" />
          <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
          <path d="M12 17h.01" />
        </svg>
        {title}
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={`transition-transform duration-200 ${open ? "rotate-180" : ""}`}>
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>
      {open && (
        <div className="animate-fade-in mt-2 rounded-xl px-4 py-3"
          style={{ background: "rgba(255, 255, 255, 0.04)", border: "1px solid rgba(255, 255, 255, 0.08)" }}
        >
          <ul className="space-y-1.5">
            {items.map((item) => (
              <li key={item.label} className="text-xs leading-relaxed text-ink-secondary">
                <span className="font-semibold text-ink">{item.label}</span>
                <span className="text-ink-tertiary"> — </span>
                {item.text}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
