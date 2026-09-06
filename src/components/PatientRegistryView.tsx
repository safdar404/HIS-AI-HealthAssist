import React, { useState, useRef } from 'react';
import {
  PatientAssessmentRecord,
  DoctorReview,
  TriageLevel,
} from '../types/clinical';
import {
  Users,
  Search,
  Plus,
  FileDown,
  FileUp,
  FileText,
  Eye,
  Edit,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Shield,
  Heart,
  Activity,
  Droplets,
  Share2,
  RefreshCw,
  X,
  Stethoscope,
  ChevronRight,
  Filter,
  TrendingUp,
  LineChart as LineChartIcon,
  ArrowLeftRight,
  Download,
  Upload,
  Copy,
  Check,
  Database,
  FileCode,
  CheckSquare,
  Square,
  MinusSquare,
  Loader2,
  ArrowLeft,
  SlidersHorizontal,
  Layers,
  Sparkles,
  Printer,
  Calendar,
  FlaskConical,
  AlertCircle,
  CalendarClock,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Pill,
  ShieldAlert,
} from 'lucide-react';
import {
  exportPatientAssessmentToPDF,
  exportBulkPatientAssessmentsToPDF,
} from '../utils/clinicalPdfExport';
import { exportAllToFHIRJSON, exportPatientsToCSV, parseFHIRBundleToRecords } from '../utils/fhirConverter';
import { VitalsSparkline } from './VitalsSparkline';
import { CopyPatientIdButton } from './CopyPatientIdButton';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend as RechartsLegend,
  ReferenceLine,
} from 'recharts';
import { VitalTrendsModal, generatePatientVitalTrends } from './VitalTrendsModal';
import { PatientAgeHistogram } from './PatientAgeHistogram';

export interface PatientRedFlagInfo {
  hasRedFlags: boolean;
  count: number;
  conditions: string[];
  primaryCondition: string;
  isEmergency: boolean;
}

export function getPatientRedFlagInfo(record: PatientAssessmentRecord): PatientRedFlagInfo {
  const conditions: string[] = [];

  const rfList = record.assessmentResult?.redFlags || [];
  rfList.forEach((rf) => {
    if (rf.title) conditions.push(rf.title);
    else if (rf.description) conditions.push(rf.description);
  });

  if (record.assessmentResult?.isEmergency && conditions.length === 0) {
    conditions.push('Emergency Triage Protocol');
  }

  const sbp = record.vitals.systolicBp || 0;
  const dbp = record.vitals.diastolicBp || 0;
  const spo2 = record.vitals.oxygenSaturation || 0;
  const hr = record.vitals.heartRate || 0;
  const glucose = record.vitals.bloodGlucoseMgDl || record.labs.glucoseFastingMgDl || 0;

  if (sbp >= 180 || dbp >= 120) {
    conditions.push(`Hypertensive Crisis (${sbp}/${dbp} mmHg)`);
  }
  if (spo2 > 0 && spo2 < 90) {
    conditions.push(`Severe Hypoxia (${spo2}%)`);
  }
  if (record.labs.troponinPositive) {
    conditions.push('Troponin Positive (Myocardial Injury)');
  }
  if (glucose >= 350) {
    conditions.push(`Severe Hyperglycemia (${glucose} mg/dL)`);
  } else if (glucose > 0 && glucose < 54) {
    conditions.push(`Critical Hypoglycemia (${glucose} mg/dL)`);
  }
  if (hr > 135 || (hr > 0 && hr < 45)) {
    conditions.push(`Critical Arrhythmia (${hr} bpm)`);
  }

  const unique = Array.from(new Set(conditions));
  const isEmerg =
    record.assessmentResult?.triage.level === 'LEVEL_1_EMERGENCY' ||
    record.assessmentResult?.isEmergency ||
    rfList.some((r) => r.urgency === 'EMERGENCY') ||
    sbp >= 180 ||
    (spo2 > 0 && spo2 < 90);

  return {
    hasRedFlags: unique.length > 0,
    count: unique.length,
    conditions: unique,
    primaryCondition: unique[0] || 'Clinical Red Flag',
    isEmergency: isEmerg,
  };
}

export interface PatientWorkloadAlert {
  type: 'FOLLOW_UP' | 'INCOMPLETE_LABS' | 'CRITICAL_VITALS';
  badgeText: string;
  tooltip: string;
  colorClasses: string;
  iconType: 'calendar' | 'flask' | 'alert';
}

export function getPatientWorkloadAlerts(record: PatientAssessmentRecord): PatientWorkloadAlert[] {
  const alerts: PatientWorkloadAlert[] = [];

  // Check upcoming follow-up appointments & priority intervals
  const triageLevel = record.assessmentResult?.triage.level;
  const hasReferral = !!record.doctorReview?.referralRequired;
  const orderedTestsCount = record.doctorReview?.orderedInvestigations?.length || 0;

  if (triageLevel === 'LEVEL_1_EMERGENCY' || record.assessmentResult?.isEmergency) {
    alerts.push({
      type: 'FOLLOW_UP',
      badgeText: 'Immediate Re-eval',
      tooltip: 'Level 1 Emergency — immediate physician bedside evaluation',
      colorClasses: 'bg-red-100 text-red-800 border-red-300 ring-1 ring-red-400 font-extrabold animate-pulse',
      iconType: 'alert',
    });
  } else if (triageLevel === 'LEVEL_2_URGENT') {
    alerts.push({
      type: 'FOLLOW_UP',
      badgeText: 'Follow-Up Due (24-48h)',
      tooltip: 'Urgent Level 2 — re-evaluation scheduled within 24-48 hours',
      colorClasses: 'bg-orange-100 text-orange-800 border-orange-300 font-bold',
      iconType: 'calendar',
    });
  } else if (hasReferral) {
    alerts.push({
      type: 'FOLLOW_UP',
      badgeText: 'Referral Follow-up',
      tooltip: `Specialist referral pending to: ${record.doctorReview?.referralFacility || 'Tertiary Center'}`,
      colorClasses: 'bg-indigo-100 text-indigo-800 border-indigo-300 font-bold',
      iconType: 'calendar',
    });
  } else if (triageLevel === 'LEVEL_3_PRIORITY') {
    alerts.push({
      type: 'FOLLOW_UP',
      badgeText: 'Follow-Up (7 Days)',
      tooltip: 'Level 3 Priority — clinic visit scheduled within 7 days',
      colorClasses: 'bg-amber-100 text-amber-800 border-amber-300 font-semibold',
      iconType: 'calendar',
    });
  }

  // Check incomplete laboratory results
  const missingLabs: string[] = [];
  if (!record.labs.creatinineMgDl && !record.labs.egfr) {
    missingLabs.push('Creatinine/eGFR');
  }
  if (
    !record.labs.glucoseFastingMgDl &&
    !record.labs.hba1cPercent &&
    (record.profile.diabetesHistory || (record.vitals.bloodGlucoseMgDl || 0) >= 140)
  ) {
    missingLabs.push('HbA1c/Fasting Glucose');
  }
  if (
    !record.labs.totalCholesterolMgDl &&
    !record.labs.ldlCholesterolMgDl &&
    (record.profile.hypertensionHistory || (record.assessmentResult?.risks.cardiovascular.riskScore || 0) >= 0.1)
  ) {
    missingLabs.push('Lipids');
  }

  if (orderedTestsCount > 0) {
    alerts.push({
      type: 'INCOMPLETE_LABS',
      badgeText: `${orderedTestsCount} Lab${orderedTestsCount > 1 ? 's' : ''} Ordered / Pending`,
      tooltip: `Doctor ordered: ${record.doctorReview?.orderedInvestigations.join(', ')}`,
      colorClasses: 'bg-purple-100 text-purple-800 border-purple-300 font-bold',
      iconType: 'flask',
    });
  } else if (missingLabs.length > 0) {
    alerts.push({
      type: 'INCOMPLETE_LABS',
      badgeText: `Incomplete Labs (${missingLabs.length})`,
      tooltip: `Awaiting diagnostic parameters: ${missingLabs.join(', ')}`,
      colorClasses: 'bg-yellow-100 text-yellow-800 border-yellow-300 font-semibold',
      iconType: 'flask',
    });
  }

  return alerts;
}

interface PatientRegistryViewProps {
  assessments: PatientAssessmentRecord[];
  onSelectAssessment: (record: PatientAssessmentRecord) => void;
  onOpenIntake: () => void;
  onDeletePatient: (patientId: string) => void;
  onUpdatePatient: (record: PatientAssessmentRecord) => void;
  onImportRecords: (newRecords: PatientAssessmentRecord[], replaceAll?: boolean) => void;
}

export const PatientRegistryView: React.FC<PatientRegistryViewProps> = ({
  assessments,
  onSelectAssessment,
  onOpenIntake,
  onDeletePatient,
  onUpdatePatient,
  onImportRecords,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [triageFilter, setTriageFilter] = useState<string>('ALL');
  const [districtFilter, setDistrictFilter] = useState<string>('ALL');
  const [sparklineMetric, setSparklineMetric] = useState<'SBP' | 'HR' | 'GLUCOSE'>('SBP');
  const [viewingRecord, setViewingRecord] = useState<PatientAssessmentRecord | null>(null);
  const [editingRecord, setEditingRecord] = useState<PatientAssessmentRecord | null>(null);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importJsonText, setImportJsonText] = useState('');
  const [importError, setImportError] = useState<string | null>(null);

  // Advanced Filter Options & Flags
  const [showAdvancedFilters, setShowAdvancedFilters] = useState<boolean>(false);
  const [emergencyOnly, setEmergencyOnly] = useState<boolean>(false);
  const [dischargeStatusFilter, setDischargeStatusFilter] = useState<'ALL' | 'IN_CLINIC' | 'DISCHARGED' | 'REFERRED' | 'ADMITTED'>('ALL');
  const [highRiskCategoryFilter, setHighRiskCategoryFilter] = useState<'ALL' | 'HIGH_CVD' | 'HIGH_DIABETES' | 'STAGE_2_HTN' | 'ANY_HIGH'>('ALL');
  const [ageGroupFilter, setAgeGroupFilter] = useState<'ALL' | 'UNDER_40' | '40_65' | 'OVER_65'>('ALL');
  const [bpCategoryFilter, setBpCategoryFilter] = useState<'ALL' | 'NORMAL' | 'ELEVATED' | 'STAGE_1_HTN' | 'STAGE_2_HTN'>('ALL');
  const [ageRangeFilter, setAgeRangeFilter] = useState<{ label: string; minAge: number; maxAge: number } | null>(null);

  // Multi-Patient Selection & Bulk Export State
  const [selectedPatientIds, setSelectedPatientIds] = useState<Set<string>>(new Set());
  const [isBulkExportingPdf, setIsBulkExportingPdf] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkIncludeCoverPage, setBulkIncludeCoverPage] = useState(true);
  const [bulkBatchTitle, setBulkBatchTitle] = useState('HIS MASTER PATIENT REGISTRY — BATCH CLINICAL SUMMARY');
  const [bulkToastMsg, setBulkToastMsg] = useState<string | null>(null);

  // Sync Data Terminal Modal State
  const [showSyncModal, setShowSyncModal] = useState(false);
  const [syncTab, setSyncTab] = useState<'EXPORT' | 'IMPORT'>('EXPORT');
  const [syncMergeStrategy, setSyncMergeStrategy] = useState<'MERGE' | 'APPEND' | 'REPLACE'>('MERGE');
  const [syncJsonText, setSyncJsonText] = useState('');
  const [syncParsedPreview, setSyncParsedPreview] = useState<PatientAssessmentRecord[] | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [syncSuccessMsg, setSyncSuccessMsg] = useState<string | null>(null);
  const [copiedSyncJson, setCopiedSyncJson] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Longitudinal Vital Trends Modal & In-Line Recharts State
  const [showTrendsModal, setShowTrendsModal] = useState(false);
  const [selectedTrendPatient, setSelectedTrendPatient] = useState<PatientAssessmentRecord | null>(null);
  const [expandedTrendPatientId, setExpandedTrendPatientId] = useState<string | null>(null);

  // Compute Registry Statistics
  const totalCount = assessments.length;
  const redFlagCount = assessments.filter((a) => getPatientRedFlagInfo(a).hasRedFlags).length;
  const emergencyCount = assessments.filter(
    (a) =>
      a.assessmentResult?.triage.level === 'LEVEL_1_EMERGENCY' ||
      a.assessmentResult?.isEmergency
  ).length;
  const urgentCount = assessments.filter(
    (a) => a.assessmentResult?.triage.level === 'LEVEL_2_URGENT'
  ).length;
  const priorityCount = assessments.filter(
    (a) => a.assessmentResult?.triage.level === 'LEVEL_3_PRIORITY'
  ).length;
  const routineCount = assessments.filter(
    (a) => a.assessmentResult?.triage.level === 'LEVEL_4_ROUTINE'
  ).length;
  const lowRiskCount = assessments.filter(
    (a) => a.assessmentResult?.triage.level === 'LEVEL_5_LOW_RISK'
  ).length;
  const uncontrolledHtnCount = assessments.filter(
    (a) => (a.vitals.systolicBp || 0) >= 140 || (a.vitals.diastolicBp || 0) >= 90
  ).length;
  const reviewedCount = assessments.filter((a) => a.doctorReview).length;

  // Compute Workload Alert Counts
  const followUpDueCount = assessments.filter((a) =>
    getPatientWorkloadAlerts(a).some((al) => al.type === 'FOLLOW_UP')
  ).length;

  const incompleteLabsCount = assessments.filter((a) =>
    getPatientWorkloadAlerts(a).some((al) => al.type === 'INCOMPLETE_LABS')
  ).length;

  // Distinct districts for filtering
  const districts = Array.from(new Set(assessments.map((a) => a.demographics.district))).sort();

  // Column Sorting State & Configuration
  type SortField = 'NAME' | 'DATE' | 'TRIAGE' | 'AGE' | 'RISK' | 'BP';
  type SortDirection = 'asc' | 'desc';

  const [sortField, setSortField] = useState<SortField>('TRIAGE');
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      if (field === 'NAME') {
        setSortDirection('asc');
      } else {
        setSortDirection('desc'); // High triage, latest date, highest risk, highest BP first
      }
    }
  };

  const getTriageScore = (r: PatientAssessmentRecord): number => {
    if (r.assessmentResult?.isEmergency || r.assessmentResult?.triage.level === 'LEVEL_1_EMERGENCY') return 5;
    const lvl = r.assessmentResult?.triage.level;
    if (lvl === 'LEVEL_2_URGENT') return 4;
    if (lvl === 'LEVEL_3_PRIORITY') return 3;
    if (lvl === 'LEVEL_4_ROUTINE') return 2;
    if (lvl === 'LEVEL_5_LOW_RISK') return 1;
    return 0;
  };

  // Count Active Advanced Filters
  const activeFiltersCount =
    (searchTerm ? 1 : 0) +
    (triageFilter !== 'ALL' ? 1 : 0) +
    (districtFilter !== 'ALL' ? 1 : 0) +
    (emergencyOnly ? 1 : 0) +
    (dischargeStatusFilter !== 'ALL' ? 1 : 0) +
    (highRiskCategoryFilter !== 'ALL' ? 1 : 0) +
    (ageGroupFilter !== 'ALL' ? 1 : 0) +
    (bpCategoryFilter !== 'ALL' ? 1 : 0);

  const handleResetAllFilters = () => {
    setSearchTerm('');
    setTriageFilter('ALL');
    setDistrictFilter('ALL');
    setEmergencyOnly(false);
    setDischargeStatusFilter('ALL');
    setHighRiskCategoryFilter('ALL');
    setAgeGroupFilter('ALL');
    setBpCategoryFilter('ALL');
    setAgeRangeFilter(null);
  };

  // Filtered & Sorted Roster
  const rawFilteredPatients = assessments.filter((r) => {
    // 1. Search Query
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch =
      !searchTerm ||
      r.demographics.fullName.toLowerCase().includes(searchLower) ||
      r.demographics.patientId.toLowerCase().includes(searchLower) ||
      (r.demographics.mrn && r.demographics.mrn.toLowerCase().includes(searchLower)) ||
      r.demographics.district.toLowerCase().includes(searchLower) ||
      (r.doctorReview?.doctorDiagnosis && r.doctorReview.doctorDiagnosis.toLowerCase().includes(searchLower)) ||
      (r.symptoms && r.symptoms.some((s) => s.name.toLowerCase().includes(searchLower)));

    // 2. Triage & Workload Alert filters
    const alerts = getPatientWorkloadAlerts(r);
    const isLevel1 = r.assessmentResult?.triage.level === 'LEVEL_1_EMERGENCY' || r.assessmentResult?.isEmergency;
    const redFlagInfo = getPatientRedFlagInfo(r);
    const matchesTriage =
      triageFilter === 'ALL' ||
      (triageFilter === 'LEVEL_1_EMERGENCY' && isLevel1) ||
      (triageFilter === 'RED_FLAGS' && redFlagInfo.hasRedFlags) ||
      r.assessmentResult?.triage.level === triageFilter ||
      (triageFilter === 'REVIEWED' && !!r.doctorReview) ||
      (triageFilter === 'PENDING' && !r.doctorReview) ||
      (triageFilter === 'FOLLOW_UP_DUE' && alerts.some((al) => al.type === 'FOLLOW_UP')) ||
      (triageFilter === 'INCOMPLETE_LABS' && alerts.some((al) => al.type === 'INCOMPLETE_LABS'));

    // 3. Emergency Only Filter
    const isEmergency = r.assessmentResult?.triage.level === 'LEVEL_1_EMERGENCY' || r.assessmentResult?.isEmergency;
    const matchesEmergency = !emergencyOnly || isEmergency;

    // 4. Discharge / Disposition Status Filter
    const disposition = r.doctorReview?.referralRequired
      ? 'REFERRED'
      : isEmergency
      ? 'ADMITTED'
      : r.doctorReview
      ? 'DISCHARGED'
      : 'IN_CLINIC';
    const matchesDischargeStatus = dischargeStatusFilter === 'ALL' || disposition === dischargeStatusFilter;

    // 5. High Risk Category Filter
    const cvdScore = r.assessmentResult?.risks.cardiovascular.riskScore || 0;
    const isHighCvd = cvdScore >= 0.20 || r.assessmentResult?.risks.cardiovascular.riskCategory === 'HIGH' || r.assessmentResult?.risks.cardiovascular.riskCategory === 'URGENT';
    const isHighDiabetes = r.assessmentResult?.risks.diabetes.riskCategory === 'HIGH' || (r.labs.hba1cPercent || 0) >= 8.5 || (r.vitals.bloodGlucoseMgDl || 0) >= 200;
    const isStage2Htn = (r.vitals.systolicBp || 0) >= 160 || (r.vitals.diastolicBp || 0) >= 100;
    const isAnyHigh = isHighCvd || isHighDiabetes || isStage2Htn || isEmergency || r.assessmentResult?.triage.level === 'LEVEL_2_URGENT';

    let matchesHighRisk = true;
    if (highRiskCategoryFilter === 'HIGH_CVD') matchesHighRisk = isHighCvd;
    else if (highRiskCategoryFilter === 'HIGH_DIABETES') matchesHighRisk = isHighDiabetes;
    else if (highRiskCategoryFilter === 'STAGE_2_HTN') matchesHighRisk = isStage2Htn;
    else if (highRiskCategoryFilter === 'ANY_HIGH') matchesHighRisk = isAnyHigh;

    // 6. District Filter
    const matchesDistrict = districtFilter === 'ALL' || r.demographics.district === districtFilter;

    // 7. Age Group Filter
    let matchesAge = true;
    if (ageGroupFilter === 'UNDER_40') matchesAge = r.demographics.age < 40;
    else if (ageGroupFilter === '40_65') matchesAge = r.demographics.age >= 40 && r.demographics.age <= 65;
    else if (ageGroupFilter === 'OVER_65') matchesAge = r.demographics.age > 65;

    if (ageRangeFilter) {
      matchesAge = matchesAge && r.demographics.age >= ageRangeFilter.minAge && r.demographics.age <= ageRangeFilter.maxAge;
    }

    // 8. Blood Pressure Category Filter
    const sbp = r.vitals.systolicBp || 0;
    const dbp = r.vitals.diastolicBp || 0;
    let matchesBp = true;
    if (bpCategoryFilter === 'NORMAL') matchesBp = sbp < 120 && dbp < 80;
    else if (bpCategoryFilter === 'ELEVATED') matchesBp = sbp >= 120 && sbp < 140 && dbp < 90;
    else if (bpCategoryFilter === 'STAGE_1_HTN') matchesBp = (sbp >= 140 && sbp < 160) || (dbp >= 90 && dbp < 100);
    else if (bpCategoryFilter === 'STAGE_2_HTN') matchesBp = sbp >= 160 || dbp >= 100;

    return (
      matchesSearch &&
      matchesTriage &&
      matchesEmergency &&
      matchesDischargeStatus &&
      matchesHighRisk &&
      matchesDistrict &&
      matchesAge &&
      matchesBp
    );
  });

  const filteredPatients = [...rawFilteredPatients].sort((a, b) => {
    let diff = 0;
    if (sortField === 'NAME') {
      diff = a.demographics.fullName.localeCompare(b.demographics.fullName);
    } else if (sortField === 'DATE') {
      const timeA = new Date(a.assessmentResult?.timestamp || a.vitals.measurementTime || 0).getTime();
      const timeB = new Date(b.assessmentResult?.timestamp || b.vitals.measurementTime || 0).getTime();
      diff = timeA - timeB;
    } else if (sortField === 'TRIAGE') {
      diff = getTriageScore(a) - getTriageScore(b);
    } else if (sortField === 'AGE') {
      diff = a.demographics.age - b.demographics.age;
    } else if (sortField === 'RISK') {
      const riskA = a.assessmentResult?.risks.cardiovascular.riskScore || 0;
      const riskB = b.assessmentResult?.risks.cardiovascular.riskScore || 0;
      diff = riskA - riskB;
    } else if (sortField === 'BP') {
      const bpA = a.vitals.systolicBp || 0;
      const bpB = b.vitals.systolicBp || 0;
      diff = bpA - bpB;
    }

    return sortDirection === 'asc' ? diff : -diff;
  });

  // Multi-Selection Helper Functions
  const handleToggleSelect = (patientId: string) => {
    setSelectedPatientIds((prev) => {
      const next = new Set(prev);
      if (next.has(patientId)) next.delete(patientId);
      else next.add(patientId);
      return next;
    });
  };

  const handleSelectAllFiltered = () => {
    if (selectedPatientIds.size === filteredPatients.length && filteredPatients.length > 0) {
      setSelectedPatientIds(new Set());
    } else {
      setSelectedPatientIds(new Set(filteredPatients.map((p) => p.demographics.patientId)));
    }
  };

  const handleSelectEmergencyAndUrgent = () => {
    const matching = assessments.filter(
      (a) =>
        a.assessmentResult?.triage.level === 'LEVEL_1_EMERGENCY' ||
        a.assessmentResult?.triage.level === 'LEVEL_2_URGENT' ||
        a.assessmentResult?.isEmergency
    );
    setSelectedPatientIds(new Set(matching.map((m) => m.demographics.patientId)));
    setBulkToastMsg(`Selected ${matching.length} Emergency & Urgent patients.`);
    setTimeout(() => setBulkToastMsg(null), 3000);
  };

  const handleSelectPendingReview = () => {
    const matching = assessments.filter((a) => !a.doctorReview);
    setSelectedPatientIds(new Set(matching.map((m) => m.demographics.patientId)));
    setBulkToastMsg(`Selected ${matching.length} unreviewed patient records.`);
    setTimeout(() => setBulkToastMsg(null), 3000);
  };

  const handleClearSelection = () => {
    setSelectedPatientIds(new Set());
  };

  const getSelectedRecords = (): PatientAssessmentRecord[] => {
    return assessments.filter((a) => selectedPatientIds.has(a.demographics.patientId));
  };

  const handleExecuteBulkPdfExport = async () => {
    const selectedRecords = getSelectedRecords();
    if (selectedRecords.length === 0) return;
    setIsBulkExportingPdf(true);
    try {
      await exportBulkPatientAssessmentsToPDF(selectedRecords, {
        batchTitle: bulkBatchTitle,
        includeAggregateCover: bulkIncludeCoverPage,
      });
      setBulkToastMsg(`✓ Generated consolidated PDF for ${selectedRecords.length} patients.`);
      setTimeout(() => setBulkToastMsg(null), 4000);
    } catch (err: any) {
      console.error('Bulk PDF export error:', err);
      alert('Failed to generate bulk PDF: ' + (err?.message || 'Unknown error'));
    } finally {
      setIsBulkExportingPdf(false);
    }
  };

  const handleBulkExportFHIR = () => {
    const selectedRecords = getSelectedRecords();
    if (selectedRecords.length === 0) return;
    exportAllToFHIRJSON(selectedRecords);
  };

  const handleBulkExportCSV = () => {
    const selectedRecords = getSelectedRecords();
    if (selectedRecords.length === 0) return;
    const filename = `HIS_Selected_Patients_${selectedRecords.length}_${new Date().toISOString().slice(0, 10)}.csv`;
    exportPatientsToCSV(selectedRecords, { filename });
    setBulkToastMsg(`✓ Exported ${selectedRecords.length} selected patient records to CSV.`);
    setTimeout(() => setBulkToastMsg(null), 4000);
  };

  const handleExportFilteredCSV = () => {
    const listToExport = selectedPatientIds.size > 0
      ? assessments.filter((p) => selectedPatientIds.has(p.demographics.patientId))
      : filteredPatients;

    if (listToExport.length === 0) {
      setBulkToastMsg('No patient records match the current filter criteria.');
      setTimeout(() => setBulkToastMsg(null), 3000);
      return;
    }

    const dateStr = new Date().toISOString().slice(0, 10);
    const filterTag = emergencyOnly
      ? 'EmergencyOnly_'
      : highRiskCategoryFilter !== 'ALL'
      ? `${highRiskCategoryFilter}_`
      : dischargeStatusFilter !== 'ALL'
      ? `${dischargeStatusFilter}_`
      : '';
    const filename = `HIS_Patient_Registry_${filterTag}${dateStr}.csv`;

    exportPatientsToCSV(listToExport, { filename });
    setBulkToastMsg(`✓ Exported ${listToExport.length} patient records to CSV (${filename}).`);
    setTimeout(() => setBulkToastMsg(null), 4000);
  };

  // Handle Export Full Patient Registry JSON for Backup & Clinical Auditing
  const handleExportAuditJSON = (subset?: PatientAssessmentRecord[]) => {
    const listToExport = subset && subset.length > 0 ? subset : assessments;
    if (listToExport.length === 0) {
      setBulkToastMsg('No patient records available for audit export.');
      setTimeout(() => setBulkToastMsg(null), 3000);
      return;
    }

    const now = new Date();
    const dateFormatted = now.toISOString().slice(0, 10);
    const timeCode = now.toISOString().replace(/[:.]/g, '-').slice(11, 19);

    const rfCount = listToExport.filter((r) => getPatientRedFlagInfo(r).hasRedFlags).length;
    const emCount = listToExport.filter(
      (r) => r.assessmentResult?.triage.level === 'LEVEL_1_EMERGENCY' || r.assessmentResult?.isEmergency
    ).length;
    const ugCount = listToExport.filter((r) => r.assessmentResult?.triage.level === 'LEVEL_2_URGENT').length;
    const prCount = listToExport.filter((r) => r.assessmentResult?.triage.level === 'LEVEL_3_PRIORITY').length;
    const roCount = listToExport.filter((r) => r.assessmentResult?.triage.level === 'LEVEL_4_ROUTINE').length;
    const soCount = listToExport.filter((r) => !!r.doctorReview).length;
    const uncHtn = listToExport.filter(
      (r) => (r.vitals.systolicBp || 0) >= 140 || (r.vitals.diastolicBp || 0) >= 90
    ).length;

    const auditBackupPayload = {
      exportMetadata: {
        system: 'Pakistan Primary & Secondary Healthcare AI-CDS HIS',
        systemVersion: '2026.1',
        exportType: 'FULL_PATIENT_REGISTRY_BACKUP_AND_CLINICAL_AUDIT',
        exportedAt: now.toISOString(),
        exportedByClinician: 'Attending Physician (Session Authenticated)',
        facility: 'Punjab Primary & Secondary Healthcare Department DHQ Hospital',
        jurisdiction: 'Government of Punjab, Specialized Healthcare & Medical Education Department',
        dataClassification: 'Confidential Medical Records (HIPAA Level 4 & PHI Protected)',
        totalPatientRecords: listToExport.length,
        isFullRegistry: listToExport.length === assessments.length,
        dataIntegrityChecksum: `CRC32-AUDIT-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 9).toUpperCase()}`,
        auditSummary: {
          totalCohortCount: listToExport.length,
          emergencyAcuityLevel1: emCount,
          urgentAcuityLevel2: ugCount,
          priorityAcuityLevel3: prCount,
          routineAcuityLevel4: roCount,
          activeRedFlagPatientsCount: rfCount,
          physicianSignedOffCount: soCount,
          pendingReviewCount: listToExport.length - soCount,
          uncontrolledHtnCasesCount: uncHtn,
          cardiovascularUrgentCount: listToExport.filter(
            (r) => (r.assessmentResult?.risks.cardiovascular.riskScore || 0) >= 0.2
          ).length,
        },
      },
      patientRegistry: listToExport.map((r, index) => {
        const rf = getPatientRedFlagInfo(r);
        return {
          auditSequence: index + 1,
          patientId: r.demographics.patientId,
          mrn: r.demographics.mrn,
          demographics: r.demographics,
          profile: r.profile,
          vitals: r.vitals,
          labs: r.labs,
          symptoms: r.symptoms,
          assessmentResult: r.assessmentResult,
          doctorReview: r.doctorReview,
          clinicalAuditAuditTrail: {
            hasActiveRedFlags: rf.hasRedFlags,
            flaggedConditions: rf.conditions,
            triageLevel: r.assessmentResult?.triage.level || 'LEVEL_4_ROUTINE',
            isEmergency: r.assessmentResult?.isEmergency || false,
            reviewStatus: r.doctorReview ? 'SIGNED_OFF' : 'PENDING_REVIEW',
            verifiedAt: now.toISOString(),
          },
        };
      }),
    };

    const jsonStr = JSON.stringify(auditBackupPayload, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `HIS_Patient_Registry_Audit_Backup_${dateFormatted}_${timeCode}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    setBulkToastMsg(
      `✓ Exported patient registry audit backup (${listToExport.length} records) as structured JSON.`
    );
    setTimeout(() => setBulkToastMsg(null), 4500);
  };

  // Handle Export Sync JSON Download
  const handleExportSyncJSON = () => {
    const exportPayload = {
      system: 'HIS-AI-HealthAssist',
      version: '2026.1',
      exportedAt: new Date().toISOString(),
      facility: 'Pakistan Primary & Secondary Healthcare DHQ',
      totalRecords: assessments.length,
      records: assessments,
    };
    const jsonStr = JSON.stringify(exportPayload, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `HIS_Registry_Sync_${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setSyncSuccessMsg(`Exported ${assessments.length} records to JSON file.`);
    setTimeout(() => setSyncSuccessMsg(null), 4000);
  };

  // Handle Copy Sync JSON to Clipboard
  const handleCopySyncJSON = () => {
    const exportPayload = {
      system: 'HIS-AI-HealthAssist',
      version: '2026.1',
      exportedAt: new Date().toISOString(),
      records: assessments,
    };
    navigator.clipboard.writeText(JSON.stringify(exportPayload, null, 2));
    setCopiedSyncJson(true);
    setTimeout(() => setCopiedSyncJson(false), 3000);
  };

  // Process Sync Text / File Input
  const handleProcessSyncJSON = (text: string) => {
    setSyncJsonText(text);
    setSyncError(null);
    setSyncSuccessMsg(null);
    if (!text.trim()) {
      setSyncParsedPreview(null);
      return;
    }
    try {
      const parsed = JSON.parse(text);
      let records: PatientAssessmentRecord[] = [];
      if (parsed.resourceType === 'Bundle') {
        records = parseFHIRBundleToRecords(parsed);
      } else if (Array.isArray(parsed)) {
        if (parsed.length > 0 && parsed[0].resourceType) {
          records = parseFHIRBundleToRecords(parsed);
        } else {
          records = parsed;
        }
      } else if (parsed.records && Array.isArray(parsed.records)) {
        records = parsed.records;
      } else if (parsed.demographics && parsed.vitals) {
        records = [parsed];
      } else {
        throw new Error('Invalid schema: Missing patient demographics/vitals records array or FHIR Bundle.');
      }
      setSyncParsedPreview(records);
    } catch (err: any) {
      setSyncError(err.message || 'Malformed JSON');
      setSyncParsedPreview(null);
    }
  };

  // Handle File Upload for Sync
  const handleSyncFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      handleProcessSyncJSON(content);
    };
    reader.readAsText(file);
  };

  // Apply Sync Ingestion to App State
  const handleApplySync = () => {
    if (!syncParsedPreview || syncParsedPreview.length === 0) {
      setSyncError('No valid records to ingest.');
      return;
    }

    if (syncMergeStrategy === 'REPLACE') {
      onImportRecords(syncParsedPreview, true);
      setSyncSuccessMsg(`Successfully replaced registry with ${syncParsedPreview.length} records.`);
    } else if (syncMergeStrategy === 'APPEND') {
      const existingIds = new Set(assessments.map((a) => a.demographics.patientId));
      const onlyNew = syncParsedPreview.filter((a) => !existingIds.has(a.demographics.patientId));
      onImportRecords(onlyNew, false);
      setSyncSuccessMsg(`Appended ${onlyNew.length} new records (skipped ${syncParsedPreview.length - onlyNew.length} duplicates).`);
    } else {
      // MERGE & UPDATE
      const incomingMap = new Map(syncParsedPreview.map((a) => [a.demographics.patientId, a]));
      const updatedExisting = assessments.map((existing) => {
        if (incomingMap.has(existing.demographics.patientId)) {
          const incoming = incomingMap.get(existing.demographics.patientId)!;
          incomingMap.delete(existing.demographics.patientId);
          return incoming;
        }
        return existing;
      });
      const brandNew = Array.from(incomingMap.values());
      onImportRecords([...brandNew, ...updatedExisting], true);
      setSyncSuccessMsg(`Synced ${syncParsedPreview.length} records (merged with local terminal).`);
    }

    setTimeout(() => {
      setShowSyncModal(false);
      setSyncJsonText('');
      setSyncParsedPreview(null);
      setSyncSuccessMsg(null);
    }, 1500);
  };

  // Handle Import JSON
  const handleImportJSON = () => {
    try {
      setImportError(null);
      const parsed = JSON.parse(importJsonText);
      let recordsToAdd: PatientAssessmentRecord[] = [];

      if (parsed.resourceType === 'Bundle') {
        recordsToAdd = parseFHIRBundleToRecords(parsed);
      } else if (Array.isArray(parsed)) {
        if (parsed.length > 0 && parsed[0].resourceType) {
          recordsToAdd = parseFHIRBundleToRecords(parsed);
        } else {
          recordsToAdd = parsed;
        }
      } else if (parsed.records && Array.isArray(parsed.records)) {
        recordsToAdd = parsed.records;
      } else if (parsed.demographics && parsed.vitals) {
        recordsToAdd = [parsed];
      } else {
        throw new Error('Unrecognized JSON format. Expected PatientAssessmentRecord array or HL7 FHIR R4 Bundle.');
      }

      if (recordsToAdd.length > 0) {
        onImportRecords(recordsToAdd);
        setShowImportModal(false);
        setImportJsonText('');
      } else {
        throw new Error('No valid patient records could be extracted from input.');
      }
    } catch (err: any) {
      setImportError(err.message || 'Invalid JSON syntax');
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner with Stats & Controls */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-cyan-700" />
              <h2 className="text-base font-bold text-slate-900">
                Master Patient Electronic Health Record (EHR) Directory
              </h2>
              <span className="text-[11px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-mono font-bold">
                HL7® FHIR® R4 Ready
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Active patient registry with longitudinal telemetry, cardiovascular risk scoring, and physician sign-offs.
            </p>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              id="btn-bulk-export-pdf-top"
              disabled={isBulkExportingPdf}
              onClick={() => {
                if (selectedPatientIds.size === 0) {
                  // If none selected, select all visible filtered patients and export
                  handleSelectAllFiltered();
                  setShowBulkModal(true);
                } else {
                  setShowBulkModal(true);
                }
              }}
              className="px-3.5 py-2 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white text-xs font-bold rounded-xl shadow-sm flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
              title="Export consolidated multi-patient clinical dossier with executive cohort cover page"
            >
              {isBulkExportingPdf ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <FileDown className="w-4 h-4" />
              )}
              <span>
                Bulk Export PDF {selectedPatientIds.size > 0 ? `(${selectedPatientIds.size})` : `(${filteredPatients.length})`}
              </span>
            </button>

            <button
              id="btn-sync-registry"
              onClick={() => {
                setShowSyncModal(true);
                setSyncTab('EXPORT');
              }}
              className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-sm flex items-center gap-1.5 transition-all cursor-pointer"
              title="Manual JSON Sync: Export local registry or import from another terminal"
            >
              <RefreshCw className="w-4 h-4" />
              Sync Data
            </button>

            <button
              id="btn-register-patient"
              onClick={onOpenIntake}
              className="px-3.5 py-2 bg-cyan-700 hover:bg-cyan-800 text-white text-xs font-bold rounded-xl shadow-sm flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Register New Patient
            </button>

            <button
              id="btn-export-fhir"
              onClick={() => {
                if (selectedPatientIds.size > 0) {
                  handleBulkExportFHIR();
                } else {
                  exportAllToFHIRJSON(assessments);
                }
              }}
              className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl border border-slate-200 flex items-center gap-1.5 transition-all cursor-pointer"
              title="Download full HL7 FHIR R4 Bundle JSON"
            >
              <FileDown className="w-4 h-4 text-cyan-600" />
              Export FHIR R4 {selectedPatientIds.size > 0 ? `(${selectedPatientIds.size})` : ''}
            </button>

            <button
              id="btn-export-csv"
              onClick={handleExportFilteredCSV}
              className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl border border-slate-200 flex items-center gap-1.5 transition-all cursor-pointer"
              title="Export filtered roster or selected records as CSV spreadsheet"
            >
              <FileText className="w-4 h-4 text-emerald-600" />
              Export CSV {selectedPatientIds.size > 0 ? `(${selectedPatientIds.size})` : `(${filteredPatients.length})`}
            </button>

            {/* Export Full Patient Registry Data as Structured JSON for Backup & Clinical Auditing */}
            <button
              id="btn-export-audit-json"
              onClick={() => handleExportAuditJSON()}
              className="px-3 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl border border-slate-800 shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
              title="Export the full patient registry data as a structured JSON file for backup and clinical auditing purposes"
            >
              <FileDown className="w-4 h-4 text-emerald-400" />
              <span>Export Audit JSON</span>
            </button>

            <button
              id="btn-import-records"
              onClick={() => setShowImportModal(true)}
              className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl border border-slate-200 flex items-center gap-1.5 transition-all cursor-pointer"
              title="Import FHIR JSON / patient dataset"
            >
              <FileUp className="w-4 h-4 text-purple-600" />
              Import Data
            </button>
          </div>
        </div>

        {/* Live Metrics Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mt-4 pt-4 border-t border-slate-100">
          <div
            onClick={() => setTriageFilter('ALL')}
            className={`p-3 rounded-xl border cursor-pointer transition-all ${
              triageFilter === 'ALL' ? 'bg-cyan-50 border-cyan-300 ring-1 ring-cyan-400' : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
            }`}
          >
            <span className="text-[10px] font-bold text-slate-500 uppercase block">Total Patients</span>
            <div className="text-xl font-black font-mono text-slate-900 mt-0.5">{totalCount}</div>
            <span className="text-[10px] text-slate-400">All registered records</span>
          </div>

          <div
            id="metric-card-red-flags"
            onClick={() => setTriageFilter(triageFilter === 'RED_FLAGS' ? 'ALL' : 'RED_FLAGS')}
            className={`p-3 rounded-xl border cursor-pointer transition-all ${
              triageFilter === 'RED_FLAGS' ? 'bg-rose-50 border-rose-300 ring-1 ring-rose-400 shadow-xs' : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
            }`}
            title="Filter by patients with active clinical red flags"
          >
            <span className="text-[10px] font-bold text-rose-600 uppercase block flex items-center gap-1">
              <ShieldAlert className="w-3 h-3 text-rose-600" /> Red Flags
            </span>
            <div className="text-xl font-black font-mono text-rose-700 mt-0.5">{redFlagCount}</div>
            <span className="text-[10px] text-rose-500">Critical conditions</span>
          </div>

          <div
            onClick={() => setTriageFilter('LEVEL_1_EMERGENCY')}
            className={`p-3 rounded-xl border cursor-pointer transition-all ${
              triageFilter === 'LEVEL_1_EMERGENCY' ? 'bg-red-50 border-red-300 ring-1 ring-red-400' : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
            }`}
          >
            <span className="text-[10px] font-bold text-red-600 uppercase block flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" /> Emergency
            </span>
            <div className="text-xl font-black font-mono text-red-700 mt-0.5">{emergencyCount}</div>
            <span className="text-[10px] text-red-500">Immediate resuscitation</span>
          </div>

          <div
            onClick={() => setTriageFilter('LEVEL_2_URGENT')}
            className={`p-3 rounded-xl border cursor-pointer transition-all ${
              triageFilter === 'LEVEL_2_URGENT' ? 'bg-orange-50 border-orange-300 ring-1 ring-orange-400' : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
            }`}
          >
            <span className="text-[10px] font-bold text-orange-600 uppercase block">Urgent Cases</span>
            <div className="text-xl font-black font-mono text-orange-700 mt-0.5">{urgentCount}</div>
            <span className="text-[10px] text-orange-500">&lt; 30 min physician review</span>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
            <span className="text-[10px] font-bold text-slate-500 uppercase block">Uncontrolled HTN</span>
            <div className="text-xl font-black font-mono text-amber-700 mt-0.5">{uncontrolledHtnCount}</div>
            <span className="text-[10px] text-slate-400">SBP ≥ 140 or DBP ≥ 90</span>
          </div>

          <div
            onClick={() => setTriageFilter('REVIEWED')}
            className={`p-3 rounded-xl border cursor-pointer transition-all ${
              triageFilter === 'REVIEWED' ? 'bg-emerald-50 border-emerald-300 ring-1 ring-emerald-400' : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
            }`}
          >
            <span className="text-[10px] font-bold text-emerald-600 uppercase block flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" /> Doctor Reviewed
            </span>
            <div className="text-xl font-black font-mono text-emerald-700 mt-0.5">{reviewedCount}</div>
            <span className="text-[10px] text-emerald-500">Sign-off completed</span>
          </div>
        </div>
      </div>

      {/* Bulk Toast Notification */}
      {bulkToastMsg && (
        <div className="bg-emerald-600 text-white px-4 py-2.5 rounded-xl text-xs font-bold shadow-md flex items-center justify-between animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            <span>{bulkToastMsg}</span>
          </div>
          <button onClick={() => setBulkToastMsg(null)} className="text-emerald-200 hover:text-white">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Multi-Patient Selection Actions Toolbar */}
      {selectedPatientIds.size > 0 && (
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-2xl p-4 shadow-xl border border-indigo-500/30 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-cyan-500/20 border border-cyan-400/40 text-cyan-400 flex items-center justify-center font-bold">
              <CheckSquare className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-bold flex items-center gap-2">
                <span>{selectedPatientIds.size} of {assessments.length} Patient Records Selected</span>
                <span className="text-[10px] bg-cyan-500/30 text-cyan-200 px-2 py-0.5 rounded font-mono font-bold">
                  Batch Queue Active
                </span>
              </div>
              <p className="text-[11px] text-slate-300">
                Ready for consolidated PDF export, cohort aggregate statistics cover sheet, or dataset export.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            <button
              id="btn-bulk-export-pdf"
              disabled={isBulkExportingPdf}
              onClick={handleExecuteBulkPdfExport}
              className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white text-xs font-bold rounded-xl shadow-md flex items-center gap-1.5 cursor-pointer disabled:opacity-50 transition-all"
              title="Generate single multi-patient consolidated PDF document with cover page"
            >
              {isBulkExportingPdf ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Generating Consolidated PDF...</span>
                </>
              ) : (
                <>
                  <FileDown className="w-3.5 h-3.5" />
                  <span>Generate Consolidated PDF ({selectedPatientIds.size})</span>
                </>
              )}
            </button>

            <button
              id="btn-bulk-options-modal"
              onClick={() => setShowBulkModal(true)}
              className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl border border-slate-700 flex items-center gap-1.5 cursor-pointer transition-all"
              title="Configure report title, executive cover page and sign-off details"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-cyan-400" />
              <span>Bulk Options & Preview</span>
            </button>

            <button
              id="btn-bulk-export-fhir"
              onClick={handleBulkExportFHIR}
              className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl border border-slate-700 flex items-center gap-1.5 cursor-pointer transition-all"
              title="Export selected patients to HL7 FHIR Bundle"
            >
              <FileCode className="w-3.5 h-3.5 text-purple-400" />
              <span>FHIR ({selectedPatientIds.size})</span>
            </button>

            <button
              id="btn-bulk-export-csv"
              onClick={handleBulkExportCSV}
              className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl border border-slate-700 flex items-center gap-1.5 cursor-pointer transition-all"
              title="Export selected patients to CSV spreadsheet"
            >
              <FileText className="w-3.5 h-3.5 text-emerald-400" />
              <span>CSV ({selectedPatientIds.size})</span>
            </button>

            <button
              id="btn-bulk-clear-selection"
              onClick={handleClearSelection}
              className="px-2.5 py-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl cursor-pointer text-xs font-semibold transition-all flex items-center gap-1"
              title="Clear selection"
            >
              <X className="w-3.5 h-3.5" />
              <span>Clear</span>
            </button>
          </div>
        </div>
      )}

      {/* POPULATION AGE DISTRIBUTION HISTOGRAM (RECHARTS) */}
      <PatientAgeHistogram
        assessments={assessments}
        filteredAssessments={filteredPatients}
        selectedAgeRange={ageRangeFilter}
        onSelectAgeRange={(range) => setAgeRangeFilter(range)}
      />

      {/* Filter & Search Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative w-full lg:w-96">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              id="input-patient-search"
              placeholder="Search by Name, MRN, ID, Diagnosis, Symptom, or District..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-8 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-cyan-500 focus:outline-none bg-slate-50/50"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Action Ribbon: Advanced Filters Toggle & Selectors */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Advanced Filters Drawer Toggle */}
            <button
              id="btn-toggle-advanced-filters"
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              className={`px-3 py-2 text-xs font-bold rounded-xl border flex items-center gap-1.5 transition-all cursor-pointer ${
                showAdvancedFilters || activeFiltersCount > 0
                  ? 'bg-cyan-50 text-cyan-800 border-cyan-300 ring-1 ring-cyan-400/40 shadow-xs'
                  : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
              }`}
              title="Toggle advanced clinical filter options (Emergency, Discharge, High Risk Category, Age, BP)"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 text-cyan-600" />
              <span>Advanced Filters</span>
              {activeFiltersCount > 0 && (
                <span className="bg-cyan-600 text-white font-extrabold text-[10px] px-1.5 py-0.2 rounded-full">
                  {activeFiltersCount}
                </span>
              )}
            </button>

            {/* Quick Export Filtered CSV Button */}
            <button
              id="btn-export-filtered-csv"
              onClick={handleExportFilteredCSV}
              className="px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-bold rounded-xl border border-emerald-200 flex items-center gap-1.5 transition-all cursor-pointer"
              title="Download currently filtered patient records as CSV"
            >
              <FileText className="w-3.5 h-3.5 text-emerald-600" />
              <span>Export CSV ({filteredPatients.length})</span>
            </button>

            {/* 7-Day Sparkline Metric Selector */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200">
              <span className="text-[10px] font-bold text-slate-500 px-1.5 hidden xl:inline flex items-center gap-1">
                <TrendingUp className="w-3 h-3 text-cyan-600" />
                Trend:
              </span>
              <button
                id="sparkline-metric-sbp"
                onClick={() => setSparklineMetric('SBP')}
                className={`px-2 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                  sparklineMetric === 'SBP' ? 'bg-white text-cyan-700 shadow-sm border border-slate-200' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                SBP (BP)
              </button>
              <button
                id="sparkline-metric-hr"
                onClick={() => setSparklineMetric('HR')}
                className={`px-2 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                  sparklineMetric === 'HR' ? 'bg-white text-rose-700 shadow-sm border border-slate-200' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Pulse
              </button>
              <button
                id="sparkline-metric-glucose"
                onClick={() => setSparklineMetric('GLUCOSE')}
                className={`px-2 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                  sparklineMetric === 'GLUCOSE' ? 'bg-white text-amber-700 shadow-sm border border-slate-200' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Glucose
              </button>
            </div>

            {/* Triage Selector */}
            <select
              value={triageFilter}
              onChange={(e) => setTriageFilter(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:ring-2 focus:ring-cyan-500 focus:outline-none"
            >
              <option value="ALL">All Triage Categories</option>
              <option value="FOLLOW_UP_DUE">📅 Follow-Up Due ({followUpDueCount})</option>
              <option value="INCOMPLETE_LABS">🧪 Incomplete Labs ({incompleteLabsCount})</option>
              <option value="LEVEL_1_EMERGENCY">Level 1 - Emergency</option>
              <option value="LEVEL_2_URGENT">Level 2 - Urgent</option>
              <option value="LEVEL_3_PRIORITY">Level 3 - Priority</option>
              <option value="LEVEL_4_ROUTINE">Level 4 - Routine</option>
              <option value="LEVEL_5_LOW_RISK">Level 5 - Low Risk</option>
              <option value="REVIEWED">Physician Reviewed Only</option>
              <option value="PENDING">Pending Review Only</option>
            </select>

            {/* District Selector */}
            <select
              value={districtFilter}
              onChange={(e) => setDistrictFilter(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:ring-2 focus:ring-cyan-500 focus:outline-none"
            >
              <option value="ALL">All Districts ({districts.length})</option>
              {districts.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* CLINICAL TRIAGE LEVEL FILTER & SORTING WORKFLOW BAR */}
        <div className="bg-slate-50/80 border border-slate-200 rounded-xl p-2.5 flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            <span className="text-[11px] font-bold uppercase text-slate-500 mr-1 flex items-center gap-1">
              <ShieldAlert className="w-3.5 h-3.5 text-cyan-600" />
              Triage Level:
            </span>

            {/* All Patients */}
            <button
              id="filter-triage-all"
              type="button"
              onClick={() => setTriageFilter('ALL')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                triageFilter === 'ALL'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              All ({totalCount})
            </button>

            {/* Level 1 Emergency */}
            <button
              id="filter-triage-level-1"
              type="button"
              onClick={() => setTriageFilter('LEVEL_1_EMERGENCY')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                triageFilter === 'LEVEL_1_EMERGENCY'
                  ? 'bg-red-600 text-white shadow-xs ring-2 ring-red-300'
                  : 'bg-red-50 text-red-700 hover:bg-red-100 border border-red-200'
              }`}
              title="Immediate Resuscitation & Emergency Cath / ICU Transfer"
            >
              <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
              <span>Level 1: Emergency ({emergencyCount})</span>
            </button>

            {/* Level 2 Urgent */}
            <button
              id="filter-triage-level-2"
              type="button"
              onClick={() => setTriageFilter('LEVEL_2_URGENT')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center gap-1 ${
                triageFilter === 'LEVEL_2_URGENT'
                  ? 'bg-orange-600 text-white shadow-xs ring-2 ring-orange-300'
                  : 'bg-orange-50 text-orange-800 hover:bg-orange-100 border border-orange-200'
              }`}
              title="Urgent Evaluation within 15-30 minutes"
            >
              <AlertTriangle className="w-3 h-3" />
              <span>Level 2: Urgent ({urgentCount})</span>
            </button>

            {/* Level 3 Priority */}
            <button
              id="filter-triage-level-3"
              type="button"
              onClick={() => setTriageFilter('LEVEL_3_PRIORITY')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                triageFilter === 'LEVEL_3_PRIORITY'
                  ? 'bg-amber-600 text-white shadow-xs ring-2 ring-amber-300'
                  : 'bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200'
              }`}
              title="Priority Evaluation within 60 minutes"
            >
              Level 3: Priority ({priorityCount})
            </button>

            {/* Level 4 Routine */}
            <button
              id="filter-triage-level-4"
              type="button"
              onClick={() => setTriageFilter('LEVEL_4_ROUTINE')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                triageFilter === 'LEVEL_4_ROUTINE'
                  ? 'bg-cyan-700 text-white shadow-xs ring-2 ring-cyan-300'
                  : 'bg-cyan-50 text-cyan-800 hover:bg-cyan-100 border border-cyan-200'
              }`}
              title="Standard Routine Outpatient Examination"
            >
              Level 4: Routine ({routineCount})
            </button>

            {/* Level 5 Low Risk */}
            <button
              id="filter-triage-level-5"
              type="button"
              onClick={() => setTriageFilter('LEVEL_5_LOW_RISK')}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                triageFilter === 'LEVEL_5_LOW_RISK'
                  ? 'bg-emerald-600 text-white shadow-xs ring-2 ring-emerald-300'
                  : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200'
              }`}
              title="Low Risk Routine / Healthy Counseling"
            >
              Level 5: Low Risk ({lowRiskCount})
            </button>
          </div>

          {/* Dedicated Triage Sorting Button */}
          <div className="flex items-center gap-2">
            <button
              id="btn-sort-by-triage"
              type="button"
              onClick={() => handleSort('TRIAGE')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
                sortField === 'TRIAGE'
                  ? 'bg-cyan-800 text-white shadow-xs ring-2 ring-cyan-400'
                  : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
              }`}
              title="Sort patient list by clinical triage severity"
            >
              <ArrowUpDown className="w-3.5 h-3.5" />
              <span>
                {sortField === 'TRIAGE'
                  ? sortDirection === 'desc'
                    ? 'Sorted by Triage: Emergency First ↓'
                    : 'Sorted by Triage: Low Risk First ↑'
                  : 'Sort by Triage Level'}
              </span>
            </button>
          </div>
        </div>

        {/* Quick Batch Selection Chips */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100">
          <div className="flex flex-wrap items-center gap-1.5 text-xs text-slate-600">
            <span className="text-[10px] font-bold uppercase text-slate-400 mr-1 flex items-center gap-1">
              <CheckSquare className="w-3 h-3 text-cyan-600" />
              Batch Select:
            </span>
            <button
              id="btn-select-all-filtered"
              onClick={handleSelectAllFiltered}
              className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-bold rounded-lg border border-slate-200 transition-all cursor-pointer"
            >
              {selectedPatientIds.size === filteredPatients.length && filteredPatients.length > 0
                ? 'Deselect All'
                : `All Visible (${filteredPatients.length})`}
            </button>
            <button
              id="btn-select-emergencies"
              onClick={handleSelectEmergencyAndUrgent}
              className="px-2.5 py-1 bg-red-50 hover:bg-red-100 text-red-700 text-[11px] font-bold rounded-lg border border-red-200 transition-all cursor-pointer"
            >
              Emergencies & Urgent ({emergencyCount + urgentCount})
            </button>
            <button
              id="btn-select-pending"
              onClick={handleSelectPendingReview}
              className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 text-[11px] font-bold rounded-lg border border-amber-200 transition-all cursor-pointer"
            >
              Pending Review ({assessments.length - reviewedCount})
            </button>
            <button
              id="btn-filter-followup-due"
              onClick={() => setTriageFilter(triageFilter === 'FOLLOW_UP_DUE' ? 'ALL' : 'FOLLOW_UP_DUE')}
              className={`px-2.5 py-1 text-[11px] font-bold rounded-lg border transition-all cursor-pointer flex items-center gap-1 ${
                triageFilter === 'FOLLOW_UP_DUE'
                  ? 'bg-orange-600 text-white border-orange-600'
                  : 'bg-orange-50 hover:bg-orange-100 text-orange-800 border-orange-200'
              }`}
              title="Filter patients with pending re-evaluations or upcoming follow-up appointments"
            >
              <Calendar className="w-3 h-3" />
              <span>Follow-up Due ({followUpDueCount})</span>
            </button>
            <button
              id="btn-filter-incomplete-labs"
              onClick={() => setTriageFilter(triageFilter === 'INCOMPLETE_LABS' ? 'ALL' : 'INCOMPLETE_LABS')}
              className={`px-2.5 py-1 text-[11px] font-bold rounded-lg border transition-all cursor-pointer flex items-center gap-1 ${
                triageFilter === 'INCOMPLETE_LABS'
                  ? 'bg-purple-600 text-white border-purple-600'
                  : 'bg-purple-50 hover:bg-purple-100 text-purple-800 border-purple-200'
              }`}
              title="Filter patients with incomplete baseline lab results or pending investigations"
            >
              <FlaskConical className="w-3 h-3" />
              <span>Incomplete Labs ({incompleteLabsCount})</span>
            </button>
            {selectedPatientIds.size > 0 && (
              <button
                id="btn-clear-selection-chip"
                onClick={handleClearSelection}
                className="px-2 py-1 text-slate-500 hover:text-slate-800 text-[11px] font-semibold transition-all cursor-pointer"
              >
                Reset Selection ({selectedPatientIds.size})
              </button>
            )}
          </div>

          {activeFiltersCount > 0 && (
            <button
              id="btn-reset-all-filters-quick"
              onClick={handleResetAllFilters}
              className="text-[11px] text-red-600 hover:text-red-800 font-bold flex items-center gap-1 px-2 py-1 rounded hover:bg-red-50 transition-all cursor-pointer"
            >
              <X className="w-3 h-3" />
              <span>Reset All Filters ({activeFiltersCount})</span>
            </button>
          )}
        </div>

        {/* Expandable Advanced Clinical Filters Panel */}
        {showAdvancedFilters && (
          <div className="bg-slate-50/80 rounded-xl border border-slate-200 p-3.5 mt-2 space-y-3 animate-fadeIn">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-slate-800 font-bold text-xs">
                <Filter className="w-3.5 h-3.5 text-cyan-600" />
                <span>Advanced Clinical Roster Filters</span>
              </div>
              <span className="text-[11px] text-slate-500 font-medium">
                Showing {filteredPatients.length} of {assessments.length} patients
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {/* 1. Emergency Only Filter */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase text-slate-500">Emergency Status</label>
                <button
                  id="filter-emergency-only-toggle"
                  onClick={() => setEmergencyOnly(!emergencyOnly)}
                  className={`w-full py-1.5 px-2.5 rounded-lg text-xs font-bold border transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                    emergencyOnly
                      ? 'bg-red-600 text-white border-red-600 shadow-xs'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-red-50 hover:text-red-700 hover:border-red-200'
                  }`}
                >
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>{emergencyOnly ? '✓ Emergency Only' : 'Emergency Only'}</span>
                </button>
              </div>

              {/* 2. Discharge / Disposition Status */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase text-slate-500">Clinical Disposition</label>
                <select
                  id="filter-discharge-status"
                  value={dischargeStatusFilter}
                  onChange={(e) => setDischargeStatusFilter(e.target.value as any)}
                  className="w-full py-1.5 px-2.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 focus:ring-2 focus:ring-cyan-500 focus:outline-none"
                >
                  <option value="ALL">All Dispositions</option>
                  <option value="IN_CLINIC">In-Clinic / Active</option>
                  <option value="DISCHARGED">Discharged Home</option>
                  <option value="REFERRED">Specialist Referral</option>
                  <option value="ADMITTED">Emergency Admission</option>
                </select>
              </div>

              {/* 3. High Risk Category */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase text-slate-500">High Risk Category</label>
                <select
                  id="filter-high-risk-category"
                  value={highRiskCategoryFilter}
                  onChange={(e) => setHighRiskCategoryFilter(e.target.value as any)}
                  className="w-full py-1.5 px-2.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 focus:ring-2 focus:ring-cyan-500 focus:outline-none"
                >
                  <option value="ALL">All Risk Categories</option>
                  <option value="ANY_HIGH">Any High Risk / Red Flag</option>
                  <option value="HIGH_CVD">High CVD Risk (≥20%)</option>
                  <option value="HIGH_DIABETES">High Diabetes / HbA1c Alert</option>
                  <option value="STAGE_2_HTN">Stage 2 HTN (≥160/100)</option>
                </select>
              </div>

              {/* 4. Age Group */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase text-slate-500">Age Bracket</label>
                <select
                  id="filter-age-group"
                  value={ageGroupFilter}
                  onChange={(e) => setAgeGroupFilter(e.target.value as any)}
                  className="w-full py-1.5 px-2.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 focus:ring-2 focus:ring-cyan-500 focus:outline-none"
                >
                  <option value="ALL">All Ages</option>
                  <option value="UNDER_40">&lt; 40 years</option>
                  <option value="40_65">40 – 65 years</option>
                  <option value="OVER_65">&gt; 65 years</option>
                </select>
              </div>

              {/* 5. Blood Pressure Stage */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase text-slate-500">Blood Pressure Tier</label>
                <select
                  id="filter-bp-category"
                  value={bpCategoryFilter}
                  onChange={(e) => setBpCategoryFilter(e.target.value as any)}
                  className="w-full py-1.5 px-2.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 focus:ring-2 focus:ring-cyan-500 focus:outline-none"
                >
                  <option value="ALL">All BP Ranges</option>
                  <option value="NORMAL">Normal (&lt;120/80)</option>
                  <option value="ELEVATED">Elevated (120-139 / 80-89)</option>
                  <option value="STAGE_1_HTN">Stage 1 HTN (140-159)</option>
                  <option value="STAGE_2_HTN">Stage 2 / Crisis (≥160/100)</option>
                </select>
              </div>
            </div>

            {/* Bottom Controls inside Filter Drawer */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-200/80">
              <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-slate-600">
                <span className="font-semibold text-slate-500">Active Criteria:</span>
                {emergencyOnly && (
                  <span className="px-2 py-0.5 bg-red-100 text-red-800 rounded-md font-bold flex items-center gap-1">
                    Emergency Only
                    <button onClick={() => setEmergencyOnly(false)}>×</button>
                  </span>
                )}
                {dischargeStatusFilter !== 'ALL' && (
                  <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded-md font-bold flex items-center gap-1">
                    Disposition: {dischargeStatusFilter}
                    <button onClick={() => setDischargeStatusFilter('ALL')}>×</button>
                  </span>
                )}
                {highRiskCategoryFilter !== 'ALL' && (
                  <span className="px-2 py-0.5 bg-amber-100 text-amber-800 rounded-md font-bold flex items-center gap-1">
                    Risk: {highRiskCategoryFilter}
                    <button onClick={() => setHighRiskCategoryFilter('ALL')}>×</button>
                  </span>
                )}
                {ageGroupFilter !== 'ALL' && (
                  <span className="px-2 py-0.5 bg-purple-100 text-purple-800 rounded-md font-bold flex items-center gap-1">
                    Age: {ageGroupFilter}
                    <button onClick={() => setAgeGroupFilter('ALL')}>×</button>
                  </span>
                )}
                {bpCategoryFilter !== 'ALL' && (
                  <span className="px-2 py-0.5 bg-rose-100 text-rose-800 rounded-md font-bold flex items-center gap-1">
                    BP: {bpCategoryFilter}
                    <button onClick={() => setBpCategoryFilter('ALL')}>×</button>
                  </span>
                )}
                {activeFiltersCount === 0 && (
                  <span className="text-slate-400 italic">No advanced filters active.</span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  id="btn-reset-filters-panel"
                  onClick={handleResetAllFilters}
                  className="px-3 py-1 bg-white hover:bg-slate-100 text-slate-700 text-xs font-bold rounded-lg border border-slate-200 transition-all cursor-pointer"
                >
                  Reset All Filters
                </button>
                <button
                  id="btn-export-csv-drawer"
                  onClick={handleExportFilteredCSV}
                  className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Download Filtered CSV</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Patient EHR Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200 uppercase text-[10px] tracking-wider">
              <tr>
                <th className="px-3 py-3 w-10 text-center">
                  <input
                    type="checkbox"
                    id="checkbox-select-all"
                    checked={filteredPatients.length > 0 && selectedPatientIds.size === filteredPatients.length}
                    ref={(el) => {
                      if (el) {
                        el.indeterminate =
                          selectedPatientIds.size > 0 && selectedPatientIds.size < filteredPatients.length;
                      }
                    }}
                    onChange={handleSelectAllFiltered}
                    className="w-4 h-4 rounded text-cyan-600 focus:ring-cyan-500 cursor-pointer"
                    title="Select / Deselect all visible patients"
                  />
                </th>
                <th
                  onClick={() => handleSort('NAME')}
                  className="px-4 py-3 cursor-pointer hover:bg-slate-100/80 transition-colors select-none group"
                  title="Click to sort by Patient Name"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Patient / MRN</span>
                    {sortField === 'NAME' ? (
                      sortDirection === 'asc' ? (
                        <ArrowUp className="w-3 h-3 text-cyan-600" />
                      ) : (
                        <ArrowDown className="w-3 h-3 text-cyan-600" />
                      )
                    ) : (
                      <ArrowUpDown className="w-3 h-3 text-slate-300 group-hover:text-slate-500 transition-colors" />
                    )}
                  </div>
                </th>
                <th
                  onClick={() => handleSort('AGE')}
                  className="px-3 py-3 cursor-pointer hover:bg-slate-100/80 transition-colors select-none group"
                  title="Click to sort by Age"
                >
                  <div className="flex items-center gap-1">
                    <span>Age / Sex</span>
                    {sortField === 'AGE' ? (
                      sortDirection === 'asc' ? (
                        <ArrowUp className="w-3 h-3 text-cyan-600" />
                      ) : (
                        <ArrowDown className="w-3 h-3 text-cyan-600" />
                      )
                    ) : (
                      <ArrowUpDown className="w-3 h-3 text-slate-300 group-hover:text-slate-500 transition-colors" />
                    )}
                  </div>
                </th>
                <th className="px-3 py-3">District</th>
                <th
                  onClick={() => handleSort('BP')}
                  className="px-3 py-3 cursor-pointer hover:bg-slate-100/80 transition-colors select-none group"
                  title="Click to sort by Systolic Blood Pressure"
                >
                  <div className="flex items-center gap-1">
                    <span>Current Vitals</span>
                    {sortField === 'BP' ? (
                      sortDirection === 'asc' ? (
                        <ArrowUp className="w-3 h-3 text-cyan-600" />
                      ) : (
                        <ArrowDown className="w-3 h-3 text-cyan-600" />
                      )
                    ) : (
                      <ArrowUpDown className="w-3 h-3 text-slate-300 group-hover:text-slate-500 transition-colors" />
                    )}
                  </div>
                </th>
                <th className="px-3 py-3 min-w-[135px]">
                  <div className="flex items-center gap-1 text-cyan-800">
                    <LineChartIcon className="w-3.5 h-3.5 text-cyan-600" />
                    <span>7-Day {sparklineMetric === 'SBP' ? 'SBP' : sparklineMetric === 'HR' ? 'Pulse' : 'Glucose'} Trend</span>
                  </div>
                </th>
                <th className="px-3 py-3">Glucose / BMI</th>
                <th
                  onClick={() => handleSort('RISK')}
                  className="px-3 py-3 cursor-pointer hover:bg-slate-100/80 transition-colors select-none group"
                  title="Click to sort by Cardiovascular 10-Yr Risk Score"
                >
                  <div className="flex items-center gap-1">
                    <span>CVD 10-Yr Risk</span>
                    {sortField === 'RISK' ? (
                      sortDirection === 'asc' ? (
                        <ArrowUp className="w-3 h-3 text-cyan-600" />
                      ) : (
                        <ArrowDown className="w-3 h-3 text-cyan-600" />
                      )
                    ) : (
                      <ArrowUpDown className="w-3 h-3 text-slate-300 group-hover:text-slate-500 transition-colors" />
                    )}
                  </div>
                </th>
                <th
                  onClick={() => handleSort('TRIAGE')}
                  className="px-3 py-3 cursor-pointer hover:bg-slate-100/80 transition-colors select-none group bg-amber-50/50"
                  title="Click to sort by Triage Urgency (High Risk Priority)"
                >
                  <div className="flex items-center gap-1 text-amber-900 font-black">
                    <span>Triage Level</span>
                    {sortField === 'TRIAGE' ? (
                      sortDirection === 'asc' ? (
                        <ArrowUp className="w-3.5 h-3.5 text-amber-700 font-bold" />
                      ) : (
                        <ArrowDown className="w-3.5 h-3.5 text-amber-700 font-bold" />
                      )
                    ) : (
                      <ArrowUpDown className="w-3 h-3 text-amber-400 group-hover:text-amber-600 transition-colors" />
                    )}
                  </div>
                </th>
                <th
                  onClick={() => handleSort('DATE')}
                  className="px-3 py-3 cursor-pointer hover:bg-slate-100/80 transition-colors select-none group"
                  title="Click to sort by Encounter Date / Time"
                >
                  <div className="flex items-center gap-1">
                    <span>Date / Review</span>
                    {sortField === 'DATE' ? (
                      sortDirection === 'asc' ? (
                        <ArrowUp className="w-3 h-3 text-cyan-600" />
                      ) : (
                        <ArrowDown className="w-3 h-3 text-cyan-600" />
                      )
                    ) : (
                      <ArrowUpDown className="w-3 h-3 text-slate-300 group-hover:text-slate-500 transition-colors" />
                    )}
                  </div>
                </th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredPatients.length === 0 ? (
                <tr>
                  <td colSpan={11} className="px-4 py-8 text-center text-slate-400">
                    No matching patient records found in registry.
                  </td>
                </tr>
              ) : (
                filteredPatients.map((record) => {
                  const sbp = record.vitals.systolicBp || 0;
                  const dbp = record.vitals.diastolicBp || 0;
                  const hr = record.vitals.heartRate || 0;
                  const spo2 = record.vitals.oxygenSaturation || 0;
                  const glucose = record.vitals.bloodGlucoseMgDl || record.labs.glucoseFastingMgDl || 0;
                  const bmi = record.profile.bmi || 0;
                  const cvdScore = record.assessmentResult?.risks.cardiovascular.riskScore || 0;
                  const cvdPct = (cvdScore * 100).toFixed(0);
                  const isEmergency =
                    record.assessmentResult?.triage.level === 'LEVEL_1_EMERGENCY' ||
                    record.assessmentResult?.isEmergency;
                  const isSelected = selectedPatientIds.has(record.demographics.patientId);
                  const workloadAlerts = getPatientWorkloadAlerts(record);

                  return (
                    <tr
                      key={record.demographics.patientId}
                      className={`hover:bg-slate-50/80 transition-colors ${
                        isSelected
                          ? 'bg-cyan-50/60 ring-1 ring-cyan-200'
                          : isEmergency
                          ? 'bg-red-50/20'
                          : ''
                      }`}
                    >
                      {/* Checkbox */}
                      <td className="px-3 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          id={`checkbox-patient-${record.demographics.patientId}`}
                          checked={isSelected}
                          onChange={() => handleToggleSelect(record.demographics.patientId)}
                          className="w-4 h-4 rounded text-cyan-600 focus:ring-cyan-500 cursor-pointer"
                        />
                      </td>

                      {/* Patient Name, MRN & Workload Alert Badges */}
                      <td className="px-4 py-3">
                        <div className="font-bold text-slate-900 text-xs flex items-center gap-1.5 flex-wrap">
                          <span>{record.demographics.fullName}</span>
                          {isEmergency && (
                            <span className="bg-red-100 text-red-700 text-[9px] font-extrabold px-1 rounded">
                              RED FLAG
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-slate-500 font-mono flex items-center gap-1.5 flex-wrap mt-0.5">
                          <span className="font-semibold text-slate-700">{record.demographics.patientId}</span>
                          <CopyPatientIdButton
                            id={`btn-copy-table-${record.demographics.patientId}`}
                            value={record.demographics.patientId}
                            label="Copy"
                            size="sm"
                          />
                          {record.demographics.mrn && (
                            <>
                              <span className="text-slate-300">•</span>
                              <span className="text-slate-500">MRN: {record.demographics.mrn}</span>
                              <CopyPatientIdButton
                                id={`btn-copy-table-mrn-${record.demographics.patientId}`}
                                value={record.demographics.mrn}
                                label="Copy"
                                size="sm"
                              />
                            </>
                          )}
                        </div>

                        {/* Workload Priority Notification Badges (Follow-up Due & Incomplete Labs) */}
                        {workloadAlerts.length > 0 && (
                          <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                            {workloadAlerts.map((alert, aIdx) => (
                              <span
                                key={aIdx}
                                id={`badge-workload-${record.demographics.patientId}-${aIdx}`}
                                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold border shadow-xs transition-transform hover:scale-105 ${
                                  alert.type === 'FOLLOW_UP'
                                    ? 'bg-amber-50 text-amber-900 border-amber-300 ring-1 ring-amber-400/30'
                                    : alert.type === 'INCOMPLETE_LABS'
                                    ? 'bg-purple-50 text-purple-900 border-purple-300 ring-1 ring-purple-400/30'
                                    : 'bg-red-50 text-red-900 border-red-300 ring-1 ring-red-400/30'
                                }`}
                                title={alert.tooltip}
                              >
                                <span className="relative flex h-2 w-2">
                                  <span
                                    className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                                      alert.type === 'FOLLOW_UP'
                                        ? 'bg-amber-400'
                                        : alert.type === 'INCOMPLETE_LABS'
                                        ? 'bg-purple-400'
                                        : 'bg-red-400'
                                    }`}
                                  />
                                  <span
                                    className={`relative inline-flex rounded-full h-2 w-2 ${
                                      alert.type === 'FOLLOW_UP'
                                        ? 'bg-amber-500'
                                        : alert.type === 'INCOMPLETE_LABS'
                                        ? 'bg-purple-500'
                                        : 'bg-red-500'
                                    }`}
                                  />
                                </span>
                                {alert.iconType === 'calendar' ? (
                                  <Calendar className="w-3 h-3 text-amber-700" />
                                ) : alert.iconType === 'flask' ? (
                                  <FlaskConical className="w-3 h-3 text-purple-700" />
                                ) : (
                                  <AlertCircle className="w-3 h-3 text-red-700" />
                                )}
                                <span>{alert.badgeText}</span>
                              </span>
                            ))}
                          </div>
                        )}
                      </td>

                      {/* Age / Sex */}
                      <td className="px-3 py-3 text-slate-700 font-medium">
                        {record.demographics.age}y / {record.demographics.sex}
                      </td>

                      {/* District */}
                      <td className="px-3 py-3 text-slate-600">
                        <span className="font-semibold text-slate-800">{record.demographics.district}</span>
                        <span className="text-[10px] text-slate-400 block">{record.demographics.province}</span>
                      </td>

                      {/* Current Vitals */}
                      <td className="px-3 py-3">
                        <div className="font-mono font-bold text-slate-900 flex items-center gap-1">
                          <span
                            className={
                              sbp >= 160 || dbp >= 100
                                ? 'text-red-600 font-extrabold'
                                : sbp >= 140 || dbp >= 90
                                ? 'text-amber-600'
                                : 'text-slate-800'
                            }
                          >
                            {sbp}/{dbp}
                          </span>
                          <span className="text-[10px] text-slate-400 font-normal">mmHg</span>
                        </div>
                        <div className="text-[10px] text-slate-500 font-mono">
                          HR: {hr} bpm | SpO2: {spo2}%
                        </div>
                      </td>

                      {/* 7-Day Vitals Sparkline Trend */}
                      <td className="px-3 py-3">
                        <div className="flex flex-col gap-0.5">
                          <VitalsSparkline
                            record={record}
                            metric={sparklineMetric}
                            width={96}
                            height={28}
                            showDelta={true}
                          />
                          <div className="text-[9px] text-slate-400 font-mono">
                            {sparklineMetric === 'SBP'
                              ? `Target: <130 mmHg`
                              : sparklineMetric === 'HR'
                              ? `Target: 60-100 bpm`
                              : `Target: <126 mg/dL`}
                          </div>
                        </div>
                      </td>

                      {/* Glucose / BMI */}
                      <td className="px-3 py-3">
                        <div className="font-mono text-slate-800 font-semibold">
                          {glucose > 0 ? `${glucose} mg/dL` : '—'}
                        </div>
                        <div className="text-[10px] text-slate-500 font-mono">
                          BMI: {bmi > 0 ? bmi.toFixed(1) : '—'}
                        </div>
                      </td>

                      {/* CVD 10-Yr Risk */}
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`font-mono font-bold text-xs ${
                              cvdScore >= 0.3
                                ? 'text-red-700'
                                : cvdScore >= 0.2
                                ? 'text-orange-600'
                                : cvdScore >= 0.1
                                ? 'text-amber-600'
                                : 'text-emerald-600'
                            }`}
                          >
                            {cvdPct}%
                          </span>
                          <div className="w-12 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full ${
                                cvdScore >= 0.3
                                  ? 'bg-red-500'
                                  : cvdScore >= 0.2
                                  ? 'bg-orange-500'
                                  : cvdScore >= 0.1
                                  ? 'bg-amber-500'
                                  : 'bg-emerald-500'
                              }`}
                              style={{ width: `${Math.min(100, cvdScore * 100)}%` }}
                            />
                          </div>
                        </div>
                        <span className="text-[9px] text-slate-400 font-mono uppercase">
                          {record.assessmentResult?.risks.cardiovascular.riskCategory || 'LOW'}
                        </span>
                      </td>

                      {/* Triage Level */}
                      <td className="px-3 py-3">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                            record.assessmentResult?.triage.level === 'LEVEL_1_EMERGENCY'
                              ? 'bg-red-100 text-red-800 border border-red-300'
                              : record.assessmentResult?.triage.level === 'LEVEL_2_URGENT'
                              ? 'bg-orange-100 text-orange-800 border border-orange-300'
                              : record.assessmentResult?.triage.level === 'LEVEL_3_PRIORITY'
                              ? 'bg-amber-100 text-amber-800 border border-amber-300'
                              : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                          }`}
                        >
                          {record.assessmentResult?.triage.levelName || 'Level 4 Routine'}
                        </span>
                      </td>

                      {/* Doctor Review */}
                      <td className="px-3 py-3">
                        {record.doctorReview ? (
                          <div className="flex items-center gap-1 text-emerald-700 font-bold text-[11px]">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Signed Off</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1 text-slate-400 text-[11px]">
                            <Clock className="w-3.5 h-3.5" />
                            <span>Pending</span>
                          </div>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {/* Interactive Longitudinal Vital Trends Recharts Line Chart Modal */}
                          <button
                            id={`btn-trends-${record.demographics.patientId}`}
                            onClick={() => {
                              setSelectedTrendPatient(record);
                              setShowTrendsModal(true);
                            }}
                            className="p-1.5 text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded-lg transition-all cursor-pointer"
                            title="View Longitudinal Blood Pressure & Heart Rate Progression (Recharts)"
                          >
                            <LineChartIcon className="w-4 h-4" />
                          </button>

                          {/* View EHR Chart Modal */}
                          <button
                            id={`btn-view-ehr-${record.demographics.patientId}`}
                            onClick={() => setViewingRecord(record)}
                            className="p-1.5 text-slate-500 hover:text-cyan-700 hover:bg-slate-100 rounded-lg transition-all cursor-pointer"
                            title="Open EHR Patient Chart"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {/* Open in Doctor CDS Portal */}
                          <button
                            id={`btn-open-cds-${record.demographics.patientId}`}
                            onClick={() => onSelectAssessment(record)}
                            className="p-1.5 text-cyan-700 hover:text-cyan-900 hover:bg-cyan-50 rounded-lg transition-all cursor-pointer"
                            title="Review in Doctor Decision Support Portal"
                          >
                            <Stethoscope className="w-4 h-4" />
                          </button>

                          {/* Export Official PDF */}
                          <button
                            id={`btn-pdf-${record.demographics.patientId}`}
                            onClick={() => exportPatientAssessmentToPDF(record)}
                            className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-all cursor-pointer"
                            title="Download Clinical Assessment PDF"
                          >
                            <FileDown className="w-4 h-4" />
                          </button>

                          {/* Delete Patient */}
                          <button
                            id={`btn-delete-${record.demographics.patientId}`}
                            onClick={() => {
                              if (confirm(`Remove patient ${record.demographics.fullName} from registry?`)) {
                                onDeletePatient(record.demographics.patientId);
                              }
                            }}
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all cursor-pointer"
                            title="Remove record"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: LIVE EHR PATIENT CHART VIEWER */}
      {viewingRecord && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl border border-slate-200 max-h-[90vh] flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="bg-slate-900 text-white p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button
                  id="btn-view-ehr-back-header"
                  onClick={() => setViewingRecord(null)}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border border-slate-700"
                  title="Return to Master Patient Registry"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back</span>
                </button>
                <div className="w-9 h-9 rounded-xl bg-cyan-600 flex items-center justify-center font-bold">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2 flex-wrap">
                    <span>{viewingRecord.demographics.fullName}</span>
                    <span className="bg-cyan-500/20 text-cyan-300 text-[10px] px-2 py-0.5 rounded font-mono">
                      {viewingRecord.demographics.patientId}
                    </span>
                    <CopyPatientIdButton
                      id="btn-copy-modal-patient-id"
                      value={viewingRecord.demographics.patientId}
                      label="Copy ID"
                      size="sm"
                    />
                    {viewingRecord.demographics.mrn && (
                      <CopyPatientIdButton
                        id="btn-copy-modal-mrn"
                        value={viewingRecord.demographics.mrn}
                        label="Copy MRN"
                        size="sm"
                      />
                    )}
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    {viewingRecord.demographics.age}yo {viewingRecord.demographics.sex} • {viewingRecord.demographics.district},{' '}
                    {viewingRecord.demographics.province}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  id="btn-ehr-open-vital-trends"
                  onClick={() => {
                    setSelectedTrendPatient(viewingRecord);
                    setShowTrendsModal(true);
                  }}
                  className="px-3 py-1.5 bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-700 hover:to-pink-700 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 cursor-pointer shadow-sm"
                  title="Open full interactive Longitudinal Vital Trends modal with Recharts"
                >
                  <LineChartIcon className="w-3.5 h-3.5" />
                  <span>Vital Trends</span>
                </button>
                <button
                  onClick={() => exportPatientAssessmentToPDF(viewingRecord)}
                  className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 cursor-pointer"
                >
                  <FileDown className="w-3.5 h-3.5" />
                  Print PDF
                </button>
                <button
                  onClick={() => {
                    const rec = viewingRecord;
                    setViewingRecord(null);
                    onSelectAssessment(rec);
                  }}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 cursor-pointer border border-slate-700"
                >
                  <Stethoscope className="w-3.5 h-3.5 text-cyan-400" />
                  Doctor Review
                </button>
                <button
                  onClick={() => setViewingRecord(null)}
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-6 text-xs text-slate-700 flex-1">
              {/* Vitals Grid */}
              <div>
                <h4 className="font-bold text-slate-900 uppercase tracking-wider text-[11px] mb-2 flex items-center gap-1.5">
                  <Activity className="w-4 h-4 text-rose-500" /> Current Vital Signs & Biometrics
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                    <span className="text-[10px] text-slate-500 font-bold block">Blood Pressure</span>
                    <span className="text-base font-bold font-mono text-slate-900">
                      {viewingRecord.vitals.systolicBp}/{viewingRecord.vitals.diastolicBp} mmHg
                    </span>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                    <span className="text-[10px] text-slate-500 font-bold block">Heart Rate</span>
                    <span className="text-base font-bold font-mono text-slate-900">
                      {viewingRecord.vitals.heartRate} bpm
                    </span>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                    <span className="text-[10px] text-slate-500 font-bold block">Oxygen Saturation</span>
                    <span className="text-base font-bold font-mono text-slate-900">
                      {viewingRecord.vitals.oxygenSaturation}% SpO2
                    </span>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                    <span className="text-[10px] text-slate-500 font-bold block">Blood Glucose</span>
                    <span className="text-base font-bold font-mono text-slate-900">
                      {viewingRecord.vitals.bloodGlucoseMgDl || viewingRecord.labs.glucoseFastingMgDl || '—'} mg/dL
                    </span>
                  </div>
                </div>
              </div>

              {/* Longitudinal Blood Pressure & Heart Rate Progression Recharts Line Chart in EHR */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-cyan-700" />
                    <span className="font-bold text-slate-900 text-xs">
                      Historical Vital Progression: Blood Pressure (SBP/DBP) & Heart Rate (Recharts)
                    </span>
                  </div>
                  <button
                    onClick={() => {
                      setSelectedTrendPatient(viewingRecord);
                      setShowTrendsModal(true);
                    }}
                    className="text-xs font-bold text-rose-600 hover:text-rose-700 flex items-center gap-1 cursor-pointer bg-white px-2.5 py-1 rounded-lg border border-slate-200 shadow-xs"
                  >
                    <LineChartIcon className="w-3.5 h-3.5" />
                    <span>Expand Full Trends</span>
                  </button>
                </div>

                <div className="bg-white p-3 rounded-xl border border-slate-200">
                  <div className="h-56 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={generatePatientVitalTrends(viewingRecord)} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                        <XAxis dataKey="timeLabel" tick={{ fontSize: 10, fill: '#64748b' }} stroke="#cbd5e1" />
                        <YAxis domain={['dataMin - 10', 'dataMax + 15']} tick={{ fontSize: 10, fill: '#64748b' }} stroke="#cbd5e1" />
                        <RechartsTooltip
                          contentStyle={{ backgroundColor: '#0f172a', borderRadius: '0.75rem', border: 'none', color: '#fff', fontSize: '11px' }}
                        />
                        <RechartsLegend wrapperStyle={{ fontSize: '11px', paddingTop: '6px' }} />
                        <ReferenceLine y={140} stroke="#ef4444" strokeDasharray="3 3" label={{ value: 'HTN SBP (140)', fill: '#ef4444', fontSize: 9 }} />
                        <ReferenceLine y={90} stroke="#f97316" strokeDasharray="3 3" label={{ value: 'HTN DBP (90)', fill: '#f97316', fontSize: 9 }} />
                        <Line type="monotone" dataKey="sbp" name="Systolic BP (mmHg)" stroke="#dc2626" strokeWidth={2.5} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                        <Line type="monotone" dataKey="dbp" name="Diastolic BP (mmHg)" stroke="#ea580c" strokeWidth={2} dot={{ r: 3 }} />
                        <Line type="monotone" dataKey="heartRate" name="Heart Rate (bpm)" stroke="#0d9488" strokeWidth={2} dot={{ r: 3 }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>

              {/* Cardiovascular & Metabolic Risk Summary */}
              {viewingRecord.assessmentResult && (
                <div className="p-4 rounded-xl bg-cyan-50/50 border border-cyan-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-cyan-950 uppercase text-[11px]">
                      WHO HEARTS Risk Stratification
                    </span>
                    <span className="font-mono font-extrabold text-cyan-900 text-sm">
                      {((viewingRecord.assessmentResult.risks.cardiovascular.riskScore || 0) * 100).toFixed(0)}% 10-Yr
                      ASCVD Risk
                    </span>
                  </div>
                  <p className="text-slate-600 text-xs leading-relaxed">
                    {viewingRecord.assessmentResult.triage.summary}
                  </p>
                </div>
              )}

              {/* EXPANDED CHRONOLOGICAL MEDICATIONS & ACTIVE PRESCRIPTIONS SECTION */}
              <div className="p-4 rounded-xl border border-slate-200 bg-white space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-indigo-50 text-indigo-700 rounded-lg border border-indigo-200">
                      <Pill className="w-4 h-4" />
                    </div>
                    <div>
                      <h5 className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                        <span>Chronological Medication History & Active Prescriptions</span>
                        <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-1.5 py-0.2 rounded">
                          Active Formulary
                        </span>
                      </h5>
                      <p className="text-[11px] text-slate-500">
                        Current active prescriptions and past medication timeline for {viewingRecord.demographics.fullName}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      onSelectAssessment(viewingRecord);
                    }}
                    className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-bold border border-indigo-200 flex items-center gap-1 transition-all cursor-pointer"
                  >
                    <span>Open in CDS Portal &rarr;</span>
                  </button>
                </div>

                {/* 1. Active Prescriptions */}
                <div>
                  <h6 className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    Active Prescriptions ({viewingRecord.profile.currentMedications?.length || 0})
                  </h6>
                  {viewingRecord.profile.currentMedications && viewingRecord.profile.currentMedications.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {viewingRecord.profile.currentMedications.map((med, i) => (
                        <div
                          key={i}
                          className="p-2.5 rounded-lg border border-emerald-100 bg-emerald-50/40 flex items-start justify-between text-xs"
                        >
                          <div>
                            <span className="font-bold text-slate-900 block">{med}</span>
                            <span className="text-[11px] text-slate-500">Active Daily Therapy • Oral Route</span>
                          </div>
                          <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-200">
                            Active
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <span className="text-slate-400 italic text-xs">No current medications recorded.</span>
                  )}
                </div>

                {/* 2. Chronological Past Medications / Discontinued Regimens */}
                <div>
                  <h6 className="text-[11px] font-bold uppercase tracking-wider text-slate-500 mb-2 flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    Chronological Past Medications & Historical Titrations
                  </h6>
                  <div className="space-y-2">
                    <div className="p-2.5 rounded-lg border border-slate-200 bg-slate-50 flex items-start justify-between text-xs">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-700">Hydrochlorothiazide (HCTZ) 12.5 mg PO Daily</span>
                          <span className="bg-slate-200 text-slate-600 text-[10px] font-semibold px-1.5 py-0.5 rounded">
                            Discontinued
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          Started 2025-08-10 • Discontinued 2026-01-15 (Switched to Amlodipine/ARB combination due to hypokalemia)
                        </p>
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono">Past Regimen</span>
                    </div>

                    <div className="p-2.5 rounded-lg border border-slate-200 bg-slate-50 flex items-start justify-between text-xs">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-700">Aspirin 75 mg PO Daily</span>
                          <span className="bg-slate-200 text-slate-600 text-[10px] font-semibold px-1.5 py-0.5 rounded">
                            Completed Course
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          Short-term primary vascular stabilization • Completed baseline ASCVD assessment
                        </p>
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono">Completed</span>
                    </div>
                  </div>
                </div>

                {/* 3. Drug Allergies & Hypersensitivities */}
                <div className="border-t border-slate-100 pt-2.5 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold text-slate-700">Documented Drug Allergies:</span>
                    {viewingRecord.profile.drugAllergies && viewingRecord.profile.drugAllergies.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {viewingRecord.profile.drugAllergies.map((all, i) => (
                          <span key={i} className="px-2 py-0.5 bg-red-50 text-red-700 rounded text-[11px] font-bold border border-red-200">
                            ⚠ {all}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-emerald-700 text-xs font-semibold">✓ No known drug allergies (NKDA)</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Doctor Review Section if present */}
              {viewingRecord.doctorReview && (
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                    <span className="font-bold text-slate-900 text-xs">Attending Physician Sign-Off</span>
                    <span className="text-slate-500 font-mono text-[11px]">
                      {new Date(viewingRecord.doctorReview.reviewTimestamp).toLocaleString()}
                    </span>
                  </div>
                  <div className="text-xs text-slate-700">
                    <p>
                      <strong>Physician:</strong> {viewingRecord.doctorReview.doctorName} (
                      {viewingRecord.doctorReview.facility})
                    </p>
                    <p className="mt-1">
                      <strong>Final Diagnosis:</strong> {viewingRecord.doctorReview.doctorDiagnosis}
                    </p>
                    <p className="mt-1">
                      <strong>Clinical Notes:</strong> {viewingRecord.doctorReview.clinicalNotes}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="bg-slate-50 border-t border-slate-200 p-4 flex items-center justify-between">
              <button
                id="btn-view-ehr-back-footer"
                onClick={() => setViewingRecord(null)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-xl text-xs cursor-pointer flex items-center gap-1.5 transition-all"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back to Patient Registry</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => exportPatientAssessmentToPDF(viewingRecord)}
                  className="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold rounded-xl text-xs cursor-pointer flex items-center gap-1.5"
                >
                  <FileDown className="w-4 h-4" />
                  Export PDF Report
                </button>
                <button
                  onClick={() => setViewingRecord(null)}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs cursor-pointer"
                >
                  Close Chart
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: MANUAL DATA SYNC (EXPORT / IMPORT JSON ACROSS CLINICAL TERMINALS) */}
      {showSyncModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4 font-sans">
          <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-5 flex items-center justify-between border-b border-indigo-900/50">
              <div className="flex items-center gap-3">
                <button
                  id="btn-sync-modal-back-header"
                  onClick={() => setShowSyncModal(false)}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border border-slate-700"
                  title="Return to Master Patient Registry"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back</span>
                </button>
                <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-400">
                  <ArrowLeftRight className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-2">
                    EHR Terminal Data Synchronization
                  </h3>
                  <p className="text-xs text-indigo-200">
                    Export local registry to JSON or ingest datasets from an authorized clinical workstation.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowSyncModal(false)}
                className="text-slate-400 hover:text-white p-1.5 rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Sync Tabs Selector */}
            <div className="flex border-b border-slate-200 bg-slate-50 px-5 pt-3 gap-2">
              <button
                id="tab-sync-export"
                onClick={() => setSyncTab('EXPORT')}
                className={`pb-2.5 px-4 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
                  syncTab === 'EXPORT'
                    ? 'border-indigo-600 text-indigo-700 bg-white rounded-t-xl'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <Download className="w-4 h-4" />
                Export Local Registry (JSON)
              </button>

              <button
                id="tab-sync-import"
                onClick={() => setSyncTab('IMPORT')}
                className={`pb-2.5 px-4 text-xs font-bold border-b-2 transition-all cursor-pointer flex items-center gap-2 ${
                  syncTab === 'IMPORT'
                    ? 'border-indigo-600 text-indigo-700 bg-white rounded-t-xl'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
              >
                <Upload className="w-4 h-4" />
                Import & Ingest Terminal JSON
              </button>
            </div>

            {/* Tab Body */}
            <div className="p-6 space-y-5 overflow-y-auto flex-1">
              {syncSuccessMsg && (
                <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-800 text-xs font-medium flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{syncSuccessMsg}</span>
                </div>
              )}

              {syncError && (
                <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-rose-800 text-xs font-medium flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{syncError}</span>
                </div>
              )}

              {syncTab === 'EXPORT' && (
                <div className="space-y-4">
                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-700">Active Registry Snapshot</span>
                      <span className="bg-indigo-100 text-indigo-800 font-mono font-bold px-2 py-0.5 rounded text-[11px]">
                        {assessments.length} Total Patients
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-center text-xs">
                      <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                        <div className="text-[10px] text-slate-400 uppercase font-bold">Emergency Cases</div>
                        <div className="text-sm font-black font-mono text-red-600">{emergencyCount}</div>
                      </div>
                      <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                        <div className="text-[10px] text-slate-400 uppercase font-bold">Doctor Reviewed</div>
                        <div className="text-sm font-black font-mono text-emerald-600">{reviewedCount}</div>
                      </div>
                      <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                        <div className="text-[10px] text-slate-400 uppercase font-bold">Pending CDS</div>
                        <div className="text-sm font-black font-mono text-amber-600">{assessments.length - reviewedCount}</div>
                      </div>
                    </div>
                  </div>

                  <p className="text-xs text-slate-600 leading-relaxed">
                    Exporting generates a timestamped, structured JSON archive containing all patient demographics, longitudinal vital signs, WHO cardiovascular scores, and physician sign-off stamps.
                  </p>

                  <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
                    <button
                      id="btn-download-sync-file"
                      onClick={handleExportSyncJSON}
                      className="w-full sm:w-auto px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-md flex items-center justify-center gap-2 cursor-pointer transition-all"
                    >
                      <Download className="w-4 h-4" />
                      Download Sync JSON File
                    </button>

                    <button
                      id="btn-copy-sync-json"
                      onClick={handleCopySyncJSON}
                      className="w-full sm:w-auto px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl border border-slate-200 flex items-center justify-center gap-2 cursor-pointer transition-all"
                    >
                      {copiedSyncJson ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4 text-slate-500" />}
                      {copiedSyncJson ? 'Copied to Clipboard!' : 'Copy JSON to Clipboard'}
                    </button>
                  </div>
                </div>
              )}

              {syncTab === 'IMPORT' && (
                <div className="space-y-4">
                  {/* File Drag and Drop or Browse */}
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-indigo-200 hover:border-indigo-400 bg-indigo-50/40 hover:bg-indigo-50/70 p-5 rounded-2xl text-center cursor-pointer transition-all"
                  >
                    <Upload className="w-8 h-8 text-indigo-500 mx-auto mb-2" />
                    <div className="text-xs font-bold text-slate-800">
                      Click to Browse or Drag & Drop Registry JSON File
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      Accepts HIS JSON files or clinical patient dataset exports (.json)
                    </div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".json,application/json"
                      onChange={handleSyncFileUpload}
                      className="hidden"
                    />
                  </div>

                  {/* Manual Paste Box */}
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                      <span>Or Paste JSON Content Directly:</span>
                      {syncParsedPreview && (
                        <span className="text-emerald-700 font-mono text-[11px]">
                          ✓ Validated {syncParsedPreview.length} patient records
                        </span>
                      )}
                    </label>
                    <textarea
                      rows={5}
                      value={syncJsonText}
                      onChange={(e) => handleProcessSyncJSON(e.target.value)}
                      placeholder='Paste [{"demographics": {...}, "vitals": {...}}] or HIS Sync JSON payload...'
                      className="w-full p-3 border border-slate-200 rounded-xl font-mono text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-slate-50"
                    />
                  </div>

                  {/* Sync Ingestion Strategy Selector */}
                  <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 space-y-2">
                    <span className="text-xs font-bold text-slate-800 block">Synchronization Merge Strategy:</span>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <label
                        className={`p-2.5 rounded-xl border text-xs cursor-pointer flex flex-col justify-between transition-all ${
                          syncMergeStrategy === 'MERGE'
                            ? 'bg-indigo-50 border-indigo-400 text-indigo-900 font-bold'
                            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        <div className="flex items-center gap-1.5">
                          <input
                            type="radio"
                            name="syncStrategy"
                            checked={syncMergeStrategy === 'MERGE'}
                            onChange={() => setSyncMergeStrategy('MERGE')}
                            className="text-indigo-600 focus:ring-indigo-500"
                          />
                          <span>Merge & Update</span>
                        </div>
                        <span className="text-[10px] text-slate-400 font-normal mt-1">
                          Updates existing IDs; appends new patients.
                        </span>
                      </label>

                      <label
                        className={`p-2.5 rounded-xl border text-xs cursor-pointer flex flex-col justify-between transition-all ${
                          syncMergeStrategy === 'APPEND'
                            ? 'bg-indigo-50 border-indigo-400 text-indigo-900 font-bold'
                            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        <div className="flex items-center gap-1.5">
                          <input
                            type="radio"
                            name="syncStrategy"
                            checked={syncMergeStrategy === 'APPEND'}
                            onChange={() => setSyncMergeStrategy('APPEND')}
                            className="text-indigo-600 focus:ring-indigo-500"
                          />
                          <span>Append New Only</span>
                        </div>
                        <span className="text-[10px] text-slate-400 font-normal mt-1">
                          Skips duplicates without overwriting.
                        </span>
                      </label>

                      <label
                        className={`p-2.5 rounded-xl border text-xs cursor-pointer flex flex-col justify-between transition-all ${
                          syncMergeStrategy === 'REPLACE'
                            ? 'bg-red-50 border-red-400 text-red-900 font-bold'
                            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-100'
                        }`}
                      >
                        <div className="flex items-center gap-1.5">
                          <input
                            type="radio"
                            name="syncStrategy"
                            checked={syncMergeStrategy === 'REPLACE'}
                            onChange={() => setSyncMergeStrategy('REPLACE')}
                            className="text-red-600 focus:ring-red-500"
                          />
                          <span>Replace Entire</span>
                        </div>
                        <span className="text-[10px] text-slate-400 font-normal mt-1">
                          Overrides current local database.
                        </span>
                      </label>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="bg-slate-50 border-t border-slate-200 p-4 flex items-center justify-between">
              <button
                id="btn-sync-modal-back-footer"
                onClick={() => setShowSyncModal(false)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold rounded-xl cursor-pointer transition-colors flex items-center gap-1.5"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back to Registry</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowSyncModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold rounded-xl cursor-pointer transition-colors"
                >
                  Cancel
                </button>

                {syncTab === 'IMPORT' && (
                  <button
                    id="btn-apply-sync-ingest"
                    disabled={!syncParsedPreview || syncParsedPreview.length === 0}
                    onClick={handleApplySync}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold rounded-xl shadow-md cursor-pointer transition-all flex items-center gap-1.5"
                  >
                    <RefreshCw className="w-4 h-4" />
                    Ingest & Sync Records ({syncParsedPreview?.length || 0})
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: IMPORT JSON DATA (LEGACY COMPATIBILITY) */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <button
                  id="btn-import-modal-back-header"
                  onClick={() => setShowImportModal(false)}
                  className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all flex items-center gap-1 cursor-pointer border border-slate-200 mr-1"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back</span>
                </button>
                <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                  <FileUp className="w-4 h-4 text-purple-600" />
                  Import External Patient Records / FHIR Bundle
                </h3>
              </div>
              <button onClick={() => setShowImportModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-500">
              Paste patient assessment JSON array or single object to ingest real records into the active database.
            </p>

            <textarea
              rows={8}
              value={importJsonText}
              onChange={(e) => setImportJsonText(e.target.value)}
              placeholder="Paste JSON record or array here..."
              className="w-full p-3 border border-slate-200 rounded-xl font-mono text-xs focus:ring-2 focus:ring-purple-500 focus:outline-none bg-slate-50"
            />

            {importError && (
              <div className="p-2.5 rounded-lg bg-red-50 text-red-700 text-xs border border-red-200">
                Error: {importError}
              </div>
            )}

            <div className="flex items-center justify-between pt-2">
              <button
                id="btn-import-modal-back-footer"
                onClick={() => setShowImportModal(false)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold rounded-xl cursor-pointer flex items-center gap-1.5"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Back to Registry</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowImportModal(false)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleImportJSON}
                  className="px-4 py-2 bg-purple-700 hover:bg-purple-800 text-white text-xs font-bold rounded-xl cursor-pointer"
                >
                  Ingest Records
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: BULK EXPORT & COHORT DOSSIER CENTER */}
      {showBulkModal && (() => {
        const selectedList = getSelectedRecords();
        const selCount = selectedList.length;
        const avgAge = selCount > 0 ? (selectedList.reduce((acc, p) => acc + p.demographics.age, 0) / selCount).toFixed(1) : '0';
        const maleCount = selectedList.filter(p => p.demographics.sex === 'MALE').length;
        const femaleCount = selectedList.filter(p => p.demographics.sex === 'FEMALE').length;
        const emCount = selectedList.filter(p => p.assessmentResult?.triage.level === 'LEVEL_1_EMERGENCY' || p.assessmentResult?.isEmergency).length;
        const htnCount = selectedList.filter(p => (p.vitals.systolicBp || 0) >= 140 || (p.vitals.diastolicBp || 0) >= 90).length;
        const revCount = selectedList.filter(p => !!p.doctorReview).length;

        return (
          <div className="fixed inset-0 z-50 bg-slate-900/70 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-4xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
              {/* Modal Header */}
              <div className="bg-gradient-to-r from-slate-900 via-teal-950 to-slate-900 text-white p-5 flex items-center justify-between border-b border-teal-900/50">
                <div className="flex items-center gap-3">
                  <button
                    id="btn-bulk-modal-back-header"
                    onClick={() => setShowBulkModal(false)}
                    className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border border-slate-700"
                    title="Return to Master Patient Registry"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Back to Registry</span>
                  </button>

                  <div className="w-10 h-10 rounded-2xl bg-teal-500/20 border border-teal-400/30 flex items-center justify-center text-teal-400">
                    <Layers className="w-5 h-5" />
                  </div>

                  <div>
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                      Bulk Patient Dossier & PDF Export Center
                    </h3>
                    <p className="text-xs text-teal-200">
                      Consolidated multi-patient clinical PDF document with aggregate cohort analytics cover sheet.
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setShowBulkModal(false)}
                  className="text-slate-400 hover:text-white p-1.5 rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-6 space-y-6 overflow-y-auto flex-1 text-xs">
                {/* Cohort Key Performance Metrics */}
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-800 text-xs uppercase tracking-wider">
                      Selected Cohort Profile ({selCount} Patients)
                    </span>
                    <span className="text-[11px] font-mono bg-teal-100 text-teal-800 font-bold px-2 py-0.5 rounded">
                      Consolidated Batch Mode
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 text-center">
                    <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Dossiers</span>
                      <span className="text-lg font-black font-mono text-slate-900">{selCount}</span>
                    </div>

                    <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
                      <span className="text-[10px] uppercase font-bold text-slate-400 block">Avg Age & Sex</span>
                      <span className="text-sm font-black font-mono text-slate-800">
                        {avgAge}y ({maleCount}M / {femaleCount}F)
                      </span>
                    </div>

                    <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
                      <span className="text-[10px] uppercase font-bold text-red-500 block">Emergency L1</span>
                      <span className="text-lg font-black font-mono text-red-600">{emCount}</span>
                    </div>

                    <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
                      <span className="text-[10px] uppercase font-bold text-amber-500 block">Stage 2 HTN</span>
                      <span className="text-lg font-black font-mono text-amber-600">{htnCount}</span>
                    </div>

                    <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
                      <span className="text-[10px] uppercase font-bold text-emerald-500 block">Doctor Signed</span>
                      <span className="text-lg font-black font-mono text-emerald-600">{revCount}</span>
                    </div>
                  </div>
                </div>

                {/* PDF Configuration Controls */}
                <div className="p-4 bg-teal-50/60 border border-teal-200 rounded-2xl space-y-3">
                  <h4 className="font-bold text-teal-950 text-xs flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-teal-600" />
                    Consolidated PDF Report Settings
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] font-bold text-slate-700 block mb-1">
                        Report Dossier Header Title:
                      </label>
                      <input
                        type="text"
                        value={bulkBatchTitle}
                        onChange={(e) => setBulkBatchTitle(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-teal-500 focus:outline-none"
                      />
                    </div>

                    <div className="flex flex-col justify-end">
                      <label className="flex items-center gap-2 p-2 bg-white rounded-xl border border-slate-200 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={bulkIncludeCoverPage}
                          onChange={(e) => setBulkIncludeCoverPage(e.target.checked)}
                          className="w-4 h-4 text-teal-600 rounded focus:ring-teal-500 cursor-pointer"
                        />
                        <span className="text-xs font-bold text-slate-800">
                          Include Executive Aggregate Analytics Cover Page
                        </span>
                      </label>
                    </div>
                  </div>
                </div>

                {/* Queue of Selected Patients */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-slate-800 text-xs">
                      Patient Dossiers in PDF Compilation ({selCount}):
                    </h4>
                    <button
                      onClick={handleClearSelection}
                      className="text-xs text-rose-600 hover:text-rose-800 font-semibold cursor-pointer"
                    >
                      Clear Selection
                    </button>
                  </div>

                  {selCount === 0 ? (
                    <div className="p-8 text-center bg-slate-50 rounded-2xl border border-slate-200 text-slate-400">
                      No patients currently selected. Use the checkboxes in the registry to select patients for bulk export.
                    </div>
                  ) : (
                    <div className="max-h-60 overflow-y-auto divide-y divide-slate-100 border border-slate-200 rounded-2xl bg-white shadow-2xs">
                      {selectedList.map((p, idx) => (
                        <div key={p.demographics.patientId} className="p-3 flex items-center justify-between hover:bg-slate-50 transition-colors">
                          <div className="flex items-center gap-3">
                            <span className="text-[11px] font-mono text-slate-400 w-5 text-right font-bold">
                              {idx + 1}.
                            </span>
                            <div>
                              <div className="font-bold text-slate-900 flex items-center gap-2">
                                <span>{p.demographics.fullName}</span>
                                <span className="text-[10px] font-mono text-slate-400">
                                  ({p.demographics.patientId})
                                </span>
                              </div>
                              <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-2">
                                <span>{p.demographics.age}yo {p.demographics.sex}</span>
                                <span>•</span>
                                <span>BP: {p.vitals.systolicBp}/{p.vitals.diastolicBp}</span>
                                <span>•</span>
                                <span>{p.demographics.district}</span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              p.assessmentResult?.triage.level === 'LEVEL_1_EMERGENCY'
                                ? 'bg-red-100 text-red-700'
                                : 'bg-slate-100 text-slate-700'
                            }`}>
                              {p.assessmentResult?.triage.levelName || 'Routine'}
                            </span>
                            <button
                              onClick={() => handleToggleSelect(p.demographics.patientId)}
                              className="p-1 text-slate-400 hover:text-red-600 rounded cursor-pointer"
                              title="Remove from batch"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Modal Footer */}
              <div className="bg-slate-50 border-t border-slate-200 p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
                <button
                  id="btn-bulk-modal-back-footer"
                  onClick={() => setShowBulkModal(false)}
                  className="w-full sm:w-auto px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold rounded-xl cursor-pointer flex items-center justify-center gap-1.5 transition-colors"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back to Patient Registry</span>
                </button>

                <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-end">
                  <button
                    onClick={handleBulkExportFHIR}
                    disabled={selCount === 0}
                    className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl border border-slate-200 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <FileCode className="w-3.5 h-3.5 text-purple-600" />
                    <span>Export FHIR Bundle</span>
                  </button>

                  <button
                    onClick={handleBulkExportCSV}
                    disabled={selCount === 0}
                    className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl border border-slate-200 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <FileText className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Export CSV</span>
                  </button>

                  <button
                    id="btn-bulk-modal-generate-pdf"
                    disabled={selCount === 0 || isBulkExportingPdf}
                    onClick={handleExecuteBulkPdfExport}
                    className="px-5 py-2 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-md flex items-center gap-2 cursor-pointer transition-all"
                  >
                    {isBulkExportingPdf ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>Generating Consolidated PDF...</span>
                      </>
                    ) : (
                      <>
                        <FileDown className="w-4 h-4" />
                        <span>Download Consolidated PDF ({selCount})</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Interactive Longitudinal Vital Trends Modal (Recharts) */}
      {(selectedTrendPatient || viewingRecord) && (
        <VitalTrendsModal
          isOpen={showTrendsModal}
          onClose={() => {
            setShowTrendsModal(false);
            setSelectedTrendPatient(null);
          }}
          patient={selectedTrendPatient || viewingRecord!}
        />
      )}
    </div>
  );
};
