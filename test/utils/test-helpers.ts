import { vi, expect } from 'vitest';

export interface MockEnv {
  ANTHROPIC_API_KEY: string;
  ALLOWED_CLIENT_KEYS: string;
}

export const createMockEnv = (overrides: Partial<MockEnv> = {}): MockEnv => ({
  ANTHROPIC_API_KEY: 'test-anthropic-key',
  ALLOWED_CLIENT_KEYS: 'client-key-1,client-key-2,client-key-3',
  ...overrides,
});

export const createMockRequest = (
  url: string,
  options: {
    method?: string;
    headers?: Record<string, string>;
    body?: string;
  } = {}
) => {
  const { method = 'GET', headers = {}, body } = options;
  
  return new Request(url, {
    method,
    headers,
    body,
  });
};

export const createMockResponse = (
  data: any,
  status: number = 200,
  headers: Record<string, string> = {}
) => {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
  });
};

export const mockFetchSuccess = (data: any, status: number = 200) => {
  const mockResponse = createMockResponse(data, status);
  global.fetch = vi.fn().mockResolvedValue(mockResponse);
  return mockResponse;
};

export const mockFetchError = (error: Error) => {
  global.fetch = vi.fn().mockRejectedValue(error);
};

export const mockFetchResponse = (response: Response) => {
  global.fetch = vi.fn().mockResolvedValue(response);
};

export const expectCorsHeaders = (response: Response) => {
  expect(response.headers.get('Access-Control-Allow-Origin')).toBe('*');
  expect(response.headers.get('Access-Control-Allow-Methods')).toBe('GET, POST, PUT, DELETE, OPTIONS');
  expect(response.headers.get('Access-Control-Allow-Headers')).toBe('Content-Type, Authorization, X-API-Key, anthropic-version');
};

export async function expectError(
  response: Response,
  expectedStatus: number,
  expectedError: string,
  expectedMessage?: string
): Promise<void> {
  expect(response.status).toBe(expectedStatus);
  const data = await response.json() as any;
  expect(data.error).toBe(expectedError);
  if (expectedMessage) {
    expect(data.message).toBe(expectedMessage);
  }
}

export const expectAnthropicRequest = (
  mockFetch: any,
  expectedUrl: string,
  expectedMethod: string = 'POST',
  expectedHeaders?: Record<string, string>
) => {
  expect(mockFetch).toHaveBeenCalledWith(
    expect.objectContaining({
      url: expectedUrl,
      method: expectedMethod,
      headers: expectedHeaders ? expect.objectContaining(expectedHeaders) : expect.any(Object),
    }),
    expect.any(Object)
  );
};

export const createValidMessageRequest = (
  clientKey: string = 'client-key-1',
  body?: any
) => {
  return createMockRequest('https://example.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'anthropic-version': '2023-06-01',
      'X-API-Key': clientKey,
    },
    body: JSON.stringify(body || {
      model: 'claude-3-sonnet-20240229',
      max_tokens: 100,
      messages: [{ role: 'user', content: 'Hello' }],
    }),
  });
};

export const createCorsPreflightRequest = () => {
  return createMockRequest('https://example.com/v1/messages', {
    method: 'OPTIONS',
    headers: {
      'Origin': 'https://example.com',
      'Access-Control-Request-Method': 'POST',
      'Access-Control-Request-Headers': 'Content-Type,anthropic-version,X-API-Key',
    },
  });
}; 