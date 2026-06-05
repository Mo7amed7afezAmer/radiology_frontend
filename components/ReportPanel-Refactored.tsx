import React, { useState, useEffect } from 'react';
import {
  Trash2, Command, Play, CheckCircle, Copy, Download,
  Send, Check, AlertCircle, FileText, Printer, Plus,
  Undo, Redo, Bold, Italic, Underline
} from 'lucide-react';
import { ReportNode, Patient, RestructuringMode } from '../types';
import { useReportWorkflow } from '../hooks/useReportWorkflow';
import { useReportAPI } from '../hooks/useReportAPI';
import { useFormattingWorkflow } from '../hooks/useFormattingWorkflow';
import {
  stripHtmlTags,
  generateOfflineImpression,
  formatReportPlainText,
  buildReportHtml,
  validateReport
} from '../lib/reportUtils';

interface ReportPanelProps {
  nodes: ReportNode[];
  setNodes: React.Dispatch<React.SetStateAction<ReportNode[]>>;
  selectedPatient: Patient;
  isSigned: boolean;
  setIsSigned: (val: boolean) => void;
  onPatientSelect: (p: Patient) => void;
  availablePatients: Patient[];
  displayMode: 'organ' | 'findings';
  setDisplayMode: (mode: 'organ' | 'findings') => void;
  onNewReport: () => void;
  restructuringMode: RestructuringMode;
}

export default function ReportPanel({
  nodes,
  setNodes,
  selectedPatient,
  isSigned,
  setIsSigned,
  onPatientSelect,
  availablePatients,
  displayMode,
  setDisplayMode,
  onNewReport,
  restructuringMode
}: ReportPanelProps) {
  // Workflow hooks
  const {
    undo,
    redo,
    canUndo,
    canRedo,
    updateNodeText,
    deleteNode,
    reorderNodes,
  } = useReportWorkflow(nodes);

  const {
    isLoading,
    feedback,
    displayFeedback,
    executeCommand,
    generateImpression,
    autoUpdateImpression,
  } = useReportAPI();

  const {
    fontStyle,
    setFontStyle,
    fontSize,
    setFontSize,
    isBold,
    isItalic,
    isUnderline,
    editingNodeId,
    setEditingNodeId,
    draggedIndex,
    dragOverIndex,
    getFontFamily,
    getTextStyle,
    applyFormat,
    handleDragStart,
    handleDragOver,
    handleDrop,
    handleDragEnd,
  } = useFormattingWorkflow();

  // State
  const [activeCommandNodeId, setActiveCommandNodeId] = useState<string | null>(null);
  const [currentCommand, setCurrentCommand] = useState('');
  const [showPatientDrop, setShowPatientDrop] = useState(false);
  const [newSectionName, setNewSectionName] = useState('');

  // Auto-update impression when findings change
  useEffect(() => {
    if (nodes.length === 0 || isSigned) return;

    const timer = setTimeout(async () => {
      // First, generate offline impression
      const offlineImpression = generateOfflineImpression(nodes);
      updateNodeText(
        nodes.find(n => n.name.toLowerCase() === 'impression')?.id || '',
        offlineImpression
      );

      // Then, try to get AI-generated impression
      const aiImpression = await autoUpdateImpression(nodes, restructuringMode);
      if (aiImpression) {
        updateNodeText(
          nodes.find(n => n.name.toLowerCase() === 'impression')?.id || '',
          aiImpression
        );
      }
    }, 1500);

    return () => clearTimeout(timer);
  }, [nodes, isSigned, updateNodeText, autoUpdateImpression, restructuringMode]);

  // WORKFLOW STEP 1: Execute command on a section
  const handleExecuteCommand = async (nodeId: string) => {
    if (isSigned || !currentCommand.trim()) return;

    const targetNode = nodes.find(n => n.id === nodeId);
    if (!targetNode) return;

    const updatedText = await executeCommand(targetNode.text, currentCommand);
    if (updatedText) {
      updateNodeText(nodeId, updatedText);
      setActiveCommandNodeId(null);
      setCurrentCommand('');
    }
  };

  // WORKFLOW STEP 2: Generate impression
  const handleGenerateImpression = async () => {
    if (isSigned) return;

    const impression = await generateImpression(nodes, restructuringMode);
    if (impression) {
      updateNodeText(
        nodes.find(n => n.name.toLowerCase() === 'impression')?.id || '',
        impression
      );
    }
  };

  // WORKFLOW STEP 3: Handle node text change
  const handleNodeTextChange = (nodeId: string, text: string) => {
    updateNodeText(nodeId, text);
  };

  // WORKFLOW STEP 4: Handle node deletion
  const handleDeleteNode = (id: string, name: string) => {
    if (isSigned) return;
    deleteNode(id);
    displayFeedback(`Removed '${name}' from report structure.`, 'info');
  };

  // WORKFLOW STEP 5: Handle node reordering
  const handleNodeDrop = (targetIndex: number) => {
    if (draggedIndex === null || isSigned) return;
    reorderNodes(draggedIndex, targetIndex);
    displayFeedback('Reordered report segments successfully', 'info');
    handleDragEnd();
  };

  // WORKFLOW STEP 6: Copy report to clipboard
  const handleCopyReport = () => {
    const reportStr = formatReportPlainText(nodes, selectedPatient);
    navigator.clipboard.writeText(reportStr);
    displayFeedback('Report copied to clipboard!', 'success');
  };

  // WORKFLOW STEP 7: Download report as Word
  const handleDownloadWord = () => {
    const html = buildReportHtml(nodes, selectedPatient, getFontFamily(fontStyle), fontSize, displayMode);
    const blob = new Blob([html], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${selectedPatient.name}_Report_${new Date().toISOString().split('T')[0]}.doc`;
    a.click();
    URL.revokeObjectURL(url);
    displayFeedback('Report downloaded!', 'success');
  };

  // WORKFLOW STEP 8: Sign report
  const handleSignReport = () => {
    if (isSigned) return;
    const validation = validateReport(nodes);
    if (!validation.isValid) {
      displayFeedback(`Missing required fields: ${validation.missingFields.join(', ')}`, 'error');
      return;
    }
    setIsSigned(true);
    displayFeedback('Report digitally signed and locked.', 'success');
  };

  // WORKFLOW STEP 9: Unlock report
  const handleUnlockReport = () => {
    setIsSigned(false);
    displayFeedback('Report unlocked for editing.', 'info');
  };

  const reportTextStyle = getTextStyle();

  return (
    <div className="flex-[0.4] bg-white border border-slate-200 rounded-2xl p-6 shadow-sm h-[calc(100vh-2.5rem)] my-5 flex flex-col overflow-hidden gap-4">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-4">
        <span className="text-[11px] font-mono font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
          <FileText className="w-4 h-4 text-indigo-600" />
          Report Editor
        </span>
        <div className="flex gap-1">
          <button onClick={undo} disabled={!canUndo || isSigned} className="p-1 hover:bg-slate-100 rounded disabled:opacity-50" title="Undo">
            <Undo className="w-4 h-4" />
          </button>
          <button onClick={redo} disabled={!canRedo || isSigned} className="p-1 hover:bg-slate-100 rounded disabled:opacity-50" title="Redo">
            <Redo className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Formatting Toolbar */}
      <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 p-3 rounded-lg">
        <select value={fontStyle} onChange={(e) => setFontStyle(e.target.value)} disabled={isSigned} className="text-xs px-2 py-1 border border-slate-200 rounded">
          <option>Arial</option>
          <option>Calibri</option>
          <option>Times New Roman</option>
        </select>
        <select value={fontSize} onChange={(e) => setFontSize(e.target.value)} disabled={isSigned} className="text-xs px-2 py-1 border border-slate-200 rounded">
          {['10px', '12px', '14px', '16px', '18px'].map(size => <option key={size}>{size}</option>)}
        </select>

        <div className="flex gap-1">
          <button onClick={() => applyFormat('bold', editingNodeId || undefined)} disabled={isSigned} className={`p-1 rounded ${isBold ? 'bg-indigo-100 text-indigo-600' : 'hover:bg-slate-100'}`}>
            <Bold className="w-4 h-4" />
          </button>
          <button onClick={() => applyFormat('italic', editingNodeId || undefined)} disabled={isSigned} className={`p-1 rounded ${isItalic ? 'bg-indigo-100 text-indigo-600' : 'hover:bg-slate-100'}`}>
            <Italic className="w-4 h-4" />
          </button>
          <button onClick={() => applyFormat('underline', editingNodeId || undefined)} disabled={isSigned} className={`p-1 rounded ${isUnderline ? 'bg-indigo-100 text-indigo-600' : 'hover:bg-slate-100'}`}>
            <Underline className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Report Nodes */}
      <div className="flex-1 overflow-y-auto pr-2 flex flex-col gap-3">
        {nodes.map((node, index) => (
          <div
            key={node.id}
            draggable={!isSigned}
            onDragStart={() => handleDragStart(index)}
            onDragOver={() => handleDragOver(index)}
            onDrop={() => handleNodeDrop(index)}
            onDragEnd={handleDragEnd}
            className={`bg-slate-50 border border-slate-200 p-3 rounded-lg transition ${draggedIndex === index ? 'opacity-50' : ''}`}
          >
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold text-sm">{node.name}</h3>
              <button onClick={() => handleDeleteNode(node.id, node.name)} disabled={isSigned} className="p-1 hover:bg-slate-200 rounded">
                <Trash2 className="w-4 h-4 text-rose-600" />
              </button>
            </div>
            <textarea
              value={stripHtmlTags(node.text)}
              onChange={(e) => handleNodeTextChange(node.id, e.target.value)}
              disabled={isSigned}
              className="w-full h-24 p-2 border border-slate-200 rounded text-xs resize-none font-mono"
              style={reportTextStyle}
            />
          </div>
        ))}
      </div>

      {/* Action Buttons */}
      <div className="flex gap-2 border-t border-slate-100 pt-4">
        <button onClick={handleCopyReport} className="flex-1 flex items-center justify-center gap-1 bg-indigo-600 text-white px-3 py-2 rounded text-xs font-semibold hover:bg-indigo-700">
          <Copy className="w-4 h-4" />
          Copy
        </button>
        <button onClick={handleDownloadWord} className="flex-1 flex items-center justify-center gap-1 bg-indigo-600 text-white px-3 py-2 rounded text-xs font-semibold hover:bg-indigo-700">
          <Download className="w-4 h-4" />
          Export
        </button>
        {!isSigned ? (
          <button onClick={handleSignReport} className="flex-1 flex items-center justify-center gap-1 bg-green-600 text-white px-3 py-2 rounded text-xs font-semibold hover:bg-green-700">
            <CheckCircle className="w-4 h-4" />
            Sign
          </button>
        ) : (
          <button onClick={handleUnlockReport} className="flex-1 flex items-center justify-center gap-1 bg-slate-600 text-white px-3 py-2 rounded text-xs font-semibold hover:bg-slate-700">
            Unlock
          </button>
        )}
      </div>

      {/* Feedback Message */}
      {feedback && (
        <div className={`flex items-center gap-2 p-2 rounded text-xs ${
          feedback.type === 'success' ? 'bg-green-100 text-green-700' :
          feedback.type === 'error' ? 'bg-rose-100 text-rose-700' :
          'bg-blue-100 text-blue-700'
        }`}>
          <Check className="w-4 h-4" />
          {feedback.text}
        </div>
      )}
    </div>
  );
}
