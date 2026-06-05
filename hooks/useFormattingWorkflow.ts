import { useState, useCallback, useEffect } from 'react';

/**
 * Workflow Hook: Manages text formatting, drag-drop reordering, and text editing
 */
export function useFormattingWorkflow() {
  const [fontStyle, setFontStyle] = useState('Arial');
  const [fontSize, setFontSize] = useState('12px');
  const [isBold, setIsBold] = useState(false);
  const [isItalic, setIsItalic] = useState(false);
  const [isUnderline, setIsUnderline] = useState(false);
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null);

  // Drag and drop state
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  /**
   * STEP 1: Get font family based on selection
   */
  const getFontFamily = useCallback((style: string): string => {
    const fontMap: Record<string, string> = {
      'Calibri': 'Calibri, Light Calibri, sans-serif',
      'Times New Roman': "'Times New Roman', Georgia, serif",
      'Inter': "'Inter', sans-serif",
      'Source Sans Pro': "'Source Sans 3', 'Source Sans Pro', sans-serif",
      'Roboto': "'Roboto', sans-serif",
      'IBM Plex Sans': "'IBM Plex Sans', sans-serif",
    };
    return fontMap[style] || 'Arial, sans-serif';
  }, []);

  /**
   * STEP 2: Get text style object for applying to elements
   */
  const getTextStyle = useCallback((): React.CSSProperties => ({
    fontFamily: getFontFamily(fontStyle),
    fontSize: fontSize,
  }), [fontStyle, fontSize, getFontFamily]);

  /**
   * STEP 3: Update selection states when text is selected
   */
  const updateSelectionStates = useCallback(() => {
    try {
      setIsBold(document.queryCommandState('bold'));
      setIsItalic(document.queryCommandState('italic'));
      setIsUnderline(document.queryCommandState('underline'));
    } catch (e) {
      // Fallback
    }
  }, []);

  /**
   * STEP 4: Apply formatting to selected text
   */
  const applyFormat = useCallback((command: 'bold' | 'italic' | 'underline', editingId?: string) => {
    document.execCommand(command, false);
    updateSelectionStates();

    // Sync the innerHTML back to state if editing a specific node
    if (editingId) {
      const element = document.getElementById(`editor-node-${editingId}`);
      if (element) {
        // Return the updated HTML for the caller to sync
        return element.innerHTML;
      }
    }
    return null;
  }, [updateSelectionStates]);

  /**
   * STEP 5: Drag start handler
   */
  const handleDragStart = useCallback((index: number) => {
    setDraggedIndex(index);
  }, []);

  /**
   * STEP 6: Drag over handler
   */
  const handleDragOver = useCallback((index: number) => {
    if (draggedIndex === null || draggedIndex === index) return;
    setDragOverIndex(index);
  }, [draggedIndex]);

  /**
   * STEP 7: Drop handler - returns new order
   */
  const handleDrop = useCallback((targetIndex: number): { fromIndex: number; toIndex: number } | null => {
    if (draggedIndex === null || draggedIndex === targetIndex) {
      setDraggedIndex(null);
      setDragOverIndex(null);
      return null;
    }

    const result = { fromIndex: draggedIndex, toIndex: targetIndex };
    setDraggedIndex(null);
    setDragOverIndex(null);
    return result;
  }, [draggedIndex]);

  /**
   * STEP 8: Drag end handler
   */
  const handleDragEnd = useCallback(() => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  }, []);

  /**
   * STEP 9: Convert font size from px to pt for Word export
   */
  const convertFontSizeToPt = useCallback((pxSize: string): string => {
    const pxToFontMap: Record<string, string> = {
      '10px': '10pt',
      '11px': '11pt',
      '12px': '12pt',
      '13.5px': '13.5pt',
      '14px': '14pt',
      '16px': '16pt',
      '17px': '17pt',
      '18px': '18pt',
      '19px': '19pt',
      '20px': '20pt',
    };
    return pxToFontMap[pxSize] || '11pt';
  }, []);

  /**
   * STEP 10: Setup keyboard shortcuts listener
   */
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
      const modifier = isMac ? e.metaKey : e.ctrlKey;

      if (modifier) {
        if (e.key.toLowerCase() === 'b') {
          e.preventDefault();
          applyFormat('bold', editingNodeId || undefined);
        } else if (e.key.toLowerCase() === 'i') {
          e.preventDefault();
          applyFormat('italic', editingNodeId || undefined);
        } else if (e.key.toLowerCase() === 'u') {
          e.preventDefault();
          applyFormat('underline', editingNodeId || undefined);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [applyFormat, editingNodeId]);

  /**
   * STEP 11: Listen for selection changes to update button states
   */
  useEffect(() => {
    document.addEventListener('selectionchange', updateSelectionStates);
    return () => document.removeEventListener('selectionchange', updateSelectionStates);
  }, [updateSelectionStates]);

  return {
    // Formatting State
    fontStyle,
    setFontStyle,
    fontSize,
    setFontSize,
    isBold,
    isItalic,
    isUnderline,
    editingNodeId,
    setEditingNodeId,

    // Drag and Drop State
    draggedIndex,
    dragOverIndex,

    // Formatting Operations
    getFontFamily,
    getTextStyle,
    updateSelectionStates,
    applyFormat,
    convertFontSizeToPt,

    // Drag and Drop Operations
    handleDragStart,
    handleDragOver,
    handleDrop,
    handleDragEnd,
  };
}
