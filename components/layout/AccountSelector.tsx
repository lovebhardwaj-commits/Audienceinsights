"use client";

import { useAccount } from "@/components/providers/AccountProvider";

export function AccountSelector() {
  const { accounts, selectedAccountId, setSelectedAccountId, loading, error } = useAccount();

  if (loading) return <div className="flex items-center gap-2 text-xs text-slate-400"><div className="h-2 w-2 animate-pulse rounded-full bg-slate-300" />Loading accounts…</div>;
  if (error) return <div className="text-xs font-medium text-red-500">{error}</div>;
  if (accounts.length === 0) return <div className="text-xs text-slate-400">No ad accounts found</div>;

  return (
    <div className="flex items-center gap-2">
      <div className="h-2 w-2 rounded-full bg-emerald-400" />
      <select
        value={selectedAccountId ?? ""}
        onChange={(e) => setSelectedAccountId(e.target.value)}
        className="rounded-lg border border-hairline bg-surface-card px-3 py-1.5 text-sm font-medium text-ink transition-colors hover:border-slate-300"
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
