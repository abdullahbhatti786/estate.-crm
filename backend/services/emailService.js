// DUMMY Email Service
// This is a mock implementation for development/testing.
// Replace with real Nodemailer + SMTP configuration in production.

const nodemailer = require('nodemailer');

class EmailService {
  async sendEmail(to, subject, body, attachments = [], credentials = {}) {
    const { email, password, senderName } = credentials;
    const isConfigured = email && password;
    if (!isConfigured) {
      console.log(`📧 [DUMMY Email] Would send to ${to}: Subject="${subject}"`);
      await new Promise(resolve => setTimeout(resolve, 500));
      return { success: true, messageId: 'dummy', timestamp: new Date().toISOString() };
    }

    try {
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: email,
          pass: password.replace(/\s+/g, '')
        }
      });

      const mailOptions = {
        from: `"${senderName || 'Real Estate CRM'}" <${email}>`,
        to,
        subject,
        text: body, // plaintext body
        html: `<div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">${body.replace(/\n/g, '<br/>')}</div>`,
        attachments
      };

      const info = await transporter.sendMail(mailOptions);
      console.log(`✅ [Email] Sent to ${to}. MessageID: ${info.messageId}`);
      
      return {
        success: true,
        messageId: info.messageId,
        timestamp: new Date().toISOString()
      };
    } catch (err) {
      console.error(`❌ [Email] Failed to send to ${to}:`, err.message);
      throw err;
    }
  }

  getStatus(credentials = {}) {
    const isConfigured = credentials.email && credentials.password;
    return {
      service: 'Email',
      mode: isConfigured ? 'LIVE' : 'DUMMY',
      configured: !!isConfigured,
      note: isConfigured
        ? 'Connected to Gmail SMTP server'
        : 'Running in DUMMY mode. Please set your actual EMAIL_USER.'
    };
  }
}

module.exports = new EmailService();
