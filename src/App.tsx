import React, { useState, useEffect, useRef } from 'react';
import { Header, ActiveTab } from './components/Header';
import { PatientIntakeWizard } from './components/PatientIntakeWizard';
import { DoctorCDSPortal } from './components/DoctorCDSPortal';
import { PatientRegistryView } from './components/PatientRegistryView';
import { ClinicalCalculatorsView } from './components/ClinicalCalculatorsView';
import { GeoAICommandCenter } from './components/GeoAICommandCenter';
import { MLModelRegistryView } from './components/MLModelRegistryView';
import { ClinicalGuidelinesView } from './components/ClinicalGuidelinesView';
import { AuditLogView } from './components/AuditLogView';
import { EmergencyAlertBanner } from './components/EmergencyAlertBanner';
import { FloatingActionButton } from './components/FloatingActionButton';
import { Footer } from './components/Footer';
import { MobileDrawerNav } from './components/MobileDrawerNav';
import { BiometricAuthOverlay } from './components/BiometricAuthOverlay';
import { PatientAssessmentRecord, DoctorReview } from './types/clinical';
import { SAMPLE_CASES } from './data/samplePatientCases';
import { emergencyNotificationService } from './services/emergencyNotificationService';
import { exportPatientAssessmentToPDF } from './utils/clinicalPdfExport';
import { recordPatientView } from './utils/recentPatientsStorage';
import { useAutoLogout } from './hooks/useAutoLogout';
import { ShieldAlert, RefreshCw } from 'lucide-react';

export function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('INTAKE');
  const [assessments, setAssessments] = useState<PatientAssessmentRecord[]>(
    Object.values(SAMPLE_CASES)
  );
  const [selectedAssessment, setSelectedAssessment] =
    useState<PatientAssessmentRecord | null>(Object.values(SAMPLE_CASES)[0]);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState<boolean>(false);

  // Auto-logout after 5 minutes of user inactivity (HIPAA §164.312)
  const {
    isLocked,
    timeRemainingSeconds,
    showWarning,
    resetTimer,
    lockNow,
    unlockSession,
  } = useAutoLogout(false);

  // Record patient view whenever selectedAssessment changes
  useEffect(() => {
    if (selectedAssessment) {
      recordPatientView(selectedAssessment);
    }
  }, [selectedAssessment]);

  // Global High-Contrast Clinical Theme State (Light vs Night Shift Dark)
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem('app_theme');
    return saved === 'dark' ? 'dark' : 'light';
  });

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('app_theme', theme);
  }, [theme]);

  const handleToggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  // Track emergency patient notifications to avoid duplicate triggers
  const notifiedEmergencyIds = useRef<Set<string>>(new Set());

  // Watch for critical triage assessments and trigger real-time audio/browser notifications
  useEffect(() => {
    const emergencyList = assessments.filter(
      (a) =>
        a.assessmentResult?.triage.level === 'LEVEL_1_EMERGENCY' ||
        a.assessmentResult?.isEmergency
    );

    emergencyList.forEach((c) => {
      if (!notifiedEmergencyIds.current.has(c.demographics.patientId)) {
        notifiedEmergencyIds.current.add(c.demographics.patientId);
        emergencyNotificationService.triggerCriticalAlert({
          patientId: c.demographics.patientId,
          patientName: c.demographics.fullName,
          age: c.demographics.age,
          sex: c.demographics.sex,
          gender: c.demographics.sex,
          district: c.demographics.district,
          facility: c.demographics.district ? `${c.demographics.district} DHQ Emergency Center` : 'DHQ Emergency Center',
          triageLevel: 'LEVEL_1_EMERGENCY',
          triageLevelName:
            c.assessmentResult?.triage.levelName ||
            'Level 1: Resuscitation / Immediate Emergency',
          vitals: {
            sbp: c.vitals.systolicBp || 180,
            dbp: c.vitals.diastolicBp || 110,
            spo2: c.vitals.oxygenSaturation || 92,
            heartRate: c.vitals.heartRate || 110,
            glucose: c.vitals.randomBloodGlucose || 140,
          },
          vitalSigns: {
            bp: `${c.vitals.systolicBp || '180'}/${c.vitals.diastolicBp || '110'}`,
            hr: c.vitals.heartRate || 110,
            spo2: c.vitals.oxygenSaturation || 92,
          },
          chiefComplaint: c.symptoms?.chiefComplaints?.join(', ') || 'Acute cardiovascular instability / Red-flag triage',
          redFlagWarnings: c.assessmentResult?.redFlags?.length
            ? c.assessmentResult.redFlags
            : ['Acute cardiovascular / hemodynamic instability observed'],
          timestamp: c.assessmentResult?.timestamp || new Date().toISOString(),
        });
      }
    });
  }, [assessments]);

  // Fetch initial assessments from server
  useEffect(() => {
    fetch('/api/assessments')
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.assessments && data.assessments.length > 0) {
          setAssessments(data.assessments);
          setSelectedAssessment(data.assessments[0]);
        }
      })
      .catch((err) => {
        console.warn('Using local fallback assessments:', err);
      });
  }, []);

  // Compute live emergency count
  const emergencyCount = assessments.filter(
    (a) =>
      a.assessmentResult?.triage.level === 'LEVEL_1_EMERGENCY' ||
      a.assessmentResult?.isEmergency
  ).length;

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleAssessmentCompleted = (newRecord: PatientAssessmentRecord) => {
    setAssessments((prev) => [newRecord, ...prev]);
    setSelectedAssessment(newRecord);
    setActiveTab('DOCTOR_CDS');
    showToast(`✓ Assessment Saved for ${newRecord.demographics.fullName} (${newRecord.demographics.patientId})`);
  };

  const handleSelectSampleCase = (caseKey: string) => {
    const sample = SAMPLE_CASES[caseKey];
    if (sample) {
      const existing = assessments.find(
        (a) => a.demographics.patientId === sample.demographics.patientId
      );
      if (existing) {
        setSelectedAssessment(existing);
      } else {
        setAssessments((prev) => [sample, ...prev]);
        setSelectedAssessment(sample);
      }
      setActiveTab('DOCTOR_CDS');
      showToast(`Loaded clinical sample case: ${sample.demographics.fullName}`);
    }
  };

  const handleSaveDoctorReview = (patientId: string, review: DoctorReview) => {
    setAssessments((prev) =>
      prev.map((a) => {
        if (a.demographics.patientId === patientId) {
          return {
            ...a,
            doctorReview: review,
          };
        }
        return a;
      })
    );

    if (selectedAssessment?.demographics.patientId === patientId) {
      setSelectedAssessment((prev) =>
        prev
          ? {
              ...prev,
              doctorReview: review,
            }
          : null
      );
    }
    showToast('✓ Doctor Review & Clinical Prescription Signed Successfully.');
  };

  const handleDeletePatient = (patientId: string) => {
    setAssessments((prev) => prev.filter((a) => a.demographics.patientId !== patientId));
    if (selectedAssessment?.demographics.patientId === patientId) {
      setSelectedAssessment(null);
    }
    showToast(`Patient record ${patientId} removed.`);
  };

  const handleUpdatePatient = (updated: PatientAssessmentRecord) => {
    setAssessments((prev) =>
      prev.map((a) => (a.demographics.patientId === updated.demographics.patientId ? updated : a))
    );
    if (selectedAssessment?.demographics.patientId === updated.demographics.patientId) {
      setSelectedAssessment(updated);
    }
    showToast(`✓ Updated patient ${updated.demographics.fullName}`);
  };

  const handleImportRecords = (newRecords: PatientAssessmentRecord[]) => {
    setAssessments((prev) => [...newRecords, ...prev]);
    showToast(`✓ Imported ${newRecords.length} patient records into registry.`);
  };

  return (
    <div className={`min-h-screen ${theme === 'dark' ? 'bg-slate-950 text-slate-100' : 'bg-slate-100/70 text-slate-800'} flex flex-col font-sans antialiased`}>
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white text-xs font-semibold px-4 py-3 rounded-xl shadow-2xl border border-slate-700 flex items-center gap-2 animate-fade-in">
          <span className="inline-block w-2 h-2 rounded-full bg-cyan-400"></span>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Inactivity Warning Bar (30 seconds before auto-lock) */}
      {showWarning && !isLocked && (
        <div className="sticky top-0 z-50 bg-amber-500 text-slate-950 px-4 py-2 text-xs font-black flex items-center justify-between shadow-lg animate-pulse">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4" />
            <span>
              HIPAA Session Inactivity Warning: System will auto-lock in {timeRemainingSeconds} seconds.
            </span>
          </div>
          <button
            onClick={resetTimer}
            className="px-3 py-1 bg-slate-950 text-amber-300 rounded-lg font-bold hover:bg-slate-900 transition-colors flex items-center gap-1 cursor-pointer"
          >
            <RefreshCw className="w-3 h-3" />
            <span>Stay Signed In</span>
          </button>
        </div>
      )}

      {/* Global Hospital Header & Clinical Command Bar */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        emergencyCount={emergencyCount}
        totalAssessments={assessments.length}
        assessments={assessments}
        theme={theme}
        onToggleTheme={handleToggleTheme}
        onOpenMobileDrawer={() => setMobileDrawerOpen(true)}
        onLockSession={lockNow}
        onSearchSelect={(record) => {
          setSelectedAssessment(record);
          setActiveTab('DOCTOR_CDS');
        }}
      />

      {/* Real-Time WebSocket-like Critical Emergency Alert Banner */}
      <EmergencyAlertBanner
        onOpenPatientCDS={(patientId) => {
          const target = assessments.find((a) => a.demographics.patientId === patientId);
          if (target) {
            setSelectedAssessment(target);
            setActiveTab('DOCTOR_CDS');
          }
        }}
      />

      {/* Main Viewport Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* 1. Patient Intake & Triage Wizard */}
        {activeTab === 'INTAKE' && (
          <PatientIntakeWizard
            onAssessmentCompleted={handleAssessmentCompleted}
            onSelectSampleCase={handleSelectSampleCase}
          />
        )}

        {/* 2. Doctor Decision Support Portal */}
        {activeTab === 'DOCTOR_CDS' && (
          <DoctorCDSPortal
            assessments={assessments}
            selectedAssessment={selectedAssessment}
            onSelectAssessment={(record) => setSelectedAssessment(record)}
            onSaveDoctorReview={handleSaveDoctorReview}
          />
        )}

        {/* 3. Master Patient Directory (EHR) */}
        {activeTab === 'REGISTRY' && (
          <PatientRegistryView
            assessments={assessments}
            onSelectAssessment={(record) => {
              setSelectedAssessment(record);
              setActiveTab('DOCTOR_CDS');
            }}
            onOpenIntake={() => setActiveTab('INTAKE')}
            onDeletePatient={handleDeletePatient}
            onUpdatePatient={handleUpdatePatient}
            onImportRecords={handleImportRecords}
          />
        )}

        {/* 4. Point-of-Care Clinical Calculators */}
        {activeTab === 'CALCULATORS' && <ClinicalCalculatorsView />}

        {/* 5. GeoAI Pakistan Public Health Surveillance & Population Pyramid */}
        {activeTab === 'GEO_AI' && <GeoAICommandCenter assessments={assessments} />}

        {/* 6. Machine Learning Model Registry & Fairness */}
        {activeTab === 'ML_REGISTRY' && <MLModelRegistryView />}

        {/* 7. Clinical Guidelines & Compendium */}
        {activeTab === 'GUIDELINES' && <ClinicalGuidelinesView />}

        {/* 8. Audit Trail & Regulatory Logs */}
        {activeTab === 'AUDIT_LOGS' && <AuditLogView />}
      </main>

      {/* Collapsible Mobile Navigation Drawer for Emergency Field Visits */}
      <MobileDrawerNav
        isOpen={mobileDrawerOpen}
        onClose={() => setMobileDrawerOpen(false)}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        emergencyCount={emergencyCount}
        totalAssessments={assessments.length}
        facility="JPMC / National Tele-Triage Node"
        attendingDoctor="Dr. Asim Farooq, MD, FCPS"
        theme={theme}
        onToggleTheme={handleToggleTheme}
        isAudioMuted={emergencyNotificationService.isMuted()}
        onToggleAudio={() => emergencyNotificationService.toggleMute()}
        onLockSession={lockNow}
        onQuickIntake={() => {
          setActiveTab('INTAKE');
          showToast('Opened New Intake Wizard');
        }}
        onEmergencyDispatch={() => {
          setActiveTab('GEO_AI');
          showToast('Opened Emergency 1122 Dispatch Surveillance Node');
        }}
        selectedAssessment={selectedAssessment}
        onDownloadReport={() => {
          if (selectedAssessment) {
            exportPatientAssessmentToPDF(selectedAssessment);
            showToast(`✓ Downloading PDF for ${selectedAssessment.demographics.fullName}`);
          }
        }}
      />

      {/* Biometric Auto-Logout Re-Authentication Overlay */}
      {isLocked && (
        <BiometricAuthOverlay
          isOpen={isLocked}
          onClose={() => {
            showToast('Biometric authentication required to unlock clinician session.');
          }}
          onAuthenticated={() => {
            unlockSession();
            showToast('✓ Session Unlocked. Welcome back, Dr. Asim Farooq.');
          }}
          patientRecord={selectedAssessment}
          doctorName="Dr. Asim Farooq, MD, FCPS"
          doctorLicenseNo="PMDC-58921-P"
          title="Session Inactivity Auto-Lockout"
          subtitle="HIPAA §164.312(a)(2)(iii) Security Enforcement"
        />
      )}

      {/* Floating Action Button (FAB) Speed Dial Menu */}
      <FloatingActionButton
        onNewIntake={() => {
          setActiveTab('INTAKE');
          showToast('Opened New Patient Intake Assessment Wizard');
        }}
        onLaunchCalculators={() => {
          setActiveTab('CALCULATORS');
          showToast('Point-of-Care Clinical Calculators Active');
        }}
        onOpenSearch={() => {
          const input = document.getElementById('header-global-search-input');
          if (input) {
            input.focus();
            showToast('Global Patient Search Focused (Type Name or MRN)');
          } else {
            setActiveTab('REGISTRY');
          }
        }}
        onDownloadReport={() => {
          if (selectedAssessment) {
            exportPatientAssessmentToPDF(selectedAssessment);
            showToast(`✓ Downloading PDF Clinical Report for ${selectedAssessment.demographics.fullName}`);
          } else {
            showToast('No active patient selected for report download.');
          }
        }}
        onEmergencyHotlines={() => {
          setActiveTab('GEO_AI');
          showToast('Emergency EMS 1122 Dispatch & Surveillance Node Opened');
        }}
        hasActivePatient={!!selectedAssessment}
        activePatientName={selectedAssessment?.demographics.fullName}
        emergencyCount={emergencyCount}
      />

      {/* Globally Standardized Medical Footer */}
      <Footer
        onOpenGuidelines={() => setActiveTab('GUIDELINES')}
        onOpenCalculators={() => setActiveTab('CALCULATORS')}
        onOpenAuditLogs={() => setActiveTab('AUDIT_LOGS')}
      />
    </div>
  );
}

export default App;
