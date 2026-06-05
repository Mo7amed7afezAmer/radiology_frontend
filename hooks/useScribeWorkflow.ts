import { useState, useRef, useCallback, useEffect } from 'react';
import { ReportNode, RestructuringMode, TemplateId } from '../types';

/**
 * Workflow Hook: Manages the speech-to-report workflow with recording, transcription, and restructuring
 */
export function useScribeWorkflow(
  initialNodes: ReportNode[],
  templateId: TemplateId,
  restructuringMode: RestructuringMode
) {
  const [transcript, setTranscript] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [status, setStatus] = useState<'idle' | 'recording' | 'transcribing' | 'processing' | 'done' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [systemInfo, setSystemInfo] = useState('');
  const [aiChanges, setAiChanges] = useState<any[]>([]);
  const [pendingNodes, setPendingNodes] = useState<ReportNode[] | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const lastStructuredRef = useRef<string>('');

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (mediaRecorderRef.current?.state !== 'inactive') {
        mediaRecorderRef.current?.stop();
      }
    };
  }, []);

  /**
   * STEP 1: Initialize Recording
   */
  const startRecording = useCallback(async () => {
    setErrorMsg('');
    setSystemInfo('');

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      let mimeType = 'audio/webm';
      let options: RecordingOptions = {};

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
        if (event.data?.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach(track => track.stop());
        const finalBlob = new Blob(audioChunksRef.current, { type: mimeType });
        await transcribeAudio(finalBlob, mimeType);
      };

      mediaRecorder.start();
      setIsRecording(true);
      setStatus('recording');
    } catch (err: any) {
      console.error('Microphone access failed:', err);
      setErrorMsg('Microphone access denied. Please check permissions.');
      setStatus('error');
    }
  }, []);

  /**
   * STEP 2: Stop Recording
   */
  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current?.state !== 'inactive') {
      mediaRecorderRef.current?.stop();
    }
    setIsRecording(false);
  }, []);

  /**
   * STEP 3: Transcribe Audio
   */
  const transcribeAudio = useCallback(async (blob: Blob, mimeType: string) => {
    setStatus('transcribing');
    setErrorMsg('');

    try {
      const reader = new FileReader();
      reader.readAsDataURL(blob);

      reader.onloadend = async () => {
        try {
          const rawResult = reader.result as string;
          if (!rawResult?.includes(',')) {
            throw new Error('Could not encode audio data');
          }
          
          const base64Data = rawResult.split(',')[1];
          const response = await fetch('/api/transcribe', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ audio: base64Data, mimeType }),
          });

          if (!response.ok) {
            throw new Error('Transcription failed. Dictation might be too short.');
          }

          const data = await response.json();
          if (data.error) throw new Error(data.error);

          if (data.transcript?.trim()) {
            setTranscript(prev => prev + (prev ? ' ' : '') + data.transcript.trim());
          } else {
            setSystemInfo('No significant speech recognized. Please speak clearly.');
          }

          if (data.usingFallback) {
            setSystemInfo('⚠️ API Quota Limit. Using offline transcription.');
          }
          setStatus('idle');
        } catch (e: any) {
          setErrorMsg(e.message || 'Transcription failed');
          setStatus('error');
        }
      };
    } catch (err: any) {
      setErrorMsg('Failed to serialize audio');
      setStatus('error');
    }
  }, []);

  /**
   * STEP 4: Restructure Text into Report Nodes
   */
  const restructureText = useCallback(async (
    textToProcess: string,
    currentNodes: ReportNode[],
    isAutomatic: boolean = false
  ) => {
    if (!textToProcess.trim()) {
      setErrorMsg('Please provide some clinical text.');
      return null;
    }

    setStatus('processing');
    setErrorMsg('');

    try {
      const styleProfileText = localStorage.getItem('apex_style_profile_text') || '';
      const hasProfile = styleProfileText.trim().length > 0;
      const effectiveMode = (restructuringMode === 'personalized' && !hasProfile) ? 'concise' : restructuringMode;

      const response = await fetch('/api/restructure', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transcript: textToProcess,
          mode: effectiveMode,
          nodes: currentNodes,
          templateId,
          styleProfileText,
        }),
      });

      if (!response.ok) throw new Error('Restructure failed');

      const data = await response.json();
      if (data.error) throw new Error(data.error);

      lastStructuredRef.current = data.refinedTranscript || textToProcess;
      setTranscript(data.refinedTranscript || textToProcess);
      setAiChanges(data.changes || []);
      setPendingNodes(data.updatedNodes || null);

      if (data.usingFallback) {
        setSystemInfo('⚠️ API Quota. Using offline fallback engine.');
      } else {
        setSystemInfo('');
      }

      setStatus('done');
      return data;
    } catch (e: any) {
      setErrorMsg(e.message || 'Restructure failed');
      setStatus('error');
      return null;
    }
  }, [templateId, restructuringMode]);

  /**
   * STEP 5: Apply Pending Changes
   */
  const applyPendingChanges = useCallback((updatedNodes: ReportNode[]) => {
    setPendingNodes(null);
    return updatedNodes;
  }, []);

  /**
   * STEP 6: Load Sample Dictation
   */
  const loadPreset = useCallback((transcriptText: string) => {
    setTranscript(transcriptText);
    setStatus('idle');
    setErrorMsg('');
  }, []);

  /**
   * STEP 7: Clear State
   */
  const clearTranscript = useCallback(() => {
    setTranscript('');
    setPendingNodes(null);
    setAiChanges([]);
    setErrorMsg('');
    setSystemInfo('');
  }, []);

  return {
    // State
    transcript,
    isRecording,
    status,
    errorMsg,
    systemInfo,
    aiChanges,
    pendingNodes,

    // Setters
    setTranscript,
    setErrorMsg,
    setSystemInfo,

    // Workflow Steps
    startRecording,
    stopRecording,
    restructureText,
    applyPendingChanges,
    loadPreset,
    clearTranscript,
  };
}

interface RecordingOptions {
  mimeType?: string;
}
