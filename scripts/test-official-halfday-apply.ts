import fs from 'fs';
import path from 'path';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const ACTIVE_STATUSES = ['PENDING_COVER', 'PENDING_ADMIN', 'APPROVED'] as const;

function loadEnvFile(fileName: string) {
  const filePath = path.join(process.cwd(), fileName);
  if (!fs.existsSync(filePath)) return;

  const content = fs.readFileSync(filePath, 'utf8');
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;

    const eqIndex = line.indexOf('=');
    if (eqIndex === -1) continue;

    const key = line.slice(0, eqIndex).trim();
    if (!key || process.env[key] !== undefined) continue;

    let value = line.slice(eqIndex + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    process.env[key] = value;
  }
}

loadEnvFile('.env.local');
loadEnvFile('.env');

if (!process.env.DATABASE_URL && process.env.DIRECT_URL) {
  process.env.DATABASE_URL = process.env.DIRECT_URL;
}

let prisma: (typeof import('../src/lib/prisma'))['prisma'];

const toDateKey = (date: Date) => date.toISOString().split('T')[0];

const getDateRestrictions = () => {
  const today = new Date();
  const currentDay = today.getDate();
  const currentMonth = today.getMonth();
  const currentYear = today.getFullYear();

  let minYear = currentYear;
  let minMonth = currentMonth;

  if (currentDay < 4) {
    minMonth = currentMonth - 1;
    if (minMonth < 0) {
      minMonth = 11;
      minYear = currentYear - 1;
    }
  }

  let maxMonth = currentMonth + 2;
  let maxYear = currentYear;
  if (maxMonth > 11) {
    maxMonth -= 12;
    maxYear += 1;
  }

  const minDate = new Date(minYear, minMonth, 1);
  minDate.setHours(0, 0, 0, 0);

  const maxDate = new Date(maxYear, maxMonth, 3);
  maxDate.setHours(23, 59, 59, 999);

  return { minDate, maxDate };
};

const isSunday = (date: Date) => date.getDay() === 0;

async function getHolidaySet(minDate: Date, maxDate: Date) {
  const holidays = await prisma.publicHoliday.findMany({
    where: {
      date: { gte: minDate, lte: maxDate },
      OR: [{ description: 'Mercantile' }, { description: 'Poya' }],
    },
    select: { date: true },
  });

  return new Set(holidays.map((h) => toDateKey(h.date)));
}

async function findFreeWorkingDate(employeeId: string) {
  const { minDate, maxDate } = getDateRestrictions();
  const holidaySet = await getHolidaySet(minDate, maxDate);
  const today = new Date();
  const start = today > minDate ? new Date(today) : new Date(minDate);
  start.setHours(0, 0, 0, 0);

  const cursor = new Date(start);
  while (cursor <= maxDate) {
    const dateKey = toDateKey(cursor);
    if (!isSunday(cursor) && !holidaySet.has(dateKey)) {
      const dayStart = new Date(cursor);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(cursor);
      dayEnd.setHours(23, 59, 59, 999);

      const conflicts = await prisma.leave.count({
        where: {
          employeeId,
          status: { in: [...ACTIVE_STATUSES] },
          startDate: { lte: dayEnd },
          endDate: { gte: dayStart },
        },
      });

      if (conflicts === 0) {
        return dateKey;
      }
    }

    cursor.setDate(cursor.getDate() + 1);
  }

  throw new Error('Could not find a conflict-free working date in the allowed window');
}

async function applyHalfDay(userId: string, date: string, halfDayType: 'FIRST_HALF' | 'SECOND_HALF') {
  const response = await fetch(`${BASE_URL}/api/leaves/apply`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      userId,
      leaveType: 'official',
      startDate: date,
      endDate: date,
      numberOfDays: 0.5,
      halfDayType,
      reason: `QA check: ${halfDayType}`,
    }),
  });

  const payload = await response.json();
  return { ok: response.ok, status: response.status, payload };
}

async function main() {
  ({ prisma } = await import('../src/lib/prisma'));

  let firstLeaveId: string | null = null;
  let secondLeaveId: string | null = null;

  try {
    const employee = await prisma.user.findFirst({
      where: { role: 'EMPLOYEE', isActive: true },
      select: { id: true, employeeId: true, firstName: true, lastName: true },
    });

    if (!employee) {
      throw new Error('No active employee found for QA');
    }

    const targetDate = await findFreeWorkingDate(employee.id);
    console.log(`Using employee ${employee.employeeId} on date ${targetDate}`);

    const first = await applyHalfDay(employee.id, targetDate, 'FIRST_HALF');
    console.log('First-half apply response:', first.status, first.payload);
    if (!first.ok) {
      throw new Error('First-half leave application failed');
    }

    firstLeaveId = first.payload?.leave?.id || null;

    const second = await applyHalfDay(employee.id, targetDate, 'SECOND_HALF');
    console.log('Second-half apply response:', second.status, second.payload);
    if (!second.ok) {
      throw new Error('Second-half leave application failed');
    }

    secondLeaveId = second.payload?.leave?.id || null;

    console.log('PASS: Opposite half-day leave applications succeeded on the same day.');
  } finally {
    const idsToCleanup = [firstLeaveId, secondLeaveId].filter(Boolean) as string[];
    if (idsToCleanup.length > 0) {
      await prisma.leave.deleteMany({ where: { id: { in: idsToCleanup } } });
      console.log(`Cleanup complete. Deleted ${idsToCleanup.length} QA leave records.`);
    }

    await prisma.$disconnect();
  }
}

main().catch((error) => {
  if ((error as { code?: string })?.code === 'ECONNREFUSED') {
    console.error('DB connection refused. Ensure DATABASE_URL points to a running PostgreSQL instance.');
    console.error('Tip: verify `.env.local` has the correct DATABASE_URL and the DB is not paused/offline.');
  }
  console.error('QA test failed:', error);
  process.exit(1);
});
