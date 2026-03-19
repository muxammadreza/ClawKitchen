/**
 * Kitchen Plugin System - Main Export
 */

export * from './types';
export * from './discovery';
export * from './database';
export * from './context';
export * from './routes';

// Main plugin system functions
export { discoverPlugins, getPlugin, isPluginSupportedForTeam } from './discovery';
export { createPluginDb, getPluginDbPath, createPluginConfig } from './database';
export { createPluginContext } from './context';
export { handlePluginRoute, getPluginTabsForTeam } from './routes';