const express = require('express');
const PaymentInstallment = require('../models/PaymentInstallment');
const Property = require('../models/Property');

const router = express.Router();

// GET /api/payments/upcoming
router.get('/upcoming', async (req, res) => {
  try {
    const payments = await PaymentInstallment.find({
      status: { $in: ['Due', 'Overdue'] }
    })
    .populate('property_id', 'apartment_unit tenant_name owner_name')
    .sort({ due_date: 1 });

    const formattedPayments = payments.map(p => ({
      id: p._id,
      amount: p.amount,
      due_date: p.due_date,
      payment_mode: p.payment_mode,
      status: p.status,
      apartment_unit: p.property_id?.apartment_unit,
      tenant_name: p.property_id?.tenant_name,
      owner_name: p.property_id?.owner_name
    }));

    res.json({ success: true, payments: formattedPayments });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/payments/:id/status
router.put('/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    if (!['Paid', 'Due', 'Overdue'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }
    
    const payment = await PaymentInstallment.findByIdAndUpdate(req.params.id, { status }, { new: true });
    
    if (!payment) {
      return res.status(404).json({ error: 'Payment not found' });
    }
    
    // Sync back to Property
    const allInstallments = await PaymentInstallment.find({ property_id: payment.property_id }).sort({ due_date: 1 });
    const mappedSchedule = allInstallments.map(p => ({
      amount: p.amount,
      date: p.due_date,
      mode: p.payment_mode,
      status: p.status
    }));
    await Property.findByIdAndUpdate(payment.property_id, { payment_schedule: mappedSchedule });
    
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/payments/:id
router.put('/:id', async (req, res) => {
  try {
    const { amount, due_date, status, payment_mode } = req.body;
    
    const updateData = {};
    if (amount !== undefined) updateData.amount = amount;
    if (due_date !== undefined) updateData.due_date = new Date(due_date);
    if (status !== undefined) updateData.status = status;
    if (payment_mode !== undefined) updateData.payment_mode = payment_mode;

    const payment = await PaymentInstallment.findByIdAndUpdate(req.params.id, updateData, { new: true });
    
    if (!payment) {
      return res.status(404).json({ error: 'Payment not found' });
    }
    
    // Sync back to Property
    const allInstallments = await PaymentInstallment.find({ property_id: payment.property_id }).sort({ due_date: 1 });
    const mappedSchedule = allInstallments.map(p => ({
      amount: p.amount,
      date: p.due_date,
      mode: p.payment_mode,
      status: p.status
    }));
    await Property.findByIdAndUpdate(payment.property_id, { payment_schedule: mappedSchedule });
    
    res.json({ success: true, payment });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
