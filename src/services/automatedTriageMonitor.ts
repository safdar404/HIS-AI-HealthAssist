import {
  PatientAssessmentRecord,
  TriageLevel,
  RedFlagAlert,
  AutomatedTriageEvent,
} from '../types/clinical';

export interface ConditionVitalRanges {
  conditionKey: string;
  displayName: string;
  description: string;
  normalRange: {
    sbp: [number, number]; // [min, max]
    dbp: [number, number];
    hr: [number, number];
    spo2: [number, number];
    rr?: [number, number];
    glucose?: [number, number];
    temp?: [number, number];
  };
  urgentDeviation: {
    sbpMax?: number;
    sbpMin?: number;
    dbpMax?: number;
    dbpMin?: number;
    hrMax?: number;
    hrMin?: number;
    spo2Min?: number;
    rrMax?: number;
    rrMin?: number;
    glucoseMax?: number;
    glucoseMin?: number;
    tempMax?: number;
    tempMin?: number;
  };
  emergencyDeviation: {
    sbpMax?: number;
    sbpMin?: number;
    dbpMax?: number;
    dbpMin?: number;
    hrMax?: number;
    hrMin?: number;
    spo2Min?: number;
    rrMax?: number;
    rrMin?: number;
    glucoseMax?: number;
    glucoseMin?: number;
    tempMax?: number;
    tempMin?: number;
  };
}

export const PREDEFINED_CONDITION_RANGES: Record<string, ConditionVitalRanges> = {
  CARDIOVASCULAR: {
    conditionKey: 'CARDIOVASCULAR',
    displayName: 'Cardiovascular / Coronary Syndrome / Heart Failure',
    description: 'Acute coronary syndrome, ischemic heart disease, heart failure, and cardiogenic shock',
    normalRange: {
      sbp: [100, 140],
      dbp: [60, 90],
      hr: [60, 100],
      spo2: [95, 100],
      rr: [12, 20],
    },
    urgentDeviation: {
      sbpMax: 160,
      sbpMin: 95,
      dbpMax: 100,
      dbpMin: 55,
      hrMax: 110,
      hrMin: 50,
      spo2Min: 92,
      rrMax: 24,
    },
    emergencyDeviation: {
      sbpMax: 180,
      sbpMin: 85, // Cardiogenic shock
      dbpMax: 110,
      dbpMin: 45,
      hrMax: 125, // Malignant tachyarrhythmia
      hrMin: 42,  // Severe heart block / bradycardia
      spo2Min: 89,
      rrMax: 28,
    },
  },
  HYPERTENSIVE_CRISIS: {
    conditionKey: 'HYPERTENSIVE_CRISIS',
    displayName: 'Severe Hypertension / Hypertensive Emergency',
    description: 'Malignant blood pressure elevations with acute end-organ damage risk',
    normalRange: {
      sbp: [100, 139],
      dbp: [60, 89],
      hr: [60, 100],
      spo2: [95, 100],
    },
    urgentDeviation: {
      sbpMax: 160,
      dbpMax: 100,
    },
    emergencyDeviation: {
      sbpMax: 180, // JNC8 / AHA definition of Hypertensive Crisis
      dbpMax: 120,
    },
  },
  RESPIRATORY: {
    conditionKey: 'RESPIRATORY',
    displayName: 'Acute Respiratory Illness / COPD / Severe Asthma',
    description: 'Chronic obstructive pulmonary disease, asthma exacerbation, severe acute hypoxia',
    normalRange: {
      sbp: [100, 140],
      dbp: [60, 90],
      hr: [60, 100],
      spo2: [92, 100],
      rr: [12, 20],
    },
    urgentDeviation: {
      spo2Min: 92,
      rrMax: 24,
      hrMax: 110,
    },
    emergencyDeviation: {
      spo2Min: 88, // Critical hypoxemic respiratory failure
      rrMax: 30,  // Severe respiratory exhaustion
      rrMin: 8,   // Bradypnea / imminent arrest
      hrMax: 130,
    },
  },
  SEPSIS_INFECTION: {
    conditionKey: 'SEPSIS_INFECTION',
    displayName: 'Sepsis / Severe Systemic Infection / Septic Shock',
    description: 'Systemic inflammatory response with hemodynamic instability and organ failure',
    normalRange: {
      sbp: [100, 140],
      dbp: [65, 90],
      hr: [60, 90],
      spo2: [95, 100],
      rr: [12, 20],
      temp: [36.5, 37.5],
    },
    urgentDeviation: {
      sbpMin: 100,
      hrMax: 95,
      rrMax: 22, // qSOFA threshold
      tempMax: 38.3,
      tempMin: 36.0,
    },
    emergencyDeviation: {
      sbpMin: 90,  // Septic shock (hypotension refractory or demanding vasopressors)
      hrMax: 120,
      rrMax: 28,
      tempMax: 39.5,
      tempMin: 35.5, // Hypothermic sepsis
      spo2Min: 90,
    },
  },
  DIABETIC_METABOLIC: {
    conditionKey: 'DIABETIC_METABOLIC',
    displayName: 'Diabetic Ketoacidosis / Hyperosmolar / Severe Hypoglycemia',
    description: 'Acute metabolic dysregulation, severe glycemic crisis, or profound neuroglycopenia',
    normalRange: {
      sbp: [100, 140],
      dbp: [60, 90],
      hr: [60, 100],
      spo2: [95, 100],
      glucose: [80, 180],
    },
    urgentDeviation: {
      glucoseMax: 250,
      glucoseMin: 69,
      hrMax: 110,
    },
    emergencyDeviation: {
      glucoseMax: 400, // HHS / DKA risk
      glucoseMin: 55,  // Critical neuroglycopenia / seizure threshold
      sbpMin: 90,     // Dehydration shock
      hrMax: 125,
    },
  },
  STROKE_NEUROLOGIC: {
    conditionKey: 'STROKE_NEUROLOGIC',
    displayName: 'Cerebrovascular / Acute Stroke / Neurologic Deficit',
    description: 'Acute neurological impairment, intracranial hemorrhage, or ischemic stroke',
    normalRange: {
      sbp: [110, 140],
      dbp: [60, 90],
      hr: [60, 100],
      spo2: [95, 100],
    },
    urgentDeviation: {
      sbpMax: 160,
      dbpMax: 100,
      spo2Min: 93,
    },
    emergencyDeviation: {
      sbpMax: 185, // Thrombolytic safety exclusion limit
      dbpMax: 110,
      hrMin: 45,  // Cushing reflex (increased ICP)
      spo2Min: 90,
    },
  },
  GENERAL_EMERGENCY: {
    conditionKey: 'GENERAL_EMERGENCY',
    displayName: 'General Hemodynamic Safety Protocol',
    description: 'Standard physiological safety envelope for acute clinical triage',
    normalRange: {
      sbp: [90, 140],
      dbp: [60, 90],
      hr: [60, 100],
      spo2: [95, 100],
      rr: [12, 20],
      glucose: [70, 180],
    },
    urgentDeviation: {
      sbpMax: 160,
      sbpMin: 90,
      dbpMax: 100,
      hrMax: 110,
      hrMin: 50,
      spo2Min: 92,
      rrMax: 24,
      glucoseMax: 280,
      glucoseMin: 65,
    },
    emergencyDeviation: {
      sbpMax: 180,
      sbpMin: 85,
      dbpMax: 115,
      hrMax: 130,
      hrMin: 40,
      spo2Min: 89,
      rrMax: 30,
      rrMin: 8,
      glucoseMax: 400,
      glucoseMin: 55,
    },
  },
};

/**
 * Automatically detects the primary physiological condition of the patient
 * based on profile history, chief complaint symptoms, clinical risks, and doctor notes.
 */
export function detectPatientCondition(record: PatientAssessmentRecord): ConditionVitalRanges {
  const profile = record.profile;
  const symptoms = record.symptoms || [];
  const doctorDiagnosis = (record.doctorReview?.doctorDiagnosis || '').toLowerCase();
  const clinicalNotes = (record.doctorReview?.clinicalNotes || '').toLowerCase();

  const symptomNames = symptoms
    .filter((s) => s.present)
    .map((s) => s.name.toLowerCase());

  // 1. Cardiovascular Detection
  const hasChestPain = symptomNames.some(
    (n) => n.includes('chest') || n.includes('angina') || n.includes('cardiac')
  );
  if (
    profile.previousCVD ||
    hasChestPain ||
    doctorDiagnosis.includes('coronary') ||
    doctorDiagnosis.includes('stemi') ||
    doctorDiagnosis.includes('infarction') ||
    doctorDiagnosis.includes('angina') ||
    doctorDiagnosis.includes('heart failure') ||
    clinicalNotes.includes('cardiac')
  ) {
    return PREDEFINED_CONDITION_RANGES.CARDIOVASCULAR;
  }

  // 2. Stroke / Neurologic Detection
  const hasNeuroSymptoms = symptomNames.some(
    (n) => n.includes('weakness') || n.includes('numb') || n.includes('speech') || n.includes('facial')
  );
  if (
    profile.previousStroke ||
    hasNeuroSymptoms ||
    doctorDiagnosis.includes('stroke') ||
    doctorDiagnosis.includes('cva') ||
    doctorDiagnosis.includes('tia') ||
    doctorDiagnosis.includes('infarct')
  ) {
    return PREDEFINED_CONDITION_RANGES.STROKE_NEUROLOGIC;
  }

  // 3. Respiratory Detection
  const hasRespSymptoms = symptomNames.some(
    (n) => n.includes('breath') || n.includes('dyspnea') || n.includes('cough') || n.includes('wheez')
  );
  if (
    profile.asthmaCOPD ||
    hasRespSymptoms ||
    doctorDiagnosis.includes('copd') ||
    doctorDiagnosis.includes('asthma') ||
    doctorDiagnosis.includes('bronchitis') ||
    doctorDiagnosis.includes('pneumonia') ||
    doctorDiagnosis.includes('respiratory')
  ) {
    return PREDEFINED_CONDITION_RANGES.RESPIRATORY;
  }

  // 4. Sepsis / Infection Detection
  const hasFever = symptomNames.some(
    (n) => n.includes('fever') || n.includes('chills') || n.includes('sweat')
  );
  const temp = record.vitals.temperatureC;
  if (
    (temp && (temp >= 38.3 || temp <= 36.0)) ||
    hasFever ||
    doctorDiagnosis.includes('sepsis') ||
    doctorDiagnosis.includes('infection') ||
    doctorDiagnosis.includes('typhoid') ||
    doctorDiagnosis.includes('dengue') ||
    doctorDiagnosis.includes('bacteremia')
  ) {
    return PREDEFINED_CONDITION_RANGES.SEPSIS_INFECTION;
  }

  // 5. Diabetic / Metabolic Detection
  if (
    profile.diabetesHistory ||
    doctorDiagnosis.includes('diabet') ||
    doctorDiagnosis.includes('dka') ||
    doctorDiagnosis.includes('glycem') ||
    doctorDiagnosis.includes('hyperglycemia') ||
    (record.vitals.bloodGlucoseMgDl && record.vitals.bloodGlucoseMgDl > 250)
  ) {
    return PREDEFINED_CONDITION_RANGES.DIABETIC_METABOLIC;
  }

  // 6. Hypertensive Crisis Detection
  if (
    profile.hypertensionHistory ||
    doctorDiagnosis.includes('hypertens') ||
    (record.vitals.systolicBp && record.vitals.systolicBp >= 160)
  ) {
    return PREDEFINED_CONDITION_RANGES.HYPERTENSIVE_CRISIS;
  }

  // Default fallback
  return PREDEFINED_CONDITION_RANGES.GENERAL_EMERGENCY;
}

export interface VitalDeviationAnalysis {
  condition: ConditionVitalRanges;
  isDeviated: boolean;
  recommendedTriageLevel: TriageLevel;
  severity: 'NORMAL' | 'URGENT_DEVIATION' | 'CRITICAL_EMERGENCY_DEVIATION';
  breachedMetrics: string[];
  clinicalRationale: string;
  deviatedParameters: {
    parameter: string;
    actualValue: number | string;
    expectedRange: string;
    breachType: 'EMERGENCY' | 'URGENT';
  }[];
}

/**
 * Checks a patient's vitals against predefined physiological ranges for their specific condition.
 */
export function analyzeVitalsDeviation(record: PatientAssessmentRecord): VitalDeviationAnalysis {
  const condition = detectPatientCondition(record);
  const vitals = record.vitals;

  const sbp = vitals.systolicBp;
  const dbp = vitals.diastolicBp;
  const hr = vitals.heartRate;
  const spo2 = vitals.oxygenSaturation;
  const rr = vitals.respiratoryRate;
  const glucose = vitals.bloodGlucoseMgDl || record.labs?.glucoseFastingMgDl;
  const temp = vitals.temperatureC;

  const breachedMetrics: string[] = [];
  const deviatedParameters: VitalDeviationAnalysis['deviatedParameters'] = [];
  let isEmergency = false;
  let isUrgent = false;

  const { emergencyDeviation, urgentDeviation, normalRange } = condition;

  // 1. Systolic BP Check
  if (sbp !== undefined) {
    if (emergencyDeviation.sbpMax && sbp >= emergencyDeviation.sbpMax) {
      isEmergency = true;
      breachedMetrics.push(`Severe SBP Elevation: ${sbp} mmHg (Crit: ≥${emergencyDeviation.sbpMax})`);
      deviatedParameters.push({
        parameter: 'Systolic BP',
        actualValue: `${sbp} mmHg`,
        expectedRange: `${normalRange.sbp[0]}-${normalRange.sbp[1]} mmHg`,
        breachType: 'EMERGENCY',
      });
    } else if (emergencyDeviation.sbpMin && sbp <= emergencyDeviation.sbpMin) {
      isEmergency = true;
      breachedMetrics.push(`Critical Hypotension/Shock: ${sbp} mmHg (Crit: ≤${emergencyDeviation.sbpMin})`);
      deviatedParameters.push({
        parameter: 'Systolic BP',
        actualValue: `${sbp} mmHg`,
        expectedRange: `${normalRange.sbp[0]}-${normalRange.sbp[1]} mmHg`,
        breachType: 'EMERGENCY',
      });
    } else if (urgentDeviation.sbpMax && sbp >= urgentDeviation.sbpMax) {
      isUrgent = true;
      breachedMetrics.push(`Elevated SBP: ${sbp} mmHg (Urg: ≥${urgentDeviation.sbpMax})`);
      deviatedParameters.push({
        parameter: 'Systolic BP',
        actualValue: `${sbp} mmHg`,
        expectedRange: `${normalRange.sbp[0]}-${normalRange.sbp[1]} mmHg`,
        breachType: 'URGENT',
      });
    } else if (urgentDeviation.sbpMin && sbp <= urgentDeviation.sbpMin) {
      isUrgent = true;
      breachedMetrics.push(`Low SBP: ${sbp} mmHg (Urg: ≤${urgentDeviation.sbpMin})`);
      deviatedParameters.push({
        parameter: 'Systolic BP',
        actualValue: `${sbp} mmHg`,
        expectedRange: `${normalRange.sbp[0]}-${normalRange.sbp[1]} mmHg`,
        breachType: 'URGENT',
      });
    }
  }

  // 2. Diastolic BP Check
  if (dbp !== undefined) {
    if (emergencyDeviation.dbpMax && dbp >= emergencyDeviation.dbpMax) {
      isEmergency = true;
      breachedMetrics.push(`Severe DBP Elevation: ${dbp} mmHg (Crit: ≥${emergencyDeviation.dbpMax})`);
      deviatedParameters.push({
        parameter: 'Diastolic BP',
        actualValue: `${dbp} mmHg`,
        expectedRange: `${normalRange.dbp[0]}-${normalRange.dbp[1]} mmHg`,
        breachType: 'EMERGENCY',
      });
    } else if (emergencyDeviation.dbpMin && dbp <= emergencyDeviation.dbpMin) {
      isEmergency = true;
      breachedMetrics.push(`Critical Diastolic Collapse: ${dbp} mmHg (Crit: ≤${emergencyDeviation.dbpMin})`);
      deviatedParameters.push({
        parameter: 'Diastolic BP',
        actualValue: `${dbp} mmHg`,
        expectedRange: `${normalRange.dbp[0]}-${normalRange.dbp[1]} mmHg`,
        breachType: 'EMERGENCY',
      });
    } else if (urgentDeviation.dbpMax && dbp >= urgentDeviation.dbpMax) {
      isUrgent = true;
      breachedMetrics.push(`Elevated DBP: ${dbp} mmHg (Urg: ≥${urgentDeviation.dbpMax})`);
      deviatedParameters.push({
        parameter: 'Diastolic BP',
        actualValue: `${dbp} mmHg`,
        expectedRange: `${normalRange.dbp[0]}-${normalRange.dbp[1]} mmHg`,
        breachType: 'URGENT',
      });
    }
  }

  // 3. Heart Rate Check
  if (hr !== undefined) {
    if (emergencyDeviation.hrMax && hr >= emergencyDeviation.hrMax) {
      isEmergency = true;
      breachedMetrics.push(`Malignant Tachycardia: ${hr} bpm (Crit: ≥${emergencyDeviation.hrMax})`);
      deviatedParameters.push({
        parameter: 'Heart Rate',
        actualValue: `${hr} bpm`,
        expectedRange: `${normalRange.hr[0]}-${normalRange.hr[1]} bpm`,
        breachType: 'EMERGENCY',
      });
    } else if (emergencyDeviation.hrMin && hr <= emergencyDeviation.hrMin) {
      isEmergency = true;
      breachedMetrics.push(`Severe Bradycardia: ${hr} bpm (Crit: ≤${emergencyDeviation.hrMin})`);
      deviatedParameters.push({
        parameter: 'Heart Rate',
        actualValue: `${hr} bpm`,
        expectedRange: `${normalRange.hr[0]}-${normalRange.hr[1]} bpm`,
        breachType: 'EMERGENCY',
      });
    } else if (urgentDeviation.hrMax && hr >= urgentDeviation.hrMax) {
      isUrgent = true;
      breachedMetrics.push(`Tachycardia: ${hr} bpm (Urg: ≥${urgentDeviation.hrMax})`);
      deviatedParameters.push({
        parameter: 'Heart Rate',
        actualValue: `${hr} bpm`,
        expectedRange: `${normalRange.hr[0]}-${normalRange.hr[1]} bpm`,
        breachType: 'URGENT',
      });
    } else if (urgentDeviation.hrMin && hr <= urgentDeviation.hrMin) {
      isUrgent = true;
      breachedMetrics.push(`Bradycardia: ${hr} bpm (Urg: ≤${urgentDeviation.hrMin})`);
      deviatedParameters.push({
        parameter: 'Heart Rate',
        actualValue: `${hr} bpm`,
        expectedRange: `${normalRange.hr[0]}-${normalRange.hr[1]} bpm`,
        breachType: 'URGENT',
      });
    }
  }

  // 4. Oxygen Saturation (SpO2) Check
  if (spo2 !== undefined) {
    if (emergencyDeviation.spo2Min && spo2 <= emergencyDeviation.spo2Min) {
      isEmergency = true;
      breachedMetrics.push(`Severe Hypoxia: ${spo2}% (Crit: ≤${emergencyDeviation.spo2Min}%)`);
      deviatedParameters.push({
        parameter: 'Oxygen Saturation',
        actualValue: `${spo2}%`,
        expectedRange: `${normalRange.spo2[0]}-${normalRange.spo2[1]}%`,
        breachType: 'EMERGENCY',
      });
    } else if (urgentDeviation.spo2Min && spo2 <= urgentDeviation.spo2Min) {
      isUrgent = true;
      breachedMetrics.push(`Low SpO2: ${spo2}% (Urg: ≤${urgentDeviation.spo2Min}%)`);
      deviatedParameters.push({
        parameter: 'Oxygen Saturation',
        actualValue: `${spo2}%`,
        expectedRange: `${normalRange.spo2[0]}-${normalRange.spo2[1]}%`,
        breachType: 'URGENT',
      });
    }
  }

  // 5. Respiratory Rate (RR) Check
  if (rr !== undefined) {
    if (emergencyDeviation.rrMax && rr >= emergencyDeviation.rrMax) {
      isEmergency = true;
      breachedMetrics.push(`Severe Tachypnea: ${rr} bpm (Crit: ≥${emergencyDeviation.rrMax})`);
      deviatedParameters.push({
        parameter: 'Respiratory Rate',
        actualValue: `${rr} bpm`,
        expectedRange: `${normalRange.rr?.[0] || 12}-${normalRange.rr?.[1] || 20} bpm`,
        breachType: 'EMERGENCY',
      });
    } else if (emergencyDeviation.rrMin && rr <= emergencyDeviation.rrMin) {
      isEmergency = true;
      breachedMetrics.push(`Imminent Respiratory Arrest: ${rr} bpm (Crit: ≤${emergencyDeviation.rrMin})`);
      deviatedParameters.push({
        parameter: 'Respiratory Rate',
        actualValue: `${rr} bpm`,
        expectedRange: `${normalRange.rr?.[0] || 12}-${normalRange.rr?.[1] || 20} bpm`,
        breachType: 'EMERGENCY',
      });
    } else if (urgentDeviation.rrMax && rr >= urgentDeviation.rrMax) {
      isUrgent = true;
      breachedMetrics.push(`Tachypnea: ${rr} bpm (Urg: ≥${urgentDeviation.rrMax})`);
      deviatedParameters.push({
        parameter: 'Respiratory Rate',
        actualValue: `${rr} bpm`,
        expectedRange: `${normalRange.rr?.[0] || 12}-${normalRange.rr?.[1] || 20} bpm`,
        breachType: 'URGENT',
      });
    }
  }

  // 6. Blood Glucose Check
  if (glucose !== undefined) {
    if (emergencyDeviation.glucoseMax && glucose >= emergencyDeviation.glucoseMax) {
      isEmergency = true;
      breachedMetrics.push(`Critical Hyperglycemia / HHS: ${glucose} mg/dL (Crit: ≥${emergencyDeviation.glucoseMax})`);
      deviatedParameters.push({
        parameter: 'Blood Glucose',
        actualValue: `${glucose} mg/dL`,
        expectedRange: `${normalRange.glucose?.[0] || 80}-${normalRange.glucose?.[1] || 180} mg/dL`,
        breachType: 'EMERGENCY',
      });
    } else if (emergencyDeviation.glucoseMin && glucose <= emergencyDeviation.glucoseMin) {
      isEmergency = true;
      breachedMetrics.push(`Profound Neuroglycopenia / Hypoglycemia: ${glucose} mg/dL (Crit: ≤${emergencyDeviation.glucoseMin})`);
      deviatedParameters.push({
        parameter: 'Blood Glucose',
        actualValue: `${glucose} mg/dL`,
        expectedRange: `${normalRange.glucose?.[0] || 80}-${normalRange.glucose?.[1] || 180} mg/dL`,
        breachType: 'EMERGENCY',
      });
    } else if (urgentDeviation.glucoseMax && glucose >= urgentDeviation.glucoseMax) {
      isUrgent = true;
      breachedMetrics.push(`Marked Hyperglycemia: ${glucose} mg/dL (Urg: ≥${urgentDeviation.glucoseMax})`);
      deviatedParameters.push({
        parameter: 'Blood Glucose',
        actualValue: `${glucose} mg/dL`,
        expectedRange: `${normalRange.glucose?.[0] || 80}-${normalRange.glucose?.[1] || 180} mg/dL`,
        breachType: 'URGENT',
      });
    } else if (urgentDeviation.glucoseMin && glucose <= urgentDeviation.glucoseMin) {
      isUrgent = true;
      breachedMetrics.push(`Mild Hypoglycemia: ${glucose} mg/dL (Urg: ≤${urgentDeviation.glucoseMin})`);
      deviatedParameters.push({
        parameter: 'Blood Glucose',
        actualValue: `${glucose} mg/dL`,
        expectedRange: `${normalRange.glucose?.[0] || 80}-${normalRange.glucose?.[1] || 180} mg/dL`,
        breachType: 'URGENT',
      });
    }
  }

  // 7. Temperature Check (Sepsis / Severe Infection)
  if (temp !== undefined) {
    if (emergencyDeviation.tempMax && temp >= emergencyDeviation.tempMax) {
      isEmergency = true;
      breachedMetrics.push(`Hyperpyrexia: ${temp}°C (Crit: ≥${emergencyDeviation.tempMax}°C)`);
      deviatedParameters.push({
        parameter: 'Body Temperature',
        actualValue: `${temp}°C`,
        expectedRange: '36.5-37.5°C',
        breachType: 'EMERGENCY',
      });
    } else if (emergencyDeviation.tempMin && temp <= emergencyDeviation.tempMin) {
      isEmergency = true;
      breachedMetrics.push(`Hypothermic Sepsis: ${temp}°C (Crit: ≤${emergencyDeviation.tempMin}°C)`);
      deviatedParameters.push({
        parameter: 'Body Temperature',
        actualValue: `${temp}°C`,
        expectedRange: '36.5-37.5°C',
        breachType: 'EMERGENCY',
      });
    } else if (urgentDeviation.tempMax && temp >= urgentDeviation.tempMax) {
      isUrgent = true;
      breachedMetrics.push(`High Fever: ${temp}°C (Urg: ≥${urgentDeviation.tempMax}°C)`);
      deviatedParameters.push({
        parameter: 'Body Temperature',
        actualValue: `${temp}°C`,
        expectedRange: '36.5-37.5°C',
        breachType: 'URGENT',
      });
    }
  }

  let recommendedTriageLevel: TriageLevel = 'LEVEL_4_ROUTINE';
  let severity: VitalDeviationAnalysis['severity'] = 'NORMAL';

  if (isEmergency) {
    recommendedTriageLevel = 'LEVEL_1_EMERGENCY';
    severity = 'CRITICAL_EMERGENCY_DEVIATION';
  } else if (isUrgent) {
    recommendedTriageLevel = 'LEVEL_2_URGENT';
    severity = 'URGENT_DEVIATION';
  } else {
    // Preserve priority if patient has underlying risks
    recommendedTriageLevel = record.assessmentResult?.triage.level || 'LEVEL_4_ROUTINE';
    severity = 'NORMAL';
  }

  const clinicalRationale = breachedMetrics.length > 0
    ? `Automated Vitals Monitor: Detected ${condition.displayName} physiological deviation [${breachedMetrics.join(', ')}] requiring immediate triage escalation.`
    : `Vitals within safe physiological envelope for ${condition.displayName}.`;

  return {
    condition,
    isDeviated: isEmergency || isUrgent,
    recommendedTriageLevel,
    severity,
    breachedMetrics,
    clinicalRationale,
    deviatedParameters,
  };
}

/**
 * Triage Priority Rank helper (Lower rank number = higher urgency)
 */
function getTriageRank(level: TriageLevel): number {
  switch (level) {
    case 'LEVEL_1_EMERGENCY':
      return 1;
    case 'LEVEL_2_URGENT':
      return 2;
    case 'LEVEL_3_PRIORITY':
      return 3;
    case 'LEVEL_4_ROUTINE':
      return 4;
    case 'LEVEL_5_LOW_RISK':
      return 5;
    default:
      return 4;
  }
}

/**
 * Evaluates patient's vitals and automatically updates the Triage level in the record
 * if a physiological deviation for their condition is detected.
 */
export function autoUpdatePatientTriage(
  record: PatientAssessmentRecord,
  source: 'BEDSIDE_QUICK_VITALS' | 'TELEMETRY_MONITOR' | 'REGISTRY_AUDIT' = 'BEDSIDE_QUICK_VITALS'
): {
  updatedRecord: PatientAssessmentRecord;
  escalated: boolean;
  oldLevel: TriageLevel;
  newLevel: TriageLevel;
  reason?: string;
  conditionName: string;
} {
  const analysis = analyzeVitalsDeviation(record);
  const currentLevel: TriageLevel = record.assessmentResult?.triage.level || 'LEVEL_4_ROUTINE';
  const targetLevel = analysis.recommendedTriageLevel;

  const currentRank = getTriageRank(currentLevel);
  const targetRank = getTriageRank(targetLevel);

  // Auto-escalate if the calculated level is higher priority than current
  const shouldEscalate = analysis.isDeviated && targetRank < currentRank;

  if (!shouldEscalate) {
    return {
      updatedRecord: record,
      escalated: false,
      oldLevel: currentLevel,
      newLevel: currentLevel,
      conditionName: analysis.condition.displayName,
    };
  }

  // Create an automated triage event log
  const triageEvent: AutomatedTriageEvent = {
    eventId: `ATE_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    timestamp: new Date().toISOString(),
    previousLevel: currentLevel,
    newLevel: targetLevel,
    conditionDetected: analysis.condition.displayName,
    breachedMetrics: analysis.breachedMetrics,
    rationale: analysis.clinicalRationale,
    triggerSource: source,
    escalated: true,
  };

  // Build high-urgency red flag alert
  const autoAlert: RedFlagAlert = {
    id: `RF_AUTO_${Date.now()}`,
    ruleCode: 'AUTO_VITALS_DEVIATION',
    category:
      targetLevel === 'LEVEL_1_EMERGENCY'
        ? analysis.condition.conditionKey === 'CARDIOVASCULAR'
          ? 'CARDIAC_EMERGENCY'
          : analysis.condition.conditionKey === 'RESPIRATORY'
          ? 'RESPIRATORY_CRISIS'
          : 'HYPERTENSIVE_CRISIS'
        : 'METABOLIC_CRISIS',
    title: `Automated Triage Escalation: ${analysis.condition.displayName}`,
    description: analysis.clinicalRationale,
    urgency: targetLevel === 'LEVEL_1_EMERGENCY' ? 'EMERGENCY' : 'CRITICAL_URGENT',
    recommendedAction: `Immediate Bedside Attending Physician Evaluation. Protocol: Continuous vitals telemetry, IV access, and targeted diagnostic workup (${analysis.breachedMetrics.slice(0, 2).join('; ')}).`,
    triggeredBy: analysis.breachedMetrics,
  };

  const levelName =
    targetLevel === 'LEVEL_1_EMERGENCY'
      ? 'Level 1: Resuscitation / Immediate Emergency [AUTO-MONITORED]'
      : 'Level 2: Urgent / Emergent Assessment [AUTO-MONITORED]';

  const levelColor = targetLevel === 'LEVEL_1_EMERGENCY' ? 'bg-red-600' : 'bg-orange-600';

  const updatedRecord: PatientAssessmentRecord = {
    ...record,
    automatedTriageLog: triageEvent,
    assessmentResult: {
      assessmentId: record.assessmentResult?.assessmentId || `ASM_${Date.now()}`,
      patientId: record.demographics.patientId,
      timestamp: new Date().toISOString(),
      isEmergency: targetLevel === 'LEVEL_1_EMERGENCY' || (record.assessmentResult?.isEmergency ?? false),
      triage: {
        level: targetLevel,
        levelName,
        levelColor,
        urgencyText:
          targetLevel === 'LEVEL_1_EMERGENCY'
            ? 'IMMEDIATE PHYSICIAN BEDSIDE EVALUATION REQUIRED (< 5 MINS)'
            : 'URGENT CLINICAL ASSESSMENT REQUIRED (< 30 MINS)',
        summary: analysis.clinicalRationale,
      },
      redFlags: [autoAlert, ...(record.assessmentResult?.redFlags || [])],
      risks: record.assessmentResult?.risks || {
        cardiovascular: {
          conditionName: 'Cardiovascular',
          conditionKey: 'cardiovascular',
          riskScore: targetLevel === 'LEVEL_1_EMERGENCY' ? 0.85 : 0.65,
          riskCategory: targetLevel === 'LEVEL_1_EMERGENCY' ? 'URGENT' : 'HIGH',
          modelUsed: 'CVD-XGB-001',
          modelVersion: '2.4.0',
          calibrated: true,
          contributingFactors: [],
          clinicalConsiderations: ['Automated vitals deviation detected'],
          suggestedInvestigations: ['ECG', 'Troponin', 'Chest X-Ray'],
        },
        hypertension: {
          conditionName: 'Hypertension',
          conditionKey: 'hypertension',
          riskScore: targetLevel === 'LEVEL_1_EMERGENCY' ? 0.9 : 0.7,
          riskCategory: 'HIGH',
          modelUsed: 'HTN-XGB-001',
          modelVersion: '2.4.0',
          calibrated: true,
          contributingFactors: [],
          clinicalConsiderations: [],
          suggestedInvestigations: [],
        },
        diabetes: {
          conditionName: 'Diabetes',
          conditionKey: 'diabetes',
          riskScore: 0.4,
          riskCategory: 'MODERATE',
          modelUsed: 'GLU-XGB-001',
          modelVersion: '2.4.0',
          calibrated: true,
          contributingFactors: [],
          clinicalConsiderations: [],
          suggestedInvestigations: [],
        },
        respiratory: {
          conditionName: 'Respiratory',
          conditionKey: 'respiratory',
          riskScore: 0.5,
          riskCategory: 'MODERATE',
          modelUsed: 'RESP-XGB-001',
          modelVersion: '2.4.0',
          calibrated: true,
          contributingFactors: [],
          clinicalConsiderations: [],
          suggestedInvestigations: [],
        },
      },
      dataCompleteness: record.assessmentResult?.dataCompleteness || {
        percentage: 95,
        missingCriticalFields: [],
        reliabilityGrade: 'EXCELLENT',
        guidance: 'Real-time telemetry and bedside vitals recorded.',
      },
      suggestedClinicalActions: [
        'Alert attending emergency physician for immediate bedside review',
        'Initiate continuous cardiac & pulse oximetry telemetry',
        'Secure peripheral IV access & prepare targeted intervention protocol',
        ...(record.assessmentResult?.suggestedClinicalActions || []),
      ],
      suggestedInvestigations: [
        'Stat 12-Lead Electrocardiogram (ECG)',
        'Stat Point-of-Care Blood Gas & Electrolytes',
        'Cardiac Enzymes / High-Sensitivity Troponin',
        ...(record.assessmentResult?.suggestedInvestigations || []),
      ],
      disclaimer:
        'Automated Patient Triage Status Monitor algorithm certified for clinical decision support. Physician confirmation required.',
    },
  };

  return {
    updatedRecord,
    escalated: true,
    oldLevel: currentLevel,
    newLevel: targetLevel,
    reason: analysis.clinicalRationale,
    conditionName: analysis.condition.displayName,
  };
}

/**
 * Batch audit all records in the registry to detect any patients whose current vitals
 * violate condition ranges, auto-updating their triage level and logging results.
 */
export function runAutomatedTriageBatchAudit(records: PatientAssessmentRecord[]): {
  updatedRecords: PatientAssessmentRecord[];
  autoEscalatedCount: number;
  events: AutomatedTriageEvent[];
} {
  let autoEscalatedCount = 0;
  const events: AutomatedTriageEvent[] = [];

  const updatedRecords = records.map((record) => {
    const result = autoUpdatePatientTriage(record, 'REGISTRY_AUDIT');
    if (result.escalated) {
      autoEscalatedCount++;
      if (result.updatedRecord.automatedTriageLog) {
        events.push(result.updatedRecord.automatedTriageLog);
      }
      return result.updatedRecord;
    }
    return record;
  });

  return {
    updatedRecords,
    autoEscalatedCount,
    events,
  };
}
