import axios from 'axios';
import { API_BASE_URL } from '../config.js';

const BACKEND_API_URL = `${API_BASE_URL}/api`;

/**
 * Fast AI response — skips language detection & translation.
 * Use this for all English prompts (math, subject help, etc.)
 */
export const getBedrockResponse = async (userMessage, userContext = null) => {
  try {
    const response = await axios.post(`${BACKEND_API_URL}/ai/ask`, {
      message: userMessage,
    });

    if (response.data.success) {
      return response.data.response;
    }
    throw new Error('AI request failed');
  } catch (error) {
    console.error('❌ AI Error:', error);

    if (error.request && !error.response) {
      return `❌ **Connection Error**\n\nCannot reach the AI server. Please check your connection and try again.\n\nBackend: ${BACKEND_API_URL}`;
    }
    return `❌ **AI Error**\n\n${error.response?.data?.message || error.message}\n\nPlease try again.`;
  }
};

/**
 * AI response with automatic language translation.
 * Use this when the user may be typing in a regional language.
 */
export const getBedrockResponseWithTranslation = async (userMessage, userId = 'anonymous') => {
  try {
    const response = await axios.post(`${BACKEND_API_URL}/chat`, {
      message: userMessage,
      userId,
    });

    if (response.data.success) {
      return {
        response: response.data.response,
        language: response.data.language,
        sessionId: response.data.sessionId,
      };
    }
    throw new Error('Chat request failed');
  } catch (error) {
    console.error('❌ Chat Error:', error);
    return {
      response: `❌ **Error**\n\n${error.response?.data?.message || error.message}\n\nPlease try again.`,
      language: { code: 'en', name: 'English' },
    };
  }
};

export const isBedrockConfigured = async () => {
  try {
    const response = await axios.get(`${API_BASE_URL}/health`);
    return response.data.status === 'ok';
  } catch {
    return false;
  }
};

export const getBedrockConfig = () => ({ backendUrl: BACKEND_API_URL, configured: true });

export default { getBedrockResponse, getBedrockResponseWithTranslation, isBedrockConfigured, getBedrockConfig };
