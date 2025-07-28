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

describe('Google Gemini API Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Gemini GenerateContent Endpoint', () => {
    it('should handle Gemini generateContent endpoint correctly', async () => {
      // Mock successful Gemini API response
      mockFetch.mockResolvedValueOnce(new Response(JSON.stringify({
        candidates: [
          {
            content: {
              parts: [
                {
                  text: 'Hello! How can I help you today?'
                }
              ]
            },
            finishReason: 'STOP',
            index: 0,
            safetyRatings: []
          }
        ],
        promptFeedback: {
          safetyRatings: []
        }
      }), {
        status: 200,
        headers: { 
          'Content-Type': 'application/json',
          'x-goog-user-project': 'my-project-123',
        },
      }));

      const request = new Request('https://example.com/gemini/v1/generateContent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': 'client-key-1',
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: 'Hello'
                }
              ]
            }
          ],
          generationConfig: {
            maxOutputTokens: 100
          }
        }),
      });

      const response = await workerHandler.fetch(request, mockEnv, {});
      const data = await response.json() as any;

      expect(response.status).toBe(200);
      expect(data.candidates).toHaveLength(1);
      expect(data.candidates[0].content.parts[0].text).toBe('Hello! How can I help you today?');
      expect(data.candidates[0].finishReason).toBe('STOP');
      
      // Verify the request was forwarded correctly
      expect(mockFetch).toHaveBeenCalled();
      
      // Verify the request properties
      const mockCall = mockFetch.mock.calls[0];
      const callUrl = mockCall[0];
      const callOptions = mockCall[1];
      expect(callUrl).toBe('https://generativelanguage.googleapis.com/v1/generateContent');
      expect(callOptions.method).toBe('POST');
      expect(callOptions.headers instanceof Headers ? callOptions.headers.get('x-goog-api-key') : callOptions.headers['x-goog-api-key']).toBe('client-key-1');
      expect(callOptions.headers instanceof Headers ? callOptions.headers.get('content-type') : callOptions.headers['content-type']).toBe('application/json');
    });

    it('should handle Gemini models endpoint correctly', async () => {
      // Mock successful models response
      mockFetch.mockResolvedValueOnce(new Response(JSON.stringify({
        models: [
          {
            name: 'models/gemini-pro',
            version: '001',
            displayName: 'Gemini Pro',
            description: 'The best model for scaling across a wide range of tasks',
            inputTokenLimit: 30720,
            outputTokenLimit: 2048,
            supportedGenerationMethods: ['generateContent']
          },
          {
            name: 'models/gemini-pro-vision',
            version: '001',
            displayName: 'Gemini Pro Vision',
            description: 'The best model for image understanding and generation',
            inputTokenLimit: 30720,
            outputTokenLimit: 2048,
            supportedGenerationMethods: ['generateContent']
          }
        ]
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }));

      const request = new Request('https://example.com/gemini/v1/models', {
        method: 'GET',
        headers: {
          'X-API-Key': 'client-key-1',
        },
      });

      const response = await workerHandler.fetch(request, mockEnv, {});
      const data = await response.json() as any;

      expect(response.status).toBe(200);
      expect(data.models).toHaveLength(2);
      expect(data.models[0].name).toBe('models/gemini-pro');
      expect(data.models[1].name).toBe('models/gemini-pro-vision');

      // Verify the request was forwarded correctly
      expect(mockFetch).toHaveBeenCalled();
      
      // Verify the request properties
      const mockCall = mockFetch.mock.calls[0];
      const callUrl = mockCall[0];
      const callOptions = mockCall[1];
      expect(callUrl).toBe('https://generativelanguage.googleapis.com/v1/models');
      expect(callOptions.method).toBe('GET');
      expect(callOptions.headers instanceof Headers ? callOptions.headers.get('x-goog-api-key') : callOptions.headers['x-goog-api-key']).toBe('client-key-1');
    });

    it('should handle Gemini streaming responses', async () => {
      const streamResponse = new Response(
        new ReadableStream({
          start(controller) {
            controller.enqueue(new TextEncoder().encode('{"candidates":[{"content":{"parts":[{"text":"Hello"}],"role":"model"},"finishReason":null,"index":0,"safetyRatings":[]}]}\n'));
            controller.enqueue(new TextEncoder().encode('{"candidates":[{"content":{"parts":[{"text":"! How can I help you today?"}],"role":"model"},"finishReason":"STOP","index":0,"safetyRatings":[]}]}\n'));
            controller.close();
          }
        }),
        {
          status: 200,
          headers: { 
            'Content-Type': 'application/json',
            'x-goog-user-project': 'my-project-123',
          },
        }
      );

      mockFetch.mockResolvedValueOnce(streamResponse);

      const request = new Request('https://example.com/gemini/v1/generateContent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': 'client-key-1',
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: 'Hello'
                }
              ]
            }
          ],
          stream: true,
        }),
      });

      const response = await workerHandler.fetch(request, mockEnv, {});

      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Type')).toBe('application/json');
      expect(response.headers.get('x-goog-user-project')).toBe('my-project-123');
    });
  });

  describe('Gemini Error Handling', () => {
    it('should handle Gemini rate limiting', async () => {
      mockFetch.mockResolvedValueOnce(new Response(JSON.stringify({
        error: {
          code: 429,
          message: 'Quota exceeded for quota group',
          status: 'RESOURCE_EXHAUSTED',
          details: []
        }
      }), {
        status: 429,
        headers: { 'Content-Type': 'application/json' },
      }));

      const request = new Request('https://example.com/gemini/v1/generateContent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': 'client-key-1',
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: 'Hello'
                }
              ]
            }
          ],
          generationConfig: {
            maxOutputTokens: 100
          }
        }),
      });

      const response = await workerHandler.fetch(request, mockEnv, {});
      const data = await response.json() as any;

      expect(response.status).toBe(429);
      expect(data.error.message).toBe('Quota exceeded for quota group');
      expect(data.error.status).toBe('RESOURCE_EXHAUSTED');
    });

    it('should handle Gemini authentication errors', async () => {
      mockFetch.mockResolvedValueOnce(new Response(JSON.stringify({
        error: {
          code: 401,
          message: 'API key not valid',
          status: 'UNAUTHENTICATED',
          details: []
        }
      }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      }));

      const request = new Request('https://example.com/gemini/v1/generateContent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': 'client-key-1',
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: 'Hello'
                }
              ]
            }
          ],
          generationConfig: {
            maxOutputTokens: 100
          }
        }),
      });

      const response = await workerHandler.fetch(request, mockEnv, {});
      const data = await response.json() as any;

      expect(response.status).toBe(401);
      expect(data.error.message).toBe('API key not valid');
      expect(data.error.status).toBe('UNAUTHENTICATED');
    });
  });

  describe('Gemini Request Validation', () => {
    it('should handle large request bodies', async () => {
      const largeContent = 'A'.repeat(100000); // 100KB content
      
      mockFetch.mockResolvedValueOnce(new Response(JSON.stringify({
        candidates: [
          {
            content: {
              parts: [
                {
                  text: 'I received your large message.'
                }
              ]
            },
            finishReason: 'STOP',
            index: 0,
            safetyRatings: []
          }
        ],
        promptFeedback: {
          safetyRatings: []
        }
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }));

      const request = new Request('https://example.com/gemini/v1/generateContent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': 'client-key-1',
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: largeContent
                }
              ]
            }
          ],
          generationConfig: {
            maxOutputTokens: 100
          }
        }),
      });

      const response = await workerHandler.fetch(request, mockEnv, {});
      const data = await response.json() as any;

      expect(response.status).toBe(200);
      expect(data.candidates[0].content.parts[0].text).toBe('I received your large message.');
    });
  });
}); 

describe('Claude-Gemini Translation Endpoint', () => {
  it('should translate Claude-style request to Gemini and return Claude-style response', async () => {
    // Mock Gemini API response
    mockFetch.mockResolvedValueOnce(new Response(JSON.stringify({
      candidates: [
        {
          content: {
            parts: [{ text: 'Hello from Gemini!' }],
            role: 'model',
          },
        },
      ],
      usage: { promptTokens: 10, candidatesTokens: 10, totalTokens: 20 },
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }));

    const request = new Request('https://example.com/claude-gemini/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': 'client-key-1',
      },
      body: JSON.stringify({
        model: 'claude-3-sonnet-20240229',
        messages: [
          { role: 'user', content: 'Hello, Gemini!' }
        ],
        max_tokens: 100
      }),
    });

    const response = await workerHandler.fetch(request, mockEnv, {});
    const data = await response.json() as any;

    expect(response.status).toBe(200);
    expect(data).toHaveProperty('id');
    expect(data.type).toBe('message');
    expect(data.role).toBe('assistant');
    expect(data.content[0].text).toBe('Hello from Gemini!');
    expect(data.model).toBe('gemini-2.5-pro'); // Model mapping for sonnet
    expect(data.usage).toBeDefined();
  });
}); 