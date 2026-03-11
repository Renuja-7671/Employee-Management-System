# Leave Balance Immediate Deduction System

## Overview
This document describes the new leave balance deduction logic implemented on March 11, 2026. The system now deducts leave balance **immediately when a leave is applied** and **restores it when rejected** by either the cover employee or admin.

---

## Old vs New Logic

### ❌ Old Logic (Before March 11, 2026)
```
1. Employee applies for leave → Balance NOT deducted
2. Cover employee approves → Balance NOT deducted  
3. Admin approves → Balance DEDUCTED ✅
4. Admin/Cover declines → Balance NOT restored (wasn't deducted)
```

**Problems:**
- Employees could see incorrect available balance
- Multiple pending leaves could exceed actual balance
- No balance check during application

### ✅ New Logic (After March 11, 2026)
```
1. Employee applies for leave → Balance DEDUCTED immediately ✅
2. Cover employee approves → Balance already deducted
3. Admin approves → Balance already deducted
4. Cover employee declines → Balance RESTORED ✅
5. Admin declines → Balance RESTORED ✅
6. Employee cancels → Balance RESTORED ✅
7. Cover request expires (24hr) → Balance RESTORED ✅
```

**Benefits:**
- ✅ Real-time balance visibility
- ✅ Prevents over-application of leaves
- ✅ Automatic restoration on rejection/cancellation
- ✅ Accurate balance tracking at all times

---

## Implementation Details

### 1. **Leave Application** (`/api/leaves/apply`)

**When:** Employee submits a leave application

**Action:** Deduct balance immediately (if not No Pay and not Official)

```typescript
// Before creating the leave record
if (!isNoPay && leaveTypeUpper !== 'OFFICIAL') {
  const leaveTypeMap: Record<string, string> = {
    'ANNUAL': 'annual',
    'CASUAL': 'casual',
    'MEDICAL': 'medical',
  };

  const balanceField = leaveTypeMap[leaveTypeUpper];
  const currentBalance = leaveBalance[balanceField] as number;

  await prisma.leaveBalance.update({
    where: { employeeId: userId },
    data: {
      [balanceField]: currentBalance - totalDays,
    },
  });
}
```

**Example:**
- Employee has 14 annual leave days
- Applies for 3 days annual leave
- Balance immediately becomes: **11 days**

---

### 2. **Admin Approval** (`/api/leaves/[id]/approve`)

**When:** Managing Director approves the leave

**Action:** No balance deduction (already deducted when applied)

```typescript
// Simply update the status - balance was already deducted
const leave = await prisma.leave.update({
  where: { id },
  data: {
    status: 'APPROVED',
    adminResponse: body.adminResponse || null,
  },
});
```

---

### 3. **Admin Decline** (`/api/leaves/[id]/decline`)

**When:** Managing Director declines the leave

**Action:** Restore the deducted balance

```typescript
// Restore balance before declining
if (!leaveToDecline.isNoPay && leaveToDecline.leaveType !== 'OFFICIAL') {
  const leaveTypeMap: Record<string, string> = {
    'ANNUAL': 'annual',
    'CASUAL': 'casual',
    'MEDICAL': 'medical',
  };

  const balanceField = leaveTypeMap[leaveToDecline.leaveType];

  await prisma.leaveBalance.update({
    where: { employeeId: leaveToDecline.employeeId },
    data: {
      [balanceField]: {
        increment: leaveToDecline.totalDays, // Add back the days
      },
    },
  });
}
```

**Example:**
- Employee had 14 days, applied for 3 days (balance: 11 days)
- Admin declines the leave
- Balance restored to: **14 days**

---

### 4. **Cover Employee Response** (`/api/leaves/cover-response`)

**When:** Cover employee approves or declines the cover request

**Action on Approval:** No balance change (already deducted)

**Action on Decline:** Restore the deducted balance

```typescript
// When cover employee declines
if (!leave.isNoPay && leave.leaveType !== 'OFFICIAL') {
  const leaveTypeMap: Record<string, string> = {
    'ANNUAL': 'annual',
    'CASUAL': 'casual',
    'MEDICAL': 'medical',
  };

  const balanceField = leaveTypeMap[leave.leaveType];

  await prisma.leaveBalance.update({
    where: { employeeId: leave.employeeId },
    data: {
      [balanceField]: {
        increment: leave.totalDays,
      },
    },
  });
}
```

**Example:**
- Employee applied for 2 casual days (balance: 5 days)
- Cover employee declines
- Balance restored to: **7 days**

---

### 5. **Employee Cancellation** (`/api/leaves/cancel`)

**When:** Employee cancels their own pending leave request

**Action:** Restore the deducted balance

```typescript
// Restore balance when employee cancels
if (!leave.isNoPay && leave.leaveType !== 'OFFICIAL') {
  const leaveTypeMap: Record<string, string> = {
    'ANNUAL': 'annual',
    'CASUAL': 'casual',
    'MEDICAL': 'medical',
  };

  const balanceField = leaveTypeMap[leave.leaveType];

  await prisma.leaveBalance.update({
    where: { employeeId: leave.employeeId },
    data: {
      [balanceField]: {
        increment: leave.totalDays,
      },
    },
  });
}
```

**Example:**
- Employee applied for 1 medical day (balance: 6 days)
- Employee cancels the request
- Balance restored to: **7 days**

---

### 6. **Expired Cover Requests** (`/lib/cleanup-expired-covers.ts`)

**When:** Cover employee doesn't respond within 24 hours (lazy cleanup)

**Action:** Restore the deducted balance

```typescript
// Restore balance for expired requests
if (!leave.isNoPay && leave.leaveType !== 'OFFICIAL') {
  const leaveTypeMap: Record<string, string> = {
    'ANNUAL': 'annual',
    'CASUAL': 'casual',
    'MEDICAL': 'medical',
  };

  const balanceField = leaveTypeMap[leave.leaveType];

  await prisma.leaveBalance.update({
    where: { employeeId: leave.employeeId },
    data: {
      [balanceField]: {
        increment: leave.totalDays,
      },
    },
  });
}
```

**Example:**
- Employee applied for 2 annual days (balance: 12 days)
- Cover employee doesn't respond for 24 hours
- Request expires automatically
- Balance restored to: **14 days**
- Employee receives notification

---

## Special Cases

### 📌 No Pay Leaves
**Rule:** Balance is NOT deducted for No Pay leaves

When an employee applies for leave but has insufficient balance:
- Leave is marked as `isNoPay: true`
- Balance is NOT deducted when applied
- Balance is NOT restored when declined/cancelled
- Admin is notified that this is a No Pay leave

**Example:**
```typescript
Employee has 1 annual day remaining
Applies for 3 annual days
→ isNoPay = true
→ Balance remains: 1 day (not deducted)
→ If approved, employee takes 3 days (2 unpaid)
→ If declined, balance still: 1 day
```

---

### 📌 Official Leaves
**Rule:** Balance is NOT tracked for Official leaves

- Official leaves have no balance limit (unlimited)
- Balance field default: `0` (means unlimited)
- Balance is NOT deducted when applied
- Balance is NOT restored when declined/cancelled

**Example:**
```typescript
Employee applies for 1 day official leave (First Half)
→ Balance: 0 (unlimited, no change)
→ Can apply for any number of official leaves (max 3 days per request)
```

---

### 📌 Half-Day Official Leaves
**Rule:** Half-day official leaves work the same as full-day official leaves

- First Half (0.5 day) → Balance: 0 (unlimited)
- Second Half (0.5 day) → Balance: 0 (unlimited)
- No balance deduction or restoration

---

## Balance Restoration Scenarios

| Scenario | Balance Deducted? | Balance Restored? | Notes |
|----------|-------------------|-------------------|-------|
| Employee applies | ✅ Yes | - | Immediate deduction |
| Cover approves | Already deducted | ❌ No | Leave continues to admin |
| Cover declines | Already deducted | ✅ Yes | Leave request cancelled |
| Admin approves | Already deducted | ❌ No | Leave finalized |
| Admin declines | Already deducted | ✅ Yes | Leave request cancelled |
| Employee cancels | Already deducted | ✅ Yes | Leave request cancelled |
| Cover expires (24hr) | Already deducted | ✅ Yes | Leave request auto-cancelled |
| No Pay leave | ❌ No | N/A | Balance insufficient |
| Official leave | ❌ No | N/A | Unlimited balance |

---

## Database Schema

The `LeaveBalance` model tracks employee leave balances:

```prisma
model LeaveBalance {
  id         String   @id @default(uuid())
  employeeId String   @unique
  year       Int
  annual     Float    @default(14)
  casual     Float    @default(7)
  medical    Float    @default(7)
  official   Float    @default(0)  // 0 = unlimited
  updatedAt  DateTime @default(now()) @updatedAt
  User       User     @relation(fields: [employeeId], references: [id], onDelete: Cascade)
}
```

**Default Balances:**
- Annual: 14 days/year
- Casual: 7 days/year
- Medical: 7 days/year
- Official: 0 (unlimited)

---

## Flow Diagrams

### ✅ Successful Leave Application Flow
```
Employee
   |
   | 1. Apply for 3 days annual leave
   | Balance: 14 → 11 days (deducted immediately)
   ▼
Cover Employee
   |
   | 2. Approve cover request
   | Balance: still 11 days (no change)
   ▼
Admin (MD)
   |
   | 3. Approve leave
   | Balance: still 11 days (no change)
   ▼
✅ APPROVED
Final Balance: 11 days
```

---

### ❌ Leave Declined by Cover Employee
```
Employee
   |
   | 1. Apply for 2 days casual leave
   | Balance: 7 → 5 days (deducted immediately)
   ▼
Cover Employee
   |
   | 2. Decline cover request
   | Balance: 5 → 7 days (restored)
   ▼
❌ DECLINED
Final Balance: 7 days (restored)
```

---

### ❌ Leave Declined by Admin
```
Employee
   |
   | 1. Apply for 1 day medical leave
   | Balance: 7 → 6 days (deducted immediately)
   ▼
Cover Employee
   |
   | 2. Approve cover request
   | Balance: still 6 days (no change)
   ▼
Admin (MD)
   |
   | 3. Decline leave
   | Balance: 6 → 7 days (restored)
   ▼
❌ DECLINED
Final Balance: 7 days (restored)
```

---

### 🕐 Cover Request Expires
```
Employee
   |
   | 1. Apply for 2 days annual leave
   | Balance: 14 → 12 days (deducted immediately)
   ▼
Cover Employee
   |
   | 2. No response for 24 hours
   ▼
System (Lazy Cleanup)
   |
   | 3. Expire cover request
   | Balance: 12 → 14 days (restored)
   | Send notification to employee
   ▼
⏰ EXPIRED
Final Balance: 14 days (restored)
Employee can reapply
```

---

## Testing Checklist

### ✅ Test Cases

1. **Apply Leave with Sufficient Balance**
   - [x] Balance deducted immediately
   - [x] Leave created with PENDING_COVER status

2. **Apply Leave with Insufficient Balance**
   - [x] Leave marked as No Pay
   - [x] Balance NOT deducted
   - [x] Leave created with warning

3. **Cover Employee Approves**
   - [x] Balance unchanged
   - [x] Leave status → PENDING_ADMIN

4. **Cover Employee Declines**
   - [x] Balance restored
   - [x] Leave status → DECLINED
   - [x] Notification sent

5. **Admin Approves**
   - [x] Balance unchanged (already deducted)
   - [x] Leave status → APPROVED

6. **Admin Declines**
   - [x] Balance restored
   - [x] Leave status → DECLINED
   - [x] Notification sent

7. **Employee Cancels Pending Leave**
   - [x] Balance restored
   - [x] Leave status → CANCELLED

8. **Cover Request Expires (24hr)**
   - [x] Balance restored
   - [x] Leave deleted
   - [x] Notification sent

9. **Official Leave Application**
   - [x] Balance NOT deducted
   - [x] No balance restoration needed

10. **Half-Day Official Leave**
    - [x] Balance NOT deducted
    - [x] halfDayType stored correctly

---

## Console Logs

For debugging, the system logs balance operations:

```typescript
[LEAVE] Deducting balance immediately - Type: ANNUAL, Field: annual, Current: 14, Deducting: 3
[LEAVE] Restoring balance on decline - Type: CASUAL, Field: casual, Adding back: 2
[LEAVE] Restoring balance on cancellation - Type: MEDICAL, Field: medical, Adding back: 1
[LAZY-CLEANUP] Restoring balance for expired request - Type: ANNUAL, Field: annual, Adding back: 2
```

---

## Files Modified

1. ✅ `/src/app/api/leaves/apply/route.ts` - Add immediate balance deduction
2. ✅ `/src/app/api/leaves/[id]/approve/route.ts` - Remove balance deduction (already done)
3. ✅ `/src/app/api/leaves/[id]/decline/route.ts` - Add balance restoration
4. ✅ `/src/app/api/leaves/cover-response/route.ts` - Add balance restoration on decline
5. ✅ `/src/app/api/leaves/cancel/route.ts` - Add balance restoration
6. ✅ `/src/lib/cleanup-expired-covers.ts` - Add balance restoration for expired requests

---

## Migration Notes

### For Existing Data
No database migration required! The logic change is in the application layer only.

### For Users
- Employees will see more accurate real-time balance
- Pending leaves will show reduced balance immediately
- Declined/cancelled leaves will restore balance automatically

---

## Future Enhancements

Potential improvements for the leave balance system:

1. **Annual Reset** - Auto-reset balances on January 1st
2. **Carry Forward** - Allow unused leaves to carry to next year
3. **Pro-rated Balances** - Calculate balance based on join date
4. **Balance History** - Track all balance changes with audit log
5. **Balance Notifications** - Alert when balance is low
6. **Manager Override** - Allow managers to adjust balances manually

---

## Support

For questions or issues related to the leave balance system:
- Check console logs for balance operations
- Verify leave status in database
- Check LeaveBalance table for current values
- Review notification history for restoration messages

---

**Last Updated:** March 11, 2026  
**Version:** 2.0 (Immediate Deduction System)  
**Build Status:** ✅ Successful
