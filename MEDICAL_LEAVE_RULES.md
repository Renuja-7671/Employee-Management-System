# Medical Leave Rules - Implementation Summary

## Overview

The medical leave system has been updated with specific rules and restrictions as per company policy.

---

## Medical Leave Allocation

- **Total per year:** 7 days
- **Balance tracking:** Displayed with 0.5 day precision (supports half days)
- **Carryover:** No (resets each year)

---

## Allowed Leave Durations

Medical leave can **ONLY** be applied for the following durations:

- **0.5 day** (Half day)
- **1 day**
- **1.5 days**
- **2 days**
- **2.5 days**
- **3 days**

Any other duration will be **rejected** by the system.

---

## Medical Certificate Requirements

### Certificate NOT Required:
- **0.5 day** (Half day) medical leave
- **1 day** medical leave

### Certificate REQUIRED:
- **1.5 days** or more
- **2 days** or more
- **2.5 days** or more
- **3 days**

**Rule:** Medical certificate is mandatory for any medical leave **exceeding 1 day**.

---

## Application Restrictions

### Date Range
- Can apply for dates **4 days before today** or any future date
- Example: If today is December 8th, you can apply for dates from December 4th onwards

### Maximum Duration Per Request
- **Maximum:** 3 continuous days per request
- For longer medical leaves, multiple requests must be submitted

---

## User Interface

### Leave Balance Display
The medical leave balance is shown in the "Your Leave Balance" section:
```
Medical Leave
     7
days remaining
```

### Leave Application Form

1. **Leave Type Selection:**
   - Select "Medical Leave" from dropdown
   - Help text shows: "Medical leave: 0.5, 1, 1.5, 2, 2.5, or 3 days only. Certificate required if more than 1 day."

2. **Number of Days Selection:**
   - Dropdown with only allowed values:
     - 0.5 day (Half day) - No certificate needed
     - 1 day - No certificate needed
     - 1.5 days - Certificate required
     - 2 days - Certificate required
     - 2.5 days - Certificate required
     - 3 days - Certificate required

3. **Medical Certificate Upload:**
   - **Shows only if** selected days > 1
   - Required field for 1.5+ days
   - Accepts: .pdf, .jpg, .jpeg, .png
   - Helpful message: "Medical certificate is required for leave exceeding 1 day"

4. **No Certificate Confirmation:**
   - **Shows only if** selected days ≤ 1
   - Green info box: "✓ No medical certificate required for [half day/1 day] medical leave"

---

## Validation Rules

### Frontend Validation (UI)
1. Medical leave balance check
2. Allowed days validation (0.5, 1, 1.5, 2, 2.5, 3 only)
3. Medical certificate required check (if > 1 day)
4. Date range validation (4 days before to future)

### Backend Validation (API)
1. **Balance check:** Ensures sufficient medical leave balance
2. **Allowed days:** Validates against allowed values array `[0.5, 1, 1.5, 2, 2.5, 3]`
3. **Certificate requirement:** Enforces certificate upload for leaves > 1 day
4. **Date range:** Validates application is within allowed date range

---

## Balance Deduction

### When Leave is Approved
- Medical leave days are **deducted** from the balance
- Deduction happens for the year when the leave is taken
- Balance can include decimals (e.g., 6.5 days remaining)

### Example
- Start balance: 7 days
- Apply 0.5 day medical leave → Approved
- New balance: 6.5 days
- Apply 2 days medical leave → Approved
- Final balance: 4.5 days

---

## Database Schema Changes

### LeaveBalance Model
```prisma
model LeaveBalance {
  annual      Float    @default(14)   // Changed from Int
  casual      Float    @default(7)    // Changed from Int
  medical     Float    @default(7)    // Changed from Int to Float, default 0 → 7
  official    Float    @default(0)    // Changed from Int
}
```

### Leave Model
```prisma
model Leave {
  totalDays   Float    // Changed from Int to support 0.5, 1.5, 2.5
}
```

---

## Migration

A database migration file has been created:
- **File:** `prisma/migrations/20251208_add_medical_leave_support/migration.sql`
- **Changes:**
  - Converts all leave balance fields to `DOUBLE PRECISION` (Float)
  - Sets medical leave default to 7
  - Converts Leave.totalDays to `DOUBLE PRECISION`

**To apply:**
```bash
npx prisma migrate deploy
```

Or the migration will be applied automatically on next deployment.

---

## API Endpoints Updated

### 1. `/api/leaves/apply` (POST)
- Added medical leave balance validation
- Added allowed days validation (0.5, 1, 1.5, 2, 2.5, 3)
- Updated certificate requirement (only if > 1 day)
- Default medical balance set to 7

### 2. `/api/leaves/balance` (GET)
- Returns medical leave balance (Float)
- Default medical balance: 7 days

### 3. `/api/leaves/[id]/approve` (POST)
- Deducts medical leave from balance when approved
- Supports decimal deductions (0.5, 1.5, 2.5)

---

## Testing Checklist

### Test Medical Leave Application

1. **Test 0.5 day leave:**
   - ✅ Can apply without certificate
   - ✅ Balance deducted by 0.5
   - ✅ Shows "No certificate required" message

2. **Test 1 day leave:**
   - ✅ Can apply without certificate
   - ✅ Balance deducted by 1
   - ✅ Shows "No certificate required" message

3. **Test 1.5 day leave:**
   - ✅ Certificate field appears
   - ✅ Cannot submit without certificate
   - ✅ Balance deducted by 1.5

4. **Test 2-3 day leaves:**
   - ✅ Certificate required
   - ✅ Correct balance deduction

5. **Test invalid durations:**
   - ✅ Cannot select 4 days
   - ✅ Cannot select 0.75 days
   - ✅ Cannot select 2.25 days

6. **Test balance limits:**
   - ✅ Cannot apply for more days than available
   - ✅ Error shown: "Insufficient medical leave balance"

---

## Summary

### Key Features Implemented
✅ Medical leave: 7 days per year
✅ Allowed durations: 0.5, 1, 1.5, 2, 2.5, 3 days only
✅ Certificate required only if > 1 day
✅ Balance shown with 0.5 day precision
✅ Proper validation on both frontend and backend
✅ Database schema updated to support Float values
✅ Leave approval deducts from medical balance

### Benefits
- Clear rules prevent confusion
- Automated validation reduces errors
- Certificate requirement clearly communicated
- Balance tracking with half-day precision
- Maintains medical leave limits per company policy

---

## Next Steps (Optional Future Enhancements)

1. **Medical Leave Calendar:** Visual calendar showing medical leave history
2. **Certificate Verification:** Admin ability to verify uploaded certificates
3. **Leave Patterns:** Analytics on medical leave usage patterns
4. **Reminders:** Notify employees when medical leave balance is low
5. **Annual Reset:** Automated job to reset medical leave to 7 at year start
