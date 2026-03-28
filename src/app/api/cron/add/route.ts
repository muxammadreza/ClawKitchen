import { NextResponse } from "next/server";
import { runOpenClaw } from "@/lib/openclaw";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      name?: string;
      description?: string;
      enabled?: boolean;
      schedule: {
        kind: "cron" | "every" | "at";
        expr?: string;
        everyMs?: number;
        tz?: string;
        at?: string;
      };
      delivery?: {
        mode?: "none" | "announce" | "webhook";
        channel?: string;
        to?: string;
        bestEffort?: boolean;
      };
      payload: {
        kind: "systemEvent" | "agentTurn";
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

    if (!body.schedule || !body.payload) {
      return NextResponse.json(
        { ok: false, error: "schedule and payload are required" },
        { status: 400 }
      );
    }

    const args = ["cron", "add"];

    // Handle name
    if (body.name) {
      args.push("--name", body.name);
    }

    // Handle description
    if (body.description) {
      args.push("--description", body.description);
    }

    // Handle enabled/disabled
    if (body.enabled === false) {
      args.push("--disabled");
    }

    // Handle schedule
    if (body.schedule.kind === "cron" && body.schedule.expr) {
      args.push("--cron", body.schedule.expr);
      if (body.schedule.tz) {
        args.push("--tz", body.schedule.tz);
      }
    } else if (body.schedule.kind === "every" && body.schedule.everyMs) {
      const duration = formatDuration(body.schedule.everyMs);
      args.push("--every", duration);
    } else if (body.schedule.kind === "at" && body.schedule.at) {
      args.push("--at", body.schedule.at);
      if (body.schedule.tz) {
        args.push("--tz", body.schedule.tz);
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
        if (body.delivery.bestEffort) {
          args.push("--best-effort-deliver");
        }
      } else if (body.delivery.mode === "none") {
        args.push("--no-deliver");
      }
    } else {
      // Default to no delivery
      args.push("--no-deliver");
    }

    // Handle payload
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
      if (body.payload.timeoutSeconds) {
        args.push("--timeout-seconds", body.payload.timeoutSeconds.toString());
      }
    } else {
      return NextResponse.json(
        { ok: false, error: "payload must have text (systemEvent) or message (agentTurn)" },
        { status: 400 }
      );
    }

    // Handle agent
    if (body.agentId) {
      args.push("--agent", body.agentId);
    }

    // Handle session target
    if (body.sessionTarget) {
      args.push("--session", body.sessionTarget);
    }

    // Handle session key
    if (body.sessionKey) {
      args.push("--session-key", body.sessionKey);
    }

    args.push("--json");
    const result = await runOpenClaw(args);
    if (!result.ok) {
      return NextResponse.json(
        { ok: false, error: result.stderr || result.stdout },
        { status: 500 }
      );
    }

    let parsedResult;
    try {
      parsedResult = JSON.parse(result.stdout);
    } catch {
      parsedResult = { output: result.stdout };
    }

    return NextResponse.json({ ok: true, result: parsedResult });
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