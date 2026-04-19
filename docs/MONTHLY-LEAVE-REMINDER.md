# Monthly Leave Regularization Reminder Email - Implementation Guide

## 📋 Overview

An automated monthly email reminder system has been implemented to send leave regularization reminders to all active employees on the **1st of every month at 8:00 AM UTC**.

---

## 🎯 Purpose

The monthly reminder email serves to:
1. **Remind employees** to regularize any leaves from the previous month that haven't been formally applied
2. **Track pending leaves** - Review applied leaves awaiting admin approval
3. **Submit documentation** - Ensure all medical certificates are uploaded
4. **Verify leave balance** - Check current leave balance for planning

---

## 📧 Email Details

### Schedule
- **Frequency:** 1st day of every month
- **Time:** 8:00 AM UTC
- **Recipients:** All active employees (role = EMPLOYEE, isActive = true)

### Email Content

#### Subject Line
```
Monthly Leave Regularization Reminder - [Month Year]
Example: Monthly Leave Regularization Reminder - April 2026
```

#### Email Body Sections

1. **Greeting:** Personalized greeting with employee name
2. **Action Items:** Four key action items
   - Regularize pending leaves from last month
   - Track applied leaves and their status
   - Submit missing documentation (medical certificates)
   - Verify leave balance

3. **Important Reminders:** Critical information about leave management
4. **Call-to-Action Button:** Direct link to employee dashboard
5. **Footer:** Standard email footer with non-reply notice

#### Email Template Features
- ✅ Responsive HTML design
- ✅ Professional gradient header
- ✅ Colored sections for visual hierarchy
- ✅ Action item checklist style
- ✅ Important notice highlight box
- ✅ Direct link to employee dashboard
- ✅ Current month/year information

---

## 🔧 Technical Implementation

### Files Modified/Created

1. **New Endpoint:** `/src/app/api/emails/monthly-leave-reminder/auto/route.ts`
   - GET request endpoint
   - Cron-triggered (no manual execution needed)
   - Includes security check via CRON_SECRET

2. **Updated:** `/vercel.json`
   - Added new cron schedule: `0 8 1 * *`
   - Executes at 8:00 AM UTC on the 1st of every month

### Cron Expression Breakdown
```
0 8 1 * *
│ │ │ │ └─ Day of week (any)
│ │ │ └─── Month (any)
│ │ └───── Day of month (1st)
│ └─────── Hour (8 UTC)
└───────── Minute (0)
```

### Security
- Validates `Authorization: Bearer {CRON_SECRET}` header
- Uses environment variable `CRON_SECRET`
- Only accessible via Vercel cron mechanism

### Email Processing
```
For each active employee:
├─ Fetch employee details (id, email, firstName, lastName)
├─ Generate personalized HTML content
├─ Send email via Nodemailer (SMTP)
├─ Log success/failure
└─ Track statistics (sent, failed, etc.)
```

### Response Format
```json
{
  "success": true,
  "message": "Monthly Leave Reminder Cron - Sent: 45, Failed: 2, Total Employees: 47",
  "emailsSent": 45,
  "emailsFailed": 2,
  "failedEmails": ["email1@example.com", "email2@example.com"]
}
```

---

## 📊 Database Queries

### Employee Selection Query
```typescript
const activeEmployees = await prisma.user.findMany({
  where: {
    isActive: true,
    role: 'EMPLOYEE',
  },
  select: {
    id: true,
    email: true,
    firstName: true,
    lastName: true,
    employeeId: true,
  },
});
```

**Criteria:**
- `isActive = true` - Only active employees
- `role = EMPLOYEE` - Excludes admin users
- Selective fields only (optimized query)

---

## 🚀 Deployment & Activation

### Prerequisites
Ensure the following environment variables are set in Vercel:

```env
CRON_SECRET=your_secure_cron_token_here
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
EMAIL_SECURE=false
NEXTAUTH_URL=https://your-domain.com
NEXT_PUBLIC_APP_NAME=Employee Management System
```

### Activation Steps
1. ✅ Code is deployed to main branch
2. ✅ Vercel reads `vercel.json` and schedules the cron job
3. ✅ On the 1st of every month at 8:00 AM UTC, the cron job triggers
4. ✅ Endpoint is called with `CRON_SECRET` in authorization header
5. ✅ Emails are sent to all active employees

### Monitoring
- Check Vercel dashboard for cron job status
- Monitor email logs in Vercel and email provider
- Review application logs for send/failure statistics

---

## 📈 Expected Behavior

### Scenario 1: April 1st, 2026 at 8:00 AM UTC
```
1. Cron job triggers
2. Fetch all active employees (47 found)
3. Prepare personalized emails (47 emails)
4. Send emails in a loop
5. Log: "Sent: 47, Failed: 0"
6. Return success response
```

### Scenario 2: With Failed Emails
```
1. Cron job triggers
2. Fetch all active employees (50 found)
3. Send emails in a loop
4. 48 emails sent successfully
5. 2 emails failed (invalid email, SMTP error)
6. Log: "Sent: 48, Failed: 2"
7. Return response with failed email list
```

---

## 🔄 Frequency Comparison

| Email Type | Schedule | Time | Recipients |
|-----------|----------|------|------------|
| Birthday Email | Daily | 12:01 AM UTC | Employees with today's birthday |
| Holiday Sync | Monthly | 12:00 AM UTC on 1st | System database |
| Leave Reminder | Monthly | 8:00 AM UTC on 1st | All active employees |

---

## 📝 Testing

### Manual Testing (Endpoint)
```bash
# Test the endpoint manually with proper CRON_SECRET
curl -X GET https://your-domain.com/api/emails/monthly-leave-reminder/auto \
  -H "Authorization: Bearer your_cron_secret"

# Response:
{
  "success": true,
  "message": "Monthly Leave Reminder Cron - Sent: 45, Failed: 0, Total Employees: 45",
  "emailsSent": 45
}
```

### Log Monitoring
- Watch server logs for email send confirmations
- Monitor for any SMTP errors
- Track in Vercel Cron dashboard

---

## 🛠️ Troubleshooting

### Issue: No emails being sent
**Possible Causes:**
- CRON_SECRET not set correctly
- Email provider credentials invalid
- No active employees in system
- Database connection issue

**Solution:**
1. Verify CRON_SECRET matches in Vercel env vars
2. Test email credentials with test-email endpoint
3. Check if employees exist with `isActive = true`
4. Review application logs

### Issue: Some emails failing
**Possible Causes:**
- Invalid email addresses in database
- SMTP throttling from email provider
- Temporary network issues
- Email rejected by recipient server

**Solution:**
1. Verify email addresses in employee records
2. Check email provider rate limits
3. Review failed emails list in response
4. Implement email validation on employee creation

### Issue: Wrong timezone
**Problem:** Emails arrive at wrong time
**Solution:** Cron uses UTC time. Adjust schedule if needed:
- For 8:00 AM IST (UTC+5:30): Use `30 2 1 * *` (2:30 AM UTC)
- For 9:00 AM EST (UTC-5): Use `14 1 1 * *` (1:14 PM UTC previous day)

---

## 📞 Support

For questions or issues regarding the monthly leave reminder system:
1. Check Vercel dashboard for cron job logs
2. Review application error logs
3. Verify email provider configuration
4. Contact development team

---

## 🎯 Future Enhancements

Possible improvements:
1. Add email template customization
2. Allow employees to opt-in/opt-out
3. Include leave balance summary in email
4. Add department-specific reminders
5. Track email open rates and clicks
6. Schedule multiple reminders (e.g., mid-month, end of month)

---

## ✅ Implementation Checklist

- ✅ Created new API endpoint for monthly reminder
- ✅ Added professional HTML email template
- ✅ Configured cron schedule in vercel.json
- ✅ Implemented security (CRON_SECRET validation)
- ✅ Added error handling and logging
- ✅ Tested build compilation
- ✅ Created documentation

**Status:** Ready for Production Deployment
