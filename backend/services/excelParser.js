const ExcelJS = require('exceljs');
const path = require('path');
const fs = require('fs');

async function parseExcelFile(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const workbook = new ExcelJS.Workbook();

  if (ext === '.csv') {
    await workbook.csv.readFile(filePath);
  } else {
    await workbook.xlsx.readFile(filePath);
  }

  const worksheet = workbook.worksheets[0];
  if (!worksheet || worksheet.rowCount === 0) {
    throw new Error('File is empty or has no worksheets');
  }

  // Extract headers from first row
  const headerRow = worksheet.getRow(1);
  const headers = [];
  headerRow.eachCell({ includeEmpty: false }, (cell, colNumber) => {
    headers.push({
      column: colNumber,
      name: String(cell.value || '').trim()
    });
  });

  if (headers.length === 0) {
    throw new Error('No headers found in the first row');
  }

  // Extract all data rows
  const rows = [];
  for (let i = 2; i <= worksheet.rowCount; i++) {
    const row = worksheet.getRow(i);
    const rowData = {};
    let hasData = false;

    headers.forEach(header => {
      const cell = row.getCell(header.column);
      let value = cell.value;

      // Handle Excel date objects
      if (value instanceof Date) {
        value = value.toISOString().split('T')[0];
      } else if (typeof value === 'object' && value !== null) {
        // Handle rich text, hyperlinks, etc.
        value = value.text || value.result || String(value);
      }

      rowData[header.name] = value != null ? String(value).trim() : '';
      if (rowData[header.name]) hasData = true;
    });

    // Skip completely empty rows
    if (hasData) {
      rows.push(rowData);
    }
  }

  return {
    headers: headers.map(h => h.name),
    rows,
    totalRows: rows.length,
    previewRows: rows.slice(0, 10)
  };
}

async function generateExcelExport(data, columns, sheetName = 'Sheet1') {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Estate CRM';
  workbook.created = new Date();

  const worksheet = workbook.addWorksheet(sheetName);

  // Set up columns
  worksheet.columns = columns.map(col => ({
    header: col.header,
    key: col.key,
    width: col.width || 18
  }));

  // Style header row
  worksheet.getRow(1).font = { bold: true, size: 12 };
  worksheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF1a1a2e' }
  };
  worksheet.getRow(1).font = { bold: true, color: { argb: 'FFe4e4e7' } };

  // Add data rows
  data.forEach(row => {
    worksheet.addRow(row);
  });

  // Auto-filter
  worksheet.autoFilter = {
    from: { row: 1, column: 1 },
    to: { row: data.length + 1, column: columns.length }
  };

  return workbook;
}

module.exports = { parseExcelFile, generateExcelExport };
