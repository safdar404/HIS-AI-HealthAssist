import React, { useState, useMemo } from 'react';
import { PatientAssessmentRecord } from '../types/clinical';
import { TrendingUp, TrendingDown, Minus, Info } from 'lucide-react';

export type VitalsMetricType = 'SBP' | 'HR' | 'GLUCOSE';

export interface VitalsSparklineProps {
  record: PatientAssessmentRecord;
  metric?: VitalsMetricType;
  width?: number;
  height?: number;
  showDelta?: boolean;
  className?: string;
}

interface DataPoint {
  dayLabel: string;
  dayOffset: number;
  value: number;
  dateStr: string;
}

/**
 * Deterministic pseudo-random helper seeded by patient ID and salt
 */
function seededRandom(seedStr: string, index: number): number {
  let hash = 0;
  const combined = `${seedStr}_${index}_vitals_2026`;
  for (let i = 0; i < combined.length; i++) {
    const char = combined.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0; // Convert to 32bit int
  }
  const x = Math.sin(hash) * 10000;
  return x - Math.floor(x);
}

/**
 * Generates 7-day realistic clinical vital series leading up to current reading
 */
export function generate7DayVitalSeries(
  record: PatientAssessmentRecord,
  metric: VitalsMetricType = 'SBP'
): DataPoint[] {
  const patientId = record.demographics.patientId || 'P000';
  const today = new Date();
  
  let currentVal = 130;
  let normalMin = 110;
  let normalMax = 140;
  let variance = 6;

  if (metric === 'SBP') {
    currentVal = record.vitals.systolicBp || 130;
    normalMin = 100;
    normalMax = 180;
    variance = (record.profile?.hypertensionHistory || currentVal >= 140) ? 8 : 4;
  } else if (metric === 'HR') {
    currentVal = record.vitals.heartRate || 75;
    normalMin = 55;
    normalMax = 115;
    variance = 5;
  } else if (metric === 'GLUCOSE') {
    currentVal = record.vitals.bloodGlucoseMgDl || record.labs?.glucoseFastingMgDl || 110;
    normalMin = 75;
    normalMax = 220;
    variance = 10;
  }

  const days: DataPoint[] = [];

  for (let i = 6; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(today.getDate() - i);
    const dateStr = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const dayLabel = i === 0 ? 'Today' : `D-${i}`;

    if (i === 0) {
      days.push({
        dayLabel,
        dayOffset: 0,
        value: currentVal,
        dateStr,
      });
    } else {
      // Deterministic trajectory
      const rand = seededRandom(patientId, i);
      // Create a slight trend trajectory
      const trendBias = (record.assessmentResult?.triage?.level === 'LEVEL_1_EMERGENCY' || currentVal >= 160)
        ? (6 - i) * 1.5 // rising trend towards today
        : (record.doctorReview)
        ? -(6 - i) * 1.2 // improving trend under medication
        : (rand - 0.5) * 2;

      const offsetVal = Math.round((rand - 0.5) * variance * 2 + trendBias);
      const simulatedVal = Math.max(normalMin, Math.min(normalMax, currentVal + offsetVal));

      days.push({
        dayLabel,
        dayOffset: -i,
        value: simulatedVal,
        dateStr,
      });
    }
  }

  return days;
}

export const VitalsSparkline: React.FC<VitalsSparklineProps> = ({
  record,
  metric = 'SBP',
  width = 96,
  height = 30,
  showDelta = true,
  className = '',
}: VitalsSparklineProps) => {
  const [hoveredPoint, setHoveredPoint] = useState<DataPoint | null>(null);

  const series = useMemo(() => {
    return generate7DayVitalSeries(record, metric as VitalsMetricType);
  }, [record, metric]);

  const firstVal = series[0]?.value ?? 0;
  const lastVal = series[series.length - 1]?.value ?? 0;
  const delta = lastVal - firstVal;

  const minVal = Math.min(...series.map((d) => d.value));
  const maxVal = Math.max(...series.map((d) => d.value));

  // Determine color theme based on clinical thresholds
  let strokeColor = '#06b6d4'; // Cyan default
  let fillColor = '#06b6d4';
  let badgeBg = 'bg-slate-100 text-slate-700';

  if (metric === 'SBP') {
    if (lastVal >= 160) {
      strokeColor = '#dc2626'; // Red-600 (Crisis/Stage 2)
      fillColor = '#ef4444';
      badgeBg = 'bg-rose-100 text-rose-700 font-bold';
    } else if (lastVal >= 140) {
      strokeColor = '#ea580c'; // Orange-600 (Stage 1 HTN)
      fillColor = '#f97316';
      badgeBg = 'bg-amber-100 text-amber-800';
    } else if (lastVal >= 120) {
      strokeColor = '#d97706'; // Amber-600 (Pre-HTN)
      fillColor = '#f59e0b';
      badgeBg = 'bg-amber-50 text-amber-700';
    } else {
      strokeColor = '#059669'; // Emerald-600 (Optimal/Normal)
      fillColor = '#10b981';
      badgeBg = 'bg-emerald-50 text-emerald-700';
    }
  } else if (metric === 'HR') {
    if (lastVal > 100 || lastVal < 55) {
      strokeColor = '#ea580c';
      fillColor = '#f97316';
      badgeBg = 'bg-amber-100 text-amber-800';
    } else {
      strokeColor = '#059669';
      fillColor = '#10b981';
      badgeBg = 'bg-emerald-50 text-emerald-700';
    }
  } else if (metric === 'GLUCOSE') {
    if (lastVal >= 180) {
      strokeColor = '#dc2626';
      fillColor = '#ef4444';
      badgeBg = 'bg-rose-100 text-rose-700';
    } else if (lastVal >= 126) {
      strokeColor = '#ea580c';
      fillColor = '#f97316';
      badgeBg = 'bg-amber-100 text-amber-800';
    } else {
      strokeColor = '#059669';
      fillColor = '#10b981';
      badgeBg = 'bg-emerald-50 text-emerald-700';
    }
  }

  // Padding inside the SVG
  const padX = 4;
  const padY = 4;
  const innerWidth = width - padX * 2;
  const innerHeight = height - padY * 2;

  // Value bounds with safety margin to prevent flat line div-by-zero
  const range = maxVal === minVal ? 10 : maxVal - minVal;
  const yMin = minVal - range * 0.15;
  const yMax = maxVal + range * 0.15;
  const yRange = yMax - yMin;

  const points = series.map((d, index) => {
    const x = padX + (index / (series.length - 1)) * innerWidth;
    const y = padY + innerHeight - ((d.value - yMin) / yRange) * innerHeight;
    return { x, y, data: d };
  });

  const pathD = points.reduce((acc, pt, idx) => {
    return idx === 0 ? `M ${pt.x},${pt.y}` : `${acc} L ${pt.x},${pt.y}`;
  }, '');

  // Area path under line
  const lastX = points[points.length - 1]?.x ?? width;
  const firstX = points[0]?.x ?? 0;
  const bottomY = height - padY;
  const areaD = `${pathD} L ${lastX},${bottomY} L ${firstX},${bottomY} Z`;

  const gradientId = `spark-grad-${record.demographics.patientId.replace(/[^a-zA-Z0-9]/g, '')}-${metric}`;

  const unit = metric === 'SBP' ? 'mmHg' : metric === 'HR' ? 'bpm' : 'mg/dL';

  return (
    <div className={`relative inline-flex items-center gap-1.5 select-none ${className}`}>
      {/* Mini SVG Sparkline */}
      <div
        className="relative group cursor-pointer"
        onMouseLeave={() => setHoveredPoint(null)}
      >
        <svg
          width={width}
          height={height}
          className="overflow-visible block"
          viewBox={`0 0 ${width} ${height}`}
        >
          <defs>
            <linearGradient id={gradientId} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={fillColor} stopOpacity="0.35" />
              <stop offset="100%" stopColor={fillColor} stopOpacity="0.02" />
            </linearGradient>
          </defs>

          {/* Area fill */}
          <path d={areaD} fill={`url(#${gradientId})`} />

          {/* Sparkline path */}
          <path
            d={pathD}
            fill="none"
            stroke={strokeColor}
            strokeWidth="1.75"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Data Points / Hover Targets */}
          {points.map((pt, idx) => {
            const isLast = idx === points.length - 1;
            const isHovered = hoveredPoint?.dayOffset === pt.data.dayOffset;

            return (
              <g key={idx}>
                {/* Visible dot for last point or hovered point */}
                {(isLast || isHovered) && (
                  <circle
                    cx={pt.x}
                    cy={pt.y}
                    r={isHovered ? 3.5 : 2.5}
                    fill={strokeColor}
                    stroke="#ffffff"
                    strokeWidth="1"
                    className="transition-all"
                  />
                )}

                {/* Transparent interactive hover hotspot */}
                <rect
                  x={pt.x - (innerWidth / (series.length - 1)) / 2}
                  y={0}
                  width={innerWidth / (series.length - 1)}
                  height={height}
                  fill="transparent"
                  className="cursor-crosshair"
                  onMouseEnter={() => setHoveredPoint(pt.data)}
                />
              </g>
            );
          })}
        </svg>

        {/* Hover Tooltip Popup */}
        {hoveredPoint && (
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 z-50 pointer-events-none bg-slate-900 text-white border border-slate-700 px-2 py-1 rounded-lg text-[10px] shadow-xl whitespace-nowrap animate-fade-in">
            <div className="flex items-center gap-1 font-mono font-bold text-cyan-300">
              <span>{hoveredPoint.dayLabel}</span>
              <span className="text-slate-400">({hoveredPoint.dateStr}):</span>
              <span className="text-white">{hoveredPoint.value} {unit}</span>
            </div>
            <div className="text-[9px] text-slate-400 font-sans">
              7-Day Range: {minVal} - {maxVal} {unit}
            </div>
          </div>
        )}
      </div>

      {/* 7-Day Trend Delta Badge */}
      {showDelta && (
        <div
          className={`px-1.5 py-0.5 rounded text-[9px] font-mono flex items-center gap-0.5 shrink-0 ${badgeBg}`}
          title={`7-Day ${metric} Trajectory: ${delta > 0 ? `+${delta}` : delta} ${unit} over 7 days`}
        >
          {delta > 0 ? (
            <TrendingUp className="w-2.5 h-2.5 text-rose-600 shrink-0" />
          ) : delta < 0 ? (
            <TrendingDown className="w-2.5 h-2.5 text-emerald-600 shrink-0" />
          ) : (
            <Minus className="w-2.5 h-2.5 text-slate-400 shrink-0" />
          )}
          <span>
            {delta > 0 ? `+${delta}` : delta}
          </span>
        </div>
      )}
    </div>
  );
};
