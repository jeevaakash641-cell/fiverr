/**
 * Emotion-Aware AI Service
 * Adapts AI responses based on student's emotional state and confidence level
 * Supports multilingual responses with language detection
 */

import { getBedrockResponse } from './bedrockService.js';
import { ComprehendClient, DetectDominantLanguageCommand } from '@aws-sdk/client-comprehend';

let comprehendClient = null;

function getComprehendClient() {
  if (!comprehendClient) {
    comprehendClient = new ComprehendClient({
      region: process.env.AWS_REGION || 'us-east-1',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID?.trim(),
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY?.trim()
      }
    });
  }
  return comprehendClient;
}

/**
 * Detect language of the input text
 */
async function detectLanguage(text) {
  try {
    const client = getComprehendClient();
    const command = new DetectDominantLanguageCommand({ Text: text });
    const response = await client.send(command);
    
    if (response.Languages && response.Languages.length > 0) {
      const dominantLanguage = response.Languages[0];
      console.log('🌐 Detected language:', dominantLanguage.LanguageCode, `(${Math.round(dominantLanguage.Score * 100)}% confidence)`);
      return dominantLanguage.LanguageCode;
    }
    
    return 'en'; // Default to English
  } catch (error) {
    console.error('❌ Language detection error:', error);
    return 'en'; // Default to English on error
  }
}

/**
 * Get language name and instruction for AI
 */
function getLanguageInstruction(languageCode) {
  const languageMap = {
    'en': { name: 'English', instruction: 'Respond in English' },
    'hi': { name: 'Hindi', instruction: 'Respond in Hindi (हिंदी). Use Devanagari script.' },
    'ta': { name: 'Tamil', instruction: 'Respond in Tamil (தமிழ்). Use Tamil script.' },
    'te': { name: 'Telugu', instruction: 'Respond in Telugu (తెలుగు). Use Telugu script.' },
    'kn': { name: 'Kannada', instruction: 'Respond in Kannada (ಕನ್ನಡ). Use Kannada script.' },
    'ml': { name: 'Malayalam', instruction: 'Respond in Malayalam (മലയാളം). Use Malayalam script.' },
    'bn': { name: 'Bengali', instruction: 'Respond in Bengali (বাংলা). Use Bengali script.' },
    'mr': { name: 'Marathi', instruction: 'Respond in Marathi (मराठी). Use Devanagari script.' },
    'gu': { name: 'Gujarati', instruction: 'Respond in Gujarati (ગુજરાતી). Use Gujarati script.' },
    'pa': { name: 'Punjabi', instruction: 'Respond in Punjabi (ਪੰਜਾਬੀ). Use Gurmukhi script.' },
    'or': { name: 'Odia', instruction: 'Respond in Odia (ଓଡ଼ିଆ). Use Odia script.' },
    'as': { name: 'Assamese', instruction: 'Respond in Assamese (অসমীয়া). Use Bengali-Assamese script.' },
    'ur': { name: 'Urdu', instruction: 'Respond in Urdu (اردو). Use Urdu script.' }
  };
  
  return languageMap[languageCode] || languageMap['en'];
}

/**
 * Generate emotion-aware AI response with language detection
 * @param {string} question - Student's question
 * @param {string} emotion - Detected emotion (Stressed, Confused, Neutral, Confident)
 * @param {number} confidence - Confidence score (0-100)
 * @param {Object} userContext - User context (class, subject, etc.)
 */
export async function getEmotionAwareResponse(question, emotion, confidence, userContext = {}) {
  try {
    console.log('🎭 Generating emotion-aware response:', { emotion, confidence });

    // Detect input language
    const detectedLanguage = await detectLanguage(question);
    const languageInfo = getLanguageInstruction(detectedLanguage);
    
    console.log(`🌐 Language: ${languageInfo.name} (${detectedLanguage})`);

    // Build adaptive prompt based on emotion, confidence, and language
    const adaptivePrompt = buildAdaptivePrompt(question, emotion, confidence, userContext, languageInfo);

    // Get AI response
    const response = await getBedrockResponse(adaptivePrompt);

    return {
      success: true,
      response,
      adaptation: {
        emotion,
        confidence,
        language: languageInfo.name,
        languageCode: detectedLanguage,
        strategy: getAdaptationStrategy(emotion, confidence)
      }
    };
  } catch (error) {
    console.error('❌ Emotion-aware response error:', error);
    throw error;
  }
}

/**
 * Build adaptive prompt based on emotion, confidence, and language
 */
function buildAdaptivePrompt(question, emotion, confidence, userContext, languageInfo) {
  const baseContext = userContext.class 
    ? `You are helping a Class ${userContext.class} student.` 
    : 'You are helping a student.';

  // Language instruction
  const languageInstruction = `
**CRITICAL - LANGUAGE REQUIREMENT:**
${languageInfo.instruction}
The student asked their question in ${languageInfo.name}, so you MUST respond in ${languageInfo.name}.
Use the native script and natural expressions of ${languageInfo.name}.
`;

  let emotionInstructions = '';

  // Adapt based on emotion with enhanced strategies
  switch (emotion) {
    case 'Stressed':
      emotionInstructions = `
**IMPORTANT - Student is feeling STRESSED (High Anxiety):**

🎯 **Primary Goal:** Calm the student and rebuild confidence

**Tone & Approach:**
- Use a VERY GENTLE, SOOTHING, and ENCOURAGING tone
- Start with reassurance: "Don't worry, I'm here to help you"
- Use phrases like "Let's take this slowly together"
- Avoid any complex terminology initially

**Content Strategy:**
- Break down into EXTREMELY SIMPLE steps (max 3-4 steps)
- Use SHORT sentences (max 10-12 words per sentence)
- Use EVERYDAY examples they can relate to
- Add encouraging emojis: 😊 ✨ 💪
- End each step with positive reinforcement

**Language:**
- Use words like: "easy", "simple", "together", "you can do this"
- Avoid: "difficult", "complex", "challenging", "must", "should"

**Structure:**
1. Reassurance statement
2. Very simple explanation (2-3 sentences)
3. One easy example
4. Encouragement to try

**Example Phrases:**
- "This is easier than it looks! 😊"
- "You're doing great by asking this question!"
- "Let's break this into tiny, easy steps"
- "Many students find this tricky at first, but you'll get it!"
`;
      break;

    case 'Confused':
      emotionInstructions = `
**IMPORTANT - Student is CONFUSED (Needs Clarity):**

🎯 **Primary Goal:** Provide crystal-clear, step-by-step understanding

**Tone & Approach:**
- Use a PATIENT, CLEAR, and METHODICAL tone
- Acknowledge confusion: "I understand this can be confusing"
- Use phrases like "Let me explain this step by step"

**Content Strategy:**
- Use NUMBERED STEPS (Step 1, Step 2, etc.)
- Provide a CONCRETE EXAMPLE for EACH step
- Use ANALOGIES from daily life
- Add visual descriptions where possible
- Use comparison: "Think of it like..."

**Language:**
- Use words like: "first", "then", "next", "finally"
- Use transitional phrases: "Now that we understand X, let's look at Y"
- Repeat key concepts in different ways

**Structure:**
1. Acknowledge confusion
2. Simple overview (what we're trying to understand)
3. Step-by-step breakdown with examples
4. Summary in simple terms
5. Check understanding: "Does this make sense?"

**Example Phrases:**
- "Let me break this down into simple steps"
- "Think of it like [everyday example]"
- "Here's another way to look at it..."
- "Let's go through this together, one step at a time"
`;
      break;

    case 'Confident':
      emotionInstructions = `
**IMPORTANT - Student is CONFIDENT (Ready for Challenge):**

🎯 **Primary Goal:** Extend learning and encourage deeper thinking

**Tone & Approach:**
- Use an ENGAGING, CHALLENGING, and INTELLECTUALLY STIMULATING tone
- Acknowledge confidence: "Great question! You're thinking deeply"
- Use phrases like "Let's explore this further"

**Content Strategy:**
- Provide ADVANCED explanations with deeper insights
- Include WHY and HOW, not just WHAT
- Add CHALLENGE QUESTIONS to extend learning
- Introduce related advanced concepts
- Encourage critical thinking

**Language:**
- Use words like: "consider", "analyze", "explore", "investigate"
- Use thought-provoking questions
- Introduce technical terms with explanations

**Structure:**
1. Acknowledge good question
2. Comprehensive explanation with depth
3. Advanced insights or connections
4. Challenge question or extension
5. Encourage further exploration

**Example Phrases:**
- "Excellent question! Let's dive deeper..."
- "Can you think why this works this way?"
- "What would happen if we changed X?"
- "This connects to an interesting concept..."
- "Here's a challenge for you to think about..."
`;
      break;

    default: // Neutral
      emotionInstructions = `
**Student emotional state: NEUTRAL (Balanced Approach):**

🎯 **Primary Goal:** Provide clear, engaging education

**Tone & Approach:**
- Use a FRIENDLY, INFORMATIVE, and ENGAGING tone
- Balance simplicity with depth
- Maintain conversational teaching style

**Content Strategy:**
- Provide CLEAR explanations with examples
- Use structured format (intro, explanation, example, summary)
- Include both theory and practice
- Make it interesting and relatable

**Structure:**
1. Brief introduction
2. Clear explanation
3. Practical example
4. Key takeaway
`;
  }

  // Additional adaptation based on confidence level
  let confidenceAdjustment = '';
  
  if (confidence < 30) {
    confidenceAdjustment = `
\n**CONFIDENCE LEVEL: VERY LOW (${confidence}%)**
⚠️ **CRITICAL:** Student is very uncertain and may be anxious
- Use MAXIMUM simplification
- Add EXTRA encouragement in every response
- Use phrases like:
  * "It's completely okay to find this challenging"
  * "You're brave for asking - that's the first step to learning"
  * "Let's work through this together, no rush"
- Build confidence with very small, achievable steps
- Celebrate every small understanding
`;
  } else if (confidence >= 30 && confidence < 50) {
    confidenceAdjustment = `
\n**CONFIDENCE LEVEL: LOW (${confidence}%)**
- Student is uncertain - add encouragement
- Simplify explanations further
- Use phrases like:
  * "It's okay to take your time with this"
  * "Let's work through this together"
  * "You're on the right track"
- Build confidence gradually
`;
  } else if (confidence >= 50 && confidence < 70) {
    confidenceAdjustment = `
\n**CONFIDENCE LEVEL: MODERATE (${confidence}%)**
- Student has some confidence - maintain balance
- Provide clear explanations with examples
- Encourage continued learning
`;
  } else if (confidence >= 70 && confidence < 85) {
    confidenceAdjustment = `
\n**CONFIDENCE LEVEL: HIGH (${confidence}%)**
- Student is confident - you can provide more depth
- Add advanced insights
- Include challenge questions
- Encourage exploration beyond basics
`;
  } else {
    confidenceAdjustment = `
\n**CONFIDENCE LEVEL: VERY HIGH (${confidence}%)**
- Student is very confident - provide advanced content
- Challenge their thinking
- Introduce complex concepts
- Encourage independent exploration
`;
  }

  // Build final prompt
  const prompt = `${baseContext}

${languageInstruction}

${emotionInstructions}

${confidenceAdjustment}

**Student's Question:**
${question}

**Your Task:**
Answer the question following ALL the guidelines above:
1. Use ${languageInfo.name} language (CRITICAL)
2. Match the emotional adaptation strategy
3. Adjust for confidence level
4. Provide helpful, educational response

Remember: The student's emotional state and confidence level are just as important as the content accuracy. Make them feel supported while learning.`;

  return prompt;
}

/**
 * Get adaptation strategy description
 */
function getAdaptationStrategy(emotion, confidence) {
  const strategies = {
    'Stressed': 'Gentle tone, simplified explanation, encouraging language',
    'Confused': 'Step-by-step breakdown, concrete examples, patient clarification',
    'Neutral': 'Balanced explanation with examples',
    'Confident': 'Advanced content, challenge questions, deeper insights'
  };

  let strategy = strategies[emotion] || strategies['Neutral'];

  if (confidence < 40) {
    strategy += ' + Extra encouragement for low confidence';
  } else if (confidence > 70) {
    strategy += ' + Advanced content for high confidence';
  }

  return strategy;
}

/**
 * Analyze question complexity to adjust response
 */
export function analyzeQuestionComplexity(question) {
  const words = question.toLowerCase().split(/\s+/);
  const complexWords = ['explain', 'why', 'how', 'prove', 'derive', 'analyze', 'compare'];
  const simpleWords = ['what', 'is', 'define', 'list'];

  const hasComplexWords = complexWords.some(word => words.includes(word));
  const hasSimpleWords = simpleWords.some(word => words.includes(word));

  if (hasComplexWords) return 'complex';
  if (hasSimpleWords) return 'simple';
  return 'moderate';
}
