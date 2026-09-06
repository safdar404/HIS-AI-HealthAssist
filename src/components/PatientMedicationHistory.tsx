import React, { useState } from 'react';
import {
  Pill,
  AlertTriangle,
  Clock,
  Plus,
  Edit2,
  Check,
  X,
  History,
  ShieldAlert,
  ShieldCheck,
  Calendar,
  User,
  Info,
  Trash2,
  Sparkles,
} from 'lucide-react';
import { PatientAssessmentRecord } from '../types/clinical';
import { CONTROLLED_DRUG_DATABASE, performMedicationSafetyCheck } from '../clinical/controlledMedicationEngine';
import { CopyPatientIdButton } from './CopyPatientIdButton';

export interface ActiveMedication {
  id: string;
  name: string;
  genericName: string;
  dosage: string;
  frequency: string;
  route: string;
  indication: string;
  startDate: string;
  prescribingDoctor: string;
  adherence: 'EXCELLENT' | 'MODERATE' | 'POOR';
  isControlled?: boolean;
}

export interface HistoricalMedication {
  id: string;
  name: string;
  dosage: string;
  frequency: string;
  startDate: string;
  discontinuedDate: string;
  discontinueReason: string;
  prescribingDoctor: string;
}

export interface DrugAllergyRecord {
  id: string;
  allergen: string;
  reactionType: string;
  severity: 'SEVERE_ANAPHYLAXIS' | 'MODERATE' | 'MILD';
  identifiedDate: string;
  notes: string;
}

interface PatientMedicationHistoryProps {
  currentRecord: PatientAssessmentRecord;
  onUpdateMedications?: (activeMeds: ActiveMedication[], allergies: DrugAllergyRecord[]) => void;
  onBackToDossier?: () => void;
}

export const PatientMedicationHistory: React.FC<PatientMedicationHistoryProps> = ({
  currentRecord,
  onUpdateMedications,
  onBackToDossier,
}) => {
  const patientId = currentRecord.demographics.patientId;
  const storageKey = `medication_history_${patientId}`;

  // Initial State derived from currentRecord profile or defaults
  const [activeMeds, setActiveMeds] = useState<ActiveMedication[]>(() => {
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.activeMeds) return parsed.activeMeds;
      } catch (e) {
        console.error(e);
      }
    }
    // Default baseline active medications from profile
    const existing = currentRecord.profile.currentMedications || [];
    if (existing.length > 0) {
      return existing.map((m, idx) => ({
        id: `med-${idx + 1}`,
        name: m,
        genericName: m.split(' ')[0],
        dosage: m.includes('mg') ? m : 'Standard Dose',
        frequency: 'Once Daily (Morning)',
        route: 'Oral (PO)',
        indication: currentRecord.profile.hypertensionHistory
          ? 'Cardiovascular Risk / BP Control'
          : 'Clinical Maintenance',
        startDate: '2025-10-15',
        prescribingDoctor: 'Dr. Asim Farooq, FCPS',
        adherence: 'EXCELLENT',
      }));
    }
    // Fallback baseline for demo
    return [
      {
        id: 'med-1',
        name: 'Amlodipine (Norvasc)',
        genericName: 'Amlodipine Besylate',
        dosage: '5 mg',
        frequency: 'Once Daily (Morning)',
        route: 'Oral (PO)',
        indication: 'Essential Systemic Hypertension',
        startDate: '2025-08-10',
        prescribingDoctor: 'Dr. Asim Farooq, FCPS',
        adherence: 'EXCELLENT',
        isControlled: false,
      },
      {
        id: 'med-2',
        name: 'Atorvastatin (Lipitor)',
        genericName: 'Atorvastatin Calcium',
        dosage: '20 mg',
        frequency: 'Once Daily (Bedtime)',
        route: 'Oral (PO)',
        indication: 'Primary ASCVD Prevention / Dyslipidemia',
        startDate: '2025-09-01',
        prescribingDoctor: 'Dr. Bilal Qureshi, MD',
        adherence: 'MODERATE',
        isControlled: true,
      },
      ...(currentRecord.profile.diabetesHistory
        ? [
            {
              id: 'med-3',
              name: 'Metformin HCl (Glucophage)',
              genericName: 'Metformin Hydrochloride',
              dosage: '500 mg',
              frequency: 'Twice Daily (With Meals)',
              route: 'Oral (PO)',
              indication: 'Type 2 Diabetes Mellitus',
              startDate: '2025-05-12',
              prescribingDoctor: 'Dr. Asim Farooq, FCPS',
              adherence: 'EXCELLENT',
            },
          ]
        : []),
    ];
  });

  const [historicalMeds, setHistoricalMeds] = useState<HistoricalMedication[]>([
    {
      id: 'hist-1',
      name: 'Hydrochlorothiazide (HCTZ)',
      dosage: '12.5 mg',
      frequency: 'Once Daily',
      startDate: '2024-03-10',
      discontinuedDate: '2025-08-05',
      discontinueReason: 'Mild hypokalemia; switched to CCB monotherapy',
      prescribingDoctor: 'Dr. Zulfiqar Ali, MBBS',
    },
    {
      id: 'hist-2',
      name: 'Enalapril Maleate',
      dosage: '10 mg',
      frequency: 'Once Daily',
      startDate: '2024-01-15',
      discontinuedDate: '2024-03-01',
      discontinueReason: 'Persistent dry cough (ACEI class effect)',
      prescribingDoctor: 'Dr. Asim Farooq, FCPS',
    },
  ]);

  const [allergies, setAllergies] = useState<DrugAllergyRecord[]>(() => {
    const profileAllergies = currentRecord.profile.drugAllergies || [];
    if (profileAllergies.length > 0) {
      return profileAllergies.map((a, i) => ({
        id: `allg-${i + 1}`,
        allergen: a,
        reactionType: 'Cutaneous Rash / Angioedema',
        severity: 'SEVERE_ANAPHYLAXIS',
        identifiedDate: '2023-11-20',
        notes: 'Documented in tertiary hospital allergy alert system.',
      }));
    }
    return [
      {
        id: 'allg-1',
        allergen: 'ACE Inhibitors (Enalapril, Ramipril)',
        reactionType: 'Persistent dry cough & pharyngeal pruritus',
        severity: 'MODERATE',
        identifiedDate: '2024-03-01',
        notes: 'Advised to avoid all ACEIs; ARBs (Telmisartan/Losartan) tolerated with monitoring.',
      },
      {
        id: 'allg-2',
        allergen: 'Penicillin / Amoxicillin',
        reactionType: 'Urticaria & facial edema',
        severity: 'SEVERE_ANAPHYLAXIS',
        identifiedDate: '2021-04-14',
        notes: 'Strict cross-reactivity alert. Carry MedicAlert bracelet.',
      },
    ];
  });

  // Edit / Add Modal States
  const [editingMed, setEditingMed] = useState<ActiveMedication | null>(null);
  const [showAddMedModal, setShowAddMedModal] = useState<boolean>(false);
  const [showAddAllergyModal, setShowAddAllergyModal] = useState<boolean>(false);

  // New Medication Form State
  const [newMedName, setNewMedName] = useState('Telmisartan');
  const [newMedDosage, setNewMedDosage] = useState('40 mg');
  const [newMedFreq, setNewMedFreq] = useState('Once Daily (Morning)');
  const [newMedRoute, setNewMedRoute] = useState('Oral (PO)');
  const [newMedIndication, setNewMedIndication] = useState('Stage 2 Hypertension');
  const [newMedAdherence, setNewMedAdherence] = useState<'EXCELLENT' | 'MODERATE' | 'POOR'>('EXCELLENT');

  // New Allergy Form State
  const [newAllergen, setNewAllergen] = useState('');
  const [newAllergyReaction, setNewAllergyReaction] = useState('');
  const [newAllergySeverity, setNewAllergySeverity] = useState<'SEVERE_ANAPHYLAXIS' | 'MODERATE' | 'MILD'>('MODERATE');
  const [newAllergyNotes, setNewAllergyNotes] = useState('');

  // Discontinue State
  const [discontinuingMedId, setDiscontinuingMedId] = useState<string | null>(null);
  const [discontinueReason, setDiscontinueReason] = useState<string>('Goal BP reached / therapy optimization');

  // Save to LocalStorage
  const persistState = (newActive: ActiveMedication[], newAllg: DrugAllergyRecord[]) => {
    try {
      localStorage.setItem(
        storageKey,
        JSON.stringify({
          activeMeds: newActive,
          allergies: newAllg,
          timestamp: Date.now(),
        })
      );
      if (onUpdateMedications) {
        onUpdateMedications(newActive, newAllg);
      }
    } catch (e) {
      console.warn('LocalStorage save failed:', e);
    }
  };

  // Quick Edit Handler
  const handleSaveEdit = (updated: ActiveMedication) => {
    const nextActive = activeMeds.map((m) => (m.id === updated.id ? updated : m));
    setActiveMeds(nextActive);
    setEditingMed(null);
    persistState(nextActive, allergies);
  };

  // Add Medication Handler
  const handleAddMedication = () => {
    if (!newMedName.trim()) return;
    const newMed: ActiveMedication = {
      id: `med-${Date.now().toString().slice(-6)}`,
      name: newMedName,
      genericName: newMedName.split(' ')[0],
      dosage: newMedDosage,
      frequency: newMedFreq,
      route: newMedRoute,
      indication: newMedIndication,
      startDate: new Date().toISOString().split('T')[0],
      prescribingDoctor: 'Dr. Asim Farooq, FCPS',
      adherence: newMedAdherence,
    };
    const nextActive = [...activeMeds, newMed];
    setActiveMeds(nextActive);
    setShowAddMedModal(false);
    persistState(nextActive, allergies);
  };

  // Discontinue Active Med
  const handleConfirmDiscontinue = () => {
    if (!discontinuingMedId) return;
    const med = activeMeds.find((m) => m.id === discontinuingMedId);
    if (med) {
      const nextHistorical: HistoricalMedication = {
        id: `hist-${Date.now().toString().slice(-6)}`,
        name: med.name,
        dosage: med.dosage,
        frequency: med.frequency,
        startDate: med.startDate,
        discontinuedDate: new Date().toISOString().split('T')[0],
        discontinueReason: discontinueReason || 'Physician modified therapy regimen',
        prescribingDoctor: 'Dr. Asim Farooq, FCPS',
      };
      setHistoricalMeds((prev) => [nextHistorical, ...prev]);
      const nextActive = activeMeds.filter((m) => m.id !== discontinuingMedId);
      setActiveMeds(nextActive);
      persistState(nextActive, allergies);
    }
    setDiscontinuingMedId(null);
  };

  // Add Allergy Handler
  const handleAddAllergy = () => {
    if (!newAllergen.trim()) return;
    const newAllg: DrugAllergyRecord = {
      id: `allg-${Date.now().toString().slice(-6)}`,
      allergen: newAllergen,
      reactionType: newAllergyReaction || 'Unspecified allergic response',
      severity: newAllergySeverity,
      identifiedDate: new Date().toISOString().split('T')[0],
      notes: newAllergyNotes || 'Documented by attending clinician during CDS review.',
    };
    const nextAllg = [...allergies, newAllg];
    setAllergies(nextAllg);
    setShowAddAllergyModal(false);
    setNewAllergen('');
    setNewAllergyReaction('');
    setNewAllergyNotes('');
    persistState(activeMeds, nextAllg);
  };

  // Check for potential allergy conflicts with current active meds
  const activeAllergyConflicts = activeMeds.filter((m) =>
    allergies.some((a) => m.name.toLowerCase().includes(a.allergen.toLowerCase().split(' ')[0]))
  );

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-50 border border-cyan-200 flex items-center justify-center text-cyan-700">
              <Pill className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                Medication History & Regimen Management
                <span className="text-[10px] font-mono bg-cyan-100 text-cyan-800 px-2 py-0.5 rounded font-bold">
                  {activeMeds.length} Active Prescriptions
                </span>
              </h3>
              <div className="text-xs text-slate-500 flex items-center gap-1.5 flex-wrap mt-0.5">
                <span>Patient: <strong className="text-slate-800">{currentRecord.demographics.fullName}</strong></span>
                <span className="font-mono text-slate-700 bg-slate-100 px-1.5 py-0.2 rounded border border-slate-200">
                  {currentRecord.demographics.patientId}
                </span>
                <CopyPatientIdButton
                  id="btn-copy-med-history-pid"
                  value={currentRecord.demographics.patientId}
                  label="Copy ID"
                  size="sm"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {onBackToDossier && (
              <button
                id="btn-meds-back-to-dossier"
                onClick={onBackToDossier}
                className="px-3.5 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-900 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
              >
                <span>←</span>
                <span>Back to Clinical Dossier</span>
              </button>
            )}
            <button
              id="btn-add-active-med"
              onClick={() => setShowAddMedModal(true)}
              className="px-3 py-1.5 rounded-lg bg-cyan-700 hover:bg-cyan-800 text-white text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Medication
            </button>
            <button
              id="btn-add-allergy"
              onClick={() => setShowAddAllergyModal(true)}
              className="px-3 py-1.5 rounded-lg bg-rose-50 border border-rose-200 hover:bg-rose-100 text-rose-700 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <ShieldAlert className="w-3.5 h-3.5 text-rose-600" />
              Add Drug Allergy
            </button>
          </div>
        </div>

        {/* Allergy Warning Alert if Conflicts Exist */}
        {activeAllergyConflicts.length > 0 && (
          <div className="mt-3 bg-red-600 text-white p-3 rounded-xl flex items-center gap-2.5 text-xs font-bold animate-pulse">
            <AlertTriangle className="w-4 h-4 text-white shrink-0" />
            <span>
              CRITICAL SAFETY WARNING: Active medication contains allergen conflict ({activeAllergyConflicts.map((c) => c.name).join(', ')}). Immediate physician review required!
            </span>
          </div>
        )}
      </div>

      {/* 1. ACTIVE MEDICATIONS SECTION */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            Current Active Regimens ({activeMeds.length})
          </h4>
          <span className="text-[11px] text-slate-500 font-mono">
            Click 'Quick Edit' to modify dosage, frequency, or discontinue
          </span>
        </div>

        {activeMeds.length === 0 ? (
          <div className="text-center py-6 bg-slate-50 rounded-xl border border-dashed border-slate-200 text-xs text-slate-500">
            No active medications recorded for this patient. Click 'Add Medication' above.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {activeMeds.map((med) => {
              const isBeingEdited = editingMed?.id === med.id;

              return (
                <div
                  key={med.id}
                  id={`active-med-card-${med.id}`}
                  className="p-4 rounded-xl border border-slate-200 bg-slate-50/70 hover:bg-white hover:border-cyan-300 transition-all space-y-2.5 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-900">{med.name}</span>
                        <span className="text-[10px] font-mono bg-cyan-100 text-cyan-800 px-1.5 py-0.2 rounded font-bold">
                          {med.dosage}
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                        {med.genericName} • {med.route}
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        id={`btn-edit-med-${med.id}`}
                        onClick={() => setEditingMed(med)}
                        className="p-1 rounded bg-white hover:bg-slate-100 border border-slate-200 text-slate-600 hover:text-cyan-700 text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                        title="Quick Edit Dosage Regimen"
                      >
                        <Edit2 className="w-3 h-3" />
                        <span>Edit</span>
                      </button>
                      <button
                        id={`btn-discontinue-${med.id}`}
                        onClick={() => setDiscontinuingMedId(med.id)}
                        className="p-1 rounded bg-white hover:bg-rose-50 border border-slate-200 hover:border-rose-200 text-slate-500 hover:text-rose-600 text-[10px] font-bold flex items-center gap-1 cursor-pointer"
                        title="Discontinue Medication"
                      >
                        <X className="w-3 h-3" />
                        <span>Stop</span>
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[11px] pt-1 border-t border-slate-200/60">
                    <div>
                      <span className="text-[10px] text-slate-400 block uppercase">Schedule</span>
                      <strong className="text-slate-700">{med.frequency}</strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block uppercase">Indication</span>
                      <span className="text-slate-700 truncate block">{med.indication}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1 border-t border-slate-200/40">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3 h-3 text-slate-400" />
                      Started {med.startDate}
                    </span>
                    <span
                      className={`font-bold px-1.5 py-0.2 rounded ${
                        med.adherence === 'EXCELLENT'
                          ? 'bg-emerald-100 text-emerald-800'
                          : med.adherence === 'MODERATE'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      Adherence: {med.adherence}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 2. DRUG ALLERGIES & ADVERSE REACTIONS SECTION */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
          <h4 className="text-xs font-bold uppercase tracking-wider text-rose-800 flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-rose-600" />
            Documented Drug Allergies & Hypersensitivities ({allergies.length})
          </h4>
          <span className="text-[10px] bg-rose-100 text-rose-800 px-2 py-0.5 rounded font-mono font-bold">
            Critical Clinical Safety Layer
          </span>
        </div>

        {allergies.length === 0 ? (
          <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200 text-xs text-emerald-800 flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-600" />
            No known drug allergies (NKDA) recorded for this patient.
          </div>
        ) : (
          <div className="space-y-2.5">
            {allergies.map((alg) => (
              <div
                key={alg.id}
                id={`allergy-card-${alg.id}`}
                className="p-3 rounded-xl border border-rose-200 bg-rose-50/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
              >
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-rose-950">{alg.allergen}</span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.2 rounded ${
                        alg.severity === 'SEVERE_ANAPHYLAXIS'
                          ? 'bg-red-600 text-white'
                          : alg.severity === 'MODERATE'
                          ? 'bg-amber-500 text-white'
                          : 'bg-slate-200 text-slate-800'
                      }`}
                    >
                      {alg.severity === 'SEVERE_ANAPHYLAXIS'
                        ? 'Severe / Anaphylaxis'
                        : alg.severity === 'MODERATE'
                        ? 'Moderate Reaction'
                        : 'Mild'}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-700">
                    <strong>Reaction:</strong> {alg.reactionType}
                  </div>
                  <p className="text-[10px] text-slate-500">{alg.notes}</p>
                </div>

                <div className="text-right text-[10px] text-slate-400 font-mono shrink-0">
                  Documented: {alg.identifiedDate}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 3. HISTORICAL / DISCONTINUED MEDICATIONS */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-3">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
            <History className="w-4 h-4 text-slate-500" />
            Historical / Discontinued Regimens ({historicalMeds.length})
          </h4>
          <span className="text-[10px] text-slate-400 font-mono">Prior Clinical Trials & Changes</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-500 text-[10px] uppercase font-bold border-b border-slate-200">
              <tr>
                <th className="py-2 px-3">Medication</th>
                <th className="py-2 px-3">Dosage & Freq</th>
                <th className="py-2 px-3">Duration Period</th>
                <th className="py-2 px-3">Reason for Discontinuation</th>
                <th className="py-2 px-3">Prescriber</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {historicalMeds.map((hm) => (
                <tr key={hm.id} className="hover:bg-slate-50/50">
                  <td className="py-2.5 px-3 font-bold text-slate-900">{hm.name}</td>
                  <td className="py-2.5 px-3 font-mono text-slate-600">
                    {hm.dosage} • {hm.frequency}
                  </td>
                  <td className="py-2.5 px-3 text-[11px] text-slate-500">
                    {hm.startDate} &rarr; {hm.discontinuedDate}
                  </td>
                  <td className="py-2.5 px-3 text-slate-700 font-medium">{hm.discontinueReason}</td>
                  <td className="py-2.5 px-3 text-slate-500 text-[11px]">{hm.prescribingDoctor}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* QUICK EDIT MODAL */}
      {editingMed && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Edit2 className="w-4 h-4 text-cyan-600" />
                Quick-Edit Dosage Regimen: {editingMed.name}
              </h3>
              <button
                onClick={() => setEditingMed(null)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Dosage (Strength & Formulation)
                </label>
                <input
                  id="input-edit-dosage"
                  type="text"
                  value={editingMed.dosage}
                  onChange={(e) => setEditingMed({ ...editingMed, dosage: e.target.value })}
                  className="w-full p-2 border border-slate-300 rounded-lg"
                  placeholder="e.g. 10 mg or 20 mg OD"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">Frequency</label>
                  <select
                    id="select-edit-frequency"
                    value={editingMed.frequency}
                    onChange={(e) => setEditingMed({ ...editingMed, frequency: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded-lg bg-white"
                  >
                    <option value="Once Daily (Morning)">Once Daily (Morning)</option>
                    <option value="Once Daily (Bedtime)">Once Daily (Bedtime)</option>
                    <option value="Twice Daily (BID)">Twice Daily (BID)</option>
                    <option value="Three Times Daily (TID)">Three Times Daily (TID)</option>
                    <option value="As Needed (PRN)">As Needed (PRN)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Adherence Status
                  </label>
                  <select
                    id="select-edit-adherence"
                    value={editingMed.adherence}
                    onChange={(e) =>
                      setEditingMed({
                        ...editingMed,
                        adherence: e.target.value as 'EXCELLENT' | 'MODERATE' | 'POOR',
                      })
                    }
                    className="w-full p-2 border border-slate-300 rounded-lg bg-white"
                  >
                    <option value="EXCELLENT">Excellent (&gt;90% Doses)</option>
                    <option value="MODERATE">Moderate (Misses &lt;2 doses/wk)</option>
                    <option value="POOR">Poor (&lt;50% Compliance)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">Indication</label>
                <input
                  id="input-edit-indication"
                  type="text"
                  value={editingMed.indication}
                  onChange={(e) => setEditingMed({ ...editingMed, indication: e.target.value })}
                  className="w-full p-2 border border-slate-300 rounded-lg"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => setEditingMed(null)}
                className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                id="btn-save-edit-med"
                onClick={() => handleSaveEdit(editingMed)}
                className="px-4 py-1.5 rounded-lg bg-cyan-700 hover:bg-cyan-800 text-white text-xs font-bold shadow-sm cursor-pointer"
              >
                Save Regimen Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ADD MEDICATION MODAL */}
      {showAddMedModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Plus className="w-4 h-4 text-cyan-600" />
                Add Active Medication to Regimen
              </h3>
              <button
                onClick={() => setShowAddMedModal(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">Medication Name</label>
                <input
                  id="input-new-med-name"
                  type="text"
                  value={newMedName}
                  onChange={(e) => setNewMedName(e.target.value)}
                  placeholder="e.g. Telmisartan / Amlodipine"
                  className="w-full p-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">Dosage</label>
                  <input
                    id="input-new-med-dosage"
                    type="text"
                    value={newMedDosage}
                    onChange={(e) => setNewMedDosage(e.target.value)}
                    placeholder="e.g. 40 mg"
                    className="w-full p-2 border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">Frequency</label>
                  <select
                    id="select-new-med-frequency"
                    value={newMedFreq}
                    onChange={(e) => setNewMedFreq(e.target.value)}
                    className="w-full p-2 border border-slate-300 rounded-lg bg-white"
                  >
                    <option value="Once Daily (Morning)">Once Daily (Morning)</option>
                    <option value="Once Daily (Bedtime)">Once Daily (Bedtime)</option>
                    <option value="Twice Daily (BID)">Twice Daily (BID)</option>
                    <option value="Three Times Daily (TID)">Three Times Daily (TID)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">Indication</label>
                <input
                  id="input-new-med-indication"
                  type="text"
                  value={newMedIndication}
                  onChange={(e) => setNewMedIndication(e.target.value)}
                  placeholder="e.g. Essential Hypertension Grade 2"
                  className="w-full p-2 border border-slate-300 rounded-lg"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => setShowAddMedModal(false)}
                className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                id="btn-confirm-add-med"
                onClick={handleAddMedication}
                className="px-4 py-1.5 rounded-lg bg-cyan-700 hover:bg-cyan-800 text-white text-xs font-bold shadow-sm cursor-pointer"
              >
                Add to Patient Regimen
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DISCONTINUE MEDICATION MODAL */}
      {discontinuingMedId && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-rose-700 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                Discontinue Active Medication
              </h3>
              <button
                onClick={() => setDiscontinuingMedId(null)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <p className="text-slate-600">
                Are you sure you want to discontinue this medication? It will be archived under Historical Regimens.
              </p>
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Clinical Reason for Discontinuation
                </label>
                <input
                  id="input-discontinue-reason"
                  type="text"
                  value={discontinueReason}
                  onChange={(e) => setDiscontinueReason(e.target.value)}
                  placeholder="e.g. Switched to combination therapy or adverse effect"
                  className="w-full p-2 border border-slate-300 rounded-lg"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => setDiscontinuingMedId(null)}
                className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                id="btn-confirm-discontinue"
                onClick={handleConfirmDiscontinue}
                className="px-4 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-sm cursor-pointer"
              >
                Confirm Discontinuation
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ADD ALLERGY MODAL */}
      {showAddAllergyModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-rose-700 flex items-center gap-2">
                <ShieldAlert className="w-4 h-4" />
                Record Known Drug Allergy / Adverse Reaction
              </h3>
              <button
                onClick={() => setShowAddAllergyModal(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Drug / Substance Allergen Name
                </label>
                <input
                  id="input-new-allergen"
                  type="text"
                  value={newAllergen}
                  onChange={(e) => setNewAllergen(e.target.value)}
                  placeholder="e.g. Aspirin, Sulfa drugs, Penicillins"
                  className="w-full p-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Reaction Manifestation
                  </label>
                  <input
                    id="input-new-allergy-reaction"
                    type="text"
                    value={newAllergyReaction}
                    onChange={(e) => setNewAllergyReaction(e.target.value)}
                    placeholder="e.g. Bronchospasm, rash, urticaria"
                    className="w-full p-2 border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">Severity</label>
                  <select
                    id="select-new-allergy-severity"
                    value={newAllergySeverity}
                    onChange={(e) =>
                      setNewAllergySeverity(
                        e.target.value as 'SEVERE_ANAPHYLAXIS' | 'MODERATE' | 'MILD'
                      )
                    }
                    className="w-full p-2 border border-slate-300 rounded-lg bg-white"
                  >
                    <option value="SEVERE_ANAPHYLAXIS">Severe / Anaphylaxis (Life Threatening)</option>
                    <option value="MODERATE">Moderate Reaction</option>
                    <option value="MILD">Mild (Skin rash / GI upset)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Clinical Notes & Avoidance Protocol
                </label>
                <input
                  id="input-new-allergy-notes"
                  type="text"
                  value={newAllergyNotes}
                  onChange={(e) => setNewAllergyNotes(e.target.value)}
                  placeholder="e.g. Avoid all cross-reactive beta-lactam antibiotics"
                  className="w-full p-2 border border-slate-300 rounded-lg"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => setShowAddAllergyModal(false)}
                className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                id="btn-confirm-add-allergy"
                onClick={handleAddAllergy}
                className="px-4 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-sm cursor-pointer"
              >
                Save Allergy Alert
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
