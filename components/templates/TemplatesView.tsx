'use client';
import { useState } from 'react';
import { useTemplates, useDeleteTemplate } from '@/lib/hooks';
import { Template } from '@/types';
import { BookOpen, Search, Upload, Plus, Edit2, Copy, Trash2, Check } from 'lucide-react';
import { TemplateFormModal } from './TemplateFormModal';
import toast from 'react-hot-toast';

export function TemplatesView() {
  const { data: templates, isLoading } = useTemplates();
  const deleteTemplate = useDeleteTemplate();
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editTemplate, setEditTemplate] = useState<Template | null>(null);
  const [activeId, setActiveId] = useState<number | null>(null);

  const filtered = templates?.filter((t) =>
    t.title.toLowerCase().includes(search.toLowerCase()) ||
    t.modality?.toLowerCase().includes(search.toLowerCase())
  ) || [];

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this template?')) return;
    try {
      await deleteTemplate.mutateAsync(id);
      toast.success('Template deleted');
    } catch {
      toast.error('Failed to delete template');
    }
  };

  return (
    <div className="tp-page">
      <div className="tp-header">
        <div className="tp-header-left">
          <BookOpen size={20} strokeWidth={1.5} />
          <div>
            <h1 className="tp-title">STUDY REPORT TEMPLATES</h1>
            <p className="tp-sub">Establish baseline anatomical sections, default normal findings, and structural headers for zero-click dictation mappings.</p>
          </div>
        </div>
        <div className="tp-header-actions">
          <button className="btn-upload">
            <Upload size={14} /> Upload Template (.docx)
          </button>
          <button className="btn-create" onClick={() => { setEditTemplate(null); setShowForm(true); }}>
            <Plus size={14} /> Create Template Manually
          </button>
        </div>
      </div>

      <div className="tp-search-wrap">
        <Search size={14} className="search-icon" />
        <input
          className="tp-search"
          placeholder="Search report templates by layout name, type, or specific organ section..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {isLoading ? (
        <div className="tp-loading"><div className="loading-ring" /></div>
      ) : (
        <div className="tp-grid">
          {filtered.map((template) => (
            <TemplateCard
              key={template.id}
              template={template}
              isActive={activeId === template.id}
              onActivate={() => setActiveId(template.id)}
              onEdit={() => { setEditTemplate(template); setShowForm(true); }}
              onDelete={() => handleDelete(template.id)}
            />
          ))}
        </div>
      )}

      {showForm && (
        <TemplateFormModal
          template={editTemplate}
          onClose={() => setShowForm(false)}
        />
      )}

      <style jsx>{`
        .tp-page { padding: 28px 32px; min-height: 100vh; }
        .tp-header {
          display: flex; align-items: flex-start; justify-content: space-between;
          margin-bottom: 24px; gap: 20px; flex-wrap: wrap;
        }
        .tp-header-left { display: flex; gap: 14px; color: var(--text-secondary); }
        .tp-title {
          font-size: 16px; font-weight: 700;
          letter-spacing: 0.04em; color: var(--text-primary); margin-bottom: 4px;
        }
        .tp-sub { font-size: 12px; color: var(--text-muted); max-width: 500px; }
        .tp-header-actions { display: flex; gap: 8px; flex-shrink: 0; }
        .btn-upload {
          display: flex; align-items: center; gap: 6px;
          padding: 9px 16px;
          background: var(--bg-elevated);
          border: 1px solid var(--border);
          border-radius: 8px;
          color: var(--text-secondary);
          font-size: 13px; font-family: inherit; cursor: pointer;
          transition: all 0.15s;
        }
        .btn-upload:hover { border-color: var(--text-muted); color: var(--text-primary); }
        .btn-create {
          display: flex; align-items: center; gap: 6px;
          padding: 9px 16px;
          background: var(--accent);
          border: none;
          border-radius: 8px;
          color: white;
          font-size: 13px; font-weight: 600; font-family: inherit; cursor: pointer;
          transition: background 0.15s;
        }
        .btn-create:hover { background: var(--accent-hover); }
        .tp-search-wrap {
          position: relative;
          margin-bottom: 24px;
        }
        .search-icon {
          position: absolute; left: 14px; top: 50%;
          transform: translateY(-50%);
          color: var(--text-muted);
          pointer-events: none;
        }
        .tp-search {
          width: 100%;
          background: var(--bg-surface);
          border: 1px solid var(--border);
          border-radius: 10px;
          padding: 12px 16px 12px 38px;
          color: var(--text-primary);
          font-size: 13px; font-family: inherit;
        }
        .tp-search:focus { outline: none; border-color: var(--accent); }
        .tp-search::placeholder { color: var(--text-muted); }
        .tp-loading {
          display: flex; justify-content: center; padding: 80px;
        }
        .loading-ring {
          width: 32px; height: 32px;
          border: 2px solid var(--border);
          border-top-color: var(--accent);
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }
        .tp-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(340px, 1fr));
          gap: 16px;
        }
      `}</style>
    </div>
  );
}

function TemplateCard({
  template, isActive, onActivate, onEdit, onDelete
}: {
  template: Template;
  isActive: boolean;
  onActivate: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const sectionTags = template.sections
    ?.sort((a, b) => a.sortOrder - b.sortOrder)
    .map((s) => s.sectionName) || [];

  const updatedDate = new Date(template.updatedAt).toLocaleDateString('en-CA');

  return (
    <div className={`tc-card ${isActive ? 'active' : ''}`}>
      <div className="tc-top">
        <span className={`tc-type-badge ${template.isGlobal ? 'global' : 'personal'}`}>
          {template.isGlobal ? 'SYSTEM TEMPLATE' : 'MY TEMPLATE'}
        </span>
        {isActive && (
          <span className="tc-active-badge"><Check size={10} /> Active Protocol</span>
        )}
      </div>

      <h3 className="tc-title">{template.title}</h3>
      <div className="tc-meta">
        <span>Mod: {updatedDate}</span>
        <span>•</span>
        <span>{sectionTags.length} Sections</span>
        {template.modality && <><span>•</span><span>{template.modality}</span></>}
      </div>

      <div className="tc-tags">
        {sectionTags.slice(0, 6).map((name) => (
          <span key={name} className="tc-tag">{name}</span>
        ))}
        {sectionTags.length > 6 && (
          <span className="tc-tag muted">+{sectionTags.length - 6}</span>
        )}
      </div>

      <div className="tc-footer">
        <button className="btn-use" onClick={onActivate}>
          Use active template →
        </button>
        <div className="tc-actions">
          <button className="tc-action-btn" onClick={onEdit} title="Edit">
            <Edit2 size={13} />
          </button>
          {!template.isGlobal && (
            <button className="tc-action-btn danger" onClick={onDelete} title="Delete">
              <Trash2 size={13} />
            </button>
          )}
        </div>
      </div>

      <style jsx>{`
        .tc-card {
          background: var(--bg-surface);
          border: 1px solid var(--border);
          border-radius: 12px;
          padding: 20px;
          transition: border-color 0.15s;
        }
        .tc-card:hover { border-color: var(--bg-hover); }
        .tc-card.active { border-color: var(--accent); }
        .tc-top {
          display: flex; align-items: center; gap: 8px;
          margin-bottom: 12px;
        }
        .tc-type-badge {
          font-size: 9px; font-weight: 700; letter-spacing: 0.07em;
          padding: 2px 7px; border-radius: 4px;
        }
        .tc-type-badge.global {
          color: var(--accent);
          background: var(--accent-dim);
          border: 1px solid rgba(79,142,247,0.25);
        }
        .tc-type-badge.personal {
          color: var(--signed);
          background: rgba(167,139,250,0.1);
          border: 1px solid rgba(167,139,250,0.25);
        }
        .tc-active-badge {
          display: flex; align-items: center; gap: 3px;
          font-size: 10px; font-weight: 600;
          color: var(--success);
          background: rgba(34,197,94,0.1);
          border: 1px solid rgba(34,197,94,0.25);
          border-radius: 4px;
          padding: 2px 7px;
        }
        .tc-title {
          font-size: 16px; font-weight: 600;
          color: var(--text-primary);
          margin-bottom: 6px;
        }
        .tc-meta {
          display: flex; gap: 6px;
          font-size: 11px; color: var(--text-muted);
          font-family: 'JetBrains Mono', monospace;
          margin-bottom: 14px;
        }
        .tc-tags {
          display: flex; flex-wrap: wrap; gap: 5px;
          margin-bottom: 16px;
        }
        .tc-tag {
          font-size: 10px;
          padding: 3px 8px;
          background: var(--bg-elevated);
          border: 1px solid var(--border);
          border-radius: 4px;
          color: var(--text-secondary);
        }
        .tc-tag.muted { color: var(--text-muted); }
        .tc-footer {
          display: flex; align-items: center; justify-content: space-between;
          padding-top: 14px;
          border-top: 1px solid var(--border-subtle);
        }
        .btn-use {
          background: none; border: none;
          color: var(--accent);
          font-size: 12px; font-family: inherit;
          cursor: pointer;
          transition: color 0.15s;
          padding: 0;
        }
        .btn-use:hover { color: var(--accent-hover); }
        .tc-actions { display: flex; gap: 4px; }
        .tc-action-btn {
          width: 28px; height: 28px;
          border-radius: 6px;
          background: none;
          border: 1px solid var(--border);
          color: var(--text-muted);
          display: flex; align-items: center; justify-content: center;
          cursor: pointer;
          transition: all 0.12s;
        }
        .tc-action-btn:hover { border-color: var(--text-secondary); color: var(--text-primary); }
        .tc-action-btn.danger:hover { border-color: var(--danger); color: var(--danger); }
      `}</style>
    </div>
  );
}
