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
      // Use Brevo API instead of Nodemailer
      const response = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'accept': 'application/json',
          'api-key': password.trim(), // The Brevo API key is stored in the password field
          'content-type': 'application/json'
        },
        body: JSON.stringify({
          sender: {
            name: senderName || 'Real Estate CRM',
            email: email
          },
          to: [
            { email: to }
          ],
          subject: subject,
          htmlContent: `<div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">${body.replace(/\n/g, '<br/>')}</div>`,
          textContent: body,
          attachment: attachments.length > 0 ? attachments.map(att => ({
            name: att.filename,
            // Need to convert local file paths to base64 or URL for Brevo if they were local,
            // but in this CRM we usually don't send local attachments via emailService (or if we do, they are handled differently).
            // For now we'll pass URLs if available.
            url: att.path
          })) : undefined
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to send via Brevo API');
      }

      const info = await response.json();
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
        ? 'Connected to Brevo API'
        : 'Running in DUMMY mode. Please set your Brevo credentials in Settings.'
    };
  }
}

module.exports = new EmailService();
