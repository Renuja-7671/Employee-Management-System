# Cover Request Expiry and Re-application Behavior

## Question
When the cover employee fails to approve a cover request for a colleague's leave, will that colleague be able to apply a new leave with the same cover employee again just after the expiry?

## Answer: **YES** ✅

The employee **CAN** immediately reapply with the same cover employee after the cover request expires.

---

## How It Works

### Current System Behavior

#### 1. **Cover Request Expiry (24 Hours)**
When a cover employee doesn't respond within 24 hours:

```
Timeline:
Day 1, 9:00 AM  → Employee applies for leave, selects Cover Employee A
Day 1, 9:00 AM  → Cover request created, expires at Day 2, 9:00 AM
Day 2, 9:01 AM  → Cover request expires (no response from Cover Employee A)
```

#### 2. **Automated Cleanup Process**
The cron job (`/api/cron/cleanup-expired-covers`) runs hourly and:

**Step 1: Delete the expired leave request**
```typescript
await prisma.leave.delete({
  where: { id: leave.id }
});
```

**Step 2: Notify the employee**
```
Notification: "❌ Leave Request Expired"
Message: "Your [leave type] leave request ([dates]) has expired because 
         [Cover Employee Name] did not respond within 24 hours. 
         Please reapply if you still need this leave."
```

**Step 3: Free up the cover employee**
- The cover request is deleted (cascade delete)
- Cover Employee A becomes available again
- No blocking record remains in the database

#### 3. **Immediate Re-application**
After cleanup, the employee can:

✅ **Apply for the same leave dates**
✅ **Select the same cover employee (Cover Employee A)**
✅ **Or choose a different cover employee**

---

## Technical Details

### Available Employees API Logic

The `/api/employees/available` endpoint determines who can be selected as a cover employee:

```typescript
// Get employees who have pending cover requests
const employeesWithPendingCoverRequests = await prisma.coverRequest.findMany({
  where: {
    status: 'PENDING',
    expiresAt: {
      gt: new Date(), // Only include NON-EXPIRED cover requests
    },
    // ... date overlap checks
  }
});
```

**Key Point:** Only **non-expired** cover requests block an employee. Once expired:
- The cover request status changes or gets deleted
- The employee appears in the available list again
- Can be selected as a cover employee for new requests

### No Blacklisting or Cooldown Period

The system **does NOT** implement:
- ❌ Blacklisting of cover employees who didn't respond
- ❌ Cooldown periods between requests to the same cover employee
- ❌ Tracking of declined or expired cover requests
- ❌ Warnings about selecting previously unresponsive cover employees

---

## Example Scenario

### Scenario: Employee John wants leave, selects Mike as cover

**Attempt 1:**
```
Monday 9:00 AM:  John applies for Friday leave
                 Selects Mike as cover employee
                 System creates cover request (expires Tuesday 9:00 AM)

Monday 10:00 AM: Mike receives notification
Monday - Tuesday: Mike doesn't respond

Tuesday 9:01 AM: Cover request expires
Tuesday 10:00 AM: Cron job runs, deletes John's leave request
                 Sends notification to John: "Request expired, please reapply"
                 Mike is freed up, no longer has pending cover request
```

**Attempt 2 - Immediate Reapplication:**
```
Tuesday 10:05 AM: John checks available employees
                  ✅ Mike appears in the list (no blocking)
                  
Tuesday 10:06 AM: John applies for Friday leave AGAIN
                  ✅ Selects Mike as cover employee AGAIN
                  System creates NEW cover request (expires Wed 10:06 AM)

Tuesday 11:00 AM: Mike receives NEW notification
                  Mike can now approve or decline
```

---

## Why This Design?

### Advantages ✅

1. **No Permanent Blocking**: Cover employees aren't permanently blocked for missing requests
2. **Second Chances**: Maybe the cover employee was busy and will respond this time
3. **Flexibility**: Employees can retry with the same cover if they trust them
4. **No Manual Intervention**: No admin needed to "reset" cover employee availability

### Potential Issues ⚠️

1. **Repeated Ignoring**: If Cover Employee A repeatedly ignores requests, the system allows infinite retries
2. **Notification Spam**: Cover employees can receive multiple requests from the same person
3. **No Learning**: System doesn't track or flag unresponsive cover employees
4. **No Guidance**: System doesn't suggest alternative cover employees who are more responsive

---

## Recommendations for Improvement

If you want to improve this behavior, consider these options:

### Option 1: Add a Cooldown Period
Prevent selecting the same cover employee for X hours after expiry:

```typescript
// In /api/leaves/apply/route.ts
// Check if this cover employee had an expired request recently
const recentExpiredRequest = await prisma.coverRequest.findFirst({
  where: {
    Leave: {
      employeeId: userId,
    },
    userId: coverEmployeeId,
    status: 'PENDING',
    expiresAt: {
      lt: new Date(),
      gt: new Date(Date.now() - 24 * 60 * 60 * 1000), // Within last 24 hours
    },
  },
});

if (recentExpiredRequest) {
  return NextResponse.json(
    { 
      error: `${coverEmployeeName} did not respond to your previous request. Please wait 24 hours or choose a different cover employee.` 
    },
    { status: 400 }
  );
}
```

### Option 2: Track Response Rate
Show cover employee reliability when selecting:

```typescript
// Calculate response rate
const coverEmployeeStats = await prisma.coverRequest.groupBy({
  by: ['userId'],
  where: {
    userId: coverEmployeeId,
  },
  _count: {
    _all: true,
  },
});

// Count responded requests
const respondedCount = await prisma.coverRequest.count({
  where: {
    userId: coverEmployeeId,
    status: { in: ['ACCEPTED', 'DECLINED'] },
  },
});

const responseRate = (respondedCount / coverEmployeeStats._count._all) * 100;

// Show warning if response rate < 50%
if (responseRate < 50) {
  // Add warning to UI: "⚠️ This employee has a low response rate (45%)"
}
```

### Option 3: Suggest Alternative Cover Employees
When a request expires, suggest others:

```
Notification: "Your leave request expired because Mike didn't respond.
               Other available cover employees for your dates:
               • Sarah (95% response rate)
               • David (88% response rate)
               • Tom (75% response rate)"
```

### Option 4: Limit Retry Attempts
Allow max 2 attempts with the same cover employee per date range:

```typescript
// Check previous expired requests with same cover for same dates
const previousAttempts = await prisma.auditLog.count({
  where: {
    action: 'COVER_REQUEST_EXPIRED',
    employeeId: userId,
    coverEmployeeId: coverEmployeeId,
    startDate: startDate,
    endDate: endDate,
  },
});

if (previousAttempts >= 2) {
  return NextResponse.json(
    { 
      error: `You have already tried ${coverEmployeeName} twice for these dates. Please select a different cover employee.` 
    },
    { status: 400 }
  );
}
```

---

## Current System Summary

| Aspect | Current Behavior |
|--------|------------------|
| **Can reapply immediately?** | ✅ Yes, right after expiry |
| **Can select same cover employee?** | ✅ Yes, no restrictions |
| **Retry limit?** | ❌ No limit (infinite retries) |
| **Cooldown period?** | ❌ None |
| **Warning about unresponsive cover?** | ❌ None |
| **Response rate tracking?** | ❌ Not tracked |
| **Alternative suggestions?** | ❌ Not provided |

---

## Conclusion

**Yes**, the colleague can immediately reapply with the same cover employee after the cover request expires. The system automatically:

1. ✅ Deletes the expired leave request
2. ✅ Frees up the cover employee
3. ✅ Allows reselection of the same cover employee
4. ✅ Creates a new 24-hour window for response

This provides flexibility but may need enhancements if cover employees repeatedly ignore requests.

