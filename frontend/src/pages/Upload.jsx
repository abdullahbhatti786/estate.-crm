import { useState, useRef } from 'react';
import api from '../services/api';
import { toast } from '../components/Toast';
import { Upload as UploadIcon, FileSpreadsheet, ArrowRight, CheckCircle, AlertTriangle, X } from 'lucide-react';

const LEAD_FIELDS = [
  { key: 'name', label: 'Name', required: true },
  { key: 'phone', label: 'Phone', required: true },
  { key: 'email', label: 'Email', required: false },
  { key: 'description', label: 'Description', required: false },
  { key: 'status', label: 'Status', required: false },
];

const PROPERTY_FIELDS = [
  { key: 'owner_name', label: 'Owner Name', required: true },
  { key: 'owner_phone', label: 'Owner Phone', required: true },
  { key: 'owner_email', label: 'Owner Email', required: false },
  { key: 'tenant_name', label: 'Tenant Name', required: true },
  { key: 'tenant_phone', label: 'Tenant Phone', required: true },
  { key: 'tenant_email', label: 'Tenant Email', required: false },
  { key: 'apartment_unit', label: 'Apartment/Unit', required: true },
  { key: 'rent_amount', label: 'Rent Amount', required: true },
  { key: 'security_deposit', label: 'Security Deposit', required: false },
  { key: 'lease_start', label: 'Lease Start', required: true },
  { key: 'lease_end', label: 'Lease End', required: true },
  { key: 'payment_status', label: 'Payment Status', required: false },
];

export default function UploadPage() {
  const [step, setStep] = useState(1); // 1: upload, 2: map, 3: result
  const [targetTable, setTargetTable] = useState('leads');
  const [uploading, setUploading] = useState(false);
  const [fileData, setFileData] = useState(null);
  const [mapping, setMapping] = useState({});
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const fileInputRef = useRef(null);

  const fields = targetTable === 'leads' ? LEAD_FIELDS : PROPERTY_FIELDS;

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('target_table', targetTable);

    try {
      const res = await api.post('/upload/excel', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      setFileData(res.data);

      // Auto-detect mappings
      const autoMap = {};
      fields.forEach(field => {
        const match = res.data.headers.find(h =>
          h.toLowerCase().replace(/[^a-z]/g, '').includes(field.key.replace(/_/g, ''))
          || h.toLowerCase().includes(field.label.toLowerCase())
        );
        if (match) autoMap[field.key] = match;
      });
      setMapping(autoMap);
      setStep(2);
      toast('File parsed successfully', 'success');
    } catch (err) {
      toast(err.response?.data?.error || 'Failed to parse file', 'error');
    } finally {
      setUploading(false);
    }
  };

  const handleConfirmImport = async () => {
    const requiredFields = fields.filter(f => f.required);
    const missingRequired = requiredFields.filter(f => !mapping[f.key]);
    if (missingRequired.length > 0) {
      toast(`Map required fields: ${missingRequired.map(f => f.label).join(', ')}`, 'warning');
      return;
    }

    setImporting(true);
    try {
      const res = await api.post('/upload/confirm', {
        fileId: fileData.fileId,
        targetTable,
        mapping
      });
      setImportResult(res.data);
      setStep(3);
      toast(`Imported ${res.data.inserted} records!`, 'success');
    } catch (err) {
      toast(err.response?.data?.error || 'Import failed', 'error');
    } finally {
      setImporting(false);
    }
  };

  const reset = () => {
    setStep(1);
    setFileData(null);
    setMapping({});
    setImportResult(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="space-y-5 animate-fade-in">
      <div>
        <h1 className="text-2xl font-bold text-text-primary">Excel Import</h1>
        <p className="text-sm text-text-muted mt-1">Bulk import data from Excel or CSV files</p>
      </div>

      {/* Progress Steps */}
      <div className="flex items-center gap-3">
        {[
          { num: 1, label: 'Upload' },
          { num: 2, label: 'Map Columns' },
          { num: 3, label: 'Results' }
        ].map((s, i) => (
          <div key={s.num} className="flex items-center gap-3">
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
              step >= s.num ? 'bg-accent-dim text-accent' : 'bg-bg-elevated text-text-muted'
            }`}>
              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                step > s.num ? 'bg-accent text-bg-primary' : step === s.num ? 'bg-accent/20 text-accent' : 'bg-bg-hover text-text-muted'
              }`}>
                {step > s.num ? '✓' : s.num}
              </span>
              {s.label}
            </div>
            {i < 2 && <ArrowRight size={16} className="text-text-muted" />}
          </div>
        ))}
      </div>

      {/* Step 1: Upload */}
      {step === 1 && (
        <div className="glass-card p-8">
          <div className="mb-6">
            <label className="block text-sm font-medium text-text-secondary mb-2">Import Into</label>
            <div className="flex gap-3">
              <button
                onClick={() => setTargetTable('leads')}
                className={`px-4 py-2.5 rounded-lg text-sm font-medium border transition-all ${
                  targetTable === 'leads' ? 'bg-accent-dim/30 text-accent border-accent/50' : 'bg-bg-elevated text-text-secondary border-border hover:border-border-light'
                }`}
              >
                Sales Pipeline (Leads)
              </button>
              <button
                onClick={() => setTargetTable('properties')}
                className={`px-4 py-2.5 rounded-lg text-sm font-medium border transition-all ${
                  targetTable === 'properties' ? 'bg-accent-dim/30 text-accent border-accent/50' : 'bg-bg-elevated text-text-secondary border-border hover:border-border-light'
                }`}
              >
                Property Management
              </button>
            </div>
          </div>

          <div
            onClick={() => fileInputRef.current?.click()}
            className="border border-dashed border-border rounded-xl p-12 text-center hover:border-accent/50 hover:bg-bg-hover transition-all cursor-pointer group"
          >
            <div className="w-16 h-16 rounded-2xl bg-bg-elevated border border-border mx-auto mb-4 flex items-center justify-center group-hover:scale-110 transition-transform">
              {uploading ? (
                <div className="w-8 h-8 border-2 border-accent/30 border-t-accent rounded-full animate-spin" />
              ) : (
                <FileSpreadsheet size={28} className="text-text-muted group-hover:text-accent transition-colors" />
              )}
            </div>
            <p className="text-base font-medium text-text-primary mb-1">
              {uploading ? 'Parsing file...' : 'Drop your Excel file here or click to browse'}
            </p>
            <p className="text-sm text-text-muted">Supports .xlsx, .xls, .csv — Max 10MB</p>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={handleUpload}
            className="hidden"
          />
        </div>
      )}

      {/* Step 2: Column Mapping */}
      {step === 2 && fileData && (
        <div className="space-y-5">
          {/* File Info */}
          <div className="glass-card p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-bg-elevated rounded-lg">
                <FileSpreadsheet size={20} className="text-accent" />
              </div>
              <div>
                <span className="text-sm font-medium text-text-primary">{fileData.fileName}</span>
                <span className="text-xs text-text-muted ml-2">({fileData.totalRows} rows)</span>
              </div>
            </div>
            <button onClick={reset} className="p-2 rounded-lg text-text-muted hover:text-danger hover:bg-danger-dim transition-all">
              <X size={16} />
            </button>
          </div>

          {/* Mapping */}
          <div className="glass-card p-5">
            <h3 className="text-sm font-bold text-text-primary mb-4">Map Excel Columns to Fields</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {fields.map(field => (
                <div key={field.key} className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 p-3 rounded-lg bg-bg-elevated/50 border border-border">
                  <label className={`text-sm w-40 shrink-0 ${field.required ? 'text-text-primary font-medium' : 'text-text-secondary'}`}>
                    {field.label} {field.required && <span className="text-danger">*</span>}
                  </label>
                  <select
                    value={mapping[field.key] || ''}
                    onChange={(e) => setMapping({ ...mapping, [field.key]: e.target.value })}
                    className="flex-1 px-3 py-2 bg-bg-surface border border-border rounded-lg text-sm text-text-primary focus:outline-none focus:border-accent/50 transition-all"
                  >
                    <option value="">— Skip —</option>
                    {fileData.headers.map(h => (
                      <option key={h} value={h}>{h}</option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          </div>

          {/* Preview Table */}
          <div className="glass-card overflow-hidden">
            <div className="px-5 py-4 border-b border-border">
              <h3 className="text-sm font-bold text-text-primary">Data Preview (first {fileData.previewRows.length} rows)</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border">
                    {fileData.headers.map(h => (
                      <th key={h} className="px-5 py-3 text-left text-[11px] font-bold text-text-muted uppercase tracking-widest whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/50">
                  {fileData.previewRows.map((row, i) => (
                    <tr key={i} className="hover:bg-bg-hover/50">
                      {fileData.headers.map(h => (
                         <td key={h} className="px-5 py-3 text-text-secondary whitespace-nowrap max-w-[200px] truncate">{row[h] || ''}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2">
            <button onClick={reset} className="px-4 py-2.5 bg-bg-surface border border-border rounded-lg text-sm font-medium text-text-secondary hover:text-text-primary transition-all">Cancel</button>
            <button
              onClick={handleConfirmImport}
              disabled={importing}
              className="flex items-center gap-2 px-6 py-2.5 bg-accent text-bg-primary font-bold rounded-lg hover:bg-accent-hover disabled:opacity-50 transition-all"
            >
              {importing ? (
                <div className="w-5 h-5 border-2 border-bg-primary/30 border-t-bg-primary rounded-full animate-spin" />
              ) : (
                <>
                  <UploadIcon size={16} />
                  Import {fileData.totalRows} Rows
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Results */}
      {step === 3 && importResult && (
        <div className="glass-card p-8 text-center">
          <div className="w-16 h-16 rounded-2xl bg-success-dim mx-auto mb-4 flex items-center justify-center">
            <CheckCircle size={32} className="text-success" />
          </div>
          <h2 className="text-xl font-bold text-text-primary mb-2">Import Complete!</h2>

          <div className="flex justify-center gap-8 my-6">
            <div>
              <div className="text-3xl font-bold text-success">{importResult.inserted}</div>
              <div className="text-sm text-text-muted">Inserted</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-warning">{importResult.skipped}</div>
              <div className="text-sm text-text-muted">Skipped (duplicates)</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-danger">{importResult.errors?.length || 0}</div>
              <div className="text-sm text-text-muted">Errors</div>
            </div>
          </div>

          {importResult.errors?.length > 0 && (
            <div className="mt-4 p-4 rounded-xl bg-danger-dim border border-danger/30 text-left max-h-40 overflow-y-auto">
              {importResult.errors.map((err, i) => (
                <div key={i} className="text-sm text-danger flex items-start gap-2 mb-1">
                  <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                  <span>Row {err.row}: {err.reason}</span>
                </div>
              ))}
            </div>
          )}

          <button onClick={reset} className="mt-6 px-6 py-2.5 bg-gradient-to-r from-accent to-accent-hover text-bg-primary font-medium rounded-xl hover:shadow-lg hover:shadow-accent/20 transition-all">
            Import Another File
          </button>
        </div>
      )}
    </div>
  );
}
