const mongoose = require('mongoose');

const paymentInstallmentSchema = new mongoose.Schema({
  property_id: { type: mongoose.Schema.Types.ObjectId, ref: 'Property', required: true },
  amount: { type: Number, required: true },
  due_date: { type: Date, required: true },
  payment_mode: { type: String, required: true, default: 'Cheque' },
  status: { type: String, required: true, default: 'Due' }
}, { timestamps: { createdAt: 'created_at', updatedAt: 'updated_at' } });

paymentInstallmentSchema.set('toJSON', {
  transform: function (doc, ret, options) {
    ret.id = ret._id;
    delete ret._id;
    delete ret.__v;
    return ret;
  }
});

module.exports = mongoose.model('PaymentInstallment', paymentInstallmentSchema);
