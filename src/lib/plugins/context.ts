/**
 * Plugin Context System
 * Provides isolated context to each plugin with encryption, DB access, etc.
 */

import { createCipheriv, createDecipheriv, randomBytes, pbkdf2Sync } from 'crypto';
import { createPluginDb, createPluginConfig } from './database';
import type { PluginContext, CronOptions } from './types';

/**
 * Generate encryption key from gateway auth token
 * Derives key from environment or defaults to development key
 */
function getEncryptionKey(): Buffer {
  // Use gateway auth token from environment or fallback to development key
  const password = process.env.GATEWAY_TOKEN || 'development-key';
  const salt = 'kitchen-plugin-salt';
  return pbkdf2Sync(password, salt, 100000, 32, 'sha256');
}

/**
 * Create AES-256-GCM encryption/decryption functions
 */
function createEncryptionFunctions() {
  const key = getEncryptionKey();

  function encrypt(data: unknown): string {
    const iv = randomBytes(16);
    const cipher = createCipheriv('aes-256-gcm', key, iv);
    
    const jsonString = JSON.stringify(data);
    let encrypted = cipher.update(jsonString, 'utf8', 'base64');
    encrypted += cipher.final('base64');
    
    const authTag = cipher.getAuthTag();
    
    // Combine iv + authTag + encrypted data
    const combined = Buffer.concat([iv, authTag, Buffer.from(encrypted, 'base64')]);
    return combined.toString('base64');
  }

  function decrypt(blob: string): unknown {
    const combined = Buffer.from(blob, 'base64');
    const iv = combined.slice(0, 16);
    const authTag = combined.slice(16, 32);
    const encrypted = combined.slice(32);
    
    const decipher = createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encrypted, undefined, 'utf8');
    decrypted += decipher.final('utf8');
    
    return JSON.parse(decrypted);
  }

  return { encrypt, decrypt };
}

/**
 * Register a cron job via OpenClaw cron system
 * This would integrate with the existing OpenClaw cron system
 */
async function registerCron(opts: CronOptions): Promise<void> {
  // Integration with OpenClaw cron system would be implemented here
  console.log('Would register cron job:', opts);
  
  // Future implementation would call:
  // await cronService.addJob({
  //   schedule: { kind: 'cron', expr: opts.schedule },
  //   payload: { kind: 'systemEvent', text: JSON.stringify(opts.payload) },
  //   delivery: opts.delivery
  // });
}

/**
 * Create a plugin context for a specific plugin and team
 */
export function createPluginContext(
  pluginId: string, 
  teamDir: string
): PluginContext {
  const db = createPluginDb(pluginId);
  const config = createPluginConfig(db);
  const { encrypt, decrypt } = createEncryptionFunctions();

  return {
    db,
    teamDir,
    encrypt,
    decrypt,
    registerCron,
    getConfig: config.get,
    setConfig: config.set
  };
}