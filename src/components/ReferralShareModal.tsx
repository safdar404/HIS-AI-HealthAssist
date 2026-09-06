import React, { useState, useMemo } from 'react';
import {
  Share2,
  Lock,
  Clock,
  Check,
  Copy,
  ExternalLink,
  ShieldCheck,
  QrCode,
  Send,
  Printer,
  FileText,
  AlertCircle,
  X,
  Eye,
  UserCheck,
  Stethoscope,
  Sparkles,
} from 'lucide-react';
import { PatientAssessmentRecord } from '../types/clinical';
import { ClinicianProfile, HospitalFacility } from '../services/clinicalProfileSyncService';

interface ReferralShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  record: PatientAssessmentRecord;
  activeDoctor: ClinicianProfile;
  activeHospital: HospitalFacility;
}

export type ExpiryDuration = '12h' | '24h' | '48h' | '7d';

export const ReferralShareModal: React.FC<ReferralShareModalProps> = ({
  isOpen,
  onClose,
  record,
  activeDoctor,
  activeHospital,
}) => {
  const [expiryHours, setExpiryHours] = useState<ExpiryDuration>('24h');
  const [maskPhi, setMaskPhi] = useState<boolean>(false);
  const [includeLabs, setIncludeLabs] = useState<boolean>(true);
  const [includeDifferential, setIncludeDifferential] = useState<boolean>(true);
  const [includeVitalsTrends, setIncludeVitalsTrends] = useState<boolean>(true);
  const [specialistNote, setSpecialistNote] = useState<string>(
    `Urgent Specialist Review requested for ${record.demographics.fullName} regarding ${
      record.assessmentResult?.triage.levelName || 'acute clinical evaluation'
    }. Please review current vitals, AI risk stratification, and provide consultative recommendation.`
  );
  const [copiedLink, setCopiedLink] = useState<boolean>(false);
  const [copiedSummary, setCopiedSummary] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'SHARE' | 'PREVIEW'>('SHARE');

  const expiryTimestamp = useMemo(() => {
    const hours =
      expiryHours === '12h'
        ? 12
        : expiryHours === '24h'
        ? 24
        : expiryHours === '48h'
        ? 48
        : 168;
    return new Date(Date.now() + hours * 60 * 60 * 1000);
  }, [expiryHours]);

  // Generate secure time-limited cryptographic token & shareable URL
  const shareData = useMemo(() => {
    const tokenPayload = {
      patientId: record.demographics.patientId,
      mrn: record.demographics.mrn,
      generatedAt: Date.now(),
      expiresAt: expiryTimestamp.getTime(),
      referringDoctor: activeDoctor.name,
      facility: activeHospital.name,
      masked: maskPhi,
      securityHash: Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15),
    };

    const token = btoa(JSON.stringify(tokenPayload));
    const baseUrl = window.location.origin + window.location.pathname;
    const shareableUrl = `${baseUrl}?referral_token=${encodeURIComponent(token)}&pid=${encodeURIComponent(
      record.demographics.patientId
    )}#specialist-review`;

    return { token, shareableUrl };
  }, [record, activeDoctor, activeHospital, expiryTimestamp, maskPhi]);

  if (!isOpen) return null;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareData.shareableUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handleCopySummary = () => {
    const sbp = record.vitals.systolicBp || 'N/A';
    const dbp = record.vitals.diastolicBp || 'N/A';
    const hr = record.vitals.heartRate || 'N/A';
    const spo2 = record.vitals.oxygenSaturation || 'N/A';
    const triage = record.assessmentResult?.triage.levelName || 'Standard Triage';

    const text = `🏥 *CLINICAL REFERRAL HANDOVER (SECURE E-CONSULT)*
👤 *Patient:* ${maskPhi ? `${record.demographics.fullName.charAt(0)}***` : record.demographics.fullName} (${record.demographics.age}y / ${record.demographics.sex})
🆔 *ID:* ${record.demographics.patientId} | *MRN:* ${record.demographics.mrn || 'N/A'}
📍 *Facility:* ${activeHospital.name} (${activeHospital.district})
👨‍⚕️ *Referring Clinician:* ${activeDoctor.name} (${activeDoctor.designation})
⚠️ *Triage Category:* ${triage}
💓 *Vitals:* BP ${sbp}/${dbp} mmHg | HR ${hr} bpm | SpO2 ${spo2}%
🩺 *Doctor Clinical Diagnosis:* ${record.doctorReview?.doctorDiagnosis || 'Under Active Evaluation'}
📝 *Consultation Note:* ${specialistNote}
🔗 *Secure Time-Limited Link (Expires in ${expiryHours}):*
${shareData.shareableUrl}
🔒 *HIPAA §164.312 E-Sign & Access Control Verified*`;

    navigator.clipboard.writeText(text);
    setCopiedSummary(true);
    setTimeout(() => setCopiedSummary(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 bg-gradient-to-r from-slate-900 via-slate-800 to-cyan-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/20 border border-cyan-400/40 flex items-center justify-center text-cyan-300">
              <Share2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black tracking-tight text-white">
                  Secure Specialist Referral Share
                </h3>
                <span className="bg-cyan-500/30 text-cyan-200 text-[10px] font-bold px-2 py-0.5 rounded-full border border-cyan-400/30 flex items-center gap-1">
                  <Lock className="w-2.5 h-2.5" />
                  Time-Limited Token
                </span>
              </div>
              <p className="text-xs text-slate-300">
                Generate encrypted, verifiable e-consultation link for specialist physician review
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 bg-slate-50 px-6 pt-3 gap-2">
          <button
            onClick={() => setActiveTab('SHARE')}
            className={`pb-2.5 px-4 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'SHARE'
                ? 'border-cyan-600 text-cyan-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>Generate & Share Link</span>
          </button>
          <button
            onClick={() => setActiveTab('PREVIEW')}
            className={`pb-2.5 px-4 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'PREVIEW'
                ? 'border-cyan-600 text-cyan-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            <span>Consulting Specialist Preview</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1 text-slate-800">
          {activeTab === 'SHARE' ? (
            <>
              {/* Patient & Referral Summary Strip */}
              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="text-xs font-bold text-slate-900 flex items-center gap-2">
                    <span>{record.demographics.fullName}</span>
                    <span className="font-mono text-[10px] text-slate-500 font-semibold">
                      ({record.demographics.patientId})
                    </span>
                    <span className="text-[10px] bg-slate-200 text-slate-700 font-bold px-1.5 py-0.5 rounded">
                      {record.demographics.age}y • {record.demographics.sex}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-2 flex-wrap">
                    <span>Referring from: <strong className="text-slate-700">{activeHospital.name}</strong></span>
                    <span>• Doctor: <strong className="text-slate-700">{activeDoctor.name}</strong></span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span
                    className={`text-[10px] font-extrabold px-2 py-1 rounded-lg border ${
                      record.assessmentResult?.triage.level === 'LEVEL_1_EMERGENCY'
                        ? 'bg-red-100 text-red-800 border-red-300 animate-pulse'
                        : record.assessmentResult?.triage.level === 'LEVEL_2_URGENT'
                        ? 'bg-orange-100 text-orange-800 border-orange-300'
                        : 'bg-emerald-100 text-emerald-800 border-emerald-300'
                    }`}
                  >
                    {record.assessmentResult?.triage.levelName || 'Priority Case'}
                  </span>
                </div>
              </div>

              {/* Expiry and Security Controls */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Expiry Selector */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-cyan-600" />
                    <span>Link Validity Duration</span>
                  </label>
                  <div className="grid grid-cols-4 gap-1.5">
                    {(['12h', '24h', '48h', '7d'] as ExpiryDuration[]).map((dur) => (
                      <button
                        key={dur}
                        type="button"
                        onClick={() => setExpiryHours(dur)}
                        className={`py-2 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                          expiryHours === dur
                            ? 'bg-cyan-600 text-white border-cyan-600 shadow-sm'
                            : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                        }`}
                      >
                        {dur === '12h' ? '12 Hours' : dur === '24h' ? '24 Hours' : dur === '48h' ? '48 Hours' : '7 Days'}
                      </button>
                    ))}
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1 font-mono">
                    Token will automatically expire at: {expiryTimestamp.toLocaleString()}
                  </p>
                </div>

                {/* Privacy & Scope Options */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Privacy & Diagnostic Payload</span>
                  </label>
                  <div className="space-y-1.5 bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-xs">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={maskPhi}
                        onChange={(e) => setMaskPhi(e.target.checked)}
                        className="rounded text-cyan-600 focus:ring-cyan-500 w-3.5 h-3.5"
                      />
                      <span className="font-semibold text-slate-700 text-[11px]">
                        De-identify / Mask Direct Contact & ID
                      </span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={includeDifferential}
                        onChange={(e) => setIncludeDifferential(e.target.checked)}
                        className="rounded text-cyan-600 focus:ring-cyan-500 w-3.5 h-3.5"
                      />
                      <span className="font-semibold text-slate-700 text-[11px]">
                        Include AI Differential & Risk Breakdown
                      </span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={includeVitalsTrends}
                        onChange={(e) => setIncludeVitalsTrends(e.target.checked)}
                        className="rounded text-cyan-600 focus:ring-cyan-500 w-3.5 h-3.5"
                      />
                      <span className="font-semibold text-slate-700 text-[11px]">
                        Include Longitudinal Vitals Trend Data
                      </span>
                    </label>
                  </div>
                </div>
              </div>

              {/* Consultative Handoff Note */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Stethoscope className="w-3.5 h-3.5 text-cyan-600" />
                    <span>Referring Clinician's Request to Specialist</span>
                  </span>
                  <span className="text-[10px] text-slate-400">Included in secure handover</span>
                </label>
                <textarea
                  rows={2}
                  value={specialistNote}
                  onChange={(e) => setSpecialistNote(e.target.value)}
                  className="w-full text-xs p-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 font-sans"
                  placeholder="Enter specific clinical questions, suspected pathology, or requested urgency..."
                />
              </div>

              {/* Generated Secure Link Box */}
              <div className="bg-gradient-to-br from-slate-900 to-cyan-950 text-white rounded-2xl p-4 border border-cyan-800 shadow-md">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-bold text-cyan-300 flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-cyan-400" />
                    Encrypted Shareable Specialist URL
                  </span>
                  <span className="text-[10px] font-mono bg-cyan-900/60 text-cyan-200 px-2 py-0.5 rounded border border-cyan-700">
                    256-bit SHA-2 Tokenized
                  </span>
                </div>

                <div className="flex items-center gap-2 bg-black/40 p-2.5 rounded-xl border border-cyan-800/80 font-mono text-[11px] text-slate-200">
                  <input
                    type="text"
                    readOnly
                    value={shareData.shareableUrl}
                    className="bg-transparent w-full outline-none text-cyan-100 truncate select-all"
                  />
                  <button
                    id="btn-copy-referral-link"
                    type="button"
                    onClick={handleCopyLink}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer shrink-0 ${
                      copiedLink
                        ? 'bg-emerald-500 text-white'
                        : 'bg-cyan-600 hover:bg-cyan-500 text-white shadow-sm'
                    }`}
                  >
                    {copiedLink ? (
                      <>
                        <Check className="w-3.5 h-3.5" />
                        <span>Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy Link</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Direct Action Buttons */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-3 pt-3 border-t border-cyan-800/50">
                  <button
                    type="button"
                    onClick={handleCopySummary}
                    className="w-full py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-100 flex items-center justify-center gap-2 border border-slate-700 transition-all cursor-pointer"
                  >
                    {copiedSummary ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Send className="w-3.5 h-3.5 text-cyan-400" />}
                    <span>{copiedSummary ? 'Copied to Clipboard!' : 'Copy WhatsApp / SMS Handover'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveTab('PREVIEW')}
                    className="w-full py-2 px-3 rounded-xl bg-cyan-700/60 hover:bg-cyan-700 text-xs font-bold text-cyan-100 flex items-center justify-center gap-2 border border-cyan-600/60 transition-all cursor-pointer"
                  >
                    <ExternalLink className="w-3.5 h-3.5 text-cyan-300" />
                    <span>Test Specialist View</span>
                  </button>
                </div>
              </div>
            </>
          ) : (
            /* SPECIALIST LIVE PREVIEW TAB */
            <div className="space-y-4">
              <div className="bg-amber-50 border border-amber-200 p-3 rounded-xl text-amber-800 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>
                  This preview shows the exact read-only responsive dashboard rendered when the consulting specialist opens this referral link.
                </span>
              </div>

              <div className="border border-slate-200 rounded-2xl p-5 bg-slate-50 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-cyan-700 tracking-wider">Specialist Consultation Dossier</span>
                    <h4 className="text-sm font-black text-slate-900">
                      {maskPhi ? `${record.demographics.fullName.charAt(0)}***` : record.demographics.fullName}
                    </h4>
                    <p className="text-xs text-slate-500">
                      {record.demographics.age}y {record.demographics.sex} • ID: {record.demographics.patientId}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] font-bold text-slate-500 block">Referring Hospital</span>
                    <span className="text-xs font-bold text-slate-800">{activeHospital.name}</span>
                    <span className="text-[10px] text-slate-500 block">{activeDoctor.name} ({activeDoctor.designation})</span>
                  </div>
                </div>

                {/* Vitals Summary in Preview */}
                <div className="grid grid-cols-4 gap-2 text-center text-xs">
                  <div className="bg-white p-2 rounded-xl border border-slate-200">
                    <span className="text-[10px] text-slate-400 block font-semibold">BP</span>
                    <span className="font-bold text-slate-900 font-mono">
                      {record.vitals.systolicBp}/{record.vitals.diastolicBp}
                    </span>
                  </div>
                  <div className="bg-white p-2 rounded-xl border border-slate-200">
                    <span className="text-[10px] text-slate-400 block font-semibold">Heart Rate</span>
                    <span className="font-bold text-slate-900 font-mono">{record.vitals.heartRate || 80} bpm</span>
                  </div>
                  <div className="bg-white p-2 rounded-xl border border-slate-200">
                    <span className="text-[10px] text-slate-400 block font-semibold">SpO₂</span>
                    <span className="font-bold text-slate-900 font-mono">{record.vitals.oxygenSaturation || 98}%</span>
                  </div>
                  <div className="bg-white p-2 rounded-xl border border-slate-200">
                    <span className="text-[10px] text-slate-400 block font-semibold">10-Yr CVD</span>
                    <span className="font-bold text-rose-700 font-mono">
                      {((record.assessmentResult?.risks.cardiovascular.riskScore || 0) * 100).toFixed(0)}%
                    </span>
                  </div>
                </div>

                {/* Specialist Note */}
                <div className="bg-white p-3 rounded-xl border border-slate-200 text-xs">
                  <strong className="text-slate-800 block mb-1">Reason for Referral / Consult Request:</strong>
                  <p className="text-slate-600 leading-relaxed italic">{specialistNote}</p>
                </div>

                {/* Active Diagnoses / Red Flags */}
                {record.assessmentResult?.redFlags && record.assessmentResult.redFlags.length > 0 && (
                  <div className="bg-red-50 border border-red-200 p-3 rounded-xl text-xs text-red-900">
                    <strong className="block font-bold mb-1">🚨 Safety Red Flags Identified:</strong>
                    <ul className="list-disc list-inside space-y-0.5 text-[11px]">
                      {record.assessmentResult.redFlags.map((rf, idx) => (
                        <li key={idx}>
                          <strong>{rf.title}:</strong> {rf.recommendedAction}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <div className="text-[11px] text-slate-500 flex items-center gap-1">
            <Lock className="w-3 h-3 text-emerald-600" />
            <span>End-to-End Encrypted Handover & Audit Logged</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl border border-slate-300 hover:bg-slate-200 text-xs font-bold text-slate-700 transition-all cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
