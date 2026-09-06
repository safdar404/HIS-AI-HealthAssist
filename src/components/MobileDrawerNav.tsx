import React from 'react';
import {
  Activity,
  ShieldCheck,
  Users,
  Calculator,
  MapPin,
  Cpu,
  BookOpen,
  History,
  X,
  Building2,
  UserCheck,
  PhoneCall,
  Download,
  Search,
  Sun,
  Moon,
  Volume2,
  VolumeX,
  Lock,
  HeartPulse,
  Bot,
} from 'lucide-react';
import { ActiveTab } from './Header';
import { PatientAssessmentRecord } from '../types/clinical';

interface MobileDrawerNavProps {
  isOpen: boolean;
  onClose: () => void;
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  emergencyCount: number;
  totalAssessments: number;
  facility: string;
  attendingDoctor: string;
  theme: 'light' | 'dark';
  onToggleTheme: () => void;
  isAudioMuted: boolean;
  onToggleAudio: () => void;
  onLockSession: () => void;
  onQuickIntake: () => void;
  onEmergencyDispatch: () => void;
  selectedAssessment?: PatientAssessmentRecord | null;
  onDownloadReport?: () => void;
}

export const MobileDrawerNav: React.FC<MobileDrawerNavProps> = ({
  isOpen,
  onClose,
  activeTab,
  setActiveTab,
  emergencyCount,
  totalAssessments,
  facility,
  attendingDoctor,
  theme,
  onToggleTheme,
  isAudioMuted,
  onToggleAudio,
  onLockSession,
  onQuickIntake,
  onEmergencyDispatch,
  selectedAssessment,
  onDownloadReport,
}) => {
  if (!isOpen) return null;

  const navItems: { id: ActiveTab; label: string; icon: React.ReactNode; badge?: number | string; badgeColor?: string; description: string }[] = [
    {
      id: 'INTAKE',
      label: 'Patient Intake & Triage',
      icon: <Activity className="w-5 h-5 text-cyan-400" />,
      description: 'Rapid field triage & automated risk scoring',
    },
    {
      id: 'DOCTOR_CDS',
      label: 'Doctor CDS Portal',
      icon: <ShieldCheck className="w-5 h-5 text-emerald-400" />,
      badge: totalAssessments,
      badgeColor: 'bg-emerald-950 text-emerald-300 border-emerald-700',
      description: 'Clinical decisions, medication checks & Rx sign-off',
    },
    {
      id: 'AI_AGENT',
      label: 'Live AI Agent & Hospitals Directory',
      icon: <Bot className="w-5 h-5 text-cyan-300 animate-pulse" />,
      badge: 'Live',
      badgeColor: 'bg-cyan-950 text-cyan-300 border-cyan-700',
      description: 'Clinical Q&A, Government hospitals & On-duty doctors',
    },
    {
      id: 'REGISTRY',
      label: 'Master Patient Registry (EHR)',
      icon: <Users className="w-5 h-5 text-blue-400" />,
      badge: totalAssessments,
      description: 'Electronic health records, export & search',
    },
    {
      id: 'CALCULATORS',
      label: 'Point-of-Care Calculators',
      icon: <Calculator className="w-5 h-5 text-rose-400" />,
      description: 'WHO CVD 10-Yr, CKD-EPI eGFR, BMI & MAP',
    },
    {
      id: 'GEO_AI',
      label: 'GeoAI Pakistan Surveillance',
      icon: <MapPin className="w-5 h-5 text-teal-400" />,
      badge: emergencyCount > 0 ? `${emergencyCount} STAT` : undefined,
      badgeColor: 'bg-rose-500 text-white animate-pulse',
      description: 'District heatmaps, 1122 dispatch & telemetry',
    },
    {
      id: 'ML_REGISTRY',
      label: 'ML Model Registry & Fairness',
      icon: <Cpu className="w-5 h-5 text-amber-400" />,
      description: 'XGBoost calibration, ROC-AUC & SHAP audits',
    },
    {
      id: 'GUIDELINES',
      label: 'Clinical Guidelines',
      icon: <BookOpen className="w-5 h-5 text-indigo-400" />,
      description: 'WHO HEARTS & PMDC protocol compendium',
    },
    {
      id: 'AUDIT_LOGS',
      label: 'Compliance Audit Ledger',
      icon: <History className="w-5 h-5 text-purple-400" />,
      description: 'HIPAA immutable logs, CSV export & print report',
    },
  ];

  return (
    <div className="fixed inset-0 z-50 lg:hidden font-sans">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm transition-opacity animate-fade-in"
        onClick={onClose}
      />

      {/* Slide-Over Drawer Container */}
      <div className="fixed inset-y-0 left-0 w-full max-w-xs sm:max-w-sm bg-slate-900 border-r border-slate-800 text-white shadow-2xl flex flex-col justify-between overflow-hidden animate-slide-in-right">
        {/* Drawer Header */}
        <div className="p-5 bg-slate-950 border-b border-slate-800">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-600 to-teal-500 flex items-center justify-center text-white shadow-md">
                <HeartPulse className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-black text-sm text-white tracking-tight">HIS AI-HealthAssist</h3>
                <span className="text-[10px] text-cyan-400 font-mono">Field Clinical Triage</span>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-xl bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Clinician & Facility Card */}
          <div className="mt-4 p-3 rounded-xl bg-slate-900/90 border border-slate-800 space-y-1.5 text-xs">
            <div className="flex items-center gap-2 text-emerald-400 font-bold text-[11px]">
              <UserCheck className="w-3.5 h-3.5" />
              <span className="truncate">{attendingDoctor}</span>
            </div>
            <div className="flex items-center gap-2 text-slate-400 text-[10px]">
              <Building2 className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
              <span className="truncate">{facility}</span>
            </div>
          </div>
        </div>

        {/* Quick STAT Action Buttons */}
        <div className="p-3 bg-slate-950/60 border-b border-slate-800 grid grid-cols-2 gap-2">
          <button
            onClick={() => {
              onQuickIntake();
              onClose();
            }}
            className="p-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-md shadow-cyan-950/50 cursor-pointer"
          >
            <Activity className="w-3.5 h-3.5" />
            <span>+ New Intake</span>
          </button>

          <button
            onClick={() => {
              onEmergencyDispatch();
              onClose();
            }}
            className="p-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-md shadow-rose-950/50 cursor-pointer animate-pulse"
          >
            <PhoneCall className="w-3.5 h-3.5" />
            <span>1122 STAT</span>
          </button>
        </div>

        {/* Navigation Item Links */}
        <div className="flex-1 overflow-y-auto p-3 space-y-1 divide-y divide-slate-800/40">
          <div className="px-2 py-1 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
            Clinical Modules
          </div>

          <div className="space-y-1 pt-1">
            {navItems.map((item) => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  id={`mobile-drawer-nav-${item.id.toLowerCase()}`}
                  onClick={() => {
                    setActiveTab(item.id);
                    onClose();
                  }}
                  className={`w-full p-3 rounded-2xl text-left flex items-start justify-between transition-all cursor-pointer ${
                    isActive
                      ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-950/60'
                      : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5">{item.icon}</div>
                    <div>
                      <div className="text-xs font-bold leading-tight">{item.label}</div>
                      <div className={`text-[10px] mt-0.5 ${isActive ? 'text-cyan-100' : 'text-slate-400'}`}>
                        {item.description}
                      </div>
                    </div>
                  </div>

                  {item.badge !== undefined && (
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full border font-mono font-bold shrink-0 ${
                        item.badgeColor || 'bg-slate-800 text-cyan-300 border-slate-700'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Bottom Drawer Actions: Theme, Audio, Lock */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 space-y-3">
          <div className="grid grid-cols-3 gap-2 text-xs">
            <button
              onClick={onToggleTheme}
              className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white flex flex-col items-center gap-1 cursor-pointer"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-cyan-400" />}
              <span className="text-[10px] font-bold">{theme === 'dark' ? 'Light UI' : 'Night'}</span>
            </button>

            <button
              onClick={onToggleAudio}
              className={`p-2 rounded-xl border flex flex-col items-center gap-1 cursor-pointer transition-colors ${
                isAudioMuted
                  ? 'bg-slate-900 border-slate-800 text-slate-400'
                  : 'bg-rose-500/20 border-rose-500/40 text-rose-300'
              }`}
            >
              {isAudioMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4 text-rose-400 animate-pulse" />}
              <span className="text-[10px] font-bold">{isAudioMuted ? 'Muted' : 'Alarm On'}</span>
            </button>

            <button
              onClick={() => {
                onLockSession();
                onClose();
              }}
              className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-rose-400 flex flex-col items-center gap-1 cursor-pointer hover:border-rose-800/60 transition-colors"
            >
              <Lock className="w-4 h-4 text-rose-400" />
              <span className="text-[10px] font-bold">Lock CDS</span>
            </button>
          </div>

          {selectedAssessment && onDownloadReport && (
            <button
              onClick={() => {
                onDownloadReport();
                onClose();
              }}
              className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-emerald-950/40"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download PDF ({selectedAssessment.demographics.fullName.split(' ')[0]})</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
