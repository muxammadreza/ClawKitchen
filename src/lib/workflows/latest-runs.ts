import { listAllWorkflowRuns, readWorkflowRun, type WorkflowRunSummary } from "@/lib/workflows/runs-storage";
import { estimateCostUsd, getPrimaryModelFromRun, getTokenUsageFromRun } from "@/lib/workflows/run-metrics";
import { listLocalTeamIds } from "@/lib/teams";
import { getTeamDisplayName } from "@/lib/recipes";

export type LatestRunRow = WorkflowRunSummary & {
  teamId: string;
  teamName?: string;
  tokenUsage?: {
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
  };
  costUsd?: number;
  modelKey?: string;
};

export async function listLatestRunsAllTeams(opts?: {
  limit?: number;
  sinceHours?: number;
}): Promise<LatestRunRow[]> {
  const limit = Math.max(1, Math.min(200, Number(opts?.limit ?? 25)));
  const sinceHours = typeof opts?.sinceHours === "number" ? opts.sinceHours : 24;

  const sinceMs = sinceHours > 0 ? Date.now() - sinceHours * 60 * 60 * 1000 : null;

  const teamIds = await listLocalTeamIds();

  const nested = await Promise.all(
    teamIds.map(async (teamId) => {
      const teamName = (await getTeamDisplayName(teamId)) || undefined;
      const { runs } = await listAllWorkflowRuns(teamId);
      return runs
        .map((r): LatestRunRow => ({ ...r, teamId, teamName }))
        .filter((r) => {
          if (!sinceMs) return true;
          const ts = r.updatedAt || r.endedAt || r.startedAt;
          if (!ts) return true;
          const t = Date.parse(ts);
          if (!Number.isFinite(t)) return true;
          return t >= sinceMs;
        });
    })
  );

  const rows = nested.flat();
  rows.sort((a, b) =>
    String(b.updatedAt || b.endedAt || b.startedAt || "").localeCompare(String(a.updatedAt || a.endedAt || a.startedAt || ""))
  );

  const top = rows.slice(0, limit);

  // Best-effort: hydrate token usage for the rows we will actually render.
  // This avoids scanning/parsing full runs for every team/run.
  await Promise.all(
    top.map(async (r) => {
      try {
        const { run } = await readWorkflowRun(r.teamId, r.workflowId, r.runId);
        r.tokenUsage = getTokenUsageFromRun(run);
        r.modelKey = getPrimaryModelFromRun(run);
        r.costUsd = estimateCostUsd({ tokenUsage: r.tokenUsage, model: r.modelKey })?.costUsd;
      } catch {
        // ignore; tokenUsage stays undefined
      }
    })
  );

  return top;
}
