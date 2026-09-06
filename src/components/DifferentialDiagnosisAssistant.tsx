import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Stethoscope,
  Check,
  AlertCircle,
  Search,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Plus,
  FileCheck,
  Zap,
  Info,
  Layers,
  ArrowRight,
  HelpCircle,
} from 'lucide-react';
import { PatientAssessmentRecord } from '../types/clinical';

export interface DifferentialDiagnosisItem {
  icd10Code: string;
  diagnosisName: string;
  likelihood: 'HIGH' | 'MODERATE' | 'RULE_OUT';
  probability: number; // 0-100
  clinicalRationale: string;
  supportingEvidence: string[];
  conflictingFactors: string[];
  suggestedWorkup: string[];
  whoGuidelineMapping: string;
}

interface DifferentialDiagnosisAssistantProps {
  currentRecord: PatientAssessmentRecord;
  onAdoptDiagnosis: (
    icd10Code: string,
    diagnosisName: string,
    rationale: string,
    suggestedWorkup: string[]
  ) => void;
  onOrderWorkup?: (workupList: string[]) => void;
}

export const COMMON_ICD10_CATALOG = [
  { code: 'I10', name: 'Essential (Primary) Hypertension, Stage 1/2', category: 'Cardiovascular' },
  { code: 'I16.0', name: 'Hypertensive Urgency without Acute Target Organ Damage', category: 'Cardiovascular' },
  { code: 'I16.1', name: 'Hypertensive Emergency with Acute Target Organ Damage', category: 'Cardiovascular' },
  { code: 'I20.9', name: 'Angina Pectoris, Unspecified (Ischemic Heart Disease)', category: 'Cardiovascular' },
  { code: 'I21.4', name: 'Non-ST Elevation Myocardial Infarction (NSTEMI)', category: 'Cardiovascular' },
  { code: 'I50.9', name: 'Heart Failure, Unspecified (Congestive/HFpEF/HFrEF)', category: 'Cardiovascular' },
  { code: 'I63.9', name: 'Cerebral Infarction (Acute Ischemic Stroke), Unspecified', category: 'Neurological' },
  { code: 'E11.9', name: 'Type 2 Diabetes Mellitus without Acute Complications', category: 'Endocrine/Metabolic' },
  { code: 'E11.69', name: 'Type 2 Diabetes Mellitus with Other Specified Complications', category: 'Endocrine/Metabolic' },
  { code: 'E78.5', name: 'Hyperlipidemia / Mixed Atherogenic Dyslipidemia', category: 'Endocrine/Metabolic' },
  { code: 'N18.3', name: 'Chronic Kidney Disease, Stage 3 (Moderate)', category: 'Renal' },
  { code: 'J45.901', name: 'Unspecified Asthma with Acute Exacerbation', category: 'Respiratory' },
  { code: 'J44.1', name: 'Chronic Obstructive Pulmonary Disease (COPD) with Acute Exacerbation', category: 'Respiratory' },
  { code: 'R07.9', name: 'Chest Pain, Unspecified (Non-Cardiac vs Musculoskeletal vs Anginal)', category: 'Symptom' },
  { code: 'R06.02', name: 'Shortness of Breath / Dyspnea on Exertion', category: 'Symptom' },
  { code: 'R42', name: 'Dizziness and Giddiness / Postural Instability', category: 'Symptom' },
];

export const DifferentialDiagnosisAssistant: React.FC<DifferentialDiagnosisAssistantProps> = ({
  currentRecord,
  onAdoptDiagnosis,
  onOrderWorkup,
}) => {
  const [differentials, setDifferentials] = useState<DifferentialDiagnosisItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [sourceType, setSourceType] = useState<string>('INIT');
  const [expandedCodes, setExpandedCodes] = useState<Record<string, boolean>>({});
  const [adoptedCode, setAdoptedCode] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showIcdCatalog, setShowIcdCatalog] = useState<boolean>(false);
  const [workupAddedCode, setWorkupAddedCode] = useState<string | null>(null);

  // Fetch or generate Differential Diagnoses
  const fetchDifferentialDiagnoses = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/gemini/differential-diagnosis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ patientCase: currentRecord }),
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.differentials) && data.differentials.length > 0) {
        const sanitized: DifferentialDiagnosisItem[] = data.differentials.map((item: any) => ({
          icd10Code: String(item.icd10Code || 'R69'),
          diagnosisName: String(item.diagnosisName || 'Clinical Evaluation'),
          likelihood:
            item.likelihood === 'HIGH' || item.likelihood === 'RULE_OUT'
              ? item.likelihood
              : 'MODERATE',
          probability: typeof item.probability === 'number' ? item.probability : 70,
          clinicalRationale: String(item.clinicalRationale || ''),
          supportingEvidence: Array.isArray(item.supportingEvidence)
            ? item.supportingEvidence
            : (item.supportingEvidence ? [String(item.supportingEvidence)] : []),
          conflictingFactors: Array.isArray(item.conflictingFactors)
            ? item.conflictingFactors
            : (item.conflictingFactors ? [String(item.conflictingFactors)] : []),
          suggestedWorkup: Array.isArray(item.suggestedWorkup)
            ? item.suggestedWorkup
            : (item.suggestedWorkup ? [String(item.suggestedWorkup)] : []),
          whoGuidelineMapping: String(item.whoGuidelineMapping || ''),
        }));
        setDifferentials(sanitized);
        setSourceType(data.source || 'AI_ENGINE');
        // Expand first item by default
        if (sanitized[0]) {
          setExpandedCodes({ [sanitized[0].icd10Code]: true });
        }
      }
    } catch (err) {
      console.warn('Failed to fetch AI differentials, using local fallback:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDifferentialDiagnoses();
  }, [currentRecord.demographics.patientId, currentRecord.vitals.measurementTime]);

  const toggleExpand = (code: string) => {
    setExpandedCodes((prev) => ({ ...prev, [code]: !prev[code] }));
  };

  const handleAdopt = (item: DifferentialDiagnosisItem) => {
    onAdoptDiagnosis(
      item.icd10Code,
      item.diagnosisName,
      item.clinicalRationale,
      item.suggestedWorkup || []
    );
    setAdoptedCode(item.icd10Code);
    setTimeout(() => setAdoptedCode(null), 3000);
  };

  const handleAddWorkup = (item: DifferentialDiagnosisItem) => {
    const workup = item.suggestedWorkup || [];
    if (onOrderWorkup && workup.length > 0) {
      onOrderWorkup(workup);
      setWorkupAddedCode(item.icd10Code);
      setTimeout(() => setWorkupAddedCode(null), 2500);
    }
  };

  const filteredCatalog = COMMON_ICD10_CATALOG.filter(
    (c) =>
      c.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div
      id="differential-diagnosis-assistant-card"
      className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-5 space-y-4"
    >
      {/* Header Bar */}
      <div className="flex items-center justify-between flex-wrap gap-2 pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-violet-600 text-white flex items-center justify-center shadow-xs">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-bold text-slate-900 tracking-wide uppercase">
                AI Differential Diagnosis & ICD-10 Coder
              </h3>
              <span className="bg-violet-50 text-violet-700 text-[10px] font-bold px-2 py-0.5 rounded-full border border-violet-200 flex items-center gap-1">
                <Zap className="w-2.5 h-2.5 text-violet-600" />
                <span>{sourceType.includes('GEMINI') ? 'Gemini 3.7 Flash' : 'WHO HEARTS Protocol'}</span>
              </span>
            </div>
            <p className="text-[11px] text-slate-500">
              Evaluates symptom clusters, hemodynamics, and laboratory biomarkers to prioritize ICD-10 diagnostic classifications.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            id="btn-toggle-icd-directory"
            type="button"
            onClick={() => setShowIcdCatalog((prev) => !prev)}
            className={`px-2.5 py-1.5 rounded-xl border text-[11px] font-bold transition-all flex items-center gap-1 cursor-pointer shadow-2xs ${
              showIcdCatalog
                ? 'bg-slate-800 text-white border-slate-700'
                : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
            }`}
            title="Browse or Search ICD-10 Clinical Nomenclature Directory"
          >
            <Search className="w-3 h-3" />
            <span>{showIcdCatalog ? 'Hide ICD-10 Directory' : 'ICD-10 Quick Finder'}</span>
          </button>

          <button
            id="btn-refresh-differential-ai"
            type="button"
            onClick={fetchDifferentialDiagnoses}
            disabled={isLoading}
            className="px-2.5 py-1.5 rounded-xl bg-violet-50 hover:bg-violet-100 text-violet-800 border border-violet-200 text-[11px] font-bold transition-all flex items-center gap-1 cursor-pointer disabled:opacity-50"
            title="Re-analyze case with fresh clinical parameters"
          >
            <RefreshCw className={`w-3 h-3 ${isLoading ? 'animate-spin' : ''}`} />
            <span>{isLoading ? 'Analyzing...' : 'Re-evaluate'}</span>
          </button>
        </div>
      </div>

      {/* ICD-10 Quick Search & Directory Drawer */}
      {showIcdCatalog && (
        <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200 space-y-2.5 animate-fadeIn">
          <div className="flex items-center justify-between gap-2">
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search ICD-10 codes or disease name (e.g. I10, Angina, Diabetes)..."
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-1 focus:ring-violet-500 font-mono"
              />
            </div>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="text-[11px] text-slate-500 hover:text-slate-700 underline cursor-pointer"
              >
                Clear
              </button>
            )}
          </div>

          <div className="max-h-48 overflow-y-auto space-y-1.5 pr-1">
            {filteredCatalog.map((cat) => (
              <div
                key={cat.code}
                className="bg-white rounded-lg p-2 border border-slate-200 flex items-center justify-between hover:border-violet-300 transition-colors text-xs"
              >
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-violet-700 bg-violet-50 px-1.5 py-0.5 rounded text-[11px] border border-violet-100">
                    {cat.code}
                  </span>
                  <span className="text-slate-800 font-medium">{cat.name}</span>
                  <span className="text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.2 rounded">
                    {cat.category}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    onAdoptDiagnosis(
                      cat.code,
                      cat.name,
                      `Clinician adopted ICD-10 code ${cat.code} (${cat.name}) from clinical reference directory.`,
                      []
                    );
                    setAdoptedCode(cat.code);
                    setTimeout(() => setAdoptedCode(null), 2500);
                  }}
                  className="px-2 py-1 rounded bg-violet-600 hover:bg-violet-700 text-white font-bold text-[10px] transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-2.5 h-2.5" />
                  <span>Adopt</span>
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Differential Diagnoses List */}
      {isLoading ? (
        <div className="py-8 flex flex-col items-center justify-center space-y-2 text-slate-400">
          <RefreshCw className="w-6 h-6 animate-spin text-violet-600" />
          <span className="text-xs font-semibold text-slate-600">
            Synthesizing clinical signals & ranking differential possibilities...
          </span>
        </div>
      ) : differentials.length === 0 ? (
        <div className="py-6 text-center text-xs text-slate-500 bg-slate-50 rounded-xl border border-dashed border-slate-200">
          No differential diagnoses generated. Click &quot;Re-evaluate&quot; to run clinical synthesis.
        </div>
      ) : (
        <div className="space-y-2.5">
          {differentials.map((item, idx) => {
            const isExpanded = !!expandedCodes[item.icd10Code];
            const isAdopted = adoptedCode === item.icd10Code;
            const likelihoodBadge =
              item.likelihood === 'HIGH'
                ? 'bg-rose-50 text-rose-700 border-rose-200 font-bold'
                : item.likelihood === 'MODERATE'
                ? 'bg-amber-50 text-amber-700 border-amber-200 font-bold'
                : 'bg-slate-100 text-slate-600 border-slate-200 font-semibold';

            return (
              <div
                key={item.icd10Code + idx}
                className={`rounded-xl border transition-all ${
                  isAdopted
                    ? 'border-emerald-500 bg-emerald-50/40 shadow-xs'
                    : isExpanded
                    ? 'border-violet-200 bg-violet-50/20 shadow-2xs'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                {/* Summary Header Row */}
                <div
                  onClick={() => toggleExpand(item.icd10Code)}
                  className="p-3 sm:p-3.5 flex items-center justify-between cursor-pointer gap-2 select-none"
                >
                  <div className="flex items-center gap-2.5 flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-600 font-mono text-[11px] font-bold flex items-center justify-center">
                        {idx + 1}
                      </span>
                      <span className="font-mono text-xs font-black text-violet-800 bg-violet-100/70 px-2 py-0.5 rounded border border-violet-200">
                        {item.icd10Code}
                      </span>
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-bold text-slate-900 truncate">
                          {item.diagnosisName}
                        </span>
                        <span className={`text-[10px] px-2 py-0.2 rounded-full border ${likelihoodBadge}`}>
                          {item.likelihood} LIKELIHOOD ({item.probability}%)
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions on row */}
                  <div
                    className="flex items-center gap-2 shrink-0"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      type="button"
                      id={`btn-adopt-diagnosis-${item.icd10Code}`}
                      onClick={() => handleAdopt(item)}
                      className={`px-3 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer shadow-2xs ${
                        isAdopted
                          ? 'bg-emerald-600 text-white'
                          : 'bg-violet-600 hover:bg-violet-700 text-white'
                      }`}
                      title="Adopt ICD-10 code and append clinical rationale into Doctor Review"
                    >
                      {isAdopted ? (
                        <>
                          <Check className="w-3 h-3" />
                          <span>Adopted</span>
                        </>
                      ) : (
                        <>
                          <Plus className="w-3 h-3" />
                          <span>1-Click Adopt</span>
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      onClick={() => toggleExpand(item.icd10Code)}
                      className="p-1 text-slate-400 hover:text-slate-600 rounded-md hover:bg-slate-100"
                    >
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Expanded Details Breakdown */}
                {isExpanded && (
                  <div className="px-3.5 pb-3.5 pt-1 border-t border-slate-100 space-y-3 text-xs animate-fadeIn">
                    {/* Clinical Rationale */}
                    <div className="bg-slate-50 p-2.5 rounded-lg border border-slate-200/80">
                      <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1">
                        <Info className="w-3 h-3 text-violet-600" />
                        <span>Clinical Rationale & Evidence Basis</span>
                      </div>
                      <p className="text-slate-700 leading-relaxed font-medium">
                        {item.clinicalRationale}
                      </p>
                    </div>

                    {/* Supporting vs Conflicting Factors */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      <div className="bg-emerald-50/50 p-2.5 rounded-lg border border-emerald-100">
                        <div className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider mb-1">
                          ✓ Supporting Criteria
                        </div>
                        <ul className="list-disc list-inside space-y-0.5 text-slate-700 text-[11px]">
                          {(item.supportingEvidence || []).map((ev, eIdx) => (
                            <li key={eIdx}>{ev}</li>
                          ))}
                        </ul>
                      </div>

                      <div className="bg-amber-50/50 p-2.5 rounded-lg border border-amber-100">
                        <div className="text-[10px] font-bold text-amber-800 uppercase tracking-wider mb-1">
                          ⚡ Rule-Out / Conflicting Elements
                        </div>
                        <ul className="list-disc list-inside space-y-0.5 text-slate-700 text-[11px]">
                          {(item.conflictingFactors || []).map((cf, cIdx) => (
                            <li key={cIdx}>{cf}</li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    {/* Recommended Workup & WHO Guideline Mapping */}
                    <div className="bg-white p-2.5 rounded-lg border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="space-y-1">
                        <div className="text-[10px] font-bold text-violet-700 uppercase tracking-wider flex items-center gap-1">
                          <Layers className="w-3 h-3" />
                          <span>Suggested Diagnostic Workup:</span>
                        </div>
                        <div className="flex flex-wrap gap-1">
                          {(item.suggestedWorkup || []).map((wk, wIdx) => (
                            <span
                              key={wIdx}
                              className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-[10px] font-mono border border-slate-200"
                            >
                              {wk}
                            </span>
                          ))}
                        </div>
                      </div>

                      {onOrderWorkup && item.suggestedWorkup && item.suggestedWorkup.length > 0 && (
                        <button
                          type="button"
                          onClick={() => handleAddWorkup(item)}
                          className="px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-[11px] border border-slate-300 transition-colors flex items-center gap-1 shrink-0 cursor-pointer"
                        >
                          <FileCheck className="w-3 h-3 text-violet-600" />
                          <span>{workupAddedCode === item.icd10Code ? '✓ Labs Queued' : 'Add to Orders'}</span>
                        </button>
                      )}
                    </div>

                    {/* Guideline pathway */}
                    {item.whoGuidelineMapping && (
                      <div className="text-[11px] text-slate-500 flex items-center gap-1.5 pt-0.5">
                        <span className="font-bold text-slate-700">Guideline Alignment:</span>
                        <span className="italic">{item.whoGuidelineMapping}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
