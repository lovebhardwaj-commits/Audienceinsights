"use client";

import { useState } from "react";

export interface HowToReadItem {
  label: string;
  text: string;
}

// [PM ENHANCEMENT] — Shared plain-language explainer for every report. Collapsed by
// default so experts aren't slowed down, one click away so new users are never lost.
export function HowToRead({ title = "What am I looking at?", items }: { title?: string; items: HowToReadItem[] }) {
  const [open, setOpen] = useState(false);

  return (
    <div className="mt-3">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex items-center gap-1.5 text-xs font-medium text-slate-400 transition-colors hover:text-brand-600"
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
        <div className="animate-fade-in mt-2 rounded-lg border border-slate-100 bg-slate-50 px-4 py-3">
          <ul className="space-y-1.5">
            {items.map((item) => (
              <li key={item.label} className="text-xs leading-relaxed text-slate-600">
                <span className="font-semibold text-slate-700">{item.label}</span>
                <span className="text-slate-400"> — </span>
                {item.text}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
