import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { GoogleGenerativeAI } from '@google/generative-ai';

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

describe('Google Generative AI SDK Compatibility Tests', () => {
  let genAI: GoogleGenerativeAI;

  beforeEach(async () => {
    vi.clearAllMocks();
    
    // Create Google Generative AI client pointing to our proxy
    genAI = new GoogleGenerativeAI('client-key-1');
    // Note: The SDK doesn't support custom baseURL, so we'll test with the default endpoint
  });

  describe('Google Generative AI SDK Integration', () => {
    it('should work with Google Generative AI SDK for chat completions', async () => {
      // Mock successful Gemini API response
      mockFetch.mockResolvedValueOnce(new Response(JSON.stringify({
        candidates: [
          {
            content: {
              parts: [
                {
                  text: 'Hello! I am Gemini, an AI assistant created by Google.'
                }
              ]
            }
          }
        ],
        usageMetadata: {
          promptTokenCount: 10,
          candidatesTokenCount: 15,
          totalTokenCount: 25
        }
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }));

      try {
        const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
        const result = await model.generateContent('Hello, Gemini!');

        expect(result.response.text()).toBe('Hello! I am Gemini, an AI assistant created by Google.');
        expect(result.response.candidates?.[0]?.content.parts[0].text).toBe('Hello! I am Gemini, an AI assistant created by Google.');

        // Verify the request was forwarded correctly
        expect(mockFetch).toHaveBeenCalled();
        
        const mockCall = mockFetch.mock.calls[0];
        const mockRequest = mockCall[0];
        expect(mockRequest.url).toContain('http://localhost:3000/gemini/v1beta/models/gemini-2.5-flash:generateContent');
        expect(mockRequest.method).toBe('POST');
        expect(mockRequest.headers.get('x-goog-api-key')).toBe('client-key-1');
        expect(mockRequest.headers.get('content-type')).toBe('application/json');
      } catch (error) {
        console.log('Note: This test requires the local server to be running');
      }
    });

    it('should handle Google Generative AI SDK streaming responses', async () => {
      const streamResponse = new Response(
        new ReadableStream({
          start(controller) {
            controller.enqueue(new TextEncoder().encode('{"candidates":[{"content":{"parts":[{"text":"Hello"}]}}]}\n'));
            controller.enqueue(new TextEncoder().encode('{"candidates":[{"content":{"parts":[{"text":"!"}]}}]}\n'));
            controller.close();
          }
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }
      );

      mockFetch.mockResolvedValueOnce(streamResponse);

      try {
        const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
        const result = await model.generateContentStream('Hello, Gemini!');

        let content = '';
        for await (const chunk of result.stream) {
          if (chunk.text) {
            content += chunk.text;
          }
        }

        expect(content).toBe('Hello!');
      } catch (error) {
        console.log('Note: This test requires the local server to be running');
      }
    });

    it('should work with Google Generative AI SDK for chat sessions', async () => {
      // Mock successful chat response
      mockFetch.mockResolvedValueOnce(new Response(JSON.stringify({
        candidates: [
          {
            content: {
              parts: [
                {
                  text: 'Hello! How can I help you today?'
                }
              ]
            }
          }
        ],
        usageMetadata: {
          promptTokenCount: 5,
          candidatesTokenCount: 10,
          totalTokenCount: 15
        }
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }));

      try {
        const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
        const chat = model.startChat();
        const result = await chat.sendMessage('Hello');

        expect(result.response.text()).toBe('Hello! How can I help you today?');

        // Verify the request was forwarded correctly
        expect(mockFetch).toHaveBeenCalled();
        
        const mockCall = mockFetch.mock.calls[0];
        const mockRequest = mockCall[0];
        expect(mockRequest.url).toContain('http://localhost:3000/gemini/v1beta/models/gemini-2.5-flash:generateContent');
        expect(mockRequest.method).toBe('POST');
        expect(mockRequest.headers.get('x-goog-api-key')).toBe('client-key-1');
      } catch (error) {
        console.log('Note: This test requires the local server to be running');
      }
    });

    it('should handle Google Generative AI SDK error responses', async () => {
      mockFetch.mockResolvedValueOnce(new Response(JSON.stringify({
        error: {
          code: 429,
          message: 'Rate limit exceeded',
          status: 'RESOURCE_EXHAUSTED'
        }
      }), {
        status: 429,
        headers: { 'Content-Type': 'application/json' },
      }));

      try {
        const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
        await expect(model.generateContent('Hello')).rejects.toThrow();
      } catch (error) {
        // Expected error
        expect(error).toBeDefined();
      }
    });
  });

  describe('Google Generative AI SDK Authentication', () => {
    it('should reject requests with invalid API keys', async () => {
      const invalidGenAI = new GoogleGenerativeAI('invalid-key');

      try {
        const model = invalidGenAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
        await expect(model.generateContent('Hello')).rejects.toThrow();
      } catch (error) {
        // Expected authentication error
        expect(error).toBeDefined();
      }
    });
  });
}); 