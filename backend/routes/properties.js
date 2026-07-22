const express = require('express');
const Property = require('../models/Property');

const router = express.Router();

// GET /api/properties
router.get('/', async (req, res) => {
  try {
    const { search, payment_status, property_status, page = 1, limit = 20 } = req.query;
    
    let query = { is_deleted: 0 };
    
    if (req.session.user?.role !== 'admin') {
      query.created_by = req.session.user?.id;
    }

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
      created_by: req.session.user?.id
    });
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
    res.json({ success: true, property });
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
