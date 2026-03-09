import { listAllWorkflowRuns, readWorkflowRun, type WorkflowRunSummary } from "@/lib/workflows/runs-storage";
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
};

function getTokenUsageFromRun(run: unknown): LatestRunRow["tokenUsage"] {
  try {
    const r = run as { nodes?: unknown };
    const nodes = Array.isArray(r.nodes) ? (r.nodes as unknown[]) : [];

    let promptTokens = 0;
    let completionTokens = 0;
    let totalTokens = 0;
    let sawAny = false;

    for (const n of nodes) {
      if (!n || typeof n !== "object") continue;
      const out = (n as { output?: unknown }).output;
      if (!out || typeof out !== "object" || Array.isArray(out)) continue;
      const outObj = out as Record<string, unknown>;

      // Common shapes we see from LLM/tool outputs. Keep permissive.
      const usageRaw = outObj.usage ?? outObj.tokenUsage ?? outObj.tokens;
      if (!usageRaw || typeof usageRaw !== "object" || Array.isArray(usageRaw)) continue;
      const usage = usageRaw as Record<string, unknown>;

      const p = Number(usage.prompt_tokens ?? usage.promptTokens ?? usage.prompt ?? NaN);
      const c = Number(usage.completion_tokens ?? usage.completionTokens ?? usage.completion ?? NaN);
      const t = Number(usage.total_tokens ?? usage.totalTokens ?? usage.total ?? NaN);

      if (Number.isFinite(p)) {
        promptTokens += p;
        sawAny = true;
      }
      if (Number.isFinite(c)) {
        completionTokens += c;
        sawAny = true;
      }
      if (Number.isFinite(t)) {
        totalTokens += t;
        sawAny = true;
      }
    }

    if (!sawAny) return undefined;

    // If total wasn't provided anywhere, compute it from prompt+completion when possible.
    if (!totalTokens && (promptTokens || completionTokens)) totalTokens = promptTokens + completionTokens;

    return {
      ...(promptTokens ? { promptTokens } : {}),
      ...(completionTokens ? { completionTokens } : {}),
      ...(totalTokens ? { totalTokens } : {}),
    };
  } catch {
    return undefined;
  }
}

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
      } catch {
        // ignore; tokenUsage stays undefined
      }
    })
  );

  return top;
}
