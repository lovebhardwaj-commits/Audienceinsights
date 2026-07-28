"use client";

import { useAccount } from "@/components/providers/AccountProvider";

export function AccountSelector() {
  const { accounts, selectedAccountId, setSelectedAccountId, loading, error } = useAccount();

  if (loading) return <div className="flex items-center gap-2 text-xs text-ink-tertiary"><div className="h-2 w-2 animate-pulse rounded-full bg-brand-500" />Loading accounts…</div>;
  if (error) return <div className="text-xs font-medium text-sev-critical">{error}</div>;
  if (accounts.length === 0) return <div className="text-xs text-ink-tertiary">No ad accounts found</div>;

  return (
    <div className="flex items-center gap-2">
      <div className="h-2 w-2 rounded-full bg-sev-good" />
      <select
        value={selectedAccountId ?? ""}
        onChange={(e) => setSelectedAccountId(e.target.value)}
        className="rounded-lg px-3 py-1.5 text-sm font-medium text-ink transition-colors"
        style={{
          background: "rgba(255, 255, 255, 0.04)",
          border: "1px solid rgba(255, 255, 255, 0.1)",
        }}
      >
        {accounts.map((account) => (
          <option key={account.id} value={account.id}>
            {account.name} ({account.currency})
          </option>
        ))}
      </select>
    </div>
  );
}
