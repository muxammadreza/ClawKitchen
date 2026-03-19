/**
 * Plugin Tab Bundle Serving
 * Serves pre-built plugin tab JavaScript bundles
 */

import { NextRequest, NextResponse } from 'next/server';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { getPlugin } from '@/lib/plugins/discovery';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ pluginId: string; tabId: string }> }
) {
  try {
    const { pluginId, tabId } = await params;
    
    // Get the plugin
    const plugin = await getPlugin(pluginId);
    if (!plugin) {
      return NextResponse.json({ error: 'Plugin not found' }, { status: 404 });
    }

    // Find the tab definition
    const tab = plugin.manifest.tabs?.find(t => t.id === tabId);
    if (!tab) {
      return NextResponse.json({ error: 'Tab not found' }, { status: 404 });
    }

    // Resolve the bundle path
    const bundlePath = join(plugin.packagePath, tab.bundle);
    if (!existsSync(bundlePath)) {
      return NextResponse.json({ error: 'Tab bundle not found' }, { status: 404 });
    }

    // Read and serve the JavaScript bundle
    const bundleContent = readFileSync(bundlePath, 'utf-8');
    
    return new NextResponse(bundleContent, {
      status: 200,
      headers: {
        'Content-Type': 'application/javascript',
        'Cache-Control': 'public, max-age=86400', // Cache for 24 hours
      },
    });

  } catch (error) {
    console.error(`Error serving plugin tab bundle:`, error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}