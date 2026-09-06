import { PatientAssessmentRecord } from '../types/clinical';

export interface BilledMedication {
  drugName: string;
  dosage: string;
  frequency: string;
  duration: string;
  unitPricePkr: number;
  totalCostPkr: number;
}

export interface BilledInvestigation {
  testName: string;
  costPkr: number;
  isOrdered: boolean;
}

export interface PatientMedicalBill {
  invoiceNumber: string;
  invoiceDate: string;
  patientName: string;
  mrn: string;
  doctorName: string;
  doctorSpecialty: string;
  consultationFeePkr: number;
  medications: BilledMedication[];
  medicationsSubtotalPkr: number;
  investigations: BilledInvestigation[];
  investigationsSubtotalPkr: number;
  grossTotalPkr: number;
  subsidyDiscountPkr: number;
  netPayablePkr: number;
  subsidyProgram: string;
  currency: string;
}

// Standard Pharmacy Formulary and Price Index (in PKR / Rs.)
const MEDICINE_PRICE_CATALOG: Record<string, number> = {
  // Antihypertensives & Calcium Channel Blockers
  'amlodipine': 280,
  'amlodipine (norvasc)': 280,
  'norvasc': 280,
  'losartan': 420,
  'losartan (cozaar)': 420,
  'cozaar': 420,
  'valsartan': 750,
  'valsartan (diovan)': 750,
  'diovan': 750,
  'lisinopril': 350,
  'captopril': 220,
  'enalapril': 250,
  'bisoprolol': 340,
  'bisoprolol (concor)': 340,
  'concor': 340,
  'metoprolol': 310,
  'carvedilol': 380,
  'atenolol': 180,
  'hydrochlorothiazide': 150,
  'hctz': 150,
  'indapamide': 290,
  'spironolactone': 320,

  // Statins & Lipid Lowering Agents
  'atorvastatin': 650,
  'atorvastatin (lipitor)': 650,
  'lipitor': 650,
  'rosuvastatin': 580,
  'rosuvastatin (crestor)': 580,
  'crestor': 580,
  'simvastatin': 320,
  'fenofibrate': 490,

  // Antidiabetic Agents
  'metformin': 320,
  'metformin (glucophage)': 320,
  'glucophage': 320,
  'glimepiride': 280,
  'glimepiride (amaryl)': 280,
  'amaryl': 280,
  'gliclazide': 390,
  'sitagliptin': 1150,
  'sitagliptin (januvia)': 1150,
  'empagliflozin': 1480,
  'empagliflozin (jardiance)': 1480,
  'dapagliflozin': 1350,

  // Antiplatelet & Anticoagulation
  'aspirin': 90,
  'aspirin (cardiprin)': 90,
  'aspirin (disprin)': 90,
  'cardiprin': 90,
  'clopidogrel': 680,
  'clopidogrel (plavix)': 680,
  'plavix': 680,
  'rivaroxaban': 1850,

  // Gastroprotective & Supportive
  'omeprazole': 240,
  'omeprazole (risek)': 240,
  'risek': 240,
  'esomeprazole': 350,
  'pantoprazole': 310,
  'paracetamol': 80,
  'panadol': 80,
};

// Diagnostic Lab & Cardiac Investigation Pricing (in PKR / Rs.)
const INVESTIGATION_PRICE_CATALOG: Record<string, number> = {
  '12-lead electrocardiogram (ecg)': 500,
  'standard 12-lead electrocardiogram (ecg)': 500,
  'ecg': 500,
  'fasting blood glucose / hba1c': 850,
  'fasting plasma glucose & glycated hemoglobin (hba1c)': 850,
  'fasting plasma glucose (fpg)': 350,
  'glycated hemoglobin (hba1c)': 650,
  'lipid panel (total cholesterol, ldl, hdl, triglycerides)': 950,
  'fasting serum lipid profile (tc, ldl, hdl, triglycerides)': 950,
  'lipid profile': 950,
  'serum creatinine & egfr calculation': 450,
  'serum creatinine & estimated glomerular filtration rate (egfr)': 450,
  'serum creatinine': 350,
  'urine albumin-to-creatinine ratio (uacr)': 650,
  'spot urine albumin-to-creatinine ratio (uacr)': 650,
  'echocardiography (2d echo)': 2500,
  'chest x-ray (pa view)': 600,
};

/**
 * Resolves the unit and 30-day course price for any medication string.
 */
export function resolveMedicationPrice(drugName: string): number {
  const normalized = drugName.toLowerCase().trim();
  
  // Direct match
  if (MEDICINE_PRICE_CATALOG[normalized]) {
    return MEDICINE_PRICE_CATALOG[normalized];
  }

  // Substring search
  for (const [key, price] of Object.entries(MEDICINE_PRICE_CATALOG)) {
    if (normalized.includes(key)) {
      return price;
    }
  }

  // Generic estimation based on keywords
  if (normalized.includes('statin')) return 550;
  if (normalized.includes('pril') || normalized.includes('sartan')) return 400;
  if (normalized.includes('lol')) return 320;
  if (normalized.includes('gliptin') || normalized.includes('flozin')) return 1200;
  if (normalized.includes('form') || normalized.includes('ide')) return 300;

  return 350; // Standard nominal 30-day supply fee
}

/**
 * Resolves the investigation price.
 */
export function resolveInvestigationPrice(testName: string): number {
  const normalized = testName.toLowerCase().trim();
  if (INVESTIGATION_PRICE_CATALOG[normalized]) {
    return INVESTIGATION_PRICE_CATALOG[normalized];
  }
  for (const [key, price] of Object.entries(INVESTIGATION_PRICE_CATALOG)) {
    if (normalized.includes(key)) {
      return price;
    }
  }
  return 500;
}

/**
 * Calculates a complete medical bill breakdown for a patient assessment record.
 */
export function calculatePatientMedicalBill(
  record: PatientAssessmentRecord,
  customDoctorFee: number = 1500,
  customSubsidyPkr?: number
): PatientMedicalBill {
  const mrn = record.demographics.mrn || record.demographics.patientId;
  const hash = Math.abs(mrn.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0) % 9000) + 1000;
  const invoiceNumber = `INV-${new Date().getFullYear()}-${hash}`;
  const invoiceDate = new Date().toLocaleDateString('en-PK', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  // Doctor Fee
  const consultationFeePkr = Math.max(0, customDoctorFee);

  // Medications
  const rawMeds = record.doctorReview?.prescribedMedications?.length
    ? record.doctorReview.prescribedMedications
    : [
        { drugName: 'Amlodipine (Norvasc)', dosage: '5 mg OD', frequency: 'Once Daily', duration: '30 Days' },
        { drugName: 'Atorvastatin (Lipitor)', dosage: '20 mg OD', frequency: 'Bedtime', duration: '30 Days' },
      ];

  const billedMeds: BilledMedication[] = rawMeds.map((m) => {
    const cost = resolveMedicationPrice(m.drugName);
    return {
      drugName: m.drugName,
      dosage: m.dosage,
      frequency: m.frequency,
      duration: m.duration || '30 Days',
      unitPricePkr: cost,
      totalCostPkr: cost,
    };
  });

  const medicationsSubtotalPkr = billedMeds.reduce((sum, m) => sum + m.totalCostPkr, 0);

  // Investigations
  const rawInvestigations = record.doctorReview?.orderedInvestigations?.length
    ? record.doctorReview.orderedInvestigations
    : (record.assessmentResult?.suggestedInvestigations?.slice(0, 2) || [
        'Standard 12-Lead Electrocardiogram (ECG)',
        'Fasting Serum Lipid Profile (TC, LDL, HDL, Triglycerides)',
      ]);

  const billedInvestigations: BilledInvestigation[] = rawInvestigations.map((inv) => {
    const cost = resolveInvestigationPrice(inv);
    return {
      testName: inv,
      costPkr: cost,
      isOrdered: true,
    };
  });

  const investigationsSubtotalPkr = billedInvestigations.reduce((sum, i) => sum + i.costPkr, 0);

  // Gross Total
  const grossTotalPkr = consultationFeePkr + medicationsSubtotalPkr + investigationsSubtotalPkr;

  // Default government / Sehat Sahulat subsidy (subsidizes consultation or 25% of overall care)
  const defaultSubsidy = Math.round(grossTotalPkr * 0.3);
  const subsidyDiscountPkr = customSubsidyPkr !== undefined ? customSubsidyPkr : defaultSubsidy;

  const netPayablePkr = Math.max(0, grossTotalPkr - subsidyDiscountPkr);

  return {
    invoiceNumber,
    invoiceDate,
    patientName: record.demographics.fullName,
    mrn,
    doctorName: record.doctorReview?.doctorName || 'Dr. Akhtar Ali Bandesha',
    doctorSpecialty: 'Cardiology & Primary Care',
    consultationFeePkr,
    medications: billedMeds,
    medicationsSubtotalPkr,
    investigations: billedInvestigations,
    investigationsSubtotalPkr,
    grossTotalPkr,
    subsidyDiscountPkr,
    netPayablePkr,
    subsidyProgram: 'Sehat Sahulat Program / National NCD Subsidy',
    currency: 'PKR',
  };
}
