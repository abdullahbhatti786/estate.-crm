// DUMMY WhatsApp Service
// This is a mock implementation for development/testing.
// Replace with real Meta WhatsApp Cloud API calls in production.

class WhatsAppService {
  constructor() {
    this.isConfigured = false;
    this.phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
    this.accessToken = process.env.WHATSAPP_ACCESS_TOKEN;

    if (this.phoneNumberId && this.phoneNumberId !== 'DUMMY_PHONE_ID') {
      this.isConfigured = true;
    }
  }

  async sendMessage(to, message, attachments = []) {
    // DUMMY: Simulate sending with random success/failure
    const attachmentLog = attachments.length > 0 ? ` [Attached ${attachments.length} files]` : '';
    console.log(`📱 [DUMMY WhatsApp] Sending to ${to}: "${message.substring(0, 50)}..."${attachmentLog}`);

    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 1000));

    // 90% success rate in dummy mode
    const success = Math.random() > 0.1;

    if (success) {
      console.log(`✅ [DUMMY WhatsApp] Message sent to ${to}`);
      return {
        success: true,
        messageId: `wamid_dummy_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date().toISOString()
      };
    } else {
      console.log(`❌ [DUMMY WhatsApp] Failed to send to ${to}`);
      throw new Error('DUMMY: Simulated delivery failure (random 10% failure rate)');
    }
  }

  getStatus() {
    return {
      service: 'WhatsApp',
      mode: this.isConfigured ? 'LIVE' : 'DUMMY',
      configured: this.isConfigured,
      note: this.isConfigured
        ? 'Connected to Meta WhatsApp Cloud API'
        : 'Running in DUMMY mode. Set WHATSAPP_PHONE_NUMBER_ID and WHATSAPP_ACCESS_TOKEN in .env for live messaging.'
    };
  }
}

module.exports = new WhatsAppService();
