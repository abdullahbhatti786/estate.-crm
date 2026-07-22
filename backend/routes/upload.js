const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const { parseExcelFile, generateExcelExport } = require('../services/excelParser');
const Lead = require('../models/Lead');
const Property = require('../models/Property');

const router = express.Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '..', 'uploads');
    if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const fileId = uuidv4();
    const ext = path.extname(file.originalname);
    cb(null, `${fileId}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max
  fileFilter: (req, file, cb) => {
    const allowedExts = ['.xlsx', '.xls', '.csv'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedExts.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Only .xlsx, .xls, and .csv files are allowed'));
    }
  }
});

const imageUpload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
  fileFilter: (req, file, cb) => {
    const allowedExts = ['.jpg', '.jpeg', '.png', '.webp'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedExts.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Only JPG, PNG, and WebP images are allowed'));
    }
  }
});

const documentUpload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max for docs
  fileFilter: (req, file, cb) => {
    const allowedExts = ['.pdf', '.jpg', '.jpeg', '.png', '.doc', '.docx'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedExts.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Only PDF, Word, JPG, and PNG documents are allowed'));
    }
  }
});

// POST /api/upload/image — Upload single image and return URL
router.post('/image', imageUpload.single('image'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image uploaded' });
    }
    
    // Create URL path for frontend to access (e.g. /uploads/filename.jpg)
    const imageUrl = `/uploads/${req.file.filename}`;
    
    res.json({
      success: true,
      imageUrl
    });
  } catch (err) {
    if (req.file) fs.unlinkSync(req.file.path);
    res.status(400).json({ error: err.message });
  }
});

// POST /api/upload/document — Upload single document and return URL + Name
router.post('/document', documentUpload.single('document'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No document uploaded' });
    }
    
    res.json({
      success: true,
      documentUrl: `/uploads/${req.file.filename}`,
      documentName: req.file.originalname
    });
  } catch (err) {
    if (req.file) fs.unlinkSync(req.file.path);
    res.status(400).json({ error: err.message });
  }
});

// POST /api/upload/excel — Upload and parse file, return headers + preview
router.post('/excel', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const result = await parseExcelFile(req.file.path);

    res.json({
      success: true,
      fileId: path.basename(req.file.filename, path.extname(req.file.filename)),
      fileName: req.file.originalname,
      headers: result.headers,
      previewRows: result.previewRows,
      totalRows: result.totalRows
    });
  } catch (err) {
    // Clean up file on error
    if (req.file) fs.unlinkSync(req.file.path);
    res.status(400).json({ error: err.message });
  }
});

// POST /api/upload/confirm — Map columns and import data
router.post('/confirm', async (req, res) => {
  try {
    const { fileId, targetTable, mapping } = req.body;

    if (!fileId || !targetTable || !mapping) {
      return res.status(400).json({ error: 'fileId, targetTable, and mapping are required' });
    }

    // Find the uploaded file
    const uploadDir = path.join(__dirname, '..', 'uploads');
    const files = fs.readdirSync(uploadDir);
    const file = files.find(f => f.startsWith(fileId));
    if (!file) {
      return res.status(404).json({ error: 'Uploaded file not found. Please re-upload.' });
    }

    const filePath = path.join(uploadDir, file);
    const parsed = await parseExcelFile(filePath);

    // Map rows using the provided column mapping
    const mappedRows = parsed.rows.map(row => {
      const mapped = {};
      for (const [dbField, excelCol] of Object.entries(mapping)) {
        mapped[dbField] = row[excelCol] || '';
      }
      return mapped;
    });

    let result;
    if (targetTable === 'leads') {
      result = Lead.bulkCreate(mappedRows, req.session.user?.id);
    } else if (targetTable === 'properties') {
      result = Property.bulkCreate(mappedRows, req.session.user?.id);
    } else {
      return res.status(400).json({ error: 'Invalid target table. Use "leads" or "properties".' });
    }

    // Clean up uploaded file
    fs.unlinkSync(filePath);

    res.json({
      success: true,
      ...result
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/upload/export/:table — Export table data as Excel
router.get('/export/:table', async (req, res) => {
  try {
    const { table } = req.params;
    let data, columns, sheetName;

    if (table === 'leads') {
      const result = Lead.getAll({ limit: 10000 });
      data = result.leads;
      sheetName = 'Sales Pipeline';
      columns = [
        { header: 'ID', key: 'id', width: 8 },
        { header: 'Name', key: 'name', width: 25 },
        { header: 'Phone', key: 'phone', width: 18 },
        { header: 'Email', key: 'email', width: 28 },
        { header: 'Description', key: 'description', width: 35 },
        { header: 'Status', key: 'status', width: 15 },
        { header: 'Source', key: 'source', width: 15 },
        { header: 'Created At', key: 'created_at', width: 22 }
      ];
    } else if (table === 'properties') {
      const result = Property.getAll({ limit: 10000 });
      data = result.properties;
      sheetName = 'Property Management';
      columns = [
        { header: 'ID', key: 'id', width: 8 },
        { header: 'Owner Name', key: 'owner_name', width: 22 },
        { header: 'Owner Phone', key: 'owner_phone', width: 18 },
        { header: 'Owner Email', key: 'owner_email', width: 25 },
        { header: 'Tenant Name', key: 'tenant_name', width: 22 },
        { header: 'Tenant Phone', key: 'tenant_phone', width: 18 },
        { header: 'Tenant Email', key: 'tenant_email', width: 25 },
        { header: 'Apartment/Unit', key: 'apartment_unit', width: 18 },
        { header: 'Rent (AED)', key: 'rent_amount', width: 14 },
        { header: 'Security Deposit (AED)', key: 'security_deposit', width: 22 },
        { header: 'Lease Start', key: 'lease_start', width: 14 },
        { header: 'Lease End', key: 'lease_end', width: 14 },
        { header: 'Payment Status', key: 'payment_status', width: 16 },
        { header: 'Created At', key: 'created_at', width: 22 }
      ];
    } else {
      return res.status(400).json({ error: 'Invalid table. Use "leads" or "properties".' });
    }

    const workbook = await generateExcelExport(data, columns, sheetName);

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${sheetName.replace(/\s/g, '_')}_${new Date().toISOString().split('T')[0]}.xlsx"`);

    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
