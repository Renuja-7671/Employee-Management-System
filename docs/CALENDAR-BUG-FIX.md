# Calendar Date Bug Fix - April 19, 2026

## 🐛 Issue Found

When today is **April 19, 2026**, the last day of the previous month (March 31) was still showing as **accessible** for leave applications, but it should have been **BLOCKED** according to the calendar logic.

---

## 🔍 Root Cause

**Timezone Offset Problem** in date formatting:

```javascript
// ❌ WRONG - Using toISOString() caused timezone offset issues
const minDate = new Date(currentYear, currentMonth, 1);
return {
  min: minDate.toISOString().split('T')[0],  // Output: "2026-03-31" instead of "2026-04-01"
};
```

When `new Date(2026, 3, 1)` was converted using `toISOString()`, the timezone offset shifted the date back by a day, showing March 31st instead of April 1st.

---

## ✅ Solution Applied

**Proper Date Formatting** without timezone issues:

### Frontend Fix (`ApplyLeave.tsx`)

```typescript
const formatDate = (year: number, month: number, day: number) => {
  const d = new Date(year, month, day);
  const month_pad = String(d.getMonth() + 1).padStart(2, '0');
  const day_pad = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${month_pad}-${day_pad}`;
};

return {
  min: formatDate(minYear, minMonth, 1),  // ✅ Returns "2026-04-01"
  max: formatDate(maxYear, maxMonth, 3),  // ✅ Returns "2026-06-03"
};
```

### Backend Fix (`leaves/apply/route.ts`)

```typescript
// Create date objects with proper time boundaries
const minDate = new Date(minYear, minMonth, 1);
minDate.setHours(0, 0, 0, 0);

const maxDate = new Date(maxYear, maxMonth, 3);
maxDate.setHours(23, 59, 59, 999);

// Compare dates directly (no timezone issues)
if (start < minDate || start > maxDate) {
  // Show error with proper formatting
}
```

---

## 🎯 Test Results - Today: April 19, 2026

| Date | Expected | Result | Status |
|------|----------|--------|--------|
| March 31, 2026 | ❌ BLOCKED | ❌ BLOCKED | ✅ CORRECT |
| April 1, 2026 | ✅ ALLOWED | ✅ ALLOWED | ✅ CORRECT |
| April 19, 2026 | ✅ ALLOWED | ✅ ALLOWED | ✅ CORRECT |
| June 3, 2026 | ✅ ALLOWED | ✅ ALLOWED | ✅ CORRECT |
| June 4, 2026 | ❌ BLOCKED | ❌ BLOCKED | ✅ CORRECT |

---

## 📋 Calendar Range - April 19, 2026

```
✅ CALENDAR OPEN: April 1, 2026 → June 3, 2026
- Current day: 19 (>= 4, so previous month BLOCKED)
- Previous month (March) dates: ❌ BLOCKED
- Current month (April) dates: ✅ ALLOWED
- Next month (May) dates: ✅ ALLOWED
- Month after next (June): ✅ ALLOWED up to 3rd only
```

---

## 📝 Files Modified

1. **`/src/components/employee/ApplyLeave.tsx`** (Lines 185-225)
   - Fixed `getDateRestrictions()` function
   - Implemented proper date formatting without timezone issues

2. **`/src/app/api/leaves/apply/route.ts`** (Lines 348-388)
   - Fixed date range validation logic
   - Improved date comparison with proper time boundaries

---

## ✨ Build Status

✅ **Build Successful** - All routes compiled without errors
- 71 static pages generated
- 0 compilation errors
- Ready for deployment

---

## 🔑 Key Takeaway

Always avoid `toISOString()` for date formatting when dealing with timezone-sensitive date calculations. Use explicit string formatting instead to ensure consistent behavior across all timezones.
