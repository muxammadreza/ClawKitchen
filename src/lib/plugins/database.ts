/**
 * Plugin Database System
 * Each plugin gets its own SQLite database
 */

import { mkdirSync, existsSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import Database from 'better-sqlite3';

/**
 * Get the plugin database directory
 */
function getPluginDbDir(): string {
  return join(homedir(), '.openclaw', 'kitchen', 'plugins');
}

/**
 * Get the path to a plugin's database file
 */
export function getPluginDbPath(pluginId: string): string {
  const pluginDbDir = getPluginDbDir();
  const pluginDir = join(pluginDbDir, pluginId);
  
  // Ensure the directory exists
  if (!existsSync(pluginDir)) {
    mkdirSync(pluginDir, { recursive: true });
  }
  
  return join(pluginDir, `${pluginId}.db`);
}

/**
 * Create or get a SQLite database instance for a plugin
 */
export function createPluginDb(pluginId: string): Database.Database {
  const dbPath = getPluginDbPath(pluginId);
  
  const db = new Database(dbPath);
  
  // Enable WAL mode for better concurrent access
  db.pragma('journal_mode = WAL');
  
  // Create a basic config table that all plugins can use
  db.exec(`
    CREATE TABLE IF NOT EXISTS config (
      key TEXT PRIMARY KEY,
      value TEXT,
      updated_at TEXT DEFAULT (datetime('now'))
    )
  `);
  
  return db;
}

/**
 * Plugin configuration helpers
 */
export function createPluginConfig(db: Database.Database) {
  return {
    async get(key: string): Promise<string | null> {
      const stmt = db.prepare('SELECT value FROM config WHERE key = ?');
      const row = stmt.get(key) as { value: string } | undefined;
      return row?.value || null;
    },

    async set(key: string, value: string): Promise<void> {
      const stmt = db.prepare(`
        INSERT OR REPLACE INTO config (key, value, updated_at) 
        VALUES (?, ?, datetime('now'))
      `);
      stmt.run(key, value);
    },

    async delete(key: string): Promise<void> {
      const stmt = db.prepare('DELETE FROM config WHERE key = ?');
      stmt.run(key);
    }
  };
}