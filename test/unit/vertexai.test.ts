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

describe('Google Vertex AI API Unit Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Vertex AI Endpoint Routing', () => {
    it('should route Vertex AI predict endpoint correctly', async () => {
      // Mock successful API response
      mockFetch.mockResolvedValueOnce(new Response(JSON.stringify({
        predictions: [
          {
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
            ]
          }
        ],
        deployedModelId: 'projects/123456789/locations/us-central1/models/gemini-pro',
        model: 'projects/123456789/locations/us-central1/models/gemini-pro',
        modelDisplayName: 'Gemini Pro',
        modelVersionId: '001'
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }));

      const request = new Request('https://example.com/vertexai/v1/predict', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': 'client-key-1',
        },
        body: JSON.stringify({
          instances: [
            {
              content: 'Hello'
            }
          ],
          parameters: {
            maxOutputTokens: 100,
            temperature: 0.7
          }
        }),
      });

      const response = await workerHandler.fetch(request, mockEnv, {});
      const data = await response.json() as any;

      expect(response.status).toBe(200);
      expect(data.predictions).toHaveLength(1);
      expect(data.predictions[0].candidates[0].content.parts[0].text).toBe('Hello! How can I help you today?');
      expect(data.predictions[0].candidates[0].finishReason).toBe('STOP');

      // Verify the request was forwarded to Vertex AI
      expect(mockFetch).toHaveBeenCalled();
      
      // Verify the request properties
      const mockCall = mockFetch.mock.calls[0];
      const callUrl = mockCall[0];
      const callOptions = mockCall[1];
      expect(callUrl).toBe('https://us-central1-aiplatform.googleapis.com/v1/projects/123456789/locations/us-central1/publishers/google/models/gemini-pro:predict');
      expect(callOptions.method).toBe('POST');
      expect(callOptions.headers instanceof Headers ? callOptions.headers.get('authorization') : callOptions.headers['authorization']).toBe('Bearer client-key-1');
    });

    it('should route Vertex AI models endpoint correctly', async () => {
      // Mock successful models response
      mockFetch.mockResolvedValueOnce(new Response(JSON.stringify({
        models: [
          {
            name: 'projects/123456789/locations/us-central1/models/gemini-pro',
            versionId: '001',
            displayName: 'Gemini Pro',
            description: 'The best model for scaling across a wide range of tasks',
            supportedGenerationMethods: ['generateContent'],
            supportedInputFormats: ['TEXT'],
            supportedOutputFormats: ['TEXT']
          },
          {
            name: 'projects/123456789/locations/us-central1/models/gemini-pro-vision',
            versionId: '001',
            displayName: 'Gemini Pro Vision',
            description: 'The best model for image understanding and generation',
            supportedGenerationMethods: ['generateContent'],
            supportedInputFormats: ['TEXT', 'IMAGE'],
            supportedOutputFormats: ['TEXT']
          }
        ]
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }));

      const request = new Request('https://example.com/vertexai/v1/models', {
        method: 'GET',
        headers: {
          'X-API-Key': 'client-key-1',
        },
      });

      const response = await workerHandler.fetch(request, mockEnv, {});
      const data = await response.json() as any;

      expect(response.status).toBe(200);
      expect(data.models).toHaveLength(2);
      expect(data.models[0].name).toBe('projects/123456789/locations/us-central1/models/gemini-pro');
      expect(data.models[1].name).toBe('projects/123456789/locations/us-central1/models/gemini-pro-vision');

      // Verify the request was forwarded to Vertex AI
      expect(mockFetch).toHaveBeenCalled();
      
      // Verify the request properties
      const mockCall = mockFetch.mock.calls[0];
      const callUrl = mockCall[0];
      const callOptions = mockCall[1];
      expect(callUrl).toBe('https://us-central1-aiplatform.googleapis.com/v1/projects/123456789/locations/us-central1/models');
      expect(callOptions.method).toBe('GET');
      expect(callOptions.headers instanceof Headers ? callOptions.headers.get('authorization') : callOptions.headers['authorization']).toBe('Bearer client-key-1');
    });
  });

  describe('Vertex AI Request Transformation', () => {
    it('should preserve Vertex AI-specific headers', async () => {
      mockFetch.mockResolvedValueOnce(new Response(JSON.stringify({
        predictions: [
          {
            candidates: [
              {
                content: {
                  parts: [
                    {
                      text: 'Hello!'
                    }
                  ]
                },
                finishReason: 'STOP',
                index: 0,
                safetyRatings: []
              }
            ]
          }
        ],
        deployedModelId: 'projects/123456789/locations/us-central1/models/gemini-pro',
        model: 'projects/123456789/locations/us-central1/models/gemini-pro',
        modelDisplayName: 'Gemini Pro',
        modelVersionId: '001'
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }));

      const request = new Request('https://example.com/vertexai/v1/predict', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Goog-User-Project': 'my-project-123',
          'X-API-Key': 'client-key-1',
        },
        body: JSON.stringify({
          instances: [
            {
              content: 'Hello'
            }
          ],
          parameters: {
            maxOutputTokens: 100,
            temperature: 0.7
          }
        }),
      });

      await workerHandler.fetch(request, mockEnv, {});

      // Verify Vertex AI-specific headers are preserved
      expect(mockFetch).toHaveBeenCalled();
      
      // Verify the request properties
      const mockCall = mockFetch.mock.calls[0];
      const callUrl = mockCall[0];
      const callOptions = mockCall[1];
      expect(callUrl).toBe('https://us-central1-aiplatform.googleapis.com/v1/projects/123456789/locations/us-central1/publishers/google/models/gemini-pro:predict');
      expect(callOptions.method).toBe('POST');
      expect(callOptions.headers instanceof Headers ? callOptions.headers.get('x-goog-user-project') : callOptions.headers['x-goog-user-project']).toBe('my-project-123');
    });

    it('should handle Vertex AI streaming responses', async () => {
      const streamResponse = new Response(
        new ReadableStream({
          start(controller) {
            controller.enqueue(new TextEncoder().encode('{"predictions":[{"candidates":[{"content":{"parts":[{"text":"Hello"}],"role":"model"},"finishReason":null,"index":0,"safetyRatings":[]}]}]}\n'));
            controller.enqueue(new TextEncoder().encode('{"predictions":[{"candidates":[{"content":{"parts":[{"text":"! How can I help you today?"}],"role":"model"},"finishReason":"STOP","index":0,"safetyRatings":[]}]}]}\n'));
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

      const request = new Request('https://example.com/vertexai/v1/predict', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': 'client-key-1',
        },
        body: JSON.stringify({
          instances: [
            {
              content: 'Hello'
            }
          ],
          parameters: {
            maxOutputTokens: 100,
            temperature: 0.7
          },
          stream: true,
        }),
      });

      const response = await workerHandler.fetch(request, mockEnv, {});

      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Type')).toBe('application/json');
      expect(response.headers.get('x-goog-user-project')).toBe('my-project-123');
    });
  });

  describe('Vertex AI Error Handling', () => {
    it('should handle Vertex AI API errors correctly', async () => {
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

      const request = new Request('https://example.com/vertexai/v1/predict', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': 'client-key-1',
        },
        body: JSON.stringify({
          instances: [
            {
              content: 'Hello'
            }
          ],
          parameters: {
            maxOutputTokens: 100,
            temperature: 0.7
          }
        }),
      });

      const response = await workerHandler.fetch(request, mockEnv, {});
      const data = await response.json() as any;

      expect(response.status).toBe(429);
      expect(data.error.message).toBe('Quota exceeded for quota group');
      expect(data.error.status).toBe('RESOURCE_EXHAUSTED');
    });

    it('should handle Vertex AI authentication errors', async () => {
      mockFetch.mockResolvedValueOnce(new Response(JSON.stringify({
        error: {
          code: 401,
          message: 'Request had invalid authentication credentials',
          status: 'UNAUTHENTICATED',
          details: []
        }
      }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      }));

      const request = new Request('https://example.com/vertexai/v1/predict', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': 'client-key-1',
        },
        body: JSON.stringify({
          instances: [
            {
              content: 'Hello'
            }
          ],
          parameters: {
            maxOutputTokens: 100,
            temperature: 0.7
          }
        }),
      });

      const response = await workerHandler.fetch(request, mockEnv, {});
      const data = await response.json() as any;

      expect(response.status).toBe(401);
      expect(data.error.message).toBe('Request had invalid authentication credentials');
      expect(data.error.status).toBe('UNAUTHENTICATED');
    });
  });
}); 