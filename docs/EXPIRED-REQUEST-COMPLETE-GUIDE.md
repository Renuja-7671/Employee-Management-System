# Expired Leave Request Handling - Complete Implementation

## ✅ Implementation Summary

After 12 hours of no response from a cover employee, the leave request is **automatically hidden from all users** and the cover employee becomes available again.

---

## 🎯 What Happens to Expired Requests

### Visibility Changes

| User Type | Before Expiry | After Expiry |
|-----------|--------------|--------------|
| **Employee (who applied)** | ✅ Sees request in "My Leaves" | ❌ Request hidden from view |
| **Cover Employee** | ✅ Sees in "Cover Requests" | ❌ Request hidden from view |
| **Admin** | ✅ Sees in leave management | ❌ Request hidden from view |
| **Available List** | ❌ Cover employee NOT available | ✅ Cover employee IS available |
| **Database** | ✅ Request exists | ✅ Request still exists (audit) |

---

## 🔧 Technical Implementation

### Files Modified

#### 1. **`/api/employees/available`** - Cover Employee Availability
```typescript
// Only show employees without non-expired pending cover requests
where: {
  status: 'PENDING',
  expiresAt: { gt: new Date() } // ← Filter expired
}
```

#### 2. **`/api/leaves/cover-requests`** - Cover Employee Dashboard
```typescript
// Only show non-expired cover requests
where: {
  coverEmployeeId: userId,
  status: 'PENDING',
  expiresAt: { gt: new Date() } // ← Filter expired
}
```

#### 3. **`/api/cover-requests/pending`** - Badge Count
```typescript
// Count only non-expired requests
where: {
  status: 'PENDING',
  expiresAt: { gte: new Date() } // ← Already had this
}
```

#### 4. **`/api/leaves`** - All Leave Lists (Employee, Admin, Cover)
```typescript
// Include CoverRequest data
include: {
  CoverRequest: {
    select: { status: true, expiresAt: true }
  }
}

// Filter out expired requests
const activeLeaves = leaves.filter((leave) => {
  if (leave.CoverRequest) {
    if (leave.CoverRequest.status === 'PENDING' && 
        new Date() > leave.CoverRequest.expiresAt) {
      return false; // Hide from all users
    }
  }
  return true;
});
```

#### 5. **`/api/leaves/cover-response`** - Response Blocking
```typescript
// Prevent responses to expired requests
if (new Date() > leave.CoverRequest.expiresAt) {
  return NextResponse.json({
    error: 'This cover request has expired. You are now available for other requests.',
    expired: true
  }, { status: 400 });
}
```

---

## 📊 User Flows

### Flow 1: Normal Approval (Within 12 Hours)

```
09:00 AM  Employee applies for leave
          ├─ Status: PENDING_COVER
          ├─ Cover request created (expires 09:00 PM)
          ├─ Employee sees in "My Leaves"
          ├─ Cover employee sees in "Cover Requests"
          └─ Admin sees in leave management

11:30 AM  Cover employee approves
          ├─ Status: PENDING_ADMIN
          ├─ Employee sees updated status
          ├─ Admin sees in pending list
          └─ ✅ Normal flow continues
```

### Flow 2: Expiry After 12 Hours

```
09:00 AM  Employee applies for leave
          ├─ Status: PENDING_COVER
          ├─ Cover request created (expires 09:00 PM)
          ├─ Employee sees in "My Leaves"
          ├─ Cover employee sees in "Cover Requests"
          └─ Cover employee marked as unavailable

09:00 PM  ⏰ Cover request expires (12 hours passed)
          ├─ No database changes
          └─ System now filters this request

09:01 PM  System behavior changes automatically:
          ├─ ❌ Employee: Request disappears from "My Leaves"
          ├─ ❌ Cover Employee: Request disappears from dashboard
          ├─ ❌ Admin: Request disappears from leave management
          ├─ ✅ Cover Employee: Shows as available again
          ├─ ✅ Cover Employee: Can be selected for other requests
          └─ 💾 Request still in database (for reports)

Next Day  Employee can reapply if needed
          └─ Fresh 12-hour window starts
```

---

## 🎨 User Experience

### For Employee Who Applied

**During 12-hour window:**
- ✅ See request in "My Leaves" tab
- ⏰ Status shows "PENDING_COVER"
- 📊 Can track request status

**After expiry:**
- ❌ Request disappears from "My Leaves"
- 🔄 Can reapply for same dates
- 💡 Understands cover employee didn't respond

### For Cover Employee

**During 12-hour window:**
- ✅ See request in "Cover Requests" tab
- 🔔 Badge shows pending count
- 👍 Can approve or decline

**After expiry:**
- ❌ Request disappears automatically
- 📉 Badge count decreases
- ✅ Shown as available for other requests
- 🚫 Can't respond even if they try

**If they try to respond after expiry:**
```
Error Message:
"This cover request has expired (12-hour limit exceeded). 
You are no longer assigned to cover this leave and are 
now available for other cover requests."
```

### For Admin

**During 12-hour window:**
- ✅ See request in leave management
- 📋 Shows as "PENDING_COVER"
- ⏳ Waiting for cover approval

**After expiry:**
- ❌ Request disappears from leave list
- 🧹 Clean dashboard with only actionable items
- 📊 Can still query expired requests if needed (database)

---

## 🔍 Database Queries for Reporting

Even though expired requests are hidden from users, admins can still query them for analytics:

```sql
-- Find all expired cover requests (never responded)
SELECT 
  l."id",
  l."employeeId",
  l."coverEmployeeId",
  l."startDate",
  l."endDate",
  cr."expiresAt",
  CONCAT(e."firstName", ' ', e."lastName") as employee_name,
  CONCAT(ce."firstName", ' ', ce."lastName") as cover_name
FROM "Leave" l
JOIN "CoverRequest" cr ON cr."leaveId" = l."id"
JOIN "User" e ON e."id" = l."employeeId"
JOIN "User" ce ON ce."id" = l."coverEmployeeId"
WHERE cr."status" = 'PENDING'
  AND cr."expiresAt" < NOW()
ORDER BY cr."expiresAt" DESC;

-- Analytics: Cover employees who never respond
SELECT 
  ce."id",
  CONCAT(ce."firstName", ' ', ce."lastName") as cover_name,
  COUNT(*) as expired_requests_count
FROM "Leave" l
JOIN "CoverRequest" cr ON cr."leaveId" = l."id"
JOIN "User" ce ON ce."id" = l."coverEmployeeId"
WHERE cr."status" = 'PENDING'
  AND cr."expiresAt" < NOW()
GROUP BY ce."id", ce."firstName", ce."lastName"
ORDER BY expired_requests_count DESC;

-- Expiry rate by month
SELECT 
  DATE_TRUNC('month', cr."expiresAt") as month,
  COUNT(*) as total_expired
FROM "CoverRequest" cr
WHERE cr."status" = 'PENDING'
  AND cr."expiresAt" < NOW()
GROUP BY month
ORDER BY month DESC;
```

---

## 🧪 Testing Scenarios

### Test 1: Verify Hiding Works

```sql
-- 1. Create a leave request
-- 2. Make it expire immediately
UPDATE "CoverRequest" 
SET "expiresAt" = NOW() - INTERVAL '1 hour'
WHERE id = 'test-cover-request-id';

-- 3. Verify it's hidden:
-- ✅ Not in employee's "My Leaves"
-- ✅ Not in cover employee's dashboard
-- ✅ Not in admin's leave management
-- ✅ Cover employee shows as available
```

### Test 2: Verify Response Blocking

```bash
# Try to respond to expired request via API
curl -X POST http://localhost:3000/api/leaves/cover-response \
  -H "Content-Type: application/json" \
  -d '{
    "leaveId": "expired-leave-id",
    "userId": "cover-employee-id",
    "approved": true
  }'

# Expected response:
{
  "error": "This cover request has expired (12-hour limit exceeded). You are no longer assigned to cover this leave and are now available for other cover requests.",
  "expired": true
}
```

### Test 3: Verify Availability

```bash
# Check available employees
curl http://localhost:3000/api/employees/available?startDate=2026-02-01&endDate=2026-02-05

# Should include employees who have expired cover requests
```

---

## 📈 Benefits

| Aspect | Benefit |
|--------|---------|
| **User Experience** | Clean dashboards with only actionable items |
| **Cover Employees** | Automatically available after 12 hours |
| **Data Integrity** | Expired requests preserved for auditing |
| **Performance** | No cron jobs needed, real-time filtering |
| **Maintenance** | Simple query-based approach, easy to understand |
| **Scalability** | Database handles filtering efficiently |

---

## 🔮 Future Enhancements (Optional)

### 1. Notification System
Add a notification when a request expires:
```typescript
// Send notification to employee
await prisma.notification.create({
  data: {
    userId: leave.employeeId,
    type: 'SYSTEM_ALERT',
    title: 'Leave Request Expired',
    message: `Your leave request expired because ${coverEmployee.name} didn't respond within 12 hours.`
  }
});
```

### 2. Admin Dashboard Widget
Show expiry statistics:
- Expired requests this week
- Cover employees with high expiry rates
- Average response time

### 3. Reminder System
Send reminder before expiry:
```typescript
// 2 hours before expiry
if (hoursRemaining <= 2) {
  sendReminder(coverEmployee, leave);
}
```

### 4. Manual Cleanup Tool
Admin button to permanently delete old expired requests:
```typescript
// Delete expired requests older than 30 days
DELETE FROM "Leave"
WHERE id IN (
  SELECT l.id FROM "Leave" l
  JOIN "CoverRequest" cr ON cr."leaveId" = l."id"
  WHERE cr.status = 'PENDING'
    AND cr."expiresAt" < NOW() - INTERVAL '30 days'
);
```

---

## 📝 Summary

✅ **Expired requests hidden from all users**  
✅ **Cover employees automatically available**  
✅ **Clean dashboards, only actionable items**  
✅ **No cron jobs required**  
✅ **Real-time filtering**  
✅ **Audit trail preserved in database**  
✅ **Simple, maintainable approach**  

---

**Status**: ✅ Implemented and Tested  
**Updated**: January 29, 2026  
**Build**: Successful  
**Ready for Deployment**: Yes
