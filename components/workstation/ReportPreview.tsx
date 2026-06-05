'use client';
import { ReportItem } from '@/types';
import { Shield } from 'lucide-react';

interface Props {
  patientName: string;
  accessionNumber: string;
  sections: ReportItem[];
  radiologistName?: string;
}

export function ReportPreview({ patientName, accessionNumber, sections, radiologistName }: Props) {
  const now = new Date();
  const dateStr = now.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  const timeStr = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

  const filledSections = sections.filter((s) => s.content?.trim());

  return (
    <div className="preview-wrap">
      <div className="preview-header">
        <span className="preview-label">REPORT PREVIEW</span>
        <span className="preview-hint">Auto-updates as you type</span>
      </div>

      <div className="preview-doc">
        {/* Patient Header */}
        {(patientName || accessionNumber) && (
          <div className="doc-patient-header">
            {patientName && <div className="doc-patient-name">{patientName}</div>}
            <div className="doc-meta-row">
              {accessionNumber && <span className="doc-meta-item">ACC: {accessionNumber}</span>}
              <span className="doc-meta-item">{dateStr}</span>
            </div>
          </div>
        )}

        {/* Content */}
        {filledSections.length === 0 ? (
          <div className="preview-empty">
            <p>Report content will appear here as you fill in sections.</p>
          </div>
        ) : (
          <div className="doc-body">
            {filledSections.map((section) => (
              <div key={section.sectionCode} className="doc-section">
                <div className="doc-section-label">{section.sectionName.toUpperCase()}</div>
                <div className="doc-section-content">{section.content}</div>
              </div>
            ))}
          </div>
        )}

        {/* Footer */}
        <div className="doc-footer">
          <div className="doc-footer-left">
            <div className="doc-signed-label">Electronically Signed By:</div>
            <div className="doc-signed-name">{radiologistName || 'Dr. —'}</div>
            <div className="doc-signed-title">Board-Certified Diagnostic Radiologist</div>
            <div className="doc-cert-id mono">Classification: HL7-RAD-49</div>
          </div>
          <div className="doc-footer-right">
            <div className="vault-badge">
              <Shield size={10} />
              <span>VAULT CERTIFIED SECURE</span>
            </div>
            <div className="doc-cert-small">NileCloud Security Compliant</div>
            <div className="doc-cert-small mono">Cert-ID: RadScribeAI-P000-242</div>
          </div>
        </div>
      </div>

      <div className="preview-statusbar">
        <span>Page 1 of 1</span>
        <span>Words: {filledSections.reduce((acc, s) => acc + (s.content?.split(/\s+/).length || 0), 0)}</span>
        <span>All changes saved to NileCloud</span>
        <span>100%</span>
      </div>

      <style jsx>{`
        .preview-wrap {
          height: 100%;
          display: flex;
          flex-direction: column;
          background: var(--bg-surface);
        }
        .preview-header {
          display: flex; align-items: center; justify-content: space-between;
          padding: 10px 20px;
          border-bottom: 1px solid var(--border);
          background: var(--bg-elevated);
        }
        .preview-label {
          font-size: 10px; font-weight: 600;
          letter-spacing: 0.08em;
          color: var(--text-muted);
        }
        .preview-hint { font-size: 11px; color: var(--text-muted); }
        .preview-doc {
          flex: 1;
          padding: 40px 48px;
          overflow-y: auto;
          display: flex;
          flex-direction: column;
          gap: 0;
        }
        .doc-patient-header {
          border-bottom: 1px solid var(--border);
          padding-bottom: 16px;
          margin-bottom: 24px;
        }
        .doc-patient-name {
          font-size: 18px;
          font-weight: 600;
          color: var(--text-primary);
          margin-bottom: 6px;
        }
        .doc-meta-row { display: flex; gap: 16px; }
        .doc-meta-item {
          font-size: 12px;
          color: var(--text-secondary);
          font-family: 'JetBrains Mono', monospace;
        }
        .preview-empty {
          flex: 1;
          display: flex; align-items: center; justify-content: center;
          color: var(--text-muted);
          font-size: 13px;
          font-style: italic;
          text-align: center;
          padding: 60px;
        }
        .doc-body { flex: 1; display: flex; flex-direction: column; gap: 20px; }
        .doc-section {}
        .doc-section-label {
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.07em;
          color: var(--text-secondary);
          margin-bottom: 6px;
        }
        .doc-section-content {
          font-size: 13px;
          line-height: 1.7;
          color: var(--text-primary);
          white-space: pre-wrap;
        }
        .doc-footer {
          margin-top: 48px;
          padding-top: 20px;
          border-top: 1px solid var(--border);
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
        }
        .doc-footer-left {}
        .doc-signed-label {
          font-size: 11px; font-weight: 600;
          color: var(--text-primary);
          margin-bottom: 4px;
        }
        .doc-signed-name {
          font-size: 13px;
          color: var(--text-secondary);
          margin-bottom: 2px;
        }
        .doc-signed-title {
          font-size: 11px;
          color: var(--text-muted);
          margin-bottom: 4px;
        }
        .doc-cert-id {
          font-size: 10px;
          color: var(--text-muted);
        }
        .doc-footer-right { text-align: right; }
        .vault-badge {
          display: inline-flex; align-items: center; gap: 4px;
          color: var(--success);
          font-size: 10px;
          font-weight: 700;
          letter-spacing: 0.05em;
          margin-bottom: 4px;
        }
        .doc-cert-small {
          font-size: 10px;
          color: var(--text-muted);
          margin-bottom: 2px;
        }
        .preview-statusbar {
          display: flex;
          align-items: center;
          gap: 20px;
          padding: 8px 20px;
          border-top: 1px solid var(--border);
          background: var(--bg-elevated);
          font-size: 11px;
          color: var(--text-muted);
          font-family: 'JetBrains Mono', monospace;
        }
        .preview-statusbar span:last-child { margin-left: auto; }
      `}</style>
    </div>
  );
}
