import { useState, useCallback } from 'react';
import { ReportNode, RestructuringMode } from '../types';

/**
 * API Hook: Handles all report-related API calls with error handling and feedback
 */
export function useReportAPI() {
  const [isLoading, setIsLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);

  /**
   * Display feedback message with auto-clear
   */
  const displayFeedback = useCallback((text: string, type: 'success' | 'error' | 'info' = 'success') => {
    setFeedback({ text, type });
    setTimeout(() => setFeedback(null), 4000);
  }, []);

  /**
   * Execute a command to modify a specific report section
   */
  const executeCommand = useCallback(async (nodeText: string, command: string) => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/command', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nodeText, command }),
      });

      if (!response.ok) throw new Error('Command execution failed');

      const data = await response.json();
      displayFeedback(
        data.usingFallback 
          ? '⚠️ API Quota limit. Formatted offline successfully!' 
          : 'Applied rewrite command successfully.',
        'success'
      );
      return data.updatedText;
    } catch (err: any) {
      displayFeedback(err.message || 'Failed to execute command', 'error');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [displayFeedback]);

  /**
   * Generate impression from current findings
   */
  const generateImpression = useCallback(async (
    nodes: ReportNode[],
    restructuringMode: RestructuringMode
  ) => {
    setIsLoading(true);
    displayFeedback('Analyzing findings...', 'info');

    try {
      const styleProfileText = localStorage.getItem('apex_style_profile_text') || '';
      const hasProfile = styleProfileText.trim().length > 0;
      const effectiveMode = (restructuringMode === 'personalized' && !hasProfile) ? 'concise' : restructuringMode;

      const response = await fetch('/api/generate-impression', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nodes,
          mode: effectiveMode,
          styleProfileText,
        }),
      });

      if (!response.ok) throw new Error('Impression generation failed');

      const data = await response.json();
      displayFeedback(
        data.usingFallback
          ? '⚠️ API Quota limit. Generated offline successfully!'
          : 'Impression finalized successfully.',
        'success'
      );
      return data.impression;
    } catch (err: any) {
      displayFeedback(err.message || 'Failed to generate impression', 'error');
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [displayFeedback]);

  /**
   * Auto-update impression when findings change
   */
  const autoUpdateImpression = useCallback(async (
    nodes: ReportNode[],
    restructuringMode: RestructuringMode
  ) => {
    try {
      const styleProfileText = localStorage.getItem('apex_style_profile_text') || '';
      const hasProfile = styleProfileText.trim().length > 0;
      const effectiveMode = (restructuringMode === 'personalized' && !hasProfile) ? 'concise' : restructuringMode;

      const response = await fetch('/api/generate-impression', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nodes,
          mode: effectiveMode,
          styleProfileText,
        }),
      });

      if (!response.ok) return null;

      const data = await response.json();
      return data.impression;
    } catch (err) {
      console.warn('Auto-update impression failed:', err);
      return null;
    }
  }, []);

  return {
    isLoading,
    feedback,
    displayFeedback,
    executeCommand,
    generateImpression,
    autoUpdateImpression,
  };
}
