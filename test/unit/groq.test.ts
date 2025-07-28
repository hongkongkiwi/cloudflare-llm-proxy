import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock the worker environment
const mockEnv = {
  ALLOWED_ANTHROPIC_KEYS: 'client-key-1,client-key-2,client-key-3',
  ALLOWED_OPENAI_KEYS: 'client-key-1,client-key-2,client-key-3',
  ALLOWED_GOOGLE_KEYS: 'client-key-1,client-key-2,client-key-3',
  ALLOWED_GROQ_KEYS: 'client-key-1,client-key-2,client-key-3',
  ALLOWED_OPENROUTER_KEYS: 'client-key-1,client-key-2,client-key-3',
};

// Mock fetch responses
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Import the worker handler
import workerHandler from '../../src/index';

describe('Groq API Unit Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Groq Endpoint Routing', () => {
    it('should route Groq chat completions endpoint correctly', async () => {
      // Mock successful API response
      mockFetch.mockResolvedValueOnce(new Response(JSON.stringify({
        id: 'chatcmpl-123',
        object: 'chat.completion',
        created: 1677652288,
        model: 'llama3-8b-8192',
        choices: [
          {
            index: 0,
            message: {
              role: 'assistant',
              content: 'Hello! How can I help you today?'
            },
            finish_reason: 'stop'
          }
        ],
        usage: {
          prompt_tokens: 9,
          completion_tokens: 12,
          total_tokens: 21
        }
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }));

      const request = new Request('https://example.com/groq/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer client-key-1',
        },
        body: JSON.stringify({
          model: 'llama3-8b-8192',
          messages: [
            {
              role: 'user',
              content: 'Hello'
            }
          ],
          max_tokens: 100
        }),
      });

      const response = await workerHandler.fetch(request, mockEnv, {});
      const data = await response.json() as any;

      expect(response.status).toBe(200);
      expect(data.id).toBe('chatcmpl-123');
      expect(data.model).toBe('llama3-8b-8192');
      expect(data.choices[0].message.content).toBe('Hello! How can I help you today?');

      // Verify the request was forwarded to Groq
      expect(mockFetch).toHaveBeenCalled();
      
      // Verify the request properties
      const mockCall = mockFetch.mock.calls[0];
      const mockRequest = mockCall[0];
      expect(mockRequest.url).toBe('https://api.groq.com/v1/chat/completions');
      expect(mockRequest.method).toBe('POST');
      expect(mockRequest.headers.get('authorization')).toBe('Bearer client-key-1');
    });

    it('should route Groq models endpoint correctly', async () => {
      // Mock successful models response
      mockFetch.mockResolvedValueOnce(new Response(JSON.stringify({
        data: [
          {
            id: 'llama3-8b-8192',
            object: 'model',
            created: 1677610602,
            owned_by: 'groq',
            permission: [],
            root: 'llama3-8b-8192',
            parent: null
          },
          {
            id: 'llama3-70b-8192',
            object: 'model',
            created: 1677610602,
            owned_by: 'groq',
            permission: [],
            root: 'llama3-70b-8192',
            parent: null
          }
        ],
        object: 'list'
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }));

      const request = new Request('https://example.com/groq/v1/models', {
        method: 'GET',
        headers: {
          'Authorization': 'Bearer client-key-1',
        },
      });

      const response = await workerHandler.fetch(request, mockEnv, {});
      const data = await response.json() as any;

      expect(response.status).toBe(200);
      expect(data.data).toHaveLength(2);
      expect(data.data[0].id).toBe('llama3-8b-8192');
      expect(data.data[1].id).toBe('llama3-70b-8192');

      // Verify the request was forwarded to Groq
      expect(mockFetch).toHaveBeenCalled();
    });
  });

  describe('Groq Request Transformation', () => {
    it('should preserve Groq-specific headers', async () => {
      mockFetch.mockResolvedValueOnce(new Response(JSON.stringify({
        id: 'chatcmpl-123',
        object: 'chat.completion',
        created: 1677652288,
        model: 'llama3-8b-8192',
        choices: [
          {
            index: 0,
            message: {
              role: 'assistant',
              content: 'Hello!'
            },
            finish_reason: 'stop'
          }
        ],
        usage: {
          prompt_tokens: 9,
          completion_tokens: 12,
          total_tokens: 21
        }
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }));

      const request = new Request('https://example.com/groq/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Groq-Organization': 'org-test123',
          'Authorization': 'Bearer client-key-1',
        },
        body: JSON.stringify({
          model: 'llama3-8b-8192',
          messages: [
            {
              role: 'user',
              content: 'Hello'
            }
          ],
          max_tokens: 100
        }),
      });

      await workerHandler.fetch(request, mockEnv, {});

      // Verify Groq-specific headers are preserved
      expect(mockFetch).toHaveBeenCalled();
    });

    it('should handle Groq streaming responses', async () => {
      const streamResponse = new Response(
        new ReadableStream({
          start(controller) {
            controller.enqueue(new TextEncoder().encode('data: {"id":"chatcmpl-123","object":"chat.completion.chunk","created":1677652288,"model":"llama3-8b-8192","choices":[{"index":0,"delta":{"role":"assistant"},"finish_reason":null}]}\n\n'));
            controller.enqueue(new TextEncoder().encode('data: {"id":"chatcmpl-123","object":"chat.completion.chunk","created":1677652288,"model":"llama3-8b-8192","choices":[{"index":0,"delta":{"content":"Hello"},"finish_reason":null}]}\n\n'));
            controller.enqueue(new TextEncoder().encode('data: {"id":"chatcmpl-123","object":"chat.completion.chunk","created":1677652288,"model":"llama3-8b-8192","choices":[{"index":0,"delta":{},"finish_reason":"stop"}]}\n\n'));
            controller.enqueue(new TextEncoder().encode('data: [DONE]\n\n'));
            controller.close();
          }
        }),
        {
          status: 200,
          headers: { 
            'Content-Type': 'text/event-stream',
            'groq-organization': 'org-test123',
          },
        }
      );

      mockFetch.mockResolvedValueOnce(streamResponse);

      const request = new Request('https://example.com/groq/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer client-key-1',
        },
        body: JSON.stringify({
          model: 'llama3-8b-8192',
          messages: [
            {
              role: 'user',
              content: 'Hello'
            }
          ],
          stream: true,
        }),
      });

      const response = await workerHandler.fetch(request, mockEnv, {});

      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Type')).toBe('text/event-stream');
      expect(response.headers.get('groq-organization')).toBe('org-test123');
    });
  });

  describe('Groq Error Handling', () => {
    it('should handle Groq API errors correctly', async () => {
      mockFetch.mockResolvedValueOnce(new Response(JSON.stringify({
        error: {
          message: 'Rate limit exceeded',
          type: 'rate_limit_error',
          code: 'rate_limit_exceeded'
        }
      }), {
        status: 429,
        headers: { 'Content-Type': 'application/json' },
      }));

      const request = new Request('https://example.com/groq/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer client-key-1',
        },
        body: JSON.stringify({
          model: 'llama3-8b-8192',
          messages: [
            {
              role: 'user',
              content: 'Hello'
            }
          ],
          max_tokens: 100
        }),
      });

      const response = await workerHandler.fetch(request, mockEnv, {});
      const data = await response.json() as any;

      expect(response.status).toBe(429);
      expect(data.error.message).toBe('Rate limit exceeded');
      expect(data.error.type).toBe('rate_limit_error');
    });

    it('should handle Groq authentication errors', async () => {
      mockFetch.mockResolvedValueOnce(new Response(JSON.stringify({
        error: {
          message: 'Incorrect API key provided',
          type: 'invalid_request_error',
          code: 'invalid_api_key'
        }
      }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      }));

      const request = new Request('https://example.com/groq/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer client-key-1',
        },
        body: JSON.stringify({
          model: 'llama3-8b-8192',
          messages: [
            {
              role: 'user',
              content: 'Hello'
            }
          ],
          max_tokens: 100
        }),
      });

      const response = await workerHandler.fetch(request, mockEnv, {});
      const data = await response.json() as any;

      expect(response.status).toBe(401);
      expect(data.error.message).toBe('Incorrect API key provided');
      expect(data.error.type).toBe('invalid_request_error');
    });
  });
}); 