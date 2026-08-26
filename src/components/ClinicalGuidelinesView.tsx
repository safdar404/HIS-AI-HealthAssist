import React from 'react';
import {
  BookOpen,
  ShieldCheck,
  Heart,
  FileText,
  Activity,
  CheckCircle2,
  AlertTriangle,
  Scale,
} from 'lucide-react';

export const ClinicalGuidelinesView: React.FC = () => {
  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-slate-900 rounded-2xl p-6 text-white border border-slate-800 shadow-xl space-y-2">
        <div className="flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-cyan-400" />
          <h2 className="text-lg font-black tracking-tight text-white uppercase">
            Clinical Guidelines & Standards Knowledge Base
          </h2>
        </div>
        <p className="text-xs text-slate-400">
          Core evidence-based protocols governing the AI-HealthAssist risk assessment, red-flag emergency triage, and medication safety engines.
        </p>
      </div>

      {/* Grid of Key Guideline Frameworks */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* WHO HEARTS */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-3">
          <div className="flex items-center gap-2 text-cyan-700">
            <Heart className="w-5 h-5" />
            <h3 className="text-sm font-bold text-slate-900">
              WHO HEARTS Technical Package
            </h3>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            Cardiovascular risk charts for low- and middle-income settings without requiring mandatory laboratory total cholesterol at initial primary care intake.
          </p>
          <ul className="text-xs space-y-1.5 text-slate-700">
            <li className="flex items-start gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-cyan-600 shrink-0 mt-0.5" />
              <span><strong>&lt;10% Risk:</strong> Low Risk. Lifestyle counseling & annual re-screening.</span>
            </li>
            <li className="flex items-start gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
              <span><strong>10-19% Risk:</strong> Moderate Risk. Follow-up every 3-6 months.</span>
            </li>
            <li className="flex items-start gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-red-600 shrink-0 mt-0.5" />
              <span><strong>≥20% Risk:</strong> High Risk. Guideline-directed statin & antihypertensive therapy.</span>
            </li>
          </ul>
        </div>

        {/* 2026 Hypertension Compendium */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-3">
          <div className="flex items-center gap-2 text-cyan-700">
            <Activity className="w-5 h-5" />
            <h3 className="text-sm font-bold text-slate-900">
              2026 Hypertension Compendium
            </h3>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            Standardized diagnostic classification and protocolized pharmacological treatment steps.
          </p>
          <ul className="text-xs space-y-1.5 text-slate-700">
            <li className="flex items-start gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
              <span><strong>Normal BP:</strong> SBP &lt;120 mmHg AND DBP &lt;80 mmHg.</span>
            </li>
            <li className="flex items-start gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
              <span><strong>Stage 1 HTN:</strong> SBP 140-159 mmHg OR DBP 90-99 mmHg.</span>
            </li>
            <li className="flex items-start gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-red-600 shrink-0 mt-0.5" />
              <span><strong>Hypertensive Crisis:</strong> SBP ≥180 OR DBP ≥120 mmHg (Immediate Red Flag).</span>
            </li>
          </ul>
        </div>

        {/* South Asian Specific Thresholds */}
        <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-3">
          <div className="flex items-center gap-2 text-cyan-700">
            <Scale className="w-5 h-5" />
            <h3 className="text-sm font-bold text-slate-900">
              South Asian Population Adjustments
            </h3>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            Epidemiological evidence establishes that South Asian individuals develop CAD and diabetes at younger ages and lower BMI levels.
          </p>
          <ul className="text-xs space-y-1.5 text-slate-700">
            <li className="flex items-start gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-cyan-600 shrink-0 mt-0.5" />
              <span><strong>Overweight Cut-Off:</strong> BMI ≥ 23.0 kg/m² (vs Western 25.0).</span>
            </li>
            <li className="flex items-start gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-red-600 shrink-0 mt-0.5" />
              <span><strong>Obesity Cut-Off:</strong> BMI ≥ 27.5 kg/m² (vs Western 30.0).</span>
            </li>
            <li className="flex items-start gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
              <span><strong>Naswar & Smokeless Tobacco:</strong> +1.8x cardiovascular hazard multiplier.</span>
            </li>
          </ul>
        </div>
      </div>

      {/* SNOMED CT / LOINC / ICD-10 Mapping Table */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <FileText className="w-4 h-4 text-cyan-600" />
              Clinical Coding Interoperability (SNOMED CT, LOINC & ICD-10)
            </h3>
            <p className="text-xs text-slate-500">
              Standardized ontologies for electronic health record (EHR) integration.
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
              <tr>
                <th className="p-3">Clinical Concept</th>
                <th className="p-3">Category</th>
                <th className="p-3">SNOMED CT ID</th>
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
                <td className="p-3 font-sans font-semibold text-slate-900">Chest Pain / Angina</td>
                <td className="p-3 font-sans text-slate-600">Symptom</td>
                <td className="p-3 text-cyan-800">29857009</td>
                <td className="p-3 text-emerald-800">52554-3</td>
                <td className="p-3 text-slate-500">I20.9 / R07.9</td>
              </tr>
              <tr>
                <td className="p-3 font-sans font-semibold text-slate-900">Glycated Hemoglobin (HbA1c)</td>
                <td className="p-3 font-sans text-slate-600">Laboratory</td>
                <td className="p-3 text-cyan-800">43396009</td>
                <td className="p-3 text-emerald-800">4548-4</td>
                <td className="p-3 text-slate-500">E11.9</td>
              </tr>
              <tr>
                <td className="p-3 font-sans font-semibold text-slate-900">Acute Facial Droop (Stroke)</td>
                <td className="p-3 font-sans text-slate-600">Red Flag Sign</td>
                <td className="p-3 text-cyan-800">398246009</td>
                <td className="p-3 text-emerald-800">72172-0</td>
                <td className="p-3 text-slate-500">I63.9 / R29.810</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Regulatory & Safety Disclaimer Card */}
      <div className="bg-slate-950 text-white rounded-2xl p-6 border border-slate-800 shadow-lg space-y-3">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-emerald-400" />
          <h3 className="text-sm font-bold text-white uppercase tracking-wider">
            Clinical Decision Support Regulatory Compliance (FDA CDS 2026 & WHO AI Ethics)
          </h3>
        </div>
        <p className="text-xs text-slate-300 leading-relaxed">
          AI-HealthAssist functions strictly as a Clinical Decision Support System (CDSS) designed to assist licensed medical officers and primary healthcare workers in identifying high-risk cardiovascular, metabolic, and emergency conditions. The system does NOT provide autonomous diagnostic conclusions or prescription authorization. All final clinical diagnoses, therapeutic prescriptions, and emergency dispatch decisions remain the sole responsibility of the registered physician.
        </p>
      </div>
    </div>
  );
};
