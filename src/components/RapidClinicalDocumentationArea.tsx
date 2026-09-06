import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  FileText,
  Bold,
  Italic,
  List,
  ListOrdered,
  Sparkles,
  Clock,
  CheckCircle2,
  Stethoscope,
  Heart,
  Activity,
  AlertTriangle,
  Send,
  Undo2,
  Trash2,
  Copy,
  Check,
  Zap,
  Mic,
  MicOff,
  Radio,
  Volume2,
  Languages,
  X,
} from 'lucide-react';
import { PatientAssessmentRecord } from '../types/clinical';
import { ClinicianProfile } from '../services/clinicalProfileSyncService';

interface RapidClinicalDocumentationAreaProps {
  currentRecord: PatientAssessmentRecord;
  clinicalNotes: string;
  onChangeNotes: (notes: string) => void;
  activeDoctor: ClinicianProfile;
  onAutoSave?: (time: string) => void;
}

interface DocumentationSnippet {
  id: string;
  category: 'ROUNDS' | 'CARDIOLOGY' | 'HYPERTENSION' | 'SBAR' | 'RESPIRATORY' | 'DISCHARGE';
  title: string;
  badge: string;
  content: string;
}

const CLINICAL_SNIPPETS: DocumentationSnippet[] = [
  {
    id: 'sbar-handoff',
    category: 'SBAR',
    title: 'SBAR Clinical Handoff',
    badge: 'Handoff',
    content: `[SBAR ROUNDING SUMMARY]
• Situation: Active monitoring in clinic/ward for hemodynamic stability.
• Background: Known CV risk factors, current baseline therapy reviewed.
• Assessment: Current vitals stable, no acute chest pain, dyspnea, or neuro deficit.
• Recommendation: Continue guideline-directed medical therapy; repeat BP/HR in 4 hours.`,
  },
  {
    id: 'cardio-exam',
    category: 'CARDIOLOGY',
    title: 'Cardiopulmonary Physical Exam',
    badge: 'Exam',
    content: `[PHYSICAL EXAMINATION]
• Cardiovascular: S1, S2 audible, regular rate & rhythm. No murmurs, rubs, or S3/S4 gallop. JVP not elevated. Peripheral pulses 2+ symmetric, no pedal edema.
• Respiratory: Chest clear to auscultation bilaterally. Normal vesicular breath sounds, no wheezing, rhonchi, or basal crackles.`,
  },
  {
    id: 'htn-titration',
    category: 'HYPERTENSION',
    title: 'WHO HEARTS HTN Titration',
    badge: 'HEARTS Protocol',
    content: `[WHO HEARTS PROTOCOL ROUNDING NOTE]
• BP reassessment completed. Target MAP achieved (<140/90 mmHg).
• Dual antihypertensive combination (Amlodipine + ARB/ACEi) confirmed.
• Renal function & electrolytes verified normal.
• Patient counseled on low-sodium dietary adherence & adherence tracking.`,
  },
  {
    id: 't2dm-glycemic',
    category: 'ROUNDS',
    title: 'Glycemic & Renal Review',
    badge: 'Diabetes',
    content: `[DIABETIC MANAGEMENT ROUND]
• Fasting glucose and HbA1c trajectory evaluated.
• Target fasting glucose 90–130 mg/dL.
• Metformin renal safety affirmed (eGFR > 45 mL/min).
• Diabetic foot examination: Sensation intact to 10g monofilament, skin intact.`,
  },
  {
    id: 'resp-monitoring',
    category: 'RESPIRATORY',
    title: 'SpO₂ & Airway Assessment',
    badge: 'SpO2 / Airway',
    content: `[RESPIRATORY ROUNDING NOTE]
• SpO₂ maintained >95% on room air.
• Respiratory rate 14–18/min, work of breathing normal without accessory muscle use.
• Peak flow / spirometry parameters reviewed.`,
  },
  {
    id: 'discharge-plan',
    category: 'DISCHARGE',
    title: 'Discharge & Home Care Advice',
    badge: 'Discharge',
    content: `[DISCHARGE & HOME MANAGEMENT PLAN]
1. Continue prescribed medications without missing doses.
2. Low-salt (<2g sodium/day), heart-healthy diet.
3. Daily blood pressure and pulse logging morning & evening.
4. RED FLAGS: Return immediately to emergency if severe chest pressure, shortness of breath, sudden weakness, or syncope occur.
5. Follow-up scheduled in 14 days at OPD.`,
  },
];

export const RapidClinicalDocumentationArea: React.FC<RapidClinicalDocumentationAreaProps> = ({
  currentRecord,
  clinicalNotes,
  onChangeNotes,
  activeDoctor,
  onAutoSave,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [copiedState, setCopiedState] = useState<boolean>(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Web Speech API Voice Dictation State
  const [isListening, setIsListening] = useState<boolean>(false);
  const [speechLanguage, setSpeechLanguage] = useState<string>('en-US');
  const [interimTranscript, setInterimTranscript] = useState<string>('');
  const [speechDuration, setSpeechDuration] = useState<number>(0);
  const [speechError, setSpeechError] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);
  const speechTimerRef = useRef<any>(null);

  const filteredSnippets = CLINICAL_SNIPPETS.filter(
    (s) => selectedCategory === 'ALL' || s.category === selectedCategory
  );

  // Check if browser supports Web Speech API
  const isSpeechSupported = typeof window !== 'undefined' && ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);

  // Clean and parse medical voice punctuation
  const parseMedicalVoicePunctuation = (rawText: string): string => {
    let text = rawText;
    // Common punctuation commands
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
    // Clinical terminology normalization
    text = text.replace(/\b(blood pressure|b p)\b/gi, 'BP');
    text = text.replace(/\b(heart rate|h r)\b/gi, 'HR');
    text = text.replace(/\b(spo2|sp o 2|oxygen saturation)\b/gi, 'SpO₂');
    text = text.replace(/\b(fasting blood sugar|f b s)\b/gi, 'FBS');
    text = text.replace(/\b(random blood sugar|r b s)\b/gi, 'RBS');
    text = text.replace(/\b(hba1c|hb a 1 c)\b/gi, 'HbA1c');
    text = text.replace(/\b(milligrams per deciliter|mg per dl)\b/gi, 'mg/dL');
    text = text.replace(/\b(millimeters of mercury|mm hg)\b/gi, 'mmHg');
    text = text.replace(/\b(beats per minute|bpm)\b/gi, 'bpm');
    return text;
  };

  // Stop Dictation Helper
  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (err) {
        // ignore already stopped error
      }
    }
    setIsListening(false);
    setInterimTranscript('');
    if (speechTimerRef.current) {
      clearInterval(speechTimerRef.current);
      speechTimerRef.current = null;
    }
  }, []);

  // Start Dictation Helper
  const startListening = useCallback(() => {
    if (!isSpeechSupported) {
      setSpeechError('Web Speech API is not supported in this browser. Please use Google Chrome, Edge, or a modern Chromium browser.');
      return;
    }

    setSpeechError(null);
    setInterimTranscript('');
    setSpeechDuration(0);

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = speechLanguage;

    recognition.onstart = () => {
      setIsListening(true);
      setSpeechError(null);
      // Start duration counter
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
          finalSegment += transcript;
        } else {
          interimSegment += transcript;
        }
      }

      if (interimSegment) {
        setInterimTranscript(interimSegment);
      }

      if (finalSegment) {
        setInterimTranscript('');
        const formattedFinal = parseMedicalVoicePunctuation(finalSegment.trim());
        if (formattedFinal) {
          insertTextAtCursor(formattedFinal + ' ');
        }
      }
    };

    recognition.onerror = (event: any) => {
      console.warn('Speech recognition error:', event.error);
      if (event.error === 'not-allowed') {
        setSpeechError('Microphone permission was denied. Please allow microphone access in browser settings.');
      } else if (event.error === 'no-speech') {
        // No speech detected, keep listening or soft notify
      } else if (event.error === 'network') {
        setSpeechError('Speech recognition network error. Please verify internet connectivity.');
      } else {
        setSpeechError(`Speech recognition notice: ${event.error}`);
      }
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

    try {
      recognition.start();
    } catch (err) {
      console.error('Failed to start speech recognition:', err);
      setSpeechError('Could not start speech recognition service.');
      setIsListening(false);
    }
  }, [isSpeechSupported, speechLanguage]);

  // Clean up on unmount
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

  // Insert text into textarea at cursor or append
  const insertTextAtCursor = (textToInsert: string) => {
    const textarea = textareaRef.current;
    if (!textarea) {
      onChangeNotes((clinicalNotes ? `${clinicalNotes}\n\n` : '') + textToInsert);
      return;
    }

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const textBefore = clinicalNotes.substring(0, start);
    const textAfter = clinicalNotes.substring(end);

    const prefix = textBefore && !textBefore.endsWith('\n') && !textBefore.endsWith(' ') ? ' ' : '';
    const newText = textBefore + prefix + textToInsert + (textAfter ? '' : '') + textAfter;
    onChangeNotes(newText);

    setTimeout(() => {
      if (textarea) {
        textarea.focus();
        const newCursorPos = start + prefix.length + textToInsert.length;
        textarea.setSelectionRange(newCursorPos, newCursorPos);
      }
    }, 50);

    // Dispatch global draft saved event
    window.dispatchEvent(
      new CustomEvent('clinical-draft-saved', {
        detail: {
          type: 'DOCTOR_REVIEW',
          patientId: currentRecord.demographics.patientId,
          timestamp: Date.now(),
        },
      })
    );
  };

  const handleInsertVitalsSnapshot = () => {
    const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const sbp = currentRecord.vitals.systolicBp || 'N/A';
    const dbp = currentRecord.vitals.diastolicBp || 'N/A';
    const hr = currentRecord.vitals.heartRate || 'N/A';
    const spo2 = currentRecord.vitals.oxygenSaturation || 'N/A';
    const glucose = currentRecord.vitals.bloodGlucoseMgDl || currentRecord.labs.glucoseFastingMgDl || 'N/A';
    const temp = currentRecord.vitals.temperatureC || '36.8';

    const snapshot = `[ROUNDS VITALS @ ${now}]: BP: ${sbp}/${dbp} mmHg | HR: ${hr} bpm | SpO₂: ${spo2}% | Temp: ${temp}°C | Blood Glucose: ${glucose} mg/dL`;
    insertTextAtCursor(snapshot);
  };

  const handleInsertDoctorStamp = () => {
    const now = new Date().toLocaleString();
    const stamp = `\n— Verified & Signed by: ${activeDoctor.name} (${activeDoctor.designation}, ${activeDoctor.licenseNo}) on ${now}`;
    insertTextAtCursor(stamp);
  };

  const handleFormat = (type: 'BOLD' | 'ITALIC' | 'BULLET' | 'NUMBER') => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = clinicalNotes.substring(start, end) || 'text';

    let formatted = selected;
    if (type === 'BOLD') formatted = `**${selected}**`;
    else if (type === 'ITALIC') formatted = `*${selected}*`;
    else if (type === 'BULLET') formatted = `• ${selected}`;
    else if (type === 'NUMBER') formatted = `1. ${selected}`;

    const newText = clinicalNotes.substring(0, start) + formatted + clinicalNotes.substring(end);
    onChangeNotes(newText);
  };

  const handleCopyNotes = () => {
    navigator.clipboard.writeText(clinicalNotes);
    setCopiedState(true);
    setTimeout(() => setCopiedState(false), 2000);
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm space-y-3">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-cyan-50 border border-cyan-200 text-cyan-700">
            <Zap className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
              <span>Rapid Clinical Rounding & Documentation</span>
              <span className="bg-emerald-100 text-emerald-800 text-[10px] font-mono font-bold px-1.5 py-0.2 rounded">
                Auto-Persisted
              </span>
            </h4>
            <p className="text-[11px] text-slate-500">
              One-click standard clinical snippets, structured rounding notes, and physician e-sign
            </p>
          </div>
        </div>

        {/* Action Badges */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            type="button"
            onClick={handleInsertVitalsSnapshot}
            className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-bold transition-all flex items-center gap-1 cursor-pointer border border-slate-200"
            title="Insert current physiological vitals snapshot at current time"
          >
            <Activity className="w-3 h-3 text-cyan-600" />
            <span>Insert Vitals Snapshot</span>
          </button>
          <button
            type="button"
            onClick={handleInsertDoctorStamp}
            className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-bold transition-all flex items-center gap-1 cursor-pointer border border-slate-200"
            title="Append official clinician signature stamp"
          >
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            <span>Sign & Stamp</span>
          </button>
        </div>
      </div>

      {/* Snippet Category Filter & Quick Pills */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">
            Quick Rounding Snippet Library
          </span>
          <div className="flex items-center gap-1 text-[10px]">
            {['ALL', 'SBAR', 'CARDIOLOGY', 'HYPERTENSION', 'DISCHARGE'].map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-2 py-0.5 rounded font-bold cursor-pointer transition-all ${
                  selectedCategory === cat
                    ? 'bg-slate-800 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Snippets Grid / Pill Buttons */}
        <div className="flex flex-wrap gap-1.5">
          {filteredSnippets.map((snippet) => (
            <button
              key={snippet.id}
              type="button"
              onClick={() => insertTextAtCursor(snippet.content)}
              className="px-2.5 py-1 rounded-xl bg-cyan-50/80 hover:bg-cyan-100 text-cyan-900 border border-cyan-200/80 text-[11px] font-semibold transition-all flex items-center gap-1 cursor-pointer group"
              title="Click to insert formatted snippet into clinical notes"
            >
              <span className="text-[10px] font-bold text-cyan-600 group-hover:text-cyan-800">
                +
              </span>
              <span>{snippet.title}</span>
              <span className="bg-white/80 text-cyan-700 text-[9px] font-bold px-1 rounded border border-cyan-200/60 ml-0.5">
                {snippet.badge}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Rich Formatting Toolbar & Text Area */}
      <div className="border border-slate-300 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-cyan-500 focus-within:border-cyan-500 transition-all bg-white">
        {/* Editor Toolbar */}
        <div className="bg-slate-50 border-b border-slate-200 px-3 py-1.5 flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => handleFormat('BOLD')}
              className="p-1 rounded hover:bg-slate-200 text-slate-700 text-xs font-bold"
              title="Bold (**text**)"
            >
              <Bold className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => handleFormat('ITALIC')}
              className="p-1 rounded hover:bg-slate-200 text-slate-700 text-xs italic"
              title="Italic (*text*)"
            >
              <Italic className="w-3.5 h-3.5" />
            </button>
            <span className="w-px h-3.5 bg-slate-300 mx-1" />
            <button
              type="button"
              onClick={() => handleFormat('BULLET')}
              className="p-1 rounded hover:bg-slate-200 text-slate-700 text-xs"
              title="Bullet point"
            >
              <List className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => handleFormat('NUMBER')}
              className="p-1 rounded hover:bg-slate-200 text-slate-700 text-xs"
              title="Numbered list"
            >
              <ListOrdered className="w-3.5 h-3.5" />
            </button>
            <span className="w-px h-3.5 bg-slate-300 mx-1" />
            {/* Quick Medical Symbol Inserters */}
            {['BP:', 'HR:', 'SpO₂:', 'Dx:', 'Rx:', 'Δ:'].map((sym) => (
              <button
                key={sym}
                type="button"
                onClick={() => insertTextAtCursor(sym + ' ')}
                className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-200/70 hover:bg-slate-300 text-slate-800"
              >
                {sym}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-2">
            {/* Hands-Free Web Speech API Voice Dictation Trigger */}
            <div className="flex items-center gap-1">
              <select
                aria-label="Dictation Language"
                value={speechLanguage}
                onChange={(e) => {
                  setSpeechLanguage(e.target.value);
                  if (isListening) {
                    stopListening();
                  }
                }}
                className="bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 text-[10px] font-bold rounded-lg px-1.5 py-1 focus:outline-none cursor-pointer"
                title="Select Dictation Speech Language"
              >
                <option value="en-US">EN (US)</option>
                <option value="en-GB">EN (UK)</option>
                <option value="ur-PK">UR (Pakistan)</option>
              </select>

              <button
                type="button"
                id="btn-voice-dictation-toggle"
                onClick={isListening ? stopListening : startListening}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all flex items-center gap-1.5 cursor-pointer border shadow-sm ${
                  isListening
                    ? 'bg-rose-600 hover:bg-rose-700 text-white border-rose-700 animate-pulse'
                    : 'bg-gradient-to-r from-sky-500 to-cyan-600 hover:from-sky-600 hover:to-cyan-700 text-white border-sky-600'
                }`}
                title={isListening ? 'Click to Stop Voice Dictation' : 'Click to Start Hands-Free Voice Dictation (Web Speech API)'}
              >
                {isListening ? (
                  <>
                    <Radio className="w-3.5 h-3.5 animate-spin" />
                    <span>Listening ({speechDuration}s)...</span>
                  </>
                ) : (
                  <>
                    <Mic className="w-3.5 h-3.5" />
                    <span>Voice Dictate</span>
                  </>
                )}
              </button>
            </div>

            <button
              type="button"
              onClick={handleCopyNotes}
              className="px-2 py-0.5 rounded text-[11px] font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-200 flex items-center gap-1 cursor-pointer"
            >
              {copiedState ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
              <span>{copiedState ? 'Copied' : 'Copy'}</span>
            </button>
          </div>
        </div>

        {/* Active Speech Dictation Feedback Banner */}
        {isListening && (
          <div className="bg-rose-50 border-b border-rose-200 px-3 py-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-rose-950">
            <div className="flex items-center gap-2">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-600"></span>
              </span>
              <span className="font-bold text-rose-900 flex items-center gap-1">
                <Volume2 className="w-3.5 h-3.5 text-rose-600 animate-bounce" />
                <span>Hands-Free Mic Active ({speechLanguage}):</span>
              </span>
              <span className="italic text-rose-800 text-[11px] bg-white px-2 py-0.5 rounded border border-rose-200 shadow-inner max-w-md truncate">
                {interimTranscript || 'Speak naturally (say "period", "comma", "new line", "vitals")...'}
              </span>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <span className="text-[10px] font-mono font-bold bg-rose-200/80 text-rose-900 px-1.5 py-0.5 rounded">
                {Math.floor(speechDuration / 60)}:{(speechDuration % 60).toString().padStart(2, '0')}
              </span>
              <button
                type="button"
                onClick={stopListening}
                className="px-2 py-0.5 rounded bg-rose-600 hover:bg-rose-700 text-white font-bold text-[10px] cursor-pointer"
              >
                Done Dictating
              </button>
            </div>
          </div>
        )}

        {/* Speech Error Banner if any */}
        {speechError && (
          <div className="bg-amber-50 border-b border-amber-200 px-3 py-1.5 flex items-center justify-between gap-2 text-[11px] text-amber-900">
            <div className="flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
              <span>{speechError}</span>
            </div>
            <button
              type="button"
              onClick={() => setSpeechError(null)}
              className="text-amber-700 hover:text-amber-950 text-xs font-bold"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Text Area */}
        <textarea
          ref={textareaRef}
          id="doctor-rapid-notes-input"
          rows={6}
          value={clinicalNotes}
          onChange={(e) => {
            onChangeNotes(e.target.value);
            // Dispatch global draft saved event
            window.dispatchEvent(
              new CustomEvent('clinical-draft-saved', {
                detail: {
                  type: 'DOCTOR_REVIEW',
                  patientId: currentRecord.demographics.patientId,
                  timestamp: Date.now(),
                },
              })
            );
          }}
          placeholder="Document clinical assessment findings, SOAP notes, differential considerations, and management orders..."
          className="w-full p-3 text-xs text-slate-800 font-sans focus:outline-none resize-y leading-relaxed bg-white"
        />
      </div>

      <div className="flex items-center justify-between text-[11px] text-slate-400">
        <span>Formatting: Markdown syntax supported • Line breaks preserved</span>
        <span>{clinicalNotes.length} characters</span>
      </div>
    </div>
  );
};
