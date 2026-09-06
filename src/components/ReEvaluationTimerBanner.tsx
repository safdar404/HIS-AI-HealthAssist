import React, { useState, useEffect, useRef } from 'react';
import {
  Clock,
  AlertTriangle,
  Bell,
  BellOff,
  Settings,
  ChevronRight,
  ShieldAlert,
  CheckCircle2,
  RefreshCw,
  Zap,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { PatientAssessmentRecord } from '../types/clinical';

interface ReEvaluationTimerBannerProps {
  assessments: PatientAssessmentRecord[];
  selectedAssessment: PatientAssessmentRecord | null;
  onSelectAssessment: (record: PatientAssessmentRecord) => void;
}

export interface ReEvalConfig {
  intervalMinutes: number; // e.g. 15, 30, 60
  audioEnabled: boolean;
  targetLevels: ('LEVEL_1_EMERGENCY' | 'LEVEL_2_URGENT' | 'LEVEL_3_PRIORITY')[];
}

const STORAGE_KEY_CONFIG = 'doctor_cds_reeval_config';
const STORAGE_KEY_SNOOZED = 'doctor_cds_reeval_snoozed';

export const ReEvaluationTimerBanner: React.FC<ReEvaluationTimerBannerProps> = ({
  assessments,
  selectedAssessment,
  onSelectAssessment,
}) => {
  const [config, setConfig] = useState<ReEvalConfig>(() => {
    const saved = localStorage.getItem(STORAGE_KEY_CONFIG);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        // ignore
      }
    }
    return {
      intervalMinutes: 120, // 2 hours default for Urgent vitals re-evaluation
      audioEnabled: true,
      targetLevels: ['LEVEL_1_EMERGENCY', 'LEVEL_2_URGENT', 'LEVEL_3_PRIORITY'],
    };
  });

  const [showSettingsModal, setShowSettingsModal] = useState<boolean>(false);
  const [now, setNow] = useState<number>(Date.now());
  const [snoozedUntil, setSnoozedUntil] = useState<Record<string, number>>({});
  const lastChimeTime = useRef<number>(0);

  // Save config changes
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_CONFIG, JSON.stringify(config));
  }, [config]);

  // Periodic clock update every 5 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      setNow(Date.now());
    }, 5000);
    return () => clearInterval(timer);
  }, []);

  // Web Audio chime generator for non-intrusive clinical tone
  const playClinicalChime = () => {
    if (!config.audioEnabled) return;
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5
      osc.frequency.exponentialRampToValueAtTime(880, audioCtx.currentTime + 0.15); // A5

      gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.8);

      osc.connect(gain);
      gain.connect(audioCtx.destination);

      osc.start();
      osc.stop(audioCtx.currentTime + 0.85);
    } catch (e) {
      // AudioContext unavailable or blocked by browser policy
    }
  };

  // Find all Level 2 & Level 3 patients awaiting re-evaluation
  const candidatePatients = assessments.filter((a) => {
    const triageLvl = a.assessmentResult?.triage.level;
    const isTargetLevel = triageLvl && config.targetLevels.includes(triageLvl as any);
    const isUnreviewed = !a.doctorReview;
    return isTargetLevel && isUnreviewed;
  });

  // Calculate status for each candidate
  const patientStatuses = candidatePatients.map((patient) => {
    const pid = patient.demographics.patientId;
    const rawTime =
      patient.vitals.measurementTime || patient.assessmentResult?.timestamp || new Date().toISOString();
    const intakeTimestamp = new Date(rawTime).getTime() || Date.now() - 3600000;
    const elapsedMinutes = Math.floor((now - intakeTimestamp) / 60000);
    const snoozeExpiry = snoozedUntil[pid] || 0;
    const isSnoozed = now < snoozeExpiry;

    const intervalMs = config.intervalMinutes * 60 * 1000;
    const isOverdue = now - intakeTimestamp > intervalMs && !isSnoozed;
    const minutesOverdue = Math.max(0, elapsedMinutes - config.intervalMinutes);
    const minutesRemaining = Math.max(0, config.intervalMinutes - elapsedMinutes);

    return {
      patient,
      intakeTimestamp,
      elapsedMinutes,
      isOverdue,
      minutesOverdue,
      minutesRemaining,
      isSnoozed,
    };
  });

  const overdueList = patientStatuses.filter((p) => p.isOverdue);
  const upcomingList = patientStatuses.filter((p) => !p.isOverdue && !p.isSnoozed);

  // Trigger chime periodically if any patients are overdue
  useEffect(() => {
    if (overdueList.length > 0 && config.audioEnabled) {
      // Limit chime to once every 2 minutes
      if (Date.now() - lastChimeTime.current > 120000) {
        playClinicalChime();
        lastChimeTime.current = Date.now();
      }
    }
  }, [overdueList.length, config.audioEnabled, now]);

  const handleSnooze = (patientId: string, extraMinutes: number = 15) => {
    setSnoozedUntil((prev) => ({
      ...prev,
      [patientId]: Date.now() + extraMinutes * 60 * 1000,
    }));
  };

  const handleSnoozeAll = (extraMinutes: number = 15) => {
    const updated: Record<string, number> = { ...snoozedUntil };
    overdueList.forEach((p) => {
      updated[p.patient.demographics.patientId] = Date.now() + extraMinutes * 60 * 1000;
    });
    setSnoozedUntil(updated);
  };

  if (candidatePatients.length === 0) {
    return null;
  }

  return (
    <>
      {/* Active Overdue Alert Banner */}
      {overdueList.length > 0 ? (
        <div
          id="reeval-overdue-alert-banner"
          className="bg-gradient-to-r from-rose-500 via-rose-600 to-amber-600 text-white p-3 sm:p-3.5 rounded-2xl shadow-lg border border-rose-400/50 flex flex-col md:flex-row md:items-center justify-between gap-3 animate-pulse"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center shrink-0 border border-white/30">
              <ShieldAlert className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-black tracking-wide uppercase bg-black/30 px-2 py-0.5 rounded-full border border-white/20">
                  ⚠️ Priority Re-Evaluation Alert
                </span>
                <span className="text-xs font-bold">
                  {overdueList.length} High-Risk Patient{overdueList.length > 1 ? 's' : ''} Overdue for Doctor Review ({config.intervalMinutes}m Interval)
                </span>
              </div>
              <p className="text-[11px] text-rose-100 mt-0.5">
                Level 2/3 clinical guidelines mandate prompt physician re-assessment to prevent deterioration.
              </p>
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex items-center gap-2 flex-wrap shrink-0">
            {/* Quick jump to first overdue patient */}
            {overdueList[0] && (
              <button
                type="button"
                id="btn-reeval-jump-first-patient"
                onClick={() => onSelectAssessment(overdueList[0].patient)}
                className="px-3 py-1.5 bg-white text-rose-900 hover:bg-rose-50 rounded-xl text-xs font-black shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <span>Re-Evaluate: {overdueList[0].patient.demographics.fullName}</span>
                <span className="bg-rose-100 text-rose-800 text-[10px] px-1.5 py-0.2 rounded font-mono font-bold">
                  +{overdueList[0].minutesOverdue}m overdue
                </span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            )}

            <button
              type="button"
              id="btn-reeval-snooze-all"
              onClick={() => handleSnoozeAll(15)}
              className="px-2.5 py-1.5 bg-black/30 hover:bg-black/40 text-white rounded-xl text-xs font-bold border border-white/20 transition-all cursor-pointer"
              title="Snooze reminder for 15 minutes"
            >
              Snooze (+15m)
            </button>

            <button
              type="button"
              id="btn-reeval-open-settings"
              onClick={() => setShowSettingsModal(true)}
              className="p-1.5 bg-white/20 hover:bg-white/30 rounded-xl text-white transition-all cursor-pointer"
              title="Configure Re-Evaluation Timers"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </div>
      ) : (
        /* Upcoming / Monitoring Status Strip */
        <div
          id="reeval-monitoring-status-strip"
          className="bg-slate-50 rounded-xl p-2.5 border border-slate-200 flex items-center justify-between flex-wrap gap-2 text-xs text-slate-600"
        >
          <div className="flex items-center gap-2">
            <Clock className="w-3.5 h-3.5 text-cyan-600" />
            <span>
              <strong>Recurring Triage Watchdog Active:</strong> {candidatePatients.length} Level 2/3 patient{candidatePatients.length > 1 ? 's' : ''} monitored (re-eval window: {config.intervalMinutes}m).
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => playClinicalChime()}
              className="text-[11px] text-slate-500 hover:text-slate-700 flex items-center gap-1 cursor-pointer"
              title="Test clinical alert chime"
            >
              {config.audioEnabled ? <Volume2 className="w-3 h-3 text-emerald-600" /> : <VolumeX className="w-3 h-3 text-slate-400" />}
              <span>{config.audioEnabled ? 'Sound On' : 'Muted'}</span>
            </button>

            <button
              type="button"
              onClick={() => setShowSettingsModal(true)}
              className="text-[11px] font-bold text-cyan-700 hover:text-cyan-800 underline cursor-pointer flex items-center gap-1"
            >
              <Settings className="w-3 h-3" />
              <span>Interval Settings</span>
            </button>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {showSettingsModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-2xl border border-slate-200 space-y-4 animate-fadeIn">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-cyan-600 text-white flex items-center justify-center">
                  <Clock className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Recurring Re-Evaluation Timer Settings
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Automated reminders to prevent oversight of high-risk cases.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowSettingsModal(false)}
                className="text-slate-400 hover:text-slate-600 font-bold p-1"
              >
                ✕
              </button>
            </div>

            {/* Interval Selection */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 block">
                Re-Evaluation Interval (Minutes)
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[15, 30, 60, 90, 120, 180].map((mins) => (
                  <button
                    key={mins}
                    type="button"
                    onClick={() => setConfig((prev) => ({ ...prev, intervalMinutes: mins }))}
                    className={`py-2 px-3 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                      config.intervalMinutes === mins
                        ? 'bg-cyan-600 text-white border-cyan-600 shadow-xs'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {mins === 120 ? '120 mins (2 Hours)' : `${mins} mins`}
                  </button>
                ))}
              </div>
            </div>

            {/* Target Triage Levels */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-700 block">
                Target Triage Tiers
              </label>
              <div className="space-y-1.5 text-xs text-slate-700">
                <label className="flex items-center gap-2 bg-slate-50 p-2 rounded-lg border border-slate-200 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.targetLevels.includes('LEVEL_1_EMERGENCY')}
                    onChange={(e) => {
                      setConfig((prev) => ({
                        ...prev,
                        targetLevels: e.target.checked
                          ? [...prev.targetLevels, 'LEVEL_1_EMERGENCY']
                          : prev.targetLevels.filter((l) => l !== 'LEVEL_1_EMERGENCY'),
                      }));
                    }}
                    className="rounded text-cyan-600"
                  />
                  <span className="font-semibold text-rose-700">Level 1: Immediate Emergency / Resuscitation</span>
                </label>

                <label className="flex items-center gap-2 bg-slate-50 p-2 rounded-lg border border-slate-200 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.targetLevels.includes('LEVEL_2_URGENT')}
                    onChange={(e) => {
                      setConfig((prev) => ({
                        ...prev,
                        targetLevels: e.target.checked
                          ? [...prev.targetLevels, 'LEVEL_2_URGENT']
                          : prev.targetLevels.filter((l) => l !== 'LEVEL_2_URGENT'),
                      }));
                    }}
                    className="rounded text-cyan-600"
                  />
                  <span className="font-semibold text-amber-700">Level 2: Urgent / Very High Risk</span>
                </label>

                <label className="flex items-center gap-2 bg-slate-50 p-2 rounded-lg border border-slate-200 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.targetLevels.includes('LEVEL_3_PRIORITY')}
                    onChange={(e) => {
                      setConfig((prev) => ({
                        ...prev,
                        targetLevels: e.target.checked
                          ? [...prev.targetLevels, 'LEVEL_3_PRIORITY']
                          : prev.targetLevels.filter((l) => l !== 'LEVEL_3_PRIORITY'),
                      }));
                    }}
                    className="rounded text-cyan-600"
                  />
                  <span className="font-semibold text-cyan-700">Level 3: Priority Clinical Review</span>
                </label>
              </div>
            </div>

            {/* Audio Alert Toggle */}
            <div className="flex items-center justify-between bg-slate-50 p-3 rounded-xl border border-slate-200">
              <div className="flex items-center gap-2">
                {config.audioEnabled ? <Volume2 className="w-4 h-4 text-emerald-600" /> : <VolumeX className="w-4 h-4 text-slate-400" />}
                <div>
                  <div className="text-xs font-bold text-slate-800">Audible Clinical Chime</div>
                  <div className="text-[10px] text-slate-500">Soft acoustic chime on interval expiration</div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setConfig((prev) => ({ ...prev, audioEnabled: !prev.audioEnabled }))}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                  config.audioEnabled ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-600'
                }`}
              >
                {config.audioEnabled ? 'Enabled' : 'Disabled'}
              </button>
            </div>

            <div className="pt-2 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowSettingsModal(false)}
                className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Save & Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
