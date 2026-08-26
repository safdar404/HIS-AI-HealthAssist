import { ClinicalProfile, LabResults } from '../types/clinical';

export interface MedicationSafetyCheckResult {
  passed: boolean;
  warnings: string[];
  contraindications: string[];
  guidelineReference: string;
}

export interface DrugGuide {
  genericName: string;
  drugClass: string;
  indications: string[];
  standardDose: string;
  whoHeartsTier: string;
  renalCutoffEgfr?: number;
  pregnancyCategory: 'A' | 'B' | 'C' | 'D' | 'X';
  commonInteractions: string[];
}

export const CONTROLLED_DRUG_DATABASE: Record<string, DrugGuide> = {
  Amlodipine: {
    genericName: 'Amlodipine Besylate',
    drugClass: 'Dihydropyridine Calcium Channel Blocker (CCB)',
    indications: ['Hypertension', 'Stable Angina Pectoris'],
    standardDose: '5 mg once daily (titrate to 10 mg if target BP not reached)',
    whoHeartsTier: 'WHO HEARTS First-Line Protocol',
    pregnancyCategory: 'C',
    commonInteractions: ['Simvastatin (limit to 20mg)', 'CYP3A4 inhibitors'],
  },
  Telmisartan: {
    genericName: 'Telmisartan',
    drugClass: 'Angiotensin II Receptor Blocker (ARB)',
    indications: ['Hypertension', 'Cardiovascular Risk Reduction', 'Diabetic Nephropathy'],
    standardDose: '40 mg once daily (titrate to 80 mg)',
    whoHeartsTier: 'WHO HEARTS First-Line Protocol',
    renalCutoffEgfr: 15,
    pregnancyCategory: 'D', // Strictly contraindicated in pregnancy
    commonInteractions: ['Potassium-sparing diuretics', 'Lithium', 'NSAIDs'],
  },
  Enalapril: {
    genericName: 'Enalapril Maleate',
    drugClass: 'ACE Inhibitor',
    indications: ['Hypertension', 'Heart Failure with Reduced Ejection Fraction'],
    standardDose: '5 mg twice daily (titrate to 10-20 mg twice daily)',
    whoHeartsTier: 'WHO HEARTS Standard Formulary',
    pregnancyCategory: 'D', // Contraindicated
    commonInteractions: ['Spironolactone', 'NSAIDs', 'Potassium supplements'],
  },
  Metformin: {
    genericName: 'Metformin Hydrochloride',
    drugClass: 'Biguanide Antidiabetic',
    indications: ['Type 2 Diabetes Mellitus', 'Prediabetes Risk Reduction'],
    standardDose: '500 mg twice daily with meals (titrate to 1000 mg twice daily)',
    whoHeartsTier: 'Standard First-Line Oral Glycemic Agent',
    renalCutoffEgfr: 30, // Contraindicated if eGFR < 30 mL/min
    pregnancyCategory: 'B',
    commonInteractions: ['Iodinated contrast media (withhold 48h)', 'Alcohol'],
  },
  Atorvastatin: {
    genericName: 'Atorvastatin Calcium',
    drugClass: 'HMG-CoA Reductase Inhibitor (Statin)',
    indications: ['Hypercholesterolemia', 'Secondary CVD Prevention', 'High 10-Yr CVD Risk (≥20%)'],
    standardDose: '20 mg to 40 mg once daily at bedtime',
    whoHeartsTier: 'WHO HEARTS Essential CVD Package',
    pregnancyCategory: 'X', // Teratogenic
    commonInteractions: ['Macrolide antibiotics', 'Azole antifungals', 'Gemfibrozil'],
  },
  AspirinLowDose: {
    genericName: 'Aspirin (Acetylsalicylic Acid)',
    drugClass: 'Antiplatelet / Cyclooxygenase-1 Inhibitor',
    indications: ['Secondary Prevention of Myocardial Infarction / Ischemic Stroke'],
    standardDose: '75 mg to 100 mg once daily with food',
    whoHeartsTier: 'Secondary Prevention Only (Do NOT use for primary CVD prevention)',
    pregnancyCategory: 'D',
    commonInteractions: ['Warfarin/DOACs (major bleeding risk)', 'NSAIDs', 'SSRIs'],
  },
};

export function performMedicationSafetyCheck(
  drugName: string,
  profile: ClinicalProfile,
  labs: LabResults
): MedicationSafetyCheckResult {
  const warnings: string[] = [];
  const contraindications: string[] = [];

  const drugInfo = CONTROLLED_DRUG_DATABASE[drugName];
  if (!drugInfo) {
    return {
      passed: true,
      warnings: ['Medication is not in the WHO HEARTS pre-indexed formulary. Verify standard clinical references.'],
      contraindications: [],
      guidelineReference: 'General Physician Discretion',
    };
  }

  // 1. Allergy check
  const allergiesLower = profile.drugAllergies.map((a) => a.toLowerCase());
  const drugNameLower = drugInfo.genericName.toLowerCase();
  const drugClassLower = drugInfo.drugClass.toLowerCase();

  const isAllergic = allergiesLower.some(
    (a) =>
      drugNameLower.includes(a) ||
      a.includes(drugNameLower) ||
      drugClassLower.includes(a)
  );

  if (isAllergic) {
    contraindications.push(
      `🚨 CRITICAL ALLERGY: Patient has documented hypersensitivity/allergy matching ${drugInfo.genericName} (${profile.drugAllergies.join(', ')})!`
    );
  }

  // 2. Pregnancy check
  if (profile.pregnancyStatus === 'PREGNANT' || profile.pregnancyStatus === 'POSTPARTUM') {
    if (drugInfo.pregnancyCategory === 'X' || drugInfo.pregnancyCategory === 'D') {
      contraindications.push(
        `🚨 PREGNANCY CONTRAINDICATION: ${drugInfo.genericName} is Category ${drugInfo.pregnancyCategory}. Severe risk of fetal renal dysplasia, teratogenicity, or death. Use Methyldopa, Labetalol, or Nifedipine instead.`
      );
    }
  }

  // 3. Renal function check
  const egfr = labs.egfr;
  const creatinine = labs.creatinineMgDl;
  if (drugInfo.renalCutoffEgfr && egfr !== undefined) {
    if (egfr < drugInfo.renalCutoffEgfr) {
      contraindications.push(
        `🚨 RENAL CONTRAINDICATION: Patient eGFR is ${egfr} mL/min/1.73m², which is below the safe threshold (${drugInfo.renalCutoffEgfr} mL/min) for ${drugInfo.genericName}. Risk of lactic acidosis / toxicity.`
      );
    } else if (egfr < 45 && drugName === 'Metformin') {
      warnings.push(`⚠️ Renal Caution: eGFR ${egfr} mL/min. Cap maximum Metformin dose at 1000 mg/day and monitor renal parameters quarterly.`);
    }
  } else if (drugName === 'Metformin' && creatinine && creatinine > 1.5) {
    warnings.push(`⚠️ Serum Creatinine elevated (${creatinine} mg/dL). Confirm eGFR before initiating standard Metformin dose.`);
  }

  // 4. Drug-Drug Interactions with current medications
  for (const currentMed of profile.currentMedications) {
    for (const inter of drugInfo.commonInteractions) {
      if (currentMed.toLowerCase().includes(inter.toLowerCase()) || inter.toLowerCase().includes(currentMed.toLowerCase())) {
        warnings.push(`⚠️ Potential Drug Interaction: ${drugInfo.genericName} interacts with current medication '${currentMed}' (${inter}).`);
      }
    }
  }

  const passed = contraindications.length === 0;

  return {
    passed,
    warnings,
    contraindications,
    guidelineReference: `${drugInfo.whoHeartsTier} (Pregnancy Cat: ${drugInfo.pregnancyCategory}, Standard: ${drugInfo.standardDose})`,
  };
}
