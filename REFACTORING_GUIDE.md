# Code Refactoring Guide: Workflow Pattern Architecture

## Overview
Your old monolithic codebase has been refactored into a **clean, modular workflow-based architecture** following Vercel's Workflow SDK patterns. This guide explains the new structure and how to use the refactored code.

---

## Project Structure

### New Organization
```
hooks/
  ├── useReportWorkflow.ts      # Report editing workflow (undo/redo, signing)
  ├── useScribeWorkflow.ts      # Speech-to-text workflow (recording → transcription → restructuring)
  ├── useReportAPI.ts           # Centralized API calls with error handling
  └── useFormattingWorkflow.ts  # Text formatting & drag-drop operations
  
lib/
  └── reportUtils.ts            # Pure utility functions (extraction, formatting, validation)
  
components/
  ├── ReportPanel-Refactored.tsx  # Clean implementation using new hooks
  └── ... (existing project components)
```

---

## Key Custom Hooks

### 1. `useReportWorkflow.ts`
**Purpose:** Manages the core report editing state and operations

**Key Functions:**
- `addNode(nodeData)` - Add a new section to the report
- `updateNode(id, updates)` - Modify an existing section
- `deleteNode(id)` - Remove a section
- `reorderNodes(newOrder)` - Change section order
- `undo()` / `redo()` - Undo/redo functionality
- `signReport(physicianName)` - Sign and finalize the report
- `getPlainText()` - Export as plain text

**Example Usage:**
```typescript
const workflow = useReportWorkflow(initialNodes);

// Add a new findings section
workflow.addNode({
  id: 'findings-1',
  name: 'Findings',
  text: 'Normal study',
  isNormal: true
});

// Undo the last action
workflow.undo();

// Sign the report
workflow.signReport('Dr. John Doe');
```

---

### 2. `useScribeWorkflow.ts`
**Purpose:** Handles speech-to-text and report restructuring workflow

**Key Functions:**
- `startRecording()` - Begin capturing audio
- `stopRecording()` - End audio capture
- `transcribe()` - Convert speech to text
- `restructure(text, mode)` - Reorganize transcribed text into sections
- `applyChanges(restructuredData)` - Apply to the report
- `getStatus()` - Check current workflow step

**Example Usage:**
```typescript
const scribe = useScribeWorkflow();

// Record dictation
scribe.startRecording();
// ... user speaks ...
scribe.stopRecording();

// Transcribe
const text = await scribe.transcribe();

// Restructure into report sections
const structured = await scribe.restructure(text, 'concise');

// Apply to report
scribe.applyChanges(structured);
```

---

### 3. `useReportAPI.ts`
**Purpose:** Centralized API communication with error handling

**Key Functions:**
- `analyzeReport(reportText)` - AI analysis of report content
- `generateImpression(findingsText)` - Auto-generate impression
- `validateReport(nodes)` - Validate report structure
- `exportReport(nodes, format)` - Export to various formats
- `handleError(error)` - Centralized error handling

**Example Usage:**
```typescript
const api = useReportAPI();

// Generate impression automatically
const impression = await api.generateImpression(findingsText);
if (impression.success) {
  console.log(impression.data);
}
```

---

### 4. `useFormattingWorkflow.ts`
**Purpose:** Text formatting and UI interaction handling

**Key Functions:**
- `formatText(text, style)` - Apply text formatting
- `stripHtml(text)` - Remove HTML tags
- `highlightText(text, query)` - Highlight search terms
- `handleDragDrop(source, target)` - Reorder sections
- `getSelectedText()` - Get currently selected text

---

## Utility Library: `reportUtils.ts`

Pure, testable functions for common operations:

```typescript
// HTML/Text Operations
stripHtmlTags(html) → string
splitBySections(text) → Section[]
extractKeywords(text) → string[]

// Report Formatting
formatAsPlainText(nodes) → string
formatAsHtml(nodes) → string
formatAsJson(nodes) → object

// Validation
validateReportStructure(nodes) → boolean
validateNodeText(text) → { valid: boolean; errors: string[] }

// Export/Import
exportToFile(nodes, format) → Blob
importFromFile(file) → Promise<ReportNode[]>
```

**Example Usage:**
```typescript
import { stripHtmlTags, formatAsPlainText } from '@/lib/reportUtils';

// Clean HTML content
const cleanText = stripHtmlTags('<p>Findings: <b>Normal</b></p>');

// Export report
const plainText = formatAsPlainText(nodes);
const file = new Blob([plainText], { type: 'text/plain' });
```

---

## Integration with Existing Components

### Using in ReportPanel
```typescript
'use client';

import { useReportWorkflow } from '@/hooks/useReportWorkflow';
import { useScribeWorkflow } from '@/hooks/useScribeWorkflow';

export function ReportPanel({ initialNodes }) {
  const report = useReportWorkflow(initialNodes);
  const scribe = useScribeWorkflow();

  return (
    <div>
      {/* Scribe dictation area */}
      <ScribeArea scribe={scribe} />
      
      {/* Report editor */}
      <ReportEditor 
        nodes={report.nodes}
        onUpdate={report.updateNode}
        onAddNode={report.addNode}
        onUndo={report.undo}
      />
      
      {/* Sign button */}
      <button onClick={() => report.signReport('Dr. Name')}>
        Sign Report
      </button>
    </div>
  );
}
```

---

## Benefits of This Architecture

✅ **Separation of Concerns** - Each hook handles one responsibility  
✅ **Reusability** - Hooks can be used in any component  
✅ **Testability** - Pure functions in utilities are easy to test  
✅ **Maintainability** - Clear workflow steps are easy to understand  
✅ **Scalability** - New features can be added without touching existing code  
✅ **Type Safety** - Full TypeScript support with proper interfaces  
✅ **Error Handling** - Centralized error management in API hook  

---

## Migration Steps

### If updating existing components:

1. **Replace direct state management** with workflow hooks:
   ```typescript
   // OLD
   const [nodes, setNodes] = useState([]);
   
   // NEW
   const { nodes, updateNode, addNode } = useReportWorkflow([]);
   ```

2. **Use utilities instead of inline functions**:
   ```typescript
   // OLD
   const plain = nodes.map(n => n.text).join('\n');
   
   // NEW
   const plain = formatAsPlainText(nodes);
   ```

3. **Centralize API calls**:
   ```typescript
   // OLD
   fetch('/api/analyze', { body: text })
   
   // NEW
   const api = useReportAPI();
   const result = await api.analyzeReport(text);
   ```

---

## File Reference

| File | Lines | Purpose |
|------|-------|---------|
| `hooks/useReportWorkflow.ts` | 150 | Core report editing with undo/redo |
| `hooks/useScribeWorkflow.ts` | 259 | Speech-to-text and restructuring |
| `hooks/useReportAPI.ts` | 133 | Centralized API calls |
| `hooks/useFormattingWorkflow.ts` | 194 | Text formatting and UI interactions |
| `lib/reportUtils.ts` | 206 | Pure utility functions |
| `components/ReportPanel-Refactored.tsx` | 313 | Example refactored component |

**Total:** ~1,255 lines of clean, modular code  
**Original:** ~1,490 + 601 + 855 = 2,946 lines of monolithic code  
**Reduction:** 57% less code through better organization

---

## Next Steps

1. **Test** the refactored component in your workstation
2. **Migrate** other components to use the new hooks
3. **Add tests** for utility functions in `reportUtils.ts`
4. **Document** any custom workflows specific to your domain
5. **Deploy** with confidence in the improved architecture

---

## Questions?

Refer to the comments in each hook file for detailed implementation notes and usage examples.
