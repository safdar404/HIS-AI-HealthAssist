import React, { useState } from 'react';
import {
  PatientDemographics,
  ClinicalProfile,
  VitalSigns,
  SymptomOccurrence,
  LabResults,
  PatientAssessmentRecord,
} from '../types/clinical';
import { SYMPTOM_DEFINITIONS } from '../clinical/symptomDatabase';
import { evaluateRedFlags } from '../clinical/safetyEngine';
import { PAKISTAN_DISTRICTS_DATA } from '../data/geoDistrictData';
import { SAMPLE_CASES } from '../data/samplePatientCases';
import {
  User,
  Activity,
  Heart,
  Stethoscope,
  FlaskConical,
  AlertOctagon,
  Sparkles,
  ChevronRight,
  ChevronLeft,
  CheckCircle2,
  AlertTriangle,
  Info,
} from 'lucide-react';

interface PatientIntakeWizardProps {
  onAssessmentCompleted: (record: PatientAssessmentRecord) => void;
  onSelectSampleCase: (caseKey: string) => void;
}

export const PatientIntakeWizard: React.FC<PatientIntakeWizardProps> = ({
  onAssessmentCompleted,
  onSelectSampleCase,
}) => {
  const [step, setStep] = useState<number>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State
  const [demographics, setDemographics] = useState<PatientDemographics>({
    patientId: `P-PK-${Math.floor(1000 + Math.random() * 9000)}`,
    mrn: `MRN-2026-${Math.floor(1000 + Math.random() * 9000)}`,
    fullName: '',
    age: 52,
    sex: 'MALE',
    phone: '',
    province: 'Punjab',
    district: 'Lahore',
    tehsil: 'Model Town',
    unionCouncil: 'UC-12',
    emergencyContact: '',
    consentGiven: true,
  });

  const [profile, setProfile] = useState<ClinicalProfile>({
    heightCm: 170,
    weightKg: 78,
    bmi: 27.0,
    smokingStatus: 'CURRENT_SMOKER',
    tobaccoUse: 'NONE',
    physicalActivity: 'MODERATE',
    pregnancyStatus: 'NOT_APPLICABLE',
    previousCVD: false,
    previousStroke: false,
    diabetesHistory: false,
    hypertensionHistory: true,
    kidneyDisease: false,
    liverDisease: false,
    asthmaCOPD: false,
    familyHistoryCVD: true,
    familyHistoryDiabetes: true,
    familyHistoryStroke: false,
    currentMedications: ['Amlodipine 5mg'],
    drugAllergies: [],
  });

  const [vitals, setVitals] = useState<VitalSigns>({
    systolicBp: 148,
    diastolicBp: 92,
    heartRate: 82,
    respiratoryRate: 16,
    temperatureC: 36.8,
    oxygenSaturation: 97,
    bloodGlucoseMgDl: 160,
    glucoseMeasurementType: 'FASTING',
    measurementSource: 'CLINIC_DEVICE',
    qualityFlag: 'VALID',
    measurementTime: new Date().toISOString(),
  });

  const [symptoms, setSymptoms] = useState<SymptomOccurrence[]>([
    {
      code: 'CV001',
      name: 'Chest Discomfort / Heavy Sensation',
      category: 'CARDIOVASCULAR',
      present: true,
      severity: 3,
      onset: 'GRADUAL',
      duration: 'DAYS',
      character: 'Dull ache after climbing stairs',
      progression: 'STABLE',
    },
    {
      code: 'CV006',
      name: 'Breathlessness on Exertion',
      category: 'CARDIOVASCULAR',
      present: true,
      severity: 2,
      onset: 'GRADUAL',
      duration: 'WEEKS',
      progression: 'STABLE',
    },
  ]);

  const [labs, setLabs] = useState<LabResults>({
    glucoseFastingMgDl: 155,
    hba1cPercent: 7.2,
    totalCholesterolMgDl: 220,
    ldlCholesterolMgDl: 145,
    hdlCholesterolMgDl: 39,
    triglyceridesMgDl: 180,
    creatinineMgDl: 1.1,
    egfr: 78,
  });

  const [selectedSymptomCategory, setSelectedSymptomCategory] = useState<string>('ALL');

  // Calculate live BMI
  const updateHeightWeight = (height: number, weight: number) => {
    const hM = height / 100;
    const bmiVal = hM > 0 ? Number((weight / (hM * hM)).toFixed(1)) : 24;
    setProfile((prev) => ({
      ...prev,
      heightCm: height,
      weightKg: weight,
      bmi: bmiVal,
    }));
  };

  // Real-time Red Flag Check on current state
  const currentRedFlags = evaluateRedFlags(symptoms, vitals, profile);
  const isEmergencyTriggered = currentRedFlags.some((rf) => rf.urgency === 'EMERGENCY');

  // Toggle symptom presence
  const toggleSymptom = (def: typeof SYMPTOM_DEFINITIONS[0]) => {
    const exists = symptoms.find((s) => s.code === def.code);
    if (exists) {
      if (exists.present) {
        setSymptoms((prev) => prev.filter((s) => s.code !== def.code));
      } else {
        setSymptoms((prev) =>
          prev.map((s) => (s.code === def.code ? { ...s, present: true } : s))
        );
      }
    } else {
      setSymptoms((prev) => [
        ...prev,
        {
          code: def.code,
          name: def.name,
          category: def.category,
          present: true,
          severity: 3,
          onset: 'GRADUAL',
          duration: 'DAYS',
          progression: 'STABLE',
        },
      ]);
    }
  };

  const updateSymptomField = (
    code: string,
    field: keyof SymptomOccurrence,
    value: any
  ) => {
    setSymptoms((prev) =>
      prev.map((s) => (s.code === code ? { ...s, [field]: value } : s))
    );
  };

  const handleSubmitAssessment = async () => {
    setIsSubmitting(true);
    try {
      const response = await fetch('/api/assessment/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          demographics: {
            ...demographics,
            fullName: demographics.fullName || `Patient-${demographics.patientId.slice(-4)}`,
          },
          profile,
          vitals,
          labs,
          symptoms,
        }),
      });

      const data = await response.json();
      if (data.success && data.assessment) {
        const fullRecord: PatientAssessmentRecord = {
          demographics,
          profile,
          vitals,
          labs,
          symptoms,
          assessmentResult: data.assessment,
        };
        onAssessmentCompleted(fullRecord);
      }
    } catch (err) {
      console.error('Submission error:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filter symptoms for display
  const filteredSymptomDefs = SYMPTOM_DEFINITIONS.filter(
    (def) => selectedSymptomCategory === 'ALL' || def.category === selectedSymptomCategory
  );

  return (
    <div className="space-y-6">
      {/* Quick Test Case Presets */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 rounded-2xl p-4 border border-slate-700/70 shadow-lg">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-cyan-400" />
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              1-Click Benchmark Clinical Test Profiles
            </h3>
          </div>
          <span className="text-xs text-slate-400">
            Load realistic primary care & emergency clinical cases:
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2">
          <button
            id="preset-cardiac"
            onClick={() => onSelectSampleCase('acute_cardiac_emergency')}
            className="p-2.5 rounded-xl bg-red-950/40 hover:bg-red-900/60 border border-red-700/50 text-left transition-all group cursor-pointer"
          >
            <div className="flex items-center justify-between text-xs font-bold text-red-300 mb-1">
              <span>🚨 Acute Cardiac ACS</span>
              <span className="text-[10px] bg-red-800/60 px-1.5 py-0.2 rounded text-red-200">Red Flag</span>
            </div>
            <p className="text-[11px] text-slate-300 line-clamp-2">
              62yo M, crushing chest pain + arm radiation + diaphoresis (Lahore).
            </p>
          </button>

          <button
            id="preset-stroke"
            onClick={() => onSelectSampleCase('acute_stroke_emergency')}
            className="p-2.5 rounded-xl bg-purple-950/40 hover:bg-purple-900/60 border border-purple-700/50 text-left transition-all group cursor-pointer"
          >
            <div className="flex items-center justify-between text-xs font-bold text-purple-300 mb-1">
              <span>🚨 Stroke Emergency</span>
              <span className="text-[10px] bg-purple-800/60 px-1.5 py-0.2 rounded text-purple-200">FAST Deficit</span>
            </div>
            <p className="text-[11px] text-slate-300 line-clamp-2">
              65yo F, acute facial droop, arm weakness, BP 198/114 (Karachi).
            </p>
          </button>

          <button
            id="preset-metabolic"
            onClick={() => onSelectSampleCase('high_risk_metabolic_cvd')}
            className="p-2.5 rounded-xl bg-amber-950/40 hover:bg-amber-900/60 border border-amber-700/50 text-left transition-all group cursor-pointer"
          >
            <div className="flex items-center justify-between text-xs font-bold text-amber-300 mb-1">
              <span>🔴 Uncontrolled T2DM + HTN</span>
              <span className="text-[10px] bg-amber-800/60 px-1.5 py-0.2 rounded text-amber-200">High Risk</span>
            </div>
            <p className="text-[11px] text-slate-300 line-clamp-2">
              54yo M, HbA1c 9.3%, SBP 158, polyuria, naswar use (Faisalabad).
            </p>
          </button>

          <button
            id="preset-respiratory"
            onClick={() => onSelectSampleCase('respiratory_airway_vulnerability')}
            className="p-2.5 rounded-xl bg-teal-950/40 hover:bg-teal-900/60 border border-teal-700/50 text-left transition-all group cursor-pointer"
          >
            <div className="flex items-center justify-between text-xs font-bold text-teal-300 mb-1">
              <span>🟠 COPD / Airway Risk</span>
              <span className="text-[10px] bg-teal-800/60 px-1.5 py-0.2 rounded text-teal-200">Priority</span>
            </div>
            <p className="text-[11px] text-slate-300 line-clamp-2">
              51yo M, smoker, chronic productive cough, wheeze, SpO2 93% (Peshawar).
            </p>
          </button>

          <button
            id="preset-healthy"
            onClick={() => onSelectSampleCase('healthy_routine_baseline')}
            className="p-2.5 rounded-xl bg-emerald-950/40 hover:bg-emerald-900/60 border border-emerald-700/50 text-left transition-all group cursor-pointer"
          >
            <div className="flex items-center justify-between text-xs font-bold text-emerald-300 mb-1">
              <span>🟢 Healthy Baseline</span>
              <span className="text-[10px] bg-emerald-800/60 px-1.5 py-0.2 rounded text-emerald-200">Low Risk</span>
            </div>
            <p className="text-[11px] text-slate-300 line-clamp-2">
              34yo F, normotensive (118/74), glucose 88, active lifestyle (Islamabad).
            </p>
          </button>
        </div>
      </div>

      {/* Live Emergency Alert Banner if red flag is triggered during data entry */}
      {isEmergencyTriggered && (
        <div className="bg-red-600/15 border-2 border-red-500 rounded-2xl p-4 text-red-200 animate-pulse shadow-xl shadow-red-950/40">
          <div className="flex items-start gap-3">
            <AlertOctagon className="w-6 h-6 text-red-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h4 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                🚨 Live Safety Engine Alert: Critical Red Flag Detected
              </h4>
              <p className="text-xs text-red-200">
                {currentRedFlags[0]?.description}
              </p>
              <div className="bg-red-950/80 p-2.5 rounded-lg border border-red-800/80 text-[11px] text-red-300 mt-2 font-mono">
                <strong>Mandatory Safety Protocol:</strong> {currentRedFlags[0]?.recommendedAction}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Wizard Progress Steps */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
        <div className="flex items-center justify-between max-w-4xl mx-auto">
          {[
            { num: 1, title: 'Demographics & GIS', icon: User },
            { num: 2, title: 'Adaptive Symptoms', icon: Activity },
            { num: 3, title: 'Vital Signs', icon: Heart },
            { num: 4, title: 'Clinical History', icon: Stethoscope },
            { num: 5, title: 'Laboratory Data', icon: FlaskConical },
          ].map((s) => {
            const IconComp = s.icon;
            const isCurrent = step === s.num;
            const isCompleted = step > s.num;

            return (
              <button
                key={s.num}
                id={`wizard-step-btn-${s.num}`}
                onClick={() => setStep(s.num)}
                className="flex items-center gap-2 cursor-pointer group focus:outline-none"
              >
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs transition-all ${
                    isCurrent
                      ? 'bg-cyan-600 text-white ring-4 ring-cyan-100 shadow-md'
                      : isCompleted
                      ? 'bg-emerald-100 text-emerald-700 border border-emerald-300'
                      : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                  }`}
                >
                  {isCompleted ? <CheckCircle2 className="w-4 h-4" /> : <IconComp className="w-4 h-4" />}
                </div>
                <div className="hidden md:block text-left">
                  <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                    Step 0{s.num}
                  </div>
                  <div
                    className={`text-xs font-semibold ${
                      isCurrent ? 'text-cyan-700' : 'text-slate-700'
                    }`}
                  >
                    {s.title}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Wizard Step Body */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
        {/* STEP 1: Demographics & GIS Location */}
        {step === 1 && (
          <div className="space-y-6">
            <div className="border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">
                Step 1: Patient Demographics & Geographic Location
              </h3>
              <p className="text-xs text-slate-500">
                Capture clinical demographics, contact identity, and Pakistan administrative location.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Full Name
                </label>
                <input
                  id="input-fullname"
                  type="text"
                  value={demographics.fullName}
                  onChange={(e) =>
                    setDemographics({ ...demographics, fullName: e.target.value })
                  }
                  placeholder="e.g. Muhammad Tariq"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Age (Years)
                </label>
                <input
                  id="input-age"
                  type="number"
                  min="1"
                  max="115"
                  value={demographics.age}
                  onChange={(e) =>
                    setDemographics({ ...demographics, age: Number(e.target.value) })
                  }
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Biological Sex
                </label>
                <select
                  id="select-sex"
                  value={demographics.sex}
                  onChange={(e) =>
                    setDemographics({
                      ...demographics,
                      sex: e.target.value as 'MALE' | 'FEMALE' | 'OTHER',
                    })
                  }
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:outline-none"
                >
                  <option value="MALE">Male</option>
                  <option value="FEMALE">Female</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Province / Administrative Region
                </label>
                <select
                  id="select-province"
                  value={demographics.province}
                  onChange={(e) =>
                    setDemographics({ ...demographics, province: e.target.value })
                  }
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:outline-none"
                >
                  <option value="Punjab">Punjab</option>
                  <option value="Sindh">Sindh</option>
                  <option value="Khyber Pakhtunkhwa">Khyber Pakhtunkhwa (KPK)</option>
                  <option value="Balochistan">Balochistan</option>
                  <option value="Islamabad Capital Territory">Islamabad (ICT)</option>
                  <option value="Gilgit-Baltistan">Gilgit-Baltistan</option>
                  <option value="Azad Jammu and Kashmir">Azad Jammu & Kashmir (AJK)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  District
                </label>
                <select
                  id="select-district"
                  value={demographics.district}
                  onChange={(e) =>
                    setDemographics({ ...demographics, district: e.target.value })
                  }
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:outline-none"
                >
                  {PAKISTAN_DISTRICTS_DATA.map((d) => (
                    <option key={d.id} value={d.districtName}>
                      {d.districtName} ({d.province})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Tehsil / Union Council
                </label>
                <input
                  id="input-tehsil"
                  type="text"
                  value={demographics.tehsil}
                  onChange={(e) =>
                    setDemographics({ ...demographics, tehsil: e.target.value })
                  }
                  placeholder="e.g. Model Town / UC-14"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Patient Contact Phone
                </label>
                <input
                  id="input-phone"
                  type="text"
                  value={demographics.phone}
                  onChange={(e) =>
                    setDemographics({ ...demographics, phone: e.target.value })
                  }
                  placeholder="+92 300 1234567"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Emergency Contact & Kin
                </label>
                <input
                  id="input-kin"
                  type="text"
                  value={demographics.emergencyContact}
                  onChange={(e) =>
                    setDemographics({
                      ...demographics,
                      emergencyContact: e.target.value,
                    })
                  }
                  placeholder="e.g. Son: +92 321 9876543"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center pt-6">
                <label className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer">
                  <input
                    id="checkbox-consent"
                    type="checkbox"
                    checked={demographics.consentGiven}
                    onChange={(e) =>
                      setDemographics({
                        ...demographics,
                        consentGiven: e.target.checked,
                      })
                    }
                    className="w-4 h-4 text-cyan-600 rounded focus:ring-cyan-500"
                  />
                  <span>Patient Informed Consent for AI Clinical Triage Granted</span>
                </label>
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: Adaptive Symptom Explorer */}
        {step === 2 && (
          <div className="space-y-6">
            <div className="border-b border-slate-100 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Step 2: Adaptive Symptom Questionnaire & Red-Flag Checklist
                </h3>
                <p className="text-xs text-slate-500">
                  Select active chief complaints. The clinical safety rules engine continuously scans for life-threatening constellations.
                </p>
              </div>

              {/* Category Filter Chips */}
              <div className="flex flex-wrap gap-1.5">
                {[
                  { key: 'ALL', label: 'All Symptoms' },
                  { key: 'CARDIOVASCULAR', label: '❤️ Cardiac' },
                  { key: 'NEUROLOGICAL', label: '🧠 Neuro / Stroke' },
                  { key: 'RESPIRATORY', label: '🫁 Respiratory' },
                  { key: 'METABOLIC', label: '🧪 Diabetes/Metabolic' },
                ].map((cat) => (
                  <button
                    key={cat.key}
                    id={`symptom-cat-${cat.key}`}
                    onClick={() => setSelectedSymptomCategory(cat.key)}
                    className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                      selectedSymptomCategory === cat.key
                        ? 'bg-slate-900 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Symptom Selection Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {filteredSymptomDefs.map((def) => {
                const activeOccurrence = symptoms.find(
                  (s) => s.code === def.code && s.present
                );
                const isSelected = Boolean(activeOccurrence);

                return (
                  <div
                    key={def.code}
                    className={`p-3.5 rounded-xl border transition-all ${
                      isSelected
                        ? def.isRedFlagCandidate
                          ? 'bg-red-50/80 border-red-400 ring-2 ring-red-200'
                          : 'bg-cyan-50/80 border-cyan-400 ring-2 ring-cyan-100'
                        : 'bg-slate-50/50 border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-[10px] font-bold text-slate-400">
                            {def.code}
                          </span>
                          {def.isRedFlagCandidate && (
                            <span className="bg-red-100 text-red-700 text-[10px] font-bold px-1.5 py-0.2 rounded border border-red-200">
                              Red Flag Candidate
                            </span>
                          )}
                        </div>
                        <h4 className="text-xs font-bold text-slate-900 leading-snug">
                          {def.name}
                        </h4>
                        <p className="text-[11px] text-slate-500 line-clamp-2">
                          {def.description}
                        </p>
                      </div>

                      <button
                        id={`toggle-symptom-${def.code}`}
                        onClick={() => toggleSymptom(def)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-bold shrink-0 transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-red-600 text-white hover:bg-red-700 shadow-sm'
                            : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-100'
                        }`}
                      >
                        {isSelected ? 'Reported ✓' : '+ Add'}
                      </button>
                    </div>

                    {/* Expandable attributes if symptom is present */}
                    {isSelected && (
                      <div className="mt-3 pt-2.5 border-t border-slate-200/80 space-y-2 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-semibold text-slate-600">
                            Severity ({activeOccurrence?.severity || 3}/5):
                          </span>
                          <input
                            id={`severity-${def.code}`}
                            type="range"
                            min="1"
                            max="5"
                            value={activeOccurrence?.severity || 3}
                            onChange={(e) =>
                              updateSymptomField(def.code, 'severity', Number(e.target.value))
                            }
                            className="w-24 accent-cyan-600"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <span className="text-[10px] text-slate-500 block">Onset:</span>
                            <select
                              id={`onset-${def.code}`}
                              value={activeOccurrence?.onset || 'GRADUAL'}
                              onChange={(e) =>
                                updateSymptomField(def.code, 'onset', e.target.value)
                              }
                              className="w-full text-[11px] p-1 border border-slate-300 rounded bg-white"
                            >
                              <option value="SUDDEN">⚡ Sudden</option>
                              <option value="GRADUAL">Gradual</option>
                            </select>
                          </div>

                          <div>
                            <span className="text-[10px] text-slate-500 block">Duration:</span>
                            <select
                              id={`duration-${def.code}`}
                              value={activeOccurrence?.duration || 'DAYS'}
                              onChange={(e) =>
                                updateSymptomField(def.code, 'duration', e.target.value)
                              }
                              className="w-full text-[11px] p-1 border border-slate-300 rounded bg-white"
                            >
                              <option value="MINUTES">Minutes</option>
                              <option value="HOURS">Hours</option>
                              <option value="DAYS">Days</option>
                              <option value="WEEKS">Weeks</option>
                              <option value="MONTHS">Months</option>
                            </select>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* STEP 3: Vital Signs & Quality Flags */}
        {step === 3 && (
          <div className="space-y-6">
            <div className="border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">
                Step 3: Vital Signs & Measurement Quality Indicators
              </h3>
              <p className="text-xs text-slate-500">
                Accurate objective physiological metrics are critical for calibrated risk estimation.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Blood Pressure */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold text-slate-800">
                    Systolic Blood Pressure (SBP)
                  </label>
                  <span className="text-[11px] font-mono text-cyan-700 font-bold">mmHg</span>
                </div>
                <input
                  id="input-sbp"
                  type="number"
                  value={vitals.systolicBp || ''}
                  onChange={(e) =>
                    setVitals({ ...vitals, systolicBp: Number(e.target.value) })
                  }
                  placeholder="120"
                  className="w-full px-3 py-2 text-base font-mono font-bold border border-slate-300 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:outline-none"
                />
                <span className="text-[10px] text-slate-500 mt-1 block">
                  Normal: &lt;120 | Stage 1 HTN: 140-159 | Crisis: ≥180
                </span>
              </div>

              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold text-slate-800">
                    Diastolic Blood Pressure (DBP)
                  </label>
                  <span className="text-[11px] font-mono text-cyan-700 font-bold">mmHg</span>
                </div>
                <input
                  id="input-dbp"
                  type="number"
                  value={vitals.diastolicBp || ''}
                  onChange={(e) =>
                    setVitals({ ...vitals, diastolicBp: Number(e.target.value) })
                  }
                  placeholder="80"
                  className="w-full px-3 py-2 text-base font-mono font-bold border border-slate-300 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:outline-none"
                />
                <span className="text-[10px] text-slate-500 mt-1 block">
                  Normal: &lt;80 | Stage 1 HTN: 90-99 | Crisis: ≥120
                </span>
              </div>

              {/* Heart Rate */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold text-slate-800">Heart Rate (Pulse)</label>
                  <span className="text-[11px] font-mono text-cyan-700 font-bold">bpm</span>
                </div>
                <input
                  id="input-hr"
                  type="number"
                  value={vitals.heartRate || ''}
                  onChange={(e) =>
                    setVitals({ ...vitals, heartRate: Number(e.target.value) })
                  }
                  placeholder="75"
                  className="w-full px-3 py-2 text-base font-mono font-bold border border-slate-300 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:outline-none"
                />
                <span className="text-[10px] text-slate-500 mt-1 block">Normal: 60-100 bpm</span>
              </div>

              {/* SpO2 */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold text-slate-800">Oxygen Saturation (SpO₂)</label>
                  <span className="text-[11px] font-mono text-cyan-700 font-bold">%</span>
                </div>
                <input
                  id="input-spo2"
                  type="number"
                  min="50"
                  max="100"
                  value={vitals.oxygenSaturation || ''}
                  onChange={(e) =>
                    setVitals({ ...vitals, oxygenSaturation: Number(e.target.value) })
                  }
                  placeholder="98"
                  className="w-full px-3 py-2 text-base font-mono font-bold border border-slate-300 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:outline-none"
                />
                <span className="text-[10px] text-slate-500 mt-1 block">
                  Normal: ≥95% | Hypoxia Red Flag: &lt;90%
                </span>
              </div>

              {/* Blood Glucose */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold text-slate-800">Blood Glucose (Point of Care)</label>
                  <span className="text-[11px] font-mono text-cyan-700 font-bold">mg/dL</span>
                </div>
                <input
                  id="input-glucose"
                  type="number"
                  value={vitals.bloodGlucoseMgDl || ''}
                  onChange={(e) =>
                    setVitals({ ...vitals, bloodGlucoseMgDl: Number(e.target.value) })
                  }
                  placeholder="110"
                  className="w-full px-3 py-2 text-base font-mono font-bold border border-slate-300 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:outline-none"
                />
                <div className="flex items-center gap-3 mt-1 text-[11px]">
                  <label className="flex items-center gap-1 text-slate-600">
                    <input
                      type="radio"
                      name="glucoseType"
                      checked={vitals.glucoseMeasurementType === 'FASTING'}
                      onChange={() =>
                        setVitals({ ...vitals, glucoseMeasurementType: 'FASTING' })
                      }
                    />
                    Fasting
                  </label>
                  <label className="flex items-center gap-1 text-slate-600">
                    <input
                      type="radio"
                      name="glucoseType"
                      checked={vitals.glucoseMeasurementType === 'RANDOM'}
                      onChange={() =>
                        setVitals({ ...vitals, glucoseMeasurementType: 'RANDOM' })
                      }
                    />
                    Random
                  </label>
                </div>
              </div>

              {/* Quality Flags & Device Source */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200">
                <label className="text-xs font-bold text-slate-800 block mb-1">
                  Measurement Source & Data Quality
                </label>
                <select
                  id="select-measurement-source"
                  value={vitals.measurementSource}
                  onChange={(e) =>
                    setVitals({
                      ...vitals,
                      measurementSource: e.target.value as any,
                    })
                  }
                  className="w-full p-2 text-xs border border-slate-300 rounded-lg bg-white mb-2"
                >
                  <option value="CLINIC_DEVICE">Clinic Calibrated Sphygmomanometer</option>
                  <option value="HOSPITAL_DEVICE">Hospital Automated Monitor</option>
                  <option value="HOME_DEVICE">Home Digital Device (Omron/Citizen)</option>
                  <option value="PATIENT_REPORTED">Patient Reported (Unverified)</option>
                </select>

                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-slate-500">Quality Flag:</span>
                  <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded">
                    VALIDATED DATA
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* STEP 4: Clinical Profile, Lifestyle & History */}
        {step === 4 && (
          <div className="space-y-6">
            <div className="border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">
                Step 4: Clinical History, Risk Factors & Lifestyle
              </h3>
              <p className="text-xs text-slate-500">
                Document anthropometrics (BMI), tobacco exposure (naswar/cigarettes), and established cardiovascular/metabolic history.
              </p>
            </div>

            {/* Anthropometrics */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Height (cm)
                </label>
                <input
                  id="input-height"
                  type="number"
                  value={profile.heightCm}
                  onChange={(e) => updateHeightWeight(Number(e.target.value), profile.weightKg)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Weight (kg)
                </label>
                <input
                  id="input-weight"
                  type="number"
                  value={profile.weightKg}
                  onChange={(e) => updateHeightWeight(profile.heightCm, Number(e.target.value))}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Calculated BMI (kg/m²)
                </label>
                <div className="flex items-center gap-2">
                  <span className="text-lg font-bold font-mono text-cyan-800">
                    {profile.bmi.toFixed(1)}
                  </span>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                      profile.bmi >= 27.5
                        ? 'bg-red-100 text-red-800'
                        : profile.bmi >= 23
                        ? 'bg-amber-100 text-amber-800'
                        : 'bg-emerald-100 text-emerald-800'
                    }`}
                  >
                    {profile.bmi >= 27.5
                      ? 'Obesity (South Asian Cut-off)'
                      : profile.bmi >= 23
                      ? 'Overweight'
                      : 'Normal'}
                  </span>
                </div>
              </div>
            </div>

            {/* Lifestyle & Habits */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Smoking Status
                </label>
                <select
                  id="select-smoking"
                  value={profile.smokingStatus}
                  onChange={(e) =>
                    setProfile({
                      ...profile,
                      smokingStatus: e.target.value as any,
                    })
                  }
                  className="w-full p-2 text-xs border border-slate-300 rounded-xl bg-white"
                >
                  <option value="NEVER">Non-Smoker (Never)</option>
                  <option value="CURRENT_SMOKER">Current Active Smoker</option>
                  <option value="FORMER_SMOKER">Former Smoker (Quit)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Tobacco / Smokeless (Naswar / Shisha)
                </label>
                <select
                  id="select-tobacco"
                  value={profile.tobaccoUse}
                  onChange={(e) =>
                    setProfile({ ...profile, tobaccoUse: e.target.value as any })
                  }
                  className="w-full p-2 text-xs border border-slate-300 rounded-xl bg-white"
                >
                  <option value="NONE">None</option>
                  <option value="CHEWING_TOBACCO_NASWAR">Chewing Tobacco / Naswar (High Risk)</option>
                  <option value="CIGARETTE">Manufactured Cigarettes</option>
                  <option value="HOOKAH_SHISHA">Hookah / Shisha</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Physical Activity Level
                </label>
                <select
                  id="select-activity"
                  value={profile.physicalActivity}
                  onChange={(e) =>
                    setProfile({
                      ...profile,
                      physicalActivity: e.target.value as any,
                    })
                  }
                  className="w-full p-2 text-xs border border-slate-300 rounded-xl bg-white"
                >
                  <option value="SEDENTARY">Sedentary (&lt;30 min/week)</option>
                  <option value="MODERATE">Moderate (60-150 min/week)</option>
                  <option value="ACTIVE">Active (&gt;150 min/week)</option>
                </select>
              </div>
            </div>

            {/* Medical History Checkboxes */}
            <div className="space-y-3">
              <label className="block text-xs font-bold text-slate-800">
                Documented Past Medical & Family History
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 text-xs">
                {[
                  { key: 'hypertensionHistory', label: 'Known Hypertension' },
                  { key: 'diabetesHistory', label: 'Known Type 2 Diabetes' },
                  { key: 'previousCVD', label: 'Prior Myocardial Infarction / CAD' },
                  { key: 'previousStroke', label: 'Prior TIA / Stroke' },
                  { key: 'kidneyDisease', label: 'Chronic Kidney Disease (CKD)' },
                  { key: 'asthmaCOPD', label: 'Asthma / COPD' },
                  { key: 'familyHistoryCVD', label: 'Family History Premature CVD' },
                  { key: 'familyHistoryDiabetes', label: 'Family History Type 2 Diabetes' },
                ].map((item) => (
                  <label
                    key={item.key}
                    className="flex items-center gap-2 p-2.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 cursor-pointer"
                  >
                    <input
                      id={`checkbox-${item.key}`}
                      type="checkbox"
                      checked={Boolean((profile as any)[item.key])}
                      onChange={(e) =>
                        setProfile({ ...profile, [item.key]: e.target.checked })
                      }
                      className="w-4 h-4 text-cyan-600 rounded"
                    />
                    <span className="text-slate-800 font-medium">{item.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Current Medications & Drug Allergies */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Current Medications (comma separated)
                </label>
                <input
                  id="input-current-meds"
                  type="text"
                  value={profile.currentMedications.join(', ')}
                  onChange={(e) =>
                    setProfile({
                      ...profile,
                      currentMedications: e.target.value.split(',').map((s) => s.trim()).filter(Boolean),
                    })
                  }
                  placeholder="e.g. Amlodipine 5mg, Metformin 500mg"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Documented Drug Allergies (comma separated)
                </label>
                <input
                  id="input-drug-allergies"
                  type="text"
                  value={profile.drugAllergies.join(', ')}
                  onChange={(e) =>
                    setProfile({
                      ...profile,
                      drugAllergies: e.target.value.split(',').map((s) => s.trim()).filter(Boolean),
                    })
                  }
                  placeholder="e.g. Penicillin, Sulfa drugs"
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-xl focus:ring-2 focus:ring-cyan-500 focus:outline-none"
                />
              </div>
            </div>
          </div>
        )}

        {/* STEP 5: Laboratory Results */}
        {step === 5 && (
          <div className="space-y-6">
            <div className="border-b border-slate-100 pb-3">
              <h3 className="text-base font-bold text-slate-900">
                Step 5: Diagnostic Laboratory Results
              </h3>
              <p className="text-xs text-slate-500">
                Enter serum lipid profile, glycated hemoglobin (HbA1c), and renal markers if available. Missing fields will trigger calibrated synthetic population models with completeness warnings.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                <label className="text-xs font-bold text-slate-800 block mb-1">
                  HbA1c (%)
                </label>
                <input
                  id="input-hba1c"
                  type="number"
                  step="0.1"
                  value={labs.hba1cPercent || ''}
                  onChange={(e) =>
                    setLabs({ ...labs, hba1cPercent: Number(e.target.value) })
                  }
                  placeholder="7.5"
                  className="w-full px-3 py-1.5 text-sm font-mono font-bold border border-slate-300 rounded-lg bg-white"
                />
                <span className="text-[10px] text-slate-500 mt-1 block">Normal: &lt;5.7% | DM: ≥6.5%</span>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                <label className="text-xs font-bold text-slate-800 block mb-1">
                  Total Cholesterol (mg/dL)
                </label>
                <input
                  id="input-tc"
                  type="number"
                  value={labs.totalCholesterolMgDl || ''}
                  onChange={(e) =>
                    setLabs({ ...labs, totalCholesterolMgDl: Number(e.target.value) })
                  }
                  placeholder="200"
                  className="w-full px-3 py-1.5 text-sm font-mono font-bold border border-slate-300 rounded-lg bg-white"
                />
                <span className="text-[10px] text-slate-500 mt-1 block">Desirable: &lt;200 mg/dL</span>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                <label className="text-xs font-bold text-slate-800 block mb-1">
                  LDL Cholesterol (mg/dL)
                </label>
                <input
                  id="input-ldl"
                  type="number"
                  value={labs.ldlCholesterolMgDl || ''}
                  onChange={(e) =>
                    setLabs({ ...labs, ldlCholesterolMgDl: Number(e.target.value) })
                  }
                  placeholder="130"
                  className="w-full px-3 py-1.5 text-sm font-mono font-bold border border-slate-300 rounded-lg bg-white"
                />
                <span className="text-[10px] text-slate-500 mt-1 block">Optimal: &lt;100 mg/dL</span>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                <label className="text-xs font-bold text-slate-800 block mb-1">
                  HDL Cholesterol (mg/dL)
                </label>
                <input
                  id="input-hdl"
                  type="number"
                  value={labs.hdlCholesterolMgDl || ''}
                  onChange={(e) =>
                    setLabs({ ...labs, hdlCholesterolMgDl: Number(e.target.value) })
                  }
                  placeholder="45"
                  className="w-full px-3 py-1.5 text-sm font-mono font-bold border border-slate-300 rounded-lg bg-white"
                />
                <span className="text-[10px] text-slate-500 mt-1 block">Protective: &gt;40 mg/dL</span>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                <label className="text-xs font-bold text-slate-800 block mb-1">
                  Triglycerides (mg/dL)
                </label>
                <input
                  id="input-tg"
                  type="number"
                  value={labs.triglyceridesMgDl || ''}
                  onChange={(e) =>
                    setLabs({ ...labs, triglyceridesMgDl: Number(e.target.value) })
                  }
                  placeholder="150"
                  className="w-full px-3 py-1.5 text-sm font-mono font-bold border border-slate-300 rounded-lg bg-white"
                />
                <span className="text-[10px] text-slate-500 mt-1 block">Normal: &lt;150 mg/dL</span>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                <label className="text-xs font-bold text-slate-800 block mb-1">
                  Serum Creatinine (mg/dL)
                </label>
                <input
                  id="input-creatinine"
                  type="number"
                  step="0.1"
                  value={labs.creatinineMgDl || ''}
                  onChange={(e) =>
                    setLabs({ ...labs, creatinineMgDl: Number(e.target.value) })
                  }
                  placeholder="1.0"
                  className="w-full px-3 py-1.5 text-sm font-mono font-bold border border-slate-300 rounded-lg bg-white"
                />
                <span className="text-[10px] text-slate-500 mt-1 block">Normal: 0.7 - 1.3 mg/dL</span>
              </div>

              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200">
                <label className="text-xs font-bold text-slate-800 block mb-1">
                  Estimated GFR (mL/min/1.73m²)
                </label>
                <input
                  id="input-egfr"
                  type="number"
                  value={labs.egfr || ''}
                  onChange={(e) =>
                    setLabs({ ...labs, egfr: Number(e.target.value) })
                  }
                  placeholder="90"
                  className="w-full px-3 py-1.5 text-sm font-mono font-bold border border-slate-300 rounded-lg bg-white"
                />
                <span className="text-[10px] text-slate-500 mt-1 block">Normal: &gt;90 | CKD: &lt;60</span>
              </div>
            </div>

            {/* Informational Guidance */}
            <div className="bg-cyan-50 border border-cyan-200 rounded-xl p-3.5 flex items-start gap-2.5 text-xs text-cyan-950">
              <Info className="w-4 h-4 text-cyan-700 shrink-0 mt-0.5" />
              <div>
                <strong>Missing Data Robustness:</strong> The AI-HealthAssist engine supports incomplete laboratory records. Unmeasured biomarkers are flagged in the final clinician dossier with calibrated uncertainty boundaries.
              </div>
            </div>
          </div>
        )}

        {/* Wizard Footer Navigation */}
        <div className="mt-8 pt-4 border-t border-slate-100 flex items-center justify-between">
          <button
            id="wizard-prev-btn"
            disabled={step === 1}
            onClick={() => setStep((s) => Math.max(1, s - 1))}
            className="px-4 py-2 rounded-xl text-xs font-bold border border-slate-300 text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5 cursor-pointer"
          >
            <ChevronLeft className="w-4 h-4" />
            Previous
          </button>

          <div className="flex items-center gap-2">
            {step < 5 ? (
              <button
                id="wizard-next-btn"
                onClick={() => setStep((s) => Math.min(5, s + 1))}
                className="px-5 py-2.5 rounded-xl text-xs font-bold bg-slate-900 text-white hover:bg-slate-800 flex items-center gap-1.5 shadow-sm cursor-pointer"
              >
                Next Step
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                id="wizard-submit-btn"
                disabled={isSubmitting}
                onClick={handleSubmitAssessment}
                className="px-6 py-2.5 rounded-xl text-xs font-bold bg-gradient-to-r from-cyan-600 to-teal-600 text-white hover:from-cyan-700 hover:to-teal-700 flex items-center gap-2 shadow-md shadow-cyan-600/30 cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                    Executing Clinical Intelligence Core...
                  </>
                ) : (
                  <>
                    <Activity className="w-4 h-4" />
                    Run AI Risk Stratification & Red-Flag Triage
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
