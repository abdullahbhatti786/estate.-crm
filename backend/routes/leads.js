const express = require('express');
const Lead = require('../models/Lead');

const router = express.Router();

// GET /api/leads
router.get('/', async (req, res) => {
  try {
    const { search, status, page = 1, limit = 20, is_data_working = 'false' } = req.query;
    
    let query = { is_deleted: 0, is_data_working: is_data_working === 'true' };
    
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
    const { name, email, phone, description, status, source, follow_up_date, is_data_working } = req.body;
    
    const lead = new Lead({
      name, email, phone, description, status, source, follow_up_date,
      is_data_working: is_data_working === true,
      created_by: req.session.user?.id
    });
    
    await lead.save();
    res.status(201).json({ success: true, lead });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/leads/:id
router.put('/:id', async (req, res) => {
  try {
    const lead = await Lead.findById(req.params.id);
    if (!lead || lead.is_deleted) return res.status(404).json({ error: 'Lead not found' });

    Object.assign(lead, req.body);
    await lead.save();
    
    res.json({ lead });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/leads/bulk/transfer
router.put('/bulk/transfer', async (req, res) => {
  try {
    const { ids } = req.body;
    if (!ids || !Array.isArray(ids)) {
      return res.status(400).json({ error: 'ids array is required' });
    }

    await Lead.updateMany(
      { _id: { $in: ids } },
      { $set: { is_data_working: false, status: 'New' } }
    );

    res.json({ success: true, message: 'Leads transferred successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/leads/:id
router.delete('/:id', async (req, res) => {
  try {
    const lead = await Lead.findById(req.params.id);
    if (!lead) return res.status(404).json({ error: 'Lead not found' });

    lead.is_deleted = 1;
    await lead.save();

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
