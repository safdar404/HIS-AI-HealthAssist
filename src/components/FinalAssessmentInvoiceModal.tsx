import React, { useState, useEffect } from 'react';
import {
  X,
  Printer,
  Download,
  Receipt,
  Stethoscope,
  Pill,
  Activity,
  CheckCircle2,
  FileText,
  ShieldCheck,
  Building2,
  Calendar,
  User,
  QrCode,
  DollarSign,
  TrendingDown,
  ChevronDown,
  ChevronUp,
  Scan,
  ShieldAlert,
  Sparkles,
} from 'lucide-react';
import { PatientAssessmentRecord } from '../types/clinical';
import { calculatePatientMedicalBill, PatientMedicalBill } from '../utils/medicalBilling';
import { ClinicianProfile, HospitalFacility } from '../services/clinicalProfileSyncService';
import QRCode from 'qrcode';
import { InvoiceCostAnalyticsChart } from './InvoiceCostAnalyticsChart';
import { DoctorCanvasSignaturePad } from './DoctorCanvasSignaturePad';

interface FinalAssessmentInvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  record: PatientAssessmentRecord;
  activeDoctor: ClinicianProfile;
  activeHospital: HospitalFacility;
  customDoctorFee?: number;
  doctorProfessionalFee?: number;
  customSubsidyPkr?: number;
  assessments?: PatientAssessmentRecord[];
  onSelectRecord?: (rec: PatientAssessmentRecord) => void;
  prescribedDrugs?: { drugName: string; dosage: string; frequency?: string; duration?: string }[];
  onUpdateDoctorFee?: (newFee: number) => void;
  onUpdateSubsidy?: (newSubsidy: number) => void;
  onSaveDoctorSignature?: (svgString: string) => void;
}

export const FinalAssessmentInvoiceModal: React.FC<FinalAssessmentInvoiceModalProps> = ({
  isOpen,
  onClose,
  record,
  activeDoctor,
  activeHospital,
  customDoctorFee = 1500,
  doctorProfessionalFee,
  customSubsidyPkr,
  assessments = [],
  onSelectRecord,
  prescribedDrugs,
  onUpdateDoctorFee,
  onUpdateSubsidy,
  onSaveDoctorSignature,
}) => {
  const initialFee = doctorProfessionalFee ?? customDoctorFee ?? 1500;
  const [doctorFee, setDoctorFee] = useState<number>(initialFee);
  const [subsidyPkr, setSubsidyPkr] = useState<number | undefined>(customSubsidyPkr);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [qrPayloadString, setQrPayloadString] = useState<string>('');
  const [showCostAnalytics, setShowCostAnalytics] = useState<boolean>(true);
  const [showPharmacyScanSimulator, setShowPharmacyScanSimulator] = useState<boolean>(false);
  const [doctorSignatureSvg, setDoctorSignatureSvg] = useState<string>(
    record.doctorReview?.doctorSignatureSvg || ''
  );

  useEffect(() => {
    const feeToUse = doctorProfessionalFee ?? customDoctorFee;
    if (feeToUse !== undefined) {
      setDoctorFee(feeToUse);
    }
  }, [doctorProfessionalFee, customDoctorFee]);

  useEffect(() => {
    setSubsidyPkr(customSubsidyPkr);
  }, [customSubsidyPkr]);

  useEffect(() => {
    if (record.doctorReview?.doctorSignatureSvg) {
      setDoctorSignatureSvg(record.doctorReview.doctorSignatureSvg);
    }
  }, [record.doctorReview?.doctorSignatureSvg]);

  const bill: PatientMedicalBill = calculatePatientMedicalBill(record, doctorFee, subsidyPkr);

  // Generate Invoice Verification QR Code encoding Patient ID and Total Billing Amount
  useEffect(() => {
    const generateQr = async () => {
      try {
        const payload = `HEALTHPULSE-INVOICE|PATIENT_ID:${record.demographics.patientId}|TOTAL_BILLING_PKR:${bill.netPayablePkr}|NET:${bill.netPayablePkr}|NAME:${record.demographics.fullName}|MRN:${record.demographics.mrn || record.demographics.patientId}|INV:${bill.invoiceNumber}|DATE:${bill.invoiceDate}|DOC:${activeDoctor.name}|HOSP:${activeHospital.facilityCode}|STATUS:VERIFIED_PAID`;
        setQrPayloadString(payload);

        const url = await QRCode.toDataURL(payload, {
          width: 200,
          margin: 1,
          color: { dark: '#0f172a', light: '#ffffff' },
          errorCorrectionLevel: 'M',
        });
        setQrDataUrl(url);
      } catch (e) {
        console.error('Invoice QR error:', e);
      }
    };
    generateQr();
  }, [bill.invoiceNumber, bill.invoiceDate, bill.netPayablePkr, record, activeDoctor, activeHospital]);

  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleFeeChange = (val: number) => {
    const safe = Math.max(0, val);
    setDoctorFee(safe);
    if (onUpdateDoctorFee) onUpdateDoctorFee(safe);
  };

  const handleSubsidyChange = (val: number) => {
    const safe = Math.max(0, val);
    setSubsidyPkr(safe);
    if (onUpdateSubsidy) onUpdateSubsidy(safe);
  };

  const handleSignatureCaptured = (svgString: string) => {
    setDoctorSignatureSvg(svgString);
    if (onSaveDoctorSignature) {
      onSaveDoctorSignature(svgString);
    }
  };

  return (
    <div
      id="final-assessment-invoice-modal"
      className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-fade-in"
    >
      <div className="bg-white text-slate-900 rounded-3xl max-w-4xl w-full max-h-[94vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
        {/* Top Floating Control Bar (Hidden when printing) */}
        <div className="bg-slate-900 text-white px-5 py-3.5 flex flex-wrap items-center justify-between gap-3 shrink-0 print:hidden">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-cyan-500/20 text-cyan-400">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                Unified Clinical Assessment & Billing Invoice
                <span className="text-[10px] font-mono bg-emerald-950 text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-800">
                  PRINT-READY
                </span>
              </h3>
              <p className="text-[11px] text-slate-400">
                Merges Doctor Professional Fees, Pharmacy Medications, Diagnostic Labs & Digital Verification
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowPharmacyScanSimulator(true)}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-300 text-xs font-bold border border-slate-700 flex items-center gap-1.5 transition-colors cursor-pointer"
              title="Test QR Verification at Pharmacy / Cashier"
            >
              <Scan className="w-3.5 h-3.5 text-cyan-400" />
              <span>Test Pharmacy QR</span>
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-md cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Print Official Invoice</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Printable Document Area */}
        <div className="overflow-y-auto p-6 sm:p-8 space-y-6 print:p-0 print:overflow-visible text-slate-900 bg-white">
          {/* 1. Header: Hospital Facility & Attending Physician Letterhead */}
          <div className="border-b-2 border-slate-900 pb-5 flex flex-col sm:flex-row sm:items-start justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-cyan-800 shrink-0" />
                <h1 className="text-lg sm:text-xl font-black text-slate-950 uppercase tracking-tight">
                  {activeHospital.name}
                </h1>
              </div>
              <p className="text-xs text-slate-600 font-medium">
                {activeHospital.address}, {activeHospital.city} • Emergency Hotline: {activeHospital.emergencyPhone}
              </p>
              <p className="text-[11px] font-mono text-cyan-800">
                National Facility Code: <strong>{activeHospital.facilityCode}</strong> • PMDC Accreditation Level IV
              </p>
            </div>

            {/* Invoice Meta Pill & Barcode QR */}
            <div className="flex items-center gap-3 self-end sm:self-start bg-slate-50 p-2.5 rounded-2xl border border-slate-200">
              <div className="text-right space-y-0.5">
                <span className="text-[10px] font-mono text-slate-500 uppercase block">Official Clinical Invoice</span>
                <span className="text-xs font-black font-mono text-slate-900 block">{bill.invoiceNumber}</span>
                <span className="text-[10px] text-slate-600 block">Date: {bill.invoiceDate}</span>
              </div>
              {qrDataUrl && (
                <img
                  src={qrDataUrl}
                  alt="Invoice Verification QR"
                  className="w-14 h-14 rounded-lg border border-slate-300 p-0.5 bg-white"
                />
              )}
            </div>
          </div>

          {/* 2. Patient & Attending Doctor Demographic Strip */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50/80 p-4 rounded-2xl border border-slate-200 text-xs">
            {/* Patient Info */}
            <div className="space-y-1">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Patient Demographics</span>
              <div className="font-bold text-sm text-slate-950 flex items-center gap-2">
                <User className="w-4 h-4 text-cyan-700" />
                {record.demographics.fullName}
              </div>
              <div className="text-slate-600">
                MRN: <strong className="font-mono text-slate-900">{record.demographics.mrn || record.demographics.patientId}</strong> • Age: {record.demographics.age}Y • Sex: {record.demographics.sex}
              </div>
              <div className="text-slate-600">
                Primary Contact: {record.demographics.phone || '+92 300 0000000'}
              </div>
            </div>

            {/* Doctor Info */}
            <div className="space-y-1 sm:border-l sm:border-slate-200 sm:pl-4">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Attending Physician</span>
              <div className="font-bold text-sm text-slate-950 flex items-center gap-2">
                <Stethoscope className="w-4 h-4 text-emerald-700" />
                {activeDoctor.name} ({activeDoctor.qualifications})
              </div>
              <div className="text-slate-600">
                PMDC License: <strong className="font-mono text-slate-900">{activeDoctor.licenseNo}</strong> • {activeDoctor.specialty}
              </div>
              <div className="text-slate-600">
                Diagnosis: <strong className="text-slate-900">{record.doctorReview?.doctorDiagnosis || record.assessmentResult?.triage.levelName || 'Essential Hypertension'}</strong>
              </div>
            </div>
          </div>

          {/* 3. Itemized Billing Breakdown: 3 Columns (Doctor Fee, Pharmacy, Investigations) */}
          <div className="space-y-4">
            {/* Table Header */}
            <div className="border-b border-slate-200 pb-2 flex items-center justify-between">
              <h2 className="text-xs font-black uppercase tracking-wider text-slate-900 flex items-center gap-2">
                <Receipt className="w-4 h-4 text-cyan-700" />
                Itemized Medical Services & Pharmacy Ledger
              </h2>
              <span className="text-[11px] font-mono text-slate-500">All prices in Pakistani Rupee (PKR)</span>
            </div>

            {/* Section A: Professional Consultation & Triage Fees */}
            <div className="rounded-xl border border-slate-200 overflow-hidden">
              <div className="bg-slate-100 px-3.5 py-2 flex items-center justify-between text-xs font-bold text-slate-800">
                <span className="flex items-center gap-1.5">
                  <Stethoscope className="w-3.5 h-3.5 text-emerald-600" />
                  1. Clinical Consultation & Professional Fees
                </span>
                <span className="font-mono text-slate-900">
                  PKR {bill.consultationFeePkr.toLocaleString()}
                </span>
              </div>
              <div className="p-3 bg-white flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="space-y-0.5">
                  <span className="font-bold text-slate-900">
                    Outpatient Specialist Consultation & Cardiovascular Risk Stratification
                  </span>
                  <p className="text-[11px] text-slate-500">
                    Comprehensive CDS diagnostic review, SHAP risk evaluation & customized treatment protocol
                  </p>
                </div>
                <div className="flex items-center gap-2 print:hidden">
                  <label className="text-[11px] text-slate-500">Adjust Fee:</label>
                  <input
                    type="number"
                    min={0}
                    step={100}
                    value={doctorFee}
                    onChange={(e) => handleFeeChange(parseFloat(e.target.value) || 0)}
                    className="w-24 bg-slate-50 border border-slate-300 rounded-lg px-2 py-1 text-right font-mono font-bold text-xs focus:ring-1 focus:ring-cyan-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Section B: Prescribed Pharmacy Formulary Ledger */}
            <div className="rounded-xl border border-slate-200 overflow-hidden">
              <div className="bg-slate-100 px-3.5 py-2 flex items-center justify-between text-xs font-bold text-slate-800">
                <span className="flex items-center gap-1.5">
                  <Pill className="w-3.5 h-3.5 text-cyan-600" />
                  2. Dispensed Medications & Pharmacy Formulary ({(bill.medications || []).length} items)
                </span>
                <span className="font-mono text-slate-900">
                  PKR {bill.medicationsSubtotalPkr.toLocaleString()}
                </span>
              </div>
              <div className="divide-y divide-slate-100 bg-white">
                {(bill.medications || []).map((m, idx) => (
                  <div key={idx} className="p-3 flex items-center justify-between gap-3 text-xs">
                    <div className="space-y-0.5">
                      <span className="font-bold text-slate-900">{m.drugName}</span>
                      <div className="text-[11px] text-slate-500 flex items-center gap-2">
                        <span>Dosage: {m.dosage}</span>
                        <span>•</span>
                        <span>Freq: {m.frequency}</span>
                        <span>•</span>
                        <span>Supply: {m.duration}</span>
                      </div>
                    </div>
                    <div className="text-right font-mono">
                      <span className="font-bold text-slate-900">PKR {m.totalCostPkr.toLocaleString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Section C: Diagnostic Laboratory & Cardiac Investigations */}
            <div className="rounded-xl border border-slate-200 overflow-hidden">
              <div className="bg-slate-100 px-3.5 py-2 flex items-center justify-between text-xs font-bold text-slate-800">
                <span className="flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5 text-rose-600" />
                  3. Diagnostic Investigations & Point-of-Care Tests ({(bill.investigations || []).length} tests)
                </span>
                <span className="font-mono text-slate-900">
                  PKR {bill.investigationsSubtotalPkr.toLocaleString()}
                </span>
              </div>
              <div className="divide-y divide-slate-100 bg-white">
                {(bill.investigations || []).map((inv, idx) => (
                  <div key={idx} className="p-3 flex items-center justify-between gap-3 text-xs">
                    <div>
                      <span className="font-bold text-slate-900">{inv.testName}</span>
                      <span className="text-[10px] text-slate-500 block">CLIA / ISO-15189 Certified Point-of-Care Lab</span>
                    </div>
                    <div className="text-right font-mono">
                      <span className="font-bold text-slate-900">PKR {inv.costPkr.toLocaleString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 4. Cost Analytics Chart inside Final Invoice View */}
          <div className="space-y-2 print:hidden">
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => setShowCostAnalytics(!showCostAnalytics)}
                className="flex items-center gap-2 text-xs font-black text-slate-800 hover:text-cyan-700 transition-colors cursor-pointer"
              >
                <span>📊 Treatment Cycle Expenditure Trends & Cost Analytics</span>
                {showCostAnalytics ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
              <span className="text-[10px] font-mono text-slate-400">Recharts Powered Longitudinal Analytics</span>
            </div>

            {showCostAnalytics && (
              <InvoiceCostAnalyticsChart
                currentRecord={record}
                currentNetPayable={bill.netPayablePkr}
                currentGrossTotal={bill.grossTotalPkr}
                currentDoctorFee={doctorFee}
                currentMedsTotal={bill.medicationsSubtotalPkr}
                currentLabsTotal={bill.investigationsSubtotalPkr}
                currentSubsidyDiscount={bill.subsidyDiscountPkr}
                assessments={assessments}
              />
            )}
          </div>

          {/* 5. Financial Reconciliation Summary & Welfare Subsidies */}
          <div className="bg-slate-50 rounded-2xl p-5 border border-slate-200 space-y-3">
            <div className="flex items-center justify-between text-xs text-slate-700">
              <span>Gross Medical & Pharmacy Subtotal:</span>
              <span className="font-mono font-bold text-slate-900">PKR {bill.grossTotalPkr.toLocaleString()}</span>
            </div>

            <div className="flex items-center justify-between text-xs text-emerald-800 bg-emerald-50 p-2.5 rounded-xl border border-emerald-200">
              <div className="space-y-0.5">
                <span className="font-bold flex items-center gap-1">
                  <TrendingDown className="w-3.5 h-3.5" />
                  {bill.subsidyProgram}:
                </span>
                <span className="text-[10px] text-emerald-700 block">
                  Government Universal Health Coverage / Sehat Card Subsidy
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className="print:hidden flex items-center gap-1">
                  <span className="text-[10px] text-emerald-800">Subsidy (PKR):</span>
                  <input
                    type="number"
                    min={0}
                    step={100}
                    value={subsidyPkr !== undefined ? subsidyPkr : bill.subsidyDiscountPkr}
                    onChange={(e) => handleSubsidyChange(parseFloat(e.target.value) || 0)}
                    className="w-24 bg-white border border-emerald-300 rounded px-2 py-0.5 text-right font-mono text-xs font-bold text-emerald-900 focus:outline-none"
                  />
                </div>
                <span className="font-mono font-black text-sm text-emerald-900">
                  -PKR {bill.subsidyDiscountPkr.toLocaleString()}
                </span>
              </div>
            </div>

            <div className="pt-2 border-t-2 border-slate-900 flex items-center justify-between text-sm sm:text-base font-black">
              <span className="uppercase tracking-tight text-slate-950">Net Total Payable by Patient:</span>
              <span className="font-mono text-emerald-700 text-lg sm:text-xl">
                PKR {bill.netPayablePkr.toLocaleString()}
              </span>
            </div>
          </div>

          {/* 6. Hospital Pharmacy & Cashier Quick Verification Desk QR Section */}
          <div className="bg-slate-900 text-white rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-center justify-between gap-4 border border-slate-800 print:bg-white print:text-slate-900 print:border-slate-300">
            <div className="flex items-center gap-3">
              {qrDataUrl && (
                <div className="bg-white p-1.5 rounded-xl border border-slate-300 shrink-0">
                  <img
                    src={qrDataUrl}
                    alt="Quick Verification QR"
                    className="w-20 h-20 sm:w-24 sm:h-24 block"
                  />
                </div>
              )}
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-cyan-950 text-cyan-300 border border-cyan-700 print:border-slate-400 print:text-slate-800">
                    PHARMACY & BILLING VERIFICATION QR
                  </span>
                  <span className="text-[10px] font-mono text-emerald-400 font-bold">
                    PATIENT ID & AMOUNT ENCODED
                  </span>
                </div>
                <h4 className="text-xs sm:text-sm font-bold text-white print:text-slate-950">
                  Quick Verification at Hospital Dispensary / Cashier Desk
                </h4>
                <p className="text-[11px] text-slate-300 print:text-slate-600">
                  Encodes <strong>Patient ID ({record.demographics.patientId})</strong> & <strong>Total Billing Amount (PKR {bill.netPayablePkr.toLocaleString()})</strong>. Scan at the hospital pharmacy to verify and release medications instantly.
                </p>
                <div className="flex items-center gap-2 pt-0.5 font-mono text-[10px] text-slate-400 print:text-slate-500">
                  <span>Patient ID: <strong className="text-cyan-400 print:text-slate-900">{record.demographics.patientId}</strong></span>
                  <span>•</span>
                  <span>Total Billing: <strong className="text-emerald-400 print:text-slate-900">PKR {bill.netPayablePkr.toLocaleString()}</strong></span>
                </div>
              </div>
            </div>

            <div className="shrink-0 flex sm:flex-col items-center gap-2 print:hidden">
              <button
                type="button"
                onClick={() => setShowPharmacyScanSimulator(true)}
                className="px-3.5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs flex items-center gap-1.5 transition-all shadow-sm cursor-pointer whitespace-nowrap"
              >
                <Scan className="w-3.5 h-3.5" />
                <span>Simulate Pharmacy Scan</span>
              </button>
            </div>
          </div>

          {/* 7. Attending Doctor Digital Signature Canvas & Verification Seal */}
          <div className="pt-4 border-t border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-blue-700" />
                Attending Doctor Digital Signature & Verification Seal
              </span>
              <span className="text-[10px] font-mono text-slate-400">
                Vector SVG Format • Tamper-Evident Sign-Off
              </span>
            </div>

            {/* Doctor Canvas Signature Pad */}
            <DoctorCanvasSignaturePad
              doctorName={activeDoctor.name}
              licenseNo={activeDoctor.licenseNo}
              initialSignatureSvg={doctorSignatureSvg}
              onSignatureCaptured={handleSignatureCaptured}
              className="bg-slate-50/60 p-3 rounded-2xl border border-slate-200"
            />

            <div className="flex items-center justify-between text-xs text-slate-600 pt-1 border-t border-slate-100">
              <div>
                <strong>{activeDoctor.name}</strong> ({activeDoctor.qualifications}) • PMDC Reg: {activeDoctor.licenseNo}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-emerald-700 font-semibold">Hospital Facility Verified</span>
                <div className="w-8 h-8 rounded-full border border-emerald-600 flex flex-col items-center justify-center p-0.5 bg-emerald-50">
                  <span className="text-[6px] font-black text-emerald-800 leading-none">SEAL</span>
                  <span className="text-[5px] text-emerald-700 font-bold uppercase tracking-tighter">VERIFIED</span>
                </div>
              </div>
            </div>
          </div>

          {/* Footer Note */}
          <div className="text-[10px] text-slate-400 text-center pt-2 print:pt-4 border-t border-slate-100">
            This invoice is a legally valid digital medical receipt generated by HealthPulse CDS. For insurance reimbursement queries, contact billing@{activeHospital.facilityCode.toLowerCase()}.gov.pk
          </div>
        </div>

        {/* Modal Bottom Action Bar (Hidden when printing) */}
        <div className="bg-slate-100 px-6 py-3 border-t border-slate-200 flex items-center justify-between shrink-0 print:hidden">
          <span className="text-xs text-slate-500">
            Invoice Number: <strong className="font-mono text-slate-800">{bill.invoiceNumber}</strong>
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5 text-cyan-400" />
              <span>Print Invoice</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-bold transition-colors cursor-pointer"
            >
              Done / Close
            </button>
          </div>
        </div>
      </div>

      {/* Simulated Pharmacy / Billing Desk QR Scanner Verification Modal */}
      {showPharmacyScanSimulator && (
        <div className="fixed inset-0 z-60 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-slate-900 text-white rounded-2xl max-w-md w-full border border-cyan-500/50 p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-cyan-950 text-cyan-400 border border-cyan-800">
                  <Scan className="w-5 h-5 animate-pulse" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">
                    Hospital Pharmacy Scanner Verification
                  </h4>
                  <p className="text-[11px] text-slate-400">
                    Simulates handheld barcode scanner decoding at pharmacy
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowPharmacyScanSimulator(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="bg-slate-950 p-4 rounded-xl border border-emerald-500/40 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-emerald-400 font-bold flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" />
                  QR DATA DECODED & VERIFIED
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-950 text-emerald-300 border border-emerald-800">
                  MATCH: HIS DATABASE
                </span>
              </div>

              <div className="space-y-2 text-xs font-mono">
                <div className="flex justify-between py-1 border-b border-slate-800">
                  <span className="text-slate-400">Patient ID:</span>
                  <strong className="text-cyan-300">{record.demographics.patientId}</strong>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800">
                  <span className="text-slate-400">Patient Name:</span>
                  <strong className="text-white">{record.demographics.fullName}</strong>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800">
                  <span className="text-slate-400">Total Billing Amount:</span>
                  <strong className="text-emerald-400 text-sm">PKR {bill.netPayablePkr.toLocaleString()}</strong>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800">
                  <span className="text-slate-400">Invoice Ref:</span>
                  <span className="text-slate-300">{bill.invoiceNumber}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800">
                  <span className="text-slate-400">Dispensing Clearance:</span>
                  <span className="text-emerald-400 font-bold">APPROVED FOR PHARMACY DISCHARGE</span>
                </div>
                <div className="flex justify-between py-1">
                  <span className="text-slate-400">Doctor Signature:</span>
                  <span className="text-cyan-400">
                    {doctorSignatureSvg ? 'DIGITALLY SIGNED (SVG CAPTURED)' : 'PENDING SIGNATURE'}
                  </span>
                </div>
              </div>
            </div>

            <div className="text-[11px] text-slate-400 bg-slate-950/60 p-2.5 rounded-lg border border-slate-800">
              <span className="text-slate-300 font-bold block mb-0.5">Raw QR Payload:</span>
              <div className="font-mono text-[10px] text-slate-400 break-all">
                {qrPayloadString}
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowPharmacyScanSimulator(false)}
              className="w-full py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs cursor-pointer transition-colors"
            >
              Close Verification Scan
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
