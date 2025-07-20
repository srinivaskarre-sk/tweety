import 'dotenv/config';
import { VercelRequest, VercelResponse } from '@vercel/node';
import { ThreadGenerator } from '../src/services/threadGenerator';

// CORS headers
const setCorsHeaders = (res: VercelResponse) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  setCorsHeaders(res);

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    const { topic, context } = req.body;

    if (!topic) {
      res.status(400).json({ error: 'Topic is required' });
      return;
    }

    const threadGenerator = new ThreadGenerator();
    const analysis = await threadGenerator.analyzeTopicIntention(topic, context);
    
    res.status(200).json(analysis);
  } catch (error) {
    console.error('Topic analysis error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
} 