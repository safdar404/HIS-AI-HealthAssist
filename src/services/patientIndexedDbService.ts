/**
 * Patient Record & Clinical Review Periodic Auto-Save Service
 * Backed by IndexedDB (with LocalStorage fallback)
 * Keyed by patient name & ID to guarantee clinical session persistence across page refreshes, tab closures, and crash recovery.
 */

import { PatientAssessmentRecord } from '../types/clinical';

export interface PatientReviewDraftState {
  doctorName?: string;
  doctorLicenseNo?: string;
  facility?: string;
  aiAgreement?: string;
  doctorDiagnosis?: string;
  clinicalNotes?: string;
  orderedInvestigations?: string[];
  prescribedDrugs?: {
    drugName: string;
    dosage: string;
    frequency: string;
    duration: string;
    safetyChecksPassed: boolean;
    safetyNotes?: string;
  }[];
  doctorProfessionalFee?: number;
  medicationCalcState?: {
    customItemPricings?: Record<string, number>;
    totalMedicationsCost?: number;
    grandTotalWithFee?: number;
  };
  timestamp?: number;
}

export interface PatientAutosaveRecord {
  patientKey: string; // e.g. `${patientId}_${sanitizedName}`
  patientId: string;
  patientName: string;
  mrn: string;
  timestamp: number;
  lastSavedIso: string;
  lastSavedFormatted: string;
  reviewDraft: PatientReviewDraftState;
  fullRecord?: PatientAssessmentRecord;
}

const DB_NAME = 'HealthPulseClinicalDB';
const DB_VERSION = 1;
const STORE_NAME = 'patient_autosaves';
const LOCALSTORAGE_BACKUP_PREFIX = 'healthpulse_idb_fallback_';

class PatientIndexedDbService {
  private dbPromise: Promise<IDBDatabase> | null = null;
  private isIndexedDbAvailable: boolean = typeof window !== 'undefined' && !!window.indexedDB;

  constructor() {
    if (this.isIndexedDbAvailable) {
      this.initDb();
    }
  }

  private initDb(): Promise<IDBDatabase> {
    if (this.dbPromise) return this.dbPromise;

    this.dbPromise = new Promise((resolve, reject) => {
      if (!this.isIndexedDbAvailable) {
        reject(new Error('IndexedDB is not supported or accessible'));
        return;
      }

      try {
        const request = window.indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
          const db = (event.target as IDBOpenDBRequest).result;
          if (!db.objectStoreNames.contains(STORE_NAME)) {
            const store = db.createObjectStore(STORE_NAME, { keyPath: 'patientKey' });
            store.createIndex('patientId', 'patientId', { unique: false });
            store.createIndex('patientName', 'patientName', { unique: false });
            store.createIndex('timestamp', 'timestamp', { unique: false });
          }
        };

        request.onsuccess = (event: Event) => {
          const db = (event.target as IDBOpenDBRequest).result;
          resolve(db);
        };

        request.onerror = (event: Event) => {
          console.warn('IndexedDB open request failed, falling back to LocalStorage:', event);
          reject((event.target as IDBOpenDBRequest).error);
        };
      } catch (err) {
        console.warn('IndexedDB initialization exception:', err);
        reject(err);
      }
    });

    return this.dbPromise;
  }

  /**
   * Generates a unique, normalized patient key combining patientId and name.
   */
  public generatePatientKey(patientId: string, patientName: string): string {
    const cleanName = (patientName || 'Anonymous')
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '_');
    const cleanId = (patientId || 'unknown_id').trim().toLowerCase();
    return `${cleanId}__${cleanName}`;
  }

  /**
   * Saves or updates an autosave snapshot for a patient session.
   */
  public async savePatientDraft(
    record: PatientAssessmentRecord,
    reviewDraft: PatientReviewDraftState
  ): Promise<PatientAutosaveRecord> {
    const now = Date.now();
    const patientId = record.demographics.patientId;
    const patientName = record.demographics.fullName || 'Unknown Patient';
    const mrn = record.demographics.mrn || patientId;
    const patientKey = this.generatePatientKey(patientId, patientName);

    const nowObj = new Date(now);
    const lastSavedIso = nowObj.toISOString();
    const lastSavedFormatted = nowObj.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });

    const autosaveEntry: PatientAutosaveRecord = {
      patientKey,
      patientId,
      patientName,
      mrn,
      timestamp: now,
      lastSavedIso,
      lastSavedFormatted,
      reviewDraft: {
        ...reviewDraft,
        timestamp: now,
      },
      fullRecord: record,
    };

    try {
      const db = await this.initDb();
      await new Promise<void>((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const request = store.put(autosaveEntry);

        request.onsuccess = () => resolve();
        request.onerror = () => reject(request.error);
        transaction.onerror = () => reject(transaction.error);
      });
    } catch (err) {
      // Fallback to LocalStorage if IndexedDB fails or is in private mode
      this.saveToLocalStorageFallback(autosaveEntry);
    }

    return autosaveEntry;
  }

  /**
   * Retrieves an autosaved draft by patientId or composite patientKey.
   */
  public async getPatientDraft(patientId: string, patientName?: string): Promise<PatientAutosaveRecord | null> {
    const directKey = patientName
      ? this.generatePatientKey(patientId, patientName)
      : null;

    try {
      const db = await this.initDb();
      return await new Promise<PatientAutosaveRecord | null>((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readonly');
        const store = transaction.objectStore(STORE_NAME);

        // Try direct key first
        if (directKey) {
          const directReq = store.get(directKey);
          directReq.onsuccess = () => {
            if (directReq.result) {
              resolve(directReq.result as PatientAutosaveRecord);
              return;
            }
            // If not found by directKey, fall back to index search
            this.searchByIndex(store, patientId, resolve, reject);
          };
          directReq.onerror = () => this.searchByIndex(store, patientId, resolve, reject);
        } else {
          this.searchByIndex(store, patientId, resolve, reject);
        }
      });
    } catch (err) {
      return this.getFromLocalStorageFallback(patientId, patientName);
    }
  }

  private searchByIndex(
    store: IDBObjectStore,
    patientId: string,
    resolve: (val: PatientAutosaveRecord | null) => void,
    reject: (reason?: any) => void
  ) {
    try {
      const index = store.index('patientId');
      const req = index.get(patientId);
      req.onsuccess = () => {
        resolve((req.result as PatientAutosaveRecord) || null);
      };
      req.onerror = () => reject(req.error);
    } catch (e) {
      resolve(null);
    }
  }

  /**
   * Lists all autosaved patient draft records across the session.
   */
  public async listAllAutosavedRecords(): Promise<PatientAutosaveRecord[]> {
    try {
      const db = await this.initDb();
      return await new Promise<PatientAutosaveRecord[]>((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const req = store.getAll();

        req.onsuccess = () => {
          const results = (req.result as PatientAutosaveRecord[]) || [];
          // Sort newest first
          results.sort((a, b) => b.timestamp - a.timestamp);
          resolve(results);
        };
        req.onerror = () => reject(req.error);
      });
    } catch (err) {
      return this.getAllFromLocalStorageFallback();
    }
  }

  /**
   * Deletes an autosaved draft when discarded or permanently finalized.
   */
  public async deletePatientDraft(patientId: string, patientName?: string): Promise<void> {
    const key = patientName ? this.generatePatientKey(patientId, patientName) : null;
    try {
      const db = await this.initDb();
      await new Promise<void>((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);

        if (key) {
          const req = store.delete(key);
          req.onsuccess = () => resolve();
          req.onerror = () => reject(req.error);
        } else {
          // Find by index and delete
          const index = store.index('patientId');
          const req = index.getKey(patientId);
          req.onsuccess = () => {
            if (req.result) {
              const delReq = store.delete(req.result);
              delReq.onsuccess = () => resolve();
              delReq.onerror = () => reject(delReq.error);
            } else {
              resolve();
            }
          };
          req.onerror = () => reject(req.error);
        }
      });
    } catch (err) {
      this.deleteFromLocalStorageFallback(patientId, patientName);
    }
  }

  /**
   * Clears all autosaved patient drafts.
   */
  public async clearAllDrafts(): Promise<void> {
    try {
      const db = await this.initDb();
      await new Promise<void>((resolve, reject) => {
        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        const req = store.clear();
        req.onsuccess = () => resolve();
        req.onerror = () => reject(req.error);
      });
    } catch (err) {
      // Clear local storage fallback entries
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const k = localStorage.key(i);
        if (k && k.startsWith(LOCALSTORAGE_BACKUP_PREFIX)) {
          localStorage.removeItem(k);
        }
      }
    }
  }

  // --- LocalStorage Fallbacks ---
  private saveToLocalStorageFallback(item: PatientAutosaveRecord) {
    try {
      const key = `${LOCALSTORAGE_BACKUP_PREFIX}${item.patientKey}`;
      localStorage.setItem(key, JSON.stringify(item));
    } catch (e) {
      console.warn('LocalStorage backup failed:', e);
    }
  }

  private getFromLocalStorageFallback(patientId: string, patientName?: string): PatientAutosaveRecord | null {
    try {
      if (patientName) {
        const key = `${LOCALSTORAGE_BACKUP_PREFIX}${this.generatePatientKey(patientId, patientName)}`;
        const raw = localStorage.getItem(key);
        if (raw) return JSON.parse(raw);
      }
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith(LOCALSTORAGE_BACKUP_PREFIX)) {
          const item: PatientAutosaveRecord = JSON.parse(localStorage.getItem(k) || '{}');
          if (item.patientId === patientId) {
            return item;
          }
        }
      }
    } catch (e) {
      console.warn('Failed to read from LocalStorage fallback', e);
    }
    return null;
  }

  private getAllFromLocalStorageFallback(): PatientAutosaveRecord[] {
    const results: PatientAutosaveRecord[] = [];
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith(LOCALSTORAGE_BACKUP_PREFIX)) {
          results.push(JSON.parse(localStorage.getItem(k) || '{}'));
        }
      }
      results.sort((a, b) => b.timestamp - a.timestamp);
    } catch (e) {
      console.warn('Failed to retrieve fallback drafts', e);
    }
    return results;
  }

  private deleteFromLocalStorageFallback(patientId: string, patientName?: string) {
    try {
      if (patientName) {
        const key = `${LOCALSTORAGE_BACKUP_PREFIX}${this.generatePatientKey(patientId, patientName)}`;
        localStorage.removeItem(key);
      }
      for (let i = localStorage.length - 1; i >= 0; i--) {
        const k = localStorage.key(i);
        if (k && k.startsWith(LOCALSTORAGE_BACKUP_PREFIX)) {
          const item = JSON.parse(localStorage.getItem(k) || '{}');
          if (item.patientId === patientId) {
            localStorage.removeItem(k);
          }
        }
      }
    } catch (e) {
      console.warn('Failed to delete fallback draft', e);
    }
  }
}

export const patientIndexedDb = new PatientIndexedDbService();
