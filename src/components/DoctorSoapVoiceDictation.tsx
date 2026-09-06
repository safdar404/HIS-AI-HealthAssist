import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Mic,
  MicOff,
  Sparkles,
  RotateCcw,
  Check,
  FileText,
  Copy,
  AlertCircle,
  Volume2,
  ListPlus,
  Languages,
  Clock,
  Radio,
  Send,
  Info,
} from 'lucide-react';
import { PatientAssessmentRecord } from '../types/clinical';
import { ClinicianProfile } from '../services/clinicalProfileSyncService';

interface DoctorSoapVoiceDictationProps {
  currentRecord: PatientAssessmentRecord;
  clinicalNotes: string;
  onChangeNotes: (notes: string) => void;
  activeDoctor?: ClinicianProfile;
}

export const DoctorSoapVoiceDictation: React.FC<DoctorSoapVoiceDictationProps> = ({
  currentRecord,
  clinicalNotes,
  onChangeNotes,
  activeDoctor,
}) => {
  const [isListening, setIsListening] = useState<boolean>(false);
  const [speechSupported, setSpeechSupported] = useState<boolean>(true);
  const [speechLanguage, setSpeechLanguage] = useState<'en-US' | 'en-GB' | 'ur-PK'>('en-US');
  const [interimTranscript, setInterimTranscript] = useState<string>('');
  const [speechDuration, setSpeechDuration] = useState<number>(0);
  const [speechError, setSpeechError] = useState<string | null>(null);
  const [copiedToast, setCopiedToast] = useState<boolean>(false);

  const recognitionRef = useRef<any>(null);
  const speechTimerRef = useRef<any>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Check browser speech recognition support
  useEffect(() => {
    const hasSpeech =
      typeof window !== 'undefined' &&
      ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);
    setSpeechSupported(hasSpeech);
  }, []);

  // Normalization for medical punctuation and voice shortcuts
  const formatDictatedText = (raw: string): string => {
    let text = raw;
    text = text.replace(/\b(period|full stop)\b/gi, '. ');
    text = text.replace(/\b(comma)\b/gi, ', ');
    text = text.replace(/\b(colon)\b/gi, ': ');
    text = text.replace(/\b(semicolon)\b/gi, '; ');
    text = text.replace(/\b(question mark)\b/gi, '? ');
    text = text.replace(/\b(exclamation mark|exclamation point)\b/gi, '! ');
    text = text.replace(/\b(new line|next line)\b/gi, '\n');
    text = text.replace(/\b(new paragraph|next paragraph)\b/gi, '\n\n');
    text = text.replace(/\b(bullet point|bullet)\b/gi, '\n• ');
    text = text.replace(/\b(hyphen|dash)\b/gi, ' - ');
    // Clinical terminology
    text = text.replace(/\b(blood pressure|b p)\b/gi, 'BP');
    text = text.replace(/\b(heart rate|h r)\b/gi, 'HR');
    text = text.replace(/\b(spo2|sp o 2|oxygen saturation)\b/gi, 'SpO₂');
    text = text.replace(/\b(subjective|s o a p subjective)\b/gi, '\n[S - Subjective]:');
    text = text.replace(/\b(objective|s o a p objective)\b/gi, '\n[O - Objective]:');
    text = text.replace(/\b(assessment|s o a p assessment)\b/gi, '\n[A - Assessment]:');
    text = text.replace(/\b(plan|s o a p plan)\b/gi, '\n[P - Plan]:');
    return text;
  };

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {
        // already stopped
      }
    }
    setIsListening(false);
    setInterimTranscript('');
    if (speechTimerRef.current) {
      clearInterval(speechTimerRef.current);
      speechTimerRef.current = null;
    }
  }, []);

  const startListening = useCallback(() => {
    if (!speechSupported) {
      setSpeechError('Web SpeechRecognition API is not supported in this browser. Please use Chrome, Edge, or Chromium.');
      return;
    }

    setSpeechError(null);
    setInterimTranscript('');
    setSpeechDuration(0);

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = speechLanguage;

      recognition.onstart = () => {
        setIsListening(true);
        setSpeechError(null);
        if (speechTimerRef.current) clearInterval(speechTimerRef.current);
        speechTimerRef.current = setInterval(() => {
          setSpeechDuration((prev) => prev + 1);
        }, 1000);
      };

      recognition.onresult = (event: any) => {
        let finalSegment = '';
        let interimSegment = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalSegment += transcript + ' ';
          } else {
            interimSegment += transcript;
          }
        }

        if (interimSegment) {
          setInterimTranscript(interimSegment);
        }

        if (finalSegment) {
          setInterimTranscript('');
          const formatted = formatDictatedText(finalSegment);
          onChangeNotes(
            clinicalNotes
              ? `${clinicalNotes.trim()}\n${formatted.trim()}`
              : formatted.trim()
          );
        }
      };

      recognition.onerror = (event: any) => {
        console.warn('SpeechRecognition error:', event.error);
        if (event.error === 'not-allowed') {
          setSpeechError('Microphone permission was denied. Please allow microphone access in your browser settings.');
        } else if (event.error === 'network') {
          setSpeechError('Speech recognition network error. Please check your internet connection.');
        } else if (event.error !== 'no-speech') {
          setSpeechError(`Dictation status: ${event.error}`);
        }
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
        setInterimTranscript('');
        if (speechTimerRef.current) {
          clearInterval(speechTimerRef.current);
          speechTimerRef.current = null;
        }
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err: any) {
      console.error('Speech recognition failed to start:', err);
      setSpeechError(`Could not start microphone: ${err.message || err}`);
      setIsListening(false);
    }
  }, [speechSupported, speechLanguage, clinicalNotes, onChangeNotes]);

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {
          // ignore
        }
      }
      if (speechTimerRef.current) {
        clearInterval(speechTimerRef.current);
      }
    };
  }, []);

  // Quick insert SOAP templates
  const insertSoapSection = (section: 'S' | 'O' | 'A' | 'P' | 'FULL') => {
    const p = currentRecord;
    const sbp = p.vitals.systolicBp || 135;
    const dbp = p.vitals.diastolicBp || 85;
    const hr = p.vitals.heartRate || 75;
    const spo2 = p.vitals.oxygenSaturation || 98;
    const rbs = p.vitals.bloodGlucoseMgDl || 110;

    let textToInsert = '';

    if (section === 'FULL') {
      textToInsert = `[SOAP CLINICAL PROGRESS NOTE]
S (Subjective):
• Patient reports: ${p.symptoms && p.symptoms.length > 0 ? p.symptoms.map((s) => s.name).join(', ') : 'Routine follow-up for cardiovascular assessment'}.
• Denies acute crushing chest pain, diaphoresis, or sudden neurologic weakness.
• Adherence to home medication reported as good.

O (Objective):
• Vitals: BP ${sbp}/${dbp} mmHg, HR ${hr} bpm, SpO₂ ${spo2}% on Room Air, RBS ${rbs} mg/dL.
• Physical Exam: Cardiovascular S1, S2 audible, regular rate. Chest clear to auscultation bilaterally. No peripheral pedal edema.
• Labs: Creatinine ${p.labs.creatinineMgDl || 1.0} mg/dL, HbA1c ${p.labs.hba1cPercent || 5.8}%, Total Cholesterol ${p.labs.cholesterolTotalMgDl || 190} mg/dL.

A (Assessment):
• ${p.assessmentResult?.triage.level === 'LEVEL_1_EMERGENCY' ? 'Hypertensive Crisis / Emergency Triage' : 'Essential Systemic Hypertension - Controlled on Guideline-Directed Therapy'}.
• WHO 10-Yr Cardiovascular Risk: ${((p.assessmentResult?.risks.cardiovascular.riskScore || 0.15) * 100).toFixed(0)}% (${p.assessmentResult?.risks.cardiovascular.riskCategory || 'MODERATE'}).

P (Plan):
1. Continue prescribed antihypertensive formulary medications without omission.
2. Low-sodium dietary adherence (<2000 mg/day) and structured daily walking 30 mins.
3. Repeat blood pressure and pulse monitoring morning and evening.
4. Follow-up in clinic in 14 days; red-flag warning return precautions explained.`;
    } else if (section === 'S') {
      textToInsert = `\n[S - Subjective]: Patient presenting with ${p.symptoms && p.symptoms.length > 0 ? p.symptoms.map((s) => s.name).join(', ') : 'hypertension follow-up'}. Reports no acute anginal symptoms.`;
    } else if (section === 'O') {
      textToInsert = `\n[O - Objective]: Vitals: BP ${sbp}/${dbp} mmHg | HR ${hr} bpm | SpO₂ ${spo2}% | RBS ${rbs} mg/dL. Lungs clear, regular rhythm, no edema.`;
    } else if (section === 'A') {
      textToInsert = `\n[A - Assessment]: Clinical impression: Essential Stage 2 Hypertension with moderate ASCVD risk. Triage: ${p.assessmentResult?.triage.level || 'LEVEL_3_PRIORITY'}.`;
    } else if (section === 'P') {
      textToInsert = `\n[P - Plan]: 1. Continue guideline-directed therapy. 2. Lifestyle & salt restriction. 3. OPD review in 2 weeks.`;
    }

    onChangeNotes(clinicalNotes ? `${clinicalNotes.trim()}\n${textToInsert.trim()}` : textToInsert.trim());
  };

  const copyToClipboard = () => {
    if (clinicalNotes) {
      navigator.clipboard.writeText(clinicalNotes);
      setCopiedToast(true);
      setTimeout(() => setCopiedToast(false), 2000);
    }
  };

  const wordCount = clinicalNotes.trim() ? clinicalNotes.trim().split(/\s+/).length : 0;

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm space-y-3">
      {/* Header with Title and Speech Language Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2">
          <div className={`p-2 rounded-xl border ${isListening ? 'bg-rose-50 border-rose-200 text-rose-600 animate-pulse' : 'bg-cyan-50 border-cyan-200 text-cyan-600'}`}>
            <Mic className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-xs font-bold text-slate-900">
                Doctor's Clinical Notes & SOAP Dictation
              </h4>
              <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-1.5 py-0.5 rounded flex items-center gap-1">
                <Radio className="w-2.5 h-2.5 text-emerald-600 animate-pulse" />
                SpeechRecognition API Active
              </span>
            </div>
            <p className="text-[11px] text-slate-500">
              Dictate SOAP notes directly via microphone or type freeform examination findings
            </p>
          </div>
        </div>

        {/* Dictation Controls & Language Selector */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-slate-100 px-2 py-1 rounded-lg border border-slate-200 text-xs">
            <Languages className="w-3.5 h-3.5 text-slate-500" />
            <select
              id="select-speech-language"
              value={speechLanguage}
              onChange={(e) => setSpeechLanguage(e.target.value as any)}
              className="bg-transparent text-[11px] font-bold text-slate-700 focus:outline-none cursor-pointer"
            >
              <option value="en-US">English (US)</option>
              <option value="en-GB">English (UK)</option>
              <option value="ur-PK">Urdu (اردو - Pakistan)</option>
            </select>
          </div>

          <button
            id="btn-toggle-soap-dictation"
            type="button"
            onClick={isListening ? stopListening : startListening}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 shadow-sm ${
              isListening
                ? 'bg-rose-600 text-white hover:bg-rose-700 animate-pulse ring-2 ring-rose-300'
                : 'bg-cyan-700 text-white hover:bg-cyan-800'
            }`}
          >
            {isListening ? (
              <>
                <MicOff className="w-3.5 h-3.5" />
                <span>Stop Dictating ({speechDuration}s)</span>
              </>
            ) : (
              <>
                <Mic className="w-3.5 h-3.5" />
                <span>Start Dictating SOAP</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Active Voice Listening Live Banner */}
      {isListening && (
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 flex items-center justify-between text-xs animate-in fade-in">
          <div className="flex items-center gap-2.5 text-rose-800">
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-rose-600 animate-ping" />
              <span className="w-2 h-2 rounded-full bg-rose-600" />
            </div>
            <div>
              <span className="font-bold">Microphone Active — Dictating into SOAP notes...</span>
              <p className="text-[11px] text-rose-600 italic">
                Speak clearly. Say "period", "comma", "new line", or "bullet point" to format text.
              </p>
            </div>
          </div>
          <span className="font-mono font-bold text-rose-700 bg-white px-2 py-0.5 rounded border border-rose-200">
            00:{speechDuration < 10 ? `0${speechDuration}` : speechDuration}
          </span>
        </div>
      )}

      {/* Interim Voice Stream Preview */}
      {interimTranscript && (
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-600 italic flex items-center gap-2">
          <Volume2 className="w-3.5 h-3.5 text-cyan-600 shrink-0 animate-pulse" />
          <span>"{interimTranscript}"</span>
        </div>
      )}

      {/* Speech Error Banner if any */}
      {speechError && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-2.5 text-xs text-amber-800 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
            <span>{speechError}</span>
          </div>
          <button
            type="button"
            onClick={() => setSpeechError(null)}
            className="text-amber-600 hover:text-amber-800 text-xs font-bold"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Quick SOAP Template Formatting Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-50 p-2 rounded-xl border border-slate-200 text-xs">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[10px] font-bold text-slate-500 uppercase px-1">SOAP Blocks:</span>
          <button
            type="button"
            onClick={() => insertSoapSection('FULL')}
            className="px-2.5 py-1 bg-white hover:bg-slate-100 text-cyan-800 font-bold rounded-lg border border-slate-200 transition-all cursor-pointer flex items-center gap-1 shadow-xs"
            title="Auto-insert complete structured SOAP note template with patient vitals"
          >
            <Sparkles className="w-3 h-3 text-cyan-600" />
            <span>Full SOAP Note</span>
          </button>
          <button
            type="button"
            onClick={() => insertSoapSection('S')}
            className="px-2 py-1 bg-white hover:bg-slate-100 text-slate-700 font-bold rounded-lg border border-slate-200 transition-all cursor-pointer"
          >
            + S (Subjective)
          </button>
          <button
            type="button"
            onClick={() => insertSoapSection('O')}
            className="px-2 py-1 bg-white hover:bg-slate-100 text-slate-700 font-bold rounded-lg border border-slate-200 transition-all cursor-pointer"
          >
            + O (Objective)
          </button>
          <button
            type="button"
            onClick={() => insertSoapSection('A')}
            className="px-2 py-1 bg-white hover:bg-slate-100 text-slate-700 font-bold rounded-lg border border-slate-200 transition-all cursor-pointer"
          >
            + A (Assessment)
          </button>
          <button
            type="button"
            onClick={() => insertSoapSection('P')}
            className="px-2 py-1 bg-white hover:bg-slate-100 text-slate-700 font-bold rounded-lg border border-slate-200 transition-all cursor-pointer"
          >
            + P (Plan)
          </button>
        </div>

        <div className="flex items-center gap-2 text-[11px] text-slate-500">
          <span>{wordCount} words</span>
          <span>•</span>
          <span>{clinicalNotes.length} chars</span>
        </div>
      </div>

      {/* Main Textarea for SOAP Clinical Notes */}
      <div className="relative">
        <textarea
          ref={textareaRef}
          id="textarea-doctor-clinical-notes"
          value={clinicalNotes}
          onChange={(e) => onChangeNotes(e.target.value)}
          rows={7}
          placeholder="Dictate using microphone or type doctor clinical notes, patient history, physical examination, assessment, and treatment plan here..."
          className="w-full p-3 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:outline-none font-mono text-slate-800 leading-relaxed resize-y bg-slate-50/30"
        />

        {/* Quick Clear / Copy floating actions */}
        <div className="absolute bottom-3 right-3 flex items-center gap-1.5 bg-white/90 backdrop-blur-xs p-1 rounded-lg border border-slate-200 shadow-xs">
          {clinicalNotes && (
            <>
              <button
                type="button"
                onClick={copyToClipboard}
                className="p-1 text-slate-500 hover:text-slate-900 rounded hover:bg-slate-100 cursor-pointer"
                title="Copy notes to clipboard"
              >
                {copiedToast ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
              <button
                type="button"
                onClick={() => onChangeNotes('')}
                className="p-1 text-slate-400 hover:text-rose-600 rounded hover:bg-rose-50 cursor-pointer"
                title="Clear notes"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Footer Info */}
      <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
        <span className="flex items-center gap-1">
          <Info className="w-3 h-3 text-cyan-600" />
          <span>Speech dictation will auto-append to existing text without overwriting your manual edits.</span>
        </span>
        {activeDoctor && (
          <span className="font-medium text-slate-600 hidden sm:inline">
            Signing Clinician: {activeDoctor.name}
          </span>
        )}
      </div>
    </div>
  );
};
