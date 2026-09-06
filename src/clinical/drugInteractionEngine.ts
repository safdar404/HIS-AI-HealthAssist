import { ClinicalProfile, LabResults } from '../types/clinical';
import { CONTROLLED_DRUG_DATABASE, DrugGuide } from './controlledMedicationEngine';

export type InteractionSeverity = 'CONTRAINDICATED' | 'HIGH' | 'MODERATE' | 'CAUTION';

export interface DrugInteraction {
  id: string;
  drugA: string;
  drugB: string;
  severity: InteractionSeverity;
  title: string;
  mechanism: string;
  clinicalRisk: string;
  recommendation: string;
  evidenceSource: string;
}

export interface InteractionCheckSummary {
  hasContraindications: boolean;
  hasHighRisk: boolean;
  totalAlerts: number;
  interactions: DrugInteraction[];
  patientContraindications: {
    type: 'ALLERGY' | 'PREGNANCY' | 'RENAL' | 'HEPATIC' | 'COMORBIDITY';
    drugName: string;
    reason: string;
    severity: 'CONTRAINDICATED' | 'HIGH' | 'MODERATE';
  }[];
}

// Known Drug-Drug Interaction Knowledge Matrix
export const KNOWN_DDI_RULES: DrugInteraction[] = [
  {
    id: 'ddi-dual-raas',
    drugA: 'ACE Inhibitor',
    drugB: 'Angiotensin II Receptor Blocker (ARB)',
    severity: 'CONTRAINDICATED',
    title: 'Dual RAAS Blockade (ACEi + ARB)',
    mechanism: 'Concomitant inhibition of angiotensin converting enzyme and AT1 receptors',
    clinicalRisk: 'Significantly increases risk of acute kidney injury (AKI), severe hyperkalemia, and refractory hypotension without cardiovascular survival benefit (ONTARGET trial).',
    recommendation: 'Strictly avoid combination. Discontinue one agent and choose a complementary mechanism such as a CCB or Thiazide diuretic.',
    evidenceSource: 'WHO HEARTS / KDIGO 2024 / ESC Guidelines',
  },
  {
    id: 'ddi-triple-whammy',
    drugA: 'ACE Inhibitor or ARB',
    drugB: 'NSAID (e.g. Ibuprofen, Diclofenac, Naproxen)',
    severity: 'HIGH',
    title: 'Nephrotoxic "Triple Whammy" Risk (RAAS Blockade + NSAID + Diuretic)',
    mechanism: 'NSAIDs constrict afferent renal arterioles (COX-1/2 inhibition) while ACEi/ARB dilate efferent arterioles, causing glomerular filtration pressure to collapse',
    clinicalRisk: 'Precipitous fall in eGFR, acute tubular injury, sodium/water retention, blunting of antihypertensive therapy.',
    recommendation: 'Avoid systemic NSAIDs in hypertensive patients on RAAS blockers. Use Paracetamol/Acetaminophen for analgesia or topical agents.',
    evidenceSource: 'British Medical Journal / WHO Pharmacovigilance',
  },
  {
    id: 'ddi-raas-k-sparing',
    drugA: 'ACE Inhibitor or ARB',
    drugB: 'Spironolactone (or Potassium Supplements)',
    severity: 'HIGH',
    title: 'Severe Hyperkalemia Risk (RAAS + Aldosterone Antagonist)',
    mechanism: 'Dual suppression of aldosterone-mediated renal potassium excretion in the distal nephron',
    clinicalRisk: 'Serum potassium > 5.5–6.5 mmol/L, peaked T-waves, ventricular arrhythmias, cardiac arrest (especially if eGFR < 45 mL/min).',
    recommendation: 'Monitor serum electrolytes and creatinine at 1 week, 1 month, and quarterly. Advise strict low-potassium diet and cap Spironolactone at 25mg daily.',
    evidenceSource: 'RALES / ESC Heart Failure Guidelines',
  },
  {
    id: 'ddi-bb-non-dhp-ccb',
    drugA: 'Beta Blocker',
    drugB: 'Non-Dihydropyridine CCB (Verapamil / Diltiazem)',
    severity: 'CONTRAINDICATED',
    title: 'Profound Bradycardia & AV Nodal Block',
    mechanism: 'Synergistic negative inotropic, chronotropic, and dromotropic effects at SA/AV nodes',
    clinicalRisk: 'Severe sinus bradycardia, complete heart block, acute decompensated heart failure, cardiogenic shock.',
    recommendation: 'Do NOT co-prescribe Beta Blockers with Verapamil or Diltiazem. If combination CCB is required, use Dihydropyridine CCB (Amlodipine).',
    evidenceSource: 'ACC/AHA / WHO HEARTS Protocol',
  },
  {
    id: 'ddi-statin-cyp3a4',
    drugA: 'Atorvastatin / Simvastatin',
    drugB: 'Amlodipine (High Dose 10mg) / Macrolide / Azole',
    severity: 'MODERATE',
    title: 'CYP3A4 Statin Metabolism Inhibition',
    mechanism: 'Inhibition of CYP3A4-mediated first-pass hepatic clearance leading to elevated systemic statin concentrations',
    clinicalRisk: 'Increased incidence of statin-induced myopathy, elevated serum CK, and rhabdomyolysis.',
    recommendation: 'Monitor for unexplained muscle pain or weakness. Cap Simvastatin dose at 20 mg/day if combined with Amlodipine, or switch to Rosuvastatin / Pravastatin (non-CYP3A4).',
    evidenceSource: 'FDA Drug Safety Communication / WHO Essential Medicines',
  },
  {
    id: 'ddi-dual-antiplatelet-nsaid',
    drugA: 'Aspirin (or Clopidogrel)',
    drugB: 'NSAID / Anticoagulant',
    severity: 'HIGH',
    title: 'Major Gastrointestinal Hemorrhage & Ulceration',
    mechanism: 'Combined platelet aggregation inhibition with gastric mucosal prostaglandin depletion and direct mucosal injury',
    clinicalRisk: '3- to 5-fold elevation in severe upper GI bleeding and hemorrhagic stroke risk.',
    recommendation: 'Prescribe co-protective Proton Pump Inhibitor (Omeprazole / Pantoprazole). Avoid elective concurrent NSAID use.',
    evidenceSource: 'American College of Gastroenterology Guidelines',
  },
  {
    id: 'ddi-pde5-nitrate',
    drugA: 'Sildenafil / Tadalafil',
    drugB: 'Nitroglycerin / Isosorbide Mononitrate',
    severity: 'CONTRAINDICATED',
    title: 'Catastrophic Refractory Hypotension',
    mechanism: 'Potentiation of nitric oxide / cGMP signaling causing profound systemic vasodilation and coronary hypoperfusion',
    clinicalRisk: 'Severe syncope, myocardial infarction, cardiovascular collapse, death.',
    recommendation: 'Strict absolute contraindication. Ensure minimum 24-hour washout (48h for Tadalafil) before administering nitrates.',
    evidenceSource: 'AHA/ACC Consensus Guidelines',
  },
  {
    id: 'ddi-sulfonylurea-hypoglycemia',
    drugA: 'Sulfonylurea (Glimepiride / Glibenclamide)',
    drugB: 'Beta Blocker (e.g. Atenolol, Propranolol)',
    severity: 'MODERATE',
    title: 'Masked Hypoglycemic Warning Symptoms',
    mechanism: 'Beta-blockade blunts autonomic counter-regulatory responses (tremor, tachycardia, palpitations) during hypoglycemia',
    clinicalRisk: 'Patient fails to detect neuroglycopenic hypoglycemia until profound altered mental status or coma occurs.',
    recommendation: 'Educate patient on diaphoresis/sweating as an unmasked symptom. Prefer cardioselective beta blockers or SGLT2i / Metformin.',
    evidenceSource: 'ADA Standards of Medical Care in Diabetes',
  },
];

// Helper to normalize drug strings into broad clinical classes
export function classifyDrug(drugStr: string): string[] {
  const s = drugStr.toLowerCase();
  const classes: string[] = [];

  if (s.includes('enalapril') || s.includes('lisinopril') || s.includes('ramipril') || s.includes('captopril') || s.includes('perindopril') || s.includes('ace inhibitor') || s.includes('acei')) {
    classes.push('ACE Inhibitor');
    classes.push('ACE Inhibitor or ARB');
    classes.push('RAAS Inhibitor');
  }

  if (s.includes('telmisartan') || s.includes('losartan') || s.includes('valsartan') || s.includes('candesartan') || s.includes('olmesartan') || s.includes('arb') || s.includes('micardis') || s.includes('cozaar')) {
    classes.push('Angiotensin II Receptor Blocker (ARB)');
    classes.push('ACE Inhibitor or ARB');
    classes.push('RAAS Inhibitor');
  }

  if (s.includes('amlodipine') || s.includes('nifedipine') || s.includes('felodipine') || s.includes('norvasc')) {
    classes.push('Dihydropyridine CCB');
    classes.push('Amlodipine');
    classes.push('Amlodipine (High Dose 10mg) / Macrolide / Azole');
  }

  if (s.includes('verapamil') || s.includes('diltiazem') || s.includes('cardizem') || s.includes('isoptin')) {
    classes.push('Non-Dihydropyridine CCB (Verapamil / Diltiazem)');
  }

  if (s.includes('atenolol') || s.includes('metoprolol') || s.includes('bisoprolol') || s.includes('carvedilol') || s.includes('propranolol') || s.includes('beta blocker') || s.includes('tenormin') || s.includes('concor')) {
    classes.push('Beta Blocker');
  }

  if (s.includes('spironolactone') || s.includes('eplerenone') || s.includes('aldactone') || s.includes('potassium')) {
    classes.push('Spironolactone (or Potassium Supplements)');
    classes.push('Potassium Sparing Diuretic');
  }

  if (s.includes('ibuprofen') || s.includes('diclofenac') || s.includes('naproxen') || s.includes('mefenamic') || s.includes('celecoxib') || s.includes('nsaid') || s.includes('brufen') || s.includes('voltral')) {
    classes.push('NSAID (e.g. Ibuprofen, Diclofenac, Naproxen)');
    classes.push('NSAID / Anticoagulant');
  }

  if (s.includes('atorvastatin') || s.includes('simvastatin') || s.includes('rosuvastatin') || s.includes('lipitor') || s.includes('statin')) {
    classes.push('Atorvastatin / Simvastatin');
    classes.push('Statin');
  }

  if (s.includes('aspirin') || s.includes('disprin') || s.includes('clopidogrel') || s.includes('plavix') || s.includes('antiplatelet')) {
    classes.push('Aspirin (or Clopidogrel)');
    classes.push('Antiplatelet');
  }

  if (s.includes('warfarin') || s.includes('rivaroxaban') || s.includes('apixaban') || s.includes('dabigatran') || s.includes('xarelto') || s.includes('eliquis')) {
    classes.push('NSAID / Anticoagulant');
    classes.push('Anticoagulant');
  }

  if (s.includes('metformin') || s.includes('glucophage')) {
    classes.push('Metformin');
    classes.push('Biguanide');
  }

  if (s.includes('glimepiride') || s.includes('glibenclamide') || s.includes('gliclazide') || s.includes('amaryl') || s.includes('daonil') || s.includes('diamicron')) {
    classes.push('Sulfonylurea (Glimepiride / Glibenclamide)');
  }

  if (s.includes('sildenafil') || s.includes('tadalafil') || s.includes('viagra') || s.includes('cialis')) {
    classes.push('Sildenafil / Tadalafil');
  }

  if (s.includes('nitroglycerin') || s.includes('isosorbide') || s.includes('angisid') || s.includes('isoket') || s.includes('monosordil')) {
    classes.push('Nitroglycerin / Isosorbide Mononitrate');
  }

  // Include raw drug string
  classes.push(drugStr);
  return classes;
}

// Master Cross-Checker for Drug-Drug Interactions and Patient Contraindications
export function checkMedicationSafetyAndInteractions(
  candidateOrAllMeds: string[],
  profile: ClinicalProfile,
  labs: LabResults
): InteractionCheckSummary {
  const interactions: DrugInteraction[] = [];
  const patientContraindications: {
    type: 'ALLERGY' | 'PREGNANCY' | 'RENAL' | 'HEPATIC' | 'COMORBIDITY';
    drugName: string;
    reason: string;
    severity: 'CONTRAINDICATED' | 'HIGH' | 'MODERATE';
  }[] = [];

  // Combine profile medications + newly prescribed candidate drugs into single unique list
  const currentMeds = Array.isArray(profile.currentMedications) ? profile.currentMedications : [];
  const candidateMeds = Array.isArray(candidateOrAllMeds) ? candidateOrAllMeds : [];
  const combinedMeds = Array.from(
    new Set([
      ...currentMeds.filter(Boolean),
      ...candidateMeds.filter(Boolean),
    ])
  );

  // 1. Cross-Check Drug-Drug Interactions pairwise
  for (let i = 0; i < combinedMeds.length; i++) {
    for (let j = i + 1; j < combinedMeds.length; j++) {
      const medA = combinedMeds[i];
      const medB = combinedMeds[j];

      const classesA = classifyDrug(medA);
      const classesB = classifyDrug(medB);

      for (const rule of KNOWN_DDI_RULES) {
        const matchAtoRuleA = classesA.some((c) => c.toLowerCase() === rule.drugA.toLowerCase() || rule.drugA.toLowerCase().includes(c.toLowerCase()));
        const matchBtoRuleB = classesB.some((c) => c.toLowerCase() === rule.drugB.toLowerCase() || rule.drugB.toLowerCase().includes(c.toLowerCase()));

        const matchAtoRuleB = classesA.some((c) => c.toLowerCase() === rule.drugB.toLowerCase() || rule.drugB.toLowerCase().includes(c.toLowerCase()));
        const matchBtoRuleA = classesB.some((c) => c.toLowerCase() === rule.drugA.toLowerCase() || rule.drugA.toLowerCase().includes(c.toLowerCase()));

        if ((matchAtoRuleA && matchBtoRuleB) || (matchAtoRuleB && matchBtoRuleA)) {
          // Avoid duplicate rule triggers
          if (!interactions.some((existing) => existing.id === rule.id && ((existing.drugA === medA && existing.drugB === medB) || (existing.drugA === medB && existing.drugB === medA)))) {
            interactions.push({
              ...rule,
              drugA: medA,
              drugB: medB,
            });
          }
        }
      }
    }
  }

  // 2. Cross-Check Individual Patient Risk Contraindications
  for (const med of combinedMeds) {
    const medLower = med.toLowerCase();
    const drugGuideKey = Object.keys(CONTROLLED_DRUG_DATABASE).find(
      (k) =>
        medLower.includes(k.toLowerCase()) ||
        medLower.includes(CONTROLLED_DRUG_DATABASE[k].genericName.toLowerCase())
    );
    const drugInfo = drugGuideKey ? CONTROLLED_DRUG_DATABASE[drugGuideKey] : null;

    // Allergy check
    for (const allergy of profile.drugAllergies) {
      if (allergy && allergy.trim() !== '') {
        const alLower = allergy.toLowerCase();
        if (medLower.includes(alLower) || (drugInfo && drugInfo.genericName.toLowerCase().includes(alLower))) {
          patientContraindications.push({
            type: 'ALLERGY',
            drugName: med,
            reason: `Documented hypersensitivity / allergy to '${allergy}'. Risk of anaphylaxis, angioedema, or severe cutaneous reaction.`,
            severity: 'CONTRAINDICATED',
          });
        }
      }
    }

    // Pregnancy check
    if (profile.pregnancyStatus === 'PREGNANT' || profile.pregnancyStatus === 'POSTPARTUM') {
      if (
        medLower.includes('telmisartan') ||
        medLower.includes('losartan') ||
        medLower.includes('enalapril') ||
        medLower.includes('lisinopril') ||
        medLower.includes('ramipril') ||
        medLower.includes('atorvastatin') ||
        medLower.includes('simvastatin') ||
        (drugInfo && (drugInfo.pregnancyCategory === 'X' || drugInfo.pregnancyCategory === 'D'))
      ) {
        patientContraindications.push({
          type: 'PREGNANCY',
          drugName: med,
          reason: `Strictly contraindicated in pregnancy (FDA Category D/X). Severe risk of fetal renal dysplasia, oligohydramnios, skull hypoplasia, and teratogenicity. Switch to Methyldopa, Labetalol, or Nifedipine.`,
          severity: 'CONTRAINDICATED',
        });
      }
    }

    // Renal check
    const egfr = labs.egfr;
    if (egfr !== undefined) {
      if ((medLower.includes('metformin') || (drugInfo && drugInfo.genericName.includes('Metformin'))) && egfr < 30) {
        patientContraindications.push({
          type: 'RENAL',
          drugName: med,
          reason: `Patient eGFR (${egfr} mL/min/1.73m²) is < 30 mL/min. Metformin is strictly contraindicated due to high risk of fatal lactic acidosis.`,
          severity: 'CONTRAINDICATED',
        });
      } else if ((medLower.includes('metformin') || (drugInfo && drugInfo.genericName.includes('Metformin'))) && egfr < 45) {
        patientContraindications.push({
          type: 'RENAL',
          drugName: med,
          reason: `eGFR is ${egfr} mL/min/1.73m² (Stage 3b CKD). Maximum recommended Metformin dose is 1000 mg/day with close renal monitoring.`,
          severity: 'HIGH',
        });
      }

      if ((medLower.includes('telmisartan') || medLower.includes('enalapril') || medLower.includes('spironolactone')) && egfr < 20) {
        patientContraindications.push({
          type: 'RENAL',
          drugName: med,
          reason: `Severe renal impairment (eGFR ${egfr} mL/min). Extreme risk of refractory hyperkalemia and acute uremic deterioration.`,
          severity: 'HIGH',
        });
      }
    }
  }

  const hasContraindications =
    interactions.some((i) => i.severity === 'CONTRAINDICATED') ||
    patientContraindications.some((c) => c.severity === 'CONTRAINDICATED');

  const hasHighRisk =
    interactions.some((i) => i.severity === 'HIGH') ||
    patientContraindications.some((c) => c.severity === 'HIGH');

  return {
    hasContraindications,
    hasHighRisk,
    totalAlerts: interactions.length + patientContraindications.length,
    interactions,
    patientContraindications,
  };
}
