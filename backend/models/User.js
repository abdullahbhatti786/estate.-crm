const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true },
  email: { type: String, unique: true },
  full_name: { type: String, required: true },
  password_hash: { type: String, required: true },
  role: { type: String, required: true, default: 'agent' },
  is_active: { type: Number, required: true, default: 1 },
  // Integrations
  gmail_email: { type: String },
  gmail_app_password: { type: String },
  whatsapp_access_token: { type: String },
  whatsapp_phone_number_id: { type: String }
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

// Remove password_hash from JSON
userSchema.set('toJSON', {
  transform: function (doc, ret, options) {
    ret.id = ret._id;
    delete ret._id;
    delete ret.__v;
    delete ret.password_hash;
    delete ret.gmail_app_password;
    delete ret.whatsapp_access_token;
    return ret;
  }
});

module.exports = mongoose.model('User', userSchema);
