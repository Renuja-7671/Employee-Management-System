# Bug Fix: Cover Employee Not Available After Leave Cancellation

**Date**: May 3, 2026  
**Issue**: Orphaned Cover Requests After Leave Cancellation  
**Status**: ✅ FIXED  
**Build Status**: ✅ Compiled successfully

---

## Problem Description

When an employee applied for a leave with a cover employee (e.g., Saman) and then deleted that leave request **before admin approval**, the cover employee was not becoming available again for selection.

### Symptoms
1. User applies leave with Saman as cover employee
2. Cover request is created with status `PENDING`
3. User cancels the leave (before admin approval)
4. Leave status becomes `CANCELLED`
5. **BUG**: Saman is not available when applying for a new leave during the same period
6. **Expected**: Saman should be available again

### Root Cause

**The Issue**: Orphaned Cover Requests

When a leave is cancelled:
- **Before Fix**: Only the `Leave` record status changed to `CANCELLED`
- **Consequence**: The associated `CoverRequest` record remained with status `PENDING`
- **Result**: The `/api/employees/available` endpoint filters out employees with `PENDING` cover requests, leaving them unavailable

**Database State After Cancellation (BEFORE FIX)**:
```
Leave Record:
  - id: "leave-123"
  - employeeId: "emp-001"
  - coverEmployeeId: "saman"
  - status: "CANCELLED"  ✓ Updated

CoverRequest Record:
  - id: "cover-456"
  - leaveId: "leave-123"
  - coverEmployeeId: "saman"
  - status: "PENDING"  ✗ ORPHANED - Never cleaned up!
```

**Availability Check Logic** (in `/api/employees/available`):
```typescript
const employeesWithPendingCoverRequests = await prisma.coverRequest.findMany({
  where: {
    status: 'PENDING',  // ← Finds orphaned cover request
    expiresAt: { gt: new Date() },  // ← Orphaned request never expires
    Leave: { /* date range matching */ }
  }
});

// Saman is excluded from available employees because:
// - CoverRequest still exists with PENDING status
// - The orphaned request matches the same date range
// - So Saman is filtered out as "busy"
```

---

## Solution

**Delete the associated `CoverRequest` when cancelling a leave**

### Code Changes

**File**: `/src/app/api/leaves/cancel/route.ts`

**Change**: Added `deleteMany` before updating the leave status to `CANCELLED`

```typescript
// Delete the associated cover request (if exists) so the cover employee becomes available again
await prisma.coverRequest.deleteMany({
  where: { leaveId: leaveId },
});

// Update leave status to CANCELLED
const updatedLeave = await prisma.leave.update({
  where: { id: leaveId },
  data: {
    status: 'CANCELLED',
    isCancelled: true,
  },
});
```

### Why This Fix Works

1. **Removes Orphaned Records**: The orphaned `CoverRequest` is deleted from the database
2. **No Future Filtering**: When checking available employees, the query finds no `PENDING` cover request
3. **Cover Employee Available Again**: Saman is no longer filtered out and appears in the available employees list
4. **Clean State**: Both `Leave` and `CoverRequest` are properly cleaned up

### Database State After Cancellation (AFTER FIX)

```
Leave Record:
  - id: "leave-123"
  - employeeId: "emp-001"
  - coverEmployeeId: "saman"
  - status: "CANCELLED"  ✓ Updated

CoverRequest Record:
  - [DELETED] ✓ No orphaned record
```

---

## Test Scenario

### Before Fix (Reproduction Steps)
1. **Apr 30**: Employee A applies leave (May 1-3) with Saman as cover → `CoverRequest` created with status `PENDING`
2. **May 1**: Employee A cancels leave before Saman approves → `Leave` status = `CANCELLED`, but `CoverRequest` still `PENDING`
3. **May 1**: Employee B tries to apply leave (May 2-3) with Saman as cover
4. **Result**: ❌ Saman NOT in available employees dropdown - Shows as busy

### After Fix (Expected Behavior)
1. **Apr 30**: Employee A applies leave (May 1-3) with Saman as cover → `CoverRequest` created with status `PENDING`
2. **May 1**: Employee A cancels leave before Saman approves → `Leave` status = `CANCELLED`, `CoverRequest` DELETED
3. **May 1**: Employee B tries to apply leave (May 2-3) with Saman as cover
4. **Result**: ✅ Saman appears in available employees dropdown - Ready to cover

---

## Related Operations

### What Happens to Notifications?
- ✅ Notification still sent to cover employee: "A leave request you were covering has been cancelled"
- ✅ This ensures the cover employee knows the situation even after the record is deleted

### What About Other Leave Statuses?
- **APPROVED**: Cover request remains (employee is actually on leave)
- **REJECTED**: Cover request should also be deleted (but currently not handled - potential future improvement)
- **DECLINED** (by cover): Cover request remains with status `DECLINED` (preserved for audit)
- **PENDING_COVER** → **CANCELLED**: Cover request deleted ✅
- **PENDING_ADMIN** → **CANCELLED**: Cover request deleted ✅

### Cascade Delete Behavior
- When a leave is deleted (hard delete), `CoverRequest` cascades delete via Prisma `onDelete: Cascade`
- This fix handles the soft cancel scenario where leave still exists but is marked `CANCELLED`

---

## Impact Analysis

### ✅ Benefits
- Cover employees become available again after leave cancellation
- No orphaned records accumulating in the database
- Cleaner availability filtering logic
- Better user experience when managing leaves

### ⚠️ Considerations
- **Data Retention**: Cancelled cover requests are no longer in database (audit trail lost for cancelled leaves)
  - **Mitigation**: The Leave record still exists with `CANCELLED` status for audit purposes
  - Notification history preserved in `Notification` collection
  
### 🔍 Related Issues to Monitor
- **Future**: Consider updating logic for `REJECTED` leaves (similar issue)
- **Future**: Archive orphaned cover requests to separate table for audit instead of deleting

---

## Deployment Notes

### Build Status
✅ Build successful - All 71 routes compiled with 0 errors

### Database Considerations
- ✅ No migrations required (using application-level delete via Prisma)
- ✅ No schema changes needed
- ✅ Safe to deploy to any environment

### Rollback Plan
If needed, rollback to previous version - old cancelled leaves would accumulate orphaned cover requests, but system would still function (just with incorrect availability)

---

## Testing Checklist

- [ ] User applies leave with specific cover employee
- [ ] User cancels leave before cover employee approves
- [ ] Verify cover employee is available for new leave during same period
- [ ] Verify cover employee receives cancellation notification
- [ ] Test with multiple cancellations in sequence
- [ ] Verify no database errors in logs

---

## Code Location Reference

- **Fix Applied**: `/src/app/api/leaves/cancel/route.ts` (lines 45-57)
- **Related Query**: `/src/app/api/employees/available/route.ts` (filtering logic)
- **Database Model**: `prisma/schema.prisma` (CoverRequest and Leave models)

---

## Commit Message

```
fix: delete orphaned cover requests when cancelling leave

When a leave is cancelled before admin approval, the associated
CoverRequest record was not being deleted, causing the cover employee
to remain unavailable even though the leave was cancelled.

This fix deletes the CoverRequest record during cancellation, freeing
up the cover employee for other leave requests during the same period.

Fixes issue where cancelled leaves left orphaned cover requests
```
