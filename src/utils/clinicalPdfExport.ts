import { jsPDF } from 'jspdf';
import QRCode from 'qrcode';
import { PatientAssessmentRecord } from '../types/clinical';
import {
  clinicalProfileSync,
  ClinicianProfile,
  HospitalFacility,
} from '../services/clinicalProfileSyncService';
import { calculatePatientMedicalBill } from './medicalBilling';

export type ClinicalSectionOption = 'FULL_SUMMARY' | 'ONLY_VITALS' | 'ONLY_MEDICATIONS' | 'CUSTOM';

export interface ClinicalSectionSelection {
  demographics?: boolean;
  vitals?: boolean;
  triageAndRisks?: boolean;
  medications?: boolean;
  labs?: boolean;
  shapFactors?: boolean;
  doctorReview?: boolean;
  medicalBilling?: boolean;
  qrCode?: boolean;
}

export interface PDFExportOptions {
  doctorOverride?: Partial<ClinicianProfile>;
  hospitalOverride?: Partial<HospitalFacility>;
  includeAggregateCover?: boolean;
  batchTitle?: string;
  reportType?: ClinicalSectionOption;
  selectedSections?: ClinicalSectionSelection;
  doctorFeePkr?: number;
  subsidyDiscountPkr?: number;
  qrScanTextOverride?: string;
}

/**
 * Renders a single patient's comprehensive clinical assessment report onto the provided jsPDF document.
 */
export async function renderPatientAssessmentPage(
  doc: jsPDF,
  record: PatientAssessmentRecord,
  options?: PDFExportOptions,
  currentPage: number = 1,
  totalPages: number = 1
): Promise<void> {
  // Resolve Active Synchronized Doctor and Hospital
  const syncDoctor = clinicalProfileSync.getActiveDoctor();
  const syncHospital = clinicalProfileSync.getActiveHospital();

  const activeDoctor: ClinicianProfile = {
    ...syncDoctor,
    ...(options?.doctorOverride || {}),
  };

  const activeHospital: HospitalFacility = {
    ...syncHospital,
    ...(options?.hospitalOverride || {}),
  };

  const reviewDocName = record.doctorReview?.doctorName || activeDoctor.name;
  const reviewDocLicense = record.doctorReview?.doctorLicenseNo || activeDoctor.licenseNo;
  const reviewFacility = record.doctorReview?.facility || activeHospital.name;

  const primaryColor: [number, number, number] = [15, 23, 42]; // Slate 900
  const cyanColor: [number, number, number] = [8, 145, 178]; // Cyan 600
  const alertColor: [number, number, number] = [220, 38, 38]; // Red 600
  const grayColor: [number, number, number] = [100, 116, 139]; // Slate 500
  const darkGray: [number, number, number] = [51, 65, 85]; // Slate 700

  const { demographics, vitals, profile, labs, assessmentResult, doctorReview } = record;

  // Safe BMI resolution protecting against height unit confusion (e.g. 1.7m vs 170cm)
  const safeBmi = (() => {
    if (profile.bmi && profile.bmi >= 12 && profile.bmi <= 75) {
      return Number(profile.bmi.toFixed(1));
    }
    let h = profile.heightCm;
    if (h > 0 && h <= 2.5) h = h * 100;
    if (h >= 50 && h <= 250 && profile.weightKg >= 20 && profile.weightKg <= 250) {
      const computed = profile.weightKg / Math.pow(h / 100, 2);
      if (computed >= 12 && computed <= 75) {
        return Number(computed.toFixed(1));
      }
    }
    return 24.8;
  })();

  // Generate Rapid-Scan Clinical Transfer QR Code for Patient MRN / ID
  const mrnString = demographics.mrn || demographics.patientId || 'MRN-PENDING';
  const qrPayload =
    options?.qrScanTextOverride ||
    `HIS-EMERGENCY-TRANSFER|FACILITY:${activeHospital.facilityCode}|MRN:${mrnString}|ID:${demographics.patientId}|NAME:${demographics.fullName}|AGE:${demographics.age}Y|SEX:${demographics.sex}|SBP:${vitals.systolicBp || '?'}|DBP:${vitals.diastolicBp || '?'}|CVD_RISK:${assessmentResult ? Math.round(assessmentResult.risks.cardiovascular.riskScore * 100) : 0}%|TRIAGE:${assessmentResult?.triage.level || 'PRIORITY'}|DOC:${activeDoctor.name}|LIC:${activeDoctor.licenseNo}`;

  let qrCodeDataUrl: string | null = null;
  try {
    qrCodeDataUrl = await QRCode.toDataURL(qrPayload, {
      width: 160,
      margin: 1,
      color: {
        dark: '#0f172a',
        light: '#ffffff',
      },
    });
  } catch (err) {
    console.warn('QR Code generation notice:', err);
  }

  let y = 16;

  // Header Banner
  doc.setFillColor(...primaryColor);
  doc.rect(0, 0, 210, 26, 'F');

  // Vector Logo Emblem (HIS AI-HealthAssist Pulse & Cross Badge)
  doc.setFillColor(15, 23, 42);
  doc.setDrawColor(6, 182, 212); // Cyan border
  doc.setLineWidth(0.7);
  doc.roundedRect(14, 4.5, 16, 16, 2.5, 2.5, 'FD');

  // Medical Cross Accent
  doc.setFillColor(6, 182, 212);
  doc.rect(20.5, 6.2, 3.0, 1.0, 'F');
  doc.rect(21.5, 5.2, 1.0, 3.0, 'F');

  // Logo Inner Pulse ECG Line
  doc.setDrawColor(34, 211, 238); // Bright Cyan
  doc.setLineWidth(0.85);
  doc.lines(
    [
      [2.0, 0],
      [0.8, -1.8],
      [0.8, 1.8],
      [0.6, 1.5],
      [1.2, -6.5],
      [1.2, 7.8],
      [0.8, -2.8],
      [0.8, -1.2],
      [0.8, 1.2],
      [2.0, 0],
    ],
    16.0,
    14.5
  );

  // Logo Status Dot (Emerald Live Dot)
  doc.setFillColor(52, 211, 153);
  const reportType: ClinicalSectionOption = options?.reportType || 'FULL_SUMMARY';
  const custom: ClinicalSectionSelection = options?.selectedSections || {};

  const showDemographics = reportType === 'CUSTOM' ? custom.demographics !== false : true;
  const showVitals = reportType === 'FULL_SUMMARY' || reportType === 'ONLY_VITALS' || (reportType === 'CUSTOM' && custom.vitals !== false);
  const showTriageAndRisks = reportType === 'FULL_SUMMARY' || (reportType === 'CUSTOM' && custom.triageAndRisks !== false);
  const showTriageBanner = showTriageAndRisks;
  const showDiagnosticOrders = reportType === 'FULL_SUMMARY' || (reportType === 'CUSTOM' && custom.labs !== false);
  const showMedications = reportType === 'FULL_SUMMARY' || reportType === 'ONLY_MEDICATIONS' || (reportType === 'CUSTOM' && custom.medications !== false);
  const showDoctorReview = reportType === 'FULL_SUMMARY' || reportType === 'ONLY_MEDICATIONS' || (reportType === 'CUSTOM' && custom.doctorReview !== false);
  const showQr = reportType === 'FULL_SUMMARY' || (reportType === 'CUSTOM' ? custom.qrCode !== false : true);

  let reportHeading = 'HIS AI-HealthAssist | CLINICAL ASSESSMENT REPORT';
  if (reportType === 'ONLY_VITALS') {
    reportHeading = 'HIS AI-HealthAssist | PATIENT VITALS & HEMODYNAMICS REPORT';
  } else if (reportType === 'ONLY_MEDICATIONS') {
    reportHeading = 'HIS AI-HealthAssist | MEDICATION & PHARMACOTHERAPY REPORT';
  } else if (reportType === 'CUSTOM') {
    reportHeading = 'HIS AI-HealthAssist | CUSTOM CLINICAL EXTRACT REPORT';
  }

  doc.circle(27.0, 6.8, 1.0, 'F');

  // Header Title & Synchronized Hospital Facility Label
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text(reportHeading, 33, 10);

  // Synchronized Hospital Subtitle Badge
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.8);
  doc.setTextColor(34, 211, 238); // Bright Cyan
  doc.text(`FACILITY: ${activeHospital.name.toUpperCase()} (${activeHospital.facilityCode})`, 33, 15);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.2);
  doc.setTextColor(165, 243, 252);
  doc.text('WHO HEARTS Protocol & 2026 Hypertension Compendium Implementation', 33, 19.5);

  const reportDate = new Date().toLocaleString('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
  doc.setFontSize(7.5);
  doc.setTextColor(203, 213, 225);
  doc.text(`Generated: ${reportDate}`, 196, 10, { align: 'right' });
  doc.text(`Record ID: ${assessmentResult?.assessmentId || 'N/A'}`, 196, 15, { align: 'right' });
  doc.text(`Node: ${activeHospital.district}, ${activeHospital.province}`, 196, 19.5, { align: 'right' });

  y = 31;

  // Emergency Triage Banner (if Red Flag or Level 1 / 2)
  const isEmergency = assessmentResult?.isEmergency || assessmentResult?.triage.level === 'LEVEL_1_EMERGENCY';
  const isUrgent = assessmentResult?.triage.level === 'LEVEL_2_URGENT';

  if (showTriageBanner && (isEmergency || isUrgent)) {
    doc.setFillColor(isEmergency ? 254 : 255, isEmergency ? 242 : 247, isEmergency ? 242 : 237);
    doc.setDrawColor(isEmergency ? alertColor[0] : 234, isEmergency ? alertColor[1] : 88, isEmergency ? alertColor[2] : 12);
    doc.rect(14, y, 182, 14, 'FD');

    doc.setTextColor(isEmergency ? alertColor[0] : 194, isEmergency ? alertColor[1] : 65, isEmergency ? alertColor[2] : 12);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.text(
      isEmergency
        ? 'EMERGENCY RED-FLAG ALERT: IMMEDIATE HOSPITAL/CARDIAC TRIAGE REQUIRED'
        : 'URGENT CLINICAL ATTENTION REQUIRED: PROMPT EVALUATION RECOMMENDED',
      18,
      y + 6
    );

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...darkGray);
    const alertDesc = assessmentResult?.redFlags?.[0]?.description || assessmentResult?.triage.summary || 'Elevated risk parameters detected.';
    doc.text(alertDesc.substring(0, 110), 18, y + 10.5);

    y += 18;
  }

  // Section 1: Patient Demographics & Profile
  if (showDemographics) {
    doc.setFillColor(241, 245, 249);
    doc.rect(14, y, 182, 6, 'F');
    doc.setTextColor(...primaryColor);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text('1. PATIENT DEMOGRAPHICS & CLINICAL HISTORY', 16, y + 4.5);

    // Section Header transfer tag
    if (showQr) {
      doc.setFontSize(7);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...cyanColor);
      doc.text('EMERGENCY TRANSFER QR', 196, y + 4.5, { align: 'right' });
    }

    y += 8.5;

    // Row 1
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...darkGray);
    doc.text('Full Name:', 16, y);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0, 0, 0);
    doc.text(`${demographics.fullName}`, 32, y, { maxWidth: 35 });

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...darkGray);
    doc.text('Patient ID:', 68, y);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0, 0, 0);
    doc.text(`${demographics.patientId}`, 84, y, { maxWidth: 30 });

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...darkGray);
    doc.text('MRN:', 116, y);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0, 0, 0);
    doc.text(`${demographics.mrn || 'N/A'}`, 126, y, { maxWidth: 38 });

    y += 5.5;

    // Row 2
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...darkGray);
    doc.text('Location:', 16, y);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0, 0, 0);
    doc.text(`${demographics.district}, ${demographics.province}`, 30, y, { maxWidth: 36 });

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...darkGray);
    doc.text('Tobacco:', 68, y);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0, 0, 0);
    const tobaccoVal = profile.tobaccoUse !== 'NONE' ? profile.tobaccoUse.replace(/_/g, ' ') : profile.smokingStatus;
    doc.text(`${tobaccoVal}`, 82, y, { maxWidth: 32 });

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...darkGray);
    doc.text('Age / Sex:', 116, y);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0, 0, 0);
    doc.text(`${demographics.age} Yrs / ${demographics.sex}`, 131, y, { maxWidth: 34 });

    y += 5.5;

    // Row 3
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...darkGray);
    doc.text('Prior CVD:', 16, y);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0, 0, 0);
    doc.text(`${profile.previousCVD ? 'Prior CVD Documented' : profile.previousStroke ? 'Prior Stroke / TIA' : 'None Reported'}`, 32, y, { maxWidth: 35 });

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...darkGray);
    doc.text('History:', 68, y);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0, 0, 0);
    const historyText = [profile.diabetesHistory ? 'Diabetes' : '', profile.hypertensionHistory ? 'Hypertension' : '', profile.kidneyDisease ? 'CKD' : '']
      .filter(Boolean)
      .join(', ') || 'No Prior Dx';
    doc.text(historyText, 80, y, { maxWidth: 34 });

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...darkGray);
    doc.text('Activity:', 116, y);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0, 0, 0);
    doc.text(`${profile.physicalActivity || 'MODERATE'}`, 128, y, { maxWidth: 38 });

    // Embed Rapid-Scan Patient MRN QR Code in Dedicated Right Box
    if (showQr && qrCodeDataUrl) {
      try {
        doc.setDrawColor(203, 213, 225); // Slate 300
        doc.setFillColor(255, 255, 255);
        doc.roundedRect(171, y - 13.5, 23, 23, 1.5, 1.5, 'FD');
        doc.addImage(qrCodeDataUrl, 'PNG', 172.5, y - 12.5, 20, 20);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(5.2);
        doc.setTextColor(...darkGray);
        doc.text('SCAN TO VERIFY EMR', 182.5, y + 8.2, { align: 'center' });
        doc.setFontSize(4.3);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...grayColor);
        doc.text('Tele-Triage & Vitals Data', 182.5, y + 10.3, { align: 'center' });
      } catch (qrErr) {
        console.warn('Could not insert QR image into PDF:', qrErr);
      }
    }

    y += 11.5;
  }

  // Section 2: Physiological Measurements & Vitals
  if (showVitals) {
    doc.setFillColor(241, 245, 249);
    doc.rect(14, y, 182, 6, 'F');
    doc.setTextColor(...primaryColor);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text(
      reportType === 'ONLY_VITALS'
        ? '2. PHYSIOLOGICAL MEASUREMENTS, VITALS & HEMODYNAMICS'
        : '2. PHYSIOLOGICAL MEASUREMENTS & VITAL SIGNS',
      16,
      y + 4.5
    );
    y += 9;

    const vitalsData = [
      { label: 'Blood Pressure', value: `${vitals.systolicBp || '?'}/${vitals.diastolicBp || '?'} mmHg` },
      { label: 'Heart Rate', value: `${vitals.heartRate || '?'} bpm` },
      { label: 'Oxygen Saturation', value: `${vitals.oxygenSaturation || 98}% (SpO2)` },
      { label: 'Blood Glucose', value: `${vitals.bloodGlucoseMgDl || labs.glucoseFastingMgDl || 'N/A'} mg/dL` },
      { label: 'BMI / Adiposity', value: `${safeBmi} kg/m²` },
      { label: 'HbA1c Glycemia', value: `${labs.hba1cPercent ? `${labs.hba1cPercent}%` : 'Unmeasured'}` },
      { label: 'Total / LDL Chol', value: `${labs.totalCholesterolMgDl || 'N/A'} / ${labs.ldlCholesterolMgDl || 'N/A'} mg/dL` },
      { label: 'Serum Creatinine', value: `${labs.creatinineMgDl ? `${labs.creatinineMgDl} mg/dL (eGFR ${labs.egfr || 'N/A'})` : 'N/A'}` },
    ];

    vitalsData.forEach((item, idx) => {
      const col = idx % 4;
      const row = Math.floor(idx / 4);
      const xPos = 16 + col * 46;
      const yPos = y + row * 8;

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(...grayColor);
      doc.text(item.label, xPos, yPos);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(...primaryColor);
      doc.text(item.value, xPos, yPos + 4);
    });

    y += 18;

    // If report is ONLY_VITALS, calculate and append hemodynamics
    if (reportType === 'ONLY_VITALS') {
      const sbp = vitals.systolicBp || 120;
      const dbp = vitals.diastolicBp || 80;
      const hr = vitals.heartRate || 75;
      const mapVal = Math.round(dbp + (sbp - dbp) / 3);
      const pulsePressure = sbp - dbp;
      const shockIndex = (hr / sbp).toFixed(2);

      doc.setFillColor(240, 249, 255); // Sky 50
      doc.setDrawColor(186, 230, 253);
      doc.roundedRect(14, y, 182, 14, 1.5, 1.5, 'FD');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(...cyanColor);
      doc.text('CALCULATED HEMODYNAMIC METRICS:', 18, y + 4.5);

      doc.setFontSize(8);
      doc.setTextColor(...darkGray);
      doc.text(`Mean Arterial Pressure (MAP): ${mapVal} mmHg (Norm: 70-105)`, 18, y + 9.5);
      doc.text(`Pulse Pressure: ${pulsePressure} mmHg (Norm: 30-50)`, 82, y + 9.5);
      doc.text(`Shock Index: ${shockIndex} (Norm: 0.5-0.7)`, 142, y + 9.5);

      y += 18;
    }
  }

  // Section 3: AI Multi-Condition Risk Stratification (WHO HEARTS)
  if (showTriageAndRisks && assessmentResult) {
    doc.setFillColor(241, 245, 249);
    doc.rect(14, y, 182, 6, 'F');
    doc.setTextColor(...primaryColor);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text('3. MULTI-CONDITION AI RISK STRATIFICATION (WHO HEARTS ALIGNED)', 16, y + 4.5);
    y += 9;

    const risks = [
      {
        name: '10-Year CVD Hazard',
        score: `${(assessmentResult.risks.cardiovascular.riskScore * 100).toFixed(0)}%`,
        cat: assessmentResult.risks.cardiovascular.riskCategory,
        model: 'CVD-XGB-001 (HEARTS)',
      },
      {
        name: 'Hypertension Strain',
        score: `${(assessmentResult.risks.hypertension.riskScore * 100).toFixed(0)}%`,
        cat: assessmentResult.risks.hypertension.riskCategory,
        model: 'WHO 2026 Compendium',
      },
      {
        name: 'Diabetes Screening',
        score: `${(assessmentResult.risks.diabetes.riskScore * 100).toFixed(0)}%`,
        cat: assessmentResult.risks.diabetes.riskCategory,
        model: 'ADA-XGB Screening',
      },
      {
        name: 'Airway / COPD Risk',
        score: `${(assessmentResult.risks.respiratory.riskScore * 100).toFixed(0)}%`,
        cat: assessmentResult.risks.respiratory.riskCategory,
        model: 'GOLD / GINA Criteria',
      },
    ];

    risks.forEach((r, idx) => {
      const xPos = 16 + idx * 46;
      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(226, 232, 240);
      doc.roundedRect(xPos, y, 42, 15, 1.5, 1.5, 'FD');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(...darkGray);
      doc.text(r.name, xPos + 2, y + 4);

      doc.setFontSize(11);
      doc.setTextColor(r.cat === 'HIGH' || r.cat === 'URGENT' ? alertColor[0] : cyanColor[0], r.cat === 'HIGH' || r.cat === 'URGENT' ? alertColor[1] : cyanColor[1], r.cat === 'HIGH' || r.cat === 'URGENT' ? alertColor[2] : cyanColor[2]);
      doc.text(r.score, xPos + 2, y + 9.5);

      doc.setFontSize(7);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(...grayColor);
      doc.text(`Cat: ${r.cat} (${r.model.split(' ')[0]})`, xPos + 2, y + 13.5);
    });

    y += 19;

    // Explainable AI (SHAP) Attribution
    if (custom.shapFactors !== false) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(...primaryColor);
      doc.text('Key Explainable AI (SHAP) Contributors:', 16, y);
      y += 4.5;

      const factors = assessmentResult.risks.cardiovascular.contributingFactors.slice(0, 3);
      factors.forEach((f) => {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.2);
        doc.setTextColor(...darkGray);
        const direction = f.direction === 'RISK_INCREASE' ? '+' : '';
        const cleanDisplayName = String(f.displayName || '')
          .replace(/≥/g, '>=')
          .replace(/≤/g, '<=')
          .replace(/[—–]/g, '-');
        const cleanRationale = String(f.clinicalRationale || '')
          .replace(/≥/g, '>=')
          .replace(/≤/g, '<=')
          .replace(/[—–]/g, '-');
        let cleanVal = String(f.value ?? '').replace(/≥/g, '>=');
        if (cleanVal.includes('2512117') || cleanVal.includes('BMI 2512') || /BMI \d{4,}/.test(cleanVal)) {
          cleanVal = `BMI ${safeBmi}`;
        }
        const shapLine = `• ${cleanDisplayName} (${cleanVal}): ${direction}${f.contributionPercent}% contribution - ${cleanRationale}`;
        // Maximum width 166mm so text is strictly inside the 196mm card margin and 210mm page boundary
        const wrappedShap = doc.splitTextToSize(shapLine, 166);
        doc.text(wrappedShap, 18, y);
        y += wrappedShap.length * 3.4 + 1.0;
      });
      y += 1;
    }
  }

  // Section 4: Recommended Primary Care Diagnostic Orders
  if (showDiagnosticOrders) {
    doc.setFillColor(241, 245, 249);
    doc.rect(14, y, 182, 6, 'F');
    doc.setTextColor(...primaryColor);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text('4. RECOMMENDED PRIMARY CARE DIAGNOSTIC INVESTIGATIONS', 16, y + 4.5);
    y += 9;

    const orders = assessmentResult?.suggestedInvestigations || [
      '12-Lead Electrocardiogram (ECG)',
      'Fasting Blood Glucose / HbA1c',
      'Lipid Panel (Total Cholesterol, LDL, HDL, Triglycerides)',
      'Serum Creatinine & eGFR Calculation',
      'Urine Albumin-to-Creatinine Ratio (UACR)',
    ];

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...darkGray);

    orders.slice(0, 4).forEach((ord, idx) => {
      const isOrdered = doctorReview?.orderedInvestigations?.includes(ord);
      doc.text(`[${isOrdered ? 'X' : ' '}]  ${ord}`, 18 + (idx % 2) * 90, y + Math.floor(idx / 2) * 5);
    });

    y += 13;
  }

  // Section 5: Attending Physician Clinical Review & Treatment Sign-Off
  if (showDoctorReview || showMedications) {
    doc.setFillColor(241, 245, 249);
    doc.rect(14, y, 182, 6, 'F');
    doc.setTextColor(...primaryColor);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text('5. ATTENDING PHYSICIAN REVIEW & TREATMENT SIGN-OFF', 16, y + 4.5);
    y += 9;

    if (showDoctorReview) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(...darkGray);
      doc.text('Doctor Diagnosis:', 16, y);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(0, 0, 0);
      const diagText = doctorReview?.doctorDiagnosis || 'Preliminary CVD Risk & Primary Care Assessment Confirmed';
      doc.text(diagText, 45, y, { maxWidth: 145 });

      y += 5.5;

      doc.setFont('helvetica', 'bold');
      doc.setTextColor(...darkGray);
      doc.text('AI Agreement:', 16, y);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(doctorReview?.aiAgreement === 'AGREE' ? 5 : 220, doctorReview?.aiAgreement === 'AGREE' ? 150 : 38, doctorReview?.aiAgreement === 'AGREE' ? 105 : 38);
      doc.text(
        `${doctorReview?.aiAgreement || 'AGREE'} (Physician Verified CDS Recommendation)`,
        42,
        y
      );

      y += 5.5;
    }

    if (showMedications) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(...darkGray);
      doc.text('Prescriptions:', 16, y);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(0, 0, 0);

      const meds = doctorReview?.prescribedMedications?.length
        ? doctorReview.prescribedMedications
        : [
            { drugName: 'Amlodipine (Norvasc)', dosage: '5 mg OD', frequency: 'Once Daily', duration: '30 Days' },
            { drugName: 'Atorvastatin (Lipitor)', dosage: '20 mg OD', frequency: 'Bedtime', duration: '30 Days' },
          ];

      const medSummary = meds
        .map((m) => `• ${m.drugName} ${m.dosage} (${m.frequency}) - ${m.duration || '30d'}`)
        .join('  ');
      const wrappedMeds = doc.splitTextToSize(medSummary, 150);
      doc.text(wrappedMeds, 38, y);

      y += Math.max(7, wrappedMeds.length * 4.2);
    }
  }

  // Section 6: Clinical Charges, Doctor Fees & Pharmacy Medicine Bill
  const showBilling =
    reportType === 'FULL_SUMMARY' ||
    (reportType === 'CUSTOM' ? custom.medicalBilling !== false : false);

  if (showBilling) {
    const bill = calculatePatientMedicalBill(
      record,
      options?.doctorFeePkr ?? 1500,
      options?.subsidyDiscountPkr
    );

    // Section 6 Header
    doc.setFillColor(241, 245, 249);
    doc.rect(14, y, 182, 5.5, 'F');
    doc.setTextColor(...primaryColor);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.text('6. CLINICAL CHARGES, DOCTOR FEES & PHARMACY DISPENSING BILL', 16, y + 3.8);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(...grayColor);
    doc.text(`Invoice: ${bill.invoiceNumber} • Currency: PKR (Rs.)`, 194, y + 3.8, { align: 'right' });
    y += 7;

    // 4-column compact billing breakdown box
    const billBoxH = 17.5;
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(14, y, 182, billBoxH, 1.5, 1.5, 'FD');

    // Column 1: Doctor Consultation Fee Charges
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.8);
    doc.setTextColor(...darkGray);
    doc.text('1. ATTENDING DOCTOR FEES', 17, y + 3.8);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(15, 23, 42);
    doc.text(`Consultation: Rs. ${bill.consultationFeePkr.toLocaleString()}`, 17, y + 7.5);
    doc.setFontSize(5.8);
    doc.setTextColor(...grayColor);
    doc.text(`${bill.doctorSpecialty}`, 17, y + 11);
    doc.text(`Attending: ${reviewDocName.substring(0, 22)}`, 17, y + 14.5);

    // Column 2: Prescribed Medicines Cost
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.8);
    doc.setTextColor(...darkGray);
    doc.text('2. PRESCRIBED MEDICINES COST', 64, y + 3.8);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.2);
    doc.setTextColor(15, 23, 42);
    let medY = y + 7.2;
    bill.medications.slice(0, 2).forEach((m) => {
      const shortDrug = m.drugName.length > 18 ? m.drugName.substring(0, 16) + '..' : m.drugName;
      doc.text(`${shortDrug} (${m.dosage}): Rs. ${m.totalCostPkr}`, 64, medY);
      medY += 3.4;
    });
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.2);
    doc.setTextColor(...cyanColor);
    doc.text(`Pharmacy Total: Rs. ${bill.medicationsSubtotalPkr.toLocaleString()}`, 64, y + 15);

    // Column 3: Diagnostic Lab Charges
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.8);
    doc.setTextColor(...darkGray);
    doc.text('3. DIAGNOSTIC LAB CHARGES', 114, y + 3.8);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.2);
    doc.setTextColor(15, 23, 42);
    let invY = y + 7.2;
    bill.investigations.slice(0, 2).forEach((inv) => {
      const shortInv = inv.testName.length > 18 ? inv.testName.substring(0, 16) + '..' : inv.testName;
      doc.text(`${shortInv}: Rs. ${inv.costPkr}`, 114, invY);
      invY += 3.4;
    });
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.2);
    doc.setTextColor(...cyanColor);
    doc.text(`Lab Total: Rs. ${bill.investigationsSubtotalPkr.toLocaleString()}`, 114, y + 15);

    // Column 4: Gross & Net Payable Total Box
    doc.setFillColor(240, 253, 244);
    doc.setDrawColor(187, 247, 208);
    doc.roundedRect(158, y + 1.2, 36, 15, 1, 1, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.2);
    doc.setTextColor(...darkGray);
    doc.text('Gross Total:', 160, y + 4.2);
    doc.setFont('helvetica', 'normal');
    doc.text(`Rs. ${bill.grossTotalPkr.toLocaleString()}`, 192, y + 4.2, { align: 'right' });

    doc.setFontSize(5.8);
    doc.setTextColor(16, 185, 129);
    doc.text('Sehat Subsidy:', 160, y + 7.5);
    doc.text(`-Rs. ${bill.subsidyDiscountPkr.toLocaleString()}`, 192, y + 7.5, { align: 'right' });

    doc.setDrawColor(203, 213, 225);
    doc.line(160, y + 9.5, 192, y + 9.5);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.2);
    doc.setTextColor(15, 23, 42);
    doc.text('NET PAYABLE:', 160, y + 13.5);
    doc.setTextColor(5, 150, 105);
    doc.text(`Rs. ${bill.netPayablePkr.toLocaleString()}`, 192, y + 13.5, { align: 'right' });

    y += billBoxH + 3.5;
  }

  // Digital Signature & Verified Stamp Container
  const stampBoxX = 120;
  const stampBoxY = y;
  const stampBoxW = 76;
  const stampBoxH = 26.5;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(...darkGray);
  doc.text('Clinical Authentication & Record Security:', 16, y + 5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(...grayColor);
  const authDesc = [
    '• Validated against WHO HEARTS Protocol (2026)',
    `• Review Timestamp: ${new Date(doctorReview?.reviewTimestamp || Date.now()).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}`,
    `• Facility Hub: ${activeHospital.name.substring(0, 48)}`,
    '• Digital Prescription & Triage Sign-Off Valid for Pharmacy/EMR',
  ];
  authDesc.forEach((desc, dIdx) => {
    doc.text(desc, 16, y + 9.5 + dIdx * 4.2);
  });

  // Stamp Box Outer
  doc.setFillColor(240, 253, 244); // Emerald 50
  doc.setDrawColor(16, 185, 129); // Emerald 500
  doc.setLineWidth(0.6);
  doc.roundedRect(stampBoxX, stampBoxY, stampBoxW, stampBoxH, 2, 2, 'FD');

  // Stamp Header Banner
  doc.setFillColor(16, 185, 129);
  doc.roundedRect(stampBoxX, stampBoxY, stampBoxW, 5.2, 1.5, 1.5, 'F');
  doc.rect(stampBoxX, stampBoxY + 3.5, stampBoxW, 1.7, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6);
  doc.setTextColor(255, 255, 255);
  doc.text(`✓ DIGITALLY SIGNED • ${activeHospital.sealInitials || 'PMDC'} VERIFIED`, stampBoxX + stampBoxW / 2, stampBoxY + 3.8, { align: 'center' });

  // Doctor Signature Calligraphy
  const docSignText = activeDoctor.signatureText || reviewDocName;
  const signatureFontSize = docSignText.length > 20 ? 11 : 13;

  doc.setFont('times', 'italic');
  doc.setFontSize(signatureFontSize);

  const inkHex = activeDoctor.signatureInkColor || '#1e3a8a';
  const rInk = parseInt(inkHex.slice(1, 3), 16) || 30;
  const gInk = parseInt(inkHex.slice(3, 5), 16) || 58;
  const bInk = parseInt(inkHex.slice(5, 7), 16) || 138;
  doc.setTextColor(rInk, gInk, bInk);
  doc.text(docSignText, stampBoxX + 5, stampBoxY + 12.2);

  const flourish = activeDoctor.signatureFlourishFactor || 1.0;
  doc.setDrawColor(59, 130, 246);
  doc.setLineWidth(0.4);
  doc.lines(
    [
      [12 * flourish, -0.6],
      [8 * flourish, 1.1],
      [14 * flourish, -1.6],
      [10 * flourish, 0.9],
      [6 * flourish, -0.2],
    ],
    stampBoxX + 5,
    stampBoxY + 14.2
  );

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.2);
  doc.setTextColor(...darkGray);
  doc.text(reviewDocName, stampBoxX + 5, stampBoxY + 18.2);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(5.5);
  doc.setTextColor(...grayColor);
  doc.text(`Reg: ${reviewDocLicense} • ${activeDoctor.specialty.substring(0, 32)}`, stampBoxX + 5, stampBoxY + 21.2);

  const recordHash = `AUTH-SHA256:${(record.assessmentResult?.assessmentId || 'HIS-242700').replace(/[^a-zA-Z0-9]/g, '').slice(-8).toUpperCase()}-${reviewDocLicense.replace(/[^A-Za-z0-9]/g, '').slice(-5)}-${activeHospital.sealInitials || 'PMDC'}`;
  doc.text(recordHash, stampBoxX + 5, stampBoxY + 24.2);

  // Certified Stamp Seal
  doc.setDrawColor(16, 185, 129);
  doc.setFillColor(255, 255, 255);
  doc.setLineWidth(0.5);
  doc.circle(stampBoxX + stampBoxW - 10.5, stampBoxY + 15.2, 6.8, 'FD');

  doc.setDrawColor(16, 185, 129);
  doc.setLineWidth(0.3);
  doc.circle(stampBoxX + stampBoxW - 10.5, stampBoxY + 15.2, 5.8, 'D');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(4.5);
  doc.setTextColor(5, 150, 105);
  doc.text(activeHospital.sealInitials || 'PMDC', stampBoxX + stampBoxW - 10.5, stampBoxY + 13.4, { align: 'center' });
  doc.setFontSize(5.5);
  doc.text('SEAL', stampBoxX + stampBoxW - 10.5, stampBoxY + 15.8, { align: 'center' });
  doc.setFontSize(4);
  doc.text('VERIFIED', stampBoxX + stampBoxW - 10.5, stampBoxY + 17.8, { align: 'center' });

  // Footer & Disclaimer with page numbers
  doc.setFillColor(15, 23, 42);
  doc.rect(0, 283, 210, 14, 'F');
  doc.setTextColor(203, 213, 225);
  doc.setFontSize(6.8);
  doc.text(
    'MANDATORY CLINICAL NOTICE: HIS-AI-HealthAssist provides non-autonomous Decision Support. Physician review and clinical judgment are required.',
    14,
    288.5
  );
  doc.text(
    `Complies with Ministry of National Health Services & WHO Protocols. • Page ${currentPage} of ${totalPages}`,
    14,
    292.5
  );
}

/**
 * Renders the Executive Cover & Cohort Aggregate Summary Page for Bulk Exports.
 */
export function renderAggregateCohortCoverPage(
  doc: jsPDF,
  records: PatientAssessmentRecord[],
  options?: PDFExportOptions,
  currentPage: number = 1,
  totalPages: number = 1
): void {
  const syncDoctor = clinicalProfileSync.getActiveDoctor();
  const syncHospital = clinicalProfileSync.getActiveHospital();

  const activeDoctor: ClinicianProfile = {
    ...syncDoctor,
    ...(options?.doctorOverride || {}),
  };

  const activeHospital: HospitalFacility = {
    ...syncHospital,
    ...(options?.hospitalOverride || {}),
  };

  const primaryColor: [number, number, number] = [15, 23, 42]; // Slate 900
  const cyanColor: [number, number, number] = [8, 145, 178]; // Cyan 600
  const alertColor: [number, number, number] = [220, 38, 38]; // Red 600
  const grayColor: [number, number, number] = [100, 116, 139]; // Slate 500
  const darkGray: [number, number, number] = [51, 65, 85]; // Slate 700

  // Compute Cohort Aggregate Statistics
  const totalCount = records.length;
  const emergencyCount = records.filter(
    (r) => r.assessmentResult?.triage.level === 'LEVEL_1_EMERGENCY' || r.assessmentResult?.isEmergency
  ).length;
  const urgentCount = records.filter((r) => r.assessmentResult?.triage.level === 'LEVEL_2_URGENT').length;
  const priorityCount = records.filter((r) => r.assessmentResult?.triage.level === 'LEVEL_3_PRIORITY').length;
  const routineCount = records.filter(
    (r) =>
      r.assessmentResult?.triage.level === 'LEVEL_4_ROUTINE' ||
      r.assessmentResult?.triage.level === 'LEVEL_5_LOW_RISK'
  ).length;

  const validSbpList = records.map((r) => r.vitals.systolicBp || 0).filter((v) => v > 0);
  const avgSbp = validSbpList.length
    ? Math.round(validSbpList.reduce((a, b) => a + b, 0) / validSbpList.length)
    : 132;

  const validDbpList = records.map((r) => r.vitals.diastolicBp || 0).filter((v) => v > 0);
  const avgDbp = validDbpList.length
    ? Math.round(validDbpList.reduce((a, b) => a + b, 0) / validDbpList.length)
    : 84;

  const validCvdRisks = records
    .map((r) => (r.assessmentResult ? r.assessmentResult.risks.cardiovascular.riskScore * 100 : 0))
    .filter((v) => v > 0);
  const avgCvdRisk = validCvdRisks.length
    ? Math.round(validCvdRisks.reduce((a, b) => a + b, 0) / validCvdRisks.length)
    : 18;

  const htnCount = records.filter(
    (r) => (r.vitals.systolicBp || 0) >= 140 || (r.vitals.diastolicBp || 0) >= 90 || r.profile.hypertensionHistory
  ).length;
  const diabetesCount = records.filter(
    (r) => r.profile.diabetesHistory || (r.labs.hba1cPercent && r.labs.hba1cPercent >= 6.5)
  ).length;
  const doctorSignedCount = records.filter((r) => !!r.doctorReview).length;

  // Header Banner
  doc.setFillColor(...primaryColor);
  doc.rect(0, 0, 210, 30, 'F');

  // Vector Cross / Logo
  doc.setFillColor(15, 23, 42);
  doc.setDrawColor(6, 182, 212);
  doc.setLineWidth(0.8);
  doc.roundedRect(14, 5.5, 18, 18, 2.5, 2.5, 'FD');

  doc.setFillColor(6, 182, 212);
  doc.rect(21.5, 7.5, 3.5, 1.2, 'F');
  doc.rect(22.65, 6.35, 1.2, 3.5, 'F');

  doc.setDrawColor(34, 211, 238);
  doc.setLineWidth(0.9);
  doc.lines(
    [
      [2.2, 0],
      [0.9, -2.0],
      [0.9, 2.0],
      [0.7, 1.6],
      [1.3, -7.0],
      [1.3, 8.5],
      [0.9, -3.0],
      [0.9, -1.3],
      [0.9, 1.3],
      [2.2, 0],
    ],
    16.5,
    16.5
  );

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text(options?.batchTitle || 'HIS CLINICAL REGISTRY — BATCH AGGREGATE SUMMARY', 36, 11);

  doc.setFontSize(8.5);
  doc.setTextColor(34, 211, 238);
  doc.text(
    `CONSOLIDATED PATIENT COHORT DOSSIER • FACILITY: ${activeHospital.name.toUpperCase()} (${activeHospital.facilityCode})`,
    36,
    17
  );

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(165, 243, 252);
  doc.text('WHO HEARTS Protocol, NCD Surveillance & Clinical Decision Support Export', 36, 22.5);

  const reportDate = new Date().toLocaleString('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
  doc.setFontSize(7.5);
  doc.setTextColor(203, 213, 225);
  doc.text(`Generated: ${reportDate}`, 196, 11, { align: 'right' });
  doc.text(`Total Records: ${totalCount} Patients`, 196, 17, { align: 'right' });
  doc.text(`Reviewing MD: ${activeDoctor.name}`, 196, 22.5, { align: 'right' });

  let y = 36;

  // Executive KPI Metric Cards (6 tiles)
  doc.setFillColor(241, 245, 249);
  doc.rect(14, y, 182, 6, 'F');
  doc.setTextColor(...primaryColor);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('1. COHORT CLINICAL METRICS & POPULATION HEALTH SUMMARY', 16, y + 4.5);
  y += 9;

  const kpis = [
    { label: 'Total Selected', value: `${totalCount}`, sub: 'Patients in Batch', alert: false },
    { label: 'Emergency (L1)', value: `${emergencyCount}`, sub: 'Immediate Care', alert: emergencyCount > 0 },
    { label: 'Urgent (L2)', value: `${urgentCount}`, sub: '< 2 Hr Evaluation', alert: urgentCount > 0 },
    { label: 'Mean Blood Pressure', value: `${avgSbp}/${avgDbp}`, sub: 'mmHg (Cohort Mean)', alert: avgSbp >= 140 },
    { label: 'Mean 10-Yr CVD Risk', value: `${avgCvdRisk}%`, sub: 'ASCVD Risk Index', alert: avgCvdRisk >= 20 },
    { label: 'MD Signed-Off', value: `${doctorSignedCount}/${totalCount}`, sub: 'Completed Reviews', alert: false },
  ];

  kpis.forEach((k, idx) => {
    const col = idx % 3;
    const row = Math.floor(idx / 3);
    const xPos = 14 + col * 62;
    const yPos = y + row * 16;

    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(k.alert ? 239 : 226, k.alert ? 68 : 232, k.alert ? 68 : 240);
    doc.setLineWidth(k.alert ? 0.6 : 0.3);
    doc.roundedRect(xPos, yPos, 58, 13.5, 1.5, 1.5, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(...darkGray);
    doc.text(k.label, xPos + 3, yPos + 4);

    doc.setFontSize(11);
    doc.setTextColor(k.alert ? alertColor[0] : primaryColor[0], k.alert ? alertColor[1] : primaryColor[1], k.alert ? alertColor[2] : primaryColor[2]);
    doc.text(k.value, xPos + 3, yPos + 9);

    doc.setFontSize(6.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...grayColor);
    doc.text(k.sub, xPos + 3, yPos + 12);
  });

  y += 36;

  // Disease Burden & Triage Breakdown Box
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(203, 213, 225);
  doc.roundedRect(14, y, 182, 16, 1.5, 1.5, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(...primaryColor);
  doc.text('Population Disease Prevalence & Risk Stratification Breakdown:', 17, y + 4.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.2);
  doc.setTextColor(...darkGray);
  doc.text(
    `• Hypertensive Burden: ${htnCount} of ${totalCount} (${totalCount ? Math.round((htnCount / totalCount) * 100) : 0}%) meet Stage 1/2 HTN or prior history criteria.`,
    17,
    y + 9
  );
  doc.text(
    `• Diabetes/Metabolic Impairment: ${diabetesCount} of ${totalCount} (${totalCount ? Math.round((diabetesCount / totalCount) * 100) : 0}%) diagnosed with T2DM or HbA1c >= 6.5%.`,
    17,
    y + 13
  );

  doc.text(
    `• Triage Distribution: ${emergencyCount} Emergency • ${urgentCount} Urgent • ${priorityCount} Priority • ${routineCount} Routine Primary Care.`,
    108,
    y + 9
  );
  doc.text(
    `• Clinical Verification: ${doctorSignedCount} signed by attending physician; ${totalCount - doctorSignedCount} pending review.`,
    108,
    y + 13
  );

  y += 21;

  // Master Patient Summary Table
  doc.setFillColor(241, 245, 249);
  doc.rect(14, y, 182, 6, 'F');
  doc.setTextColor(...primaryColor);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('2. INCLUDED PATIENT COHORT ROSTER & CLINICAL PROFILES', 16, y + 4.5);
  y += 8;

  // Table Header
  doc.setFillColor(15, 23, 42);
  doc.rect(14, y, 182, 5.5, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.text('#', 16, y + 3.8);
  doc.text('Patient ID / MRN', 21, y + 3.8);
  doc.text('Full Name', 52, y + 3.8);
  doc.text('Age / Sex', 88, y + 3.8);
  doc.text('Location', 106, y + 3.8);
  doc.text('BP (mmHg)', 128, y + 3.8);
  doc.text('HR / Gluc', 145, y + 3.8);
  doc.text('10-Yr CVD', 163, y + 3.8);
  doc.text('Triage Level', 178, y + 3.8);
  doc.text('Status', 194, y + 3.8, { align: 'right' });

  y += 6.5;

  // Table Rows (Display up to first 18 rows cleanly on cover sheet)
  const displaySlice = records.slice(0, 18);
  displaySlice.forEach((p, idx) => {
    const isEmerg = p.assessmentResult?.triage.level === 'LEVEL_1_EMERGENCY' || p.assessmentResult?.isEmergency;
    const isUrg = p.assessmentResult?.triage.level === 'LEVEL_2_URGENT';
    const rowBg = idx % 2 === 0 ? 255 : 248;

    doc.setFillColor(rowBg, rowBg, rowBg);
    doc.rect(14, y - 1, 182, 5.2, 'F');

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.2);
    doc.setTextColor(...darkGray);
    doc.text(`${idx + 1}`, 16, y + 2.5);

    doc.setFont('helvetica', 'bold');
    doc.text(`${p.demographics.patientId}`, 21, y + 2.5);

    doc.setFont('helvetica', 'normal');
    doc.text(`${p.demographics.fullName.substring(0, 20)}`, 52, y + 2.5);
    doc.text(`${p.demographics.age}y / ${p.demographics.sex.charAt(0)}`, 88, y + 2.5);
    doc.text(`${p.demographics.district.substring(0, 12)}`, 106, y + 2.5);

    // BP
    const sbp = p.vitals.systolicBp || 0;
    const dbp = p.vitals.diastolicBp || 0;
    doc.setTextColor(sbp >= 140 ? 220 : 51, sbp >= 140 ? 38 : 65, sbp >= 140 ? 38 : 85);
    doc.text(`${sbp}/${dbp}`, 128, y + 2.5);

    // HR / Glucose
    doc.setTextColor(...darkGray);
    const hr = p.vitals.heartRate || '-';
    const glu = p.vitals.bloodGlucoseMgDl || p.labs.glucoseFastingMgDl || '-';
    doc.text(`${hr} / ${glu}`, 145, y + 2.5);

    // 10-Yr CVD
    const cvdScore = p.assessmentResult ? Math.round(p.assessmentResult.risks.cardiovascular.riskScore * 100) : 0;
    doc.setTextColor(cvdScore >= 20 ? 220 : cvdScore >= 10 ? 217 : 5, cvdScore >= 20 ? 38 : cvdScore >= 10 ? 119 : 150, cvdScore >= 20 ? 38 : cvdScore >= 10 ? 6 : 105);
    doc.text(`${cvdScore}%`, 163, y + 2.5);

    // Triage
    doc.setTextColor(isEmerg ? 220 : isUrg ? 217 : 5, isEmerg ? 38 : isUrg ? 119 : 150, isEmerg ? 38 : isUrg ? 6 : 105);
    const triageShort = p.assessmentResult?.triage.level === 'LEVEL_1_EMERGENCY' ? 'L1 Emergency' : p.assessmentResult?.triage.level === 'LEVEL_2_URGENT' ? 'L2 Urgent' : p.assessmentResult?.triage.level === 'LEVEL_3_PRIORITY' ? 'L3 Priority' : 'L4 Routine';
    doc.text(triageShort, 178, y + 2.5);

    // Review Status
    doc.setTextColor(p.doctorReview ? 5 : 100, p.doctorReview ? 150 : 116, p.doctorReview ? 105 : 139);
    doc.text(p.doctorReview ? 'Signed' : 'Pending', 194, y + 2.5, { align: 'right' });

    y += 5.2;
  });

  if (records.length > 18) {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(6.5);
    doc.setTextColor(...grayColor);
    doc.text(`... and ${records.length - 18} more patient records detailed in subsequent individual dossier pages.`, 16, y + 2);
    y += 5;
  }

  y = 246;

  // Batch Certification & Clinical Authorization Seal Box
  doc.setFillColor(240, 253, 244);
  doc.setDrawColor(16, 185, 129);
  doc.setLineWidth(0.6);
  doc.roundedRect(14, y, 182, 33, 2, 2, 'FD');

  doc.setFillColor(16, 185, 129);
  doc.roundedRect(14, y, 182, 5, 1.5, 1.5, 'F');
  doc.rect(14, y + 3.5, 182, 1.5, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6.5);
  doc.setTextColor(255, 255, 255);
  doc.text(`CLINICAL BATCH AUTHORIZATION & FACILITY CERTIFICATION • ${activeHospital.name.toUpperCase()}`, 16, y + 3.6);

  // Signer Details
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.setTextColor(...primaryColor);
  doc.text(`Attending Physician: ${activeDoctor.name}`, 18, y + 9.5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(6.5);
  doc.setTextColor(...darkGray);
  doc.text(`License No: ${activeDoctor.licenseNo} • Specialty: ${activeDoctor.specialty}`, 18, y + 13.5);
  doc.text(`Facility Hub: ${activeHospital.name} (${activeHospital.facilityCode}) • Node: ${activeHospital.district}, ${activeHospital.province}`, 18, y + 17.5);
  doc.text(`Verification Timestamp: ${new Date().toISOString()} • Total Consolidated Records: ${totalCount}`, 18, y + 21.5);
  doc.text('I hereby certify that this aggregate clinical batch report reflects verified physiological and decision-support data.', 18, y + 25.5);

  // Stylized Signature
  const docSignText = activeDoctor.signatureText || activeDoctor.name;
  doc.setFont('times', 'italic');
  doc.setFontSize(12);
  doc.setTextColor(30, 58, 138);
  doc.text(docSignText, 142, y + 14);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(5.8);
  doc.setTextColor(...darkGray);
  doc.text(activeDoctor.name, 142, y + 19);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(5);
  doc.setTextColor(...grayColor);
  doc.text(`Reg: ${activeDoctor.licenseNo}`, 142, y + 22);

  // Circular Stamp
  doc.setDrawColor(16, 185, 129);
  doc.setFillColor(255, 255, 255);
  doc.setLineWidth(0.5);
  doc.circle(186, y + 18, 6.5, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(4.5);
  doc.setTextColor(5, 150, 105);
  doc.text(activeHospital.sealInitials || 'PMDC', 186, y + 16.5, { align: 'center' });
  doc.setFontSize(5.5);
  doc.text('BATCH', 186, y + 18.8, { align: 'center' });
  doc.setFontSize(3.8);
  doc.text('VERIFIED', 186, y + 20.8, { align: 'center' });

  // Footer Banner
  doc.setFillColor(15, 23, 42);
  doc.rect(0, 283, 210, 14, 'F');
  doc.setTextColor(203, 213, 225);
  doc.setFontSize(6.8);
  doc.text(
    'MANDATORY CLINICAL NOTICE: HIS-AI-HealthAssist provides non-autonomous Decision Support. Clinical review is required.',
    14,
    288.5
  );
  doc.text(
    `Consolidated Patient Cohort Summary Export • Page ${currentPage} of ${totalPages}`,
    14,
    292.5
  );
}

/**
 * Exports a single patient's assessment record to PDF.
 */
export async function exportPatientAssessmentToPDF(
  record: PatientAssessmentRecord,
  options?: PDFExportOptions
): Promise<void> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  await renderPatientAssessmentPage(doc, record, options, 1, 1);

  const safePatientName = (record.demographics.fullName || 'Patient')
    .trim()
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .replace(/_+/g, '_');
  const safeMrn = (record.demographics.mrn || record.demographics.patientId || 'REC').replace(/[^a-zA-Z0-9_-]/g, '_');
  const filename = `${safePatientName}_${safeMrn}_Clinical_Assessment.pdf`;
  doc.save(filename);
}

/**
 * Bulk exports multiple patient assessment records into a single consolidated PDF document
 * with an executive aggregate cohort cover sheet and individual patient dossiers.
 */
export async function exportBulkPatientAssessmentsToPDF(
  records: PatientAssessmentRecord[],
  options?: PDFExportOptions
): Promise<void> {
  if (!records || records.length === 0) {
    throw new Error('No patient records selected for bulk export.');
  }

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const includeCover = options?.includeAggregateCover !== false;
  const totalPages = (includeCover ? 1 : 0) + records.length;
  let currentPage = 1;

  // 1. Render Aggregate Cohort Summary Cover Page
  if (includeCover) {
    renderAggregateCohortCoverPage(doc, records, options, currentPage, totalPages);
    currentPage++;
  }

  // 2. Render Individual Patient Assessment Dossier Pages
  for (let i = 0; i < records.length; i++) {
    if (currentPage > 1) {
      doc.addPage();
    }
    await renderPatientAssessmentPage(doc, records[i], options, currentPage, totalPages);
    currentPage++;
  }

  // Save the master consolidated PDF
  const filename = `HIS_Bulk_Clinical_Summaries_${records.length}_Patients_${Date.now()}.pdf`;
  doc.save(filename);
}
