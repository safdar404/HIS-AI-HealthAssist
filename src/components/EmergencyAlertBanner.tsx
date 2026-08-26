import React, { useState, useEffect } from 'react';
import {
  AlertTriangle,
  HeartPulse,
  Activity,
  X,
  Volume2,
  VolumeX,
  ChevronRight,
  Bell,
  CheckCircle2,
  Radio,
  ExternalLink,
} from 'lucide-react';
import {
  emergencyNotificationService,
  CriticalAlertPayload,
} from '../services/emergencyNotificationService';

interface EmergencyAlertBannerProps {
  onOpenPatientCDS: (patientId: string) => void;
}

export const EmergencyAlertBanner: React.FC<EmergencyAlertBannerProps> = ({
  onOpenPatientCDS,
}) => {
  const [activeAlert, setActiveAlert] = useState<CriticalAlertPayload | null>(null);
  const [isMuted, setIsMuted] = useState<boolean>(emergencyNotificationService.isMuted());
  const [showNotificationPermPrompt, setShowNotificationPermPrompt] = useState<boolean>(false);

  useEffect(() => {
    // Subscribe to critical alerts from service
    const unsubscribe = emergencyNotificationService.subscribe((alert) => {
      setActiveAlert(alert);
    });

    // Check if browser notifications are available and not yet asked
    if (
      typeof window !== 'undefined' &&
      'Notification' in window &&
      Notification.permission === 'default'
    ) {
      setShowNotificationPermPrompt(true);
    }

    return () => {
      unsubscribe();
    };
  }, []);

  const handleToggleMute = () => {
    const next = !isMuted;
    emergencyNotificationService.setAudioMuted(next);
    setIsMuted(next);
  };

  const handleEnableDesktopNotifications = async () => {
    const granted = await emergencyNotificationService.requestNotificationPermission();
    setShowNotificationPermPrompt(!granted);
  };

  const handleTestChime = () => {
    emergencyNotificationService.playCriticalAlarmSound();
  };

  if (!activeAlert && !showNotificationPermPrompt) {
    return null;
  }

  return (
    <div className="fixed top-20 right-4 sm:right-6 z-50 max-w-md w-full space-y-3 font-sans animate-slide-in">
      {/* Desktop Notification Request Prompt */}
      {showNotificationPermPrompt && !activeAlert && (
        <div className="bg-slate-900 border border-slate-700 text-white p-3.5 rounded-2xl shadow-2xl flex items-center justify-between text-xs backdrop-blur-md">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-cyan-500/20 text-cyan-400 flex items-center justify-center">
              <Bell className="w-4 h-4" />
            </div>
            <div>
              <div className="font-bold text-white">Enable Real-Time STAT Alerts</div>
              <div className="text-[10px] text-slate-400">Receive audio & desktop chimes for Level 1 triage</div>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={handleEnableDesktopNotifications}
              className="bg-cyan-600 hover:bg-cyan-500 text-white px-2.5 py-1 rounded-lg font-bold text-[11px] cursor-pointer"
            >
              Allow
            </button>
            <button
              onClick={() => setShowNotificationPermPrompt(false)}
              className="text-slate-400 hover:text-white p-1"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Active High-Priority Critical Alert Banner */}
      {activeAlert && (
        <div className="bg-gradient-to-br from-rose-950 via-slate-950 to-red-950 border-2 border-rose-500 rounded-3xl p-4 shadow-[0_0_40px_rgba(244,63,94,0.4)] text-white relative overflow-hidden animate-pulse-border">
          {/* Animated red beacon radar ring in corner */}
          <div className="absolute -top-6 -right-6 w-20 h-20 bg-rose-500/20 rounded-full blur-xl pointer-events-none"></div>

          {/* Top Bar */}
          <div className="flex items-center justify-between border-b border-rose-800/60 pb-2.5">
            <div className="flex items-center gap-2">
              <span className="relative flex h-3 w-3">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500"></span>
              </span>
              <span className="bg-rose-500 text-white font-black text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full shadow-sm">
                HIGH PRIORITY STAT ALERT
              </span>
              <span className="text-[10px] text-rose-300 font-mono font-bold">
                {activeAlert.timestamp || 'JUST NOW'}
              </span>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={handleToggleMute}
                title={isMuted ? 'Unmute Alarm Sound' : 'Mute Alarm Sound'}
                className="p-1 text-rose-300 hover:text-white rounded hover:bg-rose-900/50 cursor-pointer"
              >
                {isMuted ? <VolumeX className="w-4 h-4 text-slate-400" /> : <Volume2 className="w-4 h-4 text-rose-400 animate-pulse" />}
              </button>
              <button
                onClick={() => setActiveAlert(null)}
                className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Patient Details */}
          <div className="py-3 space-y-2">
            <div className="flex items-start justify-between">
              <div>
                <h4 className="text-sm font-black text-white">
                  {activeAlert.patientName} ({activeAlert.gender || activeAlert.sex || 'Patient'}, {activeAlert.age}y)
                </h4>
                <div className="text-[10px] text-rose-200 font-mono">
                  ID: {activeAlert.patientId} • Facility: {activeAlert.facility || (activeAlert.district ? `${activeAlert.district} DHQ Emergency Center` : 'DHQ Emergency Center')}
                </div>
              </div>
              <span className="bg-rose-600/30 text-rose-200 border border-rose-500 text-[10px] font-black px-2 py-0.5 rounded">
                {activeAlert.triageLevelName || 'CRITICAL LEVEL 1'}
              </span>
            </div>

            {/* Vital Signs Grid */}
            <div className="grid grid-cols-3 gap-2 bg-slate-950/80 p-2 rounded-xl border border-rose-900/50 text-center font-mono">
              <div>
                <div className="text-[9px] text-slate-400">Blood Pressure</div>
                <div className="text-xs font-black text-rose-400">
                  {activeAlert.vitals?.sbp && activeAlert.vitals?.dbp
                    ? `${activeAlert.vitals.sbp}/${activeAlert.vitals.dbp}`
                    : activeAlert.vitalSigns?.bp || '185/115'}
                </div>
              </div>
              <div>
                <div className="text-[9px] text-slate-400">Oxygen (SpO2)</div>
                <div className="text-xs font-black text-cyan-400">
                  {activeAlert.vitals?.spo2
                    ? `${activeAlert.vitals.spo2}%`
                    : activeAlert.vitalSigns?.spo2
                    ? `${activeAlert.vitalSigns.spo2}%`
                    : '94%'}
                </div>
              </div>
              <div>
                <div className="text-[9px] text-slate-400">Heart Rate</div>
                <div className="text-xs font-black text-emerald-400">
                  {activeAlert.vitals?.heartRate
                    ? `${activeAlert.vitals.heartRate} bpm`
                    : activeAlert.vitalSigns?.hr
                    ? `${activeAlert.vitalSigns.hr} bpm`
                    : '108 bpm'}
                </div>
              </div>
            </div>

            {/* Chief Complaint */}
            <div className="text-[11px] text-slate-300">
              <span className="text-rose-300 font-bold">Chief Complaint:</span>{' '}
              {activeAlert.chiefComplaint ||
                (activeAlert.redFlagWarnings && activeAlert.redFlagWarnings.length > 0
                  ? activeAlert.redFlagWarnings.join('; ')
                  : 'Severe hemodynamic risk and acute red-flag presentation detected.')}
            </div>
          </div>

          {/* Action Footer */}
          <div className="pt-2 border-t border-rose-900/60 flex items-center justify-between gap-2">
            <button
              onClick={handleTestChime}
              className="text-[10px] text-rose-300 hover:text-white underline cursor-pointer"
            >
              Test Medical Chime
            </button>

            <button
              onClick={() => {
                onOpenPatientCDS(activeAlert.patientId);
                setActiveAlert(null);
              }}
              className="bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs px-4 py-2 rounded-xl shadow-lg shadow-rose-950/60 flex items-center gap-1.5 cursor-pointer transition-all hover:scale-105"
            >
              <span>STAT TRIAGE: Open in Doctor CDS</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
