"use client";

import { DataTable, type DataTableColumn } from "@/components/ui/DataTable";
import type { ReportLogEntry } from "@/lib/activity-log";

function formatTimestamp(ts: number): string {
  return new Date(ts).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
}

const columns: DataTableColumn<ReportLogEntry>[] = [
  { key: "timestamp", header: "Time", accessor: (r) => r.timestamp, render: (r) => formatTimestamp(r.timestamp) },
  { key: "accountId", header: "Account", accessor: (r) => r.accountId },
  { key: "reportType", header: "Report", accessor: (r) => r.reportType },
  {
    key: "range",
    header: "Range",
    accessor: (r) => `${r.since ?? ""}–${r.until ?? ""}`,
    render: (r) => (r.since && r.until ? `${r.since} – ${r.until}` : "—"),
  },
  {
    key: "status",
    header: "Status",
    accessor: (r) => r.status,
    render: (r) => (
      <span className={r.status === "success" ? "font-medium text-green-700" : "font-medium text-red-600"}>
        {r.status === "success" ? "Success" : "Failed"}
      </span>
    ),
  },
  {
    key: "error",
    header: "Error",
    accessor: (r) => r.errorCode ?? "",
    render: (r) => (r.errorCode ? `${r.errorCode}${r.errorMessage ? ` — ${r.errorMessage}` : ""}` : "—"),
  },
  {
    key: "durationMs",
    header: "Duration",
    accessor: (r) => r.durationMs,
    render: (r) => `${(r.durationMs / 1000).toFixed(1)}s`,
    align: "right",
  },
];

export function LogTable({ entries }: { entries: ReportLogEntry[] }) {
  return (
    <DataTable
      columns={columns}
      rows={entries}
      filename="activity-log"
      defaultSortKey="timestamp"
      defaultSortDir="desc"
      emptyMessage="No activity logged yet."
    />
  );
}
