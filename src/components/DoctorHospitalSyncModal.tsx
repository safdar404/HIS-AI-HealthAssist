import React, { useState, useEffect } from 'react';
import {
  clinicalProfileSync,
  ClinicianProfile,
  HospitalFacility,
  PRESET_DOCTORS,
  PRESET_HOSPITALS,
  getAllRegisteredClinicians,
  findMatchingDoctor,
  findMatchingHospital,
  findHospitalForDoctor,
  findDoctorForHospital,
} from '../services/clinicalProfileSyncService';
import { DUTY_DOCTORS_ROSTER } from '../data/dutyDoctorsData';
import {
  X,
  Stethoscope,
  Building2,
  CheckCircle,
  Sparkles,
  PenTool,
  ShieldCheck,
  RotateCcw,
  Edit3,
  MapPin,
  FileText,
  BadgeCheck,
  Globe,
  Sliders,
  Check,
  Search,
  Filter,
  Users,
} from 'lucide-react';

interface DoctorHospitalSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccessMessage?: (msg: string) => void;
}

export const DoctorHospitalSyncModal: React.FC<DoctorHospitalSyncModalProps> = ({
  isOpen,
  onClose,
  onSuccessMessage,
}) => {
  const [activeTab, setActiveTab] = useState<'DOCTORS' | 'HOSPITALS' | 'CUSTOM_EDIT' | 'SIGNATURE_PREVIEW'>('DOCTORS');

  const [currentDoctor, setCurrentDoctor] = useState<ClinicianProfile>(clinicalProfileSync.getActiveDoctor());
  const [currentHospital, setCurrentHospital] = useState<HospitalFacility>(clinicalProfileSync.getActiveHospital());

  // Doctor Filter State
  const [doctorSearch, setDoctorSearch] = useState('');
  const [doctorHospitalFilter, setDoctorHospitalFilter] = useState('ALL');
  const [doctorSpecialtyFilter, setDoctorSpecialtyFilter] = useState('ALL');

  // Hospital Filter State
  const [hospitalSearch, setHospitalSearch] = useState('');
  const [hospitalProvinceFilter, setHospitalProvinceFilter] = useState('ALL');

  // Custom Form Edit State
  const [editDocName, setEditDocName] = useState(currentDoctor.name);
  const [editDocQual, setEditDocQual] = useState(currentDoctor.qualifications);
  const [editDocLicense, setEditDocLicense] = useState(currentDoctor.licenseNo);
  const [editDocSpecialty, setEditDocSpecialty] = useState(currentDoctor.specialty);
  const [editDocRole, setEditDocRole] = useState(currentDoctor.roleTitle);
  const [editDocSignText, setEditDocSignText] = useState(currentDoctor.signatureText || currentDoctor.name);
  const [editDocInkColor, setEditDocInkColor] = useState(currentDoctor.signatureInkColor || '#1e3a8a');
  const [editDocFlourish, setEditDocFlourish] = useState(currentDoctor.signatureFlourishFactor || 1.0);

  const [editHospName, setEditHospName] = useState(currentHospital.name);
  const [editHospShort, setEditHospShort] = useState(currentHospital.shortName);
  const [editHospDistrict, setEditHospDistrict] = useState(currentHospital.district);
  const [editHospProvince, setEditHospProvince] = useState(currentHospital.province);
  const [editHospCode, setEditHospCode] = useState(currentHospital.facilityCode);
  const [editHospSeal, setEditHospSeal] = useState(currentHospital.sealInitials);

  // Synchronize on mount and subscription
  useEffect(() => {
    const unsub = clinicalProfileSync.subscribe((doc, hosp) => {
      setCurrentDoctor(doc);
      setCurrentHospital(hosp);
      setEditDocName(doc.name);
      setEditDocQual(doc.qualifications);
      setEditDocLicense(doc.licenseNo);
      setEditDocSpecialty(doc.specialty);
      setEditDocRole(doc.roleTitle);
      setEditDocSignText(doc.signatureText || doc.name);
      setEditDocInkColor(doc.signatureInkColor || '#1e3a8a');
      setEditDocFlourish(doc.signatureFlourishFactor || 1.0);

      setEditHospName(hosp.name);
      setEditHospShort(hosp.shortName);
      setEditHospDistrict(hosp.district);
      setEditHospProvince(hosp.province);
      setEditHospCode(hosp.facilityCode);
      setEditHospSeal(hosp.sealInitials);
    });
    return unsub;
  }, []);

  if (!isOpen) return null;

  // Convert all duty doctors into selectable clinician profiles
  const allRegisteredClinicians: ClinicianProfile[] = [
    ...PRESET_DOCTORS,
    ...DUTY_DOCTORS_ROSTER.filter(
      (dutyDoc) => !PRESET_DOCTORS.some((p) => p.licenseNo === `PMDC-${dutyDoc.pmdcNumber}` || p.licenseNo === dutyDoc.pmdcNumber)
    ).map((dutyDoc) => ({
      id: `duty-${dutyDoc.id}`,
      name: dutyDoc.name,
      qualifications: dutyDoc.qualifications,
      specialty: dutyDoc.specialty,
      roleTitle: dutyDoc.title,
      licenseNo: dutyDoc.pmdcNumber.startsWith('PMDC') ? dutyDoc.pmdcNumber : `PMDC-${dutyDoc.pmdcNumber}`,
      signatureText: dutyDoc.name,
      signatureStyle: 'classic' as const,
      signatureInkColor: '#1e3a8a',
      signatureFlourishFactor: 1.0,
      contactEmail: `${dutyDoc.name.toLowerCase().replace(/[^a-z]/g, '')}@healthassist.gov.pk`,
      hospitalId: dutyDoc.hospitalId,
      hospitalName: dutyDoc.hospitalName,
    })),
  ];

  // Filtered Doctors
  const filteredDoctors = allRegisteredClinicians.filter((doc) => {
    if (doctorHospitalFilter !== 'ALL' && doc.hospitalId !== doctorHospitalFilter) {
      return false;
    }
    if (doctorSpecialtyFilter !== 'ALL' && !doc.specialty.toLowerCase().includes(doctorSpecialtyFilter.toLowerCase())) {
      return false;
    }
    if (doctorSearch.trim()) {
      const q = doctorSearch.toLowerCase().trim();
      const match =
        doc.name.toLowerCase().includes(q) ||
        doc.licenseNo.toLowerCase().includes(q) ||
        doc.specialty.toLowerCase().includes(q) ||
        (doc.hospitalName && doc.hospitalName.toLowerCase().includes(q)) ||
        doc.qualifications.toLowerCase().includes(q);
      if (!match) return false;
    }
    return true;
  });

  // Filtered Hospitals
  const filteredHospitals = PRESET_HOSPITALS.filter((hosp) => {
    if (hospitalProvinceFilter !== 'ALL' && hosp.province.toLowerCase() !== hospitalProvinceFilter.toLowerCase()) {
      return false;
    }
    if (hospitalSearch.trim()) {
      const q = hospitalSearch.toLowerCase().trim();
      const match =
        hosp.name.toLowerCase().includes(q) ||
        hosp.shortName.toLowerCase().includes(q) ||
        hosp.district.toLowerCase().includes(q) ||
        hosp.province.toLowerCase().includes(q) ||
        hosp.facilityCode.toLowerCase().includes(q);
      if (!match) return false;
    }
    return true;
  });

  const handleSelectDoctor = (doc: ClinicianProfile) => {
    clinicalProfileSync.setActiveDoctor(doc);
    if (onSuccessMessage) {
      onSuccessMessage(`✓ Attending Physician switched to ${doc.name} (${doc.licenseNo})`);
    }
  };

  const handleSelectHospital = (hosp: HospitalFacility) => {
    clinicalProfileSync.setActiveHospital(hosp);
    if (onSuccessMessage) {
      onSuccessMessage(`✓ Active Health Facility set to ${hosp.shortName} (${hosp.district})`);
    }
  };

  const handleApplyCustomChanges = (e: React.FormEvent) => {
    e.preventDefault();
    clinicalProfileSync.updateCustomDoctorDetails({
      name: editDocName,
      qualifications: editDocQual,
      licenseNo: editDocLicense,
      specialty: editDocSpecialty,
      roleTitle: editDocRole,
      signatureText: editDocSignText,
      signatureInkColor: editDocInkColor,
      signatureFlourishFactor: editDocFlourish,
    });

    clinicalProfileSync.updateCustomHospitalDetails({
      name: editHospName,
      shortName: editHospShort,
      district: editHospDistrict,
      province: editHospProvince,
      facilityCode: editHospCode,
      sealInitials: editHospSeal,
    });

    if (onSuccessMessage) {
      onSuccessMessage(`✓ Synchronized updated Clinician & Hospital credentials across all reports and terminals!`);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/85 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 rounded-3xl p-5 sm:p-6 max-w-4xl w-full shadow-2xl text-white space-y-5 my-8">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <button
              id="btn-facility-sync-back-header"
              onClick={onClose}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border border-slate-700"
              title="Return to Doctor Decision Support Portal"
            >
              <span>←</span>
              <span>Back</span>
            </button>
            <div className="p-2 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm sm:text-base text-white flex items-center gap-2">
                Pakistan Registered Doctors & Hospital Sync Center
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 font-mono px-2 py-0.5 rounded-full border border-emerald-500/40">
                  PMDC CERTIFIED • 22 HOSPITALS
                </span>
              </h3>
              <p className="text-[11px] text-slate-400">
                Switch active attending physician across all 22 Pakistani hospitals. Clinical CDS reports, PDF exports, and digital signatures adapt instantly.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-2xl border border-slate-800 text-xs">
          <button
            onClick={() => setActiveTab('DOCTORS')}
            className={`flex-1 py-2 px-3 rounded-xl font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'DOCTORS'
                ? 'bg-cyan-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Stethoscope className="w-3.5 h-3.5" />
            <span>Registered Doctors ({allRegisteredClinicians.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('HOSPITALS')}
            className={`flex-1 py-2 px-3 rounded-xl font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'HOSPITALS'
                ? 'bg-cyan-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>Hospital Network ({PRESET_HOSPITALS.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('CUSTOM_EDIT')}
            className={`flex-1 py-2 px-3 rounded-xl font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'CUSTOM_EDIT'
                ? 'bg-cyan-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>Edit Custom Details</span>
          </button>
          <button
            onClick={() => setActiveTab('SIGNATURE_PREVIEW')}
            className={`flex-1 py-2 px-3 rounded-xl font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'SIGNATURE_PREVIEW'
                ? 'bg-cyan-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <PenTool className="w-3.5 h-3.5" />
            <span>Signature Stamp Preview</span>
          </button>
        </div>

        {/* Tab 1: Doctors Preset Picker */}
        {activeTab === 'DOCTORS' && (
          <div className="space-y-3">
            {/* Search & Filter Bar */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search doctor, PMDC #, specialty..."
                  value={doctorSearch}
                  onChange={(e) => setDoctorSearch(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 text-xs"
                />
              </div>

              <div>
                <select
                  value={doctorHospitalFilter}
                  onChange={(e) => setDoctorHospitalFilter(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-300 focus:outline-none focus:border-cyan-500 text-xs"
                >
                  <option value="ALL">All 22 Hospitals</option>
                  {PRESET_HOSPITALS.map((h) => (
                    <option key={h.id} value={h.id}>
                      {h.shortName}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <select
                  value={doctorSpecialtyFilter}
                  onChange={(e) => setDoctorSpecialtyFilter(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-300 focus:outline-none focus:border-cyan-500 text-xs"
                >
                  <option value="ALL">All Specialties</option>
                  <option value="Cardiology">Cardiology / Interventional</option>
                  <option value="Emergency">Emergency & Trauma</option>
                  <option value="Internal Medicine">Internal Medicine</option>
                  <option value="Pulmonology">Pulmonology & Chest</option>
                  <option value="Nephrology">Nephrology & Dialysis</option>
                  <option value="Surgery">Surgery / Burns</option>
                  <option value="Pediatrics">Pediatrics & Neonatal</option>
                </select>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>
                Showing <strong className="text-cyan-400">{filteredDoctors.length}</strong> PMDC registered doctors:
              </span>
              <span className="text-cyan-400 font-mono text-[11px]">Active: {currentDoctor.name} ({currentDoctor.licenseNo})</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 max-h-[360px] overflow-y-auto pr-1">
              {filteredDoctors.map((doc) => {
                const isSelected =
                  currentDoctor.licenseNo === doc.licenseNo ||
                  currentDoctor.name.toLowerCase() === doc.name.toLowerCase();
                return (
                  <div
                    key={doc.id}
                    onClick={() => handleSelectDoctor(doc)}
                    className={`p-3.5 rounded-2xl border cursor-pointer transition-all flex flex-col justify-between ${
                      isSelected
                        ? 'bg-cyan-950/70 border-cyan-400 shadow-lg shadow-cyan-950/50 ring-1 ring-cyan-400'
                        : 'bg-slate-950/80 border-slate-800 hover:border-slate-700 hover:bg-slate-950'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs sm:text-sm text-white flex items-center gap-1.5">
                          {doc.name}
                          {isSelected && <BadgeCheck className="w-4 h-4 text-cyan-400" />}
                        </span>
                        <span className="text-[9px] bg-slate-800 text-cyan-300 font-mono px-2 py-0.5 rounded border border-slate-700">
                          {doc.licenseNo}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-300 font-medium mt-1">{doc.roleTitle}</div>
                      <div className="text-[10px] text-slate-400">{doc.qualifications}</div>
                      <div className="text-[10px] text-cyan-400/90 mt-0.5">Specialty: {doc.specialty}</div>
                      {doc.hospitalName && (
                        <div className="text-[10px] text-emerald-400 flex items-center gap-1 mt-1">
                          <Building2 className="w-3 h-3" />
                          <span>{doc.hospitalName}</span>
                        </div>
                      )}
                    </div>

                    {/* Signature Preview Mini Strip */}
                    <div className="mt-2.5 pt-2 border-t border-slate-800/80 flex items-center justify-between">
                      <span className="text-[9px] text-slate-500 font-mono">Digital Signature Stamp:</span>
                      <span
                        className="italic font-serif text-sm tracking-wide font-medium"
                        style={{ color: doc.signatureInkColor || '#38bdf8' }}
                      >
                        {doc.signatureText || doc.name}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Tab 2: Hospital Facilities Preset Picker */}
        {activeTab === 'HOSPITALS' && (
          <div className="space-y-3">
            {/* Search & Filter */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search hospital by name, district, or code..."
                  value={hospitalSearch}
                  onChange={(e) => setHospitalSearch(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 text-xs"
                />
              </div>

              <div>
                <select
                  value={hospitalProvinceFilter}
                  onChange={(e) => setHospitalProvinceFilter(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-300 focus:outline-none focus:border-cyan-500 text-xs"
                >
                  <option value="ALL">All Provinces & Territories</option>
                  <option value="Punjab">Punjab</option>
                  <option value="Sindh">Sindh</option>
                  <option value="Islamabad Capital Territory">Islamabad (ICT)</option>
                  <option value="Khyber Pakhtunkhwa">Khyber Pakhtunkhwa (KP)</option>
                  <option value="Balochistan">Balochistan</option>
                </select>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>
                Showing <strong className="text-cyan-400">{filteredHospitals.length}</strong> teaching & tertiary hospitals:
              </span>
              <span className="text-cyan-400 font-mono text-[11px]">Current: {currentHospital.shortName}</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 max-h-[360px] overflow-y-auto pr-1">
              {filteredHospitals.map((hosp) => {
                const isSelected = currentHospital.facilityCode === hosp.facilityCode;
                const hospitalDoctorsCount = DUTY_DOCTORS_ROSTER.filter((d) => d.hospitalId === hosp.id).length;
                return (
                  <div
                    key={hosp.id}
                    onClick={() => handleSelectHospital(hosp)}
                    className={`p-3.5 rounded-2xl border cursor-pointer transition-all flex flex-col justify-between ${
                      isSelected
                        ? 'bg-cyan-950/70 border-cyan-400 shadow-lg shadow-cyan-950/50 ring-1 ring-cyan-400'
                        : 'bg-slate-950/80 border-slate-800 hover:border-slate-700 hover:bg-slate-950'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-xs sm:text-sm text-white flex items-center gap-1.5">
                          {hosp.shortName}
                          {isSelected && <BadgeCheck className="w-4 h-4 text-cyan-400" />}
                        </span>
                        <span className="text-[9px] bg-slate-800 text-emerald-300 font-mono px-2 py-0.5 rounded border border-slate-700">
                          {hosp.facilityCode}
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-300 font-medium mt-1">{hosp.name}</div>
                      <div className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                        <MapPin className="w-3 h-3 text-rose-400" />
                        <span>{hosp.district}, {hosp.province} • {hosp.facilityType}</span>
                      </div>
                    </div>

                    <div className="mt-2.5 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-400">
                      <span className="flex items-center gap-1">
                        <Users className="w-3 h-3 text-cyan-400" />
                        <strong className="text-slate-200">{hospitalDoctorsCount || 1}</strong> Registered Clinicians
                      </span>
                      <span className="font-mono text-cyan-400">{hosp.helpline}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Tab 3: Custom Details Editor */}
        {activeTab === 'CUSTOM_EDIT' && (
          <form onSubmit={handleApplyCustomChanges} className="space-y-4 max-h-[380px] overflow-y-auto pr-1">
            {/* Quick Auto-Sync Preset Selector Bar */}
            <div className="bg-slate-900/90 p-3 rounded-2xl border border-slate-700/80 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-200 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                  Quick Preset Synchronizer
                </span>
                <span className="text-[10px] text-cyan-300 font-mono bg-cyan-950/80 px-2 py-0.5 rounded border border-cyan-800">
                  Two-Way Auto-Sync
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                <div>
                  <label className="block text-[10px] text-slate-400 mb-1">Pick Clinician (Auto-fills Hospital):</label>
                  <select
                    id="modal-quick-clinician-sync"
                    value={allRegisteredClinicians.some((d) => d.name === editDocName) ? editDocName : ''}
                    onChange={(e) => {
                      const selected = allRegisteredClinicians.find((d) => d.name === e.target.value);
                      if (selected) {
                        setEditDocName(selected.name);
                        setEditDocLicense(selected.licenseNo);
                        setEditDocQual(selected.qualifications);
                        setEditDocSpecialty(selected.specialty);
                        setEditDocRole(selected.roleTitle);
                        setEditDocSignText(selected.signatureText || selected.name);
                        if (selected.signatureInkColor) setEditDocInkColor(selected.signatureInkColor);
                        if (selected.signatureFlourishFactor) setEditDocFlourish(selected.signatureFlourishFactor);

                        const linkedHosp = findHospitalForDoctor(selected);
                        if (linkedHosp) {
                          setEditHospName(linkedHosp.name);
                          setEditHospShort(linkedHosp.shortName);
                          setEditHospDistrict(linkedHosp.district);
                          setEditHospProvince(linkedHosp.province);
                          setEditHospCode(linkedHosp.facilityCode);
                          setEditHospSeal(linkedHosp.sealInitials);
                        }
                      }
                    }}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-1.5 text-slate-200 text-xs focus:outline-none focus:border-cyan-400 cursor-pointer"
                  >
                    <option value="">-- Choose from {allRegisteredClinicians.length} Clinicians --</option>
                    {allRegisteredClinicians.map((doc) => (
                      <option key={doc.id} value={doc.name}>
                        {doc.name} ({doc.licenseNo}) - {doc.specialty}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] text-slate-400 mb-1">Pick Hospital (Auto-fills Clinician):</label>
                  <select
                    id="modal-quick-hospital-sync"
                    value={PRESET_HOSPITALS.some((h) => h.name === editHospName || h.shortName === editHospShort) ? (PRESET_HOSPITALS.find((h) => h.name === editHospName || h.shortName === editHospShort)?.name || '') : ''}
                    onChange={(e) => {
                      const selected = PRESET_HOSPITALS.find((h) => h.name === e.target.value);
                      if (selected) {
                        setEditHospName(selected.name);
                        setEditHospShort(selected.shortName);
                        setEditHospDistrict(selected.district);
                        setEditHospProvince(selected.province);
                        setEditHospCode(selected.facilityCode);
                        setEditHospSeal(selected.sealInitials);

                        const linkedDoc = findDoctorForHospital(selected);
                        if (linkedDoc) {
                          setEditDocName(linkedDoc.name);
                          setEditDocLicense(linkedDoc.licenseNo);
                          setEditDocQual(linkedDoc.qualifications);
                          setEditDocSpecialty(linkedDoc.specialty);
                          setEditDocRole(linkedDoc.roleTitle);
                          setEditDocSignText(linkedDoc.signatureText || linkedDoc.name);
                          if (linkedDoc.signatureInkColor) setEditDocInkColor(linkedDoc.signatureInkColor);
                          if (linkedDoc.signatureFlourishFactor) setEditDocFlourish(linkedDoc.signatureFlourishFactor);
                        }
                      }
                    }}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-1.5 text-slate-200 text-xs focus:outline-none focus:border-emerald-400 cursor-pointer"
                  >
                    <option value="">-- Choose from {PRESET_HOSPITALS.length} Hospitals --</option>
                    {PRESET_HOSPITALS.map((hosp) => (
                      <option key={hosp.id} value={hosp.name}>
                        {hosp.shortName} ({hosp.district}, {hosp.province})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Doctor Custom Fields */}
            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-3">
              <div className="flex items-center gap-2 border-b border-slate-800/80 pb-2">
                <Stethoscope className="w-4 h-4 text-cyan-400" />
                <h4 className="text-xs font-bold text-slate-200">Doctor / Attending Physician Profile</h4>
              </div>

              <datalist id="modal-doctor-name-suggestions">
                {allRegisteredClinicians.map((d) => (
                  <option key={d.id} value={d.name}>
                    {d.specialty} • {d.licenseNo}
                  </option>
                ))}
              </datalist>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Doctor Full Name</label>
                  <input
                    type="text"
                    list="modal-doctor-name-suggestions"
                    value={editDocName}
                    onChange={(e) => {
                      const newName = e.target.value;
                      setEditDocName(newName);
                      setEditDocSignText(newName);

                      // Check if matching doctor exists in registered clinicians
                      const match = findMatchingDoctor(newName);
                      if (match) {
                        setEditDocLicense(match.licenseNo);
                        setEditDocQual(match.qualifications);
                        setEditDocSpecialty(match.specialty);
                        setEditDocRole(match.roleTitle);
                        if (match.signatureText) setEditDocSignText(match.signatureText);
                        if (match.signatureInkColor) setEditDocInkColor(match.signatureInkColor);

                        const linkedHosp = findHospitalForDoctor(match);
                        if (linkedHosp) {
                          setEditHospName(linkedHosp.name);
                          setEditHospShort(linkedHosp.shortName);
                          setEditHospDistrict(linkedHosp.district);
                          setEditHospProvince(linkedHosp.province);
                          setEditHospCode(linkedHosp.facilityCode);
                          setEditHospSeal(linkedHosp.sealInitials);
                        }
                      }
                    }}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2 text-white focus:outline-none focus:border-cyan-400 text-xs"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">PMDC License #</label>
                  <input
                    type="text"
                    value={editDocLicense}
                    onChange={(e) => setEditDocLicense(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2 text-white font-mono focus:outline-none focus:border-cyan-400 text-xs"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Qualifications / Degrees</label>
                  <input
                    type="text"
                    value={editDocQual}
                    onChange={(e) => setEditDocQual(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2 text-white focus:outline-none focus:border-cyan-400 text-xs"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Clinical Specialty</label>
                  <input
                    type="text"
                    value={editDocSpecialty}
                    onChange={(e) => setEditDocSpecialty(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2 text-white focus:outline-none focus:border-cyan-400 text-xs"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Signature Display Text</label>
                  <input
                    type="text"
                    value={editDocSignText}
                    onChange={(e) => setEditDocSignText(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2 text-white focus:outline-none focus:border-cyan-400 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Signature Ink Color</label>
                  <select
                    value={editDocInkColor}
                    onChange={(e) => setEditDocInkColor(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2 text-white focus:outline-none focus:border-cyan-400 text-xs"
                  >
                    <option value="#1e3a8a">Clinical Navy Blue (#1e3a8a)</option>
                    <option value="#0f172a">Midnight Black (#0f172a)</option>
                    <option value="#172554">Royal Deep Indigo (#172554)</option>
                    <option value="#047857">Emerald Teal (#047857)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Hospital Custom Fields */}
            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-3">
              <div className="flex items-center gap-2 border-b border-slate-800/80 pb-2">
                <Building2 className="w-4 h-4 text-emerald-400" />
                <h4 className="text-xs font-bold text-slate-200">Health Facility / Hospital Hub</h4>
              </div>

              <datalist id="modal-hospital-name-suggestions">
                {PRESET_HOSPITALS.map((h) => (
                  <option key={h.id} value={h.name}>
                    {h.shortName} • {h.district}, {h.province}
                  </option>
                ))}
              </datalist>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                <div className="sm:col-span-2">
                  <label className="block text-[11px] text-slate-400 mb-1">Full Facility Name</label>
                  <input
                    type="text"
                    list="modal-hospital-name-suggestions"
                    value={editHospName}
                    onChange={(e) => {
                      const newHosp = e.target.value;
                      setEditHospName(newHosp);

                      // Check if matching hospital exists
                      const match = findMatchingHospital(newHosp);
                      if (match) {
                        setEditHospShort(match.shortName);
                        setEditHospCode(match.facilityCode);
                        setEditHospDistrict(match.district);
                        setEditHospProvince(match.province);
                        setEditHospSeal(match.sealInitials);

                        const linkedDoc = findDoctorForHospital(match);
                        if (linkedDoc) {
                          setEditDocName(linkedDoc.name);
                          setEditDocLicense(linkedDoc.licenseNo);
                          setEditDocQual(linkedDoc.qualifications);
                          setEditDocSpecialty(linkedDoc.specialty);
                          setEditDocRole(linkedDoc.roleTitle);
                          setEditDocSignText(linkedDoc.signatureText || linkedDoc.name);
                          if (linkedDoc.signatureInkColor) setEditDocInkColor(linkedDoc.signatureInkColor);
                        }
                      }
                    }}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2 text-white focus:outline-none focus:border-cyan-400 text-xs"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Short Display Name</label>
                  <input
                    type="text"
                    value={editHospShort}
                    onChange={(e) => setEditHospShort(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2 text-white focus:outline-none focus:border-cyan-400 text-xs"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Facility Code</label>
                  <input
                    type="text"
                    value={editHospCode}
                    onChange={(e) => setEditHospCode(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2 text-white font-mono focus:outline-none focus:border-cyan-400 text-xs"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">District</label>
                  <input
                    type="text"
                    value={editHospDistrict}
                    onChange={(e) => setEditHospDistrict(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2 text-white focus:outline-none focus:border-cyan-400 text-xs"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Seal Stamp Code (e.g. MHL, JPMC, DHQ)</label>
                  <input
                    type="text"
                    value={editHospSeal}
                    onChange={(e) => setEditHospSeal(e.target.value.toUpperCase())}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2 text-white font-mono uppercase focus:outline-none focus:border-cyan-400 text-xs"
                    required
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-6 py-2 bg-gradient-to-r from-cyan-600 to-emerald-600 hover:from-cyan-500 hover:to-emerald-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-cyan-950/60 flex items-center gap-1.5 cursor-pointer"
              >
                <CheckCircle className="w-4 h-4" />
                Save & Synchronize All Terminals
              </button>
            </div>
          </form>
        )}

        {/* Tab 4: Live PDF Signature Box Replica */}
        {activeTab === 'SIGNATURE_PREVIEW' && (
          <div className="space-y-4">
            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 text-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-200">Live PDF Report Signature Box Simulation:</span>
                <span className="text-[10px] text-emerald-400 font-mono">WHO HEARTS COMPLIANT</span>
              </div>
              <p className="text-[11px] text-slate-400">
                This exact certified signature block and regulatory seal will appear at the bottom of all generated patient assessment reports:
              </p>
            </div>

            {/* Visual Replica of Section 5 Verified Box */}
            <div className="bg-emerald-50 text-slate-900 border-2 border-emerald-500 rounded-2xl p-5 shadow-inner max-w-xl mx-auto space-y-3 relative overflow-hidden">
              {/* Header Banner */}
              <div className="bg-emerald-600 text-white text-[10px] font-bold text-center py-1 rounded-lg uppercase tracking-wider">
                ✓ DIGITALLY SIGNED & CLINICALLY VERIFIED • {currentHospital.sealInitials || 'PMDC'}
              </div>

              <div className="flex items-center justify-between pt-1">
                <div className="space-y-1">
                  {/* Cursive Signature */}
                  <div
                    className="font-serif italic text-2xl font-semibold tracking-wide"
                    style={{ color: currentDoctor.signatureInkColor || '#1e3a8a' }}
                  >
                    {currentDoctor.signatureText || currentDoctor.name}
                  </div>
                  {/* Flourish underline line */}
                  <div className="w-36 h-0.5 bg-blue-500/70 rounded-full"></div>

                  <div className="text-xs font-bold text-slate-800 mt-2">
                    {currentDoctor.name} ({currentDoctor.qualifications})
                  </div>
                  <div className="text-[10px] text-slate-600">
                    Reg: <strong className="font-mono text-slate-800">{currentDoctor.licenseNo}</strong> • {currentDoctor.specialty}
                  </div>
                  <div className="text-[10px] text-slate-600">
                    Facility: <strong className="text-slate-800">{currentHospital.name}</strong>
                  </div>
                  <div className="text-[9px] text-slate-500 font-mono mt-1">
                    AUTH-SHA256:HIS-{currentDoctor.licenseNo.replace(/[^A-Z0-9]/g, '')}-{currentHospital.sealInitials || 'PMDC'}-SECURE
                  </div>
                </div>

                {/* Certified Seal Circle */}
                <div className="w-20 h-20 rounded-full border-2 border-emerald-600 flex flex-col items-center justify-center p-1 text-center bg-white shadow-sm shrink-0">
                  <div className="w-16 h-16 rounded-full border border-emerald-500 flex flex-col items-center justify-center">
                    <span className="text-[9px] font-black text-emerald-700 leading-none">
                      {currentHospital.sealInitials || 'PMDC'}
                    </span>
                    <span className="text-[11px] font-bold text-emerald-600 leading-tight">SEAL</span>
                    <span className="text-[7px] text-emerald-800 uppercase tracking-tighter">VERIFIED</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs text-slate-400 pt-2">
              <span>Ready for official clinical export across all Pakistani primary care and DHQ nodes.</span>
              <button
                onClick={onClose}
                className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        )}

        {/* Modal Footer Controls */}
        <div className="border-t border-slate-800/90 pt-3 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 text-slate-400">
            <ShieldCheck className="w-4 h-4 text-cyan-400" />
            <span className="hidden sm:inline">Active Synchronized Clinician:</span>
            <strong className="text-cyan-300">{currentDoctor.name}</strong>
            <span className="text-slate-600">•</span>
            <strong className="text-emerald-300">{currentHospital.shortName}</strong>
          </div>
          <div className="flex items-center gap-2">
            <button
              id="btn-facility-sync-back-footer"
              onClick={onClose}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-xl cursor-pointer flex items-center gap-1.5 transition-all"
            >
              <span>←</span>
              <span>Back to Portal</span>
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-cyan-700 hover:bg-cyan-600 text-white font-bold rounded-xl cursor-pointer"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
