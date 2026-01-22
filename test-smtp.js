import { createTransport } from 'nodemailer';

console.log('🔍 Testing SMTP Connection to LankaHost...\n');

const transporter = createTransport({
  host: 'mail.uniquein.lk',
  port: 587,
  secure: false, // Use STARTTLS
  auth: {
    user: 'hr@uniquein.lk',
    pass: 'UniqueHR2026',
  },
  tls: {
    rejectUnauthorized: false,
  },
  debug: true,
  logger: true,
});

console.log('📧 Configuration:');
console.log('   Host: mail.uniquein.lk');
console.log('   Port: 587 (STARTTLS)');
console.log('   User: hr@uniquein.lk');
console.log('   To: renujajanith7671@gmail.com\n');

console.log('⏳ Step 1: Verifying SMTP connection...');
transporter.verify()
  .then(() => {
    console.log('✅ SMTP connection verified!\n');
    console.log('⏳ Step 2: Sending test email...');
    
    return transporter.sendMail({
      from: '"Unique Industrial Solutions" <hr@uniquein.lk>',
      to: 'renujajanith7671@gmail.com',
      subject: '✅ Email System Test - Success',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2563eb;">🎉 Email System Working!</h2>
          <p>This is a test email from your Employee Management System.</p>
          <p><strong>Configuration Details:</strong></p>
          <ul>
            <li>SMTP Server: mail.uniquein.lk</li>
            <li>Port: 587 (STARTTLS)</li>
            <li>From: hr@uniquein.lk</li>
          </ul>
          <p>✅ Your email system is properly configured and working!</p>
          <hr>
          <p style="color: #666; font-size: 12px;">
            Sent on ${new Date().toLocaleString()}
          </p>
        </div>
      `,
      text: 'Email system test successful! Your SMTP configuration is working correctly.',
    });
  })
  .then((info) => {
    console.log('✅ Email sent successfully!\n');
    console.log('📨 Details:');
    console.log('   Message ID:', info.messageId);
    console.log('   Response:', info.response);
    console.log('\n🎉 All tests passed! Email system is working correctly.');
    console.log('\n📝 Note: This will work on production server but may fail locally due to ISP blocking SMTP ports.');
  })
  .catch((error) => {
    console.error('\n❌ Error:', error.message);
    console.error('\n🔍 Troubleshooting:');
    
    if (error.message.includes('ETIMEDOUT')) {
      console.error('   → Network timeout - SMTP ports may be blocked by your ISP');
      console.error('   → This is normal for local development in Sri Lanka');
      console.error('   → Email will work when deployed to production server');
    } else if (error.message.includes('auth')) {
      console.error('   → Authentication failed - check username/password');
    } else {
      console.error('   → Unknown error:', error);
    }
  });

