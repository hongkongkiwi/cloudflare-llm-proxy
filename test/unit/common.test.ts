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

describe('Common Functionality Unit Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('CORS Preflight Requests', () => {
    it('should handle OPTIONS requests with proper CORS headers', async () => {
      const request = new Request('https://example.com/anthropic/v1/messages', {
        method: 'OPTIONS',
        headers: {
          'Origin': 'https://example.com',
          'Access-Control-Request-Method': 'POST',
          'Access-Control-Request-Headers': 'Content-Type,anthropic-version,X-API-Key',
        },
      });

      const response = await workerHandler.fetch(request, mockEnv, {});

      expect(response.status).toBe(200);
      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
      expect(response.headers.get('Access-Control-Allow-Methods')).toBe('GET, POST, PUT, DELETE, OPTIONS');
      expect(response.headers.get('Access-Control-Allow-Headers')).toBe('Content-Type, Authorization, X-API-Key, anthropic-version, openai-version, x-goog-api-key');
      expect(response.headers.get('Access-Control-Max-Age')).toBe('86400');
    });
  });

  describe('Authentication', () => {
    it('should reject requests without API key', async () => {
      const request = new Request('https://example.com/anthropic/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'anthropic-version': '2023-06-01',
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
      expect(data.error).toBe('API key is required');
      expect(data.message).toBe('Please provide an API key in the X-API-Key header or Authorization header');
    });

    it('should reject requests with invalid API key', async () => {
      const request = new Request('https://example.com/anthropic/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'anthropic-version': '2023-06-01',
          'X-API-Key': 'invalid-key',
        },
        body: JSON.stringify({
          model: 'claude-3-sonnet-20240229',
          max_tokens: 100,
          messages: [{ role: 'user', content: 'Hello' }],
        }),
      });

      const response = await workerHandler.fetch(request, mockEnv, {});
      const data = await response.json() as any;

      expect(response.status).toBe(403);
      expect(data.error).toBe('Unauthorized');
      expect(data.message).toBe('Invalid API key provided for this provider');
    });

    it('should accept requests with valid API key', async () => {
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
    });

    it('should accept requests with valid Authorization header', async () => {
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
          'Authorization': 'Bearer client-key-1',
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
    });
  });

  describe('IP and Location Masking', () => {
    it('should mask client IP and location headers', async () => {
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
          'X-Forwarded-For': '192.168.1.1',
          'X-Real-IP': '192.168.1.1',
          'CF-Connecting-IP': '192.168.1.1',
          'CF-IPCountry': 'HK',
          'CF-Ray': 'test-ray-id',
        },
        body: JSON.stringify({
          model: 'claude-3-sonnet-20240229',
          max_tokens: 100,
          messages: [{ role: 'user', content: 'Hello' }],
        }),
      });

      await workerHandler.fetch(request, mockEnv, {});

      // Verify that IP and location headers were masked
      expect(mockFetch).toHaveBeenCalled();
      
      // Verify the request properties
      const mockCall = mockFetch.mock.calls[0];
      const mockRequest = mockCall[0];
      const callOptions = mockCall[1];
      expect(callOptions.headers instanceof Headers ? callOptions.headers.get('x-forwarded-for') : callOptions.headers['x-forwarded-for']).toBeNull();
      expect(callOptions.headers instanceof Headers ? callOptions.headers.get('x-real-ip') : callOptions.headers['x-real-ip']).toBeNull();
      expect(callOptions.headers instanceof Headers ? callOptions.headers.get('cf-connecting-ip') : callOptions.headers['cf-connecting-ip']).toBeNull();
      expect(callOptions.headers instanceof Headers ? callOptions.headers.get('cf-ipcountry') : callOptions.headers['cf-ipcountry']).toBeNull();
      expect(callOptions.headers instanceof Headers ? callOptions.headers.get('cf-ray') : callOptions.headers['cf-ray']).toBeNull();
    });

    it('should set generic user agent if none provided', async () => {
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

      await workerHandler.fetch(request, mockEnv, {});

      // Verify that a generic user agent was set
      expect(mockFetch).toHaveBeenCalled();
      
      // Verify the request properties
      const mockCall = mockFetch.mock.calls[0];
      const mockRequest = mockCall[0];
      const callOptions = mockCall[1];
      expect(callOptions.headers instanceof Headers ? callOptions.headers.get('user-agent') : callOptions.headers['user-agent']).toBe('Claude-Proxy/1.0');
    });

    it('should preserve existing user agent', async () => {
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
          'User-Agent': 'MyApp/1.0',
        },
        body: JSON.stringify({
          model: 'claude-3-sonnet-20240229',
          max_tokens: 100,
          messages: [{ role: 'user', content: 'Hello' }],
        }),
      });

      await workerHandler.fetch(request, mockEnv, {});

      // Verify that the existing user agent was preserved
      expect(mockFetch).toHaveBeenCalled();
      
      // Verify the request properties
      const mockCall = mockFetch.mock.calls[0];
      const mockRequest = mockCall[0];
      const callOptions = mockCall[1];
      expect(callOptions.headers instanceof Headers ? callOptions.headers.get('user-agent') : callOptions.headers['user-agent']).toBe('MyApp/1.0');
    });
  });

  describe('Error Handling', () => {
    it('should handle fetch errors gracefully', async () => {
      mockFetch.mockRejectedValueOnce(new Error('Network error'));

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

      expect(response.status).toBe(500);
      expect(data.error).toBe('Internal server error');
      expect(data.message).toContain('Network error');
    });

    it('should handle unsupported routes', async () => {
      const request = new Request('https://example.com/unsupported/v1/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': 'client-key-1',
        },
        body: JSON.stringify({}),
      });

      const response = await workerHandler.fetch(request, mockEnv, {});
      const data = await response.json() as any;

      expect(response.status).toBe(400);
      expect(data.error).toBe('Unsupported API provider');
      expect(data.message).toBe('API provider \'unsupported\' is not supported. Supported providers: anthropic, openai, gemini, groq, vertexai, openrouter');
    });
  });

  describe('Request Forwarding and HTTP Methods', () => {
    it('should forward GET requests correctly', async () => {
      mockFetch.mockResolvedValueOnce(new Response(JSON.stringify({
        data: []
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

      await workerHandler.fetch(request, mockEnv, {});

      expect(mockFetch).toHaveBeenCalled();
      
      // Verify the request properties
      const mockCall = mockFetch.mock.calls[0];
      const callUrl = mockCall[0];
      const callOptions = mockCall[1];
      expect(callOptions.method).toBe('GET');
      expect(callUrl).toBe('https://api.anthropic.com/v1/models');
    });

    it('should forward POST requests correctly', async () => {
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

      await workerHandler.fetch(request, mockEnv, {});

      expect(mockFetch).toHaveBeenCalled();
      
      // Verify the request properties
      const mockCall = mockFetch.mock.calls[0];
      const callUrl = mockCall[0];
      const callOptions = mockCall[1];
      expect(callOptions.method).toBe('POST');
      expect(callUrl).toBe('https://api.anthropic.com/v1/messages');
    });
  });
}); 