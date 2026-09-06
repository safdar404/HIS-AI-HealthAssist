import React, { useRef, useState, useEffect, useCallback } from 'react';
import {
  PenTool,
  RotateCcw,
  Trash2,
  CheckCircle2,
  Palette,
  ShieldCheck,
  AlertCircle,
  FileSignature,
} from 'lucide-react';

interface Point {
  x: number;
  y: number;
}

interface Stroke {
  points: Point[];
  color: string;
  width: number;
}

interface DoctorCanvasSignaturePadProps {
  doctorName: string;
  licenseNo: string;
  initialSignatureSvg?: string;
  onSignatureCaptured: (svgString: string) => void;
  onClear?: () => void;
  className?: string;
}

export const DoctorCanvasSignaturePad: React.FC<DoctorCanvasSignaturePadProps> = ({
  doctorName,
  licenseNo,
  initialSignatureSvg,
  onSignatureCaptured,
  onClear,
  className = '',
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const [isDrawing, setIsDrawing] = useState<boolean>(false);
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const [currentStroke, setCurrentStroke] = useState<Point[]>([]);
  const [inkColor, setInkColor] = useState<string>('#1e3a8a'); // Medical Navy Blue
  const [strokeWidth, setStrokeWidth] = useState<number>(2.5);
  const [hasSignature, setHasSignature] = useState<boolean>(Boolean(initialSignatureSvg));
  const [capturedSvg, setCapturedSvg] = useState<string | null>(initialSignatureSvg || null);
  const [isEditingExisting, setIsEditingExisting] = useState<boolean>(!initialSignatureSvg);

  const CANVAS_WIDTH = 520;
  const CANVAS_HEIGHT = 160;

  // Convert raw drawn strokes into a clean SVG vector XML string
  const generateSvgFromStrokes = useCallback(
    (strokeList: Stroke[], width: number = CANVAS_WIDTH, height: number = CANVAS_HEIGHT): string => {
      if (strokeList.length === 0) return '';

      const paths = strokeList
        .map((stroke) => {
          if (stroke.points.length < 2) return '';
          const pts = stroke.points;
          let d = `M ${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)}`;

          for (let i = 1; i < pts.length; i++) {
            // Smooth quadratic curve approximation
            const xc = ((pts[i - 1].x + pts[i].x) / 2).toFixed(1);
            const yc = ((pts[i - 1].y + pts[i].y) / 2).toFixed(1);
            d += ` Q ${pts[i - 1].x.toFixed(1)} ${pts[i - 1].y.toFixed(1)}, ${xc} ${yc}`;
          }

          const last = pts[pts.length - 1];
          d += ` L ${last.x.toFixed(1)} ${last.y.toFixed(1)}`;

          return `<path d="${d}" fill="none" stroke="${stroke.color}" stroke-width="${stroke.width}" stroke-linecap="round" stroke-linejoin="round" />`;
        })
        .filter(Boolean)
        .join('\n  ');

      return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" width="100%" height="100%">
  ${paths}
</svg>`;
    },
    []
  );

  // Redraw canvas from recorded strokes
  const redrawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw baseline guideline
    ctx.save();
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(30, canvas.height - 35);
    ctx.lineTo(canvas.width - 30, canvas.height - 35);
    ctx.stroke();
    ctx.restore();

    // Render all completed strokes
    strokes.forEach((stroke) => {
      if (stroke.points.length < 2) return;
      ctx.save();
      ctx.strokeStyle = stroke.color;
      ctx.lineWidth = stroke.width;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(stroke.points[0].x, stroke.points[0].y);

      for (let i = 1; i < stroke.points.length; i++) {
        const xc = (stroke.points[i - 1].x + stroke.points[i].x) / 2;
        const yc = (stroke.points[i - 1].y + stroke.points[i].y) / 2;
        ctx.quadraticCurveTo(stroke.points[i - 1].x, stroke.points[i - 1].y, xc, yc);
      }

      ctx.stroke();
      ctx.restore();
    });

    // Render currently active stroke
    if (currentStroke.length > 1) {
      ctx.save();
      ctx.strokeStyle = inkColor;
      ctx.lineWidth = strokeWidth;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(currentStroke[0].x, currentStroke[0].y);

      for (let i = 1; i < currentStroke.length; i++) {
        const xc = (currentStroke[i - 1].x + currentStroke[i].x) / 2;
        const yc = (currentStroke[i - 1].y + currentStroke[i].y) / 2;
        ctx.quadraticCurveTo(currentStroke[i - 1].x, currentStroke[i - 1].y, xc, yc);
      }

      ctx.stroke();
      ctx.restore();
    }
  }, [strokes, currentStroke, inkColor, strokeWidth]);

  useEffect(() => {
    redrawCanvas();
  }, [redrawCanvas]);

  // Coordinate helper relative to canvas
  const getCoordinates = (e: React.MouseEvent | React.TouchEvent | React.PointerEvent): Point | null => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    let clientX = 0;
    let clientY = 0;

    if ('touches' in e && e.touches.length > 0) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else if ('clientX' in e) {
      clientX = (e as React.MouseEvent).clientX;
      clientY = (e as React.MouseEvent).clientY;
    } else {
      return null;
    }

    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
    };
  };

  // Drawing event handlers
  const startDrawing = (e: React.PointerEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const pt = getCoordinates(e);
    if (!pt) return;

    setIsDrawing(true);
    setCurrentStroke([pt]);
  };

  const draw = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    e.preventDefault();
    const pt = getCoordinates(e);
    if (!pt) return;

    setCurrentStroke((prev) => [...prev, pt]);
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);

    if (currentStroke.length > 1) {
      const newStroke: Stroke = {
        points: currentStroke,
        color: inkColor,
        width: strokeWidth,
      };
      const updatedStrokes = [...strokes, newStroke];
      setStrokes(updatedStrokes);
      setCurrentStroke([]);

      // Automatically generate vector SVG and notify parent
      const svgStr = generateSvgFromStrokes(updatedStrokes);
      setCapturedSvg(svgStr);
      setHasSignature(true);
      onSignatureCaptured(svgStr);
    } else {
      setCurrentStroke([]);
    }
  };

  // Actions
  const handleClear = () => {
    setStrokes([]);
    setCurrentStroke([]);
    setCapturedSvg(null);
    setHasSignature(false);
    setIsEditingExisting(true);
    if (onClear) onClear();
    onSignatureCaptured('');

    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
  };

  const handleUndo = () => {
    if (strokes.length === 0) return;
    const updated = strokes.slice(0, -1);
    setStrokes(updated);
    if (updated.length > 0) {
      const svgStr = generateSvgFromStrokes(updated);
      setCapturedSvg(svgStr);
      setHasSignature(true);
      onSignatureCaptured(svgStr);
    } else {
      setCapturedSvg(null);
      setHasSignature(false);
      onSignatureCaptured('');
    }
  };

  return (
    <div
      id="doctor-canvas-signature-container"
      ref={containerRef}
      className={`bg-slate-50 border border-slate-200 rounded-2xl p-3.5 sm:p-4 space-y-3 ${className}`}
    >
      {/* Header with Doctor Credentials */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-2.5">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-blue-100 text-blue-800">
            <FileSignature className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
              Doctor Attending Digital Signature
              <span className="text-[10px] font-mono font-semibold px-2 py-0.2 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                SVG Vector
              </span>
            </h4>
            <p className="text-[11px] text-slate-500 font-mono">
              Dr. {doctorName} • PMDC Reg: {licenseNo}
            </p>
          </div>
        </div>

        {/* Ink Palette & Controls */}
        {isEditingExisting && (
          <div className="flex items-center gap-2">
            {/* Color swatches */}
            <div className="flex items-center gap-1 bg-white p-1 rounded-lg border border-slate-200 shadow-2xs">
              {[
                { color: '#1e3a8a', label: 'Navy' },
                { color: '#0f172a', label: 'Black' },
                { color: '#065f46', label: 'Emerald' },
              ].map((c) => (
                <button
                  key={c.color}
                  type="button"
                  onClick={() => setInkColor(c.color)}
                  className={`w-5 h-5 rounded-md transition-transform cursor-pointer ${
                    inkColor === c.color ? 'scale-110 ring-2 ring-blue-500 ring-offset-1' : 'opacity-70 hover:opacity-100'
                  }`}
                  style={{ backgroundColor: c.color }}
                  title={`${c.label} Ink`}
                />
              ))}
            </div>

            {/* Undo */}
            <button
              type="button"
              onClick={handleUndo}
              disabled={strokes.length === 0}
              className="p-1.5 rounded-lg bg-white border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-colors"
              title="Undo last stroke"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>

            {/* Clear */}
            <button
              type="button"
              onClick={handleClear}
              className="p-1.5 rounded-lg bg-white border border-slate-200 text-slate-600 hover:text-rose-600 hover:bg-rose-50 cursor-pointer transition-colors"
              title="Clear signature pad"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Signature Canvas Area or Saved SVG Vector Preview */}
      {!isEditingExisting && capturedSvg ? (
        <div className="space-y-2">
          <div className="bg-white rounded-xl border border-blue-200 p-3 h-32 flex items-center justify-center relative overflow-hidden shadow-2xs">
            {/* Render the saved SVG string */}
            <div
              className="w-full h-full max-h-28 flex items-center justify-center pointer-events-none"
              dangerouslySetInnerHTML={{ __html: capturedSvg }}
            />
            <div className="absolute bottom-2 right-3 text-[10px] font-mono text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" />
              <span>Captured as Scalable SVG Vector</span>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-[11px] text-slate-500">
              Digitally sealed by attending clinician. Vector SVG stored in EHR record.
            </span>
            <button
              type="button"
              onClick={() => setIsEditingExisting(true)}
              className="px-3 py-1 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-bold transition-colors cursor-pointer"
            >
              Re-sign Signature
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="relative bg-white rounded-xl border-2 border-dashed border-slate-300 hover:border-blue-400 transition-colors overflow-hidden touch-none shadow-2xs">
            <canvas
              id="doctor-signature-canvas"
              ref={canvasRef}
              width={CANVAS_WIDTH}
              height={CANVAS_HEIGHT}
              onPointerDown={startDrawing}
              onPointerMove={draw}
              onPointerUp={stopDrawing}
              onPointerLeave={stopDrawing}
              className="w-full h-32 cursor-crosshair block"
              style={{ touchAction: 'none' }}
            />

            {!hasSignature && currentStroke.length === 0 && (
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-slate-400 gap-1 select-none">
                <PenTool className="w-5 h-5 text-slate-300" />
                <span className="text-xs font-medium">Draw signature here using mouse, stylus, or touch</span>
                <span className="text-[10px] text-slate-400">Sign above the dashed baseline guideline</span>
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
              <ShieldCheck className="w-3.5 h-3.5 text-blue-600" />
              <span>Vectorized automatically upon stroke completion into SVG string.</span>
            </div>

            {hasSignature && (
              <button
                type="button"
                onClick={() => setIsEditingExisting(false)}
                className="px-3 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-colors cursor-pointer flex items-center gap-1 shadow-2xs"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Confirm Signature</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
