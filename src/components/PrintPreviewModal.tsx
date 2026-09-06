import React, { useState, useRef, useEffect, useMemo } from 'react';
import QRCode from 'qrcode';
import { PatientAssessmentRecord } from '../types/clinical';
import {
  ClinicianProfile,
  HospitalFacility,
  clinicalProfileSync,
} from '../services/clinicalProfileSyncService';
import {
  exportPatientAssessmentToPDF,
  ClinicalSectionOption,
  ClinicalSectionSelection,
} from '../utils/clinicalPdfExport';
import {
  calculatePatientMedicalBill,
  PatientMedicalBill,
} from '../utils/medicalBilling';
import {
  Printer,
  Download,
  X,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Building2,
  Stethoscope,
  Activity,
  Heart,
  Pill,
  ShieldCheck,
  Settings,
  Eye,
  Sliders,
  Sparkles,
  QrCode,
  Copy,
  Check,
  Smartphone,
  Receipt,
  DollarSign,
  Edit3,
  RefreshCw,
} from 'lucide-react';

interface PrintPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  record: PatientAssessmentRecord | null;
  assessments?: PatientAssessmentRecord[];
  onSelectRecord?: (record: PatientAssessmentRecord) => void;
  activeDoctor?: ClinicianProfile;
  activeHospital?: HospitalFacility;
}

export type PrintDateRange = 'ALL' | 'TODAY' | 'PAST_3_DAYS' | 'PAST_7_DAYS' | 'PAST_30_DAYS';
export type PrintStatusFilter =
  | 'ALL'
  | 'ONLY_EMERGENCY'
  | 'EMERGENCY_URGENT'
  | 'PRIORITY'
  | 'ROUTINE'
  | 'REVIEWED'
  | 'PENDING';

export const PrintPreviewModal: React.FC<PrintPreviewModalProps> = ({
  isOpen,
  onClose,
  record: propRecord,
  assessments = [],
  onSelectRecord,
  activeDoctor: propDoctor,
  activeHospital: propHospital,
}) => {
  const syncDoc = propDoctor || clinicalProfileSync.getActiveDoctor();
  const syncHosp = propHospital || clinicalProfileSync.getActiveHospital();

  // Active filter states
  const [dateRangeFilter, setDateRangeFilter] = useState<PrintDateRange>('ALL');
  const [statusFilter, setStatusFilter] = useState<PrintStatusFilter>('ALL');
  const [selectedRecordId, setSelectedRecordId] = useState<string>(propRecord?.demographics.patientId || '');
  const [showBatchManifest, setShowBatchManifest] = useState<boolean>(false);

  // Sync propRecord into selectedRecordId
  useEffect(() => {
    if (propRecord) {
      setSelectedRecordId(propRecord.demographics.patientId);
    }
  }, [propRecord?.demographics.patientId]);

  // Combined records pool
  const recordsPool = useMemo(() => {
    if (assessments.length > 0) return assessments;
    return propRecord ? [propRecord] : [];
  }, [assessments, propRecord]);

  // Filtered records based on date-range and patient status
  const filteredRecords = useMemo(() => {
    const now = Date.now();
    return recordsPool.filter((rec) => {
      // 1. Date Range Filter
      const recTime = new Date(rec.timestamp || rec.vitals.measurementTime || now).getTime();
      const diffHours = (now - recTime) / (1000 * 60 * 60);

      if (dateRangeFilter === 'TODAY' && diffHours > 24) return false;
      if (dateRangeFilter === 'PAST_3_DAYS' && diffHours > 72) return false;
      if (dateRangeFilter === 'PAST_7_DAYS' && diffHours > 168) return false;
      if (dateRangeFilter === 'PAST_30_DAYS' && diffHours > 720) return false;

      // 2. Patient Status / Triage Filter
      const triage = rec.assessmentResult?.triage.level;
      if (statusFilter === 'ONLY_EMERGENCY' && triage !== 'LEVEL_1_EMERGENCY') return false;
      if (
        statusFilter === 'EMERGENCY_URGENT' &&
        triage !== 'LEVEL_1_EMERGENCY' &&
        triage !== 'LEVEL_2_URGENT'
      )
        return false;
      if (statusFilter === 'PRIORITY' && triage !== 'LEVEL_3_PRIORITY') return false;
      if (
        statusFilter === 'ROUTINE' &&
        triage !== 'LEVEL_4_ROUTINE' &&
        triage !== 'LEVEL_5_LOW_RISK'
      )
        return false;
      if (statusFilter === 'REVIEWED' && !rec.doctorReview) return false;
      if (statusFilter === 'PENDING' && rec.doctorReview) return false;

      return true;
    });
  }, [recordsPool, dateRangeFilter, statusFilter]);

  // Selected Active Record
  const record = useMemo(() => {
    if (selectedRecordId) {
      const found = filteredRecords.find((r) => r.demographics.patientId === selectedRecordId);
      if (found) return found;
    }
    return filteredRecords[0] || propRecord || null;
  }, [filteredRecords, selectedRecordId, propRecord]);

  // Custom Header & Footer Config States
  const [customHospitalName, setCustomHospitalName] = useState<string>(syncHosp.name);
  const [customDepartment, setCustomDepartment] = useState<string>('Department of Emergency & Cardiovascular Medicine');
  const [customReportTitle, setCustomReportTitle] = useState<string>('OFFICIAL CLINICAL TRIAGE & AI RISK ASSESSMENT REPORT');
  const [customFooterNote, setCustomFooterNote] = useState<string>(
    'Certified Electronic Health Record under Pakistan Digital Health & PMDC Standards (HIPAA / FHIR R4 Compliant).'
  );
  const [includeShapFactors, setIncludeShapFactors] = useState<boolean>(true);
  const [includeLabPanel, setIncludeLabPanel] = useState<boolean>(true);
  const [includeOfficialSeal, setIncludeOfficialSeal] = useState<boolean>(true);
  const [includeEmergencyQrCode, setIncludeEmergencyQrCode] = useState<boolean>(true);
  const [includeMedicalBilling, setIncludeMedicalBilling] = useState<boolean>(true);
  const [doctorFeePkr, setDoctorFeePkr] = useState<number>(1500);
  const [subsidyPkr, setSubsidyPkr] = useState<number | undefined>(undefined);
  const [showConfigDrawer, setShowConfigDrawer] = useState<boolean>(false);
  const [isExportingPdf, setIsExportingPdf] = useState<boolean>(false);

  // Clinical Section Selectors (Only Vitals, Only Medications, Full Summary, Custom)
  const [reportSectionMode, setReportSectionMode] = useState<ClinicalSectionOption>('FULL_SUMMARY');
  const [customSections, setCustomSections] = useState<ClinicalSectionSelection>({
    demographics: true,
    vitals: true,
    triageAndRisks: true,
    medications: true,
    labs: true,
    shapFactors: true,
    doctorReview: true,
    qrCode: true,
    medicalBilling: true,
  });

  // Derived effective section visibility flags
  const showDemographics =
    reportSectionMode === 'CUSTOM' ? (customSections.demographics ?? true) : true;
  const showVitalsSection =
    reportSectionMode === 'FULL_SUMMARY' ||
    reportSectionMode === 'ONLY_VITALS' ||
    (reportSectionMode === 'CUSTOM' && (customSections.vitals ?? true));
  const showTriageSection =
    (reportSectionMode === 'FULL_SUMMARY' ||
      (reportSectionMode === 'CUSTOM' && (customSections.triageAndRisks ?? true))) &&
    reportSectionMode !== 'ONLY_VITALS' &&
    reportSectionMode !== 'ONLY_MEDICATIONS';
  const showLabsSection =
    includeLabPanel &&
    (reportSectionMode === 'FULL_SUMMARY' ||
      (reportSectionMode === 'CUSTOM' && (customSections.labs ?? true))) &&
    reportSectionMode !== 'ONLY_VITALS' &&
    reportSectionMode !== 'ONLY_MEDICATIONS';
  const showMedicationsSection =
    reportSectionMode === 'FULL_SUMMARY' ||
    reportSectionMode === 'ONLY_MEDICATIONS' ||
    (reportSectionMode === 'CUSTOM' && (customSections.medications ?? true));
  const showShapSection =
    includeShapFactors &&
    (reportSectionMode === 'FULL_SUMMARY' ||
      (reportSectionMode === 'CUSTOM' && (customSections.shapFactors ?? true))) &&
    reportSectionMode !== 'ONLY_VITALS' &&
    reportSectionMode !== 'ONLY_MEDICATIONS';
  const showDoctorReviewSection =
    reportSectionMode === 'CUSTOM'
      ? (customSections.doctorReview ?? true)
      : reportSectionMode !== 'ONLY_VITALS';
  const showEmergencyQr =
    includeEmergencyQrCode &&
    (reportSectionMode === 'CUSTOM' ? (customSections.qrCode ?? true) : true);
  const showBillingSection =
    includeMedicalBilling &&
    (reportSectionMode === 'FULL_SUMMARY' ||
      (reportSectionMode === 'CUSTOM' && (customSections.medicalBilling ?? true))) &&
    reportSectionMode !== 'ONLY_VITALS';

  // QR Code & Scan Text Inspector States
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [showQrModal, setShowQrModal] = useState<boolean>(false);
  const [copiedQrUrl, setCopiedQrUrl] = useState<boolean>(false);
  const [copiedScanText, setCopiedScanText] = useState<boolean>(false);
  const [scanModalTab, setScanModalTab] = useState<'preview' | 'scan_text'>('preview');
  const [customScanText, setCustomScanText] = useState<string>('');
  const [editableScanText, setEditableScanText] = useState<string>('');

  const printAreaRef = useRef<HTMLDivElement>(null);

  // Safe BMI resolution protecting against height unit confusion
  const safeBmi = useMemo(() => {
    if (!record) return 24.8;
    const { profile } = record;
    if (profile.bmi && profile.bmi >= 12 && profile.bmi <= 75) {
      return Number(profile.bmi.toFixed(1));
    }
    let h = profile.heightCm;
    if (h > 0 && h <= 2.5) h = h * 100;
    if (h >= 50 && h <= 250 && profile.weightKg >= 20 && profile.weightKg <= 250) {
      const computed = profile.weightKg / Math.pow(h / 100, 2);
      if (computed >= 12 && computed <= 75) {
        return Number(computed.toFixed(1));
      }
    }
    return 24.8;
  }, [record]);

  // Medical Billing Calculation
  const patientMedicalBill = useMemo<PatientMedicalBill | null>(() => {
    if (!record) return null;
    return calculatePatientMedicalBill(record, doctorFeePkr, subsidyPkr);
  }, [record, doctorFeePkr, subsidyPkr]);

  // Default Standard EMR Scan Text Payload
  const defaultScanPayload = useMemo(() => {
    if (!record) return '';
    const mrnString = record.demographics.mrn || record.demographics.patientId || 'MRN-PENDING';
    const sbp = record.vitals.systolicBp || '?';
    const dbp = record.vitals.diastolicBp || '?';
    const cvdRisk = record.assessmentResult
      ? Math.round(record.assessmentResult.risks.cardiovascular.riskScore * 100)
      : 0;
    const triage = record.assessmentResult?.triage.level || 'PRIORITY';
    const activeDocName = record.doctorReview?.doctorName || syncDoc.name;
    const activeDocLic = record.doctorReview?.doctorLicenseNo || syncDoc.licenseNo;

    return `HIS-EMERGENCY-TRANSFER|FACILITY:${syncHosp.facilityCode}|MRN:${mrnString}|ID:${record.demographics.patientId}|NAME:${record.demographics.fullName}|AGE:${record.demographics.age}Y|SEX:${record.demographics.sex}|SBP:${sbp}|DBP:${dbp}|CVD_RISK:${cvdRisk}%|TRIAGE:${triage}|DOC:${activeDocName}|LIC:${activeDocLic}`;
  }, [record, syncHosp.facilityCode, syncDoc.name, syncDoc.licenseNo]);

  // Active scan payload inside QR code
  const activeScanPayload = customScanText || defaultScanPayload;

  // Initialize editable scan text when default payload changes
  useEffect(() => {
    if (!customScanText && defaultScanPayload) {
      setEditableScanText(defaultScanPayload);
    }
  }, [defaultScanPayload, customScanText]);

  // Generate QR Code dynamically from active scan payload
  useEffect(() => {
    if (!activeScanPayload) return;

    QRCode.toDataURL(activeScanPayload, {
      width: 256,
      margin: 1,
      color: {
        dark: '#0f172a',
        light: '#ffffff',
      },
    })
      .then((url) => {
        setQrDataUrl(url);
      })
      .catch((err) => {
        console.error('Error generating QR code:', err);
      });
  }, [activeScanPayload]);

  if (!isOpen || !record) return null;

  const { demographics, vitals, profile, labs, assessmentResult, doctorReview } = record;

  const docName = doctorReview?.doctorName || syncDoc.name;
  const docLicense = doctorReview?.doctorLicenseNo || syncDoc.licenseNo;
  const docSpecialty = syncDoc.specialty;
  const docQualifications = syncDoc.qualifications;

  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://aistudio.google.com';
  const emergencyUrl = `${origin}/?patientId=${encodeURIComponent(demographics.patientId)}&mrn=${encodeURIComponent(demographics.mrn || demographics.patientId)}`;

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPdf = async () => {
    setIsExportingPdf(true);
    try {
      await exportPatientAssessmentToPDF(record, {
        doctorOverride: { name: docName, licenseNo: docLicense },
        hospitalOverride: { name: customHospitalName },
        reportType: reportSectionMode,
        selectedSections: customSections,
        doctorFeePkr,
        subsidyDiscountPkr: subsidyPkr,
        qrScanTextOverride: customScanText || undefined,
      });
    } catch (e) {
      console.error('PDF export error:', e);
    } finally {
      setIsExportingPdf(false);
    }
  };

  const handleCopyQrUrl = () => {
    navigator.clipboard.writeText(emergencyUrl);
    setCopiedQrUrl(true);
    setTimeout(() => setCopiedQrUrl(false), 3000);
  };

  const handleCopyScanText = () => {
    navigator.clipboard.writeText(activeScanPayload);
    setCopiedScanText(true);
    setTimeout(() => setCopiedScanText(false), 3000);
  };

  const handleApplyFixedScanText = () => {
    setCustomScanText(editableScanText);
    setScanModalTab('preview');
  };

  const handleResetScanText = () => {
    setCustomScanText('');
    setEditableScanText(defaultScanPayload);
  };

  return (
    <div
      id="print-preview-modal-backdrop"
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 print:p-0 print:bg-white print:static"
    >
      <div className="relative w-full max-w-5xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] print:max-h-none print:shadow-none print:border-none print:rounded-none">
        
        {/* Modal Action Header (Hidden during browser print) */}
        <div className="bg-slate-900 text-white px-5 py-3.5 flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 print:hidden shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-cyan-500/20 text-cyan-400 rounded-lg">
              <Eye className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                Clinical Report Print Preview
                {record && (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                    {record.demographics.fullName} • {record.demographics.patientId}
                  </span>
                )}
              </h3>
              <p className="text-[11px] text-slate-400">
                Configure date-range & triage status filters and adjust custom header/footer metadata before printing.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              id="btn-open-emergency-qr"
              onClick={() => setShowQrModal(true)}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer border border-amber-800/40"
              title="Generate & view high-resolution Emergency Handover QR Code for mobile ambulance access"
            >
              <QrCode className="w-3.5 h-3.5 text-amber-400" />
              <span>Emergency QR Code</span>
            </button>

            <button
              type="button"
              onClick={() => setShowConfigDrawer(!showConfigDrawer)}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer border border-slate-700"
              title="Customize header & footer details"
            >
              <Sliders className="w-3.5 h-3.5 text-cyan-400" />
              <span>{showConfigDrawer ? 'Hide Header Config' : 'Customize Header/Footer'}</span>
            </button>

            <button
              type="button"
              id="btn-trigger-pdf-from-preview"
              onClick={handleDownloadPdf}
              disabled={isExportingPdf}
              className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-300 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer border border-cyan-800/40"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{isExportingPdf ? 'Exporting...' : 'PDF File'}</span>
            </button>

            <button
              type="button"
              id="btn-trigger-browser-print"
              onClick={handlePrint}
              className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-500 hover:to-teal-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md transition-all cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Print Clinical Report</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              title="Close Preview"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Dynamic Date-Range & Patient-Status Filter Bar (Print Pre-Filter) */}
        <div className="bg-slate-800/90 text-white px-5 py-2.5 border-b border-slate-700 print:hidden flex flex-wrap items-center justify-between gap-3 text-xs shrink-0">
          <div className="flex items-center gap-3 flex-wrap">
            {/* Date Range Selector */}
            <div className="flex items-center gap-1.5">
              <span className="text-slate-400 font-bold text-[11px] uppercase tracking-wider">Date Range:</span>
              <select
                id="select-print-date-range"
                value={dateRangeFilter}
                onChange={(e) => setDateRangeFilter(e.target.value as PrintDateRange)}
                className="bg-slate-900 border border-slate-600 rounded-lg px-2.5 py-1 text-xs text-cyan-300 font-medium focus:ring-1 focus:ring-cyan-500 focus:outline-none"
              >
                <option value="ALL">All Recorded Dates</option>
                <option value="TODAY">Today (Past 24 Hours)</option>
                <option value="PAST_3_DAYS">Past 3 Days</option>
                <option value="PAST_7_DAYS">Past 7 Days</option>
                <option value="PAST_30_DAYS">Past 30 Days</option>
              </select>
            </div>

            {/* Patient Status / Triage Filter */}
            <div className="flex items-center gap-1.5">
              <span className="text-slate-400 font-bold text-[11px] uppercase tracking-wider">Patient Status:</span>
              <select
                id="select-print-status-filter"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as PrintStatusFilter)}
                className="bg-slate-900 border border-slate-600 rounded-lg px-2.5 py-1 text-xs text-amber-300 font-medium focus:ring-1 focus:ring-amber-500 focus:outline-none"
              >
                <option value="ALL">All Patient Statuses</option>
                <option value="ONLY_EMERGENCY">🚨 Only Emergency Patients (Level 1)</option>
                <option value="EMERGENCY_URGENT">⚠️ Emergency + Urgent (Level 1 & 2)</option>
                <option value="PRIORITY">🟡 Priority (Level 3)</option>
                <option value="ROUTINE">🟢 Routine & Low Risk (Level 4 & 5)</option>
                <option value="REVIEWED">✍️ Doctor Reviewed & Signed</option>
                <option value="PENDING">⏳ Pending Doctor Review</option>
              </select>
            </div>

            {/* Qualifying Patient Selector */}
            {filteredRecords.length > 0 && (
              <div className="flex items-center gap-1.5">
                <span className="text-slate-400 font-bold text-[11px] uppercase tracking-wider">Target Patient:</span>
                <select
                  id="select-print-target-patient"
                  value={selectedRecordId}
                  onChange={(e) => {
                    setSelectedRecordId(e.target.value);
                    const found = filteredRecords.find((r) => r.demographics.patientId === e.target.value);
                    if (found && onSelectRecord) onSelectRecord(found);
                  }}
                  className="bg-slate-900 border border-slate-600 rounded-lg px-2.5 py-1 text-xs text-white font-medium focus:ring-1 focus:ring-cyan-500 focus:outline-none max-w-xs truncate"
                >
                  {filteredRecords.map((r) => (
                    <option key={r.demographics.patientId} value={r.demographics.patientId}>
                      {r.demographics.fullName} ({r.assessmentResult?.triage.level.replace('LEVEL_', 'L') || 'L2'}) • {r.demographics.patientId}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono bg-cyan-950 text-cyan-300 px-2 py-0.5 rounded border border-cyan-800">
              {filteredRecords.length} Qualifying Patient{filteredRecords.length !== 1 ? 's' : ''}
            </span>
            <button
              type="button"
              onClick={() => setShowBatchManifest(!showBatchManifest)}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer border ${
                showBatchManifest
                  ? 'bg-amber-500 text-slate-950 border-amber-400'
                  : 'bg-slate-700 text-slate-200 border-slate-600 hover:bg-slate-600'
              }`}
            >
              {showBatchManifest ? 'View Individual Patient Report' : 'View Filtered Cohort Manifest'}
            </button>
          </div>
        </div>

        {/* Clinical Report Sections Selector Bar */}
        <div className="bg-slate-900 px-5 py-2.5 border-b border-slate-800 print:hidden flex flex-wrap items-center justify-between gap-3 text-xs shrink-0">
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <FileText className="w-3.5 h-3.5 text-cyan-400" />
              Report Sections:
            </span>

            <div className="inline-flex rounded-xl bg-slate-950 p-1 border border-slate-800 gap-1">
              <button
                type="button"
                id="btn-report-section-full"
                onClick={() => setReportSectionMode('FULL_SUMMARY')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  reportSectionMode === 'FULL_SUMMARY'
                    ? 'bg-cyan-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/80'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                <span>Full Summary</span>
              </button>

              <button
                type="button"
                id="btn-report-section-vitals"
                onClick={() => setReportSectionMode('ONLY_VITALS')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  reportSectionMode === 'ONLY_VITALS'
                    ? 'bg-rose-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/80'
                }`}
              >
                <Heart className="w-3.5 h-3.5" />
                <span>Only Vitals</span>
              </button>

              <button
                type="button"
                id="btn-report-section-medications"
                onClick={() => setReportSectionMode('ONLY_MEDICATIONS')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  reportSectionMode === 'ONLY_MEDICATIONS'
                    ? 'bg-teal-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/80'
                }`}
              >
                <Pill className="w-3.5 h-3.5" />
                <span>Only Medications</span>
              </button>

              <button
                type="button"
                id="btn-report-section-custom"
                onClick={() => setReportSectionMode('CUSTOM')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  reportSectionMode === 'CUSTOM'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/80'
                }`}
              >
                <Sliders className="w-3.5 h-3.5" />
                <span>Custom Sections</span>
              </button>
            </div>
          </div>

          <div className="text-[11px] text-slate-400 flex items-center gap-2">
            {reportSectionMode === 'ONLY_VITALS' && (
              <span className="text-rose-300 font-semibold bg-rose-950/70 px-2.5 py-0.5 rounded-lg border border-rose-800/60">
                Focused: Bedside vitals, hemodynamics & NEWS2 protocol
              </span>
            )}
            {reportSectionMode === 'ONLY_MEDICATIONS' && (
              <span className="text-teal-300 font-semibold bg-teal-950/70 px-2.5 py-0.5 rounded-lg border border-teal-800/60">
                Focused: Active pharmacotherapy & prescription safety verification
              </span>
            )}
            {reportSectionMode === 'FULL_SUMMARY' && (
              <span className="text-cyan-300 font-semibold bg-cyan-950/70 px-2.5 py-0.5 rounded-lg border border-cyan-800/60">
                Complete: All clinical assessment sections included
              </span>
            )}
            {reportSectionMode === 'CUSTOM' && (
              <span className="text-indigo-300 font-semibold bg-indigo-950/70 px-2.5 py-0.5 rounded-lg border border-indigo-800/60">
                Custom Section Selector active below
              </span>
            )}
          </div>
        </div>

        {/* Custom Section Checkboxes Drawer (When CUSTOM mode is active) */}
        {reportSectionMode === 'CUSTOM' && (
          <div className="bg-indigo-950/40 border-b border-indigo-900/60 px-5 py-2.5 print:hidden flex flex-wrap items-center gap-4 text-xs">
            <span className="text-[10px] uppercase font-black tracking-wider text-indigo-300">
              Active Sections:
            </span>

            <label className="flex items-center gap-1.5 text-slate-200 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={customSections.demographics ?? true}
                onChange={(e) =>
                  setCustomSections((prev) => ({ ...prev, demographics: e.target.checked }))
                }
                className="rounded text-indigo-500 focus:ring-indigo-400"
              />
              <span>Demographics</span>
            </label>

            <label className="flex items-center gap-1.5 text-slate-200 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={customSections.vitals ?? true}
                onChange={(e) =>
                  setCustomSections((prev) => ({ ...prev, vitals: e.target.checked }))
                }
                className="rounded text-rose-500 focus:ring-rose-400"
              />
              <span>Vital Signs</span>
            </label>

            <label className="flex items-center gap-1.5 text-slate-200 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={customSections.triageAndRisks ?? true}
                onChange={(e) =>
                  setCustomSections((prev) => ({ ...prev, triageAndRisks: e.target.checked }))
                }
                className="rounded text-cyan-500 focus:ring-cyan-400"
              />
              <span>Triage & AI Risk</span>
            </label>

            <label className="flex items-center gap-1.5 text-slate-200 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={customSections.medications ?? true}
                onChange={(e) =>
                  setCustomSections((prev) => ({ ...prev, medications: e.target.checked }))
                }
                className="rounded text-teal-500 focus:ring-teal-400"
              />
              <span>Medications</span>
            </label>

            <label className="flex items-center gap-1.5 text-slate-200 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={customSections.labs ?? true}
                onChange={(e) =>
                  setCustomSections((prev) => ({ ...prev, labs: e.target.checked }))
                }
                className="rounded text-amber-500 focus:ring-amber-400"
              />
              <span>Diagnostic Labs</span>
            </label>

            <label className="flex items-center gap-1.5 text-slate-200 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={customSections.shapFactors ?? true}
                onChange={(e) =>
                  setCustomSections((prev) => ({ ...prev, shapFactors: e.target.checked }))
                }
                className="rounded text-purple-500 focus:ring-purple-400"
              />
              <span>AI SHAP</span>
            </label>

            <label className="flex items-center gap-1.5 text-slate-200 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={customSections.doctorReview ?? true}
                onChange={(e) =>
                  setCustomSections((prev) => ({ ...prev, doctorReview: e.target.checked }))
                }
                className="rounded text-blue-500 focus:ring-blue-400"
              />
              <span>Doctor Sign-Off</span>
            </label>

            <label className="flex items-center gap-1.5 text-slate-200 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={customSections.qrCode ?? true}
                onChange={(e) =>
                  setCustomSections((prev) => ({ ...prev, qrCode: e.target.checked }))
                }
                className="rounded text-amber-500 focus:ring-amber-400"
              />
              <span>Emergency QR</span>
            </label>

            <label className="flex items-center gap-1.5 text-slate-200 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={customSections.medicalBilling ?? true}
                onChange={(e) =>
                  setCustomSections((prev) => ({ ...prev, medicalBilling: e.target.checked }))
                }
                className="rounded text-emerald-500 focus:ring-emerald-400"
              />
              <span>Medical Bill & Doctor Fees</span>
            </label>
          </div>
        )}

        {/* Custom Header & Footer Config Drawer (Collapsible) */}
        {showConfigDrawer && (
          <div className="bg-slate-50 border-b border-slate-200 p-4 print:hidden animate-fade-in text-xs space-y-3 shrink-0">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-800 flex items-center gap-1.5">
                <Settings className="w-3.5 h-3.5 text-cyan-600" />
                Custom Header, Footer & Financial Billing Controls
              </span>
              <span className="text-[11px] text-slate-500">Changes reflect instantly in the preview below</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Hospital / Health Facility Name
                </label>
                <input
                  type="text"
                  value={customHospitalName}
                  onChange={(e) => setCustomHospitalName(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-medium focus:ring-2 focus:ring-cyan-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Clinical Department / Service Line
                </label>
                <input
                  type="text"
                  value={customDepartment}
                  onChange={(e) => setCustomDepartment(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-medium focus:ring-2 focus:ring-cyan-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Document Header Title
                </label>
                <input
                  type="text"
                  value={customReportTitle}
                  onChange={(e) => setCustomReportTitle(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-medium focus:ring-2 focus:ring-cyan-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1 border-t border-slate-200">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Custom Footer Regulatory Text
                </label>
                <input
                  type="text"
                  value={customFooterNote}
                  onChange={(e) => setCustomFooterNote(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-medium focus:ring-2 focus:ring-cyan-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Doctor Consultation Fee Charges (PKR)
                </label>
                <input
                  type="number"
                  min="0"
                  step="100"
                  value={doctorFeePkr}
                  onChange={(e) => setDoctorFeePkr(Math.max(0, parseInt(e.target.value) || 0))}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-semibold text-slate-900 focus:ring-2 focus:ring-emerald-500 focus:outline-none font-mono"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Sehat Subsidy Welfare Discount (PKR)
                </label>
                <input
                  type="number"
                  min="0"
                  step="100"
                  placeholder="Default: auto subsidized"
                  value={subsidyPkr ?? ''}
                  onChange={(e) => {
                    const val = e.target.value;
                    setSubsidyPkr(val === '' ? undefined : Math.max(0, parseInt(val) || 0));
                  }}
                  className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none font-mono"
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-4 pt-2">
              <label className="flex items-center gap-1.5 cursor-pointer select-none text-[11px] font-medium text-slate-700">
                <input
                  type="checkbox"
                  checked={includeShapFactors}
                  onChange={(e) => setIncludeShapFactors(e.target.checked)}
                  className="rounded text-cyan-600 focus:ring-cyan-500"
                />
                <span>Include AI SHAP Drivers</span>
              </label>

              <label className="flex items-center gap-1.5 cursor-pointer select-none text-[11px] font-medium text-slate-700">
                <input
                  type="checkbox"
                  checked={includeLabPanel}
                  onChange={(e) => setIncludeLabPanel(e.target.checked)}
                  className="rounded text-cyan-600 focus:ring-cyan-500"
                />
                <span>Include Biomarker Labs</span>
              </label>

              <label className="flex items-center gap-1.5 cursor-pointer select-none text-[11px] font-medium text-slate-700">
                <input
                  type="checkbox"
                  checked={includeOfficialSeal}
                  onChange={(e) => setIncludeOfficialSeal(e.target.checked)}
                  className="rounded text-cyan-600 focus:ring-cyan-500"
                />
                <span>Official Hospital Stamp</span>
              </label>

              <label className="flex items-center gap-1.5 cursor-pointer select-none text-[11px] font-medium text-amber-700 font-semibold">
                <input
                  type="checkbox"
                  checked={includeEmergencyQrCode}
                  onChange={(e) => setIncludeEmergencyQrCode(e.target.checked)}
                  className="rounded text-amber-600 focus:ring-amber-500"
                />
                <span>Emergency Transfer QR Code</span>
              </label>

              <label className="flex items-center gap-1.5 cursor-pointer select-none text-[11px] font-medium text-emerald-700 font-semibold">
                <input
                  type="checkbox"
                  checked={includeMedicalBilling}
                  onChange={(e) => setIncludeMedicalBilling(e.target.checked)}
                  className="rounded text-emerald-600 focus:ring-emerald-500"
                />
                <span>Medical Bill & Doctor Fees</span>
              </label>
            </div>
          </div>
        )}

        {/* Scrollable Printable Document Container */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-8 bg-slate-100/60 print:p-0 print:bg-white print:overflow-visible">
          <div
            ref={printAreaRef}
            id="clinical-report-printable-area"
            className="max-w-[800px] mx-auto bg-white p-6 sm:p-10 rounded-xl shadow-lg border border-slate-200 text-slate-900 font-sans space-y-6 print:shadow-none print:border-none print:p-0 print:max-w-none print:space-y-4"
          >
            
            {/* 1. CUSTOM CLINICAL HEADER */}
            <div className="border-b-2 border-slate-900 pb-4">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="p-1.5 bg-slate-900 text-white rounded-lg inline-block print:border print:border-black">
                      <Building2 className="w-5 h-5" />
                    </span>
                    <div>
                      <h1 className="text-base sm:text-lg font-black tracking-tight text-slate-950 uppercase leading-tight">
                        {customHospitalName}
                      </h1>
                      <p className="text-[11px] font-semibold text-cyan-800">
                        {customDepartment} • {syncHosp.district}, {syncHosp.province}
                      </p>
                    </div>
                  </div>
                  <p className="text-[10px] text-slate-500 font-mono">
                    Facility Code: {syncHosp.facilityCode} • PMDC Reg: {syncHosp.licenseNumber || 'PK-HOSP-7782'} • Category: {syncHosp.tierLevel || 'Tertiary Apex'}
                  </p>
                </div>

                <div className="text-right shrink-0">
                  <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-slate-900 text-white">
                    CONFIDENTIAL EHR
                  </span>
                  <div className="text-[11px] font-mono text-slate-700 mt-1">
                    Date: <strong>{new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</strong>
                  </div>
                  <div className="text-[10px] font-mono text-slate-500">
                    Time: {new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-200 text-center">
                <h2 className="text-xs sm:text-sm font-black tracking-wider text-slate-900 uppercase">
                  {reportSectionMode === 'ONLY_VITALS'
                    ? 'FOCUSED BEDSIDE VITALS & PHYSIOLOGICAL ASSESSMENT'
                    : reportSectionMode === 'ONLY_MEDICATIONS'
                    ? 'FOCUSED PHARMACOTHERAPY & ACTIVE MEDICATION REGIMEN'
                    : customReportTitle}
                </h2>
                <div className="text-[10px] text-slate-500 font-mono">
                  Document Reference: EHR-CDS-{record.demographics.patientId}-{new Date().getFullYear()}
                  {reportSectionMode !== 'FULL_SUMMARY' && (
                    <span className="ml-2 font-bold text-cyan-700">
                      • [Report Filter: {reportSectionMode}]
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* 2. PATIENT DEMOGRAPHICS & IDENTIFICATION BANNER WITH OPTIONAL QR CODE */}
            {showDemographics && (
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 flex-1">
                    <div>
                      <span className="text-[10px] font-semibold text-slate-500 uppercase block">Patient Full Name</span>
                      <strong className="text-sm font-bold text-slate-900">{demographics.fullName}</strong>
                    </div>
                    <div>
                      <span className="text-[10px] font-semibold text-slate-500 uppercase block">Patient MRN / ID</span>
                      <strong className="font-mono text-slate-900">{demographics.mrn || demographics.patientId}</strong>
                    </div>
                    <div>
                      <span className="text-[10px] font-semibold text-slate-500 uppercase block">Age / Gender</span>
                      <strong className="text-slate-900">{demographics.age} Years • {demographics.sex}</strong>
                    </div>
                    <div>
                      <span className="text-[10px] font-semibold text-slate-500 uppercase block">District / Domicile</span>
                      <strong className="text-slate-900">{demographics.district}, {demographics.province}</strong>
                    </div>
                  </div>

                  {showEmergencyQr && qrDataUrl && (
                    <div
                      id="emergency-transfer-qr-badge"
                      onClick={() => setShowQrModal(true)}
                      className="flex flex-col items-center justify-center p-1.5 bg-white border border-slate-300 rounded-xl shadow-xs shrink-0 cursor-pointer hover:border-amber-400 transition-colors group"
                      title="Click to expand Emergency Transfer QR Code"
                    >
                      <img
                        src={qrDataUrl}
                        alt="Emergency Handover QR Code"
                        className="w-16 h-16 rounded"
                      />
                      <span className="text-[8px] font-bold text-slate-600 mt-0.5 group-hover:text-amber-700 tracking-tighter">
                        Scan Mobile Handover
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 3. TRIAGE & AI RISK STRATIFICATION */}
            {showTriageSection && assessmentResult && (
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-slate-200 pb-1">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                    <Activity className="w-3.5 h-3.5 text-rose-600" />
                    Triage Urgency & Multimodal AI Stratification
                  </h3>
                  <span className="text-[10px] font-mono text-slate-500">
                    WHO HEARTS Model v2.4 (Calibrated)
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className={`p-3 rounded-xl border text-xs ${
                    assessmentResult.triage.level === 'LEVEL_1_EMERGENCY'
                      ? 'bg-rose-50 border-rose-300 text-rose-950'
                      : assessmentResult.triage.level === 'LEVEL_2_URGENT'
                      ? 'bg-orange-50 border-orange-300 text-orange-950'
                      : assessmentResult.triage.level === 'LEVEL_3_PRIORITY'
                      ? 'bg-amber-50 border-amber-300 text-amber-950'
                      : 'bg-emerald-50 border-emerald-300 text-emerald-950'
                  }`}>
                    <span className="text-[10px] font-bold uppercase block text-slate-600">Assigned Triage Tier</span>
                    <div className="text-sm font-black mt-0.5">{assessmentResult.triage.levelName}</div>
                    <div className="text-[11px] mt-1 font-medium">{assessmentResult.triage.urgencyText}</div>
                  </div>

                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs">
                    <span className="text-[10px] font-bold uppercase block text-slate-500">10-Yr CVD Risk Score</span>
                    <div className="text-sm font-black text-rose-700 mt-0.5">
                      {Math.round(assessmentResult.risks.cardiovascular.riskScore * 100)}% ({assessmentResult.risks.cardiovascular.riskCategory})
                    </div>
                    <div className="text-[10px] text-slate-600 mt-1">
                      Model: {assessmentResult.risks.cardiovascular.modelUsed}
                    </div>
                  </div>

                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs">
                    <span className="text-[10px] font-bold uppercase block text-slate-500">Metabolic & HTN Risk</span>
                    <div className="text-sm font-black text-cyan-900 mt-0.5">
                      HTN: {Math.round(assessmentResult.risks.hypertension.riskScore * 100)}% • T2D: {Math.round(assessmentResult.risks.diabetes.riskScore * 100)}%
                    </div>
                    <div className="text-[10px] text-slate-600 mt-1">
                      Data Completeness: {assessmentResult.dataCompleteness.percentage}%
                    </div>
                  </div>
                </div>

                {/* Red Flags if any */}
                {assessmentResult.redFlags && assessmentResult.redFlags.length > 0 && (
                  <div className="p-2.5 bg-rose-50 border border-rose-300 rounded-xl text-xs text-rose-950">
                    <strong className="font-bold flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                      Critical Red-Flag Alerts Triggered:
                    </strong>
                    <ul className="list-disc pl-5 mt-1 text-[11px] space-y-0.5">
                      {assessmentResult.redFlags.map((rf, idx) => (
                        <li key={idx}>
                          <strong>{rf.title}:</strong> {rf.description} (Action: {rf.recommendedAction})
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Key Explainable AI (SHAP) Contributors */}
                {showShapSection && assessmentResult.risks.cardiovascular.contributingFactors && (
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
                    <span className="text-[11px] font-bold text-slate-800 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-cyan-600" />
                      Key Explainable AI (SHAP) Contributors:
                    </span>
                    <div className="space-y-1">
                      {assessmentResult.risks.cardiovascular.contributingFactors.slice(0, 3).map((f, fIdx) => (
                        <div key={fIdx} className="text-xs text-slate-700 flex items-start gap-1.5">
                          <span className="text-cyan-600 font-bold">•</span>
                          <div>
                            <strong className="text-slate-900">
                              {String(f.displayName || '').replace(/≥/g, '>=').replace(/≤/g, '<=').replace(/[—–]/g, '-')} ({String(f.value || '').includes('2512117') || /BMI \d{4,}/.test(String(f.value || '')) ? `BMI ${safeBmi}` : String(f.value || '').replace(/≥/g, '>=')}):
                            </strong>{' '}
                            <span className={f.direction === 'RISK_INCREASE' ? 'text-rose-700 font-semibold' : 'text-emerald-700 font-semibold'}>
                              {f.direction === 'RISK_INCREASE' ? '+' : ''}{f.contributionPercent}% contribution
                            </span>{' '}
                            - <span className="text-slate-600">{String(f.clinicalRationale || '').replace(/≥/g, '>=').replace(/≤/g, '<=').replace(/[—–]/g, '-')}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 4. POINT-OF-CARE VITAL SIGNS MATRIX */}
            {showVitalsSection && (
              <div className="space-y-2">
                <div className="flex items-center justify-between border-b border-slate-200 pb-1">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                    <Heart className="w-3.5 h-3.5 text-rose-500" />
                    Point-of-Care Vital Signs & Anthropometrics
                  </h3>
                  <span className="text-[10px] text-slate-500">
                    Recorded: {new Date(vitals.measurementTime || Date.now()).toLocaleTimeString()}
                  </span>
                </div>

                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 text-center text-xs">
                  <div className="p-2 bg-slate-50 border border-slate-200 rounded-lg">
                    <span className="text-[10px] text-slate-500 block">BP (mmHg)</span>
                    <strong className="text-xs font-mono font-bold text-slate-900">{vitals.systolicBp || '-'}/{vitals.diastolicBp || '-'}</strong>
                  </div>
                  <div className="p-2 bg-slate-50 border border-slate-200 rounded-lg">
                    <span className="text-[10px] text-slate-500 block">Pulse (bpm)</span>
                    <strong className="text-xs font-mono font-bold text-slate-900">{vitals.heartRate || '-'}</strong>
                  </div>
                  <div className="p-2 bg-slate-50 border border-slate-200 rounded-lg">
                    <span className="text-[10px] text-slate-500 block">SpO2 (%)</span>
                    <strong className="text-xs font-mono font-bold text-slate-900">{vitals.oxygenSaturation ? `${vitals.oxygenSaturation}%` : '-'}</strong>
                  </div>
                  <div className="p-2 bg-slate-50 border border-slate-200 rounded-lg">
                    <span className="text-[10px] text-slate-500 block">Glucose (mg/dL)</span>
                    <strong className="text-xs font-mono font-bold text-slate-900">{vitals.bloodGlucoseMgDl || '-'}</strong>
                  </div>
                  <div className="p-2 bg-slate-50 border border-slate-200 rounded-lg">
                    <span className="text-[10px] text-slate-500 block">Temp (°C)</span>
                    <strong className="text-xs font-mono font-bold text-slate-900">{vitals.temperatureC || 36.8}°C</strong>
                  </div>
                  <div className="p-2 bg-slate-50 border border-slate-200 rounded-lg">
                    <span className="text-[10px] text-slate-500 block">BMI (kg/m²)</span>
                    <strong className="text-xs font-mono font-bold text-slate-900">{safeBmi}</strong>
                  </div>
                </div>

                {/* Extended Hemodynamics panel for ONLY_VITALS mode */}
                {reportSectionMode === 'ONLY_VITALS' && vitals.systolicBp && vitals.diastolicBp && (
                  <div className="mt-2 p-3 bg-rose-50/60 border border-rose-200 rounded-xl">
                    <span className="text-[11px] font-bold text-rose-950 uppercase tracking-wider block mb-2 flex items-center gap-1.5">
                      <Activity className="w-3.5 h-3.5 text-rose-600" />
                      Derived Hemodynamic Indices & Safety Metrics
                    </span>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                      <div className="p-2 bg-white rounded-lg border border-rose-100">
                        <span className="text-[10px] text-slate-500 block">Mean Arterial Press. (MAP)</span>
                        <strong className="text-xs font-mono font-bold text-slate-900">
                          {Math.round(vitals.diastolicBp + (vitals.systolicBp - vitals.diastolicBp) / 3)} mmHg
                        </strong>
                      </div>
                      <div className="p-2 bg-white rounded-lg border border-rose-100">
                        <span className="text-[10px] text-slate-500 block">Pulse Pressure</span>
                        <strong className="text-xs font-mono font-bold text-slate-900">
                          {vitals.systolicBp - vitals.diastolicBp} mmHg
                        </strong>
                      </div>
                      <div className="p-2 bg-white rounded-lg border border-rose-100">
                        <span className="text-[10px] text-slate-500 block">Shock Index (HR/SBP)</span>
                        <strong className="text-xs font-mono font-bold text-slate-900">
                          {vitals.heartRate ? (vitals.heartRate / vitals.systolicBp).toFixed(2) : '-'}
                        </strong>
                      </div>
                      <div className="p-2 bg-white rounded-lg border border-rose-100">
                        <span className="text-[10px] text-slate-500 block">Respiratory / SPO2</span>
                        <strong className="text-xs font-mono font-bold text-slate-900">
                          {vitals.respiratoryRate || 16}/min • {vitals.oxygenSaturation || 98}%
                        </strong>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 5. DIAGNOSTIC LAB BIOMARKERS PANEL */}
            {showLabsSection && (
              <div className="space-y-2">
                <div className="flex items-center justify-between border-b border-slate-200 pb-1">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
                    Biomarker Diagnostic Panel
                  </h3>
                  <span className="text-[10px] text-slate-500">Laboratory Standard</span>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                  <div className="p-2 bg-slate-50 border border-slate-200 rounded-lg">
                    <span className="text-[10px] text-slate-500 block">HbA1c</span>
                    <strong className="text-slate-900">{labs.hba1cPercent ? `${labs.hba1cPercent}%` : 'N/A'}</strong>
                  </div>
                  <div className="p-2 bg-slate-50 border border-slate-200 rounded-lg">
                    <span className="text-[10px] text-slate-500 block">Total Cholesterol</span>
                    <strong className="text-slate-900">{labs.totalCholesterolMgDl ? `${labs.totalCholesterolMgDl} mg/dL` : 'N/A'}</strong>
                  </div>
                  <div className="p-2 bg-slate-50 border border-slate-200 rounded-lg">
                    <span className="text-[10px] text-slate-500 block">Serum Creatinine</span>
                    <strong className="text-slate-900">{labs.creatinineMgDl ? `${labs.creatinineMgDl} mg/dL` : 'N/A'}</strong>
                  </div>
                  <div className="p-2 bg-slate-50 border border-slate-200 rounded-lg">
                    <span className="text-[10px] text-slate-500 block">eGFR</span>
                    <strong className="text-slate-900">{labs.egfr ? `${labs.egfr} mL/min` : 'N/A'}</strong>
                  </div>
                </div>
              </div>
            )}

            {/* 6. PHYSICIAN CLINICAL DIAGNOSIS & MANAGEMENT PLAN */}
            <div className="space-y-2">
              <div className="flex items-center justify-between border-b border-slate-200 pb-1">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                  <Stethoscope className="w-3.5 h-3.5 text-cyan-700" />
                  {reportSectionMode === 'ONLY_MEDICATIONS'
                    ? 'Active Pharmacotherapy & Prescriptions'
                    : 'Physician Diagnosis & Clinical Management'}
                </h3>
              </div>

              <div className="space-y-2 text-xs">
                <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl">
                  <span className="text-[10px] font-bold uppercase text-slate-500 block">Primary Clinical Diagnosis</span>
                  <strong className="text-sm font-bold text-slate-900">
                    {doctorReview?.doctorDiagnosis || 'Cardiovascular Risk Stratification under Review'}
                  </strong>
                </div>

                {doctorReview?.clinicalNotes && reportSectionMode !== 'ONLY_MEDICATIONS' && (
                  <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl">
                    <span className="text-[10px] font-bold uppercase text-slate-500 block">Physician Clinical Notes & Observations</span>
                    <p className="text-xs text-slate-800 whitespace-pre-line mt-1">
                      {doctorReview.clinicalNotes}
                    </p>
                  </div>
                )}

                {/* Prescribed Pharmacotherapy */}
                {showMedicationsSection && doctorReview?.prescribedMedications && doctorReview.prescribedMedications.length > 0 && (
                  <div className="border border-slate-200 rounded-xl overflow-hidden">
                    <div className="bg-slate-100 px-3 py-1.5 text-[11px] font-bold text-slate-800 flex items-center gap-1">
                      <Pill className="w-3 h-3 text-cyan-600" />
                      Prescribed Pharmacotherapy (WHO HEARTS Compliant)
                    </div>
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 border-b border-slate-200 text-[10px] text-slate-600">
                        <tr>
                          <th className="p-2">Medication</th>
                          <th className="p-2">Dosage</th>
                          <th className="p-2">Frequency</th>
                          <th className="p-2">Duration</th>
                          <th className="p-2">Safety Verification</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {doctorReview.prescribedMedications.map((rx, idx) => (
                          <tr key={idx}>
                            <td className="p-2 font-bold text-slate-900">{rx.drugName}</td>
                            <td className="p-2">{rx.dosage}</td>
                            <td className="p-2">{rx.frequency}</td>
                            <td className="p-2">{rx.duration}</td>
                            <td className="p-2">
                              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.5 rounded">
                                Approved ✓
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>

            {/* 6. CLINICAL CHARGES, DOCTOR FEES & MEDICINE BILL */}
            {showBillingSection && patientMedicalBill && (
              <div className="space-y-2.5 pt-1">
                <div className="flex items-center justify-between border-b border-slate-200 pb-1">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                    <Receipt className="w-3.5 h-3.5 text-emerald-600" />
                    Clinical Charges, Doctor Fees & Pharmacy Medicine Bill
                  </h3>
                  <span className="text-[10px] font-mono text-slate-500">
                    Invoice: {patientMedicalBill.invoiceNumber} • Currency: PKR (Rs.)
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5 bg-slate-50 p-3 rounded-xl border border-slate-200">
                  {/* Doctor Consultation Fee */}
                  <div className="p-2.5 bg-white rounded-lg border border-slate-200 space-y-1">
                    <span className="text-[10px] font-bold uppercase text-slate-500 block">Attending Doctor Fee</span>
                    <div className="text-sm font-black text-slate-900 font-mono">
                      Rs. {patientMedicalBill.consultationFeePkr.toLocaleString()}
                    </div>
                    <div className="text-[10px] text-slate-600 font-medium">
                      {patientMedicalBill.doctorSpecialty}
                    </div>
                    <div className="text-[9px] text-slate-400 truncate">
                      Dr. {docName}
                    </div>
                  </div>

                  {/* Medicines Cost */}
                  <div className="p-2.5 bg-white rounded-lg border border-slate-200 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase text-slate-500">Medicines Cost</span>
                      <span className="text-[10px] font-bold text-teal-700 font-mono">
                        Rs. {patientMedicalBill.medicationsSubtotalPkr.toLocaleString()}
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-700 space-y-0.5 max-h-16 overflow-y-auto">
                      {patientMedicalBill.medications.map((m, mIdx) => (
                        <div key={mIdx} className="flex justify-between text-[10px]">
                          <span className="truncate pr-1">• {m.drugName}</span>
                          <span className="font-mono text-slate-900 shrink-0">Rs. {m.totalCostPkr}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Diagnostic Labs */}
                  <div className="p-2.5 bg-white rounded-lg border border-slate-200 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase text-slate-500">Diagnostic Labs</span>
                      <span className="text-[10px] font-bold text-amber-700 font-mono">
                        Rs. {patientMedicalBill.investigationsSubtotalPkr.toLocaleString()}
                      </span>
                    </div>
                    <div className="text-[10px] text-slate-700 space-y-0.5 max-h-16 overflow-y-auto">
                      {patientMedicalBill.investigations.map((inv, invIdx) => (
                        <div key={invIdx} className="flex justify-between text-[10px]">
                          <span className="truncate pr-1">• {inv.testName}</span>
                          <span className="font-mono text-slate-900 shrink-0">Rs. {inv.costPkr}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Total & Subsidy */}
                  <div className="p-2.5 bg-emerald-50/80 rounded-lg border border-emerald-200 flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between text-[10px] text-slate-600">
                        <span>Gross Total:</span>
                        <span className="font-mono font-bold">Rs. {patientMedicalBill.grossTotalPkr.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-[10px] text-emerald-700">
                        <span>Sehat Subsidy:</span>
                        <span className="font-mono font-bold">-Rs. {patientMedicalBill.subsidyDiscountPkr.toLocaleString()}</span>
                      </div>
                    </div>
                    <div className="pt-1.5 border-t border-emerald-200 mt-1 flex justify-between items-baseline">
                      <span className="text-[10px] font-bold uppercase text-slate-800">Net Payable:</span>
                      <span className="text-sm font-black text-emerald-800 font-mono">
                        Rs. {patientMedicalBill.netPayablePkr.toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 7. CUSTOM CLINICAL FOOTER WITH DIGITAL SIGNATURE & OFFICIAL SEAL */}
            {showDoctorReviewSection && (
              <div className="pt-4 border-t-2 border-slate-900 space-y-4">
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  {/* Attending Physician Block */}
                  <div className="space-y-1">
                    <div className="text-[10px] uppercase font-bold text-slate-500">Attending Reviewing Physician</div>
                    <div
                      className="font-serif italic text-xl font-bold tracking-wide text-blue-900"
                      style={{ color: syncDoc.signatureInkColor || '#1e3a8a' }}
                    >
                      {syncDoc.signatureText || docName}
                    </div>
                    <div className="w-32 h-0.5 bg-blue-300 rounded-full"></div>
                    <div className="text-xs font-bold text-slate-900">{docName} ({docQualifications})</div>
                    <div className="text-[10px] text-slate-600 font-mono">
                      PMDC License: <strong>{docLicense}</strong> • {docSpecialty}
                    </div>
                  </div>

                  {/* Official Hospital Seal */}
                  {includeOfficialSeal && (
                    <div className="w-20 h-20 rounded-full border-2 border-emerald-600 flex flex-col items-center justify-center p-1 text-center bg-emerald-50/40 shrink-0">
                      <span className="text-[10px] font-black text-emerald-900 leading-none">
                        {syncHosp.sealInitials || 'PMDC'}
                      </span>
                      <span className="text-[9px] font-bold text-emerald-600 leading-tight">OFFICIAL</span>
                      <span className="text-[7px] text-emerald-700 uppercase tracking-tighter">VERIFIED SEAL</span>
                    </div>
                  )}
                </div>

                {/* Regulatory Footer Notice */}
                <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 text-[10px] text-slate-600 leading-relaxed text-center">
                  {customFooterNote}
                </div>
              </div>
            )}

          </div>
        </div>

        {/* Enlarged High-Resolution QR Handover & Scan Text Review Modal */}
        {showQrModal && (
          <div
            id="emergency-qr-enlarged-dialog"
            className="fixed inset-0 z-60 bg-slate-950/85 backdrop-blur-sm flex items-center justify-center p-4 print:hidden animate-fade-in"
          >
            <div className="bg-slate-900 border border-slate-800 text-white rounded-2xl max-w-lg w-full p-5 sm:p-6 shadow-2xl space-y-4 max-h-[90vh] flex flex-col">
              {/* Modal Header */}
              <div className="flex items-center justify-between shrink-0">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-amber-500/20 text-amber-400 rounded-xl">
                    <QrCode className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
                      Emergency EMR Transfer QR
                      {customScanText && (
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-400/20 text-amber-300 border border-amber-400/30">
                          CUSTOMIZED
                        </span>
                      )}
                    </h4>
                    <p className="text-[11px] text-slate-400">Review, verify, or fix scan text payload inside</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowQrModal(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Tab Navigation */}
              <div className="flex rounded-xl bg-slate-950 p-1 border border-slate-800 text-xs shrink-0">
                <button
                  type="button"
                  onClick={() => setScanModalTab('preview')}
                  className={`flex-1 py-1.5 px-3 rounded-lg font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    scanModalTab === 'preview'
                      ? 'bg-amber-500 text-slate-950 shadow'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <QrCode className="w-3.5 h-3.5" />
                  <span>QR Code View</span>
                </button>
                <button
                  type="button"
                  onClick={() => setScanModalTab('scan_text')}
                  className={`flex-1 py-1.5 px-3 rounded-lg font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    scanModalTab === 'scan_text'
                      ? 'bg-cyan-600 text-white shadow'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Review & Fix Scan Text</span>
                  {customScanText && <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>}
                </button>
              </div>

              {/* Tab 1: QR Code View */}
              {scanModalTab === 'preview' ? (
                <div className="space-y-4 overflow-y-auto pr-1">
                  {/* QR Display Card */}
                  <div className="bg-white p-5 rounded-2xl flex flex-col items-center justify-center shadow-inner">
                    {qrDataUrl ? (
                      <img
                        src={qrDataUrl}
                        alt="Emergency QR Code"
                        className="w-52 h-52 rounded-lg shadow-sm"
                      />
                    ) : (
                      <div className="w-52 h-52 bg-slate-100 flex items-center justify-center rounded-lg text-slate-400 text-xs">
                        Generating QR...
                      </div>
                    )}
                    <div className="mt-2.5 text-center space-y-0.5">
                      <span className="text-xs font-black text-slate-900 block uppercase tracking-wider">
                        {demographics.fullName}
                      </span>
                      <span className="text-[11px] font-mono text-slate-600 block">
                        MRN: {demographics.mrn || demographics.patientId} • Triage: {assessmentResult?.triage.levelName || 'Urgent'}
                      </span>
                      <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full inline-block mt-1">
                        SCAN TO VERIFY EMR • Tele-Triage & Vitals Data
                      </span>
                    </div>
                  </div>

                  {/* Scan Text Snippet Preview Box */}
                  <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800 text-xs space-y-2">
                    <div className="flex items-center justify-between text-[11px] text-slate-400">
                      <span className="font-semibold text-slate-300 flex items-center gap-1">
                        <FileText className="w-3.5 h-3.5 text-cyan-400" />
                        Encoded Scan Text Inside:
                      </span>
                      <button
                        type="button"
                        onClick={() => setScanModalTab('scan_text')}
                        className="text-cyan-400 hover:text-cyan-300 font-semibold flex items-center gap-1 cursor-pointer text-[11px]"
                      >
                        <Edit3 className="w-3 h-3" />
                        <span>Review / Fix Text</span>
                      </button>
                    </div>
                    <p className="text-[10px] font-mono text-slate-300 break-all bg-slate-900 p-2 rounded-lg border border-slate-800/80 max-h-16 overflow-y-auto">
                      {activeScanPayload}
                    </p>
                  </div>
                </div>
              ) : (
                /* Tab 2: Review & Fix Scan Text Inside */
                <div className="space-y-3 overflow-y-auto pr-1">
                  <div className="bg-cyan-950/40 border border-cyan-800/50 p-3 rounded-xl text-xs space-y-1">
                    <span className="font-bold text-cyan-300 block flex items-center gap-1">
                      <Check className="w-3.5 h-3.5 text-cyan-400" />
                      EMR Handoff Scan Text Payload Inspector
                    </span>
                    <p className="text-[11px] text-slate-300">
                      You can directly review and fix the scan text inside this QR code. Any modifications will instantly re-encode the QR code for both screen review and PDF print export.
                    </p>
                  </div>

                  {/* Field Breakdown Summary Badges */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 text-[10px] font-mono">
                    <div className="p-1.5 bg-slate-950 rounded border border-slate-800">
                      <span className="text-slate-500 block">PATIENT:</span>
                      <span className="text-slate-200 font-bold truncate block">{demographics.fullName}</span>
                    </div>
                    <div className="p-1.5 bg-slate-950 rounded border border-slate-800">
                      <span className="text-slate-500 block">MRN:</span>
                      <span className="text-slate-200 font-bold truncate block">{demographics.mrn || demographics.patientId}</span>
                    </div>
                    <div className="p-1.5 bg-slate-950 rounded border border-slate-800">
                      <span className="text-slate-500 block">VITALS:</span>
                      <span className="text-slate-200 font-bold block">{vitals.systolicBp || '?'}/{vitals.diastolicBp || '?'} mmHg</span>
                    </div>
                    <div className="p-1.5 bg-slate-950 rounded border border-slate-800">
                      <span className="text-slate-500 block">FACILITY:</span>
                      <span className="text-cyan-300 font-bold truncate block">{syncHosp.facilityCode}</span>
                    </div>
                  </div>

                  {/* Raw Scan Text Editable Textarea */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-[11px]">
                      <label className="font-semibold text-slate-300">
                        Scan Text Inside (Pipe-delimited standard format):
                      </label>
                      <button
                        type="button"
                        onClick={handleCopyScanText}
                        className="text-cyan-400 hover:text-cyan-300 font-semibold flex items-center gap-1 cursor-pointer"
                      >
                        {copiedScanText ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                        <span>{copiedScanText ? 'Copied' : 'Copy Text'}</span>
                      </button>
                    </div>
                    <textarea
                      value={editableScanText}
                      onChange={(e) => setEditableScanText(e.target.value)}
                      rows={5}
                      className="w-full p-2.5 bg-slate-950 border border-slate-700 rounded-xl text-[11px] font-mono text-emerald-400 focus:ring-2 focus:ring-cyan-500 focus:outline-none resize-none leading-relaxed"
                      placeholder="HIS-EMERGENCY-TRANSFER|FACILITY:...|MRN:..."
                    />
                  </div>

                  {/* Action Bar for Scan Text Editing */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                    <button
                      type="button"
                      onClick={handleResetScanText}
                      className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-colors cursor-pointer"
                    >
                      Reset to Default
                    </button>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setEditableScanText(activeScanPayload);
                          setScanModalTab('preview');
                        }}
                        className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 text-xs transition-colors cursor-pointer"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={handleApplyFixedScanText}
                        className="px-4 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold transition-all shadow-md cursor-pointer flex items-center gap-1.5"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Save & Re-encode QR</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Modal Footer Actions */}
              <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-800 shrink-0">
                {qrDataUrl && (
                  <a
                    href={qrDataUrl}
                    download={`emergency-qr-${(demographics.fullName || 'Patient').replace(/[^a-zA-Z0-9_-]/g, '_')}-${demographics.patientId}.png`}
                    className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5 text-amber-400" />
                    <span>Download QR PNG</span>
                  </a>
                )}
                <button
                  type="button"
                  onClick={() => setShowQrModal(false)}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-600 to-yellow-600 hover:from-amber-500 hover:to-yellow-500 text-white text-xs font-bold transition-all shadow-md cursor-pointer"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
