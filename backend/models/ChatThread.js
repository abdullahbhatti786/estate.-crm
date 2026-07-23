const mongoose = require('mongoose');

const chatThreadSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // The Admin/Agent who owns the WhatsApp integration
  contact_number: { type: String, required: true }, // The phone number of the lead/client
  contact_name: { type: String, default: 'Unknown Contact' },
  last_message: { type: String },
  last_message_at: { type: Date, default: Date.now },
  unread_count: { type: Number, default: 0 }
}, { timestamps: true });

// Compound index to quickly find a thread by user and contact number
chatThreadSchema.index({ user: 1, contact_number: 1 }, { unique: true });

chatThreadSchema.set('toJSON', {
  transform: function (doc, ret, options) {
    ret.id = ret._id;
    delete ret._id;
    delete ret.__v;
    return ret;
  }
});

module.exports = mongoose.model('ChatThread', chatThreadSchema);
