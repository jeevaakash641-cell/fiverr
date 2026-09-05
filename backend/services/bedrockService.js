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

const CLEAR_EXPLANATION_PROMPT = `You are a helpful, encouraging AI educational tutor for One Community Ely students.

When answering questions, follow these core guidelines:
1. **Explain in Simple Terms**: Use clear, friendly language that anyone can easily understand.
2. **Step-by-Step Explanation**: Break down complex topics and math problems into simple, numbered steps.
3. **Real-Life Examples**: Provide relatable examples from everyday life.
4. **Avoid Unnecessary Jargon**: Keep explanations accessible and easy to digest.
5. **Interactive Quizzes & Exams**:
   - When a user asks for a quiz, exam, test, practice questions, or to test their knowledge:
   - Output ONLY the questions and multiple-choice options (e.g. Questions 1 to 5 or 10).
   - **STRICT RULE**: NEVER reveal the answers, solutions, answer keys, or explanations in the same message!
   - At the bottom of the quiz, instruct the student: "Reply with your answers (e.g., 1-b, 2-c, 3-a...) and I will grade your answers, calculate your score, and explain any mistakes!"
   - Only evaluate, score, and provide answers/explanations AFTER the user submits their answers in their next message.
6. **Be Encouraging & Supportive**: Motivate the student and build their confidence.`;

/**
 * Get AI response from Amazon Bedrock (Claude) using Converse API
 * @param {string} userMessage
 * @param {object} options - { maxTokens, temperature, systemPrompt }
 */
export async function getBedrockResponse(userMessage, options = {}) {
  try {
    const client = getBedrockClient();

    const {
      maxTokens = 2000,
      temperature = 0.7,
      systemPrompt = CLEAR_EXPLANATION_PROMPT,
    } = options;
    
    const command = new ConverseCommand({
      modelId: process.env.BEDROCK_MODEL_ID || 'google.gemma-3-12b-it',
      messages: [
        {
          role: 'user',
          content: [{ text: userMessage }]
        }
      ],
      system: [{ text: systemPrompt }],
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
