import { PatientAssessmentRecord } from '../types/clinical';

const RECENT_PATIENTS_KEY = 'his_recent_patients_viewed';
const MAX_RECENT_PATIENTS = 5;

export interface RecentPatientEntry {
  patientId: string;
  fullName: string;
  age: number;
  sex: string;
  district: string;
  mrn?: string;
  triageLevel?: string;
  triageLevelName?: string;
  isEmergency?: boolean;
  viewedAt: string;
}

/**
 * Retrieves the last 5 patient records viewed by the doctor from localStorage.
 */
export function getRecentPatients(): RecentPatientEntry[] {
  try {
    const raw = localStorage.getItem(RECENT_PATIENTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.slice(0, MAX_RECENT_PATIENTS);
    }
    return [];
  } catch (e) {
    console.error('Failed to load recent patients:', e);
    return [];
  }
}

/**
 * Persists a patient record to the recent patients list (max 5 records, most recent first).
 */
export function recordPatientView(record: PatientAssessmentRecord): void {
  try {
    const current = getRecentPatients();
    const entry: RecentPatientEntry = {
      patientId: record.demographics.patientId,
      fullName: record.demographics.fullName,
      age: record.demographics.age,
      sex: record.demographics.sex,
      district: record.demographics.district,
      mrn: record.demographics.mrn,
      triageLevel: record.assessmentResult?.triage?.level,
      triageLevelName: record.assessmentResult?.triage?.levelName,
      isEmergency: record.assessmentResult?.isEmergency,
      viewedAt: new Date().toISOString(),
    };

    // Filter out duplicates of the same patientId, place new entry at top, limit to 5
    const updated = [entry, ...current.filter((p) => p.patientId !== entry.patientId)].slice(
      0,
      MAX_RECENT_PATIENTS
    );

    localStorage.setItem(RECENT_PATIENTS_KEY, JSON.stringify(updated));
  } catch (e) {
    console.error('Failed to record recent patient view:', e);
  }
}

/**
 * Clears the persisted recent patients history from localStorage.
 */
export function clearRecentPatients(): void {
  try {
    localStorage.removeItem(RECENT_PATIENTS_KEY);
  } catch (e) {
    console.error('Failed to clear recent patients:', e);
  }
}
