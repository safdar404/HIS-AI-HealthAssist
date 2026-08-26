import React, { useState, useEffect, useRef } from 'react';
import {
  PatientAssessmentRecord,
  DoctorReview,
  DoctorAgreement,
} from '../types/clinical';
import {
  CONTROLLED_DRUG_DATABASE,
  performMedicationSafetyCheck,
} from '../clinical/controlledMedicationEngine';
import { exportPatientAssessmentToPDF } from '../utils/clinicalPdfExport';
import { PatientVitalsTrendChart } from './PatientVitalsTrendChart';
import { BiometricAuthOverlay } from './BiometricAuthOverlay';
import {
  ShieldAlert,
  AlertTriangle,
  Heart,
  Activity,
  CheckCircle,
  FileText,
  User,
  Stethoscope,
  Sparkles,
  Printer,
  ChevronRight,
  TrendingUp,
  AlertOctagon,
  HelpCircle,
  Pill,
  Search,
  Filter,
  Download,
  Clock,
  RotateCcw,
  X,
  Layers,
  Lock,
  Unlock,
  Fingerprint,
  Scan,
} from 'lucide-react';

interface DoctorCDSPortalProps {
  assessments: PatientAssessmentRecord[];
  selectedAssessment: PatientAssessmentRecord | null;
  onSelectAssessment: (record: PatientAssessmentRecord) => void;
  onSaveDoctorReview: (review: DoctorReview) => void;
}

export const DoctorCDSPortal: React.FC<DoctorCDSPortalProps> = ({
  assessments,
  selectedAssessment,
  onSelectAssessment,
  onSaveDoctorReview,
}) => {
  const [triageFilter, setTriageFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Doctor Review Form State
  const [doctorName, setDoctorName] = useState('Dr. Asim Farooq, FCPS (Cardiology)');
  const [doctorLicenseNo, setDoctorLicenseNo] = useState('PMDC-58921-P');
  const [facility, setFacility] = useState('Services Hospital / Punjab Primary Care Clinic');
  const [aiAgreement, setAiAgreement] = useState<DoctorAgreement>('AGREE');
  const [doctorDiagnosis, setDoctorDiagnosis] = useState('');
  const [clinicalNotes, setClinicalNotes] = useState('');
  const [orderedInvestigations, setOrderedInvestigations] = useState<string[]>([]);
  const [selectedCandidateDrug, setSelectedCandidateDrug] = useState<string>('Atorvastatin');
  const [prescribedDrugs, setPrescribedDrugs] = useState<
    {
      drugName: string;
      dosage: string;
      frequency: string;
      duration: string;
      safetyChecksPassed: boolean;
      safetyNotes?: string;
    }[]
  >([]);

  // Auto-save State
  const [lastAutoSavedTime, setLastAutoSavedTime] = useState<string | null>(null);
  const [hasUnsavedDraft, setHasUnsavedDraft] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);

  // AI Co-Pilot State
  const [isGeneratingNotes, setIsGeneratingNotes] = useState(false);
  const [copilotNotes, setCopilotNotes] = useState<string | null>(null);

  // Biometric Security & Access Control State
  const [isBiometricModalOpen, setIsBiometricModalOpen] = useState<boolean>(false);
  const [isRecordUnlocked, setIsRecordUnlocked] = useState<boolean>(() => {
    return sessionStorage.getItem('cds_biometric_unlocked') === 'true';
  });
  const [pendingRecordToUnlock, setPendingRecordToUnlock] = useState<PatientAssessmentRecord | null>(null);

  const handleSelectPatientWithBiometrics = (item: PatientAssessmentRecord) => {
    if (!isRecordUnlocked) {
      setPendingRecordToUnlock(item);
      setIsBiometricModalOpen(true);
    } else {
      onSelectAssessment(item);
    }
  };

  const activeRecord = selectedAssessment || assessments[0] || null;
  const assessment = activeRecord?.assessmentResult;

  // Load existing Doctor Review or Local Draft when active assessment changes
  useEffect(() => {
    if (!assessment) return;

    const draftKey = `doctor_review_draft_${assessment.assessmentId}`;
    const savedDraft = localStorage.getItem(draftKey);

    if (activeRecord?.doctorReview) {
      const rev = activeRecord.doctorReview;
      setDoctorName(rev.doctorName || 'Dr. Asim Farooq, FCPS (Cardiology)');
      setDoctorLicenseNo(rev.doctorLicenseNo || 'PMDC-58921-P');
      setFacility(rev.facility || 'Services Hospital / Punjab Primary Care Clinic');
      setAiAgreement(rev.aiAgreement || 'AGREE');
      setDoctorDiagnosis(rev.doctorDiagnosis || '');
      setClinicalNotes(rev.clinicalNotes || '');
      setOrderedInvestigations(rev.orderedInvestigations || []);
      setPrescribedDrugs(rev.prescribedMedications || []);
      setHasUnsavedDraft(false);
      setLastAutoSavedTime(null);
    } else if (savedDraft) {
      try {
        const parsed = JSON.parse(savedDraft);
        if (parsed.doctorName) setDoctorName(parsed.doctorName);
        if (parsed.doctorLicenseNo) setDoctorLicenseNo(parsed.doctorLicenseNo);
        if (parsed.facility) setFacility(parsed.facility);
        if (parsed.aiAgreement) setAiAgreement(parsed.aiAgreement);
        if (parsed.doctorDiagnosis) setDoctorDiagnosis(parsed.doctorDiagnosis);
        if (parsed.clinicalNotes) setClinicalNotes(parsed.clinicalNotes);
        if (parsed.orderedInvestigations) setOrderedInvestigations(parsed.orderedInvestigations);
        if (parsed.prescribedDrugs) setPrescribedDrugs(parsed.prescribedDrugs);
        setHasUnsavedDraft(true);
        if (parsed.timestamp) {
          setLastAutoSavedTime(new Date(parsed.timestamp).toLocaleTimeString());
        }
      } catch (e) {
        console.error('Failed to parse draft from localStorage', e);
      }
    } else {
      // Reset to defaults for a new review
      setAiAgreement('AGREE');
      setDoctorDiagnosis('');
      setClinicalNotes('');
      setOrderedInvestigations([]);
      setPrescribedDrugs([]);
      setHasUnsavedDraft(false);
      setLastAutoSavedTime(null);
    }
  }, [assessment?.assessmentId, activeRecord?.doctorReview]);

  // Auto-Save Effect: Runs every 30 seconds to persist form progress in localStorage
  useEffect(() => {
    if (!assessment) return;

    const autoSaveDraft = () => {
      const draftKey = `doctor_review_draft_${assessment.assessmentId}`;
      const draftData = {
        assessmentId: assessment.assessmentId,
        patientId: activeRecord.demographics.patientId,
        doctorName,
        doctorLicenseNo,
        facility,
        aiAgreement,
        doctorDiagnosis,
        clinicalNotes,
        orderedInvestigations,
        prescribedDrugs,
        timestamp: Date.now(),
      };

      try {
        localStorage.setItem(draftKey, JSON.stringify(draftData));
        const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        setLastAutoSavedTime(timeStr);
        setHasUnsavedDraft(true);
      } catch (err) {
        console.warn('LocalStorage auto-save failed:', err);
      }
    };

    // Set 30-second interval timer
    const intervalId = setInterval(autoSaveDraft, 30000);

    return () => clearInterval(intervalId);
  }, [
    assessment?.assessmentId,
    activeRecord?.demographics.patientId,
    doctorName,
    doctorLicenseNo,
    facility,
    aiAgreement,
    doctorDiagnosis,
    clinicalNotes,
    orderedInvestigations,
    prescribedDrugs,
  ]);

  // Clear current draft
  const handleClearDraft = () => {
    if (!assessment) return;
    const draftKey = `doctor_review_draft_${assessment.assessmentId}`;
    localStorage.removeItem(draftKey);
    setDoctorDiagnosis('');
    setClinicalNotes('');
    setOrderedInvestigations([]);
    setPrescribedDrugs([]);
    setHasUnsavedDraft(false);
    setLastAutoSavedTime(null);
  };

  // Compute Triage Level Summary Counts
  const emergencyList = assessments.filter(
    (a) =>
      a.assessmentResult?.triage.level === 'LEVEL_1_EMERGENCY' ||
      a.assessmentResult?.isEmergency
  );
  const urgentList = assessments.filter(
    (a) => a.assessmentResult?.triage.level === 'LEVEL_2_URGENT'
  );
  const priorityList = assessments.filter(
    (a) => a.assessmentResult?.triage.level === 'LEVEL_3_PRIORITY'
  );
  const routineList = assessments.filter(
    (a) =>
      a.assessmentResult?.triage.level === 'LEVEL_4_ROUTINE' ||
      a.assessmentResult?.triage.level === 'LEVEL_5_LOW_RISK'
  );

  const emergencyCount = emergencyList.length;
  const urgentCount = urgentList.length;
  const priorityCount = priorityList.length;
  const routineCount = routineList.length;
  const totalCount = assessments.length;

  // Filter queue by triage level and search query (name, patientId, MRN, district, triage level name)
  const filteredQueue = assessments.filter((item) => {
    let matchesTriage = true;
    if (triageFilter === 'LEVEL_1_EMERGENCY') {
      matchesTriage =
        item.assessmentResult?.triage.level === 'LEVEL_1_EMERGENCY' ||
        Boolean(item.assessmentResult?.isEmergency);
    } else if (triageFilter === 'LEVEL_2_URGENT') {
      matchesTriage = item.assessmentResult?.triage.level === 'LEVEL_2_URGENT';
    } else if (triageFilter === 'LEVEL_3_PRIORITY') {
      matchesTriage = item.assessmentResult?.triage.level === 'LEVEL_3_PRIORITY';
    } else if (triageFilter === 'LEVEL_ROUTINE') {
      matchesTriage =
        item.assessmentResult?.triage.level === 'LEVEL_4_ROUTINE' ||
        item.assessmentResult?.triage.level === 'LEVEL_5_LOW_RISK';
    }

    const q = searchQuery.toLowerCase().trim();
    if (!q) return matchesTriage;

    const nameMatch = item.demographics.fullName.toLowerCase().includes(q);
    const idMatch = item.demographics.patientId.toLowerCase().includes(q);
    const mrnMatch = Boolean(item.demographics.mrn && item.demographics.mrn.toLowerCase().includes(q));
    const districtMatch = item.demographics.district.toLowerCase().includes(q);
    const triageMatch =
      (item.assessmentResult?.triage.levelName &&
        item.assessmentResult.triage.levelName.toLowerCase().includes(q)) ||
      (item.assessmentResult?.triage.level &&
        item.assessmentResult.triage.level.toLowerCase().includes(q)) ||
      (q === 'emergency' && item.assessmentResult?.isEmergency) ||
      (q === 'routine' &&
        (item.assessmentResult?.triage.level === 'LEVEL_4_ROUTINE' ||
          item.assessmentResult?.triage.level === 'LEVEL_5_LOW_RISK'));

    return matchesTriage && (nameMatch || idMatch || mrnMatch || districtMatch || triageMatch);
  });

  // Toggle Investigation Order Checkbox
  const toggleInvestigation = (testName: string) => {
    setOrderedInvestigations((prev) =>
      prev.includes(testName)
        ? prev.filter((t) => t !== testName)
        : [...prev, testName]
    );
  };

  // Run Controlled Medication Check and Add
  const handleAddMedication = () => {
    if (!activeRecord || !selectedCandidateDrug) return;
    const safetyResult = performMedicationSafetyCheck(
      selectedCandidateDrug,
      activeRecord.profile,
      activeRecord.labs
    );

    const drugDef = CONTROLLED_DRUG_DATABASE[selectedCandidateDrug];
    const newPrescription = {
      drugName: drugDef?.genericName || selectedCandidateDrug,
      dosage: drugDef?.standardDose || 'Standard clinical dose',
      frequency: 'Once Daily',
      duration: '30 Days',
      safetyChecksPassed: safetyResult.passed,
      safetyNotes: [
        ...safetyResult.contraindications,
        ...safetyResult.warnings,
      ].join(' | '),
    };

    setPrescribedDrugs((prev) => [...prev, newPrescription]);
  };

  // Export PDF Report handler
  const handleExportPdf = () => {
    if (!activeRecord) return;
    setIsExportingPdf(true);
    try {
      exportPatientAssessmentToPDF(activeRecord);
    } catch (err) {
      console.error('PDF export failed:', err);
    } finally {
      setIsExportingPdf(false);
    }
  };

  // Submit Official Doctor Decision
  const handleSaveReview = () => {
    if (!assessment) return;
    const review: DoctorReview = {
      reviewId: `REV-${Date.now().toString().slice(-6)}`,
      assessmentId: assessment.assessmentId,
      doctorName,
      doctorLicenseNo,
      facility,
      reviewTimestamp: new Date().toISOString(),
      aiAgreement,
      doctorDiagnosis: doctorDiagnosis || 'Preliminary CVD Risk & Primary Care Assessment Confirmed',
      differentialDiagnoses: [
        'Atherosclerotic Cardiovascular Disease (ASCVD)',
        'Essential Systemic Hypertension',
        'Metabolic Syndrome',
      ],
      orderedInvestigations,
      clinicalNotes: clinicalNotes || 'Reviewed AI-HealthAssist risk scores and contributing SHAP factors. Initiated guideline-directed medical therapy.',
      prescribedMedications: prescribedDrugs,
      referralRequired: assessment.isEmergency || aiAgreement === 'REJECT',
      referralFacility: assessment.isEmergency ? 'Tertiary Cardiac Emergency Care Center' : undefined,
    };

    // Clean up local draft upon final submission
    const draftKey = `doctor_review_draft_${assessment.assessmentId}`;
    localStorage.removeItem(draftKey);
    setHasUnsavedDraft(false);

    onSaveDoctorReview(review);
  };

  // Call Gemini AI Co-Pilot
  const handleGenerateCopilotBriefing = async () => {
    if (!activeRecord) return;
    setIsGeneratingNotes(true);
    try {
      const response = await fetch('/api/gemini/clinical-notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patientCase: activeRecord,
          promptType: 'WHO HEARTS Decision Support Summary',
        }),
      });
      const data = await response.json();
      setCopilotNotes(data.notes);
    } catch (err) {
      console.error('Co-pilot error:', err);
    } finally {
      setIsGeneratingNotes(false);
    }
  };

  if (!activeRecord || !assessment) {
    return (
      <div className="bg-white rounded-2xl p-12 text-center border border-slate-200">
        <Stethoscope className="w-12 h-12 text-slate-300 mx-auto mb-3" />
        <h3 className="text-base font-bold text-slate-700">No Patient Assessments Available</h3>
        <p className="text-xs text-slate-500 mt-1">
          Complete a patient intake or select a 1-click test preset to view the clinical dossier.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* SUMMARY STATISTICS WIDGET: Patients Grouped by Triage Level */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {/* Total In Queue */}
        <button
          id="stat-all-cases"
          onClick={() => setTriageFilter('ALL')}
          className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
            triageFilter === 'ALL'
              ? 'bg-slate-900 text-white border-slate-900 shadow-md ring-2 ring-slate-400'
              : 'bg-white text-slate-800 border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className={`text-[10px] font-bold uppercase tracking-wider ${triageFilter === 'ALL' ? 'text-slate-400' : 'text-slate-500'}`}>
              Total Queue
            </span>
            <Layers className={`w-3.5 h-3.5 ${triageFilter === 'ALL' ? 'text-cyan-400' : 'text-slate-400'}`} />
          </div>
          <div className="text-xl font-black font-mono mt-1">{totalCount}</div>
          <span className={`text-[10px] block mt-0.5 ${triageFilter === 'ALL' ? 'text-slate-400' : 'text-slate-500'}`}>
            All Screened Patients
          </span>
        </button>

        {/* Emergency Level 1 */}
        <button
          id="stat-emergency-cases"
          onClick={() => setTriageFilter('LEVEL_1_EMERGENCY')}
          className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
            triageFilter === 'LEVEL_1_EMERGENCY'
              ? 'bg-red-600 text-white border-red-700 shadow-md ring-2 ring-red-300'
              : 'bg-red-50/70 text-red-950 border-red-200 hover:bg-red-100/70'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className={`text-[10px] font-bold uppercase tracking-wider ${triageFilter === 'LEVEL_1_EMERGENCY' ? 'text-red-200' : 'text-red-600'}`}>
              Level 1 Emergency
            </span>
            <AlertOctagon className={`w-3.5 h-3.5 ${triageFilter === 'LEVEL_1_EMERGENCY' ? 'text-white' : 'text-red-600'} animate-pulse`} />
          </div>
          <div className="text-xl font-black font-mono mt-1">{emergencyCount}</div>
          <span className={`text-[10px] block mt-0.5 ${triageFilter === 'LEVEL_1_EMERGENCY' ? 'text-red-200' : 'text-red-700 font-medium'}`}>
            {totalCount > 0 ? `${((emergencyCount / totalCount) * 100).toFixed(0)}% of Cohort` : '0%'} • Immediate
          </span>
        </button>

        {/* Urgent Level 2 */}
        <button
          id="stat-urgent-cases"
          onClick={() => setTriageFilter('LEVEL_2_URGENT')}
          className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
            triageFilter === 'LEVEL_2_URGENT'
              ? 'bg-orange-600 text-white border-orange-700 shadow-md ring-2 ring-orange-300'
              : 'bg-orange-50/70 text-orange-950 border-orange-200 hover:bg-orange-100/70'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className={`text-[10px] font-bold uppercase tracking-wider ${triageFilter === 'LEVEL_2_URGENT' ? 'text-orange-200' : 'text-orange-600'}`}>
              Level 2 Urgent
            </span>
            <AlertTriangle className={`w-3.5 h-3.5 ${triageFilter === 'LEVEL_2_URGENT' ? 'text-white' : 'text-orange-600'}`} />
          </div>
          <div className="text-xl font-black font-mono mt-1">{urgentCount}</div>
          <span className={`text-[10px] block mt-0.5 ${triageFilter === 'LEVEL_2_URGENT' ? 'text-orange-200' : 'text-orange-700 font-medium'}`}>
            {totalCount > 0 ? `${((urgentCount / totalCount) * 100).toFixed(0)}% of Cohort` : '0%'} • &lt; 2 Hrs
          </span>
        </button>

        {/* Priority Level 3 */}
        <button
          id="stat-priority-cases"
          onClick={() => setTriageFilter('LEVEL_3_PRIORITY')}
          className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer ${
            triageFilter === 'LEVEL_3_PRIORITY'
              ? 'bg-amber-600 text-white border-amber-700 shadow-md ring-2 ring-amber-300'
              : 'bg-amber-50/70 text-amber-950 border-amber-200 hover:bg-amber-100/70'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className={`text-[10px] font-bold uppercase tracking-wider ${triageFilter === 'LEVEL_3_PRIORITY' ? 'text-amber-200' : 'text-amber-700'}`}>
              Level 3 Priority
            </span>
            <TrendingUp className={`w-3.5 h-3.5 ${triageFilter === 'LEVEL_3_PRIORITY' ? 'text-white' : 'text-amber-600'}`} />
          </div>
          <div className="text-xl font-black font-mono mt-1">{priorityCount}</div>
          <span className={`text-[10px] block mt-0.5 ${triageFilter === 'LEVEL_3_PRIORITY' ? 'text-amber-200' : 'text-amber-700 font-medium'}`}>
            {totalCount > 0 ? `${((priorityCount / totalCount) * 100).toFixed(0)}% of Cohort` : '0%'} • Same Day
          </span>
        </button>

        {/* Routine / Low Risk */}
        <button
          id="stat-routine-cases"
          onClick={() => setTriageFilter('LEVEL_ROUTINE')}
          className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer col-span-2 sm:col-span-1 ${
            triageFilter === 'LEVEL_ROUTINE'
              ? 'bg-emerald-600 text-white border-emerald-700 shadow-md ring-2 ring-emerald-300'
              : 'bg-emerald-50/70 text-emerald-950 border-emerald-200 hover:bg-emerald-100/70'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className={`text-[10px] font-bold uppercase tracking-wider ${triageFilter === 'LEVEL_ROUTINE' ? 'text-emerald-200' : 'text-emerald-700'}`}>
              Routine / Low Risk
            </span>
            <CheckCircle className={`w-3.5 h-3.5 ${triageFilter === 'LEVEL_ROUTINE' ? 'text-white' : 'text-emerald-600'}`} />
          </div>
          <div className="text-xl font-black font-mono mt-1">{routineCount}</div>
          <span className={`text-[10px] block mt-0.5 ${triageFilter === 'LEVEL_ROUTINE' ? 'text-emerald-200' : 'text-emerald-700 font-medium'}`}>
            {totalCount > 0 ? `${((routineCount / totalCount) * 100).toFixed(0)}% of Cohort` : '0%'} • Primary Care
          </span>
        </button>
      </div>

      {/* MAIN CLINICAL INTERFACE: Left Queue (4 cols) & Right Dossier (8 cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* LEFT COLUMN: Triage Patient Inbox (4 cols) */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Activity className="w-4 h-4 text-cyan-600" />
                Clinical Triage Inbox
              </h3>
              <span className="text-[11px] font-mono font-bold text-cyan-800 bg-cyan-50 px-2 py-0.5 rounded border border-cyan-200">
                {filteredQueue.length} of {assessments.length}
              </span>
            </div>

            {/* Comprehensive Search Input Field (filters by name, patientId, MRN, district, triage level) */}
            <div className="relative mb-3">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                id="input-search-queue"
                type="text"
                placeholder="Filter by name, MRN, district, or triage level..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-7 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:outline-none bg-slate-50/50"
              />
              {searchQuery && (
                <button
                  id="btn-clear-search"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Triage Level Filter Chips */}
            <div className="flex flex-wrap gap-1 mb-3 text-[11px]">
              {[
                { key: 'ALL', label: 'All Cases' },
                { key: 'LEVEL_1_EMERGENCY', label: '🚨 Emergency' },
                { key: 'LEVEL_2_URGENT', label: '🔴 Urgent' },
                { key: 'LEVEL_3_PRIORITY', label: '🟠 Priority' },
                { key: 'LEVEL_ROUTINE', label: '🟢 Routine' },
              ].map((f) => (
                <button
                  key={f.key}
                  id={`filter-triage-${f.key}`}
                  onClick={() => setTriageFilter(f.key)}
                  className={`px-2 py-0.5 rounded-md font-semibold transition-all cursor-pointer ${
                    triageFilter === f.key
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>

            {/* Patient Cards List */}
            <div className="space-y-2 max-h-[620px] overflow-y-auto pr-1">
              {filteredQueue.length === 0 ? (
                <div className="p-6 text-center text-xs text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                  No patient assessments match "{searchQuery || triageFilter}".
                  <button
                    onClick={() => {
                      setSearchQuery('');
                      setTriageFilter('ALL');
                    }}
                    className="block mx-auto mt-2 text-cyan-600 font-bold hover:underline"
                  >
                    Reset Filters
                  </button>
                </div>
              ) : (
                filteredQueue.map((item) => {
                  const isSelected =
                    item.assessmentResult?.assessmentId === assessment.assessmentId;
                  const isEmerg =
                    item.assessmentResult?.isEmergency ||
                    item.assessmentResult?.triage.level === 'LEVEL_1_EMERGENCY';
                  const cvdRiskScore = (
                    (item.assessmentResult?.risks.cardiovascular.riskScore || 0) * 100
                  ).toFixed(0);

                  return (
                    <div
                      key={item.demographics.patientId}
                      id={`patient-card-${item.demographics.patientId}`}
                      onClick={() => handleSelectPatientWithBiometrics(item)}
                      className={`p-3 rounded-xl border transition-all cursor-pointer text-left ${
                        isSelected
                          ? 'bg-cyan-50/80 border-cyan-500 ring-2 ring-cyan-200 shadow-sm'
                          : isEmerg
                          ? 'bg-red-50/40 border-red-300 hover:bg-red-50'
                          : 'bg-slate-50/60 border-slate-200 hover:bg-slate-100/80'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-1 mb-1">
                        <div>
                          <h4 className="text-xs font-bold text-slate-900">
                            {item.demographics.fullName}
                          </h4>
                          <div className="text-[10px] text-slate-500">
                            {item.demographics.patientId} • {item.demographics.age}yo {item.demographics.sex} • {item.demographics.district}
                          </div>
                        </div>

                        <span
                          className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${
                            item.assessmentResult?.triage.level === 'LEVEL_1_EMERGENCY'
                              ? 'bg-red-600 text-white border-red-700 animate-pulse'
                              : item.assessmentResult?.triage.level === 'LEVEL_2_URGENT'
                              ? 'bg-orange-600 text-white border-orange-700'
                              : item.assessmentResult?.triage.level === 'LEVEL_3_PRIORITY'
                              ? 'bg-amber-500 text-white border-amber-600'
                              : 'bg-emerald-600 text-white border-emerald-700'
                          }`}
                        >
                          {item.assessmentResult?.triage.levelName.split(':')[1] || 'Priority'}
                        </span>
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-slate-600 mt-2 pt-1.5 border-t border-slate-200/60">
                        <span className="font-mono text-[10px] text-slate-400">
                          BP: {item.vitals.systolicBp || '?'}/{item.vitals.diastolicBp || '?'}
                        </span>
                        <span className="font-semibold text-cyan-800">
                          CVD Risk: {cvdRiskScore}%
                        </span>
                      </div>

                      {item.doctorReview && (
                        <div className="mt-1.5 flex items-center gap-1 text-[10px] font-bold text-emerald-700">
                          <CheckCircle className="w-3 h-3" />
                          Doctor Signed-Off ({item.doctorReview.aiAgreement})
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Comprehensive Patient Dossier & Decision Support (8 cols) */}
        <div className="lg:col-span-8 space-y-6">
          {/* Patient Dossier Header Card with Export PDF and Print Actions */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold text-base shadow-sm">
                  {activeRecord.demographics.fullName.charAt(0) || 'P'}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-bold text-slate-900">
                      {activeRecord.demographics.fullName}
                    </h2>
                    <span className="bg-slate-100 text-slate-600 text-[11px] font-mono font-bold px-2 py-0.5 rounded border border-slate-200">
                      {activeRecord.demographics.patientId}
                    </span>
                    {activeRecord.demographics.mrn && (
                      <span className="text-[11px] font-mono text-slate-400">
                        {activeRecord.demographics.mrn}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {activeRecord.demographics.age} Years • {activeRecord.demographics.sex} •{' '}
                    {activeRecord.demographics.district}, {activeRecord.demographics.province}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                {/* HIPAA Biometric Access Security Button */}
                {isRecordUnlocked ? (
                  <button
                    id="btn-lock-biometrics"
                    onClick={() => {
                      sessionStorage.removeItem('cds_biometric_unlocked');
                      setIsRecordUnlocked(false);
                    }}
                    className="px-3 py-1.5 rounded-lg bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs font-bold flex items-center gap-1.5 hover:bg-emerald-100 transition-all cursor-pointer"
                    title="HIPAA §164.312 Access Control Verified - Click to lock session"
                  >
                    <Fingerprint className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Biometrics Verified</span>
                    <Lock className="w-3 h-3 text-emerald-600 ml-0.5" />
                  </button>
                ) : (
                  <button
                    id="btn-authenticate-biometrics"
                    onClick={() => setIsBiometricModalOpen(true)}
                    className="px-3 py-1.5 rounded-lg bg-amber-50 border border-amber-300 text-amber-900 text-xs font-bold flex items-center gap-1.5 hover:bg-amber-100 transition-all cursor-pointer animate-pulse"
                    title="Simulated Biometric Authentication required for sensitive PHI"
                  >
                    <Scan className="w-3.5 h-3.5 text-amber-700" />
                    <span>Unlock Biometrics</span>
                  </button>
                )}

                {/* Standardized Clinical PDF Export Button */}
                <button
                  id="btn-export-pdf"
                  onClick={handleExportPdf}
                  disabled={isExportingPdf}
                  className="px-3.5 py-1.5 rounded-lg bg-cyan-700 hover:bg-cyan-800 text-white text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  title="Export full patient assessment record to standardized clinical PDF summary format"
                >
                  <Download className="w-3.5 h-3.5" />
                  {isExportingPdf ? 'Generating PDF...' : 'Export PDF Summary'}
                </button>

                <button
                  id="btn-print-report"
                  onClick={() => window.print()}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5 text-slate-500" />
                  Print Report
                </button>
              </div>
            </div>

            {/* Quick Physiological Strip */}
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2 mt-4 text-center">
              <div className="bg-slate-50 p-2 rounded-xl border border-slate-200">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Blood Pressure</span>
                <span className="text-xs font-bold font-mono text-slate-900">
                  {activeRecord.vitals.systolicBp || '?'}/{activeRecord.vitals.diastolicBp || '?'}
                </span>
                <span className="text-[9px] text-slate-500 block">mmHg</span>
              </div>

              <div className="bg-slate-50 p-2 rounded-xl border border-slate-200">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Heart Rate</span>
                <span className="text-xs font-bold font-mono text-slate-900">
                  {activeRecord.vitals.heartRate || '80'}
                </span>
                <span className="text-[9px] text-slate-500 block">bpm</span>
              </div>

              <div className="bg-slate-50 p-2 rounded-xl border border-slate-200">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">SpO₂</span>
                <span
                  className={`text-xs font-bold font-mono ${
                    (activeRecord.vitals.oxygenSaturation || 98) < 92 ? 'text-red-600' : 'text-slate-900'
                  }`}
                >
                  {activeRecord.vitals.oxygenSaturation || 98}%
                </span>
                <span className="text-[9px] text-slate-500 block">Room Air</span>
              </div>

              <div className="bg-slate-50 p-2 rounded-xl border border-slate-200">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Blood Glucose</span>
                <span className="text-xs font-bold font-mono text-slate-900">
                  {activeRecord.vitals.bloodGlucoseMgDl || activeRecord.labs.glucoseFastingMgDl || 'N/A'}
                </span>
                <span className="text-[9px] text-slate-500 block">mg/dL</span>
              </div>

              <div className="bg-slate-50 p-2 rounded-xl border border-slate-200">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">BMI</span>
                <span className="text-xs font-bold font-mono text-slate-900">
                  {activeRecord.profile.bmi.toFixed(1)}
                </span>
                <span className="text-[9px] text-slate-500 block">kg/m²</span>
              </div>

              <div className="bg-slate-50 p-2 rounded-xl border border-slate-200">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">HbA1c</span>
                <span className="text-xs font-bold font-mono text-slate-900">
                  {activeRecord.labs.hba1cPercent ? `${activeRecord.labs.hba1cPercent}%` : 'Unmeasured'}
                </span>
                <span className="text-[9px] text-slate-500 block">Glycemia</span>
              </div>
            </div>
          </div>

          {/* LONGITUDINAL PATIENT VITALS TREND OVER TIME DATA VISUALIZATION */}
          <PatientVitalsTrendChart
            currentRecord={activeRecord}
            allAssessments={assessments}
          />

          {/* PROMINENT RED FLAG ALERT BANNER (If Present) */}
          {assessment.redFlags.length > 0 && (
            <div className="bg-red-600 text-white rounded-2xl p-5 shadow-lg border-2 border-red-700 animate-pulse">
              <div className="flex items-start gap-3">
                <AlertOctagon className="w-8 h-8 text-white shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="bg-white text-red-700 text-[10px] font-black px-2 py-0.5 rounded tracking-wider uppercase">
                      Priority Safety Rule
                    </span>
                    <h3 className="text-base font-black tracking-tight text-white">
                      {assessment.redFlags[0].title}
                    </h3>
                  </div>
                  <p className="text-xs text-red-100 leading-relaxed font-medium">
                    {assessment.redFlags[0].description}
                  </p>
                  <div className="bg-red-950/80 p-3 rounded-xl border border-red-500/50 text-xs text-red-100 mt-2 font-mono">
                    <strong>Recommended Clinical Protocol:</strong> {assessment.redFlags[0].recommendedAction}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Multi-Condition AI Risk Assessment Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Cardiovascular Risk */}
            <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-bold text-slate-700 flex items-center gap-1">
                    <Heart className="w-3.5 h-3.5 text-rose-500" />
                    10-Yr CVD Risk
                  </span>
                  <span
                    className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                      assessment.risks.cardiovascular.riskCategory === 'HIGH' ||
                      assessment.risks.cardiovascular.riskCategory === 'URGENT'
                        ? 'bg-red-100 text-red-700'
                        : assessment.risks.cardiovascular.riskCategory === 'MODERATE'
                        ? 'bg-amber-100 text-amber-700'
                        : 'bg-emerald-100 text-emerald-700'
                    }`}
                  >
                    {assessment.risks.cardiovascular.riskCategory}
                  </span>
                </div>
                <div className="text-2xl font-black font-mono text-slate-900 mt-1">
                  {(assessment.risks.cardiovascular.riskScore * 100).toFixed(0)}%
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full mt-2 overflow-hidden">
                  <div
                    className="bg-rose-500 h-full rounded-full transition-all"
                    style={{
                      width: `${assessment.risks.cardiovascular.riskScore * 100}%`,
                    }}
                  ></div>
                </div>
              </div>
              <span className="text-[10px] text-slate-400 mt-3 block font-mono">
                Model: CVD-XGB-001 (HEARTS)
              </span>
            </div>

            {/* Hypertension Risk */}
            <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-bold text-slate-700 flex items-center gap-1">
                    <TrendingUp className="w-3.5 h-3.5 text-cyan-600" />
                    Hypertension Strain
                  </span>
                  <span
                    className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                      assessment.risks.hypertension.riskCategory === 'HIGH'
                        ? 'bg-red-100 text-red-700'
                        : assessment.risks.hypertension.riskCategory === 'MODERATE'
                        ? 'bg-amber-100 text-amber-700'
                        : 'bg-emerald-100 text-emerald-700'
                    }`}
                  >
                    {assessment.risks.hypertension.riskCategory}
                  </span>
                </div>
                <div className="text-2xl font-black font-mono text-slate-900 mt-1">
                  {(assessment.risks.hypertension.riskScore * 100).toFixed(0)}%
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full mt-2 overflow-hidden">
                  <div
                    className="bg-cyan-500 h-full rounded-full transition-all"
                    style={{
                      width: `${assessment.risks.hypertension.riskScore * 100}%`,
                    }}
                  ></div>
                </div>
              </div>
              <span className="text-[10px] text-slate-400 mt-3 block font-mono">
                WHO 2026 Compendium
              </span>
            </div>

            {/* Diabetes Risk */}
            <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-bold text-slate-700 flex items-center gap-1">
                    <Activity className="w-3.5 h-3.5 text-amber-500" />
                    T2DM Screening
                  </span>
                  <span
                    className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                      assessment.risks.diabetes.riskCategory === 'HIGH'
                        ? 'bg-red-100 text-red-700'
                        : assessment.risks.diabetes.riskCategory === 'MODERATE'
                        ? 'bg-amber-100 text-amber-700'
                        : 'bg-emerald-100 text-emerald-700'
                    }`}
                  >
                    {assessment.risks.diabetes.riskCategory}
                  </span>
                </div>
                <div className="text-2xl font-black font-mono text-slate-900 mt-1">
                  {(assessment.risks.diabetes.riskScore * 100).toFixed(0)}%
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full mt-2 overflow-hidden">
                  <div
                    className="bg-amber-500 h-full rounded-full transition-all"
                    style={{
                      width: `${assessment.risks.diabetes.riskScore * 100}%`,
                    }}
                  ></div>
                </div>
              </div>
              <span className="text-[10px] text-slate-400 mt-3 block font-mono">
                ADA ADA-XGB Screening
              </span>
            </div>

            {/* Respiratory Risk */}
            <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-bold text-slate-700 flex items-center gap-1">
                    <Stethoscope className="w-3.5 h-3.5 text-teal-600" />
                    Airway / COPD Risk
                  </span>
                  <span
                    className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                      assessment.risks.respiratory.riskCategory === 'HIGH'
                        ? 'bg-red-100 text-red-700'
                        : assessment.risks.respiratory.riskCategory === 'MODERATE'
                        ? 'bg-amber-100 text-amber-700'
                        : 'bg-emerald-100 text-emerald-700'
                    }`}
                  >
                    {assessment.risks.respiratory.riskCategory}
                  </span>
                </div>
                <div className="text-2xl font-black font-mono text-slate-900 mt-1">
                  {(assessment.risks.respiratory.riskScore * 100).toFixed(0)}%
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full mt-2 overflow-hidden">
                  <div
                    className="bg-teal-500 h-full rounded-full transition-all"
                    style={{
                      width: `${assessment.risks.respiratory.riskScore * 100}%`,
                    }}
                  ></div>
                </div>
              </div>
              <span className="text-[10px] text-slate-400 mt-3 block font-mono">
                GOLD / GINA Criteria
              </span>
            </div>
          </div>

          {/* SHAP EXPLAINABLE AI (XAI) FACTOR WATERFALL BREAKDOWN */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-cyan-600" />
                  SHAP Explainable AI: Major Contributing Risk Factors
                </h3>
                <p className="text-xs text-slate-500">
                  Transparent feature attribution showing why the AI calculated elevated cardiovascular risk.
                </p>
              </div>
              <span className="bg-cyan-50 text-cyan-800 text-[10px] font-bold px-2 py-1 rounded border border-cyan-200">
                FDA CDS 2026 Transparent
              </span>
            </div>

            <div className="space-y-2.5">
              {assessment.risks.cardiovascular.contributingFactors.map((f, idx) => (
                <div
                  key={idx}
                  className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900">{f.displayName}</span>
                      <span className="font-mono text-[11px] text-slate-500 bg-white px-1.5 py-0.2 rounded border border-slate-200">
                        {f.value}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-600">{f.clinicalRationale}</p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <div className="w-24 bg-slate-200 h-2 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          f.direction === 'RISK_INCREASE' ? 'bg-red-500' : 'bg-emerald-500'
                        }`}
                        style={{ width: `${Math.min(100, Math.abs(f.contributionPercent) * 3)}%` }}
                      ></div>
                    </div>
                    <span
                      className={`font-mono font-bold text-xs ${
                        f.direction === 'RISK_INCREASE' ? 'text-red-600' : 'text-emerald-600'
                      }`}
                    >
                      {f.direction === 'RISK_INCREASE' ? `+${f.contributionPercent}%` : `${f.contributionPercent}%`}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Data Completeness & Missing Information Card */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex items-start justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-800">
                  Data Completeness: {assessment.dataCompleteness.percentage}%
                </span>
                <span
                  className={`text-[10px] font-bold px-2 py-0.2 rounded ${
                    assessment.dataCompleteness.reliabilityGrade === 'EXCELLENT'
                      ? 'bg-emerald-100 text-emerald-800'
                      : assessment.dataCompleteness.reliabilityGrade === 'GOOD'
                      ? 'bg-cyan-100 text-cyan-800'
                      : 'bg-amber-100 text-amber-800'
                  }`}
                >
                  Reliability: {assessment.dataCompleteness.reliabilityGrade}
                </span>
              </div>
              <p className="text-xs text-slate-500">{assessment.dataCompleteness.guidance}</p>
            </div>
          </div>

          {/* Recommended Investigations Checklist */}
          <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-3">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
              <FileText className="w-4 h-4 text-cyan-600" />
              Recommended Diagnostic Investigations (WHO HEARTS Primary Care)
            </h3>
            <p className="text-xs text-slate-500">
              Check examinations to order during this clinical review:
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              {assessment.suggestedInvestigations.map((testName, i) => {
                const isChecked = orderedInvestigations.includes(testName);
                return (
                  <label
                    key={i}
                    className={`p-2.5 rounded-xl border flex items-center gap-2.5 transition-all cursor-pointer ${
                      isChecked
                        ? 'bg-cyan-50 border-cyan-400 text-cyan-950 font-semibold'
                        : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    <input
                      id={`order-test-${i}`}
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => toggleInvestigation(testName)}
                      className="w-4 h-4 text-cyan-600 rounded"
                    />
                    <span>{testName}</span>
                  </label>
                );
              })}
            </div>
          </div>

          {/* AI Co-Pilot Summary Generator (Gemini Integration) */}
          <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 rounded-2xl p-5 text-white border border-slate-700 shadow-md space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-cyan-400" />
                <h3 className="text-sm font-bold text-white">AI Clinical Decision Co-Pilot</h3>
              </div>
              <button
                id="btn-gemini-copilot"
                disabled={isGeneratingNotes}
                onClick={handleGenerateCopilotBriefing}
                className="px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {isGeneratingNotes ? (
                  <>
                    <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                    Synthesizing Guideline Briefing...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    Generate Case Briefing
                  </>
                )}
              </button>
            </div>

            {copilotNotes && (
              <div className="bg-slate-950/80 p-3.5 rounded-xl border border-slate-700/80 text-xs text-slate-200 whitespace-pre-line leading-relaxed font-sans">
                {copilotNotes}
              </div>
            )}
          </div>

          {/* CONTROLLED MEDICATION SAFETY CHECK & PHYSICIAN REVIEW SECTION WITH 30-SEC AUTO-SAVE */}
          <div className="bg-white rounded-2xl border-2 border-slate-300 p-6 shadow-md space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <Stethoscope className="w-5 h-5 text-cyan-700" />
                  <h3 className="text-base font-bold text-slate-900">
                    Attending Physician Review & Treatment Decisions
                  </h3>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  The qualified physician makes the final clinical diagnosis and signs off on guideline-directed therapy.
                </p>
              </div>

              {/* Auto-Save Status Indicator */}
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 bg-slate-100 text-slate-700 text-[11px] px-2.5 py-1 rounded-lg border border-slate-200 font-mono">
                  <Clock className="w-3 h-3 text-cyan-600 animate-spin" style={{ animationDuration: '6s' }} />
                  <span>
                    {lastAutoSavedTime ? `Draft saved ${lastAutoSavedTime}` : 'Auto-saves every 30s'}
                  </span>
                </div>
                {hasUnsavedDraft && (
                  <button
                    id="btn-clear-draft"
                    onClick={handleClearDraft}
                    className="text-[11px] text-slate-500 hover:text-red-600 font-semibold px-1.5 py-0.5 rounded cursor-pointer"
                    title="Clear saved local review draft"
                  >
                    Clear Draft
                  </button>
                )}
              </div>
            </div>

            {/* Clinician Identity Strip */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Reviewing Physician
                </label>
                <input
                  id="input-doc-name"
                  type="text"
                  value={doctorName}
                  onChange={(e) => setDoctorName(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-lg text-xs"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Medical License (PMDC)
                </label>
                <input
                  id="input-doc-license"
                  type="text"
                  value={doctorLicenseNo}
                  onChange={(e) => setDoctorLicenseNo(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-lg text-xs"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                  Clinical Facility
                </label>
                <input
                  id="input-facility"
                  type="text"
                  value={facility}
                  onChange={(e) => setFacility(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-lg text-xs"
                />
              </div>
            </div>

            {/* AI Agreement Toggle */}
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-2">
                Doctor Consensus on AI Stratification:
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { key: 'AGREE', label: '✓ Agree with AI Risk Level', color: 'bg-emerald-600 text-white' },
                  { key: 'MODIFY', label: '✎ Modify Stratification', color: 'bg-amber-600 text-white' },
                  { key: 'REJECT', label: '✕ Reject AI Recommendation', color: 'bg-rose-600 text-white' },
                ].map((opt) => (
                  <button
                    key={opt.key}
                    id={`btn-agree-${opt.key}`}
                    onClick={() => setAiAgreement(opt.key as DoctorAgreement)}
                    className={`py-2 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                      aiAgreement === opt.key
                        ? `${opt.color} shadow-md`
                        : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Doctor Diagnosis & Notes */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Doctor Final Clinical Diagnosis
                </label>
                <input
                  id="input-doctor-diagnosis"
                  type="text"
                  value={doctorDiagnosis}
                  onChange={(e) => setDoctorDiagnosis(e.target.value)}
                  placeholder="e.g. Essential Stage 2 Hypertension with Elevated CVD Risk"
                  className="w-full p-2.5 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Clinical Examination Notes & Directives
                </label>
                <input
                  id="input-doctor-notes"
                  type="text"
                  value={clinicalNotes}
                  onChange={(e) => setClinicalNotes(e.target.value)}
                  placeholder="e.g. Counseled on low salt diet, 150m walking, recheck BP in 2 weeks"
                  className="w-full p-2.5 text-xs border border-slate-300 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Controlled Medication Safety Check Layer */}
            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <Pill className="w-4 h-4 text-cyan-600" />
                  Controlled Medication Safety Support (WHO HEARTS Formulary)
                </h4>
                <span className="text-[10px] text-slate-500 font-mono">
                  Active Allergen & Drug-Drug Engine
                </span>
              </div>

              <div className="flex items-center gap-2">
                <select
                  id="select-candidate-drug"
                  value={selectedCandidateDrug}
                  onChange={(e) => setSelectedCandidateDrug(e.target.value)}
                  className="p-2 text-xs border border-slate-300 rounded-lg bg-white flex-1"
                >
                  {Object.keys(CONTROLLED_DRUG_DATABASE).map((drugKey) => (
                    <option key={drugKey} value={drugKey}>
                      {CONTROLLED_DRUG_DATABASE[drugKey].genericName} (
                      {CONTROLLED_DRUG_DATABASE[drugKey].drugClass})
                    </option>
                  ))}
                </select>

                <button
                  id="btn-safety-check-add"
                  onClick={handleAddMedication}
                  className="px-4 py-2 rounded-lg bg-slate-900 text-white hover:bg-slate-800 text-xs font-bold transition-all cursor-pointer shrink-0"
                >
                  Run Safety Check & Add
                </button>
              </div>

              {/* Prescribed Items with Safety Warnings */}
              {prescribedDrugs.length > 0 && (
                <div className="space-y-2 pt-2">
                  {prescribedDrugs.map((rx, idx) => (
                    <div
                      key={idx}
                      className={`p-2.5 rounded-lg border text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2 ${
                        rx.safetyChecksPassed
                          ? 'bg-emerald-50 border-emerald-300 text-emerald-950'
                          : 'bg-red-50 border-red-300 text-red-950'
                      }`}
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold">{rx.drugName}</span>
                          <span className="text-[10px] text-slate-600 bg-white px-1.5 py-0.2 rounded border border-slate-200">
                            {rx.dosage}
                          </span>
                        </div>
                        {rx.safetyNotes && (
                          <p className="text-[11px] mt-0.5 font-medium">{rx.safetyNotes}</p>
                        )}
                      </div>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded shrink-0 ${
                          rx.safetyChecksPassed
                            ? 'bg-emerald-200 text-emerald-900'
                            : 'bg-red-200 text-red-900'
                        }`}
                      >
                        {rx.safetyChecksPassed ? 'Safety Checked ✓' : 'Caution / Warning ⚠️'}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Submit Review Button */}
            <div className="pt-2 flex items-center justify-end gap-3">
              <button
                id="btn-save-doctor-review"
                onClick={handleSaveReview}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold text-xs shadow-md shadow-emerald-700/30 hover:from-emerald-700 hover:to-teal-700 flex items-center gap-2 cursor-pointer"
              >
                <CheckCircle className="w-4 h-4" />
                Save Official Physician Review & Sign-Off
              </button>
            </div>
          </div>

          {/* Regulatory & Clinical Disclaimer */}
          <div className="bg-slate-100 p-4 rounded-xl border border-slate-200 text-[11px] text-slate-600 leading-relaxed">
            <strong>Mandatory Regulatory Notice:</strong> {assessment.disclaimer}
          </div>
        </div>
      </div>

      {/* Simulated Biometric Authentication Overlay (Face ID, Touch ID, PIN) */}
      <BiometricAuthOverlay
        isOpen={isBiometricModalOpen}
        onClose={() => {
          setIsBiometricModalOpen(false);
          setPendingRecordToUnlock(null);
        }}
        onSuccess={() => {
          setIsRecordUnlocked(true);
          setIsBiometricModalOpen(false);
          if (pendingRecordToUnlock) {
            onSelectAssessment(pendingRecordToUnlock);
            setPendingRecordToUnlock(null);
          }
        }}
        doctorName={doctorName}
        doctorLicense={doctorLicenseNo}
      />
    </div>
  );
};

