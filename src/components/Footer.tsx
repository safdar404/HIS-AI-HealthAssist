import React, { useState } from 'react';
import {
  ShieldCheck,
  HeartPulse,
  FileCode2,
  Lock,
  PhoneCall,
  Activity,
  Award,
  BookOpen,
  Info,
  AlertTriangle,
  FileText,
  ExternalLink,
} from 'lucide-react';
import { FooterModals, FooterModalType } from './FooterModals';

interface FooterProps {
  onOpenGuidelines?: () => void;
  onOpenCalculators?: () => void;
  onOpenAuditLogs?: () => void;
}

export const Footer: React.FC<FooterProps> = ({
  onOpenGuidelines,
  onOpenCalculators,
  onOpenAuditLogs,
}) => {
  const [activeModal, setActiveModal] = useState<FooterModalType>(null);

  return (
    <>
      <footer className="bg-slate-900 border-t border-slate-800 text-slate-400 text-xs mt-16 font-sans transition-colors duration-200">
        {/* Top Clinical Compliance & Emergency Ribbon */}
        <div className="border-b border-slate-800/80 bg-slate-950/60 py-4 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
            {/* Emergency Hotline Bar */}
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <PhoneCall className="w-3.5 h-3.5 text-rose-400" />
                Emergency Response Hotlines:
              </span>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => setActiveModal('EMERGENCY_HOTLINES')}
                  className="bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 px-2.5 py-1 rounded-md text-[11px] font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <span>Emergency EMS: 1122 / 911</span>
                </button>
                <button
                  onClick={() => setActiveModal('EMERGENCY_HOTLINES')}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 px-2.5 py-1 rounded-md text-[11px] font-mono flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <span>Poison Control: 0800-POISON</span>
                </button>
                <button
                  onClick={() => setActiveModal('EMERGENCY_HOTLINES')}
                  className="bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 px-2.5 py-1 rounded-md text-[11px] font-mono flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <span>Tele-Cardiology 24/7 Line</span>
                </button>
              </div>
            </div>

            {/* Quick Regulatory Badges */}
            <div className="flex flex-wrap items-center gap-2 text-[11px]">
              <button
                onClick={() => setActiveModal('EVIDENCE')}
                className="inline-flex items-center gap-1 bg-emerald-950/40 hover:bg-emerald-900/60 text-emerald-300 border border-emerald-800/50 px-2 py-0.5 rounded transition-colors cursor-pointer"
              >
                <ShieldCheck className="w-3 h-3 text-emerald-400" />
                WHO HEARTS 2026
              </button>
              <button
                onClick={() => setActiveModal('INTEROPERABILITY')}
                className="inline-flex items-center gap-1 bg-cyan-950/40 hover:bg-cyan-900/60 text-cyan-300 border border-cyan-800/50 px-2 py-0.5 rounded transition-colors cursor-pointer"
              >
                <FileCode2 className="w-3 h-3 text-cyan-400" />
                HL7® FHIR® R4
              </button>
              <button
                onClick={() => setActiveModal('SECURITY_COMPLIANCE')}
                className="inline-flex items-center gap-1 bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 px-2 py-0.5 rounded transition-colors cursor-pointer"
              >
                <Lock className="w-3 h-3 text-slate-400" />
                HIPAA §164.312
              </button>
            </div>
          </div>
        </div>

        {/* Main Footer Body */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {/* Col 1: System Identity */}
            <div className="space-y-3 md:col-span-1">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-cyan-600 to-teal-500 flex items-center justify-center text-white shadow-md">
                  <HeartPulse className="w-5 h-5" />
                </div>
                <span className="font-bold text-white text-sm">HIS AI-HealthAssist</span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Hospital-grade Clinical Decision Support (CDS) & GeoAI Public Health Surveillance Platform for primary
                health centers, district hospitals, and tele-triage nodes.
              </p>
              <div className="text-[10px] text-slate-500 font-mono">
                Build Version: 2026.2.4-PROD • Node Latency: 28ms
              </div>
            </div>

            {/* Col 2: Clinical Evidence Standards */}
            <div className="space-y-2 text-[11px]">
              <h4 className="font-bold text-slate-200 uppercase tracking-wider text-[10px] flex items-center justify-between">
                <span>Clinical Evidence Standards</span>
                <button
                  onClick={onOpenGuidelines}
                  className="text-cyan-400 hover:underline text-[10px] font-semibold cursor-pointer"
                >
                  View All &rarr;
                </button>
              </h4>
              <ul className="space-y-1.5 text-slate-400">
                <li
                  onClick={() => setActiveModal('EVIDENCE')}
                  className="hover:text-cyan-300 transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <span className="w-1 h-1 rounded-full bg-cyan-400"></span>
                  WHO HEARTS Technical Package
                </li>
                <li
                  onClick={() => setActiveModal('EVIDENCE')}
                  className="hover:text-cyan-300 transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <span className="w-1 h-1 rounded-full bg-cyan-400"></span>
                  2026 Hypertension Compendium
                </li>
                <li
                  onClick={() => setActiveModal('EVIDENCE')}
                  className="hover:text-cyan-300 transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <span className="w-1 h-1 rounded-full bg-cyan-400"></span>
                  ADA Standards of Medical Care
                </li>
                <li
                  onClick={() => setActiveModal('EVIDENCE')}
                  className="hover:text-cyan-300 transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <span className="w-1 h-1 rounded-full bg-cyan-400"></span>
                  KDIGO 2026 CKD Clinical Practice
                </li>
              </ul>
            </div>

            {/* Col 3: System Architecture & Governance */}
            <div className="space-y-2 text-[11px]">
              <h4 className="font-bold text-slate-200 uppercase tracking-wider text-[10px]">
                Interoperability & Governance
              </h4>
              <ul className="space-y-1.5 text-slate-400">
                <li
                  onClick={() => setActiveModal('INTEROPERABILITY')}
                  className="hover:text-emerald-300 transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <span className="w-1 h-1 rounded-full bg-emerald-400"></span>
                  HL7® FHIR® R4 / US Core Bundles
                </li>
                <li
                  onClick={() => setActiveModal('INTEROPERABILITY')}
                  className="hover:text-emerald-300 transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <span className="w-1 h-1 rounded-full bg-emerald-400"></span>
                  SNOMED CT & LOINC Standard Coded
                </li>
                <li
                  onClick={() => setActiveModal('SECURITY_COMPLIANCE')}
                  className="hover:text-emerald-300 transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <span className="w-1 h-1 rounded-full bg-emerald-400"></span>
                  FDA 21 CFR 860 SaMD Tier II Compliant
                </li>
                <li
                  onClick={() => setActiveModal('INTEROPERABILITY')}
                  className="hover:text-emerald-300 transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <span className="w-1 h-1 rounded-full bg-emerald-400"></span>
                  Explainable AI (SHAP Value Rationale)
                </li>
              </ul>
            </div>

            {/* Col 4: Legal & Safety Governance */}
            <div className="space-y-2 text-[11px]">
              <h4 className="font-bold text-slate-200 uppercase tracking-wider text-[10px]">
                Physician Notice & Disclaimers
              </h4>
              <p className="text-slate-400 leading-relaxed text-[11px]">
                <strong>Non-Autonomous CDS:</strong> This system is an auxiliary clinical aid for certified medical
                practitioners. It does not replace clinical acumen, emergency diagnostics, or licensed physician review.
              </p>
              <div className="pt-1 flex items-center justify-between">
                <button
                  onClick={onOpenAuditLogs}
                  className="inline-flex items-center gap-1 text-emerald-300 hover:text-emerald-200 font-semibold text-[10px] cursor-pointer"
                >
                  <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                  <span>Encrypted Audit Logs Active &rarr;</span>
                </button>
                <button
                  onClick={() => setActiveModal('DISCLAIMER')}
                  className="text-amber-400 hover:underline text-[10px] font-semibold cursor-pointer"
                >
                  Full Disclaimer
                </button>
              </div>
            </div>
          </div>

          {/* Bottom copyright line & Developer Attribution */}
          <div className="mt-8 pt-4 border-t border-slate-800 text-[11px] flex flex-col sm:flex-row items-center justify-between gap-2 text-slate-400">
            <div className="flex flex-wrap items-center gap-2">
              <span>© 2026 HIS AI-HealthAssist Clinical Intelligence Core.</span>
              <span className="text-cyan-400 font-bold bg-cyan-950/60 border border-cyan-800/60 px-2 py-0.5 rounded">
                Developed by Muhammad Safdar AI/ML Engineer
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-4 text-slate-500">
              <button
                onClick={() => setActiveModal('INTEROPERABILITY')}
                className="hover:text-slate-300 transition-colors cursor-pointer"
              >
                Leaflet GIS & Python GeoAI
              </button>
              <span>•</span>
              <button
                onClick={() => setActiveModal('SECURITY_COMPLIANCE')}
                className="hover:text-slate-300 transition-colors cursor-pointer"
              >
                ISO 13485 / IEC 62304 Compliant
              </button>
            </div>
          </div>
        </div>
      </footer>

      {/* Interactive Footer Modal Dialogs */}
      <FooterModals activeModal={activeModal} onClose={() => setActiveModal(null)} />
    </>
  );
};
