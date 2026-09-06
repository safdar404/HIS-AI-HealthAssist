import React, { useState } from 'react';
import {
  FlaskConical,
  AlertTriangle,
  CheckCircle2,
  AlertOctagon,
  TrendingUp,
  TrendingDown,
  Code,
  FileJson,
  RotateCcw,
  Sparkles,
  Search,
  Filter,
  ArrowUpRight,
  ArrowDownRight,
  Copy,
  Check,
  Eye,
  Sliders,
  Info,
} from 'lucide-react';
import { PatientAssessmentRecord } from '../types/clinical';

export type LabStatus = 'NORMAL' | 'HIGH' | 'LOW' | 'CRITICAL_HIGH' | 'CRITICAL_LOW';

export interface StructuredLabItem {
  key: string;
  name: string;
  category: 'CARDIAC' | 'LIPID' | 'RENAL_ELECTROLYTES' | 'GLYCEMIC' | 'HEMATOLOGY_INFLAMMATION';
  value: number;
  unit: string;
  refMin: number;
  refMax: number;
  criticalMin?: number;
  criticalMax?: number;
  status: LabStatus;
  interpretation: string;
  collectedAt: string;
  specimenType: string;
}

export interface LabPayloadJSON {
  specimenId: string;
  patientId: string;
  patientName: string;
  collectionTimestamp: string;
  laboratoryFacility: string;
  qualityAssuranceVerified: boolean;
  biomarkers: StructuredLabItem[];
}

interface LabResultsPanelProps {
  currentRecord: PatientAssessmentRecord;
  onUpdateLabs?: (updatedLabs: Record<string, number>) => void;
  onBackToDossier?: () => void;
}

export const LabResultsPanel: React.FC<LabResultsPanelProps> = ({
  currentRecord,
  onUpdateLabs,
  onBackToDossier,
}) => {
  const patientId = currentRecord.demographics.patientId;
  const storageKey = `cds_simulated_lab_json_${patientId}`;

  // Helper function to evaluate status from numerical bounds
  const evaluateStatus = (
    val: number,
    min: number,
    max: number,
    critMin?: number,
    critMax?: number
  ): LabStatus => {
    if (critMax !== undefined && val >= critMax) return 'CRITICAL_HIGH';
    if (critMin !== undefined && val <= critMin) return 'CRITICAL_LOW';
    if (val > max) return 'HIGH';
    if (val < min) return 'LOW';
    return 'NORMAL';
  };

  // Build baseline lab payload combining current record values with clinical reference models
  const buildDefaultLabPayload = (): LabPayloadJSON => {
    const rawLabs = currentRecord.labs || {};
    const sbp = currentRecord.vitals.systolicBp || 140;

    const items: StructuredLabItem[] = [
      // 1. CARDIAC BIOMARKERS
      {
        key: 'troponin_i',
        name: 'High-Sensitivity Troponin I (hs-cTnI)',
        category: 'CARDIAC',
        value: rawLabs.troponinPositive ? 0.082 : 0.012,
        unit: 'ng/mL',
        refMin: 0.0,
        refMax: 0.034,
        criticalMax: 0.05,
        status: evaluateStatus(rawLabs.troponinPositive ? 0.082 : 0.012, 0.0, 0.034, undefined, 0.05),
        interpretation: rawLabs.troponinPositive
          ? 'Myocardial injury confirmed. Urgent cardiology referral and serial biomarker tracking indicated.'
          : 'Normal physiological range. No acute myocardial necrosis detected.',
        collectedAt: new Date(Date.now() - 3600000).toISOString(),
        specimenType: 'Venous Plasma (Lithium Heparin)',
      },
      {
        key: 'ck_mb',
        name: 'Creatine Kinase-MB (CK-MB Mass)',
        category: 'CARDIAC',
        value: rawLabs.troponinPositive ? 8.4 : 2.1,
        unit: 'ng/mL',
        refMin: 0.0,
        refMax: 4.9,
        criticalMax: 7.0,
        status: evaluateStatus(rawLabs.troponinPositive ? 8.4 : 2.1, 0.0, 4.9, undefined, 7.0),
        interpretation: rawLabs.troponinPositive
          ? 'Elevated isoenzyme activity consistent with acute ischemic event.'
          : 'Within normal cardiac limits.',
        collectedAt: new Date(Date.now() - 3600000).toISOString(),
        specimenType: 'Venous Serum',
      },
      {
        key: 'nt_probnp',
        name: 'N-Terminal Pro-BNP (NT-proBNP)',
        category: 'CARDIAC',
        value: sbp > 160 ? 420 : 115,
        unit: 'pg/mL',
        refMin: 0,
        refMax: 300,
        criticalMax: 900,
        status: evaluateStatus(sbp > 160 ? 420 : 115, 0, 300, undefined, 900),
        interpretation: sbp > 160
          ? 'Moderate ventricular wall tension elevation secondary to systemic afterload pressure.'
          : 'Normal myocardial strain marker.',
        collectedAt: new Date(Date.now() - 3600000).toISOString(),
        specimenType: 'Venous Plasma',
      },

      // 2. LIPID PROFILE
      {
        key: 'total_cholesterol',
        name: 'Total Serum Cholesterol',
        category: 'LIPID',
        value: rawLabs.totalCholesterolMgDl || 228,
        unit: 'mg/dL',
        refMin: 125,
        refMax: 200,
        criticalMax: 280,
        status: evaluateStatus(rawLabs.totalCholesterolMgDl || 228, 125, 200, undefined, 280),
        interpretation: 'Atherogenic risk marker. Indication for high-intensity statin therapy.',
        collectedAt: new Date(Date.now() - 7200000).toISOString(),
        specimenType: 'Serum (Fasting 12 hr)',
      },
      {
        key: 'ldl_cholesterol',
        name: 'LDL-Cholesterol (Calculated)',
        category: 'LIPID',
        value: rawLabs.ldlCholesterolMgDl || 156,
        unit: 'mg/dL',
        refMin: 50,
        refMax: 100,
        criticalMax: 190,
        status: evaluateStatus(rawLabs.ldlCholesterolMgDl || 156, 50, 100, undefined, 190),
        interpretation: 'Significantly above optimal target (< 70 mg/dL for high CVD risk).',
        collectedAt: new Date(Date.now() - 7200000).toISOString(),
        specimenType: 'Serum (Fasting 12 hr)',
      },
      {
        key: 'hdl_cholesterol',
        name: 'HDL-Cholesterol (Cardioprotective)',
        category: 'LIPID',
        value: rawLabs.hdlCholesterolMgDl || 38,
        unit: 'mg/dL',
        refMin: 40,
        refMax: 65,
        criticalMin: 25,
        status: evaluateStatus(rawLabs.hdlCholesterolMgDl || 38, 40, 65, 25, undefined),
        interpretation: 'Suboptimal protective HDL level. Aerobic exercise & dietary modulation indicated.',
        collectedAt: new Date(Date.now() - 7200000).toISOString(),
        specimenType: 'Serum (Fasting 12 hr)',
      },
      {
        key: 'triglycerides',
        name: 'Serum Triglycerides',
        category: 'LIPID',
        value: rawLabs.triglyceridesMgDl || 215,
        unit: 'mg/dL',
        refMin: 50,
        refMax: 150,
        criticalMax: 500,
        status: evaluateStatus(rawLabs.triglyceridesMgDl || 215, 50, 150, undefined, 500),
        interpretation: 'Borderline high triglycerides associated with insulin resistance.',
        collectedAt: new Date(Date.now() - 7200000).toISOString(),
        specimenType: 'Serum (Fasting 12 hr)',
      },

      // 3. RENAL FUNCTION & ELECTROLYTES
      {
        key: 'serum_creatinine',
        name: 'Serum Creatinine',
        category: 'RENAL_ELECTROLYTES',
        value: rawLabs.creatinineMgDl || 1.35,
        unit: 'mg/dL',
        refMin: 0.6,
        refMax: 1.2,
        criticalMax: 3.0,
        status: evaluateStatus(rawLabs.creatinineMgDl || 1.35, 0.6, 1.2, undefined, 3.0),
        interpretation: 'Mild elevation suggestive of hypertensive nephrosclerosis or reduced clearance.',
        collectedAt: new Date(Date.now() - 5400000).toISOString(),
        specimenType: 'Venous Serum',
      },
      {
        key: 'egfr',
        name: 'Estimated GFR (CKD-EPI 2021)',
        category: 'RENAL_ELECTROLYTES',
        value: rawLabs.egfr || 56,
        unit: 'mL/min/1.73m²',
        refMin: 90,
        refMax: 140,
        criticalMin: 30,
        status: evaluateStatus(rawLabs.egfr || 56, 90, 140, 30, undefined),
        interpretation: 'Stage G3a Chronic Kidney Disease (Mild to Moderate Reduction). Adjust renal drug dosing.',
        collectedAt: new Date(Date.now() - 5400000).toISOString(),
        specimenType: 'Calculated Metric',
      },
      {
        key: 'serum_potassium',
        name: 'Serum Potassium (K⁺)',
        category: 'RENAL_ELECTROLYTES',
        value: 4.8,
        unit: 'mEq/L',
        refMin: 3.5,
        refMax: 5.1,
        criticalMin: 2.8,
        criticalMax: 6.2,
        status: evaluateStatus(4.8, 3.5, 5.1, 2.8, 6.2),
        interpretation: 'Normokalemic baseline. Safe for ACEi/ARB or MRA initiation with periodic monitoring.',
        collectedAt: new Date(Date.now() - 5400000).toISOString(),
        specimenType: 'Venous Plasma (Heparinized)',
      },
      {
        key: 'serum_sodium',
        name: 'Serum Sodium (Na⁺)',
        category: 'RENAL_ELECTROLYTES',
        value: 139,
        unit: 'mEq/L',
        refMin: 135,
        refMax: 145,
        criticalMin: 120,
        criticalMax: 158,
        status: evaluateStatus(139, 135, 145, 120, 158),
        interpretation: 'Eunatremic. Normal osmotic equilibrium.',
        collectedAt: new Date(Date.now() - 5400000).toISOString(),
        specimenType: 'Venous Plasma (Heparinized)',
      },

      // 4. GLYCEMIC & METABOLIC
      {
        key: 'fasting_glucose',
        name: 'Fasting Plasma Glucose (FPG)',
        category: 'GLYCEMIC',
        value: rawLabs.glucoseFastingMgDl || 148,
        unit: 'mg/dL',
        refMin: 70,
        refMax: 99,
        criticalMin: 50,
        criticalMax: 300,
        status: evaluateStatus(rawLabs.glucoseFastingMgDl || 148, 70, 99, 50, 300),
        interpretation: 'Impaired fasting glucose diagnostic for Type 2 Diabetes Mellitus.',
        collectedAt: new Date(Date.now() - 7200000).toISOString(),
        specimenType: 'Fluoride Oxalate Plasma',
      },
      {
        key: 'hba1c',
        name: 'Glycated Hemoglobin (HbA1c)',
        category: 'GLYCEMIC',
        value: rawLabs.hba1cPercent || 8.1,
        unit: '%',
        refMin: 4.0,
        refMax: 5.6,
        criticalMax: 10.5,
        status: evaluateStatus(rawLabs.hba1cPercent || 8.1, 4.0, 5.6, undefined, 10.5),
        interpretation: 'Suboptimal 3-month glycemic control (> 7.0%). Pharmacotherapy escalation warranted.',
        collectedAt: new Date(Date.now() - 7200000).toISOString(),
        specimenType: 'Whole Blood (EDTA)',
      },

      // 5. HEMATOLOGY & INFLAMMATION
      {
        key: 'hemoglobin',
        name: 'Hemoglobin (Hb)',
        category: 'HEMATOLOGY_INFLAMMATION',
        value: rawLabs.hemoglobinGDl || 13.6,
        unit: 'g/dL',
        refMin: 13.0,
        refMax: 17.5,
        criticalMin: 7.0,
        criticalMax: 20.0,
        status: evaluateStatus(rawLabs.hemoglobinGDl || 13.6, 13.0, 17.5, 7.0, 20.0),
        interpretation: 'Normal oxygen-carrying capacity. No active anemia detected.',
        collectedAt: new Date(Date.now() - 7200000).toISOString(),
        specimenType: 'Whole Blood (EDTA)',
      },
      {
        key: 'hs_crp',
        name: 'High-Sensitivity C-Reactive Protein (hs-CRP)',
        category: 'HEMATOLOGY_INFLAMMATION',
        value: 3.8,
        unit: 'mg/L',
        refMin: 0.0,
        refMax: 1.0,
        criticalMax: 10.0,
        status: evaluateStatus(3.8, 0.0, 1.0, undefined, 10.0),
        interpretation: 'High systemic vascular inflammation indicating elevated plaque rupture vulnerability.',
        collectedAt: new Date(Date.now() - 7200000).toISOString(),
        specimenType: 'Venous Serum',
      },
    ];

    return {
      specimenId: `LAB-SPEC-${patientId.replace(/[^0-9]/g, '') || '9984'}-${Date.now().toString().slice(-4)}`,
      patientId: currentRecord.demographics.patientId,
      patientName: currentRecord.demographics.fullName,
      collectionTimestamp: new Date().toISOString(),
      laboratoryFacility: 'Apex Central Clinical Pathology & Reference Laboratory, Lahore',
      qualityAssuranceVerified: true,
      biomarkers: items,
    };
  };

  const [labPayload, setLabPayload] = useState<LabPayloadJSON>(() => {
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error(e);
      }
    }
    return buildDefaultLabPayload();
  });

  const [filterCategory, setFilterCategory] = useState<string>('ALL');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showJsonModal, setShowJsonModal] = useState<boolean>(false);
  const [jsonText, setJsonText] = useState<string>('');
  const [jsonError, setJsonError] = useState<string | null>(null);
  const [copyToast, setCopyToast] = useState<boolean>(false);

  // Status Badge Styling Helper
  const renderStatusBadge = (status: LabStatus) => {
    switch (status) {
      case 'CRITICAL_HIGH':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-red-600 text-white shadow-xs animate-pulse">
            <AlertOctagon className="w-3 h-3" />
            CRITICAL HIGH
          </span>
        );
      case 'CRITICAL_LOW':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-purple-600 text-white shadow-xs animate-pulse">
            <AlertOctagon className="w-3 h-3" />
            CRITICAL LOW
          </span>
        );
      case 'HIGH':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300">
            <ArrowUpRight className="w-3 h-3 text-amber-700 stroke-[2.5]" />
            HIGH
          </span>
        );
      case 'LOW':
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-cyan-100 text-cyan-800 border border-cyan-300">
            <ArrowDownRight className="w-3 h-3 text-cyan-700 stroke-[2.5]" />
            LOW
          </span>
        );
      case 'NORMAL':
      default:
        return (
          <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
            <Check className="w-3 h-3 text-emerald-600 stroke-[3]" />
            NORMAL
          </span>
        );
    }
  };

  // Open Raw JSON Editor
  const handleOpenJsonEditor = () => {
    setJsonText(JSON.stringify(labPayload, null, 2));
    setJsonError(null);
    setShowJsonModal(true);
  };

  // Save parsed JSON
  const handleSaveJson = () => {
    try {
      const parsed = JSON.parse(jsonText);
      if (!parsed.biomarkers || !Array.isArray(parsed.biomarkers)) {
        throw new Error('Invalid JSON structure: Must contain a "biomarkers" array.');
      }
      setLabPayload(parsed);
      localStorage.setItem(storageKey, JSON.stringify(parsed));
      setShowJsonModal(false);
      setJsonError(null);
    } catch (e: any) {
      setJsonError(e.message || 'Malformed JSON syntax.');
    }
  };

  // Load Presets
  const handleLoadPreset = (presetType: 'ACS_EMERGENCY' | 'DIABETIC_NEPHROPATHY' | 'NORMAL_BASELINE') => {
    let newPayload = buildDefaultLabPayload();

    if (presetType === 'ACS_EMERGENCY') {
      newPayload.biomarkers = newPayload.biomarkers.map((item) => {
        if (item.key === 'troponin_i') {
          return {
            ...item,
            value: 0.145,
            status: 'CRITICAL_HIGH',
            interpretation: 'Severe cardiac troponin surge (> 4x ULN) indicative of Acute Myocardial Infarction.',
          };
        }
        if (item.key === 'ck_mb') {
          return {
            ...item,
            value: 12.8,
            status: 'CRITICAL_HIGH',
            interpretation: 'Marked CK-MB release confirming acute myocardial necrosis.',
          };
        }
        if (item.key === 'hs_crp') {
          return {
            ...item,
            value: 8.4,
            status: 'HIGH',
            interpretation: 'Acute-phase inflammatory response.',
          };
        }
        return item;
      });
    } else if (presetType === 'DIABETIC_NEPHROPATHY') {
      newPayload.biomarkers = newPayload.biomarkers.map((item) => {
        if (item.key === 'fasting_glucose') {
          return {
            ...item,
            value: 235,
            status: 'CRITICAL_HIGH',
            interpretation: 'Severe fasting hyperglycemia.',
          };
        }
        if (item.key === 'hba1c') {
          return {
            ...item,
            value: 10.2,
            status: 'CRITICAL_HIGH',
            interpretation: 'Poor glycemic control with microvascular risk.',
          };
        }
        if (item.key === 'serum_creatinine') {
          return {
            ...item,
            value: 2.1,
            status: 'CRITICAL_HIGH',
            interpretation: 'Advanced renal impairment.',
          };
        }
        if (item.key === 'egfr') {
          return {
            ...item,
            value: 28,
            status: 'CRITICAL_LOW',
            interpretation: 'Stage G4 CKD (Severe reduction). Nephrology consult required.',
          };
        }
        return item;
      });
    } else {
      // Normal Baseline
      newPayload.biomarkers = newPayload.biomarkers.map((item) => ({
        ...item,
        value: (item.refMin + item.refMax) / 2,
        status: 'NORMAL',
        interpretation: 'Within target physiological range.',
      }));
    }

    setLabPayload(newPayload);
    localStorage.setItem(storageKey, JSON.stringify(newPayload));
    setJsonText(JSON.stringify(newPayload, null, 2));
  };

  const handleCopyLabSummary = () => {
    const abnormal = labPayload.biomarkers.filter((b) => b.status !== 'NORMAL');
    const summary = `[CLINICAL LAB RESULTS PANEL SUMMARY]\n` +
      `Patient: ${labPayload.patientName} (${labPayload.patientId})\n` +
      `Specimen: ${labPayload.specimenId} • Collected: ${new Date(labPayload.collectionTimestamp).toLocaleString()}\n` +
      `Laboratory: ${labPayload.laboratoryFacility}\n\n` +
      `--- ABNORMAL FINDINGS (${abnormal.length}) ---\n` +
      abnormal.map((b, i) => `${i + 1}. [${b.status}] ${b.name}: ${b.value} ${b.unit} (Ref: ${b.refMin}-${b.refMax} ${b.unit}) → ${b.interpretation}`).join('\n') +
      `\n\n--- ALL BIOMARKERS (${labPayload.biomarkers.length}) ---\n` +
      labPayload.biomarkers.map((b) => `• ${b.name}: ${b.value} ${b.unit} [${b.status}]`).join('\n');

    navigator.clipboard.writeText(summary);
    setCopyToast(true);
    setTimeout(() => setCopyToast(false), 3000);
  };

  // Filtered Biomarkers List
  const filteredBiomarkers = labPayload.biomarkers.filter((b) => {
    if (filterCategory !== 'ALL' && b.category !== filterCategory) return false;
    if (filterStatus === 'ABNORMAL_ONLY' && b.status === 'NORMAL') return false;
    if (filterStatus === 'CRITICAL_ONLY' && b.status !== 'CRITICAL_HIGH' && b.status !== 'CRITICAL_LOW') return false;
    if (filterStatus !== 'ALL' && filterStatus !== 'ABNORMAL_ONLY' && filterStatus !== 'CRITICAL_ONLY' && b.status !== filterStatus) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return b.name.toLowerCase().includes(q) || b.interpretation.toLowerCase().includes(q) || b.key.includes(q);
    }
    return true;
  });

  const criticalCount = labPayload.biomarkers.filter((b) => b.status === 'CRITICAL_HIGH' || b.status === 'CRITICAL_LOW').length;
  const abnormalCount = labPayload.biomarkers.filter((b) => b.status !== 'NORMAL').length;
  const normalCount = labPayload.biomarkers.filter((b) => b.status === 'NORMAL').length;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-6 space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
        <div className="flex items-center gap-2.5">
          <span className="p-2 bg-amber-50 text-amber-700 rounded-xl">
            <FlaskConical className="w-5 h-5" />
          </span>
          <div>
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              Diagnostic Laboratory Results Panel
              <span className="text-xs font-mono font-normal px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                Specimen: {labPayload.specimenId}
              </span>
            </h2>
            <p className="text-xs text-slate-500">
              Automated JSON parser & abnormal biomarker flagging for clinical decision support.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            id="btn-copy-lab-summary"
            onClick={handleCopyLabSummary}
            className="px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Copy structured lab summary"
          >
            {copyToast ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-slate-500" />}
            <span>{copyToast ? 'Copied Labs!' : 'Copy Summary'}</span>
          </button>

          <button
            type="button"
            id="btn-open-lab-json-editor"
            onClick={handleOpenJsonEditor}
            className="px-3 py-1.5 rounded-xl border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-900 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Inspect or edit raw simulated lab JSON"
          >
            <FileJson className="w-3.5 h-3.5 text-amber-700" />
            <span>View / Edit JSON</span>
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

      {/* Abnormal Findings Alert Banner */}
      {abnormalCount > 0 ? (
        <div
          className={`p-4 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
            criticalCount > 0
              ? 'bg-rose-50 border-rose-300 text-rose-950'
              : 'bg-amber-50 border-amber-300 text-amber-950'
          }`}
        >
          <div className="flex items-start gap-3">
            <div className={`p-2 rounded-xl mt-0.5 ${criticalCount > 0 ? 'bg-red-600 text-white' : 'bg-amber-500 text-white'}`}>
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-black text-sm">
                  {abnormalCount} Abnormal Finding{abnormalCount > 1 ? 's' : ''} Identified
                </span>
                {criticalCount > 0 && (
                  <span className="bg-red-700 text-white text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase animate-pulse">
                    {criticalCount} Critical Alert{criticalCount > 1 ? 's' : ''}
                  </span>
                )}
              </div>
              <p className="text-xs mt-0.5 opacity-90">
                Biomarkers outside target physiological reference intervals require clinical correlation and potential therapy titration.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-center">
            <button
              type="button"
              onClick={() => setFilterStatus('ABNORMAL_ONLY')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                filterStatus === 'ABNORMAL_ONLY'
                  ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                  : 'bg-white text-slate-800 border-slate-300 hover:bg-slate-100'
              }`}
            >
              Filter Abnormal Only
            </button>
          </div>
        </div>
      ) : (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-950 flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
          <div className="text-xs">
            <strong className="font-bold">All Diagnostic Biomarkers Within Normal Range.</strong> No acute biochemical derangements detected.
          </div>
        </div>
      )}

      {/* Metrics Summary Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl">
          <span className="text-[10px] font-bold uppercase text-slate-500 block">Total Biomarkers</span>
          <span className="text-lg font-black text-slate-900">{labPayload.biomarkers.length} Tests</span>
        </div>

        <div className="bg-emerald-50/80 border border-emerald-200 p-3 rounded-xl flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase text-emerald-800 block">Normal Results</span>
            <span className="text-lg font-black text-emerald-950">{normalCount} Tests</span>
          </div>
          <Check className="w-5 h-5 text-emerald-600 stroke-[3]" />
        </div>

        <div className="bg-amber-50/80 border border-amber-200 p-3 rounded-xl flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase text-amber-800 block">Elevated / Low</span>
            <span className="text-lg font-black text-amber-950">{abnormalCount - criticalCount} Tests</span>
          </div>
          <TrendingUp className="w-5 h-5 text-amber-600" />
        </div>

        <div className="bg-rose-50/80 border border-rose-200 p-3 rounded-xl flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase text-rose-800 block">Critical Alerts</span>
            <span className="text-lg font-black text-rose-950">{criticalCount} Critical</span>
          </div>
          <AlertOctagon className="w-5 h-5 text-rose-600" />
        </div>
      </div>

      {/* Search & Filter Toolbar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs">
        <div className="flex items-center gap-2 w-full sm:w-auto flex-1 max-w-sm">
          <Search className="w-4 h-4 text-slate-400 shrink-0" />
          <input
            type="text"
            placeholder="Search biomarker, interpretation, or code..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap justify-end">
          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 font-semibold text-[11px]">Finding:</span>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="bg-white border border-slate-300 rounded-lg px-2 py-1 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              <option value="ALL">All Results</option>
              <option value="ABNORMAL_ONLY">Abnormal Only (⚠️)</option>
              <option value="CRITICAL_ONLY">Critical Only (🚨)</option>
              <option value="NORMAL">Normal Only (✓)</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-slate-500 font-semibold text-[11px]">Panel:</span>
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="bg-white border border-slate-300 rounded-lg px-2 py-1 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              <option value="ALL">All Panels</option>
              <option value="CARDIAC">Cardiac Biomarkers</option>
              <option value="LIPID">Lipid Profile</option>
              <option value="RENAL_ELECTROLYTES">Renal & Electrolytes</option>
              <option value="GLYCEMIC">Glycemic & Metabolic</option>
              <option value="HEMATOLOGY_INFLAMMATION">Hematology & Inflammation</option>
            </select>
          </div>
        </div>
      </div>

      {/* Structured Lab Results Grid */}
      <div className="space-y-3">
        {filteredBiomarkers.length === 0 ? (
          <div className="text-center py-12 text-slate-500 text-xs">
            No lab biomarkers match your filter criteria.
          </div>
        ) : (
          filteredBiomarkers.map((item) => {
            const isAbnormal = item.status !== 'NORMAL';
            const isCritical = item.status === 'CRITICAL_HIGH' || item.status === 'CRITICAL_LOW';

            // Calculate percentage position for gauge bar
            const rangeSpan = (item.refMax * 1.5) - (item.refMin * 0.5) || 100;
            const minBound = item.refMin * 0.5;
            const percentVal = Math.min(Math.max(((item.value - minBound) / rangeSpan) * 100, 5), 95);
            const refMinPercent = Math.min(Math.max(((item.refMin - minBound) / rangeSpan) * 100, 10), 40);
            const refMaxPercent = Math.min(Math.max(((item.refMax - minBound) / rangeSpan) * 100, 60), 90);

            return (
              <div
                key={item.key}
                className={`p-4 rounded-2xl border transition-all ${
                  isCritical
                    ? 'bg-rose-50/50 border-rose-300 shadow-xs'
                    : isAbnormal
                    ? 'bg-amber-50/40 border-amber-200'
                    : 'bg-white border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                  {/* Left Column: Name, Category, Interpretation */}
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h4 className="text-sm font-bold text-slate-900">{item.name}</h4>
                      {renderStatusBadge(item.status)}
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                        {item.category.replace('_', ' ')}
                      </span>
                    </div>

                    <p className="text-xs text-slate-700 font-medium">
                      <span className="text-slate-500 font-normal">Clinical Interpretation:</span>{' '}
                      {item.interpretation}
                    </p>

                    <div className="text-[10px] text-slate-400 font-mono flex items-center gap-2">
                      <span>Specimen: {item.specimenType}</span>
                      <span>•</span>
                      <span>Analyzed: {new Date(item.collectedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  </div>

                  {/* Middle & Right Column: Value, Range & Visual Gauge */}
                  <div className="flex flex-col sm:flex-row sm:items-center gap-4 lg:w-[380px] shrink-0">
                    <div className="text-left sm:text-right shrink-0">
                      <div className="text-lg font-black font-mono tracking-tight text-slate-950">
                        {item.value}{' '}
                        <span className="text-xs font-normal text-slate-500">{item.unit}</span>
                      </div>
                      <div className="text-[10px] text-slate-500 font-mono">
                        Ref: {item.refMin} - {item.refMax} {item.unit}
                      </div>
                    </div>

                    {/* Range Gauge Bar */}
                    <div className="flex-1 space-y-1">
                      <div className="relative h-2 bg-slate-200 rounded-full overflow-hidden">
                        {/* Normal Zone */}
                        <div
                          className="absolute top-0 bottom-0 bg-emerald-200"
                          style={{
                            left: `${refMinPercent}%`,
                            width: `${refMaxPercent - refMinPercent}%`,
                          }}
                        />
                        {/* Marker Dot */}
                        <div
                          className={`absolute top-0 bottom-0 w-2.5 rounded-full -ml-1 ${
                            isCritical
                              ? 'bg-red-600 ring-2 ring-red-300'
                              : isAbnormal
                              ? 'bg-amber-600 ring-2 ring-amber-300'
                              : 'bg-emerald-600'
                          }`}
                          style={{ left: `${percentVal}%` }}
                        />
                      </div>

                      <div className="flex items-center justify-between text-[9px] text-slate-400 font-mono">
                        <span>Low</span>
                        <span className="text-emerald-700 font-semibold">Normal Range</span>
                        <span>High</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* JSON Viewer & Editor Modal */}
      {showJsonModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="bg-slate-900 text-white px-5 py-3.5 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <FileJson className="w-4 h-4 text-amber-400" />
                <h3 className="text-sm font-bold">Simulated Lab Results JSON Object</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowJsonModal(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between gap-2 flex-wrap text-xs shrink-0">
              <span className="text-slate-600 font-semibold">Load Simulation Scenario:</span>
              <div className="flex items-center gap-1.5 flex-wrap">
                <button
                  type="button"
                  onClick={() => handleLoadPreset('ACS_EMERGENCY')}
                  className="px-2.5 py-1 rounded-lg bg-red-100 hover:bg-red-200 text-red-800 text-[11px] font-bold transition-colors cursor-pointer"
                >
                  Acute STEMI / ACS
                </button>
                <button
                  type="button"
                  onClick={() => handleLoadPreset('DIABETIC_NEPHROPATHY')}
                  className="px-2.5 py-1 rounded-lg bg-amber-100 hover:bg-amber-200 text-amber-800 text-[11px] font-bold transition-colors cursor-pointer"
                >
                  DKA / Renal Impairment
                </button>
                <button
                  type="button"
                  onClick={() => handleLoadPreset('NORMAL_BASELINE')}
                  className="px-2.5 py-1 rounded-lg bg-emerald-100 hover:bg-emerald-200 text-emerald-800 text-[11px] font-bold transition-colors cursor-pointer"
                >
                  Normal Controlled
                </button>
              </div>
            </div>

            <div className="flex-1 p-4 overflow-y-auto space-y-2">
              <label className="block text-xs font-bold text-slate-700">
                Raw JSON Payload (Structured Lab Schema):
              </label>
              <textarea
                value={jsonText}
                onChange={(e) => setJsonText(e.target.value)}
                rows={16}
                className="w-full font-mono text-xs p-3 bg-slate-950 text-emerald-400 rounded-xl border border-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
              />

              {jsonError && (
                <div className="p-2.5 rounded-lg bg-red-50 border border-red-200 text-xs text-red-800 font-medium">
                  <strong>JSON Syntax Error:</strong> {jsonError}
                </div>
              )}
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-2 shrink-0">
              <button
                type="button"
                onClick={() => {
                  const def = buildDefaultLabPayload();
                  setLabPayload(def);
                  setJsonText(JSON.stringify(def, null, 2));
                  localStorage.removeItem(storageKey);
                }}
                className="text-xs text-slate-500 hover:text-slate-800 flex items-center gap-1 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset to Patient Baseline</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowJsonModal(false)}
                  className="px-3.5 py-1.5 border border-slate-300 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveJson}
                  className="px-4 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl shadow-sm cursor-pointer"
                >
                  Parse & Apply Lab JSON
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
