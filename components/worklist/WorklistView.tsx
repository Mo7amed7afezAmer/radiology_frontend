'use client';
import { useState } from 'react';
import { useSignedReports, useReports } from '@/lib/hooks';
import { Report } from '@/types';
import { Archive, Clock, AlertCircle } from 'lucide-react';
import Link from 'next/link';

export function WorklistView() {
  const { data: allReports, isLoading } = useReports();
  const [filter, setFilter] = useState<'all' | 'draft' | 'signed' | 'final'>('all');

  const filtered = allReports?.filter((r) => filter === 'all' || r.status === filter) || [];

  return (
    <div className="wl-page">
      <div className="wl-header">
        <div className="wl-header-left">
          <Archive size={20} strokeWidth={1.5} />
          <div>
            <h1 className="wl-title">PACS ARCHIVED DIAGNOSTIC WORKLIST</h1>
            <p className="wl-sub">Review finalized signatures, pending transmittals, and clinical documents</p>
          </div>
        </div>
        <div className="wl-filters">
          {(['all', 'draft', 'review', 'signed', 'final'] as const).map((f) => (
            <button
              key={f}
              className={`filter-btn ${filter === f ? 'active' : ''}`}
              onClick={() => setFilter(f as any)}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
              {f !== 'all' && (
                <span className="filter-count">
                  {allReports?.filter((r) => r.status === f).length || 0}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="wl-loading">
          <div className="loading-ring" />
          <span>Loading worklist...</span>
        </div>
      ) : filtered.length === 0 ? (
        <div className="wl-empty">
          <AlertCircle size={32} strokeWidth={1} />
          <p>No reports found</p>
          <Link href="/workstation" className="btn-new">+ New Report</Link>
        </div>
      ) : (
        <div className="wl-grid">
          {filtered.map((report) => (
            <ReportCard key={report.id} report={report} />
          ))}
        </div>
      )}

      <style jsx>{`
        .wl-page {
          padding: 28px 32px;
          min-height: 100vh;
        }
        .wl-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          margin-bottom: 28px;
          gap: 20px;
          flex-wrap: wrap;
        }
        .wl-header-left {
          display: flex;
          align-items: flex-start;
          gap: 14px;
          color: var(--text-secondary);
        }
        .wl-title {
          font-size: 16px;
          font-weight: 700;
          letter-spacing: 0.04em;
          color: var(--text-primary);
          margin-bottom: 4px;
        }
        .wl-sub { font-size: 12px; color: var(--text-muted); }
        .wl-filters {
          display: flex;
          gap: 4px;
          flex-wrap: wrap;
        }
        .filter-btn {
          display: flex; align-items: center; gap: 6px;
          padding: 6px 12px;
          background: var(--bg-elevated);
          border: 1px solid var(--border);
          border-radius: 8px;
          color: var(--text-secondary);
          font-size: 12px;
          font-family: inherit;
          cursor: pointer;
          transition: all 0.15s;
        }
        .filter-btn:hover { border-color: var(--text-muted); color: var(--text-primary); }
        .filter-btn.active {
          background: var(--accent-dim);
          border-color: var(--accent);
          color: var(--accent);
        }
        .filter-count {
          background: var(--bg-base);
          border-radius: 10px;
          padding: 1px 5px;
          font-size: 10px;
          font-family: 'JetBrains Mono', monospace;
        }
        .wl-loading, .wl-empty {
          display: flex; flex-direction: column; align-items: center; justify-content: center;
          gap: 12px; height: 400px;
          color: var(--text-muted); font-size: 13px;
        }
        .loading-ring {
          width: 32px; height: 32px;
          border: 2px solid var(--border);
          border-top-color: var(--accent);
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }
        .btn-new {
          padding: 8px 16px;
          background: var(--accent);
          color: white;
          border-radius: 8px;
          text-decoration: none;
          font-size: 13px;
          font-weight: 500;
        }
        .wl-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(360px, 1fr));
          gap: 16px;
        }
      `}</style>
    </div>
  );
}

function ReportCard({ report }: { report: Report }) {
  const signedDate = report.signedAt
    ? new Date(report.signedAt).toLocaleDateString('en-CA')
    : new Date(report.createdAt).toLocaleDateString('en-CA');

  const hasAbnormal = report.items?.some((item) => {
    const c = item.content?.toLowerCase() || '';
    return c.includes('calcul') || c.includes('mass') || c.includes('nodule') ||
      c.includes('effusion') || c.includes('obstruct') || c.includes('abnormal');
  });

  return (
    <Link href={`/reports/${report.id}`} className="report-card" style={{ textDecoration: 'none' }}>
      <div className="rc-top">
        <span className="rc-id mono">ID: REP-{String(report.id).padStart(8, '0').toUpperCase()}</span>
        <span className="rc-date">
          <Clock size={11} />
          {report.status === 'signed' ? 'Signed' : 'Created'}: {signedDate}
        </span>
      </div>

      <div className="rc-patient">{report.patientName || '—'}</div>
      {report.accessionNumber && (
        <div className="rc-meta mono">ACC: {report.accessionNumber}</div>
      )}

      <div className="rc-divider" />

      <div className="rc-sections">
        {report.items?.slice(0, 5).map((item) => {
          const abnormal = ['calcul', 'mass', 'nodule', 'effusion', 'obstruct'].some(
            (w) => item.content?.toLowerCase().includes(w)
          );
          return (
            <div key={item.sectionCode} className={`rc-section ${abnormal ? 'abnormal' : ''}`}>
              <span className="rc-section-name">[{item.sectionName}]:</span>
              <span className="rc-section-content">
                {item.content?.slice(0, 80)}{item.content?.length > 80 ? '...' : ''}
              </span>
            </div>
          );
        })}
      </div>

      <div className="rc-footer">
        <span className={`status-badge badge-${report.status}`}>{report.status}</span>
        {report.template && (
          <span className="rc-protocol">{report.template.title}</span>
        )}
      </div>

      <style jsx>{`
        .report-card {
          background: var(--bg-surface);
          border: 1px solid var(--border);
          border-radius: 12px;
          padding: 18px;
          display: block;
          transition: border-color 0.15s, transform 0.1s;
          cursor: pointer;
        }
        .report-card:hover {
          border-color: var(--accent);
          transform: translateY(-1px);
        }
        .rc-top {
          display: flex; align-items: center; justify-content: space-between;
          margin-bottom: 10px;
        }
        .rc-id {
          font-size: 10px;
          color: var(--accent);
          background: var(--accent-dim);
          border: 1px solid rgba(79,142,247,0.2);
          border-radius: 4px;
          padding: 2px 7px;
        }
        .rc-date {
          display: flex; align-items: center; gap: 4px;
          font-size: 11px;
          color: var(--text-muted);
        }
        .rc-patient {
          font-size: 18px;
          font-weight: 600;
          color: var(--text-primary);
          margin-bottom: 3px;
        }
        .rc-meta {
          font-size: 11px;
          color: var(--text-muted);
          margin-bottom: 12px;
        }
        .rc-divider {
          height: 1px;
          background: var(--border);
          margin-bottom: 12px;
        }
        .rc-sections { display: flex; flex-direction: column; gap: 6px; margin-bottom: 14px; }
        .rc-section { font-size: 12px; line-height: 1.5; }
        .rc-section.abnormal .rc-section-name { color: var(--danger); }
        .rc-section-name {
          color: var(--text-secondary);
          font-weight: 500;
          margin-right: 4px;
        }
        .rc-section-content {
          color: var(--text-muted);
          font-style: italic;
        }
        .rc-footer {
          display: flex; align-items: center; gap: 8px;
        }
        .status-badge {
          font-size: 10px;
          font-weight: 600;
          letter-spacing: 0.05em;
          padding: 2px 8px;
          border-radius: 4px;
          text-transform: uppercase;
        }
        .rc-protocol {
          font-size: 10px;
          color: var(--text-muted);
          background: var(--bg-elevated);
          border: 1px solid var(--border);
          border-radius: 4px;
          padding: 2px 7px;
        }
      `}</style>
    </Link>
  );
}
