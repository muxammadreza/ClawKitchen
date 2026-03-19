/**
 * Kitchen Plugin System - Core Types
 */

export interface PluginManifest {
  id: string;
  name: string;
  version?: string;
  teamTypes?: string[];
  tabs?: PluginTab[];
  apiRoutes?: string;
  migrations?: string;
}

export interface PluginTab {
  id: string;
  label: string;
  icon?: string;
  bundle: string;
}

export interface PluginPackage {
  name: string;
  version: string;
  manifest: PluginManifest;
  packagePath: string;
}

export interface PluginContext {
  db: unknown; // Drizzle instance - type depends on plugin's schema
  teamDir: string;
  encrypt: (data: unknown) => string;
  decrypt: (blob: string) => unknown;
  registerCron: (opts: CronOptions) => Promise<void>;
  getConfig: (key: string) => Promise<string | null>;
  setConfig: (key: string, value: string) => Promise<void>;
}

export interface CronOptions {
  schedule: string;
  payload: Record<string, unknown>;
  delivery?: {
    mode: string;
    channel?: string;
    to?: string;
  };
}

export interface PluginApiRequest {
  pluginId: string;
  teamId?: string;
  context: PluginContext;
}