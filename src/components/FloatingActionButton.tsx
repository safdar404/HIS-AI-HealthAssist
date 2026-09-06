import React, { useState, useEffect, useRef } from 'react';
import {
  Plus,
  X,
  UserPlus,
  Calculator,
  Search,
  Download,
  PhoneCall,
  Activity,
  AlertTriangle,
  FileText,
  Sparkles,
  Zap,
  Bot,
} from 'lucide-react';

interface FloatingActionButtonProps {
  onNewIntake: () => void;
  onLaunchCalculators: () => void;
  onOpenSearch: () => void;
  onDownloadReport: () => void;
  onEmergencyHotlines: () => void;
  onLaunchAIAgent?: () => void;
  hasActivePatient: boolean;
  activePatientName?: string;
  emergencyCount?: number;
}

export const FloatingActionButton: React.FC<FloatingActionButtonProps> = ({
  onNewIntake,
  onLaunchCalculators,
  onOpenSearch,
  onDownloadReport,
  onEmergencyHotlines,
  onLaunchAIAgent,
  hasActivePatient,
  activePatientName,
  emergencyCount = 0,
}) => {
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const fabRef = useRef<HTMLDivElement>(null);

  // Close speed dial on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (fabRef.current && !fabRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore when user is actively typing in input or textarea
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return;
      }

      if (e.altKey && (e.key === 'n' || e.key === 'N')) {
        e.preventDefault();
        onNewIntake();
        setIsOpen(false);
      } else if (e.altKey && (e.key === 'a' || e.key === 'A')) {
        e.preventDefault();
        if (onLaunchAIAgent) {
          onLaunchAIAgent();
          setIsOpen(false);
        }
      } else if (e.altKey && (e.key === 'c' || e.key === 'C')) {
        e.preventDefault();
        onLaunchCalculators();
        setIsOpen(false);
      } else if (e.altKey && (e.key === 's' || e.key === 'S')) {
        e.preventDefault();
        onOpenSearch();
        setIsOpen(false);
      } else if (e.altKey && (e.key === 'd' || e.key === 'D' || e.key === 'p' || e.key === 'P')) {
        e.preventDefault();
        if (hasActivePatient) {
          onDownloadReport();
          setIsOpen(false);
        }
      } else if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onNewIntake, onLaunchCalculators, onOpenSearch, onDownloadReport, onLaunchAIAgent, hasActivePatient]);

  return (
    <div ref={fabRef} className="fixed bottom-6 right-6 z-40 flex flex-col items-end gap-2.5 print:hidden">
      {/* Speed Dial Menu Items */}
      {isOpen && (
        <div className="flex flex-col items-end gap-2 mb-1 animate-fade-in">
          {/* Action 1: New Patient Intake */}
          <div className="flex items-center gap-2.5 group">
            <span className="bg-slate-900/90 text-white text-[11px] font-bold px-2.5 py-1 rounded-xl shadow-lg border border-slate-700 whitespace-nowrap opacity-95 group-hover:opacity-100 transition-opacity flex items-center gap-1.5">
              <span>New Patient Intake</span>
            </span>
            <button
              id="fab-action-new-intake"
              onClick={() => {
                onNewIntake();
                setIsOpen(false);
              }}
              className="w-10 h-10 rounded-2xl bg-cyan-600 hover:bg-cyan-500 text-white flex items-center justify-center shadow-lg shadow-cyan-900/40 hover:scale-105 active:scale-95 transition-all cursor-pointer"
              title="Start New Patient Intake Assessment"
            >
              <UserPlus className="w-4 h-4" />
            </button>
          </div>

          {/* Action 1.5: Live AI Agent & Hospitals */}
          {onLaunchAIAgent && (
            <div className="flex items-center gap-2.5 group">
              <span className="bg-slate-900/90 text-white text-[11px] font-bold px-2.5 py-1 rounded-xl shadow-lg border border-slate-700 whitespace-nowrap opacity-95 group-hover:opacity-100 transition-opacity flex items-center gap-1.5">
                <span>AI Clinical Agent & Hospitals</span>
              </span>
              <button
                id="fab-action-ai-agent"
                onClick={() => {
                  onLaunchAIAgent();
                  setIsOpen(false);
                }}
                className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white flex items-center justify-center shadow-lg shadow-cyan-900/40 hover:scale-105 active:scale-95 transition-all cursor-pointer"
                title="Launch Live AI Agent & Hospital Directory"
              >
                <Bot className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Action 2: Launch Emergency / Point-of-Care Calculator */}
          <div className="flex items-center gap-2.5 group">
            <span className="bg-slate-900/90 text-white text-[11px] font-bold px-2.5 py-1 rounded-xl shadow-lg border border-slate-700 whitespace-nowrap opacity-95 group-hover:opacity-100 transition-opacity flex items-center gap-1.5">
              <span>Clinical Calculators (CVD/eGFR/BMI)</span>
            </span>
            <button
              id="fab-action-calculators"
              onClick={() => {
                onLaunchCalculators();
                setIsOpen(false);
              }}
              className="w-10 h-10 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white flex items-center justify-center shadow-lg shadow-rose-900/40 hover:scale-105 active:scale-95 transition-all cursor-pointer"
              title="Launch Clinical Calculators"
            >
              <Calculator className="w-4 h-4" />
            </button>
          </div>

          {/* Action 3: Quick Patient Search */}
          <div className="flex items-center gap-2.5 group">
            <span className="bg-slate-900/90 text-white text-[11px] font-bold px-2.5 py-1 rounded-xl shadow-lg border border-slate-700 whitespace-nowrap opacity-95 group-hover:opacity-100 transition-opacity flex items-center gap-1.5">
              <span>Global Patient Search</span>
            </span>
            <button
              id="fab-action-search"
              onClick={() => {
                onOpenSearch();
                setIsOpen(false);
              }}
              className="w-10 h-10 rounded-2xl bg-amber-600 hover:bg-amber-500 text-white flex items-center justify-center shadow-lg shadow-amber-900/40 hover:scale-105 active:scale-95 transition-all cursor-pointer"
              title="Search Patient Database"
            >
              <Search className="w-4 h-4" />
            </button>
          </div>

          {/* Action 4: Download Active Patient Report (if patient loaded) */}
          {hasActivePatient && (
            <div className="flex items-center gap-2.5 group">
              <span className="bg-slate-900/90 text-white text-[11px] font-bold px-2.5 py-1 rounded-xl shadow-lg border border-slate-700 whitespace-nowrap opacity-95 group-hover:opacity-100 transition-opacity flex items-center gap-1.5">
                <span>Download Report ({activePatientName || 'Active Patient'})</span>
              </span>
              <button
                id="fab-action-download-pdf"
                onClick={() => {
                  onDownloadReport();
                  setIsOpen(false);
                }}
                className="w-10 h-10 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white flex items-center justify-center shadow-lg shadow-emerald-900/40 hover:scale-105 active:scale-95 transition-all cursor-pointer"
                title="Download Patient Assessment PDF Report"
              >
                <Download className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Action 5: Emergency 1122 Dispatch */}
          <div className="flex items-center gap-2.5 group">
            <span className="bg-slate-900/90 text-white text-[11px] font-bold px-2.5 py-1 rounded-xl shadow-lg border border-slate-700 whitespace-nowrap opacity-95 group-hover:opacity-100 transition-opacity flex items-center gap-1.5">
              <span>Emergency 1122 Dispatch</span>
              <span className="bg-rose-500 text-white text-[9px] px-1 py-0.2 rounded font-bold">STAT</span>
            </span>
            <button
              id="fab-action-emergency-hotline"
              onClick={() => {
                onEmergencyHotlines();
                setIsOpen(false);
              }}
              className="w-10 h-10 rounded-2xl bg-red-600 hover:bg-red-500 text-white flex items-center justify-center shadow-lg shadow-red-900/50 hover:scale-105 active:scale-95 transition-all cursor-pointer animate-pulse"
              title="Emergency EMS 1122 Hotlines"
            >
              <PhoneCall className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Primary Floating Action Toggle Button */}
      <button
        id="fab-primary-toggle-btn"
        onClick={() => setIsOpen((prev) => !prev)}
        aria-label="Toggle Clinical Quick Actions Speed Dial Menu"
        aria-expanded={isOpen}
        className={`w-13 h-13 rounded-2xl flex items-center justify-center shadow-2xl transition-all duration-300 cursor-pointer relative group ${
          isOpen
            ? 'bg-slate-900 text-white rotate-45 border border-slate-700 shadow-slate-950/60'
            : 'bg-gradient-to-tr from-cyan-600 to-teal-500 hover:from-cyan-500 hover:to-teal-400 text-white shadow-cyan-950/60 hover:scale-105 active:scale-95'
        }`}
      >
        {isOpen ? (
          <Plus className="w-6 h-6 transition-transform" />
        ) : (
          <>
            <Zap className="w-6 h-6 group-hover:scale-110 transition-transform" />
            {emergencyCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 bg-rose-500 text-white text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center ring-2 ring-slate-900 animate-pulse">
                {emergencyCount}
              </span>
            )}
          </>
        )}
      </button>
    </div>
  );
};
