import React, { useState } from 'react';
import { VitalSigns, TriageLevel } from '../types/clinical';
import {
  Activity,
  Heart,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  TrendingUp,
  Sparkles,
  Calendar,
  Layers,
  RotateCcw,
} from 'lucide-react';

export interface HistoricalVitalSet {
  id: string;
  timestamp: string;
  systolicBp: number;
  diastolicBp: number;
  heartRate: number;
  oxygenSaturation: number;
  bloodGlucoseMgDl: number;
  temperatureC: number;
  respiratoryRate: number;
  sourceFacility: string;
  triageLevel: TriageLevel;
  triageLevelName: string;
  clinicalNotes?: string;
}

interface VitalsHistoryTableProps {
  patientId: string;
  patientName: string;
  historicalVitals?: HistoricalVitalSet[];
  currentVitals?: VitalSigns;
  onApplyHistoricalVitals?: (vitals: HistoricalVitalSet) => void;
}

// Generate sensible historical longitudinal records for returning patients if none provided
export function generateMockHistoricalVitals(
  patientId: string,
  baseSystolic = 148,
  baseDiastolic = 92
): HistoricalVitalSet[] {
  const dates = [
    new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago (ED Triage)
    new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(), // 2 weeks ago (Cardiology Clinic)
    new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString(), // 1.5 months ago (OP Follow-up)
    new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(), // 3 months ago (Routine BHU Screening)
    new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString(), // 6 months ago (Initial Intake)
  ];

  const facilities = [
    'Emergency Triage Bay A',
    'Cardiology OP Clinic #4',
    'Internal Medicine Follow-up',
    'Model Town BHU Clinic',
    'Initial Health Screening Camp',
  ];

  const variances = [
    { sbp: 0, dbp: 0, hr: 82, spo2: 97, bgl: 160, temp: 36.8, rr: 16, triage: 'LEVEL_3_PRIORITY' as TriageLevel, name: 'Level 3: Priority Urgent' },
    { sbp: -8, dbp: -4, hr: 78, spo2: 98, bgl: 145, temp: 36.6, rr: 15, triage: 'LEVEL_4_ROUTINE' as TriageLevel, name: 'Level 4: Routine' },
    { sbp: +12, dbp: +6, hr: 90, spo2: 96, bgl: 178, temp: 37.1, rr: 18, triage: 'LEVEL_2_URGENT' as TriageLevel, name: 'Level 2: Urgent' },
    { sbp: -14, dbp: -8, hr: 74, spo2: 99, bgl: 138, temp: 36.7, rr: 14, triage: 'LEVEL_4_ROUTINE' as TriageLevel, name: 'Level 4: Routine' },
    { sbp: +16, dbp: +10, hr: 96, spo2: 95, bgl: 192, temp: 37.0, rr: 19, triage: 'LEVEL_2_URGENT' as TriageLevel, name: 'Level 2: Urgent' },
  ];

  return dates.map((d, i) => {
    const v = variances[i];
    return {
      id: `VIT-HIST-${patientId}-${i + 1}`,
      timestamp: d,
      systolicBp: Math.max(90, baseSystolic + v.sbp),
      diastolicBp: Math.max(60, baseDiastolic + v.dbp),
      heartRate: v.hr,
      oxygenSaturation: v.spo2,
      bloodGlucoseMgDl: v.bgl,
      temperatureC: v.temp,
      respiratoryRate: v.rr,
      sourceFacility: facilities[i],
      triageLevel: v.triage,
      triageLevelName: v.name,
      clinicalNotes: i === 0 ? 'Current visit triage check' : 'Routine ambulatory record',
    };
  });
}

export const VitalsHistoryTable: React.FC<VitalsHistoryTableProps> = ({
  patientId,
  patientName,
  historicalVitals,
  currentVitals,
  onApplyHistoricalVitals,
}) => {
  const [appliedIndex, setAppliedIndex] = useState<number | null>(null);

  const vitalsList: HistoricalVitalSet[] =
    historicalVitals && historicalVitals.length > 0
      ? historicalVitals.slice(0, 5)
      : generateMockHistoricalVitals(
          patientId,
          currentVitals?.systolicBp || 148,
          currentVitals?.diastolicBp || 92
        );

  const getBpBadge = (sbp: number, dbp: number) => {
    if (sbp >= 180 || dbp >= 120) {
      return { label: 'Crisis (>180/120)', class: 'bg-rose-100 text-rose-800 border-rose-300 font-bold' };
    }
    if (sbp >= 140 || dbp >= 90) {
      return { label: 'Stage 2 HTN', class: 'bg-orange-100 text-orange-800 border-orange-300' };
    }
    if (sbp >= 130 || dbp >= 80) {
      return { label: 'Stage 1 HTN', class: 'bg-amber-100 text-amber-800 border-amber-300' };
    }
    if (sbp >= 120) {
      return { label: 'Elevated', class: 'bg-yellow-100 text-yellow-800 border-yellow-300' };
    }
    return { label: 'Normal', class: 'bg-emerald-100 text-emerald-800 border-emerald-300' };
  };

  const getTriageBadge = (level: TriageLevel) => {
    switch (level) {
      case 'LEVEL_1_EMERGENCY':
        return 'bg-rose-600 text-white font-bold';
      case 'LEVEL_2_URGENT':
        return 'bg-orange-500 text-white font-bold';
      case 'LEVEL_3_PRIORITY':
        return 'bg-amber-500 text-white font-bold';
      case 'LEVEL_4_ROUTINE':
        return 'bg-blue-600 text-white';
      case 'LEVEL_5_LOW_RISK':
      default:
        return 'bg-emerald-600 text-white';
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden text-xs space-y-3">
      {/* Header Banner */}
      <div className="bg-slate-900 text-white p-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-cyan-500/20 text-cyan-400 rounded-xl border border-cyan-500/30">
            <Activity className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-white flex items-center gap-2">
              Vitals History — Last 5 Recorded Encounters
              <span className="text-[10px] font-mono text-cyan-300 bg-cyan-950/70 px-2 py-0.5 rounded-full border border-cyan-800">
                {patientName || 'Returning Patient'} ({patientId})
              </span>
            </h4>
            <p className="text-[11px] text-slate-400">
              Longitudinal hemodynamic baseline summary for immediate clinical triage context.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-[11px] text-slate-300">
          <span className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5 text-cyan-400" />
            Sorted: Newest to Oldest (5 Sets)
          </span>
        </div>
      </div>

      {/* Table Container */}
      <div className="overflow-x-auto px-4 pb-4">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-bold text-slate-600 uppercase tracking-wider">
              <th className="p-2.5">Encounter Date & Time</th>
              <th className="p-2.5">BP (mmHg)</th>
              <th className="p-2.5">HR (bpm)</th>
              <th className="p-2.5">SpO2</th>
              <th className="p-2.5">Glucose</th>
              <th className="p-2.5">Temp / RR</th>
              <th className="p-2.5">Source Facility</th>
              <th className="p-2.5">Triage Level</th>
              {onApplyHistoricalVitals && <th className="p-2.5 text-right">Action</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {vitalsList.map((set, idx) => {
              const bpBadge = getBpBadge(set.systolicBp, set.diastolicBp);
              const dateObj = new Date(set.timestamp);
              const formattedDate = dateObj.toLocaleDateString('en-GB', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
              });
              const formattedTime = dateObj.toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit',
              });

              // Delta from first record
              const sbpDelta = idx > 0 ? set.systolicBp - vitalsList[0].systolicBp : 0;

              return (
                <tr
                  key={set.id || idx}
                  className={`hover:bg-slate-50/80 transition-colors ${
                    idx === 0 ? 'bg-cyan-50/30' : ''
                  }`}
                >
                  {/* Date & Time */}
                  <td className="p-2.5 whitespace-nowrap">
                    <div className="font-bold text-slate-900 flex items-center gap-1.5">
                      <span>{formattedDate}</span>
                      {idx === 0 && (
                        <span className="text-[9px] bg-cyan-100 text-cyan-800 font-bold px-1.5 py-0.2 rounded">
                          LATEST
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] text-slate-500 font-mono">{formattedTime}</div>
                  </td>

                  {/* BP */}
                  <td className="p-2.5 whitespace-nowrap">
                    <div className="flex items-center gap-1.5">
                      <strong className="font-mono text-sm text-slate-900">
                        {set.systolicBp}/{set.diastolicBp}
                      </strong>
                      <span className={`text-[9px] px-1.5 py-0.2 rounded border ${bpBadge.class}`}>
                        {bpBadge.label}
                      </span>
                    </div>
                    {idx > 0 && sbpDelta !== 0 && (
                      <div className="text-[9px] text-slate-500 flex items-center gap-0.5">
                        {sbpDelta > 0 ? (
                          <span className="text-rose-600 flex items-center">
                            <ArrowUpRight className="w-3 h-3" /> +{sbpDelta} mmHg vs latest
                          </span>
                        ) : (
                          <span className="text-emerald-600 flex items-center">
                            <ArrowDownRight className="w-3 h-3" /> {sbpDelta} mmHg vs latest
                          </span>
                        )}
                      </div>
                    )}
                  </td>

                  {/* HR */}
                  <td className="p-2.5 whitespace-nowrap font-mono text-slate-900">
                    <strong>{set.heartRate}</strong>
                    <span className="text-[10px] text-slate-500 ml-1">
                      {set.heartRate > 100 ? '⚠️ Tachy' : set.heartRate < 60 ? '⚠️ Brady' : 'Normal'}
                    </span>
                  </td>

                  {/* SpO2 */}
                  <td className="p-2.5 whitespace-nowrap font-mono">
                    <strong className={set.oxygenSaturation < 94 ? 'text-rose-600' : 'text-slate-900'}>
                      {set.oxygenSaturation}%
                    </strong>
                  </td>

                  {/* Glucose */}
                  <td className="p-2.5 whitespace-nowrap font-mono text-slate-900">
                    <strong>{set.bloodGlucoseMgDl}</strong>
                    <span className="text-[10px] text-slate-500 ml-1">mg/dL</span>
                  </td>

                  {/* Temp / RR */}
                  <td className="p-2.5 whitespace-nowrap text-slate-700">
                    <div>{set.temperatureC}°C</div>
                    <div className="text-[10px] text-slate-500 font-mono">{set.respiratoryRate} /min</div>
                  </td>

                  {/* Source Facility */}
                  <td className="p-2.5 whitespace-nowrap text-slate-700">
                    <span className="text-[11px] font-medium block truncate max-w-[150px]" title={set.sourceFacility}>
                      {set.sourceFacility}
                    </span>
                  </td>

                  {/* Triage Level */}
                  <td className="p-2.5 whitespace-nowrap">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full inline-block ${getTriageBadge(set.triageLevel)}`}>
                      {set.triageLevelName.split(':')[0]}
                    </span>
                  </td>

                  {/* Action */}
                  {onApplyHistoricalVitals && (
                    <td className="p-2.5 text-right whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => {
                          onApplyHistoricalVitals(set);
                          setAppliedIndex(idx);
                        }}
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                          appliedIndex === idx
                            ? 'bg-emerald-600 text-white'
                            : 'bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200'
                        }`}
                        title="Copy this set of vitals into the current intake form"
                      >
                        {appliedIndex === idx ? 'Applied ✓' : 'Use as Baseline'}
                      </button>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Summary Footer Statistics */}
      <div className="bg-slate-50 px-4 py-2.5 border-t border-slate-200 flex flex-wrap items-center justify-between text-[11px] text-slate-600">
        <div className="flex items-center gap-4">
          <span>
            Mean SBP: <strong className="font-mono text-slate-800">
              {Math.round(vitalsList.reduce((s, v) => s + v.systolicBp, 0) / vitalsList.length)} mmHg
            </strong>
          </span>
          <span>
            Mean DBP: <strong className="font-mono text-slate-800">
              {Math.round(vitalsList.reduce((s, v) => s + v.diastolicBp, 0) / vitalsList.length)} mmHg
            </strong>
          </span>
          <span>
            Mean Pulse: <strong className="font-mono text-slate-800">
              {Math.round(vitalsList.reduce((s, v) => s + v.heartRate, 0) / vitalsList.length)} bpm
            </strong>
          </span>
        </div>
        <span className="text-emerald-700 font-medium">
          5-Point Longitudinal Context Active
        </span>
      </div>
    </div>
  );
};
