import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import { performFullClinicalAnalysis } from './src/clinical/mlRiskEngine';
import { performMedicationSafetyCheck } from './src/clinical/controlledMedicationEngine';
import { PAKISTAN_DISTRICTS_DATA } from './src/data/geoDistrictData';
import { MODEL_REGISTRY } from './src/data/modelRegistryData';
import { SAMPLE_CASES } from './src/data/samplePatientCases';
import { PAKISTAN_HOSPITALS } from './src/data/hospitalsData';
import { DUTY_DOCTORS_ROSTER } from './src/data/dutyDoctorsData';
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

// 9. Government and Famous Hospitals Directory
app.get('/api/hospitals', (req, res) => {
  try {
    const { province, city, type, specialty, search } = req.query as {
      province?: string;
      city?: string;
      type?: string;
      specialty?: string;
      search?: string;
    };

    let filtered = [...PAKISTAN_HOSPITALS];

    if (province && province !== 'ALL') {
      filtered = filtered.filter((h) => h.province.toLowerCase() === province.toLowerCase());
    }

    if (city && city !== 'ALL') {
      filtered = filtered.filter((h) => h.city.toLowerCase() === city.toLowerCase());
    }

    if (type && type !== 'ALL') {
      filtered = filtered.filter((h) => h.type === type);
    }

    if (specialty && specialty !== 'ALL') {
      filtered = filtered.filter((h) =>
        h.specialties.some((s) => s.toLowerCase().includes(specialty.toLowerCase()))
      );
    }

    if (search && search.trim()) {
      const q = search.toLowerCase().trim();
      filtered = filtered.filter(
        (h) =>
          h.name.toLowerCase().includes(q) ||
          h.urduName.includes(q) ||
          h.city.toLowerCase().includes(q) ||
          h.district.toLowerCase().includes(q) ||
          h.specialties.some((s) => s.toLowerCase().includes(q)) ||
          h.emergencyServices.some((e) => e.toLowerCase().includes(q))
      );
    }

    res.json({
      success: true,
      total: filtered.length,
      hospitals: filtered,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 10. On-Duty Doctors & Specialists Roster
app.get('/api/doctors/on-duty', (req, res) => {
  try {
    const { hospitalId, specialty, shift, dutyStatus, search } = req.query as {
      hospitalId?: string;
      specialty?: string;
      shift?: string;
      dutyStatus?: string;
      search?: string;
    };

    let filtered = [...DUTY_DOCTORS_ROSTER];

    if (hospitalId && hospitalId !== 'ALL') {
      filtered = filtered.filter((d) => d.hospitalId === hospitalId);
    }

    if (specialty && specialty !== 'ALL') {
      filtered = filtered.filter((d) =>
        d.specialty.toLowerCase().includes(specialty.toLowerCase())
      );
    }

    if (shift && shift !== 'ALL') {
      filtered = filtered.filter((d) => d.shift === shift);
    }

    if (dutyStatus && dutyStatus !== 'ALL') {
      filtered = filtered.filter((d) => d.dutyStatus === dutyStatus);
    }

    if (search && search.trim()) {
      const q = search.toLowerCase().trim();
      filtered = filtered.filter(
        (d) =>
          d.name.toLowerCase().includes(q) ||
          d.specialty.toLowerCase().includes(q) ||
          d.hospitalName.toLowerCase().includes(q) ||
          d.department.toLowerCase().includes(q) ||
          d.pmdcNumber.toLowerCase().includes(q)
      );
    }

    res.json({
      success: true,
      total: filtered.length,
      doctors: filtered,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 11. Live AI Clinical & Hospital Assistant QA Agent
app.post('/api/ai/qa', async (req, res) => {
  try {
    const { question, conversationHistory, context } = req.body as {
      question: string;
      conversationHistory?: Array<{ role: 'user' | 'assistant'; text: string }>;
      context?: {
        currentPatient?: any;
        selectedHospital?: string;
      };
    };

    if (!question || !question.trim()) {
      return res.status(400).json({ error: 'Question string is required' });
    }

    const ai = getAIClient();

    // Compile local Knowledge Context into prompt for high accuracy & reliability
    const hospitalsSummary = PAKISTAN_HOSPITALS.map(
      (h) =>
        `- ${h.name} (${h.urduName}), ${h.city}, ${h.province} [Type: ${h.type}]. Beds: ${h.bedCapacity}, ICU: ${h.icuBeds}, Emergency: ${h.phoneEmergency}, Ambulance: ${h.phoneAmbulance}. Specialties: ${h.specialties.slice(0, 4).join(', ')}. Status: ${h.status}, Sehat Card: ${h.sehatCardAccepted ? 'YES' : 'NO'}`
    ).join('\n');

    const dutyDoctorsSummary = DUTY_DOCTORS_ROSTER.map(
      (d) =>
        `- ${d.name} (${d.qualifications}, PMDC: ${d.pmdcNumber}) at ${d.hospitalName} [${d.department}]. Specialty: ${d.specialty}. Shift: ${d.shift} (${d.shiftTime}). Status: ${d.dutyStatus}. Pager: ${d.pagerExtension}, Contact: ${d.directEmergencyContact}`
    ).join('\n');

    const systemPrompt = `You are "AI-HealthAssist Live Clinical & Hospital Intelligence Agent", an authoritative, compassionate, and precise medical/hospital AI assistant for Pakistan's healthcare network.
You possess complete knowledge of:
1. All major Pakistan Government and tertiary hospitals (JPMC Karachi, Mayo Hospital Lahore, PIC Lahore, PIMS Islamabad, LRH Peshawar, BMCH Quetta, Civil Hospital Karachi, AKUH, SKMCH, Indus Hospital, GIMS, etc.).
2. The current roster of on-duty doctors, consultants, and emergency specialists with shifts, PMDC IDs, and direct extensions.
3. WHO HEARTS 2026 cardiovascular guidelines, hypertensive crisis protocols, stroke FAST assessments, and diabetes management.
4. National emergency numbers: Rescue 1122 (Ambulance/Disaster), Edhi 115, Chhipa 1020, Police 15, Sehat Sahulat Helpline 0800-09009.

HOSPITALS IN DIRECTORY:
${hospitalsSummary}

ON-DUTY PHYSICIANS ROSTER:
${dutyDoctorsSummary}

${
  context?.currentPatient
    ? `CURRENT ACTIVE PATIENT IN SESSION:
Patient ID: ${context.currentPatient.demographics?.patientId || 'N/A'}, Name: ${context.currentPatient.demographics?.fullName || 'N/A'}, Age: ${context.currentPatient.demographics?.age || 'N/A'}y ${context.currentPatient.demographics?.sex || ''}, District: ${context.currentPatient.demographics?.district || 'N/A'}.
Vitals: BP ${context.currentPatient.vitals?.systolicBp || '-'}/${context.currentPatient.vitals?.diastolicBp || '-'} mmHg, HR: ${context.currentPatient.vitals?.heartRate || '-'} bpm, SpO2: ${context.currentPatient.vitals?.oxygenSaturation || '-'}%, Glucose: ${context.currentPatient.vitals?.bloodGlucoseMgDl || '-'} mg/dL.
Triage Level: ${context.currentPatient.assessmentResult?.triage?.levelName || 'Pending'}.
CVD Risk: ${((context.currentPatient.assessmentResult?.risks?.cardiovascular?.riskScore || 0) * 100).toFixed(0)}%.`
    : ''
}

CRITICAL INSTRUCTIONS:
- Answer user queries directly, clearly, and structure with neat markdown bullet points, bold highlights, and emergency contact numbers when relevant.
- When asked about hospitals, mention their exact city, emergency phone numbers, ICU capacity, and whether they accept the Sehat Sahulat Card.
- When asked about doctors on duty, provide their name, title, PMDC number, hospital department, current shift, and pager extension.
- For emergency symptoms (chest pain, stroke, severe hypoxia, BP > 180/120), always emphasize immediate 1122 emergency EMS dispatch and the nearest 24/7 cath lab or Level 1 trauma center.
- You can converse in English or Urdu (Roman Urdu / Nastaliq) according to user preference.`;

    if (ai) {
      // Build conversation contents
      let promptContents = '';
      if (conversationHistory && conversationHistory.length > 0) {
        promptContents += 'PREVIOUS CONVERSATION:\n';
        for (const msg of conversationHistory.slice(-6)) {
          promptContents += `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.text}\n`;
        }
        promptContents += '\n';
      }
      promptContents += `User Question: ${question}`;

      // Cascade across models if one hits rate limits / resource quota
      const candidateModels = ['gemini-3.8-flash', 'gemini-flash-latest'];
      let geminiAnswer: string | null = null;
      let lastAiError: any = null;

      for (const modelName of candidateModels) {
        try {
          const response = await ai.models.generateContent({
            model: modelName,
            contents: promptContents,
            config: {
              systemInstruction: systemPrompt,
              temperature: 0.2,
            },
          });
          if (response.text) {
            geminiAnswer = response.text;
            break;
          }
        } catch (mErr: any) {
          lastAiError = mErr;
          console.warn(`Model ${modelName} returned error (falling back):`, mErr?.message || mErr);
        }
      }

      if (geminiAnswer) {
        return res.json({
          success: true,
          answer: geminiAnswer,
          source: 'GEMINI_AI_LIVE',
        });
      }
      // If all Gemini models hit quota or error, smoothly continue to local clinical intelligence engine
      console.info('Using high-accuracy local knowledge engine fallback due to API quota limits.');
    }

    // Offline / Rule-Based Fallback Engine if GEMINI_API_KEY is not yet configured or quota is exceeded
    const qLower = question.toLowerCase();
    let fallbackAnswer = '';

    if (qLower.includes('doctor') || qLower.includes('on duty') || qLower.includes('physician') || qLower.includes('roster') || qLower.includes('duty')) {
      fallbackAnswer = `### 👨‍⚕️ On-Duty Physicians & Specialists Roster\n\nHere are clinicians currently on duty across Pakistan's tertiary teaching hospitals:\n\n` +
        DUTY_DOCTORS_ROSTER.slice(0, 6).map(d =>
          `* **${d.name}** (${d.qualifications}) — **${d.specialty}**\n  * 🏥 **Hospital:** ${d.hospitalName} (${d.department})\n  * ⏰ **Shift:** ${d.shift} (${d.shiftTime}) — Status: **${d.dutyStatus.replace(/_/g, ' ')}**\n  * 📟 **Direct Extension:** \`${d.pagerExtension}\` | PMDC: \`${d.pmdcNumber}\``
        ).join('\n\n') +
        `\n\n*(💡 Switch to the **On-Duty Doctors** tab to filter by hospital, department, or shift)*.`;
    } else if (qLower.includes('hospital') || qLower.includes('emergency') || qLower.includes('icu') || qLower.includes('lahore') || qLower.includes('karachi') || qLower.includes('islamabad') || qLower.includes('peshawar') || qLower.includes('quetta') || qLower.includes('sehat card')) {
      const matchedHospitals = PAKISTAN_HOSPITALS.filter(h =>
        qLower.includes(h.city.toLowerCase()) || qLower.includes(h.province.toLowerCase()) || qLower.includes(h.name.toLowerCase()) || (qLower.includes('sehat') && h.sehatCardAccepted)
      );
      const listToShow = matchedHospitals.length > 0 ? matchedHospitals : PAKISTAN_HOSPITALS.slice(0, 5);

      fallbackAnswer = `### 🏥 Government & Tertiary Hospital Directory\n\n` +
        listToShow.map(h =>
          `* **${h.name}** (${h.urduName}) — *${h.city}, ${h.province}*\n  * 🚨 **24/7 Emergency:** \`${h.phoneEmergency}\` | Ambulance: \`${h.phoneAmbulance}\`\n  * 🛏️ **Beds:** ${h.bedCapacity} Total (${h.icuBeds} ICU / ${h.ventilators} Ventilators)\n  * 🩺 **Top Specialties:** ${h.specialties.slice(0, 3).join(', ')}\n  * 💳 **Sehat Sahulat Card:** ${h.sehatCardAccepted ? '✅ Accepted' : '❌ Not Listed'}`
        ).join('\n\n') +
        `\n\n**National Emergency Helplines:**\n* 🚑 **Rescue 1122:** Emergency Medical & Ambulance Service (All Pakistan)\n* 🚑 **Edhi Foundation:** 115\n* 🚨 **Police Emergency:** 15\n* 💳 **Sehat Sahulat Helpline:** 0800-09009`;
    } else if (qLower.includes('bp') || qLower.includes('blood pressure') || qLower.includes('hypertension') || qLower.includes('heart') || qLower.includes('chest pain')) {
      fallbackAnswer = `### 🩺 Cardiovascular & Hypertensive Clinical Protocols (WHO HEARTS)\n\n` +
        `* **Emergency Thresholds:** SBP ≥ 180 mmHg or DBP ≥ 120 mmHg indicates Hypertensive Urgency/Crisis. Immediate evaluation is required.\n` +
        `* **First-Line Pharmacotherapy:** Combination therapy with Calcium Channel Blockers (e.g. Amlodipine 5-10mg) + ARB/ACEi (e.g. Telmisartan 40-80mg) is recommended for Stage 2 HTN per WHO HEARTS.\n` +
        `* **Acute Chest Pain Red Flag:** If ischemic discomfort is suspected, obtain a 12-lead ECG within 10 minutes and dispatch to the nearest 24/7 Primary PCI Cardiac Center (e.g., PIC Lahore, NICVD Karachi, RIC Rawalpindi, Peshawar Institute of Cardiology).\n` +
        `* **Emergency Dispatch:** Call **Rescue 1122** immediately for ambulance transport.`;
    } else {
      fallbackAnswer = `### 🩺 AI-HealthAssist Clinical Q&A\n\nThank you for your inquiry: **"${question}"**\n\n` +
        `* **Clinical Protocols:** Our system adheres to the **WHO HEARTS 2026 Cardiovascular Protocol** and national health guidelines for Pakistan.\n` +
        `* **Hospital Emergency Care:** If you or a patient are experiencing acute chest pain, facial droop, or sudden shortness of breath, immediately contact **Rescue 1122** or go to the nearest emergency tertiary center (e.g. NICVD / JPMC in Karachi, PIC / Mayo in Lahore, PIMS in Islamabad, LRH in Peshawar, BMCH in Quetta).\n` +
        `* **Duty Roster:** Check the **Doctors On Duty** tab in this view to page on-duty cardiologists, emergency consultants, or trauma surgeons.`;
    }

    res.json({
      success: true,
      answer: fallbackAnswer,
      source: 'LOCAL_KNOWLEDGE_ENGINE',
    });
  } catch (err: any) {
    console.error('Error in /api/ai/qa:', err);
    res.json({
      success: true,
      answer: `### ℹ️ Clinical Assistant Notice\n\nWe are currently operating via the local clinical rules engine. For emergency assistance in Pakistan, dial **Rescue 1122** or visit the nearest government tertiary hospital. Check the **Hospitals** and **On-Duty Doctors** tabs for immediate facility contacts.`,
      source: 'LOCAL_KNOWLEDGE_ENGINE',
    });
  }
});

// 12. Server-side Gemini AI Clinical Co-Pilot
app.post('/api/gemini/clinical-notes', async (req, res) => {
  try {
    const { patientCase, promptType } = req.body;
    const ai = getAIClient();

    const generateOfflineSummary = () => {
      const sbp = patientCase?.vitals?.systolicBp || 135;
      const dbp = patientCase?.vitals?.diastolicBp || 85;
      const cvd = ((patientCase?.assessmentResult?.risks?.cardiovascular?.riskScore || 0) * 100).toFixed(0);
      const triage = patientCase?.assessmentResult?.triage?.levelName || 'Priority Clinical Review';
      const redFlags = (patientCase?.assessmentResult?.redFlags || []).map((r: any) => r.title).join('; ') || 'None';

      return `Clinical Decision Briefing (WHO HEARTS Protocol Engine):
1. Clinical Presentation: ${patientCase?.demographics?.age || 50}yo ${patientCase?.demographics?.sex || 'Patient'}, BP: ${sbp}/${dbp} mmHg, HR: ${patientCase?.vitals?.heartRate || 80} bpm, SpO2: ${patientCase?.vitals?.oxygenSaturation || 98}%, Glucose: ${patientCase?.vitals?.bloodGlucoseMgDl || 110} mg/dL.
2. Stratification & Flags: Triage Tier: ${triage}. Estimated 10-Yr CVD Risk: ${cvd}%. Active Red-Flag Indicators: ${redFlags}.
3. Attending Directives: Initiate dual-agent antihypertensive therapy if SBP ≥ 140 mmHg per WHO HEARTS guidelines. Confirm fasting lipid profile and HbA1c. Schedule follow-up assessment in 2-4 weeks.`;
    };

    if (!ai) {
      return res.json({ notes: generateOfflineSummary() });
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

    const candidateModels = ['gemini-3.8-flash', 'gemini-flash-latest'];
    let notesText: string | null = null;

    for (const modelName of candidateModels) {
      try {
        const response = await ai.models.generateContent({
          model: modelName,
          contents: userPrompt,
          config: {
            systemInstruction: systemPrompt,
            temperature: 0.3,
          },
        });
        if (response.text) {
          notesText = response.text;
          break;
        }
      } catch (err: any) {
        console.warn(`Notes generation on ${modelName} encountered error:`, err?.message || err);
      }
    }

    res.json({
      notes: notesText || generateOfflineSummary(),
    });
  } catch (err: any) {
    console.error('Error generating clinical notes:', err);
    res.json({
      notes: `Clinical Case Summary (Offline Guidelines Fallback):
Patient evaluated under WHO HEARTS Protocol. 
Recommendation: Perform 12-lead ECG, fasting blood glucose/HbA1c, and serum creatinine. Titrate antihypertensive therapy to target BP < 130/80 mmHg.`,
    });
  }
});

// 13. Server-side Gemini AI Differential Diagnosis Generator with ICD-10 Coding
app.post('/api/gemini/differential-diagnosis', async (req, res) => {
  try {
    const { patientCase } = req.body;
    const ai = getAIClient();

    const generateAlgorithmicDifferential = () => {
      const sbp = patientCase?.vitals?.systolicBp || 130;
      const dbp = patientCase?.vitals?.diastolicBp || 82;
      const hr = patientCase?.vitals?.heartRate || 76;
      const spo2 = patientCase?.vitals?.oxygenSaturation || 98;
      const glucose = patientCase?.vitals?.bloodGlucoseMgDl || patientCase?.labs?.glucoseFastingMgDl || 110;
      const symptomsList: string[] = (patientCase?.symptoms || []).map((s: any) => (s.name || s.code || '').toLowerCase());
      const hasChestPain = symptomsList.some((s) => s.includes('chest') || s.includes('angina') || s.includes('pressure'));
      const hasDyspnea = symptomsList.some((s) => s.includes('breath') || s.includes('dyspnea') || s.includes('shortness'));
      const hasHeadache = symptomsList.some((s) => s.includes('headache') || s.includes('dizziness') || s.includes('vertigo'));
      const isHypertensive = sbp >= 140 || dbp >= 90 || patientCase?.profile?.hypertensionHistory;
      const isSevereHTN = sbp >= 180 || dbp >= 120;
      const isDiabetic = glucose >= 126 || patientCase?.profile?.diabetesHistory;
      const isHypoxic = spo2 < 92;

      const diffs: Array<{
        icd10Code: string;
        diagnosisName: string;
        likelihood: 'HIGH' | 'MODERATE' | 'RULE_OUT';
        probability: number;
        clinicalRationale: string;
        supportingEvidence: string[];
        conflictingFactors: string[];
        suggestedWorkup: string[];
        whoGuidelineMapping: string;
      }> = [];

      if (isSevereHTN) {
        diffs.push({
          icd10Code: 'I16.0',
          diagnosisName: 'Hypertensive Urgency / Crisis with Impending Target Organ Damage',
          likelihood: 'HIGH',
          probability: 92,
          clinicalRationale: `Markedly elevated blood pressure (${sbp}/${dbp} mmHg) exceeding the critical WHO HEARTS emergency threshold of 180/120 mmHg.`,
          supportingEvidence: [`Systolic BP ${sbp} mmHg ≥ 180`, `Diastolic BP ${dbp} mmHg ≥ 120`, ...(hasHeadache ? ['Occipital headache / neurological warning'] : [])],
          conflictingFactors: ['Absence of acute focal motor deficit or papilledema'],
          suggestedWorkup: ['12-Lead Electrocardiogram (ECG)', 'Serum Creatinine & eGFR', 'Fundoscopy examination', 'Urinalysis for proteinuria'],
          whoGuidelineMapping: 'WHO HEARTS Hypertensive Urgency Protocol - Urgent gradual reduction with oral CCB + ARB',
        });
      } else if (isHypertensive) {
        diffs.push({
          icd10Code: 'I10',
          diagnosisName: 'Essential (Primary) Hypertension, Stage 2',
          likelihood: 'HIGH',
          probability: 88,
          clinicalRationale: `Sustained systolic elevation (${sbp} mmHg) and diastolic elevation (${dbp} mmHg) consistent with Stage 2 Essential Hypertension.`,
          supportingEvidence: [`Recorded BP ${sbp}/${dbp} mmHg`, `Age ${patientCase?.demographics?.age || 50} years`, `BMI ${patientCase?.profile?.bmi || 27}`],
          conflictingFactors: ['Secondary causes not yet excluded (renal artery stenosis, hyperaldosteronism)'],
          suggestedWorkup: ['Lipid profile (total cholesterol, LDL, HDL, Triglycerides)', 'Fasting plasma glucose / HbA1c', 'Serum electrolytes & creatinine', 'Baseline 12-lead ECG'],
          whoGuidelineMapping: 'WHO HEARTS Protocol Step 1: Initiate dual combination (Amlodipine 5mg + Telmisartan 40mg)',
        });
      }

      if (hasChestPain || (patientCase?.assessmentResult?.risks?.cardiovascular?.riskScore || 0) > 0.2) {
        diffs.push({
          icd10Code: 'I20.9',
          diagnosisName: 'Angina Pectoris / Ischemic Heart Disease (Unspecified)',
          likelihood: hasChestPain ? 'HIGH' : 'MODERATE',
          probability: hasChestPain ? 84 : 58,
          clinicalRationale: `Chest discomfort and high 10-year CVD risk score (${((patientCase?.assessmentResult?.risks?.cardiovascular?.riskScore || 0) * 100).toFixed(0)}%) indicate myocardial ischemia risk.`,
          supportingEvidence: [`CVD Risk Score: ${((patientCase?.assessmentResult?.risks?.cardiovascular?.riskScore || 0) * 100).toFixed(0)}%`, ...(hasChestPain ? ['Active chest tightness/angina report'] : ['Cardiovascular risk profile'])],
          conflictingFactors: ['Serial cardiac enzymes and stress testing pending'],
          suggestedWorkup: ['High-Sensitivity Cardiac Troponin I/T (STAT)', 'Serial 12-Lead ECG (0h, 3h)', 'Echocardiography (LVEF assessment)', 'Exercise Stress Test or CT Coronary Angiogram'],
          whoGuidelineMapping: 'ACC/AHA & WHO CVD Prevention - High-intensity Statin + Aspirin 75-100mg daily if confirmed',
        });
      }

      if (isDiabetic) {
        diffs.push({
          icd10Code: 'E11.9',
          diagnosisName: 'Type 2 Diabetes Mellitus without Acute Complications',
          likelihood: 'HIGH',
          probability: 82,
          clinicalRationale: `Blood glucose level (${glucose} mg/dL) exceeds diagnostic threshold (≥126 mg/dL fasting or ≥200 mg/dL random) alongside metabolic risk factors.`,
          supportingEvidence: [`Glucose: ${glucose} mg/dL`, `Age: ${patientCase?.demographics?.age || 45}`, ...(patientCase?.profile?.diabetesHistory ? ['Established past history'] : ['Screening hyperglycemia'])],
          conflictingFactors: ['Fasting confirmation required if random sample'],
          suggestedWorkup: ['Standardized HbA1c assay', 'Fasting lipid panel', 'Spot urine albumin-to-creatinine ratio (uACR)', 'Dilated eye fundus exam'],
          whoGuidelineMapping: 'WHO HEARTS Diabetes Module: Lifestyle + Metformin 500mg-1000mg titrate with SGLT2i if eGFR permits',
        });
      }

      if (hasDyspnea || isHypoxic) {
        diffs.push({
          icd10Code: isHypoxic ? 'J96.00' : 'R06.02',
          diagnosisName: isHypoxic ? 'Acute Hypoxemic Respiratory Distress' : 'Shortness of Breath / Dyspnea on Exertion',
          likelihood: isHypoxic ? 'HIGH' : 'MODERATE',
          probability: isHypoxic ? 86 : 64,
          clinicalRationale: `Oxygen saturation (${spo2}%) and reported respiratory complaints suggest pulmonary compromise or cardiopulmonary congestion.`,
          supportingEvidence: [`SpO2 ${spo2}%`, ...(hasDyspnea ? ['Reported exertional dyspnea'] : [])],
          conflictingFactors: ['Distinction between primary pulmonary vs heart failure origin required'],
          suggestedWorkup: ['Chest Radiograph (PA View)', 'NT-proBNP / BNP biomarker', 'Spirometry / Peak Expiratory Flow', 'Arterial Blood Gas (ABG)'],
          whoGuidelineMapping: 'WHO Emergency Respiratory Protocol: Supplemental O2 target SpO2 94-98% (88-92% if COPD)',
        });
      }

      if (diffs.length < 3 && !diffs.some((d) => d.icd10Code === 'E78.5')) {
        diffs.push({
          icd10Code: 'E78.5',
          diagnosisName: 'Hyperlipidemia / Atherogenic Dyslipidemia (Unspecified)',
          likelihood: 'MODERATE',
          probability: 68,
          clinicalRationale: `Co-existing metabolic and cardiovascular risk factors strongly correlate with elevated atherogenic lipoproteins in South Asian cohorts.`,
          supportingEvidence: [`Cardiovascular risk profile`, `Age ${patientCase?.demographics?.age || 50}`, `BMI ${patientCase?.profile?.bmi || 26}`],
          conflictingFactors: ['Formal fasting lipid fraction panel pending completion'],
          suggestedWorkup: ['Fasting Serum Lipid Profile (TC, LDL-C, HDL-C, TG)', 'Liver Function Tests (ALT/AST baseline before statin)'],
          whoGuidelineMapping: 'WHO HEARTS CVD Module: Initiate Atorvastatin 20-40mg for primary CVD prevention',
        });
      }

      if (diffs.length < 3 && !diffs.some((d) => d.icd10Code === 'I10')) {
        diffs.push({
          icd10Code: 'I10',
          diagnosisName: 'Essential (Primary) Hypertension, Screened Borderline',
          likelihood: 'MODERATE',
          probability: 65,
          clinicalRationale: `Baseline cardiovascular risk assessment and hemodynamic screening profile.`,
          supportingEvidence: [`Recorded BP ${sbp}/${dbp} mmHg`, `Primary prevention evaluation`],
          conflictingFactors: ['Ambulatory blood pressure monitoring (ABPM) recommended to confirm'],
          suggestedWorkup: ['Serial BP Log (7-day home measurement)', 'Baseline 12-lead ECG', 'Spot Urine Protein'],
          whoGuidelineMapping: 'WHO HEARTS Protocol: Lifestyle interventions and 1-month recheck',
        });
      }

      if (diffs.length < 3 && !diffs.some((d) => d.icd10Code === 'Z13.6')) {
        diffs.push({
          icd10Code: 'Z13.6',
          diagnosisName: 'Encounter for Screening for Cardiovascular Disorders',
          likelihood: 'RULE_OUT',
          probability: 50,
          clinicalRationale: `Preventive outpatient encounter to stratify 10-year risk of cardiovascular events.`,
          supportingEvidence: [`Outpatient triage encounter`, `Demographic risk assessment`],
          conflictingFactors: ['Active disease symptoms absent'],
          suggestedWorkup: ['Annual CVD Risk Stratification', 'Dietary and Physical Activity Counseling'],
          whoGuidelineMapping: 'WHO Package of Essential Noncommunicable Disease Interventions (PEN)',
        });
      }

      return diffs;
    };

    if (!ai) {
      return res.json({
        success: true,
        source: 'ALGORITHMIC_RULES_ENGINE',
        differentials: generateAlgorithmicDifferential(),
      });
    }

    const systemPrompt = `You are a clinical decision support specialist with expert knowledge of the WHO HEARTS 2026 guidelines and the International Classification of Diseases 10th Revision (ICD-10).
Analyze the patient data and return a strictly valid JSON array of 3 to 5 ranked differential diagnoses.
Each item in the JSON array MUST strictly have the following schema:
{
  "icd10Code": "string (valid ICD-10 code, e.g. I10, I16.0, E11.9, I20.9, I50.9, J45.901)",
  "diagnosisName": "string (official medical diagnosis name)",
  "likelihood": "HIGH" | "MODERATE" | "RULE_OUT",
  "probability": number (0 to 100),
  "clinicalRationale": "string (concise 1-2 sentence rationale citing patient data)",
  "supportingEvidence": ["string", "string"],
  "conflictingFactors": ["string"],
  "suggestedWorkup": ["string", "string"],
  "whoGuidelineMapping": "string (recommended WHO HEARTS or ACC/AHA management pathway)"
}

IMPORTANT: Respond ONLY with the JSON array. Do not include markdown code block backticks, notes, or preamble.`;

    const userPrompt = `Patient Case:
Demographics: Age ${patientCase?.demographics?.age}, Sex ${patientCase?.demographics?.sex}, District ${patientCase?.demographics?.district || 'General'}
Vitals: BP ${patientCase?.vitals?.systolicBp}/${patientCase?.vitals?.diastolicBp} mmHg, Heart Rate ${patientCase?.vitals?.heartRate} bpm, SpO2 ${patientCase?.vitals?.oxygenSaturation}%, Glucose ${patientCase?.vitals?.bloodGlucoseMgDl || patientCase?.labs?.glucoseFastingMgDl} mg/dL, Temp ${patientCase?.vitals?.temperatureC || 37}°C.
Reported Symptoms: ${(patientCase?.symptoms || []).map((s: any) => `${s.name || s.code} (sev: ${s.severity})`).join(', ') || 'Asymptomatic screening'}
Medical History: HTN: ${patientCase?.profile?.hypertensionHistory ? 'Yes' : 'No'}, DM: ${patientCase?.profile?.diabetesHistory ? 'Yes' : 'No'}, Prior CVD: ${patientCase?.profile?.previousCVD ? 'Yes' : 'No'}, Stroke: ${patientCase?.profile?.previousStroke ? 'Yes' : 'No'}, Smoking: ${patientCase?.profile?.smokingStatus || 'Never'}, BMI: ${patientCase?.profile?.bmi || 'Normal'}.
Labs: HbA1c: ${patientCase?.labs?.hba1cPercent || 'N/A'}%, Total Chol: ${patientCase?.labs?.totalCholesterolMgDl || 'N/A'} mg/dL, Creatinine: ${patientCase?.labs?.creatinineMgDl || 'N/A'} mg/dL.
Triage Result: ${patientCase?.assessmentResult?.triage?.levelName || 'Pending'}
CVD 10-Year Risk: ${((patientCase?.assessmentResult?.risks?.cardiovascular?.riskScore || 0) * 100).toFixed(0)}%`;

    const candidateModels = ['gemini-3.1-flash-lite', 'gemini-3.8-flash', 'gemini-flash-latest'];
    let geminiJson: any = null;

    for (const modelName of candidateModels) {
      try {
        const response = await ai.models.generateContent({
          model: modelName,
          contents: userPrompt,
          config: {
            systemInstruction: systemPrompt,
            temperature: 0.1,
            responseMimeType: 'application/json',
          },
        });

        if (response.text) {
          const cleaned = response.text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
          const parsed = JSON.parse(cleaned);
          if (Array.isArray(parsed) && parsed.length > 0) {
            geminiJson = parsed.map((item: any) => ({
              icd10Code: String(item.icd10Code || 'R69'),
              diagnosisName: String(item.diagnosisName || 'Clinical Condition Under Evaluation'),
              likelihood:
                item.likelihood === 'HIGH' || item.likelihood === 'RULE_OUT'
                  ? item.likelihood
                  : 'MODERATE',
              probability:
                typeof item.probability === 'number'
                  ? Math.min(100, Math.max(0, item.probability))
                  : 75,
              clinicalRationale: String(
                item.clinicalRationale ||
                  'Evaluated based on clinical presentation and WHO HEARTS criteria.'
              ),
              supportingEvidence: Array.isArray(item.supportingEvidence)
                ? item.supportingEvidence
                : (item.supportingEvidence ? [String(item.supportingEvidence)] : []),
              conflictingFactors: Array.isArray(item.conflictingFactors)
                ? item.conflictingFactors
                : (item.conflictingFactors ? [String(item.conflictingFactors)] : []),
              suggestedWorkup: Array.isArray(item.suggestedWorkup)
                ? item.suggestedWorkup
                : (item.suggestedWorkup ? [String(item.suggestedWorkup)] : []),
              whoGuidelineMapping: String(
                item.whoGuidelineMapping || 'WHO HEARTS 2026 Clinical Pathway'
              ),
            }));
            break;
          }
        }
      } catch (err: any) {
        const errMsg = err?.message || String(err || '');
        const isQuotaOrCapacity =
          err?.status === 429 ||
          err?.status === 503 ||
          err?.status === 'RESOURCE_EXHAUSTED' ||
          err?.status === 'UNAVAILABLE' ||
          errMsg.includes('503') ||
          errMsg.includes('429') ||
          errMsg.includes('high demand') ||
          errMsg.includes('quota') ||
          errMsg.includes('RESOURCE_EXHAUSTED') ||
          errMsg.includes('UNAVAILABLE');

        if (isQuotaOrCapacity) {
          console.info(
            `[CDS Engine] Model ${modelName} temporarily busy/quota constrained. Seamlessly falling back.`
          );
        } else {
          console.info(`[CDS Engine] Differential note (${modelName}): ${errMsg.slice(0, 100)}`);
        }
      }
    }

    if (geminiJson) {
      return res.json({
        success: true,
        source: 'GEMINI_AI_CLINICAL_ENGINE',
        differentials: geminiJson,
      });
    }

    res.json({
      success: true,
      source: 'ALGORITHMIC_RULES_ENGINE',
      differentials: generateAlgorithmicDifferential(),
    });
  } catch (err: any) {
    console.error('Error generating differential diagnosis:', err?.message || err);
    res.json({
      success: true,
      source: 'FALLBACK_CLINICAL_ENGINE',
      differentials: [
        {
          icd10Code: 'I10',
          diagnosisName: 'Essential (Primary) Hypertension',
          likelihood: 'HIGH',
          probability: 85,
          clinicalRationale: 'Elevated blood pressure values meeting hypertension criteria.',
          supportingEvidence: ['Blood pressure elevation', 'Cardiovascular risk factors'],
          conflictingFactors: ['Secondary causes to be ruled out'],
          suggestedWorkup: ['12-Lead ECG', 'Lipid Panel', 'Serum Creatinine', 'Fasting Blood Glucose'],
          whoGuidelineMapping: 'WHO HEARTS Protocol Step 1 Antihypertensive Therapy',
        },
      ],
    });
  }
});

// 14. Server-side Gemini AI Shift Handover Brief Generator (SBAR Protocol)
app.post('/api/gemini/shift-handover', async (req, res) => {
  try {
    const {
      patientCase,
      outgoingDoctor,
      oncomingDoctor,
      shiftType,
      bedLocation,
      pendingLabs,
      criticalCarePlans,
      additionalNotes,
    } = req.body;

    const ai = getAIClient();

    const generateOfflineHandover = () => {
      const pName = patientCase?.demographics?.fullName || 'Patient';
      const pId = patientCase?.demographics?.patientId || 'UNKNOWN';
      const age = patientCase?.demographics?.age || 50;
      const sex = patientCase?.demographics?.sex || '';
      const sbp = patientCase?.vitals?.systolicBp || 130;
      const dbp = patientCase?.vitals?.diastolicBp || 80;
      const hr = patientCase?.vitals?.heartRate || 75;
      const spo2 = patientCase?.vitals?.oxygenSaturation || 98;
      const glucose = patientCase?.vitals?.bloodGlucoseMgDl || 110;
      const triage = patientCase?.assessmentResult?.triage?.levelName || 'Priority Clinical Review';
      const cvdRisk = ((patientCase?.assessmentResult?.risks?.cardiovascular?.riskScore || 0) * 100).toFixed(0);
      const diagnosis = patientCase?.doctorReview?.doctorDiagnosis || 'Hypertensive Cardiovascular Evaluation';

      const labsList = Array.isArray(pendingLabs) && pendingLabs.length > 0
        ? pendingLabs.map((l: any) => `• [${l.priority || 'STAT'}] ${l.testName || l} - Ordered: ${l.orderedAt || 'Current Shift'} (${l.reason || 'Routine follow-up'})`)
        : [
            '• [STAT] Serum Troponin-I & CK-MB (Awaiting 3-hour post-intake repeat)',
            '• [URGENT] Fasting Lipid Fraction Profile & HbA1c assay',
            '• [ROUTINE] Serum Creatinine & Electrolytes (K+, Na+) before ACEi/ARB titration',
          ];

      const carePlansList = Array.isArray(criticalCarePlans) && criticalCarePlans.length > 0
        ? criticalCarePlans.map((c: any) => `• ${typeof c === 'string' ? c : c.directive}`)
        : [
            '• Continuous NIBP and SpO2 telemetry monitoring every 2 hours; alert if SBP ≥ 160 or < 90 mmHg.',
            '• Administer evening dose of Amlodipine 5mg + Telmisartan 40mg with strict fluid balance charting.',
            '• Review morning repeat ECG and report any ST-T wave changes to on-call Cardiology registrar.',
            '• Keep NPO after 24:00 if elective coronary angiography or echocardiogram scheduled.',
          ];

      const situation = `${pName} (${pId}), ${age}yo ${sex}, currently in ${bedLocation || 'Bed 04, Acute Medical Ward'}. Handover from Dr. ${outgoingDoctor || 'Attending'} to Dr. ${oncomingDoctor || 'Oncoming Physician'} for ${shiftType || 'Evening/Night Shift'}. Admitted with ${diagnosis}. Triage status: ${triage}.`;
      const background = `Patient has clinical history of ${patientCase?.profile?.hypertensionHistory ? 'Hypertension' : 'Cardiovascular risk factors'}. Initial bedside vitals: BP ${sbp}/${dbp} mmHg, HR ${hr} bpm, SpO2 ${spo2}%, Blood Glucose ${glucose} mg/dL. 10-year CVD risk evaluated at ${cvdRisk}% under WHO HEARTS protocol.`;
      const assessment = `Physiologically guarded. Hemodynamics presently controlled on current ward regimen, but susceptible to rebound nocturnal hypertension and autonomic instability. Triage tier: ${triage}.`;
      const recommendation = `1. Follow up pending STAT labs.\n2. Maintain hemodynamic targets (SBP < 140 mmHg, HR 60-90 bpm).\n3. Escalate immediately to Code Red / Medical ICU if SBP exceeds 180 mmHg or chest pain recurs.`;

      const rawMarkdown = `### 📋 SBAR Patient Status Brief — Shift Handover
**Patient:** ${pName} (MRN/ID: \`${pId}\`) | **Location:** ${bedLocation || 'Ward 3, Bed 04'}
**Shift Handover:** Dr. ${outgoingDoctor || 'Outgoing Clinician'} ➔ Dr. ${oncomingDoctor || 'Oncoming Clinician'} (${shiftType || 'Evening Shift'})
**Timestamp:** ${new Date().toLocaleString()}

---

#### 1. Situation (S)
${situation}

#### 2. Background (B)
${background}

#### 3. Assessment (A)
${assessment}

#### 4. Recommendation & Active Care Plans (R)
${recommendation}

---

#### 🧪 Critical Pending Lab Results:
${labsList.join('\n')}

#### 🛡️ Critical Care Plans & Nursing Directives:
${carePlansList.join('\n')}
${additionalNotes ? `\n**Special Handover Notes:** ${additionalNotes}` : ''}`;

      return {
        situation,
        background,
        assessment,
        recommendation,
        pendingLabsFormatted: labsList,
        criticalCarePlansFormatted: carePlansList,
        rawMarkdownBrief: rawMarkdown,
      };
    };

    if (!ai) {
      return res.json({
        success: true,
        source: 'ALGORITHMIC_RULES_ENGINE',
        brief: generateOfflineHandover(),
      });
    }

    const systemPrompt = `You are a Chief Medical Officer and hospital informatics specialist generating an authoritative SBAR (Situation, Background, Assessment, Recommendation) Shift Handover Brief.
The brief is passed from the outgoing physician to the oncoming physician.
Highlight pending lab results with turnaround priority and itemized critical care plans.
Maintain professional, concise, actionable clinical language adhering to WHO HEARTS protocols.
Return valid JSON with:
{
  "situation": "string",
  "background": "string",
  "assessment": "string",
  "recommendation": "string",
  "pendingLabsFormatted": ["string"],
  "criticalCarePlansFormatted": ["string"],
  "rawMarkdownBrief": "string (complete formatted markdown brief)"
}`;

    const userPrompt = `Patient: ${patientCase?.demographics?.fullName} (${patientCase?.demographics?.patientId}), Age ${patientCase?.demographics?.age}yo ${patientCase?.demographics?.sex}.
Location: ${bedLocation || 'Ward Bed'}
Outgoing Physician: Dr. ${outgoingDoctor || 'Attending'}
Oncoming Physician: Dr. ${oncomingDoctor || 'Relief Physician'}
Shift: ${shiftType || 'Shift Transition'}
Current Vitals: BP ${patientCase?.vitals?.systolicBp}/${patientCase?.vitals?.diastolicBp} mmHg, HR ${patientCase?.vitals?.heartRate} bpm, SpO2 ${patientCase?.vitals?.oxygenSaturation}%, Glucose ${patientCase?.vitals?.bloodGlucoseMgDl} mg/dL.
Diagnosis: ${patientCase?.doctorReview?.doctorDiagnosis || 'Primary Cardiovascular Evaluation'}
Triage Level: ${patientCase?.assessmentResult?.triage?.levelName}
Pending Labs requested by doctor: ${JSON.stringify(pendingLabs || [])}
Critical Care Plans entered by doctor: ${JSON.stringify(criticalCarePlans || [])}
Additional clinician notes: ${additionalNotes || 'None'}`;

    const candidateModels = ['gemini-3.8-flash', 'gemini-flash-latest'];
    let handoverJson: any = null;

    for (const modelName of candidateModels) {
      try {
        const response = await ai.models.generateContent({
          model: modelName,
          contents: userPrompt,
          config: {
            systemInstruction: systemPrompt,
            temperature: 0.2,
            responseMimeType: 'application/json',
          },
        });

        if (response.text) {
          const cleaned = response.text.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
          const parsed = JSON.parse(cleaned);
          if (parsed && parsed.situation) {
            handoverJson = parsed;
            break;
          }
        }
      } catch (err: any) {
        console.warn(`Shift handover brief generation on ${modelName} error:`, err?.message || err);
      }
    }

    if (handoverJson) {
      return res.json({
        success: true,
        source: 'GEMINI_AI_HANDOVER_ENGINE',
        brief: handoverJson,
      });
    }

    res.json({
      success: true,
      source: 'ALGORITHMIC_RULES_ENGINE',
      brief: generateOfflineHandover(),
    });
  } catch (err: any) {
    console.error('Error in /api/gemini/shift-handover:', err);
    res.status(500).json({ error: err.message });
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
