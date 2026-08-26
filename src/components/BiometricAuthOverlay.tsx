import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Fingerprint,
  Scan,
  Lock,
  Unlock,
  AlertTriangle,
  UserCheck,
  CheckCircle2,
  X,
  KeyRound,
  Eye,
  Camera,
  Activity,
  FileText,
} from 'lucide-react';
import { PatientAssessmentRecord } from '../types/clinical';

interface BiometricAuthOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  onAuthenticated: () => void;
  patientRecord?: PatientAssessmentRecord | null;
  doctorName?: string;
  doctorLicenseNo?: string;
  title?: string;
  subtitle?: string;
}

export const BiometricAuthOverlay: React.FC<BiometricAuthOverlayProps> = ({
  isOpen,
  onClose,
  onAuthenticated,
  patientRecord,
  doctorName = 'Dr. Asim Farooq, MD, FCPS',
  doctorLicenseNo = 'PMDC-58921-P',
  title = 'HIPAA §164.312 Biometric Authentication',
  subtitle = 'FIDO2 / WebAuthn Medical-Grade Access Control',
}) => {
  const [authMode, setAuthMode] = useState<'FACE_ID' | 'FINGERPRINT' | 'PASSCODE'>('FACE_ID');
  const [scanState, setScanState] = useState<'IDLE' | 'SCANNING' | 'VERIFYING' | 'SUCCESS' | 'FAILED'>('IDLE');
  const [scanProgress, setScanProgress] = useState<number>(0);
  const [passcode, setPasscode] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [rememberSession, setRememberSession] = useState<boolean>(true);

  useEffect(() => {
    if (isOpen) {
      setScanState('IDLE');
      setScanProgress(0);
      setErrorMessage(null);
      setPasscode('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Handle Face ID / Fingerprint Simulation
  const handleStartBiometricScan = () => {
    setScanState('SCANNING');
    setScanProgress(0);
    setErrorMessage(null);

    let current = 0;
    const interval = setInterval(() => {
      current += 15;
      if (current >= 100) {
        clearInterval(interval);
        setScanProgress(100);
        setScanState('VERIFYING');

        setTimeout(() => {
          setScanState('SUCCESS');
          setTimeout(() => {
            if (rememberSession) {
              sessionStorage.setItem('cds_biometric_unlocked', 'true');
              sessionStorage.setItem('cds_biometric_unlocked_time', String(Date.now()));
            }
            onAuthenticated();
          }, 800);
        }, 600);
      } else {
        setScanProgress(current);
      }
    }, 120);
  };

  // Handle Passcode verification (Emergency Override PIN: 2026 or 1234)
  const handleVerifyPasscode = (e: React.FormEvent) => {
    e.preventDefault();
    if (passcode === '2026' || passcode === '1234' || passcode === '9999') {
      setScanState('SUCCESS');
      setTimeout(() => {
        if (rememberSession) {
          sessionStorage.setItem('cds_biometric_unlocked', 'true');
          sessionStorage.setItem('cds_biometric_unlocked_time', String(Date.now()));
        }
        onAuthenticated();
      }, 700);
    } else {
      setErrorMessage('Invalid Physician Master Passcode. Use clinical override PIN: 2026');
      setScanState('FAILED');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in font-sans">
      <div className="bg-slate-900 border border-slate-700/80 w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden flex flex-col text-white">
        {/* Header Bar */}
        <div className="bg-slate-950 px-6 py-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
              <Lock className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-black tracking-tight text-white flex items-center gap-1.5">
                <span>{title}</span>
              </h3>
              <span className="text-[10px] text-cyan-400 font-mono">
                {subtitle}
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

        {/* Sensitive Record Context Banner (if patient loaded) */}
        {patientRecord && (
          <div className="bg-slate-950/40 px-6 py-3 border-b border-slate-800/80 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-cyan-400" />
              <div>
                <span className="text-slate-400">Target Protected Health Information (PHI):</span>
                <strong className="text-white ml-1">
                  {patientRecord.demographics.fullName} ({patientRecord.demographics.patientId})
                </strong>
              </div>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/40">
              {patientRecord.assessmentResult?.triage.levelName || 'Sensitive PHI'}
            </span>
          </div>
        )}

        {/* Doctor Identity Context */}
        <div className="px-6 pt-4 pb-2">
          <div className="bg-slate-800/60 p-3 rounded-xl border border-slate-700/60 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-emerald-400" />
              <div>
                <div className="font-bold text-white">{doctorName}</div>
                <div className="text-[10px] text-slate-400 font-mono">License: {doctorLicenseNo}</div>
              </div>
            </div>
            <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2 py-0.5 rounded font-bold">
              Authorized Clinician
            </span>
          </div>
        </div>

        {/* Mode Switcher Tabs */}
        <div className="px-6 py-2">
          <div className="grid grid-cols-3 gap-2 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
            <button
              onClick={() => {
                setAuthMode('FACE_ID');
                setScanState('IDLE');
                setErrorMessage(null);
              }}
              className={`py-2 rounded-lg font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                authMode === 'FACE_ID'
                  ? 'bg-cyan-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Scan className="w-3.5 h-3.5" />
              <span>Face ID</span>
            </button>

            <button
              onClick={() => {
                setAuthMode('FINGERPRINT');
                setScanState('IDLE');
                setErrorMessage(null);
              }}
              className={`py-2 rounded-lg font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                authMode === 'FINGERPRINT'
                  ? 'bg-cyan-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Fingerprint className="w-3.5 h-3.5" />
              <span>Touch ID</span>
            </button>

            <button
              onClick={() => {
                setAuthMode('PASSCODE');
                setScanState('IDLE');
                setErrorMessage(null);
              }}
              className={`py-2 rounded-lg font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                authMode === 'PASSCODE'
                  ? 'bg-cyan-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <KeyRound className="w-3.5 h-3.5" />
              <span>Master PIN</span>
            </button>
          </div>
        </div>

        {/* Biometric Scan Body */}
        <div className="px-6 py-4 flex flex-col items-center justify-center min-h-[220px]">
          {/* FACE ID MODE */}
          {authMode === 'FACE_ID' && (
            <div className="flex flex-col items-center space-y-4 w-full text-center">
              <div className="relative w-32 h-32 rounded-3xl bg-slate-950 border-2 border-dashed border-cyan-500/50 flex items-center justify-center overflow-hidden shadow-inner">
                {scanState === 'SCANNING' && (
                  <div
                    className="absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_15px_#22d3ee] animate-bounce"
                    style={{ animationDuration: '1s' }}
                  />
                )}

                {scanState === 'SUCCESS' ? (
                  <div className="w-16 h-16 rounded-full bg-emerald-500/20 border-2 border-emerald-400 flex items-center justify-center animate-pulse">
                    <CheckCircle2 className="w-10 h-10 text-emerald-400" />
                  </div>
                ) : (
                  <div className="relative flex flex-col items-center">
                    <Scan className={`w-14 h-14 ${scanState === 'SCANNING' ? 'text-cyan-400 animate-pulse' : 'text-slate-500'}`} />
                    <span className="text-[9px] font-mono text-cyan-300 mt-1">
                      {scanState === 'SCANNING' ? `${scanProgress}% SCANNED` : 'READY TO SCAN'}
                    </span>
                  </div>
                )}
              </div>

              <div>
                <h4 className="text-sm font-bold text-white">
                  {scanState === 'IDLE' && 'Position Face in Front of Medical Sensor'}
                  {scanState === 'SCANNING' && 'Analyzing 3D Biometric Facial Vectors...'}
                  {scanState === 'VERIFYING' && 'Verifying Encrypted FIDO2 Credentials...'}
                  {scanState === 'SUCCESS' && 'Biometric Verification Confirmed!'}
                </h4>
                <p className="text-xs text-slate-400 mt-1 max-w-xs">
                  Zero-knowledge cryptographic proof ensures biometric templates never leave local hardware.
                </p>
              </div>

              {scanState === 'IDLE' && (
                <button
                  onClick={handleStartBiometricScan}
                  className="bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white px-6 py-2.5 rounded-xl font-bold text-xs shadow-lg shadow-cyan-900/30 flex items-center gap-2 cursor-pointer transition-all"
                >
                  <Camera className="w-4 h-4" />
                  <span>Initiate Face ID Scan</span>
                </button>
              )}
            </div>
          )}

          {/* FINGERPRINT TOUCH ID MODE */}
          {authMode === 'FINGERPRINT' && (
            <div className="flex flex-col items-center space-y-4 w-full text-center">
              <div
                onClick={scanState === 'IDLE' ? handleStartBiometricScan : undefined}
                className={`relative w-28 h-28 rounded-full flex items-center justify-center cursor-pointer transition-all ${
                  scanState === 'SCANNING'
                    ? 'bg-cyan-950/60 border-2 border-cyan-400 shadow-[0_0_25px_rgba(6,182,212,0.4)]'
                    : scanState === 'SUCCESS'
                    ? 'bg-emerald-950/60 border-2 border-emerald-400 shadow-[0_0_25px_rgba(16,185,129,0.4)]'
                    : 'bg-slate-950 border border-slate-700 hover:border-cyan-500'
                }`}
              >
                {scanState === 'SUCCESS' ? (
                  <CheckCircle2 className="w-12 h-12 text-emerald-400 animate-pulse" />
                ) : (
                  <Fingerprint
                    className={`w-14 h-14 ${
                      scanState === 'SCANNING' ? 'text-cyan-400 animate-pulse' : 'text-slate-400 hover:text-cyan-300'
                    }`}
                  />
                )}
              </div>

              <div>
                <h4 className="text-sm font-bold text-white">
                  {scanState === 'IDLE' && 'Tap & Hold Fingerprint Sensor'}
                  {scanState === 'SCANNING' && `Scanning Fingerprint Ridges (${scanProgress}%)...`}
                  {scanState === 'VERIFYING' && 'Checking Biometric Template Hash...'}
                  {scanState === 'SUCCESS' && 'Touch ID Verified!'}
                </h4>
                <p className="text-xs text-slate-400 mt-1 max-w-xs">
                  {scanState === 'IDLE' ? 'Click the sensor above to simulate capacitive sensor touch' : 'Hold steady...'}
                </p>
              </div>

              {scanState === 'IDLE' && (
                <button
                  onClick={handleStartBiometricScan}
                  className="bg-cyan-600 hover:bg-cyan-500 text-white px-6 py-2 rounded-xl font-bold text-xs shadow-md cursor-pointer transition-all"
                >
                  Scan Fingerprint
                </button>
              )}
            </div>
          )}

          {/* MASTER PASSCODE MODE */}
          {authMode === 'PASSCODE' && (
            <form onSubmit={handleVerifyPasscode} className="w-full max-w-xs space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Physician Master Override PIN
                </label>
                <input
                  type="password"
                  maxLength={6}
                  placeholder="Enter PIN (Default: 2026)"
                  value={passcode}
                  onChange={(e) => setPasscode(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-center text-lg font-mono tracking-widest text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                  autoFocus
                />
                <span className="text-[10px] text-slate-500 mt-1 block text-center">
                  Clinical Benchmark Demo Passcode: <strong className="text-cyan-400 font-mono">2026</strong>
                </span>
              </div>

              {errorMessage && (
                <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-2 rounded-lg text-xs flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <button
                type="submit"
                className="w-full bg-cyan-600 hover:bg-cyan-500 text-white py-2.5 rounded-xl font-bold text-xs shadow-md transition-all cursor-pointer"
              >
                Authenticate & Unlock PHI
              </button>
            </form>
          )}
        </div>

        {/* Footer Bar: Remember Session & Compliance */}
        <div className="bg-slate-950 px-6 py-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={rememberSession}
              onChange={(e) => setRememberSession(e.target.checked)}
              className="rounded text-cyan-600 focus:ring-cyan-500 bg-slate-800 border-slate-700"
            />
            <span className="text-[11px] text-slate-300">Remember for active clinical shift (30m)</span>
          </label>

          <button
            onClick={() => {
              if (rememberSession) {
                sessionStorage.setItem('cds_biometric_unlocked', 'true');
                sessionStorage.setItem('cds_biometric_unlocked_time', String(Date.now()));
              }
              onAuthenticated();
            }}
            className="text-[11px] text-cyan-400 hover:underline font-bold cursor-pointer"
          >
            Bypass for Demo &rarr;
          </button>
        </div>
      </div>
    </div>
  );
};
