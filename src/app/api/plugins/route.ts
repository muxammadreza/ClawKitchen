/**
 * Plugin Management API
 * Lists available plugins and their capabilities
 */

import { NextRequest, NextResponse } from 'next/server';
import { discoverPlugins, isPluginSupportedForTeam } from '@/lib/plugins/discovery';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const teamType = searchParams.get('teamType');

    const plugins = await discoverPlugins();
    
    // Filter plugins by team type if specified
    const filteredPlugins = teamType 
      ? plugins.filter(plugin => isPluginSupportedForTeam(plugin, teamType))
      : plugins;

    // Return plugin metadata without sensitive package paths
    const pluginMetadata = filteredPlugins.map(plugin => ({
      id: plugin.manifest.id,
      name: plugin.manifest.name,
      version: plugin.version,
      teamTypes: plugin.manifest.teamTypes,
      tabs: plugin.manifest.tabs?.map(tab => ({
        id: tab.id,
        label: tab.label,
        icon: tab.icon
      }))
    }));

    return NextResponse.json({
      plugins: pluginMetadata,
      count: pluginMetadata.length
    });

  } catch (error) {
    console.error('Error listing plugins:', error);
    return NextResponse.json({ error: 'Failed to list plugins' }, { status: 500 });
  }
}