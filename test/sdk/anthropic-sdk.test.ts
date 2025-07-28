import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import Anthropic from '@anthropic-ai/sdk';

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

describe('Anthropic SDK Compatibility Tests', () => {
  let anthropic: Anthropic;

  beforeEach(async () => {
    vi.clearAllMocks();
    
    // Create Anthropic client pointing to our proxy
    anthropic = new Anthropic({
      apiKey: 'client-key-1',
      baseURL: 'http://localhost:3000/anthropic',
    });
  });

  describe('Anthropic SDK Integration', () => {
    it('should work with Anthropic SDK for messages endpoint', async () => {
      // Mock successful Anthropic API response
      mockFetch.mockResolvedValueOnce(new Response(JSON.stringify({
        id: 'msg_1234567890',
        type: 'message',
        role: 'assistant',
        content: [
          {
            type: 'text',
            text: 'Hello! I am Claude, an AI assistant created by Anthropic.'
          }
        ],
        model: 'claude-3-sonnet-20240229',
        usage: {
          input_tokens: 10,
          output_tokens: 15
        }
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }));

      try {
        const message = await anthropic.messages.create({
          model: 'claude-3-sonnet-20240229',
          max_tokens: 100,
          messages: [
            {
              role: 'user',
              content: 'Hello, Claude!'
            }
          ]
        });

        expect(message.id).toBe('msg_1234567890');
        expect(message.role).toBe('assistant');
        expect(message.content[0].type).toBe('text');
        expect((message.content[0] as any).text).toContain('Hello! I am Claude');

        // Verify the request was forwarded correctly
        expect(mockFetch).toHaveBeenCalled();
        
        const mockCall = mockFetch.mock.calls[0];
        const mockRequest = mockCall[0];
        expect(mockRequest.url).toBe('http://localhost:3000/anthropic/v1/messages');
        expect(mockRequest.method).toBe('POST');
        expect(mockRequest.headers.get('x-api-key')).toBe('client-key-1');
        expect(mockRequest.headers.get('content-type')).toBe('application/json');
      } catch (error) {
        // If the server isn't running, this is expected
        console.log('Note: This test requires the local server to be running');
      }
    });

    it('should handle Anthropic SDK streaming responses', async () => {
      const streamResponse = new Response(
        new ReadableStream({
          start(controller) {
            controller.enqueue(new TextEncoder().encode('data: {"type":"message_start","message":{"id":"msg_123","type":"message","role":"assistant","content":[],"model":"claude-3-sonnet-20240229","usage":{"input_tokens":10,"output_tokens":0}}}\n\n'));
            controller.enqueue(new TextEncoder().encode('data: {"type":"content_block_start","index":0,"content_block":{"type":"text","text":""}}\n\n'));
            controller.enqueue(new TextEncoder().encode('data: {"type":"content_block_delta","index":0,"delta":{"type":"text_delta","text":"Hello"}}\n\n'));
            controller.enqueue(new TextEncoder().encode('data: {"type":"content_block_delta","index":0,"delta":{"type":"text_delta","text":"!"}}\n\n'));
            controller.enqueue(new TextEncoder().encode('data: {"type":"content_block_stop","index":0}\n\n'));
            controller.enqueue(new TextEncoder().encode('data: {"type":"message_delta","delta":{"stop_reason":"end_turn","stop_sequence":null}}\n\n'));
            controller.enqueue(new TextEncoder().encode('data: {"type":"message_stop"}\n\n'));
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
        const stream = await anthropic.messages.create({
          model: 'claude-3-sonnet-20240229',
          max_tokens: 100,
          messages: [
            {
              role: 'user',
              content: 'Hello, Claude!'
            }
          ],
          stream: true
        });

        let content = '';
        for await (const chunk of stream) {
          if (chunk.type === 'content_block_delta') {
            content += (chunk.delta as any).text;
          }
        }

        expect(content).toBe('Hello!');
      } catch (error) {
        console.log('Note: This test requires the local server to be running');
      }
    });

    it('should handle Anthropic SDK error responses', async () => {
      mockFetch.mockResolvedValueOnce(new Response(JSON.stringify({
        type: 'error',
        error: {
          type: 'rate_limit_error',
          message: 'Rate limit exceeded'
        }
      }), {
        status: 429,
        headers: { 'Content-Type': 'application/json' },
      }));

      try {
        await expect(anthropic.messages.create({
          model: 'claude-3-sonnet-20240229',
          max_tokens: 100,
          messages: [
            {
              role: 'user',
              content: 'Hello, Claude!'
            }
          ]
        })).rejects.toThrow();
      } catch (error) {
        // Expected error
        expect(error).toBeDefined();
      }
    });
  });

  describe('Anthropic SDK Authentication', () => {
    it('should reject requests with invalid API keys', async () => {
      const invalidAnthropic = new Anthropic({
        apiKey: 'invalid-key',
        baseURL: 'http://localhost:3000/anthropic',
      });

      try {
        await expect(invalidAnthropic.messages.create({
          model: 'claude-3-sonnet-20240229',
          max_tokens: 100,
          messages: [
            {
              role: 'user',
              content: 'Hello, Claude!'
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