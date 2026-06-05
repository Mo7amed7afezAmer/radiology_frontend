import React, { useState, useEffect } from "react";
import Sidebar from "./components/Sidebar";
import ScribePanel from "./components/ScribePanel";
import ReportPanel from "./components/ReportPanel";
import TemplatesPanel from "./components/TemplatesPanel";
import { Patient, ReportNode, RadiologyReport, RestructuringMode, TemplateId, ClinicalTemplate, AppTab, ReportInsertionMode } from "./types";
import { MOCK_PATIENTS, TEMPLATE_NODES } from "./data";
import { BookOpen, Calendar, HelpCircle, Layers, CheckCircle, Clock, Search, Database, HardDrive, ShieldCheck, Terminal, Trash2, AlertCircle, Plus, Upload, RefreshCw } from "lucide-react";

const DEFAULT_TEMPLATES: ClinicalTemplate[] = [
  {
    id: "ct_abdomen_pelvis",
    name: "CT Abdomen/Pelvis Standard",
    createdAt: "2026-05-15",
    lastModifiedAt: "2026-05-30",
    type: "System Template",
    nodes: TEMPLATE_NODES.ct_abdomen_pelvis
  },
  {
    id: "ct_chest",
    name: "CT Chest Standard",
    createdAt: "2026-05-15",
    lastModifiedAt: "2026-05-30",
    type: "System Template",
    nodes: TEMPLATE_NODES.ct_chest
  },
  {
    id: "mri_brain",
    name: "MRI Brain Protocol",
    createdAt: "2026-05-15",
    lastModifiedAt: "2026-05-30",
    type: "System Template",
    nodes: TEMPLATE_NODES.mri_brain
  },
  {
    id: "default",
    name: "General Minimal Scriptor",
    createdAt: "2026-05-15",
    lastModifiedAt: "2026-05-30",
    type: "System Template",
    nodes: TEMPLATE_NODES.default
  }
];

export default function App() {
  const [activeTab, setActiveTab] = useState<AppTab>('new-report');
  const [sessionResetKey, setSessionResetKey] = useState<number>(0);
  
  // Active state context
  const [selectedPatient, setSelectedPatient] = useState<Patient>(MOCK_PATIENTS[0]);
  const [templateId, setTemplateId] = useState<TemplateId>('ct_abdomen_pelvis');
  
  // Dynamic template repository
  const [templates, setTemplates] = useState<ClinicalTemplate[]>(() => {
    try {
      const saved = localStorage.getItem("apex_templates");
      return saved ? JSON.parse(saved) : DEFAULT_TEMPLATES;
    } catch (e) {
      console.error("Failed to load templates from localStorage", e);
      return DEFAULT_TEMPLATES;
    }
  });

  const [nodesInternal, setNodesInternal] = useState<ReportNode[]>([]);
  const setNodes = React.useCallback<React.Dispatch<React.SetStateAction<ReportNode[]>>>((value) => {
    setNodesInternal(prev => {
      const resolved = typeof value === 'function' ? (value as Function)(prev) : value;
      if (!Array.isArray(resolved)) return resolved;
      const seen = new Set<string>();
      return resolved.filter(node => {
        const id = node?.id || `node-gen-${Math.floor(Math.random() * 1000000)}`;
        if (seen.has(id)) {
          return false;
        }
        seen.add(id);
        return true;
      });
    });
  }, []);
  const nodes = nodesInternal;
  const [isSigned, setIsSigned] = useState<boolean>(false);
  const [restructuringMode, setRestructuringMode] = useState<RestructuringMode>(() => {
    try {
      const saved = localStorage.getItem("apex_restructuring_mode") as RestructuringMode;
      return ['order', 'concise', 'academic', 'personalized'].includes(saved) ? saved : 'concise';
    } catch (e) {
      return 'concise';
    }
  });

  const [styleProfileText, setStyleProfileText] = useState<string>(() => {
    try {
      return localStorage.getItem("apex_style_profile_text") || "";
    } catch (e) {
      return "";
    }
  });

  const [uploadedReports, setUploadedReports] = useState<{ name: string; size: number }[]>(() => {
    try {
      const saved = localStorage.getItem("apex_uploaded_reports_metadata");
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  const [isTraining, setIsTraining] = useState<boolean>(false);
  const [trainingError, setTrainingError] = useState<string>("");
  const [trainingSuccessMsg, setTrainingSuccessMsg] = useState<string>("");

  const [usingRealGemini, setUsingRealGemini] = useState<boolean>(false);
  const [displayMode, setDisplayMode] = useState<'organ' | 'findings'>('organ');
  const [isRetrievingReport, setIsRetrievingReport] = useState<boolean>(false);
  const [reportInsertionMode, setReportInsertionMode] = useState<ReportInsertionMode>(() => {
    try {
      const saved = localStorage.getItem("apex_report_insertion_mode");
      return (saved === "automatic" || saved === "manual") ? saved as ReportInsertionMode : "manual";
    } catch (e) {
      return "manual";
    }
  });

  const handleUploadTrainingReports = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsTraining(true);
    setTrainingError("");
    setTrainingSuccessMsg("");

    const newMetadata: { name: string; size: number }[] = [...uploadedReports];
    const rawFilesPayload: { fileBase64: string; fileName: string }[] = [];
    const fileListArray = Array.from(files) as File[];
    
    try {
      for (const file of fileListArray) {
        const lowerName = file.name.toLowerCase();
        if (!lowerName.endsWith('.docx') && !lowerName.endsWith('.txt')) {
          throw new Error("Only .docx (Word documents) or .txt style report samples are supported.");
        }

        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => {
            const result = reader.result as string;
            const base64Str = result.split(',')[1] || result;
            resolve(base64Str);
          };
          reader.onerror = (err) => reject(err);
          reader.readAsDataURL(file);
        });

        rawFilesPayload.push({
          fileBase64: base64,
          fileName: file.name
        });

        newMetadata.push({
          name: file.name,
          size: file.size
        });
      }

      const response = await fetch("/api/analyze-training-reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ files: rawFilesPayload })
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || "Failed to analyze reports. Check server connectivity.");
      }

      const data = await response.json();
      if (data.error) {
        throw new Error(data.error);
      }

      const profileResult = data.styleProfileText || "";
      const rawTextResult = data.combinedText || "";

      localStorage.setItem("apex_style_profile_text", profileResult);
      localStorage.setItem("apex_combined_raw_training_text", rawTextResult);
      localStorage.setItem("apex_uploaded_reports_metadata", JSON.stringify(newMetadata));

      setStyleProfileText(profileResult);
      setUploadedReports(newMetadata);
      setTrainingSuccessMsg(`Successfully structured and saved profile from ${fileListArray.length} reports!`);
    } catch (err: any) {
      console.error(err);
      setTrainingError(err.message || "An error occurred during report styling training.");
    } finally {
      setIsTraining(false);
      e.target.value = "";
    }
  };

  const handleRetrainProfile = async () => {
    const combinedText = localStorage.getItem("apex_combined_raw_training_text");
    if (!combinedText) return;

    setIsTraining(true);
    setTrainingError("");
    setTrainingSuccessMsg("");

    try {
      const base64 = window.btoa(unescape(encodeURIComponent(combinedText)));
      const response = await fetch("/api/analyze-training-reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          files: [{
            fileBase64: base64,
            fileName: "CombinedHistoricalReports.txt"
          }]
        })
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || "Failed to retrain profile.");
      }

      const data = await response.json();
      const profileResult = data.styleProfileText || "";
      
      localStorage.setItem("apex_style_profile_text", profileResult);
      setStyleProfileText(profileResult);
      setTrainingSuccessMsg("Retrained and updated style profile successfully!");
    } catch (err: any) {
      setTrainingError(err.message || "Failed to retrain report style.");
    } finally {
      setIsTraining(false);
    }
  };

  const handleClearStyleProfile = () => {
    localStorage.removeItem("apex_style_profile_text");
    localStorage.removeItem("apex_combined_raw_training_text");
    localStorage.removeItem("apex_uploaded_reports_metadata");
    setStyleProfileText("");
    setUploadedReports([]);
    setTrainingError("");
    setTrainingSuccessMsg("");
  };

  // Sync templates to localStorage
  useEffect(() => {
    try {
      localStorage.setItem("apex_templates", JSON.stringify(templates));
    } catch (e) {
      console.error("Failed to save templates to localStorage", e);
    }
  }, [templates]);

  useEffect(() => {
    fetch("/api/health")
      .then(res => res.json())
      .then(data => setUsingRealGemini(!!data.usingRealGemini))
      .catch(err => console.error("Health check error:", err));
  }, []);

  // Directory states
  const [patientSearch, setPatientSearch] = useState("");
  const [themeSetting, setThemeSetting] = useState<'cosmic' | 'monochrome'>('cosmic');
  const [archivedReports, setArchivedReports] = useState<RadiologyReport[]>(() => {
    try {
      const saved = localStorage.getItem("apex_archived_reports");
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error("Failed to load archived reports structure", e);
    }
    return [
      {
        id: "rep-historical-1",
        patientId: "pat-03",
        templateId: "template",
        nodes: [
          {
            id: "node-tech",
            name: "Technique",
            text: "CT abdomen/pelvis. Scan delays optimized for renal calculi.",
            isNormal: true,
            isHeader: true
          },
          {
            id: "node-kidneys",
            name: "Kidneys & Urinary",
            text: "Right kidney shows a 3mm radiopaque calculus in the lower pole. No obstructing uropathy. Left kidney is normal.",
            isNormal: false
          },
          {
            id: "node-imp",
            name: "Impression",
            text: "1. Non-obstructive 3mm lower pole right renal calculus.\n2. No acute pelvic masses.",
            isNormal: false,
            isHeader: true
          }
        ],
        isSigned: true,
        signedAt: "2026-05-29",
        signedBy: "Dr. Tamer Ragab, MD"
      }
    ];
  });

  // Sync archivedReports to localStorage
  useEffect(() => {
    try {
      localStorage.setItem("apex_archived_reports", JSON.stringify(archivedReports));
    } catch (e) {
      console.error("Failed to sync archived reports structure", e);
    }
  }, [archivedReports]);

  // Load appropriate nodes whenever patient or template changes
  useEffect(() => {
    if (isRetrievingReport) {
      setIsRetrievingReport(false);
      return;
    }

    const key = `apex_draft_nodes_${selectedPatient.id}_${templateId}`;
    try {
      const saved = localStorage.getItem(key);
      if (saved) {
        setNodes(JSON.parse(saved));
        setIsSigned(false);
        return;
      }
    } catch (e) {
      console.error("Failed to load draft from localStorage", e);
    }

    const activeTemplate = templates.find(t => t.id === templateId) || templates[0];
    if (activeTemplate) {
      const defaultCopy = JSON.parse(JSON.stringify(activeTemplate.nodes)) as ReportNode[];
      setNodes(defaultCopy);
    }
    setIsSigned(false);
  }, [templateId, selectedPatient.id, templates]);

  // Sync draft nodes to localStorage automatically
  useEffect(() => {
    if (nodes && nodes.length > 0) {
      const key = `apex_draft_nodes_${selectedPatient.id}_${templateId}`;
      try {
        localStorage.setItem(key, JSON.stringify(nodes));
      } catch (e) {
        console.error("Failed to sync draft to localStorage", e);
      }
    }
  }, [nodes, selectedPatient.id, templateId]);

  // When a report finishes signing, add it to historical archived list
  useEffect(() => {
    if (isSigned) {
      // Find if we already archived this patient session
      const exists = archivedReports.some(r => r.patientId === selectedPatient.id && r.id === `rep-active-${selectedPatient.id}`);
      if (!exists) {
        const newReport: RadiologyReport = {
          id: `rep-active-${selectedPatient.id}`,
          patientId: selectedPatient.id,
          templateId: templateId,
          nodes: JSON.parse(JSON.stringify(nodes)),
          isSigned: true,
          signedAt: new Date().toISOString().split('T')[0],
          signedBy: "Dr. Tamer Ragab, MD, DABR"
        };
        setArchivedReports(prev => [newReport, ...prev]);
      }
    }
  }, [isSigned]);

  const handleNewReport = () => {
    // 1. Reset patient and template selections to default
    setSelectedPatient(MOCK_PATIENTS[0]);
    setTemplateId('ct_abdomen_pelvis');

    // 2. Clear all patient draft node changes in localStorage to avoid carrying over previous states
    try {
      const keysToRemove: string[] = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('apex_draft_nodes_')) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach(k => localStorage.removeItem(k));
    } catch (e) {
      console.error("Failed to clear local drafts:", e);
    }

    // 3. Reset nodes to pristine copy of default template nodes
    const activeTemplate = templates.find(t => t.id === 'ct_abdomen_pelvis') || templates[0];
    if (activeTemplate) {
      const defaultCopy = JSON.parse(JSON.stringify(activeTemplate.nodes)) as ReportNode[];
      setNodes(defaultCopy);
    }

    // 4. Reset inputs, filters, restructuring settings, and signature state
    setIsSigned(false);
    setRestructuringMode('concise');
    setDisplayMode('organ');
    setPatientSearch("");
    setIsRetrievingReport(false);

    // 5. Force React unmount/remount of active scribe/editor components to reset internal states
    setSessionResetKey(prev => prev + 1);

    // 6. Direct user back to the new-report tab
    setActiveTab('new-report');
  };

  const handleActivePatientSelect = (p: Patient) => {
    setSelectedPatient(p);
    setActiveTab('new-report');
  };

  const getPatientName = (pId: string) => {
    const p = MOCK_PATIENTS.find(pt => pt.id === pId);
    return p ? p.name : "Unknown Patient";
  };

  const getPatientMRN = (pId: string) => {
    const p = MOCK_PATIENTS.find(pt => pt.id === pId);
    return p ? p.mrn : "MRN-UNKNOWN";
  };

  const filteredPatients = MOCK_PATIENTS.filter(p => 
    p.name.toLowerCase().includes(patientSearch.toLowerCase()) || 
    p.mrn.toLowerCase().includes(patientSearch.toLowerCase()) ||
    p.indication.toLowerCase().includes(patientSearch.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#f4ede2] text-slate-800 flex overflow-hidden">
      
      {/* FLOATING LEFT SIDEBAR */}
      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={(tabId) => {
          if (tabId === 'new-report') {
            handleNewReport();
          } else {
            setActiveTab(tabId);
          }
        }} 
        reportCount={archivedReports.length} 
      />

      {/* DYNAMIC LEFT MAIN CONTAINER */}
      <main className="flex-1 flex gap-5 overflow-hidden pl-5 pr-5 h-screen">
        
        {/* NEW SCRIBE TAB: Dictation (Middle) + Report (Right) */}
        {activeTab === 'new-report' && (
          <>
            <ScribePanel 
              key={`${sessionResetKey}_scribe`}
              restructuringMode={restructuringMode}
              reportInsertionMode={reportInsertionMode}
              onRestructureComplete={(updatedNodes, changes) => {
                setNodes(updatedNodes);
              }}
              currentNodes={nodes}
              templateId={templateId}
              setTemplateId={setTemplateId}
              templates={templates}
              isSigned={isSigned}
              usingRealGemini={usingRealGemini}
              displayMode={displayMode}
              setDisplayMode={setDisplayMode}
              onNewReport={handleNewReport}
            />
            
            <ReportPanel 
              key={`${sessionResetKey}_report`}
              nodes={nodes}
              setNodes={setNodes}
              selectedPatient={selectedPatient}
              isSigned={isSigned}
              setIsSigned={setIsSigned}
              onPatientSelect={handleActivePatientSelect}
              availablePatients={MOCK_PATIENTS}
              displayMode={displayMode}
              setDisplayMode={setDisplayMode}
              onNewReport={handleNewReport}
              restructuringMode={restructuringMode}
            />
          </>
        )}

        {/* STUDY REPORT TEMPLATES TAB */}
        {activeTab === 'templates' && (
          <TemplatesPanel 
            templates={templates}
            setTemplates={setTemplates}
            activeTemplateId={templateId}
            setActiveTemplateId={setTemplateId}
            setActiveTab={setActiveTab}
            usingRealGemini={usingRealGemini}
          />
        )}

        {/* REPORTS ARCHIVE WORKLIST TAB */}
        {activeTab === 'reports' && (
          <div className="flex-1 bg-white border border-slate-205 rounded-2xl p-6 shadow-sm m-5 overflow-y-auto flex flex-col gap-6" id="reports-tab">
            <div>
              <h2 className="font-display font-bold text-xl text-slate-800 tracking-tight flex items-center gap-2">
                <Database className="w-5.5 h-5.5 text-indigo-650" />
                PACS ARCHIVED DIAGNOSTIC WORKLIST
              </h2>
              <p className="text-slate-500 text-xs mt-1">Review finalized signatures, pending transmittals, and clinical documents</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {archivedReports.map((report) => (
                <div key={report.id} className="bg-slate-50 border border-slate-200 p-5 rounded-xl hover:border-slate-350 transition flex flex-col justify-between gap-4">
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-[9px] uppercase font-mono font-bold bg-indigo-50 text-indigo-600 border border-indigo-150 px-2 py-0.5 rounded">
                        ID: {report.id}
                      </span>
                      <span className="text-xs text-slate-400 font-mono inline-flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        Signed: {report.signedAt}
                      </span>
                    </div>

                    <h3 className="text-base font-bold text-slate-800">{getPatientName(report.patientId)}</h3>
                    <p className="text-xs text-slate-500 font-mono mt-1">MRN: {getPatientMRN(report.patientId)} • Protocol: {report.templateId === 'ct_chest' ? 'CT Chest' : report.templateId === 'mri_brain' ? 'MRI Brain' : report.templateId === 'default' ? 'General' : 'CT Abdomen/Pelvis'}</p>

                    <div className="mt-4 space-y-2 border-t border-slate-250/50 pt-3">
                      {report.nodes.map(n => {
                        const hasPathology = n.isNormal === false;
                        return (
                          <div key={n.id} className="text-xs font-sans leading-relaxed">
                            <span className={`font-mono font-bold ${hasPathology ? 'text-rose-600' : 'text-slate-505'}`}>
                              [{n.name}]:
                            </span>{" "}
                            <span className="text-slate-500 line-clamp-1 italic">{n.text}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="flex justify-between items-center border-t border-slate-250/50 pt-3.5 mt-2 text-xs">
                    <span className="text-emerald-600 font-mono flex items-center gap-1.5 font-bold">
                      <CheckCircle className="w-4 h-4 text-emerald-600" />
                      Locked & Signed
                    </span>
                    <div className="flex items-center gap-3">
                      <button 
                        onClick={() => {
                          const patient = MOCK_PATIENTS.find(p => p.id === report.patientId);
                          if (patient) {
                            setIsRetrievingReport(true);
                            setSelectedPatient(patient);
                            setTemplateId(report.templateId as any);
                            setNodes(report.nodes);
                            setIsSigned(true);
                            setActiveTab('new-report');

                            // Save retrieving state directly so it is cached
                            const key = `apex_draft_nodes_${patient.id}_${report.templateId}`;
                            try {
                              localStorage.setItem(key, JSON.stringify(report.nodes));
                            } catch (e) {
                              console.error("Failed to save retrieved report draft", e);
                            }
                          }
                        }}
                        className="text-xs text-indigo-650 hover:text-indigo-800 font-bold font-mono cursor-pointer"
                      >
                        Retrieve to Editor →
                      </button>
                      <button
                        onClick={() => {
                          if (confirm(`Are you sure you want to permanently delete report ID: ${report.id} from the PACS archive?`)) {
                            setArchivedReports(prev => prev.filter(r => r.id !== report.id));
                          }
                        }}
                        className="p-1 rounded-lg border border-slate-200 text-slate-400 hover:text-rose-600 hover:bg-rose-50 hover:border-rose-150 transition cursor-pointer"
                        title="Delete Archived Report"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* PATIENTS ARCHIVE TAB */}
        {activeTab === 'patients' && (
          <div className="flex-1 bg-white border border-slate-205 rounded-2xl p-6 shadow-sm m-5 overflow-y-auto flex flex-col gap-5" id="patients-tab">
            <div>
              <h2 className="font-display font-bold text-xl text-slate-800 tracking-tight flex items-center gap-2">
                <Search className="w-5.5 h-5.5 text-indigo-650" />
                PACS PATIENT DIRECTORY INDEX
              </h2>
              <p className="text-slate-500 text-xs mt-1">Select active outpatient or inpatient cases to initialize structured dictation transcripts</p>
            </div>

            {/* SEARCH */}
            <div className="relative">
              <input
                type="text"
                value={patientSearch}
                onChange={(e) => setPatientSearch(e.target.value)}
                placeholder="Search patient registry by Name, MRN, or Ref. Physician..."
                className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-10 text-sm focus:outline-none focus:border-indigo-500 text-slate-700 font-mono"
              />
              <Search className="absolute left-3.5 top-3.5 w-4.5 h-4.5 text-slate-400" />
            </div>

            <div className="space-y-3">
              {filteredPatients.map((patient) => (
                <div key={patient.id} className="bg-slate-50 border border-slate-205/60 hover:border-slate-300 p-4.5 rounded-xl transition duration-200 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                  <div>
                    <div className="flex items-center gap-2.5">
                      <span className="w-2.5 h-2.5 bg-indigo-600 rounded-full"></span>
                      <h3 className="font-bold text-slate-800 text-base">{patient.name}</h3>
                      <span className="text-[10px] bg-indigo-50 text-indigo-600 border border-indigo-100 font-mono px-2 py-0.5 rounded">
                        {patient.mrn}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-6 gap-y-1 text-xs text-slate-500 mt-2.5 font-mono">
                      <span><strong>Age/Sex:</strong> {patient.age} / {patient.gender}</span>
                      <span><strong>Referring MD:</strong> {patient.referringPhysician}</span>
                      <span><strong>Assn No:</strong> {patient.accessionNumber}</span>
                    </div>

                    <p className="text-xs text-slate-500 italic mt-3 bg-white border border-slate-100 p-2 rounded">
                      <strong>Reason for Study:</strong> {patient.indication}
                    </p>
                  </div>

                  <button
                    onClick={() => handleActivePatientSelect(patient)}
                    className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm font-semibold text-xs px-4 py-2 rounded-lg transition duration-200 text-center whitespace-nowrap cursor-pointer"
                  >
                    Select and Launch
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* WORKSPACE PREFERENCES TAB */}
        {activeTab === 'style' && (
          <div className="flex-1 bg-white border border-slate-205 rounded-2xl p-6 shadow-sm m-5 overflow-y-auto flex flex-col gap-6" id="style-tab">
            <div>
              <h2 className="font-display font-bold text-xl text-slate-800 tracking-tight flex items-center gap-2">
                <ShieldCheck className="w-5.5 h-5.5 text-indigo-650" />
                Apex Workspace Credentials & Settings
              </h2>
              <p className="text-slate-500 text-xs mt-1">Configure reporting credentials, dictation speed-modes, and active clinical schemas</p>
            </div>

            <div className="max-w-xl">
              {/* Dictation & AI Scriptor Scribe Modes */}
              <div className="bg-slate-50 p-5 rounded-xl border border-slate-200 flex flex-col gap-4">
                <span className="text-xs font-mono font-bold text-slate-400 uppercase">AI Scriptor Mode</span>
                
                {/* Reporting Style Preferences Section */}
                <div className="bg-white p-4 pt-4.5 rounded-xl border border-slate-205 flex flex-col gap-3">
                  <span className="text-xs font-semibold text-slate-700">Reporting Style Preferences</span>
                  <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs gap-1">
                    {(['order', 'concise', 'academic', 'personalized'] as const).map((mode) => (
                      <button
                        key={mode}
                        onClick={() => {
                          setRestructuringMode(mode);
                          localStorage.setItem("apex_restructuring_mode", mode);
                        }}
                        className={`flex-1 py-1 px-1 rounded font-semibold text-center transition cursor-pointer text-[9.5px] ${
                          restructuringMode === mode
                            ? "bg-white text-indigo-600 shadow-xs border border-slate-180 font-bold"
                            : "text-slate-500 hover:text-slate-800"
                        }`}
                      >
                        {mode === 'order' ? 'Follow Order' : 
                         mode === 'concise' ? 'Concise' : 
                         mode === 'academic' ? 'Academic' : 
                         'Personalized Style'}
                      </button>
                    ))}
                  </div>
                  <p className="text-[10px] text-slate-500 font-mono leading-relaxed mt-1">
                    {restructuringMode === 'order' && 'Follow Order: Structures findings sequentially matching exact clinical transcript order.'}
                    {restructuringMode === 'concise' && 'Concise: Synthesizes findings list into high-density diagnostic summaries.'}
                    {restructuringMode === 'academic' && 'Academic: Adheres strictly to high-standard medical taxonomy guidelines.'}
                    {restructuringMode === 'personalized' && 'Personalized Style: Learns and reproduces the radiologist\'s custom report organization, terminology, structure, and tone from uploaded reports.'}
                  </p>
                </div>

                {/* Personalized Style Configuration Subcard */}
                {restructuringMode === 'personalized' && (
                  <div className="bg-white p-5 rounded-xl border border-slate-205 flex flex-col gap-4">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                      <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">Style Profile Status</span>
                      {styleProfileText ? (
                        <span className="inline-flex items-center gap-1.5 text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/60 px-2.5 py-1 rounded-full">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-550"></span>
                          ✓ Ready
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-[10px] font-bold bg-amber-50 text-amber-600 border border-amber-250/60 px-2.5 py-1 rounded-full animate-pulse">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                          ⚠ Training Required
                        </span>
                      )}
                    </div>

                    {/* Upload dropzone */}
                    <div className="border border-dashed border-slate-200 rounded-xl p-5 bg-slate-50/50 flex flex-col items-center justify-center text-center gap-2 relative hover:bg-slate-50 transition min-h-[110px]">
                      <input
                        type="file"
                        id="training-reports-uploader"
                        multiple
                        accept=".docx,.txt"
                        onChange={handleUploadTrainingReports}
                        disabled={isTraining}
                        className="absolute inset-0 opacity-0 cursor-pointer disabled:cursor-not-allowed"
                      />
                      <div className="w-10 h-10 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 mb-1 shadow-sm">
                        {isTraining ? (
                          <span className="w-4 h-4 border-2 border-indigo-600/30 border-t-indigo-600 rounded-full animate-spin"></span>
                        ) : (
                          <Upload className="w-4 h-4 text-indigo-500" />
                        )}
                      </div>
                      <div className="text-[11.5px] font-bold text-slate-750">
                        {isTraining ? "Analyzing Reports..." : "Upload Training Reports"}
                      </div>
                      <p className="text-[9.5px] text-slate-400 max-w-[280px] leading-normal">
                        Select one or more historical radiation/radiology reports (.docx or .txt) written by this doctor.
                      </p>
                    </div>

                    {/* Notifications / Feedback */}
                    {trainingError && (
                      <div className="text-[10px] text-rose-600 bg-rose-50 border border-rose-150 p-2.5 rounded-xl leading-relaxed flex items-start gap-2 font-medium">
                        <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-rose-550" />
                        <span>{trainingError}</span>
                      </div>
                    )}
                    {trainingSuccessMsg && (
                      <div className="text-[10px] text-emerald-700 bg-emerald-50 border border-emerald-150 p-2.5 rounded-xl leading-relaxed flex items-start gap-2 font-medium">
                        <CheckCircle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-emerald-600" />
                        <span>{trainingSuccessMsg}</span>
                      </div>
                    )}

                    {/* Loaded training documents list */}
                    <div className="flex flex-col gap-2.5">
                      <div className="flex items-center justify-between text-[11px] font-semibold text-slate-500">
                        <span>Uploaded training samples:</span>
                        <span className="font-bold text-slate-800">{uploadedReports.length} reports</span>
                      </div>

                      {uploadedReports.length > 0 && (
                        <div className="max-h-24 overflow-y-auto border border-slate-150 rounded-lg p-2 bg-slate-50/25 flex flex-col gap-1 text-[10px] text-slate-650">
                          {uploadedReports.map((r, i) => (
                            <div key={i} className="flex justify-between items-center py-1 border-b border-slate-100 last:border-none">
                              <span className="truncate font-mono font-medium max-w-[250px]">{r.name}</span>
                              <span className="text-slate-400">{(r.size / 1024).toFixed(1)} KB</span>
                            </div>
                          ))}
                        </div>
                      )}

                      <div className="flex gap-2 pt-1 border-t border-slate-50">
                        <button
                          type="button"
                          disabled={isTraining || uploadedReports.length === 0}
                          onClick={handleRetrainProfile}
                          className="flex-1 py-1.5 px-3 border border-slate-205 bg-white text-slate-700 rounded-lg hover:bg-slate-50 text-[10.5px] font-bold transition disabled:opacity-50 disabled:bg-slate-50 flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
                        >
                          <RefreshCw className={`w-3 h-3 ${isTraining ? 'animate-spin' : ''}`} />
                          Retrain Style Profile
                        </button>
                        {uploadedReports.length > 0 && (
                          <button
                            type="button"
                            onClick={handleClearStyleProfile}
                            className="py-1.5 px-3 border border-rose-200 bg-white text-rose-600 rounded-lg hover:bg-rose-50 text-[10.5px] font-bold transition flex items-center gap-1 cursor-pointer shadow-xs"
                          >
                            Reset
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Preview section showing extracted rules */}
                    {styleProfileText && (
                      <div className="flex flex-col gap-1.5 pt-3 border-t border-slate-150 mt-1">
                        <label className="text-[10px] font-bold text-slate-450 uppercase tracking-wider block">
                          Extracted Reporting Style Profile Preview
                        </label>
                        <div className="bg-slate-950 text-slate-200 font-mono text-[9px] leading-relaxed p-3.5 rounded-xl border border-slate-800 h-36 overflow-y-auto whitespace-pre-wrap select-all shadow-inner">
                          {styleProfileText}
                        </div>
                        <p className="text-[8.5px] text-slate-450 leading-normal">
                          The AI scribe will structure clinical transcripts matching the exact tones, wording, normal/abnormal templates, and anatomical alignments learned above.
                        </p>
                      </div>
                    )}
                  </div>
                )}

                <div className="bg-white p-4 pt-4.5 rounded-xl border border-slate-205 flex flex-col gap-3 mt-4">
                  <span className="text-xs font-semibold text-slate-700">Report Insertion Mode</span>
                  <div className="flex bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs gap-1">
                    {(['manual', 'automatic'] as const).map((mode) => (
                      <button
                        key={mode}
                        id={`setting-insertion-${mode}`}
                        onClick={() => {
                          setReportInsertionMode(mode);
                          localStorage.setItem("apex_report_insertion_mode", mode);
                        }}
                        className={`flex-1 py-1.5 px-0.5 rounded font-semibold capitalize text-center transition cursor-pointer text-[9.5px] whitespace-normal md:whitespace-nowrap ${
                          reportInsertionMode === mode
                            ? "bg-white text-indigo-600 shadow-xs border border-slate-180 font-bold"
                            : "text-slate-500 hover:text-slate-800 font-medium"
                        }`}
                      >
                        {mode === 'manual' ? 'Manual Insertion' : 'Automatic Insertion'}
                      </button>
                    ))}
                  </div>
                  <p className="text-[10px] text-slate-500 font-mono leading-relaxed mt-1">
                    {reportInsertionMode === 'manual' && 'Manual: Review generated content and manually click "Insert" or "Add to Scribe" to place it into the report.'}
                    {reportInsertionMode === 'automatic' && 'Automatic: Directly structures and inserts findings into corresponding sections of the active report without manual confirmation.'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}
