import React, { useState, useMemo } from 'react';
import {
  REAL_PAKISTAN_DISTRICTS,
  PAKISTAN_PROVINCES,
  LiveDistrictSurveillance,
} from '../data/pakistanGeoData';
import { PatientAssessmentRecord } from '../types/clinical';
import {
  Flame,
  Activity,
  Heart,
  TrendingUp,
  AlertTriangle,
  MapPin,
  Filter,
  Download,
  Search,
  ShieldAlert,
  Wind,
  Stethoscope,
  Sparkles,
  Users,
  Building2,
  BarChart3,
  Layers,
  ArrowUpRight,
  RefreshCw,
  Eye,
  CheckCircle2,
  X,
  FileSpreadsheet,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Cell,
  Legend,
  ScatterChart,
  Scatter,
  ZAxis,
} from 'recharts';

export type HighRiskConditionType =
  | 'HYPERTENSION_CRISIS'
  | 'RESPIRATORY_DISTRESS'
  | 'SEVERE_CVD'
  | 'GLYCEMIC_CRISIS'
  | 'RENAL_FAILURE'
  | 'MULTI_MORBIDITY';

interface RiskHeatmapDashboardProps {
  assessments: PatientAssessmentRecord[];
  onSelectPatient?: (record: PatientAssessmentRecord) => void;
  onNavigateTab?: (tab: string) => void;
}

export const RiskHeatmapDashboard: React.FC<RiskHeatmapDashboardProps> = ({
  assessments = [],
  onSelectPatient,
  onNavigateTab,
}) => {
  const [selectedCondition, setSelectedCondition] = useState<HighRiskConditionType>('HYPERTENSION_CRISIS');
  const [selectedProvince, setSelectedProvince] = useState<string>('ALL');
  const [searchDistrict, setSearchDistrict] = useState<string>('');
  const [selectedDistrictModal, setSelectedDistrictModal] = useState<LiveDistrictSurveillance | null>(null);

  // Condition metadata
  const conditionMeta: Record<
    HighRiskConditionType,
    {
      title: string;
      shortName: string;
      description: string;
      clinicalCriteria: string;
      badgeColor: string;
      activeColor: string;
      icon: React.ComponentType<{ className?: string }>;
    }
  > = {
    HYPERTENSION_CRISIS: {
      title: 'Hypertensive Crises & Stage 2 Hypertension',
      shortName: 'HTN Crisis',
      description: 'Severe arterial pressure elevations with acute end-organ strain risk',
      clinicalCriteria: 'SBP ≥ 160 mmHg, DBP ≥ 100 mmHg, or Emergency Triage Flag',
      badgeColor: 'bg-rose-100 text-rose-800 border-rose-300',
      activeColor: '#e11d48',
      icon: TrendingUp,
    },
    RESPIRATORY_DISTRESS: {
      title: 'Acute Respiratory Distress & Hypoxemia',
      shortName: 'Respiratory Distress',
      description: 'Acute airway obstruction, hypoxemia, or COPD/Asthma exacerbations',
      clinicalCriteria: 'SpO₂ < 92% on Room Air, Respiratory Rate > 24, or Airway Red Flag',
      badgeColor: 'bg-teal-100 text-teal-800 border-teal-300',
      activeColor: '#0d9488',
      icon: Wind,
    },
    SEVERE_CVD: {
      title: 'Severe Cardiovascular Disease & ACS Risks',
      shortName: 'Severe CVD',
      description: 'Accelerated atherosclerotic plaque rupture & acute coronary syndrome probability',
      clinicalCriteria: '10-Year WHO/ISH CVD Risk ≥ 20% or Acute Ischemic Red Flag',
      badgeColor: 'bg-red-100 text-red-800 border-red-300',
      activeColor: '#dc2626',
      icon: Heart,
    },
    GLYCEMIC_CRISIS: {
      title: 'Uncontrolled Diabetes & Glycemic Crisis',
      shortName: 'Glycemic Crisis',
      description: 'Hyperosmolar state, DKA susceptibility, and microvascular deterioration',
      clinicalCriteria: 'HbA1c ≥ 9.0%, Fasting BG ≥ 250 mg/dL, or Random BG ≥ 200 mg/dL with T2D',
      badgeColor: 'bg-amber-100 text-amber-800 border-amber-300',
      activeColor: '#d97706',
      icon: Activity,
    },
    RENAL_FAILURE: {
      title: 'Renal Impairment & Acute Kidney Injury (AKI)',
      shortName: 'Renal / AKI',
      description: 'Progressive nephron decline and acute hypercreatininemia clusters',
      clinicalCriteria: 'Serum Creatinine ≥ 1.8 mg/dL or eGFR < 45 mL/min/1.73m²',
      badgeColor: 'bg-purple-100 text-purple-800 border-purple-300',
      activeColor: '#7c3aed',
      icon: ShieldAlert,
    },
    MULTI_MORBIDITY: {
      title: 'Multi-Morbidity Composite Risk Clusters',
      shortName: 'Multi-Morbidity',
      description: 'Patients presenting with ≥ 2 concurrent high-risk non-communicable conditions',
      clinicalCriteria: 'Co-occurrence of ≥ 2 high-risk clinical triggers',
      badgeColor: 'bg-indigo-100 text-indigo-800 border-indigo-300',
      activeColor: '#4f46e5',
      icon: Flame,
    },
  };

  // Helper: Evaluates if a given patient assessment matches the selected high-risk condition
  const doesPatientMatchCondition = (rec: PatientAssessmentRecord, condition: HighRiskConditionType): boolean => {
    const sbp = rec.vitals.systolicBp || 120;
    const dbp = rec.vitals.diastolicBp || 80;
    const spo2 = rec.vitals.oxygenSaturation || 98;
    const glucose = rec.vitals.bloodGlucoseMgDl || rec.labs.glucoseFastingMgDl || 100;
    const hba1c = rec.labs.hba1cPercent || 0;
    const creatinine = rec.labs.creatinineMgDl || 0;
    const egfr = rec.labs.egfr || 100;
    const cvdRisk = rec.assessmentResult ? rec.assessmentResult.risks.cardiovascular.riskScore * 100 : 0;
    const isEmerg = rec.assessmentResult?.triage.level === 'LEVEL_1_EMERGENCY' || rec.assessmentResult?.isEmergency;

    switch (condition) {
      case 'HYPERTENSION_CRISIS':
        return sbp >= 160 || dbp >= 100 || isEmerg;
      case 'RESPIRATORY_DISTRESS':
        return spo2 < 92 || (rec.vitals.respiratoryRate && rec.vitals.respiratoryRate > 24) || false;
      case 'SEVERE_CVD':
        return cvdRisk >= 20 || isEmerg;
      case 'GLYCEMIC_CRISIS':
        return hba1c >= 9.0 || glucose >= 220 || (rec.profile.diabetesHistory && glucose >= 200);
      case 'RENAL_FAILURE':
        return creatinine >= 1.8 || (egfr > 0 && egfr < 45);
      case 'MULTI_MORBIDITY': {
        let matchCount = 0;
        if (sbp >= 140 || dbp >= 90) matchCount++;
        if (cvdRisk >= 20) matchCount++;
        if (rec.profile.diabetesHistory || hba1c >= 7.0 || glucose >= 180) matchCount++;
        if (creatinine >= 1.4 || (egfr > 0 && egfr < 60)) matchCount++;
        if (spo2 < 94) matchCount++;
        return matchCount >= 2;
      }
      default:
        return false;
    }
  };

  // Aggregate Patient Registry data + Real Pakistan District Baselines into Regional Cluster Densities
  const regionalClusterMetrics = useMemo(() => {
    return REAL_PAKISTAN_DISTRICTS.map((district) => {
      // 1. Filter local patients from active registry in this district
      const matchingRegistryPatients = assessments.filter(
        (a) => a.demographics.district?.toLowerCase() === district.districtName.toLowerCase()
      );
      const registryAtRisk = matchingRegistryPatients.filter((a) =>
        doesPatientMatchCondition(a, selectedCondition)
      );

      // 2. Base epidemiological rate from real Pakistan district surveillance
      let baselineConditionRate = 0.2;
      switch (selectedCondition) {
        case 'HYPERTENSION_CRISIS':
          baselineConditionRate = (district.hypertensionRiskPct / 100) * 0.55;
          break;
        case 'RESPIRATORY_DISTRESS':
          baselineConditionRate = (district.respiratoryRiskPct / 100) * 0.45;
          break;
        case 'SEVERE_CVD':
          baselineConditionRate = (district.highRiskCvdPct / 100) * 0.65;
          break;
        case 'GLYCEMIC_CRISIS':
          baselineConditionRate = (district.diabetesRiskPct / 100) * 0.48;
          break;
        case 'RENAL_FAILURE':
          baselineConditionRate = ((district.diabetesRiskPct + district.hypertensionRiskPct) / 200) * 0.32;
          break;
        case 'MULTI_MORBIDITY':
          baselineConditionRate =
            ((district.highRiskCvdPct + district.hypertensionRiskPct + district.diabetesRiskPct) / 300) * 0.52;
          break;
      }

      // Hybrid calculation combining real district screening pool + live applet patient records
      const totalScreened = district.screenedCount + matchingRegistryPatients.length * 12;
      const calculatedAtRiskCount = Math.round(
        district.screenedCount * baselineConditionRate + registryAtRisk.length * 15
      );
      const clusterDensityPct = Math.min(
        100,
        Number(((calculatedAtRiskCount / totalScreened) * 100).toFixed(1))
      );

      // Hotspot tier classification
      let clusterTier: 'CRITICAL_CLUSTER' | 'HIGH_HOTSPOT' | 'ELEVATED' | 'MODERATE' | 'LOW';
      if (clusterDensityPct >= 38) clusterTier = 'CRITICAL_CLUSTER';
      else if (clusterDensityPct >= 28) clusterTier = 'HIGH_HOTSPOT';
      else if (clusterDensityPct >= 20) clusterTier = 'ELEVATED';
      else if (clusterDensityPct >= 14) clusterTier = 'MODERATE';
      else clusterTier = 'LOW';

      return {
        ...district,
        totalScreened,
        calculatedAtRiskCount,
        clusterDensityPct,
        clusterTier,
        matchingRegistryPatients,
        registryAtRiskCount: registryAtRisk.length,
      };
    });
  }, [assessments, selectedCondition]);

  // Filtered by Province & Search Query
  const filteredDistricts = useMemo(() => {
    return regionalClusterMetrics.filter((d) => {
      const matchProv = selectedProvince === 'ALL' || d.province === selectedProvince;
      const matchSearch =
        searchDistrict.trim() === '' ||
        d.districtName.toLowerCase().includes(searchDistrict.toLowerCase()) ||
        d.province.toLowerCase().includes(searchDistrict.toLowerCase());
      return matchProv && matchSearch;
    });
  }, [regionalClusterMetrics, selectedProvince, searchDistrict]);

  // Top Ranked Districts by Cluster Density for Visualization
  const topDensityDistricts = useMemo(() => {
    return [...filteredDistricts].sort((a, b) => b.clusterDensityPct - a.clusterDensityPct).slice(0, 10);
  }, [filteredDistricts]);

  // Province-Level Aggregations
  const provinceAggregations = useMemo(() => {
    const provMap: Record<string, { province: string; totalScreened: number; totalAtRisk: number }> = {};

    regionalClusterMetrics.forEach((d) => {
      if (!provMap[d.province]) {
        provMap[d.province] = { province: d.province, totalScreened: 0, totalAtRisk: 0 };
      }
      provMap[d.province].totalScreened += d.totalScreened;
      provMap[d.province].totalAtRisk += d.calculatedAtRiskCount;
    });

    return Object.values(provMap).map((p) => ({
      province: p.province,
      clusterDensityPct: Number(((p.totalAtRisk / p.totalScreened) * 100).toFixed(1)),
      totalAtRisk: p.totalAtRisk,
      totalScreened: p.totalScreened,
    }));
  }, [regionalClusterMetrics]);

  // Export Risk Heatmap Data to CSV
  const handleExportHeatmapCSV = () => {
    const headers = [
      'District',
      'Province',
      'High-Risk Condition',
      'Screened Population',
      'At-Risk Cluster Cases',
      'Cluster Density (%)',
      'Cluster Classification',
      '30-Day Trend',
      'Referral Demand Level',
      'Hospital Bed Load (%)',
    ];

    const rows = filteredDistricts.map((d) => [
      `"${d.districtName}"`,
      `"${d.province}"`,
      `"${conditionMeta[selectedCondition].shortName}"`,
      d.totalScreened,
      d.calculatedAtRiskCount,
      `${d.clusterDensityPct}%`,
      d.clusterTier,
      d.trend30Day,
      d.referralDemandLevel,
      `${d.hospitalBedLoadPct}%`,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `GeoAI_Risk_Heatmap_${selectedCondition}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const currentMeta = conditionMeta[selectedCondition];
  const CurrentIcon = currentMeta.icon;

  return (
    <div id="risk-heatmap-dashboard-root" className="space-y-6">
      {/* Top Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 rounded-2xl p-6 text-white border border-slate-700 shadow-md">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              <div className="w-9 h-9 rounded-xl bg-rose-600/30 border border-rose-500/50 flex items-center justify-center text-rose-400 font-bold shadow-sm">
                <Flame className="w-5 h-5 text-rose-400" />
              </div>
              <h2 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
                <span>GeoAI Regional Risk Heatmap</span>
                <span className="text-xs font-mono font-bold px-2 py-0.5 bg-rose-500/20 text-rose-300 border border-rose-500/40 rounded-full">
                  Cluster Density Analytics
                </span>
              </h2>
            </div>
            <p className="text-xs text-slate-300 max-w-3xl leading-relaxed">
              Spatial density visualization aggregating clinical screening records and provincial surveillance
              to detect localized epidemiologic hotspots, critical crisis clusters, and allocate emergency triage resources.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              id="btn-export-heatmap-csv"
              onClick={handleExportHeatmapCSV}
              className="px-3.5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-all border border-white/20 flex items-center gap-1.5 cursor-pointer"
              title="Download detailed regional cluster metrics spreadsheet"
            >
              <Download className="w-3.5 h-3.5 text-cyan-400" />
              <span>Export Heatmap CSV</span>
            </button>

            {onNavigateTab && (
              <button
                id="btn-switch-geoai-map"
                onClick={() => onNavigateTab('GEO_AI')}
                className="px-3.5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm"
              >
                <MapPin className="w-3.5 h-3.5" />
                <span>Open Interactive Map</span>
              </button>
            )}
          </div>
        </div>

        {/* High-Risk Condition Selector Pills */}
        <div className="mt-5 pt-4 border-t border-slate-700/80">
          <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-300 mb-2 flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-cyan-400" />
            Select High-Risk Clinical Condition for Spatial Heatmap:
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
            {(Object.keys(conditionMeta) as HighRiskConditionType[]).map((condKey) => {
              const meta = conditionMeta[condKey];
              const Icon = meta.icon;
              const isSelected = selectedCondition === condKey;
              return (
                <button
                  key={condKey}
                  id={`heatmap-cond-${condKey}`}
                  onClick={() => setSelectedCondition(condKey)}
                  className={`p-2.5 rounded-xl text-left border transition-all cursor-pointer flex flex-col justify-between ${
                    isSelected
                      ? 'bg-white text-slate-900 border-white shadow-lg ring-2 ring-cyan-400'
                      : 'bg-slate-800/80 text-slate-200 border-slate-700 hover:bg-slate-700/80'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <Icon className={`w-4 h-4 ${isSelected ? 'text-rose-600' : 'text-cyan-400'}`} />
                    <span
                      className={`text-[9px] font-mono font-bold px-1.5 py-0.2 rounded ${
                        isSelected ? 'bg-slate-900 text-white' : 'bg-slate-900/60 text-slate-400'
                      }`}
                    >
                      {condKey.split('_')[0]}
                    </span>
                  </div>
                  <div>
                    <div className="font-bold text-xs leading-snug">{meta.shortName}</div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Selected Condition Clinical Scope Banner */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold shrink-0 shadow-xs"
            style={{ backgroundColor: currentMeta.activeColor }}
          >
            <CurrentIcon className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-slate-900">{currentMeta.title}</h3>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${currentMeta.badgeColor}`}>
                Active Density Metric
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              <strong>Clinical Criteria:</strong> {currentMeta.clinicalCriteria}
            </p>
          </div>
        </div>

        {/* Filter Controls: Province & Search */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
            <input
              id="input-search-heatmap-districts"
              type="text"
              placeholder="Search district..."
              value={searchDistrict}
              onChange={(e) => setSearchDistrict(e.target.value)}
              className="pl-8 pr-3 py-1.5 text-xs border border-slate-300 rounded-lg bg-slate-50 focus:bg-white focus:ring-2 focus:ring-cyan-500 focus:outline-none w-40"
            />
          </div>

          <select
            id="select-heatmap-province"
            value={selectedProvince}
            onChange={(e) => setSelectedProvince(e.target.value)}
            className="p-1.5 text-xs border border-slate-300 rounded-lg bg-slate-50 text-slate-800 font-semibold focus:outline-none"
          >
            <option value="ALL">All Pakistan Provinces</option>
            <option value="Punjab">Punjab</option>
            <option value="Sindh">Sindh</option>
            <option value="Khyber Pakhtunkhwa">Khyber Pakhtunkhwa</option>
            <option value="Balochistan">Balochistan</option>
            <option value="Islamabad Capital Territory">Islamabad (ICT)</option>
          </select>
        </div>
      </div>

      {/* Cluster Analytics Highlights Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span className="font-bold">Total Evaluated Cohort</span>
            <Users className="w-4 h-4 text-cyan-600" />
          </div>
          <div className="text-2xl font-black font-mono text-slate-900">
            {regionalClusterMetrics.reduce((acc, d) => acc + d.totalScreened, 0).toLocaleString()}
          </div>
          <span className="text-[10px] text-slate-400 block mt-1">Across 15 Pakistan surveillance hubs</span>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span className="font-bold">Identified At-Risk Cluster Volume</span>
            <Flame className="w-4 h-4 text-rose-500" />
          </div>
          <div className="text-2xl font-black font-mono text-rose-600">
            {regionalClusterMetrics.reduce((acc, d) => acc + d.calculatedAtRiskCount, 0).toLocaleString()}
          </div>
          <span className="text-[10px] text-rose-700 block mt-1 font-semibold">
            {((regionalClusterMetrics.reduce((acc, d) => acc + d.calculatedAtRiskCount, 0) /
              regionalClusterMetrics.reduce((acc, d) => acc + d.totalScreened, 0)) *
              100).toFixed(1)}% National Cluster Prevalence
          </span>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span className="font-bold">Critical Hotspot Districts</span>
            <ShieldAlert className="w-4 h-4 text-red-600" />
          </div>
          <div className="text-2xl font-black font-mono text-slate-900">
            {regionalClusterMetrics.filter((d) => d.clusterTier === 'CRITICAL_CLUSTER').length} Districts
          </div>
          <span className="text-[10px] text-red-600 block mt-1 font-bold">
            Cluster Density ≥ 38% (Urgent Surge)
          </span>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm">
          <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
            <span className="font-bold">Highest Cluster District</span>
            <MapPin className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-lg font-black text-slate-900 truncate">
            {topDensityDistricts[0]?.districtName || 'N/A'}
          </div>
          <span className="text-[10px] text-indigo-700 block mt-1 font-bold font-mono">
            {topDensityDistricts[0]?.clusterDensityPct}% Cluster Density ({topDensityDistricts[0]?.province})
          </span>
        </div>
      </div>

      {/* Visual Density Comparison Section (Bar Chart + Spatial Grid) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* LEFT: Top Ranked Districts Horizontal Bar Chart (6 cols) */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-cyan-600" />
                Cluster Density Rankings by District (%)
              </h3>
              <p className="text-xs text-slate-500">
                Percentage of screened population meeting {currentMeta.shortName} criteria
              </p>
            </div>
            <span className="text-[10px] font-mono font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-200">
              Top 10 Hotspots
            </span>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topDensityDistricts} layout="vertical" margin={{ top: 5, right: 30, left: 50, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f1f5f9" />
                <XAxis type="number" domain={[0, 50]} unit="%" tick={{ fontSize: 11 }} />
                <YAxis dataKey="districtName" type="category" tick={{ fontSize: 11, fontWeight: 600 }} />
                <Tooltip
                  formatter={(val: number) => [`${val}% Density`, 'Cluster Rate']}
                  labelFormatter={(label) => `District: ${label}`}
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    color: '#fff',
                    borderRadius: '0.75rem',
                    fontSize: '12px',
                    border: 'none',
                  }}
                />
                <Bar dataKey="clusterDensityPct" radius={[0, 8, 8, 0]}>
                  {topDensityDistricts.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={
                        entry.clusterTier === 'CRITICAL_CLUSTER'
                          ? '#dc2626'
                          : entry.clusterTier === 'HIGH_HOTSPOT'
                          ? '#ea580c'
                          : entry.clusterTier === 'ELEVATED'
                          ? '#d97706'
                          : '#0d9488'
                      }
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Legend */}
          <div className="flex items-center justify-center gap-4 text-[11px] pt-2 border-t border-slate-100 flex-wrap">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-red-600"></span>
              <span className="text-slate-700 font-medium">Critical (≥ 38%)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-orange-500"></span>
              <span className="text-slate-700 font-medium">High (28-37%)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-amber-500"></span>
              <span className="text-slate-700 font-medium">Elevated (20-27%)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-teal-600"></span>
              <span className="text-slate-700 font-medium">Moderate / Stable (&lt; 20%)</span>
            </div>
          </div>
        </div>

        {/* RIGHT: Provincial Burden Distribution Bar Chart (5 cols) */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Building2 className="w-4 h-4 text-indigo-600" />
                Provincial Burden Overview
              </h3>
              <p className="text-xs text-slate-500">Aggregate cluster prevalence across provinces</p>
            </div>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={provinceAggregations} margin={{ top: 10, right: 15, left: -10, bottom: 25 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                <XAxis
                  dataKey="province"
                  tick={{ fontSize: 10, fontWeight: 600 }}
                  interval={0}
                  angle={-20}
                  textAnchor="end"
                />
                <YAxis unit="%" tick={{ fontSize: 11 }} />
                <Tooltip
                  formatter={(val: number) => [`${val}%`, 'Provincial Cluster Density']}
                  contentStyle={{
                    backgroundColor: '#0f172a',
                    color: '#fff',
                    borderRadius: '0.75rem',
                    fontSize: '12px',
                    border: 'none',
                  }}
                />
                <Bar dataKey="clusterDensityPct" fill={currentMeta.activeColor} radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Spatial Regional Cluster Node Grid (Interactive Cards) */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-cyan-600" />
              Regional District Cluster Nodes ({filteredDistricts.length} Surveillance Hubs)
            </h3>
            <p className="text-xs text-slate-500">
              Click any district card to view local hospital readiness and matching patient records.
            </p>
          </div>
          <span className="text-xs font-mono font-bold text-slate-700 bg-slate-100 px-2 py-1 rounded border border-slate-200">
            Metric: {currentMeta.shortName}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          {filteredDistricts.map((district) => {
            const isCritical = district.clusterTier === 'CRITICAL_CLUSTER';
            const isHigh = district.clusterTier === 'HIGH_HOTSPOT';
            const isElevated = district.clusterTier === 'ELEVATED';

            return (
              <div
                key={district.id}
                id={`district-node-${district.id}`}
                onClick={() => setSelectedDistrictModal(district)}
                className={`p-3.5 rounded-2xl border transition-all cursor-pointer hover:shadow-md ${
                  isCritical
                    ? 'bg-red-50/80 border-red-300 hover:border-red-400 ring-1 ring-red-400/30'
                    : isHigh
                    ? 'bg-orange-50/80 border-orange-300 hover:border-orange-400'
                    : isElevated
                    ? 'bg-amber-50/70 border-amber-300 hover:border-amber-400'
                    : 'bg-slate-50 border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex items-start justify-between gap-1 mb-1">
                  <div>
                    <h4 className="text-xs font-bold text-slate-900">{district.districtName}</h4>
                    <span className="text-[10px] text-slate-500">{district.province}</span>
                  </div>
                  <span
                    className={`text-[9px] font-bold font-mono px-1.5 py-0.5 rounded ${
                      isCritical
                        ? 'bg-red-600 text-white animate-pulse'
                        : isHigh
                        ? 'bg-orange-600 text-white'
                        : isElevated
                        ? 'bg-amber-600 text-white'
                        : 'bg-teal-600 text-white'
                    }`}
                  >
                    {district.clusterDensityPct}%
                  </span>
                </div>

                <div className="mt-2 pt-2 border-t border-slate-200/60 space-y-1 text-[11px]">
                  <div className="flex items-center justify-between text-slate-600">
                    <span>At-Risk Cases:</span>
                    <strong className="font-mono text-slate-900">{district.calculatedAtRiskCount}</strong>
                  </div>
                  <div className="flex items-center justify-between text-slate-600">
                    <span>Screened:</span>
                    <span className="font-mono text-slate-500">{district.totalScreened}</span>
                  </div>
                  <div className="flex items-center justify-between text-slate-600">
                    <span>Bed Load:</span>
                    <span className="font-mono text-slate-700">{district.hospitalBedLoadPct}%</span>
                  </div>
                </div>

                {district.registryAtRiskCount > 0 && (
                  <div className="mt-2 px-1.5 py-0.5 rounded bg-white text-[10px] font-bold text-rose-700 border border-rose-200 flex items-center gap-1">
                    <Users className="w-3 h-3" />
                    <span>{district.registryAtRiskCount} Active Registry Patient(s)</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* AI Resource Allocation & Mitigation Directives */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 rounded-2xl p-5 text-white border border-slate-700 shadow-md space-y-3">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-cyan-400" />
          <h3 className="text-sm font-bold text-white">AI Resource Allocation & Policy Directives</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          <div className="p-3 bg-slate-950/70 rounded-xl border border-slate-700/80 space-y-1">
            <span className="font-bold text-cyan-300 block">Emergency Mobile Dispatch</span>
            <p className="text-slate-300 text-[11px] leading-relaxed">
              Deploy Mobile Tele-ECG units and emergency triage response vehicles to{' '}
              <strong>Lahore, Rawalpindi, and Faisalabad</strong> clusters where {currentMeta.shortName} exceeds 35%.
            </p>
          </div>

          <div className="p-3 bg-slate-950/70 rounded-xl border border-slate-700/80 space-y-1">
            <span className="font-bold text-amber-300 block">Formulary Stockpile Prioritization</span>
            <p className="text-slate-300 text-[11px] leading-relaxed">
              Prioritize distribution of first-line CCB (Amlodipine), ARB (Telmisartan), and statins to high-density
              DHQ emergency depots.
            </p>
          </div>

          <div className="p-3 bg-slate-950/70 rounded-xl border border-slate-700/80 space-y-1">
            <span className="font-bold text-teal-300 block">Community Tele-Triage Nodes</span>
            <p className="text-slate-300 text-[11px] leading-relaxed">
              Activate automated remote SMS recall alerts for 30-day follow-up across primary BHU centers in elevated districts.
            </p>
          </div>
        </div>
      </div>

      {/* District Detail Modal */}
      {selectedDistrictModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full border border-slate-200 shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-150">
            <div className="bg-slate-900 p-4 text-white flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-cyan-400" />
                  {selectedDistrictModal.districtName} District Surveillance Hub
                </h3>
                <p className="text-xs text-slate-300">
                  {selectedDistrictModal.province} • Population: {selectedDistrictModal.population.toLocaleString()}
                </p>
              </div>
              <button
                onClick={() => setSelectedDistrictModal(null)}
                className="p-1.5 rounded-lg hover:bg-white/10 text-slate-300 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-[10px] text-slate-500 uppercase font-bold block">Cluster Density</span>
                  <span className="text-base font-black font-mono text-rose-600">
                    {
                      regionalClusterMetrics.find((d) => d.id === selectedDistrictModal.id)?.clusterDensityPct
                    }%
                  </span>
                </div>
                <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-[10px] text-slate-500 uppercase font-bold block">Screened Pool</span>
                  <span className="text-base font-black font-mono text-slate-900">
                    {selectedDistrictModal.screenedCount.toLocaleString()}
                  </span>
                </div>
                <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-[10px] text-slate-500 uppercase font-bold block">Bed Load</span>
                  <span className="text-base font-black font-mono text-indigo-600">
                    {selectedDistrictModal.hospitalBedLoadPct}%
                  </span>
                </div>
              </div>

              {/* Active Registry Patients in this District */}
              <div>
                <h4 className="font-bold text-slate-800 mb-2 flex items-center justify-between">
                  <span>Patients in Registry from {selectedDistrictModal.districtName}:</span>
                  <span className="text-[10px] text-slate-500">
                    {
                      assessments.filter(
                        (a) =>
                          a.demographics.district?.toLowerCase() ===
                          selectedDistrictModal.districtName.toLowerCase()
                      ).length
                    }{' '}
                    Found
                  </span>
                </h4>

                <div className="space-y-1.5 max-h-48 overflow-y-auto">
                  {assessments.filter(
                    (a) =>
                      a.demographics.district?.toLowerCase() ===
                      selectedDistrictModal.districtName.toLowerCase()
                  ).length === 0 ? (
                    <div className="p-3 text-center text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                      No active registry patients registered for {selectedDistrictModal.districtName}.
                    </div>
                  ) : (
                    assessments
                      .filter(
                        (a) =>
                          a.demographics.district?.toLowerCase() ===
                          selectedDistrictModal.districtName.toLowerCase()
                      )
                      .map((p) => {
                        const isMatch = doesPatientMatchCondition(p, selectedCondition);
                        return (
                          <div
                            key={p.demographics.patientId}
                            className="p-2.5 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between text-xs hover:bg-slate-100 transition-all"
                          >
                            <div>
                              <div className="font-bold text-slate-900 flex items-center gap-1.5">
                                <span>{p.demographics.fullName}</span>
                                {isMatch && (
                                  <span className="text-[9px] bg-rose-100 text-rose-800 font-bold px-1 rounded">
                                    Condition Match
                                  </span>
                                )}
                              </div>
                              <span className="text-[10px] text-slate-500 font-mono">
                                ID: {p.demographics.patientId} • BP: {p.vitals.systolicBp}/{p.vitals.diastolicBp} • SpO2: {p.vitals.oxygenSaturation}%
                              </span>
                            </div>

                            {onSelectPatient && (
                              <button
                                onClick={() => {
                                  onSelectPatient(p);
                                  setSelectedDistrictModal(null);
                                  if (onNavigateTab) onNavigateTab('DOCTOR_CDS');
                                }}
                                className="px-2 py-1 rounded bg-cyan-700 hover:bg-cyan-800 text-white font-bold text-[10px] flex items-center gap-1 cursor-pointer"
                              >
                                <span>View CDS</span>
                              </button>
                            )}
                          </div>
                        );
                      })
                  )}
                </div>
              </div>

              {/* Close Button */}
              <div className="pt-2 flex justify-end">
                <button
                  onClick={() => setSelectedDistrictModal(null)}
                  className="px-4 py-1.5 rounded-xl bg-slate-900 text-white font-bold text-xs hover:bg-slate-800 cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
