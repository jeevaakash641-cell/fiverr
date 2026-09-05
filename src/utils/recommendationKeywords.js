/**
 * Category & Keyword Mappings for Course Recommendations (Frontend)
 */

export const CATEGORY_KEYWORDS = {
  'Money Management': [
    'money', 'budget', 'budgeting', 'finance', 'financial', 'saving',
    'savings', 'debt', 'bills', 'banking', 'expenses', 'credit', 'investing',
    'managing money', 'personal finance'
  ],

  'Employment and Personal Development': [
    'job', 'jobs', 'work', 'employment', 'career', 'cv', 'resume',
    'interview', 'interviewing', 'application', 'employability', 'workplace',
    'finding work', 'job search', 'jobseeker', 'career change', 'preparing for work'
  ],

  'Digital Skills': [
    'digital', 'computer', 'internet', 'email', 'online', 'technology',
    'software', 'smartphone', 'laptop', 'browsing', 'typing', 'digital skills',
    'it skills', 'tech', 'devices', 'basic computing'
  ],

  'Artificial Intelligence': [
    'ai', 'artificial intelligence', 'chatgpt', 'automation', 'machine learning',
    'prompt', 'prompting', 'generative ai', 'llm', 'using ai', 'learn ai'
  ],

  'Communication and Confidence': [
    'communication', 'confidence', 'speaking', 'presentation', 'conversation',
    'teamwork', 'public speaking', 'listening', 'assertiveness', 'communicating'
  ],

  'Podcasting and Digital Media': [
    'podcast', 'podcasting', 'audio', 'recording', 'interviewing', 'media',
    'video', 'content creation', 'editing', 'broadcast', 'digital media'
  ],

  'Small Business': [
    'business', 'small business', 'self employed', 'self-employed',
    'entrepreneur', 'entrepreneurship', 'marketing', 'selling', 'sales',
    'enterprise', 'startup', 'starting a business'
  ],

  'Health and Wellbeing': [
    'health', 'wellbeing', 'well-being', 'mental health', 'stress',
    'recovery', 'addiction', 'neurodivergence', 'mindfulness', 'fitness', 'wellness'
  ],

  'Legal and Consumer Awareness': [
    'legal', 'law', 'rights', 'consumer', 'complaint', 'justice',
    'tenant rights', 'consumer rights', 'dispute', 'contracts'
  ],

  'Community Safety': [
    'safety', 'security', 'cybersecurity', 'cyber security', 'online safety',
    'crime', 'risk', 'resilience', 'fraud', 'scam', 'scams', 'phishing', 'staying safe'
  ],

  'Everyday Life Skills': [
    'life skills', 'everyday', 'forms', 'appointments', 'household',
    'organisation', 'planning', 'time management', 'practical skills'
  ]
};

export const STOP_WORDS = new Set([
  'i', 'me', 'my', 'myself', 'we', 'our', 'ours',
  'want', 'wants', 'wanted', 'need', 'needs', 'needed',
  'help', 'with', 'learn', 'learning', 'about', 'how', 'to',
  'the', 'a', 'an', 'and', 'or', 'in', 'on', 'at', 'for', 'of',
  'is', 'am', 'are', 'was', 'were', 'be', 'been', 'being',
  'have', 'has', 'had', 'do', 'does', 'did', 'would', 'could', 'should',
  'like', 'interested', 'please', 'can', 'you', 'some', 'any',
  'this', 'that', 'these', 'those', 'also', 'just', 'more', 'get', 'improve'
]);

export default {
  CATEGORY_KEYWORDS,
  STOP_WORDS
};
