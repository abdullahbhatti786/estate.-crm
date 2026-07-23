require('dotenv').config();

const express = require('express');
const cors = require('cors');
const session = require('express-session');
const path = require('path');
const { initializeDatabase } = require('./config/database');
const { authMiddleware } = require('./middleware/auth');

// Initialize database
initializeDatabase();

const app = express();
app.set('trust proxy', 1); // Trust Vercel load balancer for secure cookies
const PORT = process.env.PORT || 5000;

// Mongo session store
const ConnectMongo = require('connect-mongo');
const MongoStore = ConnectMongo.default || ConnectMongo.MongoStore || ConnectMongo;

// Middleware
app.use(cors({
  origin: process.env.NODE_ENV === 'production'
    ? process.env.FRONTEND_URL
    : 'http://localhost:5173',
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Session configuration
app.use(session({
  store: MongoStore.create({
    mongoUrl: process.env.MONGO_URI,
    collectionName: 'sessions'
  }),
  secret: process.env.SESSION_SECRET || 'estate-crm-secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax'
  }
}));

// Serve static uploads
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Serve static frontend in production
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.join(__dirname, '..', 'frontend', 'dist')));
}

// Public API Routes
app.get('/api/proxy-download', (req, res) => {
  const fileUrl = req.query.url;
  if (!fileUrl || !fileUrl.includes('res.cloudinary.com')) {
    return res.status(400).json({ error: 'Valid Cloudinary URL is required' });
  }

  const https = require('https');
  https.get(fileUrl, (response) => {
    if (response.statusCode !== 200) {
      return res.status(response.statusCode).json({ error: 'Failed to download file' });
    }
    const filename = fileUrl.split('/').pop() || 'download';
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', response.headers['content-type'] || 'application/octet-stream');
    response.pipe(res);
  }).on('error', (err) => {
    res.status(500).json({ error: err.message });
  });
});

// Webhooks (Must be public, no authMiddleware)
app.use('/api/webhooks', require('./routes/webhooks'));

// Protected API Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/leads', authMiddleware, require('./routes/leads'));
app.use('/api/properties', authMiddleware, require('./routes/properties'));
app.use('/api/payments', authMiddleware, require('./routes/payments'));
app.use('/api/upload', authMiddleware, require('./routes/upload'));
app.use('/api/messages', authMiddleware, require('./routes/messages'));
app.use('/api/dashboard', authMiddleware, require('./routes/dashboard'));
app.use('/api/calendar', authMiddleware, require('./routes/calendar'));
app.use('/api/ai', authMiddleware, require('./routes/ai'));
app.use('/api/chat', authMiddleware, require('./routes/chat'));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Serve frontend for all other routes in production (SPA fallback)
if (process.env.NODE_ENV === 'production') {
  app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'frontend', 'dist', 'index.html'));
  });
} else {
  app.get('/', (req, res) => {
    res.send('🏢 Estate CRM Backend is running! Access the frontend at http://localhost:5173 or use /api for endpoints.');
  });
}

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('❌ Server Error:', err);
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ error: 'File too large. Maximum size is 10MB.' });
  }
  res.status(500).json({ error: err.message || 'Internal server error' });
});

if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`\n🏢 Estate CRM Backend running on http://localhost:${PORT}`);
    console.log(`📊 API available at http://localhost:${PORT}/api`);
    console.log(`🔑 Default admin: ${process.env.ADMIN_USERNAME || 'admin'} / ${process.env.ADMIN_PASSWORD || 'admin123'}\n`);
  });
}

module.exports = app;
