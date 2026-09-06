import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { ErrorBoundary } from './ErrorBoundary';
import {
  PatientAssessmentRecord,
  ClinicalProfile,
  LabResults,
} from '../types/clinical';
import {
  checkPatientMedicationSafety,
  DrugContraindicationAlert,
  ClinicalSafetyAssessment,
} from '../services/clinicalDrugApiService';
import {
  ShieldAlert,
  AlertTriangle,
  AlertOctagon,
  Pill,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Info,
  Sparkles,
  ArrowRight,
  RefreshCw,
  XCircle,
  Plus,
  Globe,
  Database,
  ExternalLink,
  Activity,
  HeartCrack,
} from 'lucide-react';

interface MedicationInteractionCheckerProps {
  currentRecord: PatientAssessmentRecord;
  newCandidateDrugs?: string[];
  onApplyAlternativeDrug?: (drugName: string, dosage: string, rationale: string) => void;
  onContraindicationsChange?: (alerts: DrugContraindicationAlert[]) => void;
  className?: string;
}

export const MedicationInteractionChecker: React.FC<MedicationInteractionCheckerProps> = ({
  currentRecord,
  newCandidateDrugs = [],
  onApplyAlternativeDrug,
  onContraindicationsChange,
  className = '',
}) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const [activeTab, setActiveTab] = useState<'ALERTS' | 'ALL_ACTIVE' | 'TEST_COMBO' | 'API_INFO'>('ALERTS');
  const [testSimulatedDrug, setTestSimulatedDrug] = useState<string>('Ibuprofen (Brufen 400mg)');
  const [extraSimulatedDrugs, setExtraSimulatedDrugs] = useState<string[]>([]);
  const [isLoadingApi, setIsLoadingApi] = useState<boolean>(false);
  const [assessment, setAssessment] = useState<ClinicalSafetyAssessment | null>(null);

  const profile = currentRecord?.profile || ({} as ClinicalProfile);

  // Active prescribed drugs from record + doctor review + candidate drugs + simulated drugs
  const allCurrentMeds = useMemo(() => {
    return [
      ...(profile.currentMedications || []),
      ...(currentRecord?.doctorReview?.prescribedMedications?.map((m) => m.drugName) || []),
      ...newCandidateDrugs,
      ...extraSimulatedDrugs,
    ].filter(Boolean);
  }, [profile.currentMedications, currentRecord?.doctorReview?.prescribedMedications, newCandidateDrugs, extraSimulatedDrugs]);

  // Risk factors list safe derivation
  const riskFactorsList = useMemo(() => {
    if (assessment?.patientRiskFactors && Array.isArray(assessment.patientRiskFactors)) {
      return assessment.patientRiskFactors;
    }
    if (assessment?.patientHistoryContext?.conditions && Array.isArray(assessment.patientHistoryContext.conditions)) {
      return assessment.patientHistoryContext.conditions;
    }
    return [];
  }, [assessment]);

  // Execute clinical drug API safety evaluation
  const runSafetyCheck = useCallback(async () => {
    if (!currentRecord) return;
    setIsLoadingApi(true);
    try {
      const result = await checkPatientMedicationSafety(currentRecord, allCurrentMeds);
      setAssessment(result);
      if (onContraindicationsChange) {
        onContraindicationsChange(result.alerts);
      }
    } catch (err) {
      console.error('Drug interaction evaluation error:', err);
    } finally {
      setIsLoadingApi(false);
    }
  }, [currentRecord, allCurrentMeds, onContraindicationsChange]);

  // Run on mount or whenever medications / patient change
  useEffect(() => {
    runSafetyCheck();
  }, [runSafetyCheck]);

  const handleAddSimulated = () => {
    if (testSimulatedDrug && !extraSimulatedDrugs.includes(testSimulatedDrug)) {
      setExtraSimulatedDrugs([...extraSimulatedDrugs, testSimulatedDrug]);
    }
  };

  const handleRemoveSimulated = (name: string) => {
    setExtraSimulatedDrugs(extraSimulatedDrugs.filter((d) => d !== name));
  };

  if (!currentRecord) {
    return null;
  }

  const hasContraindications = assessment?.hasContraindications ?? false;
  const hasHighRisk = assessment?.hasHighRisk ?? false;
  const alerts = Array.isArray(assessment?.alerts) ? assessment.alerts : [];
  const totalAlerts = alerts?.length ?? 0;
  const medsCount = allCurrentMeds?.length ?? 0;
  const riskFactorsCount = riskFactorsList?.length ?? 0;

  return (
    <div
      id="medication-interaction-checker-card"
      className={`rounded-2xl border transition-all ${
        hasContraindications
          ? 'bg-rose-950/20 border-rose-500/80 ring-1 ring-rose-500/30'
          : hasHighRisk
          ? 'bg-amber-950/20 border-amber-500/80 ring-1 ring-amber-500/30'
          : totalAlerts > 0
          ? 'bg-yellow-950/20 border-yellow-500/70'
          : 'bg-emerald-950/20 border-emerald-500/60'
      } p-4 sm:p-5 shadow-sm space-y-3.5 ${className}`}
    >
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div
            className={`p-2 rounded-xl border shrink-0 ${
              hasContraindications
                ? 'bg-rose-600 text-white border-rose-700 shadow-md shadow-rose-900/40'
                : hasHighRisk
                ? 'bg-amber-500 text-white border-amber-600'
                : totalAlerts > 0
                ? 'bg-yellow-500 text-slate-900 border-yellow-600'
                : 'bg-emerald-600 text-white border-emerald-700'
            }`}
          >
            {hasContraindications ? (
              <AlertOctagon className="w-5 h-5 animate-pulse" />
            ) : hasHighRisk ? (
              <AlertTriangle className="w-5 h-5" />
            ) : (
              <ShieldAlert className="w-5 h-5" />
            )}
          </div>

          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="text-sm font-black text-white flex items-center gap-2">
                Drug-Interaction & Safety Checker
                <span className="text-[10px] font-mono font-semibold px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-300 border border-cyan-800 flex items-center gap-1">
                  <Globe className="w-2.5 h-2.5" />
                  NLM RxNav API
                </span>
              </h4>

              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full border font-mono ${
                  hasContraindications
                    ? 'bg-rose-950 text-rose-300 border-rose-500 animate-pulse'
                    : hasHighRisk
                    ? 'bg-amber-950 text-amber-300 border-amber-500'
                    : 'bg-emerald-950 text-emerald-300 border-emerald-600'
                }`}
              >
                {totalAlerts === 0
                  ? 'NO DANGEROUS INTERACTIONS DETECTED'
                  : `${totalAlerts} CLINICAL SAFETY ALERT${totalAlerts > 1 ? 'S' : ''}`}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Cross-references patient medical history, eGFR/renal status, and concurrent regimen using NLM RxNav Clinical Pharmacology & WHO HEARTS criteria.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Refresh API Check button */}
          <button
            type="button"
            onClick={runSafetyCheck}
            disabled={isLoadingApi}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition-colors cursor-pointer text-xs flex items-center gap-1"
            title="Re-run External Clinical API Check"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoadingApi ? 'animate-spin text-cyan-400' : ''}`} />
            <span className="hidden sm:inline text-[11px]">Recheck API</span>
          </button>

          <button
            id="btn-toggle-interaction-details"
            onClick={() => setIsExpanded(!isExpanded)}
            className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700 transition-all flex items-center gap-1 cursor-pointer"
          >
            <span>{isExpanded ? 'Collapse' : 'Expand Details'}</span>
            {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="space-y-4 pt-1">
          {/* External API Status Banner */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl px-3 py-2 flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span
                  className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                    isLoadingApi ? 'bg-amber-400' : 'bg-emerald-400'
                  }`}
                ></span>
                <span
                  className={`relative inline-flex rounded-full h-2 w-2 ${
                    isLoadingApi ? 'bg-amber-500' : 'bg-emerald-500'
                  }`}
                ></span>
              </span>
              <span className="text-slate-300 font-mono text-[11px]">
                API Source: <strong className="text-white">{assessment?.apiAttribution || 'NLM RxNav Clinical API'}</strong>
              </span>
            </div>

            <div className="flex items-center gap-3 text-[11px] text-slate-400">
              <span>
                Screened: <strong className="text-cyan-400 font-mono">{medsCount} Agents</strong>
              </span>
              <span>
                Patient Risk Profile: <strong className="text-amber-400 font-mono">{riskFactorsCount} Factors</strong>
              </span>
            </div>
          </div>

          {/* Sub Navigation Bar */}
          <div className="flex items-center gap-1.5 border-b border-slate-800 pb-2 overflow-x-auto">
            <button
              id="tab-ddi-alerts"
              onClick={() => setActiveTab('ALERTS')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'ALERTS'
                  ? 'bg-slate-800 text-white shadow-xs border border-slate-700'
                  : 'text-slate-400 hover:text-white hover:bg-slate-850'
              }`}
            >
              Identified Safety Warnings ({totalAlerts})
            </button>
            <button
              id="tab-ddi-active-regimen"
              onClick={() => setActiveTab('ALL_ACTIVE')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'ALL_ACTIVE'
                  ? 'bg-slate-800 text-white shadow-xs border border-slate-700'
                  : 'text-slate-400 hover:text-white hover:bg-slate-850'
              }`}
            >
              Screened Regimen List ({medsCount})
            </button>
            <button
              id="tab-ddi-simulate-drug"
              onClick={() => setActiveTab('TEST_COMBO')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'TEST_COMBO'
                  ? 'bg-slate-800 text-white shadow-xs border border-slate-700'
                  : 'text-slate-400 hover:text-white hover:bg-slate-850'
              }`}
            >
              Simulate New Rx Combination
            </button>
            <button
              id="tab-ddi-api-info"
              onClick={() => setActiveTab('API_INFO')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                activeTab === 'API_INFO'
                  ? 'bg-slate-800 text-white shadow-xs border border-slate-700'
                  : 'text-slate-400 hover:text-white hover:bg-slate-850'
              }`}
            >
              API Spec & Evidence
            </button>
          </div>

          {/* TAB 1: ALERTS */}
          {activeTab === 'ALERTS' && (
            <div className="space-y-2.5">
              {totalAlerts === 0 ? (
                <div className="bg-slate-900/80 rounded-xl p-5 border border-emerald-500/40 text-center space-y-1.5">
                  <CheckCircle2 className="w-7 h-7 text-emerald-400 mx-auto" />
                  <h5 className="text-sm font-bold text-white">
                    Optimal Medication Safety Profile
                  </h5>
                  <p className="text-xs text-slate-400 max-w-md mx-auto">
                    External NLM RxNav API cross-check found no critical drug-drug interactions, pregnancy contraindications, or severe renal overdosing flags for the active regimen.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {alerts.map((alert, idx) => (
                    <div
                      key={alert.id || `alert-${idx}`}
                      className={`p-3.5 rounded-xl border transition-all text-xs space-y-2 shadow-sm ${
                        alert.severity === 'CONTRAINDICATED'
                          ? 'bg-rose-950/50 border-rose-500/80 text-rose-100'
                          : alert.severity === 'HIGH'
                          ? 'bg-amber-950/50 border-amber-500/80 text-amber-100'
                          : 'bg-yellow-950/40 border-yellow-500/70 text-yellow-100'
                      }`}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider ${
                              alert.severity === 'CONTRAINDICATED'
                                ? 'bg-rose-600 text-white border border-rose-400'
                                : alert.severity === 'HIGH'
                                ? 'bg-amber-600 text-white border border-amber-400'
                                : 'bg-yellow-600 text-slate-900 border border-yellow-400'
                            }`}
                          >
                            {alert.severity === 'CONTRAINDICATED' ? 'CONTRAINDICATION' : `${alert.severity} RISK`}
                          </span>
                          <span className="font-black text-white text-xs sm:text-sm">
                            {alert.title}
                          </span>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-black/40 text-slate-300 border border-slate-700">
                            {alert.conflictCategory}
                          </span>
                        </div>

                        <span className="text-[10px] font-mono text-slate-400">
                          {alert.evidenceSource}
                        </span>
                      </div>

                      {/* Mechanism & Conflict Details */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs bg-black/30 p-2.5 rounded-lg border border-white/10">
                        <div>
                          <span className="text-[10px] font-bold uppercase text-slate-400 block">
                            Candidate / Prescribed Drug:
                          </span>
                          <strong className="text-white font-mono">{alert.drugName}</strong>
                        </div>
                        <div>
                          <span className="text-[10px] font-bold uppercase text-slate-400 block">
                            Conflicting Entity:
                          </span>
                          <strong className="text-rose-300 font-mono">{alert.conflictingWith}</strong>
                        </div>
                      </div>

                      <div className="space-y-1 text-xs">
                        <p className="text-slate-200 leading-relaxed">
                          <strong className="text-rose-300">Clinical Risk:</strong> {alert.clinicalRisk}
                        </p>
                        <p className="text-slate-300 leading-relaxed text-[11px]">
                          <strong className="text-slate-400">Pharmacological Mechanism:</strong> {alert.mechanism}
                        </p>

                        <div className="bg-emerald-950/70 border border-emerald-500/60 p-2.5 rounded-lg text-emerald-200 text-xs flex items-start gap-2 mt-2">
                          <Sparkles className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                          <div className="flex-1">
                            <strong className="text-emerald-300">Clinical Recommendation:</strong> {alert.recommendation}
                            {alert.alternativeSuggested && onApplyAlternativeDrug && (
                              <div className="mt-2 flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() =>
                                    onApplyAlternativeDrug(
                                      alert.alternativeSuggested!,
                                      alert.alternativeDosage || 'Standard Dose',
                                      `Protocol substitution to avoid contraindication with ${alert.conflictingWith}`
                                    )
                                  }
                                  className="px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] flex items-center gap-1 cursor-pointer transition-colors shadow-xs"
                                >
                                  <span>Switch to {alert.alternativeSuggested}</span>
                                  <ArrowRight className="w-3 h-3" />
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: ALL ACTIVE REGIMEN */}
          {activeTab === 'ALL_ACTIVE' && (
            <div className="bg-slate-900/90 rounded-xl p-3.5 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between text-xs font-bold text-slate-300">
                <span>Active Screened Medications & Regimen</span>
                <span className="text-[10px] font-mono text-slate-400">Total: {medsCount}</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {(allCurrentMeds || []).map((med, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 text-slate-200 text-xs font-mono border border-slate-700"
                  >
                    <Pill className="w-3 h-3 text-cyan-400" />
                    <span>{med}</span>
                  </span>
                ))}
              </div>

              {Array.isArray(profile?.drugAllergies) && profile.drugAllergies.length > 0 && (
                <div className="pt-2 border-t border-slate-800">
                  <span className="text-[11px] font-bold text-rose-400 block mb-1">
                    Known Drug Allergies / Hypersensitivities:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {profile.drugAllergies.map((al, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-0.5 rounded-md bg-rose-950/80 border border-rose-700 text-rose-300 text-[10px] font-bold"
                      >
                        ⚠️ {al}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Patient History Conditions screened */}
              <div className="pt-2 border-t border-slate-800">
                <span className="text-[11px] font-bold text-cyan-400 block mb-1">
                  Active Clinical History Factors Cross-Referenced:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {riskFactorsList.length > 0 ? (
                    riskFactorsList.map((rf, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-0.5 rounded-md bg-slate-800 border border-slate-700 text-slate-300 text-[10px] font-mono"
                      >
                        {rf}
                      </span>
                    ))
                  ) : (
                    <span className="text-[11px] text-slate-500 italic">No comorbid risk factors flagged.</span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: SIMULATE NEW COMBO */}
          {activeTab === 'TEST_COMBO' && (
            <div className="bg-slate-900/90 rounded-xl p-3.5 border border-slate-800 space-y-3">
              <div className="text-xs text-slate-300">
                <strong>Simulate Co-Prescriptions with External API:</strong> Test adding a candidate medication (e.g., NSAID, Nitrate, Spironolactone, Fluconazole) against the patient's existing history before adding to the bill.
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <select
                  id="select-simulate-drug"
                  value={testSimulatedDrug}
                  onChange={(e) => setTestSimulatedDrug(e.target.value)}
                  className="p-2 text-xs border border-slate-700 rounded-xl bg-slate-950 text-slate-200 flex-1 min-w-[220px] focus:ring-1 focus:ring-cyan-500 focus:outline-none cursor-pointer"
                >
                  <option value="Ibuprofen (Brufen 400mg)">Ibuprofen / NSAID (Nephrotoxicity / GI Ulcer test)</option>
                  <option value="Spironolactone (Aldactone 25mg)">Spironolactone (Hyperkalemia / ACEi test)</option>
                  <option value="Verapamil (Isoptin 80mg)">Verapamil / Non-DHP CCB (Severe Bradycardia test)</option>
                  <option value="Nitroglycerin (Angisid 0.5mg SL)">Nitroglycerin / Nitrate (Reflex Hypotension test)</option>
                  <option value="Clarithromycin (Klacid 500mg)">Clarithromycin / Macrolide (CYP3A4 Statin Rhabdomyolysis test)</option>
                  <option value="Aspirin (Disprin 75mg)">Aspirin (Antiplatelet Bleeding / Peptic Ulcer test)</option>
                  <option value="Metformin (Glucophage 1000mg)">Metformin (Renal eGFR & Lactic Acidosis test)</option>
                  <option value="Enalapril (Renitec 10mg)">Enalapril / ACEi (Dual RAAS Blockade test)</option>
                  <option value="Omeprazole (Risek 20mg)">Omeprazole / PPI (Clopidogrel CYP2C19 Interaction test)</option>
                  <option value="Propranolol (Inderal 20mg)">Propranolol / Non-selective Beta-blocker (Asthma test)</option>
                </select>

                <button
                  id="btn-add-simulated-drug"
                  onClick={handleAddSimulated}
                  className="px-3.5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add to Live Screen</span>
                </button>
              </div>

              {Array.isArray(extraSimulatedDrugs) && extraSimulatedDrugs.length > 0 && (
                <div className="flex items-center gap-2 flex-wrap pt-2">
                  <span className="text-[10px] font-bold uppercase text-slate-400">
                    Currently Simulated:
                  </span>
                  {extraSimulatedDrugs.map((sim, i) => (
                    <span
                      key={i}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-cyan-950 text-cyan-300 text-xs font-mono border border-cyan-800"
                    >
                      <span>{sim}</span>
                      <button
                        onClick={() => handleRemoveSimulated(sim)}
                        className="text-cyan-400 hover:text-rose-400 font-black cursor-pointer"
                        title="Remove simulated drug"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 4: API SPEC & EVIDENCE */}
          {activeTab === 'API_INFO' && (
            <div className="bg-slate-900/90 rounded-xl p-4 border border-slate-800 space-y-3 text-xs text-slate-300">
              <div className="flex items-center gap-2">
                <Database className="w-4 h-4 text-cyan-400" />
                <h5 className="font-bold text-white text-sm">External Clinical API Architecture</h5>
              </div>
              <p className="leading-relaxed text-slate-400">
                The Drug-Interaction Checker connects to the National Library of Medicine (NLM) RxNav Clinical Interaction API (rxnav.nlm.nih.gov) via high-performance RxCUI mapping, with automated local caching and deterministic fallback to the WHO HEARTS and KDIGO 2024 Clinical Practice Guidelines for Renal Impairment and Cardiovascular Risk Management.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 font-mono text-[11px]">
                <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                  <span className="text-slate-400 block text-[10px] uppercase">Service Endpoint:</span>
                  <span className="text-cyan-300">rxnav.nlm.nih.gov/REST/interaction</span>
                </div>
                <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                  <span className="text-slate-400 block text-[10px] uppercase">Drug Ontology:</span>
                  <span className="text-emerald-300">NIH RxNorm / UMLS Concept Codes</span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export const SafeMedicationInteractionChecker: React.FC<MedicationInteractionCheckerProps> = (props) => {
  return (
    <ErrorBoundary
      title="Medication Interaction Safety Module Recovered"
      description="The drug-interaction evaluation module encountered an issue while processing pharmacological data. Clinical prescribing remains available."
    >
      <MedicationInteractionChecker {...props} />
    </ErrorBoundary>
  );
};

