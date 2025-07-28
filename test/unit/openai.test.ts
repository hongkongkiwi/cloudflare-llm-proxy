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

describe('OpenAI API Unit Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('OpenAI Endpoint Routing', () => {
    it('should route OpenAI chat completions endpoint correctly', async () => {
      // Mock successful API response
      mockFetch.mockResolvedValueOnce(new Response(JSON.stringify({
        id: 'chatcmpl-123',
        object: 'chat.completion',
        created: 1677652288,
        model: 'gpt-3.5-turbo',
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

      const request = new Request('https://example.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer client-key-1',
        },
        body: JSON.stringify({
          model: 'gpt-3.5-turbo',
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
      expect(data.model).toBe('gpt-3.5-turbo');
      expect(data.choices[0].message.content).toBe('Hello! How can I help you today?');

      // Verify the request was forwarded to OpenAI
      expect(mockFetch).toHaveBeenCalled();
      
      // Verify the request properties
      const mockCall = mockFetch.mock.calls[0];
      const callUrl = mockCall[0];
      const callOptions = mockCall[1];
      expect(callUrl).toBe('https://api.openai.com/v1/chat/completions');
      expect(callOptions.method).toBe('POST');
      expect(callOptions.headers instanceof Headers ? callOptions.headers.get('authorization') : callOptions.headers['authorization']).toBe('Bearer client-key-1');
    });

    it('should route OpenAI models endpoint correctly', async () => {
      // Mock successful models response
      mockFetch.mockResolvedValueOnce(new Response(JSON.stringify({
        data: [
          {
            id: 'gpt-3.5-turbo',
            object: 'model',
            created: 1677610602,
            owned_by: 'openai',
            permission: [],
            root: 'gpt-3.5-turbo',
            parent: null
          },
          {
            id: 'gpt-4',
            object: 'model',
            created: 1677610602,
            owned_by: 'openai',
            permission: [],
            root: 'gpt-4',
            parent: null
          }
        ],
        object: 'list'
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }));

      const request = new Request('https://example.com/openai/v1/models', {
        method: 'GET',
        headers: {
          'Authorization': 'Bearer client-key-1',
        },
      });

      const response = await workerHandler.fetch(request, mockEnv, {});
      const data = await response.json() as any;

      expect(response.status).toBe(200);
      expect(data.data).toHaveLength(2);
      expect(data.data[0].id).toBe('gpt-3.5-turbo');
      expect(data.data[1].id).toBe('gpt-4');

      // Verify the request was forwarded to OpenAI
      expect(mockFetch).toHaveBeenCalled();
      
      // Verify the request properties
      const mockCall = mockFetch.mock.calls[0];
      const callUrl = mockCall[0];
      const callOptions = mockCall[1];
      expect(callUrl).toBe('https://api.openai.com/v1/models');
      expect(callOptions.method).toBe('GET');
      expect(callOptions.headers instanceof Headers ? callOptions.headers.get('authorization') : callOptions.headers['authorization']).toBe('Bearer client-key-1');
    });
  });

  describe('OpenAI Request Transformation', () => {
    it('should preserve OpenAI-specific headers', async () => {
      mockFetch.mockResolvedValueOnce(new Response(JSON.stringify({
        id: 'chatcmpl-123',
        object: 'chat.completion',
        created: 1677652288,
        model: 'gpt-3.5-turbo',
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

      const request = new Request('https://example.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'OpenAI-Organization': 'org-test123',
          'OpenAI-Beta': 'assistants=v1',
          'Authorization': 'Bearer client-key-1',
        },
        body: JSON.stringify({
          model: 'gpt-3.5-turbo',
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

      // Verify OpenAI-specific headers are preserved
      expect(mockFetch).toHaveBeenCalled();
      
      // Verify the request properties
      const mockCall = mockFetch.mock.calls[0];
      const mockRequest = mockCall[0];
      const callOptions = mockCall[1];
      expect(callOptions.headers instanceof Headers ? callOptions.headers.get('openai-organization') : callOptions.headers['openai-organization']).toBe('org-test123');
      expect(callOptions.headers instanceof Headers ? callOptions.headers.get('openai-beta') : callOptions.headers['openai-beta']).toBe('assistants=v1');
    });

    it('should handle OpenAI streaming responses', async () => {
      const streamResponse = new Response(
        new ReadableStream({
          start(controller) {
            controller.enqueue(new TextEncoder().encode('data: {"id":"chatcmpl-123","object":"chat.completion.chunk","created":1677652288,"model":"gpt-3.5-turbo","choices":[{"index":0,"delta":{"role":"assistant"},"finish_reason":null}]}\n\n'));
            controller.enqueue(new TextEncoder().encode('data: {"id":"chatcmpl-123","object":"chat.completion.chunk","created":1677652288,"model":"gpt-3.5-turbo","choices":[{"index":0,"delta":{"content":"Hello"},"finish_reason":null}]}\n\n'));
            controller.enqueue(new TextEncoder().encode('data: {"id":"chatcmpl-123","object":"chat.completion.chunk","created":1677652288,"model":"gpt-3.5-turbo","choices":[{"index":0,"delta":{},"finish_reason":"stop"}]}\n\n'));
            controller.enqueue(new TextEncoder().encode('data: [DONE]\n\n'));
            controller.close();
          }
        }),
        {
          status: 200,
          headers: { 
            'Content-Type': 'text/event-stream',
            'openai-organization': 'org-test123',
          },
        }
      );

      mockFetch.mockResolvedValueOnce(streamResponse);

      const request = new Request('https://example.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer client-key-1',
        },
        body: JSON.stringify({
          model: 'gpt-3.5-turbo',
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
      expect(response.headers.get('openai-organization')).toBe('org-test123');
    });
  });

  describe('OpenAI Error Handling', () => {
    it('should handle OpenAI API errors correctly', async () => {
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

      const request = new Request('https://example.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer client-key-1',
        },
        body: JSON.stringify({
          model: 'gpt-3.5-turbo',
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

    it('should handle OpenAI authentication errors', async () => {
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

      const request = new Request('https://example.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer client-key-1',
        },
        body: JSON.stringify({
          model: 'gpt-3.5-turbo',
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