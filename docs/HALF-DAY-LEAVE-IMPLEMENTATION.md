# Half-Day Leave Implementation for Official Leaves

## Overview
Added support for "First Half" and "Second Half" options when applying for official leaves. This allows employees to specify whether they will be absent during the morning (first half) or afternoon (second half) of a work day.

## Changes Made

### 1. Frontend - ApplyLeave Component (`src/components/employee/ApplyLeave.tsx`)

#### Form State
Added `halfDayType` field to the form data:
```typescript
const [formData, setFormData] = useState({
  // ... existing fields
  halfDayType: '', // For official leave: 'FIRST_HALF' or 'SECOND_HALF'
});
```

#### Day Options Function
Updated `getDayOptions()` to include half-day options for official leaves:
```typescript
if (formData.leaveType === 'official') {
  return [
    { value: 0.5, label: 'First Half', halfDayType: 'FIRST_HALF' },
    { value: 0.5, label: 'Second Half', halfDayType: 'SECOND_HALF' },
    { value: 1, label: '1 day' },
    { value: 2, label: '2 days' },
    { value: 3, label: '3 days' },
  ];
}
```

#### Dropdown Handler
Modified the Select component to capture both the day value and halfDayType:
- Uses composite value format: `"0.5-FIRST_HALF"` or `"0.5-SECOND_HALF"`
- Parses the value to extract both `numberOfDays` and `halfDayType`
- Clears `halfDayType` for full-day options

### 2. Database Schema (`prisma/schema.prisma`)

Added `halfDayType` field to the Leave model:
```prisma
model Leave {
  // ... existing fields
  halfDayType  String?  // For official leave half days: 'FIRST_HALF' or 'SECOND_HALF'
  // ... remaining fields
}
```

Migration: `20260210042257_add_half_day_type`

### 3. Backend API (`src/app/api/leaves/apply/route.ts`)

#### Request Handling
- Added `halfDayType` to the destructured request body
- Included `halfDayType` in the leave creation data:
```typescript
const leave = await prisma.leave.create({
  data: {
    // ... existing fields
    halfDayType: halfDayType || null,
  },
});
```

## Usage

### For Employees
1. Navigate to "Apply Leave" page
2. Select "Official" as leave type
3. Choose from dropdown:
   - **First Half**: Absent during morning hours (0.5 day)
   - **Second Half**: Absent during afternoon hours (0.5 day)
   - **1 day, 2 days, or 3 days**: Full day options

### Data Flow
1. Employee selects "First Half" or "Second Half"
2. Form stores:
   - `numberOfDays`: 0.5
   - `halfDayType`: "FIRST_HALF" or "SECOND_HALF"
3. API receives and stores both values in database
4. Leave record includes the specific half-day designation

## Business Logic

### Official Leaves
- **First Half**: Employee is not in office during the morning (first half of work day)
- **Second Half**: Employee is not in office during the afternoon (second half of work day)
- Both count as 0.5 days but are distinguished by the `halfDayType` field

### Validation
- Official leaves can be 0.5 (with half-day type), 1, 2, or 3 days
- Date range: Within 3 days before or after current date
- No cover employee required for official leaves

## Future Enhancements

### Recommended Updates

1. **Admin Leave Management** (`src/components/admin/LeaveManagement.tsx`)
   - Display half-day type in leave requests table
   - Show "First Half (0.5 day)" or "Second Half (0.5 day)" instead of just "0.5 days"

2. **Leave Summary Reports** (`src/components/admin/LeaveSummary.tsx`)
   - Include half-day type in PDF exports
   - Add column: "Type" showing First Half/Second Half/Full Day

3. **CSV Exports**
   - Add "Half Day Type" column to official leave exports
   - Update both "Export All" and "Export Official Leaves" functions

4. **Employee Dashboard** (`src/components/EmployeeDashboard.tsx`)
   - Show half-day designation in leave history
   - Display "First Half" or "Second Half" badge for 0.5 day official leaves

5. **Attendance Report** (`src/components/admin/AttendanceManagement.tsx`)
   - Consider half-day leaves when calculating attendance
   - Mark employee as "First Half Absent" or "Second Half Absent" accordingly

## Technical Notes

- **Backward Compatibility**: The `halfDayType` field is nullable, so existing leave records without this field remain valid
- **Data Integrity**: Only populated for official leaves with 0.5 day duration
- **Type Safety**: Prisma client regenerated to include TypeScript types for the new field
- **Validation**: Frontend enforces selection; backend stores exactly what's submitted

## Testing Checklist

- [ ] Apply official leave with "First Half" option
- [ ] Apply official leave with "Second Half" option
- [ ] Verify database stores correct `halfDayType` value
- [ ] Check admin can see half-day designation in leave management
- [ ] Test PDF export includes half-day information
- [ ] Verify CSV export contains half-day type column
- [ ] Confirm half-day type shows in employee leave history

## Database Migration

```sql
-- Migration: 20260210042257_add_half_day_type
ALTER TABLE "Leave" ADD COLUMN "halfDayType" TEXT;
```

To apply the migration:
```bash
npx prisma migrate deploy
```

To regenerate Prisma client:
```bash
npx prisma generate
```
