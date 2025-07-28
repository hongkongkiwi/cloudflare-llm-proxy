import { createServer, IncomingMessage, ServerResponse } from 'http';
import { URL } from 'url';
import workerHandler from './index';

// Environment variables for local development
const env = {
  ALLOWED_ANTHROPIC_KEYS: process.env.ALLOWED_ANTHROPIC_KEYS || 'client-key-1,client-key-2,client-key-3',
  ALLOWED_OPENAI_KEYS: process.env.ALLOWED_OPENAI_KEYS || 'client-key-1,client-key-2,client-key-3',
  ALLOWED_GOOGLE_KEYS: process.env.ALLOWED_GOOGLE_KEYS || 'client-key-1,client-key-2,client-key-3',
  ALLOWED_GROQ_KEYS: process.env.ALLOWED_GROQ_KEYS || 'client-key-1,client-key-2,client-key-3',
  ALLOWED_OPENROUTER_KEYS: process.env.ALLOWED_OPENROUTER_KEYS || 'client-key-1,client-key-2,client-key-3',
  PROXY_URL: process.env.PROXY_URL,
};

// Pre-define common headers for performance
const COMMON_HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-API-Key, anthropic-version, openai-version, x-goog-api-key',
};

// Optimized header copying function
function copyHeaders(source: Record<string, string | string[] | undefined>, target: Headers): void {
  for (const [key, value] of Object.entries(source)) {
    if (value !== undefined) {
      if (Array.isArray(value)) {
        value.forEach(v => target.append(key, v));
      } else {
        target.set(key, value);
      }
    }
  }
}

// Optimized body reading function
async function readBody(req: IncomingMessage): Promise<string | null> {
  if (req.method === 'GET' || req.method === 'HEAD') {
    return null;
  }

  return new Promise((resolve) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => {
      resolve(Buffer.concat(chunks).toString());
    });
  });
}

const server = createServer(async (req: IncomingMessage, res: ServerResponse) => {
  try {
    // Convert Node.js request to Web API Request (optimized)
    const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
    const headers = new Headers();
    
    // Copy headers from Node.js request to Web API Headers (optimized)
    copyHeaders(req.headers, headers);

    // Read request body (optimized)
    const body = await readBody(req);

    // Create Web API Request
    const request = new Request(url.toString(), {
      method: req.method || 'GET',
      headers,
      body: body || undefined,
    });

    // Call the worker handler
    const response = await workerHandler.fetch(request, env, {});

    // Convert Web API Response to Node.js response (optimized)
    const responseHeaders: Record<string, string | number> = {};
    response.headers.forEach((value, key) => {
      responseHeaders[key] = value;
    });

    res.writeHead(response.status, response.statusText, responseHeaders);

    // Stream the response body (optimized)
    if (response.body) {
      const reader = response.body.getReader();
      const pump = async () => {
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            res.write(Buffer.from(value));
          }
        } catch (error) {
          console.error('Error reading response body:', error);
        } finally {
          res.end();
        }
      };
      pump();
    } else {
      res.end();
    }
  } catch (error) {
    console.error('Server error:', error);
    res.writeHead(500, COMMON_HEADERS);
    res.end(JSON.stringify({ error: 'Internal server error' }));
  }
});

// Optimize server settings for performance
server.keepAliveTimeout = 65000; // 65 seconds
server.headersTimeout = 66000; // 66 seconds
server.maxConnections = 1000; // Allow more concurrent connections

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log(`🚀 Claude Proxy running locally on http://localhost:${PORT}`);
  console.log('📝 Available endpoints:');
  console.log('  - /anthropic/v1/messages');
  console.log('  - /openai/v1/chat/completions');
  console.log('  - /openai/v1/models');
  console.log('  - /gemini/v1/chat/completions');
  console.log('  - /groq/v1/chat/completions');
  console.log('  - /vertexai/v1/predict');
  console.log('  - /vertexai/v1/models');
  console.log('  - /openrouter/v1/chat/completions');
  console.log('  - /openrouter/v1/models');
  console.log('  - /claude-gemini/v1/messages');
  console.log('');
  console.log('🔑 Use X-API-Key or Authorization header with one of these keys:');
  console.log('  - client-key-1');
  console.log('  - client-key-2');
  console.log('  - client-key-3');
  console.log('');
  console.log('💡 Example:');
  console.log('  curl -X POST http://localhost:3000/openai/v1/chat/completions \\');
  console.log('    -H "Content-Type: application/json" \\');
  console.log('    -H "X-API-Key: client-key-1" \\');
  console.log('    -d \'{"model":"gpt-3.5-turbo","messages":[{"role":"user","content":"Hello"}]}\'');
});

export default server; 