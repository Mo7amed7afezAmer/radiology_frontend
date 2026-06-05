'use client';
import { AppShell } from '@/components/layout/AppShell';
import { use } from 'react';
import { useReport, useSignReport, useDeleteReport } from '@/lib/hooks';
import { useAuthStore } from '@/store/auth.store';
import { useRouter } from 'next/navigation';
import { Shield, ArrowLeft, Pencil, Trash2 } from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';

export default function ReportDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <AppShell>
      <ReportDetail id={+id} />
    </AppShell>
  );
}

function ReportDetail({ id }: { id: number }) {
  const { data: report, isLoading } = useReport(id);
  const signReport = useSignReport();
  const deleteReport = useDeleteReport();
  const { user } = useAuthStore();
  const router = useRouter();

  const handleSign = async () => {
    if (!confirm('Sign and finalize this report?')) return;
    try {
      await signReport.mutateAsync(id);
      toast.success('Report signed successfully');
    } catch {
      toast.error('Failed to sign report');
    }
  };

  const handleDelete = async () => {
    if (!confirm('Permanently delete this report?')) return;
    try {
      await deleteReport.mutateAsync(id);
      toast.success('Report deleted');
      router.push('/worklist');
    } catch {
      toast.error('Failed to delete report');
    }
  };

  if (isLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
        <div className="loading-ring" />
        <style jsx>{`.loading-ring { width: 32px; height: 32px; border: 2px solid var(--border); border-top-color: var(--accent); border-radius: 50%; animation: spin 0.8s linear infinite; } @keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }
  if (!report) return <div style={{ padding: 40, color: 'var(--text-muted)' }}>Report not found.</div>;

  const canSign = report.status === 'draft' || report.status === 'review';
  const signedDate = report.signedAt
    ? new Date(report.signedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
    : null;

  return (
    <div className="rd-page">
      {/* Toolbar */}
      <div className="rd-toolbar">
        <Link href="/worklist" className="btn-back">
          <ArrowLeft size={14} /> Back to Worklist
        </Link>
        <div className="rd-toolbar-right">
          <span className={`status-badge badge-${report.status}`}>{report.status}</span>
          {canSign && (
            <button className="btn-sign" onClick={handleSign}>
              ✦ Sign Report
            </button>
          )}
          <button className="btn-delete" onClick={handleDelete} title="Delete">
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {/* Patient header */}
      <div className="rd-patient-header">
        <div className="rd-patient-info">
          <div className="rd-patient-name">{report.patientName || 'Unknown Patient'}</div>
          <div className="rd-meta-row">
            {report.accessionNumber && <span className="rd-meta mono">ACC: {report.accessionNumber}</span>}
            {report.template && <span className="rd-meta">{report.template.title}</span>}
            {report.studyUid && <span className="rd-meta mono">UID: {report.studyUid}</span>}
          </div>
        </div>
      </div>

      {/* Report body */}
      <div className="rd-body">
        <div className="rd-sections">
          {report.items
            ?.sort((a, b) => a.sortOrder - b.sortOrder)
            .map((item) => {
              const isAbnormal = ['calcul', 'mass', 'nodule', 'effusion', 'obstruct', 'abnormal'].some(
                (w) => item.content?.toLowerCase().includes(w)
              );
              return (
                <div key={item.sectionCode} className="rd-section">
                  <div className={`rd-section-title ${isAbnormal ? 'abnormal' : ''}`}>
                    {item.sectionName.toUpperCase()}
                    {isAbnormal && <span className="abnormal-flag">ABNORMAL</span>}
                  </div>
                  <div className="rd-section-content">{item.content}</div>
                </div>
              );
            })}
        </div>

        {/* Signature block */}
        <div className="rd-signature">
          <div className="sig-left">
            <div className="sig-label">Electronically Signed By:</div>
            <div className="sig-name">{report.radiologist?.fullName || user?.fullName || 'Dr. —'}, MD</div>
            <div className="sig-title">Board-Certified Diagnostic Radiologist</div>
            <div className="sig-meta mono">Classification: HL7-RAD-49</div>
            {signedDate && <div className="sig-date">Signed: {signedDate}</div>}
          </div>
          <div className="sig-right">
            <div className="vault-badge">
              <Shield size={10} /> VAULT CERTIFIED SECURE
            </div>
            <div className="sig-meta">NileCloud Security Compliant</div>
            <div className="sig-meta mono">Cert-ID: RadScribeAI-P000-242</div>
          </div>
        </div>
      </div>

      <style jsx>{`
        .rd-page { min-height: 100vh; background: var(--bg-base); }
        .rd-toolbar {
          display: flex; align-items: center; justify-content: space-between;
          padding: 12px 32px;
          border-bottom: 1px solid var(--border);
          background: var(--bg-surface);
          position: sticky; top: 0; z-index: 10;
        }
        .btn-back {
          display: flex; align-items: center; gap: 6px;
          color: var(--text-secondary); text-decoration: none;
          font-size: 13px; transition: color 0.15s;
        }
        .btn-back:hover { color: var(--text-primary); }
        .rd-toolbar-right { display: flex; align-items: center; gap: 8px; }
        .status-badge {
          font-size: 10px; font-weight: 600;
          letter-spacing: 0.05em; padding: 3px 9px;
          border-radius: 5px; text-transform: uppercase;
        }
        .btn-sign {
          padding: 7px 16px;
          background: var(--accent); border: none;
          border-radius: 7px; color: white;
          font-size: 12px; font-weight: 600; font-family: inherit; cursor: pointer;
        }
        .btn-sign:hover { background: var(--accent-hover); }
        .btn-delete {
          width: 32px; height: 32px; border-radius: 7px;
          background: none; border: 1px solid var(--border);
          color: var(--text-muted); cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          transition: all 0.12s;
        }
        .btn-delete:hover { border-color: var(--danger); color: var(--danger); }
        .rd-patient-header {
          padding: 20px 32px;
          border-bottom: 1px solid var(--border);
          background: var(--bg-surface);
        }
        .rd-patient-name {
          font-size: 22px; font-weight: 700; color: var(--text-primary); margin-bottom: 6px;
        }
        .rd-meta-row { display: flex; gap: 14px; flex-wrap: wrap; }
        .rd-meta { font-size: 12px; color: var(--text-muted); }
        .rd-body { max-width: 800px; margin: 0 auto; padding: 40px 32px; }
        .rd-sections { display: flex; flex-direction: column; gap: 24px; margin-bottom: 48px; }
        .rd-section {}
        .rd-section-title {
          font-size: 11px; font-weight: 700; letter-spacing: 0.07em;
          color: var(--text-secondary);
          margin-bottom: 8px;
          display: flex; align-items: center; gap: 8px;
        }
        .rd-section-title.abnormal { color: var(--danger); }
        .abnormal-flag {
          font-size: 9px;
          background: rgba(239,68,68,0.15);
          border: 1px solid rgba(239,68,68,0.3);
          color: var(--danger);
          border-radius: 3px;
          padding: 1px 5px;
        }
        .rd-section-content {
          font-size: 14px; line-height: 1.7; color: var(--text-primary);
          white-space: pre-wrap;
        }
        .rd-signature {
          display: flex; justify-content: space-between;
          padding-top: 24px; border-top: 1px solid var(--border);
        }
        .sig-label { font-size: 11px; font-weight: 600; color: var(--text-primary); margin-bottom: 4px; }
        .sig-name { font-size: 13px; color: var(--text-secondary); margin-bottom: 2px; }
        .sig-title { font-size: 11px; color: var(--text-muted); margin-bottom: 4px; }
        .sig-date { font-size: 11px; color: var(--text-muted); margin-top: 4px; }
        .sig-meta { font-size: 10px; color: var(--text-muted); margin-bottom: 2px; }
        .sig-right { text-align: right; }
        .vault-badge {
          display: inline-flex; align-items: center; gap: 4px;
          font-size: 10px; font-weight: 700; letter-spacing: 0.05em;
          color: var(--success); margin-bottom: 4px;
        }
      `}</style>
    </div>
  );
}
