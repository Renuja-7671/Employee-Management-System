# Hostinger Cron Setup - Quick Reference

## 🚀 Quick Setup (5 Minutes)

### Step 1: Generate Commands
```bash
cd /path/to/your/ems
./scripts/generate-hostinger-cron.sh
```

This will:
- ✅ Generate a secure `CRON_SECRET`
- ✅ Create ready-to-paste cron commands
- ✅ Save everything to `hostinger-cron-commands.txt`

---

### Step 2: Add Environment Variable

1. **Hostinger hPanel** → **Advanced** → **Environment Variables** (or edit `.env`)
2. **Add**: 
   ```
   CRON_SECRET=<the_generated_secret>
   ```
3. **Save** and **Restart** your application

---

### Step 3: Create Cron Jobs in Hostinger

**hPanel** → **Advanced** → **Cron Jobs** → **Create Cron Job**

#### Job 1: Expired Covers Cleanup
```
Schedule: 0 * * * * (Every hour)
Command:  [Copy from generated file]
```

#### Job 2: Birthday Emails
```
Schedule: 0 5 * * * (Daily at 5 AM)
Command:  [Copy from generated file]
```

#### Job 3: Holiday Sync
```
Schedule: 0 0 1 * * (Monthly, 1st at midnight)
Command:  [Copy from generated file]
```

---

### Step 4: Test
```bash
# From your local machine or SSH
curl -X GET "https://yourdomain.com/api/cron/cleanup-expired-covers" \
     -H "Authorization: Bearer YOUR_CRON_SECRET"
```

Expected response:
```json
{
  "success": true,
  "message": "Expired cover requests cleanup completed",
  "summary": { ... }
}
```

---

## 📋 Cron Schedule Cheat Sheet

| Schedule | Meaning | Cron Expression |
|----------|---------|----------------|
| Every hour | At :00 minutes | `0 * * * *` |
| Every 30 min | Half-hourly | `*/30 * * * *` |
| Daily 5 AM | Once per day | `0 5 * * *` |
| Weekly Mon | Monday at midnight | `0 0 * * 1` |
| Monthly 1st | First day at midnight | `0 0 1 * *` |
| Weekdays 9 AM | Monday-Friday | `0 9 * * 1-5` |

---

## ⚠️ Troubleshooting

### "Unauthorized" Error
- Check `CRON_SECRET` matches in both env vars and cron command
- Verify Authorization header format: `Bearer YOUR_SECRET`

### Cron Not Running
- Verify curl/wget is available on your hosting
- Test command manually via SSH
- Check Hostinger plan includes cron jobs

### Timeout
- Add `--max-time 60` to curl command
- Or use `--timeout=60` for wget

---

## 📞 Need Help?

1. Check full guide: `docs/HOSTINGER-CRON-SETUP.md`
2. Hostinger Support: Live chat in hPanel
3. Test locally: `node scripts/test-expired-cleanup.js`

---

**Generated**: January 29, 2026
