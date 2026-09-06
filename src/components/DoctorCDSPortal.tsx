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
import {
  clinicalProfileSync,
  ClinicianProfile,
  HospitalFacility,
  PRESET_HOSPITALS,
  getAllRegisteredClinicians,
  findMatchingDoctor,
  findMatchingHospital,
  findHospitalForDoctor,
  findDoctorForHospital,
} from '../services/clinicalProfileSyncService';
import { DoctorHospitalSyncModal } from './DoctorHospitalSyncModal';
import { PatientVitalsTrendChart } from './PatientVitalsTrendChart';
import { BiometricAuthOverlay } from './BiometricAuthOverlay';
import { PatientMedicationHistory } from './PatientMedicationHistory';
import { ManualLabEntryPanel } from './ManualLabEntryPanel';
import { CompareAssessmentsView } from './CompareAssessmentsView';
import { WhoHeartsProtocolSidebar } from './WhoHeartsProtocolSidebar';
import { MedicationInteractionChecker } from './MedicationInteractionChecker';
import { MedicationCategoryBarChart } from './MedicationCategoryBarChart';
import { ErrorBoundary } from './ErrorBoundary';
import { CopyPatientIdButton } from './CopyPatientIdButton';
import { DifferentialDiagnosisAssistant } from './DifferentialDiagnosisAssistant';
import { ReEvaluationTimerBanner } from './ReEvaluationTimerBanner';
import { MyTaskQueueModal } from './MyTaskQueueModal';
import { ReferralShareModal } from './ReferralShareModal';
import { RapidClinicalDocumentationArea } from './RapidClinicalDocumentationArea';
import { DoctorSoapVoiceDictation } from './DoctorSoapVoiceDictation';
import { DoctorHistoricalVitalsRecharts } from './DoctorHistoricalVitalsRecharts';
import { DoctorLabSparklinesCard } from './DoctorLabSparklinesCard';
import { AITriageInsightsCard } from './AITriageInsightsCard';
import { ContextAwareQuickActions } from './ContextAwareQuickActions';
import { HospitalWardOccupancyTracker } from './HospitalWardOccupancyTracker';
import { VitalTrendsModal } from './VitalTrendsModal';
import { PrintPreviewModal } from './PrintPreviewModal';
import { QuickDischargeModal, DischargeSummaryData } from './QuickDischargeModal';
import { MedicationHistoryTimeline } from './MedicationHistoryTimeline';
import { LabResultsPanel } from './LabResultsPanel';
import { ReferralLetterModal } from './ReferralLetterModal';
import { PatientTriageRedFlagSummaryCard } from './PatientTriageRedFlagSummaryCard';
import { ShiftHandoverModal } from './ShiftHandoverModal';
import {
  LabAlertPreferencesModal,
  LabAlertThresholds,
  getStoredLabAlertThresholds,
  saveStoredLabAlertThresholds,
  checkPatientLabAlerts,
} from './LabAlertPreferencesModal';
import { ShapContributorDisplay } from './ShapContributorDisplay';
import { MedicationCalculator, CalculatedMedicationItem } from './MedicationCalculator';
import { FinalAssessmentInvoiceModal } from './FinalAssessmentInvoiceModal';
import { patientIndexedDb, PatientAutosaveRecord } from '../services/patientIndexedDbService';
import { motion, AnimatePresence } from 'motion/react';
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
  ArrowLeftRight,
  FlaskConical,
  Sliders,
  Wand2,
  PenTool,
  ArrowLeft,
  BookOpen,
  ListTodo,
  Share2,
  Bed,
  LineChart,
  Zap,
  Eye,
  LogOut,
  Ambulance,
  Radio,
  Receipt,
  Database,
  Save,
} from 'lucide-react';

interface DoctorCDSPortalProps {
  assessments: PatientAssessmentRecord[];
  selectedAssessment: PatientAssessmentRecord | null;
  onSelectAssessment: (record: PatientAssessmentRecord) => void;
  onSaveDoctorReview: (review: DoctorReview) => void;
  onNavigateTab?: (tab: string) => void;
  onUpdateAssessment?: (record: PatientAssessmentRecord) => void;
}

export const DoctorCDSPortal: React.FC<DoctorCDSPortalProps> = ({
  assessments,
  selectedAssessment,
  onSelectAssessment,
  onSaveDoctorReview,
  onNavigateTab,
  onUpdateAssessment,
}) => {
  const [triageFilter, setTriageFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [portalSubTab, setPortalSubTab] = useState<
    'DOSSIER' | 'TRENDS' | 'MEDICATIONS' | 'LABS' | 'COMPARE' | 'WARD_OCCUPANCY'
  >('DOSSIER');
  const [showWhoProtocolSidebar, setShowWhoProtocolSidebar] = useState<boolean>(true);
  const [showTaskQueueModal, setShowTaskQueueModal] = useState<boolean>(false);
  const [showReferralShareModal, setShowReferralShareModal] = useState<boolean>(false);
  const [showVitalTrendsModal, setShowVitalTrendsModal] = useState<boolean>(false);
  const [showPrintPreviewModal, setShowPrintPreviewModal] = useState<boolean>(false);
  const [showFinalInvoiceModal, setShowFinalInvoiceModal] = useState<boolean>(false);
  const [doctorProfessionalFee, setDoctorProfessionalFee] = useState<number>(1500);
  const [customSubsidyPkr, setCustomSubsidyPkr] = useState<number | undefined>(undefined);
  const [idbAutoSaveStatus, setIdbAutoSaveStatus] = useState<string | null>(null);
  const [hasIdbDraft, setHasIdbDraft] = useState<boolean>(false);
  const [showQuickDischargeModal, setShowQuickDischargeModal] = useState<boolean>(false);
  const [showReferralLetterModal, setShowReferralLetterModal] = useState<boolean>(false);
  const [showShiftHandoverModal, setShowShiftHandoverModal] = useState<boolean>(false);
  const [showLabAlertPreferencesModal, setShowLabAlertPreferencesModal] = useState<boolean>(false);
  const [labAlertThresholds, setLabAlertThresholds] = useState<LabAlertThresholds>(() => getStoredLabAlertThresholds());
  const [liveVitalsPulse, setLiveVitalsPulse] = useState<boolean>(false);
  const [vitalsPulseToast, setVitalsPulseToast] = useState<string | null>(null);
  const [quickTriageToast, setQuickTriageToast] = useState<string | null>(null);
  const [dischargeToast, setDischargeToast] = useState<string | null>(null);
  const [showCategoryChartInDossier, setShowCategoryChartInDossier] = useState<boolean>(true);

  // Doctor Review Form State & Synchronized Profile
  const [syncDoctor, setSyncDoctor] = useState<ClinicianProfile>(clinicalProfileSync.getActiveDoctor());
  const [syncHospital, setSyncHospital] = useState<HospitalFacility>(clinicalProfileSync.getActiveHospital());
  const [showSyncModal, setShowSyncModal] = useState<boolean>(false);

  const [doctorName, setDoctorName] = useState(syncDoctor.name);
  const [doctorLicenseNo, setDoctorLicenseNo] = useState(syncDoctor.licenseNo);
  const [facility, setFacility] = useState(syncHospital.name);
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

  // Apply WHO HEARTS Protocol into Doctor Review
  const handleApplyProtocolToReview = (
    protocolTitle: string,
    suggestedDiagnosis: string,
    treatmentPlan: string
  ) => {
    setDoctorDiagnosis((prev) => (prev ? `${prev} | ${suggestedDiagnosis}` : suggestedDiagnosis));
    setClinicalNotes((prev) =>
      prev
        ? `${prev}\n\n[WHO HEARTS ${protocolTitle} Plan]:\n${treatmentPlan}`
        : `[WHO HEARTS ${protocolTitle} Plan]:\n${treatmentPlan}`
    );
  };

  // Apply Alternative Drug recommended from DDI Checker
  const handleApplyAlternativeDrug = (drugName: string, dosage: string, rationale: string) => {
    setPrescribedDrugs((prev) => [
      ...prev.filter((p) => !p.drugName.toLowerCase().includes(drugName.toLowerCase())),
      {
        drugName,
        dosage,
        frequency: 'Once Daily',
        duration: '30 Days',
        safetyChecksPassed: true,
        safetyNotes: `Recommended alternative switch: ${rationale}`,
      },
    ]);
  };

  // Adopt ICD-10 Differential Diagnosis & Suggested Diagnostic Workup
  const handleAdoptDifferentialDiagnosis = (
    icd10Code: string,
    diagnosisName: string,
    rationale: string,
    suggestedWorkup: string[]
  ) => {
    const formattedDiag = `${diagnosisName} [ICD-10: ${icd10Code}]`;
    setDoctorDiagnosis(formattedDiag);

    // Append suggested workup items to ordered investigations if not already selected
    if (suggestedWorkup && suggestedWorkup.length > 0) {
      setOrderedInvestigations((prev) => {
        const set = new Set([...prev, ...suggestedWorkup]);
        return Array.from(set);
      });
    }

    // Append clinical rationale to SOAP notes
    setClinicalNotes((prev) => {
      const noteAddition = `\n[Differential Rationale - ${icd10Code}]: ${rationale}`;
      return prev ? `${prev}${noteAddition}` : noteAddition.trim();
    });
  };

  // Context-Aware Quick Actions Handlers
  const handleQuickOrderLabTest = (testName: string) => {
    setOrderedInvestigations((prev) => {
      if (prev.includes(testName)) return prev;
      return [...prev, testName];
    });
  };

  const handleQuickScheduleFollowUp = (timeframe: string, notes: string) => {
    setClinicalNotes((prev) => {
      const followUpEntry = `\n[Scheduled Follow-Up: ${timeframe}]: ${notes}`;
      return prev ? `${prev}${followUpEntry}` : followUpEntry.trim();
    });
  };

  const handleQuickOpenProtocol = (protocolName: string) => {
    setShowWhoProtocolSidebar(true);
  };

  const handleApplyHandoverToNotes = (handoverBrief: string) => {
    setClinicalNotes((prev) => {
      const header = `\n\n[SBAR Shift Handover Brief - ${new Date().toLocaleTimeString()}]:\n`;
      return prev ? `${prev}${header}${handoverBrief}` : `${header}${handoverBrief}`.trim();
    });
    setDischargeToast('Shift Handover SBAR brief copied to Clinical Notes.');
    setTimeout(() => setDischargeToast(null), 4000);
  };

  // Subscribe to profile synchronization
  useEffect(() => {
    const unsub = clinicalProfileSync.subscribe((doc, hosp) => {
      setSyncDoctor(doc);
      setSyncHospital(hosp);
      setDoctorName(doc.name);
      setDoctorLicenseNo(doc.licenseNo);
      setFacility(hosp.name);
    });
    return unsub;
  }, []);

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

  const safeBmi = (() => {
    if (!activeRecord) return 24.8;
    const { heightCm, weightKg } = activeRecord.vitals;
    if (heightCm && weightKg) {
      const hM = heightCm > 3 ? heightCm / 100 : heightCm;
      if (hM > 0.5 && hM < 2.5) {
        return Math.round((weightKg / (hM * hM)) * 10) / 10;
      }
    }
    return 24.8;
  })();

  // Live Pulse Telemetry Inflow Detection Effect
  const prevVitalsSigRef = useRef<string>('');
  useEffect(() => {
    if (!activeRecord) return;
    const currentSig = `${activeRecord.demographics.patientId}_${activeRecord.vitals.systolicBp}_${activeRecord.vitals.diastolicBp}_${activeRecord.vitals.heartRate}_${activeRecord.vitals.oxygenSaturation}_${activeRecord.vitals.bloodGlucoseMgDl}_${activeRecord.timestamp}`;

    if (prevVitalsSigRef.current && prevVitalsSigRef.current !== currentSig) {
      setLiveVitalsPulse(true);
      setVitalsPulseToast(
        `Live Telemetry Received: Vitals updated for ${activeRecord.demographics.fullName} (BP: ${activeRecord.vitals.systolicBp}/${activeRecord.vitals.diastolicBp}, HR: ${activeRecord.vitals.heartRate} bpm, SpO2: ${activeRecord.vitals.oxygenSaturation}%)`
      );
      const timer = setTimeout(() => {
        setLiveVitalsPulse(false);
      }, 5500);
      const toastTimer = setTimeout(() => {
        setVitalsPulseToast(null);
      }, 4000);
      return () => {
        clearTimeout(timer);
        clearTimeout(toastTimer);
      };
    }
    prevVitalsSigRef.current = currentSig;
  }, [
    activeRecord?.demographics.patientId,
    activeRecord?.vitals.systolicBp,
    activeRecord?.vitals.diastolicBp,
    activeRecord?.vitals.heartRate,
    activeRecord?.vitals.oxygenSaturation,
    activeRecord?.vitals.bloodGlucoseMgDl,
    activeRecord?.timestamp,
  ]);

  // Handler to simulate new telemetry vitals intake on demand
  const handleSimulateVitalsUpdate = () => {
    if (!activeRecord) return;
    const randomHR = Math.floor(72 + Math.random() * 22);
    const randomSBP = Math.floor(130 + Math.random() * 26);
    const randomDBP = Math.floor(80 + Math.random() * 16);
    const randomSpO2 = Math.floor(96 + Math.random() * 4);
    const randomBG = Math.floor(110 + Math.random() * 50);

    const updatedRecord: PatientAssessmentRecord = {
      ...activeRecord,
      timestamp: new Date().toISOString(),
      vitals: {
        ...activeRecord.vitals,
        systolicBp: randomSBP,
        diastolicBp: randomDBP,
        heartRate: randomHR,
        oxygenSaturation: randomSpO2,
        bloodGlucoseMgDl: randomBG,
      },
    };

    if (onUpdateAssessment) {
      onUpdateAssessment(updatedRecord);
    }
    setLiveVitalsPulse(true);
    setVitalsPulseToast(
      `New Vitals Telemetry Recorded for ${activeRecord.demographics.fullName}! BP: ${randomSBP}/${randomDBP} mmHg, HR: ${randomHR} bpm`
    );
    setTimeout(() => setLiveVitalsPulse(false), 5500);
    setTimeout(() => setVitalsPulseToast(null), 4000);
  };

  // Helper: Intelligent Baseline Template Generator from Patient Triage Data and Red Flags
  const generateBaselineTemplate = (rec: PatientAssessmentRecord) => {
    const sbp = rec.vitals.systolicBp || 135;
    const dbp = rec.vitals.diastolicBp || 85;
    const cvdRisk = rec.assessmentResult ? Math.round(rec.assessmentResult.risks.cardiovascular.riskScore * 100) : 18;
    const isEmergency = rec.assessmentResult?.isEmergency || rec.assessmentResult?.triage.level === 'LEVEL_1_EMERGENCY';
    const isUrgent = rec.assessmentResult?.triage.level === 'LEVEL_2_URGENT';
    const redFlagsText = rec.assessmentResult?.redFlags?.map((r) => r.title).join('; ') || 'No critical red-flag triggers';

    let diagnosis = '';
    if (sbp >= 180 || dbp >= 120) {
      diagnosis = `Hypertensive Urgency / Crisis with Severe SBP (${sbp}/${dbp} mmHg). Red Flag: ${redFlagsText}.`;
    } else if (sbp >= 140 || dbp >= 90) {
      diagnosis = `Essential Stage 2 Hypertension with ${cvdRisk}% 10-Yr CVD Risk (WHO HEARTS Grade II).`;
    } else if (sbp >= 130 || dbp >= 80) {
      diagnosis = `Stage 1 Systemic Hypertension with Moderate CVD Risk Profile (${cvdRisk}%).`;
    } else {
      diagnosis = `Optimal Hemodynamic State with ${cvdRisk}% 10-Yr Cardiovascular Risk Baseline.`;
    }

    if (rec.profile.diabetesHistory || (rec.labs.hba1cPercent && rec.labs.hba1cPercent >= 6.5)) {
      diagnosis += ` Concomitant Type 2 Diabetes Mellitus with Glycemic Target Optimization.`;
    }

    const baselineSoapNotes = `S: Evaluated at triage. ${rec.demographics.age}yo ${rec.demographics.sex}, ${rec.profile.smokingStatus !== 'NEVER' ? 'Smoker' : 'Non-smoker'}, HTN history: ${rec.profile.hypertensionHistory ? 'Yes' : 'No'}.\nO: BP: ${sbp}/${dbp} mmHg, HR: ${rec.vitals.heartRate || 80} bpm, SpO2: ${rec.vitals.oxygenSaturation || 98}%, BMI: ${rec.profile.bmi.toFixed(1)} kg/m². Red flags: ${redFlagsText}.\nA: ${diagnosis} Triage: ${rec.assessmentResult?.triage.levelName || 'Evaluated'}.\nP: Guideline-directed medical therapy. Low sodium diet (<2g/d), aerobic exercise (150m/wk), follow-up in ${isEmergency ? '48-72h' : isUrgent ? '1-2 weeks' : '4 weeks'}.`;

    const defaultInvestigations = rec.assessmentResult?.suggestedInvestigations || [
      '12-Lead Electrocardiogram (ECG)',
      'Fasting Lipid Profile (Total, HDL, LDL, Triglycerides)',
      'Serum Creatinine & Estimated GFR (eGFR)',
      'Glycated Hemoglobin (HbA1c)',
    ];

    const defaultMeds = [];
    if (sbp >= 140 || dbp >= 90) {
      defaultMeds.push({
        drugName: 'Amlodipine (Norvasc)',
        dosage: '5 mg OD',
        frequency: 'Once Daily (Morning)',
        duration: '30 Days',
        safetyChecksPassed: true,
        safetyNotes: 'First-line Calcium Channel Blocker (CCB) for Stage 2 HTN per WHO HEARTS.',
      });
      defaultMeds.push({
        drugName: 'Telmisartan (Micardis)',
        dosage: '40 mg OD',
        frequency: 'Once Daily (Morning)',
        duration: '30 Days',
        safetyChecksPassed: true,
        safetyNotes: 'Angiotensin II Receptor Blocker (ARB) with 24-hour hemodynamic control.',
      });
    }
    if (cvdRisk >= 20 || rec.profile.diabetesHistory) {
      defaultMeds.push({
        drugName: 'Atorvastatin (Lipitor)',
        dosage: '20 mg OD',
        frequency: 'Once Daily (Bedtime)',
        duration: '30 Days',
        safetyChecksPassed: true,
        safetyNotes: 'Moderate-to-high intensity statin for primary ASCVD risk reduction.',
      });
    }

    return {
      diagnosis,
      notes: baselineSoapNotes,
      investigations: defaultInvestigations,
      prescribedDrugs: defaultMeds,
    };
  };

  // Load existing Doctor Review, IndexedDB Draft, LocalStorage Draft, or Pre-fill Baseline Template
  useEffect(() => {
    if (!assessment || !activeRecord) return;

    let isMounted = true;

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
      if (rev.doctorProfessionalFee !== undefined) {
        setDoctorProfessionalFee(rev.doctorProfessionalFee);
      }
      setHasUnsavedDraft(false);
      setHasIdbDraft(false);
      setLastAutoSavedTime(null);
      setIdbAutoSaveStatus(null);
    } else {
      // Check IndexedDB draft first, keyed by patient name/ID
      patientIndexedDb
        .getPatientDraft(activeRecord.demographics.patientId, activeRecord.demographics.fullName)
        .then((idbRecord) => {
          if (!isMounted) return;
          if (idbRecord && idbRecord.reviewDraft) {
            const d = idbRecord.reviewDraft;
            if (d.doctorName) setDoctorName(d.doctorName);
            if (d.doctorLicenseNo) setDoctorLicenseNo(d.doctorLicenseNo);
            if (d.facility) setFacility(d.facility);
            if (d.aiAgreement) setAiAgreement(d.aiAgreement as DoctorAgreement);
            if (d.doctorDiagnosis) setDoctorDiagnosis(d.doctorDiagnosis);
            if (d.clinicalNotes) setClinicalNotes(d.clinicalNotes);
            if (d.orderedInvestigations) setOrderedInvestigations(d.orderedInvestigations);
            if (d.prescribedDrugs) setPrescribedDrugs(d.prescribedDrugs);
            if (d.doctorProfessionalFee !== undefined) setDoctorProfessionalFee(d.doctorProfessionalFee);
            setHasUnsavedDraft(true);
            setHasIdbDraft(true);
            setLastAutoSavedTime(idbRecord.lastSavedFormatted);
            setIdbAutoSaveStatus(`IndexedDB Active (${idbRecord.lastSavedFormatted})`);
          } else {
            // Check fallback localStorage
            const draftKey = `doctor_review_draft_${assessment.assessmentId}`;
            const savedDraft = localStorage.getItem(draftKey);
            if (savedDraft) {
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
                if (parsed.doctorProfessionalFee !== undefined) setDoctorProfessionalFee(parsed.doctorProfessionalFee);
                setHasUnsavedDraft(true);
                if (parsed.timestamp) {
                  const timeStr = new Date(parsed.timestamp).toLocaleTimeString();
                  setLastAutoSavedTime(timeStr);
                  setIdbAutoSaveStatus(`Draft restored (${timeStr})`);
                }
              } catch (e) {
                console.error('Failed to parse draft from localStorage', e);
              }
            } else {
              // Auto pre-fill the 'Doctor Review' fields based on existing triage data and red-flag alerts
              const template = generateBaselineTemplate(activeRecord);
              setAiAgreement('AGREE');
              setDoctorDiagnosis(template.diagnosis);
              setClinicalNotes(template.notes);
              setOrderedInvestigations(template.investigations);
              setPrescribedDrugs(template.prescribedDrugs);
              setDoctorProfessionalFee(1500);
              setHasUnsavedDraft(false);
              setHasIdbDraft(false);
              setLastAutoSavedTime(null);
              setIdbAutoSaveStatus(null);
            }
          }
        })
        .catch(() => {
          if (!isMounted) return;
          const template = generateBaselineTemplate(activeRecord);
          setAiAgreement('AGREE');
          setDoctorDiagnosis(template.diagnosis);
          setClinicalNotes(template.notes);
          setOrderedInvestigations(template.investigations);
          setPrescribedDrugs(template.prescribedDrugs);
          setHasUnsavedDraft(false);
        });
    }

    return () => {
      isMounted = false;
    };
  }, [assessment?.assessmentId, activeRecord?.doctorReview]);

  // Action: Explicitly apply / reset to baseline template
  const handleApplyBaselineTemplate = () => {
    if (!activeRecord) return;
    const template = generateBaselineTemplate(activeRecord);
    setAiAgreement('AGREE');
    setDoctorDiagnosis(template.diagnosis);
    setClinicalNotes(template.notes);
    setOrderedInvestigations(template.investigations);
    setPrescribedDrugs(template.prescribedDrugs);
  };

  // Automated Periodic Save Utility (Autosave) using IndexedDB: Runs every 20 seconds to persist patient records
  useEffect(() => {
    if (!assessment || !activeRecord) return;

    const autoSaveDraft = async () => {
      const draftData = {
        doctorName,
        doctorLicenseNo,
        facility,
        aiAgreement,
        doctorDiagnosis,
        clinicalNotes,
        orderedInvestigations,
        prescribedDrugs,
        doctorProfessionalFee,
      };

      try {
        const saved = await patientIndexedDb.savePatientDraft(activeRecord, draftData);
        setLastAutoSavedTime(saved.lastSavedFormatted);
        setIdbAutoSaveStatus(`IndexedDB Synced (${saved.lastSavedFormatted})`);
        setHasUnsavedDraft(true);
        setHasIdbDraft(true);
      } catch (err) {
        console.warn('IndexedDB auto-save error, mirrored to localStorage:', err);
      }

      // Always mirror to localStorage as second-tier redundancy
      try {
        const draftKey = `doctor_review_draft_${assessment.assessmentId}`;
        localStorage.setItem(
          draftKey,
          JSON.stringify({
            ...draftData,
            patientId: activeRecord.demographics.patientId,
            timestamp: Date.now(),
          })
        );
      } catch (e) {
        // ignore
      }
    };

    // 20-second automated interval timer
    const intervalId = setInterval(autoSaveDraft, 20000);

    return () => clearInterval(intervalId);
  }, [
    assessment?.assessmentId,
    activeRecord?.demographics.patientId,
    activeRecord?.demographics.fullName,
    doctorName,
    doctorLicenseNo,
    facility,
    aiAgreement,
    doctorDiagnosis,
    clinicalNotes,
    orderedInvestigations,
    prescribedDrugs,
    doctorProfessionalFee,
  ]);

  // Clear current draft
  const handleClearDraft = () => {
    if (!assessment || !activeRecord) return;
    const draftKey = `doctor_review_draft_${assessment.assessmentId}`;
    localStorage.removeItem(draftKey);
    patientIndexedDb.deletePatientDraft(activeRecord.demographics.patientId, activeRecord.demographics.fullName);
    setHasIdbDraft(false);
    setHasUnsavedDraft(false);
    setIdbAutoSaveStatus(null);
    setLastAutoSavedTime(null);
    const template = generateBaselineTemplate(activeRecord);
    setDoctorDiagnosis(template.diagnosis);
    setClinicalNotes(template.notes);
    setOrderedInvestigations(template.investigations);
    setPrescribedDrugs(template.prescribedDrugs);
    setDoctorProfessionalFee(1500);
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
      exportPatientAssessmentToPDF(activeRecord, {
        doctorOverride: {
          name: doctorName,
          licenseNo: doctorLicenseNo,
          specialty: syncDoctor.specialty,
          qualifications: syncDoctor.qualifications,
          signatureText: syncDoctor.signatureText || doctorName,
          signatureInkColor: syncDoctor.signatureInkColor,
          signatureFlourishFactor: syncDoctor.signatureFlourishFactor,
        },
        hospitalOverride: {
          name: facility,
          shortName: syncHospital.shortName,
          district: syncHospital.district,
          province: syncHospital.province,
          facilityCode: syncHospital.facilityCode,
          sealInitials: syncHospital.sealInitials,
        },
        selectedSections: {
          medicalBilling: true,
        },
        doctorFeePkr: doctorProfessionalFee,
      });
    } catch (err) {
      console.error('PDF export failed:', err);
    } finally {
      setIsExportingPdf(false);
    }
  };

  // Handle Quick Discharge Summary Generation & Record Update
  const handleConfirmQuickDischarge = (summary: DischargeSummaryData) => {
    if (!activeRecord) return;
    const dischargeReview: DoctorReview = {
      reviewId: summary.dischargeId,
      assessmentId: activeRecord.assessmentResult?.assessmentId || `REV-DISCHARGE-${Date.now()}`,
      doctorName: summary.attendingPhysician,
      doctorLicenseNo: summary.doctorLicenseNo,
      facility: summary.hospitalFacility,
      reviewTimestamp: summary.dischargeTimestamp,
      aiAgreement: 'AGREE',
      doctorDiagnosis: summary.dischargeDiagnosis,
      differentialDiagnoses: [
        'Atherosclerotic Cardiovascular Disease (ASCVD)',
        'Essential Systemic Hypertension',
      ],
      orderedInvestigations: orderedInvestigations,
      clinicalNotes: `[OFFICIAL CLINICAL DISCHARGE SUMMARY & DISPOSITION RECORD]\n` +
        `• Clinical Disposition: ${summary.dispositionLabel}\n` +
        `• Condition at Discharge: ${summary.conditionAtDischarge}\n` +
        `• Follow-up Plan: ${summary.followUpPlan}\n\n` +
        `[Patient Discharge Instructions]:\n${summary.instructions.map((ins, i) => `${i + 1}. ${ins}`).join('\n')}\n\n` +
        `[Emergency Red-Flag Return Precautions]:\n${summary.redFlagWarningPrecautions.map((w, i) => `${i + 1}. ${w}`).join('\n')}\n\n` +
        `[Lifestyle & Dietary Regimen]:\n${summary.dietAndLifestyleCounseling.map((c, i) => `${i + 1}. ${c}`).join('\n')}`,
      prescribedMedications: summary.prescribedDischargeMedications.map((m) => ({
        drugName: m.drugName,
        dosage: m.dosage,
        frequency: m.frequency,
        duration: m.duration,
        safetyChecksPassed: true,
      })),
      referralRequired: summary.disposition === 'SPECIALIST_TRANSFER',
      referralFacility: summary.disposition === 'SPECIALIST_TRANSFER' ? 'Tertiary Specialist Center' : undefined,
      whoHeartsGuidelineFollowed: true,
    };

    onSaveDoctorReview(dischargeReview);
    if (onUpdateAssessment) {
      onUpdateAssessment({
        ...activeRecord,
        doctorReview: dischargeReview,
      });
    }
    setDischargeToast(
      `Discharge summary generated successfully! ${activeRecord.demographics.fullName} set to: ${summary.dispositionLabel}.`
    );
    setTimeout(() => setDischargeToast(null), 6000);
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
      doctorProfessionalFee: doctorProfessionalFee,
      referralRequired: assessment.isEmergency || aiAgreement === 'REJECT',
      referralFacility: assessment.isEmergency ? 'Tertiary Cardiac Emergency Care Center' : undefined,
    };

    // Clean up local draft and IndexedDB draft upon final submission
    const draftKey = `doctor_review_draft_${assessment.assessmentId}`;
    localStorage.removeItem(draftKey);
    patientIndexedDb.deletePatientDraft(activeRecord.demographics.patientId, activeRecord.demographics.fullName);
    setHasUnsavedDraft(false);
    setHasIdbDraft(false);
    setIdbAutoSaveStatus(null);

    onSaveDoctorReview(review);
  };

  // Quick Triage Instant Update Handler
  const handleQuickTriage = (
    level: 'LEVEL_1_EMERGENCY' | 'LEVEL_2_URGENT' | 'LEVEL_3_PRIORITY' | 'LEVEL_4_ROUTINE' | 'LEVEL_5_LOW_RISK'
  ) => {
    if (!activeRecord) return;

    let levelName = 'Level 4 Routine Care';
    let isEmergency = false;
    let toastName = 'Routine Care';

    if (level === 'LEVEL_1_EMERGENCY') {
      levelName = 'Level 1 Emergency Resuscitation';
      isEmergency = true;
      toastName = 'Level 1 Emergency Resuscitation (Red Flag)';
    } else if (level === 'LEVEL_2_URGENT') {
      levelName = 'Level 2 Emergent / Urgent';
      toastName = 'Level 2 Urgent Care (<15 min)';
    } else if (level === 'LEVEL_3_PRIORITY') {
      levelName = 'Level 3 Acute Priority';
      toastName = 'Level 3 Priority Acute Care (<60 min)';
    } else if (level === 'LEVEL_4_ROUTINE') {
      levelName = 'Level 4 Routine Clinic Review';
      toastName = 'Level 4 Routine Clinic Review';
    } else if (level === 'LEVEL_5_LOW_RISK') {
      levelName = 'Level 5 Low Risk / Stable';
      toastName = 'Level 5 Low Risk / Stable';
    }

    const updatedResult = {
      ...activeRecord.assessmentResult,
      isEmergency,
      triage: {
        ...activeRecord.assessmentResult?.triage,
        level,
        levelName,
        maxWaitTimeMinutes:
          level === 'LEVEL_1_EMERGENCY' ? 0 : level === 'LEVEL_2_URGENT' ? 15 : level === 'LEVEL_3_PRIORITY' ? 60 : 120,
      },
    };

    const updatedRecord: PatientAssessmentRecord = {
      ...activeRecord,
      assessmentResult: updatedResult as any,
    };

    if (onUpdateAssessment) {
      onUpdateAssessment(updatedRecord);
    } else {
      onSelectAssessment(updatedRecord);
    }

    setQuickTriageToast(`Triage status updated to: ${toastName}`);
    setTimeout(() => setQuickTriageToast(null), 3500);
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
      {/* Top Portal Breadcrumb & Navigation Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-cyan-700 text-white flex items-center justify-center font-bold shadow-sm">
            <Stethoscope className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-sm font-bold text-slate-900">
                Doctor Decision Support & Clinical Review Portal
              </h2>
              <span className="text-[10px] bg-cyan-100 text-cyan-800 px-2 py-0.5 rounded font-mono font-bold">
                HIPAA Level 4 Protected
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-500 mt-0.5 flex-wrap">
              <span>
                Reviewing patient: <strong className="text-slate-800">{activeRecord.demographics.fullName}</strong>
              </span>
              <span className="font-mono text-slate-700 bg-slate-100 px-1.5 py-0.2 rounded border border-slate-200">
                {activeRecord.demographics.patientId}
              </span>
              <CopyPatientIdButton
                id="btn-copy-top-bar-pid"
                value={activeRecord.demographics.patientId}
                label="Copy"
                size="sm"
              />
              <span>• {activeRecord.demographics.district}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {onNavigateTab && (
            <button
              id="btn-portal-back-to-registry"
              onClick={() => onNavigateTab('REGISTRY')}
              className="px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 font-bold text-xs transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
              title="Return to Master Patient Electronic Health Record Directory"
            >
              <ArrowLeft className="w-3.5 h-3.5 text-slate-600" />
              <span>Back to Registry</span>
            </button>
          )}

          <button
            id="btn-toggle-who-protocols"
            onClick={() => setShowWhoProtocolSidebar((prev) => !prev)}
            className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs ${
              showWhoProtocolSidebar
                ? 'bg-rose-50 border-rose-200 text-rose-800'
                : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
            }`}
            title="Toggle WHO HEARTS Guideline Protocol Side Panel"
          >
            <BookOpen className="w-3.5 h-3.5 text-rose-600" />
            <span>{showWhoProtocolSidebar ? 'Hide HEARTS Protocols' : 'WHO HEARTS Protocols'}</span>
          </button>

          <button
            id="btn-sync-facility-top"
            onClick={() => setShowSyncModal(true)}
            className="px-3 py-1.5 rounded-xl border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 text-indigo-800 font-bold text-xs transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
            title="Update active doctor credentials or hospital facility"
          >
            <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
            <span>Facility Sync</span>
          </button>

          {/* Hospital Ward Bed Occupancy View Button */}
          <button
            id="btn-open-ward-occupancy"
            onClick={() => setPortalSubTab('WARD_OCCUPANCY')}
            className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs ${
              portalSubTab === 'WARD_OCCUPANCY'
                ? 'bg-purple-600 border-purple-700 text-white shadow-sm'
                : 'bg-purple-50 border-purple-200 text-purple-800 hover:bg-purple-100'
            }`}
            title="Open real-time hospital ward bed occupancy and visual layout tracker"
          >
            <Bed className="w-3.5 h-3.5" />
            <span>Ward Beds</span>
          </button>

          {/* Laboratory Alert Preferences Configuration Modal Trigger */}
          <button
            id="btn-open-lab-alert-preferences"
            onClick={() => setShowLabAlertPreferencesModal(true)}
            className="px-3 py-1.5 rounded-xl border border-amber-200 bg-amber-50 hover:bg-amber-100 text-amber-900 font-bold text-xs transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
            title="Configure which lab result thresholds trigger an immediate Urgent indicator badge"
          >
            <Sliders className="w-3.5 h-3.5 text-amber-600" />
            <span>Lab Alert Preferences</span>
          </button>

          {/* Clinician Active Task Queue Modal Trigger */}
          <button
            id="btn-open-task-queue"
            onClick={() => setShowTaskQueueModal(true)}
            className="px-3 py-1.5 rounded-xl border border-cyan-300 bg-gradient-to-r from-cyan-600 to-teal-600 hover:from-cyan-700 hover:to-teal-700 text-white font-bold text-xs transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
            title="Open comprehensive clinician task & action queue"
          >
            <ListTodo className="w-3.5 h-3.5" />
            <span>My Task Queue</span>
          </button>
        </div>
      </div>

      {/* TIMED RE-EVALUATION REMINDER ALERTS BANNER */}
      <ReEvaluationTimerBanner
        assessments={assessments}
        selectedAssessment={activeRecord}
        onSelectAssessment={onSelectAssessment}
      />

      {/* TOP SUMMARY CARD: CURRENT PATIENT TRIAGE URGENCY LEVEL & PRIMARY RED-FLAG RISKS */}
      {activeRecord && (
        <ErrorBoundary
          title="Patient Triage & Red-Flag Summary"
          description="Unable to load the current patient triage urgency summary."
        >
          <PatientTriageRedFlagSummaryCard
            record={activeRecord}
            onJumpToPrescriptions={() => setPortalSubTab('DOSSIER')}
            onJumpToLabs={() => setPortalSubTab('LABS')}
            onOpenReferral={() => setShowReferralLetterModal(true)}
          />
        </ErrorBoundary>
      )}

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
                          <div className="text-[10px] text-slate-500 flex items-center gap-1 flex-wrap">
                            <span className="font-mono">{item.demographics.patientId}</span>
                            <span>• {item.demographics.age}yo {item.demographics.sex} • {item.demographics.district}</span>
                          </div>
                        </div>

                        <div className="flex flex-col items-end gap-1">
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

                          {/* Immediate Urgent Lab Alert indicator badge triggered by doctor's preferences */}
                          {(() => {
                            const labAlert = checkPatientLabAlerts(item, labAlertThresholds);
                            if (!labAlert.hasUrgentAlert) return null;
                            return (
                              <span
                                className="text-[9px] font-black px-1.5 py-0.5 rounded bg-rose-600 text-white border border-rose-700 flex items-center gap-0.5 shadow-2xs animate-pulse tracking-wide"
                                title={`Urgent Lab Threshold Exceeded: ${labAlert.triggeredAlerts.join(', ')}`}
                              >
                                <AlertTriangle className="w-2.5 h-2.5 shrink-0" />
                                URGENT LAB
                              </span>
                            );
                          })()}
                        </div>
                      </div>

                      {/* Lab Alert Trigger Details Strip */}
                      {(() => {
                        const labAlert = checkPatientLabAlerts(item, labAlertThresholds);
                        if (!labAlert.hasUrgentAlert) return null;
                        return (
                          <div className="mt-1.5 px-2 py-1 rounded bg-rose-50 border border-rose-200 text-rose-800 text-[10px] font-medium flex items-center gap-1">
                            <FlaskConical className="w-3 h-3 text-rose-600 shrink-0" />
                            <span className="truncate">{labAlert.triggeredAlerts[0]}</span>
                          </div>
                        );
                      })()}

                      <div className="flex items-center justify-between text-[11px] text-slate-600 mt-2 pt-1.5 border-t border-slate-200/60">
                        <span className="font-mono text-[10px] text-slate-400">
                          BP: {item.vitals.systolicBp || '?'}/{item.vitals.diastolicBp || '?'}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-cyan-800">
                            CVD Risk: {cvdRiskScore}%
                          </span>
                        </div>
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
          {/* Patient Dossier Header Card with Live Pulse Indicator, Export PDF, Referral Letter and Print Actions */}
          <motion.div
            animate={
              liveVitalsPulse
                ? {
                    scale: [1, 1.008, 1],
                    boxShadow: [
                      '0 1px 3px 0 rgb(0 0 0 / 0.1)',
                      '0 0 25px 4px rgba(244, 63, 94, 0.35)',
                      '0 1px 3px 0 rgb(0 0 0 / 0.1)',
                    ],
                  }
                : {}
            }
            transition={{ duration: 1.2, repeat: liveVitalsPulse ? Infinity : 0 }}
            className={`bg-white rounded-2xl border p-5 shadow-sm transition-all duration-300 relative overflow-hidden ${
              liveVitalsPulse
                ? 'border-rose-400 ring-2 ring-rose-400/40 bg-gradient-to-b from-rose-50/20 to-white'
                : 'border-slate-200'
            }`}
          >
            {/* Live Pulse Dynamic Telemetry Banner */}
            <AnimatePresence>
              {liveVitalsPulse && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mb-3.5 -mt-1 py-1 px-3 bg-gradient-to-r from-rose-500 via-pink-500 to-rose-600 text-white rounded-xl flex items-center justify-between text-xs font-bold shadow-sm"
                >
                  <div className="flex items-center gap-2">
                    <span className="relative flex h-2.5 w-2.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-white"></span>
                    </span>
                    <Radio className="w-3.5 h-3.5 animate-pulse" />
                    <span>LIVE PULSE: New bedside vitals telemetry inflow detected & synced in real-time</span>
                  </div>
                  <span className="text-[10px] font-mono opacity-90">Auto-Refreshed</span>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <div
                    className={`w-12 h-12 rounded-xl text-white flex items-center justify-center font-bold text-base shadow-sm transition-colors ${
                      liveVitalsPulse ? 'bg-rose-600' : 'bg-slate-900'
                    }`}
                  >
                    {activeRecord.demographics.fullName.charAt(0) || 'P'}
                  </div>
                  {liveVitalsPulse && (
                    <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-rose-500 border-2 border-white"></span>
                    </span>
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="text-base font-bold text-slate-900">
                      {activeRecord.demographics.fullName}
                    </h2>
                    <span className="bg-slate-100 text-slate-700 text-[11px] font-mono font-bold px-2 py-0.5 rounded border border-slate-200 flex items-center gap-1">
                      <span>ID: {activeRecord.demographics.patientId}</span>
                      <CopyPatientIdButton
                        id="btn-copy-header-patient-id"
                        value={activeRecord.demographics.patientId}
                        label="Copy ID"
                        size="sm"
                      />
                    </span>
                    {activeRecord.demographics.mrn && (
                      <span className="bg-slate-100 text-slate-600 text-[11px] font-mono font-semibold px-2 py-0.5 rounded border border-slate-200 flex items-center gap-1">
                        <span>MRN: {activeRecord.demographics.mrn}</span>
                        <CopyPatientIdButton
                          id="btn-copy-header-mrn"
                          value={activeRecord.demographics.mrn}
                          label="Copy MRN"
                          size="sm"
                        />
                      </span>
                    )}
                    {liveVitalsPulse && (
                      <span className="bg-rose-100 text-rose-800 text-[10px] font-bold px-2 py-0.5 rounded-full border border-rose-300 flex items-center gap-1 animate-pulse">
                        <Activity className="w-3 h-3 text-rose-600" />
                        <span>Live Telemetry Active</span>
                      </span>
                    )}
                    {/* Active Patient Urgent Lab Alert Trigger Badge */}
                    {(() => {
                      const activeLabAlert = checkPatientLabAlerts(activeRecord, labAlertThresholds);
                      if (!activeLabAlert.hasUrgentAlert) return null;
                      return (
                        <button
                          type="button"
                          id="btn-active-patient-urgent-lab-badge"
                          onClick={() => setShowLabAlertPreferencesModal(true)}
                          className="bg-rose-600 hover:bg-rose-700 text-white text-[10px] font-black px-2.5 py-0.5 rounded-full border border-rose-700 flex items-center gap-1 shadow-sm animate-pulse cursor-pointer tracking-wider"
                          title={`Urgent Lab Alerts: ${(activeLabAlert.triggeredAlerts || []).join(' • ')}. Click to configure preferences.`}
                        >
                          <AlertTriangle className="w-3 h-3 text-white" />
                          <span>URGENT LAB ALERT ({(activeLabAlert.triggeredAlerts || []).length})</span>
                        </button>
                      );
                    })()}
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

                {/* Interactive Vital Trends Modal Trigger Button */}
                <button
                  id="btn-open-vital-trends-modal"
                  onClick={() => setShowVitalTrendsModal(true)}
                  className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-700 hover:to-pink-700 text-white text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
                  title="Open interactive longitudinal Vital Trends line chart modal using Recharts"
                >
                  <LineChart className="w-3.5 h-3.5" />
                  <span>Vital Trends</span>
                </button>

                {/* Generate Referral Letter Action Button */}
                <button
                  id="btn-generate-referral-letter"
                  onClick={() => setShowReferralLetterModal(true)}
                  className="px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
                  title="Automatically draft and configure a formal medical transfer and referral note"
                >
                  <Ambulance className="w-3.5 h-3.5" />
                  <span>Referral Letter</span>
                </button>

                {/* Secure Specialist Referral Share Button */}
                <button
                  id="btn-referral-share"
                  onClick={() => setShowReferralShareModal(true)}
                  className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-teal-600 to-cyan-600 hover:from-teal-700 hover:to-cyan-700 text-white text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
                  title="Generate secure, time-limited sharable link for consulting specialists"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span>Referral Share</span>
                </button>

                {/* Standardized Clinical PDF Export Button */}
                <button
                  id="btn-export-pdf"
                  onClick={handleExportPdf}
                  disabled={isExportingPdf}
                  className="px-3 py-1.5 rounded-lg bg-cyan-700 hover:bg-cyan-800 text-white text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  title="Export full patient assessment record to standardized clinical PDF summary format"
                >
                  <Download className="w-3.5 h-3.5" />
                  {isExportingPdf ? 'Generating PDF...' : 'Export PDF'}
                </button>

                {/* Print Preview Modal Button */}
                <button
                  id="btn-print-preview-modal-open"
                  onClick={() => setShowPrintPreviewModal(true)}
                  className="px-3 py-1.5 rounded-lg border border-cyan-300 bg-cyan-50 hover:bg-cyan-100 text-cyan-800 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs"
                  title="Visualize and configure formatted clinical report before printing or PDF export"
                >
                  <Eye className="w-3.5 h-3.5 text-cyan-700" />
                  <span>Print Preview</span>
                </button>

                <button
                  id="btn-print-report"
                  onClick={() => window.print()}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5 text-slate-500" />
                  Print
                </button>

                {/* Shift Handover Action Button */}
                <button
                  id="btn-shift-handover-cds"
                  onClick={() => setShowShiftHandoverModal(true)}
                  className="px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-violet-600 to-purple-600 hover:from-violet-700 hover:to-purple-700 text-white text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
                  title="Generate concise SBAR Patient Status Brief for oncoming shift handover with AI brief generator"
                >
                  <ListTodo className="w-3.5 h-3.5" />
                  <span>Shift Handover</span>
                </button>

                {/* Quick Clinical Discharge Button */}
                <button
                  id="btn-quick-discharge-cds"
                  onClick={() => setShowQuickDischargeModal(true)}
                  className="px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
                  title="Quick Clinical Discharge & Disposition Engine with automated summary generation"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Quick Discharge</span>
                </button>
              </div>
            </div>

            {/* Quick Physiological Strip with Telemetry Simulate Button */}
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2 mt-4 text-center">
              <div
                className={`p-2 rounded-xl border transition-colors ${
                  liveVitalsPulse ? 'bg-rose-50/50 border-rose-200' : 'bg-slate-50 border-slate-200'
                }`}
              >
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Blood Pressure</span>
                <span className="text-xs font-bold font-mono text-slate-900">
                  {activeRecord.vitals.systolicBp || '?'}/{activeRecord.vitals.diastolicBp || '?'}
                </span>
                <span className="text-[9px] text-slate-500 block">mmHg</span>
              </div>

              <div
                className={`p-2 rounded-xl border transition-colors ${
                  liveVitalsPulse ? 'bg-rose-50/50 border-rose-200' : 'bg-slate-50 border-slate-200'
                }`}
              >
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Heart Rate</span>
                <span className="text-xs font-bold font-mono text-slate-900 flex items-center justify-center gap-1">
                  <span>{activeRecord.vitals.heartRate || '80'}</span>
                  {liveVitalsPulse && <Heart className="w-3 h-3 text-rose-500 animate-ping inline" />}
                </span>
                <span className="text-[9px] text-slate-500 block">bpm</span>
              </div>

              <div
                className={`p-2 rounded-xl border transition-colors ${
                  liveVitalsPulse ? 'bg-rose-50/50 border-rose-200' : 'bg-slate-50 border-slate-200'
                }`}
              >
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

            {/* Quick Triage One-Click Status Update Bar */}
            <div className="mt-3.5 pt-3 border-t border-slate-200/70 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 bg-slate-50/70 p-3 rounded-2xl border border-slate-200/80">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-amber-100 text-amber-900 flex items-center justify-center font-bold shrink-0">
                  <Zap className="w-3.5 h-3.5 text-amber-700" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-slate-900">Quick Triage Outcome Override:</span>
                    <span className="text-[10px] font-mono bg-white px-2 py-0.2 rounded border border-slate-200 font-bold text-slate-700">
                      Current: {assessment.triage.levelName || assessment.triage.level}
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-500 block">
                    1-Click priority reclassification based on bedside reassessment.
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1.5 flex-wrap self-end sm:self-center">
                <button
                  id="btn-quick-triage-emergency"
                  onClick={() => handleQuickTriage('LEVEL_1_EMERGENCY')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border ${
                    assessment.triage.level === 'LEVEL_1_EMERGENCY'
                      ? 'bg-red-600 text-white border-red-700 shadow-sm ring-2 ring-red-300'
                      : 'bg-red-50 hover:bg-red-100/90 text-red-800 border-red-200'
                  }`}
                  title="Level 1 Emergency Resuscitation (0 min wait)"
                >
                  <AlertOctagon className="w-3.5 h-3.5" />
                  <span>Emergency</span>
                </button>

                <button
                  id="btn-quick-triage-urgent"
                  onClick={() => handleQuickTriage('LEVEL_2_URGENT')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border ${
                    assessment.triage.level === 'LEVEL_2_URGENT'
                      ? 'bg-orange-600 text-white border-orange-700 shadow-sm ring-2 ring-orange-300'
                      : 'bg-orange-50 hover:bg-orange-100/90 text-orange-800 border-orange-200'
                  }`}
                  title="Level 2 Urgent Care (<15 min wait)"
                >
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>Urgent</span>
                </button>

                <button
                  id="btn-quick-triage-priority"
                  onClick={() => handleQuickTriage('LEVEL_3_PRIORITY')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border ${
                    assessment.triage.level === 'LEVEL_3_PRIORITY'
                      ? 'bg-amber-600 text-white border-amber-700 shadow-sm ring-2 ring-amber-300'
                      : 'bg-amber-50 hover:bg-amber-100/90 text-amber-800 border-amber-200'
                  }`}
                  title="Level 3 Priority Acute Care (<60 min wait)"
                >
                  <Clock className="w-3.5 h-3.5" />
                  <span>Priority</span>
                </button>

                <button
                  id="btn-quick-triage-stable"
                  onClick={() => handleQuickTriage('LEVEL_4_ROUTINE')}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border ${
                    assessment.triage.level === 'LEVEL_4_ROUTINE' || assessment.triage.level === 'LEVEL_5_LOW_RISK'
                      ? 'bg-emerald-600 text-white border-emerald-700 shadow-sm ring-2 ring-emerald-300'
                      : 'bg-emerald-50 hover:bg-emerald-100/90 text-emerald-800 border-emerald-200'
                  }`}
                  title="Level 4/5 Stable Routine Consultation"
                >
                  <CheckCircle className="w-3.5 h-3.5" />
                  <span>Stable</span>
                </button>
              </div>
            </div>

            {/* Quick Triage Status Alert Feedback Toast */}
            {quickTriageToast && (
              <div className="mt-2 p-2.5 rounded-xl bg-emerald-900 text-emerald-100 text-xs font-bold flex items-center gap-2 border border-emerald-700 animate-in fade-in duration-200 shadow-sm">
                <CheckCircle className="w-4 h-4 text-emerald-300" />
                <span>{quickTriageToast}</span>
              </div>
            )}
          </motion.div>

          {/* Clinical Sub-Navigation Tabs */}
          <div className="bg-slate-100 p-1.5 rounded-2xl border border-slate-200 flex flex-wrap items-center gap-1.5">
            <button
              id="subtab-dossier"
              onClick={() => setPortalSubTab('DOSSIER')}
              className={`flex-1 min-w-[130px] py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                portalSubTab === 'DOSSIER'
                  ? 'bg-white text-slate-900 shadow-sm border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <FileText className={`w-4 h-4 ${portalSubTab === 'DOSSIER' ? 'text-cyan-600' : 'text-slate-400'}`} />
              <span>Clinical Dossier & CDS</span>
            </button>

            <button
              id="subtab-trends"
              onClick={() => setPortalSubTab('TRENDS')}
              className={`flex-1 min-w-[130px] py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                portalSubTab === 'TRENDS'
                  ? 'bg-white text-slate-900 shadow-sm border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <TrendingUp className={`w-4 h-4 ${portalSubTab === 'TRENDS' ? 'text-rose-600' : 'text-slate-400'}`} />
              <span>Vitals Trend Analytics</span>
            </button>

            <button
              id="subtab-medications"
              onClick={() => setPortalSubTab('MEDICATIONS')}
              className={`flex-1 min-w-[130px] py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                portalSubTab === 'MEDICATIONS'
                  ? 'bg-white text-slate-900 shadow-sm border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <Pill className={`w-4 h-4 ${portalSubTab === 'MEDICATIONS' ? 'text-indigo-600' : 'text-slate-400'}`} />
              <span>Medication History</span>
            </button>

            <button
              id="subtab-labs"
              onClick={() => setPortalSubTab('LABS')}
              className={`flex-1 min-w-[130px] py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                portalSubTab === 'LABS'
                  ? 'bg-white text-slate-900 shadow-sm border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <FlaskConical className={`w-4 h-4 ${portalSubTab === 'LABS' ? 'text-amber-600' : 'text-slate-400'}`} />
              <span>Diagnostic Labs</span>
            </button>

            <button
              id="subtab-compare"
              onClick={() => setPortalSubTab('COMPARE')}
              className={`flex-1 min-w-[130px] py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                portalSubTab === 'COMPARE'
                  ? 'bg-white text-slate-900 shadow-sm border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <ArrowLeftRight className={`w-4 h-4 ${portalSubTab === 'COMPARE' ? 'text-teal-600' : 'text-slate-400'}`} />
              <span>Compare Assessments</span>
            </button>

            <button
              id="subtab-ward-occupancy"
              onClick={() => setPortalSubTab('WARD_OCCUPANCY')}
              className={`flex-1 min-w-[130px] py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                portalSubTab === 'WARD_OCCUPANCY'
                  ? 'bg-white text-slate-900 shadow-sm border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <Bed className={`w-4 h-4 ${portalSubTab === 'WARD_OCCUPANCY' ? 'text-purple-600' : 'text-slate-400'}`} />
              <span>Ward Bed Occupancy</span>
            </button>

            <button
              id="subtab-final-invoice"
              type="button"
              onClick={() => setShowFinalInvoiceModal(true)}
              className="flex-1 min-w-[130px] py-2.5 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer bg-slate-900 text-cyan-300 hover:text-white hover:bg-slate-800 shadow-xs border border-slate-700"
              title="Open Unified Print-Ready Final Invoice merging fees, labs & pharmacy"
            >
              <Receipt className="w-4 h-4 text-cyan-400" />
              <span>Final Invoice & Bill</span>
            </button>
          </div>

          {/* TAB 0: HOSPITAL WARD BED OCCUPANCY TRACKER VIEW */}
          {portalSubTab === 'WARD_OCCUPANCY' && (
            <HospitalWardOccupancyTracker
              currentFacility={syncHospital}
              activeDoctor={syncDoctor}
              currentRecord={activeRecord}
              assessments={assessments}
              onSelectPatient={(patientId) => {
                const target = assessments.find((a) => a.demographics.patientId === patientId);
                if (target) {
                  onSelectAssessment(target);
                  setPortalSubTab('DOSSIER');
                }
              }}
              onBackToDossier={() => setPortalSubTab('DOSSIER')}
            />
          )}

          {/* TAB 1: DEDICATED LONGITUDINAL VITALS TREND & DETERIORATION VIEW */}
          {portalSubTab === 'TRENDS' && activeRecord && (
            <div className="space-y-6">
              <DoctorHistoricalVitalsRecharts
                currentRecord={activeRecord}
                allAssessments={assessments}
              />
              <ErrorBoundary
                title="Medication Trends Visualization Recovered"
                description="Unable to render medication frequency analytics. Clinical charting remains active."
              >
                <MedicationCategoryBarChart
                  currentRecord={activeRecord}
                  prescribedDrugs={prescribedDrugs}
                />
              </ErrorBoundary>
              <PatientVitalsTrendChart
                currentRecord={activeRecord}
                allAssessments={assessments}
                onBackToDossier={() => setPortalSubTab('DOSSIER')}
              />
            </div>
          )}

          {/* TAB 1: MEDICATION HISTORY & TIMELINE VIEW */}
          {portalSubTab === 'MEDICATIONS' && activeRecord && (
            <div className="space-y-6">
              <ErrorBoundary
                title="Medication Trends Dashboard Recovered"
                description="Unable to render medication frequency chart. Prescriptions timeline remains accessible."
              >
                <MedicationCategoryBarChart
                  currentRecord={activeRecord}
                  prescribedDrugs={prescribedDrugs}
                />
              </ErrorBoundary>
              <MedicationHistoryTimeline
                currentRecord={activeRecord}
                onBackToDossier={() => setPortalSubTab('DOSSIER')}
                onAddPrescription={(rx) => {
                  setPrescribedDrugs((prev) => [
                    ...prev,
                    {
                      drugName: rx.drugName,
                      dosage: rx.dosage,
                      frequency: rx.frequency,
                      duration: rx.duration,
                      safetyChecksPassed: true,
                      safetyNotes: `Prescribed via Timeline (${rx.indication || 'Maintenance Therapy'})`,
                    },
                  ]);
                }}
              />
            </div>
          )}

          {/* TAB 2: DIAGNOSTIC LABS & INTERACTIVE JSON LAB RESULTS PANEL VIEW */}
          {portalSubTab === 'LABS' && (
            <div className="space-y-6">
              <LabResultsPanel
                currentRecord={activeRecord}
                onBackToDossier={() => setPortalSubTab('DOSSIER')}
                onUpdateLabs={(updatedLabs) => {
                  if (activeRecord && onUpdateAssessment) {
                    onUpdateAssessment({
                      ...activeRecord,
                      labs: { ...activeRecord.labs, ...updatedLabs },
                    });
                  }
                }}
              />
              <DoctorLabSparklinesCard
                currentRecord={activeRecord}
                onOpenLabPanel={() => {}}
              />
              <ManualLabEntryPanel
                currentRecord={activeRecord}
                onBackToDossier={() => setPortalSubTab('DOSSIER')}
              />
            </div>
          )}

          {/* TAB 3: COMPARE ASSESSMENTS VIEW */}
          {portalSubTab === 'COMPARE' && (
            <CompareAssessmentsView
              currentRecord={activeRecord}
              allAssessments={assessments}
              onBackToDossier={() => setPortalSubTab('DOSSIER')}
            />
          )}

          {/* TAB 4: CLINICAL DOSSIER & CDS (DEFAULT) */}
          {portalSubTab === 'DOSSIER' && (
            <>
              {/* LONGITUDINAL PATIENT VITALS TREND OVER TIME (RECHARTS LINE CHART) */}
              <DoctorHistoricalVitalsRecharts
                currentRecord={activeRecord}
                allAssessments={assessments}
              />

              {/* LONGITUDINAL PATIENT VITALS TREND OVER TIME DATA VISUALIZATION */}
              <PatientVitalsTrendChart
                currentRecord={activeRecord}
                allAssessments={assessments}
              />

              {/* MINI-SPARKLINE CHARTS FOR LAB VALUE HISTORY (Creatinine, Potassium, eGFR, Glucose, HbA1c, LDL, Hb) */}
              <DoctorLabSparklinesCard
                currentRecord={activeRecord}
                onOpenLabPanel={() => setPortalSubTab('LABS')}
              />

              {/* AI TRIAGE INSIGHTS & NATURAL-LANGUAGE CLINICAL EXPLANATION SECTION */}
              <AITriageInsightsCard
                currentRecord={activeRecord}
                onAppendToNotes={(text) =>
                  setClinicalNotes((prev) => (prev ? `${prev}\n\n${text}` : text))
                }
                onAdoptDiagnosis={(diag) => {
                  setDoctorDiagnosis((prev) => (prev ? `${prev} | ${diag}` : diag));
                }}
              />

          {/* PROMINENT RED FLAG ALERT BANNER (If Present) */}
          {assessment?.redFlags && assessment.redFlags.length > 0 && (
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

          {/* SHAP EXPLAINABLE AI (XAI) FACTOR WATERFALL BREAKDOWN - RESPONSIVE GRID / FLEX-WRAP */}
          <ShapContributorDisplay
            contributingFactors={assessment.risks.cardiovascular.contributingFactors}
            safeBmi={safeBmi}
            className="shadow-sm"
          />

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

          {/* WHO HEARTS EVIDENCE-BASED CLINICAL PROTOCOLS & GUIDELINE ACCELERATOR */}
          {showWhoProtocolSidebar && (
            <div className="pt-1">
              <WhoHeartsProtocolSidebar
                currentRecord={activeRecord}
                onApplyProtocolToReview={handleApplyProtocolToReview}
                isCollapsible={true}
              />
            </div>
          )}

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

              {/* Auto-Save Status Indicator & Baseline Auto-Fill Button */}
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  id="btn-autofill-template"
                  onClick={handleApplyBaselineTemplate}
                  className="px-2.5 py-1 rounded-lg bg-cyan-50 border border-cyan-300 text-cyan-800 text-[11px] font-bold flex items-center gap-1 hover:bg-cyan-100 transition-all cursor-pointer"
                  title="Auto-fill diagnosis, SOAP notes, investigations, and prescriptions based on triage data and red flags"
                >
                  <Wand2 className="w-3 h-3 text-cyan-600" />
                  <span>Auto-Fill from Triage</span>
                </button>

                <div
                  className="flex items-center gap-1.5 bg-slate-100 text-slate-700 text-[11px] px-2.5 py-1 rounded-lg border border-slate-200 font-mono shadow-2xs"
                  title={`IndexedDB Auto-Save active for ${activeRecord?.demographics.fullName} (${activeRecord?.demographics.patientId})`}
                >
                  <Database className="w-3 h-3 text-emerald-600 shrink-0" />
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0"></span>
                  <span className="truncate max-w-[180px] sm:max-w-none">
                    {idbAutoSaveStatus || (lastAutoSavedTime ? `IndexedDB Synced (${lastAutoSavedTime})` : 'IndexedDB Autosave: 20s')}
                  </span>
                </div>

                {hasUnsavedDraft && (
                  <button
                    id="btn-clear-draft"
                    onClick={handleClearDraft}
                    className="text-[11px] text-slate-500 hover:text-red-600 font-semibold px-1.5 py-0.5 rounded cursor-pointer"
                    title="Clear saved draft from IndexedDB and storage"
                  >
                    Clear Draft
                  </button>
                )}
              </div>
            </div>

            {/* Clinician Identity Strip */}
            <div className="space-y-3 bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-1.5">
                  <Stethoscope className="w-4 h-4 text-cyan-700" />
                  <span className="text-xs font-bold text-slate-800">
                    Reviewing Clinician & Hospital Facility
                  </span>
                  <span className="text-[10px] bg-emerald-100 text-emerald-800 font-semibold px-2 py-0.5 rounded-full border border-emerald-300 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    Two-Way Auto-Sync Active
                  </span>
                </div>
                <button
                  type="button"
                  id="btn-open-doctor-hospital-sync-modal"
                  onClick={() => setShowSyncModal(true)}
                  className="px-2.5 py-1 rounded-lg bg-white border border-cyan-300 text-cyan-800 text-[11px] font-bold flex items-center gap-1 hover:bg-cyan-50 shadow-sm transition-all cursor-pointer"
                  title="Switch nationwide doctor profiles, hospitals, or edit signature details"
                >
                  <PenTool className="w-3 h-3 text-cyan-600" />
                  <span>Switch / Edit Profiles...</span>
                </button>
              </div>

              {/* Quick Selectors for Auto-Synchronization */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    👨‍⚕️ Select Doctor (Auto-Syncs Hospital):
                  </label>
                  <select
                    id="select-doctor-sync-quick"
                    value={getAllRegisteredClinicians().some((d) => d.name === doctorName || d.id === syncDoctor.id) ? (getAllRegisteredClinicians().find((d) => d.name === doctorName || d.id === syncDoctor.id)?.id || '') : ''}
                    onChange={(e) => {
                      const selectedDoc = getAllRegisteredClinicians().find((d) => d.id === e.target.value || d.name === e.target.value);
                      if (selectedDoc) {
                        clinicalProfileSync.setActiveDoctor(selectedDoc);
                      }
                    }}
                    className="w-full bg-white border border-slate-300 rounded-xl p-2 text-slate-800 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-cyan-500 cursor-pointer shadow-sm"
                  >
                    <option value="">-- Choose from {getAllRegisteredClinicians().length} Doctors --</option>
                    {getAllRegisteredClinicians().map((doc) => (
                      <option key={doc.id} value={doc.id}>
                        {doc.name} ({doc.licenseNo}) - {doc.specialty}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    🏥 Select Hospital (Auto-Syncs Doctor):
                  </label>
                  <select
                    id="select-hospital-sync-quick"
                    value={PRESET_HOSPITALS.some((h) => h.name === facility || h.shortName === syncHospital.shortName || h.id === syncHospital.id) ? (PRESET_HOSPITALS.find((h) => h.name === facility || h.shortName === syncHospital.shortName || h.id === syncHospital.id)?.id || '') : ''}
                    onChange={(e) => {
                      const selectedHosp = PRESET_HOSPITALS.find((h) => h.id === e.target.value || h.name === e.target.value);
                      if (selectedHosp) {
                        clinicalProfileSync.setActiveHospital(selectedHosp);
                      }
                    }}
                    className="w-full bg-white border border-slate-300 rounded-xl p-2 text-slate-800 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer shadow-sm"
                  >
                    <option value="">-- Choose from {PRESET_HOSPITALS.length} Hospitals --</option>
                    {PRESET_HOSPITALS.map((hosp) => (
                      <option key={hosp.id} value={hosp.id}>
                        {hosp.shortName} ({hosp.district}, {hosp.province})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Datalists for interactive input suggestions */}
              <datalist id="cds-doctor-name-list">
                {getAllRegisteredClinicians().map((doc) => (
                  <option key={doc.id} value={doc.name}>
                    {doc.specialty} • {doc.licenseNo}
                  </option>
                ))}
              </datalist>

              <datalist id="cds-hospital-name-list">
                {PRESET_HOSPITALS.map((hosp) => (
                  <option key={hosp.id} value={hosp.name}>
                    {hosp.shortName} • {hosp.district}, {hosp.province}
                  </option>
                ))}
              </datalist>

              {/* Editable Synchronized Text Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs pt-1 border-t border-slate-200">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Reviewing Physician
                  </label>
                  <input
                    id="input-doc-name"
                    type="text"
                    list="cds-doctor-name-list"
                    value={doctorName}
                    onChange={(e) => {
                      const val = e.target.value;
                      setDoctorName(val);
                      const match = findMatchingDoctor(val);
                      if (match) {
                        clinicalProfileSync.setActiveDoctor(match);
                      } else {
                        clinicalProfileSync.updateCustomDoctorDetails({ name: val });
                      }
                    }}
                    className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs font-medium focus:ring-2 focus:ring-cyan-500 focus:outline-none"
                    placeholder="Enter or select doctor name..."
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
                    onChange={(e) => {
                      const val = e.target.value;
                      setDoctorLicenseNo(val);
                      const match = findMatchingDoctor(val);
                      if (match) {
                        clinicalProfileSync.setActiveDoctor(match);
                      } else {
                        clinicalProfileSync.updateCustomDoctorDetails({ licenseNo: val });
                      }
                    }}
                    className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs font-mono focus:ring-2 focus:ring-cyan-500 focus:outline-none"
                    placeholder="e.g. 44520-P"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Clinical Facility
                  </label>
                  <input
                    id="input-facility"
                    type="text"
                    list="cds-hospital-name-list"
                    value={facility}
                    onChange={(e) => {
                      const val = e.target.value;
                      setFacility(val);
                      const match = findMatchingHospital(val);
                      if (match) {
                        clinicalProfileSync.setActiveHospital(match);
                      } else {
                        clinicalProfileSync.updateCustomHospitalDetails({ name: val });
                      }
                    }}
                    className="w-full p-2 bg-white border border-slate-300 rounded-lg text-xs font-medium focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                    placeholder="Enter or select hospital name..."
                  />
                </div>
              </div>

              {/* Linked Feedback Indicator */}
              <div className="flex items-center justify-between text-[11px] text-slate-600 bg-white/80 px-2.5 py-1.5 rounded-xl border border-slate-200">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="font-semibold text-slate-800">Linked:</span>
                  <span className="text-cyan-700 font-bold">{doctorName || syncDoctor.name}</span>
                  <span className="text-slate-400 font-mono">({doctorLicenseNo || syncDoctor.licenseNo})</span>
                  <span className="text-emerald-600 font-bold">⟷</span>
                  <span className="text-emerald-700 font-bold">{facility || syncHospital.name}</span>
                </div>
                <span className="text-[10px] text-slate-400 font-mono hidden md:inline">
                  {syncHospital.facilityCode}
                </span>
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

            {/* AI-ASSISTED DIFFERENTIAL DIAGNOSIS GENERATOR */}
            <div className="pt-2">
              <DifferentialDiagnosisAssistant
                currentRecord={activeRecord}
                onAdoptDiagnosis={handleAdoptDifferentialDiagnosis}
                onOrderWorkup={(workupList) => {
                  setOrderedInvestigations((prev) => {
                    const existing = new Set(prev);
                    (workupList || []).forEach((w) => existing.add(w));
                    return Array.from(existing);
                  });
                }}
              />
            </div>

            {/* Doctor Diagnosis & Notes */}
            <div className="space-y-4">
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

              {/* SPEECH-RECOGNITION SOAP CLINICAL NOTES DICTATION INTEGRATION */}
              <DoctorSoapVoiceDictation
                currentRecord={activeRecord}
                clinicalNotes={clinicalNotes}
                onChangeNotes={(notes) => setClinicalNotes(notes)}
                activeDoctor={syncDoctor}
              />

              {/* RAPID CLINICAL DOCUMENTATION AREA WITH SNIPPETS FOR PATIENT ROUNDS */}
              <RapidClinicalDocumentationArea
                currentRecord={activeRecord}
                clinicalNotes={clinicalNotes}
                onChangeNotes={(notes) => setClinicalNotes(notes)}
                activeDoctor={syncDoctor}
              />
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

              {/* Advanced Multi-Drug Interaction & Contraindication Engine */}
              {activeRecord && (
                <div className="pt-2">
                  <ErrorBoundary
                    title="Medication Safety Checker Intercept"
                    description="The medication interaction checker encountered an unexpected error. Prescriptions and fee calculations remain active."
                  >
                    <MedicationInteractionChecker
                      currentRecord={activeRecord}
                      newCandidateDrugs={[selectedCandidateDrug, ...(prescribedDrugs?.map((p) => p.drugName) || [])].filter(Boolean)}
                      onApplyAlternativeDrug={handleApplyAlternativeDrug}
                    />
                  </ErrorBoundary>
                </div>
              )}

              {/* Medication Frequency By Category Visualization Dashboard */}
              {activeRecord && (
                <div className="pt-3">
                  <div className="flex items-center justify-between pb-2">
                    <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                      <TrendingUp className="w-3.5 h-3.5 text-indigo-400" />
                      <span>Treatment Trend Barometer & Category Distribution</span>
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setPortalSubTab('MEDICATIONS')}
                        className="text-[11px] font-bold text-indigo-400 hover:text-indigo-300 cursor-pointer"
                      >
                        Open Full Timeline →
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowCategoryChartInDossier((prev) => !prev)}
                        className="text-[11px] text-slate-400 hover:text-white underline cursor-pointer"
                      >
                        {showCategoryChartInDossier ? 'Collapse Chart' : 'Show Chart'}
                      </button>
                    </div>
                  </div>

                  {showCategoryChartInDossier && (
                    <ErrorBoundary
                      title="Medication Category Trends Recovered"
                      description="Unable to render medication frequency visualization."
                    >
                      <MedicationCategoryBarChart
                        currentRecord={activeRecord}
                        prescribedDrugs={prescribedDrugs}
                      />
                    </ErrorBoundary>
                  )}
                </div>
              )}

              {/* Automated Medication Cost Calculator & Doctor Professional Fee Engine */}
              <MedicationCalculator
                prescribedDrugs={prescribedDrugs}
                doctorProfessionalFee={doctorProfessionalFee}
                onUpdateDoctorFee={(newFee) => setDoctorProfessionalFee(newFee)}
                onAddPrescribedDrug={(drugName, dosage) => {
                  setPrescribedDrugs((prev) => [
                    ...prev,
                    {
                      drugName,
                      dosage: dosage || 'Standard Adult Dose',
                      frequency: 'Once Daily',
                      duration: '30 days',
                      safetyChecksPassed: true,
                    },
                  ]);
                }}
                onRemovePrescribedDrug={(index) => {
                  setPrescribedDrugs((prev) => prev.filter((_, i) => i !== index));
                }}
                subsidyPkr={customSubsidyPkr}
                onUpdateSubsidy={(val) => setCustomSubsidyPkr(val)}
                className="mt-3"
              />
            </div>

            {/* Live Digital Signature & Hospital Verified Stamp Container */}
            <div className="bg-emerald-50/70 border border-emerald-300 rounded-2xl p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-950 flex items-center gap-1.5">
                  <CheckCircle className="w-4 h-4 text-emerald-600" />
                  Official Digital Signature & Hospital Verification Stamp (Section 5)
                </span>
                <span className="text-[10px] bg-emerald-100 text-emerald-800 font-mono px-2 py-0.5 rounded-full border border-emerald-300">
                  PMDC COMPLIANT
                </span>
              </div>

              <div className="bg-white border border-emerald-200 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
                <div className="space-y-1">
                  <div
                    className="font-serif italic text-xl font-semibold tracking-wide"
                    style={{ color: syncDoctor.signatureInkColor || '#1e3a8a' }}
                  >
                    {syncDoctor.signatureText || doctorName}
                  </div>
                  <div className="w-28 h-0.5 bg-blue-400/80 rounded-full"></div>
                  <div className="text-xs font-bold text-slate-800 pt-1">
                    {doctorName} ({syncDoctor.qualifications})
                  </div>
                  <div className="text-[10px] text-slate-600">
                    Reg: <strong className="font-mono text-slate-800">{doctorLicenseNo}</strong> • {syncDoctor.specialty}
                  </div>
                  <div className="text-[10px] text-slate-600">
                    Facility: <strong className="text-slate-800">{facility}</strong>
                  </div>
                </div>

                {/* Circular Official Seal */}
                <div className="w-16 h-16 rounded-full border-2 border-emerald-600 flex flex-col items-center justify-center p-1 text-center bg-emerald-50/50 shrink-0 self-end sm:self-center">
                  <span className="text-[9px] font-black text-emerald-800 leading-none">
                    {syncHospital.sealInitials || 'PMDC'}
                  </span>
                  <span className="text-[8px] font-bold text-emerald-600 leading-tight">SEAL</span>
                  <span className="text-[6px] text-emerald-700 uppercase tracking-tighter">VERIFIED</span>
                </div>
              </div>
            </div>

            {/* Submit & PDF Export Action Row */}
            <div className="pt-2 flex flex-wrap items-center justify-end gap-3">
              <button
                type="button"
                id="btn-open-final-invoice"
                onClick={() => setShowFinalInvoiceModal(true)}
                className="px-4 py-2.5 rounded-xl bg-cyan-700 hover:bg-cyan-800 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-all shadow-sm"
                title="View and print unified final invoice merging doctor fees, lab tests, and medication costs"
              >
                <Receipt className="w-4 h-4 text-cyan-200" />
                <span>Unified Final Invoice & Bill</span>
              </button>

              <button
                type="button"
                id="btn-export-pdf-portal"
                onClick={handleExportPdf}
                disabled={isExportingPdf}
                className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center gap-1.5 cursor-pointer transition-all shadow-sm"
                title="Export formal PDF assessment with active physician signature & hospital seal"
              >
                <Download className="w-4 h-4 text-cyan-400" />
                <span>{isExportingPdf ? 'Exporting PDF...' : 'Download Official PDF Report'}</span>
              </button>

              <button
                id="btn-save-doctor-review"
                onClick={handleSaveReview}
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold text-xs shadow-md shadow-emerald-700/30 hover:from-emerald-700 hover:to-teal-700 flex items-center gap-2 cursor-pointer transition-all"
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
            </>
          )}
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

      {/* Comprehensive Clinician & Hospital Synchronization Modal */}
      <DoctorHospitalSyncModal
        isOpen={showSyncModal}
        onClose={() => setShowSyncModal(false)}
      />

      {/* Clinician Task & Action Queue Modal */}
      <MyTaskQueueModal
        isOpen={showTaskQueueModal}
        onClose={() => setShowTaskQueueModal(false)}
        assessments={assessments}
        onSelectTaskPatient={(record, targetSubTab, targetMainTab) => {
          onSelectAssessment(record);
          if (targetSubTab) {
            setPortalSubTab(targetSubTab);
          }
          if (targetMainTab && onNavigateTab) {
            onNavigateTab(targetMainTab);
          }
        }}
      />

      {/* Secure Specialist Referral Share Modal */}
      <ReferralShareModal
        isOpen={showReferralShareModal}
        onClose={() => setShowReferralShareModal(false)}
        record={activeRecord}
        activeDoctor={syncDoctor}
        activeHospital={syncHospital}
      />

      {/* Interactive Longitudinal Vital Trends Recharts Modal */}
      {activeRecord && (
        <VitalTrendsModal
          isOpen={showVitalTrendsModal}
          onClose={() => setShowVitalTrendsModal(false)}
          patient={activeRecord}
        />
      )}

      {/* Context-Aware Quick Actions Floating Workflow Menu */}
      {activeRecord && (
        <ContextAwareQuickActions
          currentRecord={activeRecord}
          onOrderLabTest={handleQuickOrderLabTest}
          onScheduleFollowUp={handleQuickScheduleFollowUp}
          onOpenProtocol={handleQuickOpenProtocol}
          onApplyBaselinePlan={handleApplyBaselineTemplate}
          onExportPdf={handleExportPdf}
          onOpenReferralModal={() => setShowReferralShareModal(true)}
        />
      )}

      {/* Formatted Clinical Report Print Preview Modal */}
      {activeRecord && (
        <PrintPreviewModal
          isOpen={showPrintPreviewModal}
          onClose={() => setShowPrintPreviewModal(false)}
          record={activeRecord}
          assessments={assessments}
          onSelectRecord={(rec) => onSelectAssessment(rec)}
          activeDoctor={syncDoctor}
          activeHospital={syncHospital}
        />
      )}

      {/* Unified Final Assessment & Medical Billing Invoice Modal */}
      {activeRecord && (
        <FinalAssessmentInvoiceModal
          isOpen={showFinalInvoiceModal}
          onClose={() => setShowFinalInvoiceModal(false)}
          record={activeRecord}
          assessments={assessments}
          onSelectRecord={(rec) => onSelectAssessment(rec)}
          activeDoctor={syncDoctor}
          activeHospital={syncHospital}
          doctorProfessionalFee={doctorProfessionalFee}
          onUpdateDoctorFee={(fee) => setDoctorProfessionalFee(fee)}
          prescribedDrugs={prescribedDrugs}
          onSaveDoctorSignature={(svg) => {
            const currentDocReview = activeRecord.doctorReview;
            const updatedReview: DoctorReview = {
              reviewId: currentDocReview?.reviewId || `REV-${Date.now()}`,
              assessmentId: activeRecord.assessmentResult?.assessmentId || activeRecord.id,
              doctorName: currentDocReview?.doctorName || syncDoctor.name,
              doctorLicenseNo: currentDocReview?.doctorLicenseNo || syncDoctor.licenseNo,
              doctorSpecialty: currentDocReview?.doctorSpecialty || syncDoctor.specialty,
              facility: currentDocReview?.facility || syncHospital.name,
              reviewTimestamp: currentDocReview?.reviewTimestamp || new Date().toISOString(),
              aiAgreement: currentDocReview?.aiAgreement || 'AGREE',
              doctorDiagnosis:
                currentDocReview?.doctorDiagnosis ||
                activeRecord.assessmentResult?.triage.levelName ||
                'Confirmed Clinical Review',
              differentialDiagnoses:
                currentDocReview?.differentialDiagnoses || [
                  'Essential Systemic Hypertension',
                  'Cardiovascular Risk Tier II',
                ],
              orderedInvestigations:
                currentDocReview?.orderedInvestigations || orderedInvestigations || [],
              clinicalNotes:
                currentDocReview?.clinicalNotes ||
                'Reviewed and digitally signed via canvas signature pad.',
              prescribedMedications: prescribedDrugs,
              doctorProfessionalFee: doctorProfessionalFee,
              referralRequired: currentDocReview?.referralRequired ?? false,
              doctorSignatureSvg: svg,
              signatureTimestamp: new Date().toISOString(),
            };
            onSaveDoctorReview(updatedReview);
          }}
        />
      )}

      {/* Laboratory Alert Preferences Configuration Modal */}
      <LabAlertPreferencesModal
        isOpen={showLabAlertPreferencesModal}
        onClose={() => setShowLabAlertPreferencesModal(false)}
        onSave={(newThresholds) => {
          saveStoredLabAlertThresholds(newThresholds);
          setLabAlertThresholds(newThresholds);
        }}
        activeRecord={activeRecord}
      />

      {/* Quick Clinical Discharge & Disposition Modal */}
      {activeRecord && (
        <QuickDischargeModal
          isOpen={showQuickDischargeModal}
          onClose={() => setShowQuickDischargeModal(false)}
          record={activeRecord}
          activeDoctor={syncDoctor}
          activeHospital={syncHospital}
          onConfirmDischarge={handleConfirmQuickDischarge}
        />
      )}

      {/* Formal Medical Referral & Transfer Letter Modal */}
      {activeRecord && (
        <ReferralLetterModal
          isOpen={showReferralLetterModal}
          onClose={() => setShowReferralLetterModal(false)}
          record={activeRecord}
          activeDoctor={syncDoctor}
          activeHospital={syncHospital}
        />
      )}

      {/* Structured Shift Handover SBAR Status Brief Modal */}
      {activeRecord && (
        <ShiftHandoverModal
          isOpen={showShiftHandoverModal}
          onClose={() => setShowShiftHandoverModal(false)}
          currentRecord={activeRecord}
          activeDoctor={syncDoctor}
          onApplyToNotes={handleApplyHandoverToNotes}
        />
      )}

      {/* Live Vitals Telemetry Synced Pulse Toast */}
      {vitalsPulseToast && (
        <div
          id="toast-vitals-pulse-notification"
          className="fixed bottom-20 right-6 z-50 bg-rose-950 text-white px-5 py-3.5 rounded-2xl shadow-2xl border border-rose-500/60 flex items-center gap-3 text-xs max-w-md animate-fade-in"
        >
          <div className="p-1.5 bg-rose-500/30 text-rose-300 rounded-xl animate-pulse">
            <Radio className="w-4 h-4 text-rose-400" />
          </div>
          <span className="flex-1 font-medium text-rose-100">{vitalsPulseToast}</span>
        </div>
      )}

      {/* Discharge Confirmation Notification Toast */}
      {dischargeToast && (
        <div
          id="toast-discharge-notification"
          className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-5 py-3.5 rounded-2xl shadow-2xl border border-emerald-500/50 flex items-center gap-3 text-xs max-w-md animate-fade-in"
        >
          <div className="p-1.5 bg-emerald-500/20 text-emerald-400 rounded-xl">
            <CheckCircle className="w-4 h-4" />
          </div>
          <span className="flex-1 font-medium">{dischargeToast}</span>
        </div>
      )}
    </div>
  );
};

