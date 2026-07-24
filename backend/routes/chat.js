const express = require('express');
const ChatThread = require('../models/ChatThread');
const ChatMessage = require('../models/ChatMessage');
const User = require('../models/User');
const whatsappService = require('../services/whatsappService');
const multer = require('multer');
const { uploadToCloudinary } = require('../utils/cloudinary');

const router = express.Router();

const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 3.5 * 1024 * 1024 } // 3.5 MB
});

// GET /api/chat/threads — Get all chat threads for the current user
router.get('/threads', async (req, res) => {
  try {
    const threads = await ChatThread.find({ user: req.session.user.id })
      .sort({ last_message_at: -1 });
    res.json(threads);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/chat/messages/:threadId — Get messages for a specific thread
router.get('/messages/:threadId', async (req, res) => {
  try {
    const thread = await ChatThread.findOne({ _id: req.params.threadId, user: req.session.user.id });
    if (!thread) return res.status(404).json({ error: 'Thread not found' });

    // Mark as read
    if (thread.unread_count > 0) {
      thread.unread_count = 0;
      await thread.save();
    }

    const messages = await ChatMessage.find({ thread: thread._id }).sort({ timestamp: 1 });
    res.json(messages);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/chat/send/:threadId — Send a reply in a thread (Supports text + file)
router.post('/send/:threadId', upload.single('media'), async (req, res) => {
  try {
    const { message } = req.body;
    const file = req.file;

    if (!message && !file) {
      return res.status(400).json({ error: 'Message or media is required' });
    }

    const thread = await ChatThread.findOne({ _id: req.params.threadId, user: req.session.user.id });
    if (!thread) return res.status(404).json({ error: 'Thread not found' });

    const user = await User.findById(req.session.user.id);
    if (!user.whatsapp_phone_number_id || !user.whatsapp_access_token) {
      return res.status(400).json({ error: 'WhatsApp is not configured in Settings' });
    }

    const credentials = {
      phoneNumberId: user.whatsapp_phone_number_id,
      accessToken: user.whatsapp_access_token
    };

    let attachments = [];
    let mediaUrl = null;
    let mediaType = null;

    if (file) {
      // Determine media type based on mimetype
      if (file.mimetype.startsWith('image/')) mediaType = 'image';
      else if (file.mimetype.startsWith('audio/')) mediaType = 'audio';
      else if (file.mimetype.startsWith('video/')) mediaType = 'video';
      else mediaType = 'document';

      const uploadResult = await uploadToCloudinary(file.buffer, 'auto');
      mediaUrl = uploadResult.secure_url;
      
      attachments.push({
        media_url: mediaUrl,
        media_type: mediaType
      });
    }

    // Send via WhatsApp API
    const result = await whatsappService.sendMessage(thread.contact_number, message, attachments, credentials);

    // Save Message to DB
    const chatMsg = await ChatMessage.create({
      thread: thread._id,
      sender: 'agent',
      message: message || (mediaType ? `[${mediaType}]` : ''),
      message_id: result.messageId || 'dummy',
      status: 'sent',
      media_url: mediaUrl,
      media_type: mediaType
    });

    // Update thread
    thread.last_message = message || `[${mediaType}]`;
    thread.last_message_at = Date.now();
    await thread.save();

    res.json(chatMsg);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
