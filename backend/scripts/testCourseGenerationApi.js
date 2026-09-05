import dotenv from 'dotenv';
import zlib from 'zlib';
dotenv.config();

const BASE_URL = 'http://localhost:3001';

/**
 * Helper to build a minimal valid DOCX file buffer with Heading 1 and Heading 2 styles
 */
function createSampleDocxBuffer() {
  const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:body>
    <w:p>
      <w:pPr><w:pStyle w:val="Heading1"/></w:pPr>
      <w:r><w:t>Computer Basics</w:t></w:r>
    </w:p>
    <w:p>
      <w:pPr><w:pStyle w:val="Heading2"/></w:pPr>
      <w:r><w:t>Parts of a Computer</w:t></w:r>
    </w:p>
    <w:p>
      <w:r><w:t>A computer consists of hardware and software components working together.</w:t></w:r>
    </w:p>
    <w:p>
      <w:pPr><w:pStyle w:val="Heading2"/></w:pPr>
      <w:r><w:t>Keyboard and Mouse</w:t></w:r>
    </w:p>
    <w:p>
      <w:r><w:t>The mouse and keyboard are essential input devices for navigation and typing.</w:t></w:r>
    </w:p>
    <w:p>
      <w:pPr><w:pStyle w:val="Heading1"/></w:pPr>
      <w:r><w:t>Internet Skills</w:t></w:r>
    </w:p>
    <w:p>
      <w:pPr><w:pStyle w:val="Heading2"/></w:pPr>
      <w:r><w:t>Understanding the Internet</w:t></w:r>
    </w:p>
    <w:p>
      <w:r><w:t>The internet is a global network connecting millions of computers worldwide.</w:t></w:r>
    </w:p>
    <w:p>
      <w:pPr><w:pStyle w:val="Heading2"/></w:pPr>
      <w:r><w:t>Creating an Email Account</w:t></w:r>
    </w:p>
    <w:p>
      <w:r><w:t>Learn how to setup a secure personal email inbox for daily communication.</w:t></w:r>
    </w:p>
  </w:body>
</w:document>`;

  const contentTypesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="xml" ContentType="application/xml"/>
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>`;

  const relsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`;

  // Create zip file buffer
  return createZipBuffer({
    '[Content_Types].xml': contentTypesXml,
    '_rels/.rels': relsXml,
    'word/document.xml': documentXml
  });
}

/**
 * Minimal ZIP builder
 */
function createZipBuffer(files) {
  const fileEntries = [];
  let offset = 0;
  const parts = [];

  for (const [name, content] of Object.entries(files)) {
    const nameBuf = Buffer.from(name, 'utf8');
    const contentBuf = Buffer.from(content, 'utf8');
    const crc = crc32(contentBuf);

    // Local file header (30 bytes + name length + content length)
    const localHeader = Buffer.alloc(30);
    localHeader.writeUInt32LE(0x04034b50, 0); // signature
    localHeader.writeUInt16LE(20, 4); // version needed
    localHeader.writeUInt16LE(0, 6); // flags
    localHeader.writeUInt16LE(0, 8); // compression method (0 = store)
    localHeader.writeUInt16LE(0, 10); // time
    localHeader.writeUInt16LE(0, 12); // date
    localHeader.writeUInt32LE(crc, 14); // crc32
    localHeader.writeUInt32LE(contentBuf.length, 18); // compressed size
    localHeader.writeUInt32LE(contentBuf.length, 22); // uncompressed size
    localHeader.writeUInt16LE(nameBuf.length, 26); // file name length
    localHeader.writeUInt16LE(0, 28); // extra field length

    parts.push(localHeader, nameBuf, contentBuf);

    fileEntries.push({
      nameBuf,
      crc,
      size: contentBuf.length,
      offset
    });

    offset += localHeader.length + nameBuf.length + contentBuf.length;
  }

  const cdStart = offset;
  let cdSize = 0;

  for (const entry of fileEntries) {
    const cdHeader = Buffer.alloc(46);
    cdHeader.writeUInt32LE(0x02014b50, 0); // signature
    cdHeader.writeUInt16LE(20, 4);
    cdHeader.writeUInt16LE(20, 6);
    cdHeader.writeUInt16LE(0, 8);
    cdHeader.writeUInt16LE(0, 10);
    cdHeader.writeUInt16LE(0, 12);
    cdHeader.writeUInt16LE(0, 14);
    cdHeader.writeUInt32LE(entry.crc, 16);
    cdHeader.writeUInt32LE(entry.size, 20);
    cdHeader.writeUInt32LE(entry.size, 24);
    cdHeader.writeUInt16LE(entry.nameBuf.length, 28);
    cdHeader.writeUInt16LE(0, 30);
    cdHeader.writeUInt16LE(0, 32);
    cdHeader.writeUInt16LE(0, 34);
    cdHeader.writeUInt16LE(0, 36);
    cdHeader.writeUInt32LE(0, 38);
    cdHeader.writeUInt32LE(entry.offset, 42);

    parts.push(cdHeader, entry.nameBuf);
    cdSize += cdHeader.length + entry.nameBuf.length;
  }

  // End of Central Directory Record
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(0, 4);
  eocd.writeUInt16LE(0, 6);
  eocd.writeUInt16LE(fileEntries.length, 8);
  eocd.writeUInt16LE(fileEntries.length, 10);
  eocd.writeUInt32LE(cdSize, 12);
  eocd.writeUInt32LE(cdStart, 16);
  eocd.writeUInt16LE(0, 20);

  parts.push(eocd);

  return Buffer.concat(parts);
}

function crc32(buf) {
  let crc = ~0;
  for (let i = 0; i < buf.length; i++) {
    crc = (crc >>> 8) ^ crcTable[(crc ^ buf[i]) & 0xff];
  }
  return (~crc) >>> 0;
}

const crcTable = new Uint32Array(256);
for (let i = 0; i < 256; i++) {
  let c = i;
  for (let k = 0; k < 8; k++) {
    c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
  }
  crcTable[i] = c;
}

/**
 * Minimal valid PDF builder with text
 */
function createSamplePdfBuffer(text) {
  const content = `BT /F1 12 Tf 50 700 Td (${text.replace(/[()]/g, '')}) Tj ET`;
  const pdfString = `%PDF-1.4
1 0 obj << /Type /Catalog /Pages 2 0 R >> endobj
2 0 obj << /Type /Pages /Kids [3 0 R] /Count 1 >> endobj
3 0 obj << /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >> endobj
4 0 obj << /Length ${content.length} >> stream
${content}
endstream endobj
5 0 obj << /Type /Font /Subtype /Type1 /BaseFont /Helvetica >> endobj
xref
0 6
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000244 00000 n 
0000000335 00000 n 
trailer << /Size 6 /Root 1 0 R >>
startxref
415
%%EOF`;
  return Buffer.from(pdfString, 'utf8');
}

async function runTests() {
  console.log('🧪 Starting Upload & Generate Draft Course API Tests...\n');
  let passed = 0;
  let failed = 0;

  const assert = (condition, title) => {
    if (condition) {
      console.log(`✅ PASS: ${title}`);
      passed++;
    } else {
      console.error(`❌ FAIL: ${title}`);
      failed++;
    }
  };

  // Find Admin Account
  let adminEmail = 'admin@onecommunityely.com';
  try {
    const userRes = await fetch(`${BASE_URL}/api/users`);
    const userData = await userRes.json();
    const adminUser = userData.users?.find(u => u.userType === 'teacher');
    if (adminUser) adminEmail = adminUser.email;
  } catch (e) {
    console.log('Using default admin email');
  }

  // 1. Test DOCX Structure Generation
  let generatedCourseId = null;
  try {
    const docxBuf = createSampleDocxBuffer();
    const boundary = '----WebKitFormBoundary' + Math.random().toString(36).substring(2);

    let body = '';
    body += `--${boundary}\r\n`;
    body += `Content-Disposition: form-data; name="title"\r\n\r\nDigital Skills Handbook\r\n`;
    body += `--${boundary}\r\n`;
    body += `Content-Disposition: form-data; name="courseTitle"\r\n\r\nDigital Skills Handbook\r\n`;
    body += `--${boundary}\r\n`;
    body += `Content-Disposition: form-data; name="subject"\r\n\r\nDigital & IT Skills\r\n`;
    body += `--${boundary}\r\n`;
    body += `Content-Disposition: form-data; name="includeExtractedText"\r\n\r\ntrue\r\n`;
    body += `--${boundary}\r\n`;
    body += `Content-Disposition: form-data; name="attachOriginalDocument"\r\n\r\ntrue\r\n`;
    body += `--${boundary}\r\n`;
    body += `Content-Disposition: form-data; name="bookFile"; filename="Digital-Skills-Handbook.docx"\r\n`;
    body += `Content-Type: application/vnd.openxmlformats-officedocument.wordprocessingml.document\r\n\r\n`;

    const bodyBuffer = Buffer.concat([
      Buffer.from(body, 'utf8'),
      docxBuf,
      Buffer.from(`\r\n--${boundary}--\r\n`, 'utf8')
    ]);

    const res = await fetch(`${BASE_URL}/api/resources/generate-course`, {
      method: 'POST',
      headers: {
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        'x-user-email': adminEmail
      },
      body: bodyBuffer
    });

    const data = await res.json();
    console.log('DEBUG DOCX Data:', res.status, data);
    generatedCourseId = data.courseId;

    assert(
      res.status === 200 &&
      data.success === true &&
      data.moduleCount === 2 &&
      data.lessonCount === 4 &&
      generatedCourseId,
      'DOCX Upload & Generation created Draft Course with 2 Modules and 4 Lessons'
    );
  } catch (err) {
    assert(false, `DOCX generation test error: ${err.message}`);
  }

  // 2. Verify Generated Course Hierarchy & Draft Status
  if (generatedCourseId) {
    try {
      const res = await fetch(`${BASE_URL}/api/courses/${generatedCourseId}/content/admin`, {
        headers: { 'x-user-email': adminEmail }
      });
      const data = await res.json();
      const course = data.course;
      const modules = data.modules || [];

      assert(
        res.status === 200 &&
        course?.status === 'draft' &&
        modules.length === 2 &&
        modules.every(m => m.status === 'draft') &&
        modules[0].lessons.every(l => l.status === 'draft'),
        'Generated course, modules, and lessons are strictly in Draft status'
      );

      const firstLesson = modules[0]?.lessons?.[0];
      assert(
        Array.isArray(firstLesson?.attachedResources) &&
        firstLesson.attachedResources.length === 1 &&
        firstLesson.attachedResources[0].storageKey,
        'Generated lesson contains reference to single uploaded S3 resource'
      );
    } catch (err) {
      assert(false, `Course hierarchy verification error: ${err.message}`);
    }
  }

  // 3. Test Unsupported File Format Rejection (e.g. .txt)
  try {
    const boundary = '----WebKitFormBoundary' + Math.random().toString(36).substring(2);
    let body = `--${boundary}\r\n`;
    body += `Content-Disposition: form-data; name="title"\r\n\r\nSample Text\r\n`;
    body += `--${boundary}\r\n`;
    body += `Content-Disposition: form-data; name="bookFile"; filename="notes.txt"\r\n`;
    body += `Content-Type: text/plain\r\n\r\nSample notes content\r\n`;
    body += `--${boundary}--\r\n`;

    const res = await fetch(`${BASE_URL}/api/resources/generate-course`, {
      method: 'POST',
      headers: {
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        'x-user-email': adminEmail
      },
      body: Buffer.from(body, 'utf8')
    });

    assert(res.status === 400, 'Non-PDF/DOCX format (.txt) correctly rejected from course generation');
  } catch (err) {
    assert(false, `Format rejection test error: ${err.message}`);
  }

  // 4. Test Valid Readable PDF Course Generation
  try {
    const pdfText = 'Module 1: Essential Work Skills\\nLesson 1: Professional Email Writing\\nLearn how to write effective workplace emails.\\nLesson 2: Team Collaboration Tools\\nPractice communicating with team members using digital tools.';
    const validPdfBuf = createSamplePdfBuffer(pdfText);
    const boundary = '----WebKitFormBoundary' + Math.random().toString(36).substring(2);

    let body = `--${boundary}\r\n`;
    body += `Content-Disposition: form-data; name="title"\r\n\r\nWorkplace Guide\r\n`;
    body += `--${boundary}\r\n`;
    body += `Content-Disposition: form-data; name="subject"\r\n\r\nWork & Life Skills\r\n`;
    body += `--${boundary}\r\n`;
    body += `Content-Disposition: form-data; name="bookFile"; filename="workplace-guide.pdf"\r\n`;
    body += `Content-Type: application/pdf\r\n\r\n`;

    const bodyBuffer = Buffer.concat([
      Buffer.from(body, 'utf8'),
      validPdfBuf,
      Buffer.from(`\r\n--${boundary}--\r\n`, 'utf8')
    ]);

    const res = await fetch(`${BASE_URL}/api/resources/generate-course`, {
      method: 'POST',
      headers: {
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        'x-user-email': adminEmail
      },
      body: bodyBuffer
    });

    const data = await res.json();
    console.log('DEBUG PDF Data:', res.status, data);

    assert(
      res.status === 200 &&
      data.success === true &&
      data.courseId &&
      data.moduleCount >= 1 &&
      data.lessonCount >= 1,
      'Valid readable PDF creates Draft course with modules and lessons'
    );
  } catch (err) {
    assert(false, `Valid PDF test error: ${err.message}`);
  }

  // 5. Test Scanned / Empty PDF (Graceful failure without creating empty course)
  try {
    const emptyPdfBuf = createSamplePdfBuffer('Hi'); // very short text (< 50 chars)
    const boundary = '----WebKitFormBoundary' + Math.random().toString(36).substring(2);

    let body = `--${boundary}\r\n`;
    body += `Content-Disposition: form-data; name="title"\r\n\r\nScanned Document\r\n`;
    body += `--${boundary}\r\n`;
    body += `Content-Disposition: form-data; name="subject"\r\n\r\nGeneral Training\r\n`;
    body += `--${boundary}\r\n`;
    body += `Content-Disposition: form-data; name="bookFile"; filename="scanned-sheet.pdf"\r\n`;
    body += `Content-Type: application/pdf\r\n\r\n`;

    const bodyBuffer = Buffer.concat([
      Buffer.from(body, 'utf8'),
      emptyPdfBuf,
      Buffer.from(`\r\n--${boundary}--\r\n`, 'utf8')
    ]);

    const res = await fetch(`${BASE_URL}/api/resources/generate-course`, {
      method: 'POST',
      headers: {
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        'x-user-email': adminEmail
      },
      body: bodyBuffer
    });

    const data = await res.json();

    assert(
      res.status === 200 &&
      data.success === false &&
      data.resourceUploaded === true &&
      !data.courseId,
      'Scanned / unreadable PDF is uploaded as a resource but does not create an empty course'
    );
  } catch (err) {
    assert(false, `Scanned PDF test error: ${err.message}`);
  }

  // 5. Test Non-Admin Rejection (401 / 403)
  try {
    const res = await fetch(`${BASE_URL}/api/resources/generate-course`, {
      method: 'POST'
    });
    assert(res.status === 401, 'Unauthenticated course generation request rejected with 401');
  } catch (err) {
    assert(false, `Auth rejection test error: ${err.message}`);
  }

  console.log(`\n========================================`);
  console.log(`🏁 COURSE GENERATION TESTS COMPLETED: ${passed} Passed, ${failed} Failed`);
  console.log(`========================================\n`);

  if (failed > 0) process.exit(1);
}

runTests();
