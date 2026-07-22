// DUMMY Email Service
// This is a mock implementation for development/testing.
// Replace with real Nodemailer + SMTP configuration in production.

const nodemailer = require('nodemailer');

class EmailService {
  constructor() {
    this.isConfigured = false;
    this.emailUser = process.env.EMAIL_USER;
    this.emailPass = process.env.EMAIL_APP_PASSWORD;
    this.fromName = process.env.EMAIL_FROM_NAME || 'Real Estate CRM';

    if (this.emailUser && this.emailUser !== 'agent@example.com' && this.emailPass) {
      this.isConfigured = true;
      this.transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: this.emailUser,
          pass: this.emailPass.replace(/\s+/g, '') // remove any spaces
        }
      });
    }
  }

  async sendEmail(to, subject, body, attachments = []) {
    if (!this.isConfigured) {
      console.log(`📧 [DUMMY Email] Would send to ${to}: Subject="${subject}"`);
      await new Promise(resolve => setTimeout(resolve, 500));
      return { success: true, messageId: 'dummy', timestamp: new Date().toISOString() };
    }

    try {
      const mailOptions = {
        from: `"${this.fromName}" <${this.emailUser}>`,
        to,
        subject,
        text: body, // plaintext body
        html: `<div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">${body.replace(/\n/g, '<br/>')}</div>`,
        attachments
      };

      const info = await this.transporter.sendMail(mailOptions);
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

  getStatus() {
    return {
      service: 'Email',
      mode: this.isConfigured ? 'LIVE' : 'DUMMY',
      configured: this.isConfigured,
      note: this.isConfigured
        ? 'Connected to Gmail SMTP server'
        : 'Running in DUMMY mode. Please set your actual EMAIL_USER.'
    };
  }
}

module.exports = new EmailService();
