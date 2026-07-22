const mongoose = require('mongoose');

const messageLogSchema = new mongoose.Schema({
  contact_name: { type: String, required: true },
  contact_value: { type: String, required: true },
  channel: { type: String, required: true },
  message: { type: String, required: true },
  status: { type: String, required: true, default: 'queued' },
  error_message: { type: String },
  source_table: { type: String },
  source_id: { type: String },
  sent_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: { createdAt: 'sent_at', updatedAt: false } });

messageLogSchema.set('toJSON', {
  transform: function (doc, ret, options) {
    ret.id = ret._id;
    delete ret._id;
    delete ret.__v;
    return ret;
  }
});

module.exports = mongoose.model('MessageLog', messageLogSchema);
