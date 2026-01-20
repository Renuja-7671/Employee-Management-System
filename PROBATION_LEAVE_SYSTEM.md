# Probation-Based Leave Management System

## Overview
Implemented a comprehensive probation-based leave management system that dynamically adjusts leave entitlements based on an employee's probation status and confirmation date.

## Business Rules

### Probation Employees (isProbation = true)
- **Annual Leaves**: 0 (cannot apply for annual leave)
- **Casual Leaves**: 7 days
- **Medical Leaves**: 7 days  
- **Official Leaves**: 0 days

### Confirmed Employees (isProbation = false)

#### Year of Confirmation
- **Annual Leaves**: 0 (no annual leaves in the year they are confirmed)
- **Casual Leaves**: 7 days
- **Medical Leaves**: 7 days
- **Official Leaves**: 0 days

#### Next Year After Confirmation (Prorated Annual Leaves)
Annual leave entitlement for the next year depends on which quarter the employee was confirmed:

| Confirmation Period | Annual Leaves for Next Year |
|---------------------|------------------------------|
| Q1 (Jan 1 - Mar 31) | 14 days                      |
| Q2 (Apr 1 - Jun 30) | 10 days                      |
| Q3 (Jul 1 - Sep 30) | 7 days                       |
| Q4 (Oct 1 - Dec 31) | 4 days                       |

- **Casual Leaves**: 7 days
- **Medical Leaves**: 7 days
- **Official Leaves**: 0 days

#### Years After Next Year
- **Annual Leaves**: 14 days (full entitlement)
- **Casual Leaves**: 7 days
- **Medical Leaves**: 7 days
- **Official Leaves**: 0 days

## Database Changes

### Schema Updates (`prisma/schema.prisma`)

```prisma
model User {
  // ... existing fields
  isProbation      Boolean    @default(true)
  confirmedAt      DateTime? // Date when isProbation was changed to false
  // ... existing fields
}
```

### Migrations
1. `20260119202730_add_is_probation_field` - Added isProbation field
2. `20260120_add_confirmed_at` - Added confirmedAt field to track confirmation date

## Implementation Details

### New Utility Module (`src/lib/leave-probation-utils.ts`)

#### Key Functions

1. **`calculateAnnualLeavesForConfirmedEmployee(confirmationDate: Date)`**
   - Calculates annual leaves for next year based on confirmation quarter
   - Returns: `{ annualLeavesForNextYear: number, effectiveYear: number }`

2. **`getLeaveBalanceForEmployee(isProbation, year, confirmedAt?)`**
   - Returns appropriate leave balance based on probation status and year
   - Handles prorated annual leaves for newly confirmed employees
   - Returns: `{ annual, casual, medical, official }`

3. **`canApplyForLeaveType(isProbation, leaveType)`**
   - Validates if an employee can apply for a specific leave type
   - Blocks annual leave applications for probation employees
   - Returns: `{ canApply: boolean, message?: string }`

4. **`logProbationStatusChange(change: ProbationStatusChange)`**
   - Logs probation status changes for audit trail
   - Logs calculated annual leave entitlements

### Updated API Endpoints

#### 1. Employee Update API (`/api/employees/[id]`)
**Changes:**
- Tracks when `isProbation` changes from `true` to `false`
- Automatically sets `confirmedAt` timestamp when employee is confirmed
- Logs probation status changes

```typescript
// When confirming an employee
if (existingEmployee.isProbation === true && body.isProbation === false) {
  updateData.confirmedAt = new Date();
  logProbationStatusChange({
    employeeId: id,
    previousStatus: true,
    newStatus: false,
    changedAt: new Date(),
  });
}
```

#### 2. Leave Balance API (`/api/leaves/balance`)
**Changes:**
- Fetches employee's probation status and confirmation date
- Calculates leave balance using `getLeaveBalanceForEmployee()`
- Creates or updates leave balance with calculated values
- Automatically adjusts annual leaves based on probation status

```typescript
const calculatedBalance = getLeaveBalanceForEmployee(
  employee.isProbation,
  currentYear,
  employee.confirmedAt
);
```

#### 3. Leave Application API (`/api/leaves/apply`)
**Changes:**
- Validates leave type eligibility based on probation status
- Blocks annual leave applications for probation employees
- Uses probation-aware leave balance calculation
- Returns clear error messages for ineligible leave applications

```typescript
const leaveEligibility = canApplyForLeaveType(applicantEmployee.isProbation, leaveType);
if (!leaveEligibility.canApply) {
  return NextResponse.json(
    { error: leaveEligibility.message },
    { status: 400 }
  );
}
```

## Usage Examples

### Example 1: Employee Confirmed on February 15, 2026

**2026 (Year of Confirmation):**
- Annual: 0 days
- Casual: 7 days
- Medical: 7 days

**2027 (Next Year):**
- Annual: 14 days (confirmed in Q1)
- Casual: 7 days
- Medical: 7 days

**2028 and beyond:**
- Annual: 14 days
- Casual: 7 days
- Medical: 7 days

### Example 2: Employee Confirmed on May 10, 2026

**2026 (Year of Confirmation):**
- Annual: 0 days
- Casual: 7 days
- Medical: 7 days

**2027 (Next Year):**
- Annual: 10 days (confirmed in Q2)
- Casual: 7 days
- Medical: 7 days

**2028 and beyond:**
- Annual: 14 days
- Casual: 7 days
- Medical: 7 days

### Example 3: Employee Confirmed on November 20, 2026

**2026 (Year of Confirmation):**
- Annual: 0 days
- Casual: 7 days
- Medical: 7 days

**2027 (Next Year):**
- Annual: 4 days (confirmed in Q4)
- Casual: 7 days
- Medical: 7 days

**2028 and beyond:**
- Annual: 14 days
- Casual: 7 days
- Medical: 7 days

## User Interface Integration

### Leave Application Form
- Probation employees see a disabled/hidden option for annual leave
- Clear error message if they attempt to apply: "Employees on probation cannot apply for annual leave. You can apply for casual, medical, or official leave."

### Leave Balance Display
- Shows 0 annual leaves for probation employees
- Displays prorated annual leaves for newly confirmed employees
- Updates automatically when probation status changes

### Admin Employee Management
- Admins can change probation status via the "Probation Status" dropdown
- System automatically tracks confirmation date when status changes to "Confirmed"
- Leave balances update in real-time based on probation status

## Logging and Audit Trail

The system logs all probation status changes:

```
[PROBATION] Status change: {
  employeeId: 'xxx',
  from: 'Probation',
  to: 'Confirmed',
  changedAt: '2026-01-20T10:30:00.000Z'
}

[PROBATION] Employee confirmed: {
  employeeId: 'xxx',
  confirmationDate: '2026-01-20',
  annualLeavesForNextYear: 14,
  effectiveYear: 2027
}
```

## Testing Scenarios

### Test 1: Probation Employee Cannot Apply for Annual Leave
1. Create employee with isProbation = true
2. Attempt to apply for annual leave
3. ✅ Should return error: "Employees on probation cannot apply for annual leave"

### Test 2: Confirm Employee in Q1
1. Create employee on Jan 15, 2026
2. Set isProbation = false on Feb 20, 2026
3. Check leave balance for 2026: annual = 0
4. Check leave balance for 2027: annual = 14
5. Check leave balance for 2028: annual = 14

### Test 3: Confirm Employee in Q3
1. Create employee on Jun 1, 2026
2. Set isProbation = false on Aug 10, 2026
3. Check leave balance for 2026: annual = 0
4. Check leave balance for 2027: annual = 7
5. Check leave balance for 2028: annual = 14

### Test 4: Probation Employee Applies for Casual Leave
1. Create employee with isProbation = true
2. Apply for 1 day casual leave
3. ✅ Should be successful (casual leave allowed)

### Test 5: Leave Balance Updates on Confirmation
1. Employee has isProbation = true
2. Check leave balance: annual = 0
3. Admin changes isProbation = false
4. Check leave balance again
5. ✅ Annual leaves should be calculated based on quarter

## Migration Instructions

### For Development
```bash
# Generate Prisma client
npx prisma generate

# Run dev server
npm run dev
```

### For Production
```bash
# Apply migration to add confirmedAt field
npx prisma migrate deploy

# Regenerate Prisma client
npx prisma generate

# Restart application
pm2 restart app
```

## Future Enhancements

1. **Notification System**: Notify HR when probation period is about to end
2. **Bulk Update**: Tool to bulk-confirm employees and set confirmation dates
3. **Report**: Generate report of employees on probation
4. **Automatic Confirmation**: Cron job to auto-confirm after probation period (e.g., 3 or 6 months)
5. **Probation History Table**: Store full history of probation status changes
6. **Leave Balance Adjustment**: Admin tool to manually adjust leave balances if needed

## Related Files Modified

### Backend
- `src/lib/leave-probation-utils.ts` (NEW)
- `src/app/api/employees/[id]/route.ts`
- `src/app/api/leaves/balance/route.ts`
- `src/app/api/leaves/apply/route.ts`
- `src/lib/api/employees.ts`

### Database
- `prisma/schema.prisma`
- `prisma/migrations/20260119202730_add_is_probation_field/migration.sql`
- `prisma/migrations/20260120_add_confirmed_at/migration.sql`

### Frontend
- `src/components/admin/EmployeeManagement.tsx` (from previous update)
- `src/components/admin/EmployeeProfiles.tsx` (from previous update)

---
**Implementation Date**: January 20, 2026  
**Status**: ✅ Complete and tested  
**Breaking Changes**: None - backward compatible with existing data
