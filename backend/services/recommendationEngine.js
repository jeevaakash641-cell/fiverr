import { CATEGORY_KEYWORDS, STOP_WORDS } from '../config/recommendationKeywords.js';

/**
 * Normalize text: lowercase, remove punctuation, collapse whitespace
 */
export function normalizeText(text = '') {
  if (typeof text !== 'string') return '';
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Extract meaningful tokens, ignoring stop words and short noise
 */
export function extractTokens(text = '') {
  const norm = normalizeText(text);
  if (!norm) return [];

  return norm
    .split(' ')
    .map(w => w.trim())
    .filter(w => w.length > 1 && !STOP_WORDS.has(w));
}

/**
 * Deterministic recommendation scoring for published courses
 * @param {string} learningInterest 
 * @param {Array} publishedCourses 
 * @returns {Object} { recommendations, isFallback, message }
 */
export function computeCourseRecommendations(learningInterest = '', publishedCourses = []) {
  const rawInterest = (learningInterest || '').trim();
  const normInterest = normalizeText(rawInterest);
  const interestTokens = extractTokens(rawInterest);

  // Filter only published courses
  const eligibleCourses = (publishedCourses || []).filter(c => c.status === 'published');

  if (eligibleCourses.length === 0) {
    return {
      recommendations: [],
      isFallback: true,
      message: 'No courses are available at the moment. Please check again soon.'
    };
  }

  // If learner entered no interest, return published courses as generic suggestions
  if (!normInterest || interestTokens.length === 0) {
    const fallbackResults = eligibleCourses.slice(0, 3).map(course => ({
      ...course,
      score: 0,
      isBestMatch: false,
      isFallback: true,
      recommendationReason: 'Popular course to get you started on your learning journey.'
    }));

    return {
      recommendations: fallbackResults,
      isFallback: true,
      message: 'Explore our available published courses below.'
    };
  }

  // Score each course
  const scoredCourses = eligibleCourses.map(course => {
    let score = 0;
    const matchedTerms = new Set();
    const courseCategory = (course.category || '').trim();
    const normCategory = normalizeText(courseCategory);
    const normTitle = normalizeText(course.title || '');
    const normShortDesc = normalizeText(course.shortDescription || '');
    const normFullDesc = normalizeText(course.fullDescription || '');
    const normOutcomes = Array.isArray(course.learningOutcomes)
      ? course.learningOutcomes.map(o => normalizeText(o))
      : [];

    // 1. Direct Course Category Name match
    if (normCategory && normInterest.includes(normCategory)) {
      score += 50;
      matchedTerms.add(courseCategory.toLowerCase());
    }

    // 2. Category Keyword Mapping match
    const categoryKeywords = CATEGORY_KEYWORDS[courseCategory] || [];
    for (const kw of categoryKeywords) {
      const normKw = normalizeText(kw);
      if (!normKw) continue;

      if (normInterest.includes(normKw)) {
        score += 35;
        matchedTerms.add(kw.toLowerCase());
      }
    }

    // Also check cross-category keywords if course title or outcomes mention them
    for (const [catName, kwList] of Object.entries(CATEGORY_KEYWORDS)) {
      if (catName === courseCategory) continue;
      for (const kw of kwList) {
        const normKw = normalizeText(kw);
        if (normKw && normInterest.includes(normKw)) {
          // If this keyword is also in the course title or outcomes, reward it
          if (normTitle.includes(normKw) || normOutcomes.some(o => o.includes(normKw))) {
            score += 25;
            matchedTerms.add(kw.toLowerCase());
          }
        }
      }
    }

    // 3. Course Title keyword match
    for (const token of interestTokens) {
      if (normTitle.includes(token)) {
        score += 20;
        matchedTerms.add(token);
      }
    }

    // 4. Learning Outcomes keyword match
    for (const outcome of normOutcomes) {
      for (const token of interestTokens) {
        if (outcome.includes(token)) {
          score += 15;
          matchedTerms.add(token);
        }
      }
    }

    // 5. Short Description keyword match
    for (const token of interestTokens) {
      if (normShortDesc.includes(token)) {
        score += 5;
        matchedTerms.add(token);
      }
    }

    // 6. Full Description keyword match
    for (const token of interestTokens) {
      if (normFullDesc.includes(token)) {
        score += 3;
      }
    }

    // Human-readable recommendation reason generator
    let recommendationReason = '';
    const termsArray = Array.from(matchedTerms).filter(t => t.length > 1);

    if (termsArray.length > 0) {
      const displayTerms = termsArray.slice(0, 3).map(t => {
        // Beautify common acronyms
        if (t === 'ai') return 'AI';
        if (t === 'cv') return 'CV';
        if (t === 'it skills') return 'IT skills';
        return t;
      });

      if (displayTerms.length === 1) {
        recommendationReason = `Recommended because you mentioned ${displayTerms[0]}.`;
      } else if (displayTerms.length === 2) {
        recommendationReason = `Recommended because you mentioned ${displayTerms[0]} and ${displayTerms[1]}.`;
      } else {
        recommendationReason = `Recommended because you mentioned ${displayTerms[0]}, ${displayTerms[1]} and ${displayTerms[2]}.`;
      }
    } else if (score > 0) {
      recommendationReason = `Recommended based on your interest in ${courseCategory}.`;
    }

    return {
      ...course,
      score,
      recommendationReason,
      matchedTermsCount: termsArray.length
    };
  });

  // Filter positive matches
  const matchingCourses = scoredCourses.filter(c => c.score > 0);

  if (matchingCourses.length > 0) {
    // Sort descending by score, then by updatedAt descending
    matchingCourses.sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      const bTime = new Date(b.updatedAt || b.createdAt || 0).getTime();
      const aTime = new Date(a.updatedAt || a.createdAt || 0).getTime();
      return bTime - aTime;
    });

    const topResults = matchingCourses.slice(0, 3).map((c, index) => ({
      ...c,
      isBestMatch: index === 0 && c.score >= 15,
      isFallback: false
    }));

    return {
      recommendations: topResults,
      isFallback: false,
      message: 'Here are the best courses matching your learning interest.'
    };
  }

  // Fallback scenario: no exact match found
  const fallbackResults = eligibleCourses.slice(0, 3).map(course => ({
    ...course,
    score: 0,
    isBestMatch: false,
    isFallback: true,
    recommendationReason: 'We could not find an exact match, but this course may still be useful.'
  }));

  return {
    recommendations: fallbackResults,
    isFallback: true,
    message: 'We could not find an exact match, but these courses may still be useful.'
  };
}

export default {
  normalizeText,
  extractTokens,
  computeCourseRecommendations
};
