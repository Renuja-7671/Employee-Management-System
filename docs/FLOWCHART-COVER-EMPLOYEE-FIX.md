# Cover Employee Bug - Flowchart & Diagrams

## System Flow Diagram

### BEFORE FIX ❌

```
┌─────────────────────────────────────────────────────────────────┐
│ Employee A: Apply Leave (May 2-4) with Saman as cover          │
└─────────────────────────────────────────────────────────────────┘
                              ↓
        ┌───────────────────────────────────────┐
        │ Database State AFTER Application      │
        ├───────────────────────────────────────┤
        │ Leave:                                │
        │ • id: leave-123                       │
        │ • status: PENDING_COVER               │
        │ • coverEmployeeId: saman              │
        │                                       │
        │ CoverRequest:                         │
        │ • id: cover-456                       │
        │ • leaveId: leave-123                  │
        │ • status: PENDING                     │
        └───────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ Employee A: Cancel Leave (before Saman approves)               │
└─────────────────────────────────────────────────────────────────┘
                              ↓
        ┌───────────────────────────────────────┐
        │ ❌ BUG: Database State AFTER CANCEL   │
        ├───────────────────────────────────────┤
        │ Leave:                                │
        │ • id: leave-123                       │
        │ • status: CANCELLED ✓                 │
        │ • coverEmployeeId: saman              │
        │                                       │
        │ CoverRequest:                         │
        │ • id: cover-456                       │
        │ • leaveId: leave-123                  │
        │ • status: PENDING ✗ ORPHANED!         │
        └───────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ Employee B: Apply Leave (May 3-5) - wants Saman as cover      │
└─────────────────────────────────────────────────────────────────┘
                              ↓
        ┌───────────────────────────────────────┐
        │ Query: GET /api/employees/available   │
        │ Finding PENDING cover requests...     │
        ├───────────────────────────────────────┤
        │ SELECT coverEmployeeId                │
        │ FROM CoverRequest                     │
        │ WHERE status = 'PENDING'              │
        │   AND expiresAt > NOW()               │
        │                                       │
        │ Result: saman (from orphaned record!) │
        └───────────────────────────────────────┘
                              ↓
        ┌───────────────────────────────────────┐
        │ ❌ Saman FILTERED OUT                 │
        │    (marked as busy)                   │
        └───────────────────────────────────────┘
                              ↓
        ┌───────────────────────────────────────┐
        │ ❌ PROBLEM:                           │
        │ Saman not available in dropdown       │
        │ Even though leave was cancelled!      │
        └───────────────────────────────────────┘
```

### AFTER FIX ✅

```
┌─────────────────────────────────────────────────────────────────┐
│ Employee A: Apply Leave (May 2-4) with Saman as cover          │
└─────────────────────────────────────────────────────────────────┘
                              ↓
        ┌───────────────────────────────────────┐
        │ Database State AFTER Application      │
        ├───────────────────────────────────────┤
        │ Leave:                                │
        │ • id: leave-123                       │
        │ • status: PENDING_COVER               │
        │ • coverEmployeeId: saman              │
        │                                       │
        │ CoverRequest:                         │
        │ • id: cover-456                       │
        │ • leaveId: leave-123                  │
        │ • status: PENDING                     │
        └───────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ Employee A: Cancel Leave (before Saman approves)               │
└─────────────────────────────────────────────────────────────────┘
                              ↓
        ┌───────────────────────────────────────┐
        │ ✨ NEW: Delete Orphaned Records       │
        │ await prisma.coverRequest.deleteMany()│
        └───────────────────────────────────────┘
                              ↓
        ┌───────────────────────────────────────┐
        │ ✅ FIXED: Database State AFTER CANCEL │
        ├───────────────────────────────────────┤
        │ Leave:                                │
        │ • id: leave-123                       │
        │ • status: CANCELLED ✓                 │
        │ • coverEmployeeId: saman              │
        │                                       │
        │ CoverRequest:                         │
        │ • [DELETED] ✓                         │
        └───────────────────────────────────────┘
                              ↓
        ┌───────────────────────────────────────┐
        │ Notification Sent:                    │
        │ "Leave request cancelled"             │
        │ → Saman informed                      │
        └───────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ Employee B: Apply Leave (May 3-5) - wants Saman as cover      │
└─────────────────────────────────────────────────────────────────┘
                              ↓
        ┌───────────────────────────────────────┐
        │ Query: GET /api/employees/available   │
        │ Finding PENDING cover requests...     │
        ├───────────────────────────────────────┤
        │ SELECT coverEmployeeId                │
        │ FROM CoverRequest                     │
        │ WHERE status = 'PENDING'              │
        │   AND expiresAt > NOW()               │
        │                                       │
        │ Result: (no orphaned record) ✓        │
        └───────────────────────────────────────┘
                              ↓
        ┌───────────────────────────────────────┐
        │ ✅ Saman INCLUDED                     │
        │    (available for selection)          │
        └───────────────────────────────────────┘
                              ↓
        ┌───────────────────────────────────────┐
        │ ✅ SUCCESS:                           │
        │ Saman available in dropdown           │
        │ Employee B can select Saman           │
        └───────────────────────────────────────┘
```

---

## Code Change Visualization

### The Fix Location

```
/src/app/api/leaves/cancel/route.ts
│
├─ Request validation ✓
├─ Authorization check ✓
├─ Status validation ✓
├─ ✨ DELETE orphaned CoverRequest ← NEW FIX
├─ Update Leave status ✓
├─ Send notification ✓
└─ Return response ✓
```

### Code Diff

```diff
    // Only allow cancellation of pending leaves
    if (leave.status !== 'PENDING_COVER' && leave.status !== 'PENDING_ADMIN') {
      return NextResponse.json(
        { error: 'Only pending leave requests can be cancelled' },
        { status: 400 }
      );
    }

+   // Delete the associated cover request (if exists) so the cover employee becomes available again
+   await prisma.coverRequest.deleteMany({
+     where: { leaveId: leaveId },
+   });

    // Update leave status to CANCELLED
    const updatedLeave = await prisma.leave.update({
      where: { id: leaveId },
      data: {
        status: 'CANCELLED',
        isCancelled: true,
      },
    });
```

---

## Data Flow Comparison

### BEFORE: Incorrect Flow ❌

```
User cancels leave
        ↓
Update Leave.status = CANCELLED
        ↓
❌ CoverRequest remains untouched!
        ↓
Next query: WHERE status = 'PENDING'
        ↓
Finds orphaned CoverRequest
        ↓
Employee filtered as "busy"
        ↓
❌ Wrong result!
```

### AFTER: Correct Flow ✅

```
User cancels leave
        ↓
Delete associated CoverRequest ← NEW
        ↓
Update Leave.status = CANCELLED
        ↓
Send notification
        ↓
Next query: WHERE status = 'PENDING'
        ↓
No orphaned CoverRequest found ✓
        ↓
Employee appears as "available"
        ↓
✅ Correct result!
```

---

## Database Cleanup Timeline

### Orphaned Record Lifecycle (BEFORE FIX)

```
t=0:  CoverRequest created (PENDING)
      ├─ expiresAt = now + 24 hours
      └─ Status: PENDING

t=15min: Leave cancelled by user
         ├─ Leave.status → CANCELLED ✓
         └─ CoverRequest.status → PENDING ✗ (orphaned!)

t=30min: Query for available employees
         ├─ Finds PENDING CoverRequest
         ├─ expiresAt not reached yet
         └─ Employee excluded from results ❌

t=24h:   Cron job cleanup might remove it
         (if any cleanup exists)
         
t=∞:     CoverRequest could remain forever ❌
```

### Clean Record Lifecycle (AFTER FIX)

```
t=0:  CoverRequest created (PENDING)
      ├─ expiresAt = now + 24 hours
      └─ Status: PENDING

t=15min: Leave cancelled by user
         ├─ CoverRequest DELETED ✓
         ├─ Leave.status → CANCELLED ✓
         └─ Notification sent ✓

t=30min: Query for available employees
         ├─ No orphaned CoverRequest
         ├─ Database clean
         └─ Employee included in results ✅

t=∞:     No orphaned records ✓
```

---

## State Machine Diagram

### Leave Status States

```
                    ┌─────────────────────┐
                    │ Application Started │
                    └──────────┬──────────┘
                               ↓
                    ┌──────────────────────┐
                    │ PENDING_COVER        │
                    │ (awaiting cover emp) │
                    └──────────┬───────────┘
                    /          |          \
                   /           |           \
                  ↓            ↓            ↓
          (APPROVED) (PENDING_ADMIN)  (CANCELLED) ← NEW: Cleanup CoverRequest!
                |         |                |
                |         ↓                |
                |     (APPROVED/REJECTED)  |
                |         |                |
                └─────────┴────────────────┘
                          ↓
                   (Leave Status Final)
```

---

## Availability Query Logic

### Before Fix - Incorrect Result

```
SELECT employee FROM Employee e
WHERE e.id NOT IN (
  SELECT DISTINCT employeeId 
  FROM Leave 
  WHERE status = 'APPROVED' ← Approved leaves
    AND dates overlap
)
AND e.id NOT IN (
  SELECT DISTINCT coverEmployeeId
  FROM CoverRequest
  WHERE status = 'PENDING' ← ❌ INCLUDES ORPHANED!
    AND dates overlap
    AND expiresAt > NOW()
)
```

### After Fix - Correct Result

```
SELECT employee FROM Employee e
WHERE e.id NOT IN (
  SELECT DISTINCT employeeId 
  FROM Leave 
  WHERE status = 'APPROVED'
    AND dates overlap
)
AND e.id NOT IN (
  SELECT DISTINCT coverEmployeeId
  FROM CoverRequest
  WHERE status = 'PENDING' ← ✓ NO ORPHANED (deleted!)
    AND dates overlap
    AND expiresAt > NOW()
)
```

---

## Summary: The 3-Line Fix

```typescript
// These 3 lines fix the entire issue:
await prisma.coverRequest.deleteMany({
  where: { leaveId: leaveId },
});
```

**Impact**:
- ✅ Removes orphaned records
- ✅ Fixes availability query
- ✅ Enables cover employee reuse
- ✅ Keeps database clean

**Size**: 3 lines  
**Complexity**: Low  
**Risk**: Minimal  
**Benefit**: High  

---

*Visual Guide Created: May 3, 2026*
