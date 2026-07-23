// DUMMY WhatsApp Service
// This is a mock implementation for development/testing.
// Replace with real Meta WhatsApp Cloud API calls in production.

class WhatsAppService {
  async sendMessage(to, message, attachments = [], credentials = {}) {
    const { phoneNumberId, accessToken } = credentials;
    const isConfigured = phoneNumberId && accessToken;
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

  getStatus(credentials = {}) {
    const isConfigured = credentials.phoneNumberId && credentials.accessToken;
    return {
      service: 'WhatsApp',
      mode: isConfigured ? 'LIVE' : 'DUMMY',
      configured: !!isConfigured,
      note: isConfigured
        ? 'Connected to Meta WhatsApp Cloud API'
        : 'Running in DUMMY mode. Please configure your integration settings.'
    };
  }
}

module.exports = new WhatsAppService();
