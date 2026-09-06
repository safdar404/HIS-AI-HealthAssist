import React, { useState, useEffect } from 'react';
import {
  Sliders,
  AlertTriangle,
  CheckCircle2,
  X,
  RotateCcw,
  Sparkles,
  Save,
  ShieldAlert,
  Activity,
  Heart,
  Droplet,
  Flame,
  Info,
  Beaker,
  Check,
} from 'lucide-react';
import { PatientAssessmentRecord, LabResults, VitalSigns } from '../types/clinical';

export interface LabAlertThresholds {
  troponinHighSensitivityMgDl: number; // e.g. 0.04 or 0.014
  troponinPositiveAlwaysUrgent: boolean;
  systolicBpUrgent: number; // e.g. 160 or 180
  diastolicBpUrgent: number; // e.g. 100 or 110
  glucoseFastingUrgent: number; // e.g. 200 or 250
  glucoseHypoglycemiaUrgent: number; // e.g. 70
  hba1cUrgent: number; // e.g. 9.0
  creatinineUrgent: number; // e.g. 1.8
  egfrCriticalLow: number; // e.g. 30
  potassiumHighUrgent: number; // e.g. 5.5
  potassiumLowUrgent: number; // e.g. 3.2
  oxygenSaturationLowUrgent: number; // e.g. 92
  wbcHighUrgent: number; // e.g. 14.0
  autoTriggerUrgentBadge: boolean;
  audioAlertOnCritical: boolean;
}

export const DEFAULT_LAB_ALERT_THRESHOLDS: LabAlertThresholds = {
  troponinHighSensitivityMgDl: 0.04,
  troponinPositiveAlwaysUrgent: true,
  systolicBpUrgent: 160,
  diastolicBpUrgent: 100,
  glucoseFastingUrgent: 200,
  glucoseHypoglycemiaUrgent: 70,
  hba1cUrgent: 9.0,
  creatinineUrgent: 1.8,
  egfrCriticalLow: 30,
  potassiumHighUrgent: 5.5,
  potassiumLowUrgent: 3.2,
  oxygenSaturationLowUrgent: 92,
  wbcHighUrgent: 14.0,
  autoTriggerUrgentBadge: true,
  audioAlertOnCritical: true,
};

export const PRESET_CONFIGS: Record<string, { label: string; desc: string; thresholds: Partial<LabAlertThresholds> }> = {
  ACC_AHA_SENSITIVE: {
    label: 'ACC/AHA High Sensitivity',
    desc: 'Strict thresholds for early detection of Acute Coronary Syndrome & Hypertensive Emergency',
    thresholds: {
      troponinHighSensitivityMgDl: 0.014,
      systolicBpUrgent: 160,
      diastolicBpUrgent: 100,
      glucoseFastingUrgent: 180,
      hba1cUrgent: 8.5,
      creatinineUrgent: 1.5,
      egfrCriticalLow: 45,
      oxygenSaturationLowUrgent: 94,
    },
  },
  WHO_STANDARD: {
    label: 'WHO EMRO Primary Standard',
    desc: 'Standard low-to-middle income country clinical practice guidelines',
    thresholds: {
      troponinHighSensitivityMgDl: 0.04,
      systolicBpUrgent: 180,
      diastolicBpUrgent: 110,
      glucoseFastingUrgent: 250,
      hba1cUrgent: 9.5,
      creatinineUrgent: 2.0,
      egfrCriticalLow: 30,
      oxygenSaturationLowUrgent: 90,
    },
  },
  ICU_STRICT: {
    label: 'Intensive Care / Ward Critical',
    desc: 'Aggressive multi-organ safety buffers for admitted inpatients',
    thresholds: {
      troponinHighSensitivityMgDl: 0.02,
      systolicBpUrgent: 150,
      diastolicBpUrgent: 95,
      glucoseFastingUrgent: 160,
      creatinineUrgent: 1.4,
      potassiumHighUrgent: 5.2,
      potassiumLowUrgent: 3.5,
      oxygenSaturationLowUrgent: 95,
      wbcHighUrgent: 12.0,
    },
  },
};

const STORAGE_KEY_LAB_THRESHOLDS = 'doctor_cds_lab_alert_thresholds';

export function getStoredLabAlertThresholds(): LabAlertThresholds {
  if (typeof window === 'undefined') return DEFAULT_LAB_ALERT_THRESHOLDS;
  try {
    const saved = localStorage.getItem(STORAGE_KEY_LAB_THRESHOLDS);
    if (saved) {
      return { ...DEFAULT_LAB_ALERT_THRESHOLDS, ...JSON.parse(saved) };
    }
  } catch (e) {
    // fallback
  }
  return DEFAULT_LAB_ALERT_THRESHOLDS;
}

export function saveStoredLabAlertThresholds(config: LabAlertThresholds): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY_LAB_THRESHOLDS, JSON.stringify(config));
  } catch (e) {
    // ignore
  }
}

/**
 * Evaluates whether a patient assessment record breaches the configured laboratory alert thresholds
 */
export function checkPatientLabAlerts(
  record: PatientAssessmentRecord | null,
  thresholds: LabAlertThresholds
): { hasUrgentAlert: boolean; triggeredAlerts: string[] } {
  if (!record) return { hasUrgentAlert: false, triggeredAlerts: [] };

  const alerts: string[] = [];
  const labs: LabResults = record.labs || {};
  const vitals: VitalSigns = record.vitals || ({} as VitalSigns);

  // 1. Cardiac Troponin Check
  if (thresholds.troponinPositiveAlwaysUrgent && labs.troponinPositive) {
    alerts.push('Cardiac Troponin hs-cTnI Positive (Myocardial Injury Alert)');
  }

  // 2. Blood Pressure Check
  if (vitals.systolicBp && vitals.systolicBp >= thresholds.systolicBpUrgent) {
    alerts.push(`Systolic BP ${vitals.systolicBp} mmHg ≥ Alert Threshold (${thresholds.systolicBpUrgent} mmHg)`);
  }
  if (vitals.diastolicBp && vitals.diastolicBp >= thresholds.diastolicBpUrgent) {
    alerts.push(`Diastolic BP ${vitals.diastolicBp} mmHg ≥ Alert Threshold (${thresholds.diastolicBpUrgent} mmHg)`);
  }

  // 3. Glucose Check
  const glucose = vitals.bloodGlucoseMgDl || labs.glucoseFastingMgDl;
  if (glucose && glucose >= thresholds.glucoseFastingUrgent) {
    alerts.push(`Blood Glucose ${glucose} mg/dL ≥ Alert Threshold (${thresholds.glucoseFastingUrgent} mg/dL)`);
  }
  if (glucose && glucose <= thresholds.glucoseHypoglycemiaUrgent) {
    alerts.push(`Severe Hypoglycemia ${glucose} mg/dL ≤ Threshold (${thresholds.glucoseHypoglycemiaUrgent} mg/dL)`);
  }

  // 4. HbA1c Check
  if (labs.hba1cPercent && labs.hba1cPercent >= thresholds.hba1cUrgent) {
    alerts.push(`HbA1c ${labs.hba1cPercent}% ≥ Alert Threshold (${thresholds.hba1cUrgent}%)`);
  }

  // 5. Serum Creatinine & eGFR
  if (labs.creatinineMgDl && labs.creatinineMgDl >= thresholds.creatinineUrgent) {
    alerts.push(`Serum Creatinine ${labs.creatinineMgDl} mg/dL ≥ Alert Threshold (${thresholds.creatinineUrgent} mg/dL)`);
  }
  if (labs.egfr && labs.egfr <= thresholds.egfrCriticalLow) {
    alerts.push(`eGFR ${labs.egfr} mL/min/1.73m² ≤ Critical Low (${thresholds.egfrCriticalLow})`);
  }

  // 6. Oxygen Saturation SpO2
  if (vitals.oxygenSaturation && vitals.oxygenSaturation <= thresholds.oxygenSaturationLowUrgent) {
    alerts.push(`SpO₂ ${vitals.oxygenSaturation}% ≤ Hypoxemia Threshold (${thresholds.oxygenSaturationLowUrgent}%)`);
  }

  // 7. WBC Count
  if (labs.wbcCount && labs.wbcCount >= thresholds.wbcHighUrgent * 1000) {
    alerts.push(`WBC ${labs.wbcCount.toLocaleString()} /µL ≥ Leukocytosis Threshold`);
  }

  return {
    hasUrgentAlert: alerts.length > 0 && thresholds.autoTriggerUrgentBadge,
    triggeredAlerts: alerts,
  };
}

interface LabAlertPreferencesModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentRecord?: PatientAssessmentRecord | null;
  onSavePreferences?: (newThresholds: LabAlertThresholds) => void;
}

export const LabAlertPreferencesModal: React.FC<LabAlertPreferencesModalProps> = ({
  isOpen,
  onClose,
  currentRecord,
  onSavePreferences,
}) => {
  const [thresholds, setThresholds] = useState<LabAlertThresholds>(getStoredLabAlertThresholds);
  const [saveToast, setSaveToast] = useState<boolean>(false);
  const [activePreset, setActivePreset] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setThresholds(getStoredLabAlertThresholds());
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleApplyPreset = (presetKey: string) => {
    const preset = PRESET_CONFIGS[presetKey];
    if (preset) {
      setThresholds((prev) => ({
        ...prev,
        ...preset.thresholds,
      }));
      setActivePreset(presetKey);
    }
  };

  const handleSave = () => {
    saveStoredLabAlertThresholds(thresholds);
    if (onSavePreferences) {
      onSavePreferences(thresholds);
    }
    setSaveToast(true);
    setTimeout(() => {
      setSaveToast(false);
      onClose();
    }, 1200);
  };

  const handleResetDefaults = () => {
    setThresholds(DEFAULT_LAB_ALERT_THRESHOLDS);
    setActivePreset(null);
  };

  // Check against active patient preview
  const previewResult = checkPatientLabAlerts(currentRecord || null, thresholds);

  return (
    <div
      id="lab-alert-preferences-modal-backdrop"
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4"
    >
      <div className="relative w-full max-w-3xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] animate-fade-in">
        {/* Modal Header */}
        <div className="bg-slate-900 text-white px-5 py-4 flex items-center justify-between border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-rose-600 to-amber-600 text-white flex items-center justify-center font-bold shadow-sm">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                Laboratory & Biomarker Alert Preferences
                <span className="bg-rose-500/20 text-rose-300 border border-rose-500/30 text-[10px] font-bold px-2 py-0.5 rounded-full">
                  Physician Configurable
                </span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Define diagnostic threshold cutoffs that trigger immediate 'URGENT' indicator badges on patient dashboards.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-5 text-slate-800 flex-1">
          {/* Preset Buttons Strip */}
          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
            <span className="text-xs font-bold text-slate-700 block mb-2 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              Quick Clinical Practice Guideline Presets:
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {Object.entries(PRESET_CONFIGS).map(([key, item]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => handleApplyPreset(key)}
                  className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                    activePreset === key
                      ? 'bg-rose-50 border-rose-400 text-rose-900 ring-2 ring-rose-300'
                      : 'bg-white border-slate-200 hover:border-rose-300 text-slate-800'
                  }`}
                >
                  <span className="text-xs font-bold block">{item.label}</span>
                  <span className="text-[10px] text-slate-500 line-clamp-2 mt-0.5">{item.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Threshold Configurations Grid */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <Beaker className="w-3.5 h-3.5 text-rose-500" />
              Cardiovascular & Metabolic Biomarker Cutoffs
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Cardiac Troponin */}
              <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Heart className="w-3.5 h-3.5 text-rose-600" />
                    Cardiac Troponin (hs-cTnI)
                  </label>
                  <span className="text-[10px] text-rose-600 font-mono font-bold">
                    &ge; {thresholds.troponinHighSensitivityMgDl} ng/mL
                  </span>
                </div>
                <input
                  type="number"
                  step="0.005"
                  min="0.005"
                  max="0.5"
                  value={thresholds.troponinHighSensitivityMgDl}
                  onChange={(e) =>
                    setThresholds({ ...thresholds, troponinHighSensitivityMgDl: parseFloat(e.target.value) || 0.04 })
                  }
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono font-bold focus:ring-2 focus:ring-rose-500 focus:outline-none"
                />
                <div className="flex items-center gap-2 mt-1">
                  <input
                    type="checkbox"
                    id="chk-troponin-always"
                    checked={thresholds.troponinPositiveAlwaysUrgent}
                    onChange={(e) =>
                      setThresholds({ ...thresholds, troponinPositiveAlwaysUrgent: e.target.checked })
                    }
                    className="accent-rose-600 rounded"
                  />
                  <label htmlFor="chk-troponin-always" className="text-[11px] text-slate-600 cursor-pointer">
                    Flag any Troponin positive result as Urgent
                  </label>
                </div>
              </div>

              {/* Systolic Blood Pressure */}
              <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Activity className="w-3.5 h-3.5 text-rose-600" />
                    Systolic BP (SBP) Threshold
                  </label>
                  <span className="text-[10px] text-rose-600 font-mono font-bold">&ge; {thresholds.systolicBpUrgent} mmHg</span>
                </div>
                <input
                  type="number"
                  step="5"
                  min="130"
                  max="240"
                  value={thresholds.systolicBpUrgent}
                  onChange={(e) =>
                    setThresholds({ ...thresholds, systolicBpUrgent: parseInt(e.target.value) || 160 })
                  }
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono font-bold focus:ring-2 focus:ring-rose-500 focus:outline-none"
                />
                <span className="text-[10px] text-slate-400 block">Triggers hypertensive urgency/crisis alert</span>
              </div>

              {/* Diastolic Blood Pressure */}
              <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800">Diastolic BP (DBP) Threshold</label>
                  <span className="text-[10px] text-rose-600 font-mono font-bold">&ge; {thresholds.diastolicBpUrgent} mmHg</span>
                </div>
                <input
                  type="number"
                  step="5"
                  min="80"
                  max="150"
                  value={thresholds.diastolicBpUrgent}
                  onChange={(e) =>
                    setThresholds({ ...thresholds, diastolicBpUrgent: parseInt(e.target.value) || 100 })
                  }
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono font-bold focus:ring-2 focus:ring-rose-500 focus:outline-none"
                />
              </div>

              {/* Fasting Blood Glucose */}
              <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Droplet className="w-3.5 h-3.5 text-amber-600" />
                    Blood Glucose Upper Limit
                  </label>
                  <span className="text-[10px] text-amber-600 font-mono font-bold">&ge; {thresholds.glucoseFastingUrgent} mg/dL</span>
                </div>
                <input
                  type="number"
                  step="10"
                  min="140"
                  max="400"
                  value={thresholds.glucoseFastingUrgent}
                  onChange={(e) =>
                    setThresholds({ ...thresholds, glucoseFastingUrgent: parseInt(e.target.value) || 200 })
                  }
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono font-bold focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              {/* HbA1c Cutoff */}
              <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800">HbA1c Glycemic Crisis Cutoff</label>
                  <span className="text-[10px] text-amber-600 font-mono font-bold">&ge; {thresholds.hba1cUrgent}%</span>
                </div>
                <input
                  type="number"
                  step="0.1"
                  min="7.0"
                  max="14.0"
                  value={thresholds.hba1cUrgent}
                  onChange={(e) =>
                    setThresholds({ ...thresholds, hba1cUrgent: parseFloat(e.target.value) || 9.0 })
                  }
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono font-bold focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              {/* Serum Creatinine */}
              <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800">Serum Creatinine Cutoff</label>
                  <span className="text-[10px] text-rose-600 font-mono font-bold">&ge; {thresholds.creatinineUrgent} mg/dL</span>
                </div>
                <input
                  type="number"
                  step="0.1"
                  min="1.0"
                  max="5.0"
                  value={thresholds.creatinineUrgent}
                  onChange={(e) =>
                    setThresholds({ ...thresholds, creatinineUrgent: parseFloat(e.target.value) || 1.8 })
                  }
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono font-bold focus:ring-2 focus:ring-rose-500 focus:outline-none"
                />
              </div>

              {/* SpO2 Oxygen Saturation */}
              <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800">SpO₂ Hypoxemia Cutoff</label>
                  <span className="text-[10px] text-rose-600 font-mono font-bold">&le; {thresholds.oxygenSaturationLowUrgent}%</span>
                </div>
                <input
                  type="number"
                  step="1"
                  min="85"
                  max="97"
                  value={thresholds.oxygenSaturationLowUrgent}
                  onChange={(e) =>
                    setThresholds({ ...thresholds, oxygenSaturationLowUrgent: parseInt(e.target.value) || 92 })
                  }
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono font-bold focus:ring-2 focus:ring-rose-500 focus:outline-none"
                />
              </div>

              {/* eGFR Critical Low */}
              <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800">eGFR Critical Renal Low</label>
                  <span className="text-[10px] text-rose-600 font-mono font-bold">&le; {thresholds.egfrCriticalLow} mL/min</span>
                </div>
                <input
                  type="number"
                  step="5"
                  min="15"
                  max="60"
                  value={thresholds.egfrCriticalLow}
                  onChange={(e) =>
                    setThresholds({ ...thresholds, egfrCriticalLow: parseInt(e.target.value) || 30 })
                  }
                  className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-mono font-bold focus:ring-2 focus:ring-rose-500 focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Behavior Toggles */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-slate-800 block">
                  Automatic 'URGENT' Badge Activation
                </span>
                <span className="text-[11px] text-slate-500">
                  Immediately paints the patient card and header with a pulsing red 'URGENT' indicator badge when triggered.
                </span>
              </div>
              <input
                type="checkbox"
                checked={thresholds.autoTriggerUrgentBadge}
                onChange={(e) => setThresholds({ ...thresholds, autoTriggerUrgentBadge: e.target.checked })}
                className="w-4 h-4 accent-rose-600 rounded cursor-pointer"
              />
            </div>

            <div className="flex items-center justify-between border-t border-slate-200 pt-3">
              <div>
                <span className="text-xs font-bold text-slate-800 block">
                  Auditory Clinical Alert Chime
                </span>
                <span className="text-[11px] text-slate-500">
                  Play harmonic chime tone when new critical telemetry inflow breaches these thresholds.
                </span>
              </div>
              <input
                type="checkbox"
                checked={thresholds.audioAlertOnCritical}
                onChange={(e) => setThresholds({ ...thresholds, audioAlertOnCritical: e.target.checked })}
                className="w-4 h-4 accent-rose-600 rounded cursor-pointer"
              />
            </div>
          </div>

          {/* Live Preview Testing against active patient */}
          {currentRecord && (
            <div className="bg-slate-900 text-white p-4 rounded-xl border border-slate-800 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5 text-cyan-400" />
                  Live Threshold Test: {currentRecord.demographics.fullName} ({currentRecord.demographics.patientId})
                </span>
                {previewResult.hasUrgentAlert ? (
                  <span className="bg-rose-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 animate-pulse">
                    <AlertTriangle className="w-3 h-3" />
                    URGENT BADGE TRIGGERED
                  </span>
                ) : (
                  <span className="bg-emerald-500/20 text-emerald-300 text-[10px] font-bold px-2 py-0.5 rounded-full">
                    Within Configured Safe Thresholds
                  </span>
                )}
              </div>
              {previewResult.triggeredAlerts.length > 0 && (
                <div className="mt-2 space-y-1">
                  {previewResult.triggeredAlerts.map((alert, idx) => (
                    <div key={idx} className="text-[11px] text-rose-300 font-mono flex items-center gap-1.5">
                      <span className="text-rose-500 font-bold">•</span>
                      <span>{alert}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="bg-slate-100 px-5 py-3.5 border-t border-slate-200 flex items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            onClick={handleResetDefaults}
            className="px-3 py-1.5 text-slate-600 hover:text-slate-900 text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset to ACC/AHA Defaults</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 rounded-xl bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-bold transition-all cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              id="btn-save-lab-alert-preferences"
              onClick={handleSave}
              className="px-5 py-1.5 rounded-xl bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-700 hover:to-amber-700 text-white text-xs font-bold shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Save Alert Preferences</span>
            </button>
          </div>
        </div>
      </div>

      {/* Save Toast */}
      {saveToast && (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-50 bg-emerald-900 text-white px-5 py-3 rounded-2xl shadow-2xl border border-emerald-500/60 flex items-center gap-2 text-xs font-bold">
          <Check className="w-4 h-4 text-emerald-400" />
          <span>Laboratory alert preferences saved & applied across CDS dashboards!</span>
        </div>
      )}
    </div>
  );
};
