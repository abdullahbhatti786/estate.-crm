const mongoose = require('mongoose');

const leadSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String },
  phone: { type: String, required: true },
  description: { type: String },
  status: { type: String, required: true, default: 'New' },
  source: { type: String, required: true, default: 'Manual' },
  follow_up_date: { type: Date },
  is_deleted: { type: Number, required: true, default: 0 },
  created_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

leadSchema.set('toJSON', {
  transform: function (doc, ret, options) {
    ret.id = ret._id;
    delete ret._id;
    delete ret.__v;
    return ret;
  }
});

module.exports = mongoose.model('Lead', leadSchema);
