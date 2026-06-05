'use client';
import { useState, useEffect } from 'react';
import { Template, TemplateSection } from '@/types';
import { useCreateTemplate, useUpdateTemplate } from '@/lib/hooks';
import { X, Plus, Trash2, GripVertical } from 'lucide-react';
import toast from 'react-hot-toast';

interface Props {
  template: Template | null;
  onClose: () => void;
}

interface SectionDraft {
  sectionCode: string;
  sectionName: string;
  defaultContent: string;
  sortOrder: number;
  isRequired: boolean;
}

export function TemplateFormModal({ template, onClose }: Props) {
  const isEdit = !!template;
  const createTemplate = useCreateTemplate();
  const updateTemplate = useUpdateTemplate(template?.id || 0);

  const [title, setTitle] = useState(template?.title || '');
  const [modality, setModality] = useState(template?.modality || '');
  const [bodyPart, setBodyPart] = useState(template?.bodyPart || '');
  const [description, setDescription] = useState(template?.description || '');
  const [isGlobal, setIsGlobal] = useState(template?.isGlobal || false);
  const [sections, setSections] = useState<SectionDraft[]>(
    template?.sections?.map((s) => ({
      sectionCode: s.sectionCode,
      sectionName: s.sectionName,
      defaultContent: s.defaultContent || '',
      sortOrder: s.sortOrder,
      isRequired: s.isRequired,
    })) || [{ sectionCode: 'TECHNIQUE', sectionName: 'Technique', defaultContent: '', sortOrder: 1, isRequired: true }]
  );
  const [isSaving, setIsSaving] = useState(false);

  const addSection = () => {
    setSections((prev) => [
      ...prev,
      { sectionCode: `SECTION_${prev.length + 1}`, sectionName: '', defaultContent: '', sortOrder: prev.length + 1, isRequired: false }
    ]);
  };

  const removeSection = (idx: number) => {
    setSections((prev) => prev.filter((_, i) => i !== idx));
  };

  const updateSection = (idx: number, field: keyof SectionDraft, value: string | boolean) => {
    setSections((prev) => prev.map((s, i) => {
      if (i !== idx) return s;
      const updated = { ...s, [field]: value };
      if (field === 'sectionName') {
        updated.sectionCode = (value as string).toUpperCase().replace(/\s+/g, '_');
      }
      return updated;
    }));
  };

  const handleSave = async () => {
    if (!title.trim()) return toast.error('Template title is required');
    setIsSaving(true);
    const payload = { title, modality, bodyPart, description, isGlobal, sections };
    try {
      if (isEdit) {
        await updateTemplate.mutateAsync(payload as any);
        toast.success('Template updated');
      } else {
        await createTemplate.mutateAsync(payload as any);
        toast.success('Template created');
      }
      onClose();
    } catch {
      toast.error('Failed to save template');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal">
        <div className="modal-header">
          <h2 className="modal-title">{isEdit ? 'Edit Template' : 'Create New Template'}</h2>
          <button className="modal-close" onClick={onClose}><X size={16} /></button>
        </div>

        <div className="modal-body">
          <div className="form-row">
            <div className="form-field flex-2">
              <label>Template Title *</label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., CT Chest Standard"
              />
            </div>
            <div className="form-field">
              <label>Modality</label>
              <input
                value={modality}
                onChange={(e) => setModality(e.target.value)}
                placeholder="CT, MRI, X-Ray..."
              />
            </div>
            <div className="form-field">
              <label>Body Part</label>
              <input
                value={bodyPart}
                onChange={(e) => setBodyPart(e.target.value)}
                placeholder="Chest, Abdomen..."
              />
            </div>
          </div>

          <div className="form-field">
            <label>Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of this template's use case..."
              rows={2}
            />
          </div>

          <label className="checkbox-label">
            <input type="checkbox" checked={isGlobal} onChange={(e) => setIsGlobal(e.target.checked)} />
            Make globally available to all radiologists
          </label>

          <div className="sections-label">
            <span>TEMPLATE SECTIONS</span>
            <button className="btn-add-section" onClick={addSection}>
              <Plus size={12} /> Add Section
            </button>
          </div>

          <div className="sections-list">
            {sections.map((section, idx) => (
              <div key={idx} className="section-row">
                <GripVertical size={14} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                <div className="section-row-fields">
                  <input
                    className="section-name-input"
                    placeholder="Section name (e.g., Lungs)"
                    value={section.sectionName}
                    onChange={(e) => updateSection(idx, 'sectionName', e.target.value)}
                  />
                  <input
                    className="section-code-input mono"
                    placeholder="CODE"
                    value={section.sectionCode}
                    onChange={(e) => updateSection(idx, 'sectionCode', e.target.value.toUpperCase())}
                  />
                </div>
                <textarea
                  className="section-default-input"
                  placeholder="Default normal finding text..."
                  value={section.defaultContent}
                  onChange={(e) => updateSection(idx, 'defaultContent', e.target.value)}
                  rows={2}
                />
                <label className="req-label">
                  <input
                    type="checkbox"
                    checked={section.isRequired}
                    onChange={(e) => updateSection(idx, 'isRequired', e.target.checked)}
                  />
                  Req
                </label>
                <button className="btn-remove-section" onClick={() => removeSection(idx)}>
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn-cancel" onClick={onClose}>Cancel</button>
          <button className="btn-save" onClick={handleSave} disabled={isSaving}>
            {isSaving ? 'Saving...' : isEdit ? 'Update Template' : 'Create Template'}
          </button>
        </div>
      </div>

      <style jsx>{`
        .modal-overlay {
          position: fixed; inset: 0;
          background: rgba(0,0,0,0.6);
          display: flex; align-items: center; justify-content: center;
          z-index: 100;
          padding: 20px;
        }
        .modal {
          width: 800px; max-width: 100%;
          max-height: 90vh;
          background: var(--bg-surface);
          border: 1px solid var(--border);
          border-radius: 16px;
          display: flex; flex-direction: column;
          overflow: hidden;
        }
        .modal-header {
          display: flex; align-items: center; justify-content: space-between;
          padding: 20px 24px;
          border-bottom: 1px solid var(--border);
        }
        .modal-title { font-size: 16px; font-weight: 600; color: var(--text-primary); }
        .modal-close {
          width: 30px; height: 30px; border-radius: 8px;
          background: none; border: 1px solid var(--border);
          color: var(--text-muted); cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          transition: all 0.12s;
        }
        .modal-close:hover { border-color: var(--text-muted); color: var(--text-primary); }
        .modal-body {
          flex: 1; overflow-y: auto;
          padding: 20px 24px;
          display: flex; flex-direction: column; gap: 14px;
        }
        .form-row { display: flex; gap: 10px; }
        .form-field { display: flex; flex-direction: column; gap: 5px; flex: 1; }
        .form-field.flex-2 { flex: 2; }
        .form-field label { font-size: 11px; color: var(--text-muted); font-weight: 500; letter-spacing: 0.04em; }
        .form-field input, .form-field textarea {
          background: var(--bg-base);
          border: 1px solid var(--border);
          border-radius: 7px;
          padding: 8px 12px;
          color: var(--text-primary);
          font-size: 13px; font-family: inherit;
        }
        .form-field input:focus, .form-field textarea:focus { outline: none; border-color: var(--accent); }
        .form-field input::placeholder, .form-field textarea::placeholder { color: var(--text-muted); }
        .form-field textarea { resize: none; }
        .checkbox-label {
          display: flex; align-items: center; gap: 8px;
          font-size: 13px; color: var(--text-secondary);
          cursor: pointer;
        }
        .sections-label {
          display: flex; align-items: center; justify-content: space-between;
          padding-top: 4px;
        }
        .sections-label span {
          font-size: 10px; font-weight: 700; letter-spacing: 0.08em; color: var(--text-muted);
        }
        .btn-add-section {
          display: flex; align-items: center; gap: 4px;
          background: none; border: 1px solid var(--border);
          border-radius: 6px; padding: 5px 10px;
          color: var(--accent); font-size: 12px; font-family: inherit; cursor: pointer;
          transition: all 0.12s;
        }
        .btn-add-section:hover { background: var(--accent-dim); }
        .sections-list { display: flex; flex-direction: column; gap: 8px; }
        .section-row {
          display: flex; align-items: flex-start; gap: 8px;
          background: var(--bg-elevated);
          border: 1px solid var(--border);
          border-radius: 8px;
          padding: 10px;
        }
        .section-row-fields { display: flex; flex-direction: column; gap: 5px; width: 180px; flex-shrink: 0; }
        .section-name-input, .section-code-input, .section-default-input {
          background: var(--bg-base);
          border: 1px solid var(--border);
          border-radius: 5px;
          padding: 6px 9px;
          color: var(--text-primary);
          font-size: 12px; font-family: inherit;
        }
        .section-name-input:focus, .section-code-input:focus, .section-default-input:focus {
          outline: none; border-color: var(--accent);
        }
        .section-default-input { flex: 1; resize: none; }
        .req-label {
          display: flex; flex-direction: column; align-items: center; gap: 3px;
          font-size: 9px; color: var(--text-muted); cursor: pointer; flex-shrink: 0;
        }
        .btn-remove-section {
          width: 28px; height: 28px; flex-shrink: 0;
          background: none; border: 1px solid var(--border);
          border-radius: 5px; color: var(--text-muted); cursor: pointer;
          display: flex; align-items: center; justify-content: center;
          transition: all 0.12s;
        }
        .btn-remove-section:hover { border-color: var(--danger); color: var(--danger); }
        .modal-footer {
          display: flex; gap: 8px; justify-content: flex-end;
          padding: 16px 24px;
          border-top: 1px solid var(--border);
        }
        .btn-cancel {
          padding: 9px 18px;
          background: none; border: 1px solid var(--border);
          border-radius: 8px; color: var(--text-secondary);
          font-size: 13px; font-family: inherit; cursor: pointer;
          transition: all 0.12s;
        }
        .btn-cancel:hover { border-color: var(--text-muted); color: var(--text-primary); }
        .btn-save {
          padding: 9px 22px;
          background: var(--accent); border: none;
          border-radius: 8px; color: white;
          font-size: 13px; font-weight: 600; font-family: inherit; cursor: pointer;
          transition: background 0.15s;
        }
        .btn-save:hover:not(:disabled) { background: var(--accent-hover); }
        .btn-save:disabled { opacity: 0.6; cursor: not-allowed; }
      `}</style>
    </div>
  );
}
