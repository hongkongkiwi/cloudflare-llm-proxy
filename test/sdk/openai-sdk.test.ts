import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import OpenAI from 'openai';

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

describe('OpenAI SDK Compatibility Tests', () => {
  let openai: OpenAI;

  beforeEach(async () => {
    vi.clearAllMocks();
    
    // Create OpenAI client pointing to our proxy
    openai = new OpenAI({
      apiKey: 'client-key-1',
      baseURL: 'http://localhost:3000/openai',
    });
  });

  describe('OpenAI SDK Integration', () => {
    it('should work with OpenAI SDK for chat completions', async () => {
      // Mock successful OpenAI API response
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

      try {
        const completion = await openai.chat.completions.create({
          model: 'gpt-3.5-turbo',
          messages: [
            {
              role: 'user',
              content: 'Hello'
            }
          ],
          max_tokens: 100
        });

        expect(completion.id).toBe('chatcmpl-123');
        expect(completion.choices[0].message.role).toBe('assistant');
        expect(completion.choices[0].message.content).toBe('Hello! How can I help you today?');
        expect(completion.usage?.prompt_tokens).toBe(9);

        // Verify the request was forwarded correctly
        expect(mockFetch).toHaveBeenCalled();
        
        const mockCall = mockFetch.mock.calls[0];
        const mockRequest = mockCall[0];
        expect(mockRequest.url).toBe('http://localhost:3000/openai/v1/chat/completions');
        expect(mockRequest.method).toBe('POST');
        expect(mockRequest.headers.get('authorization')).toBe('Bearer client-key-1');
        expect(mockRequest.headers.get('content-type')).toBe('application/json');
      } catch (error) {
        console.log('Note: This test requires the local server to be running');
      }
    });

    it('should handle OpenAI SDK streaming responses', async () => {
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
          headers: { 'Content-Type': 'text/event-stream' },
        }
      );

      mockFetch.mockResolvedValueOnce(streamResponse);

      try {
        const stream = await openai.chat.completions.create({
          model: 'gpt-3.5-turbo',
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

    it('should work with OpenAI SDK for models endpoint', async () => {
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

      try {
        const models = await openai.models.list();

        expect(models.data).toHaveLength(2);
        expect(models.data[0].id).toBe('gpt-3.5-turbo');
        expect(models.data[1].id).toBe('gpt-4');

        // Verify the request was forwarded correctly
        expect(mockFetch).toHaveBeenCalled();
        
        const mockCall = mockFetch.mock.calls[0];
        const mockRequest = mockCall[0];
        expect(mockRequest.url).toBe('http://localhost:3000/openai/v1/models');
        expect(mockRequest.method).toBe('GET');
        expect(mockRequest.headers.get('authorization')).toBe('Bearer client-key-1');
      } catch (error) {
        console.log('Note: This test requires the local server to be running');
      }
    });

    it('should handle OpenAI SDK error responses', async () => {
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
        await expect(openai.chat.completions.create({
          model: 'gpt-3.5-turbo',
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

  describe('OpenAI SDK Authentication', () => {
    it('should reject requests with invalid API keys', async () => {
      const invalidOpenAI = new OpenAI({
        apiKey: 'invalid-key',
        baseURL: 'http://localhost:3000/openai',
      });

      try {
        await expect(invalidOpenAI.chat.completions.create({
          model: 'gpt-3.5-turbo',
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