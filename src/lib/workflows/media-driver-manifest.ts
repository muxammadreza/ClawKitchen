/**
 * Static manifest of known media drivers.
 * Mirrors the driver registry in ClawRecipes — update both when adding drivers.
 *
 * Each entry declares exactly what it needs so the provider dropdown
 * can show availability without scanning SKILL.md files.
 */

export interface MediaDriverMeta {
  /** Provider slug (used as skill-<slug> in workflow config) */
  slug: string;
  /** Human-readable name for dropdown */
  displayName: string;
  /** Media types this driver supports */
  mediaType: 'image' | 'video' | 'audio';
  /** Env vars required for this driver to be available */
  requiredEnvVars: string[];
  /** Priority for sorting (higher = listed first) */
  priority: number;
}

export const KNOWN_DRIVERS: MediaDriverMeta[] = [
  {
    slug: 'nano-banana-pro',
    displayName: 'Nano Banana Pro (Gemini)',
    mediaType: 'image',
    requiredEnvVars: ['GEMINI_API_KEY'],
    priority: 95,
  },
  {
    slug: 'openai-image-gen',
    displayName: 'OpenAI DALL-E',
    mediaType: 'image',
    requiredEnvVars: ['OPENAI_API_KEY'],
    priority: 90,
  },
  {
    slug: 'skill-runway-video',
    displayName: 'Runway Gen-3',
    mediaType: 'video',
    requiredEnvVars: ['RUNWAYML_API_SECRET'],
    priority: 85,
  },
  {
    slug: 'skill-kling-video',
    displayName: 'Kling v2',
    mediaType: 'video',
    requiredEnvVars: ['KLING_API_KEY'],
    priority: 80,
  },
  {
    slug: 'skill-luma-video',
    displayName: 'Luma Ray 2',
    mediaType: 'video',
    requiredEnvVars: ['LUMAAI_API_KEY'],
    priority: 75,
  },
  {
    slug: 'cellcog',
    displayName: 'CellCog (Any-to-Any)',
    mediaType: 'image',
    requiredEnvVars: ['CELLCOG_API_KEY'],
    priority: 70,
  },
];

/**
 * Load env vars from both process.env and openclaw.json config.
 */
export async function loadAllEnvVars(): Promise<Record<string, string>> {
  const merged: Record<string, string> = {};

  // Start with process.env
  for (const [k, v] of Object.entries(process.env)) {
    if (typeof v === 'string') merged[k] = v;
  }

  // Layer on openclaw.json env.vars
  try {
    const fsModule = await import('fs/promises');
    const pathModule = await import('path');
    const cfgPath = pathModule.join(process.env.HOME || '/home/control', '.openclaw', 'openclaw.json');
    const raw = await fsModule.readFile(cfgPath, 'utf-8');
    const cfg = JSON.parse(raw);
    const envBlock = cfg?.env;
    const maybeVars = envBlock && typeof envBlock === 'object' ? envBlock.vars : null;
    const vars = (maybeVars && typeof maybeVars === 'object') ? maybeVars : envBlock;
    if (vars && typeof vars === 'object') {
      for (const [k, v] of Object.entries(vars)) {
        if (typeof v === 'string') merged[k] = v;
      }
    }
  } catch { /* config read failed */ }

  return merged;
}

/**
 * Check if a driver has all required env vars.
 */
export function isDriverAvailable(
  driver: MediaDriverMeta,
  env: Record<string, string>
): boolean {
  return driver.requiredEnvVars.every(
    (v) => env[v] && env[v].trim().length > 0
  );
}
