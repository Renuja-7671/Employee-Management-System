# On Leave Count Fix - Admin Dashboard

## Issue Description
The "On Leave" count in the admin dashboard's "Today's Attendance" card was showing 0 even when employees had approved leaves for the current day.

## Root Cause
The original query only counted leaves with `status: 'APPROVED'`, but there were issues with:
1. Date comparison logic not handling date boundaries correctly
2. Not considering the cover employee approval status as per business requirements

## Solution Implemented

### Changes Made
**File:** `/Users/renuja/Documents/Projects/MIS V3/ems/src/app/api/attendance/today/route.ts`

### Updated Logic
The "On Leave" count now includes employees where:

1. **Admin Approved Leaves** (`status: 'APPROVED'`)
   - Leave has been approved by the admin
   - Employee is officially on leave

2. **Cover Approved Leaves** (`status: 'PENDING_ADMIN'`)
   - Cover employee has approved the leave request
   - Work has been delegated (even if admin hasn't approved yet)
   - Only for non-OFFICIAL leave types (ANNUAL, CASUAL, MEDICAL, NO_PAY)

3. **Official Leaves** (`status: 'PENDING_ADMIN'`, `leaveType: 'OFFICIAL'`)
   - Official leaves don't require cover employee approval
   - Can be counted immediately when applied

### Date Comparison Fix
- Changed from comparing with `today` at midnight to using date boundaries
- Now uses `today` (start of day) and `tomorrow` (start of next day)
- Properly handles leaves that span multiple days

### Query Structure
```typescript
WHERE:
  AND [
    startDate <= tomorrow  (leave starts on or before tomorrow)
    endDate >= today       (leave ends on or after today)
  ]
  OR [
    status = 'APPROVED'
    OR (status = 'PENDING_ADMIN' AND leaveType != 'OFFICIAL')
    OR (status = 'PENDING_ADMIN' AND leaveType = 'OFFICIAL')
  ]
```

## Business Logic Rationale

### Why Include PENDING_ADMIN Leaves?
1. **Work Delegation**: Once the cover employee approves, the work is already delegated
2. **Resource Planning**: The employee is effectively unavailable for that day
3. **Accurate Attendance**: Reflects the real situation on the ground
4. **Cover Employee Accountability**: If cover approved, they're committed to handle the work

### Why Exclude PENDING_COVER Leaves?
1. **No Work Delegation**: Cover employee hasn't agreed yet
2. **Uncertain Status**: Leave might be declined by cover employee
3. **Employee Still Available**: Until cover approves, employee should work

## Testing Scenarios

### Scenario 1: Admin Approved Leave
```
Leave Status: APPROVED
Expected: ✅ Counted in "On Leave"
Reason: Admin has approved, employee is officially on leave
```

### Scenario 2: Cover Approved, Pending Admin
```
Leave Status: PENDING_ADMIN
Leave Type: CASUAL (with cover employee)
Expected: ✅ Counted in "On Leave"
Reason: Cover employee approved, work delegated
```

### Scenario 3: Official Leave Pending Admin
```
Leave Status: PENDING_ADMIN
Leave Type: OFFICIAL
Expected: ✅ Counted in "On Leave"
Reason: No cover employee needed for official leaves
```

### Scenario 4: Pending Cover Approval
```
Leave Status: PENDING_COVER
Expected: ❌ NOT counted in "On Leave"
Reason: Cover employee hasn't approved, work not delegated
```

### Scenario 5: Declined Leave
```
Leave Status: DECLINED
Expected: ❌ NOT counted in "On Leave"
Reason: Leave was declined
```

## Debug Logging
Added console logging to help troubleshoot:
```typescript
console.log('[ATTENDANCE_TODAY] Debug info:', {
  todayDate: today.toISOString(),
  tomorrowDate: tomorrow.toISOString(),
  totalLeaves: employeesOnLeave.length,
  leaves: employeesOnLeave.map(l => ({
    id: l.id,
    employeeId: l.employeeId,
    type: l.leaveType,
    status: l.status,
    startDate: l.startDate,
    endDate: l.endDate,
  })),
});
```

Check server logs to see which leaves are being counted.

## Impact
- ✅ More accurate "On Leave" count
- ✅ Reflects real-world work delegation status
- ✅ Better resource planning for admin
- ✅ Matches business process (cover approval = work delegated)

## Related Features
- Cover Request System (24-hour expiry)
- Official Leave Workflow (no cover employee needed)
- Leave Approval Process (Cover → Admin)

## Deployment
Changes have been deployed to:
- **Hostinger Server**: Running on PM2
- **Vercel**: Production deployment

Monitor the dashboard to verify correct counts.
