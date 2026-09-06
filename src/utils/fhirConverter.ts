import { PatientAssessmentRecord } from '../types/clinical';
import { performFullClinicalAnalysis } from '../clinical/mlRiskEngine';

/**
 * HL7 FHIR R4 standard JSON generator and parser
 * Converts internal clinical assessment records to FHIR R4 compliant Bundles.
 */

export interface FHIRResource {
  resourceType: string;
  id: string;
  [key: string]: any;
}

export interface FHIRBundle {
  resourceType: 'Bundle';
  type: 'collection' | 'transaction';
  timestamp: string;
  total: number;
  entry: Array<{
    fullUrl: string;
    resource: FHIRResource;
  }>;
}

export function convertRecordToFHIRBundle(record: PatientAssessmentRecord): FHIRBundle {
  const patientId = record.demographics.patientId;
  const timestamp = record.assessmentResult?.timestamp || new Date().toISOString();
  const entries: Array<{ fullUrl: string; resource: FHIRResource }> = [];

  // 1. FHIR Patient Resource
  const patientResource: FHIRResource = {
    resourceType: 'Patient',
    id: patientId,
    identifier: [
      {
        use: 'official',
        system: 'urn:oid:ai-healthassist:patients',
        value: patientId,
      },
      ...(record.demographics.mrn
        ? [
            {
              use: 'usual',
              type: {
                coding: [
                  {
                    system: 'http://terminology.hl7.org/CodeSystem/v2-0203',
                    code: 'MR',
                    display: 'Medical Record Number',
                  },
                ],
              },
              system: 'urn:oid:hospital:mrn',
              value: record.demographics.mrn,
            },
          ]
        : []),
    ],
    active: true,
    name: [
      {
        use: 'official',
        text: record.demographics.fullName,
      },
    ],
    gender: record.demographics.sex === 'MALE' ? 'male' : record.demographics.sex === 'FEMALE' ? 'female' : 'other',
    address: [
      {
        use: 'home',
        district: record.demographics.district,
        state: record.demographics.province,
        country: 'Pakistan',
        line: [record.demographics.tehsil || '', record.demographics.unionCouncil || ''].filter(Boolean),
      },
    ],
    telecom: record.demographics.phone
      ? [
          {
            system: 'phone',
            value: record.demographics.phone,
            use: 'mobile',
          },
        ]
      : undefined,
  };

  entries.push({
    fullUrl: `urn:uuid:patient-${patientId}`,
    resource: patientResource,
  });

  // 2. Vital Signs Observations (LOINC coded)
  // Blood Pressure (LOINC 85354-9)
  if (record.vitals.systolicBp && record.vitals.diastolicBp) {
    entries.push({
      fullUrl: `urn:uuid:observation-bp-${patientId}`,
      resource: {
        resourceType: 'Observation',
        id: `obs-bp-${patientId}`,
        status: 'final',
        category: [
          {
            coding: [
              {
                system: 'http://terminology.hl7.org/CodeSystem/observation-category',
                code: 'vital-signs',
                display: 'Vital Signs',
              },
            ],
          },
        ],
        code: {
          coding: [
            {
              system: 'http://loinc.org',
              code: '85354-9',
              display: 'Blood pressure panel with all children optional',
            },
          ],
          text: 'Blood Pressure',
        },
        subject: {
          reference: `Patient/${patientId}`,
        },
        effectiveDateTime: record.vitals.measurementTime || timestamp,
        component: [
          {
            code: {
              coding: [
                {
                  system: 'http://loinc.org',
                  code: '8480-6',
                  display: 'Systolic blood pressure',
                },
              ],
            },
            valueQuantity: {
              value: record.vitals.systolicBp,
              unit: 'mmHg',
              system: 'http://unitsofmeasure.org',
              code: 'mm[Hg]',
            },
          },
          {
            code: {
              coding: [
                {
                  system: 'http://loinc.org',
                  code: '8462-4',
                  display: 'Diastolic blood pressure',
                },
              ],
            },
            valueQuantity: {
              value: record.vitals.diastolicBp,
              unit: 'mmHg',
              system: 'http://unitsofmeasure.org',
              code: 'mm[Hg]',
            },
          },
        ],
      },
    });
  }

  // Heart Rate (LOINC 8867-4)
  if (record.vitals.heartRate) {
    entries.push({
      fullUrl: `urn:uuid:observation-hr-${patientId}`,
      resource: {
        resourceType: 'Observation',
        id: `obs-hr-${patientId}`,
        status: 'final',
        code: {
          coding: [
            {
              system: 'http://loinc.org',
              code: '8867-4',
              display: 'Heart rate',
            },
          ],
        },
        subject: { reference: `Patient/${patientId}` },
        effectiveDateTime: record.vitals.measurementTime || timestamp,
        valueQuantity: {
          value: record.vitals.heartRate,
          unit: 'beats/minute',
          system: 'http://unitsofmeasure.org',
          code: '/min',
        },
      },
    });
  }

  // Oxygen Saturation (LOINC 2708-6)
  if (record.vitals.oxygenSaturation) {
    entries.push({
      fullUrl: `urn:uuid:observation-spo2-${patientId}`,
      resource: {
        resourceType: 'Observation',
        id: `obs-spo2-${patientId}`,
        status: 'final',
        code: {
          coding: [
            {
              system: 'http://loinc.org',
              code: '2708-6',
              display: 'Oxygen saturation in Arterial blood',
            },
          ],
        },
        subject: { reference: `Patient/${patientId}` },
        effectiveDateTime: record.vitals.measurementTime || timestamp,
        valueQuantity: {
          value: record.vitals.oxygenSaturation,
          unit: '%',
          system: 'http://unitsofmeasure.org',
          code: '%',
        },
      },
    });
  }

  // Fasting Blood Glucose (LOINC 1558-6)
  const glucoseVal = record.vitals.bloodGlucoseMgDl || record.labs.glucoseFastingMgDl;
  if (glucoseVal) {
    entries.push({
      fullUrl: `urn:uuid:observation-glucose-${patientId}`,
      resource: {
        resourceType: 'Observation',
        id: `obs-glucose-${patientId}`,
        status: 'final',
        code: {
          coding: [
            {
              system: 'http://loinc.org',
              code: '1558-6',
              display: 'Fasting glucose [Mass/volume] in Blood',
            },
          ],
        },
        subject: { reference: `Patient/${patientId}` },
        effectiveDateTime: timestamp,
        valueQuantity: {
          value: glucoseVal,
          unit: 'mg/dL',
          system: 'http://unitsofmeasure.org',
          code: 'mg/dL',
        },
      },
    });
  }

  // 3. Risk Assessment Resource (HL7 FHIR RiskAssessment)
  if (record.assessmentResult) {
    const cvdRisk = record.assessmentResult.risks.cardiovascular;
    entries.push({
      fullUrl: `urn:uuid:riskassessment-cvd-${patientId}`,
      resource: {
        resourceType: 'RiskAssessment',
        id: `risk-cvd-${patientId}`,
        status: 'final',
        subject: { reference: `Patient/${patientId}` },
        occurrenceDateTime: timestamp,
        method: {
          coding: [
            {
              system: 'http://who.int/hearts/protocols',
              code: 'WHO-HEARTS-CVD-10YR',
              display: 'WHO HEARTS 10-Year Cardiovascular Risk Protocol',
            },
          ],
        },
        prediction: [
          {
            outcome: {
              text: '10-Year Fatal/Non-fatal Cardiovascular Event Risk (ASCVD)',
            },
            probabilityDecimal: cvdRisk.riskScore,
            qualitativeRisk: {
              coding: [
                {
                  system: 'http://terminology.hl7.org/CodeSystem/risk-probability',
                  code: cvdRisk.riskCategory.toLowerCase(),
                  display: cvdRisk.riskCategory,
                },
              ],
            },
          },
        ],
        note: [
          {
            text: `Triage Classification: ${record.assessmentResult.triage.levelName}. Data Reliability: ${record.assessmentResult.dataCompleteness.reliabilityGrade}.`,
          },
        ],
      },
    });
  }

  return {
    resourceType: 'Bundle',
    type: 'collection',
    timestamp: new Date().toISOString(),
    total: entries.length,
    entry: entries,
  };
}

/**
 * Exports multiple records as a combined FHIR Bundle JSON file
 */
export function exportAllToFHIRJSON(records: PatientAssessmentRecord[]): void {
  const masterBundle: FHIRBundle = {
    resourceType: 'Bundle',
    type: 'collection',
    timestamp: new Date().toISOString(),
    total: 0,
    entry: [],
  };

  for (const record of records) {
    const patientBundle = convertRecordToFHIRBundle(record);
    masterBundle.entry.push(...patientBundle.entry);
  }

  masterBundle.total = masterBundle.entry.length;

  const jsonStr = JSON.stringify(masterBundle, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/fhir+json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `FHIR_R4_Patient_Registry_${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Export patient roster to CSV format for hospital database interoperability and administrative reporting
 */
export function exportPatientsToCSV(
  records: PatientAssessmentRecord[],
  options?: {
    filename?: string;
    reportTitle?: string;
  }
): void {
  const sanitize = (val: any): string => {
    if (val === null || val === undefined) return '""';
    let str = String(val).trim();
    // Formula injection mitigation (RFC-4180 safe)
    if (/^[=+\-@\t\r]/.test(str)) {
      str = `'${str}`;
    }
    return `"${str.replace(/"/g, '""')}"`;
  };

  const headers = [
    'Patient ID',
    'MRN',
    'Full Name',
    'Age',
    'Sex',
    'District',
    'Province',
    'Systolic BP (mmHg)',
    'Diastolic BP (mmHg)',
    'Heart Rate (bpm)',
    'SpO2 (%)',
    'Blood Glucose (mg/dL)',
    'BMI (kg/m²)',
    'CVD 10-Yr Risk (%)',
    'CVD Risk Category',
    'Triage Level',
    'Emergency Flag',
    'Disposition / Discharge Status',
    'Pending Labs / Missing Investigations',
    'Follow-up Tasks / Recalls',
    'Doctor Reviewed',
    'Reviewing Physician',
    'Physician License (PMDC)',
    'Primary Clinical Diagnosis',
    'Prescribed Medications',
    'Ordered Investigations',
    'Referral Required',
    'Referral Facility',
    'Assessment Date & Time',
  ];

  const rows = records.map((r) => {
    const isEmergency = r.assessmentResult?.triage.level === 'LEVEL_1_EMERGENCY' || r.assessmentResult?.isEmergency;
    const disposition = r.doctorReview?.referralRequired
      ? 'Specialist Referral'
      : isEmergency
      ? 'Emergency Admission'
      : r.doctorReview
      ? 'Discharged Home'
      : 'In-Clinic / Active Assessment';

    // Pending labs
    const pendingLabsList: string[] = [];
    if (r.doctorReview?.orderedInvestigations?.length) {
      pendingLabsList.push(...r.doctorReview.orderedInvestigations);
    }
    if (!r.labs.creatinineMgDl && !r.labs.egfr) pendingLabsList.push('Creatinine/eGFR');
    if (!r.labs.glucoseFastingMgDl && !r.labs.hba1cPercent && (r.profile.diabetesHistory || (r.vitals.bloodGlucoseMgDl || 0) >= 140)) {
      pendingLabsList.push('HbA1c/FPG');
    }
    if (!r.labs.totalCholesterolMgDl && !r.labs.ldlCholesterolMgDl && (r.profile.hypertensionHistory || (r.assessmentResult?.risks.cardiovascular.riskScore || 0) >= 0.1)) {
      pendingLabsList.push('Lipids');
    }

    // Follow up task
    const followUpTask = isEmergency
      ? 'Immediate Resuscitation & Bedside Re-eval'
      : r.assessmentResult?.triage.level === 'LEVEL_2_URGENT'
      ? 'Urgent Review (24-48h)'
      : r.doctorReview?.referralRequired
      ? `Referral Follow-up: ${r.doctorReview.referralFacility || 'Tertiary Center'}`
      : r.assessmentResult?.triage.level === 'LEVEL_3_PRIORITY'
      ? 'Priority Follow-up (7 Days)'
      : 'Routine Recall (30 Days)';

    const cvdPct = r.assessmentResult ? ((r.assessmentResult.risks.cardiovascular.riskScore || 0) * 100).toFixed(0) : '';
    const cvdCategory = r.assessmentResult?.risks.cardiovascular.riskCategory || 'PENDING';

    return [
      sanitize(r.demographics.patientId),
      sanitize(r.demographics.mrn || ''),
      sanitize(r.demographics.fullName),
      r.demographics.age,
      sanitize(r.demographics.sex),
      sanitize(r.demographics.district),
      sanitize(r.demographics.province),
      r.vitals.systolicBp || '',
      r.vitals.diastolicBp || '',
      r.vitals.heartRate || '',
      r.vitals.oxygenSaturation || '',
      r.vitals.bloodGlucoseMgDl || r.labs.glucoseFastingMgDl || '',
      r.profile.bmi ? r.profile.bmi.toFixed(1) : '',
      cvdPct,
      sanitize(cvdCategory),
      sanitize(r.assessmentResult?.triage.levelName || 'Pending Assessment'),
      isEmergency ? 'YES' : 'NO',
      sanitize(disposition),
      sanitize(pendingLabsList.join('; ')),
      sanitize(followUpTask),
      r.doctorReview ? 'YES' : 'NO',
      sanitize(r.doctorReview?.doctorName || 'Pending Physician Review'),
      sanitize(r.doctorReview?.doctorLicenseNo || ''),
      sanitize(r.doctorReview?.doctorDiagnosis || 'Pending Diagnosis'),
      sanitize((r.doctorReview?.prescribedMedications || []).map((p) => `${p.drugName} ${p.dosage} ${p.frequency}`).join('; ')),
      sanitize((r.doctorReview?.orderedInvestigations || []).join('; ')),
      r.doctorReview?.referralRequired ? 'YES' : 'NO',
      sanitize(r.doctorReview?.referralFacility || ''),
      sanitize(r.assessmentResult?.timestamp || r.vitals.measurementTime || new Date().toISOString()),
    ];
  });

  const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((row) => row.join(','))].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  const defaultFilename = `HIS_Hospital_Patient_Registry_${new Date().toISOString().slice(0, 10)}.csv`;
  link.download = options?.filename || defaultFilename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Parse an HL7 FHIR R4 Bundle into internal PatientAssessmentRecord entities
 */
export function parseFHIRBundleToRecords(bundle: any): PatientAssessmentRecord[] {
  if (!bundle) return [];
  const entries: any[] = Array.isArray(bundle)
    ? bundle
    : bundle.entry
    ? bundle.entry.map((e: any) => e.resource || e)
    : [bundle];

  const patientMap = new Map<string, any>();
  const obsMap = new Map<string, any[]>();

  for (const item of entries) {
    if (item.resourceType === 'Patient') {
      patientMap.set(item.id || item.identifier?.[0]?.value || `P-${Math.random()}`, item);
    } else if (item.resourceType === 'Observation') {
      const ref = item.subject?.reference?.replace('Patient/', '') || 'GLOBAL';
      const list = obsMap.get(ref) || [];
      list.push(item);
      obsMap.set(ref, list);
    }
  }

  // If no Patient resources found, create a synthesized patient from available observations
  if (patientMap.size === 0 && entries.length > 0) {
    patientMap.set('IMPORTED-PATIENT', {
      id: `P-FHIR-${Date.now().toString().slice(-4)}`,
      name: [{ text: 'Imported FHIR Record' }],
      gender: 'unknown',
    });
  }

  const outputRecords: PatientAssessmentRecord[] = [];

  for (const [pId, pResource] of patientMap.entries()) {
    const rawName = pResource.name?.[0]?.text ||
      `${pResource.name?.[0]?.given?.join(' ') || ''} ${pResource.name?.[0]?.family || ''}`.trim() ||
      `Patient ${pId}`;

    const mrnIdentifier = pResource.identifier?.find((i: any) => i.type?.coding?.[0]?.code === 'MR' || i.system?.includes('mrn'));
    const mrn = mrnIdentifier?.value || `MRN-${Math.floor(1000 + Math.random() * 9000)}`;

    const genderStr = (pResource.gender || 'MALE').toUpperCase();
    const sex: 'MALE' | 'FEMALE' | 'OTHER' = genderStr.includes('FEM') ? 'FEMALE' : genderStr.includes('MAL') ? 'MALE' : 'OTHER';

    const address = pResource.address?.[0] || {};
    const district = address.district || 'Lahore';
    const province = address.state || 'Punjab';

    const patientObservations = obsMap.get(pId) || obsMap.get('GLOBAL') || [];

    let sbp = 130;
    let dbp = 80;
    let hr = 75;
    let spo2 = 98;
    let glucose = 110;

    for (const obs of patientObservations) {
      const code = obs.code?.coding?.[0]?.code;
      if (code === '85354-9' && obs.component) {
        // Blood pressure panel
        for (const comp of obs.component) {
          const cCode = comp.code?.coding?.[0]?.code;
          if (cCode === '8480-6') sbp = Number(comp.valueQuantity?.value) || sbp;
          if (cCode === '8462-4') dbp = Number(comp.valueQuantity?.value) || dbp;
        }
      } else if (code === '8867-4') {
        hr = Number(obs.valueQuantity?.value) || hr;
      } else if (code === '2708-6') {
        spo2 = Number(obs.valueQuantity?.value) || spo2;
      } else if (code === '1558-6') {
        glucose = Number(obs.valueQuantity?.value) || glucose;
      }
    }

    const demographics = {
      patientId: pId.startsWith('P-') ? pId : `P-FHIR-${pId}`,
      mrn,
      fullName: rawName,
      age: 52,
      sex,
      province,
      district,
      tehsil: address.line?.[0] || 'Central',
      unionCouncil: address.line?.[1] || 'UC-1',
      consentGiven: true,
    };

    const profile = {
      heightCm: 170,
      weightKg: 70,
      bmi: 24.2,
      smokingStatus: 'NEVER' as const,
      tobaccoUse: 'NONE' as const,
      physicalActivity: 'MODERATE' as const,
      pregnancyStatus: 'NOT_APPLICABLE' as const,
      previousCVD: false,
      previousStroke: false,
      diabetesHistory: glucose > 126,
      hypertensionHistory: sbp >= 140 || dbp >= 90,
      kidneyDisease: false,
      liverDisease: false,
      asthmaCOPD: false,
      familyHistoryCVD: false,
      familyHistoryDiabetes: false,
      familyHistoryStroke: false,
      currentMedications: [],
      drugAllergies: [],
    };

    const vitals = {
      systolicBp: sbp,
      diastolicBp: dbp,
      heartRate: hr,
      respiratoryRate: 16,
      temperatureC: 37.0,
      oxygenSaturation: spo2,
      bloodGlucoseMgDl: glucose,
      glucoseMeasurementType: 'FASTING' as const,
      measurementSource: 'CLINIC_DEVICE' as const,
      qualityFlag: 'VALID' as const,
      measurementTime: new Date().toISOString(),
    };

    const labs = {
      glucoseFastingMgDl: glucose,
    };

    const assessmentResult = performFullClinicalAnalysis(demographics, profile, vitals, labs, []);

    outputRecords.push({
      demographics,
      profile,
      vitals,
      labs,
      symptoms: [],
      assessmentResult,
    });
  }

  return outputRecords;
}
