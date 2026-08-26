import {
  SymptomOccurrence,
  VitalSigns,
  ClinicalProfile,
  RedFlagAlert,
  TriageLevel,
} from '../types/clinical';

export function evaluateRedFlags(
  symptoms: SymptomOccurrence[],
  vitals: VitalSigns,
  profile: ClinicalProfile
): RedFlagAlert[] {
  const alerts: RedFlagAlert[] = [];
  const presentSymptomCodes = new Set(
    symptoms.filter((s) => s.present).map((s) => s.code)
  );

  // 1. Acute Stroke Screen (FAST & WHO Stroke Guidelines)
  const hasFacialDroop = presentSymptomCodes.has('NE001');
  const hasArmWeakness = presentSymptomCodes.has('NE002');
  const hasLegWeakness = presentSymptomCodes.has('NE003');
  const hasSpeechDifficulty = presentSymptomCodes.has('NE005');
  const hasSuddenVisionLoss = presentSymptomCodes.has('NE007');
  const hasAlteredConsciousness = presentSymptomCodes.has('NE011');
  const hasThunderclapHeadache = presentSymptomCodes.has('NE009');

  const strokeSymptomsPresent = [
    hasFacialDroop && 'Facial Droop',
    hasArmWeakness && 'Arm Weakness',
    hasLegWeakness && 'Leg Weakness',
    hasSpeechDifficulty && 'Speech Difficulty',
    hasSuddenVisionLoss && 'Sudden Vision Loss',
    hasAlteredConsciousness && 'Altered Consciousness',
    hasThunderclapHeadache && 'Thunderclap Sudden Headache',
  ].filter(Boolean) as string[];

  if (strokeSymptomsPresent.length > 0) {
    alerts.push({
      id: `RF-STROKE-${Date.now()}`,
      ruleCode: 'RULE-STROKE-FAST-001',
      category: 'STROKE_EMERGENCY',
      title: '🚨 Acute Stroke / Neurological Emergency Suspected',
      description: `Acute focal neurological deficit detected: ${strokeSymptomsPresent.join(
        ', '
      )}. Highly time-sensitive brain ischemia or intracranial event.`,
      urgency: 'EMERGENCY',
      recommendedAction:
        'Immediate emergency medical transfer to stroke-ready emergency department. Do not give aspirin or oral intake until non-contrast CT brain excluded hemorrhage. Note Time Last Known Well (TLKW).',
      triggeredBy: strokeSymptomsPresent,
    });
  }

  // 2. Acute Coronary Syndrome / Cardiac Red Flags (WHO HEARTS / AHA Guidelines)
  const hasChestDiscomfort =
    presentSymptomCodes.has('CV001') ||
    presentSymptomCodes.has('CV002') ||
    presentSymptomCodes.has('CV003');

  const hasRadiation =
    presentSymptomCodes.has('CV013') ||
    presentSymptomCodes.has('CV014') ||
    presentSymptomCodes.has('CV015');

  const hasColdSweat = presentSymptomCodes.has('CV010');
  const hasRestDyspnea = presentSymptomCodes.has('CV005');
  const hasSyncope = presentSymptomCodes.has('CV009');

  // Severe chest pain or chest pain + high risk combo
  const cardiacEmergencyFeatures = [
    hasChestDiscomfort && 'Chest Pain/Pressure',
    hasRadiation && 'Pain Radiation (Arm/Jaw/Back)',
    hasColdSweat && 'Cold Diaphoresis',
    hasRestDyspnea && 'Shortness of Breath at Rest',
    hasSyncope && 'Syncope / Fainting',
  ].filter(Boolean) as string[];

  if (
    (hasChestDiscomfort && (hasRadiation || hasColdSweat || hasSyncope || hasRestDyspnea)) ||
    (hasChestDiscomfort && (profile.previousCVD || profile.diabetesHistory) && hasColdSweat) ||
    hasSyncope
  ) {
    alerts.push({
      id: `RF-CARDIAC-${Date.now()}`,
      ruleCode: 'RULE-CARDIAC-ACS-002',
      category: 'CARDIAC_EMERGENCY',
      title: '🚨 Suspected Acute Coronary Syndrome (ACS) / Cardiac Emergency',
      description: `High-risk acute cardiac constellation detected: ${cardiacEmergencyFeatures.join(
        ', '
      )}. Risk of myocardial infarction, acute ischemia, or life-threatening arrhythmia.`,
      urgency: 'EMERGENCY',
      recommendedAction:
        'Immediate 12-lead ECG within 10 minutes. Continuous cardiac rhythm monitoring. Check high-sensitivity Troponin. Administer sublingual nitroglycerin/aspirin per local physician protocol if no contraindications.',
      triggeredBy: cardiacEmergencyFeatures,
    });
  }

  // 3. Severe Respiratory Failure / Hypoxia
  const spo2 = vitals.oxygenSaturation;
  const respRate = vitals.respiratoryRate;
  const hasSevereDyspnea = presentSymptomCodes.has('RS004');
  const hasHemoptysis = presentSymptomCodes.has('RS008');

  if ((spo2 !== undefined && spo2 < 90) || (respRate !== undefined && respRate >= 30) || (hasSevereDyspnea && (spo2 !== undefined && spo2 < 92))) {
    const respTriggers: string[] = [];
    if (spo2 !== undefined && spo2 < 90) respTriggers.push(`Critical Hypoxemia (SpO2 ${spo2}%)`);
    if (respRate !== undefined && respRate >= 30) respTriggers.push(`Severe Tachypnea (${respRate} bpm)`);
    if (hasSevereDyspnea) respTriggers.push('Severe Breathlessness at Rest');

    alerts.push({
      id: `RF-RESP-${Date.now()}`,
      ruleCode: 'RULE-RESP-HYPOXIA-003',
      category: 'RESPIRATORY_CRISIS',
      title: '🚨 Severe Respiratory Compromise / Hypoxia',
      description: `Severe gas-exchange failure or respiratory distress: ${respTriggers.join(', ')}. Risk of impending respiratory exhaustion.`,
      urgency: 'EMERGENCY',
      recommendedAction:
        'Immediate supplemental high-flow oxygen targeting SpO2 94-98% (or 88-92% in chronic hypercapnic COPD). Position upright. Urgent physician evaluation for bronchodilators, steroids, or non-invasive ventilation.',
      triggeredBy: respTriggers,
    });
  } else if (hasHemoptysis) {
    alerts.push({
      id: `RF-HEMOPTYSIS-${Date.now()}`,
      ruleCode: 'RULE-RESP-HEMOP-004',
      category: 'RESPIRATORY_CRISIS',
      title: '🔴 Frank Hemoptysis (Active Pulmonary Bleed)',
      description: 'Active coughing of blood requires immediate urgent diagnostic workup (TB, pulmonary embolism, malignancy, bronchiectasis).',
      urgency: 'CRITICAL_URGENT',
      recommendedAction: 'Urgent chest imaging (Chest X-ray / CT Angiography), CBC, coagulation profile, sputum AFB/GeneXpert.',
      triggeredBy: ['Hemoptysis (Coughing blood)'],
    });
  }

  // 4. Hypertensive Emergency vs Urgency
  const sbp = vitals.systolicBp;
  const dbp = vitals.diastolicBp;
  if ((sbp !== undefined && sbp >= 180) || (dbp !== undefined && dbp >= 120)) {
    const endOrganSymptoms = [
      hasChestDiscomfort && 'Chest Discomfort',
      hasSpeechDifficulty && 'Speech Deficit',
      hasThunderclapHeadache && 'Severe Headache',
      hasSuddenVisionLoss && 'Visual Blurriness',
      hasRestDyspnea && 'Pulmonary Congestion/Dyspnea',
    ].filter(Boolean) as string[];

    if (endOrganSymptoms.length > 0) {
      alerts.push({
        id: `RF-HTN-EMERGENCY-${Date.now()}`,
        ruleCode: 'RULE-HTN-EMERG-005',
        category: 'HYPERTENSIVE_CRISIS',
        title: '🚨 Hypertensive Emergency with Suspected End-Organ Damage',
        description: `Severe blood pressure elevation (${sbp || '?'}/${dbp || '?'} mmHg) accompanied by acute end-organ symptoms: ${endOrganSymptoms.join(
          ', '
        )}.`,
        urgency: 'EMERGENCY',
        recommendedAction:
          'Hospital admission to HDU/ICU. Controlled intravenous blood pressure reduction (avoid precipitous dropping of MAP > 25% in first hour). Urgent ECG, fundoscopy, urinalysis, serum creatinine, cardiac biomarkers.',
        triggeredBy: [`BP ${sbp}/${dbp} mmHg`, ...endOrganSymptoms],
      });
    } else {
      alerts.push({
        id: `RF-HTN-URGENCY-${Date.now()}`,
        ruleCode: 'RULE-HTN-URG-006',
        category: 'HYPERTENSIVE_CRISIS',
        title: '🔴 Hypertensive Urgency (Severe Asymptomatic BP Elevation)',
        description: `Severe blood pressure elevation (${sbp || '?'}/${dbp || '?'} mmHg) without overt acute target organ symptoms. Requires prompt medical management.`,
        urgency: 'CRITICAL_URGENT',
        recommendedAction:
          'Physician evaluation within 2-4 hours. Rest and repeat measurement. Oral antihypertensive therapy adjustment. Outpatient follow-up within 24-48 hours.',
        triggeredBy: [`BP ${sbp}/${dbp} mmHg`],
      });
    }
  }

  // 5. Critical Metabolic Derangement (Hyperglycemia / Hypoglycemia)
  const glucose = vitals.bloodGlucoseMgDl;
  if (glucose !== undefined) {
    if (glucose < 60) {
      alerts.push({
        id: `RF-HYPO-007`,
        ruleCode: 'RULE-METAB-HYPO-007',
        category: 'METABOLIC_CRISIS',
        title: '🚨 Severe Hypoglycemia (< 60 mg/dL)',
        description: `Critical low plasma glucose of ${glucose} mg/dL. Risk of neuroglycopenic brain injury, seizure, and coma.`,
        urgency: 'EMERGENCY',
        recommendedAction:
          'Rule of 15: Give 15-20g fast-acting oral glucose if conscious. If unconscious or NPO, administer IV 25-50 mL 50% Dextrose (or 100 mL 10% Dextrose) or IM Glucagon. Recheck blood glucose in 15 minutes.',
        triggeredBy: [`Blood Glucose: ${glucose} mg/dL`],
      });
    } else if (glucose >= 350) {
      alerts.push({
        id: `RF-HYPER-008`,
        ruleCode: 'RULE-METAB-HYPER-008',
        category: 'METABOLIC_CRISIS',
        title: '🔴 Marked Hyperglycemia (≥ 350 mg/dL) / Rule out DKA/HHS',
        description: `Severely elevated blood glucose of ${glucose} mg/dL. Risk of Diabetic Ketoacidosis (DKA) or Hyperosmolar Hyperglycemic State (HHS).`,
        urgency: 'CRITICAL_URGENT',
        recommendedAction:
          'Urgent venous blood gas (pH, bicarbonate), serum/urine ketones, serum electrolytes (sodium, potassium), creatinine, and urgent IV fluid rehydration under medical supervision.',
        triggeredBy: [`Blood Glucose: ${glucose} mg/dL`],
      });
    }
  }

  return alerts;
}

export function determineTriageLevel(
  redFlags: RedFlagAlert[],
  vitals: VitalSigns,
  symptoms: SymptomOccurrence[]
): {
  level: TriageLevel;
  levelName: string;
  levelColor: string;
  urgencyText: string;
  summary: string;
} {
  const hasEmergency = redFlags.some((rf) => rf.urgency === 'EMERGENCY');
  const hasCriticalUrgent = redFlags.some((rf) => rf.urgency === 'CRITICAL_URGENT');

  if (hasEmergency) {
    return {
      level: 'LEVEL_1_EMERGENCY',
      levelName: 'Level 1: 🚨 Emergency',
      levelColor: 'bg-red-600 text-white border-red-700',
      urgencyText: 'Immediate Emergency Care Required (Minutes Count)',
      summary:
        'Life-threatening red flags detected. Machine learning assessment is bypassed for immediate clinical stabilization and emergency dispatch.',
    };
  }

  if (hasCriticalUrgent) {
    return {
      level: 'LEVEL_2_URGENT',
      levelName: 'Level 2: 🔴 Urgent Clinical Review',
      levelColor: 'bg-orange-600 text-white border-orange-700',
      urgencyText: 'Urgent Same-Day Medical Evaluation Needed (< 2-4 Hours)',
      summary:
        'High-severity clinical signs or marked vital abnormalities requiring prompt physician evaluation today.',
    };
  }

  // Check for Priority (e.g. symptomatic moderate vitals, multiple high risk indicators)
  const activeSymptomCount = symptoms.filter((s) => s.present).length;
  const sbp = vitals.systolicBp || 0;
  const glucose = vitals.bloodGlucoseMgDl || 0;

  if (
    sbp >= 140 ||
    glucose >= 180 ||
    activeSymptomCount >= 3 ||
    vitals.oxygenSaturation !== undefined && vitals.oxygenSaturation <= 94
  ) {
    return {
      level: 'LEVEL_3_PRIORITY',
      levelName: 'Level 3: 🟠 Priority Clinical Review',
      levelColor: 'bg-amber-500 text-white border-amber-600',
      urgencyText: 'Priority Outpatient / Primary Clinic Evaluation (24-48 Hours)',
      summary:
        'Elevated chronic disease risk or moderate symptom constellation. Scheduled doctor review and diagnostic laboratory testing recommended.',
    };
  }

  if (activeSymptomCount >= 1 || sbp >= 130 || glucose >= 140) {
    return {
      level: 'LEVEL_4_ROUTINE',
      levelName: 'Level 4: 🟡 Routine Clinical Review',
      levelColor: 'bg-yellow-500 text-slate-900 border-yellow-600',
      urgencyText: 'Routine Primary Care Follow-up (1-2 Weeks)',
      summary:
        'Mild symptoms or borderline risk factors. Primary healthcare provider evaluation for lifestyle modification and baseline screening.',
    };
  }

  return {
    level: 'LEVEL_5_LOW_RISK',
    levelName: 'Level 5: 🟢 Low Risk / Monitoring',
    levelColor: 'bg-emerald-600 text-white border-emerald-700',
    urgencyText: 'Self-Care, Preventive Health & Periodic Screening',
    summary:
      'No acute red flags and normal vitals. Maintain standard healthy lifestyle, balanced diet, physical activity, and annual routine check-ups.',
  };
}
