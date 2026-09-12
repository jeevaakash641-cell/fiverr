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
    
    console.log('🔑 Bedrock client initialized:', {
      region: process.env.BEDROCK_REGION || process.env.AWS_REGION,
      hasAccessKey: !!process.env.AWS_ACCESS_KEY_ID,
      hasSecretKey: !!process.env.AWS_SECRET_ACCESS_KEY
    });
  }
  return bedrockClient;
}

export const CLEAR_EXPLANATION_PROMPT = `You are an encouraging, empathetic, and knowledgeable AI Learning Assistant and Tutor for the One Community Ely Training Centre in Ely, Cardiff, Wales (CF5).

Your mission is to support adult learners, community members, and students in Ely, Cardiff to build practical life skills, digital confidence, vocational knowledge, financial literacy, and career readiness.

When answering questions, follow these core guidelines:
1. **Explain in Simple, Accessible Terms**: Use clear, welcoming, jargon-free British English that anyone can easily understand.
2. **Community Grounding**: Keep advice realistic, encouraging, and relevant to learners in Ely, Cardiff, Wales (e.g. local community markets, job centres, digital inclusion initiatives).
3. **Step-by-Step Breakdown**: Break down complex tasks, application forms, or calculations into simple numbered steps.
4. **Real-Life Examples**: Provide relatable everyday examples (e.g., managing household utility bills, market stall pricing, preparing for local job interviews).
5. **Interactive Quizzes & Practice**:
   - When a user asks for a quiz, exam, test, practice questions, or to test their knowledge:
   - Output ONLY the questions and multiple-choice options (e.g. Questions 1 to 5).
   - **STRICT RULE**: NEVER reveal the answers, solutions, answer keys, or explanations in the same initial message!
   - At the bottom of the quiz, instruct the student: "Reply with your answers (e.g., 1-b, 2-c, 3-a...) and I will mark them, calculate your score, and explain any mistakes!"
   - Only evaluate, score, and provide answers/explanations AFTER the user submits their answers in their next message.
6. **Be Encouraging & Supportive**: Build learner confidence, celebrate progress, and maintain a friendly tone.
7. **Clean Typography**: Structure responses with clean headings, clear bullet points, and numbered lists without messy or dangling asterisks.`;

/**
 * Format conversation history into valid Bedrock Converse API message format
 */
function buildConverseMessages(userMessage, history = []) {
  const formatted = [];

  if (Array.isArray(history) && history.length > 0) {
    for (const turn of history) {
      const role = (turn.role === 'ai' || turn.role === 'assistant' || turn.type === 'ai') ? 'assistant' : 'user';
      const text = (turn.content || turn.text || '').trim();
      if (!text) continue;

      if (formatted.length > 0 && formatted[formatted.length - 1].role === role) {
        // Merge consecutive turns with the same role
        formatted[formatted.length - 1].content[0].text += `\n\n${text}`;
      } else {
        formatted.push({
          role,
          content: [{ text }]
        });
      }
    }
  }

  // Ensure message list starts with 'user'
  while (formatted.length > 0 && formatted[0].role !== 'user') {
    formatted.shift();
  }

  // Append or ensure current user message is the final turn
  if (formatted.length === 0 || formatted[formatted.length - 1].role !== 'user') {
    formatted.push({
      role: 'user',
      content: [{ text: userMessage }]
    });
  } else {
    formatted[formatted.length - 1].content[0].text = userMessage;
  }

  return formatted;
}

/**
 * Get AI response from Amazon Bedrock (Claude / Gemma) using Converse API
 * @param {string} userMessage
 * @param {object} options - { maxTokens, temperature, systemPrompt, context, history }
 */
export async function getBedrockResponse(userMessage, options = {}) {
  try {
    const client = getBedrockClient();

    const {
      maxTokens = 2000,
      temperature = 0.7,
      systemPrompt = CLEAR_EXPLANATION_PROMPT,
      context = null,
      history = []
    } = options;

    // Compose system prompt with course/lesson context if supplied
    let fullSystemPrompt = systemPrompt;
    if (context && typeof context === 'object') {
      let contextBlock = `\n\n--- ACTIVE COURSE & LESSON CONTEXT ---\n`;
      if (context.courseTitle) contextBlock += `Course: ${context.courseTitle}\n`;
      if (context.moduleTitle) contextBlock += `Module: ${context.moduleTitle}\n`;
      if (context.lessonTitle) contextBlock += `Lesson: ${context.lessonTitle}\n`;
      if (context.lessonContent) {
        const plainSummary = context.lessonContent.replace(/<[^>]*>?/gm, ' ').slice(0, 1500).trim();
        contextBlock += `Lesson Overview/Content: ${plainSummary}\n`;
      }
      if (context.learningOutcomes) {
        contextBlock += `Learning Outcomes: ${Array.isArray(context.learningOutcomes) ? context.learningOutcomes.join(', ') : context.learningOutcomes}\n`;
      }
      contextBlock += `Ground your responses directly in the concepts and skills taught in this active course/lesson. Keep references accurate to this curriculum.\n--------------------------------------`;
      fullSystemPrompt += contextBlock;
    }

    const messages = buildConverseMessages(userMessage, history);
    
    const command = new ConverseCommand({
      modelId: process.env.BEDROCK_MODEL_ID || 'google.gemma-3-12b-it',
      messages,
      system: [{ text: fullSystemPrompt }],
      inferenceConfig: {
        maxTokens,
        temperature,
        topP: 0.9
      }
    });

    const response = await client.send(command);
    
    // Extract AI response from Converse API format
    const aiResponse = response.output?.message?.content?.[0]?.text || 'Sorry, I could not generate a response.';
    
    console.log('✅ Bedrock Converse API Success!');
    console.log('📊 Usage:', {
      inputTokens: response.usage?.inputTokens,
      outputTokens: response.usage?.outputTokens,
      totalTokens: response.usage?.totalTokens
    });

    return aiResponse;
  } catch (error) {
    console.error('❌ Bedrock Error:', error);
    throw new Error(`AI service error: ${error.message}`);
  }
}
