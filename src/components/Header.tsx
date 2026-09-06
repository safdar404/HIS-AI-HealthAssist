import React, { useState, useEffect, useRef } from 'react';
import {
  Activity,
  ShieldCheck,
  MapPin,
  Cpu,
  BookOpen,
  History,
  AlertTriangle,
  HeartPulse,
  Users,
  Calculator,
  Search,
  Building2,
  UserCheck,
  Clock,
  Radio,
  FileCode2,
  Sun,
  Moon,
  Volume2,
  VolumeX,
  Menu,
  X,
  Sparkles,
  ChevronDown,
  Bell,
  Stethoscope,
  Wifi,
  WifiOff,
  RotateCw,
  Trash2,
  User,
  UserPlus,
  Download,
  PhoneCall,
  Lock,
  Bot,
  MoreHorizontal,
  ChevronRight,
  Printer,
  FileText,
  Check,
  FileDown,
  PenTool,
} from 'lucide-react';
import { PatientAssessmentRecord } from '../types/clinical';
import { emergencyNotificationService } from '../services/emergencyNotificationService';
import { useNetworkStatus } from '../hooks/useNetworkStatus';
import { exportPatientAssessmentToPDF } from '../utils/clinicalPdfExport';
import {
  getRecentPatients,
  clearRecentPatients,
  recordPatientView,
  RecentPatientEntry,
} from '../utils/recentPatientsStorage';
import {
  clinicalProfileSync,
  ClinicianProfile,
  HospitalFacility,
  PRESET_HOSPITALS,
  PRESET_DOCTORS,
  getAllRegisteredClinicians,
} from '../services/clinicalProfileSyncService';
import { DoctorHospitalSyncModal } from './DoctorHospitalSyncModal';

export type ActiveTab =
  | 'INTAKE'
  | 'DOCTOR_CDS'
  | 'AI_AGENT'
  | 'REGISTRY'
  | 'CALCULATORS'
  | 'GEO_AI'
  | 'ML_REGISTRY'
  | 'GUIDELINES'
  | 'AUDIT_LOGS';

interface HeaderProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  emergencyCount: number;
  totalAssessments: number;
  onSearchSelect?: (record: PatientAssessmentRecord) => void;
  assessments?: PatientAssessmentRecord[];
  selectedAssessment?: PatientAssessmentRecord | null;
  onNewIntake?: () => void;
  onLaunchCalculators?: () => void;
  onOpenSearch?: () => void;
  onDownloadReport?: () => void;
  onEmergencyDispatch?: () => void;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  onOpenMobileDrawer?: () => void;
  onLockSession?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  emergencyCount,
  totalAssessments,
  onSearchSelect,
  assessments = [],
  selectedAssessment,
  onNewIntake,
  onLaunchCalculators,
  onOpenSearch,
  onDownloadReport,
  onEmergencyDispatch,
  theme,
  onToggleTheme,
  onOpenMobileDrawer,
  onLockSession,
}) => {
  // Synchronized Facility and Doctor state
  const [activeDoctor, setActiveDoctor] = useState<ClinicianProfile>(clinicalProfileSync.getActiveDoctor());
  const [activeHospital, setActiveHospital] = useState<HospitalFacility>(clinicalProfileSync.getActiveHospital());
  const [currentTime, setCurrentTime] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showSearchDropdown, setShowSearchDropdown] = useState<boolean>(false);
  const [showMobileSearchModal, setShowMobileSearchModal] = useState<boolean>(false);
  const [showMoreToolsMenu, setShowMoreToolsMenu] = useState<boolean>(false);
  const [recentPatients, setRecentPatients] = useState<RecentPatientEntry[]>([]);
  const [isAudioMuted, setIsAudioMuted] = useState<boolean>(emergencyNotificationService.isMuted());
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);
  const [showDoctorModal, setShowDoctorModal] = useState<boolean>(false);
  const [showPatientDropdown, setShowPatientDropdown] = useState<boolean>(false);
  const [showPatientPopover, setShowPatientPopover] = useState<boolean>(false);
  const [draftSavedTime, setDraftSavedTime] = useState<string | null>(null);
  const [isDraftFlashing, setIsDraftFlashing] = useState<boolean>(false);

  // Subscribe to clinical profile sync
  useEffect(() => {
    const unsub = clinicalProfileSync.subscribe((doc, hosp) => {
      setActiveDoctor(doc);
      setActiveHospital(hosp);
    });
    return unsub;
  }, []);

  // Network Status Monitoring Hook
  const { isOnline, isReconnecting, latencyMs, retryConnection } = useNetworkStatus();

  const searchContainerRef = useRef<HTMLDivElement>(null);
  const moreToolsRef = useRef<HTMLDivElement>(null);
  const patientDropdownRef = useRef<HTMLDivElement>(null);
  const popoverTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Refresh recent patients on mount and on search focus
  const refreshRecentPatients = () => {
    setRecentPatients(getRecentPatients());
  };

  useEffect(() => {
    refreshRecentPatients();
  }, []);

  // Update recent patient history when active patient changes
  useEffect(() => {
    if (selectedAssessment) {
      recordPatientView(selectedAssessment);
      refreshRecentPatients();
    }
  }, [selectedAssessment]);

  // Live Clock (Local)
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(
        now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Listen for Clinical / Intake Draft Auto-Save Events
  useEffect(() => {
    const handleDraftSaved = (e: any) => {
      const d = new Date(e?.detail?.timestamp || Date.now());
      const timeStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      setDraftSavedTime(timeStr);
      setIsDraftFlashing(true);
      setTimeout(() => setIsDraftFlashing(false), 2500);
    };

    window.addEventListener('clinical-draft-saved', handleDraftSaved);

    // Initial check for any draft in localStorage
    try {
      const keys = Object.keys(localStorage);
      const hasDrafts = keys.some((k) => k.startsWith('doctor_review_draft_') || k.startsWith('his_offline_intake_draft'));
      if (hasDrafts) {
        setDraftSavedTime('Cached');
      }
    } catch {
      // ignore
    }

    return () => {
      window.removeEventListener('clinical-draft-saved', handleDraftSaved);
    };
  }, []);

  // Handle outside click for search dropdown, more tools menu, and patient dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setShowSearchDropdown(false);
      }
      if (moreToolsRef.current && !moreToolsRef.current.contains(event.target as Node)) {
        setShowMoreToolsMenu(false);
      }
      if (patientDropdownRef.current && !patientDropdownRef.current.contains(event.target as Node)) {
        setShowPatientDropdown(false);
        setShowPatientPopover(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Resolve current active patient record
  const activePatientRecord: PatientAssessmentRecord | null =
    selectedAssessment || (assessments.length > 0 ? assessments[0] : null);

  // Dynamic Clinical Status Calculator (Stable, Urgent, Critical, Discharged)
  const getPatientClinicalStatus = (record?: PatientAssessmentRecord | null) => {
    if (!record) {
      return {
        status: 'Stable' as const,
        badgeClass: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
        dotClass: 'bg-emerald-400',
        description: 'Vitals within normal limits • Routine follow-up scheduled',
      };
    }

    const triageLevel = record.assessmentResult?.triage?.level;
    const isEmergency = record.assessmentResult?.isEmergency;
    const isReviewed = Boolean(record.doctorReview?.reviewTimestamp);

    if (triageLevel === 'LEVEL_1_EMERGENCY' || isEmergency) {
      return {
        status: 'Critical' as const,
        badgeClass: 'bg-rose-500/25 text-rose-200 border-rose-400 animate-pulse ring-1 ring-rose-500/50',
        dotClass: 'bg-rose-400',
        description: 'Immediate STAT Intervention Required • EMS 1122 Transfer Ready',
      };
    }
    if (triageLevel === 'LEVEL_2_URGENT' || triageLevel === 'LEVEL_3_PRIORITY') {
      return {
        status: 'Urgent' as const,
        badgeClass: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
        dotClass: 'bg-amber-400',
        description: 'Priority clinical attention required within 30 minutes',
      };
    }
    if (isReviewed) {
      return {
        status: 'Discharged' as const,
        badgeClass: 'bg-sky-500/20 text-sky-300 border-sky-500/40',
        dotClass: 'bg-sky-400',
        description: 'Physician reviewed & signed • Management plan active',
      };
    }
    return {
      status: 'Stable' as const,
      badgeClass: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
      dotClass: 'bg-emerald-400',
      description: 'Hemodynamically stable • Routine clinical monitoring',
    };
  };

  const activePatientStatus = getPatientClinicalStatus(activePatientRecord);

  // Compute the last 5 recently viewed / active patients
  const getRecent5Patients = (): PatientAssessmentRecord[] => {
    const result: PatientAssessmentRecord[] = [];
    const seenIds = new Set<string>();

    // 1. Current active patient first
    if (activePatientRecord) {
      result.push(activePatientRecord);
      seenIds.add(activePatientRecord.demographics.patientId);
    }

    // 2. Add from recentPatients persistent storage
    for (const r of recentPatients) {
      if (!seenIds.has(r.patientId)) {
        const match = assessments.find((a) => a.demographics.patientId === r.patientId);
        if (match) {
          result.push(match);
          seenIds.add(match.demographics.patientId);
        }
      }
    }

    // 3. Fill up to 5 with patients in registry
    for (const a of assessments) {
      if (!seenIds.has(a.demographics.patientId)) {
        result.push(a);
        seenIds.add(a.demographics.patientId);
      }
      if (result.length >= 5) break;
    }

    return result.slice(0, 5);
  };

  const handleMouseEnterPatient = () => {
    if (popoverTimerRef.current) clearTimeout(popoverTimerRef.current);
    if (!showPatientDropdown) {
      setShowPatientPopover(true);
    }
  };

  const handleMouseLeavePatient = () => {
    popoverTimerRef.current = setTimeout(() => {
      setShowPatientPopover(false);
    }, 250);
  };

  const handleInstantPrintActivePatient = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (activePatientRecord) {
      exportPatientAssessmentToPDF(activePatientRecord);
    } else if (onDownloadReport) {
      onDownloadReport();
    }
  };

  const handleToggleAudio = () => {
    const next = !isAudioMuted;
    emergencyNotificationService.setAudioMuted(next);
    setIsAudioMuted(next);
    if (!next) {
      emergencyNotificationService.playCriticalAlarmSound();
    }
  };

  // Filter patients for search dropdown
  const matchedPatients = searchQuery.trim()
    ? assessments
        .filter(
          (a) =>
            a.demographics.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
            a.demographics.patientId.toLowerCase().includes(searchQuery.toLowerCase()) ||
            (a.demographics.mrn && a.demographics.mrn.toLowerCase().includes(searchQuery.toLowerCase())) ||
            (a.demographics.district && a.demographics.district.toLowerCase().includes(searchQuery.toLowerCase()))
        )
        .slice(0, 6)
    : [];

  const handleSelectPatient = (patient: PatientAssessmentRecord) => {
    recordPatientView(patient);
    refreshRecentPatients();
    if (onSearchSelect) onSearchSelect(patient);
    setActiveTab('DOCTOR_CDS');
    setShowSearchDropdown(false);
    setShowMobileSearchModal(false);
    setSearchQuery('');
  };

  const handleSelectRecent = (recent: RecentPatientEntry) => {
    const target = assessments.find((a) => a.demographics.patientId === recent.patientId);
    if (target) {
      handleSelectPatient(target);
    } else {
      setActiveTab('DOCTOR_CDS');
      setShowSearchDropdown(false);
      setShowMobileSearchModal(false);
    }
  };

  const handleClearRecents = (e: React.MouseEvent) => {
    e.stopPropagation();
    clearRecentPatients();
    setRecentPatients([]);
  };

  // Unify NavItem interface
  interface NavItem {
    id: ActiveTab;
    label: string;
    shortLabel: string;
    icon: React.ReactNode;
    description?: string;
    badge?: number | string;
    badgeColor?: string;
  }

  // Primary navigation tabs
  const primaryNavItems: NavItem[] = [
    {
      id: 'INTAKE',
      label: 'Intake & Triage',
      shortLabel: 'Intake',
      icon: <Activity className="w-3.5 h-3.5 text-cyan-400" />,
    },
    {
      id: 'DOCTOR_CDS',
      label: 'Doctor Portal',
      shortLabel: 'Doctor CDS',
      icon: <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />,
      badge: totalAssessments,
      badgeColor: 'bg-emerald-950/90 text-emerald-300 border-emerald-700/80',
    },
    {
      id: 'AI_AGENT',
      label: 'AI Agent & Hospitals',
      shortLabel: 'AI & Hospitals',
      icon: <Bot className="w-3.5 h-3.5 text-cyan-300 animate-pulse" />,
      badge: 'Live',
      badgeColor: 'bg-cyan-950/90 text-cyan-300 border-cyan-700/80 font-mono',
    },
    {
      id: 'REGISTRY',
      label: 'Patient Registry',
      shortLabel: 'Registry',
      icon: <Users className="w-3.5 h-3.5 text-blue-400" />,
    },
  ];

  // Secondary tools tabs
  const secondaryNavItems: NavItem[] = [
    {
      id: 'CALCULATORS',
      label: 'Clinical Calculators',
      shortLabel: 'Calculators',
      icon: <Calculator className="w-3.5 h-3.5 text-rose-400" />,
      description: 'WHO CVD 10-Yr, eGFR, BMI & MAP',
    },
    {
      id: 'GEO_AI',
      label: 'GeoAI Pakistan',
      shortLabel: 'GeoAI',
      icon: <MapPin className="w-3.5 h-3.5 text-teal-400" />,
      description: 'National disease heatmap & district surveillance',
    },
    {
      id: 'ML_REGISTRY',
      label: 'ML Research',
      shortLabel: 'ML Models',
      icon: <Cpu className="w-3.5 h-3.5 text-amber-400" />,
      description: 'XGBoost calibration, fairness & SHAP explainability',
    },
    {
      id: 'GUIDELINES',
      label: 'Guidelines',
      shortLabel: 'Guidelines',
      icon: <BookOpen className="w-3.5 h-3.5 text-indigo-400" />,
      description: 'WHO HEARTS & PMDC clinical protocol compendium',
    },
    {
      id: 'AUDIT_LOGS',
      label: 'Audit Trail',
      shortLabel: 'Audit',
      icon: <History className="w-3.5 h-3.5 text-purple-400" />,
      description: 'HIPAA immutable compliance ledger & event log',
    },
  ];

  const allNavItems = [...primaryNavItems, ...secondaryNavItems];
  const isSecondaryActive = secondaryNavItems.some((item) => item.id === activeTab);
  const activeSecondaryItem = secondaryNavItems.find((item) => item.id === activeTab);

  return (
    <header className="bg-slate-900 border-b border-slate-800 text-white sticky top-0 z-40 shadow-xl font-sans transition-colors duration-200">
      {/* 1. Top Clinical Command & Telemetry Ribbon */}
      <div className="bg-slate-950 px-2 sm:px-4 lg:px-8 py-1 text-xs text-slate-400 border-b border-slate-800/90">
        <div className="max-w-[1600px] mx-auto flex items-center justify-between gap-2 overflow-x-auto no-scrollbar">
          {/* Left: Facility, Attending Doctor & Standards */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Facility Selector Dropdown with Auto-Sync */}
            <div className="flex items-center gap-1 sm:gap-1.5 bg-slate-900/90 border border-slate-800 hover:border-slate-700 px-2 py-0.5 rounded-lg text-slate-300 transition-colors">
              <Building2 className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
              <select
                id="header-facility-selector"
                value={activeHospital.id}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === 'CUSTOM_MODAL') {
                    setShowDoctorModal(true);
                  } else {
                    clinicalProfileSync.setActiveHospital(val);
                  }
                }}
                className="bg-transparent text-slate-200 border-none text-[10px] sm:text-[11px] font-bold focus:outline-none cursor-pointer max-w-[110px] sm:max-w-[170px] md:max-w-[210px] truncate"
                title="Select Clinical Health Facility (Auto-synchronizes assigned Doctor)"
              >
                {PRESET_HOSPITALS.map((hosp) => (
                  <option key={hosp.id} value={hosp.id} className="bg-slate-900 text-white">
                    {hosp.shortName} ({hosp.district})
                  </option>
                ))}
                {!PRESET_HOSPITALS.some((h) => h.id === activeHospital.id) && (
                  <option value={activeHospital.id} className="bg-slate-900 text-white">
                    {activeHospital.shortName} (Custom)
                  </option>
                )}
                <option value="CUSTOM_MODAL" className="bg-cyan-950 text-cyan-300 font-bold">
                  ⚙️ Switch / Customize Facility & Doctor...
                </option>
              </select>
            </div>

            {/* Auto-Sync Indicator */}
            <div
              onClick={() => setShowDoctorModal(true)}
              className="hidden md:flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-cyan-950/40 border border-cyan-800/40 text-[9px] text-cyan-300 font-mono cursor-pointer hover:bg-cyan-900/40 transition-colors"
              title="Hospital & Doctor are auto-synchronized. Click to configure."
            >
              <span className="text-cyan-400">⟷</span>
              <span className="hidden lg:inline">Auto-Sync</span>
            </div>

            {/* Attending Physician on Duty with Quick Selector */}
            <div className="flex items-center gap-1 sm:gap-1.5 bg-slate-900/90 border border-slate-800 hover:border-slate-700 px-2 py-0.5 rounded-lg text-slate-300 transition-colors">
              <UserCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <select
                id="header-doctor-selector"
                value={activeDoctor.id}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === 'CUSTOM_MODAL') {
                    setShowDoctorModal(true);
                  } else {
                    clinicalProfileSync.setActiveDoctor(val);
                  }
                }}
                className="bg-transparent text-slate-200 border-none text-[10px] sm:text-[11px] font-bold focus:outline-none cursor-pointer max-w-[110px] sm:max-w-[160px] md:max-w-[190px] truncate"
                title="Select Attending Clinician (Auto-synchronizes Hospital Facility)"
              >
                {getAllRegisteredClinicians().map((doc) => (
                  <option key={doc.id} value={doc.id} className="bg-slate-900 text-white">
                    {doc.name} ({doc.licenseNo})
                  </option>
                ))}
                {!getAllRegisteredClinicians().some((d) => d.id === activeDoctor.id) && (
                  <option value={activeDoctor.id} className="bg-slate-900 text-white">
                    {activeDoctor.name} (Custom)
                  </option>
                )}
                <option value="CUSTOM_MODAL" className="bg-cyan-950 text-cyan-300 font-bold">
                  ⚙️ Switch / Customize Doctor & Facility...
                </option>
              </select>
            </div>

            {/* Guidelines Compliance standard */}
            <div className="hidden xl:flex items-center gap-1 bg-cyan-950/40 border border-cyan-800/40 px-2 py-0.5 rounded-lg text-[10px] text-cyan-300 font-mono">
              <Sparkles className="w-3 h-3 text-cyan-400 shrink-0" />
              <span>WHO HEARTS 2026</span>
            </div>
          </div>

          {/* Right: Telemetry Controls (Status, Alarms, Mode, Lock, Time, Alerts) */}
          <div className="flex items-center gap-1 sm:gap-1.5 text-[10px] sm:text-[11px] shrink-0">
            {/* Small Unobtrusive Draft Saved Visual Indicator */}
            {draftSavedTime && (
              <div
                id="header-draft-saved-indicator"
                className={`px-1.5 sm:px-2 py-0.5 rounded-lg text-[9px] sm:text-[10px] font-semibold flex items-center gap-1 transition-all duration-300 border ${
                  isDraftFlashing
                    ? 'bg-emerald-500/25 text-emerald-200 border-emerald-400 ring-1 ring-emerald-400/50 shadow-sm shadow-emerald-950 scale-102'
                    : 'bg-emerald-950/40 text-emerald-300 border-emerald-800/50'
                }`}
                title={`Clinical intake and review data automatically cached to local storage (${draftSavedTime})`}
              >
                <Check className="w-3 h-3 text-emerald-400 shrink-0" />
                <span className="font-medium">Draft Saved</span>
                {draftSavedTime !== 'Cached' && (
                  <span className="text-[9px] text-emerald-400/70 font-mono hidden md:inline">
                    {draftSavedTime}
                  </span>
                )}
              </div>
            )}

            {/* Real-Time Network Status Indicator */}
            {isOnline ? (
              <span
                id="network-status-online"
                className="bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 px-1.5 sm:px-2 py-0.5 rounded-lg text-[9px] sm:text-[10px] font-bold flex items-center gap-1 sm:gap-1.5"
                title="Live Cloud API & Real-Time Telemetry Connected"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                <Wifi className="w-3 h-3 text-emerald-400 shrink-0" />
                <span className="hidden sm:inline">Online {latencyMs !== null ? `(${latencyMs}ms)` : ''}</span>
              </span>
            ) : (
              <button
                id="network-status-offline"
                onClick={() => retryConnection()}
                disabled={isReconnecting}
                className="bg-rose-500/20 text-rose-200 border border-rose-500/60 px-1.5 sm:px-2 py-0.5 rounded-lg text-[9px] sm:text-[10px] font-bold flex items-center gap-1 animate-pulse hover:bg-rose-500/30 cursor-pointer"
                title="Click to reconnect"
              >
                <WifiOff className="w-3 h-3 text-rose-400 shrink-0" />
                <span>{isReconnecting ? 'Retrying...' : 'Offline'}</span>
                <RotateCw className={`w-2.5 h-2.5 text-rose-300 ml-0.5 ${isReconnecting ? 'animate-spin' : ''}`} />
              </button>
            )}

            {/* Audio Alarm Toggle */}
            <button
              onClick={handleToggleAudio}
              title={isAudioMuted ? 'Alarms Muted (Click to Unmute)' : 'STAT Audio Alarm Active (Click to Mute)'}
              className={`px-1.5 sm:px-2 py-0.5 rounded-lg border text-[9px] sm:text-[10px] font-semibold flex items-center gap-1 transition-all cursor-pointer ${
                isAudioMuted
                  ? 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                  : 'bg-rose-500/15 border-rose-500/50 text-rose-300 hover:bg-rose-500/25'
              }`}
            >
              {isAudioMuted ? <VolumeX className="w-3 h-3" /> : <Volume2 className="w-3 h-3 text-rose-400 animate-pulse" />}
              <span className="hidden md:inline">{isAudioMuted ? 'Muted' : 'Alarm On'}</span>
            </button>

            {/* Theme Toggle */}
            <button
              onClick={onToggleTheme}
              title={`Switch to ${theme === 'dark' ? 'Light Clinical Mode' : 'Night-Shift Dark Mode'}`}
              className="px-1.5 sm:px-2 py-0.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:border-slate-700 transition-all flex items-center gap-1 cursor-pointer"
            >
              {theme === 'dark' ? (
                <>
                  <Sun className="w-3 h-3 text-amber-400 shrink-0" />
                  <span className="text-[9px] sm:text-[10px] font-bold text-amber-300 hidden lg:inline">Light</span>
                </>
              ) : (
                <>
                  <Moon className="w-3 h-3 text-cyan-400 shrink-0" />
                  <span className="text-[9px] sm:text-[10px] font-bold text-cyan-300 hidden lg:inline">Night</span>
                </>
              )}
            </button>

            {/* Live Clock */}
            <div className="flex items-center gap-1 text-slate-400 font-mono text-[9px] sm:text-[10px] hidden md:flex bg-slate-900 border border-slate-800 px-2 py-0.5 rounded-lg">
              <Clock className="w-3 h-3 text-cyan-400 shrink-0" />
              <span>{currentTime || '00:00:00'}</span>
            </div>

            {/* Quick Lock Session Button */}
            {onLockSession && (
              <button
                onClick={onLockSession}
                title="Lock Clinician Session (Requires Biometric Re-authentication)"
                className="px-1.5 sm:px-2 py-0.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 hover:text-rose-300 hover:border-rose-700/60 transition-all flex items-center gap-1 cursor-pointer"
              >
                <Lock className="w-3 h-3 text-rose-400 shrink-0" />
                <span className="text-[9px] sm:text-[10px] font-bold hidden xl:inline">Lock</span>
              </button>
            )}

            {/* Emergency Alert Indicator Badge */}
            {emergencyCount > 0 && (
              <button
                onClick={() => setActiveTab('DOCTOR_CDS')}
                className="bg-red-600/25 border border-red-500 text-red-200 px-1.5 sm:px-2 py-0.5 rounded-lg text-[9px] sm:text-[10px] font-black flex items-center gap-1 animate-pulse hover:bg-red-600/40 cursor-pointer shadow-md shadow-red-950/50"
              >
                <AlertTriangle className="w-3 h-3 text-red-400 shrink-0" />
                <span>{emergencyCount} STAT</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 2. Main Navigation Header Bar */}
      <div className="max-w-[1600px] mx-auto px-2 sm:px-4 lg:px-8">
        <div className="flex items-center justify-between h-14 sm:h-16 gap-2 sm:gap-3">
          {/* Brand & Logo */}
          <div
            onClick={() => setActiveTab('INTAKE')}
            className="flex items-center gap-2 cursor-pointer select-none shrink-0 group"
          >
            <div className="w-8 h-8 sm:w-9 sm:h-9 md:w-10 md:h-10 rounded-xl bg-gradient-to-tr from-cyan-600 via-teal-500 to-emerald-400 p-0.5 flex items-center justify-center shadow-lg shadow-cyan-950/50 group-hover:scale-105 transition-transform shrink-0">
              <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
                <HeartPulse className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 text-cyan-400" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-1 sm:gap-1.5">
                <h1 className="text-xs sm:text-sm md:text-base font-black tracking-tight text-white group-hover:text-cyan-300 transition-colors whitespace-nowrap">
                  HIS AI-HealthAssist
                </h1>
                <span className="bg-cyan-500/20 text-cyan-300 text-[8px] sm:text-[9px] font-black px-1.5 py-0.2 rounded border border-cyan-500/40 tracking-wider uppercase font-mono">
                  v2026
                </span>
              </div>
              <p className="text-[9px] sm:text-[10px] text-slate-400 font-normal hidden sm:block whitespace-nowrap">
                Clinical Decision Support & Surveillance
              </p>
            </div>
          </div>

          {/* Desktop Search Bar (Visible on 2xl screens or when wide space is available) */}
          <div ref={searchContainerRef} className="relative hidden 2xl:block w-52 xl:w-60 shrink-0">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                id="header-global-search-input"
                type="text"
                placeholder="Search patient, MRN..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setShowSearchDropdown(true);
                }}
                onFocus={() => {
                  refreshRecentPatients();
                  setShowSearchDropdown(true);
                }}
                className="w-full bg-slate-950/80 border border-slate-700/80 rounded-xl pl-8 pr-2.5 py-1 text-xs text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:bg-slate-900 transition-all"
              />
            </div>

            {/* Live Search & Recent Searches Dropdown */}
            {showSearchDropdown && (
              <div className="absolute top-full left-0 right-0 mt-1.5 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden z-50 animate-fade-in divide-y divide-slate-800">
                {searchQuery.trim() ? (
                  <div>
                    <div className="p-2 text-[10px] font-bold text-slate-400 uppercase bg-slate-950 flex items-center justify-between">
                      <span>Search Results ({matchedPatients.length})</span>
                      <span className="text-[9px] text-cyan-400">Open CDS</span>
                    </div>

                    {matchedPatients.length > 0 ? (
                      matchedPatients.map((patient) => (
                        <div
                          key={patient.demographics.patientId}
                          onClick={() => handleSelectPatient(patient)}
                          className="p-2.5 hover:bg-slate-800 cursor-pointer transition-colors flex items-center justify-between border-b border-slate-800/40 last:border-none"
                        >
                          <div>
                            <div className="font-bold text-xs text-white">{patient.demographics.fullName}</div>
                            <div className="text-[10px] text-slate-400 font-mono">
                              {patient.demographics.patientId} • {patient.demographics.district}
                            </div>
                          </div>
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                              patient.assessmentResult?.triage.level === 'LEVEL_1_EMERGENCY'
                                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                                : 'bg-cyan-500/20 text-cyan-300'
                            }`}
                          >
                            {patient.assessmentResult?.triage.levelName || 'Pending'}
                          </span>
                        </div>
                      ))
                    ) : (
                      <div className="p-4 text-center text-xs text-slate-400">
                        No matching patients found for "{searchQuery}".
                      </div>
                    )}
                  </div>
                ) : (
                  <div>
                    <div className="p-2 text-[10px] font-bold text-slate-400 uppercase bg-slate-950 flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <History className="w-3 h-3 text-cyan-400" />
                        <span>Recently Viewed ({recentPatients.length})</span>
                      </div>
                      {recentPatients.length > 0 && (
                        <button
                          onClick={handleClearRecents}
                          className="text-[9px] text-slate-400 hover:text-rose-400 flex items-center gap-1 cursor-pointer transition-colors"
                          title="Clear recent history"
                        >
                          <Trash2 className="w-2.5 h-2.5" />
                          <span>Clear</span>
                        </button>
                      )}
                    </div>

                    {recentPatients.length > 0 ? (
                      <div className="max-h-60 overflow-y-auto divide-y divide-slate-800/50">
                        {recentPatients.map((recent) => (
                          <div
                            key={recent.patientId}
                            onClick={() => handleSelectRecent(recent)}
                            className="p-2.5 hover:bg-slate-800 cursor-pointer transition-colors flex items-center justify-between group"
                          >
                            <div className="flex items-center gap-2">
                              <div className="w-6 h-6 rounded-full bg-slate-800 flex items-center justify-center text-cyan-400 group-hover:bg-cyan-950 transition-colors">
                                <User className="w-3.5 h-3.5" />
                              </div>
                              <div>
                                <div className="font-bold text-xs text-white group-hover:text-cyan-300 transition-colors">
                                  {recent.fullName}
                                </div>
                                <div className="text-[10px] text-slate-400 font-mono">
                                  {recent.patientId} • {recent.district}
                                </div>
                              </div>
                            </div>

                            <span
                              className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${
                                recent.isEmergency || recent.triageLevel === 'LEVEL_1_EMERGENCY'
                                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 animate-pulse'
                                  : 'bg-slate-800 text-slate-300 border border-slate-700'
                              }`}
                            >
                              {recent.triageLevelName || 'Assessed'}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-4 text-center text-xs text-slate-400">
                        No recent patient records viewed yet.
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Desktop Navigation: Responsive tabs for 2xl viewports */}
          <nav className="hidden 2xl:flex items-center gap-1 flex-nowrap shrink-0">
            {allNavItems.map((item) => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  id={`nav-tab-${item.id.toLowerCase()}`}
                  onClick={() => setActiveTab(item.id)}
                  className={`px-2.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap select-none ${
                    isActive
                      ? 'bg-gradient-to-r from-cyan-600 to-teal-600 text-white shadow-md shadow-cyan-950/60 ring-1 ring-cyan-400/40'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
                  }`}
                >
                  <span className="shrink-0">{item.icon}</span>
                  <span>{item.label}</span>
                  {item.badge !== undefined && (
                    <span
                      className={`text-[9px] px-1.5 py-0.2 rounded-full border font-mono font-bold shrink-0 ${
                        item.badgeColor || 'bg-slate-800 text-cyan-300 border-slate-700'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Medium Desktop / Laptop Navigation (1024px to 1535px): Primary Tabs + More Tools Dropdown */}
          <nav className="hidden lg:flex 2xl:hidden items-center gap-1 flex-nowrap shrink-0">
            {primaryNavItems.map((item) => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  id={`nav-tab-compact-${item.id.toLowerCase()}`}
                  onClick={() => setActiveTab(item.id)}
                  className={`px-2.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap select-none ${
                    isActive
                      ? 'bg-gradient-to-r from-cyan-600 to-teal-600 text-white shadow-md shadow-cyan-950/60 ring-1 ring-cyan-400/40'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
                  }`}
                >
                  <span className="shrink-0">{item.icon}</span>
                  <span>{item.shortLabel}</span>
                  {item.badge !== undefined && (
                    <span
                      className={`text-[9px] px-1.5 py-0.2 rounded-full border font-mono font-bold shrink-0 ${
                        item.badgeColor || 'bg-slate-800 text-cyan-300 border-slate-700'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}

            {/* More Tools Dropdown */}
            <div ref={moreToolsRef} className="relative">
              <button
                id="nav-more-tools-btn"
                onClick={() => setShowMoreToolsMenu(!showMoreToolsMenu)}
                className={`px-2.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap select-none ${
                  isSecondaryActive
                    ? 'bg-gradient-to-r from-teal-600 to-cyan-600 text-white shadow-md ring-1 ring-cyan-400/40'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
                }`}
              >
                {isSecondaryActive && activeSecondaryItem ? (
                  <>
                    <span className="shrink-0">{activeSecondaryItem.icon}</span>
                    <span>{activeSecondaryItem.shortLabel}</span>
                  </>
                ) : (
                  <>
                    <MoreHorizontal className="w-3.5 h-3.5 text-cyan-400" />
                    <span>More Tools</span>
                  </>
                )}
                <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${showMoreToolsMenu ? 'rotate-180' : ''}`} />
              </button>

              {/* Dropdown Menu */}
              {showMoreToolsMenu && (
                <div className="absolute right-0 top-full mt-2 w-64 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-1.5 z-50 animate-fade-in divide-y divide-slate-800">
                  <div className="p-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider bg-slate-950 rounded-xl mb-1 flex items-center justify-between">
                    <span>Clinical Utilities</span>
                    <span className="text-cyan-400 font-mono">5 modules</span>
                  </div>
                  <div className="space-y-0.5 pt-1">
                    {secondaryNavItems.map((tool) => {
                      const isToolActive = activeTab === tool.id;
                      return (
                        <button
                          key={tool.id}
                          onClick={() => {
                            setActiveTab(tool.id);
                            setShowMoreToolsMenu(false);
                          }}
                          className={`w-full text-left p-2 rounded-xl text-xs flex items-start gap-2.5 transition-all cursor-pointer ${
                            isToolActive
                              ? 'bg-cyan-600 text-white shadow-sm font-bold'
                              : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                          }`}
                        >
                          <div className="mt-0.5 shrink-0">{tool.icon}</div>
                          <div className="flex-1">
                            <div className="font-bold text-xs">{tool.label}</div>
                            <div className={`text-[10px] ${isToolActive ? 'text-cyan-100' : 'text-slate-400'}`}>
                              {tool.description}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </nav>

          {/* Mobile & Tablet Header Action Buttons */}
          <div className="flex items-center gap-1.5">
            {/* Quick Search Button (Mobile & Tablet) */}
            <button
              id="header-mobile-search-trigger"
              onClick={() => {
                refreshRecentPatients();
                setShowMobileSearchModal(true);
              }}
              className="2xl:hidden p-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 hover:text-white hover:border-slate-600 transition-all cursor-pointer"
              title="Search Patient Directory"
            >
              <Search className="w-4 h-4" />
            </button>

            {/* Mobile Navigation Drawer Toggle */}
            <button
              id="mobile-drawer-toggle-btn"
              onClick={() => {
                if (onOpenMobileDrawer) {
                  onOpenMobileDrawer();
                } else {
                  setMobileMenuOpen(!mobileMenuOpen);
                }
              }}
              className="lg:hidden p-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 hover:text-white cursor-pointer transition-all"
              title="Open Navigation Menu"
            >
              <Menu className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Fallback Inline Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="lg:hidden border-t border-slate-800 py-3 space-y-1 bg-slate-950 rounded-2xl px-2 mb-3 animate-fade-in shadow-2xl">
            {allNavItems.map((item) => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveTab(item.id);
                    setMobileMenuOpen(false);
                  }}
                  className={`w-full px-4 py-2.5 rounded-xl text-xs font-bold flex items-center justify-between transition-all cursor-pointer ${
                    isActive
                      ? 'bg-cyan-600 text-white shadow-md'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    {item.icon}
                    <span>{item.label}</span>
                  </div>
                  {item.badge !== undefined && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-cyan-300 font-mono font-bold">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Clinical Quick Actions Sub-Header Bar */}
      <div
        id="header-quick-actions-bar"
        className="border-t border-slate-800/80 bg-slate-950/95 backdrop-blur-md px-2.5 sm:px-4 lg:px-6 py-1.5 shadow-inner"
      >
        <div className="max-w-[1600px] mx-auto flex flex-wrap items-center justify-between gap-1.5 sm:gap-2">
          {/* Quick Action Action Buttons */}
          <div className="flex flex-wrap items-center gap-1 sm:gap-1.5">
            {/* 1. New Patient Intake */}
            <button
              id="quick-action-new-intake"
              onClick={() => {
                if (onNewIntake) {
                  onNewIntake();
                } else {
                  setActiveTab('INTAKE');
                }
              }}
              className={`px-2 sm:px-2.5 py-1 rounded-lg border text-[11px] font-semibold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer whitespace-nowrap active:scale-95 group ${
                activeTab === 'INTAKE'
                  ? 'bg-cyan-500/25 text-cyan-200 border-cyan-400 ring-1 ring-cyan-400/40'
                  : 'bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border-cyan-500/30 hover:border-cyan-400'
              }`}
              title="Start New Patient Intake Assessment"
            >
              <UserPlus className="w-3.5 h-3.5 text-cyan-400 group-hover:scale-105 transition-transform shrink-0" />
              <span>New Patient Intake</span>
            </button>

            {/* 2. Patient Registry */}
            <button
              id="quick-action-registry"
              onClick={() => setActiveTab('REGISTRY')}
              className={`px-2 sm:px-2.5 py-1 rounded-lg border text-[11px] font-semibold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer whitespace-nowrap active:scale-95 group ${
                activeTab === 'REGISTRY'
                  ? 'bg-blue-500/25 text-blue-200 border-blue-400 ring-1 ring-blue-400/40'
                  : 'bg-blue-500/10 hover:bg-blue-500/20 text-blue-300 border-blue-500/30 hover:border-blue-400'
              }`}
              title="View Longitudinal Patient Registry & Records"
            >
              <Users className="w-3.5 h-3.5 text-blue-400 group-hover:scale-105 transition-transform shrink-0" />
              <span>Patient Registry</span>
            </button>

            {/* 3. Clinical Calculators (CVD/eGFR/BMI) */}
            <button
              id="quick-action-calculators"
              onClick={() => {
                if (onLaunchCalculators) {
                  onLaunchCalculators();
                } else {
                  setActiveTab('CALCULATORS');
                }
              }}
              className={`px-2 sm:px-2.5 py-1 rounded-lg border text-[11px] font-semibold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer whitespace-nowrap active:scale-95 group ${
                activeTab === 'CALCULATORS'
                  ? 'bg-rose-500/25 text-rose-200 border-rose-400 ring-1 ring-rose-400/40'
                  : 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border-rose-500/30 hover:border-rose-400'
              }`}
              title="Launch Point-of-Care Clinical Calculators (CVD, eGFR, BMI & MAP)"
            >
              <Calculator className="w-3.5 h-3.5 text-rose-400 group-hover:scale-105 transition-transform shrink-0" />
              <span>Clinical Calculators (CVD/eGFR/BMI)</span>
            </button>

            {/* 4. Global Patient Search */}
            <button
              id="quick-action-search"
              onClick={() => {
                if (onOpenSearch) {
                  onOpenSearch();
                } else {
                  refreshRecentPatients();
                  setShowMobileSearchModal(true);
                }
              }}
              className="px-2 sm:px-2.5 py-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 hover:border-amber-400 text-[11px] font-semibold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer whitespace-nowrap active:scale-95 group"
              title="Global Patient Directory Search"
            >
              <Search className="w-3.5 h-3.5 text-amber-400 group-hover:scale-105 transition-transform shrink-0" />
              <span>Global Patient Search</span>
            </button>

            {/* 5. Download Report (Muhammad Tariq / Active Patient) */}
            <button
              id="quick-action-download-report"
              onClick={() => {
                if (onDownloadReport) {
                  onDownloadReport();
                }
              }}
              className="px-2 sm:px-2.5 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 hover:border-emerald-400 text-[11px] font-semibold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer whitespace-nowrap active:scale-95 group"
              title={`Download Clinical Report for ${selectedAssessment?.demographics?.fullName || 'Muhammad Tariq'}`}
            >
              <Download className="w-3.5 h-3.5 text-emerald-400 group-hover:scale-105 transition-transform shrink-0" />
              <span>
                Download Report ({selectedAssessment?.demographics?.fullName || 'Muhammad Tariq'})
              </span>
            </button>

            {/* 6. Emergency 1122 Dispatch STAT */}
            <button
              id="quick-action-emergency-dispatch"
              onClick={() => {
                if (onEmergencyDispatch) {
                  onEmergencyDispatch();
                } else {
                  setActiveTab('GEO_AI');
                }
              }}
              className={`px-2 sm:px-2.5 py-1 rounded-lg border text-[11px] font-semibold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer whitespace-nowrap active:scale-95 group ${
                activeTab === 'GEO_AI'
                  ? 'bg-red-500/30 text-red-100 border-red-400 ring-1 ring-red-400/50'
                  : 'bg-red-500/15 hover:bg-red-500/25 text-red-200 border-red-500/50 hover:border-red-400'
              }`}
              title="Immediate Emergency EMS 1122 Tele-Dispatch"
            >
              <PhoneCall className="w-3.5 h-3.5 text-red-400 group-hover:scale-105 transition-transform shrink-0" />
              <span>Emergency 1122 Dispatch</span>
              <span className="bg-red-600 text-white text-[9px] px-1 py-0.2 rounded font-black tracking-wider uppercase shadow-xs animate-pulse">
                STAT
              </span>
            </button>
          </div>

          {/* Right Status / Interactive Patient Selector & Quick Print Bar */}
          <div className="flex items-center gap-1.5 shrink-0 relative" ref={patientDropdownRef}>
            {/* Quick Print Button */}
            <button
              id="quick-action-print-summary"
              onClick={handleInstantPrintActivePatient}
              className="px-2 sm:px-2.5 py-1 rounded-lg bg-indigo-500/15 hover:bg-indigo-500/25 text-indigo-300 border border-indigo-500/30 hover:border-indigo-400 text-[11px] font-semibold flex items-center gap-1 shadow-xs transition-all cursor-pointer whitespace-nowrap active:scale-95 group"
              title={`Instant Print Clinical Summary for ${activePatientRecord?.demographics?.fullName || 'Active Patient'}`}
            >
              <Printer className="w-3.5 h-3.5 text-indigo-400 group-hover:scale-105 transition-transform shrink-0" />
              <span className="hidden sm:inline">Print</span>
            </button>

            {/* Interactive Patient Display with Hover Popover and Dropdown Menu */}
            <div className="relative">
              <button
                id="header-patient-selection-trigger"
                onClick={() => {
                  setShowPatientDropdown((prev) => !prev);
                  setShowPatientPopover(false);
                }}
                onMouseEnter={handleMouseEnterPatient}
                onMouseLeave={handleMouseLeavePatient}
                className={`flex items-center gap-1.5 text-[11px] font-mono bg-slate-900/90 hover:bg-slate-800/90 px-2.5 py-1 rounded-lg border transition-all cursor-pointer text-slate-300 shadow-xs group ${
                  showPatientDropdown ? 'border-cyan-400 ring-1 ring-cyan-400/40 bg-slate-800' : 'border-slate-800 hover:border-slate-700'
                }`}
                title="Click to switch among last 5 recent patients, or hover for clinical encounter summary"
              >
                <span
                  className={`inline-block w-2 h-2 rounded-full ${activePatientStatus.dotClass} ${
                    activePatientStatus.status === 'Critical' ? 'animate-ping' : 'animate-pulse'
                  } shrink-0`}
                />
                <span className="text-slate-400 font-sans hidden md:inline">Patient:</span>
                <span className="text-cyan-300 font-bold max-w-[130px] truncate group-hover:text-cyan-200">
                  {activePatientRecord?.demographics?.fullName || 'Muhammad Tariq'}
                </span>
                <span className="text-slate-600">|</span>
                <span className="text-slate-300">
                  {activePatientRecord?.demographics?.mrn || activePatientRecord?.demographics?.patientId || 'P-LHR-1092'}
                </span>

                {/* Dynamic Status Indicator Badge (e.g., Stable, Urgent, Discharged, Critical) */}
                <span
                  className={`px-1.5 py-0.2 text-[9px] font-bold rounded border uppercase tracking-wider ${activePatientStatus.badgeClass}`}
                >
                  {activePatientStatus.status}
                </span>

                <ChevronDown
                  className={`w-3 h-3 text-slate-400 group-hover:text-cyan-300 transition-transform ${
                    showPatientDropdown ? 'rotate-180 text-cyan-300' : ''
                  }`}
                />
              </button>

              {/* Hover Popover: Clinical Encounter Summary */}
              {showPatientPopover && !showPatientDropdown && activePatientRecord && (
                <div
                  id="header-patient-encounter-popover"
                  onMouseEnter={handleMouseEnterPatient}
                  onMouseLeave={handleMouseLeavePatient}
                  className="absolute top-full right-0 mt-2 z-50 w-80 sm:w-96 bg-slate-900/95 backdrop-blur-xl border border-slate-700/90 rounded-2xl shadow-2xl p-4 text-xs font-sans text-slate-200 animate-fade-in pointer-events-auto"
                >
                  {/* Popover Header */}
                  <div className="flex items-start justify-between gap-2 pb-3 border-b border-slate-800">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-xl bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400 font-bold font-mono shrink-0">
                        {activePatientRecord.demographics.fullName.charAt(0)}
                      </div>
                      <div>
                        <div className="font-bold text-white text-sm flex items-center gap-1.5">
                          <span>{activePatientRecord.demographics.fullName}</span>
                          <span
                            className={`text-[9px] px-1.5 py-0.2 rounded border font-bold uppercase tracking-wider ${activePatientStatus.badgeClass}`}
                          >
                            {activePatientStatus.status}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-400 font-mono">
                          {activePatientRecord.demographics.age}y {activePatientRecord.demographics.sex} •{' '}
                          {activePatientRecord.demographics.mrn || activePatientRecord.demographics.patientId} •{' '}
                          {activePatientRecord.demographics.district || 'Lahore'}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Encounter Summary & Vitals */}
                  <div className="py-3 space-y-2.5">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-400 uppercase font-semibold text-[10px] tracking-wider">
                        Latest Encounter Vitals
                      </span>
                      <span className="text-slate-500 font-mono text-[10px]">
                        {new Date(
                          activePatientRecord.assessmentResult?.timestamp ||
                            activePatientRecord.vitals?.measurementTime ||
                            Date.now()
                        ).toLocaleDateString()}{' '}
                        {new Date(
                          activePatientRecord.assessmentResult?.timestamp ||
                            activePatientRecord.vitals?.measurementTime ||
                            Date.now()
                        ).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>

                    {/* Vitals Micro-Grid */}
                    <div className="grid grid-cols-3 gap-1.5 font-mono text-center">
                      <div className="bg-slate-950/80 p-2 rounded-xl border border-slate-800/80">
                        <div className="text-[9px] text-slate-400 uppercase font-sans font-bold">Blood Pressure</div>
                        <div className="text-xs font-bold text-cyan-300">
                          {activePatientRecord.vitals.systolicBp || 120}/{activePatientRecord.vitals.diastolicBp || 80}
                        </div>
                        <div className="text-[9px] text-slate-500 font-sans">mmHg</div>
                      </div>

                      <div className="bg-slate-950/80 p-2 rounded-xl border border-slate-800/80">
                        <div className="text-[9px] text-slate-400 uppercase font-sans font-bold">Heart Rate</div>
                        <div className="text-xs font-bold text-emerald-400">
                          {activePatientRecord.vitals.heartRate || 72}
                        </div>
                        <div className="text-[9px] text-slate-500 font-sans">bpm</div>
                      </div>

                      <div className="bg-slate-950/80 p-2 rounded-xl border border-slate-800/80">
                        <div className="text-[9px] text-slate-400 uppercase font-sans font-bold">SpO2 / Temp</div>
                        <div className="text-xs font-bold text-blue-400">
                          {activePatientRecord.vitals.oxygenSaturation ?? 98}% •{' '}
                          {activePatientRecord.vitals.temperatureC
                            ? `${((activePatientRecord.vitals.temperatureC * 9) / 5 + 32).toFixed(1)}°F`
                            : '98.6°F'}
                        </div>
                        <div className="text-[9px] text-slate-500 font-sans">Pulse-Ox</div>
                      </div>
                    </div>

                    {/* Chief Complaint / Symptoms */}
                    <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/80 space-y-1">
                      <div className="flex items-center justify-between text-[10px]">
                        <span className="font-bold text-slate-400 uppercase tracking-wider">Chief Presentation:</span>
                        <span className="text-amber-400 font-bold font-mono">
                          10-Yr CVD:{' '}
                          {Math.round(
                            (activePatientRecord.assessmentResult?.risks?.cardiovascular?.riskScore || 0.12) * 100
                          )}
                          %
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-300 line-clamp-2 leading-relaxed">
                        {activePatientRecord.symptoms?.filter((s) => s.present).map((s) => s.name).join(', ') ||
                          'Hypertension screening and cardiovascular risk stratification'}
                      </p>
                    </div>

                    {/* Clinical Status Note */}
                    <div className="text-[10px] text-slate-400 flex items-center gap-1.5 bg-slate-800/40 px-2 py-1 rounded-lg border border-slate-800">
                      <span className={`w-1.5 h-1.5 rounded-full ${activePatientStatus.dotClass}`} />
                      <span>{activePatientStatus.description}</span>
                    </div>
                  </div>

                  {/* Popover Actions */}
                  <div className="pt-2 border-t border-slate-800 flex items-center justify-between gap-2">
                    <button
                      onClick={() => {
                        handleSelectPatient(activePatientRecord);
                        setShowPatientPopover(false);
                      }}
                      className="flex-1 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg font-bold text-[11px] flex items-center justify-center gap-1 transition-colors cursor-pointer"
                    >
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>Open Doctor Portal</span>
                    </button>

                    <button
                      onClick={() => {
                        exportPatientAssessmentToPDF(activePatientRecord);
                        setShowPatientPopover(false);
                      }}
                      className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg font-bold text-[11px] flex items-center gap-1 transition-colors cursor-pointer border border-slate-700"
                      title="Download Clinical PDF Report"
                    >
                      <Printer className="w-3.5 h-3.5 text-slate-400" />
                      <span>Print</span>
                    </button>
                  </div>
                </div>
              )}

              {/* Dropdown Menu listing last 5 recently viewed patients */}
              {showPatientDropdown && (
                <div
                  id="header-recent-patients-dropdown"
                  className="absolute top-full right-0 mt-2 z-50 w-80 sm:w-96 bg-slate-900/95 backdrop-blur-xl border border-slate-700/90 rounded-2xl shadow-2xl overflow-hidden font-sans text-slate-200 animate-slide-in-top"
                >
                  {/* Dropdown Header */}
                  <div className="p-3 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <History className="w-4 h-4 text-cyan-400" />
                      <div>
                        <h4 className="text-xs font-bold text-white">Recently Viewed Patients</h4>
                        <p className="text-[10px] text-slate-400">Fast 1-click terminal switching (Last 5)</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setShowPatientDropdown(false)}
                      className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Patient List (5 records) */}
                  <div className="max-h-72 overflow-y-auto divide-y divide-slate-800/60 p-1.5">
                    {getRecent5Patients().map((patient) => {
                      const isSelected =
                        activePatientRecord?.demographics?.patientId === patient.demographics.patientId;
                      const status = getPatientClinicalStatus(patient);

                      return (
                        <button
                          key={patient.demographics.patientId}
                          onClick={() => {
                            handleSelectPatient(patient);
                            setShowPatientDropdown(false);
                          }}
                          className={`w-full p-2.5 rounded-xl text-left flex items-center justify-between gap-2.5 transition-all cursor-pointer group ${
                            isSelected
                              ? 'bg-cyan-500/15 border border-cyan-500/30 text-white'
                              : 'hover:bg-slate-800/70 text-slate-300'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div
                              className={`w-8 h-8 rounded-xl flex items-center justify-center text-xs font-bold font-mono shrink-0 border ${
                                isSelected
                                  ? 'bg-cyan-500/30 text-cyan-200 border-cyan-400/50'
                                  : 'bg-slate-800 text-slate-300 border-slate-700'
                              }`}
                            >
                              {patient.demographics.fullName.charAt(0)}
                            </div>

                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className="font-bold text-xs text-white truncate group-hover:text-cyan-300 transition-colors">
                                  {patient.demographics.fullName}
                                </span>
                                <span
                                  className={`text-[9px] px-1.5 py-0.2 rounded border font-bold uppercase tracking-wider shrink-0 ${status.badgeClass}`}
                                >
                                  {status.status}
                                </span>
                              </div>
                              <div className="text-[10px] text-slate-400 font-mono flex items-center gap-1 truncate">
                                <span>{patient.demographics.mrn || patient.demographics.patientId}</span>
                                <span>•</span>
                                <span>
                                  {patient.demographics.age}y {patient.demographics.sex}
                                </span>
                                <span>•</span>
                                <span>
                                  BP: {patient.vitals.systolicBp}/{patient.vitals.diastolicBp}
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            {isSelected ? (
                              <div className="w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center">
                                <Check className="w-3.5 h-3.5" />
                              </div>
                            ) : (
                              <ChevronRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-cyan-400 group-hover:translate-x-0.5 transition-all" />
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {/* Dropdown Footer: Link to Full Registry */}
                  <div className="p-2 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-[11px]">
                    <button
                      onClick={() => {
                        setActiveTab('REGISTRY');
                        setShowPatientDropdown(false);
                      }}
                      className="w-full py-1.5 px-3 bg-slate-800/80 hover:bg-slate-800 text-cyan-300 hover:text-cyan-200 rounded-xl font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer border border-slate-700/60"
                    >
                      <Users className="w-3.5 h-3.5" />
                      <span>View All in Patient Registry ({totalAssessments})</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Mobile/Tablet Fullscreen Search Modal */}
      {showMobileSearchModal && (
        <div className="fixed inset-0 z-50 flex items-start justify-center p-3 sm:p-6 bg-slate-950/85 backdrop-blur-md animate-fade-in">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden text-white mt-12 animate-slide-in-top">
            <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center gap-3">
              <Search className="w-5 h-5 text-cyan-400 shrink-0" />
              <input
                type="text"
                autoFocus
                placeholder="Search patient name, MRN, district..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-transparent text-sm text-white placeholder-slate-400 focus:outline-none"
              />
              <button
                onClick={() => setShowMobileSearchModal(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg bg-slate-800/80 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="max-h-[60vh] overflow-y-auto p-2 divide-y divide-slate-800/60">
              {searchQuery.trim() ? (
                <div>
                  <div className="px-3 py-2 text-[10px] font-bold text-slate-400 uppercase">
                    Matching Patients ({matchedPatients.length})
                  </div>
                  {matchedPatients.length > 0 ? (
                    matchedPatients.map((patient) => (
                      <div
                        key={patient.demographics.patientId}
                        onClick={() => handleSelectPatient(patient)}
                        className="p-3 hover:bg-slate-800 rounded-xl cursor-pointer transition-colors flex items-center justify-between"
                      >
                        <div>
                          <div className="font-bold text-sm text-white">{patient.demographics.fullName}</div>
                          <div className="text-xs text-slate-400 font-mono">
                            {patient.demographics.patientId} • {patient.demographics.district}
                          </div>
                        </div>
                        <span
                          className={`text-xs px-2.5 py-1 rounded-lg font-bold ${
                            patient.assessmentResult?.triage.level === 'LEVEL_1_EMERGENCY'
                              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                              : 'bg-cyan-500/20 text-cyan-300'
                          }`}
                        >
                          {patient.assessmentResult?.triage.levelName || 'Assessed'}
                        </span>
                      </div>
                    ))
                  ) : (
                    <div className="p-6 text-center text-xs text-slate-400">
                      No patients matching "{searchQuery}".
                    </div>
                  )}
                </div>
              ) : (
                <div>
                  <div className="px-3 py-2 text-[10px] font-bold text-slate-400 uppercase flex items-center justify-between">
                    <span>Recently Opened</span>
                    {recentPatients.length > 0 && (
                      <button
                        onClick={handleClearRecents}
                        className="text-[10px] text-rose-400 hover:underline"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                  {recentPatients.length > 0 ? (
                    recentPatients.map((recent) => (
                      <div
                        key={recent.patientId}
                        onClick={() => handleSelectRecent(recent)}
                        className="p-3 hover:bg-slate-800 rounded-xl cursor-pointer transition-colors flex items-center justify-between"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-cyan-400">
                            <User className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="font-bold text-sm text-white">{recent.fullName}</div>
                            <div className="text-xs text-slate-400 font-mono">
                              {recent.patientId} • {recent.district}
                            </div>
                          </div>
                        </div>
                        <ChevronRight className="w-4 h-4 text-slate-500" />
                      </div>
                    ))
                  ) : (
                    <div className="p-6 text-center text-xs text-slate-400">
                      Type to search patients across Pakistan primary care nodes.
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Comprehensive Clinician & Hospital Synchronization Modal */}
      <DoctorHospitalSyncModal
        isOpen={showDoctorModal}
        onClose={() => setShowDoctorModal(false)}
      />
    </header>
  );
};


