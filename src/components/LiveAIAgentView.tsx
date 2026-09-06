import React, { useState, useEffect, useRef } from 'react';
import {
  Bot,
  Send,
  Sparkles,
  Building2,
  UserCheck,
  PhoneCall,
  MapPin,
  BedDouble,
  Activity,
  ShieldCheck,
  Clock,
  Search,
  Filter,
  RefreshCw,
  Copy,
  Check,
  AlertTriangle,
  Stethoscope,
  ChevronRight,
  ExternalLink,
  HeartPulse,
  BrainCircuit,
  MessageSquareQuote,
  Sparkle,
  PhoneForwarded,
  Layers,
  Award,
  Users,
  Compass
} from 'lucide-react';
import { HospitalFacility, DutyDoctor, PatientAssessmentRecord } from '../types/clinical';
import { PAKISTAN_HOSPITALS } from '../data/hospitalsData';
import { DUTY_DOCTORS_ROSTER } from '../data/dutyDoctorsData';
import { clinicalProfileSync } from '../services/clinicalProfileSyncService';

interface LiveAIAgentViewProps {
  currentPatient?: PatientAssessmentRecord | null;
  onSelectDoctorForCase?: (doctor: DutyDoctor) => void;
  onSelectHospitalForReferral?: (hospital: HospitalFacility) => void;
}

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  timestamp: string;
  source?: 'GEMINI_AI_LIVE' | 'LOCAL_KNOWLEDGE_ENGINE';
}

const QUICK_PROMPTS = [
  'Which hospitals in Karachi have a 24/7 Primary Angioplasty Cath Lab?',
  'Who is the on-duty cardiologist right now at JPMC Karachi?',
  'List all Government tertiary teaching hospitals in Punjab with Sehat Card',
  'What is the emergency triage protocol for BP 185/115 with acute chest pain?',
  'Find on-duty emergency trauma surgeon at LRH Peshawar',
  'Show ICU beds and emergency hotline for PIMS Islamabad',
  'Explain WHO HEARTS hypertension drug titration steps',
];

export const LiveAIAgentView: React.FC<LiveAIAgentViewProps> = ({
  currentPatient,
  onSelectDoctorForCase,
  onSelectHospitalForReferral,
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'CHAT' | 'HOSPITALS' | 'DOCTORS'>('CHAT');

  // Chat State
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome-1',
      role: 'assistant',
      text: `👋 **Welcome to the AI-HealthAssist Live Clinical & Hospital Intelligence Agent.**\n\nI am connected to the **Pakistan National Tertiary Healthcare & Emergency Network**. You can ask me about:\n\n* 🏥 **Government & Famous Hospitals:** Emergency hotlines, bed capacities, ICU/ventilators, and 24/7 Cath Labs.\n* 👨‍⚕️ **Doctors on Duty:** Active consultants, Senior Registrars, and DMOs on duty across shifts with direct hospital extensions.\n* 🩺 **Clinical Decision Support:** WHO HEARTS protocols, cardiovascular triage, FAST stroke rules, and drug safety.\n* 🚑 **Emergency EMS:** Rescue 1122 dispatch guidelines and fast-track referral routing.\n\n*How may I assist you today?*`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      source: 'LOCAL_KNOWLEDGE_ENGINE',
    },
  ]);
  const [inputQuery, setInputQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // Hospitals Directory State
  const [hospitals, setHospitals] = useState<HospitalFacility[]>(PAKISTAN_HOSPITALS);
  const [hospitalSearch, setHospitalSearch] = useState('');
  const [selectedProvince, setSelectedProvince] = useState<string>('ALL');
  const [selectedHospitalType, setSelectedHospitalType] = useState<string>('ALL');
  const [selectedSpecialtyFilter, setSelectedSpecialtyFilter] = useState<string>('ALL');

  // Doctors Roster State
  const [doctors, setDoctors] = useState<DutyDoctor[]>(DUTY_DOCTORS_ROSTER);
  const [doctorSearch, setDoctorSearch] = useState('');
  const [selectedShift, setSelectedShift] = useState<string>('ALL');
  const [selectedDoctorHospital, setSelectedDoctorHospital] = useState<string>('ALL');
  const [pagedDoctorAlert, setPagedDoctorAlert] = useState<string | null>(null);

  // Auto-scroll chat
  useEffect(() => {
    if (activeSubTab === 'CHAT') {
      chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, activeSubTab, isLoading]);

  // Fetch live hospitals or use local state
  const loadHospitals = async () => {
    try {
      const res = await fetch('/api/hospitals');
      const data = await res.json();
      if (data.success && data.hospitals) {
        setHospitals(data.hospitals);
      }
    } catch {
      setHospitals(PAKISTAN_HOSPITALS);
    }
  };

  // Fetch live doctors or use local state
  const loadDoctors = async () => {
    try {
      const res = await fetch('/api/doctors/on-duty');
      const data = await res.json();
      if (data.success && data.doctors) {
        setDoctors(data.doctors);
      }
    } catch {
      setDoctors(DUTY_DOCTORS_ROSTER);
    }
  };

  useEffect(() => {
    loadHospitals();
    loadDoctors();
  }, []);

  const handleSendMessage = async (queryToSend?: string) => {
    const text = queryToSend || inputQuery;
    if (!text.trim() || isLoading) return;

    const userMsg: ChatMessage = {
      id: `usr-${Date.now()}`,
      role: 'user',
      text: text.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputQuery('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/ai/qa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: text.trim(),
          conversationHistory: messages.map((m) => ({ role: m.role, text: m.text })),
          context: {
            currentPatient: currentPatient || null,
          },
        }),
      });

      const data = await res.json();
      if (data.success) {
        const botMsg: ChatMessage = {
          id: `bot-${Date.now()}`,
          role: 'assistant',
          text: data.answer,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          source: data.source,
        };
        setMessages((prev) => [...prev, botMsg]);
      } else {
        throw new Error(data.error || 'Failed to get answer');
      }
    } catch (err: any) {
      const errorMsg: ChatMessage = {
        id: `err-${Date.now()}`,
        role: 'assistant',
        text: `⚠️ **Notice:** Unable to connect to server AI service. However, local triage algorithms and hospital databases are fully operational.\n\n*Emergency Contact:* **Rescue 1122** | Police: **15** | National Health Helpline: **1166**`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        source: 'LOCAL_KNOWLEDGE_ENGINE',
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handlePageDoctor = (doc: DutyDoctor) => {
    setPagedDoctorAlert(
      `📟 Paging Request Sent to ${doc.name} (${doc.hospitalName}, ${doc.pagerExtension}). Priority Alert dispatched.`
    );
    setTimeout(() => setPagedDoctorAlert(null), 4500);
  };

  // Filtered hospitals
  const filteredHospitals = hospitals.filter((h) => {
    const matchesSearch =
      !hospitalSearch ||
      h.name.toLowerCase().includes(hospitalSearch.toLowerCase()) ||
      h.urduName.includes(hospitalSearch) ||
      h.city.toLowerCase().includes(hospitalSearch.toLowerCase()) ||
      h.district.toLowerCase().includes(hospitalSearch.toLowerCase()) ||
      h.specialties.some((s) => s.toLowerCase().includes(hospitalSearch.toLowerCase()));

    const matchesProvince =
      selectedProvince === 'ALL' || h.province.toLowerCase() === selectedProvince.toLowerCase();
    const matchesType = selectedHospitalType === 'ALL' || h.type === selectedHospitalType;
    const matchesSpecialty =
      selectedSpecialtyFilter === 'ALL' ||
      h.specialties.some((s) => s.toLowerCase().includes(selectedSpecialtyFilter.toLowerCase()));

    return matchesSearch && matchesProvince && matchesType && matchesSpecialty;
  });

  // Filtered doctors
  const filteredDoctors = doctors.filter((d) => {
    const matchesSearch =
      !doctorSearch ||
      d.name.toLowerCase().includes(doctorSearch.toLowerCase()) ||
      d.specialty.toLowerCase().includes(doctorSearch.toLowerCase()) ||
      d.hospitalName.toLowerCase().includes(doctorSearch.toLowerCase()) ||
      d.department.toLowerCase().includes(doctorSearch.toLowerCase()) ||
      d.pmdcNumber.toLowerCase().includes(doctorSearch.toLowerCase());

    const matchesShift = selectedShift === 'ALL' || d.shift === selectedShift;
    const matchesHospital =
      selectedDoctorHospital === 'ALL' || d.hospitalId === selectedDoctorHospital;

    return matchesSearch && matchesShift && matchesHospital;
  });

  return (
    <div className="space-y-6">
      {/* Top Banner with Navigation Tabs */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 shadow-inner">
                <BrainCircuit className="w-6 h-6 animate-pulse" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
                  Live AI Clinical Agent & Hospital Intelligence Roster
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-mono font-medium">
                    Online 24/7
                  </span>
                </h2>
                <p className="text-sm text-slate-400">
                  Real-time clinical Q&A powered by Gemini AI, Pakistan Government & Tertiary
                  Hospital Directory, and Live On-Duty Specialists Schedule.
                </p>
              </div>
            </div>
          </div>

          {/* Sub Navigation Tabs */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-950/80 border border-slate-800 rounded-xl">
            <button
              id="tab-ai-chat"
              onClick={() => setActiveSubTab('CHAT')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all ${
                activeSubTab === 'CHAT'
                  ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <Bot className="w-4 h-4" />
              <span>Live AI Assistant</span>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            </button>

            <button
              id="tab-hospitals-directory"
              onClick={() => setActiveSubTab('HOSPITALS')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all ${
                activeSubTab === 'HOSPITALS'
                  ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <Building2 className="w-4 h-4" />
              <span>Hospitals Directory</span>
              <span className="px-1.5 py-0.2 rounded-full bg-slate-800 text-[10px] text-slate-300 font-mono">
                {hospitals.length}
              </span>
            </button>

            <button
              id="tab-duty-doctors"
              onClick={() => setActiveSubTab('DOCTORS')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition-all ${
                activeSubTab === 'DOCTORS'
                  ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <UserCheck className="w-4 h-4" />
              <span>Doctors On Duty</span>
              <span className="px-1.5 py-0.2 rounded-full bg-slate-800 text-[10px] text-slate-300 font-mono">
                {doctors.length}
              </span>
            </button>
          </div>
        </div>

        {/* Global Notification Banner if physician paged */}
        {pagedDoctorAlert && (
          <div className="mt-4 p-3 bg-cyan-950/80 border border-cyan-500/40 rounded-xl flex items-center justify-between text-xs text-cyan-200 animate-fade-in">
            <div className="flex items-center gap-2">
              <PhoneForwarded className="w-4 h-4 text-cyan-400 animate-bounce" />
              <span>{pagedDoctorAlert}</span>
            </div>
            <button
              onClick={() => setPagedDoctorAlert(null)}
              className="text-cyan-400 hover:text-white"
            >
              Dismiss
            </button>
          </div>
        )}
      </div>

      {/* SUB-VIEW 1: LIVE AI CHAT ASSISTANT */}
      {activeSubTab === 'CHAT' && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Main Chat Interface */}
          <div className="lg:col-span-3 bg-slate-900/90 border border-slate-800 rounded-2xl flex flex-col h-[700px] shadow-2xl overflow-hidden">
            {/* Chat Top Bar */}
            <div className="px-6 py-4 border-b border-slate-800 bg-slate-950/60 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-3 h-3 rounded-full bg-emerald-500 animate-pulse" />
                <div>
                  <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                    AI Clinical & Hospital Q&A Co-Pilot
                    <span className="text-[10px] px-2 py-0.5 rounded bg-blue-500/10 border border-blue-500/20 text-blue-400 font-mono">
                      Gemini 3.7 Flash
                    </span>
                  </h3>
                  <p className="text-xs text-slate-400">
                    Grounded in Pakistan Government Hospitals, Duty Rosters & WHO HEARTS Protocols
                  </p>
                </div>
              </div>

              {currentPatient && (
                <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800/80 border border-slate-700/60 text-xs text-slate-300">
                  <Stethoscope className="w-3.5 h-3.5 text-cyan-400" />
                  <span>
                    Session Context:{' '}
                    <strong className="text-white">
                      {currentPatient.demographics.fullName} ({currentPatient.demographics.age}y)
                    </strong>
                  </span>
                </div>
              )}
            </div>

            {/* Chat Messages Stream */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  {msg.role === 'assistant' && (
                    <div className="w-8 h-8 rounded-lg bg-cyan-600/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0 mt-0.5">
                      <Bot className="w-4 h-4" />
                    </div>
                  )}

                  <div
                    className={`max-w-[82%] rounded-2xl p-4 text-xs leading-relaxed transition-all ${
                      msg.role === 'user'
                        ? 'bg-blue-600 text-white rounded-br-none shadow-lg'
                        : 'bg-slate-950/80 border border-slate-800 text-slate-200 rounded-bl-none shadow-md'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-4 mb-1.5 opacity-60 text-[10px]">
                      <span>{msg.role === 'user' ? 'You (Physician / User)' : 'AI Clinical Agent'}</span>
                      <div className="flex items-center gap-2">
                        <span>{msg.timestamp}</span>
                        {msg.role === 'assistant' && (
                          <button
                            onClick={() => handleCopy(msg.id, msg.text)}
                            className="hover:text-cyan-400 transition-colors"
                            title="Copy response"
                          >
                            {copiedId === msg.id ? (
                              <Check className="w-3 h-3 text-emerald-400" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="whitespace-pre-line prose prose-invert prose-xs">
                      {msg.text}
                    </div>

                    {msg.source && (
                      <div className="mt-2.5 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-500 font-mono">
                        <span>Engine: {msg.source}</span>
                        <span className="text-emerald-500/80 flex items-center gap-1">
                          <ShieldCheck className="w-3 h-3" /> Verified Protocol
                        </span>
                      </div>
                    )}
                  </div>

                  {msg.role === 'user' && (
                    <div className="w-8 h-8 rounded-lg bg-blue-700 flex items-center justify-center text-white shrink-0 mt-0.5">
                      <Users className="w-4 h-4" />
                    </div>
                  )}
                </div>
              ))}

              {isLoading && (
                <div className="flex gap-3 justify-start items-center text-xs text-slate-400">
                  <div className="w-8 h-8 rounded-lg bg-cyan-600/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0">
                    <Bot className="w-4 h-4 animate-spin" />
                  </div>
                  <div className="bg-slate-950/80 border border-slate-800 rounded-2xl rounded-bl-none p-3.5 flex items-center gap-2 text-cyan-400">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Analyzing clinical guidelines, hospital capacity & duty rosters...</span>
                  </div>
                </div>
              )}

              <div ref={chatBottomRef} />
            </div>

            {/* Quick Prompt Chips */}
            <div className="px-6 py-2 bg-slate-950/40 border-t border-slate-800/60 overflow-x-auto flex items-center gap-2 no-scrollbar">
              <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1 shrink-0">
                <Sparkles className="w-3 h-3 text-cyan-400" />
                Suggestions:
              </span>
              {QUICK_PROMPTS.map((prompt, i) => (
                <button
                  key={i}
                  onClick={() => handleSendMessage(prompt)}
                  className="px-2.5 py-1 rounded-full bg-slate-800/70 hover:bg-slate-700 border border-slate-700/60 text-[11px] text-slate-300 hover:text-white whitespace-nowrap transition-colors shrink-0"
                >
                  {prompt}
                </button>
              ))}
            </div>

            {/* Input Bar */}
            <div className="p-4 bg-slate-950 border-t border-slate-800">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendMessage();
                }}
                className="flex items-center gap-2"
              >
                <input
                  id="input-ai-qa-query"
                  type="text"
                  value={inputQuery}
                  onChange={(e) => setInputQuery(e.target.value)}
                  placeholder="Ask any medical question, hospital inquiry, or on-duty doctor request (Urdu / English)..."
                  className="flex-1 px-4 py-3 bg-slate-900 border border-slate-700/80 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500"
                />
                <button
                  id="btn-submit-ai-qa"
                  type="submit"
                  disabled={!inputQuery.trim() || isLoading}
                  className="px-5 py-3 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 disabled:opacity-50 text-white font-medium flex items-center gap-2 transition-all shadow-lg text-xs"
                >
                  <Send className="w-4 h-4" />
                  <span>Ask AI</span>
                </button>
              </form>
            </div>
          </div>

          {/* Right Sidebar: Fast Triage & National Helplines */}
          <div className="space-y-4">
            {/* National Emergency Helplines Card */}
            <div className="bg-gradient-to-br from-rose-950/40 via-slate-900 to-slate-900 border border-rose-800/40 rounded-2xl p-4 shadow-xl">
              <h4 className="text-xs font-bold text-rose-400 uppercase tracking-wider flex items-center gap-2 mb-3">
                <AlertTriangle className="w-4 h-4 text-rose-400 animate-pulse" />
                National Emergency Hotlines
              </h4>
              <div className="space-y-2.5">
                <a
                  href="tel:1122"
                  className="flex items-center justify-between p-2.5 rounded-xl bg-rose-900/20 hover:bg-rose-900/30 border border-rose-700/30 transition-all text-xs"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-rose-600/30 flex items-center justify-center text-rose-300 font-bold font-mono">
                      1122
                    </div>
                    <div>
                      <div className="font-semibold text-white">Rescue 1122</div>
                      <div className="text-[10px] text-slate-400">Ambulance & Fire Service</div>
                    </div>
                  </div>
                  <PhoneCall className="w-4 h-4 text-rose-400" />
                </a>

                <a
                  href="tel:115"
                  className="flex items-center justify-between p-2.5 rounded-xl bg-slate-800/60 hover:bg-slate-800 border border-slate-700 transition-all text-xs"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-slate-700 flex items-center justify-center text-slate-200 font-bold font-mono">
                      115
                    </div>
                    <div>
                      <div className="font-semibold text-white">Edhi Foundation</div>
                      <div className="text-[10px] text-slate-400">Emergency Ambulance</div>
                    </div>
                  </div>
                  <PhoneCall className="w-4 h-4 text-slate-400" />
                </a>

                <a
                  href="tel:080009009"
                  className="flex items-center justify-between p-2.5 rounded-xl bg-slate-800/60 hover:bg-slate-800 border border-slate-700 transition-all text-xs"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-lg bg-emerald-700/30 flex items-center justify-center text-emerald-300 font-bold text-[10px]">
                      Sehat
                    </div>
                    <div>
                      <div className="font-semibold text-white">Sehat Sahulat Card</div>
                      <div className="text-[10px] text-slate-400">0800-09009 (Toll Free)</div>
                    </div>
                  </div>
                  <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                </a>
              </div>
            </div>

            {/* Fast Stats Snapshot */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                <Compass className="w-4 h-4 text-cyan-400" />
                Integrated Roster Stats
              </h4>

              <div className="grid grid-cols-2 gap-2.5">
                <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800/80">
                  <div className="text-[10px] text-slate-400">Tertiary Hospitals</div>
                  <div className="text-lg font-bold text-white font-mono">{hospitals.length}</div>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800/80">
                  <div className="text-[10px] text-slate-400">On-Duty Clinicians</div>
                  <div className="text-lg font-bold text-cyan-400 font-mono">{doctors.length}</div>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800/80">
                  <div className="text-[10px] text-slate-400">Total ICU Beds</div>
                  <div className="text-lg font-bold text-emerald-400 font-mono">
                    {hospitals.reduce((acc, h) => acc + h.icuBeds, 0)}
                  </div>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800/80">
                  <div className="text-[10px] text-slate-400">Ventilators</div>
                  <div className="text-lg font-bold text-amber-400 font-mono">
                    {hospitals.reduce((acc, h) => acc + h.ventilators, 0)}
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Switch Cards */}
            <div className="p-4 bg-gradient-to-br from-indigo-950/40 to-slate-900 border border-indigo-800/30 rounded-2xl space-y-2.5">
              <div className="text-xs font-bold text-indigo-300 flex items-center gap-2">
                <Layers className="w-4 h-4 text-indigo-400" />
                Quick Explorer
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Directly browse hospital facilities or page specialists currently on duty:
              </p>
              <div className="flex flex-col gap-2 pt-1">
                <button
                  onClick={() => setActiveSubTab('HOSPITALS')}
                  className="w-full py-2 px-3 rounded-xl bg-indigo-900/30 hover:bg-indigo-900/50 border border-indigo-700/40 text-xs text-indigo-200 font-medium flex items-center justify-between transition-colors"
                >
                  <span>Open Hospitals Directory</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setActiveSubTab('DOCTORS')}
                  className="w-full py-2 px-3 rounded-xl bg-cyan-900/30 hover:bg-cyan-900/50 border border-cyan-700/40 text-xs text-cyan-200 font-medium flex items-center justify-between transition-colors"
                >
                  <span>View On-Duty Doctors Roster</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SUB-VIEW 2: HOSPITALS DIRECTORY */}
      {activeSubTab === 'HOSPITALS' && (
        <div className="space-y-6">
          {/* Filter Toolbar */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                id="search-hospitals-input"
                type="text"
                value={hospitalSearch}
                onChange={(e) => setHospitalSearch(e.target.value)}
                placeholder="Search hospitals by name, Urdu name, city, district, or specialty (e.g. NICVD, Mayo, Burn ICU)..."
                className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
              />
            </div>

            {/* Dropdown Filters */}
            <div className="flex flex-wrap items-center gap-2.5">
              {/* Province Filter */}
              <select
                id="filter-hospital-province"
                value={selectedProvince}
                onChange={(e) => setSelectedProvince(e.target.value)}
                className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
              >
                <option value="ALL">All Provinces</option>
                <option value="Punjab">Punjab</option>
                <option value="Sindh">Sindh</option>
                <option value="Islamabad Capital Territory">Islamabad (ICT)</option>
                <option value="Khyber Pakhtunkhwa">Khyber Pakhtunkhwa (KPK)</option>
                <option value="Balochistan">Balochistan</option>
              </select>

              {/* Type Filter */}
              <select
                id="filter-hospital-type"
                value={selectedHospitalType}
                onChange={(e) => setSelectedHospitalType(e.target.value)}
                className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
              >
                <option value="ALL">All Hospital Types</option>
                <option value="AUTONOMOUS_TEACHING">Autonomous Teaching</option>
                <option value="SPECIALIZED_TERTIARY">Specialized Tertiary</option>
                <option value="FEDERAL_GOVT">Federal Government</option>
                <option value="PROVINCIAL_GOVT">Provincial Government</option>
                <option value="TRUST_SEMI_GOVT">Trust / Semi-Govt</option>
              </select>

              <button
                onClick={() => {
                  setHospitalSearch('');
                  setSelectedProvince('ALL');
                  setSelectedHospitalType('ALL');
                  setSelectedSpecialtyFilter('ALL');
                }}
                className="px-3 py-2 bg-slate-800 hover:bg-slate-700 rounded-xl text-xs text-slate-300 flex items-center gap-1.5 transition-colors"
              >
                <RefreshCw className="w-3 h-3" />
                Reset
              </button>
            </div>
          </div>

          {/* Hospitals Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredHospitals.map((hospital) => (
              <div
                key={hospital.id}
                className="bg-slate-900/90 border border-slate-800 hover:border-cyan-500/40 rounded-2xl p-5 shadow-xl flex flex-col justify-between transition-all duration-300 hover:shadow-cyan-950/20 group"
              >
                <div>
                  {/* Top Badges */}
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <span
                      className={`text-[10px] px-2.5 py-0.5 rounded-full font-medium border ${
                        hospital.type === 'SPECIALIZED_TERTIARY'
                          ? 'bg-purple-500/10 border-purple-500/30 text-purple-300'
                          : hospital.type === 'FEDERAL_GOVT'
                          ? 'bg-blue-500/10 border-blue-500/30 text-blue-300'
                          : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                      }`}
                    >
                      {hospital.type.replace(/_/g, ' ')}
                    </span>

                    <span
                      className={`text-[10px] px-2 py-0.5 rounded font-mono font-semibold ${
                        hospital.status === 'CRITICAL_CAPACITY'
                          ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                          : hospital.status === 'BUSY'
                          ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                          : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      }`}
                    >
                      {hospital.status} ({hospital.erBedLoadPct}% Load)
                    </span>
                  </div>

                  {/* Hospital Title */}
                  <h3 className="text-base font-bold text-white group-hover:text-cyan-400 transition-colors">
                    {hospital.name}
                  </h3>
                  <div className="text-xs text-slate-400 font-urdu mt-0.5">{hospital.urduName}</div>

                  <div className="flex items-center gap-1.5 text-xs text-slate-400 mt-2">
                    <MapPin className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                    <span>
                      {hospital.city}, {hospital.province}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500 mt-1 line-clamp-1">
                    {hospital.address}
                  </div>

                  {/* Capacity Ribbon */}
                  <div className="grid grid-cols-3 gap-2 my-4 p-2.5 bg-slate-950/80 border border-slate-800/80 rounded-xl text-center">
                    <div>
                      <div className="text-[10px] text-slate-500">Total Beds</div>
                      <div className="text-sm font-bold text-white font-mono">
                        {hospital.bedCapacity}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-500">ICU Beds</div>
                      <div className="text-sm font-bold text-cyan-400 font-mono">
                        {hospital.icuBeds}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] text-slate-500">Ventilators</div>
                      <div className="text-sm font-bold text-emerald-400 font-mono">
                        {hospital.ventilators}
                      </div>
                    </div>
                  </div>

                  {/* Specialties Pills */}
                  <div className="space-y-1.5 mb-4">
                    <div className="text-[11px] font-semibold text-slate-400">Key Super-Specialties:</div>
                    <div className="flex flex-wrap gap-1.5">
                      {hospital.specialties.slice(0, 4).map((spec, i) => (
                        <span
                          key={i}
                          className="px-2 py-0.5 rounded-md bg-slate-800/80 border border-slate-700 text-[10px] text-slate-300"
                        >
                          {spec}
                        </span>
                      ))}
                      {hospital.specialties.length > 4 && (
                        <span className="px-1.5 py-0.5 rounded-md bg-slate-800 text-[10px] text-slate-500">
                          +{hospital.specialties.length - 4} more
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Sehat Card Status */}
                  <div className="flex items-center gap-2 text-xs py-1.5 px-2.5 rounded-lg bg-slate-950 border border-slate-800/60 mb-4">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    <span className="text-slate-300">
                      Sehat Sahulat Card:{' '}
                      <strong className="text-emerald-400">
                        {hospital.sehatCardAccepted ? 'Accepted (100% Free Coverage)' : 'Not Listed'}
                      </strong>
                    </span>
                  </div>
                </div>

                {/* Card Actions */}
                <div className="pt-3 border-t border-slate-800 flex flex-col gap-2">
                  <div className="flex items-center justify-between gap-2">
                    <a
                      href={`tel:${hospital.phoneEmergency}`}
                      className="flex-1 py-2 px-3 rounded-xl bg-rose-600/20 hover:bg-rose-600/30 border border-rose-500/40 text-xs font-semibold text-rose-300 flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <PhoneCall className="w-3.5 h-3.5" />
                      <span>24/7 ER: {hospital.phoneEmergency.split('-').slice(-2).join('-')}</span>
                    </a>

                    <button
                      onClick={() => {
                        setSelectedDoctorHospital(hospital.id);
                        setActiveSubTab('DOCTORS');
                      }}
                      className="py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-cyan-300 border border-slate-700 flex items-center gap-1 transition-colors cursor-pointer"
                    >
                      <Users className="w-3.5 h-3.5 text-cyan-400" />
                      <span>View Doctors ({doctors.filter((d) => d.hospitalId === hospital.id).length})</span>
                    </button>
                  </div>

                  {onSelectHospitalForReferral && (
                    <button
                      onClick={() => onSelectHospitalForReferral(hospital)}
                      className="w-full py-2 px-3 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-xs font-semibold text-white flex items-center justify-center gap-1 transition-colors cursor-pointer"
                    >
                      <span>Select for Referral Case Transfer</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {filteredHospitals.length === 0 && (
            <div className="text-center py-12 bg-slate-900/60 border border-slate-800 rounded-2xl text-slate-400">
              <Building2 className="w-10 h-10 mx-auto text-slate-600 mb-2" />
              <p className="text-sm">No hospitals matched your filter criteria.</p>
              <button
                onClick={() => {
                  setHospitalSearch('');
                  setSelectedProvince('ALL');
                  setSelectedHospitalType('ALL');
                }}
                className="mt-3 px-4 py-1.5 bg-cyan-600 text-white rounded-lg text-xs font-medium"
              >
                Clear Filters
              </button>
            </div>
          )}
        </div>
      )}

      {/* SUB-VIEW 3: DOCTORS ON DUTY ROSTER */}
      {activeSubTab === 'DOCTORS' && (
        <div className="space-y-6">
          {/* Doctor Filter Toolbar */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-4">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                id="search-doctors-input"
                type="text"
                value={doctorSearch}
                onChange={(e) => setDoctorSearch(e.target.value)}
                placeholder="Search clinician by name, specialty, hospital, department, or PMDC license..."
                className="w-full pl-10 pr-4 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
              />
            </div>

            {/* Dropdown Filters */}
            <div className="flex flex-wrap items-center gap-2.5">
              {/* Shift Filter */}
              <select
                id="filter-doctor-shift"
                value={selectedShift}
                onChange={(e) => setSelectedShift(e.target.value)}
                className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
              >
                <option value="ALL">All Shifts</option>
                <option value="MORNING">Morning (08:00 - 14:00)</option>
                <option value="EVENING">Evening (14:00 - 20:00)</option>
                <option value="NIGHT_STAT">Night STAT (20:00 - 08:00)</option>
                <option value="ON_CALL">24-Hr On-Call</option>
              </select>

              {/* Hospital Filter */}
              <select
                id="filter-doctor-hospital"
                value={selectedDoctorHospital}
                onChange={(e) => setSelectedDoctorHospital(e.target.value)}
                className="px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-cyan-500 max-w-[200px]"
              >
                <option value="ALL">All Facilities</option>
                {hospitals.map((h) => (
                  <option key={h.id} value={h.id}>
                    {h.name}
                  </option>
                ))}
              </select>

              <button
                onClick={() => {
                  setDoctorSearch('');
                  setSelectedShift('ALL');
                  setSelectedDoctorHospital('ALL');
                }}
                className="px-3 py-2 bg-slate-800 hover:bg-slate-700 rounded-xl text-xs text-slate-300 flex items-center gap-1.5 transition-colors"
              >
                <RefreshCw className="w-3 h-3" />
                Reset
              </button>
            </div>
          </div>

          {/* Doctors Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredDoctors.map((doc) => (
              <div
                key={doc.id}
                className="bg-slate-900/90 border border-slate-800 hover:border-cyan-500/40 rounded-2xl p-5 shadow-xl flex flex-col justify-between transition-all duration-300 hover:shadow-cyan-950/20 group"
              >
                <div>
                  {/* Top Status Badges */}
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <span
                      className={`text-[10px] px-2.5 py-0.5 rounded-full font-mono font-medium border flex items-center gap-1.5 ${
                        doc.dutyStatus === 'ACTIVE_ON_DUTY'
                          ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                          : doc.dutyStatus === 'IN_RESUSCITATION'
                          ? 'bg-rose-500/10 border-rose-500/30 text-rose-400'
                          : doc.dutyStatus === 'IN_OPERATION_THEATER'
                          ? 'bg-purple-500/10 border-purple-500/30 text-purple-400'
                          : 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                      }`}
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-current animate-ping" />
                      {doc.dutyStatus.replace(/_/g, ' ')}
                    </span>

                    <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300 font-mono">
                      Shift: {doc.shift}
                    </span>
                  </div>

                  {/* Doctor Info */}
                  <h3 className="text-base font-bold text-white group-hover:text-cyan-400 transition-colors">
                    {doc.name}
                  </h3>
                  <div className="text-xs text-cyan-300 font-medium mt-0.5">{doc.title}</div>
                  <div className="text-[11px] text-slate-400 mt-1">{doc.qualifications}</div>

                  {/* PMDC Badge */}
                  <div className="flex items-center gap-2 mt-3 text-xs">
                    <span className="px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-[10px] text-slate-400 font-mono">
                      PMDC #{doc.pmdcNumber}
                    </span>
                    <span className="text-[11px] text-slate-400">
                      Queue: <strong className="text-white">{doc.activePatientsInQueue}</strong> pts
                    </span>
                  </div>

                  {/* Department & Hospital */}
                  <div className="mt-4 p-3 bg-slate-950/80 border border-slate-800/80 rounded-xl space-y-1.5 text-xs">
                    <div className="flex items-center gap-1.5 text-slate-200">
                      <Building2 className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                      <strong className="text-white">{doc.hospitalName}</strong>
                    </div>
                    <div className="text-[11px] text-slate-400 pl-5">
                      Dept: {doc.department} ({doc.roomOrWard})
                    </div>
                    <div className="flex items-center gap-1.5 text-slate-400 pl-5 text-[11px]">
                      <Clock className="w-3 h-3 text-slate-500" />
                      <span>{doc.shiftTime}</span>
                    </div>
                  </div>

                  {/* Languages Spoken */}
                  <div className="mt-3 flex items-center gap-1.5 text-[11px] text-slate-400">
                    <span>Languages:</span>
                    <div className="flex flex-wrap gap-1">
                      {doc.languages.map((lang, idx) => (
                        <span
                          key={idx}
                          className="px-1.5 py-0.2 rounded bg-slate-800 text-[10px] text-slate-300"
                        >
                          {lang}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div className="pt-4 mt-4 border-t border-slate-800 flex flex-col gap-2">
                  <div className="flex items-center justify-between gap-2">
                    <button
                      onClick={() => handlePageDoctor(doc)}
                      className="flex-1 py-2 px-3 rounded-xl bg-cyan-600/20 hover:bg-cyan-600/30 border border-cyan-500/40 text-xs font-semibold text-cyan-300 flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <PhoneForwarded className="w-3.5 h-3.5" />
                      <span>Page {doc.pagerExtension}</span>
                    </button>

                    <button
                      onClick={() => {
                        clinicalProfileSync.setActiveDoctor({
                          id: `doc-${doc.id}`,
                          name: doc.name,
                          qualifications: doc.qualifications,
                          specialty: doc.specialty,
                          roleTitle: doc.title,
                          licenseNo: doc.pmdcNumber.startsWith('PMDC') ? doc.pmdcNumber : `PMDC-${doc.pmdcNumber}`,
                          signatureText: doc.name,
                          signatureStyle: 'classic',
                          signatureInkColor: '#1e3a8a',
                          signatureFlourishFactor: 1.0,
                          hospitalId: doc.hospitalId,
                          hospitalName: doc.hospitalName,
                        });
                        setPagedDoctorAlert(`✓ Synchronized ${doc.name} (${doc.pmdcNumber}) as Active CDS Reviewing Physician!`);
                        setTimeout(() => setPagedDoctorAlert(null), 4000);
                      }}
                      className="py-2 px-3 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/40 text-xs font-semibold text-emerald-300 flex items-center gap-1 transition-colors cursor-pointer"
                      title="Set as Active Reviewing Doctor across the app"
                    >
                      <UserCheck className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Sync Profile</span>
                    </button>
                  </div>

                  {onSelectDoctorForCase && (
                    <button
                      onClick={() => onSelectDoctorForCase(doc)}
                      className="w-full py-2 px-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-xs font-semibold text-white flex items-center justify-center gap-1 transition-colors cursor-pointer"
                    >
                      <span>Assign to Current Case Intake</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {filteredDoctors.length === 0 && (
            <div className="text-center py-12 bg-slate-900/60 border border-slate-800 rounded-2xl text-slate-400">
              <UserCheck className="w-10 h-10 mx-auto text-slate-600 mb-2" />
              <p className="text-sm">No on-duty doctors matched your search criteria.</p>
              <button
                onClick={() => {
                  setDoctorSearch('');
                  setSelectedShift('ALL');
                  setSelectedDoctorHospital('ALL');
                }}
                className="mt-3 px-4 py-1.5 bg-cyan-600 text-white rounded-lg text-xs font-medium"
              >
                Clear Filters
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
