/**
 * Notes Export Utilities
 * Export notes to PDF and DOCX formats
 */

import html2pdf from 'html2pdf.js';
import { saveAs } from 'file-saver';

/**
 * Export notes to PDF
 */
export const exportToPDF = async (noteContent, title = 'My Notes') => {
  try {
    // Create HTML content
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            padding: 40px;
            max-width: 800px;
            margin: 0 auto;
          }
          h1 {
            color: #4F46E5;
            border-bottom: 3px solid #4F46E5;
            padding-bottom: 10px;
            margin-bottom: 30px;
          }
          h2 { color: #6366f1; margin-top: 25px; }
          h3 { color: #818cf8; margin-top: 20px; }
          p { margin: 10px 0; }
          ul, ol { margin: 10px 0; padding-left: 30px; }
          li { margin: 5px 0; }
          strong { color: #1f2937; }
          em { color: #4b5563; }
          code {
            background: #f3f4f6;
            padding: 2px 6px;
            border-radius: 3px;
            font-family: 'Courier New', monospace;
          }
          pre {
            background: #f3f4f6;
            padding: 15px;
            border-radius: 5px;
            overflow-x: auto;
          }
          blockquote {
            border-left: 4px solid #4F46E5;
            padding-left: 20px;
            margin: 20px 0;
            color: #4b5563;
            font-style: italic;
          }
          .footer {
            margin-top: 50px;
            padding-top: 20px;
            border-top: 1px solid #e5e7eb;
            text-align: center;
            color: #9ca3af;
            font-size: 12px;
          }
        </style>
      </head>
      <body>
        <h1>${title}</h1>
        <div class="content">
          ${noteContent}
        </div>
        <div class="footer">
          <p>Generated on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}</p>
          <p>One Community Ely - Online Training Centre</p>
        </div>
      </body>
      </html>
    `;

    // PDF options
    const options = {
      margin: [15, 15, 15, 15],
      filename: `${title.replace(/[^a-z0-9]/gi, '_')}_${Date.now()}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    // Generate PDF
    const element = document.createElement('div');
    element.innerHTML = htmlContent;
    
    await html2pdf().set(options).from(element).save();
    
    return { success: true, message: 'PDF exported successfully!' };
  } catch (error) {
    console.error('PDF export error:', error);
    return { success: false, message: 'Failed to export PDF: ' + error.message };
  }
};

/**
 * Export notes to DOCX (simplified version using HTML)
 * For full DOCX support, use 'docx' npm package on backend
 */
export const exportToDOCX = async (noteContent, title = 'My Notes') => {
  try {
    // Create HTML content for DOCX
    const htmlContent = `
      <!DOCTYPE html>
      <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word'>
      <head>
        <meta charset='utf-8'>
        <title>${title}</title>
        <style>
          body {
            font-family: Calibri, Arial, sans-serif;
            font-size: 11pt;
            line-height: 1.5;
          }
          h1 { font-size: 20pt; color: #23735F; }
          h2 { font-size: 16pt; color: #289B8C; }
          h3 { font-size: 14pt; color: #9BE85C; }
          p { margin: 6pt 0; }
          ul, ol { margin: 6pt 0; }
          strong { font-weight: bold; }
          em { font-style: italic; }
        </style>
      </head>
      <body>
        <h1>${title}</h1>
        ${noteContent}
        <p style="margin-top: 30pt; padding-top: 10pt; border-top: 1px solid #ccc; color: #666; font-size: 9pt;">
          Generated on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}<br>
          One Community Ely - Online Training Centre
        </p>
      </body>
      </html>
    `;

    // Create blob
    const blob = new Blob(['\ufeff', htmlContent], {
      type: 'application/msword'
    });

    // Save file
    const filename = `${title.replace(/[^a-z0-9]/gi, '_')}_${Date.now()}.doc`;
    saveAs(blob, filename);

    return { success: true, message: 'DOCX exported successfully!' };
  } catch (error) {
    console.error('DOCX export error:', error);
    return { success: false, message: 'Failed to export DOCX: ' + error.message };
  }
};

/**
 * Export notes as plain text
 */
export const exportToText = (noteContent, title = 'My Notes') => {
  try {
    // Strip HTML tags
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = noteContent;
    const plainText = tempDiv.textContent || tempDiv.innerText || '';

    // Create text content
    const textContent = `
${title}
${'='.repeat(title.length)}

${plainText}

---
Generated on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}
One Community Ely - Online Training Centre
    `.trim();

    // Create blob and save
    const blob = new Blob([textContent], { type: 'text/plain;charset=utf-8' });
    const filename = `${title.replace(/[^a-z0-9]/gi, '_')}_${Date.now()}.txt`;
    saveAs(blob, filename);

    return { success: true, message: 'Text file exported successfully!' };
  } catch (error) {
    console.error('Text export error:', error);
    return { success: false, message: 'Failed to export text: ' + error.message };
  }
};

/**
 * Copy notes to clipboard
 */
export const copyToClipboard = async (noteContent) => {
  try {
    // Strip HTML tags for plain text
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = noteContent;
    const plainText = tempDiv.textContent || tempDiv.innerText || '';

    await navigator.clipboard.writeText(plainText);
    return { success: true, message: 'Copied to clipboard!' };
  } catch (error) {
    console.error('Clipboard error:', error);
    return { success: false, message: 'Failed to copy: ' + error.message };
  }
};

export default {
  exportToPDF,
  exportToDOCX,
  exportToText,
  copyToClipboard
};
