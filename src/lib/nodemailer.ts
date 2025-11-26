// src/lib/nodemailer.ts
import nodemailer from 'nodemailer';

// Create reusable transporter
export const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.EMAIL_PORT || '587'),
  secure: process.env.EMAIL_SECURE === 'true', // true for 465, false for other ports
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Verify transporter configuration
export async function verifyEmailConfig() {
  try {
    await transporter.verify();
    console.log('Email server is ready to send messages');
    return true;
  } catch (error) {
    console.error('Email server verification failed:', error);
    return false;
  }
}

// Send birthday email
export async function sendBirthdayEmail(
  recipientEmail: string,
  recipientName: string,
  senderName: string = 'Unique Industrial Solutions'
) {
  const mailOptions = {
    from: `"${senderName}" <${process.env.EMAIL_USER}>`,
    to: recipientEmail,
    subject: '🎉 Happy Birthday! 🎂',
    html: getBirthdayEmailTemplate(recipientName),
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('Birthday email sent:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Error sending birthday email:', error);
    return { success: false, error };
  }
}

// Birthday email HTML template
function getBirthdayEmailTemplate(recipientName: string): string {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Happy Birthday</title>
      <style>
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          margin: 0;
          padding: 0;
          background-color: #f4f4f4;
        }
        .container {
          max-width: 600px;
          margin: 40px auto;
          background-color: #ffffff;
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        }
        .header {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 40px 20px;
          text-align: center;
        }
        .header h1 {
          margin: 0;
          font-size: 36px;
          font-weight: bold;
        }
        .emoji {
          font-size: 64px;
          margin: 20px 0;
        }
        .content {
          padding: 40px 30px;
          color: #333;
        }
        .content h2 {
          color: #667eea;
          font-size: 24px;
          margin-bottom: 20px;
        }
        .content p {
          font-size: 16px;
          line-height: 1.6;
          color: #555;
        }
        .message-box {
          background-color: #f8f9ff;
          border-left: 4px solid #667eea;
          padding: 20px;
          margin: 30px 0;
          border-radius: 4px;
        }
        .footer {
          background-color: #f8f9fa;
          padding: 30px;
          text-align: center;
          color: #777;
          font-size: 14px;
        }
        .footer strong {
          color: #333;
          display: block;
          margin-bottom: 10px;
          font-size: 16px;
        }
        .celebration {
          text-align: center;
          margin: 30px 0;
        }
        .celebration img {
          max-width: 200px;
          height: auto;
        }
        @media only screen and (max-width: 600px) {
          .container {
            margin: 20px;
          }
          .header h1 {
            font-size: 28px;
          }
          .content {
            padding: 20px 15px;
          }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="emoji">🎉🎂🎈</div>
          <h1>Happy Birthday!</h1>
        </div>

        <div class="content">
          <h2>Dear ${recipientName},</h2>

          <div class="message-box">
            <p style="margin: 0; font-size: 18px; font-weight: 500; color: #667eea;">
              Wishing you a wonderful birthday filled with joy, laughter, and all the things that make you happy!
            </p>
          </div>

          <p>
            On this special day, we want to take a moment to celebrate YOU! Your dedication, hard work,
            and positive energy make our workplace a better place every single day.
          </p>

          <p>
            May this year bring you new opportunities, success in all your endeavors, and moments of
            happiness that you'll cherish forever. We're grateful to have you as part of our team!
          </p>

          <div class="celebration">
            <p style="font-size: 48px; margin: 0;">🎁 🎊 🥳 🎉 🎈</p>
          </div>

          <p style="margin-top: 30px;">
            <strong>Enjoy your special day to the fullest!</strong>
          </p>
        </div>

        <div class="footer">
          <strong>Unique Industrial Solutions</strong>
          <p>Making workplaces better, one day at a time.</p>
          <p style="margin-top: 15px; color: #999; font-size: 12px;">
            This is an automated birthday greeting from the Employee Management System.
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
}

// General email utility
export async function sendEmail(
  to: string,
  subject: string,
  html: string,
  from?: string
) {
  const mailOptions = {
    from: from || `"${process.env.NEXT_PUBLIC_APP_NAME}" <${process.env.EMAIL_USER}>`,
    to,
    subject,
    html,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('Error sending email:', error);
    return { success: false, error };
  }
}
