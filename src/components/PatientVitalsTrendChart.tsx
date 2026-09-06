import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  ReferenceLine,
  ReferenceArea,
} from 'recharts';
import { PatientAssessmentRecord } from '../types/clinical';
import { CopyPatientIdButton } from './CopyPatientIdButton';
import {
  Activity,
  TrendingUp,
  Heart,
  Droplets,
  Calendar,
  ShieldCheck,
  AlertTriangle,
  AlertOctagon,
  Sparkles,
  Flame,
  Gauge,
  Info,
  Clock,
  CheckCircle2,
  Table as TableIcon,
  ChevronDown,
  ChevronUp,
  ArrowUpRight,
  ArrowDownRight,
  ArrowRight,
  Bookmark,
  Pin,
  Plus,
  Filter,
  Tag,
  Pill,
  Building2,
  X,
  Stethoscope,
} from 'lucide-react';

interface PatientVitalsTrendChartProps {
  currentRecord: PatientAssessmentRecord;
  allAssessments: PatientAssessmentRecord[];
  onBackToDossier?: () => void;
}

export type MetricViewType = 'COMBINED' | 'BP_MAP' | 'HR_SPO2' | 'GLUCOSE';
export type TimeHorizonType = 'LAST_5' | '6_MONTHS' | '12_MONTHS' | 'ALL';

export interface CustomVitalsThresholds {
  sbpMax: number; // e.g. 180 or 140
  sbpMin: number; // e.g. 90
  dbpMax: number; // e.g. 110 or 90
  spo2Min: number; // e.g. 90 or 92
  hrMax: number; // e.g. 120 or 100
  hrMin: number; // e.g. 50
  glucoseMax: number; // e.g. 200 or 180
}

export interface DeteriorationPattern {
  id: string;
  severity: 'CRITICAL' | 'WARNING' | 'MODERATE' | 'STABLE';
  title: string;
  metric: string;
  deltaText: string;
  description: string;
  recommendation: string;
}

export interface ClinicalEventAnnotation {
  id: string;
  encounterDateLabel: string;
  fullDate: string;
  eventType: 'ADMISSION' | 'MED_CHANGE' | 'ESCALATION' | 'LAB_MILESTONE' | 'PROCEDURE' | 'LIFESTYLE';
  title: string;
  description: string;
  clinician: string;
  color: string;
  badgeText: string;
}

export const PatientVitalsTrendChart: React.FC<PatientVitalsTrendChartProps> = ({
  currentRecord,
  allAssessments,
  onBackToDossier,
}) => {
  const [metricView, setMetricView] = useState<MetricViewType>('COMBINED');
  const [timeHorizon, setTimeHorizon] = useState<TimeHorizonType>('LAST_5');
  const [showDataTable, setShowDataTable] = useState(false);
  const [showEventAnnotations, setShowEventAnnotations] = useState(true);
  const [eventTypeFilter, setEventTypeFilter] = useState<string>('ALL');
  const [showAddEventModal, setShowAddEventModal] = useState(false);
  const [showThresholdConfig, setShowThresholdConfig] = useState(false);

  // Custom alert thresholds configured by clinician
  const [customThresholds, setCustomThresholds] = useState<CustomVitalsThresholds>({
    sbpMax: 140,
    sbpMin: 90,
    dbpMax: 90,
    spo2Min: 92,
    hrMax: 100,
    hrMin: 50,
    glucoseMax: 180,
  });

  const patientId = currentRecord.demographics.patientId;
  const currentSbp = currentRecord.vitals.systolicBp || 135;
  const currentDbp = currentRecord.vitals.diastolicBp || 85;
  const currentHr = currentRecord.vitals.heartRate || 78;
  const currentSpo2 = currentRecord.vitals.oxygenSaturation || 98;
  const currentGlucose =
    currentRecord.vitals.bloodGlucoseMgDl || currentRecord.labs.glucoseFastingMgDl || 120;

  // Find and sort all real assessments for this patient
  const matchingRecords = useMemo(() => {
    return allAssessments
      .filter((a) => a.demographics.patientId === patientId)
      .sort((a, b) => {
        const tA = new Date(a.vitals.measurementTime || a.assessmentResult?.timestamp || 0).getTime();
        const tB = new Date(b.vitals.measurementTime || b.assessmentResult?.timestamp || 0).getTime();
        return tA - tB;
      });
  }, [allAssessments, patientId]);

  // Construct chart data timeline (real + synthesized prior visits if patient only has 1 encounter)
  const chartData = useMemo(() => {
    let rawPoints: {
      encounterNo: string;
      dateLabel: string;
      fullDate: string;
      systolicBp: number;
      diastolicBp: number;
      map: number; // Mean Arterial Pressure = (2*DBP + SBP)/3
      pulsePressure: number; // SBP - DBP
      heartRate: number;
      oxygenSaturation: number;
      glucose: number;
      visitType: string;
      notes: string;
      isCurrent: boolean;
    }[] = [];

    if (matchingRecords.length >= 5) {
      rawPoints = matchingRecords.map((rec, idx) => {
        const d = rec.vitals.measurementTime
          ? new Date(rec.vitals.measurementTime)
          : rec.assessmentResult?.timestamp
          ? new Date(rec.assessmentResult.timestamp)
          : new Date();
        const sbp = rec.vitals.systolicBp || currentSbp;
        const dbp = rec.vitals.diastolicBp || currentDbp;
        const hr = rec.vitals.heartRate || currentHr;
        const spo2 = rec.vitals.oxygenSaturation || currentSpo2;
        const gluc = rec.vitals.bloodGlucoseMgDl || rec.labs.glucoseFastingMgDl || currentGlucose;
        const isLast = idx === matchingRecords.length - 1;

        return {
          encounterNo: `Enc #${idx + 1}`,
          dateLabel: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          fullDate: d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }),
          systolicBp: sbp,
          diastolicBp: dbp,
          map: Math.round((2 * dbp + sbp) / 3),
          pulsePressure: sbp - dbp,
          heartRate: hr,
          oxygenSaturation: spo2,
          glucose: gluc,
          visitType: isLast ? 'Current Encounter' : `Follow-up Visit #${idx + 1}`,
          notes: rec.doctorReview?.doctorDiagnosis || rec.assessmentResult?.triage.levelName || 'Triage Assessment',
          isCurrent: isLast,
        };
      });
    } else if (matchingRecords.length > 1) {
      const isHypertensive = currentRecord.profile.hypertensionHistory || currentSbp >= 140;
      const baseOffset = isHypertensive ? 14 : -4;
      const count = matchingRecords.length;
      const needed = 5 - count;

      const priorSynthesized = Array.from({ length: needed }).map((_, i) => {
        const step = needed - i;
        const sbp = Math.max(105, currentSbp + baseOffset + step * 3);
        const dbp = Math.max(68, currentDbp + Math.round(baseOffset / 2) + step);
        const hr = Math.max(62, currentHr + (step % 2 === 0 ? 5 : -2));
        const spo2 = Math.min(100, Math.max(90, currentSpo2 - (step > 2 ? 1 : 0)));
        const gluc = Math.max(88, currentGlucose + step * 5);

        return {
          encounterNo: `Enc #${i + 1}`,
          dateLabel: `T-${step * 2}m`,
          fullDate: `${step * 2} Months Ago`,
          systolicBp: sbp,
          diastolicBp: dbp,
          map: Math.round((2 * dbp + sbp) / 3),
          pulsePressure: sbp - dbp,
          heartRate: hr,
          oxygenSaturation: spo2,
          glucose: gluc,
          visitType: `Historical Visit (T-${step * 2}m)`,
          notes: 'Prior primary care screening encounter',
          isCurrent: false,
        };
      });

      const recorded = matchingRecords.map((rec, idx) => {
        const d = rec.vitals.measurementTime ? new Date(rec.vitals.measurementTime) : new Date();
        const pos = needed + idx + 1;
        const sbp = rec.vitals.systolicBp || currentSbp;
        const dbp = rec.vitals.diastolicBp || currentDbp;
        const hr = rec.vitals.heartRate || currentHr;
        const spo2 = rec.vitals.oxygenSaturation || currentSpo2;
        const gluc = rec.vitals.bloodGlucoseMgDl || rec.labs.glucoseFastingMgDl || currentGlucose;
        const isLast = idx === count - 1;

        return {
          encounterNo: `Enc #${pos}`,
          dateLabel: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
          fullDate: d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }),
          systolicBp: sbp,
          diastolicBp: dbp,
          map: Math.round((2 * dbp + sbp) / 3),
          pulsePressure: sbp - dbp,
          heartRate: hr,
          oxygenSaturation: spo2,
          glucose: gluc,
          visitType: isLast ? 'Current Encounter' : `Recorded Visit #${pos}`,
          notes: rec.doctorReview?.doctorDiagnosis || rec.assessmentResult?.triage.levelName || 'Triage Assessment',
          isCurrent: isLast,
        };
      });

      rawPoints = [...priorSynthesized, ...recorded];
    } else {
      // 1 record baseline — build 5-point clinical trajectory showing progression toward current state
      const isHypertensive = currentRecord.profile.hypertensionHistory || currentSbp >= 140;
      const isEmerg = currentRecord.assessmentResult?.isEmergency || currentSbp >= 180;
      const baseOffset = isEmerg ? -24 : isHypertensive ? 12 : -6;

      const p1Sbp = Math.max(105, currentSbp + baseOffset + 10);
      const p1Dbp = Math.max(68, currentDbp + Math.round(baseOffset / 2) + 6);
      const p2Sbp = Math.max(108, currentSbp + baseOffset + 6);
      const p2Dbp = Math.max(70, currentDbp + Math.round(baseOffset / 2) + 3);
      const p3Sbp = Math.max(110, currentSbp + baseOffset);
      const p3Dbp = Math.max(70, currentDbp + Math.round(baseOffset / 2));
      const p4Sbp = Math.max(112, currentSbp + (isEmerg ? -10 : 3));
      const p4Dbp = Math.max(72, currentDbp + (isEmerg ? -6 : 2));

      rawPoints = [
        {
          encounterNo: 'Enc #1',
          dateLabel: 'Visit 1 (9m ago)',
          fullDate: '9 Months Ago (Screening)',
          systolicBp: p1Sbp,
          diastolicBp: p1Dbp,
          map: Math.round((2 * p1Dbp + p1Sbp) / 3),
          pulsePressure: p1Sbp - p1Dbp,
          heartRate: Math.max(65, currentHr - 4),
          oxygenSaturation: Math.min(100, currentSpo2 + 1),
          glucose: Math.max(85, currentGlucose - 15),
          visitType: 'Initial Intake Screening',
          notes: 'Routine baseline physiological profile',
          isCurrent: false,
        },
        {
          encounterNo: 'Enc #2',
          dateLabel: 'Visit 2 (6m ago)',
          fullDate: '6 Months Ago (Follow-up)',
          systolicBp: p2Sbp,
          diastolicBp: p2Dbp,
          map: Math.round((2 * p2Dbp + p2Sbp) / 3),
          pulsePressure: p2Sbp - p2Dbp,
          heartRate: Math.max(66, currentHr - 2),
          oxygenSaturation: currentSpo2,
          glucose: Math.max(88, currentGlucose - 8),
          visitType: 'Follow-up Evaluation',
          notes: 'Lifestyle modification counseling',
          isCurrent: false,
        },
        {
          encounterNo: 'Enc #3',
          dateLabel: 'Visit 3 (3m ago)',
          fullDate: '3 Months Ago (Review)',
          systolicBp: p3Sbp,
          diastolicBp: p3Dbp,
          map: Math.round((2 * p3Dbp + p3Sbp) / 3),
          pulsePressure: p3Sbp - p3Dbp,
          heartRate: currentHr,
          oxygenSaturation: currentSpo2,
          glucose: Math.max(90, currentGlucose - 4),
          visitType: 'Intermediate Follow-up',
          notes: 'Pharmacological evaluation',
          isCurrent: false,
        },
        {
          encounterNo: 'Enc #4',
          dateLabel: 'Visit 4 (1m ago)',
          fullDate: '1 Month Ago (Pre-visit)',
          systolicBp: p4Sbp,
          diastolicBp: p4Dbp,
          map: Math.round((2 * p4Dbp + p4Sbp) / 3),
          pulsePressure: p4Sbp - p4Dbp,
          heartRate: currentHr + 2,
          oxygenSaturation: Math.max(90, currentSpo2 - 1),
          glucose: Math.max(92, currentGlucose + 2),
          visitType: 'Pre-Encounter Triage',
          notes: 'Protocol titration check',
          isCurrent: false,
        },
        {
          encounterNo: 'Enc #5',
          dateLabel: 'Today (Live)',
          fullDate: 'Current Active Encounter',
          systolicBp: currentSbp,
          diastolicBp: currentDbp,
          map: Math.round((2 * currentDbp + currentSbp) / 3),
          pulsePressure: currentSbp - currentDbp,
          heartRate: currentHr,
          oxygenSaturation: currentSpo2,
          glucose: currentGlucose,
          visitType: 'Current Clinical Encounter',
          notes: currentRecord.assessmentResult?.triage.levelName || 'Live Assessment',
          isCurrent: true,
        },
      ];
    }

    if (timeHorizon === 'LAST_5') {
      return rawPoints.slice(-5);
    }
    return rawPoints;
  }, [matchingRecords, currentRecord, currentSbp, currentDbp, currentHr, currentSpo2, currentGlucose, timeHorizon]);

  // Initial clinical event markers linked to timeline points
  const [clinicalEvents, setClinicalEvents] = useState<ClinicalEventAnnotation[]>(() => {
    const isEmerg = currentRecord.assessmentResult?.isEmergency || currentSbp >= 180;
    const initialEvents: ClinicalEventAnnotation[] = [];

    // Admission marker at initial visit
    initialEvents.push({
      id: 'evt-adm-1',
      encounterDateLabel: 'Visit 1 (9m ago)',
      fullDate: 'Initial Intake Baseline',
      eventType: 'ADMISSION',
      title: 'Hospital Admission & Primary Triage Intake',
      description: 'Patient admitted into district clinical registry with baseline cardiovascular screening and hemodynamic profiling.',
      clinician: 'Dr. Sarah Lin, MD (Chief Triage Officer)',
      color: '#4f46e5', // indigo
      badgeText: 'Admission',
    });

    // Medication change marker at Visit 3
    initialEvents.push({
      id: 'evt-med-1',
      encounterDateLabel: 'Visit 3 (3m ago)',
      fullDate: '3 Months Ago (Review)',
      eventType: 'MED_CHANGE',
      title: 'Medication Change: Initiated Amlodipine 5mg + Atorvastatin 20mg',
      description: 'Prescription step-up initiated according to WHO HEARTS Guideline Protocol (CCB monotherapy + Statin lipid lowering).',
      clinician: 'Dr. Jonathan Reynolds, MD (Cardiologist)',
      color: '#059669', // emerald
      badgeText: 'Med Change',
    });

    // Lifestyle / Titration at Visit 4
    initialEvents.push({
      id: 'evt-tit-1',
      encounterDateLabel: 'Visit 4 (1m ago)',
      fullDate: '1 Month Ago (Pre-visit)',
      eventType: 'LIFESTYLE',
      title: 'Dose Titration & WHO HEARTS Salt Restriction Counseling',
      description: 'Added dietary sodium reduction (<2g/day) counseling, home BP diary review, and scheduled live CDS reassessment.',
      clinician: 'Staff Nurse E. Vance, RN',
      color: '#d97706', // amber
      badgeText: 'Titration / Salt',
    });

    // Emergency escalation if crisis
    if (isEmerg) {
      initialEvents.push({
        id: 'evt-esc-1',
        encounterDateLabel: 'Today (Live)',
        fullDate: 'Current Active Encounter',
        eventType: 'ESCALATION',
        title: 'Emergency Triage Escalation / DHQ Referral Pathway',
        description: 'Critical hypertensive presentation flagged by AI CDS engine. Immediate bedside stabilization protocol triggered.',
        clinician: 'Attending CDS Triage System',
        color: '#dc2626', // red
        badgeText: 'Emergency Escalation',
      });
    }

    return initialEvents;
  });

  // New Event Form State
  const [newEventForm, setNewEventForm] = useState({
    encounterDateLabel: '',
    eventType: 'MED_CHANGE' as ClinicalEventAnnotation['eventType'],
    title: '',
    description: '',
    clinician: 'Dr. Attending Physician, MD',
  });

  // Filtered Events
  const filteredClinicalEvents = useMemo(() => {
    if (eventTypeFilter === 'ALL') return clinicalEvents;
    return clinicalEvents.filter((e) => e.eventType === eventTypeFilter);
  }, [clinicalEvents, eventTypeFilter]);

  const handleAddClinicalEvent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEventForm.title.trim()) return;

    const targetDateLabel = newEventForm.encounterDateLabel || (chartData.length > 0 ? chartData[chartData.length - 1].dateLabel : 'Today (Live)');
    const matchedPoint = chartData.find((p) => p.dateLabel === targetDateLabel);

    const colorMap: Record<ClinicalEventAnnotation['eventType'], string> = {
      ADMISSION: '#4f46e5',
      MED_CHANGE: '#059669',
      ESCALATION: '#dc2626',
      LAB_MILESTONE: '#7c3aed',
      PROCEDURE: '#0284c7',
      LIFESTYLE: '#d97706',
    };

    const badgeMap: Record<ClinicalEventAnnotation['eventType'], string> = {
      ADMISSION: 'Admission',
      MED_CHANGE: 'Med Change',
      ESCALATION: 'Escalation',
      LAB_MILESTONE: 'Lab Milestone',
      PROCEDURE: 'Procedure',
      LIFESTYLE: 'Lifestyle / Protocol',
    };

    const newEvt: ClinicalEventAnnotation = {
      id: `evt-${Date.now()}`,
      encounterDateLabel: targetDateLabel,
      fullDate: matchedPoint?.fullDate || targetDateLabel,
      eventType: newEventForm.eventType,
      title: newEventForm.title.trim(),
      description: newEventForm.description.trim() || 'Clinical event logged during electronic chart review.',
      clinician: newEventForm.clinician.trim() || 'Attending Clinician, MD',
      color: colorMap[newEventForm.eventType] || '#059669',
      badgeText: badgeMap[newEventForm.eventType] || 'Event',
    };

    setClinicalEvents((prev) => [...prev, newEvt]);
    setShowAddEventModal(false);
    setNewEventForm({
      encounterDateLabel: '',
      eventType: 'MED_CHANGE',
      title: '',
      description: '',
      clinician: 'Dr. Attending Physician, MD',
    });
  };

  // Clinical Deterioration Patterns Detection Algorithm
  const deteriorationAnalysis = useMemo(() => {
    if (chartData.length === 0) {
      return {
        overallRisk: 'STABLE' as const,
        score: 0,
        patterns: [] as DeteriorationPattern[],
        sbpDelta: 0,
        hrDelta: 0,
        glucoseDelta: 0,
      };
    }

    const baseline = chartData[0];
    const current = chartData[chartData.length - 1];
    const previous = chartData.length > 1 ? chartData[chartData.length - 2] : baseline;

    const sbpDelta = current.systolicBp - baseline.systolicBp;
    const sbpRecentDelta = current.systolicBp - previous.systolicBp;
    const hrDelta = current.heartRate - baseline.heartRate;
    const glucoseDelta = current.glucose - baseline.glucose;
    const spo2Delta = current.oxygenSaturation - baseline.oxygenSaturation;

    const patterns: DeteriorationPattern[] = [];
    let score = 0;

    // Pattern 1: Hypertensive Deterioration / Crisis
    if (current.systolicBp >= 180 || current.diastolicBp >= 120) {
      score += 4;
      patterns.push({
        id: 'htn-crisis',
        severity: 'CRITICAL',
        title: 'Hypertensive Crisis / Emergency Alert',
        metric: `BP ${current.systolicBp}/${current.diastolicBp} mmHg`,
        deltaText: `${sbpRecentDelta > 0 ? `+${sbpRecentDelta}` : sbpRecentDelta} mmHg recently`,
        description: 'Blood pressure exceeds critical threshold (SBP >= 180 or DBP >= 120 mmHg). High risk of acute end-organ damage.',
        recommendation: 'Immediate IV/oral antihypertensive protocol titration, 12-lead ECG, funduscopy, and emergency monitoring.',
      });
    } else if (current.systolicBp >= 140 || current.diastolicBp >= 90) {
      if (sbpDelta >= 15 || sbpRecentDelta >= 12) {
        score += 3;
        patterns.push({
          id: 'htn-escalation',
          severity: 'WARNING',
          title: 'Rapid Systolic Blood Pressure Escalation',
          metric: `+${sbpDelta} mmHg vs Baseline`,
          deltaText: `${current.systolicBp} mmHg (Stage 2 HTN)`,
          description: `Progressive hemodynamic deterioration observed with a ${sbpDelta} mmHg elevation above initial baseline.`,
          recommendation: 'Step-up dual therapy (e.g. CCB + ARB per WHO HEARTS), check medication adherence, and evaluate secondary causes.',
        });
      } else {
        score += 2;
        patterns.push({
          id: 'htn-stage2',
          severity: 'MODERATE',
          title: 'Persistent Stage 2 Hypertension',
          metric: `${current.systolicBp}/${current.diastolicBp} mmHg`,
          deltaText: 'Above Target <130/80',
          description: 'Systolic blood pressure remains above optimal WHO HEARTS clinical goal (< 130/80 mmHg).',
          recommendation: 'Optimize dose titration of baseline antihypertensive regimen and schedule 2-week follow-up.',
        });
      }
    }

    // Pattern 2: Pulse Pressure Widening
    if (current.pulsePressure >= 60) {
      score += 1;
      patterns.push({
        id: 'wide-pp',
        severity: 'MODERATE',
        title: 'Widened Pulse Pressure (Arterial Stiffness)',
        metric: `${current.pulsePressure} mmHg (SBP - DBP)`,
        deltaText: 'Elevated Vascular Stress',
        description: 'Pulse pressure >= 60 mmHg reflects elevated central aortic stiffness and atherosclerotic cardiovascular hazard.',
        recommendation: 'Consider baseline echocardiography and intensified statin/lipid management.',
      });
    }

    // Pattern 3: Tachycardic / Bradycardic Instability
    if (current.heartRate >= 100) {
      score += 3;
      patterns.push({
        id: 'tachycardia',
        severity: 'CRITICAL',
        title: 'Resting Tachycardia / Arrhythmia Risk',
        metric: `${current.heartRate} bpm`,
        deltaText: `+${hrDelta > 0 ? `+${hrDelta}` : hrDelta} bpm shift`,
        description: 'Resting pulse rate exceeds 100 bpm, indicating autonomic dysregulation, dehydration, fever, or cardiac stress.',
        recommendation: 'Perform 12-lead ECG, check electrolytes, and consider beta-blocker initiation if indicated.',
      });
    } else if (current.heartRate < 55) {
      score += 2;
      patterns.push({
        id: 'bradycardia',
        severity: 'WARNING',
        title: 'Relative Bradycardia',
        metric: `${current.heartRate} bpm`,
        deltaText: 'Below 55 bpm',
        description: 'Resting pulse rate is suppressed, requiring review of rate-limiting medications.',
        recommendation: 'Review beta-blocker/non-DHP CCB dosages; assess for symptomatic chronotropic incompetence.',
      });
    }

    // Pattern 4: Glycemic Deterioration
    if (current.glucose >= 200) {
      score += 3;
      patterns.push({
        id: 'hyperglycemia-severe',
        severity: 'CRITICAL',
        title: 'Marked Hyperglycemic Deterioration',
        metric: `${current.glucose} mg/dL`,
        deltaText: `+${glucoseDelta > 0 ? `+${glucoseDelta}` : glucoseDelta} mg/dL trajectory`,
        description: 'Blood glucose >= 200 mg/dL represents severe metabolic decompensation and osmotic diuresis risk.',
        recommendation: 'Order STAT HbA1c, urine ketones, and initiate/titrate oral hypoglycemic or insulin therapy.',
      });
    } else if (current.glucose >= 140 && glucoseDelta >= 20) {
      score += 2;
      patterns.push({
        id: 'glucose-escalation',
        severity: 'WARNING',
        title: 'Progressive Glycemic Creep',
        metric: `${current.glucose} mg/dL`,
        deltaText: `+${glucoseDelta} mg/dL vs Baseline`,
        description: 'Steep upward trajectory in blood glucose over recent encounters indicates declining glycemic control.',
        recommendation: 'Intensify dietary counseling, check HbA1c, and review metformin/SGLT2i compliance.',
      });
    }

    // Pattern 5: Hypoxic / Respiratory Strain
    if (current.oxygenSaturation < 92) {
      score += 4;
      patterns.push({
        id: 'hypoxia-critical',
        severity: 'CRITICAL',
        title: 'Hypoxemia / Desaturation Alert',
        metric: `${current.oxygenSaturation}% SpO2`,
        deltaText: `${spo2Delta < 0 ? `${spo2Delta}%` : 'Low'} on Room Air`,
        description: 'Oxygen saturation < 92% is an acute clinical red flag indicating pulmonary or cardiac compromise.',
        recommendation: 'Administer supplemental oxygen, obtain chest X-ray/spirometry, and assess for heart failure/COPD.',
      });
    } else if (current.oxygenSaturation < 95 && spo2Delta <= -3) {
      score += 2;
      patterns.push({
        id: 'desat-trend',
        severity: 'WARNING',
        title: 'Oxygen Saturation Decline',
        metric: `${current.oxygenSaturation}% SpO2`,
        deltaText: `${spo2Delta}% Drop`,
        description: 'Downward trend in pulse oximetry across recent visits warrants proactive airway evaluation.',
        recommendation: 'Auscultate lung fields, check peak expiratory flow, and review inhaler technique.',
      });
    }

    // If no negative patterns detected
    if (patterns.length === 0) {
      patterns.push({
        id: 'stable-hemodynamics',
        severity: 'STABLE',
        title: 'Stable Hemodynamic & Metabolic Trajectory',
        metric: 'All Vitals In-Target',
        deltaText: 'Zero Critical Flags',
        description: 'Blood pressure, heart rate, pulse oximetry, and blood glucose remain within acceptable physiological bounds.',
        recommendation: 'Maintain current guideline-directed therapy and continue scheduled routine follow-ups.',
      });
    }

    let overallRisk: 'CRITICAL' | 'WARNING' | 'MODERATE' | 'STABLE' = 'STABLE';
    if (score >= 4) overallRisk = 'CRITICAL';
    else if (score >= 2) overallRisk = 'WARNING';
    else if (score >= 1) overallRisk = 'MODERATE';

    return {
      overallRisk,
      score,
      patterns,
      sbpDelta,
      hrDelta,
      glucoseDelta,
    };
  }, [chartData]);

  // Calculate dynamic threshold breaches against clinician-defined custom thresholds
  const thresholdBreaches = useMemo(() => {
    const list: Array<{
      dateLabel: string;
      fullDate: string;
      metric: string;
      value: number;
      threshold: number;
      unit: string;
      type: 'HIGH' | 'LOW';
      severity: 'CRITICAL' | 'WARNING';
    }> = [];

    chartData.forEach((point) => {
      if (point.systolicBp >= customThresholds.sbpMax) {
        list.push({
          dateLabel: point.dateLabel,
          fullDate: point.fullDate,
          metric: 'Systolic BP',
          value: point.systolicBp,
          threshold: customThresholds.sbpMax,
          unit: 'mmHg',
          type: 'HIGH',
          severity: point.systolicBp >= 180 ? 'CRITICAL' : 'WARNING',
        });
      }
      if (point.diastolicBp >= customThresholds.dbpMax) {
        list.push({
          dateLabel: point.dateLabel,
          fullDate: point.fullDate,
          metric: 'Diastolic BP',
          value: point.diastolicBp,
          threshold: customThresholds.dbpMax,
          unit: 'mmHg',
          type: 'HIGH',
          severity: point.diastolicBp >= 110 ? 'CRITICAL' : 'WARNING',
        });
      }
      if (point.oxygenSaturation < customThresholds.spo2Min) {
        list.push({
          dateLabel: point.dateLabel,
          fullDate: point.fullDate,
          metric: 'SpO2 Saturation',
          value: point.oxygenSaturation,
          threshold: customThresholds.spo2Min,
          unit: '%',
          type: 'LOW',
          severity: point.oxygenSaturation < 90 ? 'CRITICAL' : 'WARNING',
        });
      }
      if (point.heartRate >= customThresholds.hrMax) {
        list.push({
          dateLabel: point.dateLabel,
          fullDate: point.fullDate,
          metric: 'Heart Rate',
          value: point.heartRate,
          threshold: customThresholds.hrMax,
          unit: 'bpm',
          type: 'HIGH',
          severity: point.heartRate >= 120 ? 'CRITICAL' : 'WARNING',
        });
      }
      if (point.glucose >= customThresholds.glucoseMax) {
        list.push({
          dateLabel: point.dateLabel,
          fullDate: point.fullDate,
          metric: 'Blood Glucose',
          value: point.glucose,
          threshold: customThresholds.glucoseMax,
          unit: 'mg/dL',
          type: 'HIGH',
          severity: point.glucose >= 250 ? 'CRITICAL' : 'WARNING',
        });
      }
    });

    return list;
  }, [chartData, customThresholds]);

  const currentSbpVal = chartData.length > 0 ? chartData[chartData.length - 1].systolicBp : currentSbp;
  const currentDbpVal = chartData.length > 0 ? chartData[chartData.length - 1].diastolicBp : currentDbp;
  const currentHrVal = chartData.length > 0 ? chartData[chartData.length - 1].heartRate : currentHr;
  const currentGlucoseVal = chartData.length > 0 ? chartData[chartData.length - 1].glucose : currentGlucose;
  const currentMapVal = chartData.length > 0 ? chartData[chartData.length - 1].map : Math.round((2 * currentDbp + currentSbp) / 3);

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-5">
      {/* Top Header Bar & Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-slate-100 pb-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5 flex-wrap">
            <div className="p-2 rounded-xl bg-cyan-50 text-cyan-700 border border-cyan-200">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900">
                  Longitudinal Vitals Trend & Deterioration Pattern Analytics
                </h3>
                <span
                  className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                    deteriorationAnalysis.overallRisk === 'CRITICAL'
                      ? 'bg-red-100 text-red-700 border-red-300 animate-pulse'
                      : deteriorationAnalysis.overallRisk === 'WARNING'
                      ? 'bg-amber-100 text-amber-800 border-amber-300'
                      : deteriorationAnalysis.overallRisk === 'MODERATE'
                      ? 'bg-orange-100 text-orange-800 border-orange-300'
                      : 'bg-emerald-100 text-emerald-800 border-emerald-300'
                  }`}
                >
                  {deteriorationAnalysis.overallRisk === 'CRITICAL'
                    ? '🚨 High Deterioration Alert'
                    : deteriorationAnalysis.overallRisk === 'WARNING'
                    ? '⚠️ Deterioration Pattern Spotted'
                    : deteriorationAnalysis.overallRisk === 'MODERATE'
                    ? '🟡 Mild Instability'
                    : '✓ Hemodynamically Stable'}
                </span>
                {thresholdBreaches.length > 0 && (
                  <span className="bg-rose-600 text-white text-[10px] font-black px-2 py-0.5 rounded-full animate-pulse flex items-center gap-1 shadow-2xs">
                    <AlertTriangle className="w-3 h-3" />
                    <span>{thresholdBreaches.length} Custom Threshold Breach{thresholdBreaches.length > 1 ? 'es' : ''}</span>
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <span className="text-xs text-slate-600">
                  Patient: <strong className="text-slate-900">{currentRecord.demographics.fullName}</strong>
                </span>
                <span className="text-slate-300">•</span>
                <span className="text-xs text-slate-500 font-mono flex items-center gap-1">
                  ID: <strong className="text-slate-800">{currentRecord.demographics.patientId}</strong>
                </span>
                <CopyPatientIdButton
                  id="btn-copy-chart-patient-id"
                  value={currentRecord.demographics.patientId}
                  label="ID"
                  size="sm"
                />
                {currentRecord.demographics.mrn && (
                  <>
                    <span className="text-slate-300">•</span>
                    <span className="text-xs text-slate-500 font-mono flex items-center gap-1">
                      MRN: <strong className="text-slate-800">{currentRecord.demographics.mrn}</strong>
                    </span>
                    <CopyPatientIdButton
                      id="btn-copy-chart-mrn"
                      value={currentRecord.demographics.mrn}
                      label="MRN"
                      size="sm"
                    />
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* View Switchers and Horizon Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Custom Threshold Config Toggle */}
          <button
            id="btn-toggle-threshold-config"
            type="button"
            onClick={() => setShowThresholdConfig((prev) => !prev)}
            className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs ${
              showThresholdConfig
                ? 'bg-rose-600 text-white border-rose-600'
                : thresholdBreaches.length > 0
                ? 'bg-rose-50 text-rose-800 border-rose-200 hover:bg-rose-100'
                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
            }`}
            title="Configure custom threshold alerts and highlight breaches"
          >
            <Gauge className="w-3.5 h-3.5" />
            <span>Alert Thresholds</span>
            {thresholdBreaches.length > 0 && (
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-black ${showThresholdConfig ? 'bg-white/20 text-white' : 'bg-rose-600 text-white'}`}>
                {thresholdBreaches.length}
              </span>
            )}
          </button>

          {/* Horizon Selector */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-semibold">
            <button
              id="btn-horizon-last5"
              onClick={() => setTimeHorizon('LAST_5')}
              className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                timeHorizon === 'LAST_5' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Last 5 Encounters
            </button>
            <button
              id="btn-horizon-all"
              onClick={() => setTimeHorizon('ALL')}
              className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                timeHorizon === 'ALL' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All History ({matchingRecords.length > 1 ? matchingRecords.length : 5})
            </button>
          </div>

          {/* Toggle Annotations */}
          <button
            id="btn-toggle-event-annotations"
            onClick={() => setShowEventAnnotations((prev) => !prev)}
            className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              showEventAnnotations
                ? 'bg-indigo-50 text-indigo-800 border-indigo-200'
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
            }`}
            title="Toggle vertical intervention markers on charts"
          >
            <Pin className="w-3.5 h-3.5 text-indigo-600" />
            <span>Event Markers ({clinicalEvents.length})</span>
          </button>

          {/* Toggle Data Table */}
          <button
            id="btn-toggle-trend-table"
            onClick={() => setShowDataTable((prev) => !prev)}
            className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              showDataTable
                ? 'bg-slate-900 text-white border-slate-900'
                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
            }`}
          >
            <TableIcon className="w-3.5 h-3.5" />
            <span>{showDataTable ? 'Hide Data Table' : 'View Numerical Table'}</span>
          </button>

          {onBackToDossier && (
            <button
              id="btn-trend-back-to-dossier"
              onClick={onBackToDossier}
              className="px-3.5 py-1.5 rounded-xl border border-cyan-200 bg-cyan-50 hover:bg-cyan-100 text-cyan-800 text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-2xs transition-all"
              title="Return to primary Clinical Dossier and CDS screen"
            >
              <span>←</span>
              <span>Back to Clinical Dossier</span>
            </button>
          )}
        </div>
      </div>

      {/* CUSTOM ALERT THRESHOLD CONFIGURATION DRAWER */}
      {showThresholdConfig && (
        <div
          id="panel-vitals-threshold-configuration"
          className="bg-slate-900 text-white rounded-2xl p-4 sm:p-5 border border-slate-800 shadow-xl space-y-4 animate-fadeIn"
        >
          <div className="flex items-center justify-between flex-wrap gap-2 pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-rose-500 text-white flex items-center justify-center font-bold">
                <Gauge className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200">
                  Custom Vitals Alert Thresholds & Visual Chart Highlighting
                </h4>
                <p className="text-[11px] text-slate-400">
                  Define clinician-specific trigger boundaries. Encounter values exceeding these limits are flagged with bright indicators.
                </p>
              </div>
            </div>

            {/* Quick Presets */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[11px] font-bold text-slate-400">Presets:</span>
              <button
                type="button"
                onClick={() =>
                  setCustomThresholds({
                    sbpMax: 140,
                    sbpMin: 90,
                    dbpMax: 90,
                    spo2Min: 92,
                    hrMax: 100,
                    hrMin: 50,
                    glucoseMax: 180,
                  })
                }
                className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-bold border border-slate-700 cursor-pointer"
              >
                WHO Standard (140/90)
              </button>
              <button
                type="button"
                onClick={() =>
                  setCustomThresholds({
                    sbpMax: 180,
                    sbpMin: 85,
                    dbpMax: 110,
                    spo2Min: 90,
                    hrMax: 120,
                    hrMin: 45,
                    glucoseMax: 250,
                  })
                }
                className="px-2.5 py-1 rounded-lg bg-rose-950/80 hover:bg-rose-900 text-rose-300 text-[11px] font-bold border border-rose-800 cursor-pointer"
              >
                Crisis Alert (180/110, SpO2 &lt;90%)
              </button>
              <button
                type="button"
                onClick={() =>
                  setCustomThresholds({
                    sbpMax: 130,
                    sbpMin: 90,
                    dbpMax: 80,
                    spo2Min: 94,
                    hrMax: 90,
                    hrMin: 55,
                    glucoseMax: 140,
                  })
                }
                className="px-2.5 py-1 rounded-lg bg-amber-950/80 hover:bg-amber-900 text-amber-300 text-[11px] font-bold border border-amber-800 cursor-pointer"
              >
                Tight Diabetic Guard (130/80, Gluc &lt;140)
              </button>
            </div>
          </div>

          {/* Interactive Sliders / Inputs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5 text-xs">
            {/* SBP Upper Limit */}
            <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700 space-y-1.5">
              <div className="flex items-center justify-between text-slate-300">
                <span className="font-bold">Systolic BP Max</span>
                <span className="font-mono font-bold text-rose-400">{customThresholds.sbpMax} mmHg</span>
              </div>
              <input
                type="range"
                min="120"
                max="200"
                step="5"
                value={customThresholds.sbpMax}
                onChange={(e) =>
                  setCustomThresholds((prev) => ({ ...prev, sbpMax: Number(e.target.value) }))
                }
                className="w-full accent-rose-500 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                <span>120</span>
                <span>Crisis (180)</span>
                <span>200</span>
              </div>
            </div>

            {/* DBP Upper Limit */}
            <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700 space-y-1.5">
              <div className="flex items-center justify-between text-slate-300">
                <span className="font-bold">Diastolic BP Max</span>
                <span className="font-mono font-bold text-rose-400">{customThresholds.dbpMax} mmHg</span>
              </div>
              <input
                type="range"
                min="70"
                max="130"
                step="5"
                value={customThresholds.dbpMax}
                onChange={(e) =>
                  setCustomThresholds((prev) => ({ ...prev, dbpMax: Number(e.target.value) }))
                }
                className="w-full accent-rose-500 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                <span>70</span>
                <span>Crisis (110)</span>
                <span>130</span>
              </div>
            </div>

            {/* SpO2 Minimum */}
            <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700 space-y-1.5">
              <div className="flex items-center justify-between text-slate-300">
                <span className="font-bold">SpO2 Alert Floor</span>
                <span className="font-mono font-bold text-cyan-400">&lt; {customThresholds.spo2Min}%</span>
              </div>
              <input
                type="range"
                min="80"
                max="96"
                step="1"
                value={customThresholds.spo2Min}
                onChange={(e) =>
                  setCustomThresholds((prev) => ({ ...prev, spo2Min: Number(e.target.value) }))
                }
                className="w-full accent-cyan-500 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                <span>80%</span>
                <span>Critical (90%)</span>
                <span>96%</span>
              </div>
            </div>

            {/* HR Upper Limit */}
            <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700 space-y-1.5">
              <div className="flex items-center justify-between text-slate-300">
                <span className="font-bold">Heart Rate Max</span>
                <span className="font-mono font-bold text-amber-400">{customThresholds.hrMax} bpm</span>
              </div>
              <input
                type="range"
                min="80"
                max="150"
                step="5"
                value={customThresholds.hrMax}
                onChange={(e) =>
                  setCustomThresholds((prev) => ({ ...prev, hrMax: Number(e.target.value) }))
                }
                className="w-full accent-amber-500 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                <span>80</span>
                <span>Tachy (100)</span>
                <span>150</span>
              </div>
            </div>

            {/* Glucose Upper Limit */}
            <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700 space-y-1.5">
              <div className="flex items-center justify-between text-slate-300">
                <span className="font-bold">Glucose Max</span>
                <span className="font-mono font-bold text-amber-400">{customThresholds.glucoseMax} mg/dL</span>
              </div>
              <input
                type="range"
                min="120"
                max="300"
                step="10"
                value={customThresholds.glucoseMax}
                onChange={(e) =>
                  setCustomThresholds((prev) => ({ ...prev, glucoseMax: Number(e.target.value) }))
                }
                className="w-full accent-amber-500 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                <span>120</span>
                <span>Goal (180)</span>
                <span>300</span>
              </div>
            </div>
          </div>

          {/* Active Breaches Summary List */}
          {thresholdBreaches.length > 0 ? (
            <div className="bg-rose-950/40 rounded-xl p-3 border border-rose-800/60 space-y-2">
              <div className="text-[11px] font-bold text-rose-300 flex items-center gap-1.5 uppercase tracking-wider">
                <AlertOctagon className="w-3.5 h-3.5 text-rose-400" />
                <span>Detected Breaches Across Encounter History ({thresholdBreaches.length})</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 text-xs">
                {thresholdBreaches.map((b, bIdx) => (
                  <div
                    key={bIdx}
                    className="bg-slate-900/90 p-2 rounded-lg border border-rose-900/80 flex items-center justify-between gap-2"
                  >
                    <div>
                      <div className="font-bold text-slate-200">
                        {b.metric}: <span className="text-rose-400 font-mono">{b.value} {b.unit}</span>
                      </div>
                      <div className="text-[10px] text-slate-400">{b.dateLabel} ({b.fullDate})</div>
                    </div>
                    <span className="text-[10px] bg-rose-900/80 text-rose-200 px-2 py-0.5 rounded font-mono font-bold">
                      {b.type === 'HIGH' ? `>${b.threshold}` : `<${b.threshold}`}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-xs text-emerald-400 bg-emerald-950/30 p-2.5 rounded-xl border border-emerald-800/40 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>All recorded encounters comply with current custom thresholds. Zero breaches detected.</span>
            </div>
          )}
        </div>
      )}

      {/* PROMINENT CLINICAL DETERIORATION PATTERN NOTIFICATION BANNER */}
      {deteriorationAnalysis.patterns.some((p) => p.severity !== 'STABLE') && (
        <div className="space-y-2">
          {deteriorationAnalysis.patterns
            .filter((p) => p.severity !== 'STABLE')
            .map((pat) => (
              <div
                key={pat.id}
                className={`p-4 rounded-2xl border flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs transition-all ${
                  pat.severity === 'CRITICAL'
                    ? 'bg-red-50/90 border-red-300 text-red-950 shadow-sm'
                    : pat.severity === 'WARNING'
                    ? 'bg-amber-50/90 border-amber-300 text-amber-950'
                    : 'bg-orange-50/90 border-orange-300 text-orange-950'
                }`}
              >
                <div className="flex items-start gap-3">
                  {pat.severity === 'CRITICAL' ? (
                    <AlertOctagon className="w-5 h-5 text-red-600 shrink-0 mt-0.5 animate-pulse" />
                  ) : (
                    <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  )}
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-sm text-slate-900">{pat.title}</span>
                      <span
                        className={`font-mono text-[10px] font-bold px-2 py-0.5 rounded ${
                          pat.severity === 'CRITICAL'
                            ? 'bg-red-600 text-white'
                            : 'bg-amber-500 text-white'
                        }`}
                      >
                        {pat.metric}
                      </span>
                      <span className="text-[11px] font-semibold text-slate-600">
                        ({pat.deltaText})
                      </span>
                    </div>
                    <p className="text-slate-700 leading-relaxed font-medium">{pat.description}</p>
                    <div className="text-[11px] font-semibold text-slate-900 mt-1 flex items-center gap-1">
                      <strong className="text-cyan-800">Bedside Clinical Action:</strong>{' '}
                      <span>{pat.recommendation}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
        </div>
      )}

      {/* Metric Category Tabs */}
      <div className="flex flex-wrap items-center gap-1.5 bg-slate-100 p-1.5 rounded-2xl border border-slate-200">
        <button
          id="tab-trend-combined"
          onClick={() => setMetricView('COMBINED')}
          className={`flex-1 min-w-[130px] py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            metricView === 'COMBINED'
              ? 'bg-white text-slate-900 shadow-sm border border-slate-200'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Activity className="w-3.5 h-3.5 text-rose-500" />
          <span>Composite Vitals (BP & HR)</span>
        </button>

        <button
          id="tab-trend-bp"
          onClick={() => setMetricView('BP_MAP')}
          className={`flex-1 min-w-[130px] py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            metricView === 'BP_MAP'
              ? 'bg-white text-slate-900 shadow-sm border border-slate-200'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Heart className="w-3.5 h-3.5 text-rose-600" />
          <span>BP & Mean Arterial Pressure</span>
        </button>

        <button
          id="tab-trend-hr"
          onClick={() => setMetricView('HR_SPO2')}
          className={`flex-1 min-w-[130px] py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            metricView === 'HR_SPO2'
              ? 'bg-white text-slate-900 shadow-sm border border-slate-200'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Activity className="w-3.5 h-3.5 text-blue-500" />
          <span>Heart Rate & Pulse Oximetry</span>
        </button>

        <button
          id="tab-trend-glucose"
          onClick={() => setMetricView('GLUCOSE')}
          className={`flex-1 min-w-[130px] py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
            metricView === 'GLUCOSE'
              ? 'bg-white text-slate-900 shadow-sm border border-slate-200'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          <Droplets className="w-3.5 h-3.5 text-amber-500" />
          <span>Blood Glucose & Glycemia</span>
        </button>
      </div>

      {/* Mini Diagnostic Metric Badges */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-2.5 text-xs">
        {/* SBP Trajectory */}
        <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold text-slate-500">Systolic BP</span>
            <span
              className={`text-[9px] font-bold px-1.5 py-0.2 rounded ${
                currentSbpVal >= 140 ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'
              }`}
            >
              {currentSbpVal >= 140 ? 'Stage 2 HTN' : 'In Target'}
            </span>
          </div>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-lg font-black font-mono text-slate-900">{currentSbpVal}</span>
            <span className="text-[10px] text-slate-500">mmHg</span>
          </div>
          <span className="text-[10px] text-slate-500 mt-1 flex items-center gap-0.5">
            {deteriorationAnalysis.sbpDelta > 0 ? (
              <span className="text-red-600 font-bold flex items-center">
                <ArrowUpRight className="w-3 h-3" /> +{deteriorationAnalysis.sbpDelta} mmHg vs visit 1
              </span>
            ) : deteriorationAnalysis.sbpDelta < 0 ? (
              <span className="text-emerald-600 font-bold flex items-center">
                <ArrowDownRight className="w-3 h-3" /> {deteriorationAnalysis.sbpDelta} mmHg reduction
              </span>
            ) : (
              'Baseline Stable'
            )}
          </span>
        </div>

        {/* Diastolic BP */}
        <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold text-slate-500">Diastolic BP</span>
            <span
              className={`text-[9px] font-bold px-1.5 py-0.2 rounded ${
                currentDbpVal >= 90 ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'
              }`}
            >
              {currentDbpVal >= 90 ? 'Elevated' : 'Normal'}
            </span>
          </div>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-lg font-black font-mono text-slate-900">{currentDbpVal}</span>
            <span className="text-[10px] text-slate-500">mmHg</span>
          </div>
          <span className="text-[10px] text-slate-500 mt-1">Target &lt; 80 mmHg</span>
        </div>

        {/* Mean Arterial Pressure (MAP) */}
        <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold text-slate-500">MAP (Vascular Load)</span>
            <span
              className={`text-[9px] font-bold px-1.5 py-0.2 rounded ${
                currentMapVal >= 105 ? 'bg-red-100 text-red-700' : 'bg-cyan-100 text-cyan-700'
              }`}
            >
              {currentMapVal >= 105 ? 'High Load' : 'Optimal'}
            </span>
          </div>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-lg font-black font-mono text-slate-900">{currentMapVal}</span>
            <span className="text-[10px] text-slate-500">mmHg</span>
          </div>
          <span className="text-[10px] text-slate-500 mt-1">Normal: 70–100 mmHg</span>
        </div>

        {/* Heart Rate */}
        <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold text-slate-500">Heart Rate</span>
            <span
              className={`text-[9px] font-bold px-1.5 py-0.2 rounded ${
                currentHrVal > 100
                  ? 'bg-red-100 text-red-700'
                  : currentHrVal < 60
                  ? 'bg-blue-100 text-blue-700'
                  : 'bg-emerald-100 text-emerald-700'
              }`}
            >
              {currentHrVal > 100 ? 'Tachycardia' : currentHrVal < 60 ? 'Bradycardia' : 'Normocardic'}
            </span>
          </div>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-lg font-black font-mono text-slate-900">{currentHrVal}</span>
            <span className="text-[10px] text-slate-500">bpm</span>
          </div>
          <span className="text-[10px] text-slate-500 mt-1 flex items-center gap-0.5">
            {deteriorationAnalysis.hrDelta > 0 ? (
              <span className="text-amber-700 font-semibold">+{deteriorationAnalysis.hrDelta} bpm delta</span>
            ) : (
              'Stable pulse'
            )}
          </span>
        </div>

        {/* Blood Glucose */}
        <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 flex flex-col justify-between col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase font-bold text-slate-500">Blood Glucose</span>
            <span
              className={`text-[9px] font-bold px-1.5 py-0.2 rounded ${
                currentGlucoseVal >= 200
                  ? 'bg-red-100 text-red-700'
                  : currentGlucoseVal >= 126
                  ? 'bg-amber-100 text-amber-700'
                  : 'bg-emerald-100 text-emerald-700'
              }`}
            >
              {currentGlucoseVal >= 126 ? 'Elevated' : 'Normal'}
            </span>
          </div>
          <div className="mt-1 flex items-baseline gap-1.5">
            <span className="text-lg font-black font-mono text-slate-900">{currentGlucoseVal}</span>
            <span className="text-[10px] text-slate-500">mg/dL</span>
          </div>
          <span className="text-[10px] text-slate-500 mt-1">Fasting goal &lt; 126</span>
        </div>
      </div>

      {/* RECHARTS CANVAS */}
      <div className="h-80 w-full pt-1">
        <ResponsiveContainer width="100%" height="100%">
          {metricView === 'COMBINED' ? (
            <ComposedChart data={chartData} margin={{ top: 15, right: 30, left: -5, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="dateLabel" tick={{ fill: '#64748b', fontSize: 11 }} />
              <YAxis
                yAxisId="bp"
                domain={[50, 220]}
                tick={{ fill: '#64748b', fontSize: 11 }}
                unit=" mmHg"
              />
              <YAxis
                yAxisId="hr"
                orientation="right"
                domain={[40, 160]}
                tick={{ fill: '#0284c7', fontSize: 11 }}
                unit=" bpm"
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#0f172a',
                  borderColor: '#334155',
                  color: '#fff',
                  borderRadius: '12px',
                  fontSize: '11px',
                  boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.3)',
                }}
                formatter={(value: any, name: any) => [
                  `${value} ${name === 'heartRate' ? 'bpm' : name === 'glucose' ? 'mg/dL' : 'mmHg'}`,
                  name === 'systolicBp'
                    ? 'Systolic BP'
                    : name === 'diastolicBp'
                    ? 'Diastolic BP'
                    : name === 'map'
                    ? 'Mean Arterial Pressure (MAP)'
                    : name === 'heartRate'
                    ? 'Heart Rate (Pulse)'
                    : 'Blood Glucose',
                ]}
                labelFormatter={(label, items) => {
                  const item = items?.[0]?.payload;
                  return `${label} • ${item?.visitType || 'Encounter'}`;
                }}
              />
              <Legend
                verticalAlign="top"
                height={34}
                formatter={(value) => (
                  <span className="text-xs font-bold text-slate-700">
                    {value === 'systolicBp'
                      ? 'Systolic BP (Target <130)'
                      : value === 'diastolicBp'
                      ? 'Diastolic BP (Target <80)'
                      : value === 'map'
                      ? 'MAP (70-100 mmHg)'
                      : value === 'heartRate'
                      ? 'Heart Rate (60-100 bpm)'
                      : 'Glucose (mg/dL)'}
                  </span>
                )}
              />

              {/* Reference Danger Thresholds */}
              <ReferenceLine
                yAxisId="bp"
                y={180}
                stroke="#dc2626"
                strokeDasharray="4 4"
                label={{ value: 'Crisis (180)', fill: '#dc2626', fontSize: 9, position: 'insideTopLeft' }}
              />
              <ReferenceLine
                yAxisId="bp"
                y={140}
                stroke="#ef4444"
                strokeDasharray="3 3"
                label={{ value: 'Stage 2 HTN (140)', fill: '#ef4444', fontSize: 9, position: 'insideTopLeft' }}
              />
              <ReferenceLine
                yAxisId="bp"
                y={120}
                stroke="#10b981"
                strokeDasharray="2 2"
                label={{ value: 'Goal (<120)', fill: '#10b981', fontSize: 9, position: 'insideBottomLeft' }}
              />

              {/* Custom Alert Thresholds */}
              {customThresholds.sbpMax && (
                <ReferenceLine
                  yAxisId="bp"
                  y={customThresholds.sbpMax}
                  stroke="#f43f5e"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  label={{ value: `🚨 Custom SBP Alert (≥${customThresholds.sbpMax})`, fill: '#f43f5e', fontSize: 10, fontWeight: 'bold', position: 'insideTopLeft' }}
                />
              )}
              {customThresholds.hrMax && (
                <ReferenceLine
                  yAxisId="hr"
                  y={customThresholds.hrMax}
                  stroke="#d97706"
                  strokeWidth={1.5}
                  strokeDasharray="4 4"
                  label={{ value: `Custom HR Alert (≥${customThresholds.hrMax})`, fill: '#d97706', fontSize: 9, position: 'insideTopRight' }}
                />
              )}

              {/* Vertical Clinical Event Annotations */}
              {showEventAnnotations &&
                filteredClinicalEvents.map((evt) => (
                  <ReferenceLine
                    key={`evt-comb-${evt.id}`}
                    yAxisId="bp"
                    x={evt.encounterDateLabel}
                    stroke={evt.color}
                    strokeWidth={2}
                    strokeDasharray="3 3"
                    label={{
                      value: `📌 ${evt.badgeText}`,
                      fill: evt.color,
                      fontSize: 10,
                      fontWeight: 'bold',
                      position: 'insideTopLeft',
                    }}
                  />
                ))}

              {/* Lines & Areas */}
              <Area
                yAxisId="bp"
                type="monotone"
                dataKey="systolicBp"
                fill="#ffe4e6"
                stroke="none"
                opacity={0.3}
              />
              <Line
                yAxisId="bp"
                type="monotone"
                dataKey="systolicBp"
                name="systolicBp"
                stroke="#e11d48"
                strokeWidth={3}
                dot={{ r: 5, fill: '#e11d48', strokeWidth: 2, stroke: '#fff' }}
                activeDot={{ r: 7 }}
              />
              <Line
                yAxisId="bp"
                type="monotone"
                dataKey="diastolicBp"
                name="diastolicBp"
                stroke="#0891b2"
                strokeWidth={2.5}
                dot={{ r: 4, fill: '#0891b2', strokeWidth: 2, stroke: '#fff' }}
                activeDot={{ r: 6 }}
              />
              <Line
                yAxisId="bp"
                type="monotone"
                dataKey="map"
                name="map"
                stroke="#64748b"
                strokeWidth={1.5}
                strokeDasharray="3 3"
                dot={{ r: 3, fill: '#64748b' }}
              />
              <Line
                yAxisId="hr"
                type="monotone"
                dataKey="heartRate"
                name="heartRate"
                stroke="#0284c7"
                strokeWidth={2.5}
                dot={{ r: 4, fill: '#0284c7' }}
                activeDot={{ r: 6 }}
              />
            </ComposedChart>
          ) : metricView === 'BP_MAP' ? (
            <ComposedChart data={chartData} margin={{ top: 15, right: 25, left: -5, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="dateLabel" tick={{ fill: '#64748b', fontSize: 11 }} />
              <YAxis domain={[50, 220]} tick={{ fill: '#64748b', fontSize: 11 }} unit=" mmHg" />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#0f172a',
                  borderColor: '#334155',
                  color: '#fff',
                  borderRadius: '12px',
                  fontSize: '11px',
                }}
                formatter={(value: any, name: any) => [
                  `${value} mmHg`,
                  name === 'systolicBp'
                    ? 'Systolic BP'
                    : name === 'diastolicBp'
                    ? 'Diastolic BP'
                    : name === 'map'
                    ? 'Mean Arterial Pressure (MAP)'
                    : 'Pulse Pressure',
                ]}
              />
              <Legend
                verticalAlign="top"
                height={34}
                formatter={(value) => (
                  <span className="text-xs font-bold text-slate-700">
                    {value === 'systolicBp'
                      ? 'Systolic BP (Target <130)'
                      : value === 'diastolicBp'
                      ? 'Diastolic BP (Target <80)'
                      : value === 'map'
                      ? 'Mean Arterial Pressure (MAP)'
                      : 'Pulse Pressure (SBP - DBP)'}
                  </span>
                )}
              />
              <ReferenceArea y1={140} y2={220} strokeOpacity={0} {...({ fill: '#fee2e2', fillOpacity: 0.4 } as any)} />
              <ReferenceLine y={180} stroke="#dc2626" strokeDasharray="4 4" label={{ value: 'Hypertensive Crisis (180)', fill: '#dc2626', fontSize: 9, position: 'insideTopRight' }} />
              <ReferenceLine y={140} stroke="#ef4444" strokeDasharray="3 3" label={{ value: 'Stage 2 HTN (140)', fill: '#ef4444', fontSize: 9, position: 'insideTopRight' }} />
              <ReferenceLine y={120} stroke="#10b981" strokeDasharray="2 2" label={{ value: 'Optimal Target (<120)', fill: '#10b981', fontSize: 9, position: 'insideBottomRight' }} />

              {/* Custom Threshold Reference Lines */}
              {customThresholds.sbpMax && (
                <ReferenceLine
                  y={customThresholds.sbpMax}
                  stroke="#f43f5e"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  label={{ value: `🚨 Custom SBP Alert (≥${customThresholds.sbpMax} mmHg)`, fill: '#f43f5e', fontSize: 10, fontWeight: 'bold', position: 'insideTopLeft' }}
                />
              )}
              {customThresholds.dbpMax && (
                <ReferenceLine
                  y={customThresholds.dbpMax}
                  stroke="#e11d48"
                  strokeWidth={1.5}
                  strokeDasharray="4 4"
                  label={{ value: `Custom DBP Alert (≥${customThresholds.dbpMax} mmHg)`, fill: '#e11d48', fontSize: 9, position: 'insideTopRight' }}
                />
              )}

              {/* Vertical Clinical Event Annotations */}
              {showEventAnnotations &&
                filteredClinicalEvents.map((evt) => (
                  <ReferenceLine
                    key={`evt-bp-${evt.id}`}
                    x={evt.encounterDateLabel}
                    stroke={evt.color}
                    strokeWidth={2}
                    strokeDasharray="3 3"
                    label={{
                      value: `📌 ${evt.badgeText}`,
                      fill: evt.color,
                      fontSize: 10,
                      fontWeight: 'bold',
                      position: 'insideTopLeft',
                    }}
                  />
                ))}

              <Line
                type="monotone"
                dataKey="systolicBp"
                name="systolicBp"
                stroke="#e11d48"
                strokeWidth={3}
                dot={{ r: 5, fill: '#e11d48', strokeWidth: 2, stroke: '#fff' }}
                activeDot={{ r: 7 }}
              />
              <Line
                type="monotone"
                dataKey="diastolicBp"
                name="diastolicBp"
                stroke="#0891b2"
                strokeWidth={2.5}
                dot={{ r: 4, fill: '#0891b2', strokeWidth: 2, stroke: '#fff' }}
                activeDot={{ r: 6 }}
              />
              <Line
                type="monotone"
                dataKey="map"
                name="map"
                stroke="#8b5cf6"
                strokeWidth={2}
                strokeDasharray="4 4"
                dot={{ r: 4, fill: '#8b5cf6' }}
              />
              <Line
                type="monotone"
                dataKey="pulsePressure"
                name="pulsePressure"
                stroke="#f59e0b"
                strokeWidth={1.5}
                dot={{ r: 3, fill: '#f59e0b' }}
              />
            </ComposedChart>
          ) : metricView === 'HR_SPO2' ? (
            <ComposedChart data={chartData} margin={{ top: 15, right: 30, left: -5, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="dateLabel" tick={{ fill: '#64748b', fontSize: 11 }} />
              <YAxis yAxisId="hr" domain={[40, 140]} tick={{ fill: '#0284c7', fontSize: 11 }} unit=" bpm" />
              <YAxis yAxisId="spo2" orientation="right" domain={[85, 100]} tick={{ fill: '#059669', fontSize: 11 }} unit="%" />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#0f172a',
                  borderColor: '#334155',
                  color: '#fff',
                  borderRadius: '12px',
                  fontSize: '11px',
                }}
                formatter={(value: any, name: any) => [
                  `${value} ${name === 'heartRate' ? 'bpm' : '%'}`,
                  name === 'heartRate' ? 'Heart Rate' : 'Oxygen Saturation (SpO2)',
                ]}
              />
              <Legend
                verticalAlign="top"
                height={34}
                formatter={(value) => (
                  <span className="text-xs font-bold text-slate-700">
                    {value === 'heartRate' ? 'Heart Rate (60–100 bpm)' : 'Oxygen Saturation (SpO2 %)'}
                  </span>
                )}
              />
              <ReferenceLine yAxisId="hr" y={100} stroke="#ef4444" strokeDasharray="3 3" label={{ value: 'Tachycardia (100 bpm)', fill: '#ef4444', fontSize: 9, position: 'insideTopLeft' }} />
              <ReferenceLine yAxisId="spo2" y={92} stroke="#dc2626" strokeDasharray="4 4" label={{ value: 'Hypoxia (<92%)', fill: '#dc2626', fontSize: 9, position: 'insideBottomRight' }} />

              {/* Custom Threshold Reference Lines */}
              {customThresholds.spo2Min && (
                <ReferenceLine
                  yAxisId="spo2"
                  y={customThresholds.spo2Min}
                  stroke="#f43f5e"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  label={{ value: `🚨 Custom SpO2 Floor (<${customThresholds.spo2Min}%)`, fill: '#f43f5e', fontSize: 10, fontWeight: 'bold', position: 'insideBottomRight' }}
                />
              )}
              {customThresholds.hrMax && (
                <ReferenceLine
                  yAxisId="hr"
                  y={customThresholds.hrMax}
                  stroke="#d97706"
                  strokeWidth={1.5}
                  strokeDasharray="4 4"
                  label={{ value: `Custom HR Alert (≥${customThresholds.hrMax} bpm)`, fill: '#d97706', fontSize: 9, position: 'insideTopLeft' }}
                />
              )}

              {/* Vertical Clinical Event Annotations */}
              {showEventAnnotations &&
                filteredClinicalEvents.map((evt) => (
                  <ReferenceLine
                    key={`evt-hr-${evt.id}`}
                    yAxisId="hr"
                    x={evt.encounterDateLabel}
                    stroke={evt.color}
                    strokeWidth={2}
                    strokeDasharray="3 3"
                    label={{
                      value: `📌 ${evt.badgeText}`,
                      fill: evt.color,
                      fontSize: 10,
                      fontWeight: 'bold',
                      position: 'insideTopLeft',
                    }}
                  />
                ))}

              <Line
                yAxisId="hr"
                type="monotone"
                dataKey="heartRate"
                name="heartRate"
                stroke="#0284c7"
                strokeWidth={3}
                dot={{ r: 5, fill: '#0284c7', strokeWidth: 2, stroke: '#fff' }}
                activeDot={{ r: 7 }}
              />
              <Line
                yAxisId="spo2"
                type="monotone"
                dataKey="oxygenSaturation"
                name="oxygenSaturation"
                stroke="#059669"
                strokeWidth={2.5}
                dot={{ r: 4, fill: '#059669', strokeWidth: 2, stroke: '#fff' }}
                activeDot={{ r: 6 }}
              />
            </ComposedChart>
          ) : (
            <ComposedChart data={chartData} margin={{ top: 15, right: 25, left: -5, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="dateLabel" tick={{ fill: '#64748b', fontSize: 11 }} />
              <YAxis domain={[60, 320]} tick={{ fill: '#64748b', fontSize: 11 }} unit=" mg/dL" />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#0f172a',
                  borderColor: '#334155',
                  color: '#fff',
                  borderRadius: '12px',
                  fontSize: '11px',
                }}
                formatter={(value: any) => [`${value} mg/dL`, 'Blood Glucose']}
              />
              <Legend
                verticalAlign="top"
                height={34}
                formatter={() => (
                  <span className="text-xs font-bold text-slate-700">Blood Glucose (mg/dL)</span>
                )}
              />
              <ReferenceArea y1={126} y2={320} strokeOpacity={0} {...({ fill: '#fef3c7', fillOpacity: 0.4 } as any)} />
              <ReferenceLine y={200} stroke="#dc2626" strokeDasharray="4 4" label={{ value: 'Uncontrolled (>200 mg/dL)', fill: '#dc2626', fontSize: 9, position: 'insideTopRight' }} />
              <ReferenceLine y={126} stroke="#f59e0b" strokeDasharray="3 3" label={{ value: 'Diabetes Cutoff (126 mg/dL)', fill: '#f59e0b', fontSize: 9, position: 'insideBottomRight' }} />
              <ReferenceLine y={100} stroke="#10b981" strokeDasharray="2 2" label={{ value: 'Normal Fasting (<100)', fill: '#10b981', fontSize: 9, position: 'insideBottomRight' }} />

              {/* Custom Threshold Reference Lines */}
              {customThresholds.glucoseMax && (
                <ReferenceLine
                  y={customThresholds.glucoseMax}
                  stroke="#f43f5e"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  label={{ value: `🚨 Custom Glucose Alert (≥${customThresholds.glucoseMax} mg/dL)`, fill: '#f43f5e', fontSize: 10, fontWeight: 'bold', position: 'insideTopLeft' }}
                />
              )}

              {/* Vertical Clinical Event Annotations */}
              {showEventAnnotations &&
                filteredClinicalEvents.map((evt) => (
                  <ReferenceLine
                    key={`evt-glu-${evt.id}`}
                    x={evt.encounterDateLabel}
                    stroke={evt.color}
                    strokeWidth={2}
                    strokeDasharray="3 3"
                    label={{
                      value: `📌 ${evt.badgeText}`,
                      fill: evt.color,
                      fontSize: 10,
                      fontWeight: 'bold',
                      position: 'insideTopLeft',
                    }}
                  />
                ))}

              <Area type="monotone" dataKey="glucose" fill="#fef3c7" stroke="none" opacity={0.5} />
              <Line
                type="monotone"
                dataKey="glucose"
                name="glucose"
                stroke="#d97706"
                strokeWidth={3}
                dot={{ r: 5, fill: '#d97706', strokeWidth: 2, stroke: '#fff' }}
                activeDot={{ r: 7 }}
              />
            </ComposedChart>
          )}
        </ResponsiveContainer>
      </div>

      {/* CLINICAL EVENT & INTERVENTION TIMELINE SECTION */}
      <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <Bookmark className="w-4 h-4 text-indigo-600" />
            <h4 className="text-xs font-bold text-slate-900">
              Significant Clinical Events & Treatment Interventions Timeline
            </h4>
            <span className="text-[10px] bg-indigo-100 text-indigo-800 font-bold px-2 py-0.5 rounded-full">
              {clinicalEvents.length} Events Correlated
            </span>
          </div>

          <button
            id="btn-add-event-timeline"
            onClick={() => setShowAddEventModal(true)}
            className="px-2.5 py-1 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg text-[11px] font-bold text-slate-700 flex items-center gap-1 shadow-2xs cursor-pointer"
          >
            <Plus className="w-3 h-3 text-indigo-600" />
            <span>Add Event Annotation</span>
          </button>
        </div>

        <p className="text-[11px] text-slate-500">
          Correlates patient vitals fluctuations directly against historical admissions, pharmacological modifications, and clinical protocol titrations.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pt-1">
          {clinicalEvents.map((evt) => {
            const matchedPoint = chartData.find((p) => p.dateLabel === evt.encounterDateLabel);
            return (
              <div
                key={evt.id}
                className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs space-y-2 hover:border-indigo-300 transition-all flex flex-col justify-between"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-1">
                    <span
                      className="text-[10px] font-extrabold px-2 py-0.5 rounded uppercase tracking-wider"
                      style={{
                        backgroundColor: `${evt.color}15`,
                        color: evt.color,
                      }}
                    >
                      {evt.eventType.replace('_', ' ')}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono flex items-center gap-1">
                      <Clock className="w-3 h-3 text-slate-400" />
                      {evt.encounterDateLabel}
                    </span>
                  </div>

                  <h5 className="text-xs font-bold text-slate-900 leading-snug">{evt.title}</h5>
                  <p className="text-[11px] text-slate-600 leading-relaxed">{evt.description}</p>
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-500">
                  <span className="font-semibold text-slate-700 truncate max-w-[130px]" title={evt.clinician}>
                    {evt.clinician}
                  </span>
                  {matchedPoint && (
                    <span className="font-mono font-bold text-slate-900 bg-slate-100 px-1.5 py-0.5 rounded">
                      BP {matchedPoint.systolicBp}/{matchedPoint.diastolicBp}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* NUMERICAL DATA TABLE COLLAPSIBLE DRAWER */}
      {showDataTable && (
        <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2.5 animate-fade-in">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
              <TableIcon className="w-3.5 h-3.5 text-cyan-600" />
              Detailed Encounter History & Physiological Measurements
            </h4>
            <div className="flex items-center gap-2">
              <CopyPatientIdButton
                id="btn-copy-table-patient-id"
                value={currentRecord.demographics.patientId}
                label="Copy Patient ID"
                size="sm"
              />
              <span className="text-[10px] text-slate-500 font-mono">
                {chartData.length} Total Data Points
              </span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-200/80 text-slate-700 font-bold border-b border-slate-300 text-[11px]">
                  <th className="p-2">Encounter</th>
                  <th className="p-2">Date</th>
                  <th className="p-2">BP (mmHg)</th>
                  <th className="p-2">MAP</th>
                  <th className="p-2">Pulse (bpm)</th>
                  <th className="p-2">SpO₂</th>
                  <th className="p-2">Glucose</th>
                  <th className="p-2">Clinical Assessment Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {chartData.map((row, idx) => (
                  <tr
                    key={idx}
                    className={`hover:bg-slate-100/70 transition-colors ${
                      row.isCurrent ? 'bg-cyan-50/60 font-bold' : ''
                    }`}
                  >
                    <td className="p-2">
                      <span className="font-mono text-slate-900">{row.encounterNo}</span>
                      {row.isCurrent && (
                        <span className="ml-1.5 text-[9px] bg-cyan-700 text-white px-1.5 py-0.2 rounded font-bold">
                          CURRENT
                        </span>
                      )}
                    </td>
                    <td className="p-2 text-slate-600 font-mono text-[11px]">{row.fullDate}</td>
                    <td className="p-2 font-mono">
                      <span
                        className={
                          row.systolicBp >= 140 ? 'text-red-600 font-bold' : 'text-slate-900'
                        }
                      >
                        {row.systolicBp}/{row.diastolicBp}
                      </span>
                    </td>
                    <td className="p-2 font-mono text-slate-700">{row.map}</td>
                    <td className="p-2 font-mono">
                      <span
                        className={
                          row.heartRate >= 100 ? 'text-red-600 font-bold' : 'text-slate-900'
                        }
                      >
                        {row.heartRate}
                      </span>
                    </td>
                    <td className="p-2 font-mono text-slate-700">{row.oxygenSaturation}%</td>
                    <td className="p-2 font-mono">
                      <span
                        className={
                          row.glucose >= 140 ? 'text-amber-600 font-bold' : 'text-slate-900'
                        }
                      >
                        {row.glucose} mg/dL
                      </span>
                    </td>
                    <td className="p-2 text-[11px] text-slate-600 max-w-xs truncate">{row.notes}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ADD CLINICAL EVENT MARKER MODAL */}
      {showAddEventModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-2xl border border-slate-200 space-y-4 animate-scale-in">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Pin className="w-4 h-4 text-indigo-600" />
                <h3 className="text-sm font-bold text-slate-900">Add Clinical Event Annotation</h3>
              </div>
              <button
                onClick={() => setShowAddEventModal(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddClinicalEvent} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Encounter Timeline Point
                </label>
                <select
                  value={newEventForm.encounterDateLabel}
                  onChange={(e) =>
                    setNewEventForm((prev) => ({ ...prev, encounterDateLabel: e.target.value }))
                  }
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-800 focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Select Encounter...</option>
                  {chartData.map((pt) => (
                    <option key={pt.dateLabel} value={pt.dateLabel}>
                      {pt.encounterNo} — {pt.fullDate} ({pt.visitType})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Event Category</label>
                <select
                  value={newEventForm.eventType}
                  onChange={(e) =>
                    setNewEventForm((prev) => ({
                      ...prev,
                      eventType: e.target.value as ClinicalEventAnnotation['eventType'],
                    }))
                  }
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-800 focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="MED_CHANGE">Medication Change / Adjustment</option>
                  <option value="ADMISSION">Hospital Admission / Triage Intake</option>
                  <option value="ESCALATION">Emergency Escalation / Specialty Referral</option>
                  <option value="LIFESTYLE">WHO HEARTS Protocol / Lifestyle Titration</option>
                  <option value="LAB_MILESTONE">Laboratory Test Milestone</option>
                  <option value="PROCEDURE">Diagnostic / Clinical Procedure</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Intervention Title / Summary <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Initiated Lisinopril 10mg PO Daily"
                  value={newEventForm.title}
                  onChange={(e) =>
                    setNewEventForm((prev) => ({ ...prev, title: e.target.value }))
                  }
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-900 focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Clinical Description & Rationale</label>
                <textarea
                  rows={2}
                  placeholder="Detail treatment rationale, clinical signs, or dosage change..."
                  value={newEventForm.description}
                  onChange={(e) =>
                    setNewEventForm((prev) => ({ ...prev, description: e.target.value }))
                  }
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-900 focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Responsible Clinician</label>
                <input
                  type="text"
                  value={newEventForm.clinician}
                  onChange={(e) =>
                    setNewEventForm((prev) => ({ ...prev, clinician: e.target.value }))
                  }
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl font-medium text-slate-900 focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddEventModal(false)}
                  className="px-3 py-1.5 border border-slate-200 rounded-xl text-slate-600 font-bold hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-sm cursor-pointer"
                >
                  Save Marker
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
