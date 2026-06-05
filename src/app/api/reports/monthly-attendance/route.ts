// src/app/api/reports/monthly-attendance/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import * as ExcelJS from 'exceljs';
import { getDisplayName } from '@/lib/user-utils';

// ── Constants ────────────────────────────────────────────────────────────────

const START_MINUTES = 8 * 60 + 30; // 8:30 AM

const FILL_SUNDAY: ExcelJS.Fill = {
  type: 'pattern',
  pattern: 'solid',
  fgColor: { argb: 'FFFFFF00' }, // Yellow – Sunday (company holiday)
};
const FILL_APPLIED: ExcelJS.Fill = {
  type: 'pattern',
  pattern: 'solid',
  fgColor: { argb: 'FF92D050' }, // Green – Annual / Casual / Medical
};
const FILL_OFFICIAL: ExcelJS.Fill = {
  type: 'pattern',
  pattern: 'solid',
  fgColor: { argb: 'FF00B0F0' }, // Blue – Official
};
const FILL_MISSING_OUT: ExcelJS.Fill = {
  type: 'pattern',
  pattern: 'solid',
  fgColor: { argb: 'FFFF0000' }, // Red – In Time present but Out Time missing
};
const FILL_HEADER: ExcelJS.Fill = {
  type: 'pattern',
  pattern: 'solid',
  fgColor: { argb: 'FFD9E1F2' }, // Light blue-grey
};
const BORDER_THIN: Partial<ExcelJS.Border> = { style: 'thin' };
const BORDER_HAIR: Partial<ExcelJS.Border> = { style: 'hair' };

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Build a local YYYY-MM-DD key from a Date WITHOUT converting to UTC.
 * Using toISOString() in UTC+5:30 shifts midnight local → previous day UTC,
 * causing every row to look up the wrong attendance record.
 */
function toLocalDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function calcLateMinutes(checkIn: Date, date: Date): number {
  // No late calculation on Sundays (company is closed)
  if (date.getDay() === 0) return 0;
  const mins = checkIn.getHours() * 60 + checkIn.getMinutes();
  return Math.max(0, mins - START_MINUTES);
}

function calcHours(checkIn: Date, checkOut: Date): string {
  const total = Math.floor((checkOut.getTime() - checkIn.getTime()) / 60000);
  if (total <= 0) return '';
  return `${Math.floor(total / 60)}h ${total % 60}m`;
}

/**
 * Monday-based week-of-month index (1 = the week containing the 1st).
 *
 * April 2026: April 1 = Wednesday → week 1 spans Apr 1–5 (Wed→Sun, 5 rows),
 *             week 2 spans Apr 6–12 (Mon→Sun, 7 rows), and so on.
 * No leading/trailing padding rows are produced — data starts at day 1.
 */
function weekOfMonth(date: Date): number {
  const first = new Date(date.getFullYear(), date.getMonth(), 1);
  const offset = (first.getDay() + 6) % 7; // Mon=0 … Sun=6
  return Math.ceil((date.getDate() + offset) / 7);
}


function fmtTime(dt: Date): string {
  return `${String(dt.getHours()).padStart(2, '0')}:${String(dt.getMinutes()).padStart(2, '0')}`;
}

function sanitizeSheetName(name: string): string {
  return name.replace(/[\\/?*[\]:]/g, '').substring(0, 31).trim() || 'Sheet';
}

function applyFill(row: ExcelJS.Row, fill: ExcelJS.Fill, cols: number): void {
  for (let c = 1; c <= cols; c++) row.getCell(c).fill = fill;
}

function applyBorders(row: ExcelJS.Row, border: Partial<ExcelJS.Border>, cols: number): void {
  for (let c = 1; c <= cols; c++) {
    row.getCell(c).border = { top: border, left: border, bottom: border, right: border };
  }
}

// ── Route ────────────────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const month = parseInt(searchParams.get('month') || '0');
    const year = parseInt(searchParams.get('year') || '0');
    const adminId = searchParams.get('adminId');

    if (!month || !year || !adminId || month < 1 || month > 12) {
      return NextResponse.json(
        { error: 'month (1–12), year, and adminId are required' },
        { status: 400 }
      );
    }

    const admin = await prisma.user.findUnique({
      where: { id: adminId },
      select: { role: true },
    });
    if (!admin || admin.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // ── Month boundaries (local time) ──────────────────────────────────────
    const monthStart = new Date(year, month - 1, 1, 0, 0, 0, 0);
    const monthEnd = new Date(year, month, 0, 23, 59, 59, 999); // last day of month
    const daysInMonth = new Date(year, month, 0).getDate();

    // ── Fetch data ─────────────────────────────────────────────────────────
    const employees = await prisma.user.findMany({
      where: { role: 'EMPLOYEE', isActive: true },
      select: {
        id: true,
        employeeId: true,
        callingName: true,
        firstName: true,
        lastName: true,
      },
      orderBy: [{ callingName: 'asc' }, { firstName: 'asc' }],
    });

    const empIds = employees.map((e) => e.id);

    const attendanceRecords = await prisma.attendance.findMany({
      where: {
        date: { gte: monthStart, lte: monthEnd },
        employeeId: { in: empIds },
      },
      select: {
        employeeId: true,
        date: true,
        checkIn: true,
        checkOut: true,
      },
    });

    const leaveRecords = await prisma.leave.findMany({
      where: {
        status: { in: ['APPROVED', 'PENDING_ADMIN', 'PENDING_COVER'] },
        employeeId: { in: empIds },
        startDate: { lte: monthEnd },
        endDate: { gte: monthStart },
      },
      select: {
        employeeId: true,
        leaveType: true,
        startDate: true,
        endDate: true,
        reason: true,
        halfDayType: true,
        coverEmployee: {
          select: { callingName: true, firstName: true, lastName: true },
        },
      },
    });

    // ── Build lookup maps (local date keys) ────────────────────────────────
    type AttRec = (typeof attendanceRecords)[0];
    const attMap = new Map<string, Map<string, AttRec>>();
    for (const att of attendanceRecords) {
      // Use LOCAL date key — toISOString() would give UTC (prev day in UTC+5:30)
      const dk = toLocalDateKey(new Date(att.date));
      if (!attMap.has(att.employeeId)) attMap.set(att.employeeId, new Map());
      attMap.get(att.employeeId)!.set(dk, att);
    }

    type LeaveRec = (typeof leaveRecords)[0];
    const leaveMap = new Map<string, Map<string, LeaveRec>>();
    for (const leave of leaveRecords) {
      if (!leaveMap.has(leave.employeeId)) leaveMap.set(leave.employeeId, new Map());
      const empLeaves = leaveMap.get(leave.employeeId)!;

      // Expand multi-day leaves into individual local date keys
      const ls = new Date(leave.startDate);
      const le = new Date(leave.endDate);
      // Clamp to the current month
      const cursor = new Date(
        Math.max(
          new Date(ls.getFullYear(), ls.getMonth(), ls.getDate()).getTime(),
          monthStart.getTime()
        )
      );
      const stop = new Date(
        Math.min(
          new Date(le.getFullYear(), le.getMonth(), le.getDate(), 23, 59, 59).getTime(),
          monthEnd.getTime()
        )
      );

      while (cursor <= stop) {
        const dk = toLocalDateKey(cursor);
        if (!empLeaves.has(dk)) empLeaves.set(dk, leave);
        cursor.setDate(cursor.getDate() + 1); // advance by one local day
      }
    }

    // ── Pre-compute week groups (no padding — data starts at day 1) ────────
    // Each group covers the calendar days that fall in the same Monday-based
    // week. Header is row 1; day D occupies row D+1.
    type WeekGroup = { week: number; startDay: number; endDay: number };
    const weekGroups: WeekGroup[] = [];
    for (let d = 1; d <= daysInMonth; d++) {
      const w = weekOfMonth(new Date(year, month - 1, d));
      if (!weekGroups.length || weekGroups[weekGroups.length - 1].week !== w) {
        weekGroups.push({ week: w, startDay: d, endDay: d });
      } else {
        weekGroups[weekGroups.length - 1].endDay = d;
      }
    }

    // ── Build workbook ─────────────────────────────────────────────────────
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'EMS';
    workbook.created = new Date();

    const monthName = monthStart.toLocaleString('en-US', { month: 'long' });
    const usedNames = new Set<string>();

    for (const emp of employees) {
      const empAtt = attMap.get(emp.id) ?? new Map<string, AttRec>();
      const empLeaves = leaveMap.get(emp.id) ?? new Map<string, LeaveRec>();

      // Unique, sanitized sheet name
      let sheetName = sanitizeSheetName(getDisplayName(emp));
      if (usedNames.has(sheetName)) {
        sheetName = sanitizeSheetName(`${sheetName}_${emp.employeeId}`).substring(0, 31);
      }
      usedNames.add(sheetName);

      const ws = workbook.addWorksheet(sheetName);

      ws.columns = [
        { width: 8  }, // A – Week
        { width: 14 }, // B – Working Date
        { width: 12 }, // C – In Time
        { width: 14 }, // D – Late Minutes
        { width: 12 }, // E – Out Time
        { width: 14 }, // F – Hours Worked
        { width: 18 }, // G – Leave Applied
        { width: 26 }, // H – Explanation
        { width: 22 }, // I – Cover Employee
        { width: 3  }, // J – spacer
        { width: 12 }, // K – legend colour swatch
        { width: 30 }, // L – legend label
      ];

      // ── Header row (row 1) ───────────────────────────────────────────────
      const headerRow = ws.addRow([
        'Week',
        'Working Date',
        'In Time',
        'Late Minutes',
        'Out Time',
        'Hours Worked',
        'Leave Applied',
        'Explanation',
        'Cover Employee',
      ]);
      headerRow.height = 20;
      headerRow.font = { bold: true };
      for (let c = 1; c <= 9; c++) {
        const cell = headerRow.getCell(c);
        cell.fill = FILL_HEADER;
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
        cell.border = {
          top: BORDER_THIN,
          left: BORDER_THIN,
          bottom: BORDER_THIN,
          right: BORDER_THIN,
        };
      }

      // ── Data rows (one per calendar day — starts at day 1, no padding) ────
      for (let day = 1; day <= daysInMonth; day++) {
        // Build date using local constructor — avoids UTC-offset surprises
        const date = new Date(year, month - 1, day);
        const dk = toLocalDateKey(date); // "YYYY-MM-DD" in local time

        const att = empAtt.get(dk);
        const leave = empLeaves.get(dk);

        let inTime = '', lateStr = '', outTime = '', hoursStr = '';
        let leaveTypeLabel = '', explanation = '', coverName = '';
        let fill: ExcelJS.Fill | null = null;

        const isSunday = date.getDay() === 0;

        if (isSunday && !leave) {
          // Sunday — yellow, no attendance data (company is closed)
          fill = FILL_SUNDAY;
        } else if (leave) {
          // Leave row – colour green or blue; half-day may have attendance
          const lt = leave.leaveType;
          if      (lt === 'ANNUAL')                                        leaveTypeLabel = 'Annual';
          else if (lt === 'CASUAL' && leave.halfDayType === 'FIRST_HALF')  leaveTypeLabel = 'Casual - First Half';
          else if (lt === 'CASUAL' && leave.halfDayType === 'SECOND_HALF') leaveTypeLabel = 'Casual - Second Half';
          else if (lt === 'CASUAL')                                        leaveTypeLabel = 'Casual';
          else if (lt === 'MEDICAL')                                       leaveTypeLabel = 'Medical';
          else if (lt === 'OFFICIAL')                                      leaveTypeLabel = 'Official';
          else leaveTypeLabel = lt;

          explanation = leave.reason || '';
          coverName   = leave.coverEmployee ? getDisplayName(leave.coverEmployee) : '';
          fill        = lt === 'OFFICIAL' ? FILL_OFFICIAL : FILL_APPLIED;

          if (att?.checkIn) {
            const ci = new Date(att.checkIn);
            inTime = fmtTime(ci);
            const lm = calcLateMinutes(ci, date);
            if (lm > 0) lateStr = `${lm} min`;
          }
          if (att?.checkOut) {
            const co = new Date(att.checkOut);
            outTime = fmtTime(co);
            if (att.checkIn) hoursStr = calcHours(new Date(att.checkIn), co);
          }
        } else if (att?.checkIn || att?.checkOut) {
          // Normal working day with attendance
          if (att.checkIn) {
            const ci = new Date(att.checkIn);
            inTime = fmtTime(ci);
            const lm = calcLateMinutes(ci, date);
            if (lm > 0) lateStr = `${lm} min`;
          }
          if (att.checkOut) {
            const co = new Date(att.checkOut);
            outTime = fmtTime(co);
            if (att.checkIn) hoursStr = calcHours(new Date(att.checkIn), co);
          }
        }
        // Working days with no records: blank row, no fill

        // Write to an explicit row (day D → row D+1). Using getRow instead of
        // addRow guarantees data starts at row 2 (B2) regardless of the legend
        // cells already written into columns K–L.
        const row = ws.getRow(day + 1);
        row.values = [
          '', // col A – week number added later via merge
          day,
          inTime,
          lateStr,
          outTime,
          hoursStr,
          leaveTypeLabel,
          explanation,
          coverName,
        ];

        if (fill) applyFill(row, fill, 9);
        applyBorders(row, BORDER_HAIR, 9);
        for (let c = 1; c <= 9; c++) {
          row.getCell(c).alignment = {
            horizontal: c <= 6 ? 'center' : 'left',
            vertical: 'middle',
          };
        }

        // Highlight the Out Time cell (col 5) red when check-in exists but
        // check-out is missing (employee forgot to clock out).
        if (inTime && !outTime) {
          row.getCell(5).fill = FILL_MISSING_OUT;
        }
      }

      // ── Merge column A for each week group ────────────────────────────────
      // day D → row D+1 (row 1 is the header)
      for (const g of weekGroups) {
        const startRow = g.startDay + 1;
        const endRow = g.endDay + 1;
        if (endRow > startRow) ws.mergeCells(startRow, 1, endRow, 1);
        const cell = ws.getCell(startRow, 1);
        cell.value = g.week;
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
        cell.font = { bold: true };
        cell.border = {
          top: BORDER_THIN, left: BORDER_THIN,
          bottom: BORDER_THIN, right: BORDER_THIN,
        };
      }

      // ── Legend (cols K–L) — written AFTER data rows so it isn't wiped ─────
      // Data rows use row.values which resets the whole row; placing the
      // legend here keeps the swatches/labels in K–L intact.
      const legendTitle = ws.getCell(1, 11);
      legendTitle.value = 'Colour Legend';
      legendTitle.font = { bold: true, size: 11 };
      legendTitle.alignment = { vertical: 'middle' };

      [
        { fill: FILL_SUNDAY,      color: 'Yellow', meaning: 'Weekend Holiday (Sunday)' },
        { fill: FILL_APPLIED,     color: 'Green',  meaning: 'Applied Leave'             },
        { fill: FILL_OFFICIAL,    color: 'Blue',   meaning: 'Official Leave'            },
        { fill: FILL_MISSING_OUT, color: 'Red',    meaning: 'Missing Out Time'          },
      ].forEach((item, i) => {
        const lr = i + 2;
        const colorCell = ws.getCell(lr, 11);
        colorCell.fill = item.fill;
        colorCell.border = {
          top: BORDER_THIN, left: BORDER_THIN,
          bottom: BORDER_THIN, right: BORDER_THIN,
        };
        const labelCell = ws.getCell(lr, 12);
        labelCell.value = `${item.color}: ${item.meaning}`;
        labelCell.font = { size: 10 };
        labelCell.alignment = { vertical: 'middle' };
      });

      ws.views = [{ state: 'frozen', xSplit: 0, ySplit: 1, activeCell: 'B2' }];
    }

    // ── Serialize & respond ───────────────────────────────────────────────
    const buffer = await workbook.xlsx.writeBuffer();
    const filename = `Attendance_${monthName}_${year}.xlsx`;

    return new NextResponse(Buffer.from(buffer as ArrayBuffer), {
      status: 200,
      headers: {
        'Content-Type':
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-cache',
      },
    });
  } catch (error) {
    console.error('[MONTHLY-ATTENDANCE-REPORT] Error:', error);
    return NextResponse.json({ error: 'Failed to generate report' }, { status: 500 });
  }
}
