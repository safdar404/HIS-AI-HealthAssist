import React, { useState, useEffect } from 'react';
import {
  HospitalGeoNode,
  LiveDistrictSurveillance,
} from '../data/pakistanGeoData';
import { PatientAssessmentRecord } from '../types/clinical';
import {
  Building2,
  PhoneCall,
  X,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Radio,
  Send,
  Loader2,
  FileText,
  Copy,
  Printer,
  HeartPulse,
  Share2,
  ShieldCheck,
  Check,
} from 'lucide-react';

interface SimulatedReferralModalProps {
  hospital: HospitalGeoNode;
  activePatient: PatientAssessmentRecord;
  onClose: () => void;
  onConfirmReferral?: (referralData: any) => void;
}

export const SimulatedReferralModal: React.FC<SimulatedReferralModalProps> = ({
  hospital,
  activePatient,
  onClose,
  onConfirmReferral,
}) => {
  const [referralUrgency, setReferralUrgency] = useState<'EMERGENCY_ALS' | 'URGENT_ICU' | 'ROUTINE_OPD'>('EMERGENCY_ALS');
  const [referralReason, setReferralReason] = useState<string>(
    activePatient.assessmentResult?.triage.level === 'LEVEL_1_EMERGENCY'
      ? 'Emergency catheterization & ICU stabilization for Hypertensive Crisis with acute cardiac risk'
      : 'Specialist cardiology consult & comprehensive cardiovascular workup'
  );
  const [simulationState, setSimulationState] = useState<'IDLE' | 'TRANSMITTING' | 'BED_RESERVATION' | 'AMBULANCE_DISPATCH' | 'CONFIRMED'>('IDLE');
  const [copiedId, setCopiedId] = useState<boolean>(false);
  const [trackingId] = useState<string>(() => `REF-${Math.floor(100000 + Math.random() * 900000)}`);

  // Handle simulated referral execution with timed steps
  const handleInitiateSimulation = () => {
    setSimulationState('TRANSMITTING');

    setTimeout(() => {
      setSimulationState('BED_RESERVATION');
    }, 1200);

    setTimeout(() => {
      setSimulationState('AMBULANCE_DISPATCH');
    }, 2400);

    setTimeout(() => {
      setSimulationState('CONFIRMED');
      if (onConfirmReferral) {
        onConfirmReferral({
          trackingId,
          hospitalName: hospital.name,
          patientName: activePatient.demographics.fullName,
          urgency: referralUrgency,
          timestamp: new Date().toISOString(),
        });
      }
    }, 3800);
  };

  const copyTrackingId = () => {
    navigator.clipboard.writeText(trackingId);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 space-y-5 animate-in fade-in duration-200 my-8">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-50 rounded-xl border border-emerald-200 text-emerald-700">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                Simulated Tele-Referral Dispatch
              </span>
              <h3 className="text-base font-bold text-slate-900 mt-1">
                Emergency & Specialty Patient Referral Request
              </h3>
              <p className="text-xs text-slate-500">
                Transmitting patient EHR packet to {hospital.name}
              </p>
            </div>
          </div>
          <button
            id="btn-close-simulated-referral-modal"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-slate-100 transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Patient and Target Facility Dual Card */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
          {/* Active Patient Card */}
          <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase text-slate-400">Active Patient</span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                activePatient.assessmentResult?.triage.level === 'LEVEL_1_EMERGENCY'
                  ? 'bg-red-100 text-red-800'
                  : 'bg-cyan-100 text-cyan-800'
              }`}>
                {activePatient.assessmentResult?.triage.level?.replace(/_/g, ' ') || 'ACTIVE CASE'}
              </span>
            </div>
            <div>
              <strong className="text-sm font-bold text-slate-900 block">
                {activePatient.demographics.fullName}
              </strong>
              <span className="text-slate-500">
                {activePatient.demographics.age}y • {activePatient.demographics.gender} • MRN: {activePatient.demographics.mrn || activePatient.demographics.patientId}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-1 pt-1 border-t border-slate-200 text-[11px] text-slate-600">
              <div>
                <span className="text-[9px] text-slate-400 block font-bold">BP</span>
                <strong>{activePatient.vitals.systolicBp || 140}/{activePatient.vitals.diastolicBp || 90}</strong>
              </div>
              <div>
                <span className="text-[9px] text-slate-400 block font-bold">PULSE</span>
                <strong>{activePatient.vitals.heartRate || 78} bpm</strong>
              </div>
              <div>
                <span className="text-[9px] text-slate-400 block font-bold">SpO₂</span>
                <strong>{activePatient.vitals.oxygenSaturation || 98}%</strong>
              </div>
            </div>
          </div>

          {/* Target Health Facility Card */}
          <div className="p-3.5 rounded-xl border border-emerald-200 bg-emerald-50/40 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase text-emerald-800">Target Facility</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-200">
                {hospital.type}
              </span>
            </div>
            <div>
              <strong className="text-sm font-bold text-slate-900 block">
                {hospital.name}
              </strong>
              <span className="text-slate-600">
                {hospital.district}, {hospital.province}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 pt-1 border-t border-emerald-200 text-[11px] text-slate-700">
              <div>
                <span className="text-[9px] text-slate-500 block font-bold">ICU BED OCCUPANCY</span>
                <strong>{hospital.icuBedsOccupied} / {hospital.icuBedsTotal} Beds</strong>
              </div>
              <div>
                <span className="text-[9px] text-slate-500 block font-bold">CATH LAB</span>
                <strong className={hospital.cardiacCatheterizationLab ? 'text-emerald-700' : 'text-slate-500'}>
                  {hospital.cardiacCatheterizationLab ? '✅ 24/7 Primary PCI' : '❌ Unavailable'}
                </strong>
              </div>
            </div>
          </div>
        </div>

        {/* Interactive Simulation Progress Stages */}
        {simulationState !== 'IDLE' && (
          <div className="bg-slate-900 text-white rounded-xl p-4 space-y-3 shadow-inner">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="text-xs font-bold text-cyan-400 flex items-center gap-2">
                <Radio className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
                Live Referral Request Simulation
              </span>
              <span className="font-mono text-xs text-slate-400">
                ID: {trackingId}
              </span>
            </div>

            <div className="space-y-2 text-xs">
              <div className="flex items-center gap-2 text-slate-300">
                {simulationState === 'TRANSMITTING' ? (
                  <Loader2 className="w-3.5 h-3.5 text-cyan-400 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                )}
                <span>Step 1: Digitally transmitting clinical dossier & vitals to receiving hospital triage desk</span>
              </div>

              <div className="flex items-center gap-2 text-slate-300">
                {simulationState === 'BED_RESERVATION' ? (
                  <Loader2 className="w-3.5 h-3.5 text-amber-400 animate-spin" />
                ) : simulationState === 'AMBULANCE_DISPATCH' || simulationState === 'CONFIRMED' ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <Clock className="w-3.5 h-3.5 text-slate-600" />
                )}
                <span>Step 2: Emergency Bed Bureau acknowledged — ICU Bed #03 tentatively held</span>
              </div>

              <div className="flex items-center gap-2 text-slate-300">
                {simulationState === 'AMBULANCE_DISPATCH' ? (
                  <Loader2 className="w-3.5 h-3.5 text-rose-400 animate-spin" />
                ) : simulationState === 'CONFIRMED' ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                ) : (
                  <Clock className="w-3.5 h-3.5 text-slate-600" />
                )}
                <span>Step 3: Rescue 1122 Cardiac ALS Ambulance unit assigned (Unit #AMB-409, ETA 14m)</span>
              </div>
            </div>

            {simulationState === 'CONFIRMED' && (
              <div className="bg-emerald-950/80 border border-emerald-500/50 rounded-lg p-3 text-xs text-emerald-200 flex items-center justify-between animate-in fade-in">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <div>
                    <strong className="text-white block font-bold">Referral Request Successfully Confirmed!</strong>
                    <span>Receiving triage lead alerted. Bed reserved at {hospital.name}.</span>
                  </div>
                </div>
                <button
                  onClick={copyTrackingId}
                  className="bg-emerald-800 hover:bg-emerald-700 text-white px-2.5 py-1 rounded text-[11px] font-bold flex items-center gap-1 cursor-pointer"
                >
                  {copiedId ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                  <span>{copiedId ? 'Copied' : 'Copy Ref ID'}</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* Referral Configuration Options (Shown when not yet confirmed) */}
        {simulationState === 'IDLE' && (
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Referral Priority / Transport Method
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setReferralUrgency('EMERGENCY_ALS')}
                  className={`p-2.5 rounded-xl border text-left text-xs transition-all cursor-pointer ${
                    referralUrgency === 'EMERGENCY_ALS'
                      ? 'bg-red-50 border-red-300 text-red-900 ring-2 ring-red-200 font-bold'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <span className="font-bold block">🚨 Emergency 1122 ALS</span>
                  <span className="text-[10px] text-slate-500 block">Critical Resuscitation & Monitor</span>
                </button>

                <button
                  type="button"
                  onClick={() => setReferralUrgency('URGENT_ICU')}
                  className={`p-2.5 rounded-xl border text-left text-xs transition-all cursor-pointer ${
                    referralUrgency === 'URGENT_ICU'
                      ? 'bg-amber-50 border-amber-300 text-amber-900 ring-2 ring-amber-200 font-bold'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <span className="font-bold block">🏥 Urgent ICU Transfer</span>
                  <span className="text-[10px] text-slate-500 block">Immediate Bed Escalation</span>
                </button>

                <button
                  type="button"
                  onClick={() => setReferralUrgency('ROUTINE_OPD')}
                  className={`p-2.5 rounded-xl border text-left text-xs transition-all cursor-pointer ${
                    referralUrgency === 'ROUTINE_OPD'
                      ? 'bg-cyan-50 border-cyan-300 text-cyan-900 ring-2 ring-cyan-200 font-bold'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <span className="font-bold block">🩺 Outpatient Consult</span>
                  <span className="text-[10px] text-slate-500 block">Subspecialty Clinic Booking</span>
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Clinical Referral Indication & Transfer Summary
              </label>
              <textarea
                value={referralReason}
                onChange={(e) => setReferralReason(e.target.value)}
                rows={3}
                className="w-full p-2.5 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                placeholder="Specify clinical reasons for referral, presenting ECG/vitals, and receiving physician notes..."
              />
            </div>
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-100">
          <a
            href={`tel:${hospital.contact}`}
            className="text-xs text-slate-600 hover:text-slate-900 flex items-center gap-1 font-semibold"
          >
            <PhoneCall className="w-3.5 h-3.5 text-emerald-600" />
            <span>Emergency Hotline: {hospital.contact}</span>
          </a>

          <div className="flex items-center gap-2">
            <button
              id="btn-cancel-referral-simulation"
              type="button"
              onClick={onClose}
              className="bg-slate-100 text-slate-700 px-4 py-2 rounded-xl text-xs font-bold hover:bg-slate-200 transition-all cursor-pointer"
            >
              {simulationState === 'CONFIRMED' ? 'Done & Close' : 'Cancel'}
            </button>

            {simulationState === 'IDLE' && (
              <button
                id="btn-trigger-referral-simulation"
                type="button"
                onClick={handleInitiateSimulation}
                className="bg-emerald-600 text-white px-5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 hover:bg-emerald-700 transition-all shadow-md cursor-pointer"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Simulate Referral Request &rarr;</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
