/**
 * Offline AI Lite Engine
 * Lightweight rule-based AI for offline mode
 * NOT a full LLM - uses pattern matching and predefined responses
 */

export class OfflineAILite {
  constructor() {
    this.knowledgeBase = this.initializeKnowledgeBase();
  }

  /**
   * Initialize knowledge base with common educational topics
   */
  initializeKnowledgeBase() {
    return {
      // Mathematics
      math: {
        keywords: ['math', 'mathematics', 'algebra', 'geometry', 'arithmetic', 'equation', 'solve', 'calculate', 'formula'],
        topics: {
          algebra: {
            patterns: ['solve', 'equation', 'variable', 'x', 'y'],
            response: `**Algebra Help (Offline Mode)**

To solve algebraic equations:

1. **Identify the equation type** (linear, quadratic, etc.)
2. **Isolate the variable** by moving terms to one side
3. **Perform inverse operations** to solve for the variable
4. **Check your answer** by substituting back

**Example:** Solve 2x + 5 = 15
- Subtract 5 from both sides: 2x = 10
- Divide both sides by 2: x = 5
- Check: 2(5) + 5 = 15 ✓

💡 When you're back online, I can provide detailed step-by-step solutions!`
          },
          geometry: {
            patterns: ['area', 'perimeter', 'volume', 'triangle', 'circle', 'rectangle', 'square'],
            response: `**Geometry Help (Offline Mode)**

**Common Formulas:**

**Rectangle:**
- Area = length × width
- Perimeter = 2(length + width)

**Triangle:**
- Area = ½ × base × height
- Perimeter = sum of all sides

**Circle:**
- Area = πr²
- Circumference = 2πr

💡 When you're back online, I can solve specific problems with diagrams!`
          },
          arithmetic: {
            patterns: ['add', 'subtract', 'multiply', 'divide', 'fraction', 'decimal', 'percentage'],
            response: `**Arithmetic Help (Offline Mode)**

**Basic Operations:**
- Addition (+): Combine numbers
- Subtraction (-): Find difference
- Multiplication (×): Repeated addition
- Division (÷): Split into equal parts

**Fractions:**
- Add/Subtract: Same denominator needed
- Multiply: Multiply numerators and denominators
- Divide: Multiply by reciprocal

💡 When you're back online, I can solve specific calculations!`
          }
        }
      },

      // Science
      science: {
        keywords: ['science', 'physics', 'chemistry', 'biology', 'experiment', 'theory'],
        topics: {
          physics: {
            patterns: ['force', 'motion', 'energy', 'newton', 'velocity', 'acceleration', 'gravity'],
            response: `**Physics Help (Offline Mode)**

**Newton's Laws of Motion:**
1. **First Law:** Object at rest stays at rest unless acted upon
2. **Second Law:** F = ma (Force = mass × acceleration)
3. **Third Law:** Every action has equal and opposite reaction

**Energy:**
- Kinetic Energy = ½mv²
- Potential Energy = mgh

💡 When you're back online, I can explain concepts in detail with examples!`
          },
          chemistry: {
            patterns: ['atom', 'molecule', 'element', 'compound', 'reaction', 'periodic table'],
            response: `**Chemistry Help (Offline Mode)**

**Basic Concepts:**
- **Atom:** Smallest unit of matter
- **Molecule:** Two or more atoms bonded together
- **Element:** Pure substance (one type of atom)
- **Compound:** Two or more elements chemically combined

**Periodic Table:**
- Groups: Vertical columns (similar properties)
- Periods: Horizontal rows

💡 When you're back online, I can explain reactions and provide detailed examples!`
          },
          biology: {
            patterns: ['cell', 'plant', 'animal', 'photosynthesis', 'respiration', 'organ', 'system'],
            response: `**Biology Help (Offline Mode)**

**Cell Structure:**
- **Nucleus:** Control center (contains DNA)
- **Mitochondria:** Energy production
- **Cell membrane:** Controls what enters/exits

**Photosynthesis:**
6CO₂ + 6H₂O + Light → C₆H₁₂O₆ + 6O₂

Plants convert sunlight, water, and CO₂ into glucose and oxygen.

💡 When you're back online, I can provide detailed explanations with diagrams!`
          }
        }
      },

      // English/Language
      english: {
        keywords: ['grammar', 'english', 'language', 'writing', 'sentence', 'verb', 'noun', 'tense'],
        topics: {
          grammar: {
            patterns: ['grammar', 'tense', 'verb', 'noun', 'adjective', 'adverb'],
            response: `**Grammar Help (Offline Mode)**

**Parts of Speech:**
- **Noun:** Person, place, thing (cat, school, happiness)
- **Verb:** Action or state (run, is, think)
- **Adjective:** Describes noun (big, red, happy)
- **Adverb:** Describes verb (quickly, very, well)

**Tenses:**
- Present: I eat
- Past: I ate
- Future: I will eat

💡 When you're back online, I can help with specific grammar questions!`
          },
          writing: {
            patterns: ['essay', 'paragraph', 'write', 'composition'],
            response: `**Writing Help (Offline Mode)**

**Essay Structure:**
1. **Introduction:** Hook + thesis statement
2. **Body Paragraphs:** Main points with evidence
3. **Conclusion:** Summarize and restate thesis

**Paragraph Structure:**
- Topic sentence
- Supporting details
- Concluding sentence

💡 When you're back online, I can review your writing and provide feedback!`
          }
        }
      },

      // General study help
      general: {
        keywords: ['study', 'learn', 'help', 'homework', 'exam', 'test', 'prepare'],
        response: `**Study Help (Offline Mode)**

**Effective Study Tips:**
1. **Create a schedule:** Plan your study time
2. **Break it down:** Study in 25-minute chunks
3. **Practice regularly:** Consistency is key
4. **Take notes:** Write down key points
5. **Test yourself:** Practice problems and quizzes

**Exam Preparation:**
- Review notes regularly
- Solve previous papers
- Identify weak areas
- Get enough sleep

💡 When you're back online, I can provide personalized study plans and detailed help!`
      }
    };
  }

  /**
   * Get response for a question (offline mode)
   */
  getResponse(question) {
    const lowerQuestion = question.toLowerCase();

    // Try to match with knowledge base
    for (const [subject, data] of Object.entries(this.knowledgeBase)) {
      // Check if question contains subject keywords
      const hasKeyword = data.keywords?.some(keyword => lowerQuestion.includes(keyword));
      
      if (hasKeyword && data.topics) {
        // Try to match specific topic
        for (const [topic, topicData] of Object.entries(data.topics)) {
          const matchesPattern = topicData.patterns.some(pattern => 
            lowerQuestion.includes(pattern.toLowerCase())
          );
          
          if (matchesPattern) {
            return {
              response: topicData.response,
              source: 'offline_ai_lite',
              topic: `${subject} - ${topic}`
            };
          }
        }
      }
    }

    // Check for general study help
    if (this.knowledgeBase.general) {
      const hasGeneralKeyword = this.knowledgeBase.general.keywords.some(keyword => 
        lowerQuestion.includes(keyword)
      );
      
      if (hasGeneralKeyword) {
        return {
          response: this.knowledgeBase.general.response,
          source: 'offline_ai_lite',
          topic: 'general study help'
        };
      }
    }

    // Default response if no match found
    return {
      response: `**Offline AI Lite Mode**

I'm currently running in offline mode with limited capabilities. I can help with:

📚 **Mathematics:** Algebra, geometry, arithmetic
🔬 **Science:** Physics, chemistry, biology basics
📖 **English:** Grammar, writing structure
📝 **Study Tips:** General learning strategies

Your question has been saved and will be answered with full AI capabilities when you're back online.

**Try asking:**
- "How do I solve equations?"
- "Explain photosynthesis"
- "What are the parts of speech?"
- "Give me study tips"

💡 **Your question is saved** and will be synced when internet returns!`,
      source: 'offline_ai_lite',
      topic: 'general'
    };
  }

  /**
   * Check if a question can be answered offline
   */
  canAnswerOffline(question) {
    const lowerQuestion = question.toLowerCase();
    
    for (const data of Object.values(this.knowledgeBase)) {
      if (data.keywords) {
        const hasKeyword = data.keywords.some(keyword => lowerQuestion.includes(keyword));
        if (hasKeyword) return true;
      }
    }
    
    return false;
  }

  /**
   * Get available offline topics
   */
  getAvailableTopics() {
    const topics = [];
    
    for (const [subject, data] of Object.entries(this.knowledgeBase)) {
      if (data.topics) {
        for (const topic of Object.keys(data.topics)) {
          topics.push(`${subject} - ${topic}`);
        }
      }
    }
    
    return topics;
  }
}

// Singleton instance
let offlineAIInstance = null;

/**
 * Get offline AI singleton
 */
export function getOfflineAI() {
  if (!offlineAIInstance) {
    offlineAIInstance = new OfflineAILite();
  }
  return offlineAIInstance;
}
