const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const https = require('https');
const { v4: uuidv4 } = require('uuid');
const { parseExcelFile, generateExcelExport } = require('../services/excelParser');
const Lead = require('../models/Lead');
const Property = require('../models/Property');

// Cloudinary integration
const { v2: cloudinary } = require('cloudinary');
const { CloudinaryStorage } = require('multer-storage-cloudinary');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

const router = express.Router();

// ----------------- STORAGE CONFIGURATIONS -----------------

// 1. Storage for Images (Cloudinary)
const imageStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'estate-crm/images',
    allowed_formats: ['jpg', 'png', 'jpeg', 'webp']
  }
});

// 2. Storage for Documents (Cloudinary)
const documentStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'estate-crm/documents',
    resource_type: 'auto',
    allowed_formats: ['pdf', 'jpg', 'jpeg', 'png', 'doc', 'docx']
  }
});

// 3. Storage for Excel parsing (Temporary local storage on Vercel)
const excelStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Vercel serverless functions only allow writing to /tmp
    const uploadDir = '/tmp';
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const fileId = uuidv4();
    const ext = path.extname(file.originalname);
    cb(null, `${fileId}${ext}`);
  }
});

// ----------------- UPLOAD MIDDLEWARES -----------------

const excelUpload = multer({
  storage: excelStorage,
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
  storage: imageStorage,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB max
});

const documentUpload = multer({
  storage: documentStorage,
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB max
});

// ----------------- ROUTES -----------------

// POST /api/upload/image — Upload single image and return Cloudinary URL
router.post('/image', imageUpload.single('image'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image uploaded' });
    }
    
    res.json({
      success: true,
      imageUrl: req.file.path // Cloudinary URL
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// POST /api/upload/document — Upload single document and return Cloudinary URL
router.post('/document', documentUpload.single('document'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No document uploaded' });
    }
    
    res.json({
      success: true,
      documentUrl: req.file.path, // Cloudinary URL
      documentName: req.file.originalname
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// POST /api/upload/excel — Upload and parse file, return headers + preview
router.post('/excel', excelUpload.single('file'), async (req, res) => {
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
    if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
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

    // Find the uploaded file in /tmp
    const uploadDir = '/tmp';
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

    const mappedRowsWithUser = mappedRows.map(r => ({ ...r, created_by: req.session.user?.id }));

    let result;
    if (targetTable === 'leads') {
      const inserted = await Lead.insertMany(mappedRowsWithUser.map(r => ({...r, is_data_working: false})));
      result = { inserted: inserted.length };
    } else if (targetTable === 'data_working_leads') {
      const inserted = await Lead.insertMany(mappedRowsWithUser.map(r => ({...r, is_data_working: true})));
      result = { inserted: inserted.length };
    } else if (targetTable === 'properties') {
      const inserted = await Property.insertMany(mappedRowsWithUser.map(r => ({...r, is_data_working: false})));
      result = { inserted: inserted.length };
    } else if (targetTable === 'data_working_properties') {
      const inserted = await Property.insertMany(mappedRowsWithUser.map(r => ({...r, is_data_working: true})));
      result = { inserted: inserted.length };
    } else {
      return res.status(400).json({ error: 'Invalid target table. Use "leads" or "properties".' });
    }

    // Clean up uploaded file
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

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
      const dbData = await Lead.find({ is_deleted: 0 }).limit(10000).lean();
      data = dbData.map(d => ({ ...d, id: d._id.toString() }));
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
      const dbData = await Property.find({ is_deleted: 0, property_status: 'Rented' }).limit(10000).lean();
      data = dbData.map(d => ({ ...d, id: d._id.toString() }));
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
    } else if (table === 'inventory') {
      const dbData = await Property.find({ is_deleted: 0, property_status: 'Available' }).limit(10000).lean();
      data = dbData.map(d => ({ ...d, id: d._id.toString() }));
      sheetName = 'Inventory';
      columns = [
        { header: 'ID', key: 'id', width: 8 },
        { header: 'Owner Name', key: 'owner_name', width: 22 },
        { header: 'Owner Phone', key: 'owner_phone', width: 18 },
        { header: 'Owner Email', key: 'owner_email', width: 25 },
        { header: 'Apartment/Unit', key: 'apartment_unit', width: 18 },
        { header: 'Asking Rent (AED)', key: 'rent_amount', width: 14 },
        { header: 'Deposit (AED)', key: 'security_deposit', width: 22 },
        { header: 'Listed On', key: 'created_at', width: 22 }
      ];
    } else {
      return res.status(400).json({ error: 'Invalid table. Use "leads", "properties", or "inventory".' });
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

// GET /api/upload/download-signed?url=...
router.get('/download-signed', (req, res) => {
  try {
    const fileUrl = req.query.url;
    if (!fileUrl || !fileUrl.includes('res.cloudinary.com')) {
      return res.status(400).json({ error: 'Valid Cloudinary URL is required' });
    }

    const uploadIndex = fileUrl.indexOf('/upload/');
    if (uploadIndex === -1) return res.status(400).json({ error: 'Invalid Cloudinary URL format' });

    let pathAfterUpload = fileUrl.substring(uploadIndex + 8);
    // Remove version like v1234567/
    if (pathAfterUpload.match(/^v\d+\//)) {
      pathAfterUpload = pathAfterUpload.replace(/^v\d+\//, '');
    }

    // Determine resource type from URL
    const resourceType = fileUrl.includes('/raw/upload/') ? 'raw' : 
                        fileUrl.includes('/video/upload/') ? 'video' : 'image';

    // Generate signed URL with attachment flag
    const signedUrl = cloudinary.utils.url(pathAfterUpload, {
      resource_type: resourceType,
      secure: true,
      sign_url: true,
      flags: 'attachment'
    });

    res.json({ signedUrl });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
