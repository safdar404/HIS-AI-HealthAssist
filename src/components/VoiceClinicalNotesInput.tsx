import React, { useState, useEffect, useRef } from 'react';
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
} from 'lucide-react';

interface VoiceClinicalNotesInputProps {
  value: string;
  onChange: (notes: string) => void;
  label?: string;
  placeholder?: string;
  patientContext?: string;
}

export const VoiceClinicalNotesInput: React.FC<VoiceClinicalNotesInputProps> = ({
  value,
  onChange,
  label = 'Clinical Notes & Examination Findings (Voice Dictation Supported)',
  placeholder = 'Dictate or type patient presenting history, physical examination findings, risk factors, or clinical impressions...',
  patientContext,
}) => {
  const [isListening, setIsListening] = useState<boolean>(false);
  const [speechSupported, setSpeechSupported] = useState<boolean>(true);
  const [language, setLanguage] = useState<'en-US' | 'en-GB' | 'ur-PK'>('en-US');
  const [interimTranscript, setInterimTranscript] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [copiedToast, setCopiedToast] = useState<boolean>(false);

  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setSpeechSupported(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = language;

      recognition.onstart = () => {
        setIsListening(true);
        setErrorMessage(null);
      };

      recognition.onresult = (event: any) => {
        let finalTranscriptChunk = '';
        let currentInterim = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            finalTranscriptChunk += event.results[i][0].transcript + ' ';
          } else {
            currentInterim += event.results[i][0].transcript;
          }
        }

        if (finalTranscriptChunk) {
          onChange(value ? `${value.trim()}\n${finalTranscriptChunk.trim()}` : finalTranscriptChunk.trim());
          setInterimTranscript('');
        } else {
          setInterimTranscript(currentInterim);
        }
      };

      recognition.onerror = (event: any) => {
        console.warn('Speech recognition error:', event.error);
        if (event.error === 'not-allowed') {
          setErrorMessage('Microphone access was denied. Please allow microphone permissions in browser settings.');
        } else if (event.error === 'no-speech') {
          // No speech detected, resume listening
        } else {
          setErrorMessage(`Dictation event: ${event.error}`);
        }
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
        setInterimTranscript('');
      };

      recognitionRef.current = recognition;
    } catch (e) {
      console.warn('SpeechRecognition init error:', e);
      setSpeechSupported(false);
    }

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {}
      }
    };
  }, [language, value, onChange]);

  const toggleListening = () => {
    if (!speechSupported) {
      setErrorMessage('Speech Recognition is not supported on this browser engine. You can type clinical notes manually.');
      return;
    }

    if (isListening) {
      try {
        recognitionRef.current?.stop();
      } catch (e) {}
      setIsListening(false);
    } else {
      setErrorMessage(null);
      try {
        if (recognitionRef.current) {
          recognitionRef.current.lang = language;
          recognitionRef.current.start();
        }
      } catch (e) {
        console.warn('Recognition start exception:', e);
        // If already started, stop then restart
        try {
          recognitionRef.current?.stop();
          setTimeout(() => recognitionRef.current?.start(), 150);
        } catch (err) {}
      }
    }
  };

  const handleApplyMacro = (macroText: string) => {
    const formatted = value ? `${value.trim()}\n\n${macroText}` : macroText;
    onChange(formatted);
  };

  const handleCopy = () => {
    if (!value) return;
    navigator.clipboard.writeText(value);
    setCopiedToast(true);
    setTimeout(() => setCopiedToast(false), 2000);
  };

  return (
    <div className="space-y-2 text-xs">
      {/* Label and Control Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <label className="font-bold text-slate-800 flex items-center gap-1.5">
          <FileText className="w-3.5 h-3.5 text-cyan-600" />
          <span>{label}</span>
        </label>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Language Selector */}
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value as any)}
            className="px-2 py-1 bg-white border border-slate-300 rounded-lg text-[11px] text-slate-700 font-medium"
            title="Speech Dictation Language"
          >
            <option value="en-US">English (US)</option>
            <option value="en-GB">English (UK / Clinical)</option>
            <option value="ur-PK">Urdu (Pakistan)</option>
          </select>

          {/* Voice-to-Text Trigger Button */}
          <button
            type="button"
            id="btn-voice-to-text-dictation"
            onClick={toggleListening}
            className={`px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shadow-xs ${
              isListening
                ? 'bg-rose-600 text-white animate-pulse ring-2 ring-rose-300'
                : 'bg-slate-900 hover:bg-slate-800 text-white'
            }`}
            title={isListening ? 'Click to stop dictation' : 'Click to start voice-to-text dictation'}
          >
            {isListening ? (
              <>
                <MicOff className="w-3.5 h-3.5" />
                <span>Listening (Stop)</span>
              </>
            ) : (
              <>
                <Mic className="w-3.5 h-3.5 text-cyan-400" />
                <span>Voice-to-Text</span>
              </>
            )}
          </button>

          {value && (
            <button
              type="button"
              onClick={handleCopy}
              className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
              title="Copy notes to clipboard"
            >
              {copiedToast ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          )}
        </div>
      </div>

      {/* Listening Status Bar */}
      {isListening && (
        <div className="bg-rose-50 border border-rose-200 p-2.5 rounded-xl text-rose-950 flex items-center justify-between gap-2 animate-fade-in">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping"></span>
            <span className="font-semibold text-[11px]">
              Microphone Active — Speak clearly ({language === 'ur-PK' ? 'اردو ڈکٹیشن' : 'Medical Dictation'})...
            </span>
          </div>
          {interimTranscript && (
            <span className="italic text-[11px] text-slate-600 font-medium">
              "{interimTranscript}"
            </span>
          )}
        </div>
      )}

      {/* Error Message if any */}
      {errorMessage && (
        <div className="bg-amber-50 border border-amber-200 p-2 rounded-lg text-amber-900 flex items-center gap-1.5 text-[11px]">
          <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Text Area */}
      <div className="relative">
        <textarea
          id="textarea-clinical-notes-dictation"
          rows={4}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full p-3 bg-white border border-slate-300 rounded-xl text-xs font-normal text-slate-900 leading-relaxed focus:ring-2 focus:ring-cyan-500 focus:outline-none"
        />
      </div>

      {/* Quick Clinical Note Template Snippets */}
      <div className="flex flex-wrap items-center gap-1.5 pt-1">
        <span className="text-[10px] text-slate-500 font-bold flex items-center gap-1">
          <ListPlus className="w-3 h-3 text-cyan-600" /> Quick Macros:
        </span>
        {[
          { label: 'Chest Discomfort HPI', text: '[HPI]: Patient reports intermittent retrosternal chest tightness aggravated by exertion, lasting 10-15 minutes, relieved by rest. No acute syncope.' },
          { label: 'Hypertension Review', text: '[Vascular Exam]: Blood pressure elevated at triage. Radial pulses bilateral symmetric. No peripheral lower extremity edema. S1/S2 heard normal without gallop.' },
          { label: 'Red-Flag Precautions', text: '[Counseling]: Patient advised on immediate ED return precautions for crushing chest pain, acute dyspnea, or neurological deficits. Low-sodium diet reinforced.' },
        ].map((macro, idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => handleApplyMacro(macro.text)}
            className="px-2 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md text-[10px] font-medium transition-colors cursor-pointer border border-slate-200"
          >
            + {macro.label}
          </button>
        ))}
      </div>
    </div>
  );
};
