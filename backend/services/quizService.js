/**
 * Quiz Service — stores and manages course quizzes & learner attempts in DynamoDB
 * Tables:
 *   - EduLearnQuizzes (partition key: quizId)
 *   - EduLearnQuizAttempts (partition key: attemptId)
 */

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, GetCommand, UpdateCommand, ScanCommand, DeleteCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';
import { randomUUID } from 'crypto';
import { getCourseById } from './courseService.js';
import { getModuleById } from './moduleService.js';
import { getLessonById } from './lessonService.js';
import { getBedrockResponse } from './bedrockService.js';

const QUIZZES_TABLE = process.env.DYNAMODB_TABLE_QUIZZES || 'EduLearnQuizzes';
const ATTEMPTS_TABLE = process.env.DYNAMODB_TABLE_QUIZ_ATTEMPTS || 'EduLearnQuizAttempts';

let docClient = null;

function getClient() {
  if (!docClient) {
    const raw = new DynamoDBClient({
      region: process.env.AWS_REGION || 'us-east-1',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID?.trim(),
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY?.trim(),
      },
    });
    docClient = DynamoDBDocumentClient.from(raw);
  }
  return docClient;
}

// In-memory fallback stores for high resilience
const inMemoryQuizzes = new Map();
const inMemoryAttempts = new Map();

export const VALID_QUIZ_STATUSES = ['draft', 'published', 'unpublished', 'archived'];
export const VALID_QUESTION_TYPES = ['multiple_choice', 'true_false'];

/**
 * Validate a quiz payload
 * @param {Object} data - Quiz payload
 * @param {boolean} isPublishing - Whether the quiz is being published
 */
export function validateQuizPayload(data, isPublishing = false) {
  const errors = [];

  if (!data.title || typeof data.title !== 'string' || data.title.trim().length < 3) {
    errors.push('Quiz title is required and must contain at least 3 characters');
  }

  if (!data.courseId || typeof data.courseId !== 'string' || !data.courseId.trim()) {
    errors.push('An associated course is required for the quiz');
  }

  const passingScore = Number(data.passingScore ?? 70);
  if (isNaN(passingScore) || passingScore < 0 || passingScore > 100) {
    errors.push('Passing score percentage must be a number between 0 and 100');
  }

  if (data.maximumAttempts !== undefined && data.maximumAttempts !== null && data.maximumAttempts !== '') {
    const maxAtt = Number(data.maximumAttempts);
    if (!Number.isInteger(maxAtt) || maxAtt < 1) {
      errors.push('Maximum attempts must be a positive integer of at least 1');
    }
  }

  if (data.status !== undefined && !VALID_QUIZ_STATUSES.includes(data.status)) {
    errors.push(`Status must be one of: ${VALID_QUIZ_STATUSES.join(', ')}`);
  }

  // Question validation
  const questions = Array.isArray(data.questions) ? data.questions : [];

  if (isPublishing) {
    if (questions.length === 0) {
      errors.push('At least one question is required before publishing a quiz');
    }

    questions.forEach((q, idx) => {
      const qNum = idx + 1;
      if (!q.questionText || typeof q.questionText !== 'string' || !q.questionText.trim()) {
        errors.push(`Question #${qNum} must contain question text`);
      }

      const qType = q.type || 'multiple_choice';
      if (!VALID_QUESTION_TYPES.includes(qType)) {
        errors.push(`Question #${qNum} has an invalid type "${qType}"`);
      }

      if (qType === 'multiple_choice') {
        const options = Array.isArray(q.options) ? q.options : [];
        const cleanOpts = options.map(o => typeof o === 'string' ? o.trim() : '').filter(Boolean);
        if (cleanOpts.length < 2) {
          errors.push(`Question #${qNum} (Multiple Choice) must have at least 2 non-empty options`);
        }
        if (q.correctAnswer === undefined || q.correctAnswer === null || q.correctAnswer === '') {
          errors.push(`Question #${qNum} must have exactly one correct answer selected`);
        }
      } else if (qType === 'true_false') {
        const validTf = ['True', 'False', 'true', 'false', true, false];
        if (q.correctAnswer === undefined || !validTf.includes(q.correctAnswer)) {
          errors.push(`Question #${qNum} (True/False) must have either "True" or "False" selected as correct answer`);
        }
      }
    });
  }

  return errors;
}

/**
 * Sanitize and format questions array
 */
export function formatQuestions(questions = []) {
  if (!Array.isArray(questions)) return [];

  return questions.map((q, idx) => {
    const qType = q.type === 'true_false' ? 'true_false' : 'multiple_choice';
    const qId = q.questionId || `q_${randomUUID().substring(0, 8)}`;
    
    let options = [];
    let correctAnswer = q.correctAnswer;

    if (qType === 'multiple_choice') {
      options = Array.isArray(q.options) 
        ? q.options.map(o => typeof o === 'string' ? o.trim() : String(o || '')).filter(Boolean)
        : [];
      
      // If correctAnswer is numeric index, ensure it points to valid option
      if (typeof correctAnswer === 'number' && options[correctAnswer] !== undefined) {
        correctAnswer = options[correctAnswer];
      }
      if (typeof correctAnswer === 'string') {
        correctAnswer = correctAnswer.trim();
      }
    } else {
      options = ['True', 'False'];
      if (typeof correctAnswer === 'boolean') {
        correctAnswer = correctAnswer ? 'True' : 'False';
      } else if (typeof correctAnswer === 'string') {
        correctAnswer = correctAnswer.toLowerCase() === 'true' ? 'True' : 'False';
      } else {
        correctAnswer = 'True';
      }
    }

    return {
      questionId: qId,
      order: q.order !== undefined ? Number(q.order) : idx + 1,
      type: qType,
      questionText: (q.questionText || '').trim(),
      options,
      correctAnswer,
      explanation: (q.explanation || '').trim(),
      points: Number(q.points) > 0 ? Number(q.points) : 1
    };
  });
}

/**
 * Strip correct answers and explanations for learner consumption
 */
export function stripAnswersForLearner(quiz) {
  if (!quiz) return null;

  const sanitized = { ...quiz };
  if (Array.isArray(sanitized.questions)) {
    sanitized.questions = sanitized.questions.map(q => {
      const safeQ = { ...q };
      delete safeQ.correctAnswer;
      delete safeQ.explanation;
      return safeQ;
    });
  }
  return sanitized;
}

/**
 * Create a new Quiz
 */
export async function createQuiz(data, createdByEmail = 'admin') {
  const isPublishing = data.status === 'published';
  const errors = validateQuizPayload(data, isPublishing);
  if (errors.length > 0) {
    throw new Error(`Validation failed: ${errors.join('; ')}`);
  }

  // Verify course exists
  const course = await getCourseById(data.courseId);
  if (!course) {
    throw new Error(`Course with ID "${data.courseId}" does not exist`);
  }

  let moduleTitle = data.moduleTitle ? data.moduleTitle.trim() : '';
  if (data.moduleId) {
    const mod = await getModuleById(data.moduleId).catch(() => null);
    if (mod) moduleTitle = mod.title;
  }

  let lessonTitle = data.lessonTitle ? data.lessonTitle.trim() : '';
  if (data.lessonId) {
    const les = await getLessonById(data.lessonId).catch(() => null);
    if (les) lessonTitle = les.title;
  }

  const now = new Date().toISOString();
  const quizId = data.quizId || `quiz_${randomUUID()}`;
  const formattedQuestionsList = formatQuestions(data.questions);

  const quiz = {
    quizId,
    title: data.title.trim(),
    instructions: (data.instructions || '').trim(),
    courseId: data.courseId,
    courseTitle: course.title,
    moduleId: data.moduleId || null,
    moduleTitle: moduleTitle || null,
    lessonId: data.lessonId || null,
    lessonTitle: lessonTitle || null,
    passingScore: Number(data.passingScore ?? 70),
    maximumAttempts: data.maximumAttempts ? Number(data.maximumAttempts) : null,
    status: data.status || 'draft',
    creationMethod: data.creationMethod || 'manual', // 'manual' | 'ai'
    questions: formattedQuestionsList,
    questionCount: formattedQuestionsList.length,
    version: 1,
    isDeleted: false,
    createdBy: createdByEmail,
    createdAt: now,
    updatedAt: now,
    publishedAt: data.status === 'published' ? now : null
  };

  // 1. Memory store
  inMemoryQuizzes.set(quizId, quiz);

  // 2. DynamoDB Put
  try {
    const client = getClient();
    await client.send(new PutCommand({
      TableName: QUIZZES_TABLE,
      Item: quiz
    }));
  } catch (dbErr) {
    console.warn(`[quizService] DynamoDB put failed for table ${QUIZZES_TABLE}, using memory fallback:`, dbErr.message);
  }

  return quiz;
}

/**
 * Get Quiz by ID
 * @param {string} quizId
 * @param {boolean} includeAnswers - Whether to include correct answers and explanations
 */
export async function getQuizById(quizId, includeAnswers = false) {
  if (!quizId) return null;

  let quiz = null;

  try {
    const client = getClient();
    const res = await client.send(new GetCommand({
      TableName: QUIZZES_TABLE,
      Key: { quizId }
    }));
    if (res.Item) {
      quiz = res.Item;
      inMemoryQuizzes.set(quizId, quiz);
    }
  } catch (err) {
    console.warn(`[quizService] DynamoDB get failed for ${quizId}:`, err.message);
  }

  if (!quiz && inMemoryQuizzes.has(quizId)) {
    quiz = inMemoryQuizzes.get(quizId);
  }

  if (!quiz || quiz.isDeleted) return null;

  if (!includeAnswers) {
    return stripAnswersForLearner(quiz);
  }

  return quiz;
}

/**
 * Get All Quizzes for Admin (Includes Draft, Published, Unpublished)
 */
export async function getAllQuizzesAdmin(filters = {}) {
  const { status, courseId, creationMethod, search } = filters;
  let allQuizzes = [];

  try {
    const client = getClient();
    const res = await client.send(new ScanCommand({
      TableName: QUIZZES_TABLE
    }));
    if (res.Items && Array.isArray(res.Items)) {
      allQuizzes = res.Items;
      allQuizzes.forEach(q => inMemoryQuizzes.set(q.quizId, q));
    }
  } catch (err) {
    console.warn(`[quizService] DynamoDB scan failed, falling back to in-memory:`, err.message);
    allQuizzes = Array.from(inMemoryQuizzes.values());
  }

  // Filter out deleted quizzes
  let result = allQuizzes.filter(q => !q.isDeleted);

  if (status && status !== 'all') {
    result = result.filter(q => q.status === status);
  }

  if (courseId && courseId !== 'all') {
    result = result.filter(q => q.courseId === courseId);
  }

  if (creationMethod && creationMethod !== 'all') {
    result = result.filter(q => q.creationMethod === creationMethod);
  }

  if (search && search.trim()) {
    const term = search.trim().toLowerCase();
    result = result.filter(q => 
      (q.title && q.title.toLowerCase().includes(term)) ||
      (q.courseTitle && q.courseTitle.toLowerCase().includes(term)) ||
      (q.moduleTitle && q.moduleTitle.toLowerCase().includes(term)) ||
      (q.lessonTitle && q.lessonTitle.toLowerCase().includes(term)) ||
      (q.instructions && q.instructions.toLowerCase().includes(term))
    );
  }

  // Sort by updatedAt descending
  result.sort((a, b) => new Date(b.updatedAt || b.createdAt || 0) - new Date(a.updatedAt || a.createdAt || 0));

  return result;
}

/**
 * Get Published Quizzes for Learners
 */
export async function getPublishedQuizzesForLearner(filters = {}) {
  const { courseId, lessonId, search } = filters;
  const adminQuizzes = await getAllQuizzesAdmin();

  let published = adminQuizzes.filter(q => q.status === 'published' && !q.isDeleted);

  if (courseId && courseId !== 'all') {
    published = published.filter(q => q.courseId === courseId);
  }

  if (lessonId && lessonId !== 'all') {
    published = published.filter(q => q.lessonId === lessonId);
  }

  if (search && search.trim()) {
    const term = search.trim().toLowerCase();
    published = published.filter(q => 
      (q.title && q.title.toLowerCase().includes(term)) ||
      (q.courseTitle && q.courseTitle.toLowerCase().includes(term))
    );
  }

  // Strip answers for learner safety
  return published.map(q => stripAnswersForLearner(q));
}

/**
 * Update Quiz (Admin)
 */
export async function updateQuiz(quizId, data, updatedByEmail = 'admin') {
  const existing = await getQuizById(quizId, true);
  if (!existing) {
    throw new Error(`Quiz with ID "${quizId}" not found`);
  }

  const isPublishing = (data.status || existing.status) === 'published';
  const errors = validateQuizPayload({ ...existing, ...data }, isPublishing);
  if (errors.length > 0) {
    throw new Error(`Validation failed: ${errors.join('; ')}`);
  }

  let courseTitle = existing.courseTitle;
  if (data.courseId && data.courseId !== existing.courseId) {
    const course = await getCourseById(data.courseId);
    if (!course) throw new Error(`Course "${data.courseId}" not found`);
    courseTitle = course.title;
  }

  let moduleTitle = data.moduleTitle !== undefined ? (data.moduleTitle || null) : existing.moduleTitle;
  if (data.moduleId !== undefined) {
    if (data.moduleId) {
      const mod = await getModuleById(data.moduleId).catch(() => null);
      if (mod) moduleTitle = mod.title;
    } else if (!data.moduleTitle) {
      moduleTitle = null;
    }
  }

  let lessonTitle = data.lessonTitle !== undefined ? (data.lessonTitle || null) : existing.lessonTitle;
  if (data.lessonId !== undefined) {
    if (data.lessonId) {
      const les = await getLessonById(data.lessonId).catch(() => null);
      if (les) lessonTitle = les.title;
    } else if (!data.lessonTitle) {
      lessonTitle = null;
    }
  }

  const now = new Date().toISOString();
  const formattedQuestionsList = data.questions !== undefined ? formatQuestions(data.questions) : existing.questions;
  const newStatus = data.status || existing.status;
  const currentVersion = Number(existing.version || 1);

  const updatedQuiz = {
    ...existing,
    title: data.title !== undefined ? data.title.trim() : existing.title,
    instructions: data.instructions !== undefined ? data.instructions.trim() : existing.instructions,
    courseId: data.courseId || existing.courseId,
    courseTitle,
    moduleId: data.moduleId !== undefined ? data.moduleId : existing.moduleId,
    moduleTitle,
    lessonId: data.lessonId !== undefined ? data.lessonId : existing.lessonId,
    lessonTitle,
    passingScore: data.passingScore !== undefined ? Number(data.passingScore) : existing.passingScore,
    maximumAttempts: data.maximumAttempts !== undefined ? (data.maximumAttempts ? Number(data.maximumAttempts) : null) : existing.maximumAttempts,
    status: newStatus,
    questions: formattedQuestionsList,
    questionCount: formattedQuestionsList.length,
    version: currentVersion + 1,
    updatedAt: now,
    publishedAt: newStatus === 'published' ? (existing.publishedAt || now) : existing.publishedAt,
    lastUpdatedBy: updatedByEmail
  };

  inMemoryQuizzes.set(quizId, updatedQuiz);

  try {
    const client = getClient();
    await client.send(new PutCommand({
      TableName: QUIZZES_TABLE,
      Item: updatedQuiz
    }));
  } catch (err) {
    console.warn(`[quizService] DynamoDB update failed for ${quizId}:`, err.message);
  }

  return updatedQuiz;
}

/**
 * Update Quiz Status (Publish / Unpublish / Archive)
 */
export async function updateQuizStatus(quizId, status, updatedByEmail = 'admin') {
  if (!VALID_QUIZ_STATUSES.includes(status)) {
    throw new Error(`Invalid status "${status}". Allowed: ${VALID_QUIZ_STATUSES.join(', ')}`);
  }

  const existing = await getQuizById(quizId, true);
  if (!existing) {
    throw new Error(`Quiz with ID "${quizId}" not found`);
  }

  if (status === 'published') {
    const errors = validateQuizPayload(existing, true);
    if (errors.length > 0) {
      throw new Error(`Cannot publish quiz: ${errors.join('; ')}`);
    }
  }

  const now = new Date().toISOString();
  const updatedQuiz = {
    ...existing,
    status,
    updatedAt: now,
    publishedAt: status === 'published' ? (existing.publishedAt || now) : existing.publishedAt,
    lastUpdatedBy: updatedByEmail
  };

  inMemoryQuizzes.set(quizId, updatedQuiz);

  try {
    const client = getClient();
    await client.send(new PutCommand({
      TableName: QUIZZES_TABLE,
      Item: updatedQuiz
    }));
  } catch (err) {
    console.warn(`[quizService] DynamoDB status update failed for ${quizId}:`, err.message);
  }

  return updatedQuiz;
}

/**
 * Duplicate a Quiz
 */
export async function duplicateQuiz(quizId, createdByEmail = 'admin') {
  const existing = await getQuizById(quizId, true);
  if (!existing) {
    throw new Error(`Quiz with ID "${quizId}" not found`);
  }

  const newQuizData = {
    ...existing,
    quizId: `quiz_${randomUUID()}`,
    title: `${existing.title} (Copy)`,
    status: 'draft',
    creationMethod: existing.creationMethod || 'manual',
    questions: existing.questions.map(q => ({
      ...q,
      questionId: `q_${randomUUID().substring(0, 8)}`
    }))
  };

  return await createQuiz(newQuizData, createdByEmail);
}

/**
 * Soft Delete / Archive Quiz (Preserves learner attempt history)
 */
export async function deleteQuiz(quizId, deletedByEmail = 'admin') {
  const existing = await getQuizById(quizId, true);
  if (!existing) {
    throw new Error(`Quiz with ID "${quizId}" not found`);
  }

  const now = new Date().toISOString();
  const archivedQuiz = {
    ...existing,
    status: 'archived',
    isDeleted: true,
    deletedAt: now,
    deletedBy: deletedByEmail,
    updatedAt: now
  };

  inMemoryQuizzes.set(quizId, archivedQuiz);

  try {
    const client = getClient();
    await client.send(new PutCommand({
      TableName: QUIZZES_TABLE,
      Item: archivedQuiz
    }));
  } catch (err) {
    console.warn(`[quizService] DynamoDB delete/archive failed for ${quizId}:`, err.message);
  }

  return { success: true, message: 'Quiz deleted successfully. Learner results are preserved.' };
}

/**
 * Generate a Draft Quiz using AWS Bedrock based on Course / Lesson content
 */
export async function generateAIQuizDraft(params, createdByEmail = 'admin') {
  const {
    courseId,
    moduleId,
    moduleTitle: inputModuleTitle,
    lessonId,
    lessonTitle: inputLessonTitle,
    title,
    numQuestions = 5,
    difficulty = 'medium',
    questionTypes = 'mixed', // 'multiple_choice' | 'true_false' | 'mixed'
    passingScore = 70
  } = params;

  if (!courseId) {
    throw new Error('A course is required to generate an AI quiz');
  }

  const course = await getCourseById(courseId);
  if (!course) {
    throw new Error(`Course with ID "${courseId}" not found`);
  }

  let contextText = `Course Title: ${course.title}\nCourse Category: ${course.category || 'General'}\nCourse Description: ${course.shortDescription || course.fullDescription || ''}`;

  if (course.learningOutcomes && course.learningOutcomes.length > 0) {
    contextText += `\nLearning Outcomes:\n- ${course.learningOutcomes.join('\n- ')}`;
  }

  let moduleObj = null;
  let effectiveModuleTitle = (inputModuleTitle || '').trim();
  if (moduleId) {
    moduleObj = await getModuleById(moduleId).catch(() => null);
    if (moduleObj) {
      effectiveModuleTitle = moduleObj.title;
      contextText += `\nModule: ${moduleObj.title}\nModule Description: ${moduleObj.description || ''}`;
    }
  } else if (effectiveModuleTitle) {
    contextText += `\nModule / Topic: ${effectiveModuleTitle}`;
  }

  let lessonObj = null;
  let effectiveLessonTitle = (inputLessonTitle || '').trim();
  if (lessonId) {
    lessonObj = await getLessonById(lessonId).catch(() => null);
    if (lessonObj) {
      effectiveLessonTitle = lessonObj.title;
      if (!moduleId && lessonObj.moduleId) {
        moduleObj = await getModuleById(lessonObj.moduleId).catch(() => null);
      }
      contextText += `\n\n--- TARGET LESSON TO TEST ---`;
      contextText += `\nLesson Title: ${lessonObj.title}`;
      if (lessonObj.shortDescription) {
        contextText += `\nLesson Summary: ${lessonObj.shortDescription}`;
      }
      if (lessonObj.content) {
        const stripped = lessonObj.content.replace(/<[^>]*>/g, ' ').substring(0, 5000);
        contextText += `\nLesson Teaching Material & Notes:\n${stripped}`;
      }
    }
  } else if (effectiveLessonTitle) {
    contextText += `\n\n--- TARGET LESSON / TOPIC TO TEST ---`;
    contextText += `\nLesson Title: ${effectiveLessonTitle}`;
  }

  const targetCount = Math.min(Math.max(parseInt(numQuestions) || 5, 1), 150);
  const diff = ['easy', 'medium', 'hard'].includes(difficulty?.toLowerCase()) ? difficulty.toLowerCase() : 'medium';
  
  let typeInstruction = '';
  if (questionTypes === 'multiple_choice') {
    typeInstruction = 'All questions MUST be "multiple_choice" with exactly 4 clear options (A, B, C, D).';
  } else if (questionTypes === 'true_false') {
    typeInstruction = 'All questions MUST be "true_false" with options ["True", "False"].';
  } else {
    typeInstruction = 'Generate a balanced mix of "multiple_choice" (4 options) and "true_false" (options: ["True", "False"]) questions.';
  }

  const quizTitle = title?.trim() || `${effectiveLessonTitle ? effectiveLessonTitle : (effectiveModuleTitle ? effectiveModuleTitle : course.title)} Knowledge Check`;

  const lessonFocusRule = effectiveLessonTitle 
    ? `\nFOCUS REQUIREMENT: All questions MUST directly test and evaluate the concepts taught in the lesson/topic "${effectiveLessonTitle}".`
    : '';

  // Determine batches for generating large sets safely (e.g. 50, 100 questions)
  const BATCH_SIZE = 15;
  const batches = [];
  let remaining = targetCount;
  while (remaining > 0) {
    const batchCount = Math.min(remaining, BATCH_SIZE);
    batches.push(batchCount);
    remaining -= batchCount;
  }

  console.log(`🤖 Invoking Bedrock to generate AI draft quiz for "${quizTitle}" (${targetCount} questions across ${batches.length} batch(es))...`);

  const parsedQuestions = [];
  const batchErrors = [];

  // Run batches concurrently for maximum performance
  const batchPromises = batches.map(async (batchCount, bIdx) => {
    const prompt = `You are an expert UK adult-education training designer for One Community Ely.
Generate a high-quality ${batchCount}-question ${diff} difficulty quiz (Batch ${bIdx + 1} of ${batches.length}) to evaluate adult learners on the following course material:

=== CONTEXT ===
${contextText}
=== END CONTEXT ===

RULES:
1. ${typeInstruction}${lessonFocusRule}
2. Language: Clear, practical, natural British English (UK spelling: e.g., summarise, practise, organise).
3. Suitability: Adult learners, community members, practical job and everyday life skills.
4. No markdown asterisks (** or *) in questionText, options, or explanations.
5. Provide realistic, scenario-based questions testing understanding, not trick questions.
6. For "multiple_choice":
   - "options": array of exactly 4 distinct strings.
   - "correctAnswer": the EXACT string from "options" that is the single correct answer.
7. For "true_false":
   - "options": ["True", "False"]
   - "correctAnswer": either "True" or "False"
8. "explanation": 1-2 encouraging sentences explaining why this is the right answer and giving a useful takeaway.
9. "points": 1

Return ONLY a valid JSON array starting with [ and ending with ]:
[
  {
    "type": "multiple_choice",
    "questionText": "When creating a personal budget, which expense category should be prioritized first?",
    "options": ["Essential living costs and utilities", "Entertainment and dining out", "Luxury purchases", "Holiday travel"],
    "correctAnswer": "Essential living costs and utilities",
    "explanation": "Prioritizing essential living costs such as rent, food, and energy ensures basic household security before discretionary spending.",
    "points": 1
  }
]`;

    try {
      const rawResponse = await getBedrockResponse(prompt, {
        maxTokens: 4000,
        temperature: 0.25 + (bIdx * 0.05),
        systemPrompt: 'You are a professional educational assessment generator. Return ONLY a valid JSON array of questions with no markdown formatting or commentary.'
      });

      if (!rawResponse || typeof rawResponse !== 'string' || !rawResponse.trim()) {
        batchErrors.push('AI service returned an empty response');
        return [];
      }

      const match = rawResponse.match(/\[[\s\S]*\]/);
      if (match) {
        const batchParsed = JSON.parse(match[0]);
        if (Array.isArray(batchParsed) && batchParsed.length > 0) {
          return batchParsed;
        }
      } else {
        const cleanText = rawResponse.replace(/```json/gi, '').replace(/```/g, '').trim();
        const fallbackMatch = cleanText.match(/\[[\s\S]*\]/);
        if (fallbackMatch) {
          const batchParsed = JSON.parse(fallbackMatch[0]);
          if (Array.isArray(batchParsed) && batchParsed.length > 0) {
            return batchParsed;
          }
        }
      }
      batchErrors.push('AI response did not contain a valid JSON questions array');
    } catch (batchErr) {
      console.warn(`[quizService] Batch ${bIdx + 1} generation error:`, batchErr.message);
      batchErrors.push(batchErr.message);
    }
    return [];
  });

  const batchResults = await Promise.all(batchPromises);
  batchResults.forEach(batch => parsedQuestions.push(...batch));

  // If no valid questions could be generated from AI, throw a clear error without creating an empty or unrelated quiz
  if (parsedQuestions.length === 0) {
    const detail = batchErrors.length > 0 ? `: ${batchErrors[0]}` : '';
    throw new Error(`AI question generation failed${detail}. Please check your lesson content or try again.`);
  }

  // Format and validate generated questions
  const formattedQuestions = parsedQuestions.map((q, idx) => {
    const qType = q.type === 'true_false' ? 'true_false' : 'multiple_choice';
    let options = [];
    let correctAnswer = q.correctAnswer;

    if (qType === 'multiple_choice') {
      options = Array.isArray(q.options) && q.options.length >= 2 
        ? q.options.map(o => String(o).replace(/^[A-D]\)\s*/, '').trim())
        : ['Option A', 'Option B', 'Option C', 'Option D'];

      if (typeof correctAnswer === 'number' && options[correctAnswer]) {
        correctAnswer = options[correctAnswer];
      } else if (typeof correctAnswer === 'string') {
        const clean = correctAnswer.replace(/^[A-D]\)\s*/, '').trim();
        const matchOpt = options.find(o => o.toLowerCase() === clean.toLowerCase());
        correctAnswer = matchOpt || options[0];
      } else {
        correctAnswer = options[0];
      }
    } else {
      options = ['True', 'False'];
      correctAnswer = String(correctAnswer).toLowerCase() === 'true' ? 'True' : 'False';
    }

    return {
      questionId: `q_ai_${randomUUID().substring(0, 8)}`,
      order: idx + 1,
      type: qType,
      questionText: (q.questionText || '').replace(/\*\*/g, '').trim(),
      options,
      correctAnswer,
      explanation: (q.explanation || 'Review the lesson material for more information.').replace(/\*\*/g, '').trim(),
      points: 1
    };
  });

  // STRICT RULE: AI-generated quizzes are ALWAYS saved as Draft
  const quizPayload = {
    title: quizTitle,
    instructions: `Knowledge check for ${course.title}. Complete all questions to check your understanding.`,
    courseId,
    moduleId: moduleId || null,
    lessonId: lessonId || null,
    passingScore: Number(passingScore) || 70,
    status: 'draft', // ALWAYS DRAFT
    creationMethod: 'ai', // Clearly marked as AI
    questions: formattedQuestions
  };

  const createdQuiz = await createQuiz(quizPayload, createdByEmail);
  console.log('✅ AI Draft Quiz created successfully:', createdQuiz.quizId, createdQuiz.title);

  return createdQuiz;
}

/**
 * Submit Quiz Attempt & Calculate Authoritative Score on Backend
 */
export async function submitQuizAttempt(quizId, learnerUser, submittedAnswers = {}, clientSubmissionId = null) {
  if (!learnerUser || !learnerUser.email) {
    throw new Error('Authenticated learner identity required to submit a quiz attempt');
  }

  // Load authoritative quiz with correct answers
  const quiz = await getQuizById(quizId, true);
  if (!quiz) {
    throw new Error(`Quiz with ID "${quizId}" not found`);
  }

  if (quiz.status !== 'published') {
    throw new Error('This quiz is not currently published or available for attempts');
  }

  const learnerEmail = String(learnerUser.email).toLowerCase().trim();
  const learnerId = learnerUser.id || learnerEmail;
  const submissionKey = clientSubmissionId ? String(clientSubmissionId).trim() : null;

  // Check prior attempts for this learner
  const priorAttempts = await getLearnerQuizAttempts(quizId, learnerEmail);

  // Idempotency: If client supplied an idempotency key and it was already processed, return original attempt
  if (submissionKey) {
    const existingAttempt = priorAttempts.find(a => 
      a.clientSubmissionId === submissionKey || a.submissionKey === submissionKey
    );
    if (existingAttempt) {
      console.log(`[quizService] Idempotency match: returning existing attempt ${existingAttempt.attemptId} for key "${submissionKey}"`);
      return {
        attemptId: existingAttempt.attemptId,
        quizId,
        quizTitle: quiz.title,
        score: existingAttempt.score,
        totalPoints: existingAttempt.totalPoints,
        correctCount: existingAttempt.correctCount,
        totalQuestions: (quiz.questions || []).length,
        percentage: existingAttempt.percentage,
        passingScore: existingAttempt.passingScore,
        passed: existingAttempt.passed,
        attemptNumber: existingAttempt.attemptNumber,
        maxAttempts: quiz.maximumAttempts,
        canRetry: quiz.maximumAttempts ? existingAttempt.attemptNumber < quiz.maximumAttempts : true,
        feedback: existingAttempt.feedback,
        submittedAt: existingAttempt.submittedAt,
        clientSubmissionId: submissionKey,
        isDuplicate: true,
        questionsReview: (quiz.questions || []).map(q => {
          const userAns = (existingAttempt.submittedAnswers || {})[q.questionId];
          const isCorrect = q.type === 'true_false'
            ? String(userAns).toLowerCase() === String(q.correctAnswer).toLowerCase()
            : String(userAns).trim().toLowerCase() === String(q.correctAnswer).trim().toLowerCase();
          return {
            questionId: q.questionId,
            order: q.order,
            type: q.type,
            questionText: q.questionText,
            options: q.options,
            submittedAnswer: userAns ?? null,
            correctAnswer: q.correctAnswer,
            isCorrect,
            pointsEarned: isCorrect ? (Number(q.points) || 1) : 0,
            pointsPossible: Number(q.points) || 1,
            explanation: q.explanation || 'Reviewed answer.'
          };
        })
      };
    }
  }

  // Enforce maximum attempts limit if configured
  if (quiz.maximumAttempts && priorAttempts.length >= quiz.maximumAttempts) {
    throw new Error(`You have reached the maximum allowed attempts (${quiz.maximumAttempts}) for this quiz.`);
  }

  const attemptNumber = priorAttempts.length + 1;
  const questions = quiz.questions || [];

  let totalPointsEarned = 0;
  let totalPointsPossible = 0;
  let correctCount = 0;

  const reviewItems = questions.map((q) => {
    const qPoints = Number(q.points) > 0 ? Number(q.points) : 1;
    totalPointsPossible += qPoints;

    const userAns = submittedAnswers[q.questionId];
    let isCorrect = false;

    if (userAns !== undefined && userAns !== null) {
      if (q.type === 'multiple_choice') {
        isCorrect = String(userAns).trim().toLowerCase() === String(q.correctAnswer).trim().toLowerCase();
      } else if (q.type === 'true_false') {
        const uBool = String(userAns).trim().toLowerCase() === 'true';
        const cBool = String(q.correctAnswer).trim().toLowerCase() === 'true';
        isCorrect = uBool === cBool;
      }
    }

    if (isCorrect) {
      totalPointsEarned += qPoints;
      correctCount++;
    }

    return {
      questionId: q.questionId,
      order: q.order,
      type: q.type,
      questionText: q.questionText,
      options: q.options,
      submittedAnswer: userAns !== undefined ? userAns : null,
      correctAnswer: q.correctAnswer,
      isCorrect,
      pointsEarned: isCorrect ? qPoints : 0,
      pointsPossible: qPoints,
      explanation: q.explanation || 'Great job answering this question.'
    };
  });

  const percentage = totalPointsPossible > 0 ? Math.round((totalPointsEarned / totalPointsPossible) * 100) : 0;
  const passingScore = Number(quiz.passingScore ?? 70);
  const passed = percentage >= passingScore;

  const now = new Date().toISOString();
  const attemptId = `att_${randomUUID()}`;

  const attemptRecord = {
    attemptId,
    quizId,
    quizTitle: quiz.title,
    quizVersion: quiz.version || 1,
    clientSubmissionId: submissionKey || null,
    submissionKey: submissionKey || null,
    learnerEmail,
    learnerId,
    learnerName: learnerUser.name || learnerUser.displayName || learnerEmail.split('@')[0],
    courseId: quiz.courseId,
    courseTitle: quiz.courseTitle,
    moduleId: quiz.moduleId || null,
    moduleTitle: quiz.moduleTitle || null,
    lessonId: quiz.lessonId || null,
    lessonTitle: quiz.lessonTitle || null,
    submittedAnswers,
    score: totalPointsEarned,
    totalPoints: totalPointsPossible,
    correctCount,
    totalQuestions: questions.length,
    percentage,
    passingScore,
    passed,
    attemptNumber,
    submittedAt: now,
    feedback: passed
      ? `Congratulations! You scored ${percentage}% and successfully passed this assessment.`
      : `You scored ${percentage}%. Keep learning—you can review the lesson and try again.`
  };

  // 1. Memory store
  inMemoryAttempts.set(attemptId, attemptRecord);

  // 2. DynamoDB Put
  try {
    const client = getClient();
    await client.send(new PutCommand({
      TableName: ATTEMPTS_TABLE,
      Item: attemptRecord
    }));
  } catch (err) {
    console.warn(`[quizService] DynamoDB attempt put failed for table ${ATTEMPTS_TABLE}:`, err.message);
  }

  const canRetry = quiz.maximumAttempts ? attemptNumber < quiz.maximumAttempts : true;

  return {
    attemptId,
    quizId,
    quizTitle: quiz.title,
    score: totalPointsEarned,
    totalPoints: totalPointsPossible,
    correctCount,
    totalQuestions: questions.length,
    percentage,
    passingScore,
    passed,
    attemptNumber,
    maxAttempts: quiz.maximumAttempts,
    canRetry,
    feedback: attemptRecord.feedback,
    submittedAt: now,
    questionsReview: reviewItems
  };
}

/**
 * Get past attempts for a specific quiz by authenticated learner
 */
export async function getLearnerQuizAttempts(quizId, learnerEmail) {
  if (!learnerEmail) return [];

  let allAttempts = [];

  try {
    const client = getClient();
    const res = await client.send(new ScanCommand({
      TableName: ATTEMPTS_TABLE
    }));
    if (res.Items && Array.isArray(res.Items)) {
      allAttempts = res.Items;
      allAttempts.forEach(a => inMemoryAttempts.set(a.attemptId, a));
    }
  } catch (err) {
    console.warn(`[quizService] DynamoDB attempts scan failed:`, err.message);
    allAttempts = Array.from(inMemoryAttempts.values());
  }

  const filtered = allAttempts.filter(a => 
    a.quizId === quizId && 
    a.learnerEmail?.toLowerCase() === learnerEmail.toLowerCase()
  );

  filtered.sort((a, b) => new Date(a.submittedAt || 0) - new Date(b.submittedAt || 0));
  return filtered;
}

/**
 * Get all attempts by authenticated learner across all quizzes
 */
export async function getAllLearnerQuizAttempts(learnerEmail) {
  if (!learnerEmail) return [];

  let allAttempts = [];

  try {
    const client = getClient();
    const res = await client.send(new ScanCommand({
      TableName: ATTEMPTS_TABLE
    }));
    if (res.Items && Array.isArray(res.Items)) {
      allAttempts = res.Items;
      allAttempts.forEach(a => inMemoryAttempts.set(a.attemptId, a));
    }
  } catch (err) {
    console.warn(`[quizService] DynamoDB attempts scan failed:`, err.message);
    allAttempts = Array.from(inMemoryAttempts.values());
  }

  const filtered = allAttempts.filter(a => 
    a.learnerEmail?.toLowerCase() === learnerEmail.toLowerCase()
  );

  filtered.sort((a, b) => new Date(a.submittedAt || 0) - new Date(b.submittedAt || 0));
  return filtered;
}

export const getQuizAttemptsByLearner = getAllLearnerQuizAttempts;

export async function getQuizzesByCourse(courseId) {
  return await getAllQuizzesAdmin({ courseId });
}

/**
 * Get all quiz attempts for admin reporting
 */
export async function getAllQuizAttemptsAdmin() {
  const map = new Map();
  for (const [id, item] of inMemoryAttempts.entries()) {
    map.set(id, item);
  }

  try {
    const client = getClient();
    const res = await client.send(new ScanCommand({
      TableName: ATTEMPTS_TABLE
    }));
    const dbItems = res.Items || [];
    for (const item of dbItems) {
      if (!map.has(item.attemptId)) {
        map.set(item.attemptId, item);
      }
    }
  } catch (err) {
    console.warn(`[quizService] DynamoDB attempts scan failed in getAllQuizAttemptsAdmin:`, err.message);
  }

  return Array.from(map.values());
}

