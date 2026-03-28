import { NextResponse } from "next/server";
import { runOpenClaw } from "@/lib/openclaw";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      id?: string;
      name?: string;
      description?: string;
      enabled?: boolean;
      schedule?: {
        kind?: "cron" | "every" | "at";
        expr?: string;
        everyMs?: number;
        tz?: string;
      };
      delivery?: {
        mode?: "none" | "announce" | "webhook";
        channel?: string;
        to?: string;
        bestEffort?: boolean;
      };
      payload?: {
        kind?: "systemEvent" | "agentTurn";
        text?: string;
        message?: string;
        model?: string;
        thinking?: string;
        timeoutSeconds?: number;
      };
      agentId?: string;
      sessionTarget?: string;
      sessionKey?: string;
    };

    const id = String(body.id ?? "").trim();
    if (!id) {
      return NextResponse.json({ ok: false, error: "id is required" }, { status: 400 });
    }

    const args = ["cron", "edit", id];

    // Handle name
    if (body.name !== undefined) {
      args.push("--name", body.name);
    }

    // Handle description
    if (body.description !== undefined) {
      args.push("--description", body.description);
    }

    // Handle enabled/disabled
    if (body.enabled !== undefined) {
      args.push(body.enabled ? "--enable" : "--disable");
    }

    // Handle schedule
    if (body.schedule) {
      if (body.schedule.kind === "cron" && body.schedule.expr) {
        args.push("--cron", body.schedule.expr);
        if (body.schedule.tz) {
          args.push("--tz", body.schedule.tz);
        }
      } else if (body.schedule.kind === "every" && body.schedule.everyMs) {
        const duration = formatDuration(body.schedule.everyMs);
        args.push("--every", duration);
      }
    }

    // Handle delivery
    if (body.delivery) {
      if (body.delivery.mode === "announce") {
        args.push("--announce");
        if (body.delivery.channel) {
          args.push("--channel", body.delivery.channel);
        }
        if (body.delivery.to) {
          args.push("--to", body.delivery.to);
        }
        if (body.delivery.bestEffort !== undefined) {
          args.push(body.delivery.bestEffort ? "--best-effort-deliver" : "--no-best-effort-deliver");
        }
      } else if (body.delivery.mode === "none") {
        args.push("--no-deliver");
      }
    }

    // Handle payload
    if (body.payload) {
      if (body.payload.kind === "systemEvent" && body.payload.text) {
        args.push("--system-event", body.payload.text);
      } else if (body.payload.kind === "agentTurn" && body.payload.message) {
        args.push("--message", body.payload.message);
        if (body.payload.model) {
          args.push("--model", body.payload.model);
        }
        if (body.payload.thinking) {
          args.push("--thinking", body.payload.thinking);
        }
        if (body.payload.timeoutSeconds !== undefined) {
          args.push("--timeout-seconds", body.payload.timeoutSeconds.toString());
        }
      }
    }

    // Handle agent
    if (body.agentId !== undefined) {
      if (body.agentId) {
        args.push("--agent", body.agentId);
      } else {
        args.push("--clear-agent");
      }
    }

    // Handle session target
    if (body.sessionTarget) {
      args.push("--session", body.sessionTarget);
    }

    // Handle session key
    if (body.sessionKey !== undefined) {
      if (body.sessionKey) {
        args.push("--session-key", body.sessionKey);
      } else {
        args.push("--clear-session-key");
      }
    }

    const result = await runOpenClaw(args);
    if (!result.ok) {
      return NextResponse.json(
        { ok: false, error: result.stderr || result.stdout },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true, id, result });
  } catch (e: unknown) {
    const error = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ ok: false, error }, { status: 500 });
  }
}

function formatDuration(ms: number): string {
  if (ms < 60000) {
    return `${Math.round(ms / 1000)}s`;
  } else if (ms < 3600000) {
    return `${Math.round(ms / 60000)}m`;
  } else if (ms < 86400000) {
    return `${Math.round(ms / 3600000)}h`;
  } else {
    return `${Math.round(ms / 86400000)}d`;
  }
}