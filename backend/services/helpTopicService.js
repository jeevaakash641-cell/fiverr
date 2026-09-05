/**
 * Help Topics Service — Stores and manages "What would you most like help with?" dropdown options
 * Table: EduLearnHelpTopics (partition key: topicId)
 */

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, GetCommand, UpdateCommand, ScanCommand, DeleteCommand } from '@aws-sdk/lib-dynamodb';
import { randomUUID } from 'crypto';
import fs from 'fs';
import path from 'path';

const TABLE_NAME = process.env.DYNAMODB_TABLE_HELP_TOPICS || 'EduLearnHelpTopics';

let docClient = null;

function getClient() {
  if (!docClient) {
    const raw = new DynamoDBClient({
      region: process.env.AWS_REGION || 'us-east-1',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID?.trim(),
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY?.trim(),
      },
    });
    docClient = DynamoDBDocumentClient.from(raw);
  }
  return docClient;
}

// Default Help Topics from One Community Ely requirements
export const DEFAULT_HELP_TOPICS = [
  {
    topicId: 'topic_money_mgmt',
    label: 'Managing my money',
    category: 'Money Management',
    description: 'Budgeting, banking, debt awareness, financial resilience, and savings',
    keywords: ['money', 'budget', 'finance', 'debt', 'banking', 'saving', 'cash', 'bills', 'income'],
    orderIndex: 0,
    isActive: true
  },
  {
    topicId: 'topic_work_prep',
    label: 'Finding/preparing for work',
    category: 'Employment and Personal Development',
    description: 'CV writing, interview prep, job applications, confidence, workplace skills',
    keywords: ['work', 'job', 'career', 'interview', 'cv', 'resume', 'employment', 'hiring', 'applications'],
    orderIndex: 1,
    isActive: true
  },
  {
    topicId: 'topic_digital_skills',
    label: 'Improving my digital skills',
    category: 'Digital Skills',
    description: 'Using computers, internet safety, email, office software, everyday technology',
    keywords: ['digital', 'computer', 'internet', 'tech', 'software', 'email', 'online', 'typing', 'web'],
    orderIndex: 2,
    isActive: true
  },
  {
    topicId: 'topic_ai_learning',
    label: 'Learning how to use AI',
    category: 'Artificial Intelligence',
    description: 'Practical artificial intelligence, ChatGPT, Bedrock, prompting, AI tools for daily tasks',
    keywords: ['ai', 'chatgpt', 'bedrock', 'prompts', 'artificial intelligence', 'bot', 'automation', 'machine learning'],
    orderIndex: 3,
    isActive: true
  },
  {
    topicId: 'topic_communication',
    label: 'Improving communication/confidence',
    category: 'Communication and Confidence',
    description: 'Speaking up, assertive communication, active listening, personal presentation',
    keywords: ['communication', 'confidence', 'speaking', 'assertiveness', 'workplace', 'presentation', 'public speaking', 'conversation'],
    orderIndex: 4,
    isActive: true
  },
  {
    topicId: 'topic_podcasting',
    label: 'Learning podcasting/digital media',
    category: 'Podcasting and Digital Media',
    description: 'Audio recording, editing, digital media production, storytelling, broadcasting',
    keywords: ['podcast', 'podcasting', 'media', 'audio', 'video', 'recording', 'editing', 'broadcasting', 'storytelling'],
    orderIndex: 5,
    isActive: true
  },
  {
    topicId: 'topic_small_business',
    label: 'Starting a small business',
    category: 'Small Business',
    description: 'Entrepreneurship, enterprise planning, marketing, customer service, startup fundamentals',
    keywords: ['business', 'startup', 'enterprise', 'entrepreneur', 'selling', 'marketing', 'customers', 'sales', 'freelance'],
    orderIndex: 6,
    isActive: true
  },
  {
    topicId: 'topic_life_skills',
    label: 'Developing everyday life skills',
    category: 'Everyday Life Skills',
    description: 'Time management, problem solving, household administration, personal wellbeing',
    keywords: ['life', 'everyday', 'wellbeing', 'health', 'habits', 'safety', 'routine', 'cooking', 'organization'],
    orderIndex: 7,
    isActive: true
  },
  {
    topicId: 'topic_something_else',
    label: 'Something else',
    category: 'Other',
    description: 'Custom learning goals and personalized course inquiries',
    keywords: ['other', 'custom', 'general'],
    orderIndex: 8,
    isActive: true
  }
];

// Fallback in-memory / local storage cache if DynamoDB table is not yet provisioned
let memoryTopicsCache = [...DEFAULT_HELP_TOPICS];

/**
 * Get all help topics (sorted by orderIndex)
 * @param {boolean} includeInactive
 */
export async function getAllHelpTopics(includeInactive = false) {
  try {
    const client = getClient();
    const result = await client.send(new ScanCommand({ TableName: TABLE_NAME }));
    let items = result.Items || [];

    if (items.length === 0) {
      // Seed default topics in DynamoDB
      await seedDefaultHelpTopics();
      items = [...DEFAULT_HELP_TOPICS];
    }

    if (!includeInactive) {
      items = items.filter(t => t.isActive !== false);
    }

    items.sort((a, b) => (a.orderIndex ?? 999) - (b.orderIndex ?? 999));
    memoryTopicsCache = items;
    return items;
  } catch (err) {
    console.warn(`DynamoDB Scan ${TABLE_NAME} notice (using memory/fallback):`, err.message);
    let items = [...memoryTopicsCache];
    if (!includeInactive) {
      items = items.filter(t => t.isActive !== false);
    }
    items.sort((a, b) => (a.orderIndex ?? 999) - (b.orderIndex ?? 999));
    return items;
  }
}

/**
 * Seed default help topics into DynamoDB
 */
export async function seedDefaultHelpTopics() {
  try {
    const client = getClient();
    const now = new Date().toISOString();

    await Promise.all(DEFAULT_HELP_TOPICS.map(topic => {
      return client.send(new PutCommand({
        TableName: TABLE_NAME,
        Item: {
          ...topic,
          createdAt: now,
          updatedAt: now
        }
      })).catch(e => console.warn('Seed put notice:', e.message));
    }));
    console.log('✅ Seeded default help topics into DynamoDB');
  } catch (err) {
    console.warn('Could not seed default help topics to DynamoDB:', err.message);
  }
}

/**
 * Get single help topic by ID
 */
export async function getHelpTopicById(topicId) {
  try {
    const client = getClient();
    const result = await client.send(new GetCommand({
      TableName: TABLE_NAME,
      Key: { topicId }
    }));
    return result.Item || memoryTopicsCache.find(t => t.topicId === topicId) || null;
  } catch (err) {
    return memoryTopicsCache.find(t => t.topicId === topicId) || null;
  }
}

/**
 * Create a new help topic (Admin only)
 */
export async function createHelpTopic(payload, createdBy = 'admin') {
  const {
    label,
    category = 'Other',
    description = '',
    keywords = [],
    orderIndex,
    isActive = true
  } = payload;

  if (!label || !label.trim()) {
    throw new Error('Topic label is required');
  }

  const topicId = `topic_${Date.now()}_${randomUUID().slice(0, 8)}`;
  const now = new Date().toISOString();

  const all = await getAllHelpTopics(true);
  const nextOrder = typeof orderIndex === 'number' ? orderIndex : all.length;

  const newTopic = {
    topicId,
    label: label.trim(),
    category: (category || 'Other').trim(),
    description: (description || '').trim(),
    keywords: Array.isArray(keywords) ? keywords.map(k => String(k).trim()).filter(Boolean) : [],
    orderIndex: nextOrder,
    isActive: Boolean(isActive),
    createdBy,
    createdAt: now,
    updatedAt: now
  };

  try {
    const client = getClient();
    await client.send(new PutCommand({
      TableName: TABLE_NAME,
      Item: newTopic
    }));
  } catch (err) {
    console.warn('DynamoDB PutCommand notice:', err.message);
  }

  memoryTopicsCache.push(newTopic);
  return newTopic;
}

/**
 * Update an existing help topic (Admin only)
 */
export async function updateHelpTopic(topicId, updates) {
  const existing = await getHelpTopicById(topicId);
  if (!existing) return null;

  const now = new Date().toISOString();
  const updatedTopic = {
    ...existing,
    ...updates,
    topicId, // Preserve PK
    updatedAt: now
  };

  if (updates.keywords && Array.isArray(updates.keywords)) {
    updatedTopic.keywords = updates.keywords.map(k => String(k).trim()).filter(Boolean);
  }

  try {
    const client = getClient();
    await client.send(new PutCommand({
      TableName: TABLE_NAME,
      Item: updatedTopic
    }));
  } catch (err) {
    console.warn('DynamoDB update notice:', err.message);
  }

  memoryTopicsCache = memoryTopicsCache.map(t => t.topicId === topicId ? updatedTopic : t);
  return updatedTopic;
}

/**
 * Delete a help topic (Admin only)
 */
export async function deleteHelpTopic(topicId) {
  const existing = await getHelpTopicById(topicId);
  if (!existing) return null;

  try {
    const client = getClient();
    await client.send(new DeleteCommand({
      TableName: TABLE_NAME,
      Key: { topicId }
    }));
  } catch (err) {
    console.warn('DynamoDB delete notice:', err.message);
  }

  memoryTopicsCache = memoryTopicsCache.filter(t => t.topicId !== topicId);
  return existing;
}

export default {
  DEFAULT_HELP_TOPICS,
  getAllHelpTopics,
  getHelpTopicById,
  createHelpTopic,
  updateHelpTopic,
  deleteHelpTopic,
  seedDefaultHelpTopics
};
