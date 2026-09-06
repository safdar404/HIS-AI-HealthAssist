import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
  Legend,
} from 'recharts';
import {
  Pill,
  TrendingUp,
  ShieldCheck,
  AlertCircle,
  Activity,
  Layers,
  Filter,
  CheckCircle2,
  Sparkles,
  Info,
} from 'lucide-react';
import { PatientAssessmentRecord } from '../types/clinical';
import { TimelineMedicationItem } from './MedicationHistoryTimeline';

export interface MedicationCategoryBarChartProps {
  currentRecord: PatientAssessmentRecord;
  prescribedDrugs?: Array<{
    drugName: string;
    dosage: string;
    frequency?: string;
    duration?: string;
  }>;
  onSelectCategory?: (category: string) => void;
}

interface CategoryStats {
  category: string;
  count: number;
  activeCount: number;
  medications: Array<{
    name: string;
    dosage?: string;
    status: 'ACTIVE' | 'PAST' | 'NEW_SESSION';
    frequency?: string;
  }>;
  color: string;
  guidelineTarget: string;
  clinicalPurpose: string;
}

// Deterministic drug classifier by category
export function classifyMedicationCategory(drugName: string): {
  category: string;
  color: string;
  guidelineTarget: string;
  clinicalPurpose: string;
} {
  const lower = drugName.toLowerCase();

  if (
    lower.includes('amlodipine') ||
    lower.includes('lisinopril') ||
    lower.includes('losartan') ||
    lower.includes('valsartan') ||
    lower.includes('ramipril') ||
    lower.includes('enalapril') ||
    lower.includes('candesartan') ||
    lower.includes('hydrochlorothiazide') ||
    lower.includes('hctz') ||
    lower.includes('indapamide') ||
    lower.includes('atenolol') ||
    lower.includes('bisoprolol') ||
    lower.includes('metoprolol') ||
    lower.includes('carvedilol') ||
    lower.includes('spironolactone') ||
    lower.includes('nifedipine') ||
    lower.includes('diltiazem')
  ) {
    return {
      category: 'Antihypertensives',
      color: '#6366F1', // Indigo
      guidelineTarget: 'BP < 130/80 mmHg',
      clinicalPurpose: 'Blood Pressure & End-Organ Protection',
    };
  }

  if (
    lower.includes('metformin') ||
    lower.includes('glucophage') ||
    lower.includes('empagliflozin') ||
    lower.includes('jardiance') ||
    lower.includes('dapagliflozin') ||
    lower.includes('sitagliptin') ||
    lower.includes('januvia') ||
    lower.includes('vildagliptin') ||
    lower.includes('glimepiride') ||
    lower.includes('gliclazide') ||
    lower.includes('insulin') ||
    lower.includes('lantus') ||
    lower.includes('novorapid') ||
    lower.includes('pioglitazone') ||
    lower.includes('semaglutide') ||
    lower.includes('ozempic')
  ) {
    return {
      category: 'Antidiabetics',
      color: '#F59E0B', // Amber
      guidelineTarget: 'HbA1c < 7.0%',
      clinicalPurpose: 'Glycemic Control & Cardiorenal Protection',
    };
  }

  if (
    lower.includes('atorvastatin') ||
    lower.includes('lipitor') ||
    lower.includes('rosuvastatin') ||
    lower.includes('crestor') ||
    lower.includes('simvastatin') ||
    lower.includes('ezetimibe') ||
    lower.includes('fenofibrate')
  ) {
    return {
      category: 'Lipid-Lowering / Statins',
      color: '#10B981', // Emerald
      guidelineTarget: 'LDL-C < 70 mg/dL',
      clinicalPurpose: 'Atherosclerotic Plaque Stabilization',
    };
  }

  if (
    lower.includes('aspirin') ||
    lower.includes('disprin') ||
    lower.includes('clopidogrel') ||
    lower.includes('plavix') ||
    lower.includes('warfarin') ||
    lower.includes('rivaroxaban') ||
    lower.includes('xarelto') ||
    lower.includes('apixaban') ||
    lower.includes('eliquis') ||
    lower.includes('heparin')
  ) {
    return {
      category: 'Antiplatelet / Anticoagulant',
      color: '#F43F5E', // Rose
      guidelineTarget: 'Secondary CVD Prevention',
      clinicalPurpose: 'Thrombosis & Embolic Stroke Prevention',
    };
  }

  if (
    lower.includes('salbutamol') ||
    lower.includes('ventolin') ||
    lower.includes('ipratropium') ||
    lower.includes('budesonide') ||
    lower.includes('symbicort') ||
    lower.includes('formoterol') ||
    lower.includes('tiotropium') ||
    lower.includes('spiriva') ||
    lower.includes('montelukast')
  ) {
    return {
      category: 'Respiratory / Bronchodilators',
      color: '#06B6D4', // Cyan
      guidelineTarget: 'SpO2 > 94% / FEV1 Stability',
      clinicalPurpose: 'Airway Patency & Asthma/COPD Control',
    };
  }

  if (
    lower.includes('paracetamol') ||
    lower.includes('panadol') ||
    lower.includes('acetaminophen') ||
    lower.includes('ibuprofen') ||
    lower.includes('brufen') ||
    lower.includes('tramadol') ||
    lower.includes('diclofenac') ||
    lower.includes('celecoxib') ||
    lower.includes('naproxen')
  ) {
    return {
      category: 'Analgesics / NSAIDs',
      color: '#8B5CF6', // Violet
      guidelineTarget: 'Pain VAS < 3/10',
      clinicalPurpose: 'Symptom Relief & Anti-inflammatory',
    };
  }

  if (
    lower.includes('omeprazole') ||
    lower.includes('risek') ||
    lower.includes('pantoprazole') ||
    lower.includes('esomeprazole') ||
    lower.includes('nexium') ||
    lower.includes('famotidine') ||
    lower.includes('antacid')
  ) {
    return {
      category: 'Gastroprotectants / PPIs',
      color: '#64748B', // Slate Blue
      guidelineTarget: 'Mucosal Healing',
      clinicalPurpose: 'Gastric Ulcer & Bleed Prophylaxis',
    };
  }

  if (
    lower.includes('amoxicillin') ||
    lower.includes('augmentin') ||
    lower.includes('azithromycin') ||
    lower.includes('ciprofloxacin') ||
    lower.includes('ceftriaxone') ||
    lower.includes('doxycycline') ||
    lower.includes('clarithromycin')
  ) {
    return {
      category: 'Antimicrobial / Antibiotics',
      color: '#EC4899', // Pink
      guidelineTarget: 'Infection Resolution',
      clinicalPurpose: 'Bacterial Pathogen Eradication',
    };
  }

  return {
    category: 'Other Supportive Therapies',
    color: '#3B82F6', // Blue
    guidelineTarget: 'Supportive Management',
    clinicalPurpose: 'Metabolic & Micronutrient Support',
  };
}

export const MedicationCategoryBarChart: React.FC<MedicationCategoryBarChartProps> = ({
  currentRecord,
  prescribedDrugs = [],
  onSelectCategory,
}) => {
  const [activeFilter, setActiveFilter] = useState<'ALL' | 'ACTIVE_ONLY'>('ALL');
  const [selectedBarCategory, setSelectedBarCategory] = useState<string | null>(null);

  const patientId = currentRecord?.demographics?.patientId || '';

  // Extract past timeline medications from localStorage if present
  const timelineMeds: TimelineMedicationItem[] = useMemo(() => {
    if (!patientId) return [];
    try {
      const raw = localStorage.getItem(`cds_medication_timeline_${patientId}`);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {
      // Graceful fallback
    }
    return [];
  }, [patientId]);

  // Aggregate all medications across current profile, timeline history, and active session prescriptions
  const categoryStatsList: CategoryStats[] = useMemo(() => {
    const map = new Map<string, CategoryStats>();

    const registerMed = (
      name: string,
      dosage: string = '',
      status: 'ACTIVE' | 'PAST' | 'NEW_SESSION',
      frequency?: string
    ) => {
      if (!name || typeof name !== 'string') return;
      const cleanName = name.trim();
      if (!cleanName) return;

      const classification = classifyMedicationCategory(cleanName);
      const catKey = classification.category;

      if (!map.has(catKey)) {
        map.set(catKey, {
          category: catKey,
          count: 0,
          activeCount: 0,
          medications: [],
          color: classification.color,
          guidelineTarget: classification.guidelineTarget,
          clinicalPurpose: classification.clinicalPurpose,
        });
      }

      const entry = map.get(catKey)!;
      // Prevent duplicate medication entries in same category
      const existingMed = entry.medications.find(
        (m) => m.name.toLowerCase() === cleanName.toLowerCase()
      );

      if (!existingMed) {
        entry.medications.push({
          name: cleanName,
          dosage,
          status,
          frequency,
        });
        entry.count += 1;
        if (status === 'ACTIVE' || status === 'NEW_SESSION') {
          entry.activeCount += 1;
        }
      } else if (status === 'NEW_SESSION' && existingMed.status !== 'NEW_SESSION') {
        // Upgrade status if prescribed in this session
        existingMed.status = 'NEW_SESSION';
      }
    };

    // 1. Patient profile current medications
    const currentMeds = currentRecord?.profile?.currentMedications || [];
    currentMeds.forEach((m) => registerMed(m, 'Maintenance Dose', 'ACTIVE', 'Daily'));

    // 2. Doctor prescribed medications in current record
    const recordRx = currentRecord?.doctorReview?.prescribedMedications || [];
    recordRx.forEach((rx) =>
      registerMed(rx.drugName, rx.dosage, 'ACTIVE', rx.frequency)
    );

    // 3. New candidate/draft drugs added in active portal session
    prescribedDrugs.forEach((rx) =>
      registerMed(rx.drugName, rx.dosage, 'NEW_SESSION', rx.frequency)
    );

    // 4. Timeline items
    timelineMeds.forEach((t) => {
      const isAct = t.status === 'ACTIVE_CURRENT';
      registerMed(t.drugName, t.dosage, isAct ? 'ACTIVE' : 'PAST', t.frequency);
    });

    // Convert map to sorted array by count descending
    return Array.from(map.values()).sort((a, b) => {
      const countA = activeFilter === 'ACTIVE_ONLY' ? a.activeCount : a.count;
      const countB = activeFilter === 'ACTIVE_ONLY' ? b.activeCount : b.count;
      return countB - countA;
    });
  }, [currentRecord, prescribedDrugs, timelineMeds, activeFilter]);

  // Total medications count
  const totalPrescriptionsCount = useMemo(() => {
    return categoryStatsList.reduce((sum, item) => {
      return sum + (activeFilter === 'ACTIVE_ONLY' ? item.activeCount : item.count);
    }, 0);
  }, [categoryStatsList, activeFilter]);

  // Primary therapeutic category
  const topCategory = categoryStatsList[0];

  // Polypharmacy assessment
  const polypharmacyStatus = useMemo(() => {
    if (totalPrescriptionsCount >= 7) {
      return {
        level: 'Severe Polypharmacy',
        color: 'text-rose-400',
        badgeBg: 'bg-rose-950/80 border-rose-700 text-rose-300',
        note: '≥ 7 active pharmacological agents. Requires strict DDI & renal dose titration audits.',
      };
    }
    if (totalPrescriptionsCount >= 4) {
      return {
        level: 'Moderate Polypharmacy',
        color: 'text-amber-400',
        badgeBg: 'bg-amber-950/80 border-amber-700 text-amber-300',
        note: '4-6 agents. Common in comorbid hypertension & type 2 diabetes.',
      };
    }
    return {
      level: 'Standard Regimen',
      color: 'text-emerald-400',
      badgeBg: 'bg-emerald-950/80 border-emerald-700 text-emerald-300',
      note: 'Targeted single or dual-class maintenance therapy.',
    };
  }, [totalPrescriptionsCount]);

  // Chart data formatted for Recharts
  const chartData = useMemo(() => {
    return categoryStatsList.map((stat) => ({
      name: stat.category,
      count: activeFilter === 'ACTIVE_ONLY' ? stat.activeCount : stat.count,
      color: stat.color,
      allMedsCount: stat.count,
      activeCount: stat.activeCount,
      guidelineTarget: stat.guidelineTarget,
      medList: stat.medications.map((m) => m.name).join(', '),
    }));
  }, [categoryStatsList, activeFilter]);

  // Active selected category details for drilldown
  const activeDetail = useMemo(() => {
    if (!selectedBarCategory) return categoryStatsList[0] || null;
    return (
      categoryStatsList.find((c) => c.category === selectedBarCategory) ||
      categoryStatsList[0] ||
      null
    );
  }, [selectedBarCategory, categoryStatsList]);

  const handleBarClick = (data: any) => {
    if (data && data.name) {
      setSelectedBarCategory(data.name);
      if (onSelectCategory) {
        onSelectCategory(data.name);
      }
    }
  };

  return (
    <div
      id="patient-medication-category-dashboard"
      className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xl space-y-5"
    >
      {/* Top Header & Trend Barometer */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-sm sm:text-base font-bold text-white tracking-tight">
                Medication Frequency by Category
              </h4>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-indigo-950 text-indigo-300 border border-indigo-800">
                {categoryStatsList.length} Therapeutic Classes
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Pharmacological distribution & treatment trend analysis for{' '}
              <span className="text-slate-200 font-semibold">
                {currentRecord?.demographics?.fullName || 'Active Patient'}
              </span>
            </p>
          </div>
        </div>

        {/* Action Controls & Filter Toggle */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <div className="inline-flex rounded-xl bg-slate-950 p-1 border border-slate-800">
            <button
              type="button"
              id="filter-all-prescriptions"
              onClick={() => setActiveFilter('ALL')}
              className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                activeFilter === 'ALL'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              All Tracked ({totalPrescriptionsCount})
            </button>
            <button
              type="button"
              id="filter-active-prescriptions"
              onClick={() => setActiveFilter('ACTIVE_ONLY')}
              className={`px-3 py-1 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                activeFilter === 'ACTIVE_ONLY'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Active Daily Only
            </button>
          </div>
        </div>
      </div>

      {/* Clinical Highlights Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-3 space-y-1">
          <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
            Primary Therapeutic Focus
          </span>
          <div className="flex items-center gap-2">
            <span
              className="w-2.5 h-2.5 rounded-full"
              style={{ backgroundColor: topCategory?.color || '#6366F1' }}
            />
            <span className="text-xs font-bold text-white truncate">
              {topCategory?.category || 'No active medications'}
            </span>
          </div>
          <span className="text-[11px] text-slate-400 block font-mono">
            {topCategory ? `${topCategory.activeCount} active / ${topCategory.count} total agents` : 'N/A'}
          </span>
        </div>

        <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-3 space-y-1">
          <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
            Polypharmacy Index
          </span>
          <div className="flex items-center gap-2">
            <Activity className="w-3.5 h-3.5 text-cyan-400" />
            <span className={`text-xs font-bold ${polypharmacyStatus.color}`}>
              {polypharmacyStatus.level}
            </span>
          </div>
          <span className="text-[11px] text-slate-400 block truncate" title={polypharmacyStatus.note}>
            {polypharmacyStatus.note}
          </span>
        </div>

        <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-3 space-y-1">
          <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider block">
            Cumulative Prescription Count
          </span>
          <div className="flex items-center gap-2">
            <Pill className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-xs font-bold text-emerald-400 font-mono">
              {totalPrescriptionsCount} Distinct Drugs
            </span>
          </div>
          <span className="text-[11px] text-slate-400 block font-mono">
            Across {categoryStatsList.length} distinct pharmacological classes
          </span>
        </div>
      </div>

      {/* Main Bar Chart Container */}
      <div className="bg-slate-950 rounded-xl p-3 sm:p-4 border border-slate-800/90 space-y-2">
        <div className="flex items-center justify-between text-xs text-slate-400 pb-1">
          <span className="flex items-center gap-1.5 font-medium">
            <Layers className="w-3.5 h-3.5 text-indigo-400" />
            <span>Prescription Count per Class (Click any bar to inspect medications)</span>
          </span>
          {selectedBarCategory && (
            <button
              type="button"
              onClick={() => setSelectedBarCategory(null)}
              className="text-[11px] text-indigo-400 hover:text-indigo-300 underline cursor-pointer"
            >
              Reset Category Focus
            </button>
          )}
        </div>

        {chartData.length === 0 ? (
          <div className="h-56 flex flex-col items-center justify-center text-slate-500 text-xs space-y-2">
            <Pill className="w-8 h-8 text-slate-600" />
            <span>No medications currently documented for this patient profile.</span>
          </div>
        ) : (
          <div className="h-64 sm:h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                layout="vertical"
                margin={{ top: 10, right: 30, left: 10, bottom: 5 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="#334155"
                  horizontal={false}
                  opacity={0.5}
                />
                <XAxis
                  type="number"
                  allowDecimals={false}
                  stroke="#94A3B8"
                  fontSize={11}
                  tickLine={false}
                  axisLine={{ stroke: '#475569' }}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  stroke="#CBD5E1"
                  fontSize={11}
                  tickLine={false}
                  axisLine={{ stroke: '#475569' }}
                  width={150}
                  tick={(props) => {
                    const { x, y, payload } = props;
                    const isSelected = payload.value === selectedBarCategory;
                    return (
                      <g transform={`translate(${x},${y})`}>
                        <text
                          x={-8}
                          y={3}
                          textAnchor="end"
                          fill={isSelected ? '#38BDF8' : '#CBD5E1'}
                          fontWeight={isSelected ? 'bold' : 'normal'}
                          fontSize={11}
                          className="cursor-pointer"
                          onClick={() => setSelectedBarCategory(payload.value)}
                        >
                          {payload.value.length > 22
                            ? `${payload.value.substring(0, 20)}...`
                            : payload.value}
                        </text>
                      </g>
                    );
                  }}
                />
                <Tooltip
                  cursor={{ fill: 'rgba(51, 65, 85, 0.3)' }}
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-slate-900 border border-slate-700 p-3 rounded-xl shadow-2xl text-xs space-y-1.5 max-w-xs z-50">
                          <div className="flex items-center gap-2">
                            <span
                              className="w-2.5 h-2.5 rounded-full shrink-0"
                              style={{ backgroundColor: data.color }}
                            />
                            <h6 className="font-bold text-white text-xs leading-tight">
                              {data.name}
                            </h6>
                          </div>
                          <div className="text-[11px] text-slate-300 font-mono pt-0.5">
                            Active Agents: <strong className="text-cyan-400">{data.count}</strong>
                            {data.allMedsCount !== data.count && (
                              <span className="text-slate-400 ml-1">
                                ({data.allMedsCount} historical total)
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-slate-400 border-t border-slate-800 pt-1">
                            <span className="font-semibold text-slate-300">Medications: </span>
                            <span className="text-slate-300 font-mono">{data.medList}</span>
                          </div>
                          <div className="text-[10px] text-indigo-300 bg-indigo-950/60 px-2 py-0.5 rounded border border-indigo-800/60 mt-1">
                            Target: {data.guidelineTarget}
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Bar
                  dataKey="count"
                  radius={[0, 6, 6, 0]}
                  onClick={handleBarClick}
                  className="cursor-pointer"
                >
                  {chartData.map((entry, index) => {
                    const isSelected = entry.name === selectedBarCategory;
                    return (
                      <Cell
                        key={`cell-${index}`}
                        fill={entry.color}
                        opacity={selectedBarCategory ? (isSelected ? 1 : 0.35) : 0.9}
                        stroke={isSelected ? '#FFFFFF' : 'none'}
                        strokeWidth={isSelected ? 1.5 : 0}
                      />
                    );
                  })}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Drill-down Category Details Card */}
      {activeDetail && (
        <div
          id="category-drilldown-panel"
          className="bg-slate-950/90 rounded-xl p-4 border border-slate-800 space-y-3"
        >
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-2">
            <div className="flex items-center gap-2">
              <span
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: activeDetail.color }}
              />
              <h5 className="text-xs sm:text-sm font-bold text-white">
                {activeDetail.category}
              </h5>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                {activeDetail.medications.length} Prescribed Agents
              </span>
            </div>
            <div className="text-[11px] text-slate-400 font-mono">
              Therapeutic Target:{' '}
              <strong className="text-emerald-400">{activeDetail.guidelineTarget}</strong>
            </div>
          </div>

          <p className="text-xs text-slate-400 italic">
            Clinical Indication: {activeDetail.clinicalPurpose}
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 pt-1">
            {activeDetail.medications.map((med, idx) => (
              <div
                key={idx}
                className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 flex items-start justify-between gap-2"
              >
                <div className="space-y-0.5">
                  <div className="flex items-center gap-1.5">
                    <Pill className="w-3 h-3 text-cyan-400 shrink-0" />
                    <span className="text-xs font-bold text-white leading-tight">
                      {med.name}
                    </span>
                  </div>
                  {med.dosage && (
                    <span className="text-[10px] text-slate-400 font-mono block">
                      {med.dosage}
                    </span>
                  )}
                  {med.frequency && (
                    <span className="text-[10px] text-slate-500 font-mono block">
                      {med.frequency}
                    </span>
                  )}
                </div>

                <span
                  className={`text-[9px] font-mono px-1.5 py-0.5 rounded uppercase font-bold shrink-0 ${
                    med.status === 'NEW_SESSION'
                      ? 'bg-cyan-950 text-cyan-300 border border-cyan-800 animate-pulse'
                      : med.status === 'ACTIVE'
                      ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                      : 'bg-slate-800 text-slate-400 border border-slate-700'
                  }`}
                >
                  {med.status === 'NEW_SESSION' ? 'New Rx' : med.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
