/**
 * Plugin System Test Route
 * Tests plugin discovery and basic functionality
 */

import { NextResponse } from 'next/server';
import { discoverPlugins } from '@/lib/plugins/discovery';

export async function GET() {
  try {
    const plugins = await discoverPlugins();
    
    return NextResponse.json({
      success: true,
      pluginCount: plugins.length,
      plugins: plugins.map(p => ({
        id: p.manifest.id,
        name: p.manifest.name,
        version: p.version,
        packageName: p.name,
        tabs: p.manifest.tabs?.length || 0,
        hasApiRoutes: !!p.manifest.apiRoutes
      })),
      message: 'Plugin discovery working!'
    });
  } catch (error) {
    console.error('Plugin test error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}