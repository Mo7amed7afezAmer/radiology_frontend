import React, { useState, useEffect, useRef } from "react";
import { Mic, MicOff, Sparkles, Send, Play, AlertCircle, FileText, CheckCircle2, Layers, Plus } from "lucide-react";
import { RestructuringMode, ReportNode, DictationSession, TemplateId, ClinicalTemplate, ReportInsertionMode } from "../types";
import { SAMPLE_DICTATIONS, SampleDictation } from "../data";

interface ScribePanelProps {
  key?: string | number;
  restructuringMode: RestructuringMode;
  reportInsertionMode: ReportInsertionMode;
  onRestructureComplete: (updatedNodes: ReportNode[], changes: any[]) => void;
  currentNodes: ReportNode[];
  templateId: TemplateId;
  setTemplateId: (id: TemplateId) => void;
  templates: ClinicalTemplate[];
  isSigned: boolean;
  usingRealGemini: boolean;
  displayMode: 'organ' | 'findings';
  setDisplayMode: (mode: 'organ' | 'findings') => void;
  onNewReport: () => void;
}

export default function ScribePanel({
  restructuringMode,
  reportInsertionMode,
  onRestructureComplete,
  currentNodes,
  templateId,
  setTemplateId,
  templates,
  isSigned,
  usingRealGemini,
  displayMode,
  setDisplayMode,
  onNewReport
}: ScribePanelProps) {
  const [transcript, setTranscript] = useState<string>("");
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [status, setStatus] = useState<'idle' | 'recording' | 'transcribing' | 'processing' | 'done' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [aiChanges, setAiChanges] = useState<any[]>([]);
  const [systemInfo, setSystemInfo] = useState<string>("");
  
  // Pending nodes for manual insertion
  const [pendingNodes, setPendingNodes] = useState<ReportNode[] | null>(null);
  const [isInserted, setIsInserted] = useState<boolean>(false);

  // Clear pending states when template or patient selection changes
  useEffect(() => {
    setPendingNodes(null);
    setIsInserted(false);
    setAiChanges([]);
  }, [templateId]);

  const lastStructuredRef = useRef<string>("");

  useEffect(() => {
    if (reportInsertionMode !== 'automatic' || isSigned || !transcript.trim()) {
      return;
    }

    if (transcript === lastStructuredRef.current) {
      return;
    }

    // Automatically trigger restructure after 1.2s typing/dictation pause
    const timer = setTimeout(() => {
      lastStructuredRef.current = transcript;
      runRestructureText(transcript, true);
    }, 1200);

    return () => clearTimeout(timer);
  }, [transcript, reportInsertionMode, isSigned]);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    return () => {
      // Cleanup on unmount if recording
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
        mediaRecorderRef.current.stop();
      }
    };
  }, []);

  const startRecordingFlow = async () => {
    if (isSigned) return;
    setErrorMsg("");
    setSystemInfo("");

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Determine stream-supported container/mimeType
      let options = {};
      let mimeType = 'audio/webm';
      if (MediaRecorder.isTypeSupported('audio/webm')) {
        options = { mimeType: 'audio/webm' };
        mimeType = 'audio/webm';
      } else if (MediaRecorder.isTypeSupported('audio/ogg')) {
        options = { mimeType: 'audio/ogg' };
        mimeType = 'audio/ogg';
      } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
        options = { mimeType: 'audio/mp4' };
        mimeType = 'audio/mp4';
      }

      const mediaRecorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        // Shut down audio tracks to release device/microphone indicators
        stream.getTracks().forEach(track => track.stop());

        const finalBlob = new Blob(audioChunksRef.current, { type: mimeType });
        await handleAudioUpload(finalBlob, mimeType);
      };

      mediaRecorder.start();
      setIsRecording(true);
      setStatus('recording');
    } catch (err: any) {
      console.error("Failed to access microphone:", err);
      setErrorMsg("Microphone access denied or audio device not available. Please verify permissions.");
      setIsRecording(false);
      setStatus('error');
    }
  };

  const stopRecordingFlow = () => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
  };

  const toggleRecording = () => {
    if (isSigned) return;

    if (isRecording) {
      stopRecordingFlow();
    } else {
      startRecordingFlow();
    }
  };

  const handleAudioUpload = async (blob: Blob, mimeType: string) => {
    setStatus('transcribing');
    setErrorMsg("");

    try {
      const reader = new FileReader();
      reader.readAsDataURL(blob);
      reader.onloadend = async () => {
        try {
          const rawResult = reader.result as string;
          if (!rawResult || !rawResult.includes(',')) {
            throw new Error("Could not construct file base64 data");
          }
          const base64Data = rawResult.split(',')[1];
          
          const response = await fetch("/api/transcribe", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              audio: base64Data,
              mimeType
            })
          });

          if (!response.ok) {
            throw new Error("Server failed to transcribe recorded dictation. Dictation might be too short.");
          }

          const data = await response.json();
          if (data.error) {
            throw new Error(data.error);
          }

          if (data.transcript && data.transcript.trim()) {
            setTranscript(prev => prev + (prev ? " " : "") + data.transcript.trim());
          } else {
            setSystemInfo("No significant speech recognized. Please speak clearly next to your mic.");
          }
          
          if (data.usingFallback) {
            setSystemInfo("⚠️ Google Gemini API Quota Limit Reached. Activated high-accuracy offline transcription simulation to proceed instantly.");
          } else if (data.transcript && data.transcript.trim()) {
            setSystemInfo("");
          }
          setStatus('idle');
        } catch (e: any) {
          console.error(e);
          setErrorMsg(e.message || "Failed to transcribe dictation file with Gemini.");
          setStatus('error');
        }
      };
    } catch (err: any) {
      console.error(err);
      setErrorMsg("Failed to serialize oral audio block.");
      setStatus('error');
    }
  };

  const loadPreset = (preset: SampleDictation) => {
    if (isSigned) return;
    setTranscript(preset.transcript);
    setStatus('idle');
    setErrorMsg("");
  };

  const runRestructureText = async (textToProcess: string, isFromAutomatic: boolean) => {
    if (isSigned) return;
    if (!textToProcess.trim()) {
      setErrorMsg("Please provide some dictated clinical text first.");
      return;
    }

    setStatus('processing');
    setErrorMsg("");

    const styleProfileText = localStorage.getItem("apex_style_profile_text") || "";
    const hasProfile = styleProfileText.trim().length > 0;
    const effectiveMode = (restructuringMode === 'personalized' && !hasProfile) ? 'concise' : restructuringMode;

    try {
      const response = await fetch("/api/restructure", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transcript: textToProcess,
          mode: effectiveMode,
          nodes: currentNodes,
          templateId,
          styleProfileText
        })
      });

      if (!response.ok) {
        throw new Error("Server failed to optimize speech. Please try again.");
      }

      const data = await response.json();
      if (data.error) {
        throw new Error(data.error);
      }

      // Restructure completed successfully!
      if (data.refinedTranscript) {
        lastStructuredRef.current = data.refinedTranscript;
        setTranscript(data.refinedTranscript);
      }
      setAiChanges(data.changes || []);
      
      if (isFromAutomatic || reportInsertionMode === 'automatic') {
        onRestructureComplete(data.updatedNodes, data.changes || []);
        setPendingNodes(null);
        setIsInserted(true);
      } else {
        setPendingNodes(data.updatedNodes);
        setIsInserted(false);
      }
      
      if (data.usingFallback) {
        setSystemInfo("⚠️ Google Gemini API Quota Limit Reached. Switched to high-precision Offline Clinical Fallback Engine. Findings structured successfully without downtime!");
      } else {
        setSystemInfo("");
      }
      setStatus('done');
    } catch (e: any) {
      console.error(e);
      setErrorMsg(e.message || "Failed to process dictation with AI.");
      setStatus('error');
    }
  };

  const handleProcessDictation = async () => {
    await runRestructureText(transcript, false);
  };

  return (
    <div className="flex-[0.6] bg-white border border-slate-200 rounded-2xl p-6 shadow-sm h-[calc(100vh-2.5rem)] my-5 flex flex-col justify-between overflow-hidden">
      <div className="flex flex-col gap-5 overflow-y-auto pr-1 flex-1">
        {/* HEADER */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5 text-indigo-600" />
            <span className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-widest">Protocol Type</span>
          </div>
          
          {/* STUDY PROTOCOL SELECTIONS */}
          <div className="flex items-center">
            <select
              id="study-protocol-selector"
              value={templateId}
              disabled={isSigned}
              onChange={(e) => {
                if (isSigned) return;
                setTemplateId(e.target.value);
              }}
              className="text-[11px] bg-slate-50 border border-slate-200 text-slate-700 font-semibold px-2 py-1.5 rounded-lg focus:outline-none focus:border-indigo-500 transition shadow-xs cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {templates.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* REPORT DISPLAY SETTING */}
        <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3 text-xs shadow-xs select-none">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <span className="font-mono font-bold text-slate-500 uppercase text-[9px] tracking-wider flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-indigo-505 shrink-0" />
              Report Display:
            </span>
            <div className="flex bg-slate-200/60 p-0.5 rounded-lg border border-slate-200 text-[10px]">
              <button
                onClick={() => setDisplayMode('organ')}
                className={`py-1 px-3 rounded-md font-semibold transition cursor-pointer ${
                  displayMode === 'organ'
                    ? "bg-white text-indigo-600 shadow-xs border border-slate-200 font-bold"
                    : "text-slate-500 hover:text-slate-850"
                }`}
                id="layout-toggle-organ"
              >
                Organ-Based
              </button>
              <button
                onClick={() => setDisplayMode('findings')}
                className={`py-1 px-3 rounded-md font-semibold transition cursor-pointer ${
                  displayMode === 'findings'
                    ? "bg-white text-indigo-600 shadow-xs border border-slate-200 font-bold"
                    : "text-slate-500 hover:text-slate-850"
                }`}
                id="layout-toggle-findings"
              >
                Findings-Only
              </button>
            </div>
          </div>
        </div>

        {/* VOICE RECORDER CONTALNS */}
        <div className="bg-slate-50 rounded-xl p-5 border border-slate-100 flex flex-col items-center justify-center relative min-h-[160px]">
          {isRecording ? (
            <div className="flex flex-col items-center gap-4">
              {/* ChatGPT ripple style */}
              <div className="relative flex items-center justify-center">
                <div className="absolute w-20 h-20 bg-indigo-100 rounded-full animate-ping opacity-50"></div>
                <div className="absolute w-26 h-26 bg-indigo-50/50 rounded-full animate-pulse"></div>
                <button
                  onClick={toggleRecording}
                  className="w-14 h-14 rounded-full bg-indigo-600 text-white flex items-center justify-center hover:bg-indigo-700 transition duration-300 relative z-10 shadow-lg ring-4 ring-white cursor-pointer"
                  id="mic-recording-active"
                >
                  <Mic className="w-6 h-6" />
                </button>
              </div>
              <div className="flex items-center gap-1 mt-2">
                <span className="w-1.5 h-3 bg-indigo-500 rounded-full animate-[bounce_1s_infinite_100ms]"></span>
                <span className="w-1.5 h-6 bg-indigo-400 rounded-full animate-[bounce_1s_infinite_200ms]"></span>
                <span className="w-1.5 h-8 bg-indigo-300 rounded-full animate-[bounce_1s_infinite_300ms]"></span>
                <span className="w-1.5 h-5 bg-indigo-400 rounded-full animate-[bounce_1s_infinite_400ms]"></span>
                <span className="w-1.5 h-2 bg-indigo-500 rounded-full animate-[bounce_1s_infinite_500ms]"></span>
              </div>
              <p className="text-indigo-600 font-mono text-xs animate-pulse">Listening closely for dictation...</p>
            </div>
          ) : status === 'transcribing' ? (
            <div className="flex flex-col items-center gap-4">
              <div className="relative flex items-center justify-center">
                <div className="w-14 h-14 rounded-full bg-indigo-50 border-2 border-indigo-500 border-t-transparent animate-spin flex items-center justify-center shadow-xs">
                </div>
                <Sparkles className="w-5 h-5 text-indigo-600 absolute" />
              </div>
              <div className="text-center">
                <p className="text-indigo-650 font-semibold text-xs animate-pulse">
                  Transcribing with Gemini 3.1 Flash Lite...
                </p>
                <p className="text-slate-400 text-[10px] mt-1 font-mono">
                  Applying medical terminology reference layer
                </p>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-4">
              <button
                onClick={toggleRecording}
                disabled={isSigned}
                className={`w-14 h-14 rounded-full flex items-center justify-center transition duration-300 shadow-sm ${
                  isSigned
                    ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                    : 'bg-white border border-slate-200 hover:border-indigo-500/50 hover:bg-slate-50 text-indigo-600 cursor-pointer'
                }`}
                id="mic-recording-idle"
                title={isSigned ? "Report Signed (Locked)" : "Click to Start Dictation"}
              >
                <MicOff className="w-6 h-6" />
              </button>
              <div className="text-center">
                <p className="text-slate-700 font-medium text-xs">
                  {isSigned ? "Report is Signed and Finalized" : "Activate Dictation"}
                </p>
                <p className="text-slate-400 text-[11px] mt-1">Press mic or select a diagnostic speech below</p>
              </div>
            </div>
          )}
        </div>



        {/* TRANSCRIPTION BOX */}
        {restructuringMode === 'personalized' && !(localStorage.getItem("apex_style_profile_text") || "").trim() && (
          <div className="flex items-start gap-2.5 bg-amber-50 border border-amber-200/60 p-3 rounded-xl text-amber-700 text-xs font-semibold leading-relaxed shadow-sm">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-500" />
            <div>
              No personalized style profile available. Please upload previous reports in Workspace Settings to enable Personalized Style.
              <span className="font-bold underline text-amber-900 block mt-1">Defaulting report generation to Concise mode.</span>
            </div>
          </div>
        )}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            <span>Live Transcription</span>
            {transcript && (
              <button
                onClick={() => setTranscript("")}
                disabled={isSigned}
                className="text-slate-455 hover:text-indigo-600 transition lowercase font-normal"
              >
                Clear text
              </button>
            )}
          </div>
          <div className="relative">
            <textarea
              value={transcript}
              onChange={(e) => setTranscript(e.target.value)}
              disabled={isSigned}
              placeholder="Clinical speech transcript will stream here in real time... Feel free to modify or paste findings manually."
              className="w-full h-32 bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-800 font-mono text-xs focus:outline-none focus:border-indigo-500 focus:bg-white transition resize-none leading-relaxed disabled:opacity-50"
            />
            {transcript.trim() && !isSigned && (
              <button
                onClick={handleProcessDictation}
                disabled={status === 'processing'}
                className="absolute bottom-3 right-3 bg-indigo-600 text-white font-semibold text-xs px-3.5 py-1.5 rounded-lg hover:bg-indigo-700 transition shadow-md flex items-center gap-1.5"
              >
                {status === 'processing' ? (
                  <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    Apply AI Scribe
                  </>
                )}
              </button>
            )}
          </div>

          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between text-[10px] text-slate-500 font-mono mt-1 gap-1.5 bg-slate-50 border border-slate-200/40 p-2.5 rounded-xl">
            <div className="flex items-center gap-1.5 font-semibold text-slate-600">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse"></span>
              <span>Dual-Model Scribe Engine</span>
            </div>
            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
              <span>Transcribe: <strong className="text-indigo-600 font-bold">Gemini 3.1 Flash Lite</strong></span>
              <span className="text-slate-350">|</span>
              <span>Structure: <strong className="text-indigo-600 font-bold">Gemini 3 Flash</strong></span>
            </div>
          </div>
          {errorMsg && (
            <div className="flex items-start gap-2 bg-rose-50 border border-rose-200 p-3 rounded-lg text-rose-600 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}
          {systemInfo && (
            <div className="bg-slate-50/50 text-slate-500 p-2.5 rounded-lg text-[10px] leading-relaxed border border-slate-200/50">
              {systemInfo}
            </div>
          )}
        </div>

        {/* RESTRUCTURED COMPARISON LIST */}
        {aiChanges.length > 0 && (
          <div className="flex flex-col gap-3 mt-1 border-t border-slate-100 pt-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">AI Structured Output</span>
              </div>
              
              {/* STATUS INDICATION */}
              {reportInsertionMode === 'automatic' ? (
                <span className="text-[9px] bg-emerald-50 text-emerald-700 border border-emerald-150 px-2 py-0.5 rounded-full font-semibold flex items-center gap-1 font-mono">
                  <span className="w-1 h-1 bg-emerald-500 rounded-full"></span>
                  Automatically Inserted
                </span>
              ) : isInserted ? (
                <span className="text-[9px] bg-emerald-50 text-emerald-700 border border-emerald-150 px-2 py-0.5 rounded-full font-semibold flex items-center gap-1 font-mono">
                  <span className="w-1 h-1 bg-emerald-500 rounded-full"></span>
                  Inserted Successfully
                </span>
              ) : (
                <span className="text-[9px] bg-rose-50 text-rose-750 border border-rose-150 px-2 py-0.5 rounded-full font-semibold flex items-center gap-1 font-mono animate-pulse">
                  <span className="w-1 h-1 bg-rose-500 rounded-full animate-ping"></span>
                  Pending Insertion
                </span>
              )}
            </div>

            {/* MANUAL INSERTION ACTIONS */}
            {reportInsertionMode === 'manual' && (
              <div className="bg-indigo-50/50 border border-indigo-100/70 rounded-xl p-3 flex flex-col gap-2.5 mt-1">
                <div className="flex flex-col gap-0.5">
                  <span className="text-[10px] text-indigo-700 font-bold uppercase tracking-wide">Report Integration Action</span>
                  <p className="text-[10px] text-slate-500 font-mono leading-relaxed">
                    {isInserted 
                      ? "The clinical findings have been successfully merged into your active report document." 
                      : "Review section changes below, then select an insertion method to commit to your report sheet:"}
                  </p>
                </div>
                
                {!isInserted && pendingNodes && (
                  <div className="flex items-center gap-2 mt-0.5">
                    <button
                      id="btn-add-to-scribe"
                      onClick={() => {
                        onRestructureComplete(pendingNodes, aiChanges);
                        setIsInserted(true);
                      }}
                      className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[11px] py-2 px-3 rounded-lg transition duration-200 shadow-sm flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      Add to Scribe
                    </button>
                    
                    <button
                      id="btn-insert"
                      onClick={() => {
                        onRestructureComplete(pendingNodes, aiChanges);
                        setIsInserted(true);
                      }}
                      className="flex-1 bg-white hover:bg-slate-50 border border-slate-200 text-indigo-650 font-bold text-[11px] py-2 px-3 rounded-lg transition duration-200 shadow-sm flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                      <span>Insert</span>
                    </button>
                  </div>
                )}
                
                {isInserted && (
                  <div className="flex items-center justify-center gap-1.5 bg-emerald-50/80 border border-emerald-150 p-2 rounded-lg text-emerald-800 text-[11px] font-semibold">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-650" />
                    <span>Report updated successfully!</span>
                  </div>
                )}
              </div>
            )}

            <div className="space-y-3">
              {aiChanges.map((change, idx) => (
                <div key={idx} className="bg-slate-50 border border-slate-205 rounded-lg p-3 text-xs flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-indigo-600 font-semibold bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100 text-[10px]">
                      {change.sectionName}
                    </span>
                    <span className="text-slate-400 text-[10px] uppercase font-bold">Processed</span>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[11px] p-2 bg-white rounded border border-slate-100 leading-relaxed font-sans">
                    <div className="text-slate-400 line-through pr-2 border-r border-slate-100">
                      <span className="text-[9px] text-slate-400 font-bold uppercase block mb-1">Old draft:</span>
                      {change.oldText || "Empty / Unchanged"}
                    </div>
                    <div className="text-slate-700 pr-1 pl-1">
                      <span className="text-[9px] text-indigo-500 font-bold uppercase block mb-1">Corrected:</span>
                      {change.newText}
                    </div>
                  </div>
                  <p className="text-[10px] text-slate-500 bg-white/60 px-2 py-1.5 rounded border border-slate-100/50">
                    <strong className="text-slate-600 font-bold uppercase text-[8px] mr-1">Logic:</strong>{change.explanation}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
