import { NextRequest, NextResponse } from "next/server";
import fs from "node:fs/promises";
import path from "node:path";
import { getTeamWorkspaceDir } from "@/lib/paths";
import { jsonOkRest } from "@/lib/api-route-helpers";

interface DeliverableFile {
  id: string;
  workflowId: string;
  runId: string;
  filename: string;
  path: string;
  size: number;
  isText: boolean;
  content?: string;
  lastModified: string;
}

async function isTextFile(filePath: string): Promise<boolean> {
  try {
    const stats = await fs.stat(filePath);
    if (stats.size > 1024 * 1024) return false; // Skip files > 1MB

    const buffer = await fs.readFile(filePath, { encoding: null });
    const sample = buffer.subarray(0, Math.min(512, buffer.length));
    
    // Check for null bytes (binary indicator)
    for (let i = 0; i < sample.length; i++) {
      if (sample[i] === 0) return false;
    }
    
    return true;
  } catch {
    return false;
  }
}

async function scanDeliverables(teamId: string): Promise<DeliverableFile[]> {
  const deliverables: DeliverableFile[] = [];
  const teamDir = await getTeamWorkspaceDir(teamId);
  const runsDir = path.join(teamDir, "shared-context/workflow-runs");

  try {
    const runIds = await fs.readdir(runsDir);
    
    for (const runId of runIds) {
      const runDir = path.join(runsDir, runId);
      
      try {
        const runStat = await fs.stat(runDir);
        if (!runStat.isDirectory()) continue;

        // Read run.json to get workflow ID
        const runJsonPath = path.join(runDir, "run.json");
        let workflowId = "unknown";
        try {
          const runJson = JSON.parse(await fs.readFile(runJsonPath, "utf8"));
          workflowId = runJson.workflowId || "unknown";
        } catch {
          // Continue without workflow ID
        }

        // Scan all files in run directory
        const entries = await fs.readdir(runDir, { withFileTypes: true });
        
        for (const entry of entries) {
          if (entry.isFile() && entry.name !== "run.json") {
            const filePath = path.join(runDir, entry.name);
            const stats = await fs.stat(filePath);
            const isText = await isTextFile(filePath);
            
            let content: string | undefined;
            if (isText && stats.size < 100 * 1024) { // Only read text files < 100KB
              try {
                content = await fs.readFile(filePath, "utf8");
              } catch {
                // Content unavailable, continue without it
              }
            }

            deliverables.push({
              id: `${runId}-${entry.name}`,
              workflowId,
              runId,
              filename: entry.name,
              path: filePath,
              size: stats.size,
              isText,
              content,
              lastModified: stats.mtime.toISOString(),
            });
          }
        }
      } catch {
        // Skip this run directory if we can't read it
        continue;
      }
    }
  } catch {
    // No runs directory, return empty array
    return [];
  }

  return deliverables.sort((a, b) => 
    new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime()
  );
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const teamId = searchParams.get("teamId");

  if (!teamId) {
    return NextResponse.json({ ok: false, error: "teamId is required" }, { status: 400 });
  }

  try {
    const deliverables = await scanDeliverables(teamId);
    return jsonOkRest({ ok: true, deliverables });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}