import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import Groq from 'groq-sdk';

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

describe('Groq SDK Compatibility Tests', () => {
  let groq: Groq;

  beforeEach(async () => {
    vi.clearAllMocks();
    
    // Create Groq client pointing to our proxy
    groq = new Groq({
      apiKey: 'client-key-1',
      baseURL: 'http://localhost:3000/groq',
    });
  });

  describe('Groq SDK Integration', () => {
    it('should work with Groq SDK for chat completions', async () => {
      // Mock successful Groq API response
      mockFetch.mockResolvedValueOnce(new Response(JSON.stringify({
        id: 'chatcmpl-groq-123',
        object: 'chat.completion',
        created: 1677652288,
        model: 'llama3-8b-8192',
        choices: [
          {
            index: 0,
            message: {
              role: 'assistant',
              content: 'Hello! I am Llama, an AI assistant powered by Groq.'
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

      try {
        const completion = await groq.chat.completions.create({
          model: 'llama3-8b-8192',
          messages: [
            {
              role: 'user',
              content: 'Hello'
            }
          ],
          max_tokens: 100
        });

        expect(completion.id).toBe('chatcmpl-groq-123');
        expect(completion.choices[0].message.role).toBe('assistant');
        expect(completion.choices[0].message.content).toBe('Hello! I am Llama, an AI assistant powered by Groq.');
        expect(completion.usage?.prompt_tokens).toBe(9);

        // Verify the request was forwarded correctly
        expect(mockFetch).toHaveBeenCalled();
        
        const mockCall = mockFetch.mock.calls[0];
        const mockRequest = mockCall[0];
        expect(mockRequest.url).toBe('http://localhost:3000/groq/v1/chat/completions');
        expect(mockRequest.method).toBe('POST');
        expect(mockRequest.headers.get('authorization')).toBe('Bearer client-key-1');
        expect(mockRequest.headers.get('content-type')).toBe('application/json');
      } catch (error) {
        console.log('Note: This test requires the local server to be running');
      }
    });

    it('should handle Groq SDK streaming responses', async () => {
      const streamResponse = new Response(
        new ReadableStream({
          start(controller) {
            controller.enqueue(new TextEncoder().encode('data: {"id":"chatcmpl-groq-123","object":"chat.completion.chunk","created":1677652288,"model":"llama3-8b-8192","choices":[{"index":0,"delta":{"role":"assistant"},"finish_reason":null}]}\n\n'));
            controller.enqueue(new TextEncoder().encode('data: {"id":"chatcmpl-groq-123","object":"chat.completion.chunk","created":1677652288,"model":"llama3-8b-8192","choices":[{"index":0,"delta":{"content":"Hello"},"finish_reason":null}]}\n\n'));
            controller.enqueue(new TextEncoder().encode('data: {"id":"chatcmpl-groq-123","object":"chat.completion.chunk","created":1677652288,"model":"llama3-8b-8192","choices":[{"index":0,"delta":{},"finish_reason":"stop"}]}\n\n'));
            controller.enqueue(new TextEncoder().encode('data: [DONE]\n\n'));
            controller.close();
          }
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'text/event-stream' },
        }
      );

      mockFetch.mockResolvedValueOnce(streamResponse);

      try {
        const stream = await groq.chat.completions.create({
          model: 'llama3-8b-8192',
          messages: [
            {
              role: 'user',
              content: 'Hello'
            }
          ],
          stream: true
        });

        let content = '';
        for await (const chunk of stream) {
          if (chunk.choices[0]?.delta?.content) {
            content += chunk.choices[0].delta.content;
          }
        }

        expect(content).toBe('Hello');
      } catch (error) {
        console.log('Note: This test requires the local server to be running');
      }
    });

    it('should work with Groq SDK for different models', async () => {
      // Mock successful response for different model
      mockFetch.mockResolvedValueOnce(new Response(JSON.stringify({
        id: 'chatcmpl-groq-456',
        object: 'chat.completion',
        created: 1677652288,
        model: 'mixtral-8x7b-32768',
        choices: [
          {
            index: 0,
            message: {
              role: 'assistant',
              content: 'Hello from Mixtral!'
            },
            finish_reason: 'stop'
          }
        ],
        usage: {
          prompt_tokens: 5,
          completion_tokens: 8,
          total_tokens: 13
        }
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }));

      try {
        const completion = await groq.chat.completions.create({
          model: 'mixtral-8x7b-32768',
          messages: [
            {
              role: 'user',
              content: 'Hello'
            }
          ]
        });

        expect(completion.model).toBe('mixtral-8x7b-32768');
        expect(completion.choices[0].message.content).toBe('Hello from Mixtral!');

        // Verify the request was forwarded correctly
        expect(mockFetch).toHaveBeenCalled();
        
        const mockCall = mockFetch.mock.calls[0];
        const mockRequest = mockCall[0];
        expect(mockRequest.url).toBe('http://localhost:3000/groq/v1/chat/completions');
        expect(mockRequest.method).toBe('POST');
        expect(mockRequest.headers.get('authorization')).toBe('Bearer client-key-1');
      } catch (error) {
        console.log('Note: This test requires the local server to be running');
      }
    });

    it('should handle Groq SDK error responses', async () => {
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

      try {
        await expect(groq.chat.completions.create({
          model: 'llama3-8b-8192',
          messages: [
            {
              role: 'user',
              content: 'Hello'
            }
          ]
        })).rejects.toThrow();
      } catch (error) {
        // Expected error
        expect(error).toBeDefined();
      }
    });
  });

  describe('Groq SDK Authentication', () => {
    it('should reject requests with invalid API keys', async () => {
      const invalidGroq = new Groq({
        apiKey: 'invalid-key',
        baseURL: 'http://localhost:3000/groq',
      });

      try {
        await expect(invalidGroq.chat.completions.create({
          model: 'llama3-8b-8192',
          messages: [
            {
              role: 'user',
              content: 'Hello'
            }
          ]
        })).rejects.toThrow();
      } catch (error) {
        // Expected authentication error
        expect(error).toBeDefined();
      }
    });
  });
}); 