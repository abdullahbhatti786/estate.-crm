const express = require('express');
const PaymentInstallment = require('../models/PaymentInstallment');

const router = express.Router();

// GET /api/payments/upcoming
router.get('/upcoming', async (req, res) => {
  try {
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

    const payments = await PaymentInstallment.find({
      status: { $in: ['Due', 'Overdue'] },
      due_date: { $lte: thirtyDaysFromNow }
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
    
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
