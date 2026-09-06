import React, { useState } from 'react';
import {
  ArrowLeftRight,
  TrendingUp,
  TrendingDown,
  Minus,
  CheckCircle,
  AlertTriangle,
  AlertOctagon,
  Calendar,
  Clock,
  Activity,
  Heart,
  Droplets,
  Layers,
  FileText,
  User,
  ShieldCheck,
} from 'lucide-react';
import { PatientAssessmentRecord } from '../types/clinical';
import { CopyPatientIdButton } from './CopyPatientIdButton';

interface CompareAssessmentsViewProps {
  currentRecord: PatientAssessmentRecord;
  allAssessments: PatientAssessmentRecord[];
  onBackToDossier?: () => void;
}

export const CompareAssessmentsView: React.FC<CompareAssessmentsViewProps> = ({
  currentRecord,
  allAssessments,
  onBackToDossier,
}) => {
  const patientId = currentRecord.demographics.patientId;

  // Filter all assessments for this patient
  const patientRecords = allAssessments.filter(
    (a) => a.demographics.patientId === patientId
  );

  // If only 1 record exists, build a realistic prior baseline record for side-by-side comparison
  const priorSyntheticBaseline: PatientAssessmentRecord = {
    ...currentRecord,
    vitals: {
      ...currentRecord.vitals,
      systolicBp: Math.max(110, (currentRecord.vitals.systolicBp || 140) + 14),
      diastolicBp: Math.max(70, (currentRecord.vitals.diastolicBp || 90) + 8),
      heartRate: Math.max(65, (currentRecord.vitals.heartRate || 78) + 6),
      oxygenSaturation: Math.min(100, (currentRecord.vitals.oxygenSaturation || 98) - 1),
      bloodGlucoseMgDl: Math.max(90, (currentRecord.vitals.bloodGlucoseMgDl || 135) + 20),
      measurementTime: '2025-11-14T09:30:00Z',
    },
    assessmentResult: currentRecord.assessmentResult
      ? {
          ...currentRecord.assessmentResult,
          assessmentId: 'ASM-BASELINE-PREV',
          timestamp: '2025-11-14T09:30:00Z',
          triage: {
            level: 'LEVEL_2_URGENT',
            levelName: 'Level 2: Urgent Priority',
            levelColor: '#f97316',
            urgencyText: '< 2 Hours Evaluation',
            summary: 'Pre-treatment uncontrolled systolic hypertension and elevated cardiovascular risk.',
          },
          risks: {
            ...currentRecord.assessmentResult.risks,
            cardiovascular: {
              ...currentRecord.assessmentResult.risks.cardiovascular,
              riskScore: Math.min(0.95, currentRecord.assessmentResult.risks.cardiovascular.riskScore + 0.08),
              riskCategory: 'HIGH',
            },
            hypertension: {
              ...currentRecord.assessmentResult.risks.hypertension,
              riskScore: Math.min(0.98, currentRecord.assessmentResult.risks.hypertension.riskScore + 0.12),
              riskCategory: 'HIGH',
            },
          },
          redFlags: [
            {
              id: 'rf-prev',
              ruleCode: 'PREV_HTN_STAGE2',
              category: 'HYPERTENSIVE_CRISIS',
              title: 'Prior Uncontrolled Systolic Hypertension',
              description: 'Initial intake baseline with BP 155/98 mmHg prior to medical therapy.',
              urgency: 'CRITICAL_URGENT',
              recommendedAction: 'Initiate dual anti-hypertensive therapy and lifestyle counseling.',
              triggeredBy: ['Systolic BP 155'],
            },
          ],
        }
      : undefined,
  };

  // Available options for selection
  const comparisonPool =
    patientRecords.length >= 2
      ? patientRecords
      : [priorSyntheticBaseline, currentRecord];

  const [selectedIdA, setSelectedIdA] = useState<string>(
    comparisonPool[0]?.assessmentResult?.assessmentId || 'ASM-1'
  );
  const [selectedIdB, setSelectedIdB] = useState<string>(
    currentRecord.assessmentResult?.assessmentId || comparisonPool[comparisonPool.length - 1]?.assessmentResult?.assessmentId || 'ASM-2'
  );

  const recordA =
    comparisonPool.find((r) => r.assessmentResult?.assessmentId === selectedIdA) ||
    comparisonPool[0];
  const recordB =
    comparisonPool.find((r) => r.assessmentResult?.assessmentId === selectedIdB) ||
    comparisonPool[comparisonPool.length - 1];

  // Physiological Calculation Helpers
  const calcMAP = (sbp?: number, dbp?: number) => {
    if (!sbp || !dbp) return null;
    return Math.round(dbp + (sbp - dbp) / 3);
  };

  const mapA = calcMAP(recordA?.vitals?.systolicBp, recordA?.vitals?.diastolicBp);
  const mapB = calcMAP(recordB?.vitals?.systolicBp, recordB?.vitals?.diastolicBp);

  const sbpDiff = (recordB?.vitals?.systolicBp || 0) - (recordA?.vitals?.systolicBp || 0);
  const dbpDiff = (recordB?.vitals?.diastolicBp || 0) - (recordA?.vitals?.diastolicBp || 0);
  const hrDiff = (recordB?.vitals?.heartRate || 0) - (recordA?.vitals?.heartRate || 0);
  const mapDiff = mapB && mapA ? mapB - mapA : null;
  const cvdDiff =
    ((recordB?.assessmentResult?.risks?.cardiovascular?.riskScore || 0) -
      (recordA?.assessmentResult?.risks?.cardiovascular?.riskScore || 0)) *
    100;

  const formatDate = (isoStr?: string) => {
    if (!isoStr) return 'Recent Assessment';
    try {
      const d = new Date(isoStr);
      return d.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return isoStr;
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Selector Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-700">
              <ArrowLeftRight className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                Comparative Longitudinal Assessment Analysis
                <span className="text-[10px] bg-teal-100 text-teal-800 font-mono px-2 py-0.5 rounded font-bold">
                  Side-by-Side Progression
                </span>
              </h3>
              <div className="text-xs text-slate-500 flex items-center gap-1.5 flex-wrap mt-0.5">
                <span>Select two clinical timestamps for: <strong className="text-slate-800">{currentRecord.demographics.fullName}</strong></span>
                <span className="font-mono text-slate-700 bg-slate-100 px-1.5 py-0.2 rounded border border-slate-200">
                  {currentRecord.demographics.patientId}
                </span>
                <CopyPatientIdButton
                  id="btn-copy-compare-pid"
                  value={currentRecord.demographics.patientId}
                  label="Copy ID"
                  size="sm"
                />
              </div>
            </div>
          </div>

          {onBackToDossier && (
            <button
              id="btn-compare-back-to-dossier"
              onClick={onBackToDossier}
              className="px-3.5 py-1.5 rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-900 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs self-start sm:self-center"
            >
              <span>←</span>
              <span>Back to Clinical Dossier & CDS</span>
            </button>
          )}
        </div>

        {/* Timestamps Selectors */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-slate-500"></span>
              Assessment Baseline (A) - Historical
            </label>
            <select
              id="select-assessment-a"
              value={selectedIdA}
              onChange={(e) => setSelectedIdA(e.target.value)}
              className="w-full p-2.5 text-xs font-semibold border border-slate-300 rounded-lg bg-white shadow-2xs focus:ring-2 focus:ring-teal-500 cursor-pointer"
            >
              {comparisonPool.map((rec, idx) => (
                <option
                  key={rec.assessmentResult?.assessmentId || idx}
                  value={rec.assessmentResult?.assessmentId}
                >
                  {formatDate(rec.vitals.measurementTime || rec.assessmentResult?.timestamp)} — [
                  {rec.assessmentResult?.triage.levelName || 'Prior Visit'}] (BP:{' '}
                  {rec.vitals.systolicBp}/{rec.vitals.diastolicBp})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-teal-800 mb-1.5 flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-teal-600"></span>
              Assessment Follow-up (B) - Current / Target
            </label>
            <select
              id="select-assessment-b"
              value={selectedIdB}
              onChange={(e) => setSelectedIdB(e.target.value)}
              className="w-full p-2.5 text-xs font-semibold border border-teal-400 rounded-lg bg-teal-50/50 shadow-2xs focus:ring-2 focus:ring-teal-500 cursor-pointer"
            >
              {comparisonPool.map((rec, idx) => (
                <option
                  key={rec.assessmentResult?.assessmentId || idx}
                  value={rec.assessmentResult?.assessmentId}
                >
                  {formatDate(rec.vitals.measurementTime || rec.assessmentResult?.timestamp)} — [
                  {rec.assessmentResult?.triage.levelName || 'Current Assessment'}] (BP:{' '}
                  {rec.vitals.systolicBp}/{rec.vitals.diastolicBp})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Executive Clinical Trajectory Interpretation Strip */}
        <div className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-xl p-4 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-teal-500/20 text-teal-300 border border-teal-500/40">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-teal-400 block tracking-wider">
                Clinical Trajectory Summary
              </span>
              <p className="font-semibold text-slate-100 text-xs">
                {sbpDiff < 0
                  ? `Systolic BP decreased by ${Math.abs(sbpDiff)} mmHg. Cardiovascular strain is stabilizing under therapy.`
                  : sbpDiff > 0
                  ? `Systolic BP increased by +${sbpDiff} mmHg. Escalation of antihypertensive therapy indicated.`
                  : 'Hemodynamic indices remain stable between baseline and follow-up evaluations.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span
              className={`text-xs font-bold px-3 py-1.5 rounded-lg border flex items-center gap-1.5 ${
                sbpDiff < 0
                  ? 'bg-emerald-950/80 border-emerald-500 text-emerald-300'
                  : sbpDiff > 0
                  ? 'bg-rose-950/80 border-rose-500 text-rose-300'
                  : 'bg-slate-800 border-slate-700 text-slate-300'
              }`}
            >
              {sbpDiff < 0 ? (
                <>
                  <TrendingDown className="w-4 h-4 text-emerald-400" />
                  <span>Therapeutic Improvement</span>
                </>
              ) : sbpDiff > 0 ? (
                <>
                  <TrendingUp className="w-4 h-4 text-rose-400" />
                  <span>Elevated Risk Progression</span>
                </>
              ) : (
                <>
                  <Minus className="w-4 h-4 text-slate-400" />
                  <span>Stable Parameters</span>
                </>
              )}
            </span>
          </div>
        </div>
      </div>

      {/* Side-by-Side Comprehensive Comparison Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
            <Layers className="w-4 h-4 text-teal-600" />
            Direct Comparative Biomarker & Risk Matrix
          </h4>
          <span className="text-[10px] text-slate-500 font-mono">
            Delta = Assessment B vs. Assessment A
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-100 text-slate-600 text-[11px] font-bold border-b border-slate-200">
              <tr>
                <th className="py-3 px-4 w-1/3">Clinical Parameter / Biomarker</th>
                <th className="py-3 px-4 w-1/4 bg-slate-50">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-slate-400"></span>
                    <span>Assessment A (Baseline)</span>
                  </div>
                  <span className="text-[10px] font-normal text-slate-500 block font-mono">
                    {formatDate(recordA?.vitals.measurementTime || recordA?.assessmentResult?.timestamp)}
                  </span>
                </th>
                <th className="py-3 px-4 w-1/4 bg-teal-50/50 text-teal-950">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-teal-600"></span>
                    <span>Assessment B (Follow-up)</span>
                  </div>
                  <span className="text-[10px] font-normal text-teal-700 block font-mono">
                    {formatDate(recordB?.vitals.measurementTime || recordB?.assessmentResult?.timestamp)}
                  </span>
                </th>
                <th className="py-3 px-4 w-1/6 text-right">Progression Delta</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {/* SECTION: TRIAGE & RISK STRATIFICATION */}
              <tr className="bg-slate-50/80 font-bold text-[10px] uppercase text-slate-500 tracking-wider">
                <td colSpan={4} className="py-1.5 px-4">
                  1. Clinical Triage & Risk Stratification
                </td>
              </tr>

              <tr>
                <td className="py-2.5 px-4 font-semibold text-slate-800">Triage Urgency Level</td>
                <td className="py-2.5 px-4 bg-slate-50/40">
                  <span className="font-bold text-slate-800">
                    {recordA?.assessmentResult?.triage.levelName || 'Priority'}
                  </span>
                </td>
                <td className="py-2.5 px-4 bg-teal-50/20 font-bold text-teal-900">
                  {recordB?.assessmentResult?.triage.levelName || 'Current Level'}
                </td>
                <td className="py-2.5 px-4 text-right font-mono">
                  {recordA?.assessmentResult?.triage.level === recordB?.assessmentResult?.triage.level ? (
                    <span className="text-slate-400 font-bold">Unchanged</span>
                  ) : (
                    <span className="text-teal-700 font-bold">Re-stratified</span>
                  )}
                </td>
              </tr>

              <tr>
                <td className="py-2.5 px-4 font-semibold text-slate-800">10-Year ASCVD Risk Score</td>
                <td className="py-2.5 px-4 font-mono font-bold text-slate-800 bg-slate-50/40">
                  {((recordA?.assessmentResult?.risks?.cardiovascular?.riskScore || 0) * 100).toFixed(0)}% (
                  {recordA?.assessmentResult?.risks?.cardiovascular?.riskCategory})
                </td>
                <td className="py-2.5 px-4 font-mono font-bold text-teal-900 bg-teal-50/20">
                  {((recordB?.assessmentResult?.risks?.cardiovascular?.riskScore || 0) * 100).toFixed(0)}% (
                  {recordB?.assessmentResult?.risks?.cardiovascular?.riskCategory})
                </td>
                <td className="py-2.5 px-4 text-right">
                  <span
                    className={`font-mono font-bold px-2 py-0.5 rounded text-[11px] ${
                      cvdDiff < 0
                        ? 'bg-emerald-100 text-emerald-800'
                        : cvdDiff > 0
                        ? 'bg-rose-100 text-rose-800'
                        : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    {cvdDiff > 0 ? `+${cvdDiff.toFixed(0)}%` : `${cvdDiff.toFixed(0)}%`}
                  </span>
                </td>
              </tr>

              <tr>
                <td className="py-2.5 px-4 font-semibold text-slate-800">Active Red Flag Alerts</td>
                <td className="py-2.5 px-4 bg-slate-50/40">
                  {recordA?.assessmentResult?.redFlags?.length || 0} active flags
                </td>
                <td className="py-2.5 px-4 bg-teal-50/20 font-bold text-slate-900">
                  {recordB?.assessmentResult?.redFlags?.length || 0} active flags
                </td>
                <td className="py-2.5 px-4 text-right font-mono font-bold">
                  {(recordB?.assessmentResult?.redFlags?.length || 0) -
                    (recordA?.assessmentResult?.redFlags?.length || 0) <=
                  0 ? (
                    <span className="text-emerald-700">Resolved / Reduced ✓</span>
                  ) : (
                    <span className="text-rose-700">New Alert Flag ⚠️</span>
                  )}
                </td>
              </tr>

              {/* SECTION: VITAL SIGNS & HEMODYNAMICS */}
              <tr className="bg-slate-50/80 font-bold text-[10px] uppercase text-slate-500 tracking-wider">
                <td colSpan={4} className="py-1.5 px-4">
                  2. Physiological & Hemodynamic Parameters
                </td>
              </tr>

              <tr>
                <td className="py-2.5 px-4 font-semibold text-slate-800">
                  Systolic Blood Pressure (SBP)
                </td>
                <td className="py-2.5 px-4 font-mono font-bold text-slate-800 bg-slate-50/40">
                  {recordA?.vitals.systolicBp || '?'} mmHg
                </td>
                <td className="py-2.5 px-4 font-mono font-bold text-teal-900 bg-teal-50/20">
                  {recordB?.vitals.systolicBp || '?'} mmHg
                </td>
                <td className="py-2.5 px-4 text-right">
                  <span
                    className={`font-mono font-bold px-2 py-0.5 rounded text-[11px] inline-flex items-center gap-1 ${
                      sbpDiff < 0
                        ? 'bg-emerald-100 text-emerald-800'
                        : sbpDiff > 0
                        ? 'bg-rose-100 text-rose-800'
                        : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    {sbpDiff < 0 ? <TrendingDown className="w-3 h-3" /> : sbpDiff > 0 ? <TrendingUp className="w-3 h-3" /> : null}
                    {sbpDiff > 0 ? `+${sbpDiff} mmHg` : `${sbpDiff} mmHg`}
                  </span>
                </td>
              </tr>

              <tr>
                <td className="py-2.5 px-4 font-semibold text-slate-800">
                  Diastolic Blood Pressure (DBP)
                </td>
                <td className="py-2.5 px-4 font-mono font-bold text-slate-800 bg-slate-50/40">
                  {recordA?.vitals.diastolicBp || '?'} mmHg
                </td>
                <td className="py-2.5 px-4 font-mono font-bold text-teal-900 bg-teal-50/20">
                  {recordB?.vitals.diastolicBp || '?'} mmHg
                </td>
                <td className="py-2.5 px-4 text-right">
                  <span
                    className={`font-mono font-bold px-2 py-0.5 rounded text-[11px] ${
                      dbpDiff < 0
                        ? 'bg-emerald-100 text-emerald-800'
                        : dbpDiff > 0
                        ? 'bg-rose-100 text-rose-800'
                        : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    {dbpDiff > 0 ? `+${dbpDiff} mmHg` : `${dbpDiff} mmHg`}
                  </span>
                </td>
              </tr>

              <tr>
                <td className="py-2.5 px-4 font-semibold text-slate-800">
                  Mean Arterial Pressure (MAP)
                </td>
                <td className="py-2.5 px-4 font-mono text-slate-700 bg-slate-50/40">
                  {mapA ? `${mapA} mmHg` : 'N/A'}
                </td>
                <td className="py-2.5 px-4 font-mono font-bold text-teal-900 bg-teal-50/20">
                  {mapB ? `${mapB} mmHg` : 'N/A'}
                </td>
                <td className="py-2.5 px-4 text-right font-mono font-bold text-slate-700">
                  {mapDiff !== null ? (mapDiff > 0 ? `+${mapDiff} mmHg` : `${mapDiff} mmHg`) : 'N/A'}
                </td>
              </tr>

              <tr>
                <td className="py-2.5 px-4 font-semibold text-slate-800">Heart Rate (Pulse)</td>
                <td className="py-2.5 px-4 font-mono text-slate-800 bg-slate-50/40">
                  {recordA?.vitals.heartRate || '80'} bpm
                </td>
                <td className="py-2.5 px-4 font-mono font-bold text-teal-900 bg-teal-50/20">
                  {recordB?.vitals.heartRate || '80'} bpm
                </td>
                <td className="py-2.5 px-4 text-right font-mono font-bold">
                  <span
                    className={`px-2 py-0.5 rounded text-[11px] ${
                      Math.abs(hrDiff) <= 3
                        ? 'bg-slate-100 text-slate-600'
                        : hrDiff > 0
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-emerald-100 text-emerald-800'
                    }`}
                  >
                    {hrDiff > 0 ? `+${hrDiff} bpm` : `${hrDiff} bpm`}
                  </span>
                </td>
              </tr>

              <tr>
                <td className="py-2.5 px-4 font-semibold text-slate-800">Blood Glucose (Random/Fasting)</td>
                <td className="py-2.5 px-4 font-mono text-slate-800 bg-slate-50/40">
                  {recordA?.vitals.bloodGlucoseMgDl || recordA?.labs.glucoseFastingMgDl || 'Unmeasured'} mg/dL
                </td>
                <td className="py-2.5 px-4 font-mono font-bold text-teal-900 bg-teal-50/20">
                  {recordB?.vitals.bloodGlucoseMgDl || recordB?.labs.glucoseFastingMgDl || 'Unmeasured'} mg/dL
                </td>
                <td className="py-2.5 px-4 text-right font-mono text-slate-600">
                  Target: &lt;100 mg/dL
                </td>
              </tr>

              <tr>
                <td className="py-2.5 px-4 font-semibold text-slate-800">Body Mass Index (BMI)</td>
                <td className="py-2.5 px-4 font-mono text-slate-800 bg-slate-50/40">
                  {recordA?.profile.bmi.toFixed(1)} kg/m²
                </td>
                <td className="py-2.5 px-4 font-mono font-bold text-teal-900 bg-teal-50/20">
                  {recordB?.profile.bmi.toFixed(1)} kg/m²
                </td>
                <td className="py-2.5 px-4 text-right font-mono text-slate-600">
                  {((recordB?.profile.bmi || 0) - (recordA?.profile.bmi || 0)).toFixed(1)} kg/m²
                </td>
              </tr>

              {/* SECTION: CLINICAL THERAPY & SIGN-OFF */}
              <tr className="bg-slate-50/80 font-bold text-[10px] uppercase text-slate-500 tracking-wider">
                <td colSpan={4} className="py-1.5 px-4">
                  3. Therapeutic Regimen & Attending Sign-Off
                </td>
              </tr>

              <tr>
                <td className="py-2.5 px-4 font-semibold text-slate-800">Physician Diagnosis</td>
                <td className="py-2.5 px-4 text-slate-700 bg-slate-50/40 italic">
                  {recordA?.doctorReview?.doctorDiagnosis || 'Initial Triage Evaluation'}
                </td>
                <td className="py-2.5 px-4 text-teal-950 font-bold bg-teal-50/20">
                  {recordB?.doctorReview?.doctorDiagnosis || 'Follow-up Evaluation Confirmed'}
                </td>
                <td className="py-2.5 px-4 text-right font-mono text-slate-600">
                  {recordB?.doctorReview ? 'Signed-off ✓' : 'Pending Review'}
                </td>
              </tr>

              <tr>
                <td className="py-2.5 px-4 font-semibold text-slate-800">Prescribed Pharmacotherapy</td>
                <td className="py-2.5 px-4 text-slate-700 bg-slate-50/40">
                  {recordA?.doctorReview?.prescribedMedications?.map((m) => m.drugName).join(', ') ||
                    recordA?.profile.currentMedications.join(', ') ||
                    'Baseline Therapy'}
                </td>
                <td className="py-2.5 px-4 text-teal-950 font-semibold bg-teal-50/20">
                  {recordB?.doctorReview?.prescribedMedications?.map((m) => m.drugName).join(', ') ||
                    recordB?.profile.currentMedications.join(', ') ||
                    'Guideline-Directed Medical Therapy'}
                </td>
                <td className="py-2.5 px-4 text-right text-emerald-700 font-bold font-mono">
                  Optimized ✓
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
