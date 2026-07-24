"use client";

import { useMemo, useRef, useState } from "react";

export interface CreatorPattern {
  prefix: string;
  suffix: string;
}

function storageKey(accountId: string): string {
  return `creator-pattern:${accountId}`;
}

/** Per-account custom pattern, or null if none saved (caller falls back to the hardcoded ifs_/_ife default). */
export function getCreatorPattern(accountId: string): CreatorPattern | null {
  if (typeof window === "undefined") return null;
  const stored = window.localStorage.getItem(storageKey(accountId));
  if (!stored) return null;
  try {
    const parsed = JSON.parse(stored);
    if (typeof parsed?.prefix === "string" && typeof parsed?.suffix === "string") {
      return { prefix: parsed.prefix, suffix: parsed.suffix };
    }
  } catch {
    // Corrupted value — treat as unset.
  }
  return null;
}

function saveCreatorPattern(accountId: string, pattern: CreatorPattern): void {
  window.localStorage.setItem(storageKey(accountId), JSON.stringify(pattern));
}

export function extractCreator(adName: string, prefix: string, suffix: string): string | null {
  const prefixIdx = adName.toLowerCase().indexOf(prefix.toLowerCase());
  if (prefixIdx === -1) return null;

  const nameStart = prefixIdx + prefix.length;
  const afterPrefix = adName.substring(nameStart);

  const suffixIdx = afterPrefix.toLowerCase().indexOf(suffix.toLowerCase());
  if (suffixIdx === -1) return null;

  const name = afterPrefix.substring(0, suffixIdx).trim();
  return name.length > 0 ? name : null;
}

const WORD_SEPARATORS = new Set(["_", "-", " "]);

// Walks outward from a selection to the nearest separator-bounded token on each
// side — e.g. selecting "AnushkaRai" in "..._ifs_AnushkaRai_ife_..." yields
// prefix "ifs_" and suffix "_ife" (the token plus the separator touching the selection).
function deriveBounds(text: string, start: number, end: number): { prefix: string; suffix: string } {
  let i = start;
  if (i > 0 && WORD_SEPARATORS.has(text[i - 1])) i--;
  while (i > 0 && !WORD_SEPARATORS.has(text[i - 1])) i--;

  let j = end;
  if (j < text.length && WORD_SEPARATORS.has(text[j])) j++;
  while (j < text.length && !WORD_SEPARATORS.has(text[j])) j++;

  return { prefix: text.slice(i, start), suffix: text.slice(end, j) };
}

interface CreatorPatternSetupProps {
  accountId: string;
  /** Ad names already fetched by the partnership report — reused for step 3, no extra API call. */
  sampleAdNames: string[];
  onSaved: (pattern: CreatorPattern) => void;
  onClose: () => void;
}

type Step = 1 | 2 | 3;

export function CreatorPatternSetup({ accountId, sampleAdNames, onSaved, onClose }: CreatorPatternSetupProps) {
  const [step, setStep] = useState<Step>(1);
  const [exampleName, setExampleName] = useState("");
  const [selectedText, setSelectedText] = useState("");
  const [prefix, setPrefix] = useState("");
  const [suffix, setSuffix] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  function handleMouseUp() {
    const sel = window.getSelection();
    if (!sel || sel.isCollapsed || sel.rangeCount === 0) return;
    const range = sel.getRangeAt(0);
    if (!containerRef.current || !containerRef.current.contains(range.commonAncestorContainer)) return;

    const text = containerRef.current.textContent ?? "";
    const preRange = range.cloneRange();
    preRange.selectNodeContents(containerRef.current);
    preRange.setEnd(range.startContainer, range.startOffset);
    const start = preRange.toString().length;
    const raw = range.toString();
    const end = start + raw.length;

    const trimmed = raw.trim();
    if (!trimmed) return;

    const bounds = deriveBounds(text, start, end);
    setSelectedText(trimmed);
    setPrefix(bounds.prefix);
    setSuffix(bounds.suffix);
  }

  const preview = useMemo(() => {
    if (step !== 3) return null;
    const rows = sampleAdNames.map((name) => ({
      name,
      truncated: name.length > 46 ? `${name.slice(0, 46)}…` : name,
      extracted: extractCreator(name, prefix, suffix),
    }));
    const matched = rows.filter((r) => r.extracted !== null).length;
    return { rows, matched, total: rows.length };
  }, [step, sampleAdNames, prefix, suffix]);

  function handleConfirm() {
    const pattern = { prefix, suffix };
    saveCreatorPattern(accountId, pattern);
    onSaved(pattern);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs font-medium text-slate-400">
          <span className={step === 1 ? "text-brand-600" : ""}>1. Paste</span>
          <span>→</span>
          <span className={step === 2 ? "text-brand-600" : ""}>2. Select</span>
          <span>→</span>
          <span className={step === 3 ? "text-brand-600" : ""}>3. Preview</span>
        </div>
        <button onClick={onClose} className="text-xs font-medium text-slate-400 hover:text-slate-600">
          Cancel
        </button>
      </div>

      {step === 1 && (
        <div>
          <label htmlFor="creator-pattern-example" className="mb-1.5 block text-sm font-medium text-slate-700">
            Paste one of your ad names
          </label>
          <input
            id="creator-pattern-example"
            type="text"
            autoFocus
            value={exampleName}
            onChange={(e) => setExampleName(e.target.value)}
            placeholder="Paste your ad name here"
            className="w-full rounded-lg border border-slate-200 px-3.5 py-2.5 font-mono text-sm text-slate-900 outline-none transition-colors focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20"
          />
          <p className="mt-1.5 text-xs text-slate-400">
            For example:{" "}
            <code className="rounded bg-slate-100 px-1 font-mono text-slate-500">
              prs_RedSandalwood_pre_ifs_AnushkaRai_ife_ces_Video_cee
            </code>
          </p>
          <div className="mt-3 flex justify-end">
            <button
              onClick={() => setStep(2)}
              disabled={!exampleName.trim()}
              className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-700 disabled:pointer-events-none disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div>
          <p className="mb-2 text-sm text-slate-600">Click and drag to select the creator name in this ad name.</p>
          <div
            ref={containerRef}
            onMouseUp={handleMouseUp}
            className="select-text rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 font-mono text-sm text-slate-800"
          >
            {exampleName}
          </div>

          {prefix && suffix && selectedText ? (
            <div className="mt-3 space-y-2 rounded-lg border border-slate-100 bg-surface-card p-3">
              <div className="flex flex-wrap items-center gap-1.5 text-sm">
                <code className="rounded border border-blue-100 bg-blue-50 px-1.5 py-0.5 font-mono text-blue-700">{prefix}</code>
                <code className="rounded border border-green-100 bg-green-50 px-1.5 py-0.5 font-mono text-green-700">{selectedText}</code>
                <code className="rounded border border-blue-100 bg-blue-50 px-1.5 py-0.5 font-mono text-blue-700">{suffix}</code>
              </div>
              <p className="text-xs text-slate-500">
                Creator name is the text between <span className="font-semibold text-slate-700">{prefix}</span> and{" "}
                <span className="font-semibold text-slate-700">{suffix}</span>. Select again if this looks wrong.
              </p>
            </div>
          ) : (
            <p className="mt-3 text-xs text-slate-400">No selection yet — highlight the creator&apos;s name above.</p>
          )}

          <div className="mt-3 flex items-center justify-between">
            <button onClick={() => setStep(1)} className="text-sm font-medium text-slate-500 hover:text-slate-700">
              Back
            </button>
            <button
              onClick={() => setStep(3)}
              disabled={!prefix || !suffix || !selectedText}
              className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-700 disabled:pointer-events-none disabled:opacity-40"
            >
              Preview
            </button>
          </div>
        </div>
      )}

      {step === 3 && preview && (
        <div>
          <p className="text-sm text-slate-600">
            Matched <span className="font-semibold text-slate-800">{preview.matched}</span> of{" "}
            <span className="font-semibold text-slate-800">{preview.total}</span> partnership ads.{" "}
            {preview.total - preview.matched > 0 && (
              <>
                <span className="font-semibold text-slate-800">{preview.total - preview.matched}</span> ads have no
                creator match — that&apos;s expected if not every ad carries a creator tag.
              </>
            )}
          </p>

          <div className="mt-3 max-h-72 overflow-y-auto rounded-lg border border-hairline">
            <table className="w-full text-left text-xs">
              <thead className="sticky top-0 bg-slate-50 text-slate-500">
                <tr>
                  <th className="px-3 py-2 font-medium">Ad Name</th>
                  <th className="px-3 py-2 font-medium">Extracted Creator</th>
                  <th className="px-3 py-2 font-medium">Match</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {preview.rows.map((row, i) => (
                  <tr key={i}>
                    <td className="px-3 py-2 font-mono text-slate-600">{row.truncated}</td>
                    <td className="px-3 py-2 text-slate-700">{row.extracted ?? "—"}</td>
                    <td className="px-3 py-2">
                      {row.extracted ? <span className="text-green-600">✓</span> : <span className="text-slate-300">✗</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-3 flex items-center justify-between">
            <button onClick={() => setStep(2)} className="text-sm font-medium text-slate-500 hover:text-slate-700">
              Back
            </button>
            <button
              onClick={handleConfirm}
              className="rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-700"
            >
              Confirm
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
