"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import type { MetaAdAccount } from "@/lib/types";
import { setCurrency } from "@/lib/format";

interface AccountContextValue {
  accounts: MetaAdAccount[];
  selectedAccountId: string | null;
  setSelectedAccountId: (id: string) => void;
  loading: boolean;
  error: string | null;
  tokenExpiringSoon: boolean;
  refresh: () => void;
}

const AccountContext = createContext<AccountContextValue | null>(null);

const STORAGE_KEY = "ads-reach:selected-account";

export function AccountProvider({ children }: { children: React.ReactNode }) {
  const [accounts, setAccounts] = useState<MetaAdAccount[]>([]);
  const [selectedAccountId, setSelectedAccountIdState] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tokenExpiringSoon, setTokenExpiringSoon] = useState(false);

  const fetchAccounts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/accounts");
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Failed to load ad accounts");
      setAccounts(body.accounts || []);
      setTokenExpiringSoon(Boolean(body.tokenExpiringSoon));

      const stored = typeof window !== "undefined" ? window.localStorage.getItem(STORAGE_KEY) : null;
      const stillValid = stored && body.accounts?.some((a: MetaAdAccount) => a.id === stored);
      const selectedId = stillValid ? stored : body.accounts?.[0]?.id ?? null;
      setSelectedAccountIdState(selectedId);
      const selectedAcct = body.accounts?.find((a: MetaAdAccount) => a.id === selectedId);
      if (selectedAcct) setCurrency(selectedAcct.currency);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load ad accounts");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

  const setSelectedAccountId = useCallback((id: string) => {
    setSelectedAccountIdState(id);
    if (typeof window !== "undefined") window.localStorage.setItem(STORAGE_KEY, id);
    const acct = accounts.find((a) => a.id === id);
    if (acct) setCurrency(acct.currency);
  }, [accounts]);

  return (
    <AccountContext.Provider
      value={{
        accounts,
        selectedAccountId,
        setSelectedAccountId,
        loading,
        error,
        tokenExpiringSoon,
        refresh: fetchAccounts,
      }}
    >
      {children}
    </AccountContext.Provider>
  );
}

export function useAccount(): AccountContextValue {
  const ctx = useContext(AccountContext);
  if (!ctx) throw new Error("useAccount must be used within AccountProvider");
  return ctx;
}
