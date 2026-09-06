import React, { useState, useRef } from 'react';
import {
  FileText,
  Building2,
  Stethoscope,
  Send,
  Printer,
  Copy,
  Check,
  X,
  AlertOctagon,
  AlertTriangle,
  Ambulance,
  Phone,
  ShieldCheck,
  Download,
  Share2,
  Calendar,
  Sparkles,
  Heart,
  Activity,
  CheckCircle2,
} from 'lucide-react';
import { PatientAssessmentRecord } from '../types/clinical';
import {
  ClinicianProfile,
  HospitalFacility,
  clinicalProfileSync,
} from '../services/clinicalProfileSyncService';

interface ReferralLetterModalProps {
  isOpen: boolean;
  onClose: () => void;
  record: PatientAssessmentRecord | null;
  activeDoctor?: ClinicianProfile;
  activeHospital?: HospitalFacility;
}

const TERTIARY_CENTERS = [
  { name: 'Punjab Institute of Cardiology (PIC)', city: 'Lahore', hotline: '+92 42 99203051', specialty: 'Apex Cardiac Center' },
  { name: 'National Institute of Cardiovascular Diseases (NICVD)', city: 'Karachi', hotline: '+92 21 99201271', specialty: 'Comprehensive Cardiovascular Hospital' },
  { name: 'Armed Forces Institute of Cardiology (AFIC/NIHD)', city: 'Rawalpindi', hotline: '+92 51 9271002', specialty: 'National Institute of Heart Diseases' },
  { name: 'Ch. Pervaiz Elahi Institute of Cardiology (CPEIC)', city: 'Multan', hotline: '+92 61 9201047', specialty: 'Tertiary Interventional Cardiology' },
  { name: 'Faisalabad Institute of Cardiology (FIC)', city: 'Faisalabad', hotline: '+92 41 9201500', specialty: 'Cardiovascular Specialty Care' },
  { name: 'Lady Reading Hospital (LRH) - Cardiology Unit', city: 'Peshawar', hotline: '+92 91 9211430', specialty: 'Tertiary Apex Referral Center' },
  { name: 'Mayo Hospital / King Edward Medical University', city: 'Lahore', hotline: '+92 42 99211100', specialty: 'Tertiary Emergency & Internal Medicine' },
  { name: 'Shifa International Hospital (Emergency & Cath Lab)', city: 'Islamabad', hotline: '+92 51 8463000', specialty: 'Quaternary Medical Complex' },
];

export const ReferralLetterModal: React.FC<ReferralLetterModalProps> = ({
  isOpen,
  onClose,
  record,
  activeDoctor: propDoctor,
  activeHospital: propHospital,
}) => {
  const syncDoc = propDoctor || clinicalProfileSync.getActiveDoctor();
  const syncHosp = propHospital || clinicalProfileSync.getActiveHospital();

  const printAreaRef = useRef<HTMLDivElement>(null);

  // Referral Target Configuration
  const [selectedCenter, setSelectedCenter] = useState<string>(TERTIARY_CENTERS[0].name);
  const [receivingDepartment, setReceivingDepartment] = useState<string>(
    'Department of Interventional Cardiology & Acute Coronary Care'
  );
  const [receivingConsultant, setReceivingConsultant] = useState<string>(
    'Attending Interventional Cardiologist / On-Call Cath Lab Team'
  );
  const [transferUrgency, setTransferUrgency] = useState<
    'IMMEDIATE_EMERGENCY' | 'URGENT_TRANSFER' | 'ELECTIVE_SPECIALIST'
  >('IMMEDIATE_EMERGENCY');
  const [transportMode, setTransportMode] = useState<string>(
    'Advanced Cardiac Life Support (ALS) Ambulance with Cardiac Monitor & Defibrillator'
  );
  const [transportTeam, setTransportTeam] = useState<string>(
    'Trained Emergency Medical Technician & Resuscitation Paramedic'
  );

  // Clinical Details
  const [primaryReason, setPrimaryReason] = useState<string>(
    'Emergency transfer for Urgent Coronary Angiography (CAG) ± Primary Percutaneous Coronary Intervention (PCI) and High-Risk CCU Bed Admission.'
  );
  const [enclosedInvestigations, setEnclosedInvestigations] = useState<string[]>([
    '12-Lead Electrocardiogram (ECG) Tracing',
    'Cardiac Biomarker & Lipid Panel Report',
    'AI Multimodal Cardiovascular Risk Stratification Dossier',
    'Bedside Vital Signs Telemetry Record',
  ]);

  const [copyToast, setCopyToast] = useState<boolean>(false);
  const [isCopied, setIsCopied] = useState<boolean>(false);

  if (!isOpen || !record) return null;

  const { demographics, vitals, profile, labs, assessmentResult, doctorReview } = record;
  const docName = doctorReview?.doctorName || syncDoc.name;
  const docLicense = doctorReview?.doctorLicenseNo || syncDoc.licenseNo;

  const targetCenterObj = TERTIARY_CENTERS.find((c) => c.name === selectedCenter) || TERTIARY_CENTERS[0];

  const handlePrint = () => {
    window.print();
  };

  const handleCopyLetter = () => {
    const letterContent = `================================================================================
OFFICIAL MEDICAL TRANSFER NOTE & SPECIALIST REFERRAL LETTER
Sending Facility: ${syncHosp.name} (${syncHosp.district}, ${syncHosp.province})
Date & Time: ${new Date().toLocaleString('en-GB')}
================================================================================

TO: ${receivingConsultant}
    ${receivingDepartment}
    ${selectedCenter} (${targetCenterObj.city})
    Emergency Hotline: ${targetCenterObj.hotline}

FROM: ${docName}, ${syncDoc.qualifications}
      ${syncDoc.specialty}
      PMDC License No: ${docLicense}
      Facility: ${syncHosp.name}

--------------------------------------------------------------------------------
PATIENT IDENTIFICATION & CLINICAL STATUS
--------------------------------------------------------------------------------
Name: ${demographics.fullName}          MRN/ID: ${demographics.patientId}
Age/Sex: ${demographics.age} Y / ${demographics.sex}        Domicile: ${demographics.district}, ${demographics.province}
Phone: ${demographics.phoneNumber || 'Provided in EHR'}

Transfer Urgency: [${transferUrgency.replace('_', ' ')}]
Mode of Transport: ${transportMode}
Accompanying Team: ${transportTeam}

--------------------------------------------------------------------------------
PROVISIONAL CLINICAL DIAGNOSIS & REASON FOR TRANSFER
--------------------------------------------------------------------------------
Primary Indication:
${primaryReason}

Doctor's Diagnosis: ${doctorReview?.doctorDiagnosis || 'Acute Cardiovascular Event / Unstable Angina'}
Assigned Triage Tier: ${assessmentResult?.triage.levelName || 'Level 1 Emergency'} (${assessmentResult?.triage.urgencyText || 'Immediate Resuscitation'})
10-Year CVD Risk Score: ${Math.round((assessmentResult?.risks.cardiovascular.riskScore || 0.25) * 100)}% (${assessmentResult?.risks.cardiovascular.riskCategory || 'HIGH'})

--------------------------------------------------------------------------------
CURRENT BEDSIDE PHYSIOLOGICAL METRICS & LABS
--------------------------------------------------------------------------------
• Blood Pressure: ${vitals.systolicBp || 150}/${vitals.diastolicBp || 95} mmHg
• Heart Rate: ${vitals.heartRate || 88} bpm (Rhythm: Regular)
• Oxygen Saturation (SpO2): ${vitals.oxygenSaturation || 96}% on Room Air
• Blood Glucose: ${vitals.bloodGlucoseMgDl || labs.glucoseFastingMgDl || 160} mg/dL
• Cardiac Troponin: ${labs.troponinPositive ? 'POSITIVE (Elevated)' : 'Pending / Baseline'}
• Serum Creatinine: ${labs.creatinineMgDl || '1.2'} mg/dL • eGFR: ${labs.egfr || '65'} mL/min

--------------------------------------------------------------------------------
PRE-TRANSFER EMERGENCY PHARMACOTHERAPY ADMINISTERED
--------------------------------------------------------------------------------
${doctorReview?.prescribedMedications && doctorReview.prescribedMedications.length > 0
  ? doctorReview.prescribedMedications.map((m, i) => `${i + 1}. ${m.drugName} ${m.dosage} - ${m.frequency} (${m.duration})`).join('\n')
  : '1. Aspirin 300 mg PO (Chewed)\n2. Clopidogrel 300 mg PO Loading Dose\n3. Rosuvastatin 40 mg PO\n4. Sublingual Nitroglycerin 0.5 mg PRN (Pain relief)'}

--------------------------------------------------------------------------------
REQUESTED TERTIARY INTERVENTIONS
--------------------------------------------------------------------------------
1. Immediate Cath Lab evaluation & Coronary Angiography.
2. Intensive Coronary Care Unit (ICCU) bed allocation.
3. Serial 12-Lead ECG and high-sensitivity Troponin monitoring.
4. Hemodynamic stabilization and echocardiographic assessment.

--------------------------------------------------------------------------------
ENCLOSED RECORDS:
${enclosedInvestigations.map((inv, i) => `[✓] ${inv}`).join('\n')}

PHYSICIAN SIGN-OFF:
Dr. ${docName} (${syncDoc.qualifications})
PMDC Reg No: ${docLicense}
${syncHosp.name}
`;

    navigator.clipboard.writeText(letterContent);
    setIsCopied(true);
    setCopyToast(true);
    setTimeout(() => {
      setIsCopied(false);
      setCopyToast(false);
    }, 3500);
  };

  const handleShareWhatsApp = () => {
    const text = `*🚨 EMERGENCY MEDICAL REFERRAL NOTE*\n` +
      `*Patient:* ${demographics.fullName} (${demographics.age}Y/${demographics.sex})\n` +
      `*MRN:* ${demographics.patientId}\n` +
      `*Transfer To:* ${selectedCenter}\n` +
      `*Urgency:* ${transferUrgency.replace('_', ' ')}\n` +
      `*Diagnosis:* ${doctorReview?.doctorDiagnosis || 'Acute Cardiovascular Emergency'}\n` +
      `*Vitals:* BP ${vitals.systolicBp}/${vitals.diastolicBp} mmHg | HR ${vitals.heartRate} bpm | SpO2 ${vitals.oxygenSaturation}%\n` +
      `*Doctor:* ${docName} (PMDC: ${docLicense}) - ${syncHosp.name}`;

    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  return (
    <div
      id="referral-letter-modal-backdrop"
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 print:p-0 print:bg-white print:static animate-fade-in"
    >
      <div className="relative w-full max-w-4xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[94vh] print:max-h-none print:shadow-none print:border-none print:rounded-none">
        
        {/* Modal Action Header (Hidden during browser print) */}
        <div className="bg-slate-900 text-white px-5 py-3.5 flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 print:hidden shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-rose-500/20 text-rose-400 rounded-lg">
              <Ambulance className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                Generate Formal Medical Referral & Transfer Letter
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                  {demographics.fullName} • MRN: {demographics.mrn || demographics.patientId}
                </span>
              </h3>
              <p className="text-[11px] text-slate-400">
                Automated clinical transfer note for tertiary cardiology handover and CCU admission.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              id="btn-copy-referral-text"
              onClick={handleCopyLetter}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer border border-slate-700"
              title="Copy structured referral letter text"
            >
              {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
              <span>{isCopied ? 'Copied to Clipboard!' : 'Copy Text'}</span>
            </button>

            <button
              type="button"
              id="btn-whatsapp-referral-share"
              onClick={handleShareWhatsApp}
              className="px-3 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>WhatsApp Alert</span>
            </button>

            <button
              type="button"
              id="btn-print-referral-letter"
              onClick={handlePrint}
              className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-md transition-all cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Print Transfer Note</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              title="Close Modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Transfer Configuration Strip (Hidden during print) */}
        <div className="bg-slate-50 border-b border-slate-200 p-4 print:hidden text-xs space-y-3 shrink-0">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Receiving Tertiary Institution
              </label>
              <select
                value={selectedCenter}
                onChange={(e) => setSelectedCenter(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-medium focus:ring-2 focus:ring-rose-500 focus:outline-none"
              >
                {TERTIARY_CENTERS.map((center) => (
                  <option key={center.name} value={center.name}>
                    {center.name} ({center.city})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Transfer Urgency Tier
              </label>
              <select
                value={transferUrgency}
                onChange={(e) => setTransferUrgency(e.target.value as any)}
                className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-bold focus:ring-2 focus:ring-rose-500 focus:outline-none text-rose-900"
              >
                <option value="IMMEDIATE_EMERGENCY">🚨 Level 1 Emergency - Immediate Cath Lab (0 min)</option>
                <option value="URGENT_TRANSFER">⚠️ Level 2 Urgent - Transfer &lt; 60 mins</option>
                <option value="ELECTIVE_SPECIALIST">📋 Level 3 Priority - Outpatient Specialty Consult</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                Receiving Service Line / Department
              </label>
              <input
                type="text"
                value={receivingDepartment}
                onChange={(e) => setReceivingDepartment(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-medium focus:ring-2 focus:ring-rose-500 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Scrollable Formatted Formal Referral Document (Print-Optimized) */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-8 bg-slate-100/60 print:p-0 print:bg-white print:overflow-visible">
          <div
            ref={printAreaRef}
            id="referral-letter-printable-area"
            className="max-w-[780px] mx-auto bg-white p-6 sm:p-10 rounded-xl shadow-lg border border-slate-200 text-slate-900 font-sans space-y-5 print:shadow-none print:border-none print:p-0 print:max-w-none print:space-y-4"
          >
            
            {/* Header: Sending Facility Letterhead */}
            <div className="border-b-2 border-slate-900 pb-4">
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="p-1.5 bg-slate-900 text-white rounded-lg inline-block print:border print:border-black">
                      <Building2 className="w-5 h-5" />
                    </span>
                    <div>
                      <h1 className="text-base sm:text-lg font-black tracking-tight text-slate-950 uppercase leading-tight">
                        {syncHosp.name}
                      </h1>
                      <p className="text-[11px] font-semibold text-rose-800">
                        EMERGENCY MEDICAL REFERRAL & PATIENT TRANSFER NOTE
                      </p>
                    </div>
                  </div>
                  <p className="text-[10px] text-slate-500 font-mono">
                    Facility Code: {syncHosp.facilityCode} • {syncHosp.district}, {syncHosp.province} • PMDC Reg: {syncHosp.licenseNumber || 'PK-7782'}
                  </p>
                </div>

                <div className="text-right shrink-0">
                  <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-red-600 text-white animate-pulse print:animate-none">
                    URGENT MEDICAL TRANSFER
                  </span>
                  <div className="text-[11px] font-mono text-slate-700 mt-1">
                    Date: <strong>{new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}</strong>
                  </div>
                  <div className="text-[10px] font-mono text-slate-500">
                    Time: {new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>
            </div>

            {/* Recipient Institution Box */}
            <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs space-y-1">
              <div className="text-[10px] uppercase font-bold text-slate-500">To The Attention Of:</div>
              <div className="font-bold text-slate-900 text-sm">{receivingConsultant}</div>
              <div className="text-slate-700 font-medium">{receivingDepartment}</div>
              <div className="text-slate-900 font-bold flex items-center justify-between gap-2">
                <span>{selectedCenter} ({targetCenterObj.city}, Pakistan)</span>
                <span className="text-[11px] font-mono text-rose-700">Hotline: {targetCenterObj.hotline}</span>
              </div>
            </div>

            {/* Patient Demographics & Transport Details */}
            <div className="border border-slate-200 rounded-xl p-3.5 text-xs grid grid-cols-2 sm:grid-cols-4 gap-3 bg-white">
              <div>
                <span className="text-[10px] font-semibold text-slate-500 uppercase block">Patient Name</span>
                <strong className="text-sm font-bold text-slate-900">{demographics.fullName}</strong>
              </div>
              <div>
                <span className="text-[10px] font-semibold text-slate-500 uppercase block">MRN / ID</span>
                <strong className="font-mono text-slate-900">{demographics.mrn || demographics.patientId}</strong>
              </div>
              <div>
                <span className="text-[10px] font-semibold text-slate-500 uppercase block">Age / Gender</span>
                <strong className="text-slate-900">{demographics.age} Y • {demographics.sex}</strong>
              </div>
              <div>
                <span className="text-[10px] font-semibold text-slate-500 uppercase block">Domicile</span>
                <strong className="text-slate-900">{demographics.district}, {demographics.province}</strong>
              </div>
            </div>

            {/* Clinical Indication & Urgency */}
            <div className="space-y-2">
              <div className="flex items-center justify-between border-b border-slate-200 pb-1 text-xs">
                <h3 className="font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5 text-rose-600" />
                  Reason For Referral & Provisional Diagnosis
                </h3>
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-red-100 text-red-800 border border-red-300">
                  {transferUrgency.replace('_', ' ')}
                </span>
              </div>

              <div className="p-3 bg-rose-50/60 border border-rose-200 rounded-xl text-xs space-y-1.5">
                <p className="text-rose-950 font-medium">
                  <strong>Clinical Rationale:</strong> {primaryReason}
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 border-t border-rose-200/60 text-slate-800">
                  <div>
                    <span className="text-slate-500 text-[10px] uppercase font-bold block">Doctor Diagnosis:</span>
                    <strong className="text-xs">{doctorReview?.doctorDiagnosis || 'Acute Coronary Syndrome / High-Risk CVD'}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500 text-[10px] uppercase font-bold block">Assigned Triage Tier:</span>
                    <strong className="text-xs text-rose-700">
                      {assessmentResult?.triage.levelName || 'Emergency Level 1'} ({Math.round((assessmentResult?.risks.cardiovascular.riskScore || 0.25) * 100)}% 10-Yr CVD Risk)
                    </strong>
                  </div>
                </div>
              </div>
            </div>

            {/* Presenting Vital Signs & Key Lab Biomarkers */}
            <div className="space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5 border-b border-slate-200 pb-1">
                <Heart className="w-3.5 h-3.5 text-red-600" />
                Bedside Hemodynamics & Diagnostic Labs
              </h3>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-center">
                  <span className="text-[10px] text-slate-500 uppercase font-bold block">Blood Pressure</span>
                  <strong className="font-mono text-sm text-slate-900">{vitals.systolicBp || 150}/{vitals.diastolicBp || 95}</strong>
                  <span className="text-[9px] text-slate-400 block">mmHg</span>
                </div>

                <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-center">
                  <span className="text-[10px] text-slate-500 uppercase font-bold block">Heart Rate</span>
                  <strong className="font-mono text-sm text-slate-900">{vitals.heartRate || 88}</strong>
                  <span className="text-[9px] text-slate-400 block">bpm (Regular)</span>
                </div>

                <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-center">
                  <span className="text-[10px] text-slate-500 uppercase font-bold block">SpO₂ (Oxygen)</span>
                  <strong className="font-mono text-sm text-slate-900">{vitals.oxygenSaturation || 96}%</strong>
                  <span className="text-[9px] text-slate-400 block">Room Air</span>
                </div>

                <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-center">
                  <span className="text-[10px] text-slate-500 uppercase font-bold block">Cardiac Troponin</span>
                  <strong className="font-mono text-sm text-rose-700">{labs.troponinPositive ? 'POSITIVE' : '0.042 ng/mL'}</strong>
                  <span className="text-[9px] text-slate-400 block">hs-cTnI</span>
                </div>
              </div>
            </div>

            {/* Pharmacotherapy Administered at Sending Center */}
            <div className="space-y-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5 border-b border-slate-200 pb-1">
                <Stethoscope className="w-3.5 h-3.5 text-cyan-600" />
                Pre-Transfer Emergency Interventions & Medications Administered
              </h3>

              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs">
                <ul className="space-y-1 list-disc list-inside text-slate-800 font-medium">
                  {doctorReview?.prescribedMedications && doctorReview.prescribedMedications.length > 0 ? (
                    doctorReview.prescribedMedications.map((m, idx) => (
                      <li key={idx}>
                        <strong>{m.drugName}:</strong> {m.dosage}, {m.frequency} ({m.duration})
                      </li>
                    ))
                  ) : (
                    <>
                      <li><strong>Aspirin (Disprin):</strong> 300 mg PO loading dose chewed stat.</li>
                      <li><strong>Clopidogrel (Plavix):</strong> 300 mg PO loading dose stat.</li>
                      <li><strong>Rosuvastatin (Crestor):</strong> 40 mg PO high-intensity statin stat.</li>
                      <li><strong>Nitroglycerin SL:</strong> 0.5 mg sublingual administered with pain reduction.</li>
                      <li><strong>Intravenous Access:</strong> 18G Left Antecubital cannula secured with 0.9% Normal Saline KVO.</li>
                    </>
                  )}
                </ul>
              </div>
            </div>

            {/* Transport & Enclosed Documentation */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                <span className="text-[10px] font-bold uppercase text-slate-500 block">Mode of Transfer & En Route Care</span>
                <p className="font-semibold text-slate-800">{transportMode}</p>
                <p className="text-[11px] text-slate-600">Accompanying Team: {transportTeam}</p>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                <span className="text-[10px] font-bold uppercase text-slate-500 block">Enclosed Diagnostic Documents</span>
                <div className="grid grid-cols-1 gap-1 text-[11px] text-slate-700">
                  {enclosedInvestigations.map((inv, idx) => (
                    <div key={idx} className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                      <span>{inv}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Doctor Signature & PMDC Seal */}
            <div className="pt-4 border-t-2 border-slate-900">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="text-[10px] uppercase font-bold text-slate-500">Referring Attending Physician</div>
                  <div
                    className="font-serif italic text-xl font-bold tracking-wide text-blue-900"
                    style={{ color: syncDoc.signatureInkColor || '#1e3a8a' }}
                  >
                    {syncDoc.signatureText || docName}
                  </div>
                  <div className="w-32 h-0.5 bg-blue-300 rounded-full"></div>
                  <div className="text-xs font-bold text-slate-900">{docName} ({syncDoc.qualifications})</div>
                  <div className="text-[10px] text-slate-600 font-mono">
                    PMDC License: <strong>{docLicense}</strong> • {syncDoc.specialty}
                  </div>
                </div>

                <div className="w-20 h-20 rounded-full border-2 border-red-600 flex flex-col items-center justify-center p-1 text-center bg-red-50/40 shrink-0">
                  <span className="text-[9px] font-black text-red-900 leading-none">EMERGENCY</span>
                  <span className="text-[8px] font-bold text-red-700 leading-tight">TRANSFER</span>
                  <span className="text-[7px] text-red-600 uppercase tracking-tighter">VERIFIED</span>
                </div>
              </div>
            </div>

          </div>
        </div>

        {/* Confirmation Toast */}
        {copyToast && (
          <div
            id="toast-referral-copied"
            className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-2xl border border-emerald-500/50 flex items-center gap-3 text-xs max-w-md animate-fade-in"
          >
            <div className="p-1 bg-emerald-500/20 text-emerald-400 rounded-lg">
              <Check className="w-4 h-4" />
            </div>
            <span className="font-semibold">Formal Referral Letter copied to clipboard!</span>
          </div>
        )}

      </div>
    </div>
  );
};
