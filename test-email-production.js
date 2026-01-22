// Test email script - reads configuration from .env file
// eslint-disable-next-line @typescript-eslint/no-require-imports
require('dotenv').config();
import { createTransport } from 'nodemailer';

console.log('🔍 Testing Email Configuration from .env file...\n');

// Validate required environment variables
const requiredVars = ['EMAIL_HOST', 'EMAIL_PORT', 'EMAIL_USER', 'EMAIL_PASS', 'ADMIN_EMAIL'];
const missingVars = requiredVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
  console.error('❌ Missing required environment variables:');
  missingVars.forEach(varName => console.error(`   - ${varName}`));
  console.error('\n💡 Make sure your .env file contains all required variables.');
  process.exit(1);
}

console.log('📧 Email Configuration:');
console.log('   Host:', process.env.EMAIL_HOST);
console.log('   Port:', process.env.EMAIL_PORT);
console.log('   Secure:', process.env.EMAIL_SECURE);
console.log('   User:', process.env.EMAIL_USER);
console.log('   Password:', process.env.EMAIL_PASS ? '****** (set)' : '(not set)');
console.log('   Admin Email:', process.env.ADMIN_EMAIL);
console.log('   App Name:', process.env.NEXT_PUBLIC_APP_NAME || 'EMS');
console.log('');

// Create transporter using .env configuration
const transporter = createTransport({
  host: process.env.EMAIL_HOST,
  port: parseInt(process.env.EMAIL_PORT),
  secure: process.env.EMAIL_SECURE === 'true',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
  tls: {
    rejectUnauthorized: false,
  },
  debug: true,
  logger: true,
});

console.log('⏳ Step 1: Verifying SMTP connection...\n');

transporter.verify()
  .then(() => {
    console.log('\n✅ SMTP connection verified successfully!\n');
    console.log('⏳ Step 2: Sending test email...\n');
    
    const appName = process.env.NEXT_PUBLIC_APP_NAME || 'Employee Management System';
    const currentTime = new Date().toLocaleString('en-US', { 
      timeZone: 'Asia/Colombo',
      dateStyle: 'full',
      timeStyle: 'long'
    });
    
    return transporter.sendMail({
      from: `"${appName}" <${process.env.EMAIL_USER}>`,
      to: process.env.ADMIN_EMAIL,
      subject: '✅ Email System Test - Configuration Successful',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
            .success-badge { background: #10b981; color: white; padding: 5px 15px; border-radius: 20px; display: inline-block; font-weight: bold; }
            .info-box { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #667eea; }
            .info-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e5e7eb; }
            .info-row:last-child { border-bottom: none; }
            .label { font-weight: bold; color: #6b7280; }
            .value { color: #111827; }
            .footer { text-align: center; color: #6b7280; font-size: 12px; margin-top: 20px; }
            .emoji { font-size: 48px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="emoji">🎉</div>
              <h1 style="margin: 10px 0;">Email System Test</h1>
              <span class="success-badge">✓ Configuration Successful</span>
            </div>
            
            <div class="content">
              <p>Congratulations! Your email system is properly configured and working correctly.</p>
              
              <div class="info-box">
                <h3 style="margin-top: 0; color: #667eea;">📊 Configuration Details</h3>
                <div class="info-row">
                  <span class="label">SMTP Server:</span>
                  <span class="value">${process.env.EMAIL_HOST}</span>
                </div>
                <div class="info-row">
                  <span class="label">Port:</span>
                  <span class="value">${process.env.EMAIL_PORT} (${process.env.EMAIL_SECURE === 'true' ? 'SSL' : 'STARTTLS'})</span>
                </div>
                <div class="info-row">
                  <span class="label">Sender Email:</span>
                  <span class="value">${process.env.EMAIL_USER}</span>
                </div>
                <div class="info-row">
                  <span class="label">Test Sent To:</span>
                  <span class="value">${process.env.ADMIN_EMAIL}</span>
                </div>
                <div class="info-row">
                  <span class="label">Application:</span>
                  <span class="value">${appName}</span>
                </div>
                <div class="info-row">
                  <span class="label">Test Time:</span>
                  <span class="value">${currentTime}</span>
                </div>
              </div>
              
              <div style="background: #ecfdf5; border: 1px solid #10b981; border-radius: 8px; padding: 15px; margin: 20px 0;">
                <strong style="color: #047857;">✓ All Email Features Ready:</strong>
                <ul style="margin: 10px 0; padding-left: 20px; color: #065f46;">
                  <li>Employee notifications</li>
                  <li>Leave request emails</li>
                  <li>Birthday wishes</li>
                  <li>Password reset emails</li>
                  <li>Admin notifications</li>
                </ul>
              </div>
              
              <p style="color: #6b7280; font-size: 14px; margin-top: 20px;">
                This is an automated test message. If you received this email, your SMTP configuration is working perfectly!
              </p>
            </div>
            
            <div class="footer">
              <p>Powered by ${appName}</p>
              <p style="margin: 5px 0;">Employee Management System</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
Email System Test - Configuration Successful
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Your email system is properly configured and working correctly!

Configuration Details:
- SMTP Server: ${process.env.EMAIL_HOST}
- Port: ${process.env.EMAIL_PORT}
- Sender: ${process.env.EMAIL_USER}
- Test Sent To: ${process.env.ADMIN_EMAIL}
- Application: ${appName}
- Test Time: ${currentTime}

✓ All email features are now active and ready to use.

This is an automated test message from your Employee Management System.
      `,
    });
  })
  .then((info) => {
    console.log('\n✅ Test email sent successfully!\n');
    console.log('📨 Email Details:');
    console.log('   Message ID:', info.messageId);
    console.log('   Response:', info.response);
    console.log('   From:', process.env.EMAIL_USER);
    console.log('   To:', process.env.ADMIN_EMAIL);
    console.log('');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🎉 SUCCESS! All tests passed!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('');
    console.log('✓ SMTP connection verified');
    console.log('✓ Email sent successfully');
    console.log('✓ Configuration is correct');
    console.log('');
    console.log('💡 Check', process.env.ADMIN_EMAIL, 'for the test email.');
    console.log('');
  })
  .catch((error) => {
    console.error('\n❌ Error occurred:\n');
    console.error('Error Message:', error.message);
    console.error('');
    
    console.error('🔍 Troubleshooting Guide:');
    console.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    if (error.message.includes('ETIMEDOUT')) {
      console.error('');
      console.error('⚠️  Network Timeout');
      console.error('   → SMTP ports may be blocked by your ISP or firewall');
      console.error('   → Common in local development environments');
      console.error('   → Try running this script on your production server');
      console.error('   → Test with: ssh your-server "cd /path && node test-email-production.js"');
    } else if (error.message.includes('EAUTH') || error.message.includes('Invalid login')) {
      console.error('');
      console.error('⚠️  Authentication Failed');
      console.error('   → Check EMAIL_USER:', process.env.EMAIL_USER);
      console.error('   → Verify EMAIL_PASS is correct');
      console.error('   → Ensure email account exists in cPanel');
      console.error('   → Check if SMTP is enabled for this account');
    } else if (error.message.includes('ECONNREFUSED')) {
      console.error('');
      console.error('⚠️  Connection Refused');
      console.error('   → SMTP server may be down');
      console.error('   → Check if EMAIL_HOST is correct:', process.env.EMAIL_HOST);
      console.error('   → Verify EMAIL_PORT:', process.env.EMAIL_PORT);
    } else if (error.message.includes('ENOTFOUND')) {
      console.error('');
      console.error('⚠️  Host Not Found');
      console.error('   → EMAIL_HOST may be incorrect:', process.env.EMAIL_HOST);
      console.error('   → Check DNS settings');
      console.error('   → Verify domain is active');
    } else {
      console.error('');
      console.error('⚠️  Unknown Error');
      console.error('   Full error details:');
      console.error('   ', error);
    }
    
    console.error('');
    console.error('📝 Current Configuration:');
    console.error('   EMAIL_HOST:', process.env.EMAIL_HOST);
    console.error('   EMAIL_PORT:', process.env.EMAIL_PORT);
    console.error('   EMAIL_SECURE:', process.env.EMAIL_SECURE);
    console.error('   EMAIL_USER:', process.env.EMAIL_USER);
    console.error('');
    
    process.exit(1);
  });
