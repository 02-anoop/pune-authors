const nodemailer = require('nodemailer');
let mailTransporter;
if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
  mailTransporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS }
  });
} else {
  mailTransporter = nodemailer.createTransport({ streamTransport: true, newline: 'windows' });
}
const sendNotificationEmail = async (to, subject, htmlBody) => {
  if (!to) return;
  try {
    const textBody = htmlBody.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
    if (mailTransporter && process.env.EMAIL_USER) {
      await mailTransporter.sendMail({
        from: '"Pune Authors\' Association" <noreply@puneauthors.com>',
        to, 
        subject, 
        html: htmlBody, 
        text: textBody,
      });
      console.log(`[EMAIL SENT] to ${to}: ${subject}`);
    } else {
      console.warn('No email transport configured.');
    }
    
    const otpMatch = htmlBody.match(/<h2[^>]*>(\d{6})<\/h2>/);
    if (otpMatch) {
      console.log(`\n========================================`);
      console.log(`🔑 DEV MODE OTP: ${otpMatch[1]}`);
      console.log(`========================================\n`);
    }
  } catch (err) {
    console.error('Email failed:', err.response?.data || err.message);
  }
};
const emailWrap = (heading, content) => `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><style>
  body { font-family: 'Segoe UI', Arial, sans-serif; background: #f4f4f8; margin: 0; padding: 0; color: #222; }
  .wrap { max-width: 600px; margin: 32px auto; background: #fff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,.08); }
  .header { background: #1a1a2e; color: #fff; padding: 28px 32px; }
  .header h1 { margin: 0; font-size: 22px; font-weight: 700; }
  .header p { margin: 6px 0 0; font-size: 13px; color: #94a3b8; }
  .body { padding: 32px; }
  .body h2 { margin: 0 0 8px; font-size: 18px; color: #1a1a2e; }
  .body p { margin: 0 0 16px; font-size: 15px; line-height: 1.65; color: #444; }
  table { width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 14px; }
  th { background: #f0f4ff; color: #1a1a2e; text-align: left; padding: 10px 14px; font-size: 12px; text-transform: uppercase; letter-spacing: .04em; }
  td { padding: 10px 14px; border-bottom: 1px solid #f0f0f4; vertical-align: top; }
  .badge { display: inline-block; background: #22c55e; color: #fff; font-size: 12px; font-weight: 700; padding: 4px 12px; border-radius: 20px; }
  .footer { padding: 20px 32px; font-size: 12px; color: #94a3b8; border-top: 1px solid #f0f0f4; }
</style></head>
<body>
  <div class="wrap">
    <div class="header"><h1>Pune Authors' Association</h1><p><a href="https://main.defgy33rjp0v1.amplifyapp.com/" style="color: #6366f1; text-decoration: none;">main.defgy33rjp0v1.amplifyapp.com</a></p></div>
    <div class="body">
      <h2>${heading}</h2>
      ${content}
      <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #f0f0f4; text-align: center;">
        <a href="https://main.defgy33rjp0v1.amplifyapp.com/dashboard" style="display: inline-block; background-color: #1a1a2e; color: #ffffff; text-decoration: none; padding: 14px 28px; font-weight: 700; border-radius: 8px; font-size: 14px; box-shadow: 0 4px 12px rgba(26,26,46,0.15);">Access Your Author Dashboard</a>
      </div>
    </div>
    <div class="footer">This is an automated message from the PAA platform. Please do not reply directly to this email.</div>
  </div>
</body></html>`;
module.exports = { sendNotificationEmail, emailWrap };
