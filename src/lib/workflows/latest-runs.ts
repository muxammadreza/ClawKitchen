import { listAllWorkflowRuns, type WorkflowRunSummary } from "@/lib/workflows/runs-storage";
import { listLocalTeamIds } from "@/lib/teams";
import { getTeamDisplayName } from "@/lib/recipes";

export type LatestRunRow = WorkflowRunSummary & {
  teamId: string;
  teamName?: string;
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
        .map((r) => ({ ...r, teamId, teamName }))
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
  rows.sort((a, b) => String(b.updatedAt || b.endedAt || b.startedAt || "").localeCompare(String(a.updatedAt || a.endedAt || a.startedAt || "")));

  return rows.slice(0, limit);
}
