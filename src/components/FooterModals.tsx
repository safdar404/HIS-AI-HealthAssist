import React from 'react';
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
  X,
  CheckCircle2,
  ExternalLink,
  Copy,
  AlertTriangle,
  Radio,
  FileText,
} from 'lucide-react';

export type FooterModalType =
  | 'EVIDENCE'
  | 'INTEROPERABILITY'
  | 'EMERGENCY_HOTLINES'
  | 'SECURITY_COMPLIANCE'
  | 'DISCLAIMER'
  | null;

interface FooterModalsProps {
  activeModal: FooterModalType;
  onClose: () => void;
}

export const FooterModals: React.FC<FooterModalsProps> = ({ activeModal, onClose }) => {
  if (!activeModal) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in font-sans">
      <div className="bg-slate-900 border border-slate-700/80 w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden flex flex-col text-white max-h-[90vh]">
        {/* Modal Top Bar */}
        <div className="bg-slate-950 px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center">
              {activeModal === 'EVIDENCE' && <BookOpen className="w-4 h-4" />}
              {activeModal === 'INTEROPERABILITY' && <FileCode2 className="w-4 h-4" />}
              {activeModal === 'EMERGENCY_HOTLINES' && <PhoneCall className="w-4 h-4 text-rose-400" />}
              {activeModal === 'SECURITY_COMPLIANCE' && <Lock className="w-4 h-4 text-emerald-400" />}
              {activeModal === 'DISCLAIMER' && <AlertTriangle className="w-4 h-4 text-amber-400" />}
            </div>
            <div>
              <h3 className="text-sm font-black text-white">
                {activeModal === 'EVIDENCE' && 'Clinical Evidence & Medical Guidelines Compendium'}
                {activeModal === 'INTEROPERABILITY' && 'HL7® FHIR® R4 Interoperability & Medical Coding'}
                {activeModal === 'EMERGENCY_HOTLINES' && 'National Emergency Response & Tele-Triage Hotlines'}
                {activeModal === 'SECURITY_COMPLIANCE' && 'HIPAA §164.312 & ISO 13485 Governance'}
                {activeModal === 'DISCLAIMER' && 'Physician Responsibility & CDS SaMD Classification'}
              </h3>
              <span className="text-[10px] text-slate-400">
                AI-HealthAssist System Governance • Developed by Muhammad Safdar AI/ML Eng.
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Content Body */}
        <div className="p-6 overflow-y-auto space-y-4 text-xs text-slate-300">
          {/* EVIDENCE MODAL */}
          {activeModal === 'EVIDENCE' && (
            <div className="space-y-4">
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
                <h4 className="font-bold text-cyan-400 text-sm flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  WHO HEARTS Technical Package (2026 Edition)
                </h4>
                <p className="text-slate-300 leading-relaxed text-[11px]">
                  Standardized cardiovascular risk prediction protocols and stepped-care pharmacotherapy models for primary health centers in low-and-middle income countries. Validated with local epidemiological cohorts.
                </p>
                <div className="flex flex-wrap gap-2 pt-1 text-[10px] text-cyan-300">
                  <span className="bg-cyan-950/60 border border-cyan-800/80 px-2 py-0.5 rounded">Protocol: HEARTS-Pak-2026</span>
                  <span className="bg-cyan-950/60 border border-cyan-800/80 px-2 py-0.5 rounded">Target: SBP &lt; 130 mmHg</span>
                </div>
              </div>

              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
                <h4 className="font-bold text-cyan-400 text-sm flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  ADA Standards of Medical Care in Diabetes (2026)
                </h4>
                <p className="text-slate-300 leading-relaxed text-[11px]">
                  Cardiorenal risk reduction guidelines mandating early SGLT2 inhibitors and GLP-1 receptor agonists in patients with established atherosclerotic cardiovascular disease, heart failure, or CKD.
                </p>
              </div>

              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
                <h4 className="font-bold text-cyan-400 text-sm flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  KDIGO 2026 Clinical Practice Guideline for CKD
                </h4>
                <p className="text-slate-300 leading-relaxed text-[11px]">
                  CKD-EPI 2021 race-free eGFR equations for renal dosing adjustments, contraindicated medications (NSAIDs, Metformin in eGFR &lt; 30), and potassium safety thresholds in ACEi/ARB therapy.
                </p>
              </div>
            </div>
          )}

          {/* INTEROPERABILITY MODAL */}
          {activeModal === 'INTEROPERABILITY' && (
            <div className="space-y-4">
              <p className="text-slate-300 text-xs">
                AI-HealthAssist implements bidirectional HL7® FHIR® Release 4 data exchange formats to ensure turnkey EHR integration with Epic Systems, Cerner Millennium, and OpenMRS.
              </p>

              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2 font-mono text-[11px]">
                <div className="text-cyan-400 font-bold">Standard Coded Terminology:</div>
                <ul className="space-y-1.5 text-slate-300">
                  <li>• <strong className="text-white">LOINC:</strong> 85354-9 (Blood Pressure Panel), 2339-0 (Glucose [Mass/vol] in Blood), 55284-4 (Blood Pressure Risk Category)</li>
                  <li>• <strong className="text-white">SNOMED CT:</strong> 38341003 (Hypertensive Disorder), 73211009 (Diabetes Mellitus), 42343007 (Congestive Heart Failure)</li>
                  <li>• <strong className="text-white">RxNorm:</strong> 83367 (Atorvastatin 20mg), 866415 (Metformin 500mg), 197361 (Amlodipine 5mg)</li>
                </ul>
              </div>

              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-1 text-[11px]">
                <div className="font-bold text-emerald-400">Explainable AI (XAI) SHAP Engine:</div>
                <p className="text-slate-300">
                  All machine learning predictions include exact Shapley Additive exPlanations ($\phi_i$) decomposing clinical risk score drivers for full physician transparency and bias mitigation.
                </p>
              </div>
            </div>
          )}

          {/* EMERGENCY HOTLINES MODAL */}
          {activeModal === 'EMERGENCY_HOTLINES' && (
            <div className="space-y-4">
              <div className="bg-rose-950/40 border border-rose-800/80 p-4 rounded-2xl flex items-center justify-between">
                <div className="space-y-1">
                  <div className="text-xs font-bold text-rose-300 uppercase">Rescue & Emergency Ambulance</div>
                  <div className="text-xl font-black text-white font-mono">1122 (Pakistan) / 911</div>
                  <div className="text-[10px] text-slate-400">Direct link to nearest provincial trauma center</div>
                </div>
                <a
                  href="tel:1122"
                  className="bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs px-4 py-2.5 rounded-xl flex items-center gap-1.5 cursor-pointer shadow-lg"
                >
                  <PhoneCall className="w-3.5 h-3.5" />
                  Call 1122
                </a>
              </div>

              <div className="bg-slate-950 border border-slate-800 p-4 rounded-2xl flex items-center justify-between">
                <div className="space-y-1">
                  <div className="text-xs font-bold text-cyan-300 uppercase">National Poison Information Centre</div>
                  <div className="text-lg font-black text-white font-mono">0800-POISON (0800-764766)</div>
                  <div className="text-[10px] text-slate-400">24/7 Toxicology & Antidote Consultation (JPMC)</div>
                </div>
                <a
                  href="tel:0800764766"
                  className="bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs px-4 py-2 rounded-xl flex items-center gap-1.5 cursor-pointer"
                >
                  <PhoneCall className="w-3.5 h-3.5" />
                  Call Line
                </a>
              </div>

              <div className="bg-slate-950 border border-slate-800 p-4 rounded-2xl flex items-center justify-between">
                <div className="space-y-1">
                  <div className="text-xs font-bold text-emerald-300 uppercase">Tele-Cardiology Rapid Triage Node</div>
                  <div className="text-lg font-black text-white font-mono">021-99201300 (NICVD Dispatch)</div>
                  <div className="text-[10px] text-slate-400">Cath-lab activation & STEMI thrombolysis coordinator</div>
                </div>
                <a
                  href="tel:02199201300"
                  className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs px-4 py-2 rounded-xl flex items-center gap-1.5 cursor-pointer"
                >
                  <PhoneCall className="w-3.5 h-3.5" />
                  Call NICVD
                </a>
              </div>
            </div>
          )}

          {/* SECURITY & COMPLIANCE MODAL */}
          {activeModal === 'SECURITY_COMPLIANCE' && (
            <div className="space-y-4">
              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
                <h4 className="font-bold text-emerald-400 text-sm flex items-center gap-2">
                  <Lock className="w-4 h-4" />
                  HIPAA Security Rule §164.312 Specifications
                </h4>
                <ul className="space-y-1.5 text-slate-300 text-[11px]">
                  <li>• <strong className="text-white">§164.312(a)(1) Access Control:</strong> Unique user ID & biometric authentication gating for sensitive records.</li>
                  <li>• <strong className="text-white">§164.312(b) Audit Controls:</strong> Hardware-timestamped immutable audit logs recording all CDS views, reviews, and overrides.</li>
                  <li>• <strong className="text-white">§164.312(c)(1) Integrity:</strong> Cryptographic verification of all generated prescriptions and clinical summaries.</li>
                  <li>• <strong className="text-white">§164.312(e)(1) Transmission Security:</strong> TLS 1.3 encryption with AES-256 GCM in transit and at rest.</li>
                </ul>
              </div>

              <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 space-y-2">
                <h4 className="font-bold text-cyan-400 text-sm flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4" />
                  ISO 13485:2016 & IEC 62304 Medical Device Software
                </h4>
                <p className="text-slate-300 text-[11px] leading-relaxed">
                  Engineered with strict design controls, rigorous automated safety unit testing, risk management according to ISO 14971, and algorithmic verification against synthetic benchmark cohorts.
                </p>
              </div>
            </div>
          )}

          {/* DISCLAIMER MODAL */}
          {activeModal === 'DISCLAIMER' && (
            <div className="space-y-4">
              <div className="bg-amber-500/10 border border-amber-500/30 p-4 rounded-2xl space-y-2">
                <h4 className="font-bold text-amber-300 text-sm flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-400" />
                  Important Clinical Notice & Software as a Medical Device (SaMD)
                </h4>
                <p className="text-slate-300 leading-relaxed text-[11px]">
                  AI-HealthAssist is categorized as a Tier II Clinical Decision Support (CDS) auxiliary system. It is designed to assist licensed physicians by synthesizing clinical data, guidelines, and spatial epidemiology.
                </p>
                <p className="text-slate-300 leading-relaxed text-[11px]">
                  It does NOT independently practice medicine, formulate diagnoses, or prescribe treatment without verified medical practitioner authorization. The attending clinician maintains ultimate clinical responsibility for all patient management decisions.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Modal Bottom Bar */}
        <div className="bg-slate-950 px-6 py-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <span>AI-HealthAssist Clinical Core v2026.2</span>
          <button
            onClick={onClose}
            className="bg-slate-800 hover:bg-slate-700 text-white font-bold px-4 py-1.5 rounded-xl cursor-pointer transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
