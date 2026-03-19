/**
 * Dynamic Plugin API Routes
 * Handles /api/plugins/{pluginId}/{...path}
 */

import { NextRequest } from 'next/server';
import { handlePluginRoute } from '@/lib/plugins/routes';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ pluginId: string; path: string[] }> }
) {
  const { pluginId, path } = await params;
  return handlePluginRoute(pluginId, path, request);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ pluginId: string; path: string[] }> }
) {
  const { pluginId, path } = await params;
  return handlePluginRoute(pluginId, path, request);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ pluginId: string; path: string[] }> }
) {
  const { pluginId, path } = await params;
  return handlePluginRoute(pluginId, path, request);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ pluginId: string; path: string[] }> }
) {
  const { pluginId, path } = await params;
  return handlePluginRoute(pluginId, path, request);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ pluginId: string; path: string[] }> }
) {
  const { pluginId, path } = await params;
  return handlePluginRoute(pluginId, path, request);
}