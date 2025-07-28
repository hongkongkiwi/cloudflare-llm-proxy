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

describe('Multi-AI API Proxy Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Anthropic API Integration', () => {
    it('should handle Anthropic messages endpoint correctly', async () => {
      // Mock successful Anthropic API response
      mockFetch.mockResolvedValueOnce(new Response(JSON.stringify({
        id: 'msg_test123',
        type: 'message',
        role: 'assistant',
        content: [{ type: 'text', text: 'Hello! I am Claude, an AI assistant.' }],
        model: 'claude-3-sonnet-20240229',
        stop_reason: 'end_turn',
        stop_sequence: null,
        usage: {
          input_tokens: 10,
          output_tokens: 15,
        },
      }), {
        status: 200,
        headers: { 
          'Content-Type': 'application/json',
          'anthropic-organization-id': 'org-test123',
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
          max_tokens: 1024,
          messages: [
            {
              role: 'user',
              content: 'Hello, Claude!'
            }
          ]
        }),
      });

      const response = await workerHandler.fetch(request, mockEnv, {});
      const data = await response.json() as any;

      expect(response.status).toBe(200);
      expect(data.id).toBe('msg_test123');
      expect(data.role).toBe('assistant');
      expect(data.content[0].text).toContain('Hello! I am Claude');
      
      // Verify the request was forwarded correctly
      expect(mockFetch).toHaveBeenCalled();
      
      // Verify the request properties
      const mockCall = mockFetch.mock.calls[0];
      const mockRequest = mockCall[0];
      expect(mockRequest.url).toBe('https://api.anthropic.com/v1/messages');
      expect(mockRequest.method).toBe('POST');
      expect(mockRequest.headers.get('x-api-key')).toBe('client-key-1');
      expect(mockRequest.headers.get('anthropic-version')).toBe('2023-06-01');
      expect(mockRequest.headers.get('content-type')).toBe('application/json');
    });

    it('should handle Anthropic models endpoint correctly', async () => {
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
            id: 'claude-3-opus-20240229',
            name: 'claude-3-opus-20240229',
            object: 'model',
            created: 1704067200,
            updated: 1704067200,
          },
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
      const data = await response.json() as any;

      expect(response.status).toBe(200);
      expect(data.data).toHaveLength(2);
      expect(data.data[0].id).toBe('claude-3-sonnet-20240229');
    });
  });

  describe('OpenAI API Integration', () => {
    it('should handle OpenAI chat completions endpoint correctly', async () => {
      // Mock successful OpenAI API response
      mockFetch.mockResolvedValueOnce(new Response(JSON.stringify({
        id: 'chatcmpl-test123',
        object: 'chat.completion',
        created: 1704067200,
        model: 'gpt-4',
        choices: [
          {
            index: 0,
            message: {
              role: 'assistant',
              content: 'Hello! I am GPT-4, an AI assistant.',
            },
            finish_reason: 'stop',
          },
        ],
        usage: {
          prompt_tokens: 10,
          completion_tokens: 15,
          total_tokens: 25,
        },
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }));

      const request = new Request('https://example.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'openai-version': '2024-01-01',
          'X-API-Key': 'client-key-1',
        },
        body: JSON.stringify({
          model: 'gpt-4',
          max_tokens: 1024,
          messages: [
            {
              role: 'user',
              content: 'Hello, GPT!'
            }
          ]
        }),
      });

      const response = await workerHandler.fetch(request, mockEnv, {});
      const data = await response.json() as any;

      expect(response.status).toBe(200);
      expect(data.id).toBe('chatcmpl-test123');
      expect(data.choices[0].message.content).toContain('Hello! I am GPT-4');
      
      // Verify the request was forwarded correctly
      expect(mockFetch).toHaveBeenCalled();
      
      // Verify the request properties
      const mockCall = mockFetch.mock.calls[0];
      const mockRequest = mockCall[0];
      expect(mockRequest.url).toBe('https://api.openai.com/v1/chat/completions');
      expect(mockRequest.method).toBe('POST');
      expect(mockRequest.headers.get('Authorization')).toBe('Bearer client-key-1');
      expect(mockRequest.headers.get('openai-version')).toBe('2024-01-01');
      expect(mockRequest.headers.get('content-type')).toBe('application/json');
    });

    it('should handle OpenAI streaming responses correctly', async () => {
      // Mock streaming response
      const streamData = [
        'data: {"id":"chatcmpl-test123","choices":[{"delta":{"content":"Hello"},"index":0}]}\n\n',
        'data: {"id":"chatcmpl-test123","choices":[{"delta":{"content":" world"},"index":0}]}\n\n',
        'data: {"id":"chatcmpl-test123","choices":[{"delta":{"content":"!"},"index":0}]}\n\n',
        'data: [DONE]\n\n'
      ].join('');

      mockFetch.mockResolvedValueOnce(new Response(streamData, {
        status: 200,
        headers: { 
          'Content-Type': 'text/plain; charset=utf-8',
          'openai-version': '2024-01-01',
        },
      }));

      const request = new Request('https://example.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'openai-version': '2024-01-01',
          'X-API-Key': 'client-key-1',
        },
        body: JSON.stringify({
          model: 'gpt-4',
          max_tokens: 1024,
          stream: true,
          messages: [
            {
              role: 'user',
              content: 'Hello'
            }
          ]
        }),
      });

      const response = await workerHandler.fetch(request, mockEnv, {});

      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Type')).toBe('text/plain; charset=utf-8');
      
      // Verify streaming data is preserved
      const responseText = await response.text();
      expect(responseText).toContain('data: {"id":"chatcmpl-test123"');
      expect(responseText).toContain('data: [DONE]');
    });
  });

  describe('Groq API Integration', () => {
    it('should handle Groq chat completions endpoint correctly', async () => {
      // Mock successful Groq API response
      mockFetch.mockResolvedValueOnce(new Response(JSON.stringify({
        id: 'chatcmpl-test123',
        object: 'chat.completion',
        created: 1704067200,
        model: 'llama3-8b-8192',
        choices: [
          {
            index: 0,
            message: {
              role: 'assistant',
              content: 'Hello! I am Llama, a fast AI model.',
            },
            finish_reason: 'stop',
          },
        ],
        usage: {
          prompt_tokens: 10,
          completion_tokens: 15,
          total_tokens: 25,
        },
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }));

      const request = new Request('https://example.com/groq/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': 'client-key-1',
        },
        body: JSON.stringify({
          model: 'llama3-8b-8192',
          max_tokens: 1024,
          messages: [
            {
              role: 'user',
              content: 'Hello, Llama!'
            }
          ]
        }),
      });

      const response = await workerHandler.fetch(request, mockEnv, {});
      const data = await response.json() as any;

      expect(response.status).toBe(200);
      expect(data.id).toBe('chatcmpl-test123');
      expect(data.choices[0].message.content).toContain('Hello! I am Llama');
      
      // Verify the request was forwarded correctly
      expect(mockFetch).toHaveBeenCalled();
      
      // Verify the request properties
      const mockCall = mockFetch.mock.calls[0];
      const mockRequest = mockCall[0];
      expect(mockRequest.url).toBe('https://api.groq.com/v1/chat/completions');
      expect(mockRequest.method).toBe('POST');
      expect(mockRequest.headers.get('Authorization')).toBe('Bearer client-key-1');
      expect(mockRequest.headers.get('content-type')).toBe('application/json');
    });

    it('should handle Groq models endpoint correctly', async () => {
      // Mock successful models response
      mockFetch.mockResolvedValueOnce(new Response(JSON.stringify({
        data: [
          {
            id: 'llama3-8b-8192',
            object: 'model',
            created: 1704067200,
            owned_by: 'groq',
          },
          {
            id: 'llama3-70b-8192',
            object: 'model',
            created: 1704067200,
            owned_by: 'groq',
          },
        ],
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }));

      const request = new Request('https://example.com/groq/v1/models', {
        method: 'GET',
        headers: {
          'X-API-Key': 'client-key-1',
        },
      });

      const response = await workerHandler.fetch(request, mockEnv, {});
      const data = await response.json() as any;

      expect(response.status).toBe(200);
      expect(data.data).toHaveLength(2);
      expect(data.data[0].id).toBe('llama3-8b-8192');
    });
  });

  describe('Google Gemini API Integration', () => {
    it('should handle Gemini generateContent endpoint correctly', async () => {
      // Mock successful Gemini API response
      mockFetch.mockResolvedValueOnce(new Response(JSON.stringify({
        candidates: [
          {
            content: {
              parts: [
                {
                  text: 'Hello! I am Gemini, Google\'s AI model.'
                }
              ]
            },
            finishReason: 'STOP',
            index: 0,
            safetyRatings: [],
          }
        ],
        promptFeedback: {
          safetyRatings: [],
        },
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }));

      const request = new Request('https://example.com/gemini/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': 'client-key-1',
        },
        body: JSON.stringify({
          model: 'gemini-pro',
          max_tokens: 1024,
          messages: [
            {
              role: 'user',
              content: 'Hello, Gemini!'
            }
          ]
        }),
      });

      const response = await workerHandler.fetch(request, mockEnv, {});
      const data = await response.json() as any;

      expect(response.status).toBe(200);
      expect(data.candidates[0].content.parts[0].text).toContain('Hello! I am Gemini');
      
      // Verify the request was forwarded correctly with URL transformation
      expect(mockFetch).toHaveBeenCalled();
      
      // Verify the request properties
      const mockCall = mockFetch.mock.calls[0];
      const mockRequest = mockCall[0];
      expect(mockRequest.url).toBe('https://generativelanguage.googleapis.com/v1/chat/completions');
      expect(mockRequest.method).toBe('POST');
      expect(mockRequest.headers.get('x-goog-api-key')).toBe('client-key-1');
      expect(mockRequest.headers.get('content-type')).toBe('application/json');
    });
  });

  describe('Google Vertex AI API Integration', () => {
    it('should handle Vertex AI predict endpoint correctly', async () => {
      // Mock successful Vertex AI API response
      mockFetch.mockResolvedValueOnce(new Response(JSON.stringify({
        predictions: [
          {
            candidates: [
              {
                content: 'Hello! I am Vertex AI, Google\'s enterprise AI platform.'
              }
            ],
            safetyAttributes: {
              categories: [],
              blocked: false,
            },
          }
        ],
        deployedModelId: 'gemini-pro',
        model: 'gemini-pro',
        modelDisplayName: 'Gemini Pro',
        modelVersionId: '1',
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }));

      const request = new Request('https://example.com/vertexai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': 'client-key-1',
        },
        body: JSON.stringify({
          model: 'gemini-pro',
          max_tokens: 1024,
          messages: [
            {
              role: 'user',
              content: 'Hello, Vertex AI!'
            }
          ]
        }),
      });

      const response = await workerHandler.fetch(request, mockEnv, {});
      const data = await response.json() as any;

      expect(response.status).toBe(200);
      expect(data.predictions[0].candidates[0].content).toContain('Hello! I am Vertex AI');
      
      // Verify the request was forwarded correctly with URL transformation
      expect(mockFetch).toHaveBeenCalled();
      
      // Verify the request properties
      const mockCall = mockFetch.mock.calls[0];
      const mockRequest = mockCall[0];
      expect(mockRequest.url).toBe('https://us-central1-aiplatform.googleapis.com/v1/projects/completions/locations/us-central1/publishers/google/models/gemini-pro:predict');
      expect(mockRequest.method).toBe('POST');
      expect(mockRequest.headers.get('authorization')).toBe('Bearer client-key-1');
      expect(mockRequest.headers.get('content-type')).toBe('application/json');
    });
  });

  describe('Security and Privacy Features', () => {
    it('should mask all client IP and location headers', async () => {
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
          // Client IP and location headers
          'X-Forwarded-For': '192.168.1.100',
          'X-Real-IP': '192.168.1.100',
          'CF-Connecting-IP': '192.168.1.100',
          'CF-IPCountry': 'US',
          'CF-Ray': 'test-ray-123',
          'CF-Visitor': '{"scheme":"https"}',
          'X-Forwarded-Proto': 'https',
          'X-Forwarded-Host': 'example.com',
          'Via': '1.1 cloudflare',
          'X-Cluster-Client-IP': '192.168.1.100',
          'X-Original-Forwarded-For': '192.168.1.100',
          'X-Remote-Addr': '192.168.1.100',
          'X-Remote-Host': 'client.example.com',
          'X-Request-URI': '/api/test',
          'X-Scheme': 'https',
          'X-Server-Name': 'server.example.com',
          'X-Server-Port': '443',
          'X-Server-Protocol': 'HTTP/1.1',
          'X-Server-Software': 'nginx/1.18.0',
          'X-SSL-Client-Cert': 'test-cert',
          'X-SSL-Client-DN': 'test-dn',
          'X-SSL-Client-Verify': 'SUCCESS',
          'X-SSL-Cipher': 'TLS_AES_256_GCM_SHA384',
          'X-SSL-Protocol': 'TLSv1.3',
          'X-SSL-Session-ID': 'test-session',
          'X-SSL-Session-Reused': 'true',
          'X-SSL-Trusted-CA': 'test-ca',
          'X-SSL-Verify': 'SUCCESS',
          'X-SSL-Verify-Result': 'SUCCESS',
        },
        body: JSON.stringify({
          model: 'claude-3-sonnet-20240229',
          max_tokens: 100,
          messages: [{ role: 'user', content: 'Hello' }],
        }),
      });

      await workerHandler.fetch(request, mockEnv, {});

      // Verify that all client IP and location headers are masked
      const forwardedRequest = mockFetch.mock.calls[0][0];
      const maskedHeaders = [
        'X-Forwarded-For', 'X-Real-IP', 'CF-Connecting-IP', 'CF-IPCountry',
        'CF-Ray', 'CF-Visitor', 'X-Forwarded-Proto', 'X-Forwarded-Host',
        'Via', 'X-Cluster-Client-IP', 'X-Original-Forwarded-For',
        'X-Remote-Addr', 'X-Remote-Host', 'X-Request-URI', 'X-Scheme',
        'X-Server-Name', 'X-Server-Port', 'X-Server-Protocol', 'X-Server-Software',
        'X-SSL-Client-Cert', 'X-SSL-Client-DN', 'X-SSL-Client-Verify',
        'X-SSL-Cipher', 'X-SSL-Protocol', 'X-SSL-Session-ID', 'X-SSL-Session-Reused',
        'X-SSL-Trusted-CA', 'X-SSL-Verify', 'X-SSL-Verify-Result'
      ];

      maskedHeaders.forEach(header => {
        expect(forwardedRequest.headers.get(header)).toBeNull();
      });

      // Verify that essential headers are preserved
      expect(forwardedRequest.headers.get('Content-Type')).toBe('application/json');
      expect(forwardedRequest.headers.get('x-api-key')).toBe('client-key-1');
    });

    it('should set generic user agent when none provided', async () => {
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
          // No User-Agent header
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
          'User-Agent': 'Custom-Client/2.0',
        },
        body: JSON.stringify({
          model: 'claude-3-sonnet-20240229',
          max_tokens: 100,
          messages: [{ role: 'user', content: 'Hello' }],
        }),
      });

      await workerHandler.fetch(request, mockEnv, {});

      const forwardedRequest = mockFetch.mock.calls[0][0];
      expect(forwardedRequest.headers.get('User-Agent')).toBe('Custom-Client/2.0');
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle API rate limiting errors', async () => {
      // Mock rate limit error
      mockFetch.mockResolvedValueOnce(new Response(JSON.stringify({
        error: {
          type: 'rate_limit_error',
          message: 'Rate limit exceeded',
          code: 'rate_limit_exceeded',
        },
      }), {
        status: 429,
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
      const data = await response.json() as any;

      expect(response.status).toBe(429);
      expect(data.error.type).toBe('rate_limit_error');
    });

    it('should handle API authentication errors', async () => {
      // Mock authentication error
      mockFetch.mockResolvedValueOnce(new Response(JSON.stringify({
        error: {
          type: 'authentication_error',
          message: 'Invalid API key',
          code: 'invalid_api_key',
        },
      }), {
        status: 401,
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
      const data = await response.json() as any;

      expect(response.status).toBe(401);
      expect(data.error.type).toBe('authentication_error');
    });

    it('should handle large request bodies', async () => {
      // Create a large request body
      const largeMessage = 'A'.repeat(10000);
      
      // Mock successful API response
      mockFetch.mockResolvedValueOnce(new Response(JSON.stringify({
        id: 'test123',
        content: 'Response to large request',
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
          messages: [{ role: 'user', content: largeMessage }],
        }),
      });

      const response = await workerHandler.fetch(request, mockEnv, {});

      expect(response.status).toBe(200);
      
      // Verify the large body was forwarded correctly
      const forwardedRequest = mockFetch.mock.calls[0][0];
      const forwardedBody = await forwardedRequest.text();
      expect(forwardedBody).toContain(largeMessage);
    });
  });
}); 