// @vitest-environment node

import { describe, expect, it, vi, beforeEach } from "vitest";

const runOpenClawMock = vi.fn(async (_args: string[]) => {
  throw new Error("runOpenClaw mock not configured");
});

vi.mock("@/lib/openclaw", () => ({
  runOpenClaw: runOpenClawMock,
}));

const readWorkflowMock = vi.fn(async (_teamId: string, _workflowId: string) => {
  throw new Error("readWorkflow mock not configured");
});

vi.mock("@/lib/workflows/storage", () => ({
  readWorkflow: readWorkflowMock,
}));

describe("/api/teams/workflow-runs POST", () => {
  beforeEach(() => {
    runOpenClawMock.mockReset();
    readWorkflowMock.mockReset();
  });

  it("returns the canonical CLI enqueue runId + canonical run.json path", async () => {
    readWorkflowMock.mockResolvedValue({
      workflow: {
        id: "tool-exec-demo",
        name: "Tool Exec Demo",
        nodes: [
          { id: "start", type: "start" },
          { id: "n1", type: "tool", config: { agentId: "dev-agent" } },
          { id: "end", type: "end" },
        ],
      },
    });

    runOpenClawMock.mockImplementation(async (args: string[]) => {
      const cmd = args.join(" ");
      if (cmd.startsWith("recipes workflows run")) {
        return {
          ok: true,
          stdout: JSON.stringify({ ok: true, runId: "2026-03-09t14-46-37-557z-27027444" }),
          stderr: "",
        };
      }
      return { ok: true, stdout: "", stderr: "" };
    });

    const { POST } = await import("./route");

    const res = await POST(
      new Request("http://localhost/api/teams/workflow-runs", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ teamId: "development-team", workflowId: "tool-exec-demo", mode: "enqueue" }),
      })
    );

    expect(res.status).toBe(200);
    const json = (await res.json()) as { ok: boolean; runId: string; path: string };
    expect(json.ok).toBe(true);
    expect(json.runId).toBe("2026-03-09t14-46-37-557z-27027444");
    expect(json.path).toBe("shared-context/workflow-runs/2026-03-09t14-46-37-557z-27027444/run.json");
  });

  it("returns the canonical CLI runId + canonical run.json path for run_now", async () => {
    readWorkflowMock.mockResolvedValue({
      workflow: {
        id: "tool-exec-demo",
        name: "Tool Exec Demo",
        nodes: [
          { id: "start", type: "start" },
          { id: "n1", type: "tool", config: { agentId: "dev-agent" } },
          { id: "end", type: "end" },
        ],
      },
    });

    runOpenClawMock.mockImplementation(async (args: string[]) => {
      const cmd = args.join(" ");
      if (cmd.startsWith("recipes workflows run")) {
        return {
          ok: true,
          stdout: JSON.stringify({ ok: true, runId: "2026-03-10t02-15-00-000z-abc12345" }),
          stderr: "",
        };
      }
      if (cmd.startsWith("agents list")) {
        return {
          ok: true,
          stdout: JSON.stringify([{ id: "dev-agent" }]),
          stderr: "",
        };
      }
      if (cmd.startsWith("recipes workflows runner-once")) {
        return { ok: true, stdout: "", stderr: "" };
      }
      if (cmd.startsWith("recipes workflows worker-tick")) {
        return { ok: true, stdout: "", stderr: "" };
      }
      return { ok: true, stdout: "", stderr: "" };
    });

    const { POST } = await import("./route");
    const routeMod = await import("@/lib/workflows/runs-storage");
    const readWorkflowRunSpy = vi.spyOn(routeMod, "readWorkflowRun").mockResolvedValue({
      run: { status: "running" } as unknown as Awaited<ReturnType<typeof routeMod.readWorkflowRun>>["run"],
      path: "shared-context/workflow-runs/2026-03-10t02-15-00-000z-abc12345/run.json",
    });

    const res = await POST(
      new Request("http://localhost/api/teams/workflow-runs", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ teamId: "development-team", workflowId: "tool-exec-demo", mode: "run_now" }),
      })
    );

    expect(res.status).toBe(200);
    const json = (await res.json()) as { ok: boolean; runId: string; path: string };
    expect(json.ok).toBe(true);
    expect(json.runId).toBe("2026-03-10t02-15-00-000z-abc12345");
    expect(json.path).toBe("shared-context/workflow-runs/2026-03-10t02-15-00-000z-abc12345/run.json");

    readWorkflowRunSpy.mockRestore();
  });
});
