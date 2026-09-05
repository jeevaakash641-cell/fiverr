/**
 * Bilingual Translation Service
 * Provides responses in both mother tongue and English
 */

import { API_BASE_URL } from '../config';

// Language mappings
const LANGUAGE_CODES = {
  'Hindi': 'hi',
  'Hindi Medium': 'hi',
  'Telugu': 'te',
  'Telugu Medium': 'te',
  'Tamil': 'ta',
  'Tamil Medium': 'ta',
  'Kannada': 'kn',
  'Kannada Medium': 'kn',
  'Malayalam': 'ml',
  'Malayalam Medium': 'ml',
  'Bengali': 'bn',
  'Bengali Medium': 'bn',
  'Marathi': 'mr',
  'Marathi Medium': 'mr',
  'Gujarati': 'gu',
  'Gujarati Medium': 'gu',
  'Punjabi': 'pa',
  'Punjabi Medium': 'pa',
  'Odia': 'or',
  'Odia Medium': 'or',
  'Assamese': 'as',
  'Assamese Medium': 'as',
  'Urdu': 'ur',
  'Urdu Medium': 'ur',
  'English': 'en',
  'English Medium': 'en'
};

const LANGUAGE_NAMES = {
  'hi': 'हिंदी',
  'te': 'తెలుగు',
  'ta': 'தமிழ்',
  'kn': 'ಕನ್ನಡ',
  'ml': 'മലയാളം',
  'bn': 'বাংলা',
  'mr': 'मराठी',
  'gu': 'ગુજરાતી',
  'pa': 'ਪੰਜਾਬੀ',
  'or': 'ଓଡ଼ିଆ',
  'as': 'অসমীয়া',
  'ur': 'اردو',
  'en': 'English'
};

/**
 * Translate text to target language using AWS Translate
 */
export const translateText = async (text, targetLanguage) => {
  try {
    console.log('🌐 translateText called with:', { text: text.substring(0, 50) + '...', targetLanguage });
    
    const languageCode = LANGUAGE_CODES[targetLanguage] || 'en';
    console.log('🔤 Language code:', languageCode);
    
    // If already in English or target is English, return as is
    if (languageCode === 'en') {
      console.log('✅ Target is English, returning original text');
      return text;
    }

    console.log(`🌐 Translating to ${targetLanguage} (${languageCode})`);

    const response = await fetch(`${API_BASE_URL}/api/translate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text,
        targetLanguage: languageCode,
        sourceLanguage: 'en'
      })
    });

    if (!response.ok) {
      throw new Error('Translation failed');
    }

    const data = await response.json();
    return data.translatedText || text;
  } catch (error) {
    console.error('Translation error:', error);
    // Return original text if translation fails
    return text;
  }
};

/**
 * Get bilingual response (both mother tongue and English)
 */
export const getBilingualResponse = async (englishText, userLanguage) => {
  // If user's language is English, return only English
  if (userLanguage === 'English' || !userLanguage) {
    return {
      english: englishText,
      motherTongue: null,
      language: 'English',
      languageCode: 'en'
    };
  }

  try {
    const translatedText = await translateText(englishText, userLanguage);
    const languageCode = LANGUAGE_CODES[userLanguage] || 'en';
    const nativeName = LANGUAGE_NAMES[languageCode] || userLanguage;

    return {
      english: englishText,
      motherTongue: translatedText,
      language: userLanguage,
      languageCode,
      nativeName
    };
  } catch (error) {
    console.error('Bilingual response error:', error);
    return {
      english: englishText,
      motherTongue: null,
      language: userLanguage,
      languageCode: LANGUAGE_CODES[userLanguage] || 'en'
    };
  }
};

/**
 * Format bilingual message for display
 */
export const formatBilingualMessage = (bilingualResponse) => {
  if (!bilingualResponse.motherTongue) {
    return bilingualResponse.english;
  }

  return {
    hasTranslation: true,
    english: bilingualResponse.english,
    translated: bilingualResponse.motherTongue,
    language: bilingualResponse.language,
    nativeName: bilingualResponse.nativeName
  };
};

/**
 * Detect if text is in English
 */
export const isEnglish = (text) => {
  // Simple check: if text contains mostly English characters
  const englishChars = text.match(/[a-zA-Z]/g);
  return englishChars && englishChars.length > text.length * 0.7;
};

/**
 * Get language name in native script
 */
export const getNativeLanguageName = (language) => {
  const code = LANGUAGE_CODES[language];
  return LANGUAGE_NAMES[code] || language;
};

/**
 * Translate AI response to user's language
 */
export const translateAIResponse = async (response, userLanguage) => {
  if (!userLanguage || userLanguage === 'English') {
    return {
      original: response,
      translated: null,
      language: 'English'
    };
  }

  try {
    const translated = await translateText(response, userLanguage);
    return {
      original: response,
      translated,
      language: userLanguage,
      nativeName: getNativeLanguageName(userLanguage)
    };
  } catch (error) {
    console.error('AI response translation error:', error);
    return {
      original: response,
      translated: null,
      language: userLanguage
    };
  }
};

/**
 * Batch translate multiple texts
 */
export const batchTranslate = async (texts, targetLanguage) => {
  try {
    const translations = await Promise.all(
      texts.map(text => translateText(text, targetLanguage))
    );
    return translations;
  } catch (error) {
    console.error('Batch translation error:', error);
    return texts; // Return originals if translation fails
  }
};

export default {
  translateText,
  getBilingualResponse,
  formatBilingualMessage,
  isEnglish,
  getNativeLanguageName,
  translateAIResponse,
  batchTranslate,
  LANGUAGE_CODES,
  LANGUAGE_NAMES
};
