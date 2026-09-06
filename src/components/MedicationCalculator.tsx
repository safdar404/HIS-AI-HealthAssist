import React, { useState, useEffect, useMemo } from 'react';
import {
  Calculator,
  Pill,
  Stethoscope,
  Plus,
  Trash2,
  Receipt,
  DollarSign,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Sparkles,
  ArrowRight,
  TrendingDown,
} from 'lucide-react';
import { resolveMedicationPrice } from '../utils/medicalBilling';
import {
  DrugContraindicationAlert,
  findDrugContraindication,
} from '../services/clinicalDrugApiService';

export interface CalculatedMedicationItem {
  id: string;
  drugName: string;
  dosage: string;
  frequency: string;
  durationDays: number;
  packUnits: number;
  unitPricePkr: number;
  totalCostPkr: number;
  isCustomPrice?: boolean;
}

interface MedicationCalculatorProps {
  prescribedDrugs: {
    drugName: string;
    dosage: string;
    frequency?: string;
    duration?: string;
    safetyChecksPassed?: boolean;
    safetyNotes?: string;
  }[];
  doctorProfessionalFee: number;
  onUpdateDoctorFee: (fee: number) => void;
  onAddPrescribedDrug?: (drugName: string, dosage: string) => void;
  onRemovePrescribedDrug?: (index: number) => void;
  onCalculatedSummaryChange?: (summary: {
    medicationsSubtotal: number;
    doctorFee: number;
    grossTotal: number;
    netPayable: number;
    items: CalculatedMedicationItem[];
  }) => void;
  currency?: string;
  contraindicationAlerts?: DrugContraindicationAlert[];
  onOpenInteractionChecker?: () => void;
}

const COMMON_FORMULARY_PRESETS = [
  { name: 'Amlodipine (Norvasc)', dosage: '5 mg OD', defaultPrice: 280 },
  { name: 'Atorvastatin (Lipitor)', dosage: '20 mg OD', defaultPrice: 650 },
  { name: 'Losartan (Cozaar)', dosage: '50 mg OD', defaultPrice: 420 },
  { name: 'Valsartan (Diovan)', dosage: '80 mg OD', defaultPrice: 750 },
  { name: 'Metformin (Glucophage)', dosage: '500 mg BD', defaultPrice: 320 },
  { name: 'Bisoprolol (Concor)', dosage: '5 mg OD', defaultPrice: 340 },
  { name: 'Empagliflozin (Jardiance)', dosage: '10 mg OD', defaultPrice: 1480 },
  { name: 'Sitagliptin (Januvia)', dosage: '50 mg OD', defaultPrice: 1150 },
  { name: 'Aspirin (Cardiprin)', dosage: '75 mg OD', defaultPrice: 90 },
  { name: 'Clopidogrel (Plavix)', dosage: '75 mg OD', defaultPrice: 680 },
  { name: 'Rosuvastatin (Crestor)', dosage: '10 mg OD', defaultPrice: 580 },
  { name: 'Omeprazole (Risek)', dosage: '20 mg OD', defaultPrice: 240 },
];

export const MedicationCalculator: React.FC<MedicationCalculatorProps> = ({
  prescribedDrugs,
  doctorProfessionalFee,
  onUpdateDoctorFee,
  onAddPrescribedDrug,
  onRemovePrescribedDrug,
  onCalculatedSummaryChange,
  currency = 'PKR',
  contraindicationAlerts = [],
  onOpenInteractionChecker,
}) => {
  // Custom unit prices mapped by drug name
  const [customUnitPrices, setCustomUnitPrices] = useState<Record<string, number>>({});
  // Quantities mapped by drug index
  const [itemQuantities, setItemQuantities] = useState<Record<string, number>>({});
  // Quick-Add selection
  const [selectedQuickPreset, setSelectedQuickPreset] = useState<string>('');
  // Subsidy percentage discount (e.g. 25% Sehat Sahulat default)
  const [subsidyPercent, setSubsidyPercent] = useState<number>(20);
  // Track expanded contraindication notes
  const [expandedContraindications, setExpandedContraindications] = useState<Record<string, boolean>>({});

  // Compute calculated list of items
  const calculatedItems: CalculatedMedicationItem[] = useMemo(() => {
    return prescribedDrugs.map((rx, idx) => {
      const id = `${rx.drugName}_${idx}`;
      const defaultUnit = resolveMedicationPrice(rx.drugName);
      const unitPricePkr = customUnitPrices[id] !== undefined ? customUnitPrices[id] : defaultUnit;
      const packUnits = itemQuantities[id] !== undefined ? itemQuantities[id] : 1;

      // Parse duration if possible
      let durationDays = 30;
      if (rx.duration) {
        const match = rx.duration.match(/(\d+)/);
        if (match) durationDays = parseInt(match[1], 10);
      }

      const totalCostPkr = Math.max(0, unitPricePkr * packUnits);

      return {
        id,
        drugName: rx.drugName,
        dosage: rx.dosage,
        frequency: rx.frequency || 'Once Daily',
        durationDays,
        packUnits,
        unitPricePkr,
        totalCostPkr,
        isCustomPrice: customUnitPrices[id] !== undefined,
      };
    });
  }, [prescribedDrugs, customUnitPrices, itemQuantities]);

  const medicationsSubtotal = useMemo(() => {
    return calculatedItems.reduce((acc, curr) => acc + curr.totalCostPkr, 0);
  }, [calculatedItems]);

  const grossTotal = useMemo(() => {
    return medicationsSubtotal + (Number(doctorProfessionalFee) || 0);
  }, [medicationsSubtotal, doctorProfessionalFee]);

  const subsidyDiscountAmount = useMemo(() => {
    return Math.round((grossTotal * subsidyPercent) / 100);
  }, [grossTotal, subsidyPercent]);

  const netPayable = useMemo(() => {
    return Math.max(0, grossTotal - subsidyDiscountAmount);
  }, [grossTotal, subsidyDiscountAmount]);

  // Sync with parent when calculated values change
  useEffect(() => {
    if (onCalculatedSummaryChange) {
      onCalculatedSummaryChange({
        medicationsSubtotal,
        doctorFee: doctorProfessionalFee,
        grossTotal,
        netPayable,
        items: calculatedItems,
      });
    }
  }, [medicationsSubtotal, doctorProfessionalFee, grossTotal, netPayable, calculatedItems, onCalculatedSummaryChange]);

  const handleUpdatePrice = (id: string, price: number) => {
    setCustomUnitPrices((prev) => ({
      ...prev,
      [id]: Math.max(0, price),
    }));
  };

  const handleUpdateQuantity = (id: string, qty: number) => {
    setItemQuantities((prev) => ({
      ...prev,
      [id]: Math.max(1, qty),
    }));
  };

  const handleQuickAddPreset = () => {
    if (!selectedQuickPreset) return;
    const preset = COMMON_FORMULARY_PRESETS.find((p) => p.name === selectedQuickPreset);
    if (preset && onAddPrescribedDrug) {
      onAddPrescribedDrug(preset.name, preset.dosage);
      setSelectedQuickPreset('');
    }
  };

  // Find all contraindications that apply to the currently calculated items
  const activeBillContraindications = useMemo(() => {
    return calculatedItems
      .map((item) => findDrugContraindication(item.drugName, contraindicationAlerts))
      .filter(Boolean) as DrugContraindicationAlert[];
  }, [calculatedItems, contraindicationAlerts]);

  const toggleContraindication = (id: string) => {
    setExpandedContraindications((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  return (
    <div className="bg-slate-900 text-white rounded-2xl border border-slate-800 p-4 sm:p-5 shadow-xl space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-cyan-500/20 text-cyan-400">
            <Calculator className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              Medication Cost Calculator & Billing Engine
              <span className="text-[10px] font-mono font-bold bg-cyan-950 text-cyan-300 px-2 py-0.5 rounded-full border border-cyan-800">
                LIVE PKR PRICING
              </span>
            </h3>
            <p className="text-[11px] text-slate-400">
              Auto-calculates pharmacy prescription totals and merges Doctor Professional Fees
            </p>
          </div>
        </div>

        {/* Grand Total Quick Badge */}
        <div className="text-right">
          <span className="text-[10px] uppercase tracking-wider text-slate-400 block font-semibold">
            Combined Total Due
          </span>
          <span className="text-base sm:text-lg font-black font-mono text-emerald-400">
            {currency} {netPayable.toLocaleString()}
          </span>
        </div>
      </div>

      {/* Contraindication Alert Banner in Medication Bill */}
      {activeBillContraindications.length > 0 && (
        <div className="bg-rose-950/80 border border-rose-500 rounded-xl p-3 flex flex-wrap items-center justify-between gap-3 text-xs text-rose-200 shadow-lg">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-rose-600 text-white animate-pulse">
              <AlertCircle className="w-4 h-4" />
            </div>
            <div>
              <span className="font-bold text-white block">
                Potential Contraindications Flagged in Medication Bill ({activeBillContraindications.length} Alert{activeBillContraindications.length > 1 ? 's' : ''})
              </span>
              <span className="text-[11px] text-rose-300">
                Prescriptions below conflict with documented patient history, kidney labs, or concurrent regimen.
              </span>
            </div>
          </div>
          {onOpenInteractionChecker && (
            <button
              type="button"
              onClick={onOpenInteractionChecker}
              className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shrink-0 cursor-pointer transition-colors shadow-xs"
            >
              Open API Checker
            </button>
          )}
        </div>
      )}

      {/* Itemized Prescribed Drug Pricing Table / Cards */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between text-xs text-slate-300 font-semibold px-1">
          <span className="flex items-center gap-1.5">
            <Pill className="w-3.5 h-3.5 text-cyan-400" />
            Active Prescriptions ({calculatedItems.length})
          </span>
          <span className="text-[11px] text-slate-400">
            Subtotal: <strong className="text-white font-mono">{currency} {medicationsSubtotal.toLocaleString()}</strong>
          </span>
        </div>

        {calculatedItems.length === 0 ? (
          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 text-center text-xs text-slate-400">
            No medications currently prescribed. Select a drug above or use the quick preset dropdown below to compute unit costs.
          </div>
        ) : (
          <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
            {calculatedItems.map((item, idx) => {
              const conflict = findDrugContraindication(item.drugName, contraindicationAlerts);
              const isExpandedConflict = expandedContraindications[item.id];

              return (
                <div
                  key={item.id}
                  className={`p-3 rounded-xl border transition-all text-xs space-y-2 ${
                    conflict
                      ? conflict.severity === 'CONTRAINDICATED'
                        ? 'bg-rose-950/40 border-rose-500/80 ring-1 ring-rose-500/40'
                        : 'bg-amber-950/40 border-amber-500/80 ring-1 ring-amber-500/40'
                      : 'bg-slate-950/80 border-slate-800'
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    {/* Drug Name & Dosage */}
                    <div className="min-w-[160px] flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-white">{item.drugName}</span>
                        <span className="text-[10px] font-mono text-cyan-300 bg-cyan-950 px-1.5 py-0.2 rounded border border-cyan-800/80">
                          {item.dosage}
                        </span>

                        {/* Contraindication Pill in the Bill */}
                        {conflict && (
                          <button
                            type="button"
                            onClick={() => toggleContraindication(item.id)}
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full border cursor-pointer flex items-center gap-1 transition-all ${
                              conflict.severity === 'CONTRAINDICATED'
                                ? 'bg-rose-600 text-white border-rose-400 hover:bg-rose-500'
                                : 'bg-amber-600 text-white border-amber-400 hover:bg-amber-500'
                            }`}
                          >
                            <AlertCircle className="w-3 h-3" />
                            <span>
                              {conflict.severity === 'CONTRAINDICATED' ? 'CONTRAINDICATION' : 'SAFETY WARNING'}
                            </span>
                          </button>
                        )}
                      </div>
                      <span className="text-[10px] text-slate-400 block mt-0.5">
                        Course: {item.durationDays} Days • {item.frequency}
                      </span>
                    </div>

                    {/* Pricing & Quantity Inputs */}
                    <div className="flex items-center gap-3">
                      {/* Packs / Quantity */}
                      <div className="flex items-center gap-1">
                        <label className="text-[10px] text-slate-400">Qty:</label>
                        <input
                          type="number"
                          min={1}
                          max={12}
                          value={item.packUnits}
                          onChange={(e) => handleUpdateQuantity(item.id, parseInt(e.target.value, 10) || 1)}
                          className="w-12 bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-center text-xs font-mono text-white focus:ring-1 focus:ring-cyan-500 focus:outline-none"
                        />
                      </div>

                      {/* Unit Price */}
                      <div className="flex items-center gap-1">
                        <label className="text-[10px] text-slate-400">Unit ({currency}):</label>
                        <input
                          type="number"
                          min={0}
                          value={item.unitPricePkr}
                          onChange={(e) => handleUpdatePrice(item.id, parseFloat(e.target.value) || 0)}
                          className="w-20 bg-slate-900 border border-slate-700 rounded-lg px-2 py-1 text-right text-xs font-mono text-cyan-400 focus:ring-1 focus:ring-cyan-500 focus:outline-none"
                        />
                      </div>

                      {/* Line Item Total */}
                      <div className="w-20 text-right font-mono font-bold text-emerald-400">
                        {currency} {item.totalCostPkr.toLocaleString()}
                      </div>

                      {/* Delete Item */}
                      {onRemovePrescribedDrug && (
                        <button
                          type="button"
                          onClick={() => onRemovePrescribedDrug(idx)}
                          className="p-1 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-slate-900 transition-colors cursor-pointer"
                          title="Remove prescription"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Expandable Contraindication Details in Medication Bill */}
                  {conflict && (isExpandedConflict || activeBillContraindications.length <= 2) && (
                    <div className="pt-2 border-t border-rose-500/30 text-[11px] space-y-1 bg-black/20 p-2.5 rounded-lg">
                      <div className="flex items-start justify-between gap-2">
                        <div className="text-rose-200 font-semibold flex items-center gap-1">
                          <span>⚠️ {conflict.title}</span>
                          <span className="text-[10px] font-mono text-slate-400">
                            ({conflict.evidenceSource})
                          </span>
                        </div>
                        <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-rose-900/60 text-rose-300 border border-rose-700">
                          {conflict.conflictCategory}
                        </span>
                      </div>
                      <p className="text-slate-300">
                        <strong>Conflicting With:</strong> {conflict.conflictingWith}
                      </p>
                      <p className="text-slate-300">
                        <strong>Clinical Danger:</strong> {conflict.clinicalRisk}
                      </p>
                      <p className="text-amber-300 font-medium">
                        <strong>Recommendation:</strong> {conflict.recommendation}
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Quick Formulary Preset Selector */}
        {onAddPrescribedDrug && (
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <select
              value={selectedQuickPreset}
              onChange={(e) => setSelectedQuickPreset(e.target.value)}
              className="flex-1 min-w-[200px] bg-slate-950 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-200 focus:ring-2 focus:ring-cyan-500 focus:outline-none cursor-pointer"
            >
              <option value="">-- Quick-Add Standard Essential Medicine from Formulary --</option>
              {COMMON_FORMULARY_PRESETS.map((p) => (
                <option key={p.name} value={p.name}>
                  {p.name} ({p.dosage}) - Est. {currency} {p.defaultPrice}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={handleQuickAddPreset}
              disabled={!selectedQuickPreset}
              className="px-3.5 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add & Price</span>
            </button>
          </div>
        )}
      </div>

      {/* Doctor Professional Fee & Subsidy Section */}
      <div className="pt-2 border-t border-slate-800 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Doctor Professional Fee Input */}
          <div className="bg-slate-950/90 p-3.5 rounded-xl border border-slate-800 space-y-2">
            <label className="block text-xs font-bold text-slate-200 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Stethoscope className="w-4 h-4 text-emerald-400" />
                Doctor Professional Fee:
              </span>
              <span className="text-[10px] font-mono text-emerald-400 font-bold">
                {currency} {Number(doctorProfessionalFee || 0).toLocaleString()}
              </span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-xs font-mono text-slate-500">
                {currency}
              </span>
              <input
                id="input-doctor-professional-fee"
                type="number"
                min={0}
                step={100}
                value={doctorProfessionalFee}
                onChange={(e) => onUpdateDoctorFee(Math.max(0, parseFloat(e.target.value) || 0))}
                className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-12 pr-3 py-2 text-sm font-mono font-bold text-white focus:ring-2 focus:ring-cyan-500 focus:outline-none"
                placeholder="1500"
              />
            </div>

            {/* Quick Presets */}
            <div className="flex flex-wrap items-center gap-1 pt-0.5">
              {[
                { label: 'OPD (1,000)', val: 1000 },
                { label: 'Specialist (1,500)', val: 1500 },
                { label: 'Senior (2,500)', val: 2500 },
                { label: 'Emergency (3,500)', val: 3500 },
              ].map((p) => (
                <button
                  key={p.val}
                  type="button"
                  onClick={() => onUpdateDoctorFee(p.val)}
                  className={`px-2 py-0.5 rounded text-[10px] font-bold transition-all cursor-pointer ${
                    doctorProfessionalFee === p.val
                      ? 'bg-emerald-500 text-slate-950 shadow'
                      : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Welfare Subsidy Discount Adjustment */}
          <div className="bg-slate-950/90 p-3.5 rounded-xl border border-slate-800 space-y-2">
            <div className="flex items-center justify-between text-xs font-bold text-slate-200">
              <span className="flex items-center gap-1.5">
                <TrendingDown className="w-4 h-4 text-cyan-400" />
                Sehat Sahulat / Welfare Subsidy:
              </span>
              <span className="text-[10px] font-mono text-cyan-400 font-bold">
                -{subsidyPercent}% (-{currency} {subsidyDiscountAmount.toLocaleString()})
              </span>
            </div>
            <div className="flex items-center gap-2 pt-1">
              <input
                type="range"
                min={0}
                max={100}
                step={5}
                value={subsidyPercent}
                onChange={(e) => setSubsidyPercent(parseInt(e.target.value, 10))}
                className="w-full accent-cyan-500 cursor-pointer"
              />
              <span className="text-xs font-mono font-bold text-cyan-400 w-10 text-right">
                {subsidyPercent}%
              </span>
            </div>
            <p className="text-[10px] text-slate-400 leading-tight">
              Applies universal healthcare co-pay discount to eligible low-income patients.
            </p>
          </div>
        </div>

        {/* Live Calculation Summary Banner */}
        <div className="bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 p-3.5 rounded-xl border border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div className="space-y-0.5">
            <div className="flex items-center gap-2 text-xs">
              <span className="text-slate-400">Medications:</span>
              <span className="font-mono text-slate-200 font-semibold">{currency} {medicationsSubtotal.toLocaleString()}</span>
              <span className="text-slate-500">•</span>
              <span className="text-slate-400">Doctor Fee:</span>
              <span className="font-mono text-slate-200 font-semibold">{currency} {Number(doctorProfessionalFee || 0).toLocaleString()}</span>
              {subsidyDiscountAmount > 0 && (
                <>
                  <span className="text-slate-500">•</span>
                  <span className="text-cyan-400 font-mono">Welfare: -{currency} {subsidyDiscountAmount.toLocaleString()}</span>
                </>
              )}
            </div>
            <span className="text-[10px] text-slate-500 block">
              Auto-syncs directly into official clinical assessment & print invoice
            </span>
          </div>

          <div className="flex items-center gap-2">
            <div className="text-right">
              <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Net Patient Due</span>
              <span className="text-base font-black font-mono text-emerald-400">
                {currency} {netPayable.toLocaleString()}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
