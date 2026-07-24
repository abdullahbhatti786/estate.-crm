const axios = require('axios');
const { uploadToCloudinary } = require('../utils/cloudinary');

class WhatsAppService {
  async sendMessage(to, text, attachments = [], credentials = {}) {
    const { phoneNumberId, accessToken } = credentials;
    const isConfigured = phoneNumberId && accessToken && phoneNumberId !== 'DUMMY_PHONE_ID';

    if (!isConfigured) {
      // DUMMY fallback
      console.log(`📱 [DUMMY WhatsApp] Sending to ${to}: "${text}"`);
      await new Promise(resolve => setTimeout(resolve, 500));
      return {
        success: true,
        messageId: `wamid_dummy_${Date.now()}`,
        timestamp: new Date().toISOString()
      };
    }

    // Prepare API request to Meta
    const url = `https://graph.facebook.com/${process.env.WHATSAPP_API_VERSION || 'v19.0'}/${phoneNumberId}/messages`;
    const headers = {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    };

    // If we have an attachment (from Cloudinary or similar URL)
    if (attachments && attachments.length > 0) {
      // In this CRM, we typically handle 1 attachment at a time for direct chat
      const attachment = attachments[0]; 
      
      let type = 'document';
      if (attachment.media_type) {
        type = attachment.media_type; // 'image', 'audio', 'video', 'document'
      }

      const mediaPayload = {
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: to,
        type: type,
        [type]: {
          link: attachment.media_url,
          caption: text || '' // Audio doesn't support caption natively in all cases, but image/video does.
        }
      };

      try {
        const response = await axios.post(url, mediaPayload, { headers });
        return {
          success: true,
          messageId: response.data?.messages?.[0]?.id,
          timestamp: new Date().toISOString()
        };
      } catch (err) {
        console.error('WhatsApp API Media Error:', err.response?.data || err.message);
        throw new Error(err.response?.data?.error?.message || 'Failed to send WhatsApp media message');
      }
    }

    // Text only message
    if (!text) {
      throw new Error('Message text or attachment is required');
    }

    const payload = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: to,
      type: 'text',
      text: { body: text }
    };

    try {
      const response = await axios.post(url, payload, { headers });
      return {
        success: true,
        messageId: response.data?.messages?.[0]?.id,
        timestamp: new Date().toISOString()
      };
    } catch (err) {
      console.error('WhatsApp API Error:', err.response?.data || err.message);
      throw new Error(err.response?.data?.error?.message || 'Failed to send WhatsApp message');
    }
  }

  // Download incoming media from Meta and upload to Cloudinary
  async downloadAndUploadMedia(mediaId, accessToken) {
    try {
      // 1. Get Media URL
      const mediaInfoUrl = `https://graph.facebook.com/${process.env.WHATSAPP_API_VERSION || 'v19.0'}/${mediaId}`;
      const infoResponse = await axios.get(mediaInfoUrl, {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      });
      
      const downloadUrl = infoResponse.data.url;
      const mimeType = infoResponse.data.mime_type;
      
      // 2. Download Media File Buffer
      const fileResponse = await axios.get(downloadUrl, {
        headers: { 'Authorization': `Bearer ${accessToken}` },
        responseType: 'arraybuffer'
      });
      
      // 3. Upload to Cloudinary
      let resourceType = 'auto';
      if (mimeType.startsWith('image/')) resourceType = 'image';
      else if (mimeType.startsWith('video/')) resourceType = 'video';
      else if (mimeType.startsWith('audio/') || mimeType.includes('ogg')) resourceType = 'video'; // Cloudinary handles audio as video resource_type in some cases, but 'auto' works best.

      const uploadResult = await uploadToCloudinary(fileResponse.data, 'auto');
      
      let mediaType = 'document';
      if (mimeType.startsWith('image/')) mediaType = 'image';
      else if (mimeType.startsWith('audio/') || mimeType.includes('ogg')) mediaType = 'audio';
      else if (mimeType.startsWith('video/')) mediaType = 'video';

      return {
        media_url: uploadResult.secure_url,
        media_type: mediaType
      };
    } catch (err) {
      console.error('Failed to process incoming WhatsApp media:', err.response?.data || err.message);
      return null;
    }
  }

  getStatus(credentials = {}) {
    const isConfigured = credentials.phoneNumberId && credentials.accessToken && credentials.phoneNumberId !== 'DUMMY_PHONE_ID';
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
