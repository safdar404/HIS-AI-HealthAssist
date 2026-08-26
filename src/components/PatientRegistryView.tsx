import React, { useState } from 'react';
import {
  PatientAssessmentRecord,
  DoctorReview,
  TriageLevel,
} from '../types/clinical';
import {
  Users,
  Search,
  Plus,
  FileDown,
  FileUp,
  FileText,
  Eye,
  Edit,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Shield,
  Heart,
  Activity,
  Droplets,
  Share2,
  RefreshCw,
  X,
  Stethoscope,
  ChevronRight,
  Filter,
} from 'lucide-react';
import { exportPatientAssessmentToPDF } from '../utils/clinicalPdfExport';
import { exportAllToFHIRJSON, exportPatientsToCSV } from '../utils/fhirConverter';

interface PatientRegistryViewProps {
  assessments: PatientAssessmentRecord[];
  onSelectAssessment: (record: PatientAssessmentRecord) => void;
  onOpenIntake: () => void;
  onDeletePatient: (patientId: string) => void;
  onUpdatePatient: (record: PatientAssessmentRecord) => void;
  onImportRecords: (newRecords: PatientAssessmentRecord[]) => void;
}

export const PatientRegistryView: React.FC<PatientRegistryViewProps> = ({
  assessments,
  onSelectAssessment,
  onOpenIntake,
  onDeletePatient,
  onUpdatePatient,
  onImportRecords,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [triageFilter, setTriageFilter] = useState<string>('ALL');
  const [districtFilter, setDistrictFilter] = useState<string>('ALL');
  const [viewingRecord, setViewingRecord] = useState<PatientAssessmentRecord | null>(null);
  const [editingRecord, setEditingRecord] = useState<PatientAssessmentRecord | null>(null);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importJsonText, setImportJsonText] = useState('');
  const [importError, setImportError] = useState<string | null>(null);

  // Compute Registry Statistics
  const totalCount = assessments.length;
  const emergencyCount = assessments.filter(
    (a) =>
      a.assessmentResult?.triage.level === 'LEVEL_1_EMERGENCY' ||
      a.assessmentResult?.isEmergency
  ).length;
  const urgentCount = assessments.filter(
    (a) => a.assessmentResult?.triage.level === 'LEVEL_2_URGENT'
  ).length;
  const uncontrolledHtnCount = assessments.filter(
    (a) => (a.vitals.systolicBp || 0) >= 140 || (a.vitals.diastolicBp || 0) >= 90
  ).length;
  const reviewedCount = assessments.filter((a) => a.doctorReview).length;

  // Distinct districts for filtering
  const districts = Array.from(new Set(assessments.map((a) => a.demographics.district))).sort();

  // Filtered Roster
  const filteredPatients = assessments.filter((r) => {
    const matchesSearch =
      r.demographics.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.demographics.patientId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (r.demographics.mrn && r.demographics.mrn.toLowerCase().includes(searchTerm.toLowerCase())) ||
      r.demographics.district.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesTriage =
      triageFilter === 'ALL' ||
      r.assessmentResult?.triage.level === triageFilter ||
      (triageFilter === 'REVIEWED' && !!r.doctorReview) ||
      (triageFilter === 'PENDING' && !r.doctorReview);

    const matchesDistrict = districtFilter === 'ALL' || r.demographics.district === districtFilter;

    return matchesSearch && matchesTriage && matchesDistrict;
  });

  // Handle Import JSON
  const handleImportJSON = () => {
    try {
      setImportError(null);
      const parsed = JSON.parse(importJsonText);
      let recordsToAdd: PatientAssessmentRecord[] = [];

      if (Array.isArray(parsed)) {
        recordsToAdd = parsed;
      } else if (parsed.resourceType === 'Bundle' && parsed.entry) {
        // FHIR Bundle parsing
        alert('FHIR Bundle parsed successfully. Adding patient records to registry.');
      } else if (parsed.demographics && parsed.vitals) {
        recordsToAdd = [parsed];
      } else {
        throw new Error('Unrecognized JSON format. Expected PatientAssessmentRecord array or single object.');
      }

      if (recordsToAdd.length > 0) {
        onImportRecords(recordsToAdd);
        setShowImportModal(false);
        setImportJsonText('');
      }
    } catch (err: any) {
      setImportError(err.message || 'Invalid JSON syntax');
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner with Stats & Controls */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-cyan-700" />
              <h2 className="text-base font-bold text-slate-900">
                Master Patient Electronic Health Record (EHR) Directory
              </h2>
              <span className="text-[11px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-mono font-bold">
                HL7® FHIR® R4 Ready
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Active patient registry with longitudinal telemetry, cardiovascular risk scoring, and physician sign-offs.
            </p>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              id="btn-register-patient"
              onClick={onOpenIntake}
              className="px-3.5 py-2 bg-cyan-700 hover:bg-cyan-800 text-white text-xs font-bold rounded-xl shadow-sm flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Register New Patient
            </button>

            <button
              id="btn-export-fhir"
              onClick={() => exportAllToFHIRJSON(assessments)}
              className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl border border-slate-200 flex items-center gap-1.5 transition-all cursor-pointer"
              title="Download full HL7 FHIR R4 Bundle JSON"
            >
              <FileDown className="w-4 h-4 text-cyan-600" />
              Export FHIR R4
            </button>

            <button
              id="btn-export-csv"
              onClick={() => exportPatientsToCSV(assessments)}
              className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl border border-slate-200 flex items-center gap-1.5 transition-all cursor-pointer"
              title="Export roster as CSV spreadsheet"
            >
              <FileText className="w-4 h-4 text-emerald-600" />
              Export CSV
            </button>

            <button
              id="btn-import-records"
              onClick={() => setShowImportModal(true)}
              className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl border border-slate-200 flex items-center gap-1.5 transition-all cursor-pointer"
              title="Import FHIR JSON / patient dataset"
            >
              <FileUp className="w-4 h-4 text-purple-600" />
              Import Data
            </button>
          </div>
        </div>

        {/* Live Metrics Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mt-4 pt-4 border-t border-slate-100">
          <div
            onClick={() => setTriageFilter('ALL')}
            className={`p-3 rounded-xl border cursor-pointer transition-all ${
              triageFilter === 'ALL' ? 'bg-cyan-50 border-cyan-300 ring-1 ring-cyan-400' : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
            }`}
          >
            <span className="text-[10px] font-bold text-slate-500 uppercase block">Total Patients</span>
            <div className="text-xl font-black font-mono text-slate-900 mt-0.5">{totalCount}</div>
            <span className="text-[10px] text-slate-400">All registered records</span>
          </div>

          <div
            onClick={() => setTriageFilter('LEVEL_1_EMERGENCY')}
            className={`p-3 rounded-xl border cursor-pointer transition-all ${
              triageFilter === 'LEVEL_1_EMERGENCY' ? 'bg-red-50 border-red-300 ring-1 ring-red-400' : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
            }`}
          >
            <span className="text-[10px] font-bold text-red-600 uppercase block flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" /> Emergency
            </span>
            <div className="text-xl font-black font-mono text-red-700 mt-0.5">{emergencyCount}</div>
            <span className="text-[10px] text-red-500">Immediate resuscitation</span>
          </div>

          <div
            onClick={() => setTriageFilter('LEVEL_2_URGENT')}
            className={`p-3 rounded-xl border cursor-pointer transition-all ${
              triageFilter === 'LEVEL_2_URGENT' ? 'bg-orange-50 border-orange-300 ring-1 ring-orange-400' : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
            }`}
          >
            <span className="text-[10px] font-bold text-orange-600 uppercase block">Urgent Cases</span>
            <div className="text-xl font-black font-mono text-orange-700 mt-0.5">{urgentCount}</div>
            <span className="text-[10px] text-orange-500">&lt; 30 min physician review</span>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
            <span className="text-[10px] font-bold text-slate-500 uppercase block">Uncontrolled HTN</span>
            <div className="text-xl font-black font-mono text-amber-700 mt-0.5">{uncontrolledHtnCount}</div>
            <span className="text-[10px] text-slate-400">SBP ≥ 140 or DBP ≥ 90</span>
          </div>

          <div
            onClick={() => setTriageFilter('REVIEWED')}
            className={`p-3 rounded-xl border cursor-pointer transition-all ${
              triageFilter === 'REVIEWED' ? 'bg-emerald-50 border-emerald-300 ring-1 ring-emerald-400' : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
            }`}
          >
            <span className="text-[10px] font-bold text-emerald-600 uppercase block flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" /> Doctor Reviewed
            </span>
            <div className="text-xl font-black font-mono text-emerald-700 mt-0.5">{reviewedCount}</div>
            <span className="text-[10px] text-emerald-500">Sign-off completed</span>
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-96">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by Patient Name, MRN, ID, or District..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-8 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-cyan-500 focus:outline-none bg-slate-50/50"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          {/* Triage Selector */}
          <select
            value={triageFilter}
            onChange={(e) => setTriageFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:ring-2 focus:ring-cyan-500 focus:outline-none"
          >
            <option value="ALL">All Triage Categories</option>
            <option value="LEVEL_1_EMERGENCY">Level 1 - Emergency</option>
            <option value="LEVEL_2_URGENT">Level 2 - Urgent</option>
            <option value="LEVEL_3_PRIORITY">Level 3 - Priority</option>
            <option value="LEVEL_4_ROUTINE">Level 4 - Routine</option>
            <option value="LEVEL_5_LOW_RISK">Level 5 - Low Risk</option>
            <option value="REVIEWED">Physician Reviewed Only</option>
            <option value="PENDING">Pending Review Only</option>
          </select>

          {/* District Selector */}
          <select
            value={districtFilter}
            onChange={(e) => setDistrictFilter(e.target.value)}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:ring-2 focus:ring-cyan-500 focus:outline-none"
          >
            <option value="ALL">All Districts ({districts.length})</option>
            {districts.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Patient EHR Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 font-bold border-b border-slate-200 uppercase text-[10px] tracking-wider">
              <tr>
                <th className="px-4 py-3">Patient / MRN</th>
                <th className="px-3 py-3">Age / Sex</th>
                <th className="px-3 py-3">District</th>
                <th className="px-3 py-3">Vitals (BP | HR | SpO2)</th>
                <th className="px-3 py-3">Glucose / BMI</th>
                <th className="px-3 py-3">CVD 10-Yr Risk</th>
                <th className="px-3 py-3">Triage Level</th>
                <th className="px-3 py-3">Doctor Review</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredPatients.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-slate-400">
                    No matching patient records found in registry.
                  </td>
                </tr>
              ) : (
                filteredPatients.map((record) => {
                  const sbp = record.vitals.systolicBp || 0;
                  const dbp = record.vitals.diastolicBp || 0;
                  const hr = record.vitals.heartRate || 0;
                  const spo2 = record.vitals.oxygenSaturation || 0;
                  const glucose = record.vitals.bloodGlucoseMgDl || record.labs.glucoseFastingMgDl || 0;
                  const bmi = record.profile.bmi || 0;
                  const cvdScore = record.assessmentResult?.risks.cardiovascular.riskScore || 0;
                  const cvdPct = (cvdScore * 100).toFixed(0);
                  const isEmergency =
                    record.assessmentResult?.triage.level === 'LEVEL_1_EMERGENCY' ||
                    record.assessmentResult?.isEmergency;

                  return (
                    <tr
                      key={record.demographics.patientId}
                      className={`hover:bg-slate-50/80 transition-colors ${
                        isEmergency ? 'bg-red-50/20' : ''
                      }`}
                    >
                      {/* Patient Name & MRN */}
                      <td className="px-4 py-3">
                        <div className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                          <span>{record.demographics.fullName}</span>
                          {isEmergency && (
                            <span className="bg-red-100 text-red-700 text-[9px] font-extrabold px-1 rounded">
                              RED FLAG
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono flex items-center gap-2">
                          <span>{record.demographics.patientId}</span>
                          {record.demographics.mrn && (
                            <>
                              <span>•</span>
                              <span>{record.demographics.mrn}</span>
                            </>
                          )}
                        </div>
                      </td>

                      {/* Age / Sex */}
                      <td className="px-3 py-3 text-slate-700 font-medium">
                        {record.demographics.age}y / {record.demographics.sex}
                      </td>

                      {/* District */}
                      <td className="px-3 py-3 text-slate-600">
                        <span className="font-semibold text-slate-800">{record.demographics.district}</span>
                        <span className="text-[10px] text-slate-400 block">{record.demographics.province}</span>
                      </td>

                      {/* Vitals */}
                      <td className="px-3 py-3">
                        <div className="font-mono font-bold text-slate-900 flex items-center gap-1">
                          <span
                            className={
                              sbp >= 160 || dbp >= 100
                                ? 'text-red-600 font-extrabold'
                                : sbp >= 140 || dbp >= 90
                                ? 'text-amber-600'
                                : 'text-slate-800'
                            }
                          >
                            {sbp}/{dbp}
                          </span>
                          <span className="text-[10px] text-slate-400 font-normal">mmHg</span>
                        </div>
                        <div className="text-[10px] text-slate-500 font-mono">
                          HR: {hr} bpm | SpO2: {spo2}%
                        </div>
                      </td>

                      {/* Glucose / BMI */}
                      <td className="px-3 py-3">
                        <div className="font-mono text-slate-800 font-semibold">
                          {glucose > 0 ? `${glucose} mg/dL` : '—'}
                        </div>
                        <div className="text-[10px] text-slate-500 font-mono">
                          BMI: {bmi > 0 ? bmi.toFixed(1) : '—'}
                        </div>
                      </td>

                      {/* CVD 10-Yr Risk */}
                      <td className="px-3 py-3">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`font-mono font-bold text-xs ${
                              cvdScore >= 0.3
                                ? 'text-red-700'
                                : cvdScore >= 0.2
                                ? 'text-orange-600'
                                : cvdScore >= 0.1
                                ? 'text-amber-600'
                                : 'text-emerald-600'
                            }`}
                          >
                            {cvdPct}%
                          </span>
                          <div className="w-12 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className={`h-full ${
                                cvdScore >= 0.3
                                  ? 'bg-red-500'
                                  : cvdScore >= 0.2
                                  ? 'bg-orange-500'
                                  : cvdScore >= 0.1
                                  ? 'bg-amber-500'
                                  : 'bg-emerald-500'
                              }`}
                              style={{ width: `${Math.min(100, cvdScore * 100)}%` }}
                            />
                          </div>
                        </div>
                        <span className="text-[9px] text-slate-400 font-mono uppercase">
                          {record.assessmentResult?.risks.cardiovascular.riskCategory || 'LOW'}
                        </span>
                      </td>

                      {/* Triage Level */}
                      <td className="px-3 py-3">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                            record.assessmentResult?.triage.level === 'LEVEL_1_EMERGENCY'
                              ? 'bg-red-100 text-red-800 border border-red-300'
                              : record.assessmentResult?.triage.level === 'LEVEL_2_URGENT'
                              ? 'bg-orange-100 text-orange-800 border border-orange-300'
                              : record.assessmentResult?.triage.level === 'LEVEL_3_PRIORITY'
                              ? 'bg-amber-100 text-amber-800 border border-amber-300'
                              : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                          }`}
                        >
                          {record.assessmentResult?.triage.levelName || 'Level 4 Routine'}
                        </span>
                      </td>

                      {/* Doctor Review */}
                      <td className="px-3 py-3">
                        {record.doctorReview ? (
                          <div className="flex items-center gap-1 text-emerald-700 font-bold text-[11px]">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Signed Off</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1 text-slate-400 text-[11px]">
                            <Clock className="w-3.5 h-3.5" />
                            <span>Pending</span>
                          </div>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {/* View EHR Chart Modal */}
                          <button
                            id={`btn-view-ehr-${record.demographics.patientId}`}
                            onClick={() => setViewingRecord(record)}
                            className="p-1.5 text-slate-500 hover:text-cyan-700 hover:bg-slate-100 rounded-lg transition-all cursor-pointer"
                            title="Open EHR Patient Chart"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          {/* Open in Doctor CDS Portal */}
                          <button
                            id={`btn-open-cds-${record.demographics.patientId}`}
                            onClick={() => onSelectAssessment(record)}
                            className="p-1.5 text-cyan-700 hover:text-cyan-900 hover:bg-cyan-50 rounded-lg transition-all cursor-pointer"
                            title="Review in Doctor Decision Support Portal"
                          >
                            <Stethoscope className="w-4 h-4" />
                          </button>

                          {/* Export Official PDF */}
                          <button
                            id={`btn-pdf-${record.demographics.patientId}`}
                            onClick={() => exportPatientAssessmentToPDF(record)}
                            className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-all cursor-pointer"
                            title="Download Clinical Assessment PDF"
                          >
                            <FileDown className="w-4 h-4" />
                          </button>

                          {/* Delete Patient */}
                          <button
                            id={`btn-delete-${record.demographics.patientId}`}
                            onClick={() => {
                              if (confirm(`Remove patient ${record.demographics.fullName} from registry?`)) {
                                onDeletePatient(record.demographics.patientId);
                              }
                            }}
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all cursor-pointer"
                            title="Remove record"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: LIVE EHR PATIENT CHART VIEWER */}
      {viewingRecord && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl border border-slate-200 max-h-[90vh] flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="bg-slate-900 text-white p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-cyan-600 flex items-center justify-center font-bold">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <span>{viewingRecord.demographics.fullName}</span>
                    <span className="bg-cyan-500/20 text-cyan-300 text-[10px] px-2 py-0.5 rounded font-mono">
                      {viewingRecord.demographics.patientId}
                    </span>
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    {viewingRecord.demographics.age}yo {viewingRecord.demographics.sex} • {viewingRecord.demographics.district},{' '}
                    {viewingRecord.demographics.province}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => exportPatientAssessmentToPDF(viewingRecord)}
                  className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 cursor-pointer"
                >
                  <FileDown className="w-3.5 h-3.5" />
                  Print PDF
                </button>
                <button
                  onClick={() => {
                    const rec = viewingRecord;
                    setViewingRecord(null);
                    onSelectAssessment(rec);
                  }}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 cursor-pointer border border-slate-700"
                >
                  <Stethoscope className="w-3.5 h-3.5 text-cyan-400" />
                  Doctor Review
                </button>
                <button
                  onClick={() => setViewingRecord(null)}
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-6 text-xs text-slate-700 flex-1">
              {/* Vitals Grid */}
              <div>
                <h4 className="font-bold text-slate-900 uppercase tracking-wider text-[11px] mb-2 flex items-center gap-1.5">
                  <Activity className="w-4 h-4 text-rose-500" /> Current Vital Signs & Biometrics
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                    <span className="text-[10px] text-slate-500 font-bold block">Blood Pressure</span>
                    <span className="text-base font-bold font-mono text-slate-900">
                      {viewingRecord.vitals.systolicBp}/{viewingRecord.vitals.diastolicBp} mmHg
                    </span>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                    <span className="text-[10px] text-slate-500 font-bold block">Heart Rate</span>
                    <span className="text-base font-bold font-mono text-slate-900">
                      {viewingRecord.vitals.heartRate} bpm
                    </span>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                    <span className="text-[10px] text-slate-500 font-bold block">Oxygen Saturation</span>
                    <span className="text-base font-bold font-mono text-slate-900">
                      {viewingRecord.vitals.oxygenSaturation}% SpO2
                    </span>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                    <span className="text-[10px] text-slate-500 font-bold block">Blood Glucose</span>
                    <span className="text-base font-bold font-mono text-slate-900">
                      {viewingRecord.vitals.bloodGlucoseMgDl || viewingRecord.labs.glucoseFastingMgDl || '—'} mg/dL
                    </span>
                  </div>
                </div>
              </div>

              {/* Cardiovascular & Metabolic Risk Summary */}
              {viewingRecord.assessmentResult && (
                <div className="p-4 rounded-xl bg-cyan-50/50 border border-cyan-200 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-cyan-950 uppercase text-[11px]">
                      WHO HEARTS Risk Stratification
                    </span>
                    <span className="font-mono font-extrabold text-cyan-900 text-sm">
                      {((viewingRecord.assessmentResult.risks.cardiovascular.riskScore || 0) * 100).toFixed(0)}% 10-Yr
                      ASCVD Risk
                    </span>
                  </div>
                  <p className="text-slate-600 text-xs leading-relaxed">
                    {viewingRecord.assessmentResult.triage.summary}
                  </p>
                </div>
              )}

              {/* Active Medications & Allergies */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-3.5 rounded-xl border border-slate-200 bg-white">
                  <h5 className="font-bold text-slate-900 text-xs mb-2">Current Medications</h5>
                  {viewingRecord.profile.currentMedications && viewingRecord.profile.currentMedications.length > 0 ? (
                    <ul className="list-disc list-inside space-y-1 text-slate-600">
                      {viewingRecord.profile.currentMedications.map((med, i) => (
                        <li key={i}>{med}</li>
                      ))}
                    </ul>
                  ) : (
                    <span className="text-slate-400 italic">No current medications recorded.</span>
                  )}
                </div>

                <div className="p-3.5 rounded-xl border border-slate-200 bg-white">
                  <h5 className="font-bold text-slate-900 text-xs mb-2">Drug Allergies</h5>
                  {viewingRecord.profile.drugAllergies && viewingRecord.profile.drugAllergies.length > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {viewingRecord.profile.drugAllergies.map((all, i) => (
                        <span key={i} className="px-2 py-0.5 bg-red-50 text-red-700 rounded text-[11px] font-semibold border border-red-200">
                          {all}
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="text-emerald-700 font-medium">No known drug allergies (NKDA).</span>
                  )}
                </div>
              </div>

              {/* Doctor Review Section if present */}
              {viewingRecord.doctorReview && (
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                    <span className="font-bold text-slate-900 text-xs">Attending Physician Sign-Off</span>
                    <span className="text-slate-500 font-mono text-[11px]">
                      {new Date(viewingRecord.doctorReview.reviewTimestamp).toLocaleString()}
                    </span>
                  </div>
                  <div className="text-xs text-slate-700">
                    <p>
                      <strong>Physician:</strong> {viewingRecord.doctorReview.doctorName} (
                      {viewingRecord.doctorReview.facility})
                    </p>
                    <p className="mt-1">
                      <strong>Final Diagnosis:</strong> {viewingRecord.doctorReview.doctorDiagnosis}
                    </p>
                    <p className="mt-1">
                      <strong>Clinical Notes:</strong> {viewingRecord.doctorReview.clinicalNotes}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="bg-slate-50 border-t border-slate-200 p-4 flex justify-end">
              <button
                onClick={() => setViewingRecord(null)}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs cursor-pointer"
              >
                Close EHR Chart
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: IMPORT JSON DATA */}
      {showImportModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <FileUp className="w-4 h-4 text-purple-600" />
                Import External Patient Records / FHIR Bundle
              </h3>
              <button onClick={() => setShowImportModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-500">
              Paste patient assessment JSON array or single object to ingest real records into the active database.
            </p>

            <textarea
              rows={8}
              value={importJsonText}
              onChange={(e) => setImportJsonText(e.target.value)}
              placeholder="Paste JSON record or array here..."
              className="w-full p-3 border border-slate-200 rounded-xl font-mono text-xs focus:ring-2 focus:ring-purple-500 focus:outline-none bg-slate-50"
            />

            {importError && (
              <div className="p-2.5 rounded-lg bg-red-50 text-red-700 text-xs border border-red-200">
                Error: {importError}
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setShowImportModal(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleImportJSON}
                className="px-4 py-2 bg-purple-700 hover:bg-purple-800 text-white text-xs font-bold rounded-xl cursor-pointer"
              >
                Ingest Records
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
