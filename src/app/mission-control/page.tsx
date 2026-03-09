import Link from "next/link";
import { unstable_noStore as noStore } from "next/cache";

import { listLatestRunsAllTeams } from "@/lib/workflows/latest-runs";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function fmt(ts?: string) {
  if (!ts) return "";
  try {
    return new Date(ts).toLocaleString();
  } catch {
    return ts;
  }
}

function fmtDurationMs(ms: number) {
  if (!Number.isFinite(ms) || ms <= 0) return "";
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.round(m / 60);
  return `${h}h`;
}

export default async function MissionControlPage() {
  // File-backed state; never serve cached HTML.
  noStore();

  const rows = await listLatestRunsAllTeams({ limit: 25, sinceHours: 24 });

  const totalTokens = rows.reduce((acc, r) => acc + (r.tokenUsage?.totalTokens ?? 0), 0);
  const costRows = rows.filter((r) => typeof r.costUsd === "number" && Number.isFinite(r.costUsd));
  const totalCostUsd = costRows.reduce((acc, r) => acc + (r.costUsd ?? 0), 0);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Mission Control</h1>
          <div className="mt-1 text-sm text-[color:var(--ck-text-secondary)]">
            Latest workflow runs across all local teams (last 24h).
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/runs"
            className="text-sm font-medium text-[color:var(--ck-text-secondary)] hover:underline"
          >
            All runs →
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="ck-glass p-4">
          <div className="text-xs uppercase tracking-wide text-[color:var(--ck-text-tertiary)]">last 24h (visible)</div>
          <div className="mt-1 text-2xl font-semibold text-[color:var(--ck-text-primary)]">{rows.length}</div>
          <div className="mt-1 text-xs text-[color:var(--ck-text-tertiary)]">runs (latest 25 shown)</div>
        </div>

        <div className="ck-glass p-4">
          <div className="text-xs uppercase tracking-wide text-[color:var(--ck-text-tertiary)]">tokens (sum of shown)</div>
          <div className="mt-1 text-2xl font-semibold text-[color:var(--ck-text-primary)]">{totalTokens ? totalTokens.toLocaleString() : "—"}</div>
          <div className="mt-1 text-xs text-[color:var(--ck-text-tertiary)]">best-effort (missing data shown as 0)</div>
        </div>

        <div className="ck-glass p-4">
          <div className="text-xs uppercase tracking-wide text-[color:var(--ck-text-tertiary)]">cost estimate (sum of shown)</div>
          <div className="mt-1 text-2xl font-semibold text-[color:var(--ck-text-primary)]">{costRows.length ? `$${totalCostUsd.toFixed(4)}` : "—"}</div>
          <div className="mt-1 text-xs text-[color:var(--ck-text-tertiary)]">set CK_TOKEN_PRICING_JSON to tune rates</div>
        </div>
      </div>

      <div className="ck-glass w-full p-4">
        <div className="flex items-center justify-between">
          <div className="text-sm font-semibold text-[color:var(--ck-text-primary)]">Latest Runs</div>
          <div className="text-xs text-[color:var(--ck-text-tertiary)]">Tokens + cost are best-effort estimates.</div>
        </div>

        <div className="mt-3 overflow-x-auto">
          <table className="min-w-full border-separate border-spacing-0">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-[color:var(--ck-text-tertiary)]">
                <th className="border-b border-white/10 px-2 py-2">team</th>
                <th className="border-b border-white/10 px-2 py-2">workflow</th>
                <th className="border-b border-white/10 px-2 py-2">status</th>
                <th className="border-b border-white/10 px-2 py-2">updated</th>
                <th className="border-b border-white/10 px-2 py-2">duration</th>
                <th className="border-b border-white/10 px-2 py-2">run</th>
                <th className="border-b border-white/10 px-2 py-2">tokens</th>
                <th className="border-b border-white/10 px-2 py-2">cost</th>
              </tr>
            </thead>
            <tbody>
              {rows.length ? (
                rows.map((r) => {
                  const updated = r.updatedAt || r.endedAt || r.startedAt;
                  const st = r.startedAt ? Date.parse(r.startedAt) : NaN;
                  const et = (r.endedAt ? Date.parse(r.endedAt) : NaN) || (updated ? Date.parse(updated) : NaN);
                  const dur = Number.isFinite(st) && Number.isFinite(et) ? fmtDurationMs(et - st) : "";

                  return (
                    <tr key={`${r.teamId}:${r.workflowId}:${r.runId}`} className="text-sm">
                      <td className="border-b border-white/5 px-2 py-2">
                        <div className="text-[color:var(--ck-text-primary)]">{r.teamName || r.teamId}</div>
                        <div className="text-xs font-mono text-[color:var(--ck-text-tertiary)]">{r.teamId}</div>
                      </td>
                      <td className="border-b border-white/5 px-2 py-2">
                        <div className="text-[color:var(--ck-text-primary)]">{r.workflowId}</div>
                      </td>
                      <td className="border-b border-white/5 px-2 py-2">
                        <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-xs text-[color:var(--ck-text-secondary)]">
                          {r.status ?? "(unknown)"}
                        </span>
                      </td>
                      <td className="border-b border-white/5 px-2 py-2 text-xs text-[color:var(--ck-text-secondary)]">
                        {fmt(updated)}
                      </td>
                      <td className="border-b border-white/5 px-2 py-2 text-xs text-[color:var(--ck-text-secondary)]">
                        {dur || "—"}
                      </td>
                      <td className="border-b border-white/5 px-2 py-2">
                        <Link
                          href={`/teams/${encodeURIComponent(r.teamId)}/runs/${encodeURIComponent(r.workflowId)}/${encodeURIComponent(r.runId)}`}
                          className="font-mono text-sm text-[color:var(--ck-text-primary)] hover:underline"
                        >
                          {r.runId}
                        </Link>
                      </td>
                      <td className="border-b border-white/5 px-2 py-2 text-xs text-[color:var(--ck-text-secondary)]">
                        {typeof r.tokenUsage?.totalTokens === "number" ? r.tokenUsage.totalTokens.toLocaleString() : "—"}
                      </td>
                      <td className="border-b border-white/5 px-2 py-2 text-xs text-[color:var(--ck-text-secondary)]">
                        {typeof r.costUsd === "number" && Number.isFinite(r.costUsd) ? `$${r.costUsd.toFixed(4)}` : "—"}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={8} className="px-2 py-6 text-sm text-[color:var(--ck-text-secondary)]">
                    No runs found in the last 24 hours.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
