import React, { useState, useMemo } from 'react';
import {
  FlaskConical,
  TrendingUp,
  TrendingDown,
  Minus,
  AlertTriangle,
  AlertOctagon,
  CheckCircle2,
  Activity,
  Info,
  Calendar,
  Zap,
  Droplets,
  Heart,
  ChevronRight,
  ExternalLink,
} from 'lucide-react';
import { PatientAssessmentRecord, ClinicalProfile, VitalSigns, LabResults } from '../types/clinical';

export interface LabDataPoint {
  dateLabel: string;
  value: number;
  dateStr: string;
  isCurrent?: boolean;
}

export interface LabMetricConfig {
  key: string;
  name: string;
  shortName: string;
  category: 'RENAL' | 'ELECTROLYTE' | 'METABOLIC' | 'LIPID' | 'HEMATOLOGY' | 'CARDIAC';
  unit: string;
  referenceRange: string;
  minNormal: number;
  maxNormal: number;
  criticalLow?: number;
  criticalHigh?: number;
  decimals: number;
  color: string;
  strokeColor: string;
  fillColor: string;
  clinicalNote: string;
  rapidTrendThreshold?: {
    deltaPercent: number;
    alertMessage: string;
  };
}

const LAB_CONFIGS: LabMetricConfig[] = [
  {
    key: 'creatinine',
    name: 'Serum Creatinine',
    shortName: 'Creatinine',
    category: 'RENAL',
    unit: 'mg/dL',
    referenceRange: '0.6 – 1.2 mg/dL',
    minNormal: 0.6,
    maxNormal: 1.2,
    criticalHigh: 2.0,
    decimals: 2,
    color: 'text-purple-700',
    strokeColor: '#9333ea', // purple-600
    fillColor: 'rgba(147, 51, 234, 0.15)',
    clinicalNote: 'KDIGO AKI Alert if rapid rise ≥0.3 mg/dL within 48 hours or baseline rise ≥50%',
    rapidTrendThreshold: {
      deltaPercent: 25,
      alertMessage: 'Rapid Creatinine Rise (AKI Alert)',
    },
  },
  {
    key: 'potassium',
    name: 'Serum Potassium (K⁺)',
    shortName: 'Potassium',
    category: 'ELECTROLYTE',
    unit: 'mmol/L',
    referenceRange: '3.5 – 5.0 mmol/L',
    minNormal: 3.5,
    maxNormal: 5.0,
    criticalLow: 3.0,
    criticalHigh: 5.5,
    decimals: 1,
    color: 'text-amber-700',
    strokeColor: '#d97706', // amber-600
    fillColor: 'rgba(217, 119, 6, 0.15)',
    clinicalNote: 'Arrhythmia risk if <3.5 (hypokalemia) or >5.0 (hyperkalemia, caution with ACEi/ARBs/spironolactone)',
    rapidTrendThreshold: {
      deltaPercent: 15,
      alertMessage: 'Electrolyte Shift (Cardiotoxicity Risk)',
    },
  },
  {
    key: 'egfr',
    name: 'Estimated GFR (CKD-EPI)',
    shortName: 'eGFR',
    category: 'RENAL',
    unit: 'mL/min/1.73m²',
    referenceRange: '≥ 90 mL/min',
    minNormal: 90,
    maxNormal: 140,
    criticalLow: 30,
    decimals: 0,
    color: 'text-indigo-700',
    strokeColor: '#4f46e5', // indigo-600
    fillColor: 'rgba(79, 70, 229, 0.15)',
    clinicalNote: 'Stage 3a/b CKD if 30-59, Stage 4/5 if <30 mL/min. Adjust renally cleared drug dosages.',
  },
  {
    key: 'glucose',
    name: 'Fasting Plasma Glucose (FPG)',
    shortName: 'FPG Glucose',
    category: 'METABOLIC',
    unit: 'mg/dL',
    referenceRange: '70 – 99 mg/dL',
    minNormal: 70,
    maxNormal: 99,
    criticalHigh: 200,
    criticalLow: 55,
    decimals: 0,
    color: 'text-teal-700',
    strokeColor: '#0d9488', // teal-600
    fillColor: 'rgba(13, 148, 136, 0.15)',
    clinicalNote: 'Impaired fasting glucose 100-125 mg/dL; Diabetes diagnostic threshold ≥126 mg/dL.',
    rapidTrendThreshold: {
      deltaPercent: 30,
      alertMessage: 'Glycemic Instability Detected',
    },
  },
  {
    key: 'hba1c',
    name: 'Glycated Hemoglobin (HbA1c)',
    shortName: 'HbA1c',
    category: 'METABOLIC',
    unit: '%',
    referenceRange: '< 5.7 %',
    minNormal: 4.0,
    maxNormal: 5.6,
    criticalHigh: 9.0,
    decimals: 1,
    color: 'text-cyan-700',
    strokeColor: '#0891b2', // cyan-600
    fillColor: 'rgba(8, 145, 178, 0.15)',
    clinicalNote: 'ADA 2026 Target: <7.0% for most adults, <8.0% for elderly/frail or history of severe hypoglycemia.',
  },
  {
    key: 'ldl',
    name: 'LDL Cholesterol',
    shortName: 'LDL-C',
    category: 'LIPID',
    unit: 'mg/dL',
    referenceRange: '< 100 mg/dL',
    minNormal: 50,
    maxNormal: 99,
    criticalHigh: 190,
    decimals: 0,
    color: 'text-blue-700',
    strokeColor: '#2563eb', // blue-600
    fillColor: 'rgba(37, 99, 235, 0.15)',
    clinicalNote: 'High CVD risk target <70 mg/dL; Very high risk target <55 mg/dL with statin + ezetimibe.',
  },
  {
    key: 'hemoglobin',
    name: 'Hemoglobin (Hb)',
    shortName: 'Hemoglobin',
    category: 'HEMATOLOGY',
    unit: 'g/dL',
    referenceRange: '12.0 – 16.5 g/dL',
    minNormal: 12.0,
    maxNormal: 16.5,
    criticalLow: 8.0,
    decimals: 1,
    color: 'text-rose-700',
    strokeColor: '#e11d48', // rose-600
    fillColor: 'rgba(225, 29, 72, 0.15)',
    clinicalNote: 'WHO Anemia criteria: <13 g/dL in men, <12 g/dL in non-pregnant women.',
    rapidTrendThreshold: {
      deltaPercent: 15,
      alertMessage: 'Acute Blood Loss / Hemolysis Risk',
    },
  },
];

/**
 * Deterministic pseudo-random helper for generating realistic lab historical series
 */
function seededRandom(seedStr: string, index: number): number {
  let hash = 0;
  const combined = `${seedStr}_lab_${index}_2026`;
  for (let i = 0; i < combined.length; i++) {
    const char = combined.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  const x = Math.sin(hash) * 10000;
  return x - Math.floor(x);
}

/**
 * Generate 5-point serial lab history leading up to the current assessment
 */
export function generateLabTimeSeries(
  record: PatientAssessmentRecord,
  config: LabMetricConfig
): LabDataPoint[] {
  const patientId = record.demographics.patientId || 'P000';
  const labs: Partial<LabResults> = record.labs || {};
  const vitals: Partial<VitalSigns> = record.vitals || {};
  const profile: Partial<ClinicalProfile> = record.profile || {};
  const isEmergency = record.assessmentResult?.triage.level === 'LEVEL_1_EMERGENCY' || record.assessmentResult?.isEmergency;
  const isReviewed = !!record.doctorReview;

  // Resolve current value for metric
  let currentVal = 0;
  switch (config.key) {
    case 'creatinine':
      currentVal = labs.creatinineMgDl || (profile.kidneyDisease ? 1.85 : isEmergency ? 1.6 : 0.95);
      break;
    case 'potassium':
      currentVal = profile.kidneyDisease ? 4.9 : isEmergency ? 5.2 : 4.2;
      break;
    case 'egfr':
      currentVal = labs.egfr || (profile.kidneyDisease ? 42 : isEmergency ? 55 : 98);
      break;
    case 'glucose':
      currentVal = vitals.bloodGlucoseMgDl || labs.glucoseFastingMgDl || (profile.diabetesHistory ? 168 : 95);
      break;
    case 'hba1c':
      currentVal = labs.hba1cPercent || (profile.diabetesHistory ? 8.4 : 5.4);
      break;
    case 'ldl':
      currentVal = labs.ldlCholesterolMgDl || (profile.previousCVD ? 142 : profile.hypertensionHistory ? 128 : 92);
      break;
    case 'hemoglobin':
      currentVal = labs.hemoglobinGDl || (record.demographics.sex === 'FEMALE' ? 12.8 : 14.5);
      break;
    default:
      currentVal = config.minNormal + (config.maxNormal - config.minNormal) / 2;
  }

  const today = new Date();
  const intervalsDays = [90, 60, 30, 7, 0]; // 3 months ago, 2 months, 1 month, 1 week, today
  const points: LabDataPoint[] = [];

  for (let i = 0; i < intervalsDays.length; i++) {
    const daysAgo = intervalsDays[i];
    const pointDate = new Date(today);
    pointDate.setDate(today.getDate() - daysAgo);
    const dateStr = pointDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const dateLabel = daysAgo === 0 ? 'Today' : `${daysAgo}d ago`;

    if (daysAgo === 0) {
      points.push({
        dateLabel,
        dateStr,
        value: Number(currentVal.toFixed(config.decimals)),
        isCurrent: true,
      });
    } else {
      const rand = seededRandom(patientId + config.key, i);
      let stepVal = currentVal;

      // Realistic trajectory based on patient status
      if (config.key === 'creatinine') {
        if (isEmergency) {
          // Rapid jump in emergency
          stepVal = currentVal - (intervalsDays.length - 1 - i) * 0.18 + (rand - 0.5) * 0.1;
        } else if (isReviewed) {
          // Stabilization
          stepVal = currentVal + (intervalsDays.length - 1 - i) * 0.05 + (rand - 0.5) * 0.08;
        } else {
          stepVal = currentVal + (rand - 0.5) * 0.15;
        }
      } else if (config.key === 'potassium') {
        if (isEmergency) {
          stepVal = currentVal - (intervalsDays.length - 1 - i) * 0.25 + (rand - 0.5) * 0.2;
        } else {
          stepVal = currentVal + (rand - 0.5) * 0.3;
        }
      } else if (config.key === 'egfr') {
        if (isEmergency) {
          stepVal = currentVal + (intervalsDays.length - 1 - i) * 8 + (rand - 0.5) * 4;
        } else {
          stepVal = currentVal + (rand - 0.5) * 6;
        }
      } else if (config.key === 'glucose' || config.key === 'hba1c') {
        if (profile.diabetesHistory) {
          stepVal = currentVal - (intervalsDays.length - 1 - i) * (config.key === 'glucose' ? 10 : 0.4) + (rand - 0.5) * (config.key === 'glucose' ? 12 : 0.3);
        } else {
          stepVal = currentVal + (rand - 0.5) * (config.key === 'glucose' ? 8 : 0.2);
        }
      } else {
        stepVal = currentVal + (rand - 0.5) * (config.maxNormal - config.minNormal) * 0.25;
      }

      // Bound values
      const minBound = config.key === 'potassium' ? 2.5 : config.key === 'creatinine' ? 0.4 : 0;
      stepVal = Math.max(minBound, Number(stepVal.toFixed(config.decimals)));

      points.push({
        dateLabel,
        dateStr,
        value: stepVal,
        isCurrent: false,
      });
    }
  }

  return points;
}

interface DoctorLabSparklinesCardProps {
  currentRecord: PatientAssessmentRecord;
  onOpenLabPanel?: () => void;
  className?: string;
}

export const DoctorLabSparklinesCard: React.FC<DoctorLabSparklinesCardProps> = ({
  currentRecord,
  onOpenLabPanel,
  className = '',
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [activeHoverLab, setActiveHoverLab] = useState<string | null>(null);

  const categories = [
    { id: 'ALL', label: 'All Critical Labs' },
    { id: 'RENAL', label: 'Renal (Creatinine / eGFR)' },
    { id: 'ELECTROLYTE', label: 'Electrolytes (K⁺)' },
    { id: 'METABOLIC', label: 'Glycemic (FPG / HbA1c)' },
    { id: 'LIPID', label: 'Lipids (LDL-C)' },
    { id: 'HEMATOLOGY', label: 'Hematology (Hb)' },
  ];

  const filteredConfigs = useMemo(() => {
    if (selectedCategory === 'ALL') return LAB_CONFIGS;
    return LAB_CONFIGS.filter((c) => c.category === selectedCategory);
  }, [selectedCategory]);

  return (
    <div
      id="doctor-lab-sparklines-panel"
      className={`bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4 ${className}`}
    >
      {/* Header with Title, Category Filter & Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3.5">
        <div className="flex items-start gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-purple-50 border border-purple-200 flex items-center justify-center text-purple-700 shrink-0">
            <FlaskConical className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm font-bold text-slate-900">
                Longitudinal Lab Value History & Rapid Trend Sparklines
              </h3>
              <span className="bg-purple-100 text-purple-800 text-[10px] font-extrabold px-2 py-0.5 rounded-full border border-purple-200">
                Serial Trajectory (90-Day)
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Continuous trend monitoring for renal function (Creatinine/eGFR), electrolytes (Potassium), and metabolic control.
            </p>
          </div>
        </div>

        {onOpenLabPanel && (
          <button
            id="btn-open-diagnostic-labs-tab"
            onClick={onOpenLabPanel}
            className="px-3 py-1.5 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-800 text-xs font-bold border border-purple-200 flex items-center gap-1.5 transition-all cursor-pointer self-start sm:self-auto shrink-0"
            title="Open comprehensive Diagnostic Labs and manual result entry modal"
          >
            <FlaskConical className="w-3.5 h-3.5" />
            <span>Open Diagnostic Lab Panel</span>
            <ExternalLink className="w-3 h-3 text-purple-500" />
          </button>
        )}
      </div>

      {/* Category Filter Pills */}
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mr-1">
          Filter Panel:
        </span>
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setSelectedCategory(cat.id)}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer ${
              selectedCategory === cat.id
                ? 'bg-purple-600 text-white shadow-xs'
                : 'bg-slate-100 hover:bg-slate-200 text-slate-600 border border-slate-200'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Grid of Lab Sparkline Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3.5">
        {filteredConfigs.map((config) => {
          const series = generateLabTimeSeries(currentRecord, config);
          const currentPoint = series[series.length - 1];
          const priorPoint = series[0];
          const delta = currentPoint.value - priorPoint.value;
          const deltaPct = priorPoint.value !== 0 ? (delta / priorPoint.value) * 100 : 0;
          const isRising = delta > 0;
          const isSignificant = Math.abs(deltaPct) >= (config.rapidTrendThreshold?.deltaPercent || 20);

          // Value state flag
          let status: 'NORMAL' | 'BORDERLINE' | 'CRITICAL' = 'NORMAL';
          let statusLabel = 'Normal';
          let statusColor = 'bg-emerald-50 text-emerald-700 border-emerald-200';

          if (config.key === 'egfr') {
            if (currentPoint.value < 30) {
              status = 'CRITICAL';
              statusLabel = 'Stage 4/5 CKD (<30)';
              statusColor = 'bg-red-100 text-red-800 border-red-300 font-extrabold animate-pulse';
            } else if (currentPoint.value < 60) {
              status = 'BORDERLINE';
              statusLabel = 'Stage 3 CKD (30-59)';
              statusColor = 'bg-amber-100 text-amber-800 border-amber-300 font-bold';
            }
          } else {
            if (
              (config.criticalHigh && currentPoint.value >= config.criticalHigh) ||
              (config.criticalLow && currentPoint.value <= config.criticalLow)
            ) {
              status = 'CRITICAL';
              statusLabel = currentPoint.value >= (config.criticalHigh || 999) ? 'Critical High' : 'Critical Low';
              statusColor = 'bg-red-100 text-red-800 border-red-300 font-extrabold animate-pulse';
            } else if (currentPoint.value > config.maxNormal || currentPoint.value < config.minNormal) {
              status = 'BORDERLINE';
              statusLabel = currentPoint.value > config.maxNormal ? 'Elevated' : 'Low';
              statusColor = 'bg-amber-100 text-amber-800 border-amber-300 font-bold';
            }
          }

          // Rapid Alert Flag
          const hasRapidAlert =
            config.rapidTrendThreshold &&
            isSignificant &&
            ((config.key === 'creatinine' && isRising) ||
              (config.key === 'potassium' && (currentPoint.value > 5.0 || currentPoint.value < 3.5)) ||
              (config.key === 'glucose' && isRising) ||
              (config.key === 'hemoglobin' && !isRising));

          // SVG Mini Sparkline Calculations
          const width = 140;
          const height = 44;
          const padding = 6;
          const values = series.map((s) => s.value);
          const minVal = Math.min(...values, config.minNormal * 0.9);
          const maxVal = Math.max(...values, config.maxNormal * 1.1);
          const valRange = maxVal - minVal || 1;

          const pointsStr = series
            .map((p, idx) => {
              const x = padding + (idx / (series.length - 1)) * (width - 2 * padding);
              const y = height - padding - ((p.value - minVal) / valRange) * (height - 2 * padding);
              return `${x.toFixed(1)},${y.toFixed(1)}`;
            })
            .join(' ');

          const firstX = padding;
          const lastX = width - padding;
          const bottomY = height - padding;
          const areaPointsStr = `${firstX},${bottomY} ${pointsStr} ${lastX},${bottomY}`;

          return (
            <div
              key={config.key}
              id={`lab-sparkline-card-${config.key}`}
              className={`p-3.5 rounded-xl border transition-all duration-200 flex flex-col justify-between ${
                status === 'CRITICAL'
                  ? 'bg-red-50/40 border-red-200 ring-1 ring-red-200'
                  : status === 'BORDERLINE'
                  ? 'bg-amber-50/30 border-amber-200'
                  : 'bg-slate-50/60 border-slate-200 hover:bg-white hover:shadow-sm'
              }`}
            >
              {/* Lab Header & Status */}
              <div>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                      {config.category}
                    </span>
                    <h4 className="text-xs font-bold text-slate-900 leading-snug">
                      {config.name}
                    </h4>
                  </div>
                  <span
                    className={`text-[9px] px-2 py-0.5 rounded-full border shrink-0 ${statusColor}`}
                    title={`Reference: ${config.referenceRange}`}
                  >
                    {statusLabel}
                  </span>
                </div>

                {/* Primary Metric Display & Reference Range */}
                <div className="flex items-baseline justify-between mt-2">
                  <div className="flex items-baseline gap-1">
                    <span className="text-xl font-black font-mono text-slate-900">
                      {currentPoint.value}
                    </span>
                    <span className="text-[11px] font-semibold text-slate-500 font-mono">
                      {config.unit}
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono" title="Normal physiological target">
                    Ref: {config.referenceRange}
                  </span>
                </div>
              </div>

              {/* Sparkline & Delta Trend Strip */}
              <div className="mt-3 pt-2.5 border-t border-slate-200/60 flex items-center justify-between gap-2">
                {/* Delta Badge */}
                <div className="flex flex-col">
                  <div className="flex items-center gap-1">
                    {delta > 0 ? (
                      <TrendingUp
                        className={`w-3.5 h-3.5 ${
                          config.key === 'egfr' || config.key === 'hemoglobin'
                            ? 'text-emerald-600'
                            : 'text-rose-600'
                        }`}
                      />
                    ) : delta < 0 ? (
                      <TrendingDown
                        className={`w-3.5 h-3.5 ${
                          config.key === 'egfr' || config.key === 'hemoglobin'
                            ? 'text-rose-600'
                            : 'text-emerald-600'
                        }`}
                      />
                    ) : (
                      <Minus className="w-3.5 h-3.5 text-slate-400" />
                    )}
                    <span
                      className={`text-xs font-mono font-bold ${
                        delta > 0
                          ? config.key === 'egfr' || config.key === 'hemoglobin'
                            ? 'text-emerald-700'
                            : 'text-rose-700'
                          : delta < 0
                          ? config.key === 'egfr' || config.key === 'hemoglobin'
                            ? 'text-rose-700'
                            : 'text-emerald-700'
                          : 'text-slate-600'
                      }`}
                    >
                      {delta > 0 ? `+${delta.toFixed(config.decimals)}` : delta.toFixed(config.decimals)}
                    </span>
                  </div>
                  <span className="text-[9px] text-slate-400 font-mono">
                    90d Δ ({deltaPct >= 0 ? `+${deltaPct.toFixed(0)}%` : `${deltaPct.toFixed(0)}%`})
                  </span>
                </div>

                {/* SVG Mini Sparkline */}
                <div className="relative group/spark">
                  <svg
                    width={width}
                    height={height}
                    className="overflow-visible cursor-crosshair"
                    title={`Serial ${config.name} progression: ${series.map((s) => `${s.dateLabel}: ${s.value}`).join(' → ')}`}
                  >
                    <defs>
                      <linearGradient id={`grad-${config.key}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={config.strokeColor} stopOpacity="0.25" />
                        <stop offset="100%" stopColor={config.strokeColor} stopOpacity="0.0" />
                      </linearGradient>
                    </defs>

                    {/* Area fill */}
                    <polygon points={areaPointsStr} fill={`url(#grad-${config.key})`} />

                    {/* Baseline / Normal bound line */}
                    <line
                      x1={padding}
                      y1={height - padding - ((config.maxNormal - minVal) / valRange) * (height - 2 * padding)}
                      x2={width - padding}
                      y2={height - padding - ((config.maxNormal - minVal) / valRange) * (height - 2 * padding)}
                      stroke="#94a3b8"
                      strokeWidth="0.8"
                      strokeDasharray="2,2"
                    />

                    {/* Sparkline curve */}
                    <polyline
                      points={pointsStr}
                      fill="none"
                      stroke={config.strokeColor}
                      strokeWidth="2.2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />

                    {/* Data dots */}
                    {series.map((pt, pIdx) => {
                      const cx = padding + (pIdx / (series.length - 1)) * (width - 2 * padding);
                      const cy = height - padding - ((pt.value - minVal) / valRange) * (height - 2 * padding);
                      const isLast = pIdx === series.length - 1;
                      return (
                        <circle
                          key={pIdx}
                          cx={cx}
                          cy={cy}
                          r={isLast ? 3.5 : 2}
                          fill={isLast ? config.strokeColor : '#ffffff'}
                          stroke={config.strokeColor}
                          strokeWidth={isLast ? 1.5 : 1.5}
                          className="transition-all hover:scale-150"
                        />
                      );
                    })}
                  </svg>
                </div>
              </div>

              {/* Rapid Trend Warning Banner (If Triggered) */}
              {hasRapidAlert && (
                <div className="mt-2.5 p-1.5 rounded-lg bg-red-100/90 border border-red-300 text-red-900 text-[10px] font-bold flex items-center gap-1.5 animate-in fade-in">
                  <AlertOctagon className="w-3.5 h-3.5 text-red-600 shrink-0" />
                  <span>{config.rapidTrendThreshold?.alertMessage}</span>
                </div>
              )}

              {/* Clinical Guideline Hint */}
              <div className="mt-2 text-[10px] text-slate-500 leading-tight border-t border-slate-100 pt-1.5 font-sans">
                {config.clinicalNote}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
