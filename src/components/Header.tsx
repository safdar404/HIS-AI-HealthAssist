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
  Lock,
} from 'lucide-react';
import { PatientAssessmentRecord } from '../types/clinical';
import { emergencyNotificationService } from '../services/emergencyNotificationService';
import { useNetworkStatus } from '../hooks/useNetworkStatus';
import {
  getRecentPatients,
  clearRecentPatients,
  recordPatientView,
  RecentPatientEntry,
} from '../utils/recentPatientsStorage';

export type ActiveTab =
  | 'INTAKE'
  | 'DOCTOR_CDS'
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
  theme,
  onToggleTheme,
  onOpenMobileDrawer,
  onLockSession,
}) => {
  // Facility and Doctor state
  const [facility, setFacility] = useState<string>('JPMC / National Tele-Triage Node');
  const [attendingDoctor, setAttendingDoctor] = useState<string>('Dr. Asim Farooq, MD, FCPS');
  const [currentTime, setCurrentTime] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showSearchDropdown, setShowSearchDropdown] = useState<boolean>(false);
  const [recentPatients, setRecentPatients] = useState<RecentPatientEntry[]>([]);
  const [isAudioMuted, setIsAudioMuted] = useState<boolean>(emergencyNotificationService.isMuted());
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);
  const [showDoctorModal, setShowDoctorModal] = useState<boolean>(false);

  // Network Status Monitoring Hook
  const { isOnline, isReconnecting, latencyMs, retryConnection } = useNetworkStatus();

  const searchContainerRef = useRef<HTMLDivElement>(null);

  // Refresh recent patients on mount and on search focus
  const refreshRecentPatients = () => {
    setRecentPatients(getRecentPatients());
  };

  useEffect(() => {
    refreshRecentPatients();
  }, []);

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

  // Handle outside click for search dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(event.target as Node)) {
        setShowSearchDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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
    setSearchQuery('');
  };

  const handleSelectRecent = (recent: RecentPatientEntry) => {
    const target = assessments.find((a) => a.demographics.patientId === recent.patientId);
    if (target) {
      handleSelectPatient(target);
    } else {
      // Fallback: still navigate
      setActiveTab('DOCTOR_CDS');
      setShowSearchDropdown(false);
    }
  };

  const handleClearRecents = (e: React.MouseEvent) => {
    e.stopPropagation();
    clearRecentPatients();
    setRecentPatients([]);
  };

  const navItems: { id: ActiveTab; label: string; icon: React.ReactNode; badge?: number | string; badgeColor?: string }[] = [
    { id: 'INTAKE', label: 'Intake & Triage', icon: <Activity className="w-3.5 h-3.5" /> },
    {
      id: 'DOCTOR_CDS',
      label: 'Doctor Portal',
      icon: <ShieldCheck className="w-3.5 h-3.5" />,
      badge: totalAssessments,
      badgeColor: 'bg-slate-800 text-cyan-300 border-slate-700',
    },
    { id: 'REGISTRY', label: 'Patient Registry', icon: <Users className="w-3.5 h-3.5" /> },
    { id: 'CALCULATORS', label: 'Calculators', icon: <Calculator className="w-3.5 h-3.5 text-rose-400" /> },
    { id: 'GEO_AI', label: 'GeoAI Pakistan', icon: <MapPin className="w-3.5 h-3.5 text-cyan-400" /> },
    { id: 'ML_REGISTRY', label: 'ML Research', icon: <Cpu className="w-3.5 h-3.5 text-amber-400" /> },
    { id: 'GUIDELINES', label: 'Guidelines', icon: <BookOpen className="w-3.5 h-3.5 text-emerald-400" /> },
    { id: 'AUDIT_LOGS', label: 'Audit Trail', icon: <History className="w-3.5 h-3.5 text-purple-400" /> },
  ];

  return (
    <header className="bg-slate-900 border-b border-slate-800 text-white sticky top-0 z-40 shadow-xl font-sans transition-colors duration-200">
      {/* 1. Top Clinical Command & Telemetry Ribbon */}
      <div className="bg-slate-950 px-4 sm:px-6 py-1.5 text-xs text-slate-400 flex flex-wrap items-center justify-between border-b border-slate-800/90 gap-2">
        <div className="flex flex-wrap items-center gap-3">
          {/* Facility Selector */}
          <div className="flex items-center gap-1.5 text-slate-300 font-semibold">
            <Building2 className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
            <select
              value={facility}
              onChange={(e) => setFacility(e.target.value)}
              className="bg-transparent text-slate-200 border-none text-[11px] font-bold focus:outline-none cursor-pointer"
            >
              <option value="JPMC / National Tele-Triage Node" className="bg-slate-900 text-white">
                Jinnah Postgraduate Med Centre (JPMC) - Clinical Node
              </option>
              <option value="Mayo Hospital Lahore - Primary Care" className="bg-slate-900 text-white">
                Mayo Hospital Lahore - District Care Unit
              </option>
              <option value="DHQ Hospital Rawalpindi - Emergency CDS" className="bg-slate-900 text-white">
                DHQ Hospital Rawalpindi - Emergency CDS
              </option>
              <option value="Aga Khan University Hospital - Outreach" className="bg-slate-900 text-white">
                AKUH Health Outreach Center
              </option>
              <option value="NICVD Karachi - Tele-Cardiology" className="bg-slate-900 text-white">
                NICVD Karachi - Emergency Cath Lab Node
              </option>
            </select>
          </div>

          <span className="text-slate-700 hidden sm:inline">|</span>

          {/* Attending Physician on Duty */}
          <div
            onClick={() => setShowDoctorModal(true)}
            className="flex items-center gap-1.5 text-slate-300 text-[11px] hover:text-white cursor-pointer group transition-colors"
          >
            <UserCheck className="w-3.5 h-3.5 text-emerald-400 group-hover:scale-110 transition-transform" />
            <span className="text-slate-400">Physician:</span>
            <strong className="text-slate-100 group-hover:text-cyan-300 underline decoration-dotted">
              {attendingDoctor}
            </strong>
          </div>

          <span className="text-slate-700 hidden lg:inline">|</span>

          {/* Guidelines Compliance standard */}
          <span className="text-slate-400 hidden xl:inline text-[11px]">
            Protocol: <strong className="text-cyan-300 font-mono">WHO HEARTS 2026 Edition</strong>
          </span>
        </div>

        {/* Right side telemetry: Network status, Live clock, theme toggle, audio alarm toggle, emergency badge */}
        <div className="flex items-center gap-2.5 text-[11px]">
          {/* Real-Time Network & API Connectivity Status Indicator */}
          {isOnline ? (
            <span
              id="network-status-online"
              className="bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded text-[10px] font-bold hidden sm:flex items-center gap-1.5"
              title="Live Cloud API & Real-Time Telemetry Connected"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
              <Wifi className="w-3 h-3 text-emerald-400" />
              <span>Online ({latencyMs !== null ? `${latencyMs}ms` : 'Active'})</span>
            </span>
          ) : (
            <button
              id="network-status-offline"
              onClick={() => retryConnection()}
              disabled={isReconnecting}
              className="bg-rose-500/20 text-rose-200 border border-rose-500/60 px-2 py-0.5 rounded text-[10px] font-bold flex items-center gap-1.5 animate-pulse shadow-md shadow-rose-950/60 hover:bg-rose-500/30 cursor-pointer"
              title="Click to attempt reconnecting to clinical API server"
            >
              <WifiOff className="w-3 h-3 text-rose-400 shrink-0" />
              <span>{isReconnecting ? 'Reconnecting...' : 'Connection Lost (Cached Mode)'}</span>
              <RotateCw className={`w-2.5 h-2.5 text-rose-300 ml-0.5 ${isReconnecting ? 'animate-spin' : ''}`} />
            </button>
          )}

          {/* Audio Chime Mute/Unmute Toggle */}
          <button
            onClick={handleToggleAudio}
            title={isAudioMuted ? 'Alarms Muted (Click to Unmute)' : 'Real-Time STAT Audio Alarm Active (Click to Mute)'}
            className={`p-1.5 rounded-lg border flex items-center gap-1 transition-all cursor-pointer ${
              isAudioMuted
                ? 'bg-slate-800/80 border-slate-700 text-slate-400 hover:text-white'
                : 'bg-rose-500/10 border-rose-500/40 text-rose-300 hover:bg-rose-500/20'
            }`}
          >
            {isAudioMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5 text-rose-400 animate-pulse" />}
            <span className="text-[10px] hidden sm:inline">{isAudioMuted ? 'Muted' : 'Alarm Active'}</span>
          </button>

          {/* Global Light / Dark Theme Toggle */}
          <button
            onClick={onToggleTheme}
            title={`Switch to ${theme === 'dark' ? 'Light Clinical Mode' : 'Night-Shift Dark Mode'}`}
            className="p-1.5 rounded-lg bg-slate-800/80 border border-slate-700 text-slate-300 hover:text-white hover:bg-slate-800 transition-all flex items-center gap-1.5 cursor-pointer"
          >
            {theme === 'dark' ? (
              <>
                <Sun className="w-3.5 h-3.5 text-amber-400" />
                <span className="text-[10px] font-bold text-amber-300 hidden sm:inline">Light UI</span>
              </>
            ) : (
              <>
                <Moon className="w-3.5 h-3.5 text-cyan-400" />
                <span className="text-[10px] font-bold text-cyan-300 hidden sm:inline">Night Mode</span>
              </>
            )}
          </button>

          <span className="text-slate-700 hidden sm:inline">|</span>

          {/* Live Clock */}
          <div className="flex items-center gap-1 text-slate-400 font-mono hidden md:flex">
            <Clock className="w-3 h-3 text-cyan-400" />
            <span>{currentTime || '00:00:00'}</span>
          </div>

          {/* Quick Lock Session Button */}
          {onLockSession && (
            <button
              onClick={onLockSession}
              title="Lock Clinician Session (Requires Biometric Re-authentication)"
              className="p-1.5 rounded-lg bg-slate-800/80 border border-slate-700 text-slate-400 hover:text-rose-400 hover:border-rose-800 transition-all flex items-center gap-1 cursor-pointer"
            >
              <Lock className="w-3.5 h-3.5 text-rose-400" />
              <span className="text-[10px] font-bold text-slate-300 hidden xl:inline">Lock Session</span>
            </button>
          )}

          {/* Emergency Alert Indicator */}
          {emergencyCount > 0 && (
            <button
              onClick={() => setActiveTab('DOCTOR_CDS')}
              className="bg-red-500/20 border border-red-500/60 text-red-300 px-2.5 py-0.5 rounded text-[10px] font-black flex items-center gap-1 animate-pulse hover:bg-red-500/30 cursor-pointer shadow-lg shadow-red-950/40"
            >
              <AlertTriangle className="w-3 h-3 text-red-400" />
              <span>{emergencyCount} Emergency Alert{emergencyCount > 1 ? 's' : ''}</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. Main Navigation Header */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-3">
          {/* Brand & Logo */}
          <div
            onClick={() => setActiveTab('INTAKE')}
            className="flex items-center gap-3 cursor-pointer select-none shrink-0"
          >
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-cyan-600 via-teal-500 to-emerald-400 p-0.5 flex items-center justify-center shadow-lg shadow-cyan-950/50 hover:scale-105 transition-transform">
              <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center">
                <HeartPulse className="w-6 h-6 text-cyan-400" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-black tracking-tight text-white">HIS AI-HealthAssist</h1>
                <span className="bg-cyan-500/20 text-cyan-300 text-[10px] font-black px-1.5 py-0.5 rounded border border-cyan-500/40 tracking-wider uppercase">
                  CDS v2026.2
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-normal">
                Hospital Information System & Clinical Decision Support
              </p>
            </div>
          </div>

          {/* Enhanced Patient Search with Recent Searches Dropdown */}
          <div ref={searchContainerRef} className="relative hidden md:block w-64 lg:w-80 shrink-0">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                id="header-global-search-input"
                type="text"
                placeholder="Search patient, MRN, district..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setShowSearchDropdown(true);
                }}
                onFocus={() => {
                  refreshRecentPatients();
                  setShowSearchDropdown(true);
                }}
                className="w-full bg-slate-950/80 border border-slate-700 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500 focus:bg-slate-900 transition-all"
              />
            </div>

            {/* Live Search & Recent Searches Dropdown */}
            {showSearchDropdown && (
              <div className="absolute top-full left-0 right-0 mt-1.5 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden z-50 animate-fade-in divide-y divide-slate-800">
                {/* 1. When Search Query is entered: show matching results */}
                {searchQuery.trim() ? (
                  <div>
                    <div className="p-2 text-[10px] font-bold text-slate-400 uppercase bg-slate-950 flex items-center justify-between">
                      <span>Search Results ({matchedPatients.length})</span>
                      <span className="text-[9px] text-cyan-400">Click to Open CDS</span>
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
                  /* 2. When Search Query is empty: show Recent Searches (Last 5 Viewed) */
                  <div>
                    <div className="p-2 text-[10px] font-bold text-slate-400 uppercase bg-slate-950 flex items-center justify-between">
                      <div className="flex items-center gap-1.5">
                        <History className="w-3 h-3 text-cyan-400" />
                        <span>Recently Viewed Patients ({recentPatients.length})</span>
                      </div>
                      {recentPatients.length > 0 && (
                        <button
                          onClick={handleClearRecents}
                          className="text-[9px] text-slate-400 hover:text-rose-400 flex items-center gap-1 cursor-pointer transition-colors"
                          title="Clear recent patient search history"
                        >
                          <Trash2 className="w-2.5 h-2.5" />
                          <span>Clear History</span>
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
                                  {recent.patientId} • {recent.district} ({recent.age}y/{recent.sex})
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
                        No recent patient records viewed yet. Click any patient to view.
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Desktop Navigation Tabs */}
          <nav className="hidden lg:flex items-center space-x-1 overflow-x-auto py-1">
            {navItems.map((item) => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  id={`nav-tab-${item.id.toLowerCase()}`}
                  onClick={() => setActiveTab(item.id)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                    isActive
                      ? 'bg-cyan-600 text-white shadow-md shadow-cyan-800/30'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
                  }`}
                >
                  {item.icon}
                  <span>{item.label}</span>
                  {item.badge !== undefined && (
                    <span className={`text-[10px] px-1.5 py-0.2 rounded-full border font-mono font-bold ${item.badgeColor || 'bg-slate-800 text-cyan-300 border-slate-700'}`}>
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Mobile Hamburger Menu Toggle */}
          <div className="flex lg:hidden items-center gap-2">
            <button
              id="mobile-drawer-toggle-btn"
              onClick={() => {
                if (onOpenMobileDrawer) {
                  onOpenMobileDrawer();
                } else {
                  setMobileMenuOpen(!mobileMenuOpen);
                }
              }}
              className="p-2 rounded-xl bg-slate-800 border border-slate-700 text-slate-300 hover:text-white cursor-pointer"
              title="Open Navigation Drawer"
            >
              <Menu className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="lg:hidden border-t border-slate-800 py-3 space-y-1 bg-slate-950 rounded-2xl px-2 mb-3 animate-fade-in shadow-2xl">
            {navItems.map((item) => {
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

      {/* Attending Physician Profile Switcher Modal */}
      {showDoctorModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl p-6 max-w-md w-full shadow-2xl text-white space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Stethoscope className="w-5 h-5 text-cyan-400" />
                <h3 className="font-bold text-sm text-white">Attending Clinician on Duty</h3>
              </div>
              <button
                onClick={() => setShowDoctorModal(false)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-400">
              Select the authenticated clinician profile for digital prescription signing and audit logging:
            </p>

            <div className="space-y-2">
              {[
                { name: 'Dr. Asim Farooq, MD, FCPS', role: 'Chief Consultant Cardiologist', license: 'PMDC-58921-P' },
                { name: 'Dr. Sarah Khan, MBBS, FCPS', role: 'Associate Professor Internal Medicine', license: 'PMDC-62104-P' },
                { name: 'Dr. Bilal Tariq, MD (Emergency CDS)', role: 'Emergency & Triage Specialist', license: 'PMDC-74319-P' },
              ].map((doc) => (
                <div
                  key={doc.license}
                  onClick={() => {
                    setAttendingDoctor(doc.name);
                    setShowDoctorModal(false);
                  }}
                  className={`p-3 rounded-2xl border cursor-pointer transition-all ${
                    attendingDoctor === doc.name
                      ? 'bg-cyan-950/60 border-cyan-500 shadow-md'
                      : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="font-bold text-xs text-white">{doc.name}</div>
                  <div className="text-[10px] text-slate-400">{doc.role}</div>
                  <div className="text-[9px] text-cyan-400 font-mono mt-0.5">PMDC License: {doc.license}</div>
                </div>
              ))}
            </div>

            <button
              onClick={() => setShowDoctorModal(false)}
              className="w-full bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs py-2.5 rounded-xl cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </header>
  );
};

