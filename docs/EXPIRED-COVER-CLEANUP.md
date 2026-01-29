# Expired Cover Request Cleanup - Cron Job

## Overview

This cron job automatically cleans up expired cover requests that were not responded to within the 12-hour deadline. This ensures:

1. ✅ Cover employees remain available for other leave requests
2. ✅ No orphaned/stuck leave requests in the system
3. ✅ Employees are notified when their requests expire
4. ✅ Database stays clean and efficient

## How It Works

### Workflow

```
Employee applies for leave
         ↓
Cover Employee has 12 hours to respond
         ↓
    [12 hours pass]
         ↓
Cron job runs (every hour) ⏰
         ↓
Finds expired PENDING cover requests
         ↓
For each expired request:
  1. Create notification for employee
  2. Delete leave request (cascade deletes cover request)
  3. Log the cleanup action
```

### Schedule

- **Frequency**: Every hour (`0 * * * *`)
- **Configured in**: `vercel.json`
- **Endpoint**: `/api/cron/cleanup-expired-covers`

## Features

### 1. Automatic Cleanup
- Finds all `PENDING` cover requests where `expiresAt < NOW`
- Deletes expired leave requests (cascades to cover requests)
- Handles batch processing with error recovery

### 2. Employee Notifications
Employees receive a pinned notification:
```
❌ Leave Request Expired

Your annual leave request (Jan 29, 2026 - Jan 31, 2026) has expired 
because John Doe did not respond within 12 hours. Please reapply if 
you still need this leave.
```

### 3. Comprehensive Logging
```json
{
  "timestamp": "2026-01-29T12:00:00.000Z",
  "totalExpired": 3,
  "successfullyCleaned": 3,
  "notificationsSent": 3,
  "errors": 0
}
```

### 4. Security
- Protected by `CRON_SECRET` bearer token
- Only Vercel cron scheduler can trigger (when deployed)
- Unauthorized attempts are logged and rejected

## Deployment

### Vercel (Production)

The cron job is automatically configured in `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/cron/cleanup-expired-covers",
      "schedule": "0 * * * *"
    }
  ]
}
```

**Important**: Add `CRON_SECRET` to Vercel environment variables for security.

### Manual Trigger (Testing)

You can manually trigger the cleanup:

#### Using the test script:
```bash
node scripts/test-expired-cleanup.js
```

#### Using curl:
```bash
# Without auth (local dev)
curl http://localhost:3000/api/cron/cleanup-expired-covers

# With auth (production)
curl -H "Authorization: Bearer YOUR_CRON_SECRET" \
     https://your-domain.com/api/cron/cleanup-expired-covers
```

## Testing

### 1. Create a Test Expired Request

```sql
-- In your database, update a cover request to be expired
UPDATE "CoverRequest" 
SET "expiresAt" = NOW() - INTERVAL '1 hour'
WHERE status = 'PENDING'
LIMIT 1;
```

### 2. Run the Cron Job

```bash
# Start dev server
npm run dev

# In another terminal, run the test script
node scripts/test-expired-cleanup.js
```

### 3. Verify Results

Check:
- ✅ Leave request is deleted
- ✅ Cover request is deleted (cascade)
- ✅ Employee received notification
- ✅ Cover employee is now available for other requests

## Database Impact

### Tables Affected

1. **Leave** - Expired requests are DELETED
2. **CoverRequest** - Auto-deleted via `onDelete: Cascade`
3. **Notification** - New notification created for employee

### Prisma Relations

```prisma
model CoverRequest {
  Leave Leave @relation(fields: [leaveId], references: [id], onDelete: Cascade)
  // ↑ When Leave is deleted, CoverRequest is automatically deleted
}
```

## Monitoring

### What to Monitor

1. **Cleanup Frequency**: Should run every hour
2. **Success Rate**: Check `errors` in response
3. **Volume**: Track `totalExpired` over time (high volume = issue with workflow)
4. **Notification Delivery**: Ensure employees receive notifications

### Logs to Check

```bash
# In Vercel dashboard or server logs
[CLEANUP-EXPIRED-COVERS] Starting cleanup...
[CLEANUP-EXPIRED-COVERS] Found 2 expired cover requests
[CLEANUP-EXPIRED-COVERS] Processing expired request for John Smith (Leave ID: abc123)
[CLEANUP-EXPIRED-COVERS] Successfully cleaned up Leave ID: abc123
[CLEANUP-EXPIRED-COVERS] Cleanup completed: { totalExpired: 2, successfullyCleaned: 2 }
```

## Error Handling

### Graceful Degradation

- If one cleanup fails, others continue
- Errors are collected and reported
- Failed cleanups are retried on next cron run

### Example Error Response

```json
{
  "success": true,
  "summary": {
    "totalExpired": 5,
    "successfullyCleaned": 4,
    "errors": 1,
    "errorDetails": [
      {
        "coverRequestId": "xyz789",
        "leaveId": "abc123",
        "error": "Leave not found"
      }
    ]
  }
}
```

## Related Files

- **Cron Job**: `src/app/api/cron/cleanup-expired-covers/route.ts`
- **Test Script**: `scripts/test-expired-cleanup.js`
- **Configuration**: `vercel.json`
- **Cover Response**: `src/app/api/leaves/cover-response/route.ts`
- **Leave Apply**: `src/app/api/leaves/apply/route.ts`

## FAQs

### Q: What if an employee wants the same leave after expiry?
**A**: They need to reapply. The system treats it as a fresh request with a new 12-hour window.

### Q: Can a cover employee still respond after expiry?
**A**: No. The cover-response endpoint checks expiry and returns an error message explaining the request was removed.

### Q: What about official leaves?
**A**: Official leaves don't require cover employees, so they're never affected by this cleanup.

### Q: How do I change the cleanup frequency?
**A**: Update the schedule in `vercel.json`:
- Every 30 minutes: `*/30 * * * *`
- Every 2 hours: `0 */2 * * *`
- Every 6 hours: `0 */6 * * *`

### Q: Can I disable the cleanup temporarily?
**A**: Yes, comment out the cron entry in `vercel.json` and redeploy.

## Performance

- **Average execution time**: < 2 seconds for 10 expired requests
- **Database impact**: Minimal (indexed queries on `status` and `expiresAt`)
- **Notification overhead**: Async, doesn't block cleanup

## Future Enhancements

Potential improvements:
1. Email notification (in addition to in-app)
2. Configurable expiry period (12h, 24h, etc.)
3. Grace period before deletion (warning notification first)
4. Analytics dashboard for expiry trends
5. Auto-suggest alternative cover employees

---

**Last Updated**: January 29, 2026
**Version**: 1.0.0
