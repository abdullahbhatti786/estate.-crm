const express = require('express');
const Property = require('../models/Property');
const PaymentInstallment = require('../models/PaymentInstallment');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();

// GET /api/properties
router.get('/', async (req, res) => {
  try {
    const { search, payment_status, property_status, page = 1, limit = 20, is_data_working = 'false' } = req.query;
    
    let query = { is_deleted: 0 };
    if (is_data_working === 'true') {
      query.is_data_working = true;
    } else {
      query.$or = [{ is_data_working: false }, { is_data_working: { $exists: false } }];
    }
    
    // Enforce data isolation: All users (including admins) only see their own data
    query.created_by = req.session.user?.id;

    if (payment_status && payment_status !== 'All') {
      query.payment_status = payment_status;
    }

    if (property_status && property_status !== 'All') {
      query.property_status = property_status;
    }

    if (search) {
      query.$or = [
        { owner_name: { $regex: search, $options: 'i' } },
        { owner_phone: { $regex: search, $options: 'i' } },
        { tenant_name: { $regex: search, $options: 'i' } },
        { tenant_phone: { $regex: search, $options: 'i' } },
        { apartment_unit: { $regex: search, $options: 'i' } }
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const properties = await Property.find(query)
      .sort({ created_at: -1 })
      .skip(skip)
      .limit(parseInt(limit));
      
    const total = await Property.countDocuments(query);

    res.json({
      properties,
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / parseInt(limit))
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/properties/:id
router.get('/:id', async (req, res) => {
  try {
    const property = await Property.findById(req.params.id);
    if (!property || property.is_deleted) return res.status(404).json({ error: 'Property not found' });
    res.json({ property });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/properties
router.post('/', async (req, res) => {
  try {
    const {
      owner_name, owner_phone, owner_email,
      apartment_unit, rent_amount, property_status, images
    } = req.body;

    if (!owner_name || !owner_phone || !apartment_unit || rent_amount === undefined) {
      return res.status(400).json({ error: 'Missing required fields (owner_name, owner_phone, apartment_unit, rent_amount)' });
    }

    const property = await Property.create({
      ...req.body,
      is_data_working: req.body.is_data_working === true,
      created_by: req.session.user?.id
    });

    if (req.body.payment_schedule && Array.isArray(req.body.payment_schedule) && req.body.payment_schedule.length > 0) {
      const installments = req.body.payment_schedule.map(p => ({
        property_id: property._id,
        amount: p.amount || property.rent_amount,
        due_date: new Date(p.date || new Date()),
        payment_mode: p.mode || 'Cheque',
        status: p.status || 'Due'
      }));
      await PaymentInstallment.insertMany(installments);
    }

    res.status(201).json({ success: true, property });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/properties/:id
router.put('/:id', async (req, res) => {
  try {
    const property = await Property.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!property || property.is_deleted) return res.status(404).json({ error: 'Property not found' });

    if (req.body.payment_schedule && Array.isArray(req.body.payment_schedule)) {
      await PaymentInstallment.deleteMany({ property_id: property._id });
      if (req.body.payment_schedule.length > 0) {
        const installments = req.body.payment_schedule.map(p => ({
          property_id: property._id,
          amount: p.amount || property.rent_amount,
          due_date: new Date(p.date || new Date()),
          payment_mode: p.mode || 'Cheque',
          status: p.status || 'Due'
        }));
        await PaymentInstallment.insertMany(installments);
      }
    }

    res.json({ success: true, property });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/properties/bulk/transfer
router.put('/bulk/transfer', async (req, res) => {
  try {
    const { ids } = req.body;
    if (!ids || !Array.isArray(ids)) {
      return res.status(400).json({ error: 'ids array is required' });
    }

    await Property.updateMany(
      { _id: { $in: ids } },
      { $set: { is_data_working: false } }
    );

    res.json({ success: true, message: 'Properties transferred successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/properties/bulk/delete
router.delete('/bulk/delete', async (req, res) => {
  try {
    const { ids } = req.body;
    if (!ids || !Array.isArray(ids)) {
      return res.status(400).json({ error: 'ids array is required' });
    }

    await Property.updateMany(
      { _id: { $in: ids } },
      { $set: { is_deleted: 1 } }
    );

    res.json({ success: true, message: 'Properties deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/properties/:id
router.delete('/:id', async (req, res) => {
  try {
    const property = await Property.findByIdAndUpdate(req.params.id, { is_deleted: 1 }, { new: true });
    if (!property) return res.status(404).json({ error: 'Property not found' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
