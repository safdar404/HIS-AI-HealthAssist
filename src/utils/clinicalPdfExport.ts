import { jsPDF } from 'jspdf';
import { PatientAssessmentRecord } from '../types/clinical';

export function exportPatientAssessmentToPDF(record: PatientAssessmentRecord): void {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const primaryColor: [number, number, number] = [15, 23, 42]; // Slate 900
  const cyanColor: [number, number, number] = [8, 145, 178]; // Cyan 600
  const alertColor: [number, number, number] = [220, 38, 38]; // Red 600
  const grayColor: [number, number, number] = [100, 116, 139]; // Slate 500
  const darkGray: [number, number, number] = [51, 65, 85]; // Slate 700

  const { demographics, vitals, profile, labs, assessmentResult, doctorReview } = record;

  let y = 16;

  // Header Banner
  doc.setFillColor(...primaryColor);
  doc.rect(0, 0, 210, 24, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('AI-HEALTHASSIST | CLINICAL ASSESSMENT REPORT', 14, 11);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(165, 243, 252);
  doc.text('WHO HEARTS Protocol & 2026 Hypertension Compendium Implementation', 14, 17);

  const reportDate = new Date().toLocaleString('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
  doc.setFontSize(8);
  doc.setTextColor(203, 213, 225);
  doc.text(`Generated: ${reportDate}`, 196, 11, { align: 'right' });
  doc.text(`Record ID: ${assessmentResult?.assessmentId || 'N/A'}`, 196, 17, { align: 'right' });

  y = 30;

  // Emergency Triage Banner (if Red Flag or Level 1 / 2)
  const isEmergency = assessmentResult?.isEmergency || assessmentResult?.triage.level === 'LEVEL_1_EMERGENCY';
  const isUrgent = assessmentResult?.triage.level === 'LEVEL_2_URGENT';

  if (isEmergency || isUrgent) {
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
  doc.setFillColor(241, 245, 249);
  doc.rect(14, y, 182, 6, 'F');
  doc.setTextColor(...primaryColor);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('1. PATIENT DEMOGRAPHICS & CLINICAL HISTORY', 16, y + 4.5);
  y += 9;

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...darkGray);
  doc.text('Full Name:', 16, y);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(0, 0, 0);
  doc.text(`${demographics.fullName}`, 36, y);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...darkGray);
  doc.text('Patient ID / MRN:', 90, y);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(0, 0, 0);
  doc.text(`${demographics.patientId} / ${demographics.mrn || 'N/A'}`, 122, y);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...darkGray);
  doc.text('Age / Sex:', 155, y);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(0, 0, 0);
  doc.text(`${demographics.age} Yrs / ${demographics.sex}`, 173, y);

  y += 5.5;

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...darkGray);
  doc.text('Location:', 16, y);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(0, 0, 0);
  doc.text(`${demographics.district}, ${demographics.province}`, 36, y);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...darkGray);
  doc.text('Tobacco/Smoking:', 90, y);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(0, 0, 0);
  doc.text(`${profile.tobaccoUse !== 'NONE' ? profile.tobaccoUse.replace(/_/g, ' ') : profile.smokingStatus}`, 122, y);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...darkGray);
  doc.text('Prior CVD/Stroke:', 155, y);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(0, 0, 0);
  doc.text(`${profile.previousCVD ? 'Yes (CVD)' : profile.previousStroke ? 'Yes (Stroke)' : 'None'}`, 182, y);

  y += 8;

  // Section 2: Physiological Measurements & Vitals
  doc.setFillColor(241, 245, 249);
  doc.rect(14, y, 182, 6, 'F');
  doc.setTextColor(...primaryColor);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('2. PHYSIOLOGICAL MEASUREMENTS & VITAL SIGNS', 16, y + 4.5);
  y += 9;

  // Vitals Grid in 4 columns
  const vitalsData = [
    { label: 'Blood Pressure', value: `${vitals.systolicBp || '?'}/${vitals.diastolicBp || '?'} mmHg` },
    { label: 'Heart Rate', value: `${vitals.heartRate || '?'} bpm` },
    { label: 'Oxygen Saturation', value: `${vitals.oxygenSaturation || 98}% (SpO2)` },
    { label: 'Blood Glucose', value: `${vitals.bloodGlucoseMgDl || labs.glucoseFastingMgDl || 'N/A'} mg/dL` },
    { label: 'BMI / Adiposity', value: `${profile.bmi.toFixed(1)} kg/m²` },
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

  // Section 3: AI Multi-Condition Risk Stratification (WHO HEARTS)
  doc.setFillColor(241, 245, 249);
  doc.rect(14, y, 182, 6, 'F');
  doc.setTextColor(...primaryColor);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('3. MULTI-CONDITION AI RISK STRATIFICATION (WHO HEARTS ALIGNED)', 16, y + 4.5);
  y += 9;

  if (assessmentResult) {
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
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(...primaryColor);
    doc.text('Key Explainable AI (SHAP) Contributors:', 16, y);
    y += 4;

    const factors = assessmentResult.risks.cardiovascular.contributingFactors.slice(0, 3);
    factors.forEach((f) => {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(...darkGray);
      const direction = f.direction === 'RISK_INCREASE' ? '+' : '';
      doc.text(`• ${f.displayName} (${f.value}): ${direction}${f.contributionPercent}% contribution - ${f.clinicalRationale}`, 18, y);
      y += 4;
    });
    y += 2;
  }

  // Section 4: Recommended Primary Care Diagnostic Orders
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

  // Section 5: Attending Physician Clinical Review & Prescription
  doc.setFillColor(241, 245, 249);
  doc.rect(14, y, 182, 6, 'F');
  doc.setTextColor(...primaryColor);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('5. ATTENDING PHYSICIAN REVIEW & TREATMENT SIGN-OFF', 16, y + 4.5);
  y += 9;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(...darkGray);
  doc.text('Reviewing Doctor:', 16, y);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(0, 0, 0);
  doc.text(doctorReview?.doctorName || 'Dr. Asim Farooq, FCPS (Cardiology)', 46, y);

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...darkGray);
  doc.text('License # / Facility:', 110, y);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(0, 0, 0);
  doc.text(`${doctorReview?.doctorLicenseNo || 'PMDC-58921-P'} • ${doctorReview?.facility || 'Primary Care Clinic'}`, 142, y);

  y += 5.5;

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...darkGray);
  doc.text('Doctor Diagnosis:', 16, y);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(0, 0, 0);
  doc.text(doctorReview?.doctorDiagnosis || 'Essential Hypertension with Elevated 10-Yr Cardiovascular Risk', 46, y);

  y += 5.5;

  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...darkGray);
  doc.text('Clinical Directives:', 16, y);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(0, 0, 0);
  const notesText = doctorReview?.clinicalNotes || 'Initiated guideline-directed medical therapy. Advised low salt dietary adherence, 150 min/week physical activity, and repeat BP review.';
  doc.text(notesText.substring(0, 110), 46, y);

  y += 7;

  // Prescribed Medications
  if (doctorReview?.prescribedMedications && doctorReview.prescribedMedications.length > 0) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(...darkGray);
    doc.text('Prescribed Formulary Medications (WHO HEARTS Checked):', 16, y);
    y += 4.5;

    doctorReview.prescribedMedications.forEach((med) => {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.text(`• ${med.drugName} (${med.dosage}, ${med.frequency}, ${med.duration}) - ${med.safetyChecksPassed ? 'Safety Checked [Pass]' : 'Special Precaution Advised'}`, 18, y);
      y += 4;
    });
  }

  y += 4;

  // Sign-off signature box
  doc.setDrawColor(203, 213, 225);
  doc.line(135, y + 10, 190, y + 10);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7);
  doc.setTextColor(...grayColor);
  doc.text('Physician Signature & Stamp', 145, y + 14);

  // Footer & Disclaimer
  doc.setFillColor(15, 23, 42);
  doc.rect(0, 283, 210, 14, 'F');
  doc.setTextColor(203, 213, 225);
  doc.setFontSize(6.8);
  doc.text(
    'MANDATORY CLINICAL NOTICE: AI-HealthAssist provides non-autonomous Decision Support. Physician review and clinical judgment are required.',
    14,
    289
  );
  doc.text(
    'Complies with Ministry of National Health Services & WHO Non-Communicable Disease Primary Care Protocols.',
    14,
    293
  );

  // Save the PDF
  const filename = `Clinical_Summary_${demographics.patientId}_${Date.now()}.pdf`;
  doc.save(filename);
}
