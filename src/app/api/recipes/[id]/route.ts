import crypto from "node:crypto";
import { NextResponse } from "next/server";
import { runOpenClawRaw } from "@/lib/openclaw";
import { findRecipeById, parseFrontmatterId, resolveRecipePath, writeRecipeFile } from "@/lib/recipes";

function sha256(text: string) {
  return crypto.createHash("sha256").update(text, "utf8").digest("hex");
}

/**
 * Strip OpenClaw doctor warnings that may be prepended to stdout.
 * Warnings use box-drawing characters (┌│├◇╮╯─) before the actual
 * recipe content which starts with "---" (YAML frontmatter).
 */
function stripDoctorWarnings(raw: string): string {
  const idx = raw.indexOf("\n---\n");
  if (idx < 0) {
    // Try start-of-string frontmatter
    if (raw.startsWith("---\n") || raw.startsWith("---\r\n")) return raw;
    return raw;
  }
  // Check if everything before the frontmatter looks like doctor output
  const prefix = raw.slice(0, idx);
  if (/[┌│├◇╮╯─►]/.test(prefix) || /Doctor warnings/.test(prefix)) {
    return raw.slice(idx + 1); // +1 to skip the leading \n
  }
  return raw;
}

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const item = await findRecipeById(id);
  if (!item) return NextResponse.json({ error: `Recipe not found: ${id}` }, { status: 404 });

  const shown = await runOpenClawRaw(["recipes", "show", id]);
  const filePath = await resolveRecipePath(item).catch(() => null);

  const content = stripDoctorWarnings(shown.stdout);
  const recipeHash = sha256(content);

  return NextResponse.json({ recipe: { ...item, content, filePath }, recipeHash, stderr: shown.stderr });
}

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = (await req.json()) as { content?: string };
  if (typeof body.content !== "string") {
    return NextResponse.json({ error: "Missing content" }, { status: 400 });
  }

  // Validate frontmatter id matches route id.
  let parsedId: string;
  try {
    parsedId = parseFrontmatterId(body.content);
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
  if (parsedId !== id) {
    return NextResponse.json(
      { error: `Frontmatter id (${parsedId}) must match URL id (${id})` },
      { status: 400 }
    );
  }

  const item = await findRecipeById(id);
  if (!item) return NextResponse.json({ error: `Recipe not found: ${id}` }, { status: 404 });

  if (item.source === "builtin") {
    return NextResponse.json({ error: `Recipe ${id} is builtin and cannot be modified` }, { status: 403 });
  }

  const filePath = await resolveRecipePath(item);
  await writeRecipeFile(filePath, body.content);

  return NextResponse.json({ ok: true, filePath });
}
