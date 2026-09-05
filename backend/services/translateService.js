/**
 * AWS Translate Service
 * Provides text translation using AWS Translate
 */

import { TranslateClient, TranslateTextCommand } from '@aws-sdk/client-translate';
import { ComprehendClient, DetectDominantLanguageCommand } from '@aws-sdk/client-comprehend';

// Lazy initialization of clients
let translateClient = null;
let comprehendClient = null;

const getTranslateClient = () => {
  if (!translateClient) {
    console.log('🔧 Initializing AWS Translate Client');
    console.log('  Region:', process.env.AWS_REGION || process.env.BEDROCK_REGION || 'us-east-1');
    console.log('  Access Key:', process.env.AWS_ACCESS_KEY_ID ? '✅ Set' : '❌ Missing');
    console.log('  Secret Key:', process.env.AWS_SECRET_ACCESS_KEY ? '✅ Set' : '❌ Missing');
    
    translateClient = new TranslateClient({
      region: process.env.AWS_REGION || process.env.BEDROCK_REGION || 'us-east-1',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
      }
    });
  }
  return translateClient;
};

const getComprehendClient = () => {
  if (!comprehendClient) {
    comprehendClient = new ComprehendClient({
      region: process.env.AWS_REGION || process.env.BEDROCK_REGION || 'us-east-1',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
      }
    });
  }
  return comprehendClient;
};

// Language code to name mapping
const LANGUAGE_NAMES = {
  'en': 'English',
  'hi': 'Hindi',
  'ta': 'Tamil',
  'te': 'Telugu',
  'kn': 'Kannada',
  'ml': 'Malayalam',
  'bn': 'Bengali',
  'mr': 'Marathi',
  'gu': 'Gujarati',
  'pa': 'Punjabi',
  'or': 'Odia',
  'as': 'Assamese',
  'ur': 'Urdu'
};

/**
 * Detect language of text using AWS Comprehend
 */
export const detectLanguage = async (text) => {
  try {
    const client = getComprehendClient();
    const command = new DetectDominantLanguageCommand({ Text: text });
    const response = await client.send(command);
    
    const dominantLanguage = response.Languages[0];
    
    return {
      code: dominantLanguage.LanguageCode,
      name: LANGUAGE_NAMES[dominantLanguage.LanguageCode] || dominantLanguage.LanguageCode,
      confidence: dominantLanguage.Score
    };
  } catch (error) {
    console.error('Language detection error:', error);
    // Default to English if detection fails
    return { code: 'en', name: 'English', confidence: 1.0 };
  }
};

/**
 * Translate text to English
 */
export const translateToEnglish = async (text, sourceLanguage) => {
  if (sourceLanguage === 'en') return text;
  
  try {
    const client = getTranslateClient();
    const command = new TranslateTextCommand({
      Text: text,
      SourceLanguageCode: sourceLanguage,
      TargetLanguageCode: 'en'
    });
    
    const response = await client.send(command);
    return response.TranslatedText;
  } catch (error) {
    console.error('Translation to English error:', error);
    return text; // Return original if translation fails
  }
};

/**
 * Translate text from English to target language
 */
export const translateFromEnglish = async (text, targetLanguage) => {
  if (targetLanguage === 'en') return text;
  
  try {
    const client = getTranslateClient();
    const command = new TranslateTextCommand({
      Text: text,
      SourceLanguageCode: 'en',
      TargetLanguageCode: targetLanguage
    });
    
    const response = await client.send(command);
    return response.TranslatedText;
  } catch (error) {
    console.error('Translation from English error:', error);
    return text; // Return original if translation fails
  }
};

/**
 * Translate text from source language to target language
 */
export const translateText = async (text, targetLanguage, sourceLanguage = 'en') => {
  try {
    console.log(`🌐 Translating text to ${targetLanguage}`);
    
    const client = getTranslateClient();
    const command = new TranslateTextCommand({
      Text: text,
      SourceLanguageCode: sourceLanguage,
      TargetLanguageCode: targetLanguage
    });

    const response = await client.send(command);
    
    console.log(`✅ Translation successful`);
    
    return {
      translatedText: response.TranslatedText,
      sourceLanguage: response.SourceLanguageCode,
      targetLanguage: response.TargetLanguageCode
    };
  } catch (error) {
    console.error('❌ Translation error:', error);
    throw new Error(`Translation failed: ${error.message}`);
  }
};

/**
 * Batch translate multiple texts
 */
export const batchTranslate = async (texts, targetLanguage, sourceLanguage = 'en') => {
  try {
    const translations = await Promise.all(
      texts.map(text => translateText(text, targetLanguage, sourceLanguage))
    );
    
    return translations.map(t => t.translatedText);
  } catch (error) {
    console.error('❌ Batch translation error:', error);
    throw error;
  }
};

export default {
  detectLanguage,
  translateToEnglish,
  translateFromEnglish,
  translateText,
  batchTranslate
};
