// src/app/api/health/route.ts
// Lightweight health check for uptime monitors (Uptime Kuma, etc.)
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

type HealthStatus = 'ok' | 'degraded' | 'down';

function isAuthorized(request: NextRequest): boolean {
  const secret = process.env.MONITOR_SECRET;
  if (!secret) return true;

  const url = new URL(request.url);
  const queryKey = url.searchParams.get('key');
  const headerKey = request.headers.get('x-monitor-key');

  return queryKey === secret || headerKey === secret;
}

export async function GET(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const checks: { app: 'ok' | 'fail'; database: 'ok' | 'fail' } = {
    app: 'ok',
    database: 'fail',
  };

  try {
    await prisma.$queryRaw`SELECT 1`;
    checks.database = 'ok';
  } catch {
    checks.database = 'fail';
  }

  let status: HealthStatus = 'ok';
  if (checks.database === 'fail') {
    status = 'down';
  }

  const body = {
    success: status === 'ok',
    status,
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime()),
    checks,
  };

  return NextResponse.json(body, {
    status: status === 'ok' ? 200 : 503,
    headers: { 'Cache-Control': 'no-cache, no-store, must-revalidate' },
  });
}
