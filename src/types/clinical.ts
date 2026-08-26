export type TriageLevel =
  | 'LEVEL_1_EMERGENCY'
  | 'LEVEL_2_URGENT'
  | 'LEVEL_3_PRIORITY'
  | 'LEVEL_4_ROUTINE'
  | 'LEVEL_5_LOW_RISK';

export type RiskCategory = 'LOW' | 'MODERATE' | 'HIGH' | 'URGENT';

export type MeasurementSource =
  | 'CLINIC_DEVICE'
  | 'HOSPITAL_DEVICE'
  | 'HOME_DEVICE'
  | 'WEARABLE'
  | 'PATIENT_REPORTED';

export type QualityFlag = 'VALID' | 'QUESTIONABLE' | 'INVALID' | 'MISSING';

export type DoctorAgreement = 'AGREE' | 'MODIFY' | 'REJECT' | 'UNCERTAIN';

export type SymptomCategory =
  | 'CARDIOVASCULAR'
  | 'NEUROLOGICAL'
  | 'RESPIRATORY'
  | 'METABOLIC'
  | 'GENERAL';

export type SymptomOnset = 'SUDDEN' | 'GRADUAL' | 'UNKNOWN';
export type SymptomDuration = 'MINUTES' | 'HOURS' | 'DAYS' | 'WEEKS' | 'MONTHS' | 'UNKNOWN';
export type SymptomProgression = 'IMPROVING' | 'STABLE' | 'WORSENING' | 'FLUCTUATING';

export interface SymptomDefinition {
  code: string;
  name: string;
  category: SymptomCategory;
  description: string;
  isRedFlagCandidate?: boolean;
}

export interface SymptomOccurrence {
  code: string;
  name: string;
  category: SymptomCategory;
  present: boolean;
  severity: number; // 0 to 5 (or 0-10 for pain)
  onset: SymptomOnset;
  duration: SymptomDuration;
  character?: string;
  radiation?: string[];
  progression: SymptomProgression;
  notes?: string;
}

export interface PatientDemographics {
  patientId: string;
  mrn?: string;
  fullName: string;
  age: number;
  sex: 'MALE' | 'FEMALE' | 'OTHER';
  phone?: string;
  province: string;
  district: string;
  tehsil?: string;
  unionCouncil?: string;
  emergencyContact?: string;
  consentGiven: boolean;
}

export interface ClinicalProfile {
  heightCm: number;
  weightKg: number;
  bmi: number;
  smokingStatus: 'NEVER' | 'CURRENT_SMOKER' | 'FORMER_SMOKER';
  tobaccoUse: 'NONE' | 'CHEWING_TOBACCO_NASWAR' | 'CIGARETTE' | 'HOOKAH_SHISHA';
  physicalActivity: 'SEDENTARY' | 'MODERATE' | 'ACTIVE';
  pregnancyStatus: 'NOT_PREGNANT' | 'PREGNANT' | 'POSTPARTUM' | 'NOT_APPLICABLE';
  previousCVD: boolean;
  previousStroke: boolean;
  diabetesHistory: boolean;
  hypertensionHistory: boolean;
  kidneyDisease: boolean;
  liverDisease: boolean;
  asthmaCOPD: boolean;
  familyHistoryCVD: boolean;
  familyHistoryDiabetes: boolean;
  familyHistoryStroke: boolean;
  currentMedications: string[];
  drugAllergies: string[];
}

export interface VitalSigns {
  systolicBp?: number;
  diastolicBp?: number;
  heartRate?: number;
  respiratoryRate?: number;
  temperatureC?: number;
  oxygenSaturation?: number; // SpO2%
  bloodGlucoseMgDl?: number;
  glucoseMeasurementType?: 'FASTING' | 'RANDOM' | 'POSTPRANDIAL';
  measurementSource: MeasurementSource;
  qualityFlag: QualityFlag;
  measurementTime: string;
}

export interface LabResults {
  glucoseFastingMgDl?: number;
  hba1cPercent?: number;
  totalCholesterolMgDl?: number;
  ldlCholesterolMgDl?: number;
  hdlCholesterolMgDl?: number;
  triglyceridesMgDl?: number;
  creatinineMgDl?: number;
  egfr?: number;
  hemoglobinGDl?: number;
  wbcCount?: number;
  troponinPositive?: boolean;
}

export interface RedFlagAlert {
  id: string;
  ruleCode: string;
  category: 'CARDIAC_EMERGENCY' | 'STROKE_EMERGENCY' | 'RESPIRATORY_CRISIS' | 'HYPERTENSIVE_CRISIS' | 'METABOLIC_CRISIS';
  title: string;
  description: string;
  urgency: 'EMERGENCY' | 'CRITICAL_URGENT';
  recommendedAction: string;
  triggeredBy: string[];
}

export interface SHAPContribution {
  feature: string;
  displayName: string;
  value: string | number;
  contributionPercent: number; // e.g. +21.4% or -5.2%
  direction: 'RISK_INCREASE' | 'RISK_DECREASE';
  clinicalRationale: string;
}

export interface ConditionRiskAssessment {
  conditionName: string;
  conditionKey: 'cardiovascular' | 'hypertension' | 'diabetes' | 'respiratory';
  riskScore: number; // 0.00 to 1.00
  riskCategory: RiskCategory;
  modelUsed: string;
  modelVersion: string;
  calibrated: boolean;
  contributingFactors: SHAPContribution[];
  clinicalConsiderations: string[];
  suggestedInvestigations: string[];
}

export interface AssessmentResult {
  assessmentId: string;
  patientId: string;
  timestamp: string;
  triage: {
    level: TriageLevel;
    levelName: string;
    levelColor: string;
    urgencyText: string;
    summary: string;
  };
  redFlags: RedFlagAlert[];
  isEmergency: boolean;
  risks: {
    cardiovascular: ConditionRiskAssessment;
    hypertension: ConditionRiskAssessment;
    diabetes: ConditionRiskAssessment;
    respiratory: ConditionRiskAssessment;
  };
  dataCompleteness: {
    percentage: number;
    missingCriticalFields: string[];
    reliabilityGrade: 'EXCELLENT' | 'GOOD' | 'LIMITED' | 'POOR';
    guidance: string;
  };
  suggestedClinicalActions: string[];
  suggestedInvestigations: string[];
  disclaimer: string;
}

export interface DoctorReview {
  reviewId: string;
  assessmentId: string;
  doctorName: string;
  doctorLicenseNo: string;
  facility: string;
  reviewTimestamp: string;
  aiAgreement: DoctorAgreement;
  doctorDiagnosis: string;
  differentialDiagnoses: string[];
  orderedInvestigations: string[];
  clinicalNotes: string;
  prescribedMedications?: {
    drugName: string;
    dosage: string;
    frequency: string;
    duration: string;
    safetyChecksPassed: boolean;
    safetyNotes?: string;
  }[];
  referralRequired: boolean;
  referralFacility?: string;
}

export interface PatientAssessmentRecord {
  demographics: PatientDemographics;
  profile: ClinicalProfile;
  vitals: VitalSigns;
  symptoms: SymptomOccurrence[];
  labs: LabResults;
  assessmentResult?: AssessmentResult;
  doctorReview?: DoctorReview;
}

export interface GeoDistrictHealthData {
  id: string;
  districtName: string;
  province: 'Punjab' | 'Sindh' | 'Khyber Pakhtunkhwa' | 'Balochistan' | 'Islamabad Capital Territory' | 'Gilgit-Baltistan' | 'Azad Jammu and Kashmir';
  coordinates: [number, number]; // [lat, lng]
  population: number;
  screenedCount: number;
  highRiskCvdPct: number;
  diabetesRiskPct: number;
  hypertensionRiskPct: number;
  respiratoryRiskPct: number;
  emergencyCasesCount: number;
  hotspotGiScore: number; // Getis-Ord Gi* z-score
  hotspotClassification: 'HOTSPOT_99' | 'HOTSPOT_95' | 'HOTSPOT_90' | 'NOT_SIGNIFICANT' | 'COLDSPOT';
  trend30Day: 'UP' | 'DOWN' | 'STABLE';
  referralDemandLevel: 'HIGH' | 'MODERATE' | 'LOW';
  hospitalBedLoadPct: number;
  tehsils: string[];
}

export interface ModelBenchmarkData {
  modelId: string;
  name: string;
  version: string;
  targetCondition: string;
  algorithm: 'Logistic Regression' | 'Random Forest' | 'XGBoost' | 'LightGBM' | 'Calibrated Ensemble';
  auroc: number;
  auprc: number;
  sensitivity: number;
  specificity: number;
  f1Score: number;
  brierScore: number;
  trainingSamples: number;
  validationSamples: number;
  status: 'RESEARCH_BASELINE' | 'CHAMPION_MODEL' | 'VALIDATED_CDS' | 'CANDIDATE';
  rocCurve: { fpr: number; tpr: number }[];
  prCurve: { recall: number; precision: number }[];
  calibrationCurve: { meanPredicted: number; observedFraction: number }[];
  featureImportance: { feature: string; importance: number }[];
}
