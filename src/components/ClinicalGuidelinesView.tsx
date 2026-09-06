import React, { useState, useMemo } from 'react';
import {
  BookOpen,
  ShieldCheck,
  Heart,
  FileText,
  Activity,
  CheckCircle2,
  AlertTriangle,
  Scale,
  Search,
  X,
  Sparkles,
  ChevronRight,
  ChevronDown,
  Layers,
  Flame,
  Pill,
  Droplets,
  AlertOctagon,
  Stethoscope,
  ExternalLink,
  Copy,
  Check,
} from 'lucide-react';

export interface ClinicalGuidelineItem {
  id: string;
  title: string;
  shortTitle: string;
  category: 'CARDIOVASCULAR' | 'DIABETES' | 'EMERGENCY' | 'PHARMACOTHERAPY' | 'SOUTH_ASIAN' | 'RENAL' | 'CODING';
  source: string;
  evidenceLevel: string;
  summary: string;
  keyPoints: { label: string; detail: string; highlight?: boolean }[];
  targetThresholds?: string;
  recommendedDrugs?: { drug: string; dose: string; note: string }[];
  icdCodes?: string[];
  loincCodes?: string[];
  snomedCodes?: string[];
  keywords: string[];
}

export const CLINICAL_GUIDELINES_DATA: ClinicalGuidelineItem[] = [
  {
    id: 'who-hearts-cvd',
    title: 'WHO HEARTS Technical Package: 10-Year ASCVD Risk Stratification',
    shortTitle: 'WHO HEARTS CVD Risk',
    category: 'CARDIOVASCULAR',
    source: 'World Health Organization (WHO) & PAHO 2026',
    evidenceLevel: 'Class I, Level A',
    summary:
      'Cardiovascular risk prediction charts calibrated specifically for South Asian / Low-and-Middle Income Countries (LMIC) without requiring mandatory laboratory total cholesterol at initial primary care presentation.',
    keyPoints: [
      { label: '<10% 10-Yr Risk', detail: 'Low Risk: Lifestyle counseling, dietary sodium reduction (<2g/day), physical activity ≥150 min/wk, and annual rescreening.' },
      { label: '10% – 19% 10-Yr Risk', detail: 'Moderate Risk: Structured lifestyle modifications, follow-up every 3 to 6 months, and consideration of low-dose statin if SBP remains ≥140 mmHg.' },
      { label: '≥20% 10-Yr Risk', detail: 'High / Very High Risk: Immediate initiation of guideline-directed statin (Atorvastatin 20-40mg) and dual antihypertensive therapy.', highlight: true },
      { label: 'Diabetes Co-morbidity', detail: 'Any patient with Type 2 Diabetes and age ≥40 automatically qualifies for moderate-to-high cardiovascular risk intervention regardless of baseline score.' },
    ],
    targetThresholds: 'Target SBP < 130/80 mmHg for CVD/Diabetes; SBP < 140/90 mmHg for standard hypertensive adults.',
    recommendedDrugs: [
      { drug: 'Atorvastatin', dose: '20 mg OD at bedtime', note: 'First-line lipid-lowering therapy for ASCVD risk reduction.' },
      { drug: 'Rosuvastatin', dose: '10 mg OD', note: 'Alternative high-potency statin for elevated LDL >160 mg/dL.' },
    ],
    icdCodes: ['I25.10', 'Z13.6'],
    snomedCodes: ['395116008', '429559004'],
    keywords: ['who', 'hearts', 'cvd', 'cardiovascular', 'risk score', 'ascvd', 'statin', 'cholesterol', '10-year', 'ischemic heart disease', 'low risk', 'high risk'],
  },
  {
    id: 'htn-compendium-2026',
    title: '2026 Standardized Hypertension Diagnostic & Protocolized Step Therapy',
    shortTitle: 'Hypertension Compendium',
    category: 'CARDIOVASCULAR',
    source: 'ACC/AHA & WHO Joint International Hypertension Consensus 2026',
    evidenceLevel: 'Class I, Level A',
    summary:
      'A protocolized, stepped-care pharmacological pathway prioritizing single-pill dual combinations (CCB + ARB) as first-line therapy to rapidly achieve blood pressure control.',
    keyPoints: [
      { label: 'Normal Blood Pressure', detail: 'Systolic < 120 mmHg AND Diastolic < 80 mmHg. Maintain healthy diet and lifestyle.' },
      { label: 'Elevated BP', detail: 'Systolic 120–129 mmHg AND Diastolic < 80 mmHg. Lifestyle intervention with reassessment in 3 months.' },
      { label: 'Stage 1 Hypertension', detail: 'Systolic 130–139 mmHg OR Diastolic 80–89 mmHg. If CVD risk ≥10% or diabetes present, initiate monotherapy (Amlodipine 5mg or Telmisartan 40mg).' },
      { label: 'Stage 2 Hypertension', detail: 'Systolic ≥ 140 mmHg OR Diastolic ≥ 90 mmHg. Immediate initiation of 2-drug combination therapy (CCB + ARB/ACEi).', highlight: true },
      { label: 'Hypertensive Crisis', detail: 'Systolic ≥ 180 mmHg OR Diastolic ≥ 120 mmHg. Red flag requiring immediate emergency department evaluation for target organ damage.', highlight: true },
    ],
    targetThresholds: 'Clinic target < 130/80 mmHg for all confirmed hypertensive adults under age 75.',
    recommendedDrugs: [
      { drug: 'Amlodipine', dose: '5–10 mg OD (morning)', note: 'First-line Dihydropyridine Calcium Channel Blocker (CCB).' },
      { drug: 'Telmisartan', dose: '40–80 mg OD (morning)', note: 'Long half-life (24h) Angiotensin Receptor Blocker (ARB).' },
      { drug: 'Hydrochlorothiazide', dose: '12.5–25 mg OD', note: 'Step 3 add-on Thiazide diuretic if BP remains uncontrolled.' },
    ],
    icdCodes: ['I10', 'I11.9', 'R03.0'],
    snomedCodes: ['38341003', '59621000'],
    loincCodes: ['8480-6', '8462-4'],
    keywords: ['hypertension', 'blood pressure', 'sbp', 'dbp', 'stage 1', 'stage 2', 'amlodipine', 'telmisartan', 'ccb', 'arb', 'crisis', 'systolic', 'diastolic'],
  },
  {
    id: 'ada-easd-diabetes',
    title: 'ADA/EASD 2026 Consensus: Glycemic Targets & South Asian Diabetes Phenotype',
    shortTitle: 'Diabetes & Glycemia Management',
    category: 'DIABETES',
    source: 'American Diabetes Association (ADA) & EASD 2026 Guidelines',
    evidenceLevel: 'Class I, Level A',
    summary:
      'Clinical management of Type 2 Diabetes Mellitus with special focus on early beta-cell exhaustion in South Asian populations with high visceral adiposity and early insulin resistance.',
    keyPoints: [
      { label: 'Normal Fasting Glucose', detail: 'Fasting Plasma Glucose (FPG) 70–99 mg/dL; HbA1c < 5.7%.' },
      { label: 'Impaired Fasting Glucose (Pre-diabetes)', detail: 'FPG 100–125 mg/dL OR HbA1c 5.7%–6.4%. Lifestyle modification and weight reduction of 5–7%.' },
      { label: 'Overt Diabetes Mellitus', detail: 'FPG ≥ 126 mg/dL OR HbA1c ≥ 6.5% OR Random Glucose ≥ 200 mg/dL with classic osmotic symptoms.', highlight: true },
      { label: 'Uncontrolled Diabetes Red Flag', detail: 'FPG ≥ 250 mg/dL OR HbA1c ≥ 10.0% OR persistent ketonuria. Urgent clinical review and basal insulin evaluation.', highlight: true },
    ],
    targetThresholds: 'Target HbA1c < 7.0% for most non-pregnant adults; < 8.0% for patients with advanced vascular complications.',
    recommendedDrugs: [
      { drug: 'Metformin', dose: '500–1000 mg BD with meals', note: 'First-line biguanide (eGFR must be >30 mL/min).' },
      { drug: 'Empagliflozin / Dapagliflozin', dose: '10–25 mg OD', note: 'SGLT2 inhibitor providing renal and cardioprotection.' },
      { drug: 'Sitagliptin / Vildagliptin', dose: '50–100 mg OD/BD', note: 'DPP-4 inhibitor with minimal hypoglycemia risk.' },
    ],
    icdCodes: ['E11.9', 'E11.65', 'R73.09'],
    snomedCodes: ['44054006', '73211009'],
    loincCodes: ['1558-6', '4548-4'],
    keywords: ['diabetes', 'glucose', 'hba1c', 'fasting glucose', 'metformin', 'sglt2', 'empagliflozin', 'dpp4', 'hyperglycemia', 'prediabetes', 'insulin'],
  },
  {
    id: 'south-asian-adjustments',
    title: 'South Asian Population-Specific Anthropometric & Epidemiological Multipliers',
    shortTitle: 'South Asian Risk Multipliers',
    category: 'SOUTH_ASIAN',
    source: 'South Asian Cardiovascular Research Compendium & WHO SEARO',
    evidenceLevel: 'Class IIa, Level B',
    summary:
      'Adjusted anthropometric and habit risk coefficients accounting for premature atherosclerosis, visceral adiposity at lower BMIs, and prevalent smokeless tobacco (Naswar/Gutka) usage in Pakistan.',
    keyPoints: [
      { label: 'South Asian Overweight Threshold', detail: 'BMI ≥ 23.0 kg/m² (in contrast to Western standard 25.0 kg/m²).' },
      { label: 'South Asian Obesity Threshold', detail: 'BMI ≥ 27.5 kg/m² (in contrast to Western standard 30.0 kg/m²).' },
      { label: 'Premature CAD Onset', detail: 'Onset of myocardial infarction occurs 8–10 years earlier in Pakistani males compared to European cohorts.' },
      { label: 'Smokeless Tobacco Hazard', detail: 'Naswar, Gutka, and Paan chewing carry a +1.8x multiplier on cardiovascular endothelial dysfunction.', highlight: true },
    ],
    targetThresholds: 'Waist circumference target: < 90 cm (35 in) for Asian men; < 80 cm (31.5 in) for Asian women.',
    keywords: ['south asian', 'pakistan', 'bmi', 'naswar', 'gutka', 'smokeless tobacco', 'waist circumference', 'premature cad', 'obesity threshold', 'lahore', 'punjab'],
  },
  {
    id: 'emergency-red-flags-triage',
    title: 'Critical Emergency Red Flags & Immediate Resuscitation Protocols',
    shortTitle: 'Emergency Red Flags & ACS',
    category: 'EMERGENCY',
    source: 'AHA/ESC Acute Coronary Syndrome & Stroke Emergency Triage 2026',
    evidenceLevel: 'Class I, Level A',
    summary:
      'Zero-delay clinical recognition criteria for Acute Coronary Syndrome (ACS), Acute Ischemic Stroke (FAST protocol), Acute Pulmonary Edema, and Hypertensive Encephalopathy.',
    keyPoints: [
      { label: 'Acute Coronary Syndrome (ACS)', detail: 'Retrosternal crushing chest pain >20 min, radiation to left arm/jaw, diaphoresis, dyspnea. Immediate 12-lead ECG and 300mg chewable Aspirin.', highlight: true },
      { label: 'Acute Stroke (FAST)', detail: 'Sudden facial droop, arm weakness, slurred speech (onset within 4.5 hours). Immediate non-contrast CT head and avoid rapid BP drop below 185/110.', highlight: true },
      { label: 'Acute Heart Failure / Pulmonary Edema', detail: 'Severe orthopnea, bilateral basal crackles, pink frothy sputum, SpO2 <90%. High-flow oxygen and IV Furosemide.' },
      { label: 'Hypotensive Shock', detail: 'SBP <90 mmHg with tachycardia >110 bpm and cold extremities. Urgent IV fluid resuscitation and transfer to ICU.' },
    ],
    targetThresholds: 'Door-to-ECG time < 10 minutes; Door-to-needle/thrombolysis time < 60 minutes.',
    recommendedDrugs: [
      { drug: 'Aspirin (Disprin)', dose: '300 mg stat chewable', note: 'Antiplatelet loading dose for suspected myocardial infarction.' },
      { drug: 'Clopidogrel (Plavix)', dose: '300–600 mg stat oral', note: 'Dual antiplatelet loading dose in ACS.' },
      { drug: 'Nitroglycerin Sublingual', dose: '0.4–0.5 mg SL every 5 min', note: 'Vasodilator for angina (contraindicated if SBP <90 or PDE5i used).' },
    ],
    icdCodes: ['I21.9', 'I63.9', 'R07.9', 'R06.02'],
    snomedCodes: ['22298006', '42343007', '29857009'],
    keywords: ['emergency', 'red flag', 'acs', 'chest pain', 'stroke', 'fast', 'infarction', 'aspirin', 'nitroglycerin', 'pulmonary edema', 'shock', 'level 1'],
  },
  {
    id: 'ckd-renal-dosing',
    title: 'Chronic Kidney Disease (CKD) Staging & Renal Drug Dose Adjustments',
    shortTitle: 'Renal & eGFR Dosing Guidelines',
    category: 'RENAL',
    source: 'KDIGO Clinical Practice Guideline for CKD 2026',
    evidenceLevel: 'Class I, Level A',
    summary:
      'Assessment of renal filtration capacity using serum creatinine / CKD-EPI formula, and necessary dose adjustments for Renin-Angiotensin blockers, Metformin, and Statins.',
    keyPoints: [
      { label: 'Stage 1 (Normal / High eGFR)', detail: 'eGFR ≥ 90 mL/min/1.73m² with persistent albuminuria. Regular annual monitoring.' },
      { label: 'Stage 2 (Mild Reduction)', detail: 'eGFR 60–89 mL/min/1.73m². Monitor electrolytes and blood pressure quarterly.' },
      { label: 'Stage 3a / 3b (Moderate)', detail: 'eGFR 30–59 mL/min/1.73m². Metformin max dose 1000 mg/day (avoid if <30). Adjust ARB/ACEi doses.' },
      { label: 'Stage 4 / 5 (Severe / End Stage)', detail: 'eGFR < 30 mL/min/1.73m². Discontinue Metformin; prepare for nephrology specialist referral and RRT.', highlight: true },
    ],
    targetThresholds: 'Target BP in CKD with proteinuria: < 130/80 mmHg; SBP not lower than 110 mmHg.',
    icdCodes: ['N18.9', 'N18.3', 'N18.4', 'N18.5'],
    snomedCodes: ['709044004', '431855005'],
    loincCodes: ['2160-0', '33914-3'],
    keywords: ['ckd', 'kidney', 'creatinine', 'egfr', 'renal', 'nephrology', 'albuminuria', 'kdigo', 'metformin dosing', 'dialysis'],
  },
  {
    id: 'clinical-coding-standards',
    title: 'Clinical Coding & Health Informatics Standards (SNOMED CT, LOINC, ICD-10)',
    shortTitle: 'Coding & EHR Interoperability',
    category: 'CODING',
    source: 'HL7 FHIR R4 & WHO ICD-10-CM / LOINC 2026',
    evidenceLevel: 'Informatics Standard',
    summary:
      'Standardized concept codes, terminology bindings, and laboratory observation identifiers ensuring semantic interoperability across hospital EHR networks and DHIS-2.',
    keyPoints: [
      { label: 'Systolic Blood Pressure', detail: 'SNOMED CT: 271649006 | LOINC: 8480-6 | ICD-10: R03.0' },
      { label: 'Diastolic Blood Pressure', detail: 'SNOMED CT: 271650006 | LOINC: 8462-4 | ICD-10: R03.0' },
      { label: 'Heart Rate / Pulse', detail: 'SNOMED CT: 364075005 | LOINC: 8867-4 | ICD-10: R00.0 / R00.1' },
      { label: 'Oxygen Saturation (SpO2)', detail: 'SNOMED CT: 431314004 | LOINC: 2708-6 | ICD-10: R09.02' },
      { label: 'Fasting Plasma Glucose', detail: 'SNOMED CT: 44054006 | LOINC: 1558-6 | ICD-10: E11.9' },
      { label: 'Glycated Hemoglobin (HbA1c)', detail: 'SNOMED CT: 43396009 | LOINC: 4548-4 | ICD-10: E11.65' },
      { label: 'Essential Hypertension', detail: 'SNOMED CT: 59621000 | ICD-10: I10' },
      { label: 'Acute Myocardial Infarction', detail: 'SNOMED CT: 22298006 | ICD-10: I21.9' },
    ],
    keywords: ['snomed', 'loinc', 'icd-10', 'coding', 'interoperability', 'fhir', 'dhis2', 'ehr', 'ontologies', 'standards', 'terminology'],
  },
];

export const ClinicalGuidelinesView: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [expandedId, setExpandedId] = useState<string | null>('who-hearts-cvd');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Filter guidelines based on search query and category
  const filteredGuidelines = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return CLINICAL_GUIDELINES_DATA.filter((item) => {
      // Category filter
      if (selectedCategory !== 'ALL' && item.category !== selectedCategory) {
        return false;
      }

      // Search query filter
      if (!query) return true;

      const inTitle = item.title.toLowerCase().includes(query);
      const inSummary = item.summary.toLowerCase().includes(query);
      const inSource = item.source.toLowerCase().includes(query);
      const inTarget = item.targetThresholds ? item.targetThresholds.toLowerCase().includes(query) : false;
      const inKeywords = item.keywords.some((k) => k.toLowerCase().includes(query));
      const inKeyPoints = item.keyPoints.some(
        (kp) => kp.label.toLowerCase().includes(query) || kp.detail.toLowerCase().includes(query)
      );
      const inDrugs = item.recommendedDrugs
        ? item.recommendedDrugs.some(
            (d) => d.drug.toLowerCase().includes(query) || d.note.toLowerCase().includes(query)
          )
        : false;
      const inIcd = item.icdCodes ? item.icdCodes.some((c) => c.toLowerCase().includes(query)) : false;
      const inSnomed = item.snomedCodes ? item.snomedCodes.some((c) => c.toLowerCase().includes(query)) : false;
      const inLoinc = item.loincCodes ? item.loincCodes.some((c) => c.toLowerCase().includes(query)) : false;

      return (
        inTitle ||
        inSummary ||
        inSource ||
        inTarget ||
        inKeywords ||
        inKeyPoints ||
        inDrugs ||
        inIcd ||
        inSnomed ||
        inLoinc
      );
    });
  }, [searchQuery, selectedCategory]);

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const handleQuickKeyword = (kw: string) => {
    setSearchQuery(kw);
    setSelectedCategory('ALL');
  };

  return (
    <div className="space-y-6">
      {/* HEADER BANNER WITH SEARCH BAR */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 rounded-3xl p-6 sm:p-7 text-white border border-slate-800 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-cyan-600 text-white flex items-center justify-center font-bold shadow-lg shadow-cyan-900/40">
              <BookOpen className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg font-black tracking-tight text-white uppercase">
                  Clinical Guidelines & WHO Protocols Knowledge Base
                </h2>
                <span className="text-[10px] bg-cyan-500/20 text-cyan-300 px-2.5 py-0.5 rounded-full font-mono border border-cyan-500/30 font-bold">
                  2026 Edition
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Evidence-based protocols governing cardiovascular risk scoring, hypertension step-therapy, diabetes phenotyping, and emergency triage.
              </p>
            </div>
          </div>
        </div>

        {/* MINI SEARCH BAR WITH INSTANT FILTERING */}
        <div className="relative pt-1">
          <div className="relative flex items-center">
            <Search className="w-4 h-4 text-cyan-400 absolute left-4 pointer-events-none" />
            <input
              id="input-guidelines-search"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search WHO protocols, drugs (Amlodipine, Statin), thresholds (140/90, HbA1c), emergency flags (ACS, Stroke), or ICD-10 / SNOMED codes..."
              className="w-full bg-slate-800/90 border border-slate-700 hover:border-slate-600 focus:border-cyan-500 focus:ring-2 focus:ring-cyan-500/20 text-white placeholder-slate-400 rounded-2xl pl-11 pr-10 py-3 text-xs sm:text-sm font-medium transition-all shadow-inner"
            />
            {searchQuery && (
              <button
                id="btn-clear-guidelines-search"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-700 transition-all cursor-pointer"
                title="Clear search query"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* QUICK SEARCH SUGGESTION CHIPS */}
        <div className="flex items-center gap-1.5 flex-wrap text-xs pt-1">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mr-1">
            Quick Queries:
          </span>
          {[
            { label: 'WHO HEARTS', query: 'WHO HEARTS' },
            { label: 'Stage 2 HTN', query: 'Stage 2' },
            { label: 'Amlodipine + ARB', query: 'Amlodipine' },
            { label: 'Crisis ≥180', query: 'Crisis' },
            { label: 'HbA1c & Fasting', query: 'HbA1c' },
            { label: 'South Asian BMI', query: 'South Asian' },
            { label: 'Chest Pain / ACS', query: 'ACS' },
            { label: 'Stroke (FAST)', query: 'Stroke' },
            { label: 'CKD & eGFR', query: 'eGFR' },
            { label: 'ICD-10 / LOINC', query: 'ICD-10' },
          ].map((chip, idx) => (
            <button
              key={idx}
              onClick={() => handleQuickKeyword(chip.query)}
              className="px-2.5 py-1 rounded-xl bg-slate-800/80 hover:bg-cyan-900/60 hover:text-cyan-200 border border-slate-700 text-[11px] text-slate-300 font-medium transition-all cursor-pointer"
            >
              {chip.label}
            </button>
          ))}
        </div>
      </div>

      {/* CATEGORY TABS & RESULT STATS */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-1.5 flex-wrap">
          {[
            { id: 'ALL', label: 'All Protocols', icon: Layers },
            { id: 'CARDIOVASCULAR', label: 'Cardiovascular (WHO/HTN)', icon: Heart },
            { id: 'DIABETES', label: 'Diabetes & Glycemia', icon: Droplets },
            { id: 'EMERGENCY', label: 'Emergency & Red Flags', icon: AlertOctagon },
            { id: 'SOUTH_ASIAN', label: 'South Asian Multipliers', icon: Scale },
            { id: 'RENAL', label: 'CKD & Renal Dosing', icon: Activity },
            { id: 'CODING', label: 'Interoperability (Coding)', icon: FileText },
          ].map((cat) => {
            const Icon = cat.icon;
            const isActive = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                id={`btn-guide-category-${cat.id}`}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border ${
                  isActive
                    ? 'bg-cyan-700 text-white border-cyan-800 shadow-sm'
                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-cyan-200' : 'text-slate-400'}`} />
                <span>{cat.label}</span>
              </button>
            );
          })}
        </div>

        <div className="text-xs text-slate-500 font-medium flex items-center gap-2 self-end sm:self-center">
          <span>
            Showing <strong>{filteredGuidelines.length}</strong> of {CLINICAL_GUIDELINES_DATA.length} protocols
          </span>
          {(searchQuery || selectedCategory !== 'ALL') && (
            <button
              id="btn-reset-guide-filters"
              onClick={() => {
                setSearchQuery('');
                setSelectedCategory('ALL');
              }}
              className="text-[11px] text-cyan-700 hover:underline font-bold"
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* FILTERED GUIDELINES ACCORDION & CARDS */}
      {filteredGuidelines.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 space-y-3">
          <Search className="w-10 h-10 text-slate-300 mx-auto" />
          <h3 className="text-base font-bold text-slate-800">No Matching Guidelines Found</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            No clinical protocols matched "{searchQuery}". Try searching for broader terms like "Hypertension", "Diabetes", "WHO", "Statin", or "Aspirin".
          </p>
          <button
            onClick={() => {
              setSearchQuery('');
              setSelectedCategory('ALL');
            }}
            className="px-4 py-2 bg-cyan-700 text-white text-xs font-bold rounded-xl hover:bg-cyan-800 transition-all cursor-pointer shadow-sm"
          >
            Clear Search Filter
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredGuidelines.map((guide) => {
            const isExpanded = expandedId === guide.id;
            return (
              <div
                key={guide.id}
                id={`guide-card-${guide.id}`}
                className={`bg-white rounded-3xl border transition-all duration-200 overflow-hidden ${
                  isExpanded
                    ? 'border-cyan-400 shadow-md ring-1 ring-cyan-200'
                    : 'border-slate-200 hover:border-slate-300 shadow-xs'
                }`}
              >
                {/* Protocol Card Header */}
                <div
                  onClick={() => setExpandedId(isExpanded ? null : guide.id)}
                  className="p-5 flex items-start justify-between gap-4 cursor-pointer select-none bg-gradient-to-r from-white via-white to-slate-50/50"
                >
                  <div className="space-y-1.5 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className={`text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full border font-mono ${
                          guide.category === 'EMERGENCY'
                            ? 'bg-red-50 text-red-700 border-red-200'
                            : guide.category === 'CARDIOVASCULAR'
                            ? 'bg-rose-50 text-rose-700 border-rose-200'
                            : guide.category === 'DIABETES'
                            ? 'bg-blue-50 text-blue-700 border-blue-200'
                            : guide.category === 'SOUTH_ASIAN'
                            ? 'bg-amber-50 text-amber-700 border-amber-200'
                            : guide.category === 'RENAL'
                            ? 'bg-purple-50 text-purple-700 border-purple-200'
                            : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        }`}
                      >
                        {guide.category}
                      </span>
                      <span className="text-xs text-slate-500 font-medium">• {guide.source}</span>
                      <span className="text-[10px] font-mono text-cyan-800 bg-cyan-50 px-2 py-0.2 rounded border border-cyan-200 font-bold">
                        {guide.evidenceLevel}
                      </span>
                    </div>

                    <h3 className="text-base font-black text-slate-900 tracking-tight">
                      {guide.title}
                    </h3>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      {guide.summary}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 pt-1">
                    <button
                      className="w-8 h-8 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center transition-all hover:bg-slate-200"
                      title={isExpanded ? 'Collapse Protocol' : 'Expand Protocol'}
                    >
                      {isExpanded ? (
                        <ChevronDown className="w-4 h-4" />
                      ) : (
                        <ChevronRight className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Protocol Card Expanded Content */}
                {isExpanded && (
                  <div className="p-5 sm:p-6 bg-slate-50/70 border-t border-slate-100 space-y-5 text-xs text-slate-700">
                    {/* Key Protocol Steps & Rules */}
                    <div className="space-y-2.5">
                      <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-cyan-700" />
                        Key Clinical Decision Points & Algorithmic Tiers
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                        {guide.keyPoints.map((kp, idx) => (
                          <div
                            key={idx}
                            className={`p-3.5 rounded-2xl border transition-all ${
                              kp.highlight
                                ? 'bg-amber-50/80 border-amber-300 text-amber-950 font-medium shadow-2xs'
                                : 'bg-white border-slate-200 text-slate-800'
                            }`}
                          >
                            <span className="font-black text-xs block mb-0.5 text-slate-900">
                              {kp.label}
                            </span>
                            <span className="text-xs leading-relaxed text-slate-600">
                              {kp.detail}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Target Threshold Banner */}
                    {guide.targetThresholds && (
                      <div className="p-3.5 rounded-2xl bg-cyan-900 text-cyan-100 border border-cyan-800 flex items-start gap-2.5 shadow-sm">
                        <ShieldCheck className="w-4 h-4 text-cyan-300 shrink-0 mt-0.5" />
                        <div>
                          <strong className="text-white text-xs block">Evidence-Based Clinical Target:</strong>
                          <span className="text-xs text-cyan-100">{guide.targetThresholds}</span>
                        </div>
                      </div>
                    )}

                    {/* Guideline-Directed Pharmacotherapy */}
                    {guide.recommendedDrugs && guide.recommendedDrugs.length > 0 && (
                      <div className="space-y-2">
                        <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
                          <Pill className="w-3.5 h-3.5 text-rose-600" />
                          Guideline-Directed Medical Therapy (GDMT) Formulations
                        </h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                          {guide.recommendedDrugs.map((med, mIdx) => (
                            <div
                              key={mIdx}
                              className="p-3 rounded-2xl bg-white border border-slate-200 space-y-1 shadow-2xs"
                            >
                              <div className="flex items-center justify-between">
                                <span className="font-bold text-xs text-slate-900">{med.drug}</span>
                                <span className="text-[10px] font-mono bg-rose-50 text-rose-700 px-1.5 py-0.2 rounded border border-rose-200 font-bold">
                                  {med.dose}
                                </span>
                              </div>
                              <p className="text-[11px] text-slate-500">{med.note}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Standardized Interoperability Ontologies (ICD-10, LOINC, SNOMED) */}
                    {(guide.icdCodes || guide.snomedCodes || guide.loincCodes) && (
                      <div className="pt-2 border-t border-slate-200/80 flex items-center gap-3 flex-wrap text-xs">
                        <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                          EHR Codes:
                        </span>

                        {guide.icdCodes && (
                          <div className="flex items-center gap-1">
                            <span className="text-slate-400 font-medium text-[11px]">ICD-10:</span>
                            {guide.icdCodes.map((code) => (
                              <button
                                key={code}
                                onClick={() => handleCopyCode(code)}
                                className="font-mono bg-slate-200 hover:bg-slate-300 text-slate-800 text-[10px] px-2 py-0.5 rounded cursor-pointer transition-all flex items-center gap-1"
                                title="Click to copy ICD-10 code"
                              >
                                <span>{code}</span>
                                {copiedCode === code ? (
                                  <Check className="w-2.5 h-2.5 text-emerald-600" />
                                ) : (
                                  <Copy className="w-2.5 h-2.5 text-slate-400" />
                                )}
                              </button>
                            ))}
                          </div>
                        )}

                        {guide.snomedCodes && (
                          <div className="flex items-center gap-1">
                            <span className="text-slate-400 font-medium text-[11px]">SNOMED CT:</span>
                            {guide.snomedCodes.map((code) => (
                              <button
                                key={code}
                                onClick={() => handleCopyCode(code)}
                                className="font-mono bg-cyan-100 hover:bg-cyan-200 text-cyan-900 text-[10px] px-2 py-0.5 rounded cursor-pointer transition-all flex items-center gap-1"
                                title="Click to copy SNOMED CT concept"
                              >
                                <span>{code}</span>
                                {copiedCode === code ? (
                                  <Check className="w-2.5 h-2.5 text-emerald-600" />
                                ) : (
                                  <Copy className="w-2.5 h-2.5 text-cyan-600" />
                                )}
                              </button>
                            ))}
                          </div>
                        )}

                        {guide.loincCodes && (
                          <div className="flex items-center gap-1">
                            <span className="text-slate-400 font-medium text-[11px]">LOINC:</span>
                            {guide.loincCodes.map((code) => (
                              <button
                                key={code}
                                onClick={() => handleCopyCode(code)}
                                className="font-mono bg-emerald-100 hover:bg-emerald-200 text-emerald-900 text-[10px] px-2 py-0.5 rounded cursor-pointer transition-all flex items-center gap-1"
                                title="Click to copy LOINC code"
                              >
                                <span>{code}</span>
                                {copiedCode === code ? (
                                  <Check className="w-2.5 h-2.5 text-emerald-600" />
                                ) : (
                                  <Copy className="w-2.5 h-2.5 text-emerald-600" />
                                )}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* SNOMED CT / LOINC / ICD-10 Interoperability Reference Table */}
      <div className="bg-white rounded-3xl border border-slate-200 p-5 sm:p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <FileText className="w-4 h-4 text-cyan-600" />
              Master Clinical Coding & Ontologies Reference
            </h3>
            <p className="text-xs text-slate-500">
              Standardized vocabularies used across Pakistan Digital Health Information System (DHIS-2).
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
              <tr>
                <th className="p-3">Clinical Concept</th>
                <th className="p-3">Category</th>
                <th className="p-3">SNOMED CT Concept ID</th>
                <th className="p-3">LOINC Code</th>
                <th className="p-3">ICD-10-CM</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono">
              <tr>
                <td className="p-3 font-sans font-semibold text-slate-900">Systolic Blood Pressure</td>
                <td className="p-3 font-sans text-slate-600">Vital Sign</td>
                <td className="p-3 text-cyan-800">271649006</td>
                <td className="p-3 text-emerald-800">8480-6</td>
                <td className="p-3 text-slate-500">R03.0</td>
              </tr>
              <tr>
                <td className="p-3 font-sans font-semibold text-slate-900">Diastolic Blood Pressure</td>
                <td className="p-3 font-sans text-slate-600">Vital Sign</td>
                <td className="p-3 text-cyan-800">271650006</td>
                <td className="p-3 text-emerald-800">8462-4</td>
                <td className="p-3 text-slate-500">R03.0</td>
              </tr>
              <tr>
                <td className="p-3 font-sans font-semibold text-slate-900">Heart Rate / Pulse</td>
                <td className="p-3 font-sans text-slate-600">Vital Sign</td>
                <td className="p-3 text-cyan-800">364075005</td>
                <td className="p-3 text-emerald-800">8867-4</td>
                <td className="p-3 text-slate-500">R00.0</td>
              </tr>
              <tr>
                <td className="p-3 font-sans font-semibold text-slate-900">Oxygen Saturation (SpO2)</td>
                <td className="p-3 font-sans text-slate-600">Vital Sign</td>
                <td className="p-3 text-cyan-800">431314004</td>
                <td className="p-3 text-emerald-800">2708-6</td>
                <td className="p-3 text-slate-500">R09.02</td>
              </tr>
              <tr>
                <td className="p-3 font-sans font-semibold text-slate-900">Fasting Plasma Glucose</td>
                <td className="p-3 font-sans text-slate-600">Laboratory Assay</td>
                <td className="p-3 text-cyan-800">44054006</td>
                <td className="p-3 text-emerald-800">1558-6</td>
                <td className="p-3 text-slate-500">E11.9</td>
              </tr>
              <tr>
                <td className="p-3 font-sans font-semibold text-slate-900">Hemoglobin A1c (HbA1c)</td>
                <td className="p-3 font-sans text-slate-600">Laboratory Assay</td>
                <td className="p-3 text-cyan-800">43396009</td>
                <td className="p-3 text-emerald-800">4548-4</td>
                <td className="p-3 text-slate-500">E11.65</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
