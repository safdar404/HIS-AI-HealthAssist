import React, { useState } from 'react';
import {
  Calculator,
  Heart,
  Activity,
  Flame,
  ShieldAlert,
  Droplets,
  Copy,
  Check,
  Info,
  Scale,
  RefreshCw,
} from 'lucide-react';

export const ClinicalCalculatorsView: React.FC = () => {
  const [activeCalc, setActiveCalc] = useState<'MAP' | 'EGFR' | 'CHADS' | 'CVD' | 'BMI'>('MAP');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // 1. MAP & Pulse Pressure State
  const [sbp, setSbp] = useState<number>(145);
  const [dbp, setDbp] = useState<number>(90);
  const [hr, setHr] = useState<number>(82);

  // Computed MAP
  const pulsePressure = sbp - dbp;
  const mapValue = Math.round(dbp + pulsePressure / 3);

  // 2. eGFR (CKD-EPI 2021) State
  const [creatinine, setCreatinine] = useState<number>(1.2);
  const [egfrAge, setEgfrAge] = useState<number>(58);
  const [egfrSex, setEgfrSex] = useState<'MALE' | 'FEMALE'>('MALE');

  // CKD-EPI 2021 formula computation:
  // eGFR = 142 * min(Scr/kappa, 1)^alpha * max(Scr/kappa, 1)^-1.200 * 0.9938^Age * (1.012 if female)
  const kappa = egfrSex === 'FEMALE' ? 0.7 : 0.9;
  const alpha = egfrSex === 'FEMALE' ? -0.241 : -0.302;
  const sexMultiplier = egfrSex === 'FEMALE' ? 1.012 : 1.0;
  const scrOverKappa = creatinine / kappa;
  const egfrResult = Math.round(
    142 *
      Math.pow(Math.min(scrOverKappa, 1), alpha) *
      Math.pow(Math.max(scrOverKappa, 1), -1.2) *
      Math.pow(0.9938, egfrAge) *
      sexMultiplier
  );

  let ckdStage = 'G1 (Normal or high kidney function)';
  let ckdColor = 'text-emerald-700 bg-emerald-50 border-emerald-200';
  if (egfrResult < 15) {
    ckdStage = 'G5 (Kidney Failure / End-stage Renal Disease)';
    ckdColor = 'text-red-700 bg-red-50 border-red-200';
  } else if (egfrResult < 30) {
    ckdStage = 'G4 (Severe reduction in kidney function)';
    ckdColor = 'text-orange-700 bg-orange-50 border-orange-200';
  } else if (egfrResult < 60) {
    ckdStage = 'G3 (Moderate to severe reduction / CKD Stage 3)';
    ckdColor = 'text-amber-700 bg-amber-50 border-amber-200';
  } else if (egfrResult < 90) {
    ckdStage = 'G2 (Mild reduction in kidney function)';
    ckdColor = 'text-cyan-700 bg-cyan-50 border-cyan-200';
  }

  // 3. CHA2DS2-VASc State
  const [chadsAge, setChadsAge] = useState<number>(68);
  const [chadsSex, setChadsSex] = useState<'MALE' | 'FEMALE'>('MALE');
  const [chadsChf, setChadsChf] = useState<boolean>(false);
  const [chadsHtn, setChadsHtn] = useState<boolean>(true);
  const [chadsStroke, setChadsStroke] = useState<boolean>(false);
  const [chadsVasc, setChadsVasc] = useState<boolean>(true);
  const [chadsDm, setChadsDm] = useState<boolean>(false);

  let chadsScore = 0;
  if (chadsChf) chadsScore += 1;
  if (chadsHtn) chadsScore += 1;
  if (chadsAge >= 75) chadsScore += 2;
  else if (chadsAge >= 65) chadsScore += 1;
  if (chadsDm) chadsScore += 1;
  if (chadsStroke) chadsScore += 2;
  if (chadsVasc) chadsScore += 1;
  if (chadsSex === 'FEMALE') chadsScore += 1;

  let chadsStrokeRisk = '0.2%';
  let chadsRecommendation = 'Low Risk. Oral anticoagulation usually not recommended.';
  if (chadsScore >= 3) {
    chadsStrokeRisk = chadsScore === 3 ? '3.2%' : chadsScore === 4 ? '4.8%' : chadsScore === 5 ? '7.2%' : '9.7%+';
    chadsRecommendation = 'High Risk. Oral Anticoagulation (DOAC e.g. Apixaban, Rivaroxaban) strongly recommended.';
  } else if (chadsScore === 2) {
    chadsStrokeRisk = '2.2%';
    chadsRecommendation = 'Moderate Risk. Oral Anticoagulation recommended in men (score 2) & women (score 3).';
  } else if (chadsScore === 1) {
    chadsStrokeRisk = '1.3%';
    chadsRecommendation = 'Low-to-Intermediate Risk. Anticoagulation or clinical consideration based on individual profile.';
  }

  // 4. BMI & BSA Mosteller State
  const [calcHeight, setCalcHeight] = useState<number>(172);
  const [calcWeight, setCalcWeight] = useState<number>(84);

  const calcHeightM = calcHeight / 100;
  const bmiComputed = calcHeightM > 0 ? Number((calcWeight / (calcHeightM * calcHeightM)).toFixed(1)) : 25;
  const bsaComputed = Number(Math.sqrt((calcHeight * calcWeight) / 3600).toFixed(2));

  let bmiCategory = 'Normal Weight';
  let bmiColor = 'bg-emerald-50 text-emerald-700 border-emerald-200';
  if (bmiComputed < 18.5) {
    bmiCategory = 'Underweight';
    bmiColor = 'bg-blue-50 text-blue-700 border-blue-200';
  } else if (bmiComputed < 25) {
    bmiCategory = 'Normal Weight';
    bmiColor = 'bg-emerald-50 text-emerald-700 border-emerald-200';
  } else if (bmiComputed < 30) {
    bmiCategory = 'Overweight (Pre-obesity)';
    bmiColor = 'bg-amber-50 text-amber-700 border-amber-200';
  } else if (bmiComputed < 35) {
    bmiCategory = 'Class I Obesity (Moderate)';
    bmiColor = 'bg-orange-50 text-orange-700 border-orange-200';
  } else {
    bmiCategory = 'Class II/III Severe Obesity';
    bmiColor = 'bg-red-50 text-red-700 border-red-200';
  }

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2500);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <Calculator className="w-5 h-5 text-cyan-600" />
              <h2 className="text-base font-bold text-slate-900">
                Point-of-Care Clinical Calculators & Hemodynamic Scoring
              </h2>
              <span className="text-[11px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-mono font-bold">
                KDIGO • ACC/AHA • ESC 2026
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Validated clinical formulas and risk indices for rapid physician decision-making at the point of care.
            </p>
          </div>

          {/* Calculator Selector Tabs */}
          <div className="flex flex-wrap items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
            <button
              id="btn-calc-map"
              onClick={() => setActiveCalc('MAP')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                activeCalc === 'MAP'
                  ? 'bg-white text-slate-900 shadow-sm border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Activity className="w-3.5 h-3.5 text-rose-500" />
              MAP & Pulse Pressure
            </button>

            <button
              id="btn-calc-egfr"
              onClick={() => setActiveCalc('EGFR')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                activeCalc === 'EGFR'
                  ? 'bg-white text-slate-900 shadow-sm border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Droplets className="w-3.5 h-3.5 text-cyan-600" />
              eGFR (CKD-EPI 2021)
            </button>

            <button
              id="btn-calc-chads"
              onClick={() => setActiveCalc('CHADS')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                activeCalc === 'CHADS'
                  ? 'bg-white text-slate-900 shadow-sm border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ShieldAlert className="w-3.5 h-3.5 text-amber-500" />
              CHA₂DS₂-VASc
            </button>

            <button
              id="btn-calc-bmi"
              onClick={() => setActiveCalc('BMI')}
              className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                activeCalc === 'BMI'
                  ? 'bg-white text-slate-900 shadow-sm border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Scale className="w-3.5 h-3.5 text-teal-600" />
              BMI & Mosteller BSA
            </button>
          </div>
        </div>
      </div>

      {/* 1. MEAN ARTERIAL PRESSURE (MAP) & PULSE PRESSURE CALCULATOR */}
      {activeCalc === 'MAP' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-6 bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Activity className="w-4 h-4 text-rose-500" />
                Hemodynamic Parameters
              </h3>
              <span className="text-[11px] text-slate-400 font-mono">Formula: DBP + ⅓(SBP - DBP)</span>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <div className="flex items-center justify-between font-bold text-slate-700 mb-1">
                  <span>Systolic Blood Pressure (SBP)</span>
                  <span className="font-mono text-slate-900">{sbp} mmHg</span>
                </div>
                <input
                  type="range"
                  min="60"
                  max="240"
                  value={sbp}
                  onChange={(e) => setSbp(Number(e.target.value))}
                  className="w-full h-2 bg-slate-100 rounded-lg accent-rose-600 cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                  <span>60 mmHg</span>
                  <span>120 (Normal)</span>
                  <span>140 (HTN)</span>
                  <span>240 mmHg</span>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between font-bold text-slate-700 mb-1">
                  <span>Diastolic Blood Pressure (DBP)</span>
                  <span className="font-mono text-slate-900">{dbp} mmHg</span>
                </div>
                <input
                  type="range"
                  min="40"
                  max="140"
                  value={dbp}
                  onChange={(e) => setDbp(Number(e.target.value))}
                  className="w-full h-2 bg-slate-100 rounded-lg accent-cyan-600 cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                  <span>40 mmHg</span>
                  <span>80 (Normal)</span>
                  <span>90 (HTN)</span>
                  <span>140 mmHg</span>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between font-bold text-slate-700 mb-1">
                  <span>Heart Rate (HR)</span>
                  <span className="font-mono text-slate-900">{hr} bpm</span>
                </div>
                <input
                  type="range"
                  min="40"
                  max="180"
                  value={hr}
                  onChange={(e) => setHr(Number(e.target.value))}
                  className="w-full h-2 bg-slate-100 rounded-lg accent-teal-600 cursor-pointer"
                />
              </div>
            </div>
          </div>

          <div className="lg:col-span-6 bg-white rounded-2xl border border-slate-200 p-5 shadow-sm flex flex-col justify-between space-y-4">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                  Computed Hemodynamics
                </span>
                <button
                  onClick={() =>
                    copyToClipboard(
                      `Hemodynamic Assessment: BP ${sbp}/${dbp} mmHg, MAP: ${mapValue} mmHg, Pulse Pressure: ${pulsePressure} mmHg. Status: ${
                        mapValue < 65 ? 'Hypoperfusion Risk' : mapValue > 110 ? 'Elevated Afterload' : 'Adequate Perfusion'
                      }.`,
                      'map'
                    )
                  }
                  className="px-2.5 py-1 text-xs rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 flex items-center gap-1 cursor-pointer"
                >
                  {copiedKey === 'map' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  {copiedKey === 'map' ? 'Copied' : 'Copy for Notes'}
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-center">
                  <span className="text-[11px] font-bold text-slate-500 uppercase block">Mean Arterial Pressure</span>
                  <span className="text-3xl font-black font-mono text-slate-900 mt-1 block">{mapValue}</span>
                  <span className="text-[10px] text-slate-400 font-mono">mmHg (Goal: 70 - 100)</span>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-center">
                  <span className="text-[11px] font-bold text-slate-500 uppercase block">Pulse Pressure</span>
                  <span className="text-3xl font-black font-mono text-slate-900 mt-1 block">{pulsePressure}</span>
                  <span className="text-[10px] text-slate-400 font-mono">mmHg (Normal: 40 - 60)</span>
                </div>
              </div>

              {/* Clinical Interpretation */}
              <div
                className={`p-3.5 rounded-xl border text-xs leading-relaxed ${
                  mapValue < 65
                    ? 'bg-red-50 border-red-200 text-red-900'
                    : mapValue > 120
                    ? 'bg-amber-50 border-amber-200 text-amber-900'
                    : 'bg-emerald-50 border-emerald-200 text-emerald-900'
                }`}
              >
                <div className="font-bold mb-1 flex items-center gap-1.5">
                  <Info className="w-4 h-4" />
                  Clinical Evaluation:
                </div>
                {mapValue < 65 ? (
                  <span>
                    <strong>Critical MAP &lt; 65 mmHg:</strong> Risk of inadequate vital organ perfusion (cerebral, coronary,
                    and renal hypoperfusion). Evaluate for sepsis, hypovolemia, or cardiogenic shock.
                  </span>
                ) : mapValue > 120 ? (
                  <span>
                    <strong>Severe Elevated MAP &gt; 120 mmHg:</strong> Excessive systemic vascular resistance and cardiac
                    afterload. Check for target organ damage and hypertensive urgency/crisis.
                  </span>
                ) : (
                  <span>
                    <strong>Optimal Perfusion (MAP 70-100 mmHg):</strong> Normal hemodynamic gradient adequate for capillary
                    autoregulation and coronary arterial filling.
                  </span>
                )}
                {pulsePressure > 60 && (
                  <div className="mt-2 pt-2 border-t border-slate-200/60 font-medium">
                    ⚠️ <strong>Widened Pulse Pressure ({pulsePressure} mmHg):</strong> Suggestive of aortic stiffness,
                    atherosclerosis, or severe aortic regurgitation.
                  </div>
                )}
              </div>
            </div>

            <p className="text-[10px] text-slate-400 border-t border-slate-100 pt-2">
              Based on Surviving Sepsis Campaign 2026 & European Society of Cardiology Hemodynamic Guidelines.
            </p>
          </div>
        </div>
      )}

      {/* 2. EGFR (CKD-EPI 2021) CALCULATOR */}
      {activeCalc === 'EGFR' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-6 bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Droplets className="w-4 h-4 text-cyan-600" />
                CKD-EPI 2021 Renal Parameters
              </h3>
              <span className="text-[11px] text-slate-400 font-mono">Race-Free Standard</span>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Serum Creatinine (mg/dL)</label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    step="0.1"
                    min="0.3"
                    max="15.0"
                    value={creatinine}
                    onChange={(e) => setCreatinine(Math.max(0.2, Number(e.target.value)))}
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg font-mono text-sm focus:ring-2 focus:ring-cyan-500 focus:outline-none"
                  />
                  <span className="text-slate-500 shrink-0">mg/dL</span>
                </div>
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Patient Age (Years)</label>
                <input
                  type="number"
                  min="18"
                  max="110"
                  value={egfrAge}
                  onChange={(e) => setEgfrAge(Number(e.target.value))}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg font-mono text-sm focus:ring-2 focus:ring-cyan-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Biological Sex</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setEgfrSex('MALE')}
                    className={`py-2 rounded-lg font-bold transition-all cursor-pointer ${
                      egfrSex === 'MALE' ? 'bg-cyan-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    Male (κ=0.9, α=-0.302)
                  </button>
                  <button
                    type="button"
                    onClick={() => setEgfrSex('FEMALE')}
                    className={`py-2 rounded-lg font-bold transition-all cursor-pointer ${
                      egfrSex === 'FEMALE' ? 'bg-cyan-600 text-white' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    Female (κ=0.7, α=-0.241)
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-6 bg-white rounded-2xl border border-slate-200 p-5 shadow-sm flex flex-col justify-between space-y-4">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                  Estimated Glomerular Filtration Rate
                </span>
                <button
                  onClick={() =>
                    copyToClipboard(
                      `Renal Function Assessment (CKD-EPI 2021): Serum Creatinine ${creatinine} mg/dL, Age ${egfrAge}, Sex ${egfrSex} -> eGFR: ${egfrResult} mL/min/1.73m², KDIGO Stage: ${ckdStage}.`,
                      'egfr'
                    )
                  }
                  className="px-2.5 py-1 text-xs rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 flex items-center gap-1 cursor-pointer"
                >
                  {copiedKey === 'egfr' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  {copiedKey === 'egfr' ? 'Copied' : 'Copy for Notes'}
                </button>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-center">
                <span className="text-[11px] font-bold text-slate-500 uppercase block">eGFR Result</span>
                <div className="text-4xl font-black font-mono text-cyan-800 mt-1">{egfrResult}</div>
                <span className="text-xs text-slate-500 font-mono">mL/min/1.73 m²</span>
              </div>

              <div className={`p-3.5 rounded-xl border text-xs ${ckdColor}`}>
                <div className="font-bold mb-1">KDIGO CKD Classification:</div>
                <div className="font-bold text-sm">{ckdStage}</div>
                <div className="text-[11px] mt-1.5 opacity-90">
                  {egfrResult < 30
                    ? '⚠️ Severe renal impairment. Medication dose adjustment required (Metformin contraindicated, adjust ACEi/ARBs and DOACs). Refer to Nephrology.'
                    : egfrResult < 60
                    ? 'Moderate CKD. Monitor potassium, serum creatinine, and annual urine albumin-to-creatinine ratio (uACR).'
                    : 'Preserved renal filtration capacity.'}
                </div>
              </div>
            </div>

            <p className="text-[10px] text-slate-400 border-t border-slate-100 pt-2">
              Endorsed by the National Kidney Foundation (NKF) & American Society of Nephrology (ASN) 2021-2026.
            </p>
          </div>
        </div>
      )}

      {/* 3. CHA2DS2-VASC SCORE CALCULATOR */}
      {activeCalc === 'CHADS' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 text-amber-500" />
                CHA₂DS₂-VASc Clinical Risk Factors (Atrial Fibrillation)
              </h3>
              <span className="text-[11px] text-slate-400 font-mono">ESC/AHA Standard</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <label
                className={`p-2.5 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                  chadsChf ? 'bg-amber-50 border-amber-300 font-bold text-amber-950' : 'bg-slate-50 border-slate-200'
                }`}
              >
                <span>Congestive Heart Failure (+1)</span>
                <input
                  type="checkbox"
                  checked={chadsChf}
                  onChange={(e) => setChadsChf(e.target.checked)}
                  className="rounded text-amber-600"
                />
              </label>

              <label
                className={`p-2.5 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                  chadsHtn ? 'bg-amber-50 border-amber-300 font-bold text-amber-950' : 'bg-slate-50 border-slate-200'
                }`}
              >
                <span>Hypertension (+1)</span>
                <input
                  type="checkbox"
                  checked={chadsHtn}
                  onChange={(e) => setChadsHtn(e.target.checked)}
                  className="rounded text-amber-600"
                />
              </label>

              <label
                className={`p-2.5 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                  chadsDm ? 'bg-amber-50 border-amber-300 font-bold text-amber-950' : 'bg-slate-50 border-slate-200'
                }`}
              >
                <span>Diabetes Mellitus (+1)</span>
                <input
                  type="checkbox"
                  checked={chadsDm}
                  onChange={(e) => setChadsDm(e.target.checked)}
                  className="rounded text-amber-600"
                />
              </label>

              <label
                className={`p-2.5 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                  chadsStroke ? 'bg-red-50 border-red-300 font-bold text-red-950' : 'bg-slate-50 border-slate-200'
                }`}
              >
                <span>Prior Stroke / TIA / TE (+2)</span>
                <input
                  type="checkbox"
                  checked={chadsStroke}
                  onChange={(e) => setChadsStroke(e.target.checked)}
                  className="rounded text-red-600"
                />
              </label>

              <label
                className={`p-2.5 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                  chadsVasc ? 'bg-amber-50 border-amber-300 font-bold text-amber-950' : 'bg-slate-50 border-slate-200'
                }`}
              >
                <span>Vascular Disease (MI, PAD, Ao) (+1)</span>
                <input
                  type="checkbox"
                  checked={chadsVasc}
                  onChange={(e) => setChadsVasc(e.target.checked)}
                  className="rounded text-amber-600"
                />
              </label>

              <label
                className={`p-2.5 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                  chadsSex === 'FEMALE' ? 'bg-amber-50 border-amber-300 font-bold text-amber-950' : 'bg-slate-50 border-slate-200'
                }`}
              >
                <span>Female Sex Category (+1)</span>
                <input
                  type="checkbox"
                  checked={chadsSex === 'FEMALE'}
                  onChange={(e) => setChadsSex(e.target.checked ? 'FEMALE' : 'MALE')}
                  className="rounded text-amber-600"
                />
              </label>
            </div>

            <div className="pt-2">
              <label className="font-bold text-slate-700 block mb-1 text-xs">Patient Age (Years)</label>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min="20"
                  max="95"
                  value={chadsAge}
                  onChange={(e) => setChadsAge(Number(e.target.value))}
                  className="w-full h-2 bg-slate-100 rounded-lg accent-amber-600 cursor-pointer"
                />
                <span className="font-mono font-bold text-slate-900 shrink-0 text-sm">{chadsAge} yo</span>
              </div>
              <span className="text-[10px] text-slate-400">
                Age ≥75 = +2 points | Age 65-74 = +1 point | Age &lt;65 = 0 points
              </span>
            </div>
          </div>

          <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 p-5 shadow-sm flex flex-col justify-between space-y-4">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">Thromboembolic Risk</span>
                <button
                  onClick={() =>
                    copyToClipboard(
                      `CHA₂DS₂-VASc Assessment: Score = ${chadsScore}. Annual Thromboembolism Risk: ${chadsStrokeRisk}/year. Anticoagulation Protocol: ${chadsRecommendation}`,
                      'chads'
                    )
                  }
                  className="px-2.5 py-1 text-xs rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 flex items-center gap-1 cursor-pointer"
                >
                  {copiedKey === 'chads' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  {copiedKey === 'chads' ? 'Copied' : 'Copy for Notes'}
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3 text-center">
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-[10px] font-bold text-slate-500 uppercase block">Score</span>
                  <div className="text-3xl font-black font-mono text-amber-600 mt-0.5">{chadsScore}</div>
                  <span className="text-[10px] text-slate-400">Points (Max 9)</span>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-[10px] font-bold text-slate-500 uppercase block">Annual Stroke Risk</span>
                  <div className="text-3xl font-black font-mono text-slate-900 mt-0.5">{chadsStrokeRisk}</div>
                  <span className="text-[10px] text-slate-400">per annum</span>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-amber-50/80 border border-amber-200 text-amber-950 text-xs">
                <div className="font-bold mb-1">Guideline Anticoagulation Recommendation:</div>
                <div className="leading-relaxed">{chadsRecommendation}</div>
              </div>
            </div>

            <p className="text-[10px] text-slate-400 border-t border-slate-100 pt-2">
              European Heart Journal AF Guidelines & AHA/ACC/HRS 2026 AF Protocol.
            </p>
          </div>
        </div>
      )}

      {/* 4. BMI & MOSTELLER BODY SURFACE AREA (BSA) */}
      {activeCalc === 'BMI' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-6 bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Scale className="w-4 h-4 text-teal-600" />
                Anthropometric Measurements
              </h3>
              <span className="text-[11px] text-slate-400 font-mono">Mosteller & Quetelet Index</span>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <div className="flex items-center justify-between font-bold text-slate-700 mb-1">
                  <span>Height (cm)</span>
                  <span className="font-mono text-slate-900">
                    {calcHeight} cm ({(calcHeight / 30.48).toFixed(1)} ft)
                  </span>
                </div>
                <input
                  type="range"
                  min="120"
                  max="220"
                  value={calcHeight}
                  onChange={(e) => setCalcHeight(Number(e.target.value))}
                  className="w-full h-2 bg-slate-100 rounded-lg accent-teal-600 cursor-pointer"
                />
              </div>

              <div>
                <div className="flex items-center justify-between font-bold text-slate-700 mb-1">
                  <span>Weight (kg)</span>
                  <span className="font-mono text-slate-900">
                    {calcWeight} kg ({(calcWeight * 2.20462).toFixed(1)} lbs)
                  </span>
                </div>
                <input
                  type="range"
                  min="35"
                  max="180"
                  value={calcWeight}
                  onChange={(e) => setCalcWeight(Number(e.target.value))}
                  className="w-full h-2 bg-slate-100 rounded-lg accent-teal-600 cursor-pointer"
                />
              </div>
            </div>
          </div>

          <div className="lg:col-span-6 bg-white rounded-2xl border border-slate-200 p-5 shadow-sm flex flex-col justify-between space-y-4">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">
                  Calculated Indices
                </span>
                <button
                  onClick={() =>
                    copyToClipboard(
                      `Anthropometric Assessment: Height: ${calcHeight} cm, Weight: ${calcWeight} kg. BMI: ${bmiComputed} kg/m² (${bmiCategory}), BSA (Mosteller): ${bsaComputed} m².`,
                      'bmi'
                    )
                  }
                  className="px-2.5 py-1 text-xs rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 flex items-center gap-1 cursor-pointer"
                >
                  {copiedKey === 'bmi' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  {copiedKey === 'bmi' ? 'Copied' : 'Copy for Notes'}
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3 text-center">
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-[11px] font-bold text-slate-500 uppercase block">Body Mass Index (BMI)</span>
                  <div className="text-3xl font-black font-mono text-slate-900 mt-1">{bmiComputed}</div>
                  <span className="text-[10px] text-slate-400 font-mono">kg/m²</span>
                </div>

                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                  <span className="text-[11px] font-bold text-slate-500 uppercase block">Body Surface Area (BSA)</span>
                  <div className="text-3xl font-black font-mono text-slate-900 mt-1">{bsaComputed}</div>
                  <span className="text-[10px] text-slate-400 font-mono">m² (Mosteller)</span>
                </div>
              </div>

              <div className={`p-3.5 rounded-xl border text-xs ${bmiColor}`}>
                <div className="font-bold">WHO Weight Classification: {bmiCategory}</div>
                <div className="text-[11px] mt-1 opacity-90">
                  {bmiComputed >= 30
                    ? 'Obesity is an independent major risk factor for coronary artery disease, hypertension, obstructive sleep apnea, and T2DM.'
                    : bmiComputed >= 25
                    ? 'Overweight status. Lifestyle interventions recommended: 150 min/wk moderate aerobic exercise & dietary sodium reduction.'
                    : 'Normal body composition index.'}
                </div>
              </div>
            </div>

            <p className="text-[10px] text-slate-400 border-t border-slate-100 pt-2">
              Mosteller RD. Simplified calculation of body-surface area. N Engl J Med 1987; 317:1098.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
