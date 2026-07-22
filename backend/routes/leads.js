const express = require('express');
const Lead = require('../models/Lead');

const router = express.Router();

// GET /api/leads
router.get('/', async (req, res) => {
  try {
    const { search, status, page = 1, limit = 20 } = req.query;
    
    let query = { is_deleted: 0 };
    
    // Non-admins can only see their own leads
    if (req.session.user?.role !== 'admin') {
      query.created_by = req.session.user?.id;
    }

    if (status && status !== 'All') {
      query.status = status;
    }

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const leads = await Lead.find(query)
      .sort({ created_at: -1 })
      .skip(skip)
      .limit(parseInt(limit));
      
    const total = await Lead.countDocuments(query);

    res.json({
      leads,
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / parseInt(limit))
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/leads/:id
router.get('/:id', async (req, res) => {
  try {
    const lead = await Lead.findById(req.params.id);
    if (!lead || lead.is_deleted) return res.status(404).json({ error: 'Lead not found' });
    res.json({ lead });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/leads
router.post('/', async (req, res) => {
  try {
    const { name, phone, email, description, status } = req.body;
    if (!name || !phone) {
      return res.status(400).json({ error: 'Name and phone are required' });
    }
    const lead = await Lead.create({
      name, phone, email, description, status,
      created_by: req.session.user?.id
    });
    res.status(201).json({ success: true, lead });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/leads/:id
router.put('/:id', async (req, res) => {
  try {
    const lead = await Lead.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!lead || lead.is_deleted) return res.status(404).json({ error: 'Lead not found' });
    res.json({ success: true, lead });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/leads/:id
router.delete('/:id', async (req, res) => {
  try {
    // Soft delete
    const lead = await Lead.findByIdAndUpdate(req.params.id, { is_deleted: 1 }, { new: true });
    if (!lead) return res.status(404).json({ error: 'Lead not found' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
