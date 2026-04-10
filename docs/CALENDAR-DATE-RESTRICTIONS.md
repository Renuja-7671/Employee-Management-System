# Calendar Date Restrictions - New Implementation

## Overview
The calendar for leave applications has been updated with a new month-based logic that allows employees to apply for leaves within a flexible sliding window:

- **Open from:** 1st of current month (or 1st of previous month if we're in days 1-3 of current month)
- **Open until:** 3rd day of the month after next month
- **Dynamic behavior:** The window automatically shifts once we're 4 days into the month

## Calendar Logic Explained

### How It Works

The calendar operates on a **month-aware rolling window** that resets dynamically:

#### **Days 1-3 of Any Month**
- Calendar opens from **1st of PREVIOUS month**
- Calendar closes on **3rd of NEXT month (2 months ahead)**
- **Example (March 1-3):** March 1 → April 3
- **Example (April 1-3):** April 1 → May 3
- **Previous month is still accessible** for backdating leaves

#### **From 4th Onwards of Any Month**
- Calendar opens from **1st of CURRENT month**
- Calendar closes on **3rd of NEXT month (2 months ahead)**
- **Example (March 4-31):** March 1 → April 3
- **Example (April 4-30):** April 1 → May 3
- **Previous month becomes inaccessible**

### Examples

#### Scenario 1: March 30, 2026 (Days 1-3 Logic)
```
Current Month: March
Position in Month: 30th day (≥ 4)
Calendar Window: March 1 - May 3
- Can apply from March 1 onwards
- Previous month (February) is BLOCKED
```

#### Scenario 2: April 1, 2026 (Days 1-3 Logic)
```
Current Month: April
Position in Month: 1st day (< 4)
Calendar Window: March 1 - May 3
- Can still apply from March 1
- Previous month (March) is still ACCESSIBLE
```

#### Scenario 3: April 3, 2026 (Days 1-3 Logic)
```
Current Month: April
Position in Month: 3rd day (< 4)
Calendar Window: March 1 - May 3
- Can still apply from March 1
- Previous month (March) is still ACCESSIBLE
```

#### Scenario 4: April 4, 2026 (≥ 4th Logic)
```
Current Month: April
Position in Month: 4th day (≥ 4)
Calendar Window: April 1 - June 3
- Cannot apply from March anymore
- Previous month (March) is now BLOCKED
- Can apply from April 1 onwards
```

## Implementation Details

### Frontend (`/src/components/employee/ApplyLeave.tsx`)

```typescript
const getDateRestrictions = () => {
  const today = new Date();
  const currentDay = today.getDate();
  const currentMonth = today.getMonth();
  const currentYear = today.getFullYear();

  // Determine the start date (1st of current or previous month)
  let minDate = new Date(currentYear, currentMonth, 1);
  
  // If we're on the 4th day or later, block previous month
  if (currentDay >= 4) {
    minDate = new Date(currentYear, currentMonth, 1);
  } else {
    // Days 1-3: allow previous month
    minDate = new Date(currentYear, currentMonth - 1, 1);
  }

  // Max date: 3 days into the month after next
  const maxDate = new Date(currentYear, currentMonth + 2, 3);

  return {
    min: minDate.toISOString().split('T')[0],
    max: maxDate.toISOString().split('T')[0],
  };
};
```

**Changes:**
- ✅ Removed all leave-type-specific date restrictions
- ✅ Implemented unified month-based calendar logic
- ✅ Works for ALL leave types (Annual, Casual, Medical, Official)
- ✅ No max date limit - employees can plan months ahead

### Backend (`/src/app/api/leaves/apply/route.ts`)

```typescript
// Validate leave date range based on month-based calendar logic
const today = new Date();
today.setHours(0, 0, 0, 0);
const currentDay = today.getDate();
const currentMonth = today.getMonth();
const currentYear = today.getFullYear();

// Determine the min date based on current day
let minDate: Date;
if (currentDay >= 4) {
  minDate = new Date(currentYear, currentMonth, 1);
} else {
  minDate = new Date(currentYear, currentMonth - 1, 1);
}

// Max date: 3 days into the month after next
const maxDate = new Date(currentYear, currentMonth + 2, 3);

if (start < minDate || start > maxDate) {
  const minDateStr = minDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  const maxDateStr = maxDate.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  return NextResponse.json(
    { error: `Leave can only be applied for dates between ${minDateStr} and ${maxDateStr}` },
    { status: 400 }
  );
}
```

**Changes:**
- ✅ Removed leave-type-specific validations (CASUAL, ANNUAL, MEDICAL, OFFICIAL date range checks)
- ✅ Applied unified month-based logic for all leave types
- ✅ Kept leave-type-specific constraints (e.g., casual max 1 day, annual max 7 days)
- ✅ Better error messages showing exact date range

## Leave Type Constraints (Still Applied)

| Leave Type | Max Days | Notes |
|-----------|----------|-------|
| **Annual** | 7 days | Maximum consecutive days per request |
| **Casual** | 1 day (or 0.5) | Only half-day or full day |
| **Medical** | 3 days | Only 0.5, 1, 1.5, 2, 2.5, or 3 days |
| **Official** | 3 days | Maximum consecutive days |

## Date Range Calculations

### Current Date Function
```
today = Current date (e.g., April 10, 2026)
currentDay = today.getDate() = 10
currentMonth = today.getMonth() = 3 (April, 0-indexed)
currentYear = today.getFullYear() = 2026
```

### Condition Logic
```
If currentDay >= 4:
  minDate = Date(currentYear, currentMonth, 1)  // 1st of current month
Else:
  minDate = Date(currentYear, currentMonth - 1, 1)  // 1st of previous month
```

### Max Date Calculation
```
monthAfterNext = currentMonth + 2  // Skip next month, go to month after
maxDate = Date(currentYear, monthAfterNext, 3)  // 3rd day of that month
```

## Testing Scenarios

### Test 1: March 30, 2026
```
Day: 30 (≥ 4)
Min: March 1, 2026
Max: May 3, 2026
✅ Can apply for dates from March 1-2026 to May 3, 2026
```

### Test 2: April 1, 2026
```
Day: 1 (< 4)
Min: March 1, 2026
Max: May 3, 2026
✅ Previous month March is still accessible
✅ Can apply from March 1 onwards
```

### Test 3: April 4, 2026
```
Day: 4 (≥ 4)
Min: April 1, 2026
Max: June 3, 2026
❌ March is now blocked
✅ Can only apply from April 1 onwards
```

### Test 4: May 2, 2026
```
Day: 2 (< 4)
Min: April 1, 2026
Max: June 3, 2026
✅ April is still accessible
```

## User Experience Impact

1. **Flexible Planning:** Employees can apply for leaves up to 2 months in advance
2. **Month-aware System:** Calendar automatically locks previous month on 4th
3. **Clear Window:** Employees always see a consistent 2-month+ planning window
4. **Simplified UX:** No more "why can't I apply for this date" confusion
5. **Consistent:** Same logic applies to ALL leave types

## Backward Compatibility

This change affects:
- ✅ Frontend date picker constraints
- ✅ Backend API validation
- ✅ All leave types (Annual, Casual, Medical, Official)

No database migrations needed - this is purely a business logic change.

## Support

For any issues or clarifications, please refer to:
- Frontend Logic: `/src/components/employee/ApplyLeave.tsx` line 186
- Backend Logic: `/src/app/api/leaves/apply/route.ts` line 348
