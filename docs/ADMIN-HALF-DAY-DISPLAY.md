# Admin Half-Day Display Implementation

## Overview
Updated the admin leave management system to display and export half-day type information (First Half/Second Half) for official leaves.

## Changes Made

### 1. API - Export Official Leaves (`src/app/api/leaves/export-official/route.ts`)

#### Added Half-Day Type Column
Added a new "Half Day Type" column to the CSV export:

```typescript
const headers = [
  'Employee Name',
  'Employee ID',
  'Leave Type',
  'Start Date',
  'End Date',
  'Total Days',
  'Half Day Type',  // NEW COLUMN
  'Status',
  'Applied Date',
  'Reason',
];
```

#### Half-Day Type Formatting
Converts database values to user-friendly text:
- `FIRST_HALF` → "First Half"
- `SECOND_HALF` → "Second Half"
- `null` or empty → "N/A"

### 2. Frontend - Leave Management Component (`src/components/admin/LeaveManagement.tsx`)

#### Updated Type Definitions
Added `halfDayType` to the Leave interface:
```typescript
interface Leave extends LeaveAPI {
  userId: string;
  days: number;
  medicalCertUrl?: string | null;
  coveringDuties?: CoveringDuty[];
  halfDayType?: string | null;  // NEW FIELD
}
```

#### Enhanced "Export All" CSV
Updated the `exportToCSV()` function to include half-day type:
```typescript
const headers = [
  'Employee',
  'Employee ID',
  'Leave Type',
  'Start Date',
  'End Date',
  'Days',
  'Half Day Type',  // NEW COLUMN
  'Status',
  'Applied Date',
  'Cover Employee',
  'Reason',
];
```

#### Table Display Enhancement
Modified the "Days" column in the leave requests table to show half-day type:
```typescript
<TableCell>
  <div className="flex flex-col">
    <span>{leave.days}</span>
    {leave.halfDayType && (
      <span className="text-xs text-gray-500">
        {leave.halfDayType === 'FIRST_HALF' ? '(First Half)' : '(Second Half)'}
      </span>
    )}
  </div>
</TableCell>
```

**Visual Example:**
```
0.5
(First Half)
```
or
```
0.5
(Second Half)
```

### 3. API Type Definitions (`src/lib/api/leaves.ts`)

Updated the Leave interface to include halfDayType:
```typescript
export interface Leave {
  // ... existing fields
  halfDayType?: string | null;  // NEW FIELD
}
```

## Features

### Admin Leave Management Page (`/admin/leaves`)

1. **Table Display**
   - Shows half-day type under the days count
   - Only displays for leaves with half-day designation
   - Formatted as "(First Half)" or "(Second Half)"

2. **Export All Button**
   - Includes "Half Day Type" column
   - Shows "First Half", "Second Half", or "N/A"
   - Maintains all existing export functionality

3. **Export Official Leaves Button**
   - Includes "Half Day Type" column
   - Filters to show only official leaves
   - Formatted the same as "Export All"

## CSV Export Format

### Example Export (Official Leaves)
```csv
"Employee Name","Employee ID","Leave Type","Start Date","End Date","Total Days","Half Day Type","Status","Applied Date","Reason"
"John Doe","EMP001","OFFICIAL","2026-02-10","2026-02-10","0.5","First Half","APPROVED","2/10/2026","Morning doctor appointment"
"Jane Smith","EMP002","OFFICIAL","2026-02-11","2026-02-11","0.5","Second Half","PENDING_ADMIN","2/10/2026","Afternoon personal matter"
"Bob Wilson","EMP003","OFFICIAL","2026-02-12","2026-02-13","2","N/A","APPROVED","2/10/2026","Official business"
```

### Example Export (All Leaves)
```csv
"Employee","Employee ID","Leave Type","Start Date","End Date","Days","Half Day Type","Status","Applied Date","Cover Employee","Reason"
"John Doe","EMP001","OFFICIAL","2026-02-10","2026-02-10","0.5","First Half","APPROVED","2/10/2026","N/A","Morning appointment"
"Jane Smith","EMP002","CASUAL","2026-02-15","2026-02-15","0.5","N/A","APPROVED","2/10/2026","Mike Johnson","Personal"
"Bob Wilson","EMP003","ANNUAL","2026-03-01","2026-03-05","5","N/A","PENDING_COVER","2/10/2026","Sarah Lee","Vacation"
```

## User Experience

### For Admins

**Viewing Leave Requests:**
1. Navigate to `/admin/leaves`
2. View the leave requests table
3. For half-day leaves, see the designation below the days count:
   - "0.5" on top line
   - "(First Half)" or "(Second Half)" on bottom line in smaller gray text

**Exporting Data:**
1. Use date range filters to select period
2. Click "Export All" or "Export Official Leaves"
3. CSV file includes "Half Day Type" column
4. Open in Excel/Google Sheets to analyze half-day patterns

### Benefits

1. **Clear Identification**: Admins can immediately see if an employee is absent morning or afternoon
2. **Better Planning**: Helps schedule meetings and assignments around employee availability
3. **Accurate Reporting**: CSV exports preserve half-day type information for record-keeping
4. **Data Analysis**: Finance/HR can analyze patterns of first-half vs second-half leaves

## Technical Notes

- **Backward Compatible**: Existing leaves without half-day type show "N/A" in exports
- **Conditional Display**: Table only shows half-day type when present (cleaner UI)
- **Consistent Formatting**: Same display format across table and both export functions
- **Type Safety**: TypeScript interfaces updated for proper type checking

## Testing Checklist

- [x] Half-day type displays in leave management table
- [x] "Export All" includes half-day type column
- [x] "Export Official Leaves" includes half-day type column
- [x] Full-day leaves show "N/A" for half-day type
- [x] First Half displays correctly
- [x] Second Half displays correctly
- [x] No TypeScript errors
- [ ] Test CSV import into Excel
- [ ] Verify data accuracy in exports
- [ ] Check mobile responsiveness of table display

## Future Enhancements

1. **Filter by Half-Day Type**: Add dropdown to filter leaves by First Half/Second Half
2. **Dashboard Statistics**: Show count of first-half vs second-half leaves
3. **Attendance Integration**: Mark attendance records with half-day designations
4. **Calendar View**: Color-code first-half and second-half leaves differently
5. **Reports**: Add half-day type to PDF reports and summaries

## Related Documentation

- [Half-Day Leave Implementation](./HALF-DAY-LEAVE-IMPLEMENTATION.md) - Employee application side
- API Documentation: `/api/leaves/export-official`
- Component: `src/components/admin/LeaveManagement.tsx`
