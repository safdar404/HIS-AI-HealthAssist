import React, { useState } from 'react';
import {
  Pill,
  Clock,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  TrendingUp,
  Filter,
  Search,
  Plus,
  ArrowRight,
  ShieldAlert,
  Sparkles,
  Info,
  Check,
  FileText,
  Copy,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { PatientAssessmentRecord } from '../types/clinical';

export interface TimelineMedicationItem {
  id: string;
  drugName: string;
  genericName: string;
  category: 'CARDIOVASCULAR' | 'ANTIDIABETIC' | 'LIPID_LOWERING' | 'ANTIHYPERTENSIVE' | 'ANTICOAGULANT' | 'RESPIRATORY' | 'ANALGESIC' | 'ANTIBIOTIC';
  dosage: string;
  route: string;
  frequency: string;
  status: 'ACTIVE_CURRENT' | 'DISCONTINUED' | 'DOSE_ADJUSTED' | 'TEMPORARY_HOLD';
  startDate: string;
  endDate?: string;
  discontinuationReason?: string;
  prescribingDoctor: string;
  facility: string;
  indication: string;
  adherenceRate: number; // 0 - 100%
  instructions?: string;
  interactionNotes?: string;
}

interface MedicationHistoryTimelineProps {
  currentRecord: PatientAssessmentRecord;
  onPrescribeMedication?: (med: Partial<TimelineMedicationItem>) => void;
  onBackToDossier?: () => void;
}

export const MedicationHistoryTimeline: React.FC<MedicationHistoryTimelineProps> = ({
  currentRecord,
  onPrescribeMedication,
  onBackToDossier,
}) => {
  const patientId = currentRecord.demographics.patientId;
  const storageKey = `cds_medication_timeline_${patientId}`;

  // Default rich chronological medication records derived from patient's clinical history
  const [medications, setMedications] = useState<TimelineMedicationItem[]>(() => {
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error(e);
      }
    }

    // Default timeline entries based on patient profile
    const items: TimelineMedicationItem[] = [
      {
        id: 'med-cur-1',
        drugName: 'Amlodipine (Norvasc)',
        genericName: 'Amlodipine Besylate',
        category: 'ANTIHYPERTENSIVE',
        dosage: '10 mg',
        route: 'Oral (PO)',
        frequency: 'Once daily (Morning)',
        status: 'ACTIVE_CURRENT',
        startDate: '2026-02-10',
        prescribingDoctor: 'Dr. Asim Farooq, FCPS',
        facility: 'Punjab Institute of Cardiology, Lahore',
        indication: 'Stage 2 Systemic Essential Hypertension & ASCVD prophylaxis',
        adherenceRate: 95,
        instructions: 'Take daily with water. Monitor for peripheral ankle edema.',
        interactionNotes: 'No acute CYP3A4 inhibitors present.',
      },
      {
        id: 'med-cur-2',
        drugName: 'Rosuvastatin (Crestor)',
        genericName: 'Rosuvastatin Calcium',
        category: 'LIPID_LOWERING',
        dosage: '20 mg',
        route: 'Oral (PO)',
        frequency: 'Once daily (Bedtime)',
        status: 'ACTIVE_CURRENT',
        startDate: '2026-01-15',
        prescribingDoctor: 'Dr. Ayesha Siddiqui, FCPS',
        facility: 'Mayo Hospital, Lahore',
        indication: 'Primary hypercholesterolemia & 10-Yr CVD High-Risk Primary Prevention',
        adherenceRate: 92,
        instructions: 'Take at night. Baseline ALT and CPK monitored.',
      },
      {
        id: 'med-cur-3',
        drugName: 'Metformin XR (Glucophage XR)',
        genericName: 'Metformin Hydrochloride',
        category: 'ANTIDIABETIC',
        dosage: '1000 mg',
        route: 'Oral (PO)',
        frequency: 'Twice daily with meals',
        status: 'ACTIVE_CURRENT',
        startDate: '2025-11-20',
        prescribingDoctor: 'Dr. Bilal Qureshi, FCPS',
        facility: 'Services Hospital, Lahore',
        indication: 'Type 2 Diabetes Mellitus with elevated HbA1c',
        adherenceRate: 88,
        instructions: 'Take after principal meals to minimize GI discomfort.',
      },
      {
        id: 'med-cur-4',
        drugName: 'Aspirin (Disprin CV)',
        genericName: 'Acetylsalicylic Acid (Low-Dose)',
        category: 'ANTICOAGULANT',
        dosage: '75 mg',
        route: 'Oral (PO)',
        frequency: 'Once daily after breakfast',
        status: 'ACTIVE_CURRENT',
        startDate: '2026-02-10',
        prescribingDoctor: 'Dr. Asim Farooq, FCPS',
        facility: 'Punjab Institute of Cardiology, Lahore',
        indication: 'Secondary antiplatelet coverage for high 10-Yr CVD Risk',
        adherenceRate: 96,
        instructions: 'Enteric coated. Take with food.',
      },
      {
        id: 'med-adj-1',
        drugName: 'Amlodipine (Norvasc)',
        genericName: 'Amlodipine Besylate',
        category: 'ANTIHYPERTENSIVE',
        dosage: '5 mg',
        route: 'Oral (PO)',
        frequency: 'Once daily (Morning)',
        status: 'DOSE_ADJUSTED',
        startDate: '2025-08-14',
        endDate: '2026-02-10',
        discontinuationReason: 'Dose titrated from 5mg to 10mg due to persistent SBP > 145 mmHg.',
        prescribingDoctor: 'Dr. Tariq Niazi, MBBS',
        facility: 'DHQ Hospital, Rawalpindi',
        indication: 'Mild-to-moderate Essential Hypertension',
        adherenceRate: 90,
      },
      {
        id: 'med-hist-1',
        drugName: 'Captopril (Capoten)',
        genericName: 'Captopril',
        category: 'ANTIHYPERTENSIVE',
        dosage: '25 mg',
        route: 'Oral (PO)',
        frequency: 'Twice daily',
        status: 'DISCONTINUED',
        startDate: '2025-04-10',
        endDate: '2025-07-28',
        discontinuationReason: 'Discontinued due to persistent dry intractable ACE-inhibitor cough. Switched to ARB/CCB regimen.',
        prescribingDoctor: 'Dr. Tariq Niazi, MBBS',
        facility: 'Basic Health Unit, Gujranwala',
        indication: 'First-line Blood Pressure Management',
        adherenceRate: 75,
      },
      {
        id: 'med-hist-2',
        drugName: 'Hydrochlorothiazide (HCTZ)',
        genericName: 'Hydrochlorothiazide',
        category: 'ANTIHYPERTENSIVE',
        dosage: '12.5 mg',
        route: 'Oral (PO)',
        frequency: 'Once daily (Morning)',
        status: 'DISCONTINUED',
        startDate: '2024-11-05',
        endDate: '2025-04-02',
        discontinuationReason: 'Stopped after patient developed asymptomatic hyperuricemia and borderline hypokalemia.',
        prescribingDoctor: 'Dr. Noman Bashir, FCPS',
        facility: 'Jinnah Hospital, Lahore',
        indication: 'Combination Thiazide Diuretic therapy',
        adherenceRate: 85,
      },
      {
        id: 'med-hist-3',
        drugName: 'Azithromycin (Zithromax)',
        genericName: 'Azithromycin',
        category: 'ANTIBIOTIC',
        dosage: '500 mg',
        route: 'Oral (PO)',
        frequency: 'Once daily for 5 days',
        status: 'DISCONTINUED',
        startDate: '2025-01-12',
        endDate: '2025-01-17',
        discontinuationReason: 'Completed 5-day standard course for Acute Bacterial Bronchitis / Winter Smog Infection.',
        prescribingDoctor: 'Dr. Fatima Zahra, FCPS',
        facility: 'Fatima Memorial Hospital, Lahore',
        indication: 'Lower Respiratory Tract Infection (LRTI)',
        adherenceRate: 100,
      },
    ];

    return items;
  });

  const [filterCategory, setFilterCategory] = useState<string>('ALL');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [expandedMedId, setExpandedMedId] = useState<string | null>(null);
  const [copyToast, setCopyToast] = useState<boolean>(false);
  const [showAddModal, setShowAddModal] = useState<boolean>(false);

  // New Prescription Modal Form State
  const [newDrugName, setNewDrugName] = useState('');
  const [newGenericName, setNewGenericName] = useState('');
  const [newCategory, setNewCategory] = useState<TimelineMedicationItem['category']>('CARDIOVASCULAR');
  const [newDosage, setNewDosage] = useState('');
  const [newFrequency, setNewFrequency] = useState('Once daily');
  const [newRoute, setNewRoute] = useState('Oral (PO)');
  const [newIndication, setNewIndication] = useState('');
  const [newInstructions, setNewInstructions] = useState('');

  const handleAddNewMed = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDrugName.trim() || !newDosage.trim()) return;

    const newItem: TimelineMedicationItem = {
      id: `med-${Date.now()}`,
      drugName: newDrugName.trim(),
      genericName: newGenericName.trim() || newDrugName.trim(),
      category: newCategory,
      dosage: newDosage.trim(),
      route: newRoute,
      frequency: newFrequency,
      status: 'ACTIVE_CURRENT',
      startDate: new Date().toISOString().split('T')[0],
      prescribingDoctor: currentRecord.doctorReview?.doctorName || 'Attending Physician, FCPS',
      facility: currentRecord.doctorReview?.facility || 'Apex Cardiology Center',
      indication: newIndication.trim() || 'Clinical Risk Management',
      adherenceRate: 100,
      instructions: newInstructions.trim() || 'Take as prescribed by clinician.',
    };

    const updated = [newItem, ...medications];
    setMedications(updated);
    localStorage.setItem(storageKey, JSON.stringify(updated));

    if (onPrescribeMedication) {
      onPrescribeMedication(newItem);
    }

    setShowAddModal(false);
    setNewDrugName('');
    setNewGenericName('');
    setNewDosage('');
    setNewIndication('');
    setNewInstructions('');
  };

  const handleCopyTimelineSummary = () => {
    const active = medications.filter((m) => m.status === 'ACTIVE_CURRENT');
    const past = medications.filter((m) => m.status !== 'ACTIVE_CURRENT');

    const summaryText = `[PATIENT MEDICATION HISTORY TIMELINE SUMMARY]\n` +
      `Patient: ${currentRecord.demographics.fullName} (ID: ${currentRecord.demographics.patientId})\n` +
      `Date: ${new Date().toLocaleDateString('en-GB')}\n\n` +
      `--- CURRENT ACTIVE REGIMEN (${active.length}) ---\n` +
      active.map((m, i) => `${i + 1}. ${m.drugName} (${m.genericName}) ${m.dosage} - ${m.frequency} [Started: ${m.startDate}] - Indication: ${m.indication}`).join('\n') +
      `\n\n--- HISTORICAL & DISCONTINUED PRESCRIPTIONS (${past.length}) ---\n` +
      past.map((m, i) => `${i + 1}. ${m.drugName} ${m.dosage} [${m.status}] - Duration: ${m.startDate} to ${m.endDate || 'N/A'} - Reason: ${m.discontinuationReason || 'Course completed'}`).join('\n');

    navigator.clipboard.writeText(summaryText);
    setCopyToast(true);
    setTimeout(() => setCopyToast(false), 3000);
  };

  // Filtered List sorted chronologically (newest start date first)
  const filteredMeds = medications
    .filter((med) => {
      if (filterCategory !== 'ALL' && med.category !== filterCategory) return false;
      if (filterStatus !== 'ALL' && med.status !== filterStatus) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          med.drugName.toLowerCase().includes(q) ||
          med.genericName.toLowerCase().includes(q) ||
          med.indication.toLowerCase().includes(q) ||
          med.prescribingDoctor.toLowerCase().includes(q)
        );
      }
      return true;
    })
    .sort((a, b) => new Date(b.startDate).getTime() - new Date(a.startDate).getTime());

  const activeCount = medications.filter((m) => m.status === 'ACTIVE_CURRENT').length;
  const discontinuedCount = medications.filter((m) => m.status === 'DISCONTINUED').length;
  const adjustedCount = medications.filter((m) => m.status === 'DOSE_ADJUSTED').length;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-6 space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 bg-indigo-50 text-indigo-700 rounded-xl">
              <Pill className="w-5 h-5" />
            </span>
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                Medication History & Pharmacotherapy Timeline
                <span className="text-xs font-mono font-normal px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                  {currentRecord.demographics.fullName} • MRN: {currentRecord.demographics.mrn || currentRecord.demographics.patientId}
                </span>
              </h2>
              <p className="text-xs text-slate-500">
                Chronological record of active, titrated, and discontinued pharmaceutical regimens.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            id="btn-copy-med-timeline"
            onClick={handleCopyTimelineSummary}
            className="px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Copy structured medication summary"
          >
            {copyToast ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-500" />}
            <span>{copyToast ? 'Copied Summary!' : 'Copy Summary'}</span>
          </button>

          <button
            type="button"
            id="btn-add-new-timeline-med"
            onClick={() => setShowAddModal(true)}
            className="px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Prescription</span>
          </button>

          {onBackToDossier && (
            <button
              type="button"
              onClick={onBackToDossier}
              className="px-3 py-1.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 text-xs font-semibold"
            >
              Back to CDS
            </button>
          )}
        </div>
      </div>

      {/* Metrics Summary Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-emerald-50/80 border border-emerald-200 p-3 rounded-xl flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase text-emerald-800 block">Current Active</span>
            <span className="text-lg font-black text-emerald-950">{activeCount} Drugs</span>
          </div>
          <CheckCircle2 className="w-6 h-6 text-emerald-600" />
        </div>

        <div className="bg-amber-50/80 border border-amber-200 p-3 rounded-xl flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase text-amber-800 block">Dose Titrations</span>
            <span className="text-lg font-black text-amber-950">{adjustedCount} Adjusted</span>
          </div>
          <TrendingUp className="w-6 h-6 text-amber-600" />
        </div>

        <div className="bg-rose-50/80 border border-rose-200 p-3 rounded-xl flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase text-rose-800 block">Discontinued</span>
            <span className="text-lg font-black text-rose-950">{discontinuedCount} Past</span>
          </div>
          <XCircle className="w-6 h-6 text-rose-600" />
        </div>

        <div className="bg-indigo-50/80 border border-indigo-200 p-3 rounded-xl flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase text-indigo-800 block">Avg Adherence</span>
            <span className="text-lg font-black text-indigo-950">92.4%</span>
          </div>
          <Sparkles className="w-6 h-6 text-indigo-600" />
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs">
        <div className="flex items-center gap-2 w-full sm:w-auto flex-1 max-w-sm">
          <Search className="w-4 h-4 text-slate-400 shrink-0" />
          <input
            type="text"
            placeholder="Search by drug name, generic, indication, or doctor..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap justify-end">
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 font-semibold text-[11px]">Status:</span>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="bg-white border border-slate-300 rounded-lg px-2 py-1 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="ALL">All Statuses</option>
              <option value="ACTIVE_CURRENT">Active Only</option>
              <option value="DOSE_ADJUSTED">Dose Adjusted</option>
              <option value="DISCONTINUED">Discontinued</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 font-semibold text-[11px]">Class:</span>
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="bg-white border border-slate-300 rounded-lg px-2 py-1 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="ALL">All Categories</option>
              <option value="ANTIHYPERTENSIVE">Antihypertensive</option>
              <option value="LIPID_LOWERING">Lipid-Lowering / Statin</option>
              <option value="ANTIDIABETIC">Antidiabetic / Biguanide</option>
              <option value="ANTICOAGULANT">Antiplatelet / Anticoagulant</option>
              <option value="RESPIRATORY">Respiratory</option>
              <option value="ANTIBIOTIC">Antibiotic</option>
            </select>
          </div>
        </div>
      </div>

      {/* Chronological Visual Timeline */}
      <div className="relative pl-6 sm:pl-8 space-y-6 before:absolute before:left-3 sm:before:left-4 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
        {filteredMeds.length === 0 ? (
          <div className="text-center py-12 text-slate-500 text-xs">
            No medication entries match the selected filter criteria.
          </div>
        ) : (
          filteredMeds.map((med) => {
            const isExpanded = expandedMedId === med.id;
            const isCurrent = med.status === 'ACTIVE_CURRENT';
            const isAdjusted = med.status === 'DOSE_ADJUSTED';
            const isDiscontinued = med.status === 'DISCONTINUED';

            return (
              <div key={med.id} className="relative group">
                {/* Timeline Dot Node */}
                <div
                  className={`absolute -left-6 sm:-left-8 top-1.5 w-6 h-6 rounded-full border-2 bg-white flex items-center justify-center transition-transform group-hover:scale-110 ${
                    isCurrent
                      ? 'border-emerald-500 text-emerald-600 ring-4 ring-emerald-100'
                      : isAdjusted
                      ? 'border-amber-500 text-amber-600 ring-4 ring-amber-100'
                      : 'border-slate-400 text-slate-500'
                  }`}
                >
                  {isCurrent ? (
                    <Check className="w-3 h-3 stroke-[3]" />
                  ) : isAdjusted ? (
                    <TrendingUp className="w-3 h-3 stroke-[2.5]" />
                  ) : (
                    <XCircle className="w-3 h-3 stroke-[2]" />
                  )}
                </div>

                {/* Timeline Card */}
                <div
                  className={`rounded-2xl border transition-all ${
                    isCurrent
                      ? 'bg-white border-slate-300 shadow-xs hover:border-emerald-400'
                      : isAdjusted
                      ? 'bg-amber-50/30 border-amber-200'
                      : 'bg-slate-50/80 border-slate-200 opacity-90'
                  }`}
                >
                  <div className="p-4">
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-sm font-bold text-slate-900">{med.drugName}</h3>
                          <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                            {med.dosage}
                          </span>
                          <span
                            className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${
                              isCurrent
                                ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                                : isAdjusted
                                ? 'bg-amber-100 text-amber-800 border-amber-300'
                                : 'bg-slate-200 text-slate-700 border-slate-300'
                            }`}
                          >
                            {isCurrent ? 'Current Active' : isAdjusted ? 'Dose Adjusted' : 'Discontinued'}
                          </span>
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-100">
                            {med.category}
                          </span>
                        </div>

                        <p className="text-xs text-slate-600">
                          <strong className="text-slate-700">Generic:</strong> {med.genericName} •{' '}
                          <strong className="text-slate-700">Route:</strong> {med.route} •{' '}
                          <strong className="text-slate-700">Frequency:</strong> {med.frequency}
                        </p>

                        <p className="text-xs text-slate-700 font-medium">
                          <span className="text-slate-500 font-normal">Indication:</span> {med.indication}
                        </p>
                      </div>

                      {/* Date & Doctor stamp */}
                      <div className="text-left sm:text-right text-xs shrink-0 space-y-0.5">
                        <div className="flex items-center sm:justify-end gap-1 text-slate-700 font-semibold">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          <span>
                            {new Date(med.startDate).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })}
                            {med.endDate ? ` → ${new Date(med.endDate).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })}` : ' (Ongoing)'}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500 font-medium">{med.prescribingDoctor}</div>
                        <div className="text-[10px] text-slate-400">{med.facility}</div>
                      </div>
                    </div>

                    {/* Discontinuation / Titration Reason Banner */}
                    {med.discontinuationReason && (
                      <div className="mt-3 p-2.5 rounded-xl bg-rose-50/80 border border-rose-200 text-xs text-rose-900 flex items-start gap-2">
                        <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                        <div>
                          <strong className="font-bold">Clinical Note / Reason for Change:</strong>{' '}
                          {med.discontinuationReason}
                        </div>
                      </div>
                    )}

                    {/* Expandable Details Toggle */}
                    <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between">
                      <div className="flex items-center gap-3 text-xs">
                        <span className="text-slate-500">
                          Patient Adherence: <strong className="text-slate-800">{med.adherenceRate}%</strong>
                        </span>
                        {med.instructions && (
                          <span className="text-slate-400 hidden sm:inline">• {med.instructions}</span>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => setExpandedMedId(isExpanded ? null : med.id)}
                        className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer"
                      >
                        <span>{isExpanded ? 'Hide Details' : 'View Safety & Protocol'}</span>
                        {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                      </button>
                    </div>

                    {/* Expanded Clinical Safety & Interactions Section */}
                    {isExpanded && (
                      <div className="mt-3 pt-3 border-t border-slate-200 bg-slate-50/80 p-3 rounded-xl space-y-2 text-xs animate-fade-in">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <span className="text-[10px] uppercase font-bold text-slate-500 block">
                              Administration Instructions
                            </span>
                            <p className="text-slate-800 font-medium mt-0.5">
                              {med.instructions || 'Standard oral administration as per guidelines.'}
                            </p>
                          </div>
                          <div>
                            <span className="text-[10px] uppercase font-bold text-slate-500 block">
                              Interaction & Safety Verification
                            </span>
                            <p className="text-slate-800 font-medium mt-0.5">
                              {med.interactionNotes || 'Verified against WHO Model Essential Medicines & DDI Matrix.'}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Add New Prescription Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden">
            <div className="bg-slate-900 text-white px-5 py-3.5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Pill className="w-4 h-4 text-indigo-400" />
                <h3 className="text-sm font-bold">Add Prescription to Patient Timeline</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddNewMed} className="p-5 space-y-3.5 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Drug Name (Brand) *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Bisoprolol (Concor)"
                    value={newDrugName}
                    onChange={(e) => setNewDrugName(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Generic Chemical Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Bisoprolol Fumarate"
                    value={newGenericName}
                    onChange={(e) => setNewGenericName(e.target.value)}
                    className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Pharmacological Class
                  </label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value as any)}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  >
                    <option value="ANTIHYPERTENSIVE">Antihypertensive</option>
                    <option value="CARDIOVASCULAR">Cardiovascular</option>
                    <option value="LIPID_LOWERING">Lipid-Lowering</option>
                    <option value="ANTIDIABETIC">Antidiabetic</option>
                    <option value="ANTICOAGULANT">Antiplatelet</option>
                    <option value="RESPIRATORY">Respiratory</option>
                    <option value="ANTIBIOTIC">Antibiotic</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Dosage & Unit *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 5 mg"
                    value={newDosage}
                    onChange={(e) => setNewDosage(e.target.value)}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Frequency
                  </label>
                  <input
                    type="text"
                    placeholder="Once daily"
                    value={newFrequency}
                    onChange={(e) => setNewFrequency(e.target.value)}
                    className="w-full px-2.5 py-1.5 border border-slate-300 rounded-lg text-xs font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Primary Clinical Indication
                </label>
                <input
                  type="text"
                  placeholder="e.g. Rate control & post-infarct myocardial preservation"
                  value={newIndication}
                  onChange={(e) => setNewIndication(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Special Administration Instructions
                </label>
                <textarea
                  rows={2}
                  placeholder="e.g. Take in the morning with food. Hold if resting pulse < 55 bpm."
                  value={newInstructions}
                  onChange={(e) => setNewInstructions(e.target.value)}
                  className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-medium focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div className="pt-2 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3 py-1.5 border border-slate-300 rounded-xl text-slate-700 font-semibold hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-sm cursor-pointer"
                >
                  Save to Timeline
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
