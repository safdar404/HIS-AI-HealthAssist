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
  Users,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Filter,
  Activity,
  BarChart3,
  ShieldAlert,
} from 'lucide-react';
import { PatientAssessmentRecord } from '../types/clinical';

export interface PatientAgeHistogramProps {
  assessments: PatientAssessmentRecord[];
  filteredAssessments: PatientAssessmentRecord[];
  onSelectAgeRange?: (rangeLabel: string, minAge: number, maxAge: number) => void;
  selectedAgeRange?: string | null;
}

interface AgeBinData {
  range: string;
  minAge: number;
  maxAge: number;
  total: number;
  male: number;
  female: number;
  redFlagCount: number;
  uncontrolledHtnCount: number;
  avgSbp: number;
}

const AGE_BINS = [
  { range: '< 20', minAge: 0, maxAge: 19 },
  { range: '20–29', minAge: 20, maxAge: 29 },
  { range: '30–39', minAge: 30, maxAge: 39 },
  { range: '40–49', minAge: 40, maxAge: 49 },
  { range: '50–59', minAge: 50, maxAge: 59 },
  { range: '60–69', minAge: 60, maxAge: 69 },
  { range: '70–79', minAge: 70, maxAge: 79 },
  { range: '80+', minAge: 80, maxAge: 120 },
];

export const PatientAgeHistogram: React.FC<PatientAgeHistogramProps> = ({
  assessments,
  filteredAssessments,
  onSelectAgeRange,
  selectedAgeRange,
}) => {
  const [isExpanded, setIsExpanded] = useState<boolean>(true);
  const [dataSource, setDataSource] = useState<'ALL' | 'FILTERED'>('ALL');
  const [colorMode, setColorMode] = useState<'GENDER' | 'RED_FLAGS' | 'TOTAL'>('TOTAL');

  const activeRecords = dataSource === 'ALL' ? assessments : filteredAssessments;

  // Compute demographic statistics
  const stats = useMemo(() => {
    if (activeRecords.length === 0) {
      return {
        total: 0,
        meanAge: 0,
        medianAge: 0,
        minAge: 0,
        maxAge: 0,
        geriatricPct: 0,
        pediatricPct: 0,
        redFlagTotal: 0,
      };
    }

    const ages = activeRecords.map((r) => r.demographics.age).sort((a, b) => a - b);
    const sum = ages.reduce((acc, v) => acc + v, 0);
    const mean = Math.round(sum / ages.length);
    const mid = Math.floor(ages.length / 2);
    const median = ages.length % 2 !== 0 ? ages[mid] : Math.round((ages[mid - 1] + ages[mid]) / 2);

    const geriatricCount = ages.filter((a) => a >= 65).length;
    const pediatricCount = ages.filter((a) => a < 30).length;

    const redFlags = activeRecords.filter((r) => {
      const rf = r.assessmentResult?.redFlags || [];
      const sbp = r.vitals.systolicBp || 0;
      const dbp = r.vitals.diastolicBp || 0;
      const spo2 = r.vitals.oxygenSaturation || 0;
      return (
        rf.length > 0 ||
        r.assessmentResult?.isEmergency ||
        r.assessmentResult?.triage.level === 'LEVEL_1_EMERGENCY' ||
        sbp >= 180 ||
        dbp >= 120 ||
        (spo2 > 0 && spo2 < 90) ||
        r.labs.troponinPositive
      );
    }).length;

    return {
      total: activeRecords.length,
      meanAge: mean,
      medianAge: median,
      minAge: ages[0],
      maxAge: ages[ages.length - 1],
      geriatricPct: Math.round((geriatricCount / ages.length) * 100),
      pediatricPct: Math.round((pediatricCount / ages.length) * 100),
      redFlagTotal: redFlags,
    };
  }, [activeRecords]);

  // Compute histogram bins
  const binData: AgeBinData[] = useMemo(() => {
    return AGE_BINS.map((bin) => {
      const recordsInBin = activeRecords.filter(
        (r) => r.demographics.age >= bin.minAge && r.demographics.age <= bin.maxAge
      );

      const male = recordsInBin.filter((r) => r.demographics.sex === 'MALE').length;
      const female = recordsInBin.filter((r) => r.demographics.sex === 'FEMALE').length;

      const redFlagCount = recordsInBin.filter((r) => {
        const rf = r.assessmentResult?.redFlags || [];
        const sbp = r.vitals.systolicBp || 0;
        const dbp = r.vitals.diastolicBp || 0;
        const spo2 = r.vitals.oxygenSaturation || 0;
        return (
          rf.length > 0 ||
          r.assessmentResult?.isEmergency ||
          r.assessmentResult?.triage.level === 'LEVEL_1_EMERGENCY' ||
          sbp >= 180 ||
          dbp >= 120 ||
          (spo2 > 0 && spo2 < 90) ||
          r.labs.troponinPositive
        );
      }).length;

      const uncontrolledHtnCount = recordsInBin.filter((r) => {
        const sbp = r.vitals.systolicBp || 0;
        const dbp = r.vitals.diastolicBp || 0;
        return sbp >= 140 || dbp >= 90;
      }).length;

      const sbpSum = recordsInBin.reduce((acc, r) => acc + (r.vitals.systolicBp || 120), 0);
      const avgSbp = recordsInBin.length > 0 ? Math.round(sbpSum / recordsInBin.length) : 0;

      return {
        range: bin.range,
        minAge: bin.minAge,
        maxAge: bin.maxAge,
        total: recordsInBin.length,
        male,
        female,
        redFlagCount,
        uncontrolledHtnCount,
        avgSbp,
      };
    });
  }, [activeRecords]);

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden transition-all">
      {/* Header & Controls */}
      <div className="p-4 bg-gradient-to-r from-slate-50 via-cyan-50/20 to-slate-50 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-cyan-700 text-white flex items-center justify-center font-bold shadow-xs">
            <BarChart3 className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                Patient Population Age Distribution Histogram
              </h3>
              <span className="text-[10px] bg-cyan-100 text-cyan-800 font-bold px-2 py-0.5 rounded font-mono">
                {stats.total} Patients
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Demographic stratification, cohort age brackets, and geriatric/red-flag vulnerability index.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Cohort switch */}
          <div className="flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200 text-[11px] font-bold">
            <button
              type="button"
              onClick={() => setDataSource('ALL')}
              className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                dataSource === 'ALL'
                  ? 'bg-white text-cyan-800 shadow-xs'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              All Registry ({assessments.length})
            </button>
            <button
              type="button"
              onClick={() => setDataSource('FILTERED')}
              className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                dataSource === 'FILTERED'
                  ? 'bg-white text-cyan-800 shadow-xs'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              Filtered ({filteredAssessments.length})
            </button>
          </div>

          {/* Color Dimension Selector */}
          <div className="flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200 text-[11px] font-bold">
            <button
              type="button"
              onClick={() => setColorMode('TOTAL')}
              className={`px-2 py-1 rounded-lg transition-all cursor-pointer ${
                colorMode === 'TOTAL'
                  ? 'bg-cyan-700 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Overview
            </button>
            <button
              type="button"
              onClick={() => setColorMode('GENDER')}
              className={`px-2 py-1 rounded-lg transition-all cursor-pointer ${
                colorMode === 'GENDER'
                  ? 'bg-cyan-700 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Sex Split
            </button>
            <button
              type="button"
              onClick={() => setColorMode('RED_FLAGS')}
              className={`px-2 py-1 rounded-lg transition-all cursor-pointer ${
                colorMode === 'RED_FLAGS'
                  ? 'bg-rose-700 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Red Flags
            </button>
          </div>

          {/* Expand / Collapse Button */}
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 border border-slate-200 cursor-pointer transition-colors"
            title={isExpanded ? 'Collapse Age Histogram' : 'Expand Age Histogram'}
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="p-4 space-y-4">
          {/* Demographic Metrics Ribbon */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2">
            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Mean Age</span>
              <div className="text-lg font-black font-mono text-slate-800 mt-0.5">
                {stats.meanAge} <span className="text-xs font-normal text-slate-500">yrs</span>
              </div>
            </div>

            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Median Age</span>
              <div className="text-lg font-black font-mono text-cyan-800 mt-0.5">
                {stats.medianAge} <span className="text-xs font-normal text-slate-500">yrs</span>
              </div>
            </div>

            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Age Range</span>
              <div className="text-lg font-black font-mono text-slate-800 mt-0.5">
                {stats.minAge}–{stats.maxAge} <span className="text-xs font-normal text-slate-500">yrs</span>
              </div>
            </div>

            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Geriatric (≥65)</span>
              <div className="text-lg font-black font-mono text-amber-700 mt-0.5">
                {stats.geriatricPct}%
              </div>
            </div>

            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Under 30</span>
              <div className="text-lg font-black font-mono text-teal-700 mt-0.5">
                {stats.pediatricPct}%
              </div>
            </div>

            <div className="p-2.5 rounded-xl bg-rose-50/70 border border-rose-200">
              <span className="text-[10px] uppercase font-bold text-rose-600 block flex items-center gap-1">
                <ShieldAlert className="w-3 h-3" /> Red-Flag Cohort
              </span>
              <div className="text-lg font-black font-mono text-rose-800 mt-0.5">
                {stats.redFlagTotal}{' '}
                <span className="text-xs font-normal text-rose-600">
                  ({stats.total > 0 ? Math.round((stats.redFlagTotal / stats.total) * 100) : 0}%)
                </span>
              </div>
            </div>
          </div>

          {/* Recharts Histogram Chart */}
          <div className="h-64 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={binData}
                margin={{ top: 12, right: 16, left: -10, bottom: 20 }}
                onClick={(e) => {
                  if (e && e.activePayload && e.activePayload[0] && onSelectAgeRange) {
                    const data = e.activePayload[0].payload as AgeBinData;
                    onSelectAgeRange(data.range, data.minAge, data.maxAge);
                  }
                }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis
                  dataKey="range"
                  tick={{ fontSize: 11, fill: '#475569', fontWeight: 600 }}
                  label={{
                    value: 'Age Group (Years)',
                    position: 'insideBottom',
                    offset: -12,
                    fontSize: 11,
                    fill: '#64748B',
                    fontWeight: 700,
                  }}
                  stroke="#CBD5E1"
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fontSize: 11, fill: '#64748B' }}
                  stroke="#CBD5E1"
                  label={{
                    value: 'Patient Count',
                    angle: -90,
                    position: 'insideLeft',
                    fontSize: 11,
                    fill: '#64748B',
                    fontWeight: 700,
                    offset: 15,
                  }}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length > 0) {
                      const d = payload[0].payload as AgeBinData;
                      const pctOfTotal =
                        stats.total > 0 ? ((d.total / stats.total) * 100).toFixed(1) : '0';
                      return (
                        <div className="bg-slate-900 text-white text-xs p-3 rounded-xl shadow-xl border border-slate-700 min-w-[200px] z-50">
                          <div className="font-bold text-cyan-300 pb-1.5 border-b border-slate-700 flex items-center justify-between">
                            <span>Age Bracket: {d.range} yrs</span>
                            <span className="bg-cyan-900/80 text-cyan-200 px-1.5 py-0.5 rounded text-[10px] font-mono">
                              {d.total} patients ({pctOfTotal}%)
                            </span>
                          </div>
                          <div className="space-y-1 mt-2 text-[11px]">
                            <div className="flex justify-between text-slate-300">
                              <span>Male / Female:</span>
                              <span className="font-mono text-white">
                                {d.male} M / {d.female} F
                              </span>
                            </div>
                            <div className="flex justify-between text-slate-300">
                              <span>Avg Systolic BP:</span>
                              <span className="font-mono text-amber-300">
                                {d.avgSbp > 0 ? `${d.avgSbp} mmHg` : 'N/A'}
                              </span>
                            </div>
                            <div className="flex justify-between text-slate-300">
                              <span>Stage 2 HTN:</span>
                              <span className="font-mono text-orange-400">
                                {d.uncontrolledHtnCount} patients
                              </span>
                            </div>
                            <div className="flex justify-between text-rose-300 font-semibold pt-1 border-t border-slate-800">
                              <span>🚩 Flagged Red-Flags:</span>
                              <span className="font-mono text-rose-400">{d.redFlagCount}</span>
                            </div>
                          </div>
                          <div className="mt-2 text-[9px] text-cyan-400 italic">
                            💡 Click bar to filter registry to this age group
                          </div>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                {colorMode === 'GENDER' && (
                  <Legend
                    wrapperStyle={{ fontSize: '11px', paddingTop: '4px' }}
                    iconType="circle"
                  />
                )}

                {colorMode === 'TOTAL' && (
                  <Bar
                    dataKey="total"
                    name="Patient Count"
                    radius={[6, 6, 0, 0]}
                    cursor="pointer"
                  >
                    {binData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={
                          selectedAgeRange === entry.range
                            ? '#0E7490' // cyan-700
                            : entry.redFlagCount > 0
                            ? '#0284C7' // sky-600
                            : '#0891B2' // cyan-600
                        }
                        stroke={selectedAgeRange === entry.range ? '#164E63' : undefined}
                        strokeWidth={selectedAgeRange === entry.range ? 2 : 0}
                      />
                    ))}
                  </Bar>
                )}

                {colorMode === 'GENDER' && (
                  <>
                    <Bar
                      dataKey="male"
                      name="Male"
                      stackId="gender"
                      fill="#0284C7"
                      radius={[0, 0, 0, 0]}
                      cursor="pointer"
                    />
                    <Bar
                      dataKey="female"
                      name="Female"
                      stackId="gender"
                      fill="#EC4899"
                      radius={[6, 6, 0, 0]}
                      cursor="pointer"
                    />
                  </>
                )}

                {colorMode === 'RED_FLAGS' && (
                  <>
                    <Bar
                      dataKey="total"
                      name="Total Cohort"
                      fill="#CBD5E1"
                      radius={[6, 6, 0, 0]}
                      cursor="pointer"
                    />
                    <Bar
                      dataKey="redFlagCount"
                      name="Red-Flag Patients"
                      fill="#E11D48"
                      radius={[6, 6, 0, 0]}
                      cursor="pointer"
                    />
                  </>
                )}
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Interactive filter helper */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 text-xs">
            <div className="text-slate-500 text-[11px] flex items-center gap-1.5">
              <Filter className="w-3.5 h-3.5 text-cyan-600" />
              <span>
                {selectedAgeRange ? (
                  <>
                    Active Age Filter:{' '}
                    <strong className="text-cyan-800 font-mono">{selectedAgeRange} yrs</strong>
                  </>
                ) : (
                  'Click any bar or age bin above to filter table rows to that age demographic.'
                )}
              </span>
            </div>
            {selectedAgeRange && onSelectAgeRange && (
              <button
                type="button"
                onClick={() => onSelectAgeRange('ALL', 0, 150)}
                className="text-[11px] text-cyan-700 hover:text-cyan-900 font-bold underline cursor-pointer"
              >
                Clear Age Filter
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
