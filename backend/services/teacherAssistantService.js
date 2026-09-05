import { BedrockRuntimeClient, ConverseCommand } from '@aws-sdk/client-bedrock-runtime';

let bedrockClient = null;

function getBedrockClient() {
  if (!bedrockClient) {
    bedrockClient = new BedrockRuntimeClient({
      region: process.env.BEDROCK_REGION || process.env.AWS_REGION || 'us-east-1',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID?.trim(),
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY?.trim()
      }
    });
    
    console.log('🔑 Teacher Assistant Bedrock client initialized:', {
      region: process.env.BEDROCK_REGION || process.env.AWS_REGION,
      model: process.env.BEDROCK_MODEL_ID
    });
  }
  return bedrockClient;
}

/**
 * Generate educational materials using Amazon Bedrock
 */
export async function generateEducationalMaterials(params) {
  const { topic, gradeLevel, difficulty, weakAreas } = params;

  console.log('📚 Generating educational materials:', { topic, gradeLevel, difficulty });

  try {
    const client = getBedrockClient();

    // Create comprehensive prompt for generating all materials at once
    const prompt = `You are an expert teacher creating educational materials for ${gradeLevel} students.

Topic: ${topic}
Difficulty Level: ${difficulty}
Student Weak Areas: ${weakAreas.join(', ')}

Generate comprehensive educational materials in the following JSON format:

{
  "questionPaper": [
    {
      "question": "Question text here",
      "type": "MCQ/Short/Long",
      "marks": 2,
      "options": ["A", "B", "C", "D"],
      "correctAnswer": "A",
      "explanation": "Why this is correct"
    }
  ],
  "simplifiedNotes": "Clear, simple explanation of ${topic} focusing on ${weakAreas.join(', ')}. Use simple language, real-life examples, and step-by-step explanations.",
  "homework": {
    "easy": [
      {
        "question": "Easy question text",
        "marks": 1,
        "hint": "Helpful hint"
      }
    ],
    "medium": [
      {
        "question": "Medium question text",
        "marks": 2,
        "hint": "Helpful hint"
      }
    ],
    "hard": [
      {
        "question": "Hard question text",
        "marks": 3,
        "hint": "Helpful hint"
      }
    ]
  }
}

Requirements:
1. Question Paper: Generate 5 questions (mix of MCQ, short, and long answer)
2. Simplified Notes: Write 200-300 words in simple language, focusing on weak areas
3. Homework: Generate 3 questions each for easy, medium, and hard levels

Focus on the weak areas: ${weakAreas.join(', ')}
Make content appropriate for ${gradeLevel} students.
Return ONLY valid JSON, no additional text.`;

    const command = new ConverseCommand({
      modelId: process.env.BEDROCK_MODEL_ID || 'google.gemma-3-12b-it',
      messages: [
        {
          role: 'user',
          content: [{ text: prompt }]
        }
      ],
      inferenceConfig: {
        maxTokens: 3000,
        temperature: 0.7,
        topP: 0.9
      }
    });

    const response = await client.send(command);
    const aiResponse = response.output?.message?.content?.[0]?.text || '{}';

    console.log('✅ Bedrock response received');
    console.log('📊 Usage:', {
      inputTokens: response.usage?.inputTokens,
      outputTokens: response.usage?.outputTokens,
      totalTokens: response.usage?.totalTokens
    });

    // Parse JSON response
    let materials;
    try {
      // Clean up response (remove markdown code blocks if present)
      const cleanedResponse = aiResponse
        .replace(/```json/g, '')
        .replace(/```/g, '')
        .trim();
      
      materials = JSON.parse(cleanedResponse);
    } catch (parseError) {
      console.error('❌ JSON parsing error:', parseError);
      console.log('Raw response:', aiResponse);
      
      // Return fallback structure
      materials = {
        questionPaper: [
          {
            question: `What is ${topic}?`,
            type: 'Short',
            marks: 2,
            options: [],
            correctAnswer: '',
            explanation: 'Basic understanding question'
          }
        ],
        simplifiedNotes: `${topic} is an important concept in ${gradeLevel}. ${aiResponse.substring(0, 200)}...`,
        homework: {
          easy: [
            { question: `Define ${topic}`, marks: 1, hint: 'Think about the basic definition' }
          ],
          medium: [
            { question: `Explain ${topic} with an example`, marks: 2, hint: 'Use a real-life example' }
          ],
          hard: [
            { question: `Analyze the applications of ${topic}`, marks: 3, hint: 'Think about practical uses' }
          ]
        }
      };
    }

    // Validate structure
    if (!materials.questionPaper) materials.questionPaper = [];
    if (!materials.simplifiedNotes) materials.simplifiedNotes = '';
    if (!materials.homework) materials.homework = { easy: [], medium: [], hard: [] };

    console.log('✅ Educational materials generated successfully');
    return materials;

  } catch (error) {
    console.error('❌ Teacher Assistant Error:', error);
    throw new Error(`Failed to generate educational materials: ${error.message}`);
  }
}

/**
 * Generate question paper only
 */
export async function generateQuestionPaper(params) {
  const { topic, gradeLevel, difficulty, questionCount = 5 } = params;

  console.log('📝 Generating question paper:', { topic, gradeLevel, difficulty, questionCount });

  try {
    const client = getBedrockClient();

    const prompt = `You are an expert teacher creating a question paper for ${gradeLevel} students.

Topic: ${topic}
Difficulty Level: ${difficulty}
Number of Questions: ${questionCount}

Generate ${questionCount} questions in JSON format:

[
  {
    "question": "Question text",
    "type": "MCQ/Short/Long",
    "marks": 2,
    "options": ["A", "B", "C", "D"],
    "correctAnswer": "A",
    "explanation": "Explanation"
  }
]

Mix question types (MCQ, Short Answer, Long Answer).
Return ONLY valid JSON array, no additional text.`;

    const command = new ConverseCommand({
      modelId: process.env.BEDROCK_MODEL_ID || 'google.gemma-3-12b-it',
      messages: [{ role: 'user', content: [{ text: prompt }] }],
      inferenceConfig: { maxTokens: 2000, temperature: 0.7 }
    });

    const response = await client.send(command);
    const aiResponse = response.output?.message?.content?.[0]?.text || '[]';

    const cleanedResponse = aiResponse.replace(/```json/g, '').replace(/```/g, '').trim();
    const questions = JSON.parse(cleanedResponse);

    console.log('✅ Question paper generated:', questions.length, 'questions');
    return questions;

  } catch (error) {
    console.error('❌ Question generation error:', error);
    throw new Error(`Failed to generate questions: ${error.message}`);
  }
}

/**
 * Generate simplified notes
 */
export async function generateSimplifiedNotes(params) {
  const { topic, gradeLevel, weakAreas } = params;

  console.log('📖 Generating simplified notes:', { topic, gradeLevel });

  try {
    const client = getBedrockClient();

    const prompt = `You are an expert teacher creating simplified study notes for ${gradeLevel} students.

Topic: ${topic}
Focus Areas: ${weakAreas ? weakAreas.join(', ') : 'General understanding'}

Write clear, simple notes (200-300 words) that:
1. Explain the concept in simple language
2. Use real-life examples
3. Break down complex ideas into steps
4. Focus on the weak areas mentioned
5. Make it easy to understand

Write the notes directly, no JSON format needed.`;

    const command = new ConverseCommand({
      modelId: process.env.BEDROCK_MODEL_ID || 'google.gemma-3-12b-it',
      messages: [{ role: 'user', content: [{ text: prompt }] }],
      inferenceConfig: { maxTokens: 1500, temperature: 0.7 }
    });

    const response = await client.send(command);
    const notes = response.output?.message?.content?.[0]?.text || '';

    console.log('✅ Simplified notes generated:', notes.length, 'characters');
    return notes;

  } catch (error) {
    console.error('❌ Notes generation error:', error);
    throw new Error(`Failed to generate notes: ${error.message}`);
  }
}

/**
 * Generate homework assignments
 */
export async function generateHomework(params) {
  const { topic, gradeLevel } = params;

  console.log('📚 Generating homework:', { topic, gradeLevel });

  try {
    const client = getBedrockClient();

    const prompt = `You are an expert teacher creating homework assignments for ${gradeLevel} students.

Topic: ${topic}

Generate homework with three difficulty levels in JSON format:

{
  "easy": [
    { "question": "Easy question", "marks": 1, "hint": "Helpful hint" }
  ],
  "medium": [
    { "question": "Medium question", "marks": 2, "hint": "Helpful hint" }
  ],
  "hard": [
    { "question": "Hard question", "marks": 3, "hint": "Helpful hint" }
  ]
}

Generate 3 questions for each difficulty level.
Return ONLY valid JSON, no additional text.`;

    const command = new ConverseCommand({
      modelId: process.env.BEDROCK_MODEL_ID || 'google.gemma-3-12b-it',
      messages: [{ role: 'user', content: [{ text: prompt }] }],
      inferenceConfig: { maxTokens: 2000, temperature: 0.7 }
    });

    const response = await client.send(command);
    const aiResponse = response.output?.message?.content?.[0]?.text || '{}';

    const cleanedResponse = aiResponse.replace(/```json/g, '').replace(/```/g, '').trim();
    const homework = JSON.parse(cleanedResponse);

    console.log('✅ Homework generated');
    return homework;

  } catch (error) {
    console.error('❌ Homework generation error:', error);
    throw new Error(`Failed to generate homework: ${error.message}`);
  }
}
