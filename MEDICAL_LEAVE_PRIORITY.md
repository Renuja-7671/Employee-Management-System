# Medical Leave Priority Policy

## ⚕️ Critical Business Rule

**Medical leaves are ALWAYS allowed, regardless of covering duty status.**

---

## The Problem

**Original Implementation (Incorrect):**
- Employee B is covering for Employee A
- Employee B falls ill
- System BLOCKS Employee B from applying for medical leave
- **Result:** Sick employee forced to work or lose pay

**This was ethically wrong and practically impossible.**

---

## The Solution

**Updated Implementation (Correct):**
- Employee B is covering for Employee A
- Employee B falls ill
- System ALLOWS Employee B to apply for medical leave
- System automatically triggers covering duty reassignment
- HR assigns Employee C to cover Employee A's work
- **Result:** Sick employee takes needed rest, work still covered

---

## Why This Matters

### Ethical Reasons
1. **Health First:** Employee health is more important than scheduling convenience
2. **Legal Compliance:** Many jurisdictions require medical leave accommodation
3. **Employee Trust:** Blocking medical leave damages morale and trust
4. **Duty of Care:** Employers have duty to care for employee wellbeing

### Practical Reasons
1. **Sick employees cannot work effectively**
2. **Risk of spreading illness to others**
3. **Potential legal liability if forced to work while ill**
4. **Long-term health complications if rest denied**

---

## Implementation Details

### Code Changes

**File:** `src/app/api/leaves/apply/route.ts`

**Lines 196-249:**

```typescript
// Check if the employee has accepted to cover for someone else during the requested leave period
// IMPORTANT: Medical leaves are always allowed even when covering (practical requirement - sick employees cannot work)
const coveringDuties = await prisma.leave.findMany({
  where: {
    coverEmployeeId: userId,
    status: 'APPROVED',
    OR: [
      // ... date range checks
    ],
  },
  include: {
    employee: {
      select: { firstName: true, lastName: true },
    },
  },
});

// Block only non-medical leaves when covering duties
// Medical leaves are ALWAYS allowed (employee cannot work if ill)
if (coveringDuties.length > 0 && leaveTypeUpper !== 'MEDICAL') {
  const coveringFor = coveringDuties.map(
    (duty) => `${duty.employee.firstName} ${duty.employee.lastName} (${new Date(duty.startDate).toLocaleDateString()} - ${new Date(duty.endDate).toLocaleDateString()})`
  ).join(', ');

  return NextResponse.json(
    {
      error: `You cannot apply for ${leaveType} leave during this period because you have accepted to cover duties for: ${coveringFor}. However, you may apply for medical leave if needed.`,
    },
    { status: 400 }
  );
}
```

**Key Change:** Added condition `&& leaveTypeUpper !== 'MEDICAL'`

---

## Leave Type Priority Matrix

| Leave Type | Can Apply When Covering? | Reason |
|------------|--------------------------|--------|
| **Medical** | ✅ YES (Always) | Health emergency, cannot work |
| Annual | ❌ NO | Can be planned around covering duties |
| Casual | ❌ NO | Can be rescheduled |
| Official | ❌ NO | Company business, can be coordinated |

---

## User Experience

### Employee Perspective

**Scenario 1: Applying Medical Leave While Covering**
```
1. Employee B is covering for Employee A (Dec 10-12)
2. Employee B falls ill on Dec 11
3. Employee B applies for medical leave (Dec 11)
4. ✅ Application succeeds
5. Employee B sees: "Leave request submitted successfully"
6. Admin receives notification: "⚠️ Covering Duty Conflict Detected"
7. Admin approves
8. HR Head receives: "🔄 Duty Reassignment Required"
9. HR assigns Employee C to cover Employee A
10. Everyone notified
```

**Scenario 2: Applying Annual Leave While Covering**
```
1. Employee B is covering for Employee A (Dec 10-12)
2. Employee B wants to take annual leave (Dec 11)
3. Employee B applies for annual leave (Dec 11)
4. ❌ Application blocked
5. Employee B sees error: "You cannot apply for annual leave during this period because you have accepted to cover duties for: Employee A (12/10/2024 - 12/12/2024). However, you may apply for medical leave if needed."
6. Employee B understands: Medical emergencies are allowed, but planned leaves are not
```

### Admin Perspective

**When Medical Leave Applied During Covering:**
```
1. Admin receives notification:
   Title: "⚠️ Covering Duty Conflict Detected"
   Message: "Employee B applied for medical leave (Dec 11) but is currently covering for: Employee A (Dec 10-12). If approved, duty reassignment will be required."

2. Admin reviews:
   - Employee B genuinely ill (medical certificate provided if >1 day)
   - Decision: Approve (employee health comes first)

3. HR Head receives notification:
   Title: "🔄 Duty Reassignment Required"
   Message: "Employee B's medical leave has been approved. They were covering for: Employee A (Dec 10-12). Please assign new cover employees."

4. HR Head assigns Employee C
5. All parties notified
6. Work coverage maintained
```

---

## System Behavior Comparison

### ❌ Old System (Incorrect)

```
Employee applies for medical leave while covering
                ↓
        System checks: "Is employee covering?"
                ↓
              YES
                ↓
        ❌ BLOCK APPLICATION
                ↓
  Error: "Cannot apply - you are covering duties"
                ↓
      Employee forced to:
      - Work while ill
      - Cancel covering duty (leaving gap)
      - Not take needed leave
```

### ✅ New System (Correct)

```
Employee applies for medical leave while covering
                ↓
    System checks: "Is this a medical leave?"
                ↓
              YES
                ↓
        ✅ ALLOW APPLICATION
                ↓
   Create covering duty reassignment record
                ↓
      Notify admins about conflict
                ↓
          Admin approves
                ↓
      Notify HR Head for reassignment
                ↓
    HR assigns new cover employee
                ↓
      Work coverage maintained
      Employee gets needed rest
```

---

## Error Messages

### Blocked Leave (Non-Medical)

**Current Error Message:**
```
You cannot apply for annual leave during this period because you have accepted to cover duties for: John Doe (12/10/2024 - 12/12/2024). However, you may apply for medical leave if needed.
```

**Key Elements:**
1. ✅ Clear explanation of why blocked
2. ✅ Shows who they're covering for
3. ✅ Shows date range
4. ✅ **Helpfully informs about medical leave exception**

### Allowed Leave (Medical)

**Success Message:**
```
Leave request submitted successfully. Waiting for cover employee approval.
```

**Admin Notification:**
```
⚠️ Covering Duty Conflict Detected

Employee B applied for medical leave (12/11/2024 - 12/11/2024) but is currently covering for: Employee A (12/10/2024 - 12/12/2024). If approved, duty reassignment will be required.
```

---

## Testing Checklist

- [ ] Medical leave allowed when covering (positive test)
- [ ] Annual leave blocked when covering (negative test)
- [ ] Casual leave blocked when covering (negative test)
- [ ] Official leave blocked when covering (negative test)
- [ ] Error message includes helpful hint about medical leave
- [ ] Admin receives conflict notification for medical leave
- [ ] HR receives reassignment notification after approval
- [ ] Covering duty reassignment record created
- [ ] New cover employee can be assigned
- [ ] All parties receive appropriate notifications

---

## Business Policy Statement

> **Medical Leave Priority Policy:**
>
> Any employee has the right to apply for and take medical leave when genuinely ill, regardless of any prior commitments including covering duties for colleagues.
>
> When a cover employee needs medical leave, the company will make alternative arrangements through the HR department to ensure continuity of work coverage.
>
> Employee health and wellbeing takes priority over scheduling convenience.

---

## Implementation Status

✅ **Code Updated:** Medical leave exception implemented in leave application API
✅ **Documentation Updated:** COVERING_DUTY_CONFLICT_SYSTEM.md updated
✅ **Error Messages:** Helpful messages guide users to medical leave option
✅ **Workflow:** Automatic covering duty reassignment triggered
⏳ **Testing:** Ready for testing after Prisma client regeneration
⏳ **Deployment:** Pending migration and deployment

---

## Summary

This change represents a critical fix that aligns the system with both ethical standards and practical reality. Medical emergencies cannot be scheduled or blocked, and the system now correctly reflects this principle while maintaining work coverage through an automated reassignment workflow.

**Key Takeaway:** Health comes first, coverage is handled through process.

---

**Implementation Date:** December 8, 2024
**Priority:** CRITICAL
**Category:** Business Logic Fix
**Impact:** High - Affects employee welfare and system ethics
