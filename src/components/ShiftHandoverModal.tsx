import React, { useState, useEffect } from 'react';
import {
  PatientAssessmentRecord,
} from '../types/clinical';
import { DUTY_DOCTORS_ROSTER } from '../data/dutyDoctorsData';
import { ClinicianProfile } from '../services/clinicalProfileSyncService';
import {
  Users,
  Clock,
  Send,
  Sparkles,
  CheckCircle,
  AlertTriangle,
  FileText,
  Copy,
  Printer,
  X,
  Plus,
  Trash2,
  Stethoscope,
  Activity,
  Bed,
  Layers,
  FlaskConical,
  ShieldAlert,
} from 'lucide-react';

export interface PendingLabItem {
  id: string;
  testName: string;
  priority: 'STAT' | 'URGENT' | 'ROUTINE';
  orderedAt?: string;
  reason?: string;
}

export interface CarePlanItem {
  id: string;
  directive: string;
  category: 'MONITORING' | 'MEDICATION' | 'PROCEDURE' | 'DIETARY';
}

export interface ShiftHandoverBriefResult {
  situation: string;
  background: string;
  assessment: string;
  recommendation: string;
  pendingLabsFormatted: string[];
  criticalCarePlansFormatted: string[];
  rawMarkdownBrief: string;
}

interface ShiftHandoverModalProps {
  currentRecord: PatientAssessmentRecord;
  activeDoctor: ClinicianProfile;
  isOpen: boolean;
  onClose: () => void;
  onApplyToNotes?: (sbarNotes: string) => void;
}

export const ShiftHandoverModal: React.FC<ShiftHandoverModalProps> = ({
  currentRecord,
  activeDoctor,
  isOpen,
  onClose,
  onApplyToNotes,
}) => {
  const [outgoingDoctor, setOutgoingDoctor] = useState<string>(activeDoctor.name);
  const [oncomingDoctor, setOncomingDoctor] = useState<string>('Dr. Bilal Tahir Gondal');
  const [shiftType, setShiftType] = useState<string>('Morning ➔ Evening Shift (14:00)');
  const [bedLocation, setBedLocation] = useState<string>('East Medical Ward, Bed 04');

  // Pending Labs
  const [pendingLabs, setPendingLabs] = useState<PendingLabItem[]>([
    {
      id: 'lab-1',
      testName: 'Serum Troponin-I & CK-MB (Repeat 3h post-intake)',
      priority: 'STAT',
      orderedAt: 'Current Shift',
      reason: 'Rule out evolving NSTEMI / myocardial ischemia',
    },
    {
      id: 'lab-2',
      testName: 'Fasting Lipid Panel & HbA1c',
      priority: 'URGENT',
      orderedAt: 'Current Shift',
      reason: 'CVD risk stratification & metabolic screening',
    },
    {
      id: 'lab-3',
      testName: 'Serum Creatinine & Electrolytes (K+, Na+)',
      priority: 'ROUTINE',
      orderedAt: 'Current Shift',
      reason: 'Baseline renal function before ACEi/ARB titration',
    },
  ]);
  const [newLabName, setNewLabName] = useState('');
  const [newLabPriority, setNewLabPriority] = useState<'STAT' | 'URGENT' | 'ROUTINE'>('STAT');

  // Critical Care Plans
  const [carePlans, setCarePlans] = useState<CarePlanItem[]>([
    {
      id: 'plan-1',
      directive: 'Continuous NIBP and SpO2 telemetry q2h; alert attending if SBP ≥ 160 or < 90 mmHg',
      category: 'MONITORING',
    },
    {
      id: 'plan-2',
      directive: 'Administer PM dual antihypertensive: Amlodipine 5mg + Telmisartan 40mg with fluid chart',
      category: 'MEDICATION',
    },
    {
      id: 'plan-3',
      directive: 'Keep NPO after 24:00 for scheduled morning echocardiogram & fasting blood draw',
      category: 'PROCEDURE',
    },
    {
      id: 'plan-4',
      directive: 'Strict intake/output fluid balance charting; target urine output > 0.5 mL/kg/hr',
      category: 'MONITORING',
    },
  ]);
  const [newCareDirective, setNewCareDirective] = useState('');

  // Additional Notes
  const [additionalNotes, setAdditionalNotes] = useState<string>(
    'Patient has high anxiety regarding cardiac symptoms. Family counseled on lifestyle modifications and medication adherence.'
  );

  // Status Brief State
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedBrief, setGeneratedBrief] = useState<ShiftHandoverBriefResult | null>(null);
  const [briefSource, setBriefSource] = useState<string>('INIT');
  const [copiedToast, setCopiedToast] = useState(false);
  const [appliedToast, setAppliedToast] = useState(false);

  useEffect(() => {
    if (activeDoctor?.name) {
      setOutgoingDoctor(activeDoctor.name);
    }
  }, [activeDoctor]);

  if (!isOpen) return null;

  const handleAddLab = () => {
    if (!newLabName.trim()) return;
    setPendingLabs((prev) => [
      ...prev,
      {
        id: `lab-${Date.now()}`,
        testName: newLabName.trim(),
        priority: newLabPriority,
        orderedAt: 'Current Shift',
      },
    ]);
    setNewLabName('');
  };

  const handleRemoveLab = (id: string) => {
    setPendingLabs((prev) => prev.filter((l) => l.id !== id));
  };

  const handleAddCarePlan = () => {
    if (!newCareDirective.trim()) return;
    setCarePlans((prev) => [
      ...prev,
      {
        id: `plan-${Date.now()}`,
        directive: newCareDirective.trim(),
        category: 'MONITORING',
      },
    ]);
    setNewCareDirective('');
  };

  const handleRemoveCarePlan = (id: string) => {
    setCarePlans((prev) => prev.filter((p) => p.id !== id));
  };

  // Trigger Gemini API Shift Handover
  const handleGenerateBrief = async () => {
    setIsGenerating(true);
    try {
      const response = await fetch('/api/gemini/shift-handover', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientCase: currentRecord,
          outgoingDoctor,
          oncomingDoctor,
          shiftType,
          bedLocation,
          pendingLabs: pendingLabs.map((l) => ({
            testName: l.testName,
            priority: l.priority,
            orderedAt: l.orderedAt,
            reason: l.reason,
          })),
          criticalCarePlans: carePlans.map((c) => c.directive),
          additionalNotes,
        }),
      });

      const data = await response.json();
      if (data.success && data.brief) {
        setGeneratedBrief(data.brief);
        setBriefSource(data.source || 'GEMINI_AI');
      }
    } catch (err) {
      console.error('Failed to generate shift handover brief:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopyToClipboard = () => {
    if (!generatedBrief) return;
    navigator.clipboard.writeText(generatedBrief.rawMarkdownBrief);
    setCopiedToast(true);
    setTimeout(() => setCopiedToast(false), 2500);
  };

  const handleApplyBriefToNotes = () => {
    if (!generatedBrief || !onApplyToNotes) return;
    const formatted = `\n\n[CLINICAL SHIFT HANDOVER BRIEF - SBAR]:\n${generatedBrief.rawMarkdownBrief}`;
    onApplyToNotes(formatted);
    setAppliedToast(true);
    setTimeout(() => setAppliedToast(false), 2500);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div
      id="shift-handover-modal-dialog"
      className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 overflow-y-auto animate-fade-in"
    >
      <div className="bg-white border border-slate-200 text-slate-900 rounded-3xl max-w-4xl w-full shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="bg-slate-900 text-white px-6 py-4 flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-cyan-600/20 text-cyan-400 rounded-2xl border border-cyan-500/30">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white">Shift Handover & Patient Status Brief</h3>
                <span className="text-[10px] font-mono font-bold bg-cyan-950 text-cyan-300 px-2 py-0.5 rounded border border-cyan-700">
                  SBAR PROTOCOL
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Patient: <strong className="text-white">{currentRecord.demographics.fullName}</strong> ({currentRecord.demographics.patientId}) • {currentRecord.assessmentResult?.triage.levelName || 'Priority Triage'}
              </p>
            </div>
          </div>
          <button
            type="button"
            id="btn-close-shift-handover"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-xs">
          {/* 1. Clinicians & Shift Logistics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-200">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Outgoing Doctor:
              </label>
              <input
                id="input-outgoing-doctor"
                type="text"
                value={outgoingDoctor}
                onChange={(e) => setOutgoingDoctor(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-cyan-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Oncoming Doctor:
              </label>
              <select
                id="select-oncoming-doctor"
                value={oncomingDoctor}
                onChange={(e) => setOncomingDoctor(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-cyan-500 focus:outline-none"
              >
                {DUTY_DOCTORS_ROSTER.map((doc) => (
                  <option key={doc.id} value={doc.name}>
                    {doc.name} ({doc.specialty}) - {doc.shift}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Shift Transfer:
              </label>
              <select
                id="select-shift-type"
                value={shiftType}
                onChange={(e) => setShiftType(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-cyan-500 focus:outline-none"
              >
                <option value="Morning ➔ Evening Shift (14:00)">Morning ➔ Evening (14:00)</option>
                <option value="Evening ➔ Night Shift (20:00)">Evening ➔ Night (20:00)</option>
                <option value="Night ➔ Morning Shift (08:00)">Night ➔ Morning (08:00)</option>
                <option value="STAT ICU Transfer Handover">STAT ICU Transfer Handover</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Bed / Location:
              </label>
              <input
                id="input-bed-location"
                type="text"
                value={bedLocation}
                onChange={(e) => setBedLocation(e.target.value)}
                placeholder="e.g. Ward 3, Bed 04"
                className="w-full bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-cyan-500 focus:outline-none"
              />
            </div>
          </div>

          {/* 2. Highlight Pending Lab Results */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                <FlaskConical className="w-4 h-4 text-amber-600" />
                Pending Diagnostic Labs & Biomarkers for Oncoming Shift
              </span>
              <span className="text-[11px] text-slate-500">
                {pendingLabs.length} pending tests flagged
              </span>
            </div>

            <div className="space-y-1.5">
              {pendingLabs.map((lab) => (
                <div
                  key={lab.id}
                  className="flex items-center justify-between p-2.5 rounded-xl border bg-amber-50/50 border-amber-200"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[9px] font-black px-1.5 py-0.5 rounded uppercase tracking-wider ${
                        lab.priority === 'STAT'
                          ? 'bg-rose-600 text-white'
                          : lab.priority === 'URGENT'
                          ? 'bg-amber-600 text-white'
                          : 'bg-slate-200 text-slate-800'
                      }`}
                    >
                      {lab.priority}
                    </span>
                    <strong className="text-slate-900 text-xs">{lab.testName}</strong>
                    {lab.reason && (
                      <span className="text-slate-500 text-[11px] italic">({lab.reason})</span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveLab(lab.id)}
                    className="text-slate-400 hover:text-rose-600 p-1 cursor-pointer"
                    title="Remove test"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>

            {/* Add Pending Lab Input */}
            <div className="flex items-center gap-2 pt-1">
              <input
                id="input-new-pending-lab"
                type="text"
                placeholder="Add another pending laboratory test..."
                value={newLabName}
                onChange={(e) => setNewLabName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddLab()}
                className="flex-1 bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
              <select
                value={newLabPriority}
                onChange={(e) => setNewLabPriority(e.target.value as any)}
                className="bg-white border border-slate-300 rounded-xl px-2 py-1.5 text-xs font-semibold text-slate-700"
              >
                <option value="STAT">STAT</option>
                <option value="URGENT">URGENT</option>
                <option value="ROUTINE">ROUTINE</option>
              </select>
              <button
                type="button"
                id="btn-add-pending-lab"
                onClick={handleAddLab}
                className="px-3 py-1.5 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-xl flex items-center gap-1 cursor-pointer text-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Lab</span>
              </button>
            </div>
          </div>

          {/* 3. Critical Care Plans & Nursing Directives */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                <ShieldAlert className="w-4 h-4 text-cyan-600" />
                Critical Care Plans & Escalation Directives
              </span>
              <span className="text-[11px] text-slate-500">
                {carePlans.length} active directives
              </span>
            </div>

            <div className="space-y-1.5">
              {carePlans.map((plan) => (
                <div
                  key={plan.id}
                  className="flex items-center justify-between p-2.5 rounded-xl border bg-cyan-50/40 border-cyan-200"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-cyan-200 text-cyan-900 uppercase">
                      {plan.category}
                    </span>
                    <span className="text-slate-900 text-xs font-medium">{plan.directive}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveCarePlan(plan.id)}
                    className="text-slate-400 hover:text-rose-600 p-1 cursor-pointer"
                    title="Remove directive"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>

            {/* Add Care Plan Input */}
            <div className="flex items-center gap-2 pt-1">
              <input
                id="input-new-care-directive"
                type="text"
                placeholder="Add critical care plan or nursing order..."
                value={newCareDirective}
                onChange={(e) => setNewCareDirective(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddCarePlan()}
                className="flex-1 bg-white border border-slate-300 rounded-xl px-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-cyan-500"
              />
              <button
                type="button"
                id="btn-add-care-directive"
                onClick={handleAddCarePlan}
                className="px-3 py-1.5 bg-cyan-700 hover:bg-cyan-600 text-white font-bold rounded-xl flex items-center gap-1 cursor-pointer text-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Directive</span>
              </button>
            </div>
          </div>

          {/* 4. Additional Handover Notes */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 mb-1">
              Attending Clinician Special Notes & Context:
            </label>
            <textarea
              id="textarea-handover-notes"
              rows={2}
              value={additionalNotes}
              onChange={(e) => setAdditionalNotes(e.target.value)}
              placeholder="e.g. Patient response to IV analgesia, family dynamic, pending consultant visit..."
              className="w-full bg-white border border-slate-300 rounded-xl p-2.5 text-xs text-slate-800 focus:ring-2 focus:ring-cyan-500 focus:outline-none"
            />
          </div>

          {/* Action Trigger Button */}
          <div className="flex items-center justify-between pt-2 border-t border-slate-200">
            <div className="text-[11px] text-slate-500">
              Uses WHO HEARTS & SBAR Protocol (Situation, Background, Assessment, Recommendation)
            </div>
            <button
              type="button"
              id="btn-generate-shift-handover-brief"
              disabled={isGenerating}
              onClick={handleGenerateBrief}
              className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-xl flex items-center gap-2 cursor-pointer shadow-md transition-all disabled:opacity-50 text-xs"
            >
              {isGenerating ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                  <span>Synthesizing SBAR Brief...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Generate SBAR Patient Status Brief</span>
                </>
              )}
            </button>
          </div>

          {/* 5. Generated SBAR Presentation */}
          {generatedBrief && (
            <div className="space-y-4 pt-4 border-t-2 border-slate-300 animate-fade-in">
              <div className="flex items-center justify-between bg-slate-900 text-white px-4 py-3 rounded-2xl shadow-md">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-cyan-400" />
                  <span className="font-bold text-xs">Official SBAR Patient Status Brief</span>
                  <span className="text-[10px] font-mono bg-cyan-950 text-cyan-300 px-2 py-0.5 rounded border border-cyan-800">
                    Source: {briefSource}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    id="btn-copy-handover-brief"
                    onClick={handleCopyToClipboard}
                    className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-white text-[11px] font-bold rounded-lg border border-slate-700 flex items-center gap-1 cursor-pointer transition-colors"
                  >
                    <Copy className="w-3 h-3 text-cyan-400" />
                    <span>{copiedToast ? 'Copied! ✓' : 'Copy SBAR'}</span>
                  </button>

                  {onApplyToNotes && (
                    <button
                      type="button"
                      id="btn-apply-handover-to-notes"
                      onClick={handleApplyBriefToNotes}
                      className="px-2.5 py-1 bg-cyan-700 hover:bg-cyan-600 text-white text-[11px] font-bold rounded-lg flex items-center gap-1 cursor-pointer transition-colors shadow-xs"
                    >
                      <CheckCircle className="w-3 h-3 text-white" />
                      <span>{appliedToast ? 'Appended! ✓' : 'Append to Notes'}</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={handlePrint}
                    className="p-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg border border-slate-700 cursor-pointer"
                    title="Print Handover Brief"
                  >
                    <Printer className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* SBAR Structured 4-Block Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {/* Situation */}
                <div className="p-3.5 rounded-2xl border border-blue-200 bg-blue-50/50 space-y-1">
                  <span className="text-[10px] font-black uppercase tracking-wider text-blue-900 flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-blue-600"></span>
                    1. Situation (S)
                  </span>
                  <p className="text-xs text-slate-800 leading-relaxed font-medium">
                    {generatedBrief.situation}
                  </p>
                </div>

                {/* Background */}
                <div className="p-3.5 rounded-2xl border border-purple-200 bg-purple-50/50 space-y-1">
                  <span className="text-[10px] font-black uppercase tracking-wider text-purple-900 flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-purple-600"></span>
                    2. Background (B)
                  </span>
                  <p className="text-xs text-slate-800 leading-relaxed font-medium">
                    {generatedBrief.background}
                  </p>
                </div>

                {/* Assessment */}
                <div className="p-3.5 rounded-2xl border border-amber-200 bg-amber-50/50 space-y-1">
                  <span className="text-[10px] font-black uppercase tracking-wider text-amber-900 flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-amber-600"></span>
                    3. Assessment (A)
                  </span>
                  <p className="text-xs text-slate-800 leading-relaxed font-medium">
                    {generatedBrief.assessment}
                  </p>
                </div>

                {/* Recommendation */}
                <div className="p-3.5 rounded-2xl border border-emerald-200 bg-emerald-50/50 space-y-1">
                  <span className="text-[10px] font-black uppercase tracking-wider text-emerald-900 flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-600"></span>
                    4. Recommendation & Directives (R)
                  </span>
                  <p className="text-xs text-slate-800 leading-relaxed font-medium whitespace-pre-line">
                    {generatedBrief.recommendation}
                  </p>
                </div>
              </div>

              {/* Pending Labs & Directives Summary Badges */}
              <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 space-y-2">
                <div className="text-[11px] font-bold text-slate-900 uppercase">
                  Pending Labs Awaiting Result Handover:
                </div>
                <div className="flex flex-wrap gap-2">
                  {generatedBrief.pendingLabsFormatted.map((labStr, i) => (
                    <span
                      key={i}
                      className="text-xs font-semibold px-2.5 py-1 bg-amber-100 text-amber-900 rounded-lg border border-amber-200 flex items-center gap-1"
                    >
                      <FlaskConical className="w-3 h-3 text-amber-700" />
                      {labStr}
                    </span>
                  ))}
                </div>

                <div className="text-[11px] font-bold text-slate-900 uppercase pt-2">
                  Active Directives for Oncoming Clinician:
                </div>
                <ul className="list-disc pl-5 text-xs text-slate-800 space-y-1">
                  {generatedBrief.criticalCarePlansFormatted.map((planStr, i) => (
                    <li key={i}>{planStr}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="bg-slate-50 px-6 py-3 border-t border-slate-200 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-[11px] text-slate-600 font-medium">
              Handover status recorded in secure clinical memory
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-bold rounded-xl transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
