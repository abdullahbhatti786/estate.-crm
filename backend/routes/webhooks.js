const express = require('express');
const User = require('../models/User');
const ChatThread = require('../models/ChatThread');
const ChatMessage = require('../models/ChatMessage');
const Lead = require('../models/Lead');
const Property = require('../models/Property');

const router = express.Router();

// GET /api/webhooks/whatsapp — Meta Webhook Verification
router.get('/whatsapp', (req, res) => {
  const verify_token = process.env.WHATSAPP_VERIFY_TOKEN || 'nexus_crm_webhook_secret';
  
  let mode = req.query['hub.mode'];
  let token = req.query['hub.verify_token'];
  let challenge = req.query['hub.challenge'];

  if (mode && token) {
    if (mode === 'subscribe' && token === verify_token) {
      console.log('✅ WEBHOOK_VERIFIED');
      res.status(200).send(challenge);
    } else {
      res.sendStatus(403);
    }
  } else {
    res.sendStatus(400);
  }
});

// POST /api/webhooks/whatsapp — Receive incoming messages
router.post('/whatsapp', async (req, res) => {
  try {
    const body = req.body;

    if (body.object) {
      if (body.entry && body.entry[0].changes && body.entry[0].changes[0].value.messages && body.entry[0].changes[0].value.messages[0]) {
        const metadata = body.entry[0].changes[0].value.metadata;
        const message = body.entry[0].changes[0].value.messages[0];
        const contact = body.entry[0].changes[0].value.contacts[0];
        
        const displayPhoneNumber = metadata.display_phone_number; // The number the message was sent TO (Agent's number)
        const phoneNumberId = metadata.phone_number_id; // Meta's ID for the Agent's number
        const fromNumber = message.from; // The number the message was sent FROM (Lead's number)
        const messageId = message.id;
        
        let messageText = '';
        if (message.type === 'text') {
          messageText = message.text.body;
        } else {
          messageText = `[${message.type} message]`; // Handle audio/image later if needed
        }

        // Find which User owns this phone_number_id
        const user = await User.findOne({ whatsapp_phone_number_id: phoneNumberId });
        if (!user) {
          console.log(`⚠️ Webhook received for unknown phone_number_id: ${phoneNumberId}`);
          return res.sendStatus(200);
        }

        // Check if we know this contact (Lead or Tenant) belonging to this user
        let contactName = contact.profile?.name || fromNumber;
        const knownLead = await Lead.findOne({ created_by: user._id, phone: { $regex: fromNumber.replace(/[^0-9]/g, ''), $options: 'i' } });
        const knownTenant = await Property.findOne({ created_by: user._id, tenant_phone: { $regex: fromNumber.replace(/[^0-9]/g, ''), $options: 'i' } });

        if (knownLead) contactName = knownLead.name;
        else if (knownTenant) contactName = knownTenant.tenant_name;

        // Find or create ChatThread
        let thread = await ChatThread.findOne({ user: user._id, contact_number: fromNumber });
        if (!thread) {
          thread = await ChatThread.create({
            user: user._id,
            contact_number: fromNumber,
            contact_name: contactName,
            last_message: messageText,
            unread_count: 1
          });
        } else {
          // Update existing thread
          thread.last_message = messageText;
          thread.last_message_at = Date.now();
          thread.unread_count += 1;
          if (knownLead || knownTenant) thread.contact_name = contactName; // update name if they were added later
          await thread.save();
        }

        // Create ChatMessage
        await ChatMessage.create({
          thread: thread._id,
          sender: 'lead',
          message: messageText,
          message_id: messageId,
          status: 'delivered'
        });

        console.log(`📩 New message from ${contactName} to ${user.full_name}: ${messageText}`);
      }
      res.sendStatus(200);
    } else {
      res.sendStatus(404);
    }
  } catch (err) {
    console.error('❌ Webhook error:', err);
    res.sendStatus(500);
  }
});

module.exports = router;
