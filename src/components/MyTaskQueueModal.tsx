import React, { useState, useMemo } from 'react';
import {
  ListTodo,
  CheckCircle2,
  AlertTriangle,
  AlertOctagon,
  Clock,
  FlaskConical,
  Pill,
  HeartPulse,
  Calendar,
  Search,
  Filter,
  ArrowRight,
  Sparkles,
  ChevronRight,
  ShieldAlert,
  User,
  X,
  RefreshCw,
  Check,
  Building2,
  Stethoscope,
} from 'lucide-react';
import { PatientAssessmentRecord } from '../types/clinical';
import { CopyPatientIdButton } from './CopyPatientIdButton';

export type TaskCategory = 'ALL' | 'VITALS' | 'REVIEWS' | 'MEDS' | 'LABS' | 'FOLLOWUPS';
export type TaskPriority = 'URGENT' | 'HIGH' | 'ROUTINE';

export interface ClinicianTaskItem {
  id: string;
  patientId: string;
  patientName: string;
  patientRecord: PatientAssessmentRecord;
  category: 'VITALS' | 'REVIEWS' | 'MEDS' | 'LABS' | 'FOLLOWUPS';
  priority: TaskPriority;
  title: string;
  description: string;
  targetSubTab?: 'DOSSIER' | 'TRENDS' | 'MEDICATIONS' | 'LABS';
  targetMainTab?: string;
  createdTime: string;
  isCompleted?: boolean;
}

interface MyTaskQueueModalProps {
  isOpen: boolean;
  onClose: () => void;
  assessments: PatientAssessmentRecord[];
  onSelectPatient: (record: PatientAssessmentRecord, subTab?: 'DOSSIER' | 'TRENDS' | 'MEDICATIONS' | 'LABS', mainTab?: string) => void;
}

const STORAGE_COMPLETED_TASKS = 'clinician_completed_task_ids';

export const MyTaskQueueModal: React.FC<MyTaskQueueModalProps> = ({
  isOpen,
  onClose,
  assessments,
  onSelectPatient,
}) => {
  const [activeCategory, setActiveCategory] = useState<TaskCategory>('ALL');
  const [priorityFilter, setPriorityFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [completedTaskIds, setCompletedTaskIds] = useState<Set<string>>(() => {
    const saved = localStorage.getItem(STORAGE_COMPLETED_TASKS);
    return saved ? new Set(JSON.parse(saved)) : new Set();
  });

  const toggleTaskComplete = (taskId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setCompletedTaskIds((prev) => {
      const next = new Set(prev);
      if (next.has(taskId)) {
        next.delete(taskId);
      } else {
        next.add(taskId);
      }
      localStorage.setItem(STORAGE_COMPLETED_TASKS, JSON.stringify(Array.from(next)));
      return next;
    });
  };

  const handleClearCompleted = () => {
    setCompletedTaskIds(new Set());
    localStorage.removeItem(STORAGE_COMPLETED_TASKS);
  };

  // Compile tasks dynamically across all patient assessments
  const allTasks = useMemo(() => {
    const items: ClinicianTaskItem[] = [];

    assessments.forEach((record) => {
      const pid = record.demographics.patientId;
      const pname = record.demographics.fullName;
      const triage = record.assessmentResult?.triage.level;
      const sbp = record.vitals.systolicBp || 130;
      const dbp = record.vitals.diastolicBp || 80;
      const spo2 = record.vitals.oxygenSaturation || 98;
      const hr = record.vitals.heartRate || 75;
      const glucose = record.vitals.bloodGlucoseMgDl || record.labs.glucoseFastingMgDl || 110;
      const hasReview = !!record.doctorReview;
      const redFlags = record.assessmentResult?.redFlags || [];

      // 1. Unreviewed High-Risk Assessment (Level 1, 2, 3)
      if (!hasReview && (triage === 'LEVEL_1_EMERGENCY' || triage === 'LEVEL_2_URGENT' || triage === 'LEVEL_3_PRIORITY' || record.assessmentResult?.isEmergency)) {
        items.push({
          id: `task-review-${pid}`,
          patientId: pid,
          patientName: pname,
          patientRecord: record,
          category: 'REVIEWS',
          priority: triage === 'LEVEL_1_EMERGENCY' ? 'URGENT' : 'HIGH',
          title: `Pending Doctor Sign-Off: ${triage?.replace(/_/g, ' ')}`,
          description: `Awaiting physician review and clinical prescription approval for ${pname}. CVD Risk: ${((record.assessmentResult?.risks?.cardiovascular?.riskScore || 0) * 100).toFixed(0)}%.`,
          targetSubTab: 'DOSSIER',
          targetMainTab: 'DOCTOR_CDS',
          createdTime: record.vitals.measurementTime || record.assessmentResult?.timestamp || 'Recent',
        });
      }

      // 2. Flagged Vitals Breaches
      if (sbp >= 180 || dbp >= 110 || spo2 < 90 || hr > 120 || hr < 45 || glucose >= 250) {
        const breachDetails = [];
        if (sbp >= 180) breachDetails.push(`SBP ${sbp} mmHg (≥180)`);
        if (dbp >= 110) breachDetails.push(`DBP ${dbp} mmHg (≥110)`);
        if (spo2 < 90) breachDetails.push(`SpO2 ${spo2}% (<90%)`);
        if (hr > 120) breachDetails.push(`HR ${hr} bpm (Tachycardia)`);
        if (glucose >= 250) breachDetails.push(`Glucose ${glucose} mg/dL (Severe)`);

        items.push({
          id: `task-vitals-${pid}`,
          patientId: pid,
          patientName: pname,
          patientRecord: record,
          category: 'VITALS',
          priority: 'URGENT',
          title: `Critical Vitals Alert: ${breachDetails.join(', ')}`,
          description: `Hemodynamic threshold breach detected on encounter vitals. Review vitals trend and titrate emergency protocols.`,
          targetSubTab: 'TRENDS',
          targetMainTab: 'DOCTOR_CDS',
          createdTime: record.vitals.measurementTime || 'Recent',
        });
      }

      // 3. Incomplete Laboratory Investigations
      const missingLabs = [];
      if (!record.labs.hba1cPercent && (record.profile.diabetesHistory || glucose > 140)) missingLabs.push('HbA1c');
      if (!record.labs.totalCholesterolMgDl && (record.profile.hypertensionHistory || sbp >= 140)) missingLabs.push('Lipid Profile');
      if (!record.labs.creatinineMgDl && (sbp >= 160 || record.profile.kidneyDisease)) missingLabs.push('Serum Creatinine / eGFR');
      if (redFlags.some((r) => r.category === 'CARDIAC_EMERGENCY') && !record.labs.troponinPositive) missingLabs.push('STAT Troponin');

      if (missingLabs.length > 0) {
        items.push({
          id: `task-labs-${pid}`,
          patientId: pid,
          patientName: pname,
          patientRecord: record,
          category: 'LABS',
          priority: missingLabs.includes('STAT Troponin') ? 'URGENT' : 'HIGH',
          title: `Incomplete Lab Panel: ${missingLabs.join(', ')}`,
          description: `Crucial diagnostic investigations required for guideline-directed cardiovascular and metabolic staging.`,
          targetSubTab: 'LABS',
          targetMainTab: 'DOCTOR_CDS',
          createdTime: 'Awaiting Order',
        });
      }

      // 4. Medication Interaction / Unreviewed Prescriptions
      if (record.profile.currentMedications && record.profile.currentMedications.length >= 3) {
        items.push({
          id: `task-meds-${pid}`,
          patientId: pid,
          patientName: pname,
          patientRecord: record,
          category: 'MEDS',
          priority: 'ROUTINE',
          title: `Polypharmacy Medication Reconciliation (${record.profile.currentMedications.length} Rx)`,
          description: `Active medications include ${record.profile.currentMedications.slice(0, 3).join(', ')}. Check DDI matrix for interactions.`,
          targetSubTab: 'MEDICATIONS',
          targetMainTab: 'DOCTOR_CDS',
          createdTime: 'Active Session',
        });
      }

      // 5. Follow-Up Re-assessment Task
      if (record.doctorReview || sbp >= 140) {
        items.push({
          id: `task-followup-${pid}`,
          patientId: pid,
          patientName: pname,
          patientRecord: record,
          category: 'FOLLOWUPS',
          priority: sbp >= 160 ? 'HIGH' : 'ROUTINE',
          title: `Scheduled Follow-Up: 2-4 Week Blood Pressure Re-Evaluation`,
          description: `Evaluate therapeutic response to pharmacotherapy, lifestyle compliance, and confirm repeat biomarker targets.`,
          targetSubTab: 'DOSSIER',
          targetMainTab: 'DOCTOR_CDS',
          createdTime: 'Scheduled',
        });
      }
    });

    return items;
  }, [assessments]);

  // Filter tasks based on category, priority, and search
  const filteredTasks = useMemo(() => {
    return allTasks.filter((task) => {
      if (activeCategory !== 'ALL' && task.category !== activeCategory) return false;
      if (priorityFilter !== 'ALL' && task.priority !== priorityFilter) return false;
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        return (
          task.patientName.toLowerCase().includes(q) ||
          task.patientId.toLowerCase().includes(q) ||
          task.title.toLowerCase().includes(q) ||
          task.description.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [allTasks, activeCategory, priorityFilter, searchQuery]);

  const pendingCount = allTasks.filter((t) => !completedTaskIds.has(t.id)).length;
  const urgentCount = allTasks.filter((t) => t.priority === 'URGENT' && !completedTaskIds.has(t.id)).length;

  if (!isOpen) return null;

  return (
    <div
      id="modal-clinician-task-queue"
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5"
    >
      <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden animate-fadeIn">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 text-white flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-cyan-500 text-slate-950 flex items-center justify-center shadow-md font-black">
              <ListTodo className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base sm:text-lg font-bold text-white tracking-wide">
                  My Clinician Task Queue
                </h2>
                <span className="bg-rose-500 text-white text-xs font-black px-2.5 py-0.5 rounded-full">
                  {pendingCount} Pending
                </span>
                {urgentCount > 0 && (
                  <span className="bg-amber-400 text-slate-950 text-xs font-bold px-2 py-0.5 rounded-full flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" />
                    <span>{urgentCount} Urgent</span>
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-300">
                Single focal point aggregating pending assessments, unreviewed prescriptions, flagged vitals, and lab orders.
              </p>
            </div>
          </div>

          <button
            id="btn-close-task-queue-modal"
            type="button"
            onClick={onClose}
            className="p-2 text-slate-300 hover:text-white hover:bg-white/10 rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Filter & Controls Bar */}
        <div className="p-3.5 sm:p-4 bg-slate-50 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3 shrink-0">
          {/* Category Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
            {[
              { id: 'ALL', label: 'All Tasks', count: allTasks.length },
              { id: 'VITALS', label: 'Vitals Alerts', icon: HeartPulse, count: allTasks.filter((t) => t.category === 'VITALS').length },
              { id: 'REVIEWS', label: 'Reviews', icon: Stethoscope, count: allTasks.filter((t) => t.category === 'REVIEWS').length },
              { id: 'MEDS', label: 'Meds & DDI', icon: Pill, count: allTasks.filter((t) => t.category === 'MEDS').length },
              { id: 'LABS', label: 'Pending Labs', icon: FlaskConical, count: allTasks.filter((t) => t.category === 'LABS').length },
              { id: 'FOLLOWUPS', label: 'Follow-ups', icon: Calendar, count: allTasks.filter((t) => t.category === 'FOLLOWUPS').length },
            ].map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveCategory(tab.id as TaskCategory)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer ${
                    activeCategory === tab.id
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {Icon && <Icon className="w-3.5 h-3.5" />}
                  <span>{tab.label}</span>
                  <span
                    className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                      activeCategory === tab.id ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Search and Priority Filter */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1 md:w-56">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search patient, ID, or task..."
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-xl text-slate-800 focus:outline-none focus:ring-1 focus:ring-slate-900"
              />
            </div>

            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded-xl text-slate-700 font-semibold focus:outline-none cursor-pointer"
            >
              <option value="ALL">All Priorities</option>
              <option value="URGENT">Urgent Only</option>
              <option value="HIGH">High Priority</option>
              <option value="ROUTINE">Routine</option>
            </select>
          </div>
        </div>

        {/* Task List Items Viewport */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5 divide-y divide-slate-100">
          {filteredTasks.length === 0 ? (
            <div className="py-12 text-center text-slate-400 space-y-2">
              <CheckCircle2 className="w-10 h-10 mx-auto text-emerald-500" />
              <div className="text-sm font-bold text-slate-700">All tasks completed in this category!</div>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                No outstanding clinical tasks or unreviewed records match your current filter criteria.
              </p>
            </div>
          ) : (
            filteredTasks.map((task) => {
              const isDone = completedTaskIds.has(task.id);
              const priorityBadge =
                task.priority === 'URGENT'
                  ? 'bg-rose-100 text-rose-800 border-rose-200'
                  : task.priority === 'HIGH'
                  ? 'bg-amber-100 text-amber-800 border-amber-200'
                  : 'bg-slate-100 text-slate-700 border-slate-200';

              const categoryIcon =
                task.category === 'VITALS' ? (
                  <HeartPulse className="w-4 h-4 text-rose-600" />
                ) : task.category === 'REVIEWS' ? (
                  <Stethoscope className="w-4 h-4 text-indigo-600" />
                ) : task.category === 'MEDS' ? (
                  <Pill className="w-4 h-4 text-amber-600" />
                ) : task.category === 'LABS' ? (
                  <FlaskConical className="w-4 h-4 text-cyan-600" />
                ) : (
                  <Calendar className="w-4 h-4 text-purple-600" />
                );

              return (
                <div
                  key={task.id}
                  className={`pt-2.5 rounded-2xl border transition-all p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                    isDone
                      ? 'bg-slate-50/60 border-slate-200 opacity-60'
                      : task.priority === 'URGENT'
                      ? 'bg-rose-50/40 border-rose-200 shadow-2xs hover:border-rose-300'
                      : 'bg-white border-slate-200 shadow-2xs hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    {/* Checkbox */}
                    <button
                      type="button"
                      onClick={(e) => toggleTaskComplete(task.id, e)}
                      className={`mt-0.5 w-5 h-5 rounded-lg border flex items-center justify-center transition-colors cursor-pointer shrink-0 ${
                        isDone
                          ? 'bg-emerald-600 border-emerald-600 text-white'
                          : 'border-slate-300 bg-white hover:border-slate-400 text-transparent'
                      }`}
                      title={isDone ? 'Mark Incomplete' : 'Mark Completed'}
                    >
                      <Check className="w-3 h-3" />
                    </button>

                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="p-1 rounded-md bg-slate-100">{categoryIcon}</span>
                        <span
                          className={`text-xs font-bold ${
                            isDone ? 'line-through text-slate-500' : 'text-slate-900'
                          }`}
                        >
                          {task.title}
                        </span>
                        <span className={`text-[10px] font-bold px-2 py-0.2 rounded-full border ${priorityBadge}`}>
                          {task.priority}
                        </span>
                      </div>

                      <p className="text-xs text-slate-600 leading-relaxed font-normal">
                        {task.description}
                      </p>

                      <div className="flex items-center gap-2 text-[11px] text-slate-500 font-mono flex-wrap pt-0.5">
                        <span className="font-semibold text-slate-800">{task.patientName}</span>
                        <span>•</span>
                        <span>{task.patientId}</span>
                        <CopyPatientIdButton
                          id={`btn-copy-task-${task.id}`}
                          value={task.patientId}
                          label="Copy"
                          size="sm"
                        />
                        <span>•</span>
                        <span className="text-slate-400">{task.createdTime}</span>
                      </div>
                    </div>
                  </div>

                  {/* Action Button */}
                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                    <button
                      type="button"
                      id={`btn-task-action-${task.id}`}
                      onClick={() => {
                        onSelectPatient(task.patientRecord, task.targetSubTab, task.targetMainTab);
                        onClose();
                      }}
                      className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-cyan-600 text-white text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-2xs"
                    >
                      <span>
                        {task.category === 'LABS'
                          ? 'Enter Labs'
                          : task.category === 'MEDS'
                          ? 'Check Meds'
                          : task.category === 'VITALS'
                          ? 'View Trends'
                          : 'Review Patient'}
                      </span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer Summary Bar */}
        <div className="p-3.5 sm:p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between flex-wrap gap-2 text-xs text-slate-600 shrink-0">
          <div className="flex items-center gap-3">
            <span>
              Showing <strong>{filteredTasks.length}</strong> of <strong>{allTasks.length}</strong> tasks
            </span>
            {completedTaskIds.size > 0 && (
              <span className="text-emerald-700 font-medium">
                ({completedTaskIds.size} completed)
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {completedTaskIds.size > 0 && (
              <button
                type="button"
                onClick={handleClearCompleted}
                className="text-xs text-slate-500 hover:text-slate-700 underline cursor-pointer"
              >
                Reset Completed
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 rounded-xl font-bold transition-colors cursor-pointer"
            >
              Close Queue
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
