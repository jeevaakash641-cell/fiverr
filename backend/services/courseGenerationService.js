import { uploadBook } from './s3BooksService.js';
import { parseDocumentToStructure } from './documentParserService.js';
import { createCourse } from './courseService.js';
import { createModule } from './moduleService.js';
import { createLesson } from './lessonService.js';
import { getBedrockResponse } from './bedrockService.js';

/**
 * Upload document as S3 resource and generate a Draft course with modules and lessons
 * @param {Object} file - Multer file object
 * @param {Object} metadata - Resource book metadata
 * @param {Object} options - { courseTitle, includeExtractedText, attachOriginalDocument }
 * @param {string} adminEmail - Authenticated admin email
 */
export async function generateCourseFromDocument(file, metadata, options = {}, adminEmail = 'admin@onecommunityely.com') {
  if (!file || !file.buffer) {
    throw new Error('No document file provided for course generation');
  }

  const {
    courseTitle = '',
    includeExtractedText = true,
    attachOriginalDocument = true
  } = options;

  console.log('🚀 Starting Upload and Generate Draft Course for:', file.originalname);

  // 1. Upload original file to S3 as a standard learning resource
  const resource = await uploadBook(file, {
    title: metadata.title || file.originalname,
    author: metadata.author || 'One Community Ely',
    subject: metadata.subject || 'Work & Life Skills',
    class: metadata.class || 'All',
    type: metadata.type || 'guide',
    state: metadata.state || 'All',
    medium: metadata.medium || 'both',
    language: metadata.language || 'English',
    term: metadata.term || '',
    description: metadata.description || '',
    isbn: metadata.isbn || '',
    publisher: metadata.publisher || 'One Community Ely',
    publishYear: metadata.publishYear || new Date().getFullYear().toString(),
    uploadedBy: adminEmail,
    userType: 'teacher'
  });

  console.log('✅ Resource uploaded to S3 successfully with key:', resource.key);

  // 2. Parse document structure (DOCX or PDF)
  let parseResult;
  try {
    parseResult = await parseDocumentToStructure(file.buffer, file.originalname, file.mimetype);
  } catch (parseErr) {
    console.error('Document parsing error:', parseErr);
    return {
      success: false,
      resourceUploaded: true,
      resource,
      error: `The document was uploaded successfully, but could not be parsed: ${parseErr.message}`
    };
  }

  // 3. Check for readable text layer (e.g. not scanned image)
  if (!parseResult.isReadable) {
    console.warn('⚠️ Document contains no readable text. Aborting course generation.');
    return {
      success: false,
      resourceUploaded: true,
      resource,
      error: 'The document was uploaded successfully, but a course could not be generated because readable text was not detected.'
    };
  }

  let finalCourse = parseResult.course;
  let finalModules = parseResult.modules;

  // 4. Fast AI-Assisted Structure Refinement (AWS Bedrock with fast 4s timeout)
  try {
    if (process.env.AWS_ACCESS_KEY_ID && parseResult.rawText && parseResult.rawText.length > 100) {
      console.log('🤖 Invoking Bedrock for fast course structure enhancement...');
      const sampleText = parseResult.rawText.slice(0, 2000);
      const prompt = `You are a curriculum designer. Based on this text, generate a JSON course outline:
Document:
${sampleText}

JSON schema:
{
  "shortDescription": "2 sentence overview",
  "learningOutcomes": ["Outcome 1", "Outcome 2", "Outcome 3"],
  "estimatedDuration": "3 hours"
}`;

      const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Bedrock timeout')), 4000));
      const aiResponse = await Promise.race([
        getBedrockResponse(prompt, { maxTokens: 250, temperature: 0.2 }),
        timeoutPromise
      ]);

      const cleanJsonStr = aiResponse.replace(/```json/gi, '').replace(/```/g, '').trim();
      const aiData = JSON.parse(cleanJsonStr);

      if (aiData.shortDescription) finalCourse.shortDescription = aiData.shortDescription;
      if (Array.isArray(aiData.learningOutcomes) && aiData.learningOutcomes.length > 0) {
        finalCourse.learningOutcomes = aiData.learningOutcomes;
      }
      if (aiData.estimatedDuration) finalCourse.estimatedDuration = aiData.estimatedDuration;
      console.log('✅ Bedrock curriculum enhancement applied.');
    }
  } catch (aiErr) {
    console.warn('⚠️ Bedrock enhancement skipped/timed out, using instant deterministic structure:', aiErr.message);
  }

  // 5. Create Draft Course in DynamoDB (EduLearnCourses)
  const chosenTitle = (courseTitle || metadata.title || finalCourse.title).trim();
  const coursePayload = {
    title: chosenTitle,
    category: metadata.subject || finalCourse.category || 'Work & Life Skills',
    shortDescription: finalCourse.shortDescription || `Course covering ${chosenTitle}.`,
    fullDescription: finalCourse.fullDescription || `Comprehensive learning modules for ${chosenTitle}. Generated from ${file.originalname}.`,
    difficultyLevel: finalCourse.difficultyLevel || 'Beginner',
    estimatedDuration: finalCourse.estimatedDuration || '3 hours',
    learningOutcomes: finalCourse.learningOutcomes || [`Master essential concepts of ${chosenTitle}`],
    status: 'draft',
    generatedFromResourceId: resource.key,
    generationMethod: 'document',
    generatedAt: new Date().toISOString(),
    requiresAdminReview: true
  };

  const createdCourse = await createCourse(coursePayload, adminEmail);
  console.log('✅ Draft Course created in DynamoDB:', createdCourse.courseId);

  // Prepare stable reference to uploaded resource for lessons
  const fileExt = (file.originalname.substring(file.originalname.lastIndexOf('.')).toUpperCase().replace('.', '')) || 'PDF';
  const resourceReference = {
    resourceId: resource.key,
    title: metadata.title || file.originalname,
    format: fileExt,
    storageKey: resource.key,
    viewUrl: resource.viewUrl || `/book-viewer/${encodeURIComponent(resource.key)}`
  };

  // 6. Create Draft Modules & Lessons in DynamoDB (Parallelized for maximum speed)
  const createdModules = await Promise.all(finalModules.map(async (mod, mIdx) => {
    const modulePayload = {
      title: mod.title || `Module ${mIdx + 1}`,
      description: mod.description || `Module covering ${mod.title || 'course topics'}.`,
      orderIndex: mIdx,
      status: 'draft'
    };

    const createdModule = await createModule(createdCourse.courseId, modulePayload, adminEmail);

    const lessonsList = mod.lessons || [];
    const createdLessons = await Promise.all(lessonsList.map(async (les, lIdx) => {
      const lessonPayload = {
        title: les.title || `Lesson ${lIdx + 1}`,
        shortDescription: les.shortDescription || `Learn about ${les.title}.`,
        content: includeExtractedText ? (les.content || `<p>Lesson content on ${les.title}.</p>`) : `<p>Lesson content on ${les.title}.</p>`,
        contentFormat: 'html',
        orderIndex: lIdx,
        estimatedMinutes: les.estimatedMinutes || 15,
        attachedResources: attachOriginalDocument ? [resourceReference] : [],
        status: 'draft'
      };

      return await createLesson(createdCourse.courseId, createdModule.moduleId, lessonPayload, adminEmail);
    }));

    return {
      ...createdModule,
      lessons: createdLessons
    };
  }));

  const totalLessonsCreated = createdModules.reduce((acc, m) => acc + (m.lessons?.length || 0), 0);

  console.log(`🎉 High-Speed Course Generation Complete! Course: "${createdCourse.title}", Modules: ${createdModules.length}, Lessons: ${totalLessonsCreated}`);

  return {
    success: true,
    jobId: `gen_${Date.now()}`,
    resourceId: resource.key,
    courseId: createdCourse.courseId,
    courseTitle: createdCourse.title,
    status: 'completed',
    moduleCount: createdModules.length,
    lessonCount: totalLessonsCreated,
    resource,
    warnings: parseResult.warnings || []
  };
}

export default {
  generateCourseFromDocument
};
