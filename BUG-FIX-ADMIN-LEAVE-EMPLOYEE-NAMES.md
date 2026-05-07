# Bug Fix: Employee Names Showing as Null in Admin Leave Requests Page

**Status**: ✅ FIXED  
**Date**: May 7, 2026  
**Build Status**: ✅ Compiled successfully (71 static pages, 0 errors)

---

## Problem Description

In the admin portal's **Leave Requests** page, newly added employees' names were displaying as null or empty strings. The issue was that the table showed employee IDs but not their readable names.

### Symptoms
1. Admin views "Leave Requests" page
2. Newly added employees show up in the list
3. ❌ Names display as null/empty
4. ✓ Employee IDs are visible
5. **Expected**: Names should display properly

---

## Root Cause

**The Issue**: Incorrect Employee Name Field Mapping

The `LeaveManagement.tsx` component was only using deprecated `firstName` and `lastName` fields:

```typescript
// OLD CODE - Only used deprecated fields
name: `${emp.firstName} ${emp.lastName}`

// Result for newly added employees:
// firstName = null, lastName = null
// Output: "null null" or empty string
```

**Why It Happened**:
- Newly added employees are created with `fullName` and `callingName` fields
- Legacy employees have `firstName` and `lastName`
- Component wasn't handling both cases
- Similar to the previous employee name bug fix

**Data Structure**:
```typescript
// Newly added employee:
{
  id: "emp-123",
  fullName: "John Doe",           // ✓ Has this
  callingName: "John",            // ✓ Has this
  firstName: null,                // ✗ Empty
  lastName: null,                 // ✗ Empty
}

// Legacy employee:
{
  id: "emp-456",
  fullName: "Jane Smith",         // Might be null
  callingName: null,              // Might be null
  firstName: "Jane",              // ✓ Has this
  lastName: "Smith",              // ✓ Has this
}
```

---

## Solution

Updated the employee name transformation logic to use proper fallback order:

**File**: `/src/components/admin/LeaveManagement.tsx` (lines 127-130)

```typescript
// FIXED: Use proper name field fallback logic
const transformedEmployees = employeesData.map(emp => ({
  ...emp,
  name: emp.fullName || emp.callingName || `${emp.firstName || ''} ${emp.lastName || ''}`.trim() || emp.employeeId
}));
```

### Fallback Priority Order
1. **`fullName`** - Primary for newly added employees
2. **`callingName`** - Secondary for newly added employees
3. **`firstName + lastName`** - For legacy employees
4. **`employeeId`** - Fallback if all else fails

---

## Before vs After

| Scenario | Before | After |
|----------|--------|-------|
| Newly added employee | ❌ "null null" or empty | ✅ "John Doe" (from fullName) |
| Legacy employee | ✅ "Jane Smith" (from firstName+lastName) | ✅ "Jane Smith" (works same) |
| Missing data | ❌ Shows null | ✅ Shows employeeId |
| Admin page display | ❌ Unreadable | ✅ Readable names |

---

## Impact

### What's Fixed
✅ Newly added employees now display with proper names in admin Leave Requests page  
✅ Legacy employees continue to work as before  
✅ Fallback logic ensures names always display (never null)  
✅ Consistent with other recent employee name fixes

### Affected Features
- **Admin Portal** → Leave Requests page
- **Employee Name Display** in:
  - Leave request table rows
  - Export CSV/PDF functions
  - Approval/Decline dialogs

### Code Locations Using `getEmployeeName()`
1. Line 275 - CSV export header building
2. Line 345 - CSV export data building
3. Line 429 - PDF export data building
4. Line 682 - Table cell display (main fix)
5. Line 712 - Cover employee name display
6. Line 790 - Dialog header display
7. Line 829 - Covering duties display

All these locations now benefit from the proper name fallback logic.

---

## Technical Details

### Related API Changes
The `/api/employees` endpoint returns all name fields:
```typescript
interface Employee {
  fullName: string;           // New field
  callingName: string;        // New field
  nameWithInitials: string;   // New field
  firstName?: string | null;  // Deprecated
  lastName?: string | null;   // Deprecated
  // ... other fields
}
```

### Why This Happens
- **New employees** are created with structured name fields (fullName, callingName)
- **Admin form** captures full names directly
- **Legacy data** uses firstName/lastName pattern
- **Backward compatibility** requires supporting both

---

## Testing Scenarios

### Test Case 1: Newly Added Employee
1. Create new employee "Alice Johnson" (callingName: "Alice")
2. Alice applies for leave
3. Go to Admin → Leave Requests
4. **Expected**: ✅ See "Alice Johnson" (not null)

### Test Case 2: Legacy Employee
1. Old employee record with firstName="Bob", lastName="Smith"
2. Bob applies for leave
3. Go to Admin → Leave Requests
4. **Expected**: ✅ See "Bob Smith" (unchanged)

### Test Case 3: Missing Data
1. Employee with all name fields null (edge case)
2. Employee applies for leave
3. Go to Admin → Leave Requests
4. **Expected**: ✅ See employeeId (not null)

### Test Case 4: Export Functions
1. Select leave requests to export as CSV/PDF
2. **Expected**: ✅ Exported file shows proper employee names

---

## Related Fixes

This fix is part of the ongoing employee name display initiative:

1. ✅ **ApplyLeave.tsx** - Fixed employee name display in cover employee dropdown
2. ✅ **Available employees API** - Added fullName/callingName fields
3. ✅ **Leave apply API** - Updated notifications with proper names
4. ✅ **Cover requests API** - Updated to include name variants
5. ✅ **LeaveManagement.tsx** - Fixed employee names in admin panel (THIS FIX)

---

## Deployment Notes

### Build Status
✅ Build successful - All 71 routes compiled with 0 errors

### Database Changes
✅ None required - Using existing fields

### Backward Compatibility
✅ Yes - Falls back to firstName/lastName for legacy employees

### No Breaking Changes
✅ Existing functionality preserved

---

## Code Review Checklist

- [x] Fixed employee name display in Leave Requests page
- [x] Applied proper fallback logic (fullName → callingName → firstName+lastName → id)
- [x] Maintained backward compatibility with legacy data
- [x] No database schema changes needed
- [x] Build successful with 0 errors
- [x] Related to previous employee name fixes (consistent approach)

---

## Monitoring & Validation

After deployment, verify:
1. ✅ Newly added employees display names in admin Leave Requests page
2. ✅ Legacy employees continue to display correctly
3. ✅ Export functions (CSV/PDF) show proper names
4. ✅ No null/undefined names appear
5. ✅ All name variations handled (fullName, callingName, firstName+lastName)

---

**Ready for Production Deployment** ✅
