import React, { useState, useEffect } from 'react';
import { History, ShieldCheck, Download, Search, CheckCircle, AlertTriangle, Printer, FileSpreadsheet, FileJson, Filter } from 'lucide-react';

interface AuditLogEntry {
  timestamp: string;
  eventType: string;
  assessmentId: string;
  patientId: string;
  details: string;
}

export const AuditLogView: React.FC = () => {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [search, setSearch] = useState('');
  const [selectedEventType, setSelectedEventType] = useState<string>('ALL');

  useEffect(() => {
    fetch('/api/audit-logs')
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.logs) {
          setLogs(data.logs);
        }
      })
      .catch((err) => console.error('Failed to fetch audit logs:', err));
  }, []);

  const eventTypes = ['ALL', ...Array.from(new Set(logs.map((l) => l.eventType)))];

  const filteredLogs = logs.filter((l) => {
    const matchesSearch =
      !search ||
      l.patientId.toLowerCase().includes(search.toLowerCase()) ||
      l.details.toLowerCase().includes(search.toLowerCase()) ||
      l.eventType.toLowerCase().includes(search.toLowerCase()) ||
      l.assessmentId.toLowerCase().includes(search.toLowerCase());

    const matchesType = selectedEventType === 'ALL' || l.eventType === selectedEventType;

    return matchesSearch && matchesType;
  });

  // Export to Formatted CSV Compliance Report
  const handleExportCSV = () => {
    if (filteredLogs.length === 0) return;

    const headers = ['Timestamp (UTC)', 'Timestamp (Local)', 'Event Type', 'Patient ID', 'Assessment ID', 'Audit Event Details'];
    const rows = filteredLogs.map((log) => [
      `"${log.timestamp}"`,
      `"${new Date(log.timestamp).toLocaleString()}"`,
      `"${log.eventType.replace(/"/g, '""')}"`,
      `"${log.patientId.replace(/"/g, '""')}"`,
      `"${log.assessmentId.replace(/"/g, '""')}"`,
      `"${log.details.replace(/"/g, '""')}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map((e) => e.join(','))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `HIS_AI_HealthAssist_Compliance_Audit_Log_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Browser Print View
  const handlePrint = () => {
    window.print();
  };

  const handleExportJSON = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(logs, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `ai_healthassist_audit_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-slate-900 rounded-2xl p-6 text-white border border-slate-800 shadow-xl space-y-3 print:bg-white print:text-black print:border-none print:shadow-none print:p-0">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400 print:hidden">
              <History className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black tracking-tight text-white uppercase print:text-black">
                Clinical Audit Trail & Governance Ledger
              </h2>
              <p className="text-xs text-slate-400 print:text-gray-600">
                HIPAA §164.312(b) & PMDC compliant immutable provenance tracking of AI inferences, safety overrides, and clinician sign-offs.
              </p>
            </div>
          </div>

          {/* Action Buttons: CSV, Print, JSON */}
          <div className="flex flex-wrap items-center gap-2 print:hidden">
            <button
              id="btn-print-audit"
              onClick={handlePrint}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition-all border border-slate-700 flex items-center gap-1.5 cursor-pointer shadow-sm active:scale-95"
              title="Print formatted compliance report"
            >
              <Printer className="w-3.5 h-3.5 text-amber-400" />
              <span>Print Report</span>
            </button>

            <button
              id="btn-export-audit-csv"
              onClick={handleExportCSV}
              className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-md shadow-emerald-950/40 active:scale-95"
              title="Export formatted compliance CSV"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Export CSV</span>
            </button>

            <button
              id="btn-export-audit-json"
              onClick={handleExportJSON}
              className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-all border border-slate-700 flex items-center gap-1.5 cursor-pointer active:scale-95"
              title="Export raw JSON records"
            >
              <FileJson className="w-3.5 h-3.5 text-cyan-400" />
              <span>JSON</span>
            </button>
          </div>
        </div>
      </div>

      {/* Audit Log Table Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4 print:border-none print:shadow-none print:p-0">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 print:hidden">
          <div className="flex items-center gap-2 flex-1 max-w-md">
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                id="input-search-audit"
                type="text"
                placeholder="Search by patient ID, MRN, event type, or details..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:outline-none bg-slate-50/50"
              />
            </div>

            {/* Event Type Filter */}
            <select
              value={selectedEventType}
              onChange={(e) => setSelectedEventType(e.target.value)}
              className="py-1.5 px-2.5 text-xs border border-slate-200 rounded-lg bg-slate-50/50 text-slate-700 focus:ring-2 focus:ring-cyan-500 focus:outline-none cursor-pointer"
            >
              {eventTypes.map((t) => (
                <option key={t} value={t}>
                  {t === 'ALL' ? 'All Event Types' : t}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 font-mono">
              Showing <strong>{filteredLogs.length}</strong> of {logs.length} Audit Records
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200 print:bg-gray-100">
              <tr>
                <th className="p-3">Timestamp (UTC/Local)</th>
                <th className="p-3">Event Type</th>
                <th className="p-3">Patient ID</th>
                <th className="p-3">Assessment ID</th>
                <th className="p-3">Event Details & Decision Provenance</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-400 font-sans">
                    No audit records match your query. Run an intake assessment to generate entries.
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                    <td className="p-3 text-slate-500 text-[11px] whitespace-nowrap">
                      <div>{new Date(log.timestamp).toLocaleString()}</div>
                      <div className="text-[9px] text-slate-400 font-mono">{log.timestamp}</div>
                    </td>
                    <td className="p-3 whitespace-nowrap">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold inline-flex items-center gap-1 ${
                          log.eventType === 'ASSESSMENT_GENERATED'
                            ? 'bg-cyan-100 text-cyan-900 border border-cyan-200'
                            : log.eventType.includes('EMERGENCY')
                            ? 'bg-rose-100 text-rose-900 border border-rose-200'
                            : 'bg-emerald-100 text-emerald-900 border border-emerald-200'
                        }`}
                      >
                        {log.eventType}
                      </span>
                    </td>
                    <td className="p-3 font-bold text-slate-800">{log.patientId}</td>
                    <td className="p-3 text-slate-500 text-[11px]">{log.assessmentId}</td>
                    <td className="p-3 font-sans text-slate-700 leading-relaxed max-w-md">{log.details}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Print Footer Notice */}
        <div className="hidden print:block pt-6 text-[10px] text-gray-500 border-t border-gray-300">
          <div>Report generated from HIS AI-HealthAssist Audit Subsystem. Authenticated Administrator Session.</div>
          <div>Print Date: {new Date().toISOString()} • Confidential Protected Health Information (PHI).</div>
        </div>
      </div>
    </div>
  );
};

