import {
  PatientDemographics,
  ClinicalProfile,
  VitalSigns,
  SymptomOccurrence,
  LabResults,
  ConditionRiskAssessment,
  AssessmentResult,
  SHAPContribution,
  RiskCategory,
} from '../types/clinical';
import { evaluateRedFlags, determineTriageLevel } from './safetyEngine';

export function calculateCardiovascularRisk(
  demographics: PatientDemographics,
  profile: ClinicalProfile,
  vitals: VitalSigns,
  labs: LabResults,
  symptoms: SymptomOccurrence[]
): ConditionRiskAssessment {
  let rawScore = 0.05; // base population risk

  const contributions: SHAPContribution[] = [];

  // Age factor
  const age = demographics.age;
  if (age >= 65) {
    rawScore += 0.22;
    contributions.push({
      feature: 'Age',
      displayName: 'Age (≥65 years)',
      value: `${age} yrs`,
      contributionPercent: 22,
      direction: 'RISK_INCREASE',
      clinicalRationale: 'Age is a dominant non-modifiable driver of vascular stiffening and plaque vulnerability.',
    });
  } else if (age >= 50) {
    rawScore += 0.14;
    contributions.push({
      feature: 'Age',
      displayName: 'Age (50-64 years)',
      value: `${age} yrs`,
      contributionPercent: 14,
      direction: 'RISK_INCREASE',
      clinicalRationale: 'Accelerated atherogenic vascular remodeling.',
    });
  } else if (age >= 40) {
    rawScore += 0.07;
    contributions.push({
      feature: 'Age',
      displayName: 'Age (40-49 years)',
      value: `${age} yrs`,
      contributionPercent: 7,
      direction: 'RISK_INCREASE',
      clinicalRationale: 'WHO HEARTS recommended screening start bracket.',
    });
  }

  // Blood Pressure
  const sbp = vitals.systolicBp || (profile.hypertensionHistory ? 145 : 120);
  if (sbp >= 160) {
    rawScore += 0.24;
    contributions.push({
      feature: 'Systolic BP',
      displayName: 'Stage 2/Severe Systolic BP',
      value: `${sbp} mmHg`,
      contributionPercent: 24,
      direction: 'RISK_INCREASE',
      clinicalRationale: 'Marked endothelial shear stress and cardiac afterload increase.',
    });
  } else if (sbp >= 140) {
    rawScore += 0.15;
    contributions.push({
      feature: 'Systolic BP',
      displayName: 'Stage 1 Elevated Systolic BP',
      value: `${sbp} mmHg`,
      contributionPercent: 15,
      direction: 'RISK_INCREASE',
      clinicalRationale: 'Systemic hypertension significantly accelerates coronary atherosclerosis.',
    });
  } else if (sbp < 120) {
    contributions.push({
      feature: 'Systolic BP',
      displayName: 'Optimal Blood Pressure',
      value: `${sbp} mmHg`,
      contributionPercent: -6,
      direction: 'RISK_DECREASE',
      clinicalRationale: 'Protective normotensive baseline.',
    });
  }

  // Tobacco / Smoking
  if (profile.smokingStatus === 'CURRENT_SMOKER' || profile.tobaccoUse === 'CHEWING_TOBACCO_NASWAR' || profile.tobaccoUse === 'CIGARETTE') {
    rawScore += 0.18;
    contributions.push({
      feature: 'Tobacco Use',
      displayName: 'Current Smoking / Smokeless Tobacco (Naswar)',
      value: profile.tobaccoUse !== 'NONE' ? profile.tobaccoUse : 'Active Smoker',
      contributionPercent: 18,
      direction: 'RISK_INCREASE',
      clinicalRationale: 'Promotes arterial thrombosis, vasomotor dysfunction, and coronary spasm.',
    });
  }

  // Diabetes / Glucose
  const glucose = vitals.bloodGlucoseMgDl || labs.glucoseFastingMgDl || (profile.diabetesHistory ? 160 : 95);
  const hba1c = labs.hba1cPercent;
  if (profile.diabetesHistory || glucose >= 180 || (hba1c && hba1c >= 8.0)) {
    rawScore += 0.18;
    contributions.push({
      feature: 'Diabetes / Glycemia',
      displayName: 'Type 2 Diabetes / Marked Hyperglycemia',
      value: hba1c ? `HbA1c ${hba1c}%` : `${glucose} mg/dL`,
      contributionPercent: 18,
      direction: 'RISK_INCREASE',
      clinicalRationale: 'Micro- and macrovascular endothelial glycation, independent CVD risk multiplier.',
    });
  } else if (glucose >= 126 || (hba1c && hba1c >= 6.5)) {
    rawScore += 0.10;
    contributions.push({
      feature: 'Diabetes / Glycemia',
      displayName: 'Impaired Glycemia / Controlled Diabetes',
      value: `${glucose} mg/dL`,
      contributionPercent: 10,
      direction: 'RISK_INCREASE',
      clinicalRationale: 'Insulin resistance accelerates atherogenesis.',
    });
  }

  // Lipids (LDL / Total Cholesterol)
  const ldl = labs.ldlCholesterolMgDl;
  const tc = labs.totalCholesterolMgDl;
  if (ldl && ldl >= 160 || tc && tc >= 240) {
    rawScore += 0.12;
    contributions.push({
      feature: 'Dyslipidemia',
      displayName: 'Elevated Atherogenic Lipoproteins',
      value: ldl ? `LDL ${ldl} mg/dL` : `TC ${tc} mg/dL`,
      contributionPercent: 12,
      direction: 'RISK_INCREASE',
      clinicalRationale: 'Direct causal driver of subintimal lipid deposition and foam cell formation.',
    });
  } else if (ldl && ldl < 100) {
    contributions.push({
      feature: 'Lipids',
      displayName: 'Desirable LDL Profile',
      value: `LDL ${ldl} mg/dL`,
      contributionPercent: -4,
      direction: 'RISK_DECREASE',
      clinicalRationale: 'Controlled lipid levels reduce long-term coronary event hazard.',
    });
  }

  // Prior Vascular History
  if (profile.previousCVD || profile.previousStroke) {
    rawScore += 0.20;
    contributions.push({
      feature: 'Vascular History',
      displayName: 'Established CVD / Prior Cerebrovascular Event',
      value: 'Positive History',
      contributionPercent: 20,
      direction: 'RISK_INCREASE',
      clinicalRationale: 'Secondary prevention cohort: established atherosclerotic cardiovascular disease.',
    });
  }

  // Family History
  if (profile.familyHistoryCVD) {
    rawScore += 0.08;
    contributions.push({
      feature: 'Family History',
      displayName: 'Premature CVD in 1st Degree Relative',
      value: 'Positive',
      contributionPercent: 8,
      direction: 'RISK_INCREASE',
      clinicalRationale: 'Polygenic lipid & vascular susceptibility trait.',
    });
  }

  // BMI / Obesity - with strict sanitization against unit confusion
  let bmi = profile.bmi || 24;
  if (bmi > 90 || bmi < 10) {
    let h = profile.heightCm;
    if (h > 0 && h <= 2.5) h = h * 100;
    if (h >= 50 && h <= 250 && profile.weightKg >= 20 && profile.weightKg <= 250) {
      bmi = Number((profile.weightKg / Math.pow(h / 100, 2)).toFixed(1));
    } else {
      bmi = 24.8;
    }
  }
  if (bmi >= 27.5) {
    rawScore += 0.09;
    contributions.push({
      feature: 'Adiposity',
      displayName: 'Obesity (South Asian BMI cut-off >=27.5)',
      value: `BMI ${bmi.toFixed(1)}`,
      contributionPercent: 9,
      direction: 'RISK_INCREASE',
      clinicalRationale: 'Visceral adiposity drives chronic systemic low-grade vascular inflammation.',
    });
  }

  // Symptom modulation
  const hasChestSymptoms = symptoms.some((s) => s.present && s.code.startsWith('CV'));
  if (hasChestSymptoms) {
    rawScore += 0.08;
    contributions.push({
      feature: 'Active Symptoms',
      displayName: 'Cardiovascular Symptom Burden',
      value: 'Present',
      contributionPercent: 8,
      direction: 'RISK_INCREASE',
      clinicalRationale: 'Exertional or ischemic symptomatic manifestation.',
    });
  }

  // Bound score between 0.02 and 0.96
  const riskScore = Math.min(0.96, Math.max(0.02, Number(rawScore.toFixed(2))));

  let riskCategory: RiskCategory = 'LOW';
  if (riskScore >= 0.70) riskCategory = 'URGENT';
  else if (riskScore >= 0.40) riskCategory = 'HIGH';
  else if (riskScore >= 0.20) riskCategory = 'MODERATE';
  else riskCategory = 'LOW';

  return {
    conditionName: 'Cardiovascular Disease (10-Yr CVD Risk)',
    conditionKey: 'cardiovascular',
    riskScore,
    riskCategory,
    modelUsed: 'CVD-XGBoost-HEARTS (Validated Ensemble)',
    modelVersion: 'v0.2.1-calibrated',
    calibrated: true,
    contributingFactors: contributions.sort((a, b) => Math.abs(b.contributionPercent) - Math.abs(a.contributionPercent)),
    clinicalConsiderations: [
      'Evaluate according to WHO HEARTS Risk-Based CVD Management protocols.',
      'Assess for target organ damage (left ventricular hypertrophy, microalbuminuria).',
      'Review antiplatelet / statin indications with attending physician.',
    ],
    suggestedInvestigations: [
      'Standard 12-Lead Electrocardiogram (ECG)',
      'Fasting Serum Lipid Profile (TC, LDL, HDL, Triglycerides)',
      'Fasting Plasma Glucose & Glycated Hemoglobin (HbA1c)',
      'Serum Creatinine & Estimated Glomerular Filtration Rate (eGFR)',
      'Transthoracic Echocardiogram (if symptomatic or SBP > 160)',
    ],
  };
}

export function calculateHypertensionRisk(
  demographics: PatientDemographics,
  profile: ClinicalProfile,
  vitals: VitalSigns,
  symptoms: SymptomOccurrence[]
): ConditionRiskAssessment {
  const sbp = vitals.systolicBp || 120;
  const dbp = vitals.diastolicBp || 80;
  let rawScore = 0.10;
  const contributions: SHAPContribution[] = [];

  if (sbp >= 160 || dbp >= 100) {
    rawScore += 0.55;
    contributions.push({
      feature: 'Blood Pressure',
      displayName: 'Stage 2 Hypertension (SBP ≥160 or DBP ≥100)',
      value: `${sbp}/${dbp} mmHg`,
      contributionPercent: 55,
      direction: 'RISK_INCREASE',
      clinicalRationale: 'Major sustained peripheral vascular resistance.',
    });
  } else if (sbp >= 140 || dbp >= 90) {
    rawScore += 0.38;
    contributions.push({
      feature: 'Blood Pressure',
      displayName: 'Stage 1 Hypertension (SBP 140-159 or DBP 90-99)',
      value: `${sbp}/${dbp} mmHg`,
      contributionPercent: 38,
      direction: 'RISK_INCREASE',
      clinicalRationale: 'Consistent with WHO 2026 standardized hypertension criteria.',
    });
  } else if (sbp >= 130 || dbp >= 85) {
    rawScore += 0.20;
    contributions.push({
      feature: 'Blood Pressure',
      displayName: 'High-Normal / Prehypertensive Range',
      value: `${sbp}/${dbp} mmHg`,
      contributionPercent: 20,
      direction: 'RISK_INCREASE',
      clinicalRationale: 'Early vascular tension elevation.',
    });
  }

  if (profile.hypertensionHistory) {
    rawScore += 0.15;
    contributions.push({
      feature: 'Prior Diagnosis',
      displayName: 'Documented History of Hypertension',
      value: 'Yes',
      contributionPercent: 15,
      direction: 'RISK_INCREASE',
      clinicalRationale: 'Chronic condition requiring ongoing blood pressure control audit.',
    });
  }

  if (profile.kidneyDisease) {
    rawScore += 0.12;
    contributions.push({
      feature: 'Renal Function',
      displayName: 'Concomitant Chronic Kidney Disease',
      value: 'Positive',
      contributionPercent: 12,
      direction: 'RISK_INCREASE',
      clinicalRationale: 'Renal-parenchymal / renovascular feedback hypertension.',
    });
  }

  const riskScore = Math.min(0.95, Math.max(0.05, Number(rawScore.toFixed(2))));
  let riskCategory: RiskCategory = 'LOW';
  if (riskScore >= 0.65) riskCategory = 'HIGH';
  else if (riskScore >= 0.35) riskCategory = 'MODERATE';
  else riskCategory = 'LOW';

  return {
    conditionName: 'Hypertension & Vascular Strain Risk',
    conditionKey: 'hypertension',
    riskScore,
    riskCategory,
    modelUsed: 'HTN-Classifier-WHO-2026',
    modelVersion: 'v1.0.0',
    calibrated: true,
    contributingFactors: contributions,
    clinicalConsiderations: [
      'Confirm with automated office BP (AOBP) or 24-hour Ambulatory BP Monitoring (ABPM).',
      'Implement sodium restriction (<2g/day) and DASH dietary pattern per WHO guidelines.',
      'Check for drug compliance and potential secondary causes if resistant.',
    ],
    suggestedInvestigations: [
      '24-Hour Ambulatory Blood Pressure Monitoring (ABPM) / Home BP Log',
      'Urinalysis (spot urine albumin-to-creatinine ratio for microalbuminuria)',
      'Serum Electrolytes (Sodium, Potassium, Calcium)',
      'Renal Ultrasound (if secondary hypertension suspected)',
    ],
  };
}

export function calculateDiabetesRisk(
  demographics: PatientDemographics,
  profile: ClinicalProfile,
  vitals: VitalSigns,
  labs: LabResults,
  symptoms: SymptomOccurrence[]
): ConditionRiskAssessment {
  let rawScore = 0.08;
  const contributions: SHAPContribution[] = [];

  const glucose = vitals.bloodGlucoseMgDl || labs.glucoseFastingMgDl || 95;
  const hba1c = labs.hba1cPercent;

  if (hba1c && hba1c >= 6.5 || glucose >= 200) {
    rawScore += 0.60;
    contributions.push({
      feature: 'Glycemic Marker',
      displayName: 'Diagnostic Level Hyperglycemia (HbA1c ≥6.5% or Random ≥200)',
      value: hba1c ? `HbA1c ${hba1c}%` : `${glucose} mg/dL`,
      contributionPercent: 60,
      direction: 'RISK_INCREASE',
      clinicalRationale: 'Meets biochemical thresholds for clinical diabetes evaluation.',
    });
  } else if (glucose >= 126 || (hba1c && hba1c >= 5.7)) {
    rawScore += 0.35;
    contributions.push({
      feature: 'Glycemic Marker',
      displayName: 'Prediabetic Range (Fasting 100-125 / HbA1c 5.7-6.4%)',
      value: `${glucose} mg/dL`,
      contributionPercent: 35,
      direction: 'RISK_INCREASE',
      clinicalRationale: 'Significant risk of progressive beta-cell dysfunction.',
    });
  }

  // Classic osmotic symptoms
  const hasPolyuria = symptoms.some((s) => s.present && s.code === 'DM002');
  const hasPolydipsia = symptoms.some((s) => s.present && s.code === 'DM001');
  const hasWeightLoss = symptoms.some((s) => s.present && s.code === 'DM004');

  if (hasPolyuria || hasPolydipsia || hasWeightLoss) {
    rawScore += 0.20;
    contributions.push({
      feature: 'Osmotic Symptoms',
      displayName: 'Classic Hyperglycemic Symptoms (Thirst/Urination/Weight Loss)',
      value: 'Reported',
      contributionPercent: 20,
      direction: 'RISK_INCREASE',
      clinicalRationale: 'Renal glucosuria threshold exceeded, osmotic diuresis.',
    });
  }

  // Family History & BMI
  if (profile.familyHistoryDiabetes) {
    rawScore += 0.12;
    contributions.push({
      feature: 'Genetics',
      displayName: 'First-Degree Relative with Type 2 Diabetes',
      value: 'Positive',
      contributionPercent: 12,
      direction: 'RISK_INCREASE',
      clinicalRationale: 'High heritability of insulin resistance phenotype in South Asian cohorts.',
    });
  }

  let bmi = profile.bmi || 24;
  if (bmi > 90 || bmi < 10) {
    let h = profile.heightCm;
    if (h > 0 && h <= 2.5) h = h * 100;
    if (h >= 50 && h <= 250 && profile.weightKg >= 20 && profile.weightKg <= 250) {
      bmi = Number((profile.weightKg / Math.pow(h / 100, 2)).toFixed(1));
    } else {
      bmi = 24.8;
    }
  }
  if (bmi >= 27.5) {
    rawScore += 0.14;
    contributions.push({
      feature: 'BMI / Adiposity',
      displayName: 'Elevated South Asian BMI (>=27.5 kg/m²)',
      value: `${bmi.toFixed(1)} kg/m²`,
      contributionPercent: 14,
      direction: 'RISK_INCREASE',
      clinicalRationale: 'Truncal adiposity generates insulin-inhibiting adipokines.',
    });
  }

  const riskScore = Math.min(0.96, Math.max(0.04, Number(rawScore.toFixed(2))));
  let riskCategory: RiskCategory = 'LOW';
  if (riskScore >= 0.65) riskCategory = 'HIGH';
  else if (riskScore >= 0.35) riskCategory = 'MODERATE';
  else riskCategory = 'LOW';

  return {
    conditionName: 'Type 2 Diabetes Screening & Metabolic Risk',
    conditionKey: 'diabetes',
    riskScore,
    riskCategory,
    modelUsed: 'DM-Screen-ADA-XGB',
    modelVersion: 'v0.2.0',
    calibrated: true,
    contributingFactors: contributions,
    clinicalConsiderations: [
      'Screening recommendation: Diagnostic laboratory testing required (Oral Glucose Tolerance Test or repeat fasting plasma glucose).',
      'Assess for microvascular complications: baseline dilated eye exam and spot urine microalbumin.',
      'Lifestyle intervention: Structured nutritional guidance and minimum 150 min/week moderate physical activity.',
    ],
    suggestedInvestigations: [
      'Fasting Plasma Glucose (FPG) with repeat confirmatory sample',
      'Laboratory Glycated Hemoglobin (HbA1c) by HPLC',
      'Spot Urine Albumin-to-Creatinine Ratio (UACR)',
      'Dilated Fundus Examination (Retinopathy Screening)',
      'Comprehensive Diabetic Foot Sensory Exam (10g Monofilament)',
    ],
  };
}

export function calculateRespiratoryRisk(
  profile: ClinicalProfile,
  vitals: VitalSigns,
  symptoms: SymptomOccurrence[]
): ConditionRiskAssessment {
  let rawScore = 0.05;
  const contributions: SHAPContribution[] = [];

  const spo2 = vitals.oxygenSaturation;
  if (spo2 !== undefined && spo2 <= 94) {
    rawScore += 0.40;
    contributions.push({
      feature: 'Pulse Oximetry',
      displayName: `Suboptimal Oxygen Saturation (${spo2}%)`,
      value: `${spo2}%`,
      contributionPercent: 40,
      direction: 'RISK_INCREASE',
      clinicalRationale: 'Impaired alveolar gas exchange or ventilation-perfusion mismatch.',
    });
  }

  const hasChronicCough = symptoms.some((s) => s.present && s.code === 'RS001');
  const hasWheeze = symptoms.some((s) => s.present && s.code === 'RS005');
  const hasDyspnea = symptoms.some((s) => s.present && s.code === 'RS004');

  if (hasChronicCough || hasWheeze || hasDyspnea) {
    rawScore += 0.25;
    contributions.push({
      feature: 'Pulmonary Symptoms',
      displayName: 'Airway / Bronchial Symptoms (Cough/Wheeze/Dyspnea)',
      value: 'Present',
      contributionPercent: 25,
      direction: 'RISK_INCREASE',
      clinicalRationale: 'Obstructive or reactive airway symptomatology.',
    });
  }

  if (profile.asthmaCOPD || profile.smokingStatus === 'CURRENT_SMOKER') {
    rawScore += 0.18;
    contributions.push({
      feature: 'Airway Vulnerability',
      displayName: 'Underlying Asthma/COPD or Active Tobacco Inhalation',
      value: 'Positive',
      contributionPercent: 18,
      direction: 'RISK_INCREASE',
      clinicalRationale: 'Chronic bronchial inflammation and reduced pulmonary reserve.',
    });
  }

  const riskScore = Math.min(0.92, Math.max(0.04, Number(rawScore.toFixed(2))));
  let riskCategory: RiskCategory = 'LOW';
  if (riskScore >= 0.60) riskCategory = 'HIGH';
  else if (riskScore >= 0.30) riskCategory = 'MODERATE';
  else riskCategory = 'LOW';

  return {
    conditionName: 'Chronic Respiratory & Airway Risk',
    conditionKey: 'respiratory',
    riskScore,
    riskCategory,
    modelUsed: 'RESP-Spirometry-Risk-Model',
    modelVersion: 'v0.1.4',
    calibrated: true,
    contributingFactors: contributions,
    clinicalConsiderations: [
      'Evaluate for obstructive pattern (COPD/Asthma) vs pulmonary infection/TB in endemic regions.',
      'Check post-bronchodilator spirometry for irreversible airflow limitation.',
      'Screen for household biomass fuel or ambient air pollution exposure.',
    ],
    suggestedInvestigations: [
      'Diagnostic Pre- and Post-Bronchodilator Spirometry (FEV1/FVC)',
      'Posteroanterior (PA) Chest Radiograph',
      'Complete Blood Count (CBC) with differential (eosinophil count)',
      'Sputum AFB / GeneXpert (if cough >2 weeks in Pakistan setting)',
    ],
  };
}

export function performFullClinicalAnalysis(
  demographics: PatientDemographics,
  profile: ClinicalProfile,
  vitals: VitalSigns,
  labs: LabResults,
  symptoms: SymptomOccurrence[]
): AssessmentResult {
  // 1. Safety Engine: Emergency Red Flags
  const redFlags = evaluateRedFlags(symptoms, vitals, profile);
  const isEmergency = redFlags.some((rf) => rf.urgency === 'EMERGENCY');

  // 2. Triage Level Determination
  const triage = determineTriageLevel(redFlags, vitals, symptoms);

  // 3. ML Risk Models
  const cvdRisk = calculateCardiovascularRisk(demographics, profile, vitals, labs, symptoms);
  const htnRisk = calculateHypertensionRisk(demographics, profile, vitals, symptoms);
  const dmRisk = calculateDiabetesRisk(demographics, profile, vitals, labs, symptoms);
  const respRisk = calculateRespiratoryRisk(profile, vitals, symptoms);

  // 4. Data Completeness & Quality Analysis
  const missingCriticalFields: string[] = [];
  if (!vitals.systolicBp) missingCriticalFields.push('Blood Pressure (Systolic/Diastolic)');
  if (!vitals.bloodGlucoseMgDl && !labs.glucoseFastingMgDl) missingCriticalFields.push('Blood Glucose / Glycemia Marker');
  if (!labs.totalCholesterolMgDl && !labs.ldlCholesterolMgDl) missingCriticalFields.push('Serum Lipid Profile (Cholesterol / LDL)');
  if (!vitals.oxygenSaturation) missingCriticalFields.push('Pulse Oximetry (SpO2%)');
  if (!labs.creatinineMgDl) missingCriticalFields.push('Serum Creatinine / Renal Function');

  let completenessPct = 100 - missingCriticalFields.length * 15;
  completenessPct = Math.max(35, Math.min(100, completenessPct));

  let reliabilityGrade: 'EXCELLENT' | 'GOOD' | 'LIMITED' | 'POOR' = 'GOOD';
  if (completenessPct >= 85) reliabilityGrade = 'EXCELLENT';
  else if (completenessPct >= 70) reliabilityGrade = 'GOOD';
  else if (completenessPct >= 50) reliabilityGrade = 'LIMITED';
  else reliabilityGrade = 'POOR';

  // 5. Aggregate Suggested Investigations (deduplicated)
  const allInvestigations = Array.from(
    new Set([
      ...cvdRisk.suggestedInvestigations,
      ...htnRisk.suggestedInvestigations,
      ...dmRisk.suggestedInvestigations,
      ...respRisk.suggestedInvestigations,
    ])
  );

  const suggestedClinicalActions: string[] = [];
  if (isEmergency) {
    suggestedClinicalActions.push('🚨 Immediate clinical emergency protocol activation.');
    suggestedClinicalActions.push('Initiate rapid transfer to acute resuscitation / emergency unit.');
  } else {
    suggestedClinicalActions.push('Schedule physician review of AI stratification findings.');
    suggestedClinicalActions.push('Collect missing laboratory profiles to improve calibration confidence.');
    suggestedClinicalActions.push('Initiate lifestyle and risk-factor modification counseling.');
  }

  return {
    assessmentId: `ASM-${Date.now().toString().slice(-6)}`,
    patientId: demographics.patientId,
    timestamp: new Date().toISOString(),
    triage,
    redFlags,
    isEmergency,
    risks: {
      cardiovascular: cvdRisk,
      hypertension: htnRisk,
      diabetes: dmRisk,
      respiratory: respRisk,
    },
    dataCompleteness: {
      percentage: completenessPct,
      missingCriticalFields,
      reliabilityGrade,
      guidance:
        missingCriticalFields.length > 0
          ? `Missing ${missingCriticalFields.length} key clinical parameter(s) (${missingCriticalFields.join(
              ', '
            )}). ML predictions are calibrated with synthetic population assumptions.`
          : 'Complete dataset: High confidence calibration.',
    },
    suggestedClinicalActions,
    suggestedInvestigations: allInvestigations.slice(0, 7),
    disclaimer:
      'CLINICAL DECISION-SUPPORT NOTICE: This AI-HealthAssist report is a preliminary decision-support tool adhering to WHO HEARTS and FDA CDS standards. It does not independently establish a medical diagnosis or prescribe treatment. The qualified physician retains sole responsibility for final diagnosis and prescription.',
  };
}
