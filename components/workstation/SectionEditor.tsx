'use client';
import { useState } from 'react';
import { ReportItem } from '@/types';
import { Plus, CheckCircle } from 'lucide-react';

interface Props {
  section: ReportItem;
  index: number;
  onChange: (content: string) => void;
}

export function SectionEditor({ section, index, onChange }: Props) {
  const [expanded, setExpanded] = useState(true);
  const isNormal = section.content?.toLowerCase().includes('normal') ||
    section.content?.toLowerCase().includes('unremarkable') ||
    section.content?.toLowerCase().includes('clear');
  const hasContent = section.content?.trim().length > 0;

  return (
    <div className={`section-card ${!hasContent ? 'empty' : ''}`}>
      <div className="section-header" onClick={() => setExpanded(!expanded)}>
        <div className="section-num">{index}</div>
        <span className="section-name">{section.sectionName.toUpperCase()}</span>
        <div className="section-actions">
          <button
            className="btn-add"
            onClick={(e) => { e.stopPropagation(); }}
            title="Add note"
          >
            <Plus size={12} /> Add
          </button>
          {isNormal && hasContent && (
            <span className="badge-normal">
              <CheckCircle size={10} /> NORMAL
            </span>
          )}
        </div>
      </div>

      {expanded && (
        <textarea
          className="section-textarea"
          value={section.content || ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder={`Enter ${section.sectionName.toLowerCase()} findings...`}
          rows={3}
        />
      )}

      <style jsx>{`
        .section-card {
          background: var(--bg-surface);
          border: 1px solid var(--border);
          border-radius: 10px;
          overflow: hidden;
          transition: border-color 0.15s;
        }
        .section-card:hover { border-color: var(--bg-hover); }
        .section-card.empty { border-style: dashed; opacity: 0.7; }
        .section-header {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px 12px;
          cursor: pointer;
          user-select: none;
        }
        .section-num {
          width: 22px; height: 22px;
          border-radius: 6px;
          background: var(--bg-elevated);
          border: 1px solid var(--border);
          display: flex; align-items: center; justify-content: center;
          font-size: 11px;
          font-weight: 600;
          color: var(--text-muted);
          font-family: 'JetBrains Mono', monospace;
          flex-shrink: 0;
        }
        .section-name {
          font-size: 11px;
          font-weight: 600;
          letter-spacing: 0.06em;
          color: var(--text-secondary);
          flex: 1;
        }
        .section-actions { display: flex; align-items: center; gap: 6px; }
        .btn-add {
          display: flex; align-items: center; gap: 3px;
          background: none;
          border: 1px solid var(--border);
          border-radius: 5px;
          padding: 3px 7px;
          font-size: 11px;
          color: var(--text-muted);
          font-family: inherit;
          cursor: pointer;
          transition: all 0.12s;
        }
        .btn-add:hover { border-color: var(--accent); color: var(--accent); }
        .badge-normal {
          display: flex; align-items: center; gap: 3px;
          font-size: 10px;
          color: var(--success);
          background: rgba(34,197,94,0.1);
          border: 1px solid rgba(34,197,94,0.25);
          border-radius: 4px;
          padding: 2px 6px;
          font-weight: 600;
          letter-spacing: 0.04em;
        }
        .section-textarea {
          width: 100%;
          padding: 10px 12px;
          background: transparent;
          border: none;
          border-top: 1px solid var(--border-subtle);
          color: var(--text-primary);
          font-size: 13px;
          font-family: inherit;
          line-height: 1.6;
          resize: none;
          transition: background 0.15s;
        }
        .section-textarea:focus {
          outline: none;
          background: rgba(79,142,247,0.02);
        }
        .section-textarea::placeholder { color: var(--text-muted); font-style: italic; }
      `}</style>
    </div>
  );
}
