"use client";

import Link from "next/link";
import { useAccount } from "@/components/providers/AccountProvider";
import { REPORTS } from "@/lib/constants";
import { REPORT_ICONS } from "@/components/layout/icons";
import { Skeleton } from "@/components/ui/Skeleton";

export default function DashboardPage() {
  const { accounts, selectedAccountId, loading, error } = useAccount();
  const selectedAccount = accounts.find((a) => a.id === selectedAccountId);

  return (
    <div className="mx-auto max-w-6xl">
      {loading && (
        <div className="rounded-xl border border-slate-200/80 bg-white p-6 shadow-sm">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="mt-3 h-6 w-48" />
        </div>
      )}
      {error && (
        <div className="rounded-xl border border-red-100 bg-red-50 px-5 py-4">
          <div className="text-sm font-medium text-red-700">{error}</div>
        </div>
      )}

      {!loading && !error && accounts.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-white py-20">
          <div className="text-4xl">📊</div>
          <div className="mt-3 text-sm font-medium text-slate-600">No ad accounts found</div>
          <div className="mt-1 text-xs text-slate-400">Make sure you approved ads_read access for at least one account.</div>
        </div>
      )}

      {selectedAccount && (
        <div className="animate-fade-in rounded-xl border border-slate-200/80 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Active Account</div>
              <div className="mt-1 text-xl font-bold text-slate-900">{selectedAccount.name}</div>
            </div>
            <div className="flex items-center gap-4 text-xs text-slate-400">
              <div className="flex items-center gap-1.5">
                <div className="h-2 w-2 rounded-full bg-emerald-400" />
                Connected
              </div>
              <div>{selectedAccount.currency}</div>
              <div className="font-mono text-[11px]">{selectedAccount.id}</div>
            </div>
          </div>
        </div>
      )}

      <div className="mt-8">
        {/* [PM ENHANCEMENT] — outcome-focused heading instead of a feature label */}
        <h2 className="text-sm font-bold text-slate-900">Your reports</h2>

        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {REPORTS.map((report, i) => {
            const Icon = REPORT_ICONS[report.slug];
            return (
              <Link
                key={report.slug}
                href={`/reports/${report.slug}`}
                className={`animate-slide-up stagger-${Math.min(i % 4, 4)} group relative overflow-hidden rounded-xl border border-slate-200/80 bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md`}
              >
                <div className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-brand-500 to-brand-600 opacity-0 transition-opacity group-hover:opacity-100" />
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-slate-50 text-slate-400 transition-all group-hover:bg-brand-50 group-hover:text-brand-600">
                  {Icon && <Icon />}
                </div>
                <div className="mt-3 text-sm font-semibold text-slate-900">{report.title}</div>
                <div className="mt-1 text-xs leading-relaxed text-slate-400">{report.description}</div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
