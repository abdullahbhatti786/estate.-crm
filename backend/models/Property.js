const mongoose = require('mongoose');

const propertySchema = new mongoose.Schema({
  owner_name: { type: String, required: true },
  owner_phone: { type: String, required: true },
  owner_email: { type: String },
  tenant_name: { type: String },
  tenant_phone: { type: String },
  tenant_email: { type: String },
  apartment_unit: { type: String, required: true },
  rent_amount: { type: Number, required: true },
  security_deposit: { type: Number, default: 0 },
  lease_start: { type: Date },
  lease_end: { type: Date },
  payment_status: { type: String, required: true, default: 'Pending' },
  property_status: { type: String, required: true, default: 'Rented' },
  images: { type: String },
  documents: { type: String },
  is_deleted: { type: Number, required: true, default: 0 },
  created_by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

propertySchema.set('toJSON', {
  transform: function (doc, ret, options) {
    ret.id = ret._id;
    delete ret._id;
    delete ret.__v;
    return ret;
  }
});

module.exports = mongoose.model('Property', propertySchema);
