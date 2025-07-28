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

describe('Anthropic API Unit Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Anthropic Endpoint Routing', () => {
    it('should route Anthropic messages endpoint correctly', async () => {
      // Mock successful API response
      mockFetch.mockResolvedValueOnce(new Response(JSON.stringify({
        id: 'msg_test',
        type: 'message',
        role: 'assistant',
        content: [{ type: 'text', text: 'Hello!' }],
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }));

      const request = new Request('https://example.com/anthropic/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'anthropic-version': '2023-06-01',
          'X-API-Key': 'client-key-1',
        },
        body: JSON.stringify({
          model: 'claude-3-sonnet-20240229',
          max_tokens: 100,
          messages: [{ role: 'user', content: 'Hello' }],
        }),
      });

      const response = await workerHandler.fetch(request, mockEnv, {});
      const data = await response.json() as any;

      expect(response.status).toBe(200);
      expect(data.id).toBe('msg_test');
      expect(data.role).toBe('assistant');
      expect(data.content[0].text).toBe('Hello!');

      // Verify the request was forwarded to Anthropic
      expect(mockFetch).toHaveBeenCalled();
      
      // Verify the request properties
      const mockCall = mockFetch.mock.calls[0];
      const callUrl = mockCall[0];
      const callOptions = mockCall[1];
      expect(callUrl).toBe('https://api.anthropic.com/v1/messages');
      expect(callOptions.method).toBe('POST');
      expect(callOptions.headers instanceof Headers ? callOptions.headers.get('x-api-key') : callOptions.headers['x-api-key']).toBe('client-key-1');
    });

    it('should route Anthropic models endpoint correctly', async () => {
      // Mock successful models response
      mockFetch.mockResolvedValueOnce(new Response(JSON.stringify({
        data: [
          {
            id: 'claude-3-sonnet-20240229',
            name: 'claude-3-sonnet-20240229',
            object: 'model',
            created: 1704067200,
            updated: 1704067200,
          },
          {
            id: 'claude-3-haiku-20240307',
            name: 'claude-3-haiku-20240307',
            object: 'model',
            created: 1704067200,
            updated: 1704067200,
          }
        ]
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }));

      const request = new Request('https://example.com/anthropic/v1/models', {
        method: 'GET',
        headers: {
          'X-API-Key': 'client-key-1',
        },
      });

      const response = await workerHandler.fetch(request, mockEnv, {});
      const data = await response.json() as any;

      expect(response.status).toBe(200);
      expect(data.data).toHaveLength(2);
      expect(data.data[0].id).toBe('claude-3-sonnet-20240229');
      expect(data.data[1].id).toBe('claude-3-haiku-20240307');

      // Verify the request was forwarded to Anthropic
      expect(mockFetch).toHaveBeenCalled();
      
      // Verify the request properties
      const mockCall = mockFetch.mock.calls[0];
      const callUrl = mockCall[0];
      const callOptions = mockCall[1];
      expect(callUrl).toBe('https://api.anthropic.com/v1/models');
      expect(callOptions.method).toBe('GET');
      expect(callOptions.headers instanceof Headers ? callOptions.headers.get('x-api-key') : callOptions.headers['x-api-key']).toBe('client-key-1');
    });
  });

  describe('Anthropic Request Transformation', () => {
    it('should preserve Anthropic-specific headers', async () => {
      mockFetch.mockResolvedValueOnce(new Response(JSON.stringify({
        id: 'msg_test',
        type: 'message',
        role: 'assistant',
        content: [{ type: 'text', text: 'Hello!' }],
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }));

      const request = new Request('https://example.com/anthropic/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'anthropic-version': '2023-06-01',
          'anthropic-beta': 'tools-2024-04-04',
          'X-API-Key': 'client-key-1',
        },
        body: JSON.stringify({
          model: 'claude-3-sonnet-20240229',
          max_tokens: 100,
          messages: [{ role: 'user', content: 'Hello' }],
        }),
      });

      await workerHandler.fetch(request, mockEnv, {});

      // Verify Anthropic-specific headers are preserved
      expect(mockFetch).toHaveBeenCalled();
      
      // Verify the request properties
      const mockCall = mockFetch.mock.calls[0];
      const mockRequest = mockCall[0];
      const callOptions = mockCall[1];
      expect(callOptions.headers instanceof Headers ? callOptions.headers.get('anthropic-version') : callOptions.headers['anthropic-version']).toBe('2023-06-01');
      expect(callOptions.headers instanceof Headers ? callOptions.headers.get('anthropic-beta') : callOptions.headers['anthropic-beta']).toBe('tools-2024-04-04');
    });

    it('should handle Anthropic streaming responses', async () => {
      const streamResponse = new Response(
        new ReadableStream({
          start(controller) {
            controller.enqueue(new TextEncoder().encode('data: {"type": "message_start"}\n\n'));
            controller.enqueue(new TextEncoder().encode('data: {"type": "content_block_start"}\n\n'));
            controller.enqueue(new TextEncoder().encode('data: {"type": "content_block_delta", "delta": {"type": "text", "text": "Hello"}}\n\n'));
            controller.enqueue(new TextEncoder().encode('data: {"type": "content_block_stop"}\n\n'));
            controller.enqueue(new TextEncoder().encode('data: {"type": "message_stop"}\n\n'));
            controller.close();
          }
        }),
        {
          status: 200,
          headers: { 
            'Content-Type': 'text/plain; charset=utf-8',
            'anthropic-organization-id': 'org-test123',
          },
        }
      );

      mockFetch.mockResolvedValueOnce(streamResponse);

      const request = new Request('https://example.com/anthropic/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'anthropic-version': '2023-06-01',
          'X-API-Key': 'client-key-1',
        },
        body: JSON.stringify({
          model: 'claude-3-sonnet-20240229',
          max_tokens: 100,
          messages: [{ role: 'user', content: 'Hello' }],
          stream: true,
        }),
      });

      const response = await workerHandler.fetch(request, mockEnv, {});

      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Type')).toBe('text/plain; charset=utf-8');
      expect(response.headers.get('anthropic-organization-id')).toBe('org-test123');
    });
  });

  describe('Anthropic Error Handling', () => {
    it('should handle Anthropic API errors correctly', async () => {
      mockFetch.mockResolvedValueOnce(new Response(JSON.stringify({
        error: {
          type: 'rate_limit_error',
          message: 'Rate limit exceeded',
        }
      }), {
        status: 429,
        headers: { 'Content-Type': 'application/json' },
      }));

      const request = new Request('https://example.com/anthropic/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'anthropic-version': '2023-06-01',
          'X-API-Key': 'client-key-1',
        },
        body: JSON.stringify({
          model: 'claude-3-sonnet-20240229',
          max_tokens: 100,
          messages: [{ role: 'user', content: 'Hello' }],
        }),
      });

      const response = await workerHandler.fetch(request, mockEnv, {});
      const data = await response.json() as any;

      expect(response.status).toBe(429);
      expect(data.error.type).toBe('rate_limit_error');
      expect(data.error.message).toBe('Rate limit exceeded');
    });

    it('should handle Anthropic authentication errors', async () => {
      mockFetch.mockResolvedValueOnce(new Response(JSON.stringify({
        error: {
          type: 'authentication_error',
          message: 'Invalid API key',
        }
      }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      }));

      const request = new Request('https://example.com/anthropic/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'anthropic-version': '2023-06-01',
          'X-API-Key': 'client-key-1',
        },
        body: JSON.stringify({
          model: 'claude-3-sonnet-20240229',
          max_tokens: 100,
          messages: [{ role: 'user', content: 'Hello' }],
        }),
      });

      const response = await workerHandler.fetch(request, mockEnv, {});
      const data = await response.json() as any;

      expect(response.status).toBe(401);
      expect(data.error.type).toBe('authentication_error');
      expect(data.error.message).toBe('Invalid API key');
    });
  });
}); 