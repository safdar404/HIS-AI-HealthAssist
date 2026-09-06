import React, { useState } from 'react';
import { PatientAssessmentRecord } from '../types/clinical';
import {
  BookOpen,
  ExternalLink,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Heart,
  Activity,
  AlertTriangle,
  CheckCircle2,
  Sparkles,
  ShieldAlert,
  Pill,
  ArrowRight,
  Share2,
  FileCheck,
  Zap,
  HelpCircle,
  Stethoscope,
  Layers,
} from 'lucide-react';

interface WhoHeartsProtocolSidebarProps {
  currentRecord: PatientAssessmentRecord;
  onApplyProtocolToReview?: (protocolTitle: string, suggestedDiagnosis: string, treatmentPlan: string) => void;
  className?: string;
  isCollapsible?: boolean;
}

export interface HeartsProtocolModule {
  id: string;
  code: string; // e.g. 'HEARTS-H', 'HEARTS-D', 'HEARTS-C', 'HEARTS-E', 'HEARTS-R'
  title: string;
  subtitle: string;
  relevanceScore: number; // 0-100 based on patient profile
  isDirectMatch: boolean;
  matchReason: string;
  whoReferenceUrl: string;
  coreTargets: string[];
  steppedAlgorithm: {
    step: string;
    action: string;
    medication: string;
  }[];
  lifestyleCounseling: string[];
  referralTriggers: string[];
}

export const WhoHeartsProtocolSidebar: React.FC<WhoHeartsProtocolSidebarProps> = ({
  currentRecord,
  onApplyProtocolToReview,
  className = '',
  isCollapsible = true,
}) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [selectedModuleId, setSelectedModuleId] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<'MATCHED' | 'ALL'>('MATCHED');

  const sbp = currentRecord.vitals.systolicBp || 135;
  const dbp = currentRecord.vitals.diastolicBp || 85;
  const cvdRisk = currentRecord.assessmentResult
    ? Math.round(currentRecord.assessmentResult.risks.cardiovascular.riskScore * 100)
    : 18;
  const hasDiabetes =
    currentRecord.profile.diabetesHistory ||
    (currentRecord.labs.hba1cPercent && currentRecord.labs.hba1cPercent >= 6.5) ||
    (currentRecord.labs.glucoseFastingMgDl && currentRecord.labs.glucoseFastingMgDl >= 126);
  const isEmergency =
    sbp >= 180 ||
    dbp >= 120 ||
    currentRecord.assessmentResult?.isEmergency ||
    currentRecord.assessmentResult?.triage.level === 'LEVEL_1_EMERGENCY';
  const isStage2 = sbp >= 140 || dbp >= 90;
  const isStage1 = (sbp >= 130 && sbp < 140) || (dbp >= 80 && dbp < 90);
  const isHighCvd = cvdRisk >= 20;

  // Build Contextual WHO HEARTS Protocols based on patient's real parameters
  const protocols: HeartsProtocolModule[] = [
    {
      id: 'hearts-h-stage2',
      code: 'HEARTS-H',
      title: 'Stepped Hypertension Protocol (Stage 2 / Dual Therapy)',
      subtitle: 'First-Line Combination Therapy for BP ≥ 140/90 mmHg',
      relevanceScore: isStage2 ? 98 : 40,
      isDirectMatch: isStage2,
      matchReason: `Patient BP is ${sbp}/${dbp} mmHg (Stage 2 Hypertension criteria met).`,
      whoReferenceUrl: 'https://www.who.int/publications/i/item/9789240011311',
      coreTargets: [
        'Target Clinic BP: < 130/80 mmHg within 3 months',
        'If aged ≥65 years without frailty: Target SBP 130–139 mmHg',
        'Initiate dual-therapy at Step 1 rather than sequential monotherapy',
      ],
      steppedAlgorithm: [
        {
          step: 'Step 1 (Initial Dual Therapy)',
          action: 'Initiate low-dose combination: ARB (Telmisartan 40mg OD) + DHP-CCB (Amlodipine 5mg OD)',
          medication: 'Telmisartan 40mg + Amlodipine 5mg once daily',
        },
        {
          step: 'Step 2 (Dose Escalation at 4 Weeks)',
          action: 'If BP remains ≥ 130/80 mmHg, titrate to full-dose dual therapy',
          medication: 'Telmisartan 80mg + Amlodipine 10mg once daily',
        },
        {
          step: 'Step 3 (Triple Therapy at 8 Weeks)',
          action: 'Add Thiazide-like diuretic (Indapamide 1.5mg SR or Hydrochlorothiazide 12.5–25mg OD)',
          medication: 'Telmisartan 80mg + Amlodipine 10mg + Indapamide 1.5mg',
        },
        {
          step: 'Step 4 (Resistant Hypertension)',
          action: 'Refer to specialist. Add Spironolactone 25mg OD if K+ < 4.5 and eGFR > 45 mL/min',
          medication: 'Spironolactone 25mg once daily',
        },
      ],
      lifestyleCounseling: [
        'Sodium restriction: < 2.0 g/day (< 5g table salt/day)',
        'Dietary potassium enhancement with fruits and vegetables',
        'Aerobic physical activity: ≥ 150 minutes/week moderate intensity',
        'Weight reduction: Target BMI 18.5–24.9 kg/m²',
      ],
      referralTriggers: [
        'SBP ≥ 180 or DBP ≥ 120 mmHg with target organ damage symptoms',
        'Secondary hypertension suspicion (refractory hypokalemia, renal bruit)',
        'Uncontrolled BP despite adherence to 3 full-dose antihypertensive agents',
      ],
    },
    {
      id: 'hearts-c-statin',
      code: 'HEARTS-C',
      title: 'CVD Risk Stratification & Lipid Management',
      subtitle: 'Primary & Secondary Prevention Statin Protocol',
      relevanceScore: isHighCvd || hasDiabetes ? 95 : 55,
      isDirectMatch: isHighCvd || hasDiabetes,
      matchReason: isHighCvd
        ? `Patient has high 10-Yr CVD Risk (${cvdRisk}% ≥ 20%). Mandatory statin indication.`
        : hasDiabetes
        ? `Patient has Diabetes Mellitus. WHO HEARTS recommends statin therapy in all diabetic patients >40y.`
        : 'Baseline CVD risk evaluation',
      whoReferenceUrl: 'https://www.who.int/teams/noncommunicable-diseases/hearts',
      coreTargets: [
        '10-Yr Total CVD Risk Reduction per WHO/ISH Chart',
        'LDL-C reduction ≥ 50% or target LDL < 70 mg/dL (1.8 mmol/L)',
        'Secondary prevention: Antiplatelet (Aspirin 75-100mg) for documented ASCVD only',
      ],
      steppedAlgorithm: [
        {
          step: 'High-Risk Primary Prevention (≥20% CVD Risk)',
          action: 'Initiate moderate-to-high intensity statin regardless of baseline cholesterol',
          medication: 'Atorvastatin 20 mg to 40 mg once daily at bedtime',
        },
        {
          step: 'Diabetes + Hypertension Co-morbidity',
          action: 'Initiate Atorvastatin 20mg OD; co-prescribe ACEi/ARB for renal microvascular protection',
          medication: 'Atorvastatin 20mg + Telmisartan 40mg',
        },
        {
          step: 'Monitoring at 12 Weeks',
          action: 'Recheck ALT/AST only if symptomatic; recheck fasting lipid profile and HbA1c at 3 months',
          medication: 'Maintain therapy indefinitely',
        },
      ],
      lifestyleCounseling: [
        'Eliminate industrial trans-fats and reduce saturated fats (<7% total energy)',
        'Increase soluble fiber intake (≥25–30 g/day)',
        'Tobacco cessation with structured 5A brief counseling intervention',
      ],
      referralTriggers: [
        'Persistent severe hypercholesterolemia (Total Cholesterol > 310 mg/dL)',
        'Statin-induced myalgia with CK > 5x Upper Limit of Normal',
      ],
    },
    {
      id: 'hearts-d-diabetes',
      code: 'HEARTS-D',
      title: 'Diabetes Diagnosis & Glycemic Control',
      subtitle: 'WHO HEARTS-D Primary Care Management Protocol',
      relevanceScore: hasDiabetes ? 96 : 30,
      isDirectMatch: hasDiabetes,
      matchReason: hasDiabetes
        ? `Patient has documented Type 2 Diabetes / HbA1c ${currentRecord.labs.hba1cPercent || 'Elevated'}%.`
        : 'Glycemic screening pathway',
      whoReferenceUrl: 'https://www.who.int/publications/i/item/9789240003927',
      coreTargets: [
        'Target Glycated Hemoglobin: HbA1c < 7.0% (53 mmol/mol) in non-frail adults',
        'Fasting Blood Glucose: 80–130 mg/dL (4.4–7.2 mmol/L)',
        'Postprandial Blood Glucose: < 180 mg/dL (10.0 mmol/L)',
      ],
      steppedAlgorithm: [
        {
          step: 'Step 1 (First-Line Oral Agent)',
          action: 'Metformin titration starting at 500mg with evening meal; titrate weekly up to 1000mg BID',
          medication: 'Metformin Hydrochloride 500mg to 1000mg BID (Verify eGFR > 30 mL/min)',
        },
        {
          step: 'Step 2 (Dual Oral Therapy at 3 Months)',
          action: 'If HbA1c ≥ 7.0%, add Sulfonylurea (Gliclazide 30–120mg MR) or SGLT2i (Empagliflozin 10mg)',
          medication: 'Metformin 1000mg BID + Gliclazide MR 60mg OD',
        },
        {
          step: 'Step 3 (Insulin Escalation)',
          action: 'If symptomatic hyperglycemia (glucose > 300 mg/dL or HbA1c > 10%), initiate basal insulin',
          medication: 'NPH or Glargine 10 units OD at bedtime',
        },
      ],
      lifestyleCounseling: [
        'Medical Nutrition Therapy: Low glycemic index carbohydrates, meal portion control',
        'Foot self-examination daily to prevent diabetic foot ulceration',
        'Annual dilated eye examination for retinopathy screening',
      ],
      referralTriggers: [
        'Persistent hyperglycemia with ketone presence or metabolic acidosis (DKA/HHS)',
        'Severe recurrent hypoglycemia episodes (< 54 mg/dL)',
        'Rapidly deteriorating eGFR or macroalbuminuria',
      ],
    },
    {
      id: 'hearts-r-redflags',
      code: 'HEARTS-R',
      title: 'Red Flags & Emergency Referral Pathways',
      subtitle: 'Protocols for Hypertensive Urgencies and Acute Emergencies',
      relevanceScore: isEmergency ? 99 : 45,
      isDirectMatch: isEmergency,
      matchReason: isEmergency
        ? `Patient has acute Red Flags / Hypertensive Urgency (${sbp}/${dbp} mmHg). Emergency pathway active.`
        : 'Emergency safety screening',
      whoReferenceUrl: 'https://www.who.int/teams/noncommunicable-diseases/hearts',
      coreTargets: [
        'Immediate exclusion of Acute Target Organ Damage (TOD)',
        'Controlled BP reduction by 20–25% within first 24 hours (avoid precipitous drops)',
        'Emergency ambulance transfer for Level 1 presentations',
      ],
      steppedAlgorithm: [
        {
          step: 'Emergency Evaluation (Immediate)',
          action: 'Check 12-lead ECG, rapid bedside glucose, fundoscopy, neurological deficit check',
          medication: 'Avoid rapid sublingual Nifedipine. Use oral Amlodipine 10mg or Captopril 25mg',
        },
        {
          step: 'Hospital Facility Transfer',
          action: 'Coordinate direct transfer to DHQ/THQ Emergency Department with clinical summary',
          medication: 'Attach complete vitals record & medication sheet',
        },
      ],
      lifestyleCounseling: [
        'Absolute bed rest during acute stabilization',
        'Discontinue all NSAIDs, decongestants, or sympathomimetic agents',
      ],
      referralTriggers: [
        'Acute chest pain radiating to jaw or left arm (ACS rule-out)',
        'Sudden focal neurological weakness or slurred speech (Acute Stroke)',
        'Acute dyspnea, orthopnea, bilateral basal crepitations (Acute Pulmonary Edema)',
      ],
    },
    {
      id: 'hearts-e-lifestyle',
      code: 'HEARTS-E',
      title: 'Evidence-Based Lifestyle Counseling (5A Intervention)',
      subtitle: 'Dietary, Physical Activity & Tobacco Cessation Framework',
      relevanceScore: 85,
      isDirectMatch: true,
      matchReason: 'Universal standard of care for all hypertensive and CVD-screened individuals.',
      whoReferenceUrl: 'https://www.who.int/publications/i/item/9789240011311',
      coreTargets: [
        'Dietary Sodium < 2.0g/day (reduces SBP by 5–8 mmHg)',
        'Weight management (SBP reduction of ~1 mmHg per kg lost)',
        'Zero tobacco exposure (50% reduction in 1-yr CVD mortality after cessation)',
      ],
      steppedAlgorithm: [
        {
          step: 'Ask & Assess (Visit 1)',
          action: 'Quantify daily salt intake, processed food frequency, smoking pack-years, activity level',
          medication: 'Counseling priority',
        },
        {
          step: 'Advise & Agree (Visit 1)',
          action: 'Deliver clear, personalized, non-judgmental advice linked to current BP numbers',
          medication: 'Set specific SMART target (e.g. walk 30 mins 5 days/wk)',
        },
        {
          step: 'Assist & Arrange (Follow-up)',
          action: 'Review adherence at 4 weeks. Refer to community support worker or nutrition group',
          medication: 'Monitor BP trajectory',
        },
      ],
      lifestyleCounseling: [
        'DASH-style dietary pattern: high in vegetables, legumes, whole grains, nuts',
        'Avoid packaged snacks, pickles, papadums, and added table salt',
        'Limit alcohol intake to ≤1 standard drink/day for women, ≤2 for men',
      ],
      referralTriggers: [
        'Severe morbid obesity (BMI > 35 kg/m²) requiring bariatric evaluation',
        'Heavy nicotine dependence needing pharmacological cessation therapy',
      ],
    },
  ];

  // Filter modules
  const filteredProtocols =
    activeFilter === 'MATCHED'
      ? protocols.filter((p) => p.isDirectMatch || p.relevanceScore >= 80)
      : protocols;

  const handleApplyToReview = (mod: HeartsProtocolModule) => {
    if (onApplyProtocolToReview) {
      const suggestedDiagnosis = `${mod.title} per ${mod.code} Guidelines`;
      const treatmentPlan = `WHO HEARTS Clinical Directive:\n• Protocol: ${mod.title} (${mod.code})\n• Primary Target: ${mod.coreTargets[0]}\n• Stepped Rx: ${mod.steppedAlgorithm[0].action}\n• Lifestyle Plan: ${mod.lifestyleCounseling.slice(0, 2).join('; ')}\n• Re-evaluate in 4 weeks.`;
      onApplyProtocolToReview(mod.title, suggestedDiagnosis, treatmentPlan);
    }
  };

  return (
    <aside
      id="who-hearts-protocol-sidebar"
      className={`bg-slate-900 text-white rounded-2xl border border-slate-700 shadow-xl overflow-hidden flex flex-col transition-all ${className}`}
    >
      {/* Sidebar Header */}
      <div className="p-4 border-b border-slate-800 bg-slate-950/80 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/30">
            <BookOpen className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <h3 className="text-xs font-black uppercase tracking-wider text-rose-300">
                WHO HEARTS Protocol
              </h3>
              <span className="text-[9px] bg-rose-950 text-rose-300 border border-rose-800 px-1.5 py-0.2 rounded font-mono font-bold">
                2026 EDITION
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Contextual clinical pathways matched to active patient
            </p>
          </div>
        </div>

        {isCollapsible && (
          <button
            id="btn-toggle-hearts-sidebar"
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-all cursor-pointer"
            title={isExpanded ? 'Collapse WHO HEARTS side-nav' : 'Expand WHO HEARTS side-nav'}
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        )}
      </div>

      {isExpanded && (
        <div className="p-3 sm:p-4 space-y-4 flex-1 overflow-y-auto max-h-[850px]">
          {/* Patient Context Matching Summary */}
          <div className="bg-slate-800/80 border border-slate-700/80 rounded-xl p-3 space-y-2 text-xs">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-slate-400 font-bold uppercase tracking-wider flex items-center gap-1">
                <Stethoscope className="w-3 h-3 text-cyan-400" />
                Patient Matched Profile
              </span>
              <span className="font-mono text-cyan-300 font-bold">
                {currentRecord.demographics.patientId}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-1.5 text-[11px]">
              <div className="bg-slate-900/90 p-2 rounded-lg border border-slate-700">
                <span className="text-slate-400 text-[10px] block">Blood Pressure</span>
                <strong className={`font-mono ${isEmergency ? 'text-red-400' : isStage2 ? 'text-orange-400' : 'text-emerald-400'}`}>
                  {sbp}/{dbp} mmHg
                </strong>
                <span className="text-[9px] text-slate-400 block">
                  {isEmergency ? 'Urgency/Crisis' : isStage2 ? 'Stage 2 HTN' : isStage1 ? 'Stage 1 HTN' : 'Optimal'}
                </span>
              </div>

              <div className="bg-slate-900/90 p-2 rounded-lg border border-slate-700">
                <span className="text-slate-400 text-[10px] block">10-Yr CVD Risk</span>
                <strong className={`font-mono ${isHighCvd ? 'text-red-400' : cvdRisk >= 10 ? 'text-amber-400' : 'text-emerald-400'}`}>
                  {cvdRisk}% Risk
                </strong>
                <span className="text-[9px] text-slate-400 block">
                  {isHighCvd ? 'High / Statin Req' : 'Moderate / Monitored'}
                </span>
              </div>
            </div>
          </div>

          {/* Filter Bar */}
          <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-xl border border-slate-800">
            <button
              id="filter-hearts-matched"
              onClick={() => setActiveFilter('MATCHED')}
              className={`flex-1 py-1.5 px-2 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                activeFilter === 'MATCHED'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Direct Matches ({protocols.filter((p) => p.isDirectMatch).length})
            </button>
            <button
              id="filter-hearts-all"
              onClick={() => setActiveFilter('ALL')}
              className={`flex-1 py-1.5 px-2 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                activeFilter === 'ALL'
                  ? 'bg-rose-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              All Modules ({protocols.length})
            </button>
          </div>

          {/* Protocol Modules List */}
          <div className="space-y-3">
            {filteredProtocols.map((mod) => {
              const isSelected = selectedModuleId === mod.id;
              return (
                <div
                  key={mod.id}
                  id={`protocol-card-${mod.id}`}
                  className={`rounded-xl border transition-all ${
                    mod.isDirectMatch
                      ? 'bg-slate-800/90 border-rose-500/50 hover:border-rose-400'
                      : 'bg-slate-800/50 border-slate-700 hover:border-slate-600'
                  } p-3.5 space-y-2.5`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase font-mono bg-rose-500/20 text-rose-300 border border-rose-500/30">
                          {mod.code}
                        </span>
                        {mod.isDirectMatch && (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                            <Sparkles className="w-2.5 h-2.5" />
                            Active Match
                          </span>
                        )}
                      </div>
                      <h4 className="text-xs font-bold text-white pt-1">
                        {mod.title}
                      </h4>
                      <p className="text-[11px] text-slate-300 leading-snug">
                        {mod.subtitle}
                      </p>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => setSelectedModuleId(isSelected ? null : mod.id)}
                        className="p-1 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-300 cursor-pointer transition-all"
                        title={isSelected ? 'Hide Protocol Details' : 'View Protocol Details'}
                      >
                        {isSelected ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>

                  {/* Match Reason Tag */}
                  <div className="bg-slate-950/70 p-2 rounded-lg border border-slate-800 text-[10px] text-slate-300 flex items-start gap-1.5">
                    <CheckCircle2 className="w-3 h-3 text-rose-400 shrink-0 mt-0.5" />
                    <span>{mod.matchReason}</span>
                  </div>

                  {/* Expanded Stepped Algorithm & Directives */}
                  {isSelected && (
                    <div className="space-y-3 pt-2 border-t border-slate-700/80 text-xs">
                      {/* Core Targets */}
                      <div>
                        <span className="text-[10px] uppercase font-bold text-rose-300 tracking-wider block mb-1">
                          Clinical Targets & Goals
                        </span>
                        <ul className="space-y-1 text-[11px] text-slate-200">
                          {mod.coreTargets.map((tgt, i) => (
                            <li key={i} className="flex items-start gap-1.5">
                              <span className="text-rose-400 font-bold">•</span>
                              <span>{tgt}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* Stepped Rx Pathway */}
                      <div>
                        <span className="text-[10px] uppercase font-bold text-cyan-300 tracking-wider block mb-1">
                          Stepped Medical Pathway
                        </span>
                        <div className="space-y-1.5">
                          {mod.steppedAlgorithm.map((alg, idx) => (
                            <div
                              key={idx}
                              className="bg-slate-900 p-2 rounded-lg border border-slate-700 text-[11px] space-y-0.5"
                            >
                              <div className="font-bold text-cyan-400 flex items-center justify-between">
                                <span>{alg.step}</span>
                              </div>
                              <p className="text-slate-300">{alg.action}</p>
                              <div className="text-[10px] font-mono text-emerald-300 pt-0.5">
                                Rx: {alg.medication}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Lifestyle Counseling */}
                      <div>
                        <span className="text-[10px] uppercase font-bold text-amber-300 tracking-wider block mb-1">
                          Evidence-Based Lifestyle (HEARTS-E)
                        </span>
                        <ul className="space-y-1 text-[11px] text-slate-200">
                          {mod.lifestyleCounseling.map((ls, i) => (
                            <li key={i} className="flex items-start gap-1.5">
                              <span className="text-amber-400 font-bold">✓</span>
                              <span>{ls}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* Red Flags & Referrals */}
                      <div>
                        <span className="text-[10px] uppercase font-bold text-red-300 tracking-wider block mb-1">
                          Emergency Referral Triggers
                        </span>
                        <ul className="space-y-1 text-[11px] text-red-200">
                          {mod.referralTriggers.map((rf, i) => (
                            <li key={i} className="flex items-start gap-1.5">
                              <span className="text-red-400 font-bold">⚠</span>
                              <span>{rf}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* External Reference Link */}
                      <div className="pt-1 flex items-center justify-between text-[11px]">
                        <a
                          href={mod.whoReferenceUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-cyan-400 hover:text-cyan-300 underline flex items-center gap-1 font-mono text-[10px]"
                        >
                          <span>Official WHO HEARTS Reference</span>
                          <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                      </div>
                    </div>
                  )}

                  {/* Action Button: Apply to Doctor Review */}
                  {onApplyProtocolToReview && (
                    <button
                      id={`btn-apply-protocol-${mod.id}`}
                      onClick={() => handleApplyToReview(mod)}
                      className="w-full py-1.5 px-2.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-[11px] flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-xs"
                      title="Auto-populate clinical diagnosis and treatment directives using this WHO HEARTS protocol"
                    >
                      <Zap className="w-3 h-3" />
                      <span>Apply Protocol to Doctor Plan</span>
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          {/* Guidelines Footer Link Bar */}
          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-2 text-center">
            <span className="text-[10px] text-slate-400 block font-mono">
              World Health Organization • HEARTS Technical Package
            </span>
            <div className="flex items-center justify-center gap-3 text-[10px] text-cyan-400">
              <a
                href="https://www.who.int/publications/i/item/9789240011311"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:underline flex items-center gap-0.5"
              >
                <span>HEARTS Protocols</span>
                <ExternalLink className="w-2.5 h-2.5" />
              </a>
              <span>•</span>
              <a
                href="https://www.who.int/publications/i/item/9789240003927"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:underline flex items-center gap-0.5"
              >
                <span>HEARTS-D</span>
                <ExternalLink className="w-2.5 h-2.5" />
              </a>
              <span>•</span>
              <a
                href="https://www.who.int/teams/noncommunicable-diseases/hearts"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:underline flex items-center gap-0.5"
              >
                <span>HEARTS-C Risk</span>
                <ExternalLink className="w-2.5 h-2.5" />
              </a>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
};
