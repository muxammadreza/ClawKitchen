import { cache } from "react";
import { readFile } from "fs/promises";
import path from "path";

/**
 * Load the running Kitchen package version from package.json.
 *
 * - Server-only (uses fs)
 * - Cached to avoid re-reading per request/render
 */
export const getKitchenVersion = cache(async (): Promise<string> => {
  const pkgPath = path.join(process.cwd(), "package.json");
  const raw = await readFile(pkgPath, "utf8");
  const parsed = JSON.parse(raw) as { version?: string };
  return parsed.version || "0.0.0";
});

export function formatKitchenTitle(version: string) {
  return `ClawKitchen (${version}-beta)`;
}
