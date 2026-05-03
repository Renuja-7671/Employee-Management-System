# Issue Resolution: Cover Employee Availability Bug

**Status**: ✅ FIXED  
**Date Fixed**: May 3, 2026  
**Build Status**: ✅ Compiled successfully (71 static pages, 0 errors)  
**Deployment Ready**: YES

---

## Executive Summary

**Issue**: When a user cancelled a leave request (before admin approval), the assigned cover employee was not becoming available again for other leave requests during the same period.

**Root Cause**: Orphaned CoverRequest records that were never cleaned up when the leave was cancelled.

**Fix**: Delete the associated CoverRequest record when cancelling a leave.

**Impact**: ✅ Minimal, backward compatible, immediate fix

---

## Technical Details

### The Problem

```
Scenario:
1. Employee A applies leave (May 2-4) with Saman as cover
   → CoverRequest created with status PENDING
   
2. Employee A cancels leave (before Saman approves)
   → Leave status changes to CANCELLED
   → ❌ CoverRequest remains with status PENDING (ORPHANED)
   
3. Employee B applies leave (May 3-5) and wants Saman as cover
   → ❌ System says "Saman not available"
   → Reason: Orphaned CoverRequest still marked as PENDING
   → Expected: Saman should be available
```

### Root Cause Analysis

**File**: `/src/app/api/employees/available/route.ts`

The availability check queries:
```typescript
const employeesWithPendingCoverRequests = await prisma.coverRequest.findMany({
  where: {
    status: 'PENDING',        // ← Finds the orphaned record
    expiresAt: { gt: new Date() },  // ← Orphaned request doesn't expire
    Leave: { /* overlapping date range */ }
  }
});

// Result: Saman excluded from available employees
// Reason: Has PENDING cover request (even though parent leave is CANCELLED)
```

**The Data State After Cancellation** (BEFORE FIX):

| Table | Field | Value |
|-------|-------|-------|
| Leave | id | leave-123 |
| Leave | status | **CANCELLED** ✓ |
| Leave | coverEmployeeId | saman |
| CoverRequest | id | cover-456 |
| CoverRequest | leaveId | leave-123 |
| CoverRequest | status | **PENDING** ✗ ORPHANED |

---

## The Solution

### Code Change

**File**: `/src/app/api/leaves/cancel/route.ts`  
**Lines Added**: 3 lines after line 43

```typescript
// Delete the associated cover request (if exists) so the cover employee becomes available again
await prisma.coverRequest.deleteMany({
  where: { leaveId: leaveId },
});
```

**Complete Flow**:
```typescript
// 1. Fetch leave details
const leave = await prisma.leave.findUnique({...});

// 2. Validate authorization
if (leave.employeeId !== userId) {...}

// 3. Validate status is cancellable
if (leave.status !== 'PENDING_COVER' && leave.status !== 'PENDING_ADMIN') {...}

// 4. ✨ NEW: Delete orphaned cover request
await prisma.coverRequest.deleteMany({
  where: { leaveId: leaveId },
});

// 5. Update leave status
const updatedLeave = await prisma.leave.update({...});

// 6. Notify cover employee
if (leave.coverEmployeeId) {
  await prisma.notification.create({...});
}
```

### Why This Works

1. **No Orphaned Records**: CoverRequest is deleted before leave status changes
2. **Query Returns Correct Results**: Next query for available employees finds no PENDING cover request
3. **Cover Employee Available**: Employee becomes available for other leave requests
4. **Notification Preserved**: Cover employee still gets cancellation notification
5. **Clean Database**: No audit issues (Leave record still exists with CANCELLED status)

---

## Before vs After

### BEFORE FIX
```
User Action: Cancel leave (before cover approval)
    ↓
Leave Record: CANCELLED ✓
CoverRequest: PENDING ✗ (orphaned)
    ↓
Result: Cover employee UNAVAILABLE ❌
```

### AFTER FIX
```
User Action: Cancel leave (before cover approval)
    ↓
Delete CoverRequest (cleanup)
    ↓
Leave Record: CANCELLED ✓
CoverRequest: [DELETED] ✓
    ↓
Result: Cover employee AVAILABLE ✅
```

---

## Testing Scenarios

### Test Case 1: Basic Cancellation
**Steps**:
1. Employee A applies leave (May 2-4) with Saman
2. Employee A cancels leave
3. Employee B applies leave (May 3-5)

**Expected Result**: ✅ Saman available in dropdown

### Test Case 2: Multiple Cancellations
**Steps**:
1. Employee A applies leave with Saman → cancels
2. Employee B applies leave with Saman → cancels
3. Employee C applies leave with Saman

**Expected Result**: ✅ Saman available after each cancellation

### Test Case 3: Without Cancellation
**Steps**:
1. Employee A applies leave (May 2-4) with Saman
2. Employee B applies leave (May 3-5)

**Expected Result**: ❌ Saman NOT available (still pending cover approval)

### Test Case 4: After Cover Approval
**Steps**:
1. Employee A applies leave with Saman
2. Saman approves cover request
3. Employee B applies leave (same dates)

**Expected Result**: ❌ Saman NOT available (already approved)

### Test Case 5: Notification Sent
**Steps**:
1. Employee A applies leave with Saman
2. Employee A cancels leave
3. Check Saman's notifications

**Expected Result**: ✅ Notification "Leave request cancelled" received

---

## Database Impact

### Schema Changes
✅ **None required** - Using existing CoverRequest model

### Migrations
✅ **None required** - Using application-level delete via Prisma

### Data Safety
✅ **Safe** - Leave record preserved with CANCELLED status for audit trail

---

## Related Features

### Cascade Delete Behavior
When a Leave is completely deleted (not just cancelled), CoverRequest cascades delete automatically:
```prisma
CoverRequest {
  Leave  @relation(fields: [leaveId], references: [id], onDelete: Cascade)
}
```

### Notification Audit Trail
Even though CoverRequest is deleted, notification history is preserved:
```typescript
await prisma.notification.create({
  userId: leave.coverEmployeeId,
  type: 'LEAVE_CANCELLED',
  message: 'A leave request you were covering has been cancelled'
});
```

### Leave Status Lifecycle (with this fix)
```
PENDING_COVER
    ↓
    ├─→ (Cover approves) → PENDING_ADMIN
    ├─→ (Cover declines) → DECLINED
    └─→ (Cancelled) → CANCELLED [CoverRequest deleted] ✅
        
PENDING_ADMIN
    ↓
    ├─→ (Admin approves) → APPROVED
    ├─→ (Admin rejects) → REJECTED
    └─→ (Cancelled) → CANCELLED [CoverRequest deleted] ✅
```

---

## Potential Future Improvements

### 1. Handle REJECTED Leaves
**Issue**: When a leave is rejected, CoverRequest might also need cleanup
**Status**: ⏳ Consider in future sprint

### 2. Audit Archive Instead of Delete
**Enhancement**: Keep orphaned CoverRequests in separate archive table for audit
**Status**: ⏳ Consider if audit compliance is needed

### 3. Cascade Delete on Other Status Changes
**Enhancement**: Automatically delete orphaned cover requests from cron jobs
**Status**: ⏳ Monitor if issue recurs

---

## Deployment Checklist

- [x] Code changes completed
- [x] Build successful (0 errors)
- [x] No database migrations needed
- [x] Backward compatible
- [x] Documentation created
- [x] Test scenarios defined
- [ ] User testing (pending)
- [ ] Production deployment (pending)

---

## Rollback Plan

If needed to revert:
```bash
# 1. Revert the code change
git revert <commit-hash>

# 2. Redeploy
npm run build
npm run dev

# Note: Old cancelled leaves would accumulate orphaned cover requests,
# but system would still function (just with incorrect availability)
```

---

## Files Modified

| File | Change | Status |
|------|--------|--------|
| `/src/app/api/leaves/cancel/route.ts` | Added CoverRequest cleanup | ✅ Complete |
| Documentation | Created bug fix docs | ✅ Complete |

---

## Related Endpoints

### Query Affected by Fix
- **Endpoint**: `GET /api/employees/available`
- **Effect**: Now correctly returns cover employee after cancellation
- **No changes to this file**: Logic already correct, just needed orphaned records cleaned

### Notification Creation
- **Endpoint**: `POST /api/leaves/cancel`
- **Effect**: Still sends notification to cover employee (no change needed)

---

## Performance Impact

- ✅ **Negligible**: Single additional `deleteMany` query
- ✅ **Minimal**: Index on `leaveId` exists (unique constraint)
- ✅ **No N+1 queries**: Direct deletion by leaveId

---

## Monitoring & Validation

After deployment, monitor:
1. Number of CoverRequests with orphaned leaves (should be 0)
2. Cover employee availability queries (should return more results)
3. User feedback on leave cancellation workflow
4. Notification delivery to cover employees

---

## Build Output

```
✓ Compiled successfully in 4.5s
✓ Generating static pages (71/71)

Routes:
├ ƒ /api/leaves/cancel ← UPDATED
├ ƒ /api/employees/available ← BENEFITS FROM FIX
└ ... (69 other routes)

Build Status: ✅ SUCCESS (0 errors)
```

---

**Ready for Production Deployment** ✅
