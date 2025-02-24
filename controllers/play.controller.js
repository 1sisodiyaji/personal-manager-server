require('dotenv').config();
const Conversation = require('../models/play');
const { ChatGoogleGenerativeAI } = require('@langchain/google-genai');
const axios = require('axios');

const llm = new ChatGoogleGenerativeAI({
  model: 'gemini-2.0-flash-exp',
  apiKey: process.env.GEMINI_API_KEY,
  temperature: 0,
});

// LLM Call
const analyzeConversation = async (text, promptTemplate) => {
  const minScore = 1;
  if (typeof text !== 'string' || !text.trim()) {
    throw new Error('Invalid text input: must be a non-empty string.');
  }
  if (typeof promptTemplate !== 'string' || !promptTemplate.includes('{conversation}')) {
    throw new Error('Invalid prompt template: must include "{conversation}" placeholder.');
  }

  const prompt = promptTemplate.replace('{conversation}', text);

  const response = await llm.invoke(prompt);
  if (!response || !response.content) {
    throw new Error('LLM response is empty or undefined.');
  }

  let cleanedContent = response.content.trim();
  if (cleanedContent.startsWith('```json')) {
    cleanedContent = cleanedContent.slice(7);
  }
  if (cleanedContent.endsWith('```')) {
    cleanedContent = cleanedContent.slice(0, -3);
  }

  let parsedResponse;
  try {
    parsedResponse = JSON.parse(cleanedContent);
    if (!parsedResponse || typeof parsedResponse !== 'object') {
      throw new Error('Invalid JSON format: parsed response is not an object.');
    }
  } catch (error) {
    console.error('JSON Parsing Error:', error, 'Raw Response:', response.content);
    throw new Error('AI response is not valid JSON');
  }

  const scoreMap = { Poor: 1, Average: 3, Good: 5 };
  const yesNoMap = { Yes: 5, No: 1 };

  let totalScore = 0;
  let questionCount = 0;

  for (let key in parsedResponse) {
    const answer = parsedResponse[key];
    if (typeof answer !== 'string' || (!scoreMap[answer] && !yesNoMap[answer])) {
      console.warn(`Unexpected answer format for key "${key}":`, answer);
      continue;
    }
    totalScore += scoreMap[answer] || yesNoMap[answer] || minScore;
    questionCount++;
  }

  if (questionCount === 0) {
    throw new Error('No valid answers found in AI response.');
  }

  const overallScore = questionCount > 0 ? (totalScore / (questionCount * 5)) * 5 : 0;
  return { parsedResponse, overallScore: parseFloat(overallScore.toFixed(2)) };
};

// Basic API Call
const createConversation = async (req, res) => {
  try {
    const { type, text, prompt } = req.body;

    if (!type) {
      return res.status(400).json({ error: 'Type fields are required' });
    }
    if (!text || typeof text !== 'string' || text.length < 5) {
      return res.status(400).json({ error: 'Text must be at least 5 characters long.' });
    }

    if (!prompt || typeof prompt !== 'string') {
      return res.status(400).json({ error: 'Prompt is required and must be a string.' });
    }

    const evaluationResults = await analyzeConversation(text, prompt);
    console.log('Calculated Score:', evaluationResults);

    const newConversation = new Conversation({
      type,
      prompt,
      text,
      score: evaluationResults.overallScore,
      metadata: evaluationResults.parsedResponse,
    });

    await newConversation.save();

    res.status(201).json({
      message: 'Conversation analyzed and saved successfully!',
      data: newConversation,
    });
  } catch (error) {
    console.error('Analysis Error:', error);
    res.status(500).json({ error: 'Failed to analyze conversation', details: error.message });
  }
};

// Get All SCore
const GetAllScore = async (req, res) => {
  try {
    const conversations = await Conversation.find().sort({ createdAt: -1 });
    res.status(200).json({
      message: 'Conversations retrieved successfully!',
      data: conversations,
    });
  } catch (error) {
    console.error('Error fetching conversations:', error);
    res.status(500).json({ error: 'Failed to retrieve conversations', details: error.message });
  }
};

const SummarizeAi = async (req, res) => {
  const { text } = req.body;

  if (!text) {
    return res.status(400).json({ error: 'Text is required for summarization.' });
  }

  const wordCount = text.trim().split(/\s+/).length;
  if (wordCount < 20) {
    return res
      .status(400)
      .json({ status: false, message: 'Text must be at least 20 words for summarization.' });
  }

  try {
    const apiUrl =
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent';
    const prompt = `Please summarize the following text in a concise manner with a structured format:
1. Write a short paragraph (200-250 words) summarizing the key points of the conversation. Enclose this paragraph in <p> tags.
2. Extract and highlight five key points in the most concise form possible. Each point should be a very short and direct phrase (max 5 words) enclosed in <ul><li> tags. Focus only on actionable or significant details.

Avoid redundant information and irrelevant details. Maintain a professional yet reader-friendly tone. Here’s the text to summarize: ${text}
`;

    const response = await axios.post(`${apiUrl}?key=${process.env.GEMINI_API_KEY}`, {
      contents: [{ parts: [{ text: prompt }] }],
    });
    const result = response.data.candidates[0].content.parts[0].text;
    return res.json({ status: true, summary: result });
  } catch (error) {
    console.error('Error:', error.message);
    res.status(500).json({
      error: 'Summary generation failed',
      details: error.message,
    });
  }
};
module.exports = { createConversation, GetAllScore, SummarizeAi };
