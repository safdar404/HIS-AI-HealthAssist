import React, { useState } from 'react';
import { PatientAssessmentRecord } from '../types/clinical';
import {
  Sparkles,
  ShieldAlert,
  AlertTriangle,
  Heart,
  Activity,
  CheckCircle2,
  Copy,
  Check,
  ChevronDown,
  ChevronUp,
  FileText,
  Stethoscope,
  Info,
  BookOpen,
  ArrowRight,
  TrendingUp,
  Flame,
} from 'lucide-react';

interface AITriageInsightsCardProps {
  currentRecord: PatientAssessmentRecord;
  onAppendToNotes?: (text: string) => void;
  onAdoptDiagnosis?: (diagnosis: string) => void;
}

export const AITriageInsightsCard: React.FC<AITriageInsightsCardProps> = ({
  currentRecord,
  onAppendToNotes,
  onAdoptDiagnosis,
}) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(true);
  const [copied, setCopied] = useState<boolean>(false);

  const assessment = currentRecord.assessmentResult;
  const vitals = currentRecord.vitals;
  const labs = currentRecord.labs;
  const profile = currentRecord.profile;
  const demographics = currentRecord.demographics;

  const sbp = vitals.systolicBp || 120;
  const dbp = vitals.diastolicBp || 80;
  const hr = vitals.heartRate || 75;
  const spo2 = vitals.oxygenSaturation || 98;
  const glucose = vitals.bloodGlucoseMgDl || labs.glucoseFastingMgDl || 100;
  const hba1c = labs.hba1cPercent || null;
  const creatinine = labs.serumCreatinineMgDl || null;
  const egfr = labs.egfrMdrd || null;
  const cvdRisk = assessment ? Math.round(assessment.risks.cardiovascular.riskScore * 100) : 15;
  const triageLevel = assessment?.triage.level || 'LEVEL_4_ROUTINE';
  const triageName = assessment?.triage.levelName || 'Level 4: Routine Screening';
  const isEmergency = triageLevel === 'LEVEL_1_EMERGENCY' || assessment?.isEmergency;
  const isUrgent = triageLevel === 'LEVEL_2_URGENT';
  const isPriority = triageLevel === 'LEVEL_3_PRIORITY';

  // Compute Clinical Standards Triggers
  const clinicalStandardsTriggered: {
    standard: string;
    code: string;
    finding: string;
    severity: 'CRITICAL' | 'HIGH' | 'MODERATE' | 'INFO';
    rationale: string;
  }[] = [];

  // 1. WHO HEARTS & ACC/AHA Hypertensive Emergency / Stage 2 HTN
  if (sbp >= 180 || dbp >= 120) {
    clinicalStandardsTriggered.push({
      standard: 'WHO HEARTS & ACC/AHA 2024 Guidelines',
      code: 'HTN-CRISIS',
      finding: `Hypertensive Crisis / Stage 3 (${sbp}/${dbp} mmHg)`,
      severity: 'CRITICAL',
      rationale:
        'Immediate risk of acute target-organ damage (aortic dissection, acute coronary syndrome, intracranial hemorrhage, or encephalopathy). Mandates immediate parenteral or monitored oral dual therapy.',
    });
  } else if (sbp >= 160 || dbp >= 100) {
    clinicalStandardsTriggered.push({
      standard: 'WHO HEARTS Compendium (Module H)',
      code: 'HTN-STAGE-2',
      finding: `Stage 2 Severe Hypertension (${sbp}/${dbp} mmHg)`,
      severity: 'HIGH',
      rationale:
        'Exceeds standard monotherapy threshold. Immediate initiation of two first-line antihypertensive agents with different mechanisms (e.g., CCB + ARB) is clinically indicated.',
    });
  } else if (sbp >= 140 || dbp >= 90) {
    clinicalStandardsTriggered.push({
      standard: 'WHO HEARTS Blood Pressure Protocol',
      code: 'HTN-STAGE-1',
      finding: `Stage 1 Hypertension (${sbp}/${dbp} mmHg)`,
      severity: 'MODERATE',
      rationale:
        'Persistent arterial pressure above target requiring structured lifestyle modification and baseline pharmacological therapy if 10-year CVD risk is elevated.',
    });
  }

  // 2. WHO / ISH South Asian Calibrated CVD Risk
  if (cvdRisk >= 30) {
    clinicalStandardsTriggered.push({
      standard: 'WHO / ISH South Asian CVD Risk Chart',
      code: 'CVD-VERY-HIGH',
      finding: `Very High 10-Year ASCVD Risk (${cvdRisk}%)`,
      severity: 'CRITICAL',
      rationale:
        'South Asian demographic calibration highlights accelerated coronary plaque rupture risk. High-intensity statin therapy (Atorvastatin 40mg or Rosuvastatin 20mg) and strict glycemic/hemodynamic control mandatory.',
    });
  } else if (cvdRisk >= 20) {
    clinicalStandardsTriggered.push({
      standard: 'WHO / ISH South Asian CVD Risk Chart',
      code: 'CVD-HIGH-RISK',
      finding: `High 10-Year ASCVD Risk (${cvdRisk}%)`,
      severity: 'HIGH',
      rationale:
        'CVD risk ≥ 20% meets standard threshold for primary ASCVD prophylaxis with lipid-lowering therapy regardless of baseline LDL-C.',
    });
  }

  // 3. KDIGO AKI / CKD Standards
  if (creatinine && creatinine >= 2.0) {
    clinicalStandardsTriggered.push({
      standard: 'KDIGO 2024 Clinical Practice Guideline',
      code: 'KDIGO-AKI-3',
      finding: `Severe Renal Impairment (Cr: ${creatinine} mg/dL${egfr ? `, eGFR: ${egfr}` : ''})`,
      severity: 'CRITICAL',
      rationale:
        'Indicates advanced renal hypoperfusion or intrinsic kidney injury. Review nephrotoxic medications, adjust drug dosing, and monitor fluid/electrolyte status urgently.',
    });
  } else if (egfr && egfr < 60) {
    clinicalStandardsTriggered.push({
      standard: 'KDIGO CKD Evaluation & Management',
      code: 'KDIGO-CKD-3',
      finding: `Moderate-to-Severe CKD (eGFR ${egfr} mL/min/1.73m²)`,
      severity: 'HIGH',
      rationale:
        'Consistent with Stage 3 CKD. Renoprotective ACEi/ARB therapy indicated with careful potassium/creatinine monitoring within 14 days.',
    });
  }

  // 4. ADA / IDF Glycemic Crisis Standards
  if (glucose >= 250 || (hba1c && hba1c >= 10.0)) {
    clinicalStandardsTriggered.push({
      standard: 'ADA Standards of Care 2025/2026',
      code: 'ADA-GLYCEMIC-CRISIS',
      finding: `Severe Hyperglycemia / DKA Risk (Glucose: ${glucose} mg/dL${hba1c ? `, HbA1c: ${hba1c}%` : ''})`,
      severity: 'CRITICAL',
      rationale:
        'Elevated risk of Diabetic Ketoacidosis (DKA) or Hyperosmolar Hyperglycemic State (HHS). Check serum/urine ketones, hydration status, and assess for acute infection.',
    });
  } else if (glucose >= 180 || (hba1c && hba1c >= 8.5)) {
    clinicalStandardsTriggered.push({
      standard: 'ADA Glycemic Target Standards',
      code: 'ADA-UNCONTROLLED-T2D',
      finding: `Uncontrolled Glycemia (Glucose: ${glucose} mg/dL${hba1c ? `, HbA1c: ${hba1c}%` : ''})`,
      severity: 'HIGH',
      rationale:
        'Suboptimal glycemic control accelerating microvascular and macrovascular complications. Escalation to dual/triple oral therapy or GLP-1 RA / SGLT2i recommended.',
    });
  }

  // 5. NICE / ESI Respiratory & Hemodynamic Red Flags
  if (spo2 < 92) {
    clinicalStandardsTriggered.push({
      standard: 'NICE & ESI Emergency Triage Protocol',
      code: 'NICE-HYPOXEMIA',
      finding: `Acute Hypoxemia (SpO₂ ${spo2}% on Room Air)`,
      severity: 'CRITICAL',
      rationale:
        'Meets criteria for acute respiratory insufficiency. Immediate supplemental oxygen titration (target 94-98% or 88-92% in hypercapnic COPD) and chest radiography required.',
    });
  }
  if (hr > 120 || hr < 50) {
    clinicalStandardsTriggered.push({
      standard: 'ESI Level 1/2 Hemodynamic Protocol',
      code: 'ESI-ARRHYTHMIA',
      finding: `Hemodynamic Instability / Arrhythmia (HR ${hr} bpm)`,
      severity: isEmergency ? 'CRITICAL' : 'HIGH',
      rationale:
        'Abnormal resting heart rate indicating potential tachyarrhythmia, severe shock index, or acute bradycardic conduction block. Immediate 12-lead ECG indicated.',
    });
  }

  // Generate Natural Language Diagnostic Narrative Explanation
  const generateNarrativeExplanation = (): string => {
    let narrative = '';

    if (isEmergency) {
      narrative = `Patient ${demographics.fullName} (${demographics.age}y ${demographics.sex}) was stratified to LEVEL 1 EMERGENCY because of acute life-threatening physiological instability. `;
      if (sbp >= 180 || dbp >= 120) {
        narrative += `The primary driver is a Hypertensive Emergency (Blood Pressure: ${sbp}/${dbp} mmHg) exceeding the critical threshold for acute cardiovascular or neurological collapse. `;
      }
      if (spo2 < 92) {
        narrative += `Additionally, profound hypoxemia (SpO₂ ${spo2}%) triggers immediate resuscitation criteria under NICE/ESI emergency protocols. `;
      }
      if (assessment?.redFlags && assessment.redFlags.length > 0) {
        narrative += `Active red-flag symptom triggers include: "${assessment.redFlags[0].title} - ${assessment.redFlags[0].description}". `;
      }
      narrative += `Under WHO HEARTS and ESI standards, this mandates immediate physician intervention within <15 minutes, continuous cardiac monitoring, and priority secondary triage.`;
    } else if (isUrgent) {
      narrative = `Patient ${demographics.fullName} is flagged as LEVEL 2 URGENT due to severe single-organ or multi-system cardiovascular-metabolic strain. `;
      if (sbp >= 160 || dbp >= 100) {
        narrative += `Stage 2 Severe Hypertension (${sbp}/${dbp} mmHg) is present alongside a calculated 10-year CVD risk of ${cvdRisk}%. `;
      }
      if (glucose >= 200 || (hba1c && hba1c >= 8.5)) {
        narrative += `Concomitant severe hyperglycemia (Blood Glucose: ${glucose} mg/dL${hba1c ? `, HbA1c: ${hba1c}%` : ''}) increases acute metabolic vulnerability. `;
      }
      narrative += `WHO HEARTS primary care guidelines recommend physician evaluation and pharmacological optimization within 2 hours to prevent decompensation.`;
    } else if (isPriority) {
      narrative = `Patient ${demographics.fullName} was classified as LEVEL 3 PRIORITY based on moderate systemic cardiovascular risk (${cvdRisk}% 10-year CVD probability) and Stage 1/2 hemodynamic elevation (${sbp}/${dbp} mmHg). `;
      if (profile.smokingStatus !== 'NEVER' || profile.diabetesHistory) {
        narrative += `Synergistic lifestyle and comorbidity risk factors (${profile.smokingStatus !== 'NEVER' ? 'Active Smoker, ' : ''}${profile.diabetesHistory ? 'Known Diabetes' : ''}) elevate overall vascular vulnerability. `;
      }
      narrative += `Clinical standards advise same-day comprehensive evaluation, baseline diagnostic workup (Lipids, HbA1c, Renal panel), and initiation of guideline-directed lifestyle and medical therapy.`;
    } else {
      narrative = `Patient ${demographics.fullName} is triaged as ${triageName} with a favorable cardiovascular baseline (${cvdRisk}% 10-year CVD risk) and hemodynamic parameters (${sbp}/${dbp} mmHg, SpO₂ ${spo2}%, HR ${hr} bpm). Standard WHO HEARTS primary care prevention and routine 3-to-6 month monitoring are recommended.`;
    }

    return narrative;
  };

  const naturalLanguageNarrative = generateNarrativeExplanation();

  const handleCopyNarrative = () => {
    navigator.clipboard.writeText(
      `[AI Triage Clinical Standard Insights]\nTriage Category: ${triageName}\n\n${naturalLanguageNarrative}\n\nStandards Evaluated: ${clinicalStandardsTriggered.map((s) => `${s.standard} (${s.finding})`).join('; ')}`
    );
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleAppendNotesClick = () => {
    if (onAppendToNotes) {
      onAppendToNotes(
        `\n[AI Triage Clinical Rationale - ${triageName}]:\n${naturalLanguageNarrative}\n• Trigger Factors: ${clinicalStandardsTriggered.map((s) => s.finding).join(', ')}`
      );
    }
  };

  const handleAdoptDiagnosisClick = () => {
    if (onAdoptDiagnosis) {
      let diag = '';
      if (sbp >= 180 || dbp >= 120) {
        diag = `Hypertensive Emergency with ${cvdRisk}% 10-Yr CVD Risk (${triageName})`;
      } else if (sbp >= 140 || dbp >= 90) {
        diag = `Essential Stage 2 Hypertension with ${cvdRisk}% ASCVD Risk`;
      } else {
        diag = `Cardiovascular Risk Stratification Baseline (${cvdRisk}% 10-Yr Risk)`;
      }
      if (profile.diabetesHistory || glucose >= 180) {
        diag += ` | Type 2 Diabetes Mellitus`;
      }
      onAdoptDiagnosis(diag);
    }
  };

  return (
    <div
      id={`ai-triage-insights-${currentRecord.demographics.patientId}`}
      className={`rounded-2xl border transition-all shadow-sm overflow-hidden ${
        isEmergency
          ? 'bg-gradient-to-br from-red-50/90 via-white to-red-50/50 border-red-300 ring-1 ring-red-400/30'
          : isUrgent
          ? 'bg-gradient-to-br from-orange-50/90 via-white to-amber-50/50 border-orange-300 ring-1 ring-orange-400/30'
          : isPriority
          ? 'bg-gradient-to-br from-amber-50/90 via-white to-yellow-50/40 border-amber-300'
          : 'bg-gradient-to-br from-cyan-50/80 via-white to-slate-50 border-cyan-200'
      }`}
    >
      {/* Header Bar */}
      <div className="p-4 flex items-center justify-between border-b border-slate-200/80 bg-white/60 backdrop-blur-xs">
        <div className="flex items-center gap-3">
          <div
            className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-white shadow-xs ${
              isEmergency
                ? 'bg-red-600 animate-pulse'
                : isUrgent
                ? 'bg-orange-600'
                : isPriority
                ? 'bg-amber-600'
                : 'bg-cyan-700'
            }`}
          >
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-1.5">
                <span>AI Triage Insights</span>
                <span className="text-[10px] font-mono text-cyan-800 bg-cyan-100/80 px-1.5 py-0.2 rounded border border-cyan-200">
                  Clinical Standards Engine
                </span>
              </h3>
            </div>
            <p className="text-xs text-slate-500">
              Natural-language explanation of why patient was flagged for{' '}
              <strong className="text-slate-800 font-semibold">{triageName}</strong>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            id="btn-copy-triage-narrative"
            onClick={handleCopyNarrative}
            className="px-2.5 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer shadow-2xs"
            title="Copy triage explanation to clipboard"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span className="text-emerald-700 font-bold">Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-slate-500" />
                <span>Copy Summary</span>
              </>
            )}
          </button>

          <button
            id="btn-toggle-triage-insights"
            onClick={() => setIsExpanded((prev) => !prev)}
            className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 transition-all cursor-pointer"
            aria-label="Toggle AI Triage Insights Card"
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Expanded Card Content */}
      {isExpanded && (
        <div className="p-5 space-y-4">
          {/* Main Natural Language Explanation Box */}
          <div
            className={`p-4 rounded-xl border text-xs leading-relaxed font-sans shadow-2xs ${
              isEmergency
                ? 'bg-red-50/70 border-red-200 text-red-950 font-medium'
                : isUrgent
                ? 'bg-orange-50/70 border-orange-200 text-orange-950 font-medium'
                : isPriority
                ? 'bg-amber-50/70 border-amber-200 text-amber-950'
                : 'bg-cyan-50/50 border-cyan-200 text-slate-800'
            }`}
          >
            <div className="flex items-start gap-2.5">
              <Info
                className={`w-4 h-4 shrink-0 mt-0.5 ${
                  isEmergency
                    ? 'text-red-600'
                    : isUrgent
                    ? 'text-orange-600'
                    : isPriority
                    ? 'text-amber-600'
                    : 'text-cyan-700'
                }`}
              />
              <div className="space-y-1.5 flex-1">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <span className="font-bold text-[11px] uppercase tracking-wider text-slate-700">
                    Clinical Assessment Rationale
                  </span>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.2 rounded font-mono ${
                      isEmergency
                        ? 'bg-red-600 text-white'
                        : isUrgent
                        ? 'bg-orange-600 text-white'
                        : isPriority
                        ? 'bg-amber-600 text-white'
                        : 'bg-emerald-600 text-white'
                    }`}
                  >
                    {triageName}
                  </span>
                </div>
                <p className="text-xs">{naturalLanguageNarrative}</p>
              </div>
            </div>
          </div>

          {/* Clinical Standards Trigger Breakdown Grid */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5 text-cyan-600" />
                Clinical Practice Guidelines & Protocol Rules Evaluated
              </h4>
              <span className="text-[10px] text-slate-500 font-mono">
                {clinicalStandardsTriggered.length} Standard Triggers Applied
              </span>
            </div>

            {clinicalStandardsTriggered.length === 0 ? (
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-500 text-center">
                All physiological vital signs and metabolic labs fall within baseline routine screening parameters.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                {clinicalStandardsTriggered.map((item, idx) => (
                  <div
                    key={idx}
                    className={`p-3 rounded-xl border transition-all text-xs space-y-1 ${
                      item.severity === 'CRITICAL'
                        ? 'bg-red-50/60 border-red-300 text-red-950'
                        : item.severity === 'HIGH'
                        ? 'bg-orange-50/60 border-orange-300 text-orange-950'
                        : 'bg-slate-50 border-slate-200 text-slate-800'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-1.5">
                      <span className="font-bold text-slate-900 flex items-center gap-1">
                        {item.severity === 'CRITICAL' && (
                          <ShieldAlert className="w-3.5 h-3.5 text-red-600 shrink-0" />
                        )}
                        {item.severity === 'HIGH' && (
                          <AlertTriangle className="w-3.5 h-3.5 text-orange-600 shrink-0" />
                        )}
                        {item.severity === 'MODERATE' && (
                          <Activity className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                        )}
                        <span>{item.finding}</span>
                      </span>
                      <span
                        className={`text-[9px] font-mono font-bold px-1.5 py-0.2 rounded shrink-0 ${
                          item.severity === 'CRITICAL'
                            ? 'bg-red-200 text-red-900'
                            : item.severity === 'HIGH'
                            ? 'bg-orange-200 text-orange-900'
                            : 'bg-slate-200 text-slate-700'
                        }`}
                      >
                        {item.code}
                      </span>
                    </div>

                    <div className="text-[10px] text-cyan-900 font-semibold font-mono">
                      Standard: {item.standard}
                    </div>
                    <p className="text-[11px] text-slate-600 leading-snug pt-0.5">
                      {item.rationale}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Action Row for Clinicians */}
          <div className="pt-2 flex flex-wrap items-center justify-between gap-2 border-t border-slate-200/80">
            <div className="text-[11px] text-slate-500 flex items-center gap-1.5">
              <Stethoscope className="w-3.5 h-3.5 text-slate-400" />
              <span>Evidence-based decision support (FDA CDS compliant 2026)</span>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {onAdoptDiagnosis && (
                <button
                  id="btn-adopt-triage-diagnosis"
                  onClick={handleAdoptDiagnosisClick}
                  className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all flex items-center gap-1 cursor-pointer shadow-xs"
                  title="Adopt AI-generated clinical diagnosis into Doctor Review"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Adopt Diagnosis</span>
                </button>
              )}

              {onAppendToNotes && (
                <button
                  id="btn-append-triage-notes"
                  onClick={handleAppendNotesClick}
                  className="px-3 py-1.5 rounded-lg bg-cyan-700 hover:bg-cyan-800 text-white text-xs font-bold transition-all flex items-center gap-1 cursor-pointer shadow-xs"
                  title="Insert natural-language explanation into SOAP clinical documentation"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Append to Clinical Notes</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
