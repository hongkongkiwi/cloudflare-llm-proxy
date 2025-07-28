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

describe('Multi-AI API Proxy Unit Tests', () => {
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

      expect(response.status).toBe(200);
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
          'CF-IPCountry': 'US',
          'CF-Ray': 'test-ray-id',
          'User-Agent': 'Mozilla/5.0 (Test Browser)',
        },
        body: JSON.stringify({
          model: 'claude-3-sonnet-20240229',
          max_tokens: 100,
          messages: [{ role: 'user', content: 'Hello' }],
        }),
      });

      await workerHandler.fetch(request, mockEnv, {});

      // Verify that the forwarded request doesn't contain client IP headers
      const forwardedRequest = mockFetch.mock.calls[0][0];
      expect(forwardedRequest.headers.get('X-Forwarded-For')).toBeNull();
      expect(forwardedRequest.headers.get('X-Real-IP')).toBeNull();
      expect(forwardedRequest.headers.get('CF-Connecting-IP')).toBeNull();
      expect(forwardedRequest.headers.get('CF-IPCountry')).toBeNull();
      expect(forwardedRequest.headers.get('CF-Ray')).toBeNull();
      
      // Verify that content-type and other relevant headers are preserved
      expect(forwardedRequest.headers.get('Content-Type')).toBe('application/json');
      expect(forwardedRequest.headers.get('anthropic-version')).toBe('2023-06-01');
      expect(forwardedRequest.headers.get('x-api-key')).toBe('client-key-1');
    });

    it('should set generic user agent when none provided', async () => {
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

      const forwardedRequest = mockFetch.mock.calls[0][0];
      expect(forwardedRequest.headers.get('User-Agent')).toBe('Claude-Proxy/1.0');
    });

    it('should preserve existing user agent when provided', async () => {
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
          'User-Agent': 'Custom-Client/1.0',
        },
        body: JSON.stringify({
          model: 'claude-3-sonnet-20240229',
          max_tokens: 100,
          messages: [{ role: 'user', content: 'Hello' }],
        }),
      });

      await workerHandler.fetch(request, mockEnv, {});

      const forwardedRequest = mockFetch.mock.calls[0][0];
      expect(forwardedRequest.headers.get('User-Agent')).toBe('Custom-Client/1.0');
    });
  });

  describe('Server Configuration', () => {
    it('should reject requests when client key is not in whitelist', async () => {
      const envWithRestrictedKeys = {
        ALLOWED_ANTHROPIC_KEYS: 'allowed-key-1,allowed-key-2',
        ALLOWED_OPENAI_KEYS: 'client-key-1,client-key-2,client-key-3',
        ALLOWED_GOOGLE_KEYS: 'client-key-1,client-key-2,client-key-3',
        ALLOWED_GROQ_KEYS: 'client-key-1,client-key-2,client-key-3',
        ALLOWED_OPENROUTER_KEYS: 'client-key-1,client-key-2,client-key-3',
      };

      const request = new Request('https://example.com/anthropic/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'anthropic-version': '2023-06-01',
          'X-API-Key': 'unauthorized-key',
        },
        body: JSON.stringify({
          model: 'claude-3-sonnet-20240229',
          max_tokens: 100,
          messages: [{ role: 'user', content: 'Hello' }],
        }),
      });

      const response = await workerHandler.fetch(request, envWithRestrictedKeys, {});
      const data = await response.json() as any;

      expect(response.status).toBe(403);
      expect(data.error).toBe('Unauthorized');
      expect(data.message).toBe('Invalid API key provided for this provider');
    });

    it('should allow requests when no whitelist is configured (allow all)', async () => {
      const envWithoutWhitelist = {
        ALLOWED_ANTHROPIC_KEYS: '',
        ALLOWED_OPENAI_KEYS: 'client-key-1,client-key-2,client-key-3',
        ALLOWED_GOOGLE_KEYS: 'client-key-1,client-key-2,client-key-3',
        ALLOWED_GROQ_KEYS: 'client-key-1,client-key-2,client-key-3',
        ALLOWED_OPENROUTER_KEYS: 'client-key-1,client-key-2,client-key-3',
      };

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
          'X-API-Key': 'any-key',
        },
        body: JSON.stringify({
          model: 'claude-3-sonnet-20240229',
          max_tokens: 100,
          messages: [{ role: 'user', content: 'Hello' }],
        }),
      });

      const response = await workerHandler.fetch(request, envWithoutWhitelist, {});

      expect(response.status).toBe(200);
    });
  });

  describe('Request Forwarding', () => {
    it('should forward requests with query parameters', async () => {
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

      const request = new Request('https://example.com/anthropic/v1/messages?param=value&test=123', {
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
      const mockRequest = mockCall[0];
      expect(mockRequest.url).toBe('https://api.anthropic.com/v1/messages?param=value&test=123');
      expect(mockRequest.method).toBe('POST');
    });

    it('should set default version when not provided', async () => {
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
      const mockRequest = mockCall[0];
      expect(mockRequest.headers.get('anthropic-version')).toBe('2023-06-01');
    });

    it('should forward response with CORS headers', async () => {
      // Mock successful API response
      mockFetch.mockResolvedValueOnce(new Response(JSON.stringify({
        id: 'msg_test',
        type: 'message',
        role: 'assistant',
        content: [{ type: 'text', text: 'Hello!' }],
      }), {
        status: 200,
        headers: { 
          'Content-Type': 'application/json',
          'x-anthropic-version': '2023-06-01',
        },
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

      expect(response.status).toBe(200);
      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
      expect(response.headers.get('Access-Control-Allow-Methods')).toBe('GET, POST, PUT, DELETE, OPTIONS');
      expect(response.headers.get('Access-Control-Allow-Headers')).toBe('Content-Type, Authorization, X-API-Key, anthropic-version, openai-version, x-goog-api-key');
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
      expect(data.message).toBe('Network error');
    });

    it('should preserve API error responses', async () => {
      // Mock API error response
      mockFetch.mockResolvedValueOnce(new Response(JSON.stringify({
        error: {
          type: 'invalid_request_error',
          message: 'Invalid model',
        },
      }), {
        status: 400,
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
          model: 'invalid-model',
          max_tokens: 100,
          messages: [{ role: 'user', content: 'Hello' }],
        }),
      });

      const response = await workerHandler.fetch(request, mockEnv, {});
      const data = await response.json() as any;

      expect(response.status).toBe(400);
      expect(data.error.type).toBe('invalid_request_error');
      expect(data.error.message).toBe('Invalid model');
    });
  });

  describe('Different HTTP Methods', () => {
    it('should handle GET requests', async () => {
      // Mock successful API response
      mockFetch.mockResolvedValueOnce(new Response(JSON.stringify({
        data: [
          { id: 'claude-3-sonnet-20240229', object: 'model' },
        ],
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }));

      const request = new Request('https://example.com/anthropic/v1/models', {
        method: 'GET',
        headers: {
          'anthropic-version': '2023-06-01',
          'X-API-Key': 'client-key-1',
        },
      });

      const response = await workerHandler.fetch(request, mockEnv, {});

      expect(response.status).toBe(200);
      expect(mockFetch).toHaveBeenCalled();
      
      // Verify the request properties
      const mockCall = mockFetch.mock.calls[0];
      const mockRequest = mockCall[0];
      expect(mockRequest.url).toBe('https://api.anthropic.com/v1/models');
      expect(mockRequest.method).toBe('GET');
    });

    it('should handle HEAD requests', async () => {
      // Mock successful API response
      mockFetch.mockResolvedValueOnce(new Response(null, {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }));

      const request = new Request('https://example.com/anthropic/v1/models', {
        method: 'HEAD',
        headers: {
          'anthropic-version': '2023-06-01',
          'X-API-Key': 'client-key-1',
        },
      });

      const response = await workerHandler.fetch(request, mockEnv, {});

      expect(response.status).toBe(200);
      expect(mockFetch).toHaveBeenCalled();
      
      // Verify the request properties
      const mockCall = mockFetch.mock.calls[0];
      const mockRequest = mockCall[0];
      expect(mockRequest.url).toBe('https://api.anthropic.com/v1/models');
      expect(mockRequest.method).toBe('HEAD');
    });
  });

  describe('Proxy Configuration', () => {
    it('should use proxy when PROXY_URL is set', async () => {
      console.log('Starting proxy test');
      console.log('Test environment:', process.env.NODE_ENV);
      
      // First, let's test if the proxy functionality exists
      expect(workerHandler.fetchWithProxy).toBeDefined();
      console.log('fetchWithProxy method exists');
      
      const mockEnv = {
        ALLOWED_ANTHROPIC_KEYS: 'client-key-1',
        ALLOWED_OPENAI_KEYS: 'client-key-1',
        ALLOWED_GOOGLE_KEYS: 'client-key-1',
        ALLOWED_GROQ_KEYS: 'client-key-1',
        ALLOWED_OPENROUTER_KEYS: 'client-key-1',
        PROXY_URL: 'https://proxy.example.com:8080',
      };

      // Mock successful API response
      mockFetch.mockResolvedValueOnce(new Response(JSON.stringify({
        id: 'test123',
        content: 'Response',
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }));

      const request = new Request('https://example.com/anthropic/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': 'client-key-1',
        },
        body: JSON.stringify({
          model: 'claude-3-sonnet-20240229',
          max_tokens: 100,
          messages: [{ role: 'user', content: 'Hello' }],
        }),
      });

      const response = await workerHandler.fetch(request, mockEnv, {});

      // Debug: Check if the request was processed successfully
      console.log('Response status:', response.status);
      if (response.status !== 200) {
        const responseText = await response.text();
        console.error('Request failed:', response.status, responseText);
      } else {
        console.log('Request succeeded');
      }

      // Debug: Check if mockFetch was called
      console.log('mockFetch called times:', mockFetch.mock.calls.length);
      if (mockFetch.mock.calls.length > 0) {
        console.log('First mockFetch call:', mockFetch.mock.calls[0]);
      }

      // Verify that the request was forwarded through the proxy
      expect(mockFetch).toHaveBeenCalled();
      
      const mockCall = mockFetch.mock.calls[0];
      const mockRequest = mockCall[0];
      
      // Verify the proxy request properties
      expect(mockRequest.url).toBe('https://proxy.example.com:8080');
      expect(mockRequest.method).toBe('POST');
      expect(mockRequest.headers.get('X-Target-URL')).toBe('https://api.anthropic.com/v1/messages');
      expect(mockRequest.headers.get('Content-Type')).toBe('application/json');
      expect(mockRequest.headers.get('X-API-Key')).toBe('client-key-1');
    });

    it('should not use proxy when PROXY_URL is not set', async () => {
      const mockEnv = {
        ALLOWED_ANTHROPIC_KEYS: 'client-key-1',
        ALLOWED_OPENAI_KEYS: 'client-key-1',
        ALLOWED_GOOGLE_KEYS: 'client-key-1',
        ALLOWED_GROQ_KEYS: 'client-key-1',
        ALLOWED_OPENROUTER_KEYS: 'client-key-1',
        // PROXY_URL is not set
      };

      // Mock successful API response
      mockFetch.mockResolvedValueOnce(new Response(JSON.stringify({
        id: 'test123',
        content: 'Response',
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }));

      const request = new Request('https://example.com/anthropic/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': 'client-key-1',
        },
        body: JSON.stringify({
          model: 'claude-3-sonnet-20240229',
          max_tokens: 100,
          messages: [{ role: 'user', content: 'Hello' }],
        }),
      });

      await workerHandler.fetch(request, mockEnv, {});

      // Verify that the request was forwarded directly (not through proxy)
      expect(mockFetch).toHaveBeenCalled();
      
      const mockCall = mockFetch.mock.calls[0];
      const mockRequest = mockCall[0];
      
      // Verify the direct request properties
      expect(mockRequest.url).toBe('https://api.anthropic.com/v1/messages');
      expect(mockRequest.method).toBe('POST');
      expect(mockRequest.headers.get('X-Target-URL')).toBeNull(); // No proxy header
      expect(mockRequest.headers.get('Content-Type')).toBe('application/json');
      expect(mockRequest.headers.get('X-API-Key')).toBe('client-key-1');
    });
  });
}); 