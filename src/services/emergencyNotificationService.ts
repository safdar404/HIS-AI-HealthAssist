// Emergency Notification & Audio Chime Service (Web Audio API Synthesizer + Browser Notifications)
// Developed by Muhammad Safdar AI/ML Engineer

export interface CriticalAlertPayload {
  id?: string;
  patientName: string;
  patientId: string;
  mrn?: string;
  age: number;
  gender?: 'M' | 'F' | string;
  sex?: 'M' | 'F' | string;
  district?: string;
  triageLevel: 'LEVEL_1_EMERGENCY' | 'CRITICAL' | string;
  triageLevelName?: string;
  vitals?: {
    sbp?: number;
    dbp?: number;
    spo2?: number;
    glucose?: number;
    heartRate?: number;
  };
  vitalSigns?: {
    bp?: string;
    hr?: number;
    spo2?: number;
    temp?: number;
  };
  redFlagWarnings?: string[];
  chiefComplaint?: string;
  facility?: string;
  timestamp: string;
}

type AlertListener = (alert: CriticalAlertPayload) => void;

class EmergencyNotificationService {
  private listeners: Set<AlertListener> = new Set();
  private audioMuted: boolean = false;
  private audioContext: AudioContext | null = null;
  private permissionRequested: boolean = false;

  constructor() {
    // Check local storage for mute preference
    const savedMute = localStorage.getItem('cds_alarm_muted');
    if (savedMute !== null) {
      this.audioMuted = savedMute === 'true';
    }
  }

  // Subscribe to critical alerts
  public subscribe(listener: AlertListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  // Toggle audio alarm mute
  public setAudioMuted(muted: boolean): void {
    this.audioMuted = muted;
    localStorage.setItem('cds_alarm_muted', String(muted));
  }

  public toggleMute(): boolean {
    this.audioMuted = !this.audioMuted;
    localStorage.setItem('cds_alarm_muted', String(this.audioMuted));
    return this.audioMuted;
  }

  public isMuted(): boolean {
    return this.audioMuted;
  }

  // Request browser notification permission
  public async requestNotificationPermission(): Promise<boolean> {
    if (typeof window === 'undefined' || !('Notification' in window)) {
      return false;
    }

    try {
      if (Notification.permission === 'granted') {
        return true;
      }
      if (Notification.permission !== 'denied') {
        const permission = await Notification.requestPermission();
        this.permissionRequested = true;
        return permission === 'granted';
      }
    } catch (err) {
      console.warn('Browser notification permission request failed:', err);
    }
    return false;
  }

  // Synthesize realistic medical monitor STAT alarm tone (two-tone medical priority chime: 880Hz -> 1320Hz)
  public playCriticalAlarmSound(): void {
    if (this.audioMuted) return;
    if (typeof window === 'undefined') return;

    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;

      if (!this.audioContext || this.audioContext.state === 'suspended') {
        this.audioContext = new AudioCtx();
      }

      const ctx = this.audioContext;
      const now = ctx.currentTime;

      // Pulse 1: 880 Hz (High A)
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(880, now);
      gain1.gain.setValueAtTime(0.3, now);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
      osc1.connect(gain1);
      gain1.connect(ctx.destination);
      osc1.start(now);
      osc1.stop(now + 0.25);

      // Pulse 2: 1320 Hz (High E - urgent priority)
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'sine';
      osc2.frequency.setValueAtTime(1320, now + 0.15);
      gain2.gain.setValueAtTime(0.35, now + 0.15);
      gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.45);
      osc2.connect(gain2);
      gain2.connect(ctx.destination);
      osc2.start(now + 0.15);
      osc2.stop(now + 0.45);

      // Pulse 3: 1760 Hz (Double High A - STAT tone)
      const osc3 = ctx.createOscillator();
      const gain3 = ctx.createGain();
      osc3.type = 'triangle';
      osc3.frequency.setValueAtTime(1760, now + 0.3);
      gain3.gain.setValueAtTime(0.25, now + 0.3);
      gain3.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
      osc3.connect(gain3);
      gain3.connect(ctx.destination);
      osc3.start(now + 0.3);
      osc3.stop(now + 0.6);
    } catch (e) {
      console.warn('Audio alarm synthesis error:', e);
    }
  }

  // Trigger a full critical alarm event
  public triggerCriticalAlert(alert: CriticalAlertPayload): void {
    // 1. Play Sound Chime
    this.playCriticalAlarmSound();

    // 2. Fire Browser Desktop Notification if permitted
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      try {
        const bpText = alert.vitals?.sbp && alert.vitals?.dbp 
          ? `${alert.vitals.sbp}/${alert.vitals.dbp}` 
          : alert.vitalSigns?.bp || 'N/A';
        const complaint = alert.chiefComplaint || alert.redFlagWarnings?.[0] || 'Urgent Triage Condition';
        new Notification(`🚨 STAT EMERGENCY: ${alert.patientName}`, {
          body: `BP: ${bpText} mmHg | Chief Complaint: ${complaint}`,
          icon: '/favicon.ico',
          tag: alert.id || alert.patientId,
        });
      } catch (err) {
        console.warn('Desktop notification error:', err);
      }
    }

    // 3. Notify all in-app subscribers
    this.listeners.forEach((listener) => {
      try {
        listener(alert);
      } catch (err) {
        console.error('Alert listener callback error:', err);
      }
    });
  }
}

export const emergencyNotificationService = new EmergencyNotificationService();
