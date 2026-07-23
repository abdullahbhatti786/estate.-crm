const express = require('express');
const MessageLog = require('../models/MessageLog');
const User = require('../models/User');
const whatsappService = require('../services/whatsappService');
const emailService = require('../services/emailService');

const router = express.Router();

// Helper: Replace {{placeholders}} in message template
function replacePlaceholders(template, contact) {
  return template
    .replace(/\{\{name\}\}/gi, contact.name || '')
    .replace(/\{\{phone\}\}/gi, contact.phone || '')
    .replace(/\{\{email\}\}/gi, contact.email || '');
}

// POST /api/messages/whatsapp — Send bulk WhatsApp messages (DUMMY)
router.post('/whatsapp', async (req, res) => {
  try {
    const { contacts, message, source_table, attachments } = req.body;

    if (!contacts || !Array.isArray(contacts) || contacts.length === 0) {
      return res.status(400).json({ error: 'No contacts provided' });
    }
    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    const user = await User.findById(req.session.user.id);
    const credentials = {
      phoneNumberId: user.whatsapp_phone_number_id,
      accessToken: user.whatsapp_access_token
    };

    const results = [];
    const delayMs = parseInt(process.env.WHATSAPP_DELAY_MS) || 3000;

    for (const contact of contacts) {
      const personalizedMessage = replacePlaceholders(message, contact);

      const log = await MessageLog.create({
        contact_name: contact.name,
        contact_value: contact.phone,
        channel: 'whatsapp',
        message: personalizedMessage,
        status: 'queued',
        source_table: source_table || null,
        source_id: contact.id ? String(contact.id) : null,
        sent_by: req.session.user?.id
      });

      try {
        const result = await whatsappService.sendMessage(contact.phone, personalizedMessage, attachments, credentials);
        await MessageLog.findByIdAndUpdate(log._id, { status: 'sent' });
        results.push({ contact: contact.name, status: 'sent', messageId: result.messageId });
      } catch (err) {
        await MessageLog.findByIdAndUpdate(log._id, { status: 'failed', error_message: err.message });
        results.push({ contact: contact.name, status: 'failed', error: err.message });
      }

      if (contacts.indexOf(contact) < contacts.length - 1) {
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }

    const sent = results.filter(r => r.status === 'sent').length;
    const failed = results.filter(r => r.status === 'failed').length;

    res.json({
      success: true,
      summary: { total: contacts.length, sent, failed },
      results,
      mode: whatsappService.getStatus(credentials).mode
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/messages/email — Send bulk emails (DUMMY)
router.post('/email', async (req, res) => {
  try {
    const { contacts, subject, message, source_table, attachments } = req.body;

    if (!contacts || !Array.isArray(contacts) || contacts.length === 0) {
      return res.status(400).json({ error: 'No contacts provided' });
    }
    if (!message || !subject) {
      return res.status(400).json({ error: 'Subject and message are required' });
    }

    const user = await User.findById(req.session.user.id);
    const credentials = {
      senderName: user.gmail_sender_name || user.full_name,
      email: user.gmail_email,
      password: user.gmail_app_password
    };

    const results = [];
    const delayMs = parseInt(process.env.EMAIL_DELAY_MS) || 1000;

    for (const contact of contacts) {
      const personalizedMessage = replacePlaceholders(message, contact);
      const personalizedSubject = replacePlaceholders(subject, contact);

      const log = await MessageLog.create({
        contact_name: contact.name,
        contact_value: contact.email,
        channel: 'email',
        message: personalizedMessage,
        status: 'queued',
        source_table: source_table || null,
        source_id: contact.id ? String(contact.id) : null,
        sent_by: req.session.user?.id
      });

      try {
        const result = await emailService.sendEmail(contact.email, personalizedSubject, personalizedMessage, attachments, credentials);
        await MessageLog.findByIdAndUpdate(log._id, { status: 'sent' });
        results.push({ contact: contact.name, status: 'sent', messageId: result.messageId });
      } catch (err) {
        await MessageLog.findByIdAndUpdate(log._id, { status: 'failed', error_message: err.message });
        results.push({ contact: contact.name, status: 'failed', error: err.message });
      }

      if (contacts.indexOf(contact) < contacts.length - 1) {
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }

    const sent = results.filter(r => r.status === 'sent').length;
    const failed = results.filter(r => r.status === 'failed').length;

    res.json({
      success: true,
      summary: { total: contacts.length, sent, failed },
      results,
      mode: emailService.getStatus(credentials).mode
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/messages/logs
router.get('/logs', async (req, res) => {
  try {
    const { channel, status, page = 1, limit = 20 } = req.query;
    
    let query = {};
    query.sent_by = req.session.user?.id;
    if (channel && channel !== 'All') query.channel = channel;
    if (status && status !== 'All') query.status = status;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const logs = await MessageLog.find(query)
      .sort({ sent_at: -1 })
      .skip(skip)
      .limit(parseInt(limit));
      
    const total = await MessageLog.countDocuments(query);

    res.json({
      logs,
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / parseInt(limit))
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/messages/status — Check service status
router.get('/status', (req, res) => {
  res.json({
    whatsapp: whatsappService.getStatus(),
    email: emailService.getStatus()
  });
});

module.exports = router;
