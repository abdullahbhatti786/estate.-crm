const mongoose = require('mongoose');

async function initializeDatabase() {
  try {
    const mongoURI = process.env.MONGO_URI;
    if (!mongoURI) {
      console.error('❌ MONGO_URI is not set in .env');
      process.exit(1);
    }
    
    await mongoose.connect(mongoURI);
    console.log('✅ Connected to MongoDB Atlas successfully');
    
    // Check if admin user exists, if not, create one
    const User = require('../models/User');
    const bcrypt = require('bcryptjs');
    
    const adminExists = await User.findOne({ role: 'admin' });
    if (!adminExists) {
      const username = process.env.ADMIN_USERNAME || 'admin';
      const password = process.env.ADMIN_PASSWORD || 'admin123';
      const passwordHash = bcrypt.hashSync(password, 10);
      
      await User.create({
        username,
        email: 'admin@estate-crm.com',
        full_name: 'Administrator',
        password_hash: passwordHash,
        role: 'admin'
      });
      console.log(`✅ Admin user created: ${username}`);
    }
    
  } catch (error) {
    console.error('❌ MongoDB Connection Error:', error);
    process.exit(1);
  }
}

// We don't need getDb anymore with Mongoose, but we export it for backward compatibility if any file still imports it before being rewritten.
function getDb() {
  throw new Error("getDb() is deprecated. Please use Mongoose models directly.");
}

module.exports = { initializeDatabase, getDb };
