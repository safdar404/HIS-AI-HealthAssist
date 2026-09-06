import React, { useState } from 'react';
import {
  AlertOctagon,
  AlertTriangle,
  ShieldAlert,
  CheckCircle2,
  Clock,
  Activity,
  Heart,
  Droplets,
  Stethoscope,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  ArrowRight,
  Zap,
  Info,
  Flame,
  FileWarning,
} from 'lucide-react';
import { PatientAssessmentRecord, RedFlagAlert, TriageLevel } from '../types/clinical';

export interface PatientTriageRedFlagSummaryCardProps {
  record: PatientAssessmentRecord;
  onJumpToPrescriptions?: () => void;
  onJumpToLabs?: () => void;
  onOpenReferral?: () => void;
}

export const PatientTriageRedFlagSummaryCard: React.FC<PatientTriageRedFlagSummaryCardProps> = ({
  record,
  onJumpToPrescriptions,
  onJumpToLabs,
  onOpenReferral,
}) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(true);
  const [isAcknowledged, setIsAcknowledged] = useState<boolean>(false);

  const assessment = record.assessmentResult;
  const triage = assessment?.triage;
  const triageLevel: TriageLevel = triage?.level || 'LEVEL_4_ROUTINE';
  const isEmergency = triageLevel === 'LEVEL_1_EMERGENCY' || assessment?.isEmergency;
  const isUrgent = triageLevel === 'LEVEL_2_URGENT';
  const isPriority = triageLevel === 'LEVEL_3_PRIORITY';

  // Extract explicit red flags and acute vitals triggers
  const redFlags: RedFlagAlert[] = assessment?.redFlags || [];

  // Vitals checks
  const sbp = record.vitals.systolicBp || 0;
  const dbp = record.vitals.diastolicBp || 0;
  const spo2 = record.vitals.oxygenSaturation || 0;
  const hr = record.vitals.heartRate || 0;
  const glucose = record.vitals.bloodGlucoseMgDl || record.labs.glucoseFastingMgDl || 0;
  const isTroponinPos = record.labs.troponinPositive;

  // Secondary acute conditions detected
  const acuteVitalsAlerts: string[] = [];
  if (sbp >= 180 || dbp >= 120) {
    acuteVitalsAlerts.push(`Hypertensive Crisis (BP ${sbp}/${dbp} mmHg — Target organ threat)`);
  } else if (sbp >= 160 || dbp >= 100) {
    acuteVitalsAlerts.push(`Stage 2 Severe Hypertension (${sbp}/${dbp} mmHg)`);
  }

  if (spo2 > 0 && spo2 < 90) {
    acuteVitalsAlerts.push(`Severe Hypoxemia (SpO2 ${spo2}% on room air)`);
  } else if (spo2 > 0 && spo2 < 94) {
    acuteVitalsAlerts.push(`Sub-optimal Oxygen Saturation (SpO2 ${spo2}%)`);
  }

  if (isTroponinPos) {
    acuteVitalsAlerts.push('Serum Troponin-I Positive (Active Myocardial Injury)');
  }

  if (glucose >= 350) {
    acuteVitalsAlerts.push(`Severe Hyperglycemia (${glucose} mg/dL — Evaluate for DKA/HHS)`);
  } else if (glucose > 0 && glucose < 54) {
    acuteVitalsAlerts.push(`Critical Hypoglycemia (${glucose} mg/dL — STAT Glucose Required)`);
  }

  if (hr > 130) {
    acuteVitalsAlerts.push(`Marked Tachycardia (${hr} bpm)`);
  } else if (hr > 0 && hr < 45) {
    acuteVitalsAlerts.push(`Marked Bradycardia (${hr} bpm)`);
  }

  const hasAnyRedFlag = redFlags.length > 0 || isEmergency || isTroponinPos || acuteVitalsAlerts.length > 0;

  // Visual styling presets
  const cardTheme = isEmergency
    ? {
        border: 'border-red-400/80',
        bg: 'bg-gradient-to-r from-red-950 via-slate-900 to-red-950 text-white',
        badgeBg: 'bg-red-500 text-white',
        pulseColor: 'bg-red-500',
        subText: 'text-red-200',
        titleColor: 'text-red-400',
        highlightBorder: 'border-red-500/40',
        urgencyLabel: 'LEVEL 1 — IMMEDIATE EMERGENCY RESUSCITATION',
        responseTime: '< 15 Minutes Bedside Evaluation',
      }
    : isUrgent
    ? {
        border: 'border-orange-300',
        bg: 'bg-gradient-to-r from-orange-950/90 via-slate-900 to-slate-950 text-white',
        badgeBg: 'bg-orange-500 text-white',
        pulseColor: 'bg-orange-400',
        subText: 'text-orange-200',
        titleColor: 'text-orange-300',
        highlightBorder: 'border-orange-500/40',
        urgencyLabel: 'LEVEL 2 — URGENT CLINICAL EVALUATION',
        responseTime: '< 30 Minutes Physician Review',
      }
    : isPriority
    ? {
        border: 'border-amber-300',
        bg: 'bg-gradient-to-r from-slate-900 via-slate-900 to-amber-950/50 text-white',
        badgeBg: 'bg-amber-500 text-slate-950',
        pulseColor: 'bg-amber-400',
        subText: 'text-amber-200',
        titleColor: 'text-amber-300',
        highlightBorder: 'border-amber-500/40',
        urgencyLabel: 'LEVEL 3 — PRIORITY AMBULATORY EVALUATION',
        responseTime: '< 60 Minutes Clinical Review',
      }
    : {
        border: 'border-slate-200',
        bg: 'bg-white text-slate-800',
        badgeBg: 'bg-emerald-100 text-emerald-800 border border-emerald-300',
        pulseColor: 'bg-emerald-400',
        subText: 'text-slate-500',
        titleColor: 'text-cyan-800',
        highlightBorder: 'border-slate-200',
        urgencyLabel: 'LEVEL 4 — ROUTINE / STABLE OUTPATIENT',
        responseTime: 'Standard Protocol Interval',
      };

  return (
    <div
      id="patient-triage-red-flag-summary-card"
      className={`rounded-2xl border ${cardTheme.border} shadow-md overflow-hidden transition-all`}
    >
      {/* Top Banner Ribbon */}
      <div className={`p-3.5 sm:p-4 ${cardTheme.bg} flex flex-col md:flex-row md:items-center justify-between gap-3`}>
        <div className="flex items-start sm:items-center gap-3">
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 font-bold ${
              isEmergency
                ? 'bg-red-600 text-white shadow-lg animate-pulse'
                : isUrgent
                ? 'bg-orange-500 text-white shadow-md'
                : isPriority
                ? 'bg-amber-500 text-slate-950 shadow-md'
                : 'bg-emerald-600 text-white'
            }`}
          >
            {isEmergency ? (
              <AlertOctagon className="w-6 h-6" />
            ) : hasAnyRedFlag ? (
              <ShieldAlert className="w-6 h-6" />
            ) : (
              <CheckCircle2 className="w-6 h-6" />
            )}
          </div>

          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${cardTheme.badgeBg}`}>
                {cardTheme.urgencyLabel}
              </span>
              <span className={`text-[11px] font-mono flex items-center gap-1 ${cardTheme.subText}`}>
                <Clock className="w-3.5 h-3.5" />
                Target Window: <strong>{cardTheme.responseTime}</strong>
              </span>
              {isAcknowledged && (
                <span className="text-[10px] bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 px-2 py-0.2 rounded-full font-bold">
                  ✓ Clinician Acknowledged
                </span>
              )}
            </div>

            <div className="text-sm font-extrabold mt-1 flex items-center gap-2 flex-wrap">
              <span>
                {record.demographics.fullName} ({record.demographics.age}y / {record.demographics.sex})
              </span>
              <span className="text-xs opacity-75 font-normal">
                MRN: {record.demographics.mrn || record.demographics.patientId}
              </span>
              {hasAnyRedFlag ? (
                <span className="text-xs font-bold text-rose-300 bg-rose-950/80 border border-rose-600 px-2 py-0.2 rounded-md flex items-center gap-1">
                  <Flame className="w-3 h-3 text-rose-400 fill-rose-400" />
                  {redFlags.length + acuteVitalsAlerts.length} Flagged Risk Factors Active
                </span>
              ) : (
                <span className="text-xs font-bold text-emerald-300 bg-emerald-950/50 border border-emerald-600/50 px-2 py-0.2 rounded-md">
                  Vitals Hemodynamically Stable
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Action and Toggle Controls */}
        <div className="flex items-center gap-2 self-end md:self-center">
          {!isAcknowledged && hasAnyRedFlag && (
            <button
              type="button"
              id="btn-acknowledge-red-flags"
              onClick={() => setIsAcknowledged(true)}
              className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer flex items-center gap-1"
              title="Acknowledge clinical red-flag awareness"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Acknowledge</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white cursor-pointer transition-colors"
            title={isExpanded ? 'Collapse Summary Card' : 'Expand Summary Card'}
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Expanded Clinical Insights Body */}
      {isExpanded && (
        <div className="p-4 bg-slate-900 text-slate-100 border-t border-slate-800 space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            {/* Left Column: Triage Urgency & Vitals Snapshot (5 cols) */}
            <div className="lg:col-span-5 bg-slate-800/80 rounded-xl p-3.5 border border-slate-700/80 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-700 pb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Triage Urgency & Vital Signs</span>
                </span>
                <span className="text-[10px] font-mono text-cyan-300">
                  {triage?.levelName || 'Standard Triage'}
                </span>
              </div>

              {/* Triage Summary narrative */}
              <p className="text-xs text-slate-300 leading-relaxed">
                {triage?.summary ||
                  (isEmergency
                    ? 'Immediate resuscitation or high-acuity physician intervention required due to emergency threshold criteria.'
                    : 'Hemodynamic status evaluated at intake triage. Follow standard protocol surveillance.')}
              </p>

              {/* Vitals Telemetry Grid */}
              <div className="grid grid-cols-3 gap-2 pt-1">
                <div className="p-2 rounded-lg bg-slate-900/90 border border-slate-700/60 text-center">
                  <span className="text-[9px] uppercase font-bold text-slate-400 block">Blood Pressure</span>
                  <div
                    className={`text-xs font-black font-mono mt-0.5 ${
                      sbp >= 160 || dbp >= 100
                        ? 'text-rose-400'
                        : sbp >= 140 || dbp >= 90
                        ? 'text-amber-400'
                        : 'text-emerald-400'
                    }`}
                  >
                    {sbp}/{dbp}
                  </div>
                  <span className="text-[8px] text-slate-500">mmHg</span>
                </div>

                <div className="p-2 rounded-lg bg-slate-900/90 border border-slate-700/60 text-center">
                  <span className="text-[9px] uppercase font-bold text-slate-400 block">Pulse (HR)</span>
                  <div
                    className={`text-xs font-black font-mono mt-0.5 ${
                      hr > 100 || hr < 55 ? 'text-amber-400' : 'text-slate-200'
                    }`}
                  >
                    {hr || '—'}
                  </div>
                  <span className="text-[8px] text-slate-500">bpm</span>
                </div>

                <div className="p-2 rounded-lg bg-slate-900/90 border border-slate-700/60 text-center">
                  <span className="text-[9px] uppercase font-bold text-slate-400 block">Oxygen (SpO2)</span>
                  <div
                    className={`text-xs font-black font-mono mt-0.5 ${
                      spo2 > 0 && spo2 < 92
                        ? 'text-rose-400'
                        : spo2 > 0 && spo2 < 95
                        ? 'text-amber-400'
                        : 'text-cyan-300'
                    }`}
                  >
                    {spo2 ? `${spo2}%` : '—'}
                  </div>
                  <span className="text-[8px] text-slate-500">Room Air</span>
                </div>
              </div>

              {/* CVD 10-Yr & Diabetes Risk Score */}
              <div className="flex items-center justify-between text-xs bg-slate-900/60 p-2 rounded-lg border border-slate-800">
                <span className="text-slate-400 text-[11px]">10-Yr ASCVD Risk:</span>
                <span className="font-mono font-bold text-amber-400">
                  {((assessment?.risks.cardiovascular.riskScore || 0) * 100).toFixed(0)}% (
                  {assessment?.risks.cardiovascular.riskCategory || 'LOW'})
                </span>
              </div>
            </div>

            {/* Right Column: Primary Red-Flag Risks & Recommended Protocols (7 cols) */}
            <div className="lg:col-span-7 bg-slate-800/80 rounded-xl p-3.5 border border-slate-700/80 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-700 pb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-rose-300 flex items-center gap-1.5">
                  <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
                  <span>Primary Red-Flag Clinical Risks & Triggers</span>
                </span>
                <span className="text-[10px] bg-rose-900/70 text-rose-200 border border-rose-700 px-2 py-0.5 rounded-full font-mono font-bold">
                  {redFlags.length + acuteVitalsAlerts.length} Flagged Triggers
                </span>
              </div>

              {/* Red-Flag Alerts List */}
              {hasAnyRedFlag ? (
                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {/* Formal Rule-Based Red Flags from Risk Engine */}
                  {redFlags.map((rf, idx) => (
                    <div
                      key={rf.id || idx}
                      className="p-3 rounded-xl bg-rose-950/40 border border-rose-800/60 space-y-1.5"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-xs text-rose-200 flex items-center gap-1.5">
                          <span className="h-2 w-2 rounded-full bg-rose-500 animate-ping" />
                          <span>{rf.title}</span>
                        </span>
                        <span className="text-[9px] font-mono uppercase bg-rose-900 text-rose-100 px-1.5 py-0.5 rounded font-bold">
                          {rf.urgency}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-300 leading-snug">{rf.description}</p>
                      {rf.recommendedAction && (
                        <div className="text-[11px] text-amber-300 bg-amber-950/40 border border-amber-800/50 p-2 rounded-lg mt-1">
                          <strong className="text-amber-200">STAT Protocol:</strong> {rf.recommendedAction}
                        </div>
                      )}
                    </div>
                  ))}

                  {/* Secondary Acute Vitals Flags */}
                  {acuteVitalsAlerts.map((crit, idx) => (
                    <div
                      key={`crit-${idx}`}
                      className="p-2.5 rounded-xl bg-amber-950/30 border border-amber-800/60 flex items-center justify-between text-xs"
                    >
                      <div className="flex items-center gap-2 text-amber-200">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        <span className="font-semibold text-[11px]">{crit}</span>
                      </div>
                      <span className="text-[9px] font-mono bg-amber-900/80 text-amber-100 px-1.5 py-0.5 rounded">
                        Vital Threshold
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-4 rounded-xl bg-emerald-950/30 border border-emerald-800/40 text-center space-y-1.5">
                  <CheckCircle2 className="w-6 h-6 text-emerald-400 mx-auto" />
                  <div className="text-xs font-bold text-emerald-300">
                    No Critical Red-Flag Contraindications Detected
                  </div>
                  <p className="text-[11px] text-slate-400 max-w-md mx-auto">
                    Patient does not present with active hypertensive crisis, acute coronary syndrome indicators,
                    or respiratory distress. Proceed with standard clinical protocol.
                  </p>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-700/60 text-xs">
                <span className="text-[10px] text-slate-400">Direct Actions:</span>
                <div className="flex items-center gap-2">
                  {onJumpToPrescriptions && (
                    <button
                      type="button"
                      onClick={onJumpToPrescriptions}
                      className="px-2.5 py-1 bg-cyan-700 hover:bg-cyan-600 text-white rounded-lg text-[11px] font-bold transition-all cursor-pointer"
                    >
                      Review Rx & Meds →
                    </button>
                  )}
                  {onJumpToLabs && (
                    <button
                      type="button"
                      onClick={onJumpToLabs}
                      className="px-2.5 py-1 bg-purple-700 hover:bg-purple-600 text-white rounded-lg text-[11px] font-bold transition-all cursor-pointer"
                    >
                      Diagnostic Labs →
                    </button>
                  )}
                  {onOpenReferral && isEmergency && (
                    <button
                      type="button"
                      onClick={onOpenReferral}
                      className="px-2.5 py-1 bg-rose-700 hover:bg-rose-600 text-white rounded-lg text-[11px] font-bold transition-all cursor-pointer"
                    >
                      Tertiary Referral →
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
