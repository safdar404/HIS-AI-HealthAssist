import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import { performFullClinicalAnalysis } from './src/clinical/mlRiskEngine';
import { performMedicationSafetyCheck } from './src/clinical/controlledMedicationEngine';
import { PAKISTAN_DISTRICTS_DATA } from './src/data/geoDistrictData';
import { MODEL_REGISTRY } from './src/data/modelRegistryData';
import { SAMPLE_CASES } from './src/data/samplePatientCases';
import { PatientAssessmentRecord, DoctorReview } from './src/types/clinical';

const app = express();
const PORT = 3000;

app.use(express.json());

// In-memory clinical assessment store initialized with sample cases
const assessmentsStore: PatientAssessmentRecord[] = Object.values(SAMPLE_CASES);
const auditLogStore: Array<{
  timestamp: string;
  eventType: string;
  assessmentId: string;
  patientId: string;
  details: string;
}> = [];

// Initialize Gemini Client on the server side
let aiClient: GoogleGenAI | null = null;
function getAIClient(): GoogleGenAI | null {
  if (!aiClient && process.env.GEMINI_API_KEY) {
    aiClient = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return aiClient;
}

// 1. Health Check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    system: 'AI-HealthAssist Clinical Intelligence Core',
    version: '0.2.1',
    guidelineStandard: 'WHO HEARTS & 2026 Hypertension Compendium',
  });
});

// 2. Perform Clinical Analysis
app.post('/api/assessment/analyze', (req, res) => {
  try {
    const { demographics, profile, vitals, labs, symptoms } = req.body;
    if (!demographics || !profile || !vitals) {
      return res.status(400).json({ error: 'Missing required clinical input objects' });
    }

    const result = performFullClinicalAnalysis(
      demographics,
      profile,
      vitals,
      labs || {},
      symptoms || []
    );

    const newRecord: PatientAssessmentRecord = {
      demographics,
      profile,
      vitals,
      labs: labs || {},
      symptoms: symptoms || [],
      assessmentResult: result,
    };

    assessmentsStore.unshift(newRecord);

    auditLogStore.unshift({
      timestamp: new Date().toISOString(),
      eventType: 'ASSESSMENT_GENERATED',
      assessmentId: result.assessmentId,
      patientId: demographics.patientId,
      details: `Triage: ${result.triage.levelName} | CVD Risk: ${(result.risks.cardiovascular.riskScore * 100).toFixed(0)}% | Red Flags: ${result.redFlags.length}`,
    });

    res.json({
      success: true,
      assessment: result,
    });
  } catch (err: any) {
    console.error('Error analyzing clinical assessment:', err);
    res.status(500).json({ error: err.message || 'Internal clinical assessment error' });
  }
});

// 3. Get All Patient Assessments (Doctor Queue)
app.get('/api/assessments', (req, res) => {
  res.json({
    success: true,
    total: assessmentsStore.length,
    assessments: assessmentsStore,
  });
});

// 3a. Update Existing Patient Record
app.put('/api/patient/:id', (req, res) => {
  try {
    const patientId = req.params.id;
    const index = assessmentsStore.findIndex(
      (a) => a.demographics.patientId === patientId
    );

    if (index === -1) {
      return res.status(404).json({ error: 'Patient record not found' });
    }

    const updatedRecord: PatientAssessmentRecord = req.body;
    assessmentsStore[index] = updatedRecord;

    auditLogStore.unshift({
      timestamp: new Date().toISOString(),
      eventType: 'PATIENT_RECORD_UPDATED',
      assessmentId: updatedRecord.assessmentResult?.assessmentId || 'N/A',
      patientId: updatedRecord.demographics.patientId,
      details: `Demographics/Vitals updated for ${updatedRecord.demographics.fullName}`,
    });

    res.json({
      success: true,
      updatedRecord,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 3b. Delete Patient Record
app.delete('/api/patient/:id', (req, res) => {
  try {
    const patientId = req.params.id;
    const index = assessmentsStore.findIndex(
      (a) => a.demographics.patientId === patientId
    );

    if (index === -1) {
      return res.status(404).json({ error: 'Patient record not found' });
    }

    const removed = assessmentsStore.splice(index, 1)[0];

    auditLogStore.unshift({
      timestamp: new Date().toISOString(),
      eventType: 'PATIENT_RECORD_DELETED',
      assessmentId: removed.assessmentResult?.assessmentId || 'N/A',
      patientId: removed.demographics.patientId,
      details: `Record deleted for ${removed.demographics.fullName}`,
    });

    res.json({
      success: true,
      message: 'Patient record removed successfully',
      remaining: assessmentsStore.length,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 3c. Bulk Import Patient Records
app.post('/api/patients/bulk-import', (req, res) => {
  try {
    const { records } = req.body as { records: PatientAssessmentRecord[] };
    if (!Array.isArray(records) || records.length === 0) {
      return res.status(400).json({ error: 'Expected non-empty array of records' });
    }

    let addedCount = 0;
    for (const record of records) {
      if (record.demographics && record.vitals) {
        // If assessment not precomputed, run analysis
        if (!record.assessmentResult) {
          record.assessmentResult = performFullClinicalAnalysis(
            record.demographics,
            record.profile,
            record.vitals,
            record.labs || {},
            record.symptoms || []
          );
        }
        assessmentsStore.unshift(record);
        addedCount++;
      }
    }

    auditLogStore.unshift({
      timestamp: new Date().toISOString(),
      eventType: 'BULK_PATIENT_IMPORT',
      assessmentId: 'BULK',
      patientId: 'MULTIPLE',
      details: `Imported ${addedCount} patient records into active EHR registry`,
    });

    res.json({
      success: true,
      importedCount: addedCount,
      total: assessmentsStore.length,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 4. Record Doctor Review / Final Diagnosis
app.post('/api/doctor/review', (req, res) => {
  try {
    const { review } = req.body as { review: DoctorReview };
    if (!review || !review.assessmentId) {
      return res.status(400).json({ error: 'Missing doctor review object or assessment ID' });
    }

    const target = assessmentsStore.find(
      (a) => a.assessmentResult?.assessmentId === review.assessmentId
    );

    if (!target) {
      return res.status(404).json({ error: 'Assessment record not found' });
    }

    target.doctorReview = review;

    auditLogStore.unshift({
      timestamp: new Date().toISOString(),
      eventType: 'DOCTOR_REVIEW_RECORDED',
      assessmentId: review.assessmentId,
      patientId: target.demographics.patientId,
      details: `Physician: ${review.doctorName} | Agreement: ${review.aiAgreement} | Final Diagnosis: ${review.doctorDiagnosis}`,
    });

    res.json({
      success: true,
      updatedRecord: target,
    });
  } catch (err: any) {
    console.error('Error recording doctor review:', err);
    res.status(500).json({ error: err.message || 'Internal review error' });
  }
});

// 5. Controlled Medication Safety Check Endpoint
app.post('/api/medication/safety-check', (req, res) => {
  try {
    const { drugName, profile, labs } = req.body;
    if (!drugName || !profile) {
      return res.status(400).json({ error: 'Missing drugName or profile' });
    }

    const check = performMedicationSafetyCheck(drugName, profile, labs || {});
    res.json({
      success: true,
      check,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 6. GeoAI Public Health Surveillance Data
app.get('/api/geo/surveillance', (req, res) => {
  res.json({
    success: true,
    country: 'Pakistan',
    districts: PAKISTAN_DISTRICTS_DATA,
    meta: {
      totalScreenedNational: PAKISTAN_DISTRICTS_DATA.reduce((acc, d) => acc + d.screenedCount, 0),
      criticalHotspotCount: PAKISTAN_DISTRICTS_DATA.filter((d) => d.hotspotClassification === 'HOTSPOT_99').length,
      timestamp: new Date().toISOString(),
    },
  });
});

// 7. ML Model Registry
app.get('/api/models/registry', (req, res) => {
  res.json({
    success: true,
    models: MODEL_REGISTRY,
    syntheticCohortSize: 50000,
    currentChampion: 'CVD-XGB-001',
  });
});

// 8. Audit Logs
app.get('/api/audit-logs', (req, res) => {
  res.json({
    success: true,
    logs: auditLogStore,
  });
});

// 9. Server-side Gemini AI Clinical Co-Pilot
app.post('/api/gemini/clinical-notes', async (req, res) => {
  try {
    const { patientCase, promptType } = req.body;
    const ai = getAIClient();

    if (!ai) {
      // Graceful fallback if no API key is provided
      return res.json({
        notes: `Clinical Case Summary (Offline Rules Engine):
Patient: ${patientCase?.demographics?.fullName || 'Patient'}, ${patientCase?.demographics?.age}yo ${patientCase?.demographics?.sex}.
Triage Category: ${patientCase?.assessmentResult?.triage?.levelName || 'Priority'}.
Primary Identified Risks: Cardiovascular (${((patientCase?.assessmentResult?.risks?.cardiovascular?.riskScore || 0) * 100).toFixed(0)}%), Hypertension (${((patientCase?.assessmentResult?.risks?.hypertension?.riskScore || 0) * 100).toFixed(0)}%), Diabetes (${((patientCase?.assessmentResult?.risks?.diabetes?.riskScore || 0) * 100).toFixed(0)}%).
Recommended Action: Comply with WHO HEARTS cardiovascular protocol and obtain confirmatory lab panel.`,
      });
    }

    const systemPrompt = `You are a clinical decision support co-pilot assistant strictly adhering to WHO HEARTS cardiovascular protocols and clinical safety guidelines. 
Your goal is to provide concise, structured clinical rationale and investigation guidance to the reviewing physician. 
STRICT RULE: Do NOT claim definitive diagnosis or autonomously prescribe medications. Frame all outputs as preliminary decision support considerations for the attending physician.`;

    const userPrompt = `Generate a concise 3-paragraph clinical briefing for this primary care case:
Patient: ${patientCase?.demographics?.age}yo ${patientCase?.demographics?.sex}, District: ${patientCase?.demographics?.district || 'General'}.
Vitals: BP ${patientCase?.vitals?.systolicBp}/${patientCase?.vitals?.diastolicBp} mmHg, HR ${patientCase?.vitals?.heartRate} bpm, SpO2 ${patientCase?.vitals?.oxygenSaturation}%, Glucose ${patientCase?.vitals?.bloodGlucoseMgDl} mg/dL.
Key Symptoms: ${(patientCase?.symptoms || []).map((s: any) => s.name).join(', ') || 'None reported'}.
AI Triage: ${patientCase?.assessmentResult?.triage?.levelName}.
CVD Risk: ${((patientCase?.assessmentResult?.risks?.cardiovascular?.riskScore || 0) * 100).toFixed(0)}%.
Prompt focus: ${promptType || 'General Clinical Briefing'}`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.7-flash',
      contents: userPrompt,
      config: {
        systemInstruction: systemPrompt,
        temperature: 0.3,
      },
    });

    res.json({
      notes: response.text || 'Unable to generate notes.',
    });
  } catch (err: any) {
    console.error('Error calling Gemini API:', err);
    res.status(500).json({ error: err.message || 'Gemini API call failed' });
  }
});

// Vite Middleware for Development / Static file server for Production
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`AI-HealthAssist Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
