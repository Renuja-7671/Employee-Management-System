// src/app/api/cron/sync-holidays/route.ts
// Cron job endpoint for automatic monthly holiday syncing
// Only syncs Poya days and Mercantile holidays (bank holidays)

import { NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/cron/sync-holidays
 * This endpoint is called by Vercel Cron on a monthly schedule
 *
 * To set up in vercel.json:
 * {
 *   "crons": [{
 *     "path": "/api/cron/sync-holidays",
 *     "schedule": "0 0 1 * *"
 *   }]
 * }
 */
export async function GET(request: NextRequest) {
  try {
    // Optional: Verify the request is coming from Vercel Cron
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    console.log('[CRON] Starting monthly holiday sync (Poya + Mercantile only)...');

    const currentYear = new Date().getFullYear();
    const nextYear = currentYear + 1;

    const results = {
      timestamp: new Date().toISOString(),
      success: true,
      synced: [] as any[],
      errors: [] as any[],
    };

    // Sync current year and next year
    for (const year of [currentYear, nextYear]) {
      try {
        console.log(`[CRON] Syncing Poya and Mercantile holidays for ${year}...`);

        const response = await fetch(
          `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/admin/holidays/sync`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              year,
              source: 'github',
              clearExisting: false, // Don't clear existing to avoid duplicates
              filterTypes: ['POYA', 'MERCANTILE'], // Only Poya days and Mercantile holidays
            }),
          }
        );

        const data = await response.json();

        if (response.ok) {
          results.synced.push({
            year,
            ...data,
          });
          console.log(`[CRON] Successfully synced ${year}: ${data.created} created, ${data.skipped} skipped`);
        } else {
          results.errors.push({
            year,
            error: data.error || 'Unknown error',
          });
          console.error(`[CRON] Failed to sync ${year}:`, data.error);
        }
      } catch (error: any) {
        results.errors.push({
          year,
          error: error.message,
        });
        console.error(`[CRON] Exception syncing ${year}:`, error);
      }
    }

    results.success = results.errors.length === 0;

    console.log('[CRON] Holiday sync completed:', results);

    return NextResponse.json(results);
  } catch (error: any) {
    console.error('[CRON] Fatal error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to run cron job',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
