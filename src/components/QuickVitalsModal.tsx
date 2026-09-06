import React, { useState, useEffect, useMemo } from 'react';
import {
  PatientAssessmentRecord,
  VitalSigns,
  MeasurementSource,
} from '../types/clinical';
import {
  X,
  Activity,
  Heart,
  Droplets,
  TrendingUp,
  AlertTriangle,
  AlertOctagon,
  CheckCircle2,
  Clock,
  ShieldCheck,
  Zap,
  Info,
  Thermometer,
  Wind,
  FlaskConical,
  Sparkles,
  Bluetooth,
  Radio,
} from 'lucide-react';
import {
  analyzeVitalsDeviation,
  autoUpdatePatientTriage,
  detectPatientCondition,
} from '../services/automatedTriageMonitor';
import { CopyPatientIdButton } from './CopyPatientIdButton';
import { BluetoothDeviceScanner } from './BluetoothDeviceScanner';

export interface QuickVitalsModalProps {
  isOpen: boolean;
  onClose: () => void;
  patient: PatientAssessmentRecord | null;
  onSave: (updatedRecord: PatientAssessmentRecord, escalationNotice?: string) => void;
}

export const QuickVitalsModal: React.FC<QuickVitalsModalProps> = ({
  isOpen,
  onClose,
  patient,
  onSave,
}) => {
  if (!isOpen || !patient) return null;

  const currentVitals = patient.vitals;

  const [systolicBp, setSystolicBp] = useState<number | ''>(currentVitals.systolicBp || 130);
  const [diastolicBp, setDiastolicBp] = useState<number | ''>(currentVitals.diastolicBp || 80);
  const [heartRate, setHeartRate] = useState<number | ''>(currentVitals.heartRate || 75);
  const [respiratoryRate, setRespiratoryRate] = useState<number | ''>(currentVitals.respiratoryRate || 16);
  const [oxygenSaturation, setOxygenSaturation] = useState<number | ''>(currentVitals.oxygenSaturation || 98);
  const [temperatureC, setTemperatureC] = useState<number | ''>(currentVitals.temperatureC || 37.0);
  const [bloodGlucose, setBloodGlucose] = useState<number | ''>(
    currentVitals.bloodGlucoseMgDl || patient.labs?.glucoseFastingMgDl || 110
  );
  const [measurementSource, setMeasurementSource] = useState<MeasurementSource>(
    currentVitals.measurementSource || 'HOSPITAL_DEVICE'
  );
  const [bedsideNote, setBedsideNote] = useState<string>('');
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [showBluetoothScanner, setShowBluetoothScanner] = useState<boolean>(false);
  const [pairedMonitorName, setPairedMonitorName] = useState<string | null>(null);

  // Sync state when patient prop changes
  useEffect(() => {
    if (patient) {
      setSystolicBp(patient.vitals.systolicBp || 130);
      setDiastolicBp(patient.vitals.diastolicBp || 80);
      setHeartRate(patient.vitals.heartRate || 75);
      setRespiratoryRate(patient.vitals.respiratoryRate || 16);
      setOxygenSaturation(patient.vitals.oxygenSaturation || 98);
      setTemperatureC(patient.vitals.temperatureC || 37.0);
      setBloodGlucose(patient.vitals.bloodGlucoseMgDl || patient.labs?.glucoseFastingMgDl || 110);
      setMeasurementSource(patient.vitals.measurementSource || 'HOSPITAL_DEVICE');
      setBedsideNote('');
      setPairedMonitorName(null);
    }
  }, [patient?.demographics.patientId]);

  const handleApplyBluetoothVitals = (
    incoming: Partial<VitalSigns>,
    deviceName: string,
    source: MeasurementSource
  ) => {
    if (typeof incoming.systolicBp === 'number') setSystolicBp(incoming.systolicBp);
    if (typeof incoming.diastolicBp === 'number') setDiastolicBp(incoming.diastolicBp);
    if (typeof incoming.heartRate === 'number') setHeartRate(incoming.heartRate);
    if (typeof incoming.respiratoryRate === 'number') setRespiratoryRate(incoming.respiratoryRate);
    if (typeof incoming.oxygenSaturation === 'number') setOxygenSaturation(incoming.oxygenSaturation);
    if (typeof incoming.temperatureC === 'number') setTemperatureC(incoming.temperatureC);
    if (typeof incoming.bloodGlucoseMgDl === 'number') setBloodGlucose(incoming.bloodGlucoseMgDl);
    setMeasurementSource(source);
    setPairedMonitorName(deviceName);
    setBedsideNote((prev) =>
      prev
        ? `${prev} | Auto-populated via BLE from ${deviceName}`
        : `Auto-populated via BLE from ${deviceName}`
    );
  };

  // Detected patient clinical condition
  const detectedCondition = useMemo(() => {
    return detectPatientCondition(patient);
  }, [patient]);

  // Simulated candidate record for real-time live deviation preview
  const previewRecord: PatientAssessmentRecord = useMemo(() => {
    return {
      ...patient,
      vitals: {
        ...patient.vitals,
        systolicBp: typeof systolicBp === 'number' ? systolicBp : undefined,
        diastolicBp: typeof diastolicBp === 'number' ? diastolicBp : undefined,
        heartRate: typeof heartRate === 'number' ? heartRate : undefined,
        respiratoryRate: typeof respiratoryRate === 'number' ? respiratoryRate : undefined,
        oxygenSaturation: typeof oxygenSaturation === 'number' ? oxygenSaturation : undefined,
        temperatureC: typeof temperatureC === 'number' ? temperatureC : undefined,
        bloodGlucoseMgDl: typeof bloodGlucose === 'number' ? bloodGlucose : undefined,
      },
    };
  }, [patient, systolicBp, diastolicBp, heartRate, respiratoryRate, oxygenSaturation, temperatureC, bloodGlucose]);

  // Live deviation analysis
  const deviationAnalysis = useMemo(() => {
    return analyzeVitalsDeviation(previewRecord);
  }, [previewRecord]);

  const currentTriageLevel = patient.assessmentResult?.triage.level || 'LEVEL_4_ROUTINE';
  const willAutoEscalate =
    deviationAnalysis.isDeviated &&
    (deviationAnalysis.recommendedTriageLevel === 'LEVEL_1_EMERGENCY' ||
      deviationAnalysis.recommendedTriageLevel === 'LEVEL_2_URGENT') &&
    currentTriageLevel !== 'LEVEL_1_EMERGENCY';

  const handleSaveBedsideVitals = () => {
    setIsSaving(true);

    const now = new Date().toISOString();

    const newVitals: VitalSigns = {
      systolicBp: typeof systolicBp === 'number' ? systolicBp : undefined,
      diastolicBp: typeof diastolicBp === 'number' ? diastolicBp : undefined,
      heartRate: typeof heartRate === 'number' ? heartRate : undefined,
      respiratoryRate: typeof respiratoryRate === 'number' ? respiratoryRate : undefined,
      oxygenSaturation: typeof oxygenSaturation === 'number' ? oxygenSaturation : undefined,
      temperatureC: typeof temperatureC === 'number' ? temperatureC : undefined,
      bloodGlucoseMgDl: typeof bloodGlucose === 'number' ? bloodGlucose : undefined,
      measurementSource,
      qualityFlag: 'VALID',
      measurementTime: now,
    };

    // Push previous vitals into vitalsHistory
    const updatedHistory: VitalSigns[] = [
      currentVitals,
      ...(patient.vitalsHistory || []),
    ];

    const recordWithNewVitals: PatientAssessmentRecord = {
      ...patient,
      vitals: newVitals,
      vitalsHistory: updatedHistory,
    };

    // Execute automated triage monitor
    const monitorResult = autoUpdatePatientTriage(recordWithNewVitals, 'BEDSIDE_QUICK_VITALS');

    let escalationNotice: string | undefined;
    if (monitorResult.escalated) {
      escalationNotice = `⚡ Automated Triage Monitor: Auto-escalated to ${monitorResult.newLevel} for ${patient.demographics.fullName} due to ${monitorResult.reason}`;
    }

    onSave(monitorResult.updatedRecord, escalationNotice);
    setIsSaving(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div
        id="quick-vitals-modal-content"
        className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-2xl w-full overflow-hidden max-h-[92vh] flex flex-col"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-5 flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 border border-indigo-400/40 flex items-center justify-center text-indigo-300">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider bg-indigo-500/30 text-indigo-300 px-2 py-0.5 rounded border border-indigo-400/30">
                  Bedside Fast-Track
                </span>
                <span className="text-xs text-slate-400 font-mono">
                  {patient.demographics.age}Y • {patient.demographics.sex}
                </span>
              </div>
              <h3 className="text-base font-black text-white mt-0.5 flex items-center gap-2">
                <span>Record Quick Vitals: {patient.demographics.fullName}</span>
              </h3>
              <div className="flex items-center gap-2 text-xs text-slate-300 mt-1">
                <CopyPatientIdButton patientId={patient.demographics.patientId} />
                <span>• Current Triage:</span>
                <span className="font-bold text-amber-300">
                  {patient.assessmentResult?.triage.levelName || patient.assessmentResult?.triage.level}
                </span>
              </div>
            </div>
          </div>

          <button
            type="button"
            id="btn-close-quick-vitals-modal"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-xl hover:bg-white/10 transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {/* Patient Condition & Physiological Target Safety Envelope */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-700 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-indigo-600" />
                Active Clinical Protocol Profile:
              </span>
              <span className="font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-200 text-[11px]">
                {detectedCondition.displayName}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Target Safety Limits: SBP {detectedCondition.normalRange.sbp[0]}-{detectedCondition.normalRange.sbp[1]} mmHg • HR {detectedCondition.normalRange.hr[0]}-{detectedCondition.normalRange.hr[1]} bpm • SpO₂ ≥ {detectedCondition.normalRange.spo2[0]}%. Vitals exceeding protocol redlines will automatically escalate triage priority in the registry.
            </p>
          </div>

          {/* Real-Time Live Automated Triage Trigger Warning */}
          {willAutoEscalate && (
            <div className="bg-red-50 border-2 border-red-400/80 rounded-2xl p-4 flex items-start gap-3 animate-pulse">
              <Zap className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black uppercase tracking-wider bg-red-600 text-white px-2 py-0.5 rounded">
                    Auto-Escalation Will Trigger
                  </span>
                  <strong className="text-xs font-bold text-red-950">
                    Will Auto-Update to {deviationAnalysis.recommendedTriageLevel}
                  </strong>
                </div>
                <p className="text-xs text-red-800 leading-relaxed font-medium">
                  {deviationAnalysis.clinicalRationale}
                </p>
              </div>
            </div>
          )}

          {/* Bluetooth Clinical Monitor Scanner Banner */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200/80 rounded-2xl p-3.5 flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-2xs">
                <Bluetooth className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-blue-950">Bluetooth Device Scanner</span>
                  {pairedMonitorName ? (
                    <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.2 rounded-full border border-emerald-300 flex items-center gap-1">
                      <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600" />
                      <span>{pairedMonitorName}</span>
                    </span>
                  ) : (
                    <span className="bg-blue-100 text-blue-800 text-[10px] font-medium px-2 py-0.2 rounded-full">
                      BLE GATT Auto-Capture
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-blue-700/80">
                  {pairedMonitorName
                    ? 'Wireless telemetry streaming. Click to re-pair or change monitor.'
                    : 'Pair Philips, Omron, Welch Allyn, or Masimo monitors to auto-fill vitals.'}
                </p>
              </div>
            </div>

            <button
              type="button"
              id="btn-open-bluetooth-monitor-scanner"
              onClick={() => setShowBluetoothScanner(true)}
              className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-2xs cursor-pointer"
            >
              <Radio className="w-3.5 h-3.5" />
              <span>{pairedMonitorName ? 'Manage Monitor' : 'Scan Bluetooth Monitor'}</span>
            </button>
          </div>

          {/* Quick Input Numeric Form */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Systolic BP */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                <span className="flex items-center gap-1">
                  <Heart className="w-3.5 h-3.5 text-rose-600" /> Systolic BP (mmHg)
                </span>
                <span className="text-[10px] text-slate-400 font-mono">Norm: 100-140</span>
              </label>
              <input
                id="input-quick-sbp"
                type="number"
                min="50"
                max="280"
                value={systolicBp}
                onChange={(e) => setSystolicBp(e.target.value === '' ? '' : +e.target.value)}
                placeholder="120"
                className={`w-full px-3.5 py-2 rounded-xl text-sm font-bold font-mono border focus:outline-none focus:ring-2 ${
                  typeof systolicBp === 'number' && (systolicBp >= 180 || systolicBp <= 85)
                    ? 'border-red-500 bg-red-50/50 text-red-900 focus:ring-red-500'
                    : 'border-slate-200 bg-white text-slate-900 focus:ring-indigo-500'
                }`}
              />
            </div>

            {/* Diastolic BP */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                <span className="flex items-center gap-1">
                  <Heart className="w-3.5 h-3.5 text-rose-600" /> Diastolic BP (mmHg)
                </span>
                <span className="text-[10px] text-slate-400 font-mono">Norm: 60-90</span>
              </label>
              <input
                id="input-quick-dbp"
                type="number"
                min="30"
                max="180"
                value={diastolicBp}
                onChange={(e) => setDiastolicBp(e.target.value === '' ? '' : +e.target.value)}
                placeholder="80"
                className="w-full px-3.5 py-2 rounded-xl text-sm font-bold font-mono border border-slate-200 bg-white text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            {/* Heart Rate */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                <span className="flex items-center gap-1">
                  <Activity className="w-3.5 h-3.5 text-indigo-600" /> Heart Rate (bpm)
                </span>
                <span className="text-[10px] text-slate-400 font-mono">Norm: 60-100</span>
              </label>
              <input
                id="input-quick-hr"
                type="number"
                min="30"
                max="220"
                value={heartRate}
                onChange={(e) => setHeartRate(e.target.value === '' ? '' : +e.target.value)}
                placeholder="75"
                className={`w-full px-3.5 py-2 rounded-xl text-sm font-bold font-mono border focus:outline-none focus:ring-2 ${
                  typeof heartRate === 'number' && (heartRate >= 125 || heartRate <= 42)
                    ? 'border-red-500 bg-red-50/50 text-red-900 focus:ring-red-500'
                    : 'border-slate-200 bg-white text-slate-900 focus:ring-indigo-500'
                }`}
              />
            </div>

            {/* Oxygen Saturation (SpO2) */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                <span className="flex items-center gap-1">
                  <Droplets className="w-3.5 h-3.5 text-teal-600" /> Oxygen Saturation (%)
                </span>
                <span className="text-[10px] text-slate-400 font-mono">Norm: 95-100%</span>
              </label>
              <input
                id="input-quick-spo2"
                type="number"
                min="50"
                max="100"
                value={oxygenSaturation}
                onChange={(e) => setOxygenSaturation(e.target.value === '' ? '' : +e.target.value)}
                placeholder="98"
                className={`w-full px-3.5 py-2 rounded-xl text-sm font-bold font-mono border focus:outline-none focus:ring-2 ${
                  typeof oxygenSaturation === 'number' && oxygenSaturation < 92
                    ? 'border-red-500 bg-red-50/50 text-red-900 focus:ring-red-500'
                    : 'border-slate-200 bg-white text-slate-900 focus:ring-indigo-500'
                }`}
              />
            </div>

            {/* Respiratory Rate */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                <span className="flex items-center gap-1">
                  <Wind className="w-3.5 h-3.5 text-emerald-600" /> Respiratory Rate (/min)
                </span>
                <span className="text-[10px] text-slate-400 font-mono">Norm: 12-20</span>
              </label>
              <input
                id="input-quick-rr"
                type="number"
                min="4"
                max="60"
                value={respiratoryRate}
                onChange={(e) => setRespiratoryRate(e.target.value === '' ? '' : +e.target.value)}
                placeholder="16"
                className="w-full px-3.5 py-2 rounded-xl text-sm font-bold font-mono border border-slate-200 bg-white text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            {/* Body Temperature */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                <span className="flex items-center gap-1">
                  <Thermometer className="w-3.5 h-3.5 text-amber-600" /> Temperature (°C)
                </span>
                <span className="text-[10px] text-slate-400 font-mono">Norm: 36.5-37.5</span>
              </label>
              <input
                id="input-quick-temp"
                type="number"
                step="0.1"
                min="32"
                max="43"
                value={temperatureC}
                onChange={(e) => setTemperatureC(e.target.value === '' ? '' : +e.target.value)}
                placeholder="37.0"
                className="w-full px-3.5 py-2 rounded-xl text-sm font-bold font-mono border border-slate-200 bg-white text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            {/* Blood Glucose */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                <span className="flex items-center gap-1">
                  <FlaskConical className="w-3.5 h-3.5 text-purple-600" /> Blood Glucose (mg/dL)
                </span>
                <span className="text-[10px] text-slate-400 font-mono">Norm: 80-140</span>
              </label>
              <input
                id="input-quick-glucose"
                type="number"
                min="20"
                max="800"
                value={bloodGlucose}
                onChange={(e) => setBloodGlucose(e.target.value === '' ? '' : +e.target.value)}
                placeholder="110"
                className="w-full px-3.5 py-2 rounded-xl text-sm font-bold font-mono border border-slate-200 bg-white text-slate-900 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            {/* Device Source */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700 block">Measurement Device Source</label>
              <select
                id="select-quick-vitals-source"
                value={measurementSource}
                onChange={(e) => setMeasurementSource(e.target.value as MeasurementSource)}
                className="w-full px-3.5 py-2 rounded-xl text-xs font-bold border border-slate-200 bg-white text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              >
                <option value="HOSPITAL_DEVICE">Hospital Bedside Monitor (Calibrated)</option>
                <option value="CLINIC_DEVICE">Emergency Triage Stand Device</option>
                <option value="WEARABLE">Continuous Telemetry Sensor</option>
                <option value="HOME_DEVICE">Portable Point-of-Care Kit</option>
              </select>
            </div>
          </div>

          {/* Optional Bedside Clinician Note */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-slate-700 block">
              Bedside Observation Note (Optional)
            </label>
            <input
              id="input-quick-bedside-note"
              type="text"
              value={bedsideNote}
              onChange={(e) => setBedsideNote(e.target.value)}
              placeholder="e.g., Post-nebulization check, patient resting comfortably in bed 4"
              className="w-full px-3.5 py-2 rounded-xl text-xs border border-slate-200 bg-white text-slate-800 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-3">
          <button
            type="button"
            id="btn-cancel-quick-vitals"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-200/80 transition-all cursor-pointer"
          >
            Cancel
          </button>

          <button
            type="button"
            id="btn-save-quick-vitals"
            onClick={handleSaveBedsideVitals}
            disabled={isSaving}
            className="px-5 py-2 rounded-xl text-xs font-black text-white bg-gradient-to-r from-indigo-600 via-blue-600 to-indigo-700 hover:from-indigo-700 hover:to-blue-700 transition-all shadow-md flex items-center gap-2 cursor-pointer"
          >
            <Activity className="w-4 h-4" />
            <span>{isSaving ? 'Applying Telemetry...' : 'Save & Apply Bedside Vitals'}</span>
          </button>
        </div>
      </div>

      {/* Bluetooth Device Scanner Overlay Modal */}
      <BluetoothDeviceScanner
        isOpen={showBluetoothScanner}
        onClose={() => setShowBluetoothScanner(false)}
        onApplyVitals={handleApplyBluetoothVitals}
        patientName={patient.demographics.fullName}
        patientId={patient.demographics.patientId}
      />
    </div>
  );
};
