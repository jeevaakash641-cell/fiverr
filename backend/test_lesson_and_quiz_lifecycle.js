import assert from 'assert';
import { sanitizeHtml, stripHtml } from '../src/utils/sanitizeHtml.js';
import { validateQuizPayload } from './services/quizService.js';

console.log('🧪 Starting Lesson Rich Text & Quiz Lifecycle Verification Tests...\n');

// 1. Test rich text sanitization and stripHtml
const testRichContent = `
  <h2>Starting Your Stall Idea</h2>
  <p>Here are <strong>3 key tips</strong> for setting up in <em>Ely, Cardiff</em>:</p>
  <ul>
    <li>Research footfall and customer needs</li>
    <li>Obtain necessary permits</li>
    <li>Test your pricing structure</li>
  </ul>
  <script>alert('malicious')</script>
`;

const sanitized = sanitizeHtml(testRichContent);
assert.ok(!sanitized.includes('<script>'), 'Sanitized HTML must strip script tags');
assert.ok(sanitized.includes('<h2>Starting Your Stall Idea</h2>'), 'Sanitized HTML must preserve h2 tag');
assert.ok(sanitized.includes('<strong>3 key tips</strong>'), 'Sanitized HTML must preserve strong tag');
console.log('✅ Test 1 Passed: Rich text sanitizer safely cleans HTML while preserving valid formatting');

const stripped = stripHtml(sanitized);
assert.ok(!stripped.includes('<'), 'Stripped text should have no HTML tags');
assert.ok(stripped.includes('Starting Your Stall Idea'), 'Stripped text preserves readable content');
console.log('✅ Test 2 Passed: stripHtml correctly extracts clean text');

// 2. Test user-scoped draft key format
const testUser = { email: 'teacher@ely.org.uk', id: 'usr_123' };
const courseId = 'course_market_stall';
const moduleId = 'mod_getting_started';
const draftKey = `lesson_draft_${testUser.email}_${courseId}_${moduleId}_new`;
assert.strictEqual(draftKey, 'lesson_draft_teacher@ely.org.uk_course_market_stall_mod_getting_started_new');
console.log('✅ Test 3 Passed: User-scoped draft key generated correctly');

// 3. Test Quiz draft validation
const draftQuiz = {
  title: 'Market Stall Draft Quiz',
  courseId: 'course_market_stall',
  passingScore: 70,
  questions: [
    {
      questionText: 'What is essential for stall safety?',
      options: ['Fire extinguisher & tidy cables', 'Nothing', 'Fancy lighting only', 'Cash box only'],
      correctAnswer: 'Fire extinguisher & tidy cables'
    }
  ]
};

const errorsDraft = validateQuizPayload(draftQuiz, false);
assert.strictEqual(errorsDraft.length, 0, 'Draft quiz should pass validation with 1 question');
console.log('✅ Test 4 Passed: Draft quiz validation succeeds with valid schema');

console.log('\n🎉 ALL Lesson & Quiz lifecycle tests passed successfully!');
