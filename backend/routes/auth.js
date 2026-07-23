const express = require('express');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const { authMiddleware, adminOnly } = require('../middleware/auth');

const router = express.Router();

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    const user = await User.findOne({ username });
    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    if (!user.is_active) {
      return res.status(401).json({ error: 'Account is deactivated' });
    }

    const isValid = bcrypt.compareSync(password, user.password_hash);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    req.session.user = {
      id: user.id,
      username: user.username,
      full_name: user.full_name,
      email: user.email,
      role: user.role
    };

    res.json({ success: true, user: req.session.user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/logout
router.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) return res.status(500).json({ error: 'Logout failed' });
    res.clearCookie('connect.sid');
    res.json({ success: true });
  });
});

// GET /api/auth/me
router.get('/me', authMiddleware, (req, res) => {
  res.json({ user: req.session.user });
});

// PUT /api/auth/profile
router.put('/profile', authMiddleware, async (req, res) => {
  try {
    const { full_name, email, password } = req.body;
    const userId = req.session.user.id;

    const updates = {};
    if (full_name) updates.full_name = full_name;
    if (email) updates.email = email;
    if (password && password.trim() !== '') {
      updates.password_hash = bcrypt.hashSync(password, 10);
    }

    const updatedUser = await User.findByIdAndUpdate(userId, updates, { new: true });
    
    // Refresh session data
    req.session.user = {
      ...req.session.user,
      full_name: updatedUser.full_name,
      email: updatedUser.email
    };

    res.json({ success: true, user: req.session.user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/register (admin only)
router.post('/register', authMiddleware, adminOnly, async (req, res) => {
  try {
    const { username, email, full_name, password, role } = req.body;
    if (!username || !password || !full_name) {
      return res.status(400).json({ error: 'Username, full name, and password are required' });
    }

    const existing = await User.findOne({ username });
    if (existing) {
      return res.status(400).json({ error: 'Username already exists' });
    }

    const password_hash = bcrypt.hashSync(password, 10);
    const user = await User.create({ username, email, full_name, password_hash, role: role || 'agent' });

    res.status(201).json({ success: true, user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/auth/users (admin only)
router.get('/users', authMiddleware, adminOnly, async (req, res) => {
  try {
    const users = await User.find();
    res.json({ users });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/auth/users/:id (admin only)
router.put('/users/:id', authMiddleware, adminOnly, async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ success: true, user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/auth/users/:id (admin only)
router.delete('/users/:id', authMiddleware, adminOnly, async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (user.role === 'admin') {
      return res.status(400).json({ error: 'Cannot delete admin user' });
    }
    await User.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/auth/users/:id/password (admin only)
router.put('/users/:id/password', authMiddleware, adminOnly, async (req, res) => {
  try {
    const { password } = req.body;
    if (!password || password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }
    const password_hash = await bcrypt.hash(password, 10);
    const user = await User.findByIdAndUpdate(req.params.id, { password_hash }, { new: true });
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/auth/integrations
router.get('/integrations', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.session.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    
    // We return whether the password/token is set, not the actual value for security
    res.json({
      gmail_sender_name: user.gmail_sender_name || user.full_name || '',
      gmail_email: user.gmail_email || '',
      has_gmail_password: !!user.gmail_app_password,
      whatsapp_phone_number_id: user.whatsapp_phone_number_id || '',
      has_whatsapp_token: !!user.whatsapp_access_token
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/auth/integrations
router.put('/integrations', authMiddleware, async (req, res) => {
  try {
    const { gmail_sender_name, gmail_email, gmail_app_password, whatsapp_phone_number_id, whatsapp_access_token } = req.body;
    
    const updateData = {};
    if (gmail_sender_name !== undefined) updateData.gmail_sender_name = gmail_sender_name;
    if (gmail_email !== undefined) updateData.gmail_email = gmail_email;
    if (gmail_app_password) updateData.gmail_app_password = gmail_app_password; // only update if provided
    if (whatsapp_phone_number_id !== undefined) updateData.whatsapp_phone_number_id = whatsapp_phone_number_id;
    if (whatsapp_access_token) updateData.whatsapp_access_token = whatsapp_access_token;

    await User.findByIdAndUpdate(req.session.user.id, updateData);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
