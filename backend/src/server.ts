import 'dotenv/config';
import { createServer, IncomingMessage, ServerResponse } from 'http';
import { parse } from 'url';
import { ThreadGenerator } from './services/threadGenerator';

const PORT = process.env.PORT || 3001;

console.log('🚀 Starting Tweety Backend Server...');
console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
console.log(`🤖 LLM Provider: ${process.env.LLM_PROVIDER || 'llama (default)'}`);
console.log(`🔗 Port: ${PORT}`);

// CORS headers
const setCorsHeaders = (res: ServerResponse) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
};

// JSON response helper
const sendJson = (res: ServerResponse, data: any, statusCode = 200) => {
  res.writeHead(statusCode, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(data));
};

// Parse JSON body
const parseJsonBody = async (req: IncomingMessage): Promise<any> => {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (error) {
        reject(error);
      }
    });
  });
};

const server = createServer(async (req: IncomingMessage, res: ServerResponse) => {
  setCorsHeaders(res);

  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  const parsedUrl = parse(req.url || '', true);
  const pathname = parsedUrl.pathname;

  try {
    if (pathname === '/api/generate-thread' && req.method === 'POST') {
      const body = await parseJsonBody(req);
      const { topic, context, tone } = body;

      if (!topic) {
        sendJson(res, { error: 'Topic is required' }, 400);
        return;
      }

      const threadGenerator = new ThreadGenerator();
      const thread = await threadGenerator.generateThread(topic, context, tone);
      
      sendJson(res, { thread });
    } else if (pathname === '/api/analyze-topic' && req.method === 'POST') {
      const body = await parseJsonBody(req);
      const { topic, context } = body;

      if (!topic) {
        sendJson(res, { error: 'Topic is required' }, 400);
        return;
      }

      const threadGenerator = new ThreadGenerator();
      const analysis = await threadGenerator.analyzeTopicIntention(topic, context);
      
      sendJson(res, analysis);
    } else if (pathname === '/api/generate-with-context' && req.method === 'POST') {
      const body = await parseJsonBody(req);
      const { topic, context, refinedIntention } = body;

      if (!topic) {
        sendJson(res, { error: 'Topic is required' }, 400);
        return;
      }

      const threadGenerator = new ThreadGenerator();
      const thread = await threadGenerator.generateThreadWithContext(topic, context, refinedIntention);
      
      sendJson(res, { thread });
    } else if (pathname === '/api/health' && req.method === 'GET') {
      sendJson(res, { status: 'healthy', timestamp: new Date().toISOString() });
    } else {
      sendJson(res, { error: 'Not found' }, 404);
    }
  } catch (error) {
    console.error('Server error:', error);
    sendJson(res, { error: 'Internal server error' }, 500);
  }
});

server.listen(PORT, () => {
  console.log(`🚀 Backend server running on http://localhost:${PORT}`);
  console.log(`📝 Thread generation API: http://localhost:${PORT}/api/generate-thread`);
}); 