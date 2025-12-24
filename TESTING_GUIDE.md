# Employee Management System - Testing Guide

## Table of Contents
1. [Manual Testing Checklist](#manual-testing-checklist)
2. [Test Scenarios](#test-scenarios)
3. [Test Data Setup](#test-data-setup)
4. [API Testing with cURL](#api-testing-with-curl)
5. [Common Issues and Solutions](#common-issues-and-solutions)

---

## Manual Testing Checklist

### 1. Holiday Management Testing

#### 1.1 Holiday Sync (Admin)
- [ ] **Sync Current Year Holidays (2025)**
  ```bash
  curl -X POST http://localhost:3000/api/admin/holidays/sync \
    -H "Content-Type: application/json" \
    -d '{
      "year": 2025,
      "source": "github",
      "clearExisting": false,
      "filterTypes": ["POYA", "MERCANTILE"]
    }'
  ```
  **Expected**: Should return 20 holidays (Poya + Mercantile only)

- [ ] **Sync Next Year Holidays (2026)**
  ```bash
  curl -X POST http://localhost:3000/api/admin/holidays/sync \
    -H "Content-Type: application/json" \
    -d '{
      "year": 2026,
      "source": "github",
      "clearExisting": false,
      "filterTypes": ["POYA", "MERCANTILE"]
    }'
  ```
  **Expected**: Should return 21 holidays for 2026

- [ ] **Verify Holiday Storage**
  - Check that each holiday has `description` field as either "Poya" or "Mercantile"
  - Verify holidays like "Duruthu Full Moon Poya Day" are stored
  - Verify mercantile holidays like "Christmas Day" are stored
  - Verify non-Poya/Mercantile holidays (like Deepavali) are NOT stored

#### 1.2 Holiday Retrieval
- [ ] **Get Current Year Holidays**
  ```bash
  curl http://localhost:3000/api/holidays?year=2025
  ```
  **Expected**: Returns only Poya and Mercantile holidays

- [ ] **Get Next Year Holidays**
  ```bash
  curl http://localhost:3000/api/holidays?year=2026
  ```
  **Expected**: Returns 2026 holidays

---

### 2. Leave Application Testing

#### 2.1 Basic Leave Application
Create test user accounts:
- Employee 1: Primary tester
- Employee 2: Cover employee
- Employee 3: Another employee for overlap testing

**Test Cases:**

- [ ] **Apply Annual Leave (3 days)**
  - Login as Employee 1
  - Navigate to "Apply Leave"
  - Select dates: e.g., March 3-5, 2026
  - Select "Annual Leave"
  - Select Employee 2 as cover
  - **Expected**:
    - Should show 3 working days
    - Should exclude any holidays/Sundays in range
    - Success message after submission

- [ ] **Apply Casual Leave (Half Day)**
  - Select "Casual Leave"
  - Select 0.5 days
  - Choose a single date
  - **Expected**: Should deduct 0.5 days from balance

- [ ] **Apply Medical Leave (2 days)**
  - Select "Medical Leave"
  - Select 2 days
  - Upload medical certificate (if > 1 day)
  - **Expected**: Medical cert required, proper validation

#### 2.2 Holiday Exclusion Testing
- [ ] **Apply Leave Including Poya Day**
  - Select dates: Feb 28 - Mar 6, 2026
  - This includes March 2 (Madin Full Moon Poya Day)
  - **Expected**:
    - Backend logs should show: `[LEAVE] Date 2026-03-02: { isSunday: false, isHoliday: true, counted: false }`
    - Should count only 5 working days (excluding Mar 1 Sunday and Mar 2 Poya)
    - Frontend calendar should gray out March 2

- [ ] **Apply Leave Including Mercantile Holiday**
  - Select dates: Dec 23-26, 2026
  - This includes Dec 25 (Christmas - Mercantile)
  - **Expected**:
    - Should exclude Dec 25 (Mercantile holiday)
    - Should exclude any Sundays
    - Correct working days calculated

- [ ] **Apply Leave Spanning Year End**
  - Select dates: Dec 30, 2025 - Jan 5, 2026
  - **Expected**: Should fetch holidays from both years and exclude correctly

#### 2.3 Overlapping Leave Prevention
- [ ] **Test Exact Overlap**
  - Apply leave: March 10-15
  - Try to apply another leave: March 10-15
  - **Expected**: Error message about existing leave

- [ ] **Test Partial Overlap**
  - Existing leave: March 10-15 (APPROVED)
  - Try to apply: March 12-18
  - **Expected**: Error message about overlapping dates

- [ ] **Test Adjacent Dates (Should Work)**
  - Existing leave: March 10-15
  - Apply new leave: March 16-20
  - **Expected**: Should be allowed (no overlap)

- [ ] **Test with Declined Leave (Should Work)**
  - Existing leave: March 10-15 (DECLINED)
  - Apply new leave: March 10-15
  - **Expected**: Should be allowed (declined leaves don't block)

---

### 3. Cover Employee Selection Testing

#### 3.1 Available Employees Filtering
- [ ] **Test Employee on Leave is Excluded**
  - Employee 2 has approved leave: March 10-15
  - Employee 1 applies for leave: March 10-15
  - **Expected**: Employee 2 should NOT appear in cover employee list

- [ ] **Test Employee with Pending Cover Request is Excluded**
  - Employee 2 has pending cover request for March 10-15
  - Employee 3 applies for leave: March 10-15
  - **Expected**: Employee 2 should NOT appear in cover employee list

- [ ] **Test Date-Specific Filtering**
  - Employee 2 has pending cover request for June 1-5
  - Employee 3 applies for leave: March 10-15
  - **Expected**: Employee 2 SHOULD appear (different dates)

- [ ] **Test Self Exclusion**
  - Employee 1 applies for leave
  - **Expected**: Employee 1 should NOT appear in their own cover employee list

#### 3.2 Console Logs Verification
Check server console for:
```
[AVAILABLE_EMPLOYEES] Filtering employees: {
  total: 10,
  requestedPeriod: { startDate: '2026-03-10', endDate: '2026-03-15' },
  onLeave: 1,
  withPendingCoverRequests: 1,
  pendingCoverDetails: [...]
}
```

---

### 4. Leave Balance Testing

#### 4.1 Balance Deduction
- [ ] **Check Initial Balance**
  - New employee should have:
    - Annual: 14 days
    - Casual: 7 days
    - Medical: 7 days

- [ ] **Apply and Approve Leave**
  - Apply 3 days annual leave
  - Admin approves
  - **Expected**: Annual balance should be 11 days (14 - 3)

- [ ] **No Pay Leave Detection**
  - Employee has 2 days annual leave remaining
  - Try to apply 5 days annual leave
  - **Expected**: Warning about NO PAY leave

#### 4.2 Year Transition
- [ ] **Test Leave in New Year**
  - Current year: 2025
  - Apply leave for: January 10-15, 2026
  - **Expected**:
    - Should use 2026 balance
    - If first 2026 leave, should create new balance with fresh 14 annual days

---

### 5. Database Connection Testing

#### 5.1 Concurrent Requests
- [ ] **Test Multiple Users Applying Leave Simultaneously**
  - Open 3-4 browser tabs
  - Login as different users
  - All apply leave at the same time
  - **Expected**: No timeout errors, all requests succeed

- [ ] **Check Console for Connection Logs**
  ```
  [LEAVE] Fetched 1 holidays from 2026-02-28 to 2026-03-06
  [LEAVE] Total working days calculated: 5
  ```
  **Expected**: No "timeout exceeded" errors

---

## Test Scenarios

### Scenario 1: Full Leave Application Flow
1. **Employee logs in**
2. **Checks leave balance** (14/7/7)
3. **Applies for annual leave** (3 days, March 10-12)
4. **Selects cover employee** (Available employees only)
5. **Cover employee receives notification**
6. **Cover employee approves**
7. **Admin receives notification**
8. **Admin approves leave**
9. **Leave balance updated** (11/7/7)
10. **Employee sees approved leave** in leave history

**Test this flow end-to-end and verify each step**

### Scenario 2: Holiday Exclusion Verification
1. **Admin syncs 2025 and 2026 holidays**
2. **Employee applies leave Feb 28 - Mar 6, 2026**
3. **Backend excludes:**
   - March 1 (Sunday)
   - March 2 (Madin Full Moon Poya Day)
4. **Frontend shows:**
   - Calendar with 5 working days highlighted
   - Grayed out Sunday and Poya day
5. **Backend logs show:**
   ```
   [LEAVE] Date 2026-03-01: { isSunday: true, isHoliday: false, counted: false }
   [LEAVE] Date 2026-03-02: { isSunday: false, isHoliday: true, counted: false }
   [LEAVE] Total working days calculated: 5
   ```
6. **Only 5 days deducted** from balance

### Scenario 3: Overlapping Leave Prevention
1. **Employee A applies leave** March 10-15 (PENDING)
2. **Employee A tries to apply another leave** March 12-18
3. **System blocks** with error message
4. **Employee A can apply** for March 16-20 (no overlap)

### Scenario 4: Cover Employee Availability
1. **Employee A applies leave** March 10-15, selects Employee B as cover
2. **Employee B approves** (status: PENDING_ADMIN)
3. **Employee C applies leave** March 10-15
4. **Employee C's cover list:**
   - ❌ Employee A (on leave)
   - ❌ Employee B (pending cover request for those dates)
   - ✅ Employee D (available)

---

## Test Data Setup

### Create Test Users
1. **Admin User**
   - Email: admin@company.com
   - Role: ADMIN

2. **Employee 1 (Primary Tester)**
   - Email: employee1@company.com
   - Department: IT
   - Position: Developer

3. **Employee 2 (Cover Employee)**
   - Email: employee2@company.com
   - Department: IT
   - Position: Developer

4. **Employee 3 (Additional Tester)**
   - Email: employee3@company.com
   - Department: HR
   - Position: Manager

### Database State Setup
```sql
-- Verify holidays are synced
SELECT COUNT(*), EXTRACT(YEAR FROM date) as year, description
FROM "PublicHoliday"
GROUP BY year, description;

-- Expected output:
-- year=2025, description=Poya, count~13
-- year=2025, description=Mercantile, count~7
-- year=2026, description=Poya, count~14
-- year=2026, description=Mercantile, count~7

-- Check leave balances
SELECT "employeeId", year, annual, casual, medical
FROM "LeaveBalance";

-- Check existing leaves
SELECT "employeeId", "leaveType", "startDate", "endDate", status
FROM "Leave"
ORDER BY "startDate" DESC;
```

---

## API Testing with cURL

### 1. Holiday Endpoints

#### Sync Holidays
```bash
# Sync 2025
curl -X POST http://localhost:3000/api/admin/holidays/sync \
  -H "Content-Type: application/json" \
  -d '{"year": 2025, "source": "github", "filterTypes": ["POYA", "MERCANTILE"]}'

# Sync 2026
curl -X POST http://localhost:3000/api/admin/holidays/sync \
  -H "Content-Type: application/json" \
  -d '{"year": 2026, "source": "github", "filterTypes": ["POYA", "MERCANTILE"]}'
```

#### Get Holidays
```bash
# Get 2025 holidays
curl http://localhost:3000/api/holidays?year=2025

# Get 2026 holidays
curl http://localhost:3000/api/holidays?year=2026
```

### 2. Available Employees
```bash
# Check available employees for date range
curl "http://localhost:3000/api/employees/available?startDate=2026-03-10&endDate=2026-03-15&userId=USER_ID"
```

### 3. Leave Application (Requires Authentication)
```bash
# Apply for leave (requires valid session cookie)
curl -X POST http://localhost:3000/api/leaves/apply \
  -H "Content-Type: application/json" \
  -H "Cookie: your-session-cookie" \
  -d '{
    "userId": "user-id",
    "leaveType": "ANNUAL",
    "startDate": "2026-03-10",
    "endDate": "2026-03-12",
    "numberOfDays": 3,
    "reason": "Personal",
    "coverEmployeeId": "cover-employee-id"
  }'
```

---

## Common Issues and Solutions

### Issue 1: Holidays Not Excluding
**Symptoms:**
- Frontend shows wrong number of days
- Backend not excluding holidays

**Check:**
1. Console logs show: `[LEAVE] Fetched 0 holidays`
2. Run holiday sync for the year
3. Verify database has holidays:
   ```sql
   SELECT * FROM "PublicHoliday" WHERE EXTRACT(YEAR FROM date) = 2026;
   ```

**Solution:**
- Sync holidays: `curl -X POST .../api/admin/holidays/sync`

### Issue 2: Connection Timeout
**Symptoms:**
- Error: "timeout exceeded when trying to connect"

**Check:**
1. Prisma pool configuration in `src/lib/prisma.ts`
2. Should have `max: 10` connections

**Solution:**
- Restart dev server: `npm run dev`
- Check DATABASE_URL is correct

### Issue 3: Overlapping Leave Not Blocked
**Symptoms:**
- Can apply for overlapping dates

**Check:**
1. Console logs for overlapping check
2. Verify status of existing leave (PENDING_COVER, PENDING_ADMIN, or APPROVED)

**Debug:**
```sql
SELECT * FROM "Leave"
WHERE "employeeId" = 'user-id'
  AND status IN ('PENDING_COVER', 'PENDING_ADMIN', 'APPROVED')
ORDER BY "startDate" DESC;
```

### Issue 4: Cover Employee Shows When Shouldn't
**Symptoms:**
- Employee with pending cover request appears in list

**Check:**
1. Console logs: `[AVAILABLE_EMPLOYEES] Filtering employees`
2. Verify date overlap logic

**Debug:**
```sql
SELECT cr."coverEmployeeId", l."startDate", l."endDate"
FROM "CoverRequest" cr
JOIN "Leave" l ON cr."leaveId" = l.id
WHERE cr.status = 'PENDING';
```

---

## Testing Checklist Summary

### Before Starting
- [ ] Database is set up and running
- [ ] Holidays synced for 2025 and 2026
- [ ] Test users created (Admin, Employee 1, 2, 3)
- [ ] Dev server running without errors

### Core Features
- [ ] Holiday sync works (2025 and 2026)
- [ ] Holidays exclude from leave calculations
- [ ] Frontend shows correct working days
- [ ] Overlapping leaves are blocked
- [ ] Cover employee filtering works
- [ ] Leave balance deducts correctly
- [ ] No database timeout errors

### Edge Cases
- [ ] Leave spanning Sundays
- [ ] Leave spanning Poya days
- [ ] Leave spanning Mercantile holidays
- [ ] Leave spanning year boundary
- [ ] Adjacent leaves (no gap)
- [ ] Multiple pending cover requests
- [ ] Year transition balance reset

### Performance
- [ ] Multiple concurrent requests work
- [ ] No connection timeouts
- [ ] Reasonable response times (< 2s)

---

## Next Steps

1. **Complete Manual Testing**: Go through each checklist item
2. **Document Issues**: Keep notes of any bugs found
3. **Fix Issues**: Address problems as they arise
4. **Retest**: Verify fixes work
5. **User Acceptance Testing**: Have real users test the system

---

## Automated Testing (Optional - Future Enhancement)

If you want to add automated tests later, consider:
- Jest for unit testing
- Playwright for end-to-end testing
- Postman/Newman for API testing

For now, manual testing using this guide is sufficient to ensure your system works correctly!
