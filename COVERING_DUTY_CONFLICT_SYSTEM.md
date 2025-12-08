# Covering Duty Conflict Management System

## Problem Scenario

**Example:**
1. Employee A applies for annual leave (Dec 10-12)
2. Employee B accepts to cover for Employee A
3. Leave is approved by Managing Director
4. On Dec 11, Employee B falls ill and applies for medical leave
5. **Problem:** Who will cover Employee A's work now?

This system automatically detects and manages such conflicts.

---

## ⚕️ Medical Leave Priority (CRITICAL)

**IMPORTANT:** Medical leaves are ALWAYS allowed, even when covering for others.

**Reasoning:**
- If an employee is ill, they CANNOT work - neither their own duties nor covering duties
- This is a practical necessity, not a policy choice
- Blocking medical leaves when covering would be unethical and impractical

**Implementation:**
- Medical leave applications are NOT blocked when employee is covering
- System automatically triggers covering duty reassignment workflow
- Admin is notified to find replacement cover employee
- Original employee's work remains covered through HR reassignment

---

## How It Works

### 1. **Conflict Detection (Automatic)**

When an employee applies for leave, the system checks:
- Is this employee currently covering for someone else during the requested dates?
- **If YES and leave type is MEDICAL** → Allow application, trigger reassignment workflow
- **If YES and leave type is NOT MEDICAL** → Block application with helpful error message

### 2. **Admin Notification (Automatic)**

When conflict is detected:
- All admins (Managing Director & HR Head) receive a **pinned notification**
- Notification shows:
  - Who is applying for leave
  - Who they are supposed to be covering for
  - Date ranges involved
  - Warning that duty reassignment will be needed if approved

### 3. **Managing Director Approval**

Managing Director sees the leave request with conflict warning and can:
- **Approve:** Knowing that HR will need to reassign duties
- **Decline:** If the conflict is too problematic

### 4. **HR Head Reassignment (If Approved)**

When Managing Director approves a leave with covering duty conflict:
- HR Head receives a **pinned notification**: "Duty Reassignment Required"
- HR Head must assign new cover employees for the affected leaves
- System shows available employees based on their workload

---

## Database Schema

### New Table: CoverDutyReassignment

```prisma
model CoverDutyReassignment {
  id                      String   @id @default(uuid())
  originalLeaveId         String   // Employee A's leave
  coverEmployeeLeaveId    String   // Employee B's leave (the conflict)
  originalCoverEmployeeId String   // Employee B (who can't cover anymore)
  newCoverEmployeeId      String?  // Employee C (newly assigned by HR)
  reassignedBy            String?  // HR Head who made the reassignment
  status                  String   // PENDING, REASSIGNED, CANCELLED
  createdAt               DateTime
  updatedAt               DateTime
}
```

### New Notification Types

1. **COVERING_DUTY_CONFLICT**
   - Sent to: All Admins
   - When: Employee applies for leave while covering others
   - Purpose: Alert about potential conflict

2. **DUTY_REASSIGNMENT_REQUIRED**
   - Sent to: HR Head
   - When: Leave with conflict is approved
   - Purpose: Action required - assign new cover employee

---

## System Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│ Employee B applies for medical leave (while covering Employee A)│
└─────────────────────┬───────────────────────────────────────────┘
                      │
                      ▼
        ┌─────────────────────────────┐
        │ System Detects Conflict     │
        │ (Check: Is B covering for A?)│
        └─────────────┬───────────────┘
                      │
                      ▼
        ┌─────────────────────────────┐
        │ Create CoverDutyReassignment│
        │ Record (Status: PENDING)    │
        └─────────────┬───────────────┘
                      │
                      ▼
        ┌─────────────────────────────────────┐
        │ Notify ALL Admins                   │
        │ ⚠️ "Covering Duty Conflict Detected"│
        │ (Pinned notification)               │
        └─────────────┬───────────────────────┘
                      │
                      ▼
        ┌─────────────────────────────┐
        │ Employee B's cover employee │
        │ receives cover request      │
        └─────────────┬───────────────┘
                      │
                      ▼
        ┌─────────────────────────────┐
        │ Cover employee accepts      │
        └─────────────┬───────────────┘
                      │
                      ▼
        ┌─────────────────────────────────────┐
        │ Managing Director Reviews           │
        │ Sees conflict warning               │
        │ Decision: Approve or Decline        │
        └─────────────┬───────────────────────┘
                      │
                      ▼ (If Approved)
        ┌─────────────────────────────────────┐
        │ Notify HR Head                      │
        │ 🔄 "Duty Reassignment Required"     │
        │ (Pinned notification)               │
        └─────────────┬───────────────────────┘
                      │
                      ▼
        ┌─────────────────────────────────────┐
        │ HR Head Opens Reassignment Panel    │
        │ - Sees affected leaves              │
        │ - Views available employees         │
        │ - Assigns new cover employees       │
        └─────────────┬───────────────────────┘
                      │
                      ▼
        ┌─────────────────────────────┐
        │ Update Original Leave       │
        │ coverEmployeeId = Employee C│
        └─────────────┬───────────────┘
                      │
                      ▼
        ┌─────────────────────────────┐
        │ Update Reassignment Record  │
        │ Status: REASSIGNED          │
        │ newCoverEmployeeId: C       │
        │ reassignedBy: HR Head       │
        └─────────────┬───────────────┘
                      │
                      ▼
        ┌─────────────────────────────┐
        │ Notify All Parties          │
        │ - Employee A                │
        │ - Employee C (new cover)    │
        │ - Managing Director         │
        └─────────────────────────────┘
```

---

## API Endpoints

### 1. Leave Application API (Updated)
**Endpoint:** `POST /api/leaves/apply`

**What Changed:**
- Now checks if applicant is covering for others
- Creates CoverDutyReassignment records if conflict exists
- Notifies admins about conflicts
- Returns conflict details in response

**Response (with conflict):**
```json
{
  "message": "Leave request submitted successfully",
  "leave": {
    "id": "leave-123",
    "status": "PENDING_COVER"
  },
  "coveringDutyConflict": true,
  "conflictDetails": {
    "affectedLeaves": [
      {
        "employeeName": "John Doe",
        "startDate": "2024-12-10",
        "endDate": "2024-12-12"
      }
    ]
  }
}
```

### 2. Leave Approval API (Updated)
**Endpoint:** `POST /api/leaves/[id]/approve`

**What Changed:**
- Checks for pending duty reassignments
- Notifies HR Head when reassignment needed
- Returns reassignment status in response

**Response (with reassignment needed):**
```json
{
  "success": true,
  "leave": { ... },
  "dutyReassignmentRequired": true,
  "affectedCount": 1
}
```

### 3. Get Available Employees for Reassignment
**Endpoint:** `GET /api/admin/cover-reassignment/available-employees`

**Query Parameters:**
- `startDate` - Start date of the leave period
- `endDate` - End date of the leave period
- `excludeEmployeeId` - Employee who can't cover (optional)

**Response:**
```json
{
  "availableEmployees": [
    {
      "id": "emp-123",
      "name": "Jane Smith",
      "employeeId": "EMP001",
      "department": "SALES_AND_MARKETING",
      "currentWorkload": 2,
      "onLeave": false,
      "coveringCount": 1
    }
  ]
}
```

### 4. Reassign Cover Duty (HR Head Only)
**Endpoint:** `POST /api/admin/cover-reassignment/assign`

**Body:**
```json
{
  "reassignmentId": "reassignment-123",
  "newCoverEmployeeId": "emp-456",
  "hrHeadId": "admin-789"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Cover duty reassigned successfully",
  "updatedLeave": { ... },
  "reassignment": { ... }
}
```

---

## Notifications

### Admin Notification (Conflict Detected)
```
⚠️ Covering Duty Conflict Detected

Jane Smith applied for medical leave (Dec 11-13) but is currently
covering for: John Doe (Dec 10-12). If approved, duty reassignment
will be required.

[View Leave Request]
```
**Properties:**
- Type: COVERING_DUTY_CONFLICT
- Pinned: Yes (high visibility)
- Recipients: All Admins

### HR Head Notification (Reassignment Required)
```
🔄 Duty Reassignment Required

Jane Smith's medical leave has been approved. They were covering for:
John Doe (Dec 10-12). Please assign new cover employees.

[Reassign Duties]
```
**Properties:**
- Type: DUTY_REASSIGNMENT_REQUIRED
- Pinned: Yes (action required)
- Recipient: HR Head only

---

## Employee Availability Calculation

When HR Head needs to reassign duties, the system calculates employee availability:

### Criteria for "Available":
1. ✅ Not on leave during the required period
2. ✅ Not already covering too many other employees
3. ✅ Same or compatible department (preference)
4. ✅ Active employee status

### Workload Score:
```
Score = (Current covering count × 2) + (Upcoming leaves × 1)
```

Lower score = More available

### Sorting:
Employees are sorted by:
1. Availability (available first)
2. Workload score (least busy first)
3. Department match (same department preferred)
4. Name (alphabetical)

---

## UI Components

### 1. Admin Leave Review (Enhanced)
Shows conflict warnings when reviewing leaves:
```
⚠️ COVERING DUTY CONFLICT
This employee is currently covering for:
• John Doe (Dec 10-12) - Annual Leave
• Mary Jones (Dec 11) - Casual Leave

If you approve this leave, HR will need to reassign these duties.
```

### 2. HR Duty Reassignment Panel
New component for HR Head:
```
┌─────────────────────────────────────────────┐
│ Duty Reassignment Required                  │
├─────────────────────────────────────────────┤
│ Employee: Jane Smith                        │
│ Leave: Medical Leave (Dec 11-13)            │
│                                             │
│ Affected Leaves:                            │
│ ┌─────────────────────────────────────────┐ │
│ │ John Doe - Annual Leave                 │ │
│ │ Dec 10-12                                │ │
│ │ Current Cover: Jane Smith (on leave)    │ │
│ │                                          │ │
│ │ Select New Cover Employee:               │ │
│ │ ▼ [Select Employee]                      │ │
│ │                                          │ │
│ │ Available Employees:                     │ │
│ │ • Bob Wilson (Workload: 1)              │ │
│ │ • Alice Brown (Workload: 2)             │ │
│ │ • Tom Davis (Workload: 0)               │ │
│ │                                          │ │
│ │ [Assign Bob Wilson]                      │ │
│ └─────────────────────────────────────────┘ │
└─────────────────────────────────────────────┘
```

---

## Migration Instructions

### Step 1: Apply Database Migration
```bash
npx prisma generate
npx prisma migrate deploy
```

### Step 2: Update Existing Data (Optional)
No existing data needs updating. The system only works for future leaves.

### Step 3: Test the Flow

1. **Test Medical Leave Priority (CRITICAL):**
   - Employee A applies for annual leave
   - Employee B accepts to cover
   - Admin approves
   - Employee B applies for **medical leave** during covering period
   - Check: ✅ Medical leave application should be ALLOWED
   - Check: ✅ Admins should see conflict notification
   - Admin approves B's medical leave
   - Check: ✅ HR Head should see reassignment notification

2. **Test Non-Medical Leave Block:**
   - Employee A applies for annual leave
   - Employee B accepts to cover
   - Admin approves
   - Employee B tries to apply for **annual/casual leave** during covering period
   - Check: ✅ Application should be BLOCKED with helpful error message
   - Error should say: "However, you may apply for medical leave if needed"

3. **Test reassignment:**
   - HR Head assigns new cover employee
   - Check: All parties notified

---

## Benefits

✅ **Automatic Detection:** No manual tracking needed
✅ **Medical Leave Priority:** Sick employees never blocked from taking leave
✅ **Early Warning:** Admins notified before approval
✅ **Structured Process:** Clear workflow for reassignment
✅ **Audit Trail:** All reassignments tracked in database
✅ **Smart Suggestions:** Available employees shown by workload
✅ **No Work Gaps:** Ensures coverage continuity
✅ **Ethical & Practical:** Recognizes that sick employees cannot work

---

## Future Enhancements (Optional)

1. **Automatic Suggestion:** System suggests best cover employee
2. **Conflict Prevention:** Warn employees before applying
3. **Bulk Reassignment:** Handle multiple conflicts at once
4. **Mobile Notifications:** Push notifications for urgent conflicts
5. **Analytics:** Report on conflict frequency and patterns

---

## Summary

This system ensures that when a cover employee needs leave (especially medical),
the work coverage doesn't fall through the cracks. Admins are alerted, and HR
has the tools to quickly reassign duties to available employees.

**Key Innovation:** The system doesn't prevent the cover employee from taking
leave (especially medical - they need it!), but ensures the original employee's
work is still covered by someone else.
