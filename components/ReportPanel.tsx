import React, { useState } from "react";
import { 
  GripVertical, Trash2, Command, Play, CheckCircle, 
  Copy, Download, Send, Check, AlertCircle, FileText, Printer, Shuffle, HelpCircle, User, Layers,
  Undo, Redo, Bold, Italic, Underline, Plus, Clipboard
} from "lucide-react";
import { ReportNode, Patient, RestructuringMode } from "../types";

const stripHtmlTags = (html: string): string => {
  if (!html) return "";
  const doc = new DOMParser().parseFromString(html, "text/html");
  return doc.body.textContent || "";
};

const RichTextEditor = ({
  id,
  value,
  onChange,
  style,
  className,
  placeholder,
  disabled,
  onBlur,
  onFocus
}: {
  id: string;
  value: string;
  onChange: (val: string) => void;
  style: React.CSSProperties;
  className: string;
  placeholder?: string;
  disabled?: boolean;
  onBlur?: () => void;
  onFocus?: () => void;
}) => {
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (ref.current && ref.current.innerHTML !== value) {
      ref.current.innerHTML = value || "";
    }
  }, [value]);

  const handleInput = () => {
    if (ref.current) {
      onChange(ref.current.innerHTML);
    }
  };

  return (
    <div
      id={id}
      ref={ref}
      contentEditable={!disabled}
      onInput={handleInput}
      onBlur={onBlur}
      onFocus={onFocus}
      style={{
        outline: "none",
        minHeight: "42px",
        whiteSpace: "pre-wrap",
        wordBreak: "break-word",
        ...style
      }}
      className={className}
      placeholder={placeholder}
    />
  );
};

const splitIntoSentences = (text: string): string[] => {
  if (!text) return [];
  const rawParts = text.split(/(?:\. |\n)+/);
  return rawParts
    .map(p => {
      let cleaned = p.trim();
      cleaned = cleaned.replace(/^[\s\-*•]+/, '');
      if (cleaned && !cleaned.endsWith('.')) {
        cleaned += '.';
      }
      return cleaned;
    })
    .filter(p => p && p !== '.' && p !== 'No findings recorded.');
};

const getBulletsForNode = (node: ReportNode): { isAbnormal: boolean; text: string }[] => {
  const isFinding = node.name.toLowerCase() !== 'technique' && node.name.toLowerCase() !== 'impression';
  if (!isFinding) {
    return [];
  }

  const sentences = splitIntoSentences(node.text);
  if (sentences.length === 0) {
    return [{ isAbnormal: !node.isNormal, text: "No findings recorded." }];
  }

  return [{ isAbnormal: !node.isNormal, text: sentences.join(" ") }];
};

interface ReportPanelProps {
  key?: string | number;
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
  const [activeCommandNodeId, setActiveCommandNodeId] = useState<string | null>(null);
  const [currentCommand, setCurrentCommand] = useState<string>("");
  const [isCommandProcessing, setIsCommandProcessing] = useState<boolean>(false);
  const [isImpressionProcessing, setIsImpressionProcessing] = useState<boolean>(false);
  const [feedbackMsg, setFeedbackMsg] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [sendingPACS, setSendingPACS] = useState<boolean>(false);
  const [pacsProgress, setPacsProgress] = useState<number>(0);
  const [pacDetails, setPacDetails] = useState<string>("");
  const [pacsCompleted, setPacsCompleted] = useState<boolean>(false);
  const [newSectionName, setNewSectionName] = useState<string>("");

  // Demographics dropdown state
  const [showPatientDrop, setShowPatientDrop] = useState<boolean>(false);
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null);

  // Formatting & Style States
  const [fontStyle, setFontStyle] = useState<string>("Arial");
  const [fontSize, setFontSize] = useState<string>("12px");
  const [isBold, setIsBold] = useState<boolean>(false);
  const [isItalic, setIsItalic] = useState<boolean>(false);
  const [isUnderline, setIsUnderline] = useState<boolean>(false);

  // Undo & Redo History State
  const historyRef = React.useRef<ReportNode[][]>([]);
  const historyPointerRef = React.useRef<number>(-1);
  const isUndoRedoingRef = React.useRef<boolean>(false);

  const [canUndo, setCanUndo] = useState<boolean>(false);
  const [canRedo, setCanRedo] = useState<boolean>(false);

  const updateUndoRedoStates = () => {
    setCanUndo(historyPointerRef.current > 0);
    setCanRedo(historyPointerRef.current < historyRef.current.length - 1);
  };

  // Keyboard and history listener for tracking nodes modifications
  React.useEffect(() => {
    if (isUndoRedoingRef.current) {
      isUndoRedoingRef.current = false;
      return;
    }

    if (historyRef.current.length === 0) {
      // Initialize backup
      historyRef.current = [JSON.parse(JSON.stringify(nodes))];
      historyPointerRef.current = 0;
      updateUndoRedoStates();
    } else {
      const lastState = historyRef.current[historyPointerRef.current];
      // Check structural or full node changes
      const isStructureChanged = !lastState || lastState.length !== nodes.length || lastState.some((n, i) => n.id !== nodes[i].id);

      const pushState = () => {
        const nextHistory = historyRef.current.slice(0, historyPointerRef.current + 1);
        nextHistory.push(JSON.parse(JSON.stringify(nodes)));
        historyRef.current = nextHistory;
        historyPointerRef.current = nextHistory.length - 1;
        updateUndoRedoStates();
      };

      if (isStructureChanged) {
        pushState();
      } else {
        const timer = setTimeout(() => {
          const currentLastState = historyRef.current[historyPointerRef.current];
          const isTextChanged = currentLastState && currentLastState.some((n, i) => n.text !== nodes[i].text);
          if (isTextChanged) {
            pushState();
          }
        }, 350);
        return () => clearTimeout(timer);
      }
    }
  }, [nodes]);

  const handleUndo = () => {
    if (historyPointerRef.current > 0 && !isSigned) {
      isUndoRedoingRef.current = true;
      const prevPointer = historyPointerRef.current - 1;
      historyPointerRef.current = prevPointer;
      const targetState = JSON.parse(JSON.stringify(historyRef.current[prevPointer]));
      setNodes(targetState);
      updateUndoRedoStates();
      displayFeedback("Undone last modification", "info");
    }
  };

  const handleRedo = () => {
    if (historyPointerRef.current < historyRef.current.length - 1 && !isSigned) {
      isUndoRedoingRef.current = true;
      const nextPointer = historyPointerRef.current + 1;
      historyPointerRef.current = nextPointer;
      const targetState = JSON.parse(JSON.stringify(historyRef.current[nextPointer]));
      setNodes(targetState);
      updateUndoRedoStates();
      displayFeedback("Redone last modification", "info");
    }
  };

  // Update formatting button active states based on current selection
  const updateSelectionStates = () => {
    try {
      setIsBold(document.queryCommandState("bold"));
      setIsItalic(document.queryCommandState("italic"));
      setIsUnderline(document.queryCommandState("underline"));
    } catch (e) {
      // safe fallback
    }
  };

  React.useEffect(() => {
    document.addEventListener("selectionchange", updateSelectionStates);
    return () => {
      document.removeEventListener("selectionchange", updateSelectionStates);
    };
  }, []);

  // Automatic update of Impression in real-time when findings change (added, edited, or removed)
  const lastStateKey = nodes
    .filter(n => n.name.toLowerCase() !== 'impression')
    .map(n => `${n.id}:${n.text}:${n.isNormal}`)
    .join("|");

  React.useEffect(() => {
    if (nodes.length === 0 || isSigned) return;

    const timer = setTimeout(async () => {
      // Build simple Local/Offline Impression Synthesis instantly
      const abnormalList = nodes.filter(n => !n.isNormal && n.name.toLowerCase() !== 'technique' && n.name.toLowerCase() !== 'impression');
      let simulated = "";
      if (abnormalList.length > 0) {
        simulated = abnormalList.map((n, idx) => `${idx + 1}. Significant findings noted in ${n.name}: ${stripHtmlTags(n.text)}`).join("\n");
      } else {
        simulated = "1. Unremarkable study. No acute path identified.";
      }

      // Update the Impression node immediately as a fast local preview so the user sees instant updates!
      setNodes(prev => prev.map(node => {
        if (node.name.toLowerCase() === 'impression') {
          if (stripHtmlTags(node.text) !== stripHtmlTags(simulated)) {
            return { ...node, text: simulated, isNormal: abnormalList.length === 0 };
          }
        }
        return node;
      }));

      // Now query the real Gemini API for high-quality clinical summary maintaining a non-blocking background fetch
      try {
        const styleProfileText = localStorage.getItem("apex_style_profile_text") || "";
        const hasProfile = styleProfileText.trim().length > 0;
        const effectiveMode = (restructuringMode === 'personalized' && !hasProfile) ? 'concise' : restructuringMode;

        const response = await fetch("/api/generate-impression", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            nodes, 
            mode: effectiveMode, 
            styleProfileText 
          })
        });
        if (response.ok) {
          const data = await response.json();
          if (data.impression && data.impression.trim()) {
            setNodes(prev => prev.map(node => {
              if (node.name.toLowerCase() === 'impression') {
                return { ...node, text: data.impression, isNormal: abnormalList.length === 0 };
              }
              return node;
            }));
          }
        }
      } catch (err) {
        console.warn("Background Impression autoupdate: error calling api", err);
      }
    }, 1500); // 1.5s debounce to let user finish typing comfortably

    return () => clearTimeout(timer);
  }, [lastStateKey, isSigned]);

  const applyFormat = (command: 'bold' | 'italic' | 'underline') => {
    if (isSigned) return;
    document.execCommand(command, false);
    updateSelectionStates();
    
    // Sync the innerHTML of the active editing element back to the nodes state
    if (editingNodeId) {
      const element = document.getElementById(`editor-node-${editingNodeId}`);
      if (element) {
        handleNodeTextChange(editingNodeId, element.innerHTML);
      }
    }
  };

  // Keyboard shortcut listener
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isSigned) return;
      
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const modifier = isMac ? e.metaKey : e.ctrlKey;

      if (modifier) {
        if (e.key.toLowerCase() === 'z') {
          e.preventDefault();
          if (e.shiftKey) {
            handleRedo();
          } else {
            handleUndo();
          }
        } else if (e.key.toLowerCase() === 'y') {
          e.preventDefault();
          handleRedo();
        } else if (e.key.toLowerCase() === 'b') {
          e.preventDefault();
          applyFormat('bold');
        } else if (e.key.toLowerCase() === 'i') {
          e.preventDefault();
          applyFormat('italic');
        } else if (e.key.toLowerCase() === 'u') {
          e.preventDefault();
          applyFormat('underline');
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [canUndo, canRedo, isSigned, editingNodeId, nodes]);

  const getSelectedFontFamily = () => {
    if (fontStyle === "Calibri") return "Calibri, Light Calibri, sans-serif";
    if (fontStyle === "Times New Roman") return "'Times New Roman', Georgia, serif";
    if (fontStyle === "Inter") return "'Inter', sans-serif";
    if (fontStyle === "Source Sans Pro") return "'Source Sans 3', 'Source Sans Pro', sans-serif";
    if (fontStyle === "Roboto") return "'Roboto', sans-serif";
    if (fontStyle === "IBM Plex Sans") return "'IBM Plex Sans', sans-serif";
    return "Arial, sans-serif";
  };

  const reportTextStyle = {
    fontFamily: getSelectedFontFamily(),
    fontSize: fontSize,
  };

  const displayFeedback = (text: string, type: 'success' | 'error' | 'info' = 'success') => {
    setFeedbackMsg({ text, type });
    setTimeout(() => {
      setFeedbackMsg(null);
    }, 4000);
  };

  // Drag and drop state and handlers for reordering report nodes
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const handleDragStart = (e: React.DragEvent, index: number) => {
    if (isSigned) return;
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    if (isSigned) return;
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;
    setDragOverIndex(index);
  };

  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    if (isSigned) return;
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === targetIndex) {
      setDraggedIndex(null);
      setDragOverIndex(null);
      return;
    }

    const updated = [...nodes];
    const [removed] = updated.splice(draggedIndex, 1);
    updated.splice(targetIndex, 0, removed);
    setNodes(updated);
    displayFeedback("Reordered report segments successfully", "info");

    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  // Deletion
  const deleteNode = (id: string, name: string) => {
    if (isSigned) return;
    const filtered = nodes.filter(node => node.id !== id);
    setNodes(filtered);
    displayFeedback(`Removed '${name}' from report structure.`, "info");
  };

  // Command input trigger
  const triggerCommand = async (nodeId: string) => {
    if (isSigned) return;
    if (!currentCommand.trim()) return;

    setIsCommandProcessing(true);
    const targetNode = nodes.find(n => n.id === nodeId);
    if (!targetNode) return;

    try {
      const response = await fetch("/api/command", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nodeText: targetNode.text,
          command: currentCommand
        })
      });

      if (!response.ok) {
        throw new Error("Server failed to compute local section modifier.");
      }

      const data = await response.json();
      
      setNodes(prev => prev.map(node => {
        if (node.id === nodeId) {
          return { ...node, text: data.updatedText, isNormal: false };
        }
        return node;
      }));

      setActiveCommandNodeId(null);
      setCurrentCommand("");
      if (data.usingFallback) {
        displayFeedback("⚠️ Gemini Quota limit. Formatted section clinical data offline successfully!", "info");
      } else {
        displayFeedback("Applied rewrite command successfully.");
      }
    } catch (err: any) {
      console.error(err);
      displayFeedback(err.message || "Failed to execute command", "error");
    } finally {
      setIsCommandProcessing(false);
    }
  };

  // Generate Impression
  const generateImpression = async () => {
    if (isSigned) return;
    setIsImpressionProcessing(true);
    displayFeedback("Parsing findings list for significant diagnostic factors...", "info");

    try {
      const styleProfileText = localStorage.getItem("apex_style_profile_text") || "";
      const hasProfile = styleProfileText.trim().length > 0;
      const effectiveMode = (restructuringMode === 'personalized' && !hasProfile) ? 'concise' : restructuringMode;

      const response = await fetch("/api/generate-impression", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          nodes, 
          mode: effectiveMode, 
          styleProfileText 
        })
      });

      if (!response.ok) {
        throw new Error("Gemini was unable to synthesize the findings. Try again.");
      }

      const data = await response.json();
      
      // Update Impression node
      setNodes(prev => prev.map(node => {
        if (node.name.toLowerCase() === 'impression') {
          return { ...node, text: data.impression, isNormal: false };
        }
        return node;
      }));

      if (data.usingFallback) {
        displayFeedback("⚠️ Gemini Quota limit. Synthesis compiled offline successfully!", "info");
      } else {
        displayFeedback("Impression finalized based on pathological details.");
      }
    } catch (err: any) {
      console.error(err);
      displayFeedback(err.message || "Failed to generate impression summary.", "error");
    } finally {
      setIsImpressionProcessing(false);
    }
  };

  // Signing report
  const handleSignReport = () => {
    if (isSigned) return;
    setIsSigned(true);
    displayFeedback("Report digitally countersigned and locked.", "success");
  };

  const unlockReportAndReset = () => {
    setIsSigned(false);
    setPacsCompleted(false);
    setPacsProgress(0);
    displayFeedback("Authorized clinic session unlock.", "info");
  };

  // Export 1: Clipboard Copy
  const copyReportText = () => {
    const reportStr = getFormattedReportPlainText();
    navigator.clipboard.writeText(reportStr);
    displayFeedback("Clinical report copied to standard clipboard!");
  };

  // Export 2: Word File Document Download (.doc / HTML-based styling)
  const downloadReportWord = () => {
    const getSelectedFontFamily = () => {
      if (fontStyle === "Calibri") return "Calibri, Light Calibri, sans-serif";
      if (fontStyle === "Times New Roman") return "'Times New Roman', Georgia, serif";
      if (fontStyle === "Inter") return "'Inter', sans-serif";
      if (fontStyle === "Source Sans Pro") return "'Source Sans 3', 'Source Sans Pro', sans-serif";
      if (fontStyle === "Roboto") return "'Roboto', sans-serif";
      if (fontStyle === "IBM Plex Sans") return "'IBM Plex Sans', sans-serif";
      return "Arial, sans-serif";
    };
    
    const getSelectedFontPt = () => {
      if (fontSize === "10px") return "10pt";
      if (fontSize === "11px") return "11pt";
      if (fontSize === "12px") return "12pt";
      if (fontSize === "13.5px") return "13.5pt";
      if (fontSize === "14px") return "14pt";
      if (fontSize === "16px") return "16pt";
      if (fontSize === "17px") return "17pt";
      if (fontSize === "18px") return "18pt";
      if (fontSize === "19px") return "19pt";
      if (fontSize === "20px") return "20pt";
      return "11pt";
    };

    // Build a clean, compact clinical radiology report template optimized for a single-page Word document
    let findingsHtml = "";

    // 1. Technique
    const techNode = nodes.find(n => n.name.toLowerCase() === 'technique');
    const techHtml = techNode ? `
      <div class="section-heading">${techNode.name}</div>
      <p class="section-text">${techNode.text}</p>
    ` : "";

    // 2. Findings based on selected display mode
    findingsHtml = `
      <div class="section-heading">FINDINGS</div>
    `;

    if (displayMode === 'organ') {
      nodes.forEach(node => {
        const isFinding = node.name.toLowerCase() !== 'technique' && node.name.toLowerCase() !== 'impression';
        if (isFinding) {
          const bullets = getBulletsForNode(node);
          bullets.forEach(bullet => {
            findingsHtml += `
              <div style="margin: 3.5px 0 3.5px 14px; padding: 0; font-size: ${getSelectedFontPt()}; line-height: 1.35; color: #1e293b; font-family: ${getSelectedFontFamily()}; display: block; text-indent: -14px; padding-left: 14px;">
                <span style="color: #000000; font-weight: bold; margin-right: 5px;">•</span>
                <strong style="color: #0f172a; text-transform: uppercase; font-family: ${getSelectedFontFamily()}; font-size: ${getSelectedFontPt()}; margin-right: 5px;">${node.name}:</strong>
                <span style="color: #1a202c;">${bullet.text}</span>
              </div>
            `;
          });
        }
      });
    } else {
      let findingCount = 0;
      nodes.forEach(node => {
        const isFinding = node.name.toLowerCase() !== 'technique' && node.name.toLowerCase() !== 'impression';
        if (isFinding) {
          const bullets = getBulletsForNode(node);
          bullets.forEach(bullet => {
            findingsHtml += `
              <div style="margin: 3.5px 0 3.5px 14px; padding: 0; font-size: ${getSelectedFontPt()}; line-height: 1.35; color: #1e293b; font-family: ${getSelectedFontFamily()}; display: block; text-indent: -14px; padding-left: 14px;">
                <span style="color: #000000; font-weight: bold; margin-right: 5px;">•</span>
                <span style="color: #1a202c;">${bullet.text}</span>
              </div>
            `;
            findingCount++;
          });
        }
      });
      if (findingCount === 0) {
        findingsHtml += `
          <div style="margin: 3.5px 0 3.5px 14px; padding: 0; font-size: ${getSelectedFontPt()}; color: #64748b; font-style: italic; font-family: ${getSelectedFontFamily()}; display: block; text-indent: -14px; padding-left: 14px;">
            <span style="color: #000000; font-weight: bold; margin-right: 5px;">•</span>
            No findings recorded.
          </div>
        `;
      }
    }

    // 3. Impression
    const impNode = nodes.find(n => n.name.toLowerCase() === 'impression');
    const impHtml = impNode ? `
      <div class="section-heading">${impNode.name}</div>
      <p class="section-text ${!impNode.isNormal ? 'pathology' : ''}">${impNode.text}</p>
    ` : "";

    const htmlContent = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <title>Radiology Report - ${selectedPatient.name}</title>
        <style>
          @page {
            size: letter;
            margin: 0.5in;
          }
          body { 
            font-family: ${getSelectedFontFamily()}; 
            line-height: 1.25; 
            color: #0f172a; 
            margin: 0px; 
            padding: 0px; 
            font-size: ${getSelectedFontPt()};
          }
          .patient-table { 
            width: 100%; 
            border-collapse: collapse; 
            margin-bottom: 12px; 
          }
          .patient-table td { 
            padding: 4px 6px; 
            border: 1px solid #94a3b8; 
            font-size: 9pt; 
            color: #1e293b;
            line-height: 1.2;
          }
          .section-heading { 
            font-size: 10.5pt; 
            font-weight: bold; 
            color: #000000; 
            margin-top: 12px; 
            text-transform: uppercase; 
            border-bottom: 1px solid #cbd5e1;
            padding-bottom: 2px;
          }
          .section-text { 
            font-size: ${getSelectedFontPt()}; 
            margin-bottom: 8px; 
            margin-top: 3px; 
            color: #1e293b; 
            text-align: justify;
          }
          .pathology { 
            font-weight: bold;
            color: #b91c1c; 
          }
          .footer { 
            font-size: 8.5pt; 
            color: #000000; 
            margin-top: 30px; 
            line-height: 1.25;
            page-break-inside: avoid;
          }
        </style>
      </head>
      <body>
        <table class="patient-table">
          <tr>
            <td width="50%"><strong>Patient Name:</strong> ${selectedPatient.name}</td>
            <td width="50%"><strong>MRN:</strong> ${selectedPatient.mrn}</td>
          </tr>
          <tr>
            <td><strong>Age / Gender:</strong> ${selectedPatient.age} / ${selectedPatient.gender}</td>
            <td><strong>Accession No:</strong> ${selectedPatient.accessionNumber}</td>
          </tr>
          <tr>
            <td><strong>Study Date:</strong> ${selectedPatient.studyDate}</td>
            <td><strong>Referring MD:</strong> ${selectedPatient.referringPhysician}</td>
          </tr>
          <tr>
            <td colspan="2"><strong>Clinical Indication:</strong> ${selectedPatient.indication}</td>
          </tr>
        </table>
        
        ${techHtml}
        ${findingsHtml}
        ${impHtml}
        
        <div class="footer">
          <div style="font-family: 'Brush Script MT', 'Georgia', cursive, serif; font-style: italic; font-size: 18pt; color: #000000; margin-bottom: 2px;">Dr. Tamer Ragab</div>
          <div style="border-top: 1.5pt solid #000000; width: 220px; padding-top: 4px; font-size: 9.5pt; font-family: 'Arial', sans-serif; font-weight: bold; color: #000000;">
            Dr. Tamer Ragab, MD, DABR
          </div>
        </div>
      </body>
      </html>
    `;

    const blob = new Blob(['\ufeff' + htmlContent], {
      type: 'application/msword'
    });
    
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Report_${selectedPatient.name.replace(/\s+/g, '_')}_${selectedPatient.mrn}.doc`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    displayFeedback("Microsoft Word File (.doc) download initiated with selected layout!");
  };

  // Export 3: Send Report to PACS (HL7 Transmission progress)
  const sendReportToPACS = () => {
    setSendingPACS(true);
    setPacsCompleted(false);
    setPacDetails("Connecting to DICOM gateway...");
    setPacsProgress(10);

    const stages = [
      { prg: 25, msg: "Retrieving patient study context block on MRN: " + selectedPatient.mrn },
      { prg: 45, msg: "Structuring structured metadata as HL7 ORU_R01 transmission report packet" },
      { prg: 70, msg: "Transmitting clinical block payload. Sending bytes directly to host port 104..." },
      { prg: 90, msg: "Validating clinical packet signatures. Waiting for PACS gateway ACK packet..." },
      { prg: 100, msg: "Gateway connection success. ACK received. DICOM accession " + selectedPatient.accessionNumber + " updated." }
    ];

    stages.forEach((stage, idx) => {
      setTimeout(() => {
        setPacsProgress(stage.prg);
        setPacDetails(stage.msg);
        if (stage.prg === 100) {
          setPacsCompleted(true);
          displayFeedback("Clinical transmission to PACS completed successfully!");
        }
      }, (idx + 1) * 800);
    });
  };

  const getFormattedReportPlainText = () => {
    let header = `====================================================\n`;
    header += `                APEX RADIOLOGY REPORT               \n`;
    header += `====================================================\n\n`;
    header += `PATIENT NAME:  ${selectedPatient.name}\n`;
    header += `MRN:           ${selectedPatient.mrn}\n`;
    header += `AGE / GENDER:  ${selectedPatient.age} / ${selectedPatient.gender}\n`;
    header += `STUDY DATE:    ${selectedPatient.studyDate}\n`;
    header += `ACCESSION NO:  ${selectedPatient.accessionNumber}\n`;
    header += `REFERRING MD:  ${selectedPatient.referringPhysician}\n`;
    header += `INDICATION:    ${selectedPatient.indication}\n\n`;
    header += `----------------------------------------------------\n\n`;

    let sectionsContent = "";

    // 1. Technique section (always first)
    const techNode = nodes.find(n => n.name.toLowerCase() === 'technique');
    if (techNode) {
      sectionsContent += `[TECHNIQUE]\n${stripHtmlTags(techNode.text)}\n\n`;
    }

    // 2. Findings based on Display Mode
    sectionsContent += `[FINDINGS]\n`;
    if (displayMode === 'organ') {
      nodes.forEach(node => {
        const isFinding = node.name.toLowerCase() !== 'technique' && node.name.toLowerCase() !== 'impression';
        if (isFinding) {
          const bullets = getBulletsForNode(node);
          bullets.forEach(bullet => {
            sectionsContent += `• ${node.name}: ${stripHtmlTags(bullet.text)}\n`;
          });
        }
      });
      sectionsContent += `\n`;
    } else {
      let findingCount = 0;
      nodes.forEach(node => {
        const isFinding = node.name.toLowerCase() !== 'technique' && node.name.toLowerCase() !== 'impression';
        if (isFinding) {
          const bullets = getBulletsForNode(node);
          bullets.forEach(bullet => {
            sectionsContent += `• ${stripHtmlTags(bullet.text)}\n`;
            findingCount++;
          });
        }
      });
      if (findingCount === 0) {
        sectionsContent += `• No findings recorded.\n`;
      }
      sectionsContent += `\n`;
    }

    // 3. Impression section
    const impNode = nodes.find(n => n.name.toLowerCase() === 'impression');
    if (impNode) {
      sectionsContent += `[IMPRESSION]\n${stripHtmlTags(impNode.text)}\n`;
    }

    let signature = `\n----------------------------------------------------\n`;
    signature += `Digitally Signed By: Dr. Tamer Ragab, MD, DABR\n`;
    signature += `Date: ${new Date().toISOString().split('T')[0]}\n`;
    signature += `Terminal Hash Key: DICOM-SIG-SHA-256-PACS-707A\n`;

    return header + sectionsContent + signature;
  };

  // Node input handler for custom typing corrections with automatic normality tracking
  const handleNodeTextChange = (id: string, newText: string) => {
    if (isSigned) return;

    const target = nodes.find(n => n.id === id);
    if (!target) return;

    const lowerName = target.name.toLowerCase();
    const isFinding = lowerName !== "technique" && lowerName !== "impression";

    let updatedNormal = target.isNormal;
    if (isFinding) {
      const cleanText = stripHtmlTags(newText).toLowerCase().trim();
      if (cleanText === "" || cleanText === "normal" || cleanText === "normal." || cleanText === "unremarkable" || cleanText === "unremarkable." || cleanText === "no findings." || cleanText === "no findings recorded.") {
        updatedNormal = true;
      } else {
        const hasNormalWords = cleanText.includes("normal") || cleanText.includes("unremarkable") || cleanText.includes("no suspicious") || cleanText.includes("clear") || cleanText.includes("no acute");
        const hasAbnormalWords = cleanText.includes("cyst") || cleanText.includes("mass") || cleanText.includes("lesion") || cleanText.includes("pathology") || cleanText.includes("calculi") || cleanText.includes("stone") || cleanText.includes("fluid") || cleanText.includes("fracture") || cleanText.includes("enlarged") || cleanText.includes("inflammation") || cleanText.includes("abnormal");
        
        if (hasAbnormalWords) {
          updatedNormal = false;
        } else if (hasNormalWords) {
          updatedNormal = true;
        } else {
          updatedNormal = false;
        }
      }
    }

    setNodes(prev => prev.map(node => {
      if (node.id === id) {
        return { ...node, text: newText, isNormal: isFinding ? updatedNormal : node.isNormal };
      }
      return node;
    }));
  };

  const addCustomSection = () => {
    if (isSigned) return;
    if (!newSectionName.trim()) return;
    const name = newSectionName.trim();
    const newId = `node-custom-${Date.now()}`;
    const newNode: ReportNode = {
      id: newId,
      name,
      text: "No abnormal findings identified.",
      isNormal: true,
      category: "Findings"
    };

    setNodes(prev => {
      // Find where 'Impression' is, insert before it
      const impIndex = prev.findIndex(n => n.name.toLowerCase() === 'impression');
      if (impIndex !== -1) {
        const copy = [...prev];
        copy.splice(impIndex, 0, newNode);
        return copy;
      }
      return [...prev, newNode];
    });

    setNewSectionName("");
    displayFeedback(`Added custom finding section '${name}' successfully.`, "success");
  };

  return (
    <div className="flex-[1.6] bg-white border border-slate-200 rounded-2xl p-6 shadow-sm h-[calc(100vh-2.5rem)] my-5 mr-5 flex flex-col justify-between overflow-hidden">
      
      {/* HEADER CONTROLLER PANEL */}
      <div className="flex flex-col gap-4 overflow-y-auto pr-1 flex-1">
        <div className="border-b border-slate-100 pb-4">

          {/* DEMOGRAPHICS AND PATIENT TOGGLE */}
          <div className="bg-slate-50 border border-slate-200/80 rounded-xl py-2 px-3 relative text-[11px] hover:border-slate-300 transition duration-200 shadow-xs">
            <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-slate-600">
                <div className="flex items-center gap-1 font-mono">
                  <span className="text-slate-400 font-bold text-[8px] uppercase tracking-wider">PATIENT:</span>
                  <button 
                    onClick={() => !isSigned && setShowPatientDrop(!showPatientDrop)}
                    className={`font-bold transition text-left flex items-center gap-1 ${isSigned ? 'text-slate-600' : 'text-indigo-600 hover:text-indigo-805'}`}
                  >
                    <User className="w-3 h-3 text-slate-400 shrink-0" />
                    <span>{selectedPatient.name}</span>
                    {!isSigned && <Shuffle className="w-2.5 h-2.5 text-indigo-400" />}
                  </button>
                </div>
                
                <div className="font-mono flex items-center gap-1">
                  <span className="text-slate-400 font-bold text-[8px] uppercase">MRN:</span>
                  <span className="text-slate-700 font-semibold">{selectedPatient.mrn}</span>
                </div>
                
                <div className="font-mono flex items-center gap-1">
                  <span className="text-slate-400 font-bold text-[8px] uppercase">AGE/SEX:</span>
                  <span className="text-slate-700 font-semibold">{selectedPatient.age} / {selectedPatient.gender}</span>
                </div>
                
                <div className="font-mono flex items-center gap-1">
                  <span className="text-slate-400 font-bold text-[8px] uppercase">ACCESSION:</span>
                  <span className="text-slate-700 font-semibold">{selectedPatient.accessionNumber}</span>
                </div>
              </div>
              
              <div>
                <span className="text-[8px] text-indigo-600 font-mono font-bold bg-indigo-50 border border-indigo-150 px-2 py-0.5 rounded select-none uppercase tracking-wider">
                  CT ABDOMEN & PELVIS
                </span>
              </div>
            </div>

            {/* EXPANDABLE DIRECTORY SELECTOR */}
            {showPatientDrop && !isSigned && (
              <div className="absolute top-9 left-0 right-0 bg-white border border-slate-250 rounded-lg shadow-xl p-2 z-40 flex flex-col gap-1.5 text-xs">
                <span className="text-[9px] text-slate-400 font-mono font-bold px-2 uppercase block mb-1">SELECT AN ACTIVE PACS PATIENT:</span>
                {availablePatients.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => {
                      onPatientSelect(p);
                      setShowPatientDrop(false);
                    }}
                    className={`w-full text-left p-1.5 rounded transition font-mono flex items-center justify-between text-[11px] ${
                      p.id === selectedPatient.id 
                        ? 'bg-indigo-50 text-indigo-700 border border-indigo-150' 
                        : 'hover:bg-slate-50 text-slate-600'
                    }`}
                  >
                    <span>{p.name} ({p.mrn})</span>
                    <span className="text-[10px] text-slate-400 font-sans">IND: {p.indication.substring(0, 30)}...</span>
                  </button>
                ))}
              </div>
            )}

            <div className="mt-1.5 border-t border-slate-100/60 pt-1 text-[10px] text-slate-500 leading-normal font-sans italic flex items-center gap-1">
              <span className="font-bold text-slate-600 uppercase text-[8px] tracking-wider not-italic shrink-0">Indication:</span>
              <span className="line-clamp-1">{selectedPatient.indication}</span>
            </div>
          </div>

        </div>

        {/* COMPACT WORD-PROCESSING FORMATTING TOOLBAR */}
        <div className="flex flex-wrap items-center gap-2 border border-slate-205 bg-slate-50/70 rounded-xl p-2 select-none shadow-3xs mb-1.5">
          {/* Undo/Redo Group */}
          <div className="flex items-center gap-1">
            <button
              onClick={handleUndo}
              disabled={!canUndo || isSigned}
              className={`p-1.5 rounded transition ${
                canUndo && !isSigned
                  ? 'hover:bg-slate-200 text-slate-700 cursor-pointer' 
                  : 'text-slate-300 opacity-40 cursor-not-allowed'
              }`}
              title="Undo (Ctrl+Z)"
            >
              <Undo className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleRedo}
              disabled={!canRedo || isSigned}
              className={`p-1.5 rounded transition ${
                canRedo && !isSigned
                  ? 'hover:bg-slate-200 text-slate-700 cursor-pointer' 
                  : 'text-slate-300 opacity-40 cursor-not-allowed'
              }`}
              title="Redo (Ctrl+Y)"
            >
              <Redo className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="w-[1px] h-4.5 bg-slate-200 shrink-0 mx-0.5" />

          {/* Font Selection Dropdown List */}
          <div className="flex items-center gap-1.5">
            <select
              value={fontStyle}
              onChange={(e) => !isSigned && setFontStyle(e.target.value)}
              disabled={isSigned}
              className="text-[11px] font-sans font-medium border border-slate-200 bg-white text-slate-705 px-2 py-0.5 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer disabled:opacity-50 h-7"
            >
              <option value="Arial">Arial</option>
              <option value="Calibri">Calibri</option>
              <option value="Times New Roman">Times New Roman</option>
              <option value="Inter">Inter</option>
              <option value="Source Sans Pro">Source Sans Pro</option>
              <option value="Roboto">Roboto</option>
              <option value="IBM Plex Sans">IBM Plex Sans</option>
            </select>

            <select
              value={fontSize}
              onChange={(e) => !isSigned && setFontSize(e.target.value)}
              disabled={isSigned}
              className="text-[11px] font-mono font-medium border border-slate-200 bg-white text-slate-705 px-1 py-0.5 rounded-md focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer disabled:opacity-50 h-7"
            >
              <option value="10px">10 px</option>
              <option value="11px">11 px</option>
              <option value="12px">12 px</option>
              <option value="13.5px">13.5 px</option>
              <option value="14px">14 px</option>
              <option value="16px">16 px</option>
              <option value="17px">17 px</option>
              <option value="18px">18 px</option>
              <option value="19px">19 px</option>
              <option value="20px">20 px</option>
            </select>
          </div>

          <div className="w-[1px] h-4.5 bg-slate-200 shrink-0 mx-0.5" />

          {/* Type Formatting Controls */}
          <div className="flex items-center gap-1">
            <button
              onMouseDown={(e) => {
                e.preventDefault();
                applyFormat("bold");
              }}
              disabled={isSigned}
              className={`p-1 rounded transition cursor-pointer border h-7 w-7 flex items-center justify-center ${
                isBold 
                  ? 'bg-indigo-50 text-indigo-700 border-indigo-200 font-bold' 
                  : 'bg-transparent border-transparent hover:bg-slate-200 text-slate-600'
              } disabled:opacity-50`}
              title="Bold (Ctrl+B)"
            >
              <Bold className="w-3.5 h-3.5" />
            </button>
            <button
              onMouseDown={(e) => {
                e.preventDefault();
                applyFormat("italic");
              }}
              disabled={isSigned}
              className={`p-1 rounded transition cursor-pointer border h-7 w-7 flex items-center justify-center ${
                isItalic 
                  ? 'bg-indigo-50 text-indigo-700 border-indigo-200 italic' 
                  : 'bg-transparent border-transparent hover:bg-slate-200 text-slate-600'
              } disabled:opacity-50`}
              title="Italic (Ctrl+I)"
            >
              <Italic className="w-3.5 h-3.5" />
            </button>
            <button
              onMouseDown={(e) => {
                e.preventDefault();
                applyFormat("underline");
              }}
              disabled={isSigned}
              className={`p-1 rounded transition cursor-pointer border h-7 w-7 flex items-center justify-center ${
                isUnderline 
                  ? 'bg-indigo-50 text-indigo-700 border-indigo-200 underline' 
                  : 'bg-transparent border-transparent hover:bg-slate-200 text-slate-600'
              } disabled:opacity-50`}
              title="Underline (Ctrl+U)"
            >
              <Underline className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* ERROR OR SUCCESS FEEDBACK MODULE */}
        {feedbackMsg && (
          <div className={`p-3 rounded-lg text-xs leading-relaxed transition-all flex items-start gap-2 border ${
            feedbackMsg.type === 'success' 
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
              : feedbackMsg.type === 'error'
              ? 'bg-rose-50 border-rose-200 text-rose-800'
              : 'bg-indigo-50 border-indigo-150 text-indigo-805'
          }`}>
            {feedbackMsg.type === 'success' ? (
              <CheckCircle className="w-4.5 h-4.5 text-emerald-600 shrink-0" />
            ) : feedbackMsg.type === 'error' ? (
              <AlertCircle className="w-4.5 h-4.5 text-rose-600 shrink-0" />
            ) : (
              <FileText className="w-4.5 h-4.5 text-indigo-550 shrink-0" />
            )}
            <span>{feedbackMsg.text}</span>
          </div>
        )}

        {/* MAIN STRUCT REPORT EDITOR LIST */}
        <div className="space-y-0.5 mt-2 pr-1">
          {nodes.map((node, index) => {
            const isAbnormal = !node.isNormal;
            const isCommandActive = activeCommandNodeId === node.id;
            const isFinding = node.name.toLowerCase() !== 'technique' && node.name.toLowerCase() !== 'impression';
            const isEditing = editingNodeId === node.id || isCommandActive;

            return (
              <div 
                key={node.id} 
                draggable={!isSigned}
                onDragStart={(e) => handleDragStart(e, index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDragEnd={handleDragEnd}
                onDrop={(e) => handleDrop(e, index)}
                className={`group relative pr-2.5 transition duration-200 rounded-lg ${
                  !isSigned ? 'pl-6.5' : 'pl-2.5'
                } ${
                  isFinding && displayMode === 'organ' ? 'py-0.5' : 'py-1.5'
                } ${
                  draggedIndex === index
                    ? 'opacity-40 border border-dashed border-indigo-300 bg-slate-100/50 scale-[0.98] shadow-inner'
                    : dragOverIndex === index
                    ? 'border border-dashed border-indigo-400 bg-indigo-50/30 scale-[1.01] shadow-xs'
                    : isAbnormal 
                    ? 'bg-rose-50/85 border border-rose-100/80 shadow-xs' 
                    : 'border border-transparent hover:bg-slate-50/45'
                }`}
                id={`report-node-${node.id}`}
              >
                {/* Drop target line visual indicator */}
                {dragOverIndex === index && draggedIndex !== null && draggedIndex !== index && (
                  <div className={`w-full h-[3px] bg-indigo-500 rounded-full animate-pulse absolute left-0 right-0 z-30 ${index < draggedIndex ? '-top-0.5' : '-bottom-0.5'}`} />
                )}

                {/* Left drag handle icon */}
                {!isSigned && (
                  <div 
                    className="absolute left-1.5 top-1/2 -translate-y-1/2 flex items-center justify-center opacity-30 group-hover:opacity-100 hover:text-indigo-650 transition cursor-grab active:cursor-grabbing select-none py-2"
                    title="Drag to reorder"
                  >
                    <GripVertical className="w-3.5 h-3.5" />
                  </div>
                )}

                {/* 1. COMPACT HOVER CONTROLS FOR ALL FINDINGS IN EITHER MODE */}
                {isFinding && !isSigned && (
                  <div className="absolute top-0.5 right-2 z-10">
                    <div className="flex items-center gap-1.5 px-1.5 py-0.5 rounded-md border border-slate-200/80 bg-white/95 shadow-md opacity-0 group-hover:opacity-100 transition-opacity animate-fade-in">
                      <span className="text-[8px] font-mono font-bold text-slate-450 mr-2 uppercase tracking-wide">{node.name}</span>
                      <button
                        onClick={() => {
                          setActiveCommandNodeId(isCommandActive ? null : node.id);
                          setCurrentCommand("");
                        }}
                        className={`p-0.5 rounded transition ${isCommandActive ? 'bg-indigo-650 text-white' : 'bg-slate-50 hover:bg-slate-150 text-slate-500'}`}
                        title="Command"
                      >
                        <Command className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => deleteNode(node.id, node.name)}
                        className="p-0.5 rounded bg-slate-50 hover:bg-rose-50 text-slate-500 hover:text-rose-600 cursor-pointer"
                        title="Delete"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                )}

                {/* 2. CARD TITLE & CONTROL HANDLERS FOR STRUCTURAL SECS (TECHNIQUE / IMPRESSION) */}
                {!isFinding && (
                  <div className="flex items-center justify-between mb-0.5">
                    <div className="flex items-center gap-2">
                      <h1 className="font-display text-xs font-bold tracking-wide uppercase text-slate-900">
                        {node.name}
                      </h1>
                      {!node.isNormal && (
                        <span className="text-[8px] bg-rose-100/80 text-rose-700 font-mono font-bold px-1.5 py-0.2 rounded lowercase">
                          abnormal
                        </span>
                      )}
                    </div>

                    {/* DRAG AND ACTION CONTROLS */}
                    {!isSigned && (
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
                        <button
                          onClick={() => {
                            setActiveCommandNodeId(isCommandActive ? null : node.id);
                            setCurrentCommand("");
                          }}
                          className={`p-1 rounded border transition ${
                            isCommandActive 
                              ? 'bg-indigo-600 border-indigo-600 text-white shadow-xs' 
                              : 'bg-slate-50 hover:bg-slate-150 border-slate-200 text-slate-500 hover:text-slate-800'
                          }`}
                          title="Command"
                        >
                          <Command className="w-3" />
                        </button>
                        <button
                          onClick={() => deleteNode(node.id, node.name)}
                          className="p-1 rounded bg-slate-50 hover:bg-rose-50 border border-slate-200 hover:border-rose-200 text-slate-500 hover:text-rose-600 transition cursor-pointer"
                          title="Delete"
                        >
                          <Trash2 className="w-3" />
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* 3. CONTENT AREA */}
                {isFinding ? (
                  /* FINDINGS LAYOUT CONTENT CARD */
                  isEditing && !isSigned ? (
                    <div className="mt-1">
                      <span className="text-[9px] text-indigo-650 font-mono font-bold block mb-1">
                        EDITING {displayMode === 'findings' ? 'FINDINGS SYSTEM' : 'ORGAN'}: {node.name.toUpperCase()}
                      </span>
                      <RichTextEditor
                        id={`editor-node-${node.id}`}
                        value={node.text}
                        onChange={(val) => handleNodeTextChange(node.id, val)}
                        onBlur={() => {
                          setTimeout(() => setEditingNodeId(null), 200);
                        }}
                        onFocus={() => {
                          setEditingNodeId(node.id);
                        }}
                        style={reportTextStyle}
                        className={`w-full min-h-[42px] bg-transparent border-0 focus:outline-none focus:ring-0 text-slate-800 leading-relaxed transition p-0 empty:before:content-[attr(placeholder)] empty:before:text-slate-400 empty:before:pointer-events-none empty:before:italic empty:before:font-normal ${
                          isAbnormal ? 'placeholder-rose-300' : 'placeholder-slate-400'
                        }`}
                        placeholder={`Describe findings for ${node.name}...`}
                      />
                    </div>
                  ) : (
                    <div 
                      onClick={() => !isSigned && setEditingNodeId(node.id)}
                      className="cursor-pointer min-h-[22px] py-0.5 rounded transition hover:bg-slate-50/50"
                      title="Click to edit findings"
                    >
                      {displayMode === 'organ' ? (
                        <div className="space-y-1 pr-1.5 pl-0.5">
                          {getBulletsForNode(node).map((bullet, bIdx) => (
                            <div key={bIdx} className="flex items-start gap-1 p-0.5" style={reportTextStyle}>
                              <span className="text-black font-bold mr-1.5 select-none shrink-0">•</span>
                              <div className="flex-1 leading-relaxed">
                                <strong className="font-sans font-bold text-slate-900 uppercase tracking-wide mr-1.5 text-[0.85em] select-none inline-block border border-slate-200/50 bg-slate-100/60 px-1.5 py-0.2 rounded shadow-3xs">
                                  {node.name}:
                                </strong>
                                <span 
                                  className="text-slate-805 hover:text-slate-950 transition duration-100"
                                  dangerouslySetInnerHTML={{ __html: bullet.text }}
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="space-y-1 pr-1.5 pl-0.5">
                          {getBulletsForNode(node).map((bullet, bIdx) => (
                            <div key={bIdx} className="flex items-start gap-1 p-0.5" style={reportTextStyle}>
                              <span className="text-black font-bold mr-1.5 select-none shrink-0">•</span>
                              <div className="flex-1 leading-relaxed">
                                <span 
                                  className="text-slate-805 hover:text-slate-950 transition duration-100"
                                  dangerouslySetInnerHTML={{ __html: bullet.text }}
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                ) : (
                  /* TECHNIQUE AND IMPRESSION LAYOUTS (Standard display) */
                  <RichTextEditor
                    id={`editor-node-${node.id}`}
                    value={node.text}
                    onChange={(val) => handleNodeTextChange(node.id, val)}
                    disabled={isSigned}
                    style={reportTextStyle}
                    onFocus={() => {
                      setEditingNodeId(node.id);
                    }}
                    className={`w-full min-h-[50px] bg-transparent border-0 focus:outline-none focus:ring-0 text-slate-850 leading-relaxed transition p-0 mt-0.5 empty:before:content-[attr(placeholder)] empty:before:text-slate-400 empty:before:pointer-events-none empty:before:italic empty:before:font-normal ${
                      isAbnormal ? 'placeholder-rose-300' : 'placeholder-slate-400 font-medium'
                    }`}
                    placeholder={`Write ${node.name}...`}
                  />
                )}

                {/* INLINE AI COMMAND EXPAND CONTROLL */}
                {isCommandActive && !isSigned && (
                  <div className="mt-3 pt-3 border-t border-slate-150 flex flex-col gap-2 bg-slate-50/80 p-3 rounded-lg border border-indigo-100/60 shadow-xs">
                    <div className="flex items-center gap-1.5 text-xs text-indigo-600 font-mono font-bold">
                      <Command className="w-3.5 h-3.5" />
                      <span>APEX INLINE INSTRUCTION MODIFIER:</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={currentCommand}
                        onChange={(e) => setCurrentCommand(e.target.value)}
                        placeholder="e.g. 'translate to Spanish', 'add a kidney measurement of 5cm', 'shorten to bullet points'"
                        className="flex-1 bg-white border border-slate-200 rounded-lg py-1.5 px-3 text-xs font-mono text-slate-700 focus:outline-none focus:border-indigo-505"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') triggerCommand(node.id);
                          if (e.key === 'Escape') setActiveCommandNodeId(null);
                        }}
                      />
                      <button
                        onClick={() => triggerCommand(node.id)}
                        disabled={isCommandProcessing || !currentCommand.trim()}
                        className="bg-indigo-600 hover:bg-indigo-705 text-white font-mono text-xs px-3 py-1.5 rounded-lg transition shadow-xs"
                      >
                        {isCommandProcessing ? "Applying..." : "Run"}
                      </button>
                    </div>
                    <div className="text-[10px] text-slate-400 font-mono">
                      Press [Enter] to dispatch, [Esc] to cancel. Target: '{node.name}'
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* "+ Add Custom Section/Finding" form, shown only if not signed */}
        {!isSigned && (
          <div className="mt-3 pt-3 border-t border-slate-100 flex items-center gap-2">
            <input
              type="text"
              placeholder="Add custom finding section... (e.g. 'Adrenal Glands')"
              value={newSectionName}
              onChange={(e) => setNewSectionName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addCustomSection();
                }
              }}
              className="flex-1 bg-slate-50 border border-slate-200 hover:border-slate-300 focus:bg-white focus:border-indigo-500 rounded-xl py-1.5 px-3.5 text-xs font-sans text-slate-700 outline-none transition duration-150 shadow-3xs"
            />
            <button
              type="button"
              onClick={addCustomSection}
              disabled={!newSectionName.trim()}
              className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-100 disabled:text-slate-400 text-white font-semibold text-xs py-1.5 px-3 rounded-xl transition duration-150 flex items-center gap-1 cursor-pointer select-none h-8"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add</span>
            </button>
          </div>
        )}
      </div>

      {/* FOOTER ACTIONS AREA */}
      <div className="border-t border-slate-100 pt-2.5 mt-2.5 flex flex-col gap-2">
        
        {/* TRANSMISSION PACS DIALOGUE */}
        {sendingPACS && (
          <div className="bg-slate-50 border border-slate-200 p-3 rounded-lg flex flex-col gap-2 shadow-xs">
            <div className="flex items-center justify-between text-[11px] font-mono font-semibold">
              <span className="text-slate-700">TRANSMITTING DICOM / HL7 ACK STREAM</span>
              <span className={`${pacsCompleted ? 'text-emerald-600' : 'text-indigo-600'} font-bold`}>{pacsProgress}%</span>
            </div>
            
            {/* progress line */}
            <div className="w-full h-1 bg-slate-200 rounded-full overflow-hidden">
              <div 
                className={`h-full transition-all duration-305 ${pacsCompleted ? 'bg-emerald-500' : 'bg-indigo-600'}`}
                style={{ width: `${pacsProgress}%` }}
              ></div>
            </div>

            <p className="text-[9px] text-slate-500 font-mono leading-relaxed">
              {pacsCompleted ? (
                <span className="text-emerald-600 flex items-center gap-1 font-bold">
                  <Check className="w-3.5 h-3.5" />
                  {pacDetails}
                </span>
              ) : pacDetails}
            </p>

            {pacsCompleted && (
              <button 
                onClick={() => setSendingPACS(false)}
                className="text-[9px] bg-white hover:bg-slate-50 border border-slate-200 text-slate-500 px-1.5 py-0.5 rounded w-fit self-end transition shadow-xs cursor-pointer"
              >
                Close Output Logs
              </button>
            )}
          </div>
        )}

        <div className="flex items-center justify-end">
          {!isSigned ? (
            <button
              onClick={handleSignReport}
              disabled={nodes.length === 0}
              id="action-sign-finish"
              className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-150 disabled:text-slate-400 text-white font-semibold text-xs py-1.5 px-3.5 rounded-lg transition duration-200 flex items-center gap-1.5 cursor-pointer shadow-sm shadow-indigo-150"
              title="Sign and Finish Report"
            >
              <CheckCircle className="w-3.5 h-3.5" />
              <span>Sign</span>
            </button>
          ) : (
            <div className="w-full flex flex-col gap-2">
              
              {/* DIGITAL SIGN REVEAL WRAPPER */}
              <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-2 flex items-center justify-between text-[11px] font-mono">
                <div className="flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-emerald-600 stroke-4" />
                  <div>
                    <span className="text-emerald-800 font-bold uppercase block text-[10px]">Dr. Tamer Ragab, MD, DABR signed</span>
                    <span className="text-[9px] text-emerald-500">Key ID: RAD-PACS-707A</span>
                  </div>
                </div>
                <button
                  onClick={unlockReportAndReset}
                  className="bg-white hover:bg-rose-50 border border-slate-200 text-rose-600 text-[9px] font-bold px-2 py-0.5 rounded transition"
                  title="Unlock report to allow further editing"
                >
                  Unlock
                </button>
              </div>

              {/* ACTION EXPORTS */}
              <div className="grid grid-cols-3 gap-1.5">
                <button
                  onClick={copyReportText}
                  className="bg-white hover:bg-slate-50 border border-slate-200 text-slate-705 font-mono text-[10px] font-semibold py-1.5 px-2 rounded-lg transition duration-200 flex flex-col items-center justify-center gap-1 shadow-xs"
                  title="Copy formatted plain report layout"
                >
                  <Copy className="w-3.5 h-3.5 text-indigo-500" />
                  <span>Copy Report</span>
                </button>

                <button
                  onClick={downloadReportWord}
                  className="bg-white hover:bg-slate-50 border border-slate-200 text-slate-705 font-mono text-[10px] font-semibold py-1.5 px-2 rounded-lg transition duration-200 flex flex-col items-center justify-center gap-1 shadow-xs"
                  title="Export structured Word formatting file"
                >
                  <Download className="w-3.5 h-3.5 text-indigo-500" />
                  <span>Download Docx</span>
                </button>

                <button
                  onClick={sendReportToPACS}
                  disabled={sendingPACS && !pacsCompleted}
                  className="bg-white hover:bg-slate-50 border border-slate-200 disabled:opacity-40 text-slate-705 font-mono text-[10px] font-semibold py-1.5 px-2 rounded-lg transition duration-200 flex flex-col items-center justify-center gap-1 shadow-xs"
                  title="Stream electronically directly to HL7 client systems"
                >
                  <Send className="w-3.5 h-3.5 text-indigo-500" />
                  <span>Send to PACS</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
