import { PatientAssessmentRecord } from '../types/clinical';

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
 * Export patient roster to CSV format for hospital database interoperability
 */
export function exportPatientsToCSV(records: PatientAssessmentRecord[]): void {
  const headers = [
    'Patient ID',
    'MRN',
    'Full Name',
    'Age',
    'Sex',
    'District',
    'Province',
    'Systolic BP',
    'Diastolic BP',
    'Heart Rate',
    'SpO2 %',
    'Blood Glucose',
    'BMI',
    'CVD 10-Yr Risk %',
    'Triage Level',
    'Emergency Flag',
    'Doctor Reviewed',
    'Physician Agreement',
    'Doctor Diagnosis',
    'Assessment Date',
  ];

  const rows = records.map((r) => [
    `"${r.demographics.patientId}"`,
    `"${r.demographics.mrn || ''}"`,
    `"${r.demographics.fullName.replace(/"/g, '""')}"`,
    r.demographics.age,
    `"${r.demographics.sex}"`,
    `"${r.demographics.district}"`,
    `"${r.demographics.province}"`,
    r.vitals.systolicBp || '',
    r.vitals.diastolicBp || '',
    r.vitals.heartRate || '',
    r.vitals.oxygenSaturation || '',
    r.vitals.bloodGlucoseMgDl || r.labs.glucoseFastingMgDl || '',
    r.profile.bmi ? r.profile.bmi.toFixed(1) : '',
    r.assessmentResult ? ((r.assessmentResult.risks.cardiovascular.riskScore || 0) * 100).toFixed(0) : '',
    `"${r.assessmentResult?.triage.levelName || 'Pending'}"`,
    r.assessmentResult?.isEmergency ? 'YES' : 'NO',
    r.doctorReview ? 'YES' : 'NO',
    `"${r.doctorReview?.aiAgreement || 'Pending'}"`,
    `"${(r.doctorReview?.doctorDiagnosis || '').replace(/"/g, '""')}"`,
    `"${r.assessmentResult?.timestamp || ''}"`,
  ]);

  const csvContent = [headers.join(','), ...rows.map((row) => row.join(','))].join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `Hospital_Patient_Roster_${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
