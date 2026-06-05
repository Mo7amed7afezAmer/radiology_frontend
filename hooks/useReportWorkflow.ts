import { useState, useCallback, useRef, useEffect } from 'react';
import { ReportNode } from '../types';

/**
 * Workflow Hook: Manages the report editing workflow with undo/redo, formatting, and signing
 */
export function useReportWorkflow(initialNodes: ReportNode[]) {
  const [nodes, setNodesInternal] = useState<ReportNode[]>(initialNodes);
  const [isSigned, setIsSigned] = useState(false);

  // Undo/Redo History Management
  const historyRef = useRef<ReportNode[][]>([]);
  const historyPointerRef = useRef<number>(-1);
  const isUndoRedoingRef = useRef<boolean>(false);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  // Memoized setNodes with deduplication
  const setNodes = useCallback<React.Dispatch<React.SetStateAction<ReportNode[]>>>((value) => {
    setNodesInternal(prev => {
      const resolved = typeof value === 'function' ? (value as Function)(prev) : value;
      if (!Array.isArray(resolved)) return resolved;
      
      const seen = new Set<string>();
      return resolved.filter(node => {
        const id = node?.id || `node-gen-${Math.floor(Math.random() * 1000000)}`;
        if (seen.has(id)) return false;
        seen.add(id);
        return true;
      });
    });
  }, []);

  // Update undo/redo button states
  const updateUndoRedoStates = useCallback(() => {
    setCanUndo(historyPointerRef.current > 0);
    setCanRedo(historyPointerRef.current < historyRef.current.length - 1);
  }, []);

  // History tracking effect
  useEffect(() => {
    if (isUndoRedoingRef.current) {
      isUndoRedoingRef.current = false;
      return;
    }

    if (historyRef.current.length === 0) {
      historyRef.current = [JSON.parse(JSON.stringify(nodes))];
      historyPointerRef.current = 0;
      updateUndoRedoStates();
    } else {
      const lastState = historyRef.current[historyPointerRef.current];
      const isStructureChanged = !lastState || lastState.length !== nodes.length || 
        lastState.some((n, i) => n.id !== nodes[i]?.id);

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
          const isTextChanged = currentLastState && currentLastState.some((n, i) => 
            n.text !== nodes[i]?.text
          );
          if (isTextChanged) pushState();
        }, 350);
        return () => clearTimeout(timer);
      }
    }
  }, [nodes, updateUndoRedoStates]);

  // Undo operation
  const undo = useCallback(() => {
    if (historyPointerRef.current > 0 && !isSigned) {
      isUndoRedoingRef.current = true;
      const prevPointer = historyPointerRef.current - 1;
      historyPointerRef.current = prevPointer;
      const targetState = JSON.parse(JSON.stringify(historyRef.current[prevPointer]));
      setNodesInternal(targetState);
      updateUndoRedoStates();
    }
  }, [isSigned, updateUndoRedoStates]);

  // Redo operation
  const redo = useCallback(() => {
    if (historyPointerRef.current < historyRef.current.length - 1 && !isSigned) {
      isUndoRedoingRef.current = true;
      const nextPointer = historyPointerRef.current + 1;
      historyPointerRef.current = nextPointer;
      const targetState = JSON.parse(JSON.stringify(historyRef.current[nextPointer]));
      setNodesInternal(targetState);
      updateUndoRedoStates();
    }
  }, [isSigned, updateUndoRedoStates]);

  // Node operations
  const updateNodeText = useCallback((nodeId: string, text: string) => {
    setNodes(prev => prev.map(n => n.id === nodeId ? { ...n, text } : n));
  }, [setNodes]);

  const deleteNode = useCallback((nodeId: string) => {
    setNodes(prev => prev.filter(n => n.id !== nodeId));
  }, [setNodes]);

  const reorderNodes = useCallback((fromIndex: number, toIndex: number) => {
    setNodes(prev => {
      const updated = [...prev];
      const [removed] = updated.splice(fromIndex, 1);
      updated.splice(toIndex, 0, removed);
      return updated;
    });
  }, [setNodes]);

  const addNode = useCallback((node: ReportNode) => {
    setNodes(prev => [...prev, node]);
  }, [setNodes]);

  // Sign/unlock operations
  const signReport = useCallback(() => {
    setIsSigned(true);
  }, []);

  const unlockReport = useCallback(() => {
    setIsSigned(false);
  }, []);

  return {
    nodes,
    setNodes,
    isSigned,
    signReport,
    unlockReport,
    undo,
    redo,
    canUndo,
    canRedo,
    updateNodeText,
    deleteNode,
    reorderNodes,
    addNode,
  };
}
