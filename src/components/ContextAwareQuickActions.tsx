import React, { useState } from 'react';
import { PatientAssessmentRecord } from '../types/clinical';
import {
  Zap,
  FlaskConical,
  Calendar,
  BookOpen,
  CheckCircle2,
  Download,
  AlertCircle,
  Stethoscope,
  X,
  ChevronUp,
  ChevronDown,
  HeartPulse,
  Share2,
  Sparkles,
  Pill,
} from 'lucide-react';

interface ContextAwareQuickActionsProps {
  currentRecord: PatientAssessmentRecord;
  onOrderLabTest: (testName: string) => void;
  onScheduleFollowUp: (timeframe: string, notes: string) => void;
  onOpenProtocol: (protocolName: string) => void;
  onApplyBaselinePlan?: () => void;
  onExportPdf?: () => void;
  onOpenReferralModal?: () => void;
}

export const ContextAwareQuickActions: React.FC<ContextAwareQuickActionsProps> = ({
  currentRecord,
  onOrderLabTest,
  onScheduleFollowUp,
  onOpenProtocol,
  onApplyBaselinePlan,
  onExportPdf,
  onOpenReferralModal,
}) => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [activeSubMenu, setActiveSubMenu] = useState<'NONE' | 'LABS' | 'FOLLOW_UP' | 'PROTOCOLS'>('NONE');
  const [actionFeedback, setActionFeedback] = useState<string | null>(null);

  const vitals = currentRecord.vitals;
  const labs = currentRecord.labs;
  const assessment = currentRecord.assessmentResult;
  const sbp = vitals.systolicBp || 120;
  const dbp = vitals.diastolicBp || 80;
  const triageLevel = assessment?.triage.level || 'LEVEL_4_ROUTINE';
  const isEmergency = triageLevel === 'LEVEL_1_EMERGENCY' || assessment?.isEmergency;
  const isUrgent = triageLevel === 'LEVEL_2_URGENT';

  // Dynamic context insights
  const needsRenalLabs = !labs.serumCreatinineMgDl || !labs.egfrMdrd;
  const needsGlycemicLabs = !labs.hba1cPercent && (vitals.bloodGlucoseMgDl || 0) >= 140;
  const needsLipidPanel = !labs.totalCholesterolMgDl || !labs.ldlCholesterolMgDl;
  const isSevereHtn = sbp >= 160 || dbp >= 100;

  const triggerFeedback = (msg: string) => {
    setActionFeedback(msg);
    setTimeout(() => {
      setActionFeedback(null);
    }, 2400);
  };

  const handleQuickLab = (testName: string) => {
    onOrderLabTest(testName);
    triggerFeedback(`Ordered "${testName}"`);
    setActiveSubMenu('NONE');
  };

  const handleQuickFollowUp = (timeframe: string, details: string) => {
    onScheduleFollowUp(timeframe, details);
    triggerFeedback(`Follow-up scheduled: ${timeframe}`);
    setActiveSubMenu('NONE');
  };

  const handleQuickProtocol = (protocolName: string) => {
    onOpenProtocol(protocolName);
    triggerFeedback(`Opened ${protocolName}`);
    setActiveSubMenu('NONE');
  };

  return (
    <div className="fixed bottom-6 right-6 z-40 flex flex-col items-end print:hidden">
      {/* Toast Feedback */}
      {actionFeedback && (
        <div
          id="toast-quick-action-feedback"
          className="mb-2 px-3.5 py-2 bg-slate-900 text-white text-xs font-bold rounded-xl shadow-lg border border-cyan-500/50 flex items-center gap-2 animate-bounce"
        >
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{actionFeedback}</span>
        </div>
      )}

      {/* Expanded Quick Actions Panel */}
      {isOpen && (
        <div
          id="quick-actions-floating-panel"
          className="mb-3 w-80 sm:w-96 bg-white rounded-2xl shadow-2xl border-2 border-slate-300 overflow-hidden transition-all duration-200"
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-cyan-950 p-3.5 text-white flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-cyan-500/20 border border-cyan-400/40 flex items-center justify-center text-cyan-300">
                <Zap className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold flex items-center gap-1.5">
                  <span>Context-Aware Quick Actions</span>
                  <span className="text-[9px] bg-cyan-400 text-slate-950 px-1.5 py-0.2 rounded font-mono font-bold">
                    AI CDS
                  </span>
                </h4>
                <p className="text-[10px] text-slate-300">
                  Targeted workflows for {currentRecord.demographics.fullName}
                </p>
              </div>
            </div>
            <button
              id="btn-close-quick-actions"
              onClick={() => {
                setIsOpen(false);
                setActiveSubMenu('NONE');
              }}
              className="p-1 rounded-lg hover:bg-white/10 text-slate-300 hover:text-white transition-all cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Contextual Clinical Alert Pill */}
          <div className="p-3 bg-slate-50 border-b border-slate-200 text-xs">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-slate-500 font-medium">Patient Status:</span>
              <span
                className={`font-bold px-2 py-0.5 rounded text-[10px] ${
                  isEmergency
                    ? 'bg-red-100 text-red-800 border border-red-300'
                    : isUrgent
                    ? 'bg-orange-100 text-orange-800 border border-orange-300'
                    : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                }`}
              >
                {isEmergency ? '🚨 Emergency Status' : isUrgent ? '🔴 Urgent Review' : '🟢 Routine Care'}
              </span>
            </div>
            <div className="mt-1 text-[11px] text-slate-700 flex items-center justify-between">
              <span>BP: <strong>{sbp}/{dbp} mmHg</strong></span>
              <span>CVD Risk: <strong>{assessment ? `${Math.round(assessment.risks.cardiovascular.riskScore * 100)}%` : '15%'}</strong></span>
            </div>
          </div>

          {/* Body Options */}
          <div className="p-3 space-y-2 max-h-[380px] overflow-y-auto">
            {/* SUB-MENU: Order Lab Tests */}
            {activeSubMenu === 'LABS' ? (
              <div className="space-y-1.5">
                <div className="flex items-center justify-between pb-1 border-b border-slate-200">
                  <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <FlaskConical className="w-3.5 h-3.5 text-cyan-600" />
                    Select Lab Test to Order:
                  </span>
                  <button
                    onClick={() => setActiveSubMenu('NONE')}
                    className="text-[11px] text-cyan-700 font-bold hover:underline"
                  >
                    Back
                  </button>
                </div>

                {[
                  {
                    name: 'Serum Creatinine & Estimated GFR (eGFR)',
                    category: 'Renal Function',
                    recommended: needsRenalLabs,
                  },
                  {
                    name: 'Glycated Hemoglobin (HbA1c)',
                    category: 'Glycemic Control',
                    recommended: needsGlycemicLabs,
                  },
                  {
                    name: 'Fasting Lipid Profile (Total, HDL, LDL, Triglycerides)',
                    category: 'Lipid Panel',
                    recommended: needsLipidPanel,
                  },
                  {
                    name: '12-Lead Electrocardiogram (ECG)',
                    category: 'Cardiac Telemetry',
                    recommended: isSevereHtn || isEmergency,
                  },
                  {
                    name: 'Spot Urine Albumin-to-Creatinine Ratio (uACR)',
                    category: 'Microalbuminuria',
                    recommended: currentRecord.profile.diabetesHistory || isSevereHtn,
                  },
                  {
                    name: 'Serum Electrolytes (Sodium, Potassium, Chloride)',
                    category: 'Electrolytes',
                    recommended: isSevereHtn,
                  },
                ].map((lab, lIdx) => (
                  <button
                    key={lIdx}
                    id={`quick-order-lab-${lIdx}`}
                    onClick={() => handleQuickLab(lab.name)}
                    className="w-full p-2 rounded-xl text-left border border-slate-200 hover:bg-cyan-50/80 hover:border-cyan-300 transition-all flex items-center justify-between text-xs cursor-pointer group"
                  >
                    <div>
                      <div className="font-bold text-slate-800 group-hover:text-cyan-950 flex items-center gap-1">
                        <span>{lab.name}</span>
                        {lab.recommended && (
                          <span className="text-[9px] bg-amber-100 text-amber-800 font-bold px-1 rounded">
                            Recommended
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-slate-500">{lab.category}</span>
                    </div>
                    <span className="text-xs text-cyan-600 font-bold shrink-0 opacity-0 group-hover:opacity-100">
                      + Add
                    </span>
                  </button>
                ))}
              </div>
            ) : activeSubMenu === 'FOLLOW_UP' ? (
              /* SUB-MENU: Schedule Follow-up */
              <div className="space-y-1.5">
                <div className="flex items-center justify-between pb-1 border-b border-slate-200">
                  <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                    Select Follow-Up Window:
                  </span>
                  <button
                    onClick={() => setActiveSubMenu('NONE')}
                    className="text-[11px] text-cyan-700 font-bold hover:underline"
                  >
                    Back
                  </button>
                </div>

                {[
                  {
                    label: '24-48 Hours (Urgent In-Clinic Review)',
                    timeframe: '24-48 Hours',
                    desc: 'For acute BP crisis, unstable symptoms, or lab re-check',
                    priority: isEmergency,
                  },
                  {
                    label: '7 Days (Post-Titration Review)',
                    timeframe: '7 Days',
                    desc: 'Review tolerability of newly initiated antihypertensive/statin',
                    priority: isUrgent || isSevereHtn,
                  },
                  {
                    label: '30 Days (1-Month Target Assessment)',
                    timeframe: '30 Days',
                    desc: 'Evaluate BP normalization and repeat fasting metabolic tests',
                    priority: !isEmergency && !isUrgent,
                  },
                  {
                    label: '90 Days (3-Month Routine Recall)',
                    timeframe: '90 Days',
                    desc: 'Chronic maintenance follow-up and HbA1c surveillance',
                    priority: false,
                  },
                ].map((fu, fIdx) => (
                  <button
                    key={fIdx}
                    id={`quick-sched-fu-${fIdx}`}
                    onClick={() => handleQuickFollowUp(fu.timeframe, fu.desc)}
                    className="w-full p-2 rounded-xl text-left border border-slate-200 hover:bg-indigo-50/80 hover:border-indigo-300 transition-all flex items-center justify-between text-xs cursor-pointer group"
                  >
                    <div>
                      <div className="font-bold text-slate-800 group-hover:text-indigo-950 flex items-center gap-1">
                        <span>{fu.label}</span>
                        {fu.priority && (
                          <span className="text-[9px] bg-red-100 text-red-800 font-bold px-1 rounded">
                            Target Window
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-slate-500">{fu.desc}</span>
                    </div>
                  </button>
                ))}
              </div>
            ) : activeSubMenu === 'PROTOCOLS' ? (
              /* SUB-MENU: Open Clinical Protocol */
              <div className="space-y-1.5">
                <div className="flex items-center justify-between pb-1 border-b border-slate-200">
                  <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <BookOpen className="w-3.5 h-3.5 text-teal-600" />
                    Open Evidence-Based Protocol:
                  </span>
                  <button
                    onClick={() => setActiveSubMenu('NONE')}
                    className="text-[11px] text-cyan-700 font-bold hover:underline"
                  >
                    Back
                  </button>
                </div>

                {[
                  {
                    title: 'WHO HEARTS Dual Therapy Protocol',
                    code: 'WHO-HEARTS-HTN',
                    desc: 'Step 1 & 2 combination (Amlodipine + Telmisartan)',
                  },
                  {
                    title: 'Acute Coronary Syndrome & STEMI Pathway',
                    code: 'ACS-STEMI-EMERGENCY',
                    desc: 'Immediate MONA-B resuscitation & primary PCI transfer',
                  },
                  {
                    title: 'ADA 2026 Type 2 Diabetes Glycemic Escalation',
                    code: 'ADA-T2DM-GLYCEMIC',
                    desc: 'Metformin + SGLT2i / GLP-1 RA organ-protection algorithm',
                  },
                  {
                    title: 'KDIGO Renoprotective ACEi/ARB Guidelines',
                    code: 'KDIGO-CKD-RENOPROTECTION',
                    desc: 'eGFR and serum potassium safety threshold surveillance',
                  },
                ].map((proto, pIdx) => (
                  <button
                    key={pIdx}
                    id={`quick-protocol-${pIdx}`}
                    onClick={() => handleQuickProtocol(proto.title)}
                    className="w-full p-2 rounded-xl text-left border border-slate-200 hover:bg-teal-50/80 hover:border-teal-300 transition-all text-xs cursor-pointer group"
                  >
                    <div className="font-bold text-slate-800 group-hover:text-teal-950">
                      {proto.title}
                    </div>
                    <span className="text-[10px] text-slate-500">{proto.desc}</span>
                  </button>
                ))}
              </div>
            ) : (
              /* PRIMARY QUICK ACTION GRID */
              <div className="grid grid-cols-2 gap-2 text-xs">
                {/* Action 1: Order Lab Test */}
                <button
                  id="btn-quick-order-lab"
                  onClick={() => setActiveSubMenu('LABS')}
                  className="p-3 rounded-xl border border-cyan-200 bg-cyan-50/60 hover:bg-cyan-100 text-left transition-all cursor-pointer flex flex-col justify-between group"
                >
                  <div className="flex items-center justify-between">
                    <FlaskConical className="w-4 h-4 text-cyan-700" />
                    <span className="text-[9px] font-bold bg-cyan-200 text-cyan-900 px-1 rounded font-mono">
                      Labs
                    </span>
                  </div>
                  <div className="mt-2">
                    <span className="font-bold text-slate-900 block leading-tight">Order Lab Test</span>
                    <span className="text-[10px] text-slate-500">
                      {needsRenalLabs || needsGlycemicLabs ? '⚠️ Labs deficit detected' : 'Diagnostic panels'}
                    </span>
                  </div>
                </button>

                {/* Action 2: Schedule Follow-Up */}
                <button
                  id="btn-quick-schedule-fu"
                  onClick={() => setActiveSubMenu('FOLLOW_UP')}
                  className="p-3 rounded-xl border border-indigo-200 bg-indigo-50/60 hover:bg-indigo-100 text-left transition-all cursor-pointer flex flex-col justify-between group"
                >
                  <div className="flex items-center justify-between">
                    <Calendar className="w-4 h-4 text-indigo-700" />
                    <span className="text-[9px] font-bold bg-indigo-200 text-indigo-900 px-1 rounded font-mono">
                      Recall
                    </span>
                  </div>
                  <div className="mt-2">
                    <span className="font-bold text-slate-900 block leading-tight">Schedule Follow-up</span>
                    <span className="text-[10px] text-slate-500">
                      {isEmergency ? 'Urgent 24-48h window' : '1 to 3-month recall'}
                    </span>
                  </div>
                </button>

                {/* Action 3: Open Protocol */}
                <button
                  id="btn-quick-open-protocol"
                  onClick={() => setActiveSubMenu('PROTOCOLS')}
                  className="p-3 rounded-xl border border-teal-200 bg-teal-50/60 hover:bg-teal-100 text-left transition-all cursor-pointer flex flex-col justify-between group"
                >
                  <div className="flex items-center justify-between">
                    <BookOpen className="w-4 h-4 text-teal-700" />
                    <span className="text-[9px] font-bold bg-teal-200 text-teal-900 px-1 rounded font-mono">
                      Guideline
                    </span>
                  </div>
                  <div className="mt-2">
                    <span className="font-bold text-slate-900 block leading-tight">Open Protocol</span>
                    <span className="text-[10px] text-slate-500">WHO HEARTS & NICE</span>
                  </div>
                </button>

                {/* Action 4: Auto-Fill Guideline Rx */}
                {onApplyBaselinePlan && (
                  <button
                    id="btn-quick-autofill-rx"
                    onClick={() => {
                      onApplyBaselinePlan();
                      triggerFeedback('Applied guideline therapy plan');
                    }}
                    className="p-3 rounded-xl border border-emerald-200 bg-emerald-50/60 hover:bg-emerald-100 text-left transition-all cursor-pointer flex flex-col justify-between group"
                  >
                    <div className="flex items-center justify-between">
                      <Pill className="w-4 h-4 text-emerald-700" />
                      <span className="text-[9px] font-bold bg-emerald-200 text-emerald-900 px-1 rounded font-mono">
                        Rx
                      </span>
                    </div>
                    <div className="mt-2">
                      <span className="font-bold text-slate-900 block leading-tight">Adopt Guideline Rx</span>
                      <span className="text-[10px] text-slate-500">Pre-fill medications</span>
                    </div>
                  </button>
                )}

                {/* Action 5: Referral Share Modal */}
                {onOpenReferralModal && (
                  <button
                    id="btn-quick-referral-share"
                    onClick={() => {
                      onOpenReferralModal();
                      setIsOpen(false);
                    }}
                    className="p-3 rounded-xl border border-purple-200 bg-purple-50/60 hover:bg-purple-100 text-left transition-all cursor-pointer flex flex-col justify-between group"
                  >
                    <div className="flex items-center justify-between">
                      <Share2 className="w-4 h-4 text-purple-700" />
                      <span className="text-[9px] font-bold bg-purple-200 text-purple-900 px-1 rounded font-mono">
                        Transfer
                      </span>
                    </div>
                    <div className="mt-2">
                      <span className="font-bold text-slate-900 block leading-tight">Referral Share</span>
                      <span className="text-[10px] text-slate-500">Specialist handoff</span>
                    </div>
                  </button>
                )}

                {/* Action 6: Export PDF Summary */}
                {onExportPdf && (
                  <button
                    id="btn-quick-export-pdf"
                    onClick={() => {
                      onExportPdf();
                      triggerFeedback('Generating official PDF report...');
                    }}
                    className="p-3 rounded-xl border border-slate-200 bg-slate-100 hover:bg-slate-200 text-left transition-all cursor-pointer flex flex-col justify-between group"
                  >
                    <div className="flex items-center justify-between">
                      <Download className="w-4 h-4 text-slate-700" />
                      <span className="text-[9px] font-bold bg-slate-300 text-slate-800 px-1 rounded font-mono">
                        PDF
                      </span>
                    </div>
                    <div className="mt-2">
                      <span className="font-bold text-slate-900 block leading-tight">Export PDF</span>
                      <span className="text-[10px] text-slate-500">Signed summary</span>
                    </div>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Floating Toggle Trigger Button */}
      <button
        id="btn-toggle-quick-actions-menu"
        onClick={() => setIsOpen((prev) => !prev)}
        className={`px-4 py-3 rounded-full text-white font-bold text-xs flex items-center gap-2 shadow-2xl transition-all transform hover:scale-105 cursor-pointer ring-4 ${
          isOpen
            ? 'bg-slate-900 ring-slate-400/40'
            : isEmergency
            ? 'bg-gradient-to-r from-red-600 to-rose-700 ring-red-400/50 animate-pulse'
            : 'bg-gradient-to-r from-cyan-600 to-teal-700 ring-cyan-400/40'
        }`}
        title="Context-Aware Quick Actions Menu (1-Click Clinical Workflow Accelerator)"
      >
        <Zap className="w-4 h-4 text-cyan-300" />
        <span>Quick Actions</span>
        {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
      </button>
    </div>
  );
};
