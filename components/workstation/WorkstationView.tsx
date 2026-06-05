'use client';
import { useState, useCallback } from 'react';
import { useTemplates, useCreateReport } from '@/lib/hooks';
import { useAuthStore } from '@/store/auth.store';
import { Template, ReportItem } from '@/types';
import { SectionEditor } from './SectionEditor';
import { ReportPreview } from './ReportPreview';
import { Mic, ChevronDown, CheckSquare, RotateCcw } from 'lucide-react';
import toast from 'react-hot-toast';

export function WorkstationView() {
  const { user } = useAuthStore();
  const { data: templates } = useTemplates();
  const createReport = useCreateReport();

  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [patientName, setPatientName] = useState('');
  const [accessionNumber, setAccessionNumber] = useState('');
  const [sections, setSections] = useState<ReportItem[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  const handleSelectTemplate = (tpl: Template) => {
    setSelectedTemplate(tpl);
    setSections(
      tpl.sections
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((s) => ({
          sectionCode: s.sectionCode,
          sectionName: s.sectionName,
          content: s.defaultContent || '',
          sortOrder: s.sortOrder,
        }))
    );
  };

  const handleSectionChange = useCallback((code: string, content: string) => {
    setSections((prev) =>
      prev.map((s) => (s.sectionCode === code ? { ...s, content } : s))
    );
  }, []);

  const handleSave = async (sign = false) => {
    if (!selectedTemplate) return toast.error('Please select a protocol first');
    setIsSaving(true);
    try {
      const report = await createReport.mutateAsync({
        templateId: selectedTemplate.id,
        patientName,
        accessionNumber,
        items: sections,
      });
      toast.success(sign ? 'Report signed & saved' : 'Report saved as draft');
      // Reset
      setPatientName('');
      setAccessionNumber('');
      setSections([]);
      setSelectedTemplate(null);
    } catch {
      toast.error('Failed to save report');
    } finally {
      setIsSaving(false);
    }
  };

  const reset = () => {
    setSelectedTemplate(null);
    setSections([]);
    setPatientName('');
    setAccessionNumber('');
  };

  return (
    <div className="ws-layout">
      {/* ── LEFT PANEL ── */}
      <div className="ws-left">
        {/* Header bar */}
        <div className="ws-topbar">
          <div className="topbar-left">
            <span className="topbar-label">STUDY PROTOCOL:</span>
            <div className="protocol-select-wrap">
              <select
                className="protocol-select"
                value={selectedTemplate?.id || ''}
                onChange={(e) => {
                  const tpl = templates?.find((t) => t.id === +e.target.value);
                  if (tpl) handleSelectTemplate(tpl);
                }}
              >
                <option value="">— Select Protocol —</option>
                {templates?.map((t) => (
                  <option key={t.id} value={t.id}>{t.title}</option>
                ))}
              </select>
              <ChevronDown size={14} className="select-icon" />
            </div>
          </div>
          <div className="topbar-right">
            <button className="btn-ghost" onClick={reset} title="Reset">
              <RotateCcw size={14} /> Reset
            </button>
            <div className="user-chip">
              <div className="user-dot" />
              <span>{user?.fullName || 'Radiologist'}</span>
            </div>
          </div>
        </div>

        {/* Patient info strip */}
        <div className="patient-strip">
          <div className="patient-field">
            <label>Patient Name</label>
            <input
              placeholder="Enter patient name..."
              value={patientName}
              onChange={(e) => setPatientName(e.target.value)}
            />
          </div>
          <div className="patient-field">
            <label>Accession #</label>
            <input
              placeholder="ACC-XXXXX"
              value={accessionNumber}
              onChange={(e) => setAccessionNumber(e.target.value)}
            />
          </div>
        </div>

        {/* Dictation */}
        <div className="dictation-card">
          <button className="mic-btn">
            <Mic size={18} />
          </button>
          <span className="dictation-label">Transcription</span>
          <span className="dictation-hint">Activate mic to begin</span>
        </div>

        {/* Sections */}
        <div className="sections-container">
          {!selectedTemplate ? (
            <div className="empty-state">
              <CheckSquare size={32} strokeWidth={1} style={{ color: 'var(--text-muted)' }} />
              <p>Select a study protocol above to begin reporting</p>
            </div>
          ) : (
            <>
              <div className="sections-header">
                <span className="sections-title">STRUCTURED ANATOMICAL SECTIONS</span>
                <span className="sections-badge">CHECKLIST</span>
              </div>
              <div className="sections-list">
                {sections.map((section, idx) => (
                  <SectionEditor
                    key={section.sectionCode}
                    section={section}
                    index={idx + 1}
                    onChange={(content) => handleSectionChange(section.sectionCode, content)}
                  />
                ))}
              </div>
            </>
          )}
        </div>

        {/* Actions */}
        {selectedTemplate && (
          <div className="ws-actions">
            <button
              className="btn-secondary"
              onClick={() => handleSave(false)}
              disabled={isSaving}
            >
              Save Draft
            </button>
            <button
              className="btn-sign"
              onClick={() => handleSave(true)}
              disabled={isSaving}
            >
              {isSaving ? <span className="spinner" /> : '✦ Sign & Finalize'}
            </button>
          </div>
        )}
      </div>

      {/* ── RIGHT PANEL: Preview ── */}
      <div className="ws-right">
        <ReportPreview
          patientName={patientName}
          accessionNumber={accessionNumber}
          sections={sections}
          radiologistName={user?.fullName}
        />
      </div>

      <style jsx>{`
        .ws-layout {
          display: flex;
          height: 100vh;
          overflow: hidden;
        }
        .ws-left {
          width: 520px;
          min-width: 480px;
          height: 100vh;
          overflow-y: auto;
          border-right: 1px solid var(--border);
          background: var(--bg-base);
          display: flex;
          flex-direction: column;
        }
        .ws-right {
          flex: 1;
          height: 100vh;
          overflow-y: auto;
          background: var(--bg-surface);
        }
        .ws-topbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px 16px;
          border-bottom: 1px solid var(--border);
          background: var(--bg-surface);
          gap: 12px;
        }
        .topbar-left { display: flex; align-items: center; gap: 10px; }
        .topbar-label { font-size: 11px; color: var(--text-muted); font-weight: 500; letter-spacing: 0.06em; white-space: nowrap; }
        .protocol-select-wrap { position: relative; }
        .protocol-select {
          appearance: none;
          background: var(--bg-elevated);
          border: 1px solid var(--border);
          border-radius: 8px;
          padding: 6px 28px 6px 10px;
          color: var(--text-primary);
          font-size: 13px;
          font-family: inherit;
          cursor: pointer;
          min-width: 180px;
        }
        .protocol-select:focus { outline: none; border-color: var(--accent); }
        .select-icon {
          position: absolute;
          right: 8px; top: 50%;
          transform: translateY(-50%);
          color: var(--text-muted);
          pointer-events: none;
        }
        .topbar-right { display: flex; align-items: center; gap: 8px; }
        .btn-ghost {
          display: flex; align-items: center; gap: 4px;
          background: none; border: 1px solid var(--border);
          border-radius: 6px; padding: 5px 10px;
          color: var(--text-secondary); font-size: 12px;
          font-family: inherit; cursor: pointer;
          transition: all 0.15s;
        }
        .btn-ghost:hover { border-color: var(--text-muted); color: var(--text-primary); }
        .user-chip {
          display: flex; align-items: center; gap: 6px;
          padding: 5px 10px;
          background: var(--bg-elevated);
          border: 1px solid var(--border);
          border-radius: 20px;
          font-size: 12px;
          color: var(--text-secondary);
        }
        .user-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--success); }
        .patient-strip {
          display: flex; gap: 12px;
          padding: 12px 16px;
          border-bottom: 1px solid var(--border);
          background: var(--bg-surface);
        }
        .patient-field { display: flex; flex-direction: column; gap: 4px; flex: 1; }
        .patient-field label { font-size: 10px; color: var(--text-muted); letter-spacing: 0.05em; font-weight: 500; }
        .patient-field input {
          background: var(--bg-base);
          border: 1px solid var(--border);
          border-radius: 6px;
          padding: 7px 10px;
          color: var(--text-primary);
          font-size: 13px;
          font-family: inherit;
        }
        .patient-field input:focus { outline: none; border-color: var(--accent); }
        .patient-field input::placeholder { color: var(--text-muted); }
        .dictation-card {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 14px 16px;
          margin: 12px;
          background: var(--bg-elevated);
          border: 1px solid var(--border);
          border-radius: 10px;
        }
        .mic-btn {
          width: 38px; height: 38px;
          border-radius: 50%;
          background: var(--accent);
          border: none;
          color: white;
          display: flex; align-items: center; justify-content: center;
          cursor: pointer;
          transition: transform 0.15s, box-shadow 0.15s;
          flex-shrink: 0;
        }
        .mic-btn:hover {
          transform: scale(1.05);
          box-shadow: 0 0 0 4px rgba(79,142,247,0.2);
        }
        .dictation-label { font-size: 14px; font-weight: 500; color: var(--text-primary); }
        .dictation-hint { font-size: 12px; color: var(--text-muted); margin-left: auto; }
        .sections-container {
          flex: 1;
          overflow-y: auto;
          padding: 0 12px 12px;
        }
        .empty-state {
          display: flex; flex-direction: column; align-items: center; justify-content: center;
          gap: 12px; height: 300px;
          color: var(--text-muted);
          font-size: 13px; text-align: center;
        }
        .sections-header {
          display: flex; align-items: center; justify-content: space-between;
          padding: 14px 4px 10px;
        }
        .sections-title {
          font-size: 10px; font-weight: 600;
          letter-spacing: 0.08em;
          color: var(--text-muted);
        }
        .sections-badge {
          font-size: 10px; font-weight: 600;
          letter-spacing: 0.06em;
          color: var(--text-muted);
          background: var(--bg-elevated);
          border: 1px solid var(--border);
          border-radius: 4px;
          padding: 2px 6px;
        }
        .sections-list { display: flex; flex-direction: column; gap: 8px; }
        .ws-actions {
          display: flex; gap: 8px;
          padding: 12px 16px;
          border-top: 1px solid var(--border);
          background: var(--bg-surface);
        }
        .btn-secondary {
          flex: 1;
          background: var(--bg-elevated);
          border: 1px solid var(--border);
          border-radius: 8px;
          padding: 10px;
          color: var(--text-secondary);
          font-size: 13px;
          font-family: inherit;
          cursor: pointer;
          transition: all 0.15s;
        }
        .btn-secondary:hover { border-color: var(--text-muted); color: var(--text-primary); }
        .btn-sign {
          flex: 2;
          background: var(--accent);
          border: none;
          border-radius: 8px;
          padding: 10px;
          color: white;
          font-size: 13px;
          font-weight: 600;
          font-family: inherit;
          cursor: pointer;
          transition: background 0.15s;
          display: flex; align-items: center; justify-content: center; gap: 6px;
        }
        .btn-sign:hover:not(:disabled) { background: var(--accent-hover); }
        .btn-sign:disabled { opacity: 0.6; cursor: not-allowed; }
        .spinner {
          width: 14px; height: 14px;
          border: 2px solid rgba(255,255,255,0.3);
          border-top-color: white;
          border-radius: 50%;
          animation: spin 0.6s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
