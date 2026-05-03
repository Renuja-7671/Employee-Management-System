# Cover Employee Availability Bug - Visual Summary

## The Problem Flow

```
TIMELINE:
──────────────────────────────────────────────────────────────

Day 1 - 10:00 AM:
┌─────────────────────────────────────────────────┐
│ Employee A applies leave (May 2-4)              │
│ Selects Saman as cover employee                 │
│                                                 │
│ Database State:                                 │
│ ├─ Leave: PENDING_COVER                         │
│ └─ CoverRequest: PENDING                        │
│    └─ Saman is now BUSY during May 2-4          │
└─────────────────────────────────────────────────┘

Day 1 - 10:15 AM:
┌─────────────────────────────────────────────────┐
│ Employee A changes mind, CANCELS leave          │
│ (before Saman approves)                         │
│                                                 │
│ ❌ BUG: Database State                          │
│ ├─ Leave: CANCELLED ✓                           │
│ └─ CoverRequest: PENDING ✗ ORPHANED!            │
│    └─ Saman is STILL marked as BUSY!            │
└─────────────────────────────────────────────────┘

Day 1 - 10:30 AM:
┌─────────────────────────────────────────────────┐
│ Employee B tries to apply leave (May 3-5)      │
│ Wants Saman as cover                           │
│                                                 │
│ ❌ Problem:                                     │
│ "Saman not available" - Dropdown excludes       │
│ employee who has orphaned PENDING request!      │
└─────────────────────────────────────────────────┘
```

## The Root Cause

```
Query Logic in /api/employees/available:
──────────────────────────────────────────────────

SELECT coverEmployeeId FROM CoverRequest
WHERE status = 'PENDING'
  AND expiresAt > NOW()
  AND overlaps_with_date_range

Result for our scenario:
┌────────────────────────────────────┐
│ CoverRequest                       │
├─────────────┬──────────────────────┤
│ Field       │ Value                │
├─────────────┼──────────────────────┤
│ id          │ "cover-456"          │
│ leaveId     │ "leave-123"          │
│ status      │ PENDING ✗ ORPHANED   │
│ expiresAt   │ 2026-05-04 23:59     │
│ coverEmp    │ "saman"              │
└────────────────────────────────────┘
           ↓
Saman filtered out (marked as busy)
Even though leave was CANCELLED!
```

## The Fix

```
BEFORE CANCELLATION:
┌──────────────────┐      ┌──────────────────┐
│ Leave            │      │ CoverRequest     │
├──────────────────┤      ├──────────────────┤
│ id: leave-123    │      │ id: cover-456    │
│ status: PENDING  │ ───→ │ status: PENDING  │
│ empId: A         │      │ coverEmp: Saman  │
└──────────────────┘      └──────────────────┘

CANCELLATION (with fix):
       ↓
   DELETE CoverRequest
       ↓
┌──────────────────┐      
│ Leave            │      (deleted)
├──────────────────┤      
│ id: leave-123    │      
│ status: CANCELLED│      
│ empId: A         │      
└──────────────────┘      

NOW:
- Saman is AVAILABLE again
- No orphaned records
- Query returns Saman for Employee B
```

## Code Change

**File**: `/src/app/api/leaves/cancel/route.ts`

```typescript
// ADDED: Delete the cover request before marking leave as cancelled
await prisma.coverRequest.deleteMany({
  where: { leaveId: leaveId },
});

// Existing: Mark leave as cancelled
const updatedLeave = await prisma.leave.update({
  where: { id: leaveId },
  data: {
    status: 'CANCELLED',
    isCancelled: true,
  },
});
```

## Result

```
AFTER FIX:
──────────────────────────────────────────────────

Day 1 - 10:15 AM: Employee A cancels leave
  ✅ CoverRequest DELETED
  ✅ Leave status = CANCELLED

Day 1 - 10:30 AM: Employee B applies leave
  ✅ Query finds NO orphaned CoverRequest
  ✅ Saman appears in dropdown
  ✅ Employee B can select Saman as cover
  ✅ Everything works!
```

## Key Takeaway

| Scenario | Before Fix | After Fix |
|----------|-----------|-----------|
| Leave Applied | ✓ | ✓ |
| CoverRequest Created | ✓ | ✓ |
| Leave Cancelled | ✓ Leaves PENDING | ✓ DELETED |
| Cover Employee Status | 🚫 Still Busy | ✅ Available |
| Other Employees Can Select | ❌ NO | ✅ YES |
| Database Clean | ❌ Orphaned | ✅ Clean |
