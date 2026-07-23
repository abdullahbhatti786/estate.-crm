const mongoose = require('mongoose');

const chatMessageSchema = new mongoose.Schema({
  thread: { type: mongoose.Schema.Types.ObjectId, ref: 'ChatThread', required: true },
  sender: { type: String, enum: ['agent', 'lead'], required: true },
  message: { type: String, required: true },
  message_id: { type: String }, // Meta WhatsApp message ID
  status: { type: String, default: 'sent' }, // sent, delivered, read (for agent messages)
  timestamp: { type: Date, default: Date.now }
}, { timestamps: { createdAt: 'created_at', updatedAt: false } });

chatMessageSchema.index({ thread: 1, timestamp: -1 });

chatMessageSchema.set('toJSON', {
  transform: function (doc, ret, options) {
    ret.id = ret._id;
    delete ret._id;
    delete ret.__v;
    return ret;
  }
});

module.exports = mongoose.model('ChatMessage', chatMessageSchema);
