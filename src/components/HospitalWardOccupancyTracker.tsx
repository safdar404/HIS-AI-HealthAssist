import React, { useState, useMemo } from 'react';
import {
  Bed,
  Building2,
  Users,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Sparkles,
  RefreshCw,
  Search,
  Filter,
  UserCheck,
  UserPlus,
  LogOut,
  Trash2,
  Heart,
  Activity,
  ShieldAlert,
  Flame,
  ArrowRight,
  Printer,
  ChevronRight,
  Info,
  Check,
  Stethoscope,
} from 'lucide-react';
import { PatientAssessmentRecord } from '../types/clinical';
import { HospitalFacility, ClinicianProfile } from '../services/clinicalProfileSyncService';

export type BedStatus = 'OCCUPIED' | 'DISCHARGED' | 'PENDING_CLEANING' | 'AVAILABLE';

export interface WardBed {
  id: string;
  bedNumber: string;
  wardName: string;
  wardCategory: 'ICU_CCU' | 'EMERGENCY_ZONE' | 'CARDIOLOGY_STEPDOWN' | 'GENERAL_MEDICAL';
  status: BedStatus;
  patient?: {
    patientId: string;
    mrn: string;
    name: string;
    age: number;
    gender: 'M' | 'F';
    diagnosis: string;
    triageLevel: string;
    admittedAt: string;
    attendingDoctor: string;
    vitals: {
      bp: string;
      hr: number;
      spo2: number;
      temp: number;
    };
    oxygenSupport?: string;
  };
  cleaningStartedAt?: string;
  cleaningEstimatedMinutes?: number;
  lastDisinfectedAt?: string;
}

interface HospitalWardOccupancyTrackerProps {
  currentFacility: HospitalFacility;
  activeDoctor: ClinicianProfile;
  currentRecord?: PatientAssessmentRecord | null;
  assessments?: PatientAssessmentRecord[];
  onSelectPatient?: (patientId: string) => void;
  onBackToDossier?: () => void;
}

// Initial Mock Ward Template seeded realistically for Pakistani Tertiary Hospitals
const generateInitialFacilityBeds = (facility: HospitalFacility, assessments: PatientAssessmentRecord[] = []): WardBed[] => {
  const beds: WardBed[] = [];

  const getPatientGender = (p: PatientAssessmentRecord): 'M' | 'F' => {
    return p.demographics.sex === 'FEMALE' ? 'F' : 'M';
  };

  // ICU / CCU Wards (4 Beds)
  for (let i = 1; i <= 4; i++) {
    const bedNum = `ICU-${i.toString().padStart(2, '0')}`;
    const pRecord = assessments[i - 1];

    if (i <= 2 && pRecord) {
      beds.push({
        id: `bed-${facility.id}-${bedNum}`,
        bedNumber: bedNum,
        wardName: 'Critical Intensive Care (ICU/CCU)',
        wardCategory: 'ICU_CCU',
        status: 'OCCUPIED',
        patient: {
          patientId: pRecord.demographics.patientId,
          mrn: pRecord.demographics.mrn || `MRN-902${i}`,
          name: pRecord.demographics.fullName,
          age: pRecord.demographics.age,
          gender: getPatientGender(pRecord),
          diagnosis: pRecord.doctorReview?.doctorDiagnosis || pRecord.assessmentResult?.triage.summary || 'Acute Coronary Syndrome',
          triageLevel: pRecord.assessmentResult?.triage.level || 'LEVEL_1_EMERGENCY',
          admittedAt: 'Today, 04:30 AM',
          attendingDoctor: pRecord.doctorReview?.doctorName || 'Dr. Asim Farooq',
          vitals: {
            bp: `${pRecord.vitals.systolicBp || 165}/${pRecord.vitals.diastolicBp || 102}`,
            hr: pRecord.vitals.heartRate || 98,
            spo2: pRecord.vitals.oxygenSaturation || 92,
            temp: pRecord.vitals.temperatureC || 37.1,
          },
          oxygenSupport: 'High-Flow Nasal Cannula (6 L/min)',
        },
      });
    } else if (i === 3) {
      beds.push({
        id: `bed-${facility.id}-${bedNum}`,
        bedNumber: bedNum,
        wardName: 'Critical Intensive Care (ICU/CCU)',
        wardCategory: 'ICU_CCU',
        status: 'PENDING_CLEANING',
        cleaningStartedAt: '15 mins ago',
        cleaningEstimatedMinutes: 20,
        lastDisinfectedAt: 'Yesterday 22:00',
      });
    } else {
      beds.push({
        id: `bed-${facility.id}-${bedNum}`,
        bedNumber: bedNum,
        wardName: 'Critical Intensive Care (ICU/CCU)',
        wardCategory: 'ICU_CCU',
        status: 'AVAILABLE',
        lastDisinfectedAt: 'Today 06:00 AM',
      });
    }
  }

  // Emergency Red & Yellow Trauma Zone (6 Beds)
  for (let i = 1; i <= 6; i++) {
    const bedNum = `ER-${i.toString().padStart(2, '0')}`;
    const pRecord = assessments[i + 1];

    if (i === 1 && pRecord) {
      beds.push({
        id: `bed-${facility.id}-${bedNum}`,
        bedNumber: bedNum,
        wardName: 'Emergency Trauma & Resuscitation (Red Zone)',
        wardCategory: 'EMERGENCY_ZONE',
        status: 'OCCUPIED',
        patient: {
          patientId: pRecord.demographics.patientId,
          mrn: pRecord.demographics.mrn || `MRN-811${i}`,
          name: pRecord.demographics.fullName,
          age: pRecord.demographics.age,
          gender: getPatientGender(pRecord),
          diagnosis: 'Hypertensive Emergency & Severe Cephalea',
          triageLevel: 'LEVEL_1_EMERGENCY',
          admittedAt: 'Today, 06:15 AM',
          attendingDoctor: 'Dr. Maryam Siddiqui',
          vitals: {
            bp: `${pRecord.vitals.systolicBp || 190}/${pRecord.vitals.diastolicBp || 118}`,
            hr: pRecord.vitals.heartRate || 104,
            spo2: pRecord.vitals.oxygenSaturation || 96,
            temp: pRecord.vitals.temperatureC || 36.8,
          },
          oxygenSupport: 'Room Air',
        },
      });
    } else if (i === 2) {
      beds.push({
        id: `bed-${facility.id}-${bedNum}`,
        bedNumber: bedNum,
        wardName: 'Emergency Trauma & Resuscitation (Red Zone)',
        wardCategory: 'EMERGENCY_ZONE',
        status: 'DISCHARGED',
        patient: {
          patientId: 'PAT-DISCH-01',
          mrn: 'MRN-78401',
          name: 'Bashir Ahmed',
          age: 58,
          gender: 'M',
          diagnosis: 'Transient Ischemic Attack (Stabilized)',
          triageLevel: 'LEVEL_2_URGENT',
          admittedAt: 'Yesterday 18:00',
          attendingDoctor: 'Dr. Maryam Siddiqui',
          vitals: { bp: '130/84', hr: 72, spo2: 98, temp: 36.6 },
        },
      });
    } else if (i === 3) {
      beds.push({
        id: `bed-${facility.id}-${bedNum}`,
        bedNumber: bedNum,
        wardName: 'Emergency Trauma & Resuscitation (Red Zone)',
        wardCategory: 'EMERGENCY_ZONE',
        status: 'PENDING_CLEANING',
        cleaningStartedAt: '8 mins ago',
        cleaningEstimatedMinutes: 15,
        lastDisinfectedAt: 'Today 05:30 AM',
      });
    } else if (i === 4 && assessments[4]) {
      const p = assessments[4];
      beds.push({
        id: `bed-${facility.id}-${bedNum}`,
        bedNumber: bedNum,
        wardName: 'Emergency Trauma & Resuscitation (Red Zone)',
        wardCategory: 'EMERGENCY_ZONE',
        status: 'OCCUPIED',
        patient: {
          patientId: p.demographics.patientId,
          mrn: p.demographics.mrn || 'MRN-60912',
          name: p.demographics.fullName,
          age: p.demographics.age,
          gender: getPatientGender(p),
          diagnosis: 'Decompensated Heart Failure (NYHA Class III)',
          triageLevel: 'LEVEL_2_URGENT',
          admittedAt: 'Today, 02:45 AM',
          attendingDoctor: 'Prof. Dr. Haroon Babar',
          vitals: {
            bp: `${p.vitals.systolicBp || 148}/${p.vitals.diastolicBp || 94}`,
            hr: p.vitals.heartRate || 88,
            spo2: p.vitals.oxygenSaturation || 94,
            temp: p.vitals.temperatureC || 36.9,
          },
          oxygenSupport: 'Nasal Cannula (2 L/min)',
        },
      });
    } else {
      beds.push({
        id: `bed-${facility.id}-${bedNum}`,
        bedNumber: bedNum,
        wardName: 'Emergency Trauma & Resuscitation (Red Zone)',
        wardCategory: 'EMERGENCY_ZONE',
        status: 'AVAILABLE',
        lastDisinfectedAt: 'Today 07:15 AM',
      });
    }
  }

  // Cardiology Step-Down Ward (6 Beds)
  for (let i = 1; i <= 6; i++) {
    const bedNum = `CSD-${i.toString().padStart(2, '0')}`;
    const pRecord = assessments[i + 4];

    if (i <= 3 && pRecord) {
      beds.push({
        id: `bed-${facility.id}-${bedNum}`,
        bedNumber: bedNum,
        wardName: 'Cardiology Step-Down Ward',
        wardCategory: 'CARDIOLOGY_STEPDOWN',
        status: 'OCCUPIED',
        patient: {
          patientId: pRecord.demographics.patientId,
          mrn: pRecord.demographics.mrn || `MRN-554${i}`,
          name: pRecord.demographics.fullName,
          age: pRecord.demographics.age,
          gender: getPatientGender(pRecord),
          diagnosis: 'Post-PCI Stent Surveillance / Antihypertensive Titration',
          triageLevel: 'LEVEL_3_PRIORITY',
          admittedAt: '2 days ago',
          attendingDoctor: 'Dr. Asim Farooq',
          vitals: {
            bp: `${pRecord.vitals.systolicBp || 135}/${pRecord.vitals.diastolicBp || 86}`,
            hr: pRecord.vitals.heartRate || 74,
            spo2: pRecord.vitals.oxygenSaturation || 97,
            temp: pRecord.vitals.temperatureC || 36.7,
          },
        },
      });
    } else if (i === 4) {
      beds.push({
        id: `bed-${facility.id}-${bedNum}`,
        bedNumber: bedNum,
        wardName: 'Cardiology Step-Down Ward',
        wardCategory: 'CARDIOLOGY_STEPDOWN',
        status: 'DISCHARGED',
        patient: {
          patientId: 'PAT-DISCH-02',
          mrn: 'MRN-43920',
          name: 'Kulsoom Bibi',
          age: 62,
          gender: 'F',
          diagnosis: 'Uncontrolled Essential HTN (Titrated to Target)',
          triageLevel: 'LEVEL_3_PRIORITY',
          admittedAt: '3 days ago',
          attendingDoctor: 'Dr. Asim Farooq',
          vitals: { bp: '128/82', hr: 68, spo2: 99, temp: 36.6 },
        },
      });
    } else {
      beds.push({
        id: `bed-${facility.id}-${bedNum}`,
        bedNumber: bedNum,
        wardName: 'Cardiology Step-Down Ward',
        wardCategory: 'CARDIOLOGY_STEPDOWN',
        status: 'AVAILABLE',
        lastDisinfectedAt: 'Today 04:00 AM',
      });
    }
  }

  // General Medical Ward (8 Beds)
  for (let i = 1; i <= 8; i++) {
    const bedNum = `MED-${i.toString().padStart(2, '0')}`;
    const pRecord = assessments[i + 7];

    if (i <= 4 && pRecord) {
      beds.push({
        id: `bed-${facility.id}-${bedNum}`,
        bedNumber: bedNum,
        wardName: 'General Internal Medicine Ward',
        wardCategory: 'GENERAL_MEDICAL',
        status: 'OCCUPIED',
        patient: {
          patientId: pRecord.demographics.patientId,
          mrn: pRecord.demographics.mrn || `MRN-331${i}`,
          name: pRecord.demographics.fullName,
          age: pRecord.demographics.age,
          gender: getPatientGender(pRecord),
          diagnosis: 'Type 2 Diabetes Mellitus with Microalbuminuria',
          triageLevel: 'LEVEL_4_ROUTINE',
          admittedAt: '1 day ago',
          attendingDoctor: 'Prof. Dr. Haroon Babar',
          vitals: {
            bp: `${pRecord.vitals.systolicBp || 132}/${pRecord.vitals.diastolicBp || 84}`,
            hr: pRecord.vitals.heartRate || 76,
            spo2: pRecord.vitals.oxygenSaturation || 98,
            temp: pRecord.vitals.temperatureC || 36.8,
          },
        },
      });
    } else if (i === 5) {
      beds.push({
        id: `bed-${facility.id}-${bedNum}`,
        bedNumber: bedNum,
        wardName: 'General Internal Medicine Ward',
        wardCategory: 'GENERAL_MEDICAL',
        status: 'PENDING_CLEANING',
        cleaningStartedAt: '5 mins ago',
        cleaningEstimatedMinutes: 10,
        lastDisinfectedAt: 'Yesterday 20:00',
      });
    } else {
      beds.push({
        id: `bed-${facility.id}-${bedNum}`,
        bedNumber: bedNum,
        wardName: 'General Internal Medicine Ward',
        wardCategory: 'GENERAL_MEDICAL',
        status: 'AVAILABLE',
        lastDisinfectedAt: 'Today 06:30 AM',
      });
    }
  }

  return beds;
};

export const HospitalWardOccupancyTracker: React.FC<HospitalWardOccupancyTrackerProps> = ({
  currentFacility,
  activeDoctor,
  currentRecord,
  assessments = [],
  onSelectPatient,
  onBackToDossier,
}) => {
  const [beds, setBeds] = useState<WardBed[]>(() =>
    generateInitialFacilityBeds(currentFacility, assessments)
  );
  const [selectedWardCategory, setSelectedWardCategory] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedBed, setSelectedBed] = useState<WardBed | null>(null);
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);

  // Compute Live Statistics
  const totalBeds = beds.length;
  const occupiedBeds = beds.filter((b) => b.status === 'OCCUPIED').length;
  const dischargedBeds = beds.filter((b) => b.status === 'DISCHARGED').length;
  const pendingCleaningBeds = beds.filter((b) => b.status === 'PENDING_CLEANING').length;
  const availableBeds = beds.filter((b) => b.status === 'AVAILABLE').length;

  const occupancyRate = totalBeds > 0 ? Math.round((occupiedBeds / totalBeds) * 100) : 0;
  const icuBeds = beds.filter((b) => b.wardCategory === 'ICU_CCU');
  const icuOccupied = icuBeds.filter((b) => b.status === 'OCCUPIED').length;
  const icuOccupancyRate = icuBeds.length > 0 ? Math.round((icuOccupied / icuBeds.length) * 100) : 0;

  // Filtered list
  const filteredBeds = useMemo(() => {
    return beds.filter((bed) => {
      const matchCategory = selectedWardCategory === 'ALL' || bed.wardCategory === selectedWardCategory;
      const matchStatus = statusFilter === 'ALL' || bed.status === statusFilter;
      const matchSearch =
        searchQuery === '' ||
        bed.bedNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        bed.patient?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        bed.patient?.mrn.toLowerCase().includes(searchQuery.toLowerCase()) ||
        bed.patient?.diagnosis.toLowerCase().includes(searchQuery.toLowerCase());
      return matchCategory && matchStatus && matchSearch;
    });
  }, [beds, selectedWardCategory, statusFilter, searchQuery]);

  // Group beds by category for clear architectural layout
  const groupedBeds = useMemo(() => {
    const groups: { [key: string]: { title: string; category: string; beds: WardBed[] } } = {
      ICU_CCU: { title: 'Critical Intensive Care (ICU / CCU)', category: 'ICU_CCU', beds: [] },
      EMERGENCY_ZONE: { title: 'Emergency Trauma & Resuscitation (Red & Yellow Zones)', category: 'EMERGENCY_ZONE', beds: [] },
      CARDIOLOGY_STEPDOWN: { title: 'Cardiology Step-Down & Telemetry Ward', category: 'CARDIOLOGY_STEPDOWN', beds: [] },
      GENERAL_MEDICAL: { title: 'General Internal Medicine Ward', category: 'GENERAL_MEDICAL', beds: [] },
    };

    filteredBeds.forEach((bed) => {
      if (groups[bed.wardCategory]) {
        groups[bed.wardCategory].beds.push(bed);
      }
    });

    return Object.values(groups).filter((g) => g.beds.length > 0);
  }, [filteredBeds]);

  // Bed Status Mutation Handlers
  const handleUpdateBedStatus = (bedId: string, newStatus: BedStatus) => {
    setBeds((prev) =>
      prev.map((b) => {
        if (b.id === bedId) {
          if (newStatus === 'AVAILABLE') {
            return {
              ...b,
              status: newStatus,
              patient: undefined,
              cleaningStartedAt: undefined,
              cleaningEstimatedMinutes: undefined,
              lastDisinfectedAt: `Today, ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
            };
          } else if (newStatus === 'PENDING_CLEANING') {
            return {
              ...b,
              status: newStatus,
              cleaningStartedAt: 'Just now',
              cleaningEstimatedMinutes: 15,
            };
          } else if (newStatus === 'DISCHARGED') {
            return {
              ...b,
              status: newStatus,
            };
          }
          return { ...b, status: newStatus };
        }
        return b;
      })
    );

    const targetBed = beds.find((b) => b.id === bedId);
    setActionSuccessMsg(`Bed ${targetBed?.bedNumber} updated to status: ${newStatus}`);
    setTimeout(() => setActionSuccessMsg(null), 3000);
  };

  // Assign Current Patient from Active CDS Record
  const handleAssignCurrentPatientToBed = (bedId: string) => {
    if (!currentRecord) return;

    setBeds((prev) =>
      prev.map((b) => {
        if (b.id === bedId) {
          return {
            ...b,
            status: 'OCCUPIED',
            patient: {
              patientId: currentRecord.demographics.patientId,
              mrn: currentRecord.demographics.mrn || 'MRN-NEW-ADMIT',
              name: currentRecord.demographics.fullName,
              age: currentRecord.demographics.age,
              gender: currentRecord.demographics.sex === 'FEMALE' ? 'F' : 'M',
              diagnosis: currentRecord.doctorReview?.doctorDiagnosis || currentRecord.assessmentResult?.triage.summary || 'Clinical Admission',
              triageLevel: currentRecord.assessmentResult?.triage.level || 'LEVEL_2_URGENT',
              admittedAt: `Today, ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
              attendingDoctor: activeDoctor.name,
              vitals: {
                bp: `${currentRecord.vitals.systolicBp || 130}/${currentRecord.vitals.diastolicBp || 85}`,
                hr: currentRecord.vitals.heartRate || 75,
                spo2: currentRecord.vitals.oxygenSaturation || 98,
                temp: currentRecord.vitals.temperatureC || 36.8,
              },
              oxygenSupport: (currentRecord.vitals.oxygenSaturation || 98) < 94 ? 'Nasal Cannula (3 L/min)' : 'Room Air',
            },
          };
        }
        return b;
      })
    );

    const targetBed = beds.find((b) => b.id === bedId);
    setActionSuccessMsg(`Patient ${currentRecord.demographics.fullName} assigned to Bed ${targetBed?.bedNumber}!`);
    setTimeout(() => setActionSuccessMsg(null), 3500);
  };

  const getStatusBadgeStyle = (status: BedStatus) => {
    switch (status) {
      case 'OCCUPIED':
        return {
          bg: 'bg-rose-500/10 text-rose-700 border-rose-300',
          dot: 'bg-rose-500',
          cardBg: 'bg-white hover:border-rose-300 border-slate-200',
          headerBg: 'bg-rose-50 text-rose-900 border-rose-100',
          label: 'Occupied',
        };
      case 'DISCHARGED':
        return {
          bg: 'bg-emerald-500/10 text-emerald-700 border-emerald-300',
          dot: 'bg-emerald-500',
          cardBg: 'bg-white hover:border-emerald-300 border-slate-200',
          headerBg: 'bg-emerald-50 text-emerald-900 border-emerald-100',
          label: 'Discharged',
        };
      case 'PENDING_CLEANING':
        return {
          bg: 'bg-amber-500/10 text-amber-800 border-amber-300',
          dot: 'bg-amber-500 animate-ping',
          cardBg: 'bg-white hover:border-amber-300 border-slate-200',
          headerBg: 'bg-amber-50 text-amber-900 border-amber-100',
          label: 'Pending Cleaning',
        };
      case 'AVAILABLE':
        return {
          bg: 'bg-sky-500/10 text-sky-700 border-sky-300',
          dot: 'bg-sky-500',
          cardBg: 'bg-white hover:border-sky-300 border-slate-200',
          headerBg: 'bg-sky-50 text-sky-900 border-sky-100',
          label: 'Available',
        };
    }
  };

  return (
    <div className="space-y-6 font-sans">
      {/* 1. Facility Header & Quick Stats Ribbon */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-950 text-white rounded-3xl p-6 shadow-xl border border-slate-800">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="p-3 bg-cyan-500/20 border border-cyan-500/30 rounded-2xl text-cyan-400">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="bg-cyan-500/20 text-cyan-300 text-[10px] font-bold px-2 py-0.5 rounded-full border border-cyan-500/30">
                  {currentFacility.facilityType}
                </span>
                <span className="text-slate-400 text-xs">•</span>
                <span className="text-slate-300 text-xs font-mono">{currentFacility.district}, {currentFacility.province}</span>
              </div>
              <h2 className="text-xl font-black tracking-tight text-white mt-1 flex items-center gap-2">
                <span>{currentFacility.name} — Ward Bed Occupancy Tracker</span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Real-time visual layout of clinical beds, active patient telemetry, discharge departures, and sanitization queues.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {onBackToDossier && (
              <button
                type="button"
                onClick={onBackToDossier}
                className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border border-slate-700"
              >
                <span>Return to Clinical Dossier</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => window.print()}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border border-slate-700 no-print"
              title="Print Bed Census Sheet"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Census</span>
            </button>
          </div>
        </div>

        {/* Real-Time KPIs Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mt-6 pt-5 border-t border-slate-800">
          <div className="bg-slate-950/60 p-3 rounded-2xl border border-slate-800/80">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Ward Beds</div>
            <div className="text-xl font-black text-white font-mono mt-1">{totalBeds}</div>
            <div className="text-[10px] text-slate-400 mt-0.5">Facility Capacity</div>
          </div>

          <div className="bg-slate-950/60 p-3 rounded-2xl border border-slate-800/80">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Overall Occupancy</div>
            <div className="text-xl font-black text-cyan-400 font-mono mt-1">{occupancyRate}%</div>
            <div className="text-[10px] text-slate-400 mt-0.5">{occupiedBeds} / {totalBeds} Occupied</div>
          </div>

          <div className="bg-slate-950/60 p-3 rounded-2xl border border-slate-800/80">
            <div className="text-[10px] font-bold uppercase tracking-wider text-rose-400">Occupied Beds</div>
            <div className="text-xl font-black text-rose-400 font-mono mt-1">{occupiedBeds}</div>
            <div className="text-[10px] text-rose-300/80 mt-0.5">Active Admitted Patients</div>
          </div>

          <div className="bg-slate-950/60 p-3 rounded-2xl border border-slate-800/80">
            <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">Available Beds</div>
            <div className="text-xl font-black text-emerald-400 font-mono mt-1">{availableBeds}</div>
            <div className="text-[10px] text-emerald-300/80 mt-0.5">Ready for Admission</div>
          </div>

          <div className="bg-slate-950/60 p-3 rounded-2xl border border-slate-800/80">
            <div className="text-[10px] font-bold uppercase tracking-wider text-amber-400">Pending Cleaning</div>
            <div className="text-xl font-black text-amber-400 font-mono mt-1">{pendingCleaningBeds}</div>
            <div className="text-[10px] text-amber-300/80 mt-0.5">Disinfection Turnover</div>
          </div>

          <div className="bg-slate-950/60 p-3 rounded-2xl border border-slate-800/80">
            <div className="text-[10px] font-bold uppercase tracking-wider text-purple-400">ICU Acuity Load</div>
            <div className="text-xl font-black text-purple-400 font-mono mt-1">{icuOccupancyRate}%</div>
            <div className="text-[10px] text-purple-300/80 mt-0.5">{icuOccupied} of {icuBeds.length} ICU Beds</div>
          </div>
        </div>
      </div>

      {/* Action Notification Toast */}
      {actionSuccessMsg && (
        <div className="bg-emerald-50 border border-emerald-300 text-emerald-900 rounded-2xl p-3.5 flex items-center justify-between shadow-sm animate-fade-in">
          <div className="flex items-center gap-2 text-xs font-bold">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{actionSuccessMsg}</span>
          </div>
          <button
            onClick={() => setActionSuccessMsg(null)}
            className="text-xs text-emerald-700 hover:text-emerald-950 font-bold"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* 2. Filter & Navigation Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Ward Category Switcher */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
          <button
            onClick={() => setSelectedWardCategory('ALL')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
              selectedWardCategory === 'ALL'
                ? 'bg-slate-900 text-white shadow-sm'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            All Wards ({beds.length})
          </button>
          <button
            onClick={() => setSelectedWardCategory('ICU_CCU')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
              selectedWardCategory === 'ICU_CCU'
                ? 'bg-purple-700 text-white shadow-sm'
                : 'bg-purple-50 text-purple-700 hover:bg-purple-100'
            }`}
          >
            ICU / CCU (4)
          </button>
          <button
            onClick={() => setSelectedWardCategory('EMERGENCY_ZONE')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
              selectedWardCategory === 'EMERGENCY_ZONE'
                ? 'bg-rose-700 text-white shadow-sm'
                : 'bg-rose-50 text-rose-700 hover:bg-rose-100'
            }`}
          >
            Emergency Zone (6)
          </button>
          <button
            onClick={() => setSelectedWardCategory('CARDIOLOGY_STEPDOWN')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
              selectedWardCategory === 'CARDIOLOGY_STEPDOWN'
                ? 'bg-blue-700 text-white shadow-sm'
                : 'bg-blue-50 text-blue-700 hover:bg-blue-100'
            }`}
          >
            Cardiology Step-Down (6)
          </button>
          <button
            onClick={() => setSelectedWardCategory('GENERAL_MEDICAL')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer ${
              selectedWardCategory === 'GENERAL_MEDICAL'
                ? 'bg-teal-700 text-white shadow-sm'
                : 'bg-teal-50 text-teal-700 hover:bg-teal-100'
            }`}
          >
            General Medical (8)
          </button>
        </div>

        {/* Status Filter & Search */}
        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-slate-50 border border-slate-200 text-slate-700 rounded-xl px-2.5 py-1.5 text-xs font-bold focus:outline-none focus:ring-2 focus:ring-cyan-500 cursor-pointer"
          >
            <option value="ALL">All Statuses</option>
            <option value="OCCUPIED">Occupied Only ({occupiedBeds})</option>
            <option value="AVAILABLE">Available Only ({availableBeds})</option>
            <option value="DISCHARGED">Discharged ({dischargedBeds})</option>
            <option value="PENDING_CLEANING">Pending Cleaning ({pendingCleaningBeds})</option>
          </select>

          <div className="relative flex-1 sm:w-48">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search Bed / Patient..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 text-slate-800 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-cyan-500"
            />
          </div>
        </div>
      </div>

      {/* 3. Visual Ward Bed Layout Grid */}
      <div className="space-y-6">
        {groupedBeds.map((group) => (
          <div key={group.category} className="bg-slate-50/80 rounded-3xl border border-slate-200/80 p-5 space-y-4 shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2.5">
              <div className="flex items-center gap-2">
                <Bed className="w-4 h-4 text-slate-700" />
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">
                  {group.title}
                </h3>
                <span className="bg-slate-200 text-slate-700 text-[10px] font-bold px-2 py-0.5 rounded-full font-mono">
                  {group.beds.length} Beds
                </span>
              </div>

              <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
                <span>Occupied: <strong className="text-rose-600">{group.beds.filter((b) => b.status === 'OCCUPIED').length}</strong></span>
                <span>•</span>
                <span>Available: <strong className="text-sky-600">{group.beds.filter((b) => b.status === 'AVAILABLE').length}</strong></span>
              </div>
            </div>

            {/* Beds Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5">
              {group.beds.map((bed) => {
                const style = getStatusBadgeStyle(bed.status);
                const isSelected = selectedBed?.id === bed.id;

                return (
                  <div
                    key={bed.id}
                    className={`rounded-2xl border p-3.5 transition-all shadow-sm flex flex-col justify-between space-y-3 cursor-pointer ${style.cardBg} ${
                      isSelected ? 'ring-2 ring-cyan-500 shadow-md' : ''
                    }`}
                    onClick={() => setSelectedBed(bed)}
                  >
                    {/* Top Row: Bed ID + Status Badge */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono font-black text-sm text-slate-900 bg-slate-100 px-2 py-0.5 rounded-lg border border-slate-200">
                          {bed.bedNumber}
                        </span>
                        {bed.wardCategory === 'ICU_CCU' && (
                          <span className="bg-purple-100 text-purple-800 text-[9px] font-bold px-1.5 py-0.5 rounded">
                            ICU
                          </span>
                        )}
                      </div>

                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border flex items-center gap-1 ${style.bg}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`}></span>
                        <span>{style.label}</span>
                      </span>
                    </div>

                    {/* Middle: Patient Telemetry or Bed Status Details */}
                    {bed.status === 'OCCUPIED' && bed.patient && (
                      <div className="space-y-2 bg-slate-50/90 p-2.5 rounded-xl border border-slate-200/80">
                        <div className="flex items-start justify-between gap-1">
                          <div>
                            <div className="font-bold text-xs text-slate-900 line-clamp-1">
                              {bed.patient.name}
                            </div>
                            <div className="text-[10px] text-slate-500 font-mono">
                              {bed.patient.gender}/{bed.patient.age}y • {bed.patient.mrn}
                            </div>
                          </div>
                          <span className="bg-rose-100 text-rose-800 text-[9px] font-bold px-1.5 py-0.5 rounded shrink-0">
                            {bed.patient.triageLevel.replace('LEVEL_', 'L')}
                          </span>
                        </div>

                        <div className="text-[11px] text-slate-700 font-medium line-clamp-1" title={bed.patient.diagnosis}>
                          Dx: {bed.patient.diagnosis}
                        </div>

                        {/* Vitals Ribbon */}
                        <div className="grid grid-cols-3 gap-1 text-[10px] font-mono bg-white p-1.5 rounded-lg border border-slate-200">
                          <div>
                            <span className="text-slate-400 text-[8px] block">BP</span>
                            <span className="font-bold text-slate-800">{bed.patient.vitals.bp}</span>
                          </div>
                          <div>
                            <span className="text-slate-400 text-[8px] block">HR</span>
                            <span className="font-bold text-slate-800">{bed.patient.vitals.hr} bpm</span>
                          </div>
                          <div>
                            <span className="text-slate-400 text-[8px] block">SpO₂</span>
                            <span className={`font-bold ${bed.patient.vitals.spo2 < 95 ? 'text-rose-600' : 'text-emerald-700'}`}>
                              {bed.patient.vitals.spo2}%
                            </span>
                          </div>
                        </div>
                      </div>
                    )}

                    {bed.status === 'DISCHARGED' && bed.patient && (
                      <div className="space-y-1.5 bg-emerald-50/60 p-2.5 rounded-xl border border-emerald-200 text-xs text-emerald-900">
                        <div className="font-bold">{bed.patient.name} ({bed.patient.mrn})</div>
                        <p className="text-[10px] text-emerald-700">
                          Discharge approved. Pending patient transportation and pharmacy clearance.
                        </p>
                      </div>
                    )}

                    {bed.status === 'PENDING_CLEANING' && (
                      <div className="space-y-1.5 bg-amber-50/80 p-2.5 rounded-xl border border-amber-200 text-xs text-amber-950">
                        <div className="flex items-center gap-1 font-bold text-amber-900">
                          <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                          <span>Sanitization in Progress</span>
                        </div>
                        <p className="text-[10px] text-amber-800">
                          Turnaround est: ~{bed.cleaningEstimatedMinutes || 15} mins. Terminating disinfection protocol.
                        </p>
                      </div>
                    )}

                    {bed.status === 'AVAILABLE' && (
                      <div className="space-y-1.5 bg-sky-50/60 p-2.5 rounded-xl border border-sky-200 text-xs text-sky-950">
                        <div className="flex items-center gap-1 font-bold text-sky-900">
                          <CheckCircle2 className="w-3.5 h-3.5 text-sky-600" />
                          <span>Sanitized & Ready</span>
                        </div>
                        <p className="text-[10px] text-sky-700">
                          Ready for emergency triage or inpatient ward admission.
                        </p>
                      </div>
                    )}

                    {/* Bottom Action Strip */}
                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-1 text-[11px]">
                      {bed.status === 'OCCUPIED' && bed.patient && onSelectPatient && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectPatient(bed.patient!.patientId);
                          }}
                          className="px-2 py-1 bg-cyan-50 hover:bg-cyan-100 text-cyan-800 rounded-lg font-bold flex items-center gap-1 cursor-pointer"
                          title="Open patient assessment dossier in CDS"
                        >
                          <Stethoscope className="w-3 h-3" />
                          <span>Open Dossier</span>
                        </button>
                      )}

                      {bed.status === 'AVAILABLE' && currentRecord && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleAssignCurrentPatientToBed(bed.id);
                          }}
                          className="px-2.5 py-1 bg-sky-600 hover:bg-sky-700 text-white rounded-lg font-bold flex items-center gap-1 cursor-pointer shadow-sm w-full justify-center"
                          title={`Assign current patient (${currentRecord.demographics.fullName}) to ${bed.bedNumber}`}
                        >
                          <UserPlus className="w-3 h-3" />
                          <span>Admit Current Patient</span>
                        </button>
                      )}

                      {bed.status === 'PENDING_CLEANING' && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleUpdateBedStatus(bed.id, 'AVAILABLE');
                          }}
                          className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold flex items-center gap-1 cursor-pointer shadow-sm w-full justify-center"
                        >
                          <Check className="w-3 h-3" />
                          <span>Mark Sanitized</span>
                        </button>
                      )}

                      {bed.status === 'DISCHARGED' && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleUpdateBedStatus(bed.id, 'PENDING_CLEANING');
                          }}
                          className="px-2 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-bold flex items-center gap-1 cursor-pointer shadow-sm w-full justify-center"
                        >
                          <Sparkles className="w-3 h-3" />
                          <span>Request Cleaning</span>
                        </button>
                      )}

                      {bed.status === 'OCCUPIED' && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleUpdateBedStatus(bed.id, 'DISCHARGED');
                          }}
                          className="px-2 py-1 text-slate-500 hover:text-slate-900 font-semibold cursor-pointer ml-auto"
                          title="Discharge patient from bed"
                        >
                          Discharge
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* 4. Selected Bed Detail Modal / Slide-over */}
      {selectedBed && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs no-print">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="font-mono font-black text-base bg-slate-900 text-white px-2.5 py-1 rounded-xl">
                  {selectedBed.bedNumber}
                </span>
                <div>
                  <h4 className="text-sm font-bold text-slate-900">{selectedBed.wardName}</h4>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getStatusBadgeStyle(selectedBed.status).bg}`}>
                    {getStatusBadgeStyle(selectedBed.status).label}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedBed(null)}
                className="p-1 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                ✕
              </button>
            </div>

            {/* Bed Patient Telemetry or Info */}
            {selectedBed.patient ? (
              <div className="space-y-3 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                <div className="flex items-center justify-between">
                  <div>
                    <h5 className="text-sm font-bold text-slate-900">{selectedBed.patient.name}</h5>
                    <p className="text-xs text-slate-500 font-mono">
                      {selectedBed.patient.gender}, {selectedBed.patient.age} Yrs • MRN: {selectedBed.patient.mrn}
                    </p>
                  </div>
                  <span className="bg-cyan-100 text-cyan-800 text-xs font-bold px-2 py-1 rounded-lg">
                    {selectedBed.patient.triageLevel}
                  </span>
                </div>

                <div className="text-xs text-slate-700">
                  <span className="font-bold">Primary Diagnosis:</span> {selectedBed.patient.diagnosis}
                </div>

                <div className="text-xs text-slate-700">
                  <span className="font-bold">Attending Clinician:</span> {selectedBed.patient.attendingDoctor}
                </div>

                <div className="text-xs text-slate-700">
                  <span className="font-bold">Admitted:</span> {selectedBed.patient.admittedAt}
                </div>

                {selectedBed.patient.oxygenSupport && (
                  <div className="text-xs text-slate-700">
                    <span className="font-bold">Oxygen Therapy:</span> {selectedBed.patient.oxygenSupport}
                  </div>
                )}

                {/* Vitals Grid */}
                <div className="grid grid-cols-4 gap-2 pt-2 border-t border-slate-200 text-center font-mono">
                  <div className="bg-white p-2 rounded-xl border border-slate-200">
                    <span className="text-[10px] text-slate-400 block">BP</span>
                    <span className="text-xs font-bold text-slate-800">{selectedBed.patient.vitals.bp}</span>
                  </div>
                  <div className="bg-white p-2 rounded-xl border border-slate-200">
                    <span className="text-[10px] text-slate-400 block">HR</span>
                    <span className="text-xs font-bold text-slate-800">{selectedBed.patient.vitals.hr} bpm</span>
                  </div>
                  <div className="bg-white p-2 rounded-xl border border-slate-200">
                    <span className="text-[10px] text-slate-400 block">SpO₂</span>
                    <span className="text-xs font-bold text-slate-800">{selectedBed.patient.vitals.spo2}%</span>
                  </div>
                  <div className="bg-white p-2 rounded-xl border border-slate-200">
                    <span className="text-[10px] text-slate-400 block">Temp</span>
                    <span className="text-xs font-bold text-slate-800">{selectedBed.patient.vitals.temp}°C</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-xs text-slate-600 space-y-1">
                <div className="font-bold text-slate-800">Bed Status Overview</div>
                <div>Last Disinfected: {selectedBed.lastDisinfectedAt || 'Today 06:00 AM'}</div>
                <div>Cleanliness Standard: WHO Environmental Infection Control Verified</div>
              </div>
            )}

            {/* Change Status Fast Actions */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Override Bed Status
              </span>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    handleUpdateBedStatus(selectedBed.id, 'AVAILABLE');
                    setSelectedBed(null);
                  }}
                  className="py-2 px-3 rounded-xl bg-sky-50 hover:bg-sky-100 text-sky-800 border border-sky-200 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Mark Available</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    handleUpdateBedStatus(selectedBed.id, 'PENDING_CLEANING');
                    setSelectedBed(null);
                  }}
                  className="py-2 px-3 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Request Cleaning</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    handleUpdateBedStatus(selectedBed.id, 'DISCHARGED');
                    setSelectedBed(null);
                  }}
                  className="py-2 px-3 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Mark Discharged</span>
                </button>
                {currentRecord && (
                  <button
                    type="button"
                    onClick={() => {
                      handleAssignCurrentPatientToBed(selectedBed.id);
                      setSelectedBed(null);
                    }}
                    className="py-2 px-3 rounded-xl bg-cyan-600 hover:bg-cyan-700 text-white text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>Admit Current Patient</span>
                  </button>
                )}
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedBed(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
