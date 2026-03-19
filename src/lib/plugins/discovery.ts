/**
 * Kitchen Plugin Discovery
 * Scans node_modules for packages with kitchenPlugin field
 */

import { readFileSync } from 'fs';
import { glob } from 'glob';
import type { PluginPackage, PluginManifest } from './types';

/**
 * Discover all installed Kitchen plugins
 */
export async function discoverPlugins(nodeModulesPath = './node_modules'): Promise<PluginPackage[]> {
  const plugins: PluginPackage[] = [];

  try {
    // Find all package.json files in node_modules
    const packageJsonPaths = await glob('*/package.json', { 
      cwd: nodeModulesPath,
      absolute: true 
    });

    // Also check scoped packages like @jiggai/kitchen-plugin-marketing
    const scopedPackageJsonPaths = await glob('@*/*/package.json', { 
      cwd: nodeModulesPath,
      absolute: true 
    });

    const allPaths = [...packageJsonPaths, ...scopedPackageJsonPaths];

    for (const packageJsonPath of allPaths) {
      try {
        const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
        
        // Check if this package is a Kitchen plugin
        if (packageJson.kitchenPlugin) {
          const manifest = packageJson.kitchenPlugin as PluginManifest;
          
          // Validate required fields
          if (!manifest.id || !manifest.name) {
            console.warn(`Invalid plugin manifest in ${packageJson.name}: missing id or name`);
            continue;
          }

          plugins.push({
            name: packageJson.name,
            version: packageJson.version || '0.0.0',
            manifest,
            packagePath: packageJsonPath.replace('/package.json', '')
          });
        }
      } catch {
        // Skip packages we can't read - they're not Kitchen plugins
        continue;
      }
    }
  } catch (error) {
    console.error('Error discovering plugins:', error);
  }

  return plugins;
}

/**
 * Get a specific plugin by ID
 */
export async function getPlugin(pluginId: string): Promise<PluginPackage | null> {
  const plugins = await discoverPlugins();
  return plugins.find(p => p.manifest.id === pluginId) || null;
}

/**
 * Check if a plugin supports a given team type
 */
export function isPluginSupportedForTeam(plugin: PluginPackage, teamType: string): boolean {
  // If no teamTypes specified, plugin supports all teams
  if (!plugin.manifest.teamTypes || plugin.manifest.teamTypes.length === 0) {
    return true;
  }
  
  return plugin.manifest.teamTypes.includes(teamType);
}