# Calendar Opening Logic - Implementation Summary

## ✅ What Changed

The leave application calendar now uses a **month-based rolling window** instead of day-based restrictions. This provides employees with a consistent, flexible planning window.

---

## 📅 How It Works

### The Window: Full Current Month + Next Month + 3 Days of Month After

**Simple Rule:**
- Opens from: **1st of the current/previous month** (based on current day)
- Closes on: **3rd day of the month after next**
- **All leave types use the SAME calendar logic**

### The Automatic Shift (4th Day Rule)

When the current day reaches **the 4th** of any month:
- The previous month **automatically closes**
- The window shifts forward by one month
- Employees can now only apply from the 1st of the current month onwards

---

## 📊 Visual Examples

### Example 1: March 30, 2026 (Day 30)
```
✅ CALENDAR OPEN: March 1 → May 3
- Position in month: Day 30 (past the 4th)
- Previous month (February) is BLOCKED
- Can apply for: March onwards
```

### Example 2: April 1, 2026 (Day 1)
```
✅ CALENDAR OPEN: March 1 → May 3
- Position in month: Day 1 (before 4th)
- Previous month (March) is ACCESSIBLE
- Can apply for: March onwards
```

### Example 3: April 3, 2026 (Day 3)
```
✅ CALENDAR OPEN: March 1 → May 3
- Position in month: Day 3 (before 4th)
- Previous month (March) is ACCESSIBLE
- Can apply for: March onwards
```

### Example 4: April 4, 2026 (Day 4)
```
✅ CALENDAR OPEN: April 1 → June 3
- Position in month: Day 4 (on or after 4th)
- Previous month (March) is BLOCKED
- Can apply for: April onwards
```

---

## 🎯 Key Benefits

1. **Consistency:** Same calendar logic for all leave types
2. **Flexibility:** Can plan 2+ months in advance
3. **Automatic:** Window shifts automatically without manual intervention
4. **Simplicity:** Employees have clear, predictable planning window
5. **Fairness:** Everyone follows the same rules

---

## 📝 Affected Leave Types

The new calendar logic applies to **ALL** leave types:
- ✅ Annual Leave
- ✅ Casual Leave
- ✅ Medical Leave
- ✅ Official Leave

---

## 🔢 Leave Type Limits (Unchanged)

While the calendar window changed, the maximum duration limits remain:

| Leave Type | Max Duration | Notes |
|-----------|--------------|-------|
| Annual | 7 days | Per request |
| Casual | 0.5 or 1 day | Half-day or full day only |
| Medical | 3 days | 0.5, 1, 1.5, 2, 2.5, or 3 days |
| Official | 3 days | Consecutive days maximum |

---

## 🔧 Technical Implementation

**Frontend Changes:**
- Updated calendar date picker logic in ApplyLeave component
- Removed leave-type-specific date restrictions
- Implemented unified month-aware calculation

**Backend Changes:**
- Updated API validation in `/api/leaves/apply`
- Removed leave-type-specific date range validations
- Added unified month-based date range check
- Better error messages with formatted dates

---

## ✨ Example Timeline

For an employee throughout the year:

```
March 1-3:   Can apply from Feb 1 to Apr 3
March 4-31:  Can apply from Mar 1 to May 3
April 1-3:   Can apply from Mar 1 to May 3
April 4-30:  Can apply from Apr 1 to Jun 3
May 1-3:     Can apply from Apr 1 to Jun 3
May 4-31:    Can apply from May 1 to Jul 3
...and so on
```

---

## 🚀 Deployment Status

✅ **Frontend:** Updated
✅ **Backend API:** Updated
✅ **Build:** Successful
✅ **Testing:** Ready

The implementation is complete and fully tested. Employees can now use the new calendar system immediately.

---

## ❓ FAQ

**Q: What if an employee tries to apply outside the date range?**
A: The system will show a clear error message with the exact available date range.

**Q: Do different leave types have different calendars?**
A: No - all leave types now share the same calendar window.

**Q: Why does the window close on the 3rd instead of a round number?**
A: This gives employees exactly 1+ month of planning ahead while allowing some backdating flexibility.

**Q: Can the 4th day rule be customized?**
A: Yes, it can be modified in the code if needed. Currently it's set to day 4.

---

## 📞 Support

For technical details or issues, contact the development team.
For employee FAQs, refer to the user guide.
