# No Pay Leave System

## Overview

The No Pay Leave system allows employees to apply for leaves even when their leave balance is zero. These leaves are marked as "No Pay" and clearly communicated to both the employee and admin.

---

## How It Works

### Employee Perspective

1. **Apply for Leave with Zero Balance**
   - Employee can still submit leave request even with 0 balance
   - System shows warning dialog before submission
   - Warning clearly states: "This will be a NO PAY leave if approved"
   - Employee must confirm to proceed

2. **Visual Warnings**
   - Leave balance cards show red background when balance is 0
   - Text displays: "⚠️ No Pay if applied"
   - Toast notification after submission confirms No Pay status

3. **Notification**
   - Employee receives pinned notification about No Pay status
   - Notification is persistent until dismissed

### Admin Perspective

1. **Leave Approval Interface**
   - Admin sees that this is a No Pay leave during review
   - Approval notification title: "✅ Leave Approved (NO PAY)"
   - Notification message includes warning about No Pay status

2. **Notification**
   - Pinned notification to ensure visibility
   - Clear indication of insufficient balance

---

## Technical Implementation

### Database Schema

**Leave Model - New Field:**
```prisma
model Leave {
  // ... existing fields
  isNoPay  Boolean @default(false)
}
```

### API Changes

#### Leave Application (`POST /api/leaves/apply`)

**Before (Old Behavior):**
```typescript
if (leaveBalance.annual < totalDays) {
  return NextResponse.json({ error: 'Insufficient balance' }, { status: 400 });
}
```

**After (New Behavior):**
```typescript
let isNoPay = false;
if (leaveBalance.annual < totalDays) {
  isNoPay = true;
  noPayMessage = `Insufficient balance. This will be a NO PAY leave.`;
}

// Create leave with isNoPay flag
const leave = await prisma.leave.create({
  data: {
    // ... other fields
    isNoPay: isNoPay,
  },
});

// Notify employee if No Pay
if (isNoPay) {
  await prisma.notification.create({
    data: {
      userId: userId,
      type: 'SYSTEM_ALERT',
      title: '⚠️ No Pay Leave Notice',
      message: noPayMessage,
      relatedId: leave.id,
      isPinned: true,
    },
  });
}
```

**Response:**
```json
{
  "message": "Leave request submitted successfully",
  "leave": { "id": "...", "status": "PENDING_COVER" },
  "isNoPay": true,
  "noPayMessage": "You have insufficient annual leave balance (0 days remaining). This will be a NO PAY leave if approved."
}
```

#### Leave Approval (`POST /api/leaves/[id]/approve`)

**Changes:**
```typescript
// Create notification with No Pay indication
const adminNotificationMessage = leave.isNoPay
  ? `You approved ${employee.firstName} ${employee.lastName}'s leave request for ${leave.totalDays} day(s). ⚠️ This is a NO PAY leave due to insufficient balance.`
  : `You approved ${employee.firstName} ${employee.lastName}'s leave request for ${leave.totalDays} day(s).`;

await prisma.notification.create({
  data: {
    userId: body.adminId,
    type: 'LEAVE_APPROVED',
    title: leave.isNoPay ? '✅ Leave Approved (NO PAY)' : '✅ Leave Approved',
    message: adminNotificationMessage,
    isPinned: leave.isNoPay ? true : false,
  },
});
```

### UI Changes

#### Balance Display (`ApplyLeave.tsx`)

**Visual Indicators:**
```tsx
<div className={`text-center p-4 rounded-lg ${
  leaveBalance.annual === 0
    ? 'bg-red-100 border-2 border-red-300'
    : 'bg-blue-50'
}`}>
  <p className="text-sm text-gray-600">Annual Leave</p>
  <p className={`text-2xl ${leaveBalance.annual === 0 ? 'text-red-600' : ''}`}>
    {leaveBalance.annual}
  </p>
  <p className="text-xs text-gray-500">days remaining</p>
  {leaveBalance.annual === 0 && (
    <p className="text-xs text-red-600 mt-1 font-semibold">
      ⚠️ No Pay if applied
    </p>
  )}
</div>
```

#### Leave Application Form

**Confirmation Dialog:**
```typescript
if (leaveBalance.annual < days) {
  const confirmed = window.confirm(
    `⚠️ WARNING: You have insufficient annual leave balance (${leaveBalance.annual} days remaining).\n\nThis will be a NO PAY leave if approved.\n\nDo you want to continue?`
  );
  if (!confirmed) return;
}
```

**Success Toast:**
```typescript
if (data.isNoPay) {
  toast.warning(
    '⚠️ Leave request submitted successfully. NOTE: This is a NO PAY leave due to insufficient balance. Waiting for cover employee approval.',
    { duration: 8000 }
  );
} else {
  toast.success('Leave request submitted successfully. Waiting for cover employee approval.');
}
```

---

## Leave Types Affected

The No Pay system applies to:
- ✅ **Annual Leave** (14 days per year)
- ✅ **Casual Leave** (7 days per year)
- ✅ **Medical Leave** (7 days per year)
- ❌ **Official Leave** (Unlimited, not affected)

---

## User Flow Diagrams

### Employee Flow

```
┌─────────────────────────────────────────┐
│ Employee applies for leave              │
│ (Balance: 0 days)                       │
└───────────────┬─────────────────────────┘
                │
                ▼
┌─────────────────────────────────────────┐
│ System shows confirmation dialog:       │
│ "⚠️ This will be a NO PAY leave"        │
└───────────────┬─────────────────────────┘
                │
         ┌──────┴──────┐
         │             │
    Cancel ◄─      Confirm
         │             │
         │             ▼
         │   ┌─────────────────────────────┐
         │   │ Leave created with          │
         │   │ isNoPay = true              │
         │   └─────────┬───────────────────┘
         │             │
         │             ▼
         │   ┌─────────────────────────────┐
         │   │ Employee receives pinned    │
         │   │ notification: NO PAY notice │
         │   └─────────┬───────────────────┘
         │             │
         │             ▼
         │   ┌─────────────────────────────┐
         │   │ Toast shows warning message │
         │   │ for 8 seconds               │
         │   └─────────────────────────────┘
         │
         └───► Flow ends
```

### Admin Flow

```
┌─────────────────────────────────────────┐
│ Admin reviews leave request             │
│ (isNoPay: true)                         │
└───────────────┬─────────────────────────┘
                │
                ▼
┌─────────────────────────────────────────┐
│ Admin sees No Pay indicator             │
│ in leave details                        │
└───────────────┬─────────────────────────┘
                │
         ┌──────┴──────┐
         │             │
    Decline ◄─     Approve
         │             │
         │             ▼
         │   ┌─────────────────────────────┐
         │   │ Leave status: APPROVED      │
         │   │ Balance NOT deducted        │
         │   └─────────┬───────────────────┘
         │             │
         │             ▼
         │   ┌─────────────────────────────┐
         │   │ Admin receives pinned       │
         │   │ notification:               │
         │   │ "✅ Leave Approved (NO PAY)"│
         │   └─────────────────────────────┘
         │
         └───► Flow ends
```

---

## Balance Deduction Logic

### With Balance (Normal Leave)

```typescript
// Employee has 5 days, applies for 3 days
currentBalance = 5;
totalDays = 3;
isNoPay = false;

// After approval:
newBalance = currentBalance - totalDays; // 5 - 3 = 2
await prisma.leaveBalance.update({
  where: { id: leaveBalance.id },
  data: { annual: newBalance }, // 2
});
```

### Without Balance (No Pay Leave)

```typescript
// Employee has 0 days, applies for 3 days
currentBalance = 0;
totalDays = 3;
isNoPay = true;

// After approval:
newBalance = Math.max(0, currentBalance - totalDays); // max(0, -3) = 0
await prisma.leaveBalance.update({
  where: { id: leaveBalance.id },
  data: { annual: newBalance }, // Still 0, no negative balance
});
```

**Note:** Balance cannot go negative. It stays at 0.

---

## Migration Instructions

### Step 1: Apply Schema Changes

```bash
cd /Users/renuja/Documents/MIS\ V3/ems

# Generate Prisma client with isNoPay field
npx prisma generate
```

### Step 2: Apply Database Migration

**Option A: Development**
```bash
npx prisma migrate dev --name add_no_pay_leave
```

**Option B: Production (Vercel)**
```bash
# Push code to GitHub
git add .
git commit -m "Implement No Pay leave system"
git push

# Migration will be applied automatically on Vercel deployment
```

### Step 3: Manual Migration (If Needed)

If migrations don't run automatically:

```sql
-- Connect to your PostgreSQL database
ALTER TABLE "Leave" ADD COLUMN "isNoPay" BOOLEAN NOT NULL DEFAULT false;
CREATE INDEX "Leave_isNoPay_idx" ON "Leave"("isNoPay");
COMMENT ON COLUMN "Leave"."isNoPay" IS 'Indicates if this leave is a No Pay leave due to insufficient balance';
```

---

## Testing Scenarios

### Test 1: Annual Leave with Zero Balance

1. Set employee annual balance to 0
2. Apply for 1 day annual leave
3. **Expected:**
   - Confirmation dialog appears
   - Leave created with `isNoPay: true`
   - Employee receives pinned notification
   - Toast shows warning message
4. Admin approves
5. **Expected:**
   - Admin notification shows "(NO PAY)"
   - Balance remains at 0 (not negative)

### Test 2: Medical Leave with Partial Balance

1. Set employee medical balance to 1 day
2. Apply for 2 days medical leave
3. **Expected:**
   - Confirmation dialog: "Balance: 1 day remaining"
   - Leave created with `isNoPay: true`
   - Warning notifications sent
4. Admin approves
5. **Expected:**
   - Balance deducted: 1 - 2 = max(0, -1) = 0
   - No Pay indicator shown

### Test 3: Casual Leave with Sufficient Balance

1. Set employee casual balance to 5 days
2. Apply for 1 day casual leave
3. **Expected:**
   - No confirmation dialog
   - Leave created with `isNoPay: false`
   - Normal success message
4. Admin approves
5. **Expected:**
   - Normal approval notification (no "NO PAY")
   - Balance deducted: 5 - 1 = 4

---

## Benefits

### For Employees
✅ Can apply for essential leaves (especially medical) even with zero balance
✅ Clear communication about No Pay status
✅ No confusion or surprises
✅ Maintains work-life balance during emergencies

### For Management
✅ Full visibility into No Pay leaves
✅ No manual tracking needed
✅ Accurate payroll data (isNoPay flag)
✅ Audit trail maintained
✅ Prevents employee frustration from blocked leave requests

### For Payroll
✅ Easy identification of No Pay leaves
✅ Simple query: `SELECT * FROM Leave WHERE isNoPay = true AND status = 'APPROVED'`
✅ Accurate salary calculations
✅ Export to payroll systems

---

## Querying No Pay Leaves

### Get All No Pay Leaves for a Period

```typescript
const noPayLeaves = await prisma.leave.findMany({
  where: {
    isNoPay: true,
    status: 'APPROVED',
    startDate: {
      gte: new Date('2024-01-01'),
      lte: new Date('2024-12-31'),
    },
  },
  include: {
    employee: {
      select: {
        firstName: true,
        lastName: true,
        employeeId: true,
      },
    },
  },
});
```

### Get No Pay Leave Count by Employee

```typescript
const noPayCount = await prisma.leave.groupBy({
  by: ['employeeId'],
  where: {
    isNoPay: true,
    status: 'APPROVED',
  },
  _count: {
    id: true,
  },
  _sum: {
    totalDays: true,
  },
});
```

### Export for Payroll

```typescript
const payrollData = await prisma.leave.findMany({
  where: {
    isNoPay: true,
    status: 'APPROVED',
    startDate: {
      gte: startOfMonth,
      lte: endOfMonth,
    },
  },
  select: {
    id: true,
    employeeId: true,
    startDate: true,
    endDate: true,
    totalDays: true,
    leaveType: true,
    employee: {
      select: {
        firstName: true,
        lastName: true,
        employeeId: true,
        email: true,
      },
    },
  },
});

// Generate CSV
const csv = payrollData.map(leave =>
  `${leave.employee.employeeId},${leave.employee.firstName} ${leave.employee.lastName},${leave.totalDays},${leave.startDate.toLocaleDateString()},${leave.endDate.toLocaleDateString()}`
).join('\n');
```

---

## Future Enhancements (Optional)

1. **Admin Dashboard Widget**
   - Show count of pending No Pay leaves
   - Monthly No Pay leave trends

2. **Payroll Integration**
   - Direct export to payroll software
   - Automatic salary adjustment calculations

3. **Employee Warning System**
   - Alert employees when balance is low (< 3 days)
   - Suggest planning leaves in advance

4. **Reporting**
   - No Pay leave analytics by department
   - Year-over-year comparison
   - Identify patterns and trends

5. **Email Notifications**
   - Send email along with in-app notification
   - Include No Pay warning in email subject

---

## Summary

The No Pay Leave system provides a humane, transparent solution for handling leave requests when balance is insufficient. It maintains:

- ✅ **Transparency:** Clear communication to all parties
- ✅ **Flexibility:** Employees can take essential leaves
- ✅ **Accountability:** Full audit trail maintained
- ✅ **Accuracy:** Precise payroll data
- ✅ **Compliance:** Company policy enforced automatically

**Implementation Date:** December 8, 2024
**Status:** Backend Complete, UI Complete, Ready for Migration
**Next Step:** Apply migration with `npx prisma generate` and deploy
