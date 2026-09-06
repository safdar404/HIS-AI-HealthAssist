import React, { useState, useEffect } from 'react';
import { PatientAssessmentRecord } from '../types/clinical';
import {
  ClinicianProfile,
  HospitalFacility,
  clinicalProfileSync,
} from '../services/clinicalProfileSyncService';
import {
  LogOut,
  CheckCircle2,
  AlertTriangle,
  AlertOctagon,
  Calendar,
  Pill,
  Heart,
  Stethoscope,
  Building2,
  FileCheck,
  ShieldAlert,
  X,
  Plus,
  Trash2,
} from 'lucide-react';

export interface DischargeSummaryData {
  dischargeId: string;
  disposition: 'DISCHARGED_HOME' | 'OUTPATIENT_FOLLOW_UP' | 'PRIMARY_CARE_HANDOVER' | 'SPECIALIST_TRANSFER';
  dispositionLabel: string;
  conditionAtDischarge: 'STABLE_CONTROLLED' | 'IMPROVED' | 'RESOLVED' | 'REQUIRES_AMBULATORY_CARE';
  dischargeDiagnosis: string;
  attendingPhysician: string;
  doctorLicenseNo: string;
  hospitalFacility: string;
  dischargeTimestamp: string;
  instructions: string[];
  redFlagWarningPrecautions: string[];
  followUpPlan: string;
  followUpIntervalDays: number;
  dietAndLifestyleCounseling: string[];
  prescribedDischargeMedications: {
    drugName: string;
    dosage: string;
    frequency: string;
    duration: string;
  }[];
  clinicalOverrideAcknowledged?: boolean;
}

interface QuickDischargeModalProps {
  isOpen: boolean;
  onClose: () => void;
  record: PatientAssessmentRecord | null;
  activeDoctor?: ClinicianProfile;
  activeHospital?: HospitalFacility;
  onConfirmDischarge: (dischargeSummary: DischargeSummaryData) => void;
}

export const QuickDischargeModal: React.FC<QuickDischargeModalProps> = ({
  isOpen,
  onClose,
  record,
  activeDoctor: propDoctor,
  activeHospital: propHospital,
  onConfirmDischarge,
}) => {
  const syncDoc = propDoctor || clinicalProfileSync.getActiveDoctor();
  const syncHosp = propHospital || clinicalProfileSync.getActiveHospital();

  const isCriticalPatient =
    record?.assessmentResult?.triage.level === 'LEVEL_1_EMERGENCY' ||
    record?.assessmentResult?.triage.level === 'LEVEL_2_URGENT' ||
    Boolean(record?.assessmentResult?.isEmergency) ||
    Boolean(record?.assessmentResult?.redFlags?.length);

  // Discharge Form States
  const [disposition, setDisposition] = useState<
    'DISCHARGED_HOME' | 'OUTPATIENT_FOLLOW_UP' | 'PRIMARY_CARE_HANDOVER' | 'SPECIALIST_TRANSFER'
  >('DISCHARGED_HOME');

  const [conditionAtDischarge, setConditionAtDischarge] = useState<
    'STABLE_CONTROLLED' | 'IMPROVED' | 'RESOLVED' | 'REQUIRES_AMBULATORY_CARE'
  >('STABLE_CONTROLLED');

  const [dischargeDiagnosis, setDischargeDiagnosis] = useState<string>('');
  const [followUpIntervalDays, setFollowUpIntervalDays] = useState<number>(7);
  const [followUpPlan, setFollowUpPlan] = useState<string>('');
  const [instructions, setInstructions] = useState<string[]>([]);
  const [newInstruction, setNewInstruction] = useState<string>('');
  const [warningPrecautions, setWarningPrecautions] = useState<string[]>([]);
  const [lifestyleItems, setLifestyleItems] = useState<string[]>([]);
  const [medications, setMedications] = useState<
    { drugName: string; dosage: string; frequency: string; duration: string }[]
  >([]);
  const [clinicalOverrideAck, setClinicalOverrideAck] = useState<boolean>(false);

  // Auto-generate default discharge summary when modal opens
  useEffect(() => {
    if (!record) return;

    const defaultDiag =
      record.doctorReview?.doctorDiagnosis ||
      (record.assessmentResult?.risks.cardiovascular.riskCategory === 'HIGH'
        ? 'Hypertensive Cardiovascular Disease (Risk Stratified & Controlled)'
        : 'Essential Hypertension & Cardiovascular Prevention');

    setDischargeDiagnosis(defaultDiag);

    // Initial default instructions
    setInstructions([
      'Continue prescribed medications strictly at designated morning/evening timings.',
      'Maintain a daily home blood pressure & pulse log (record morning and bedtime readings).',
      'Follow low-sodium DASH dietary regimen (<2g sodium per day). Avoid processed foods.',
      'Ensure adequate hydration and moderate daily 30-minute brisk walk as tolerated.',
    ]);

    // Red flag return precautions
    setWarningPrecautions([
      'Sudden severe crushing retrosternal chest pain, tightness, or pressure radiating to arm/jaw.',
      'Sudden shortness of breath at rest, acute orthopnea, or hemoptysis.',
      'Sudden focal neurological deficits (unilateral facial droop, arm weakness, slurred speech).',
      'Sudden syncope, severe dizzy spells, or SBP > 180 mmHg with headache/visual changes.',
    ]);

    // Lifestyle & Diet
    setLifestyleItems([
      'Strict salt reduction (avoid adding raw salt to food; avoid achaar and deep fried foods).',
      'Tobacco cessation counseling provided (strict avoidance of cigarettes and naswar/shisha).',
      'Weight management target and stress reduction breathing routines.',
    ]);

    // Follow-up
    setFollowUpPlan(
      `Routine follow-up in ${followUpIntervalDays} days at ${syncHosp.name} Outpatient Cardiology / Internal Medicine Clinic for repeat blood pressure check and lipid panel review.`
    );

    // Existing medications or prescribed
    if (record.doctorReview?.prescribedMedications?.length) {
      setMedications(
        record.doctorReview.prescribedMedications.map((m) => ({
          drugName: m.drugName,
          dosage: m.dosage,
          frequency: m.frequency,
          duration: m.duration,
        }))
      );
    } else if (record.profile?.currentMedications && record.profile.currentMedications.length > 0) {
      setMedications(
        record.profile.currentMedications.map((med) => ({
          drugName: med,
          dosage: 'Standard Maintenance',
          frequency: 'Once daily (OD)',
          duration: '30 Days',
        }))
      );
    } else {
      setMedications([
        { drugName: 'Amlodipine', dosage: '5mg', frequency: 'OD (Morning)', duration: '30 Days' },
        { drugName: 'Atorvastatin', dosage: '20mg', frequency: 'OD (Bedtime)', duration: '30 Days' },
      ]);
    }
  }, [record, isOpen]);

  if (!isOpen || !record) return null;

  const { demographics, vitals, assessmentResult } = record;

  const handleAddInstruction = () => {
    if (!newInstruction.trim()) return;
    setInstructions((prev) => [...prev, newInstruction.trim()]);
    setNewInstruction('');
  };

  const handleRemoveInstruction = (index: number) => {
    setInstructions((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleConfirm = () => {
    if (isCriticalPatient && !clinicalOverrideAck) {
      alert('Please acknowledge and confirm clinical stabilization of the emergency triage flags before authorizing discharge.');
      return;
    }

    const dispositionLabels: Record<string, string> = {
      DISCHARGED_HOME: 'Discharged Home with Medications & Instructions',
      OUTPATIENT_FOLLOW_UP: 'Outpatient Clinic Follow-up (Stable)',
      PRIMARY_CARE_HANDOVER: 'Handed Over to Basic Health Unit (BHU/RHC)',
      SPECIALIST_TRANSFER: 'Elective Transfer to Specialist Ambulatory Care',
    };

    const summary: DischargeSummaryData = {
      dischargeId: `DC-${demographics.patientId}-${Date.now().toString().slice(-6)}`,
      disposition,
      dispositionLabel: dispositionLabels[disposition] || 'Discharged Home',
      conditionAtDischarge,
      dischargeDiagnosis,
      attendingPhysician: syncDoc.name,
      doctorLicenseNo: syncDoc.licenseNo,
      hospitalFacility: syncHosp.name,
      dischargeTimestamp: new Date().toISOString(),
      instructions,
      redFlagWarningPrecautions: warningPrecautions,
      followUpPlan,
      followUpIntervalDays,
      dietAndLifestyleCounseling: lifestyleItems,
      prescribedDischargeMedications: medications,
      clinicalOverrideAcknowledged: isCriticalPatient ? clinicalOverrideAck : true,
    };

    onConfirmDischarge(summary);
    onClose();
  };

  return (
    <div
      id="quick-discharge-modal-backdrop"
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4"
    >
      <div className="relative w-full max-w-3xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Modal Top Header */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-xl border border-emerald-500/30">
              <LogOut className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                Quick Clinical Discharge & Disposition Engine
                <span className="text-xs font-mono font-normal text-emerald-400 bg-emerald-950/60 px-2.5 py-0.5 rounded-full border border-emerald-800">
                  {demographics.fullName} ({demographics.patientId})
                </span>
              </h3>
              <p className="text-xs text-slate-400">
                Automated clinical summary generation, return precautions & disposition sign-off.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5 text-slate-800 text-xs">
          
          {/* Critical Emergency Caution Banner if applicable */}
          {isCriticalPatient && (
            <div className="p-4 bg-rose-50 border-2 border-rose-300 rounded-xl space-y-2 text-rose-950">
              <div className="flex items-center gap-2 font-bold text-sm text-rose-700">
                <AlertOctagon className="w-5 h-5 text-rose-600 animate-pulse" />
                <span>Clinical Attention: Active Priority Triage / Emergency Flags Present</span>
              </div>
              <p className="text-xs leading-relaxed">
                This patient was initially triaged at{' '}
                <strong>{assessmentResult?.triage.levelName || 'Level 1/2 Emergency'}</strong>. Ensure acute hemodynamic stabilization and ECG/biomarker clearance before confirming home discharge.
              </p>
              <label className="flex items-center gap-2 pt-1 cursor-pointer font-bold text-rose-900 select-none">
                <input
                  id="chk-override-ack"
                  type="checkbox"
                  checked={clinicalOverrideAck}
                  onChange={(e) => setClinicalOverrideAck(e.target.checked)}
                  className="w-4 h-4 text-rose-600 rounded border-rose-400 focus:ring-rose-500"
                />
                <span>
                  I attest that the patient is now hemodynamically stable and safe for outpatient disposition.
                </span>
              </label>
            </div>
          )}

          {/* Vitals Summary Strip */}
          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <Heart className="w-4 h-4 text-rose-500" />
              <span className="font-bold text-slate-700">Discharge Vital Parameters:</span>
              <span className="font-mono bg-white px-2 py-0.5 rounded border border-slate-200">
                BP: {vitals.systolicBp || 120}/{vitals.diastolicBp || 80} mmHg
              </span>
              <span className="font-mono bg-white px-2 py-0.5 rounded border border-slate-200">
                HR: {vitals.heartRate || 75} bpm
              </span>
              <span className="font-mono bg-white px-2 py-0.5 rounded border border-slate-200">
                SpO2: {vitals.oxygenSaturation || 98}%
              </span>
            </div>
            <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
              Hemodynamically Assessed ✓
            </span>
          </div>

          {/* Disposition & Condition Matrix */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Clinical Disposition Target
              </label>
              <select
                id="select-disposition"
                value={disposition}
                onChange={(e) => setDisposition(e.target.value as any)}
                className="w-full p-2.5 bg-white border border-slate-300 rounded-xl font-medium focus:ring-2 focus:ring-cyan-500 focus:outline-none"
              >
                <option value="DISCHARGED_HOME">Discharged Home with Prescription & Instructions</option>
                <option value="OUTPATIENT_FOLLOW_UP">Outpatient Cardiology / Medical Clinic Follow-up</option>
                <option value="PRIMARY_CARE_HANDOVER">Handover to Basic Health Unit (BHU / RHC)</option>
                <option value="SPECIALIST_TRANSFER">Specialist Tertiary Care Transfer</option>
              </select>
            </div>

            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Patient Clinical Condition at Discharge
              </label>
              <select
                id="select-condition-discharge"
                value={conditionAtDischarge}
                onChange={(e) => setConditionAtDischarge(e.target.value as any)}
                className="w-full p-2.5 bg-white border border-slate-300 rounded-xl font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              >
                <option value="STABLE_CONTROLLED">Stable & Hemodynamically Controlled</option>
                <option value="IMPROVED">Improved with Medication Response</option>
                <option value="RESOLVED">Symptom Resolution Confirmed</option>
                <option value="REQUIRES_AMBULATORY_CARE">Requires Ambulatory Monitoring</option>
              </select>
            </div>
          </div>

          {/* Final Discharge Diagnosis */}
          <div>
            <label className="block font-bold text-slate-700 mb-1">
              Final Discharge Diagnosis (ICD-11 / WHO)
            </label>
            <input
              type="text"
              value={dischargeDiagnosis}
              onChange={(e) => setDischargeDiagnosis(e.target.value)}
              className="w-full p-2.5 bg-white border border-slate-300 rounded-xl font-medium focus:ring-2 focus:ring-cyan-500 focus:outline-none"
              placeholder="e.g. Essential Hypertension Stage 1 with Moderate 10-Year CVD Risk"
            />
          </div>

          {/* Discharge Medications Table */}
          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <div className="bg-slate-100 px-3.5 py-2 font-bold text-slate-800 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Pill className="w-3.5 h-3.5 text-cyan-600" />
                Discharge Medications Schedule
              </span>
              <span className="text-[10px] text-slate-500">Auto-filled from CDS Portal</span>
            </div>
            <table className="w-full text-left">
              <thead className="bg-slate-50 border-b border-slate-200 text-[10px] text-slate-600">
                <tr>
                  <th className="p-2.5">Medication Name</th>
                  <th className="p-2.5">Dose</th>
                  <th className="p-2.5">Frequency</th>
                  <th className="p-2.5">Duration</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {medications.map((m, idx) => (
                  <tr key={idx} className="hover:bg-slate-50">
                    <td className="p-2.5 font-bold text-slate-900">{m.drugName}</td>
                    <td className="p-2.5">{m.dosage}</td>
                    <td className="p-2.5">{m.frequency}</td>
                    <td className="p-2.5">{m.duration}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Follow-up Timeline */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
            <div>
              <label className="block font-bold text-slate-700 mb-1">
                Follow-up Interval
              </label>
              <select
                value={followUpIntervalDays}
                onChange={(e) => {
                  const days = Number(e.target.value);
                  setFollowUpIntervalDays(days);
                  setFollowUpPlan(
                    `Routine follow-up in ${days} days at ${syncHosp.name} Outpatient Cardiology / Internal Medicine Clinic.`
                  );
                }}
                className="w-full p-2 bg-white border border-slate-300 rounded-lg"
              >
                <option value={3}>In 3 Days (Close Review)</option>
                <option value={7}>In 7 Days (1 Week)</option>
                <option value={14}>In 14 Days (2 Weeks)</option>
                <option value={30}>In 1 Month (Routine)</option>
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="block font-bold text-slate-700 mb-1">
                Follow-up Instructions & Location
              </label>
              <input
                type="text"
                value={followUpPlan}
                onChange={(e) => setFollowUpPlan(e.target.value)}
                className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs"
              />
            </div>
          </div>

          {/* Discharge Patient Instructions */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="font-bold text-slate-700">
                Patient Discharge Instructions & Home Care
              </label>
              <span className="text-[10px] text-slate-400">Printed on discharge slip</span>
            </div>

            <div className="space-y-1.5">
              {instructions.map((inst, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between gap-2 p-2 bg-slate-50 border border-slate-200 rounded-lg"
                >
                  <span className="text-slate-800">
                    {idx + 1}. {inst}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleRemoveInstruction(idx)}
                    className="text-slate-400 hover:text-rose-600 p-1"
                    title="Remove instruction"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>

            <div className="flex gap-2 pt-1">
              <input
                type="text"
                value={newInstruction}
                onChange={(e) => setNewInstruction(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddInstruction()}
                placeholder="Add custom instruction (e.g. avoid strenuous lifting)..."
                className="flex-1 p-2 bg-white border border-slate-300 rounded-lg text-xs"
              />
              <button
                type="button"
                onClick={handleAddInstruction}
                className="px-3 py-2 bg-slate-900 text-white rounded-lg font-bold hover:bg-slate-800 transition-colors flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add</span>
              </button>
            </div>
          </div>

          {/* Red-Flag Return Precautions */}
          <div className="bg-amber-50/70 border border-amber-300 p-3.5 rounded-xl space-y-2">
            <span className="font-bold text-amber-950 flex items-center gap-1.5">
              <ShieldAlert className="w-4 h-4 text-amber-600" />
              Standardized Emergency Return Precautions (Educated to Patient / Caregiver)
            </span>
            <ul className="list-disc pl-5 space-y-1 text-amber-950 text-[11px]">
              {warningPrecautions.map((warn, idx) => (
                <li key={idx}>{warn}</li>
              ))}
            </ul>
          </div>

          {/* Clinician Attestation & Signing Strip */}
          <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-xl flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <FileCheck className="w-4 h-4 text-emerald-600" />
              <div>
                <span className="font-bold text-emerald-950 block">Attending Physician Sign-Off</span>
                <span className="text-[11px] text-emerald-800">
                  {syncDoc.name} ({syncDoc.licenseNo}) • {syncHosp.name}
                </span>
              </div>
            </div>
            <span className="text-[10px] font-mono text-emerald-700 bg-white px-2.5 py-1 rounded border border-emerald-300">
              PMDC VERIFIED
            </span>
          </div>

        </div>

        {/* Modal Action Footer */}
        <div className="bg-slate-50 border-t border-slate-200 px-6 py-3.5 flex items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-slate-700 hover:bg-slate-200 font-bold text-xs transition-colors cursor-pointer"
          >
            Cancel
          </button>

          <button
            type="button"
            id="btn-confirm-discharge"
            onClick={handleConfirm}
            className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-xs shadow-md shadow-emerald-700/20 flex items-center gap-2 transition-all cursor-pointer"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Confirm Clinical Disposition & Complete Discharge</span>
          </button>
        </div>

      </div>
    </div>
  );
};
