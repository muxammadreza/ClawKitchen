import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';
import {
  KNOWN_DRIVERS,
  loadAllEnvVars,
  isDriverAvailable,
} from '@/lib/workflows/media-driver-manifest';

export interface MediaProvider {
  id: string;
  name: string;
  supportedTypes: ('image' | 'video' | 'audio')[];
  available: boolean;
  models?: string[];
  error?: string;
  priority?: number;
}

/**
 * GET /api/teams/[teamId]/media-providers
 *
 * Returns available media generation providers by checking:
 * 1. Known driver registry (static manifest with env-var checks)
 * 2. Auto-discovered skills that have generate_* scripts but no driver
 * 3. HTTP/local endpoints (Stable Diffusion, ComfyUI)
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ teamId: string }> }
): Promise<NextResponse<MediaProvider[] | { error: string }>> {
  try {
    await params;
    const env = await loadAllEnvVars();
    const providers: MediaProvider[] = [];

    // ── 1. Known drivers from manifest ────────────────────────────────
    for (const driver of KNOWN_DRIVERS) {
      const available = isDriverAvailable(driver, env);
      providers.push({
        id: `skill-${driver.slug}`,
        name: driver.displayName,
        supportedTypes: [driver.mediaType],
        available,
        error: available
          ? undefined
          : `Missing: ${driver.requiredEnvVars.filter((v) => !env[v]).join(', ')}`,
        priority: driver.priority,
      });
    }

    // ── 2. Auto-discover additional skills with generate_* scripts ────
    const knownSlugs = new Set(KNOWN_DRIVERS.map((d) => d.slug));
    const discovered = await discoverUnknownSkills(knownSlugs);
    providers.push(...discovered);

    // ── 3. HTTP/local providers ───────────────────────────────────────
    const httpProviders = await checkHTTPProviders();
    providers.push(...httpProviders);

    // Sort: available first, then by priority descending
    providers.sort((a, b) => {
      if (a.available && !b.available) return -1;
      if (!a.available && b.available) return 1;
      return (b.priority || 0) - (a.priority || 0);
    });

    return NextResponse.json(providers);
  } catch (error) {
    console.error('Failed to detect media providers:', error);
    return NextResponse.json(
      { error: 'Failed to detect media providers' },
      { status: 500 }
    );
  }
}

/**
 * Scan skill directories for generate_image/generate_video scripts
 * that don't already have a known driver.
 */
async function discoverUnknownSkills(
  knownSlugs: Set<string>
): Promise<MediaProvider[]> {
  const homedir = process.env.HOME || '/home/control';
  const skillRoots = [
    path.join(homedir, '.openclaw', 'skills'),
    path.join(homedir, '.openclaw', 'workspace', 'skills'),
    path.join(homedir, '.openclaw', 'workspace'),
  ];

  const candidates = await collectSkillCandidates(skillRoots, knownSlugs);
  return candidates;
}

async function collectSkillCandidates(
  roots: string[],
  knownSlugs: Set<string>
): Promise<MediaProvider[]> {
  const providers: MediaProvider[] = [];
  const IMAGE_SCRIPTS = ['generate_image.py', 'generate_image.sh'];
  const VIDEO_SCRIPTS = ['generate_video.py', 'generate_video.sh'];
  const AUDIO_SCRIPTS = ['generate_audio.py', 'generate_audio.sh'];

  for (const root of roots) {
    const entries = await safeReaddir(root);
    for (const name of entries) {
      if (knownSlugs.has(name)) continue;
      const skillDir = path.join(root, name);
      const provider = await probeSkillDir(skillDir, name, IMAGE_SCRIPTS, VIDEO_SCRIPTS, AUDIO_SCRIPTS);
      if (provider) {
        knownSlugs.add(name);
        providers.push(provider);
      }
    }
  }
  return providers;
}

async function safeReaddir(dir: string): Promise<string[]> {
  try { return await fs.readdir(dir); } catch { return []; }
}

async function probeSkillDir(
  skillDir: string,
  name: string,
  imageScripts: string[],
  videoScripts: string[],
  audioScripts: string[]
): Promise<MediaProvider | null> {
  try {
    const stat = await fs.stat(skillDir);
    if (!stat.isDirectory()) return null;
  } catch { return null; }

  const types: ('image' | 'video' | 'audio')[] = [];
  if (await hasAnyScript(skillDir, imageScripts)) types.push('image');
  if (await hasAnyScript(skillDir, videoScripts)) types.push('video');
  if (await hasAnyScript(skillDir, audioScripts)) types.push('audio');

  if (types.length === 0) return null;
  return {
    id: `skill-${name}`,
    name: formatSkillName(name),
    supportedTypes: types,
    available: true,
    priority: 50,
  };
}

/** Check if a skill dir (or its scripts/ subdir) contains any of the candidate scripts */
async function hasAnyScript(
  skillDir: string,
  candidates: string[]
): Promise<boolean> {
  const searchDirs = [skillDir, path.join(skillDir, 'scripts')];
  for (const dir of searchDirs) {
    for (const c of candidates) {
      try {
        await fs.access(path.join(dir, c));
        return true;
      } catch {
        /* not found */
      }
    }
  }
  return false;
}

/** Convert slug to display name: "nano-banana-pro" → "Nano Banana Pro" */
function formatSkillName(slug: string): string {
  return slug
    .replace(/^skill-/, '')
    .replace(/-/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

async function checkHTTPProviders(): Promise<MediaProvider[]> {
  const providers: MediaProvider[] = [];

  const endpoints = [
    { url: 'http://localhost:7860', name: 'Stable Diffusion WebUI', priority: 40 },
    { url: 'http://localhost:8188', name: 'ComfyUI', priority: 35 },
  ];

  for (const ep of endpoints) {
    try {
      const res = await fetch(`${ep.url}/`, {
        method: 'HEAD',
        signal: AbortSignal.timeout(2000),
      });
      providers.push({
        id: `http-${ep.url.replace(/[^\w]/g, '-')}`,
        name: ep.name,
        supportedTypes: ['image'],
        available: res.ok,
        priority: ep.priority,
      });
    } catch {
      // Don't add unavailable HTTP providers — they just clutter the dropdown
    }
  }

  return providers;
}
