/**
 * Plugin Route System
 * Handles mounting plugin API routes dynamically
 */

import { NextRequest, NextResponse } from 'next/server';
import { join } from 'path';
import { existsSync } from 'fs';
import { getPlugin } from './discovery';
import { createPluginContext } from './context';
import type { PluginApiRequest } from './types';

/**
 * Handle plugin API routes dynamically
 * Called from /api/plugins/[pluginId]/[...path]/route.ts
 */
export async function handlePluginRoute(
  pluginId: string,
  path: string[],
  request: NextRequest
): Promise<NextResponse> {
  try {
    // Get the plugin
    const plugin = await getPlugin(pluginId);
    if (!plugin) {
      return NextResponse.json({ error: 'Plugin not found' }, { status: 404 });
    }

    // Check if plugin has API routes defined
    if (!plugin.manifest.apiRoutes) {
      return NextResponse.json({ error: 'Plugin has no API routes' }, { status: 404 });
    }

    // Resolve the API routes module path
    const routesPath = join(plugin.packagePath, plugin.manifest.apiRoutes);
    if (!existsSync(routesPath)) {
      return NextResponse.json({ error: 'Plugin API routes not found' }, { status: 404 });
    }

    // Get team info from query params or headers
    const teamId = request.nextUrl.searchParams.get('team') || 
                   request.headers.get('x-team-id');
    
    // Get team directory from OpenClaw workspace structure
    // In production, this would resolve to the actual team workspace
    const teamDir = teamId ? `~/.openclaw/workspace-${teamId}` : '~/.openclaw/workspace';

    // Create plugin context
    const context = createPluginContext(pluginId, teamDir);

    // Create plugin API request object
    const pluginRequest: PluginApiRequest = {
      pluginId,
      teamId: teamId || undefined,
      context
    };

    // Dynamically import and call the plugin's route handler
    try {
      const routeModule = await import(routesPath);
      
      if (!routeModule.default && !routeModule[request.method]) {
        return NextResponse.json({ error: 'Route handler not found' }, { status: 404 });
      }

      // Call the appropriate method handler (GET, POST, etc.) or default
      const handler = routeModule[request.method] || routeModule.default;
      
      if (typeof handler !== 'function') {
        return NextResponse.json({ error: 'Invalid route handler' }, { status: 500 });
      }

      // Call the plugin's handler with enhanced request object
      const enhancedRequest = {
        ...request,
        plugin: pluginRequest,
        params: { path }
      };

      return await handler(enhancedRequest);
      
    } catch (importError) {
      console.error(`Error importing plugin route handler for ${pluginId}:`, importError);
      return NextResponse.json({ error: 'Plugin route error' }, { status: 500 });
    }

  } catch (error) {
    console.error(`Error handling plugin route for ${pluginId}:`, error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * Get available plugin tabs for a team
 */
export async function getPluginTabsForTeam(teamType: string) {
  const { discoverPlugins, isPluginSupportedForTeam } = await import('./discovery');
  const plugins = await discoverPlugins();
  
  const availableTabs = [];
  
  for (const plugin of plugins) {
    if (isPluginSupportedForTeam(plugin, teamType) && plugin.manifest.tabs) {
      for (const tab of plugin.manifest.tabs) {
        availableTabs.push({
          pluginId: plugin.manifest.id,
          pluginName: plugin.manifest.name,
          ...tab
        });
      }
    }
  }
  
  return availableTabs;
}