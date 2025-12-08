# HR Head - Duty Reassignment Guide

## Overview

As HR Head, you are responsible for reassigning covering duties when a cover employee needs to take leave. This guide explains how to use the Duty Reassignment portal.

---

## Accessing the Portal

1. Log in as HR Head
2. Navigate to **Admin Portal**
3. Click on the **"Duty Reassignment"** tab in the navigation bar

---

## When Do You Get Notified?

You receive a notification when:

1. **Covering Duty Conflict** occurs:
   - Employee B is covering for Employee A
   - Employee B applies for leave (especially medical leave)
   - Admin approves Employee B's leave

2. **Notification Details:**
   - **Title:** "🔄 Duty Reassignment Required"
   - **Type:** Pinned notification (high priority)
   - **Action:** You must assign a new cover employee

---

## How to Reassign Covering Duty

### Step 1: Open the Reassignment Portal

Click on **"Duty Reassignment"** in the admin navigation. You'll see:

- **Pending Reassignments Count** - Number of pending tasks
- **Medical Leaves Count** - Priority cases
- **List of all pending reassignments**

### Step 2: Review the Situation

Each reassignment card shows:

#### Situation Summary
- Who was the original cover employee (Employee B)
- Who they were covering for (Employee A)
- What type of leave they took

#### Original Leave (Needs Cover)
- Employee name and ID
- Leave type and duration
- Date range
- Total days

#### Cover Employee Leave
- Cover employee name
- Leave type (often MEDICAL - priority)
- Date range
- Status: "Cannot fulfill covering duty"

### Step 3: View Available Employees

Click **"View Available Employees"** button

The system shows:
- **Available employees** (sorted by workload - least busy first)
- **Employees on leave** (marked in red - unavailable)
- **Current workload** for each employee (number of covering duties)

#### Employee Selection Criteria (Automatic)

The system automatically calculates:
1. **Availability:** Not on leave during the period
2. **Workload Score:** Lower = less busy
3. **Sorting:** Available first, then by workload

### Step 4: Select New Cover Employee

1. Open the dropdown: "Select New Cover Employee"
2. Choose an employee from the list
3. Consider:
   - Employees marked "On Leave" are disabled (cannot select)
   - Choose employees with lower workload when possible
   - Department compatibility (if relevant)

### Step 5: Assign the Duty

1. Click **"Assign Cover Employee"** button
2. System validates the selection
3. If successful:
   - ✅ Original leave updated with new cover employee
   - ✅ Reassignment record marked as complete
   - ✅ All parties notified:
     - New cover employee (Employee C)
     - Original employee (Employee A)
     - Managing Director

---

## Understanding the Dashboard

### Stats Cards

1. **Pending Reassignments**
   - Shows total count
   - "Requires immediate action"

2. **Medical Leaves**
   - Count of medical leave conflicts
   - These are priority cases

3. **Avg Response Time**
   - Average time to complete reassignments
   - Helps track performance

### Reassignment Card Colors

- **Orange background:** Pending reassignment
- **Orange border:** Action required
- **Red badge:** Medical leave (priority)
- **Green stats:** Available employees
- **Red stats:** Employees on leave

---

## Example Scenario

### Scenario:
1. **Dec 10-12:** John Doe applies for annual leave
2. **Accepted by:** Jane Smith agrees to cover
3. **Dec 8:** Admin approves John's leave
4. **Dec 11:** Jane falls ill, applies for medical leave
5. **Dec 11:** Admin approves Jane's medical leave

### Your Action Required:
1. **You receive notification:** "Duty Reassignment Required"
2. **Open portal:** See Jane's reassignment in pending list
3. **Review situation:**
   - Original: John's annual leave (Dec 10-12)
   - Problem: Jane on medical leave (Dec 11)
4. **View available employees:**
   - Bob Wilson (Workload: 0) ✅ Best choice
   - Alice Brown (Workload: 2)
   - Tom Davis (On Leave) ❌ Cannot select
5. **Assign Bob Wilson** to cover John's leave
6. **Done:** All parties notified automatically

---

## Important Notes

### Medical Leave Priority

⚕️ **CRITICAL:** Medical leaves are always approved, even when covering.

**Why?**
- Sick employees cannot work
- Health comes first
- Ethical and legal requirement

**Your role:**
- Ensure work coverage through reassignment
- Act quickly for medical leave cases
- Prioritize based on urgency

### Response Time

- **Medical Leaves:** Reassign within 2-4 hours
- **Other Leaves:** Reassign within 24 hours
- **Early reassignment:** Better for all parties

### Communication

The system handles all notifications automatically:

**New Cover Employee (Employee C) receives:**
- Notification: "Cover Duty Assigned"
- Details of the covering period
- Who they're covering for

**Original Employee (Employee A) receives:**
- Notification: "Cover Employee Updated"
- New cover employee name

**Managing Director receives:**
- Notification: "Cover Duty Reassigned"
- Full details of the reassignment

You don't need to send manual emails or messages!

---

## Troubleshooting

### Issue: No Available Employees

**Symptoms:**
- All employees show "On Leave"
- No one with low workload

**Solutions:**
1. Check date range - might be during holiday period
2. Consider adjusting original leave dates (if possible)
3. Assign to employee with lowest workload
4. Contact Managing Director for guidance

### Issue: Cannot Assign Employee

**Error:** "Employee is on leave during this period"

**Cause:** Selected employee has approved leave overlapping the period

**Solution:**
1. Refresh the page to get latest data
2. Select a different employee
3. Double-check the date ranges

### Issue: Reassignment Not Showing

**Symptoms:**
- Received notification but no reassignment in portal

**Solutions:**
1. Refresh the page
2. Check you're logged in as HR Head
3. Check notification details for reassignment ID
4. Contact IT support if persists

---

## Best Practices

### 1. Act Quickly
- Check portal daily
- Prioritize medical leave conflicts
- Reassign within reasonable timeframe

### 2. Fair Distribution
- Avoid overloading same employees
- Use workload score as guide
- Consider department and role compatibility

### 3. Communication
- System handles automatic notifications
- For complex situations, follow up manually
- Keep Managing Director informed

### 4. Record Keeping
- All reassignments are automatically logged
- Audit trail maintained in database
- Can be reviewed later if needed

---

## System Features

### Automatic

✅ Conflict detection
✅ Admin notifications
✅ Employee availability calculation
✅ Workload scoring
✅ Notification to all parties
✅ Audit trail

### Manual (Your Actions)

⚠️ Review the situation
⚠️ Select appropriate employee
⚠️ Click "Assign" button
⚠️ Verify success

---

## FAQ

**Q: What if I assign the wrong employee by mistake?**
A: Contact IT support immediately. They can update the database directly. In future, a new reassignment feature may allow changes.

**Q: Can the system suggest the best employee?**
A: Yes! Employees are sorted by availability and workload. The top available employee is usually the best choice.

**Q: What if someone declines to cover?**
A: Currently, you assign directly without acceptance. Consider adding an acceptance workflow in future updates.

**Q: How do I know if reassignment was successful?**
A: You'll see a success toast message, and the reassignment disappears from pending list.

**Q: Can I reassign multiple duties at once?**
A: Currently one at a time. Bulk reassignment may be added in future.

**Q: What happens if I don't reassign?**
A: The original employee's leave will have no cover, creating a work coverage gap. This should be avoided.

---

## Portal Navigation

### Main Sections

1. **Dashboard Stats**
   - Quick overview of pending tasks
   - Priority indicators

2. **Reassignment List**
   - All pending reassignments
   - Expandable cards with full details

3. **Assignment Interface**
   - Employee selection dropdown
   - Availability stats
   - Assign button

### Actions Available

- View pending reassignments
- View available employees for specific period
- Assign new cover employee
- Refresh data

---

## Success Indicators

After assigning, you should see:

1. ✅ Toast message: "Cover duty reassigned successfully"
2. ✅ Reassignment removed from pending list
3. ✅ Pending count decreased by 1
4. ✅ Notifications sent to all parties (automatic)

---

## Support

**For technical issues:**
- Contact: IT Support
- Email: [it@company.com]

**For policy questions:**
- Contact: Managing Director
- Review: Leave Policy Documentation

**For this portal:**
- Documentation: `/HR_DUTY_REASSIGNMENT_GUIDE.md`
- Technical docs: `/COVERING_DUTY_CONFLICT_SYSTEM.md`

---

## Summary

As HR Head, your responsibility is to:

1. ✅ Monitor duty reassignment notifications
2. ✅ Review conflict situations
3. ✅ Select appropriate cover employees
4. ✅ Complete reassignments promptly
5. ✅ Prioritize medical leave cases

The system handles:
- Conflict detection
- Notifications
- Employee availability calculation
- Communication to all parties
- Audit trail

**Your role is crucial in ensuring no work coverage gaps occur!**

---

**Last Updated:** December 8, 2024
**Portal Location:** `/admin/duty-reassignment`
**Access Level:** HR Head only
