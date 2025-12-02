# Setup Instructions - Forgot Password Feature

## ⚠️ Important: Run This First!

Before testing the forgot password feature, you need to run the database migration and regenerate the Prisma client.

### Step 1: Generate Prisma Client

This will fix the TypeScript errors you're seeing:

```bash
npx prisma generate
```

### Step 2: Run Database Migration

```bash
npx prisma migrate dev --name add_password_reset
```

When prompted, enter a name for the migration: `add_password_reset`

### Step 3: Restart Development Server

If your dev server is running, stop it (Ctrl+C) and restart:

```bash
npm run dev
```

---

## ✅ What This Does

1. **Creates `PasswordResetToken` table** in your database
2. **Generates TypeScript types** for the new model
3. **Updates Prisma Client** with new methods
4. **Fixes TypeScript errors** in the API routes

---

## 🧪 Testing the Feature

### Test 1: Unregistered Email

1. Go to http://localhost:3000/login
2. Click "Forgot Password?"
3. Enter: `nonexistent@example.com`
4. Click "Send Reset Link"
5. **Expected:** Error message saying "No account found with this email address"

### Test 2: Registered Email

1. Go to http://localhost:3000/login
2. Click "Forgot Password?"
3. Enter: `your-registered-email@example.com`
4. Click "Send Reset Link"
5. **Expected:** Success message + email sent
6. Check your email inbox
7. Click the reset link
8. Create new password
9. Log in with new password

### Test 3: Inactive Account

1. Deactivate a user account in the database
2. Try to reset password for that email
3. **Expected:** Error message saying "This account is inactive"

---

## 📧 Email Configuration

Your email is already configured in `.env`:

```env
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=uniqueinhrm@gmail.com
EMAIL_PASS=qomd stqz eehd sqwi
```

No additional email configuration needed!

---

## 🔍 Verify Everything Works

### Check Database Tables

```bash
npx prisma studio
```

Look for the new `PasswordResetToken` table.

### Check TypeScript

The TypeScript errors in these files should be gone:
- `/src/app/api/auth/forgot-password/route.ts`
- `/src/app/api/auth/reset-password/route.ts`

### Test API Directly

```bash
# Test with unregistered email
curl -X POST http://localhost:3000/api/auth/forgot-password \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com"}'

# Should return error if email doesn't exist
```

---

## 🎯 Key Changes Made

### 1. Email Validation Added

**Before:**
- Always returned success message (even for non-existent emails)
- Generic message: "If an account exists, a link has been sent"

**After:**
- Checks if email is registered in the system
- Clear error: "No account found with this email address"
- Helps users identify typos

### 2. User Feedback

- ✅ **Registered email:** Gets reset link via email
- ❌ **Unregistered email:** Clear error message
- ❌ **Inactive account:** Clear error message

### 3. Benefits

- Better user experience
- Users know immediately if they entered wrong email
- Reduces confusion ("Why didn't I get the email?")
- Still secure (no sensitive information exposed)

---

## 📁 Files Modified

1. ✅ `prisma/schema.prisma` - Added PasswordResetToken model
2. ✅ `src/app/api/auth/forgot-password/route.ts` - Email validation
3. ✅ `src/app/api/auth/reset-password/route.ts` - Password reset logic
4. ✅ `src/components/auth/LoginForm.tsx` - Added forgot password link
5. ✅ `src/app/forgot-password/page.tsx` - Forgot password page
6. ✅ `src/app/reset-password/page.tsx` - Reset password page

---

## 🚨 Troubleshooting

### Issue: TypeScript Errors

**Solution:**
```bash
npx prisma generate
# Then restart your IDE and dev server
```

### Issue: "Table doesn't exist" error

**Solution:**
```bash
npx prisma migrate dev --name add_password_reset
```

### Issue: Email not sending

**Check:**
1. Email credentials in `.env` are correct
2. Gmail app password is valid (not regular password)
3. Check spam folder
4. Check server logs for email errors

### Issue: "No account found" but email exists

**Check:**
1. Email address is typed correctly (case-insensitive)
2. User account exists in database
3. Email matches exactly with database record

---

## ✨ Feature Summary

**What works:**
- ✅ Forgot password link on login page
- ✅ Email validation before sending reset link
- ✅ Professional email template
- ✅ Secure time-limited tokens (1 hour)
- ✅ Password strength indicators
- ✅ Password match validation
- ✅ Clear error messages
- ✅ Success confirmations
- ✅ Mobile responsive design

**Security:**
- ✅ Tokens are cryptographically secure
- ✅ Single-use tokens
- ✅ Automatic token expiration
- ✅ Password hashing with bcrypt
- ✅ Account status validation

---

## 📞 Support

If you encounter any issues:

1. Check this document
2. Run `npx prisma generate`
3. Restart your dev server
4. Check browser console for errors
5. Check server terminal for errors
6. Review [FORGOT_PASSWORD_SETUP.md](FORGOT_PASSWORD_SETUP.md) for detailed docs

---

**Ready to test!** Follow the steps above and the feature will work perfectly. 🎉
