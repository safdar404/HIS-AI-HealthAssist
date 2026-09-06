import React, { useState } from 'react';
import {
  FlaskConical,
  AlertTriangle,
  Plus,
  Filter,
  CheckCircle2,
  AlertOctagon,
  Calendar,
  Sparkles,
  Search,
  X,
  FileCheck,
  TrendingUp,
  Activity,
  Heart,
  Droplets,
  Zap,
} from 'lucide-react';
import { PatientAssessmentRecord } from '../types/clinical';
import { CopyPatientIdButton } from './CopyPatientIdButton';

export type LabFlagType = 'NORMAL' | 'BORDERLINE' | 'HIGH' | 'CRITICAL_HIGH' | 'LOW' | 'CRITICAL_LOW';

export interface ManualLabItem {
  id: string;
  testName: string;
  category: 'CARDIAC' | 'METABOLIC' | 'RENAL' | 'HEMATOLOGY' | 'INFLAMMATORY' | 'OTHER';
  value: number | string;
  unit: string;
  referenceRange: string;
  flag: LabFlagType;
  collectionTime: string;
  technicianNotes?: string;
  clinicianFlaggedBy?: string;
}

interface ManualLabEntryPanelProps {
  currentRecord: PatientAssessmentRecord;
  onUpdateLabs?: (labs: ManualLabItem[]) => void;
  onBackToDossier?: () => void;
}

export const ManualLabEntryPanel: React.FC<ManualLabEntryPanelProps> = ({
  currentRecord,
  onUpdateLabs,
  onBackToDossier,
}) => {
  const patientId = currentRecord.demographics.patientId;
  const storageKey = `manual_labs_${patientId}`;

  // Initial Lab List seeded from patient assessment record or realistic panel
  const [labsList, setLabsList] = useState<ManualLabItem[]>(() => {
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      } catch (e) {
        console.error(e);
      }
    }

    const baseline: ManualLabItem[] = [];
    const rLabs = currentRecord.labs || {};

    if (rLabs.glucoseFastingMgDl) {
      baseline.push({
        id: 'lab-glucose',
        testName: 'Fasting Plasma Glucose (FPG)',
        category: 'METABOLIC',
        value: rLabs.glucoseFastingMgDl,
        unit: 'mg/dL',
        referenceRange: '70 - 99 mg/dL',
        flag: rLabs.glucoseFastingMgDl >= 126 ? 'HIGH' : rLabs.glucoseFastingMgDl >= 100 ? 'BORDERLINE' : 'NORMAL',
        collectionTime: new Date().toLocaleDateString(),
        technicianNotes: 'Fasting 10 hours confirmed by patient.',
      });
    }

    if (rLabs.hba1cPercent) {
      baseline.push({
        id: 'lab-hba1c',
        testName: 'Glycated Hemoglobin (HbA1c)',
        category: 'METABOLIC',
        value: rLabs.hba1cPercent,
        unit: '%',
        referenceRange: '< 5.7 %',
        flag: rLabs.hba1cPercent >= 8.5 ? 'CRITICAL_HIGH' : rLabs.hba1cPercent >= 6.5 ? 'HIGH' : rLabs.hba1cPercent >= 5.7 ? 'BORDERLINE' : 'NORMAL',
        collectionTime: new Date().toLocaleDateString(),
        technicianNotes: 'NGSP certified HPLC methodology.',
      });
    }

    if (rLabs.ldlCholesterolMgDl) {
      baseline.push({
        id: 'lab-ldl',
        testName: 'LDL Cholesterol (Direct)',
        category: 'METABOLIC',
        value: rLabs.ldlCholesterolMgDl,
        unit: 'mg/dL',
        referenceRange: '< 100 mg/dL (High Risk < 70)',
        flag: rLabs.ldlCholesterolMgDl >= 160 ? 'HIGH' : rLabs.ldlCholesterolMgDl >= 100 ? 'BORDERLINE' : 'NORMAL',
        collectionTime: new Date().toLocaleDateString(),
        technicianNotes: 'Atherogenic lipoprotein biomarker.',
      });
    }

    if (rLabs.creatinineMgDl) {
      baseline.push({
        id: 'lab-creat',
        testName: 'Serum Creatinine',
        category: 'RENAL',
        value: rLabs.creatinineMgDl,
        unit: 'mg/dL',
        referenceRange: '0.7 - 1.3 mg/dL',
        flag: rLabs.creatinineMgDl > 1.4 ? 'HIGH' : 'NORMAL',
        collectionTime: new Date().toLocaleDateString(),
        technicianNotes: 'Kinetic Jaffe method calibrated to IDMS.',
      });
    }

    if (rLabs.egfr) {
      baseline.push({
        id: 'lab-egfr',
        testName: 'Estimated GFR (CKD-EPI 2021)',
        category: 'RENAL',
        value: rLabs.egfr,
        unit: 'mL/min/1.73m²',
        referenceRange: '> 90 mL/min/1.73m²',
        flag: rLabs.egfr < 30 ? 'CRITICAL_LOW' : rLabs.egfr < 60 ? 'LOW' : 'NORMAL',
        collectionTime: new Date().toLocaleDateString(),
        technicianNotes: 'KDIGO 2026 standardized filtration rate.',
      });
    }

    if (rLabs.troponinPositive !== undefined) {
      baseline.push({
        id: 'lab-trop',
        testName: 'High-Sensitivity Troponin-I (hs-cTnI)',
        category: 'CARDIAC',
        value: rLabs.troponinPositive ? 84.5 : 4.2,
        unit: 'ng/L',
        referenceRange: '< 14.0 ng/L (99th percentile)',
        flag: rLabs.troponinPositive ? 'CRITICAL_HIGH' : 'NORMAL',
        collectionTime: new Date().toLocaleDateString(),
        technicianNotes: rLabs.troponinPositive ? 'CRITICAL ALERT: Myocardial injury pattern detected.' : 'Within normal cardiac baseline.',
      });
    }

    // Default complementary labs if empty
    if (baseline.length === 0) {
      return [
        {
          id: 'lab-1',
          testName: 'Fasting Plasma Glucose',
          category: 'METABOLIC',
          value: 142,
          unit: 'mg/dL',
          referenceRange: '70 - 99 mg/dL',
          flag: 'HIGH',
          collectionTime: 'Today, 08:30 AM',
          technicianNotes: 'Patient was fasting 8 hours.',
          clinicianFlaggedBy: 'Dr. Asim Farooq',
        },
        {
          id: 'lab-2',
          testName: 'Glycated Hemoglobin (HbA1c)',
          category: 'METABOLIC',
          value: 7.9,
          unit: '%',
          referenceRange: '< 5.7 %',
          flag: 'HIGH',
          collectionTime: 'Today, 08:30 AM',
          technicianNotes: 'Indicates suboptimal 3-month glycemic control.',
          clinicianFlaggedBy: 'Dr. Asim Farooq',
        },
        {
          id: 'lab-3',
          testName: 'High-Sensitivity Troponin-I',
          category: 'CARDIAC',
          value: 38.6,
          unit: 'ng/L',
          referenceRange: '< 14.0 ng/L',
          flag: 'CRITICAL_HIGH',
          collectionTime: 'Today, 09:15 AM',
          technicianNotes: 'STAT STAT Lab alert notified to attending cardiologist.',
          clinicianFlaggedBy: 'Dr. Asim Farooq',
        },
        {
          id: 'lab-4',
          testName: 'Serum Creatinine',
          category: 'RENAL',
          value: 1.1,
          unit: 'mg/dL',
          referenceRange: '0.7 - 1.3 mg/dL',
          flag: 'NORMAL',
          collectionTime: 'Today, 08:30 AM',
          technicianNotes: 'Kidney filtration within stable parameters.',
        },
        {
          id: 'lab-5',
          testName: 'High-Sensitivity CRP (hs-CRP)',
          category: 'INFLAMMATORY',
          value: 5.4,
          unit: 'mg/L',
          referenceRange: '< 1.0 mg/L',
          flag: 'HIGH',
          collectionTime: 'Today, 08:30 AM',
          technicianNotes: 'Elevated systemic vascular inflammation.',
        },
      ];
    }
    return baseline;
  });

  const [activeFilter, setActiveFilter] = useState<'ALL' | 'ABNORMAL_ONLY' | 'CARDIAC' | 'METABOLIC' | 'RENAL'>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);

  // New Lab Input Form State
  const [newTestName, setNewTestName] = useState('Serum Potassium (K+)');
  const [newCategory, setNewCategory] = useState<'CARDIAC' | 'METABOLIC' | 'RENAL' | 'HEMATOLOGY' | 'INFLAMMATORY' | 'OTHER'>('RENAL');
  const [newValue, setNewValue] = useState('5.6');
  const [newUnit, setNewUnit] = useState('mEq/L');
  const [newRefRange, setNewRefRange] = useState('3.5 - 5.0 mEq/L');
  const [newFlag, setNewFlag] = useState<LabFlagType>('HIGH');
  const [newNotes, setNewNotes] = useState('Hyperkalemia warning in setting of ACEi/ARB therapy.');

  // Persist to storage
  const persistLabs = (updated: ManualLabItem[]) => {
    setLabsList(updated);
    try {
      localStorage.setItem(storageKey, JSON.stringify(updated));
      if (onUpdateLabs) onUpdateLabs(updated);
    } catch (e) {
      console.warn(e);
    }
  };

  // Add New Lab Test Result
  const handleAddLab = () => {
    if (!newTestName.trim() || !newValue) return;
    const newItem: ManualLabItem = {
      id: `manual-lab-${Date.now()}`,
      testName: newTestName,
      category: newCategory,
      value: newValue,
      unit: newUnit,
      referenceRange: newRefRange,
      flag: newFlag,
      collectionTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      technicianNotes: newNotes,
      clinicianFlaggedBy: 'Dr. Asim Farooq, FCPS',
    };
    const nextList = [newItem, ...labsList];
    persistLabs(nextList);
    setShowAddModal(false);
  };

  // Quick Preset Panels
  const applyPresetPanel = (presetType: 'CARDIAC_STAT' | 'METABOLIC_COMPREHENSIVE' | 'RENAL_PANEL') => {
    let presetItems: ManualLabItem[] = [];

    if (presetType === 'CARDIAC_STAT') {
      presetItems = [
        {
          id: `preset-trop-${Date.now()}`,
          testName: 'High-Sensitivity Troponin-I (hs-cTnI)',
          category: 'CARDIAC',
          value: 48.2,
          unit: 'ng/L',
          referenceRange: '< 14.0 ng/L',
          flag: 'CRITICAL_HIGH',
          collectionTime: 'STAT Point-of-Care',
          technicianNotes: '99th percentile cutoff exceeded; acute coronary protocol indicated.',
          clinicianFlaggedBy: 'Dr. Asim Farooq',
        },
        {
          id: `preset-bnp-${Date.now()}`,
          testName: 'NT-proBNP (Heart Failure Biomarker)',
          category: 'CARDIAC',
          value: 460,
          unit: 'pg/mL',
          referenceRange: '< 125 pg/mL',
          flag: 'HIGH',
          collectionTime: 'STAT Point-of-Care',
          technicianNotes: 'Elevated myocardial wall tension & ventricular stretch.',
          clinicianFlaggedBy: 'Dr. Asim Farooq',
        },
        {
          id: `preset-ckmb-${Date.now()}`,
          testName: 'CK-MB Mass',
          category: 'CARDIAC',
          value: 8.9,
          unit: 'ng/mL',
          referenceRange: '< 5.0 ng/mL',
          flag: 'HIGH',
          collectionTime: 'STAT Point-of-Care',
          technicianNotes: 'Consistent with ongoing myocardial stress.',
        },
      ];
    } else if (presetType === 'METABOLIC_COMPREHENSIVE') {
      presetItems = [
        {
          id: `preset-fpg-${Date.now()}`,
          testName: 'Fasting Plasma Glucose (FPG)',
          category: 'METABOLIC',
          value: 154,
          unit: 'mg/dL',
          referenceRange: '70 - 99 mg/dL',
          flag: 'HIGH',
          collectionTime: 'Fasting Specimen',
          technicianNotes: 'Exceeds ADA diabetic threshold (>=126 mg/dL).',
        },
        {
          id: `preset-hba1c-${Date.now()}`,
          testName: 'Glycated Hemoglobin (HbA1c)',
          category: 'METABOLIC',
          value: 8.2,
          unit: '%',
          referenceRange: '< 5.7 %',
          flag: 'HIGH',
          collectionTime: 'Lab Verified',
          technicianNotes: 'High risk for microvascular complications.',
        },
        {
          id: `preset-chol-${Date.now()}`,
          testName: 'Total Cholesterol',
          category: 'METABOLIC',
          value: 238,
          unit: 'mg/dL',
          referenceRange: '< 200 mg/dL',
          flag: 'HIGH',
          collectionTime: 'Lab Verified',
          technicianNotes: 'Hypercholesterolemia.',
        },
        {
          id: `preset-ldl-${Date.now()}`,
          testName: 'Direct LDL-C',
          category: 'METABOLIC',
          value: 162,
          unit: 'mg/dL',
          referenceRange: '< 100 mg/dL',
          flag: 'HIGH',
          collectionTime: 'Lab Verified',
          technicianNotes: 'Target <70 for very high CVD risk.',
        },
      ];
    } else {
      presetItems = [
        {
          id: `preset-creat-${Date.now()}`,
          testName: 'Serum Creatinine',
          category: 'RENAL',
          value: 1.8,
          unit: 'mg/dL',
          referenceRange: '0.7 - 1.3 mg/dL',
          flag: 'HIGH',
          collectionTime: 'Biochemistry Lab',
          technicianNotes: 'Elevated; monitor with dose adjustments for renal-cleared drugs.',
        },
        {
          id: `preset-k-${Date.now()}`,
          testName: 'Serum Potassium (K+)',
          category: 'RENAL',
          value: 5.7,
          unit: 'mEq/L',
          referenceRange: '3.5 - 5.0 mEq/L',
          flag: 'HIGH',
          collectionTime: 'Biochemistry Lab',
          technicianNotes: 'Mild-to-moderate hyperkalemia. Check ECG for peaked T waves.',
        },
        {
          id: `preset-bun-${Date.now()}`,
          testName: 'Blood Urea Nitrogen (BUN)',
          category: 'RENAL',
          value: 34,
          unit: 'mg/dL',
          referenceRange: '7 - 20 mg/dL',
          flag: 'HIGH',
          collectionTime: 'Biochemistry Lab',
          technicianNotes: 'Prerenal vs intrinsic azotemia.',
        },
      ];
    }

    const nextList = [...presetItems, ...labsList.filter((existing) => !presetItems.some((p) => p.testName === existing.testName))];
    persistLabs(nextList);
  };

  // Toggle clinician flag on an item
  const handleToggleFlag = (id: string, newFlagState: LabFlagType) => {
    const updated = labsList.map((item) => (item.id === id ? { ...item, flag: newFlagState } : item));
    persistLabs(updated);
  };

  // Delete Lab Result
  const handleDeleteLab = (id: string) => {
    const updated = labsList.filter((item) => item.id !== id);
    persistLabs(updated);
  };

  // Filtered Items
  const filteredLabs = labsList.filter((item) => {
    let matchesCategory = true;
    if (activeFilter === 'ABNORMAL_ONLY') {
      matchesCategory = item.flag !== 'NORMAL';
    } else if (activeFilter === 'CARDIAC') {
      matchesCategory = item.category === 'CARDIAC';
    } else if (activeFilter === 'METABOLIC') {
      matchesCategory = item.category === 'METABOLIC';
    } else if (activeFilter === 'RENAL') {
      matchesCategory = item.category === 'RENAL';
    }

    const q = searchTerm.toLowerCase().trim();
    if (!q) return matchesCategory;
    return (
      matchesCategory &&
      (item.testName.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q) ||
        item.flag.toLowerCase().includes(q) ||
        (item.technicianNotes && item.technicianNotes.toLowerCase().includes(q)))
    );
  });

  const abnormalCount = labsList.filter((l) => l.flag !== 'NORMAL').length;
  const criticalCount = labsList.filter((l) => l.flag === 'CRITICAL_HIGH' || l.flag === 'CRITICAL_LOW').length;

  return (
    <div className="space-y-6">
      {/* Top Banner Card with Stats & Quick Actions */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-50 border border-purple-200 flex items-center justify-center text-purple-700">
              <FlaskConical className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-900">
                  Diagnostic Laboratory & Biomarker Diagnostic Panel
                </h3>
                <span className="text-[10px] bg-slate-100 text-slate-700 font-mono px-2 py-0.5 rounded font-bold">
                  {labsList.length} Lab Biomarkers
                </span>
              </div>
              <div className="text-xs text-slate-500 flex items-center gap-1.5 flex-wrap mt-0.5">
                <span>Patient: <strong className="text-slate-800">{currentRecord.demographics.fullName}</strong></span>
                <span className="font-mono text-slate-700 bg-slate-100 px-1.5 py-0.2 rounded border border-slate-200">
                  {currentRecord.demographics.patientId}
                </span>
                <CopyPatientIdButton
                  id="btn-copy-labs-pid"
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
                id="btn-labs-back-to-dossier"
                onClick={onBackToDossier}
                className="px-3.5 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:text-slate-900 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
              >
                <span>←</span>
                <span>Back to Clinical Dossier</span>
              </button>
            )}
            <button
              id="btn-add-manual-lab"
              onClick={() => setShowAddModal(true)}
              className="px-3.5 py-1.5 rounded-lg bg-purple-700 hover:bg-purple-800 text-white text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              Input Lab Result
            </button>
          </div>
        </div>

        {/* Rapid Clinical Presets Banner */}
        <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs">
          <div className="flex items-center gap-2 text-slate-700 font-bold">
            <Sparkles className="w-4 h-4 text-purple-600" />
            <span>1-Tap Rapid Diagnostic Panels:</span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              id="btn-panel-cardiac"
              onClick={() => applyPresetPanel('CARDIAC_STAT')}
              className="px-2.5 py-1 bg-white hover:bg-rose-50 border border-rose-200 text-rose-700 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all shadow-2xs"
            >
              <Heart className="w-3.5 h-3.5 text-rose-500" />
              STAT Cardiac Biomarkers
            </button>
            <button
              id="btn-panel-metabolic"
              onClick={() => applyPresetPanel('METABOLIC_COMPREHENSIVE')}
              className="px-2.5 py-1 bg-white hover:bg-amber-50 border border-amber-200 text-amber-800 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all shadow-2xs"
            >
              <Droplets className="w-3.5 h-3.5 text-amber-600" />
              Lipids & Glycemia Panel
            </button>
            <button
              id="btn-panel-renal"
              onClick={() => applyPresetPanel('RENAL_PANEL')}
              className="px-2.5 py-1 bg-white hover:bg-cyan-50 border border-cyan-200 text-cyan-800 rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-all shadow-2xs"
            >
              <Activity className="w-3.5 h-3.5 text-cyan-600" />
              Renal & Electrolytes Panel
            </button>
          </div>
        </div>

        {/* Severity Metrics Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center text-xs">
          <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
            <span className="text-[10px] text-slate-400 font-bold uppercase block">Total Tests</span>
            <span className="text-base font-black font-mono text-slate-800">{labsList.length}</span>
          </div>

          <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
            <span className="text-[10px] text-slate-400 font-bold uppercase block">Within Normal Range</span>
            <span className="text-base font-black font-mono text-emerald-700">
              {labsList.filter((l) => l.flag === 'NORMAL').length}
            </span>
          </div>

          <div className="bg-amber-50/70 p-2.5 rounded-xl border border-amber-200">
            <span className="text-[10px] text-amber-700 font-bold uppercase block">Abnormal / High</span>
            <span className="text-base font-black font-mono text-amber-900">{abnormalCount}</span>
          </div>

          <div className="bg-rose-50/70 p-2.5 rounded-xl border border-rose-200">
            <span className="text-[10px] text-rose-700 font-bold uppercase block">Critical / Panic Values</span>
            <span className="text-base font-black font-mono text-rose-900 flex items-center justify-center gap-1">
              {criticalCount > 0 && <AlertOctagon className="w-4 h-4 text-rose-600 animate-pulse" />}
              {criticalCount}
            </span>
          </div>
        </div>
      </div>

      {/* Lab Results Table with Filter Tabs & Search */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          {/* Filter Chips */}
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            {[
              { id: 'ALL', label: 'All Tests' },
              { id: 'ABNORMAL_ONLY', label: `⚠️ Abnormal Only (${abnormalCount})` },
              { id: 'CARDIAC', label: '🫀 Cardiac' },
              { id: 'METABOLIC', label: '🩸 Metabolic' },
              { id: 'RENAL', label: '🧪 Renal' },
            ].map((tab) => (
              <button
                key={tab.id}
                id={`btn-filter-lab-${tab.id}`}
                onClick={() => setActiveFilter(tab.id as any)}
                className={`px-3 py-1 rounded-lg font-bold transition-all cursor-pointer ${
                  activeFilter === tab.id
                    ? 'bg-purple-900 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Search Box */}
          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
            <input
              type="text"
              placeholder="Search test name or flag..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-2 focus:ring-purple-500 focus:outline-none bg-slate-50/50"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Results Grid / Table */}
        {filteredLabs.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
            No laboratory tests match the current filter. Click 'Input Lab Result' or apply a preset panel.
          </div>
        ) : (
          <div className="space-y-2.5">
            {filteredLabs.map((lab) => {
              const isCritical = lab.flag === 'CRITICAL_HIGH' || lab.flag === 'CRITICAL_LOW';
              const isHigh = lab.flag === 'HIGH';
              const isLow = lab.flag === 'LOW';
              const isBorderline = lab.flag === 'BORDERLINE';

              return (
                <div
                  key={lab.id}
                  id={`lab-row-${lab.id}`}
                  className={`p-3.5 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs ${
                    isCritical
                      ? 'bg-red-50/80 border-red-300 ring-1 ring-red-200 shadow-sm'
                      : isHigh
                      ? 'bg-amber-50/60 border-amber-300'
                      : isLow
                      ? 'bg-indigo-50/60 border-indigo-200'
                      : isBorderline
                      ? 'bg-yellow-50/60 border-yellow-200'
                      : 'bg-white border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-slate-900 text-sm">{lab.testName}</span>
                      <span className="text-[10px] uppercase font-mono px-2 py-0.2 rounded bg-white border border-slate-200 text-slate-600">
                        {lab.category}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {lab.collectionTime}
                      </span>
                    </div>

                    <div className="flex items-center gap-4 text-slate-600 text-[11px]">
                      <span>
                        Result Value:{' '}
                        <strong className="text-slate-900 font-mono text-sm">
                          {lab.value} {lab.unit}
                        </strong>
                      </span>
                      <span>
                        Reference Range: <span className="font-mono text-slate-500">{lab.referenceRange}</span>
                      </span>
                    </div>

                    {lab.technicianNotes && (
                      <p className="text-[11px] text-slate-500 italic mt-0.5">
                        Note: {lab.technicianNotes}
                      </p>
                    )}
                  </div>

                  {/* Warning Badge & Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    {/* Status Badge */}
                    <span
                      className={`text-xs font-bold px-3 py-1 rounded-lg flex items-center gap-1.5 shadow-2xs ${
                        isCritical
                          ? 'bg-red-600 text-white font-black animate-pulse'
                          : isHigh
                          ? 'bg-amber-500 text-white'
                          : isLow
                          ? 'bg-indigo-600 text-white'
                          : isBorderline
                          ? 'bg-yellow-500 text-slate-950'
                          : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                      }`}
                    >
                      {isCritical && <AlertOctagon className="w-3.5 h-3.5" />}
                      {isHigh && <TrendingUp className="w-3.5 h-3.5" />}
                      {isLow && <Activity className="w-3.5 h-3.5" />}
                      {lab.flag === 'NORMAL' && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />}
                      {lab.flag.replace('_', ' ')}
                    </span>

                    {/* Change Flag Quick Selector */}
                    <select
                      id={`select-flag-${lab.id}`}
                      value={lab.flag}
                      onChange={(e) => handleToggleFlag(lab.id, e.target.value as LabFlagType)}
                      className="bg-white border border-slate-300 rounded-lg p-1 text-[11px] text-slate-700 cursor-pointer"
                      title="Override clinical flag"
                    >
                      <option value="NORMAL">Normal</option>
                      <option value="BORDERLINE">Borderline</option>
                      <option value="HIGH">High</option>
                      <option value="CRITICAL_HIGH">Critical High ⚠️</option>
                      <option value="LOW">Low</option>
                      <option value="CRITICAL_LOW">Critical Low ⚠️</option>
                    </select>

                    <button
                      onClick={() => handleDeleteLab(lab.id)}
                      className="p-1 rounded text-slate-400 hover:text-rose-600 cursor-pointer"
                      title="Remove Lab Test"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ADD LAB TEST RESULT MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Plus className="w-4 h-4 text-purple-600" />
                Manually Input Laboratory Test Result
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Test Name / Diagnostic Assay
                </label>
                <input
                  id="input-lab-name"
                  type="text"
                  value={newTestName}
                  onChange={(e) => setNewTestName(e.target.value)}
                  placeholder="e.g. High-Sensitivity Troponin-I, Serum Potassium, HbA1c"
                  className="w-full p-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Diagnostic Category
                  </label>
                  <select
                    id="select-lab-category"
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value as any)}
                    className="w-full p-2 border border-slate-300 rounded-lg bg-white"
                  >
                    <option value="CARDIAC">Cardiac Biomarker</option>
                    <option value="METABOLIC">Metabolic & Lipids</option>
                    <option value="RENAL">Renal & Electrolytes</option>
                    <option value="HEMATOLOGY">Hematology</option>
                    <option value="INFLAMMATORY">Inflammatory / Infection</option>
                    <option value="OTHER">Other Clinical Lab</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Clinical Flag Warning
                  </label>
                  <select
                    id="select-new-lab-flag"
                    value={newFlag}
                    onChange={(e) => setNewFlag(e.target.value as LabFlagType)}
                    className="w-full p-2 border border-slate-300 rounded-lg bg-white font-bold"
                  >
                    <option value="NORMAL">Normal / In Target</option>
                    <option value="BORDERLINE">Borderline Elev.</option>
                    <option value="HIGH">High (Abnormal)</option>
                    <option value="CRITICAL_HIGH">🚨 Critical High (Panic)</option>
                    <option value="LOW">Low (Below Range)</option>
                    <option value="CRITICAL_LOW">🚨 Critical Low (Panic)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">Measured Value</label>
                  <input
                    id="input-lab-value"
                    type="text"
                    value={newValue}
                    onChange={(e) => setNewValue(e.target.value)}
                    placeholder="e.g. 145"
                    className="w-full p-2 border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">Unit</label>
                  <input
                    id="input-lab-unit"
                    type="text"
                    value={newUnit}
                    onChange={(e) => setNewUnit(e.target.value)}
                    placeholder="e.g. mg/dL, %, ng/L"
                    className="w-full p-2 border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">Reference Range</label>
                  <input
                    id="input-lab-refrange"
                    type="text"
                    value={newRefRange}
                    onChange={(e) => setNewRefRange(e.target.value)}
                    placeholder="e.g. 70 - 99 mg/dL"
                    className="w-full p-2 border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Clinician Interpretation & Action Directives
                </label>
                <input
                  id="input-lab-notes"
                  type="text"
                  value={newNotes}
                  onChange={(e) => setNewNotes(e.target.value)}
                  placeholder="e.g. Advised immediate dose adjustment and follow-up repeat test in 48h."
                  className="w-full p-2 border border-slate-300 rounded-lg"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => setShowAddModal(false)}
                className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                id="btn-confirm-add-lab"
                onClick={handleAddLab}
                className="px-4 py-1.5 rounded-lg bg-purple-700 hover:bg-purple-800 text-white text-xs font-bold shadow-sm cursor-pointer"
              >
                Save Laboratory Result
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
