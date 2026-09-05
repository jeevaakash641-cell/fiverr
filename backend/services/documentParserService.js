import mammoth from 'mammoth';
import { sanitizeHtml, stripHtml } from '../utils/sanitizeHtml.js';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);

/**
 * Extract clean text and structured course proposal from DOCX or PDF buffer
 * @param {Buffer} fileBuffer 
 * @param {string} fileName 
 * @param {string} mimeType 
 * @returns {Promise<Object>} { isReadable, course, modules, rawText, warnings }
 */
export async function parseDocumentToStructure(fileBuffer, fileName = '', mimeType = '') {
  const ext = (fileName.substring(fileName.lastIndexOf('.')).toLowerCase()) || '';
  const warnings = [];

  if (ext === '.docx' || mimeType.includes('wordprocessingml')) {
    return await parseDocx(fileBuffer, fileName);
  } else if (ext === '.pdf' || mimeType.includes('pdf')) {
    return await parsePdf(fileBuffer, fileName);
  } else {
    throw new Error('Automatic course generation currently supports PDF and DOCX files only.');
  }
}

/**
 * Parse DOCX document using mammoth with heading hierarchy
 */
async function parseDocx(fileBuffer, fileName) {
  try {
    // 1. Extract raw text to check readability
    const rawResult = await mammoth.extractRawText({ buffer: fileBuffer });
    const rawText = (rawResult.value || '').trim();

    if (!rawText || rawText.length < 50) {
      return {
        isReadable: false,
        rawText: '',
        warnings: ['Document contains little or no readable text.']
      };
    }

    // 2. Convert to HTML with heading styles mapping
    const options = {
      styleMap: [
        "p[style-name='Heading 1'] => h1:fresh",
        "p[style-name='Heading 2'] => h2:fresh",
        "p[style-name='Heading 3'] => h3:fresh",
        "p[style-name='Title'] => h1:fresh",
        "p[style-name='Subtitle'] => h2:fresh"
      ]
    };

    const htmlResult = await mammoth.convertToHtml({ buffer: fileBuffer }, options);
    const fullHtml = htmlResult.value || '';
    const warnings = htmlResult.messages.map(m => m.message);

    // 3. Build hierarchy from HTML tags (h1 -> Module, h2 -> Lesson, p/ul/ol/h3 -> Content)
    const structure = parseHtmlHeadingStructure(fullHtml, rawText, fileName);

    return {
      isReadable: true,
      rawText,
      course: structure.course,
      modules: structure.modules,
      warnings
    };
  } catch (err) {
    console.error('Error parsing DOCX:', err);
    throw new Error(`Failed to parse DOCX document: ${err.message}`);
  }
}

/**
 * Parse PDF document using pdf-parse with heading detection regexes
 */
async function parsePdf(fileBuffer, fileName) {
  try {
    let rawText = '';

    // 1. Try PDFParse v2 class
    try {
      const pdfModule = await import('pdf-parse');
      if (pdfModule.PDFParse) {
        const parser = new pdfModule.PDFParse({ data: fileBuffer });
        const textResult = await parser.getText();
        rawText = (textResult.text || '').trim();
        await parser.destroy();
      } else if (typeof (pdfModule.default || pdfModule) === 'function') {
        const fn = pdfModule.default || pdfModule;
        const pdfData = await fn(fileBuffer);
        rawText = (pdfData.text || '').trim();
      }
    } catch (e1) {
      console.warn('PDFParse module attempt:', e1.message);
    }

    // 2. Fallback: CommonJS require
    if (!rawText) {
      try {
        const cjsPdf = require('pdf-parse');
        if (cjsPdf.PDFParse) {
          const parser = new cjsPdf.PDFParse({ data: fileBuffer });
          const textResult = await parser.getText();
          rawText = (textResult.text || '').trim();
          await parser.destroy();
        } else if (typeof cjsPdf === 'function') {
          const pdfData = await cjsPdf(fileBuffer);
          rawText = (pdfData.text || '').trim();
        }
      } catch (e2) {
        console.warn('CJS pdf-parse fallback attempt:', e2.message);
      }
    }

    // 3. Fallback: Raw PDF stream text extraction (for basic or uncompressed text layers)
    if (!rawText) {
      try {
        const str = fileBuffer.toString('latin1');
        const textMatches = [];
        const regex = /BT[\s\S]*?ET/g;
        let match;
        while ((match = regex.exec(str)) !== null) {
          const tjMatches = match[0].match(/\((.*?)\)\s*Tj/g) || [];
          for (const tj of tjMatches) {
            const inner = tj.replace(/^\(/, '').replace(/\)\s*Tj$/, '').trim();
            if (inner) textMatches.push(inner);
          }
        }
        if (textMatches.length > 0) {
          rawText = textMatches.join(' ');
        }
      } catch (e3) {
        console.warn('Raw PDF stream extraction fallback attempt:', e3.message);
      }
    }

    if (!rawText || rawText.length < 50) {
      return {
        isReadable: false,
        rawText: '',
        warnings: ['Scanned PDF or no readable text layer detected.']
      };
    }

    // Clean text by stripping repeated page footers / headers / page numbers
    const cleanText = cleanPdfText(rawText);

    // Detect module & lesson boundaries from text patterns
    const structure = parseTextHeadingStructure(cleanText, fileName);

    return {
      isReadable: true,
      rawText: cleanText,
      course: structure.course,
      modules: structure.modules,
      warnings: []
    };
  } catch (err) {
    console.error('Error parsing PDF:', err);
    throw new Error(`Failed to parse PDF document: ${err.message}`);
  }
}

/**
 * Remove page numbers and repeated header/footers from PDF raw text
 */
function cleanPdfText(text) {
  return text
    .split('\n')
    .map(line => line.trim())
    .filter(line => {
      // Remove standalone page numbers
      if (/^(page\s+)?\d+(\s+of\s+\d+)?$/i.test(line)) return false;
      return line.length > 0;
    })
    .join('\n');
}

/**
 * Parse HTML content generated from DOCX into modules and lessons
 */
function parseHtmlHeadingStructure(html, rawText, fileName) {
  const defaultCourseTitle = fileName.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');

  // Split HTML into blocks by <h1> and <h2> tags
  const tokens = [];
  const regex = /<(h[1-3])\b[^>]*>(.*?)<\/\1>|(<p\b[^>]*>.*?<\/p>)|(<ul\b[^>]*>.*?<\/ul>)|(<ol\b[^>]*>.*?<\/ol>)/gi;
  let match;

  while ((match = regex.exec(html)) !== null) {
    if (match[1]) {
      const tag = match[1].toLowerCase();
      const text = stripHtml(match[2]).trim();
      if (text) {
        tokens.push({ type: tag, text, html: match[0] });
      }
    } else if (match[3] || match[4] || match[5]) {
      const blockHtml = match[0];
      const text = stripHtml(blockHtml).trim();
      if (text) {
        tokens.push({ type: 'content', text, html: blockHtml });
      }
    }
  }

  const modules = [];
  let currentModule = null;
  let currentLesson = null;

  for (const token of tokens) {
    if (token.type === 'h1') {
      // New Module
      currentModule = {
        title: token.text.slice(0, 100),
        description: `Topics and concepts covered in ${token.text}.`,
        lessons: []
      };
      modules.push(currentModule);
      currentLesson = null;
    } else if (token.type === 'h2') {
      // New Lesson inside current module (or create default module if none exists)
      if (!currentModule) {
        currentModule = {
          title: 'Introduction & Core Concepts',
          description: 'Fundamental topics and introductory lessons.',
          lessons: []
        };
        modules.push(currentModule);
      }

      currentLesson = {
        title: token.text.slice(0, 100),
        shortDescription: `Learn about ${token.text}.`,
        content: '',
        estimatedMinutes: 15
      };
      currentModule.lessons.push(currentLesson);
    } else {
      // Content (paragraphs, lists, h3)
      if (!currentLesson) {
        if (!currentModule) {
          currentModule = {
            title: 'Course Content',
            description: 'Core concepts and topics.',
            lessons: []
          };
          modules.push(currentModule);
        }
        currentLesson = {
          title: 'Overview',
          shortDescription: 'Introductory overview and context.',
          content: '',
          estimatedMinutes: 15
        };
        currentModule.lessons.push(currentLesson);
      }

      currentLesson.content = (currentLesson.content || '') + token.html;
    }
  }

  // Fallback if structure is empty or flat
  return finalizeCourseStructure(modules, defaultCourseTitle, rawText);
}

/**
 * Parse plain text (PDF) using regex patterns for chapter and section headings
 */
function parseTextHeadingStructure(text, fileName) {
  const defaultCourseTitle = fileName.replace(/\.[^/.]+$/, '').replace(/[-_]/g, ' ');
  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);

  const modules = [];
  let currentModule = null;
  let currentLesson = null;

  // Patterns for Module / Chapter: e.g. "Chapter 1: ...", "Module 1 ...", "1. Computer Basics"
  const modulePattern = /^(module\s+\d+|chapter\s+\d+|\d+\.\s+[A-Z][\w\s]{2,50})$/i;
  // Patterns for Lesson / Section: e.g. "1.1 Parts of a Computer", "Section 1: ...", "Lesson 1: ..."
  const lessonPattern = /^(lesson\s+\d+|section\s+\d+|\d+\.\d+\s+[A-Z][\w\s]{2,50})$/i;

  for (const line of lines) {
    if (modulePattern.test(line)) {
      currentModule = {
        title: cleanHeadingTitle(line),
        description: `Concepts and guidance covering ${cleanHeadingTitle(line)}.`,
        lessons: []
      };
      modules.push(currentModule);
      currentLesson = null;
    } else if (lessonPattern.test(line)) {
      if (!currentModule) {
        currentModule = {
          title: 'Core Fundamentals',
          description: 'Key introductory modules.',
          lessons: []
        };
        modules.push(currentModule);
      }
      currentLesson = {
        title: cleanHeadingTitle(line),
        shortDescription: `Understand ${cleanHeadingTitle(line)}.`,
        content: '',
        estimatedMinutes: 15
      };
      currentModule.lessons.push(currentLesson);
    } else {
      if (!currentLesson) {
        if (!currentModule) {
          currentModule = {
            title: 'Course Content',
            description: 'Core concepts and topics.',
            lessons: []
          };
          modules.push(currentModule);
        }
        currentLesson = {
          title: 'Introduction',
          shortDescription: 'Overview of the course topics.',
          content: '',
          estimatedMinutes: 15
        };
        currentModule.lessons.push(currentLesson);
      }

      currentLesson.content += `<p>${line.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</p>`;
    }
  }

  return finalizeCourseStructure(modules, defaultCourseTitle, text);
}

function cleanHeadingTitle(raw) {
  return raw
    .replace(/^(module\s+\d+:?|chapter\s+\d+:?|lesson\s+\d+:?|section\s+\d+:?|\d+(\.\d+)?\.?)\s*/i, '')
    .trim()
    .slice(0, 100) || raw.slice(0, 100);
}

/**
 * Validate, clean, sanitize and fill metadata for the generated course structure
 */
function finalizeCourseStructure(modules, defaultTitle, rawText) {
  // If no modules or no lessons were detected, create a fallback chunked structure
  if (!modules || modules.length === 0 || modules.every(m => !m.lessons || m.lessons.length === 0)) {
    const paragraphs = rawText.split('\n\n').filter(p => p.trim().length > 20);
    const lessons = [];

    const chunkSize = Math.max(1, Math.ceil(paragraphs.length / 3));
    for (let i = 0; i < paragraphs.length; i += chunkSize) {
      const chunk = paragraphs.slice(i, i + chunkSize);
      const lessonNum = lessons.length + 1;
      const lessonTitle = `Section ${lessonNum}: Key Topics`;
      const lessonContent = chunk.map(p => `<p>${p.trim()}</p>`).join('');

      lessons.push({
        title: lessonTitle,
        shortDescription: `Section ${lessonNum} content and learning points.`,
        content: sanitizeHtml(lessonContent),
        estimatedMinutes: 15
      });
    }

    if (lessons.length === 0) {
      lessons.push({
        title: 'Overview & Essential Guide',
        shortDescription: 'Key learning points from the uploaded document.',
        content: `<p>${rawText.slice(0, 500)}</p>`,
        estimatedMinutes: 15
      });
    }

    modules = [{
      title: 'Course Content',
      description: 'Overview of the topics and guidance in this document.',
      lessons
    }];
  }

  // Ensure every module and lesson has required fields & sanitised HTML
  const cleanedModules = modules.map((m, mIdx) => {
    const validLessons = (m.lessons || []).map((l, lIdx) => {
      let content = sanitizeHtml(l.content || `<p>Lesson content on ${l.title}.</p>`);
      if (stripHtml(content).length === 0) {
        content = `<p>Detailed learning material for ${l.title}.</p>`;
      }

      return {
        title: (l.title || `Lesson ${lIdx + 1}`).trim().slice(0, 100),
        shortDescription: (l.shortDescription || `Learn about ${l.title}`).trim().slice(0, 200),
        content,
        estimatedMinutes: Number.isInteger(Number(l.estimatedMinutes)) && Number(l.estimatedMinutes) > 0 ? Number(l.estimatedMinutes) : 15
      };
    });

    if (validLessons.length === 0) {
      validLessons.push({
        title: 'Core Topics',
        shortDescription: `Introduction to ${m.title}.`,
        content: `<p>Learning material for ${m.title}.</p>`,
        estimatedMinutes: 15
      });
    }

    return {
      title: (m.title || `Module ${mIdx + 1}`).trim().slice(0, 100),
      description: (m.description || `Module covering ${m.title}`).trim().slice(0, 250),
      lessons: validLessons
    };
  });

  const totalMinutes = cleanedModules.reduce((acc, m) => {
    return acc + m.lessons.reduce((lAcc, l) => lAcc + (l.estimatedMinutes || 15), 0);
  }, 0);

  const durationHours = Math.max(1, Math.round(totalMinutes / 60));

  const course = {
    title: defaultTitle.slice(0, 100),
    shortDescription: `A comprehensive course covering ${defaultTitle.toLowerCase()}.`,
    fullDescription: `Develop skills and practical understanding in ${defaultTitle}. Generated from learning document.`,
    category: 'Work & Life Skills',
    difficultyLevel: 'Beginner',
    estimatedDuration: `${durationHours} hour${durationHours > 1 ? 's' : ''}`,
    learningOutcomes: [
      `Understand fundamental concepts of ${defaultTitle}`,
      `Apply practical skills learned from the course modules`
    ]
  };

  return { course, modules: cleanedModules };
}

export default {
  parseDocumentToStructure
};
