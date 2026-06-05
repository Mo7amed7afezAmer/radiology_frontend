import { ReportNode } from '../types';

/**
 * Utility Functions for Report Processing and Formatting
 */

/**
 * Strip HTML tags from text content
 */
export function stripHtmlTags(html: string): string {
  if (!html) return '';
  const doc = new DOMParser().parseFromString(html, 'text/html');
  return doc.body.textContent || '';
}

/**
 * Split text into sentences
 */
export function splitIntoSentences(text: string): string[] {
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
}

/**
 * Get bullet points from a report node for display
 */
export function getBulletsForNode(node: ReportNode): { isAbnormal: boolean; text: string }[] {
  const isFinding = node.name.toLowerCase() !== 'technique' && node.name.toLowerCase() !== 'impression';
  if (!isFinding) {
    return [];
  }

  const sentences = splitIntoSentences(node.text);
  if (sentences.length === 0) {
    return [{ isAbnormal: !node.isNormal, text: 'No findings recorded.' }];
  }

  return [{ isAbnormal: !node.isNormal, text: sentences.join(' ') }];
}

/**
 * Build formatted plain text report for copying
 */
export function formatReportPlainText(nodes: ReportNode[], selectedPatient: any): string {
  const techNode = nodes.find(n => n.name.toLowerCase() === 'technique');
  const impressionNode = nodes.find(n => n.name.toLowerCase() === 'impression');

  let report = `RADIOLOGY REPORT\n${'='.repeat(50)}\n\n`;
  report += `PATIENT: ${selectedPatient.name}\n`;
  report += `MRN: ${selectedPatient.mrn}\n`;
  report += `DOB: ${selectedPatient.dob}\n\n`;

  if (techNode) {
    report += `TECHNIQUE:\n${stripHtmlTags(techNode.text)}\n\n`;
  }

  report += `FINDINGS:\n`;
  nodes.forEach(node => {
    const isFinding = node.name.toLowerCase() !== 'technique' && node.name.toLowerCase() !== 'impression';
    if (isFinding) {
      report += `${node.name}:\n${stripHtmlTags(node.text)}\n\n`;
    }
  });

  if (impressionNode) {
    report += `IMPRESSION:\n${stripHtmlTags(impressionNode.text)}\n`;
  }

  return report;
}

/**
 * Build HTML report for Word export
 */
export function buildReportHtml(
  nodes: ReportNode[],
  selectedPatient: any,
  fontFamily: string,
  fontSize: string,
  displayMode: 'organ' | 'findings'
): string {
  const techNode = nodes.find(n => n.name.toLowerCase() === 'technique');

  let findingsHtml = `<div class="section-heading">FINDINGS</div>`;

  if (displayMode === 'organ') {
    nodes.forEach(node => {
      const isFinding = node.name.toLowerCase() !== 'technique' && node.name.toLowerCase() !== 'impression';
      if (isFinding) {
        findingsHtml += `
          <div class="subsection">
            <span class="subsection-title">${node.name}:</span>
            <p class="section-text">${node.text}</p>
          </div>
        `;
      }
    });
  } else {
    // Findings-only mode
    const findings = nodes.filter(n => !n.isNormal && n.name.toLowerCase() !== 'technique' && n.name.toLowerCase() !== 'impression');
    if (findings.length > 0) {
      findingsHtml += '<ul>';
      findings.forEach(f => {
        findingsHtml += `<li class="section-text">${f.text}</li>`;
      });
      findingsHtml += '</ul>';
    } else {
      findingsHtml += '<p class="section-text">No significant findings identified.</p>';
    }
  }

  const impressionNode = nodes.find(n => n.name.toLowerCase() === 'impression');
  const impressionHtml = impressionNode ? `
    <div class="section-heading">IMPRESSION</div>
    <p class="section-text">${impressionNode.text}</p>
  ` : '';

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <style>
        body { font-family: ${fontFamily}; font-size: ${fontSize}; line-height: 1.6; }
        .header { margin-bottom: 20px; }
        .section-heading { font-weight: bold; margin-top: 15px; margin-bottom: 5px; }
        .subsection { margin-bottom: 10px; }
        .subsection-title { font-weight: bold; }
        .section-text { margin: 0; }
      </style>
    </head>
    <body>
      <div class="header">
        <h2>${selectedPatient.name}</h2>
        <p>MRN: ${selectedPatient.mrn}</p>
      </div>
      ${techNode ? `<div class="section-heading">TECHNIQUE</div><p class="section-text">${techNode.text}</p>` : ''}
      ${findingsHtml}
      ${impressionHtml}
    </body>
    </html>
  `;
}

/**
 * Generate a simple offline impression from findings
 */
export function generateOfflineImpression(nodes: ReportNode[]): string {
  const abnormalList = nodes.filter(n => !n.isNormal && n.name.toLowerCase() !== 'technique' && n.name.toLowerCase() !== 'impression');

  if (abnormalList.length > 0) {
    return abnormalList
      .map((n, idx) => `${idx + 1}. Significant findings noted in ${n.name}: ${stripHtmlTags(n.text)}`)
      .join('\n');
  } else {
    return '1. Unremarkable study. No acute pathology identified.';
  }
}

/**
 * Validate report completeness
 */
export function validateReport(nodes: ReportNode[]): { isValid: boolean; missingFields: string[] } {
  const missingFields: string[] = [];

  const requiredFields = ['Technique', 'Impression'];
  requiredFields.forEach(field => {
    const node = nodes.find(n => n.name.toLowerCase() === field.toLowerCase());
    if (!node || !stripHtmlTags(node.text).trim()) {
      missingFields.push(field);
    }
  });

  return {
    isValid: missingFields.length === 0,
    missingFields,
  };
}

/**
 * Export report as JSON
 */
export function exportReportJson(nodes: ReportNode[], selectedPatient: any): string {
  const report = {
    patient: {
      name: selectedPatient.name,
      mrn: selectedPatient.mrn,
      dob: selectedPatient.dob,
    },
    nodes,
    exportedAt: new Date().toISOString(),
  };

  return JSON.stringify(report, null, 2);
}
