# Automatic Cover Employee Release After 12 Hours

## Overview

When a ### 3. **Cover Response API** (`/api/leaves/cover-response`)

**Before**: Generic "expired" message

**After**: Clearer message explaining the cover employee is now available

```typescript
if (new Date() > leave.CoverRequest.expiresAt) {
  return NextResponse.json({
    error: 'This cover request has expired (12-hour limit exceeded). You are no longer assigned to cover this leave and are now available for other cover requests.',
    expired: true
  }, { status: 400 });
}
```

### 4. **Leaves List API** (`/api/leaves`)

**New**: Filters out expired leave requests from all views

```typescript
// Include CoverRequest in query
include: {
  CoverRequest: {
    select: { status: true, expiresAt: true }
  }
}

// Filter out expired requests
const activeLeaves = leaves.filter((leave) => {
  if (leave.CoverRequest) {
    if (leave.CoverRequest.status === 'PENDING' && 
        new Date() > leave.CoverRequest.expiresAt) {
      return false; // Don't show expired requests
    }
  }
  return true;
});
```

This ensures expired requests are hidden from:
- ✅ Employee who applied the leave
- ✅ Cover employee's dashboard
- ✅ Admin leave management panel doesn't respond to a leave request within 12 hours, they are **automatically released** and become available for other leave requests. The expired leave request remains in the database but is effectively ignored by the system.

## How It Works

### Simplified Approach (No Cron Job Needed)

Instead of running a cron job to delete expired requests, the system simply **filters out expired cover requests** in all relevant queries. This is simpler, more efficient, and doesn't require any scheduled tasks.

```
Employee applies for leave
         ↓
Cover request created with 12-hour expiry
         ↓
    [12 hours pass]
         ↓
Cover request expires (expiresAt < NOW)
         ↓
System automatically ignores this request:
  ✅ Cover employee appears in "available employees" list
  ✅ Cover employee's pending requests list is empty
  ✅ Cover employee can't respond to expired request
  ✅ Expired request hidden from all users (employee, cover, admin)
  ✅ Leave request stays in database (for audit trail)
```

## What Changed

### 1. **Available Employees API** (`/api/employees/available`)

**Before**: Showed all employees except those with ANY pending cover request

**After**: Excludes only employees with **non-expired** pending cover requests

```typescript
const employeesWithPendingCoverRequests = await prisma.coverRequest.findMany({
  where: {
    status: 'PENDING',
    expiresAt: {
      gt: new Date(), // 👈 Only include non-expired requests
    },
    // ... other conditions
  },
});
```

### 2. **Cover Requests List API** (`/api/leaves/cover-requests`)

**Before**: Showed all pending cover requests for a cover employee

**After**: Only shows **non-expired** pending cover requests

```typescript
const coverRequests = await prisma.coverRequest.findMany({
  where: {
    coverEmployeeId: userId,
    status: 'PENDING',
    expiresAt: {
      gt: new Date(), // 👈 Filter out expired requests
    },
  },
});
```

### 3. **Pending Count API** (`/api/cover-requests/pending`)

Already had expiry check ✅ - Only counts non-expired requests

### 4. **Cover Response API** (`/api/leaves/cover-response`)

**Before**: Generic "expired" message

**After**: Clearer message explaining the cover employee is now available

```typescript
if (new Date() > leave.CoverRequest.expiresAt) {
  return NextResponse.json({
    error: 'This cover request has expired (12-hour limit exceeded). You are no longer assigned to cover this leave and are now available for other cover requests.',
    expired: true
  }, { status: 400 });
}
```

## User Experience

### For Cover Employees

#### Within 12 Hours:
- ✅ See the cover request in their dashboard
- ✅ Can approve or decline
- ✅ Request counts toward their "pending" badge

#### After 12 Hours:
- ❌ Cover request disappears from their dashboard
- ✅ Shows as available in "Select Cover Employee" lists
- ❌ Can't respond if they try (error message shown)
- ✅ Badge count decreases automatically

### For Employees Who Applied

#### Within 12 Hours:
- ⏳ Leave status: `PENDING_COVER`
- ⏰ Waiting for cover employee response
- 📊 Can see request in "My Leaves"

#### After 12 Hours:
- ❌ Leave request **hidden from all views**
- 🚫 No longer visible in "My Leaves" list
- 🔄 Employee can reapply if needed
- 💾 Request preserved in database (audit trail)

## Benefits of This Approach

### 1. **No Cron Job Required**
- ✅ No need for Hostinger cron setup
- ✅ No scheduled tasks to monitor
- ✅ Works immediately without configuration
- ✅ One less thing to maintain

### 2. **Audit Trail Preserved**
- ✅ Expired requests stay in database
- ✅ Can track how many requests expire
- ✅ Useful for analytics (e.g., "John never responds")
- ✅ Historical data for reporting

### 3. **Real-Time**
- ✅ No waiting for cron to run
- ✅ Instant availability after expiry
- ✅ No delay in seeing updated lists

### 4. **Simpler Architecture**
- ✅ Less code to maintain
- ✅ No external dependencies
- ✅ Easier to understand
- ✅ Fewer failure points

### 5. **Clean User Experience**
- ✅ Expired requests automatically hidden from all users
- ✅ No confusing "stuck" requests in dashboards
- ✅ Cover employees see only actionable requests
- ✅ Admins see only valid pending requests

## Edge Cases Handled

### 1. **Cover Employee Tries to Respond After Expiry**
```json
{
  "error": "This cover request has expired (12-hour limit exceeded). You are no longer assigned to cover this leave and are now available for other cover requests.",
  "expired": true
}
```
The frontend can show a friendly message and refresh the list.

### 2. **Employee Reapplies for Same Leave**
- ✅ Old expired request remains in DB
- ✅ New request creates fresh 12-hour window
- ✅ No conflicts

### 3. **Cover Employee Was Blocking Multiple Requests**
- ✅ All expired requests release them simultaneously
- ✅ They become available for new requests immediately

### 4. **Admin Views Leave Requests**
- ✅ Can still see expired cover requests in admin panel (if needed)
- ✅ Can filter by expiry status for reports

## Database State

### Example Timeline

```sql
-- Initial state: Cover request created
INSERT INTO "CoverRequest" (
  id, leaveId, coverEmployeeId, status, expiresAt
) VALUES (
  'abc123', 'leave456', 'emp789', 'PENDING', '2026-01-29 21:00:00'
);

-- After 12 hours (expiresAt < NOW)
-- No database changes needed!
-- The record stays exactly the same

-- System automatically treats it as expired:
-- ✅ Not shown in cover employee's list
-- ✅ Cover employee marked as available
-- ✅ Response attempts blocked
```

## Optional Future Enhancements

### 1. **Notification to Employee**
Add a notification when their request expires:
```typescript
// In a daily cron or on next login
if (leave.status === 'PENDING_COVER' && coverRequest.expiresAt < new Date()) {
  await createNotification({
    userId: leave.employeeId,
    message: 'Your leave request expired because cover employee didn't respond'
  });
}
```

### 2. **Auto-Cancel Expired Requests**
Add a "cleanup" button in admin panel:
```typescript
// Admin action: Clean up expired requests
DELETE FROM "Leave" 
WHERE id IN (
  SELECT "Leave".id FROM "Leave"
  JOIN "CoverRequest" ON "CoverRequest"."leaveId" = "Leave".id
  WHERE "CoverRequest".status = 'PENDING'
    AND "CoverRequest"."expiresAt" < NOW()
);
```

### 3. **Analytics Dashboard**
Track expiry statistics:
- How many requests expire per month
- Which cover employees never respond
- Average response time

## Testing

### Test Scenario 1: Expired Request Doesn't Block

1. Create a leave request with cover employee John
2. Update `expiresAt` to past:
   ```sql
   UPDATE "CoverRequest" 
   SET "expiresAt" = NOW() - INTERVAL '1 hour'
   WHERE id = 'abc123';
   ```
3. Check available employees list → John should appear ✅
4. Check John's cover requests → Should be empty ✅

### Test Scenario 2: Can't Respond to Expired Request

1. Try to approve expired request via API
2. Should get error message about expiry ✅
3. Request should not update ✅

## Summary

✅ **No cron job needed**  
✅ **Cover employees automatically available after 12 hours**  
✅ **Expired requests still in database for audit**  
✅ **Simpler, more efficient approach**  
✅ **Real-time updates, no delays**  

---

**Updated**: January 29, 2026  
**Approach**: Query filtering instead of scheduled deletion  
**Status**: Implemented and tested ✅
