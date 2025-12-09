// src/app/api/admin/holidays/sync/route.ts
// Automatically fetches Sri Lanka holidays from GitHub (no manual coding needed!)

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GitHub raw URL for Sri Lanka holidays JSON
const GITHUB_HOLIDAYS_URL = 'https://raw.githubusercontent.com/Dilshan-H/srilanka-holidays/main/json';

interface HolidayData {
  date: string;
  name: string;
  type?: string;
  categories?: string[];
}

/**
 * Fetch holidays from GitHub repository (free, no API key needed!)
 * Source: https://github.com/Dilshan-H/srilanka-holidays
 */
async function fetchHolidaysFromGitHub(year: number): Promise<HolidayData[]> {
  const url = `${GITHUB_HOLIDAYS_URL}/${year}.json`;
  
  console.log(`[HOLIDAYS] Fetching from GitHub: ${url}`);
  
  try {
    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'Employee-Management-System',
      },
      next: { revalidate: 86400 }, // Cache for 24 hours
    });

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error(`Holiday data for year ${year} not available yet`);
      }
      throw new Error(`GitHub returned ${response.status}`);
    }

    const data = await response.json();
    
    // The JSON structure is an array of holiday objects
    if (Array.isArray(data)) {
      return data;
    }
    
    // If it's an object with a holidays property
    if (data.holidays && Array.isArray(data.holidays)) {
      return data.holidays;
    }

    throw new Error('Unexpected JSON structure');
  } catch (error: any) {
    console.error('[HOLIDAYS] GitHub fetch failed:', error.message);
    throw error;
  }
}

/**
 * Alternative: Fetch from Sri Lanka Holidays API (requires free API key)
 * Get API key by emailing: halt-pledge-paper@duck.com
 */
async function fetchHolidaysFromAPI(year: number, apiKey: string): Promise<HolidayData[]> {
  const url = `https://srilanka-holidays.vercel.app/api/v1/holidays?year=${year}`;
  
  console.log(`[HOLIDAYS] Fetching from API: ${url}`);
  
  try {
    const response = await fetch(url, {
      headers: {
        'X-API-Key': apiKey,
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`API returned ${response.status}`);
    }

    const data = await response.json();
    return data.holidays || [];
  } catch (error: any) {
    console.error('[HOLIDAYS] API fetch failed:', error.message);
    throw error;
  }
}

/**
 * POST /api/admin/holidays/sync
 * Sync holidays for a given year
 * 
 * Body:
 * - year: number (default: current year)
 * - source: 'github' | 'api' (default: 'github')
 * - apiKey: string (required if source is 'api')
 * - clearExisting: boolean (default: false)
 * - filterTypes: string[] (optional, e.g., ['PUBLIC', 'MERCANTILE', 'POYA'])
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}));
    const { 
      year = new Date().getFullYear(), 
      source = 'github',
      apiKey,
      clearExisting = false,
      filterTypes,
    } = body;

    console.log(`[HOLIDAYS] Syncing holidays for year ${year} from ${source}`);

    // Fetch holidays based on source
    let holidays: HolidayData[];
    
    try {
      if (source === 'api' && apiKey) {
        holidays = await fetchHolidaysFromAPI(year, apiKey);
      } else {
        holidays = await fetchHolidaysFromGitHub(year);
      }
    } catch (fetchError: any) {
      return NextResponse.json(
        { 
          error: fetchError.message,
          hint: source === 'github' 
            ? 'Holiday data may not be available for this year yet. Check https://github.com/Dilshan-H/srilanka-holidays'
            : 'Check your API key or try source: "github"'
        },
        { status: 404 }
      );
    }

    if (!holidays || holidays.length === 0) {
      return NextResponse.json(
        { error: `No holiday data found for year ${year}` },
        { status: 404 }
      );
    }

    // Filter by type if specified (e.g., only MERCANTILE holidays)
    if (filterTypes && Array.isArray(filterTypes) && filterTypes.length > 0) {
      const filterSet = new Set(filterTypes.map(t => t.toUpperCase()));
      holidays = holidays.filter(h => {
        const types = h.categories || [h.type || 'PUBLIC'];
        return types.some(t => filterSet.has(t.toUpperCase()));
      });
      console.log(`[HOLIDAYS] Filtered to ${holidays.length} holidays matching types: ${filterTypes.join(', ')}`);
    }

    // Optionally clear existing holidays for the year
    if (clearExisting) {
      const startOfYear = new Date(`${year}-01-01T00:00:00Z`);
      const endOfYear = new Date(`${year}-12-31T23:59:59Z`);
      
      const deleted = await prisma.publicHoliday.deleteMany({
        where: {
          date: {
            gte: startOfYear,
            lte: endOfYear,
          },
        },
      });
      console.log(`[HOLIDAYS] Cleared ${deleted.count} existing holidays for ${year}`);
    }

    // Insert holidays
    const results = {
      total: holidays.length,
      created: 0,
      skipped: 0,
      errors: [] as string[],
    };

    for (const holiday of holidays) {
      try {
        // Parse the date
        const holidayDate = new Date(holiday.date);
        if (isNaN(holidayDate.getTime())) {
          results.errors.push(`Invalid date for ${holiday.name}: ${holiday.date}`);
          continue;
        }
        
        // Normalize to start of day in UTC
        holidayDate.setUTCHours(0, 0, 0, 0);

        // Check if already exists (same date and name)
        const existing = await prisma.publicHoliday.findFirst({
          where: {
            date: holidayDate,
            name: holiday.name,
          },
        });

        if (existing) {
          results.skipped++;
          continue;
        }

        // Create the holiday
        await prisma.publicHoliday.create({
          data: {
            name: holiday.name,
            date: holidayDate,
            description: holiday.type || (holiday.categories?.join(', ')) || 'Public Holiday',
          },
        });

        results.created++;
      } catch (err: any) {
        results.errors.push(`${holiday.name}: ${err.message}`);
      }
    }

    console.log('[HOLIDAYS] Sync completed:', results);

    return NextResponse.json({
      success: true,
      message: `Synced ${year} holidays from ${source}`,
      source,
      year,
      ...results,
    });

  } catch (error: any) {
    console.error('[HOLIDAYS] Sync error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to sync holidays' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/admin/holidays/sync?year=2025
 * Get holidays for a year from the database
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const year = parseInt(searchParams.get('year') || new Date().getFullYear().toString());

    const startOfYear = new Date(`${year}-01-01T00:00:00Z`);
    const endOfYear = new Date(`${year}-12-31T23:59:59Z`);

    const holidays = await prisma.publicHoliday.findMany({
      where: {
        date: {
          gte: startOfYear,
          lte: endOfYear,
        },
      },
      orderBy: { date: 'asc' },
    });

    return NextResponse.json({
      year,
      count: holidays.length,
      holidays,
      sources: {
        github: 'https://github.com/Dilshan-H/srilanka-holidays',
        api: 'https://srilanka-holidays.vercel.app',
      },
    });
  } catch (error: any) {
    console.error('[HOLIDAYS] Fetch error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch holidays' },
      { status: 500 }
    );
  }
}