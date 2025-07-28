// Remove the makeRequest function and use global fetch directly

interface Env {
  // Client authentication whitelists
  ALLOWED_ANTHROPIC_KEYS: string;
  ALLOWED_OPENAI_KEYS: string;
  ALLOWED_GOOGLE_KEYS: string;
  ALLOWED_GROQ_KEYS: string;
  ALLOWED_OPENROUTER_KEYS: string;
  // Optional HTTPS proxy configuration
  PROXY_URL?: string;
}

interface ApiConfig {
  baseUrl: string;
  apiKeyHeader: string;
  defaultVersion?: string;
  transformRequest?: (request: Request) => { url: string };
  transformResponse?: (response: Response) => Response;
  maskHeaders?: string[];
}

// Pre-compiled regex patterns for performance
const BEARER_PREFIX = /^Bearer\s+/;
const API_CONFIG_CACHE = new Map<string, ApiConfig>();
const ALLOWED_KEYS_CACHE = new Map<string, string[]>();

// Pre-defined header lists for performance
const RELEVANT_HEADERS = [
  'content-type',
  'anthropic-version',
  'anthropic-beta',
  'openai-version',
  'openai-organization',
  'openai-beta',
  'user-agent',
  'x-goog-user-project',
] as const;

const DEFAULT_MASK_HEADERS = [
  'x-forwarded-for',
  'x-real-ip',
  'x-forwarded-proto',
  'x-forwarded-host',
  'cf-connecting-ip',
  'cf-ipcountry',
  'cf-ray',
  'cf-visitor',
  'x-forwarded-server',
  'x-forwarded-by',
  'via',
  'x-cluster-client-ip',
  'x-host',
  'x-original-forwarded-for',
  'x-original-remote-addr',
  'x-original-remote-host',
  'x-original-uri',
  'x-remote-addr',
  'x-remote-host',
  'x-remote-ip',
  'x-remote-port',
  'x-request-uri',
  'x-scheme',
  'x-server-name',
  'x-server-port',
  'x-server-protocol',
  'x-server-software',
  'x-ssl-client-cert',
  'x-ssl-client-dn',
  'x-ssl-client-verify',
  'x-ssl-cipher',
  'x-ssl-protocol',
  'x-ssl-session-id',
  'x-ssl-session-reused',
  'x-ssl-trusted-ca',
  'x-ssl-verify',
  'x-ssl-verify-result',
] as const;

export default {
  async fetch(request: Request, env: Env, ctx: any): Promise<Response> {
    // Handle CORS preflight requests
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-API-Key, anthropic-version, openai-version, x-goog-api-key',
          'Access-Control-Max-Age': '86400',
        },
      });
    }

    try {
      // Claude-Gemini translation endpoint
      const url = new URL(request.url);
      if (url.pathname.startsWith('/claude-gemini/v1/messages')) {
        return await this.handleClaudeGeminiTranslation(request, env, ctx);
      }

      // Get the client API key from request headers (optimized)
      const clientApiKey = request.headers.get('X-API-Key') || 
                          request.headers.get('x-api-key') ||
                          request.headers.get('Authorization')?.replace(BEARER_PREFIX, '');
      if (!clientApiKey) {
        return new Response(JSON.stringify({ 
          error: 'API key is required',
          message: 'Please provide an API key in the X-API-Key header or Authorization header'
        }), {
          status: 401,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        });
      }

      // Parse the URL to determine which API to route to (optimized)
      const urlPathParts = url.pathname.split('/').filter(Boolean);
      if (urlPathParts.length < 2) {
        return new Response(JSON.stringify({ 
          error: 'Invalid API endpoint',
          message: 'Please specify a valid API endpoint (e.g., /anthropic/v1/messages, /openai/v1/chat/completions)'
        }), {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        });
      }
      const apiProvider = urlPathParts[0];
      const apiConfig = this.getApiConfig(apiProvider, env);
      if (!apiConfig) {
        return new Response(JSON.stringify({ 
          error: 'Unsupported API provider',
          message: `API provider '${apiProvider}' is not supported. Supported providers: anthropic, openai, gemini, groq, vertexai, openrouter`
        }), {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        });
      }

      // Check if the client API key is allowed for this provider (optimized with caching)
      const allowedKeys = this.getAllowedKeysForProvider(apiProvider, env);
      if (allowedKeys.length > 0 && !allowedKeys.includes(clientApiKey)) {
        return new Response(JSON.stringify({ 
          error: 'Unauthorized',
          message: 'Invalid API key provided for this provider'
        }), {
          status: 403,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
          },
        });
      }

      // Build the target URL (optimized)
      const targetUrl = new URL(request.url);
      const baseUrl = new URL(apiConfig.baseUrl);
      targetUrl.hostname = baseUrl.hostname;
      targetUrl.protocol = baseUrl.protocol;
      
      // Handle path construction based on provider (optimized)
      if (apiProvider === 'openrouter') {
        const apiPath = urlPathParts.slice(2).join('/');
        targetUrl.pathname = `/api/v1/${apiPath}`;
      } else {
        const apiPath = urlPathParts.slice(1).join('/');
        targetUrl.pathname = `/${apiPath}`;
      }

      // Copy relevant headers from the original request (optimized)
      const headers = new Headers();
      
      // Set the API key header using the client's key
      if (apiConfig.apiKeyHeader === 'Authorization') {
        headers.set('Authorization', `Bearer ${clientApiKey}`);
      } else {
        headers.set(apiConfig.apiKeyHeader, clientApiKey);
      }

      // Copy other relevant headers (optimized)
      for (const headerName of RELEVANT_HEADERS) {
        const value = request.headers.get(headerName);
        if (value) {
          headers.set(headerName, value);
        }
      }

      // Set default version if not provided
      if (apiConfig.defaultVersion && !headers.has('anthropic-version') && !headers.has('openai-version')) {
        if (apiProvider === 'anthropic') {
          headers.set('anthropic-version', apiConfig.defaultVersion);
        } else if (apiProvider === 'openai') {
          headers.set('openai-version', apiConfig.defaultVersion);
        }
      }

      // Add user agent if not present
      if (!headers.has('user-agent')) {
        headers.set('user-agent', 'Claude-Proxy/1.0');
      }

      // Mask client IP and location information (optimized)
      this.maskClientInfo(headers, apiConfig.maskHeaders);

      // Create the request to target API (optimized body handling)
      let targetRequest: Request;
      
      if (request.method !== 'GET' && request.method !== 'HEAD' && request.body) {
        // For requests with body, use streaming for better performance
        const requestInit: RequestInit = {
          method: request.method,
          headers: headers,
          body: request.body, // Keep original body stream
        };
        
        // Add duplex option for Node.js environment
        try {
          (requestInit as any).duplex = 'half';
        } catch (e) {
          // Ignore if duplex is not supported
        }
        
        targetRequest = new Request(targetUrl.toString(), requestInit);
      } else {
        targetRequest = new Request(targetUrl.toString(), {
          method: request.method,
          headers: headers,
        });
      }

      // Apply request transformation if needed
      if (apiConfig.transformRequest) {
        try {
          const transformed = apiConfig.transformRequest(targetRequest);
          const transformedUrl = new URL(transformed.url);
          targetUrl.pathname = transformedUrl.pathname;
          targetUrl.search = transformedUrl.search;
          
          // Recreate the request with the updated URL
          const body = targetRequest.body;
          const requestInit: RequestInit = {
            method: targetRequest.method,
            headers: targetRequest.headers,
            body: body,
          };
          
          try {
            (requestInit as any).duplex = 'half';
          } catch (e) {
            // Ignore if duplex is not supported
          }
          
          targetRequest = new Request(targetUrl.toString(), requestInit);
        } catch (error) {
          console.error('Transform error:', error);
          throw error;
        }
      }

      // Forward the request to the target API
      const response = await this.fetchWithProxy(targetRequest, env, ctx);
      
      // Create response headers (optimized)
      const responseHeaders = new Headers(response.headers);
      responseHeaders.set('Access-Control-Allow-Origin', '*');
      responseHeaders.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      responseHeaders.set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-API-Key, anthropic-version, openai-version, x-goog-api-key');

      let finalResponse = new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: responseHeaders,
      });

      // Apply response transformation if needed
      if (apiConfig.transformResponse) {
        finalResponse = apiConfig.transformResponse(finalResponse);
      }

      return finalResponse;

    } catch (error) {
      console.error('Proxy error:', error);
      
      return new Response(JSON.stringify({ 
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
        details: error instanceof Error ? error.stack : undefined,
        url: request.url,
        method: request.method
      }), {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }
  },

  async handleClaudeGeminiTranslation(request: Request, env: Env, ctx: any): Promise<Response> {
    // Validate Gemini API key (from X-API-Key)
    const geminiApiKey = request.headers.get('X-API-Key') || 
                         request.headers.get('Authorization')?.replace(BEARER_PREFIX, '');
    if (!geminiApiKey) {
      return new Response(JSON.stringify({
        error: 'API key is required',
        message: 'Please provide a Gemini API key in the X-API-Key header or Authorization header'
      }), {
        status: 401,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      });
    }
    
    // Check whitelist
    const allowedKeys = this.getAllowedKeysForProvider('gemini', env);
    if (allowedKeys.length > 0 && !allowedKeys.includes(geminiApiKey)) {
      return new Response(JSON.stringify({
        error: 'Unauthorized',
        message: 'Invalid Gemini API key provided'
      }), {
        status: 403,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      });
    }
    
    // Parse Anthropic-style request
    const body = await request.json() as any;
    const geminiModel = mapClaudeModelToGemini(body.model);
    const geminiRequest = {
      model: geminiModel,
      contents: body.messages.map((msg: any) => ({
        role: msg.role === 'user' ? 'user' : 'model',
        parts: [{ text: msg.content }],
      })),
      generationConfig: body.max_tokens ? { maxOutputTokens: body.max_tokens } : undefined,
    };
    
    // Forward to Gemini
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent`;
    const geminiHeaders = new Headers({
      'Content-Type': 'application/json',
      'x-goog-api-key': geminiApiKey,
    });
    
    // Use proxy if configured
    const geminiReq = new Request(geminiUrl, {
      method: 'POST',
      headers: geminiHeaders,
      body: JSON.stringify(geminiRequest),
    });
    
    const geminiResp = await this.fetchWithProxy(geminiReq, env, ctx);
    const geminiData = await geminiResp.json() as any;
    
    // Translate Gemini response to Anthropic format
    const candidate = geminiData.candidates?.[0]?.content;
    const text = candidate?.parts?.map((p: any) => p.text).join('') || '';
    const anthropicResponse = {
      id: 'msg_' + Math.random().toString(36).slice(2),
      type: 'message',
      role: 'assistant',
      content: [{ type: 'text', text }],
      model: geminiModel,
      usage: geminiData.usage,
    };
    
    return new Response(JSON.stringify(anthropicResponse), {
      status: 200,
      headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
    });
  },

  async fetchWithProxy(request: Request, env: Env, ctx: any): Promise<Response> {
    // If proxy is configured, use it
    if (env.PROXY_URL) {
      // Create a new request with the proxy URL
      const proxyUrl = new URL(env.PROXY_URL);
      const targetUrl = new URL(request.url);
      
      // Set the target URL as a header for the proxy
      const proxyHeaders = new Headers(request.headers);
      proxyHeaders.set('X-Target-URL', targetUrl.toString());
      
      // Create the proxy request
      const proxyRequest = new Request(proxyUrl.toString(), {
        method: request.method,
        headers: proxyHeaders,
        body: request.body,
      });
      
      return fetch(proxyRequest.url, {
        method: proxyRequest.method,
        headers: proxyRequest.headers,
        body: proxyRequest.body,
      });
    } else {
      // Use regular fetch without proxy
      return fetch(request.url, {
        method: request.method,
        headers: request.headers,
        body: request.body,
      });
    }
  },

  maskClientInfo(headers: Headers, maskHeaders?: string[]) {
    // Remove headers that could reveal client information (optimized)
    const headersToMask = maskHeaders || DEFAULT_MASK_HEADERS;
    
    for (const header of headersToMask) {
      headers.delete(header);
    }
  },

  getApiConfig(provider: string, env: Env): ApiConfig | null {
    // Use cached config if available
    if (API_CONFIG_CACHE.has(provider)) {
      return API_CONFIG_CACHE.get(provider)!;
    }

    const configs: Record<string, ApiConfig> = {
      anthropic: {
        baseUrl: 'https://api.anthropic.com',
        apiKeyHeader: 'x-api-key',
        defaultVersion: '2023-06-01',
        maskHeaders: [
          'x-forwarded-for',
          'x-real-ip',
          'cf-connecting-ip',
          'cf-ipcountry',
        ],
      },
      openai: {
        baseUrl: 'https://api.openai.com',
        apiKeyHeader: 'Authorization',
        defaultVersion: '2024-01-01',
        maskHeaders: [
          'x-forwarded-for',
          'x-real-ip',
          'cf-connecting-ip',
          'cf-ipcountry',
        ],
      },
      gemini: {
        baseUrl: 'https://generativelanguage.googleapis.com',
        apiKeyHeader: 'x-goog-api-key',
        defaultVersion: '2024-01-01',
        maskHeaders: [
          'x-forwarded-for',
          'x-real-ip',
          'cf-connecting-ip',
          'cf-ipcountry',
        ],
      },
      groq: {
        baseUrl: 'https://api.groq.com',
        apiKeyHeader: 'Authorization',
        defaultVersion: '2024-01-01',
        maskHeaders: [
          'x-forwarded-for',
          'x-real-ip',
          'cf-connecting-ip',
          'cf-ipcountry',
        ],
      },
      vertexai: {
        baseUrl: 'https://us-central1-aiplatform.googleapis.com',
        apiKeyHeader: 'Authorization',
        defaultVersion: '2024-01-01',
        transformRequest: (req) => {
          // Transform OpenAI-style request to Vertex AI format
          const url = new URL(req.url);
          
          // Extract project ID from the URL path or use a default
          const pathParts = url.pathname.split('/');
          const projectId = pathParts[3] || '123456789'; // Default project ID for testing
          const location = pathParts[4] || 'us-central1'; // Default location
          
          if (url.pathname.includes('/predict')) {
            // Transform to Vertex AI predict endpoint
            url.pathname = `/v1/projects/${projectId}/locations/${location}/publishers/google/models/gemini-pro:predict`;
          } else if (url.pathname.includes('/models')) {
            // Transform to Vertex AI models endpoint
            url.pathname = `/v1/projects/${projectId}/locations/${location}/models`;
          } else if (url.pathname.includes('/chat/completions')) {
            // Transform to Vertex AI predict endpoint (for OpenAI compatibility)
            url.pathname = `/v1/projects/${projectId}/locations/${location}/publishers/google/models/gemini-pro:predict`;
          }
          
          return { url: url.toString() };
        },
        transformResponse: (res) => {
          // Transform Vertex AI response to OpenAI format
          // This is a simplified transformation
          return res;
        },
        maskHeaders: [
          'x-forwarded-for',
          'x-real-ip',
          'cf-connecting-ip',
          'cf-ipcountry',
        ],
      },
      openrouter: {
        baseUrl: 'https://openrouter.ai',
        apiKeyHeader: 'Authorization',
        defaultVersion: undefined,
        maskHeaders: [
          'x-forwarded-for',
          'x-real-ip',
          'cf-connecting-ip',
          'cf-ipcountry',
        ],
      },
    };

    const config = configs[provider] || null;
    if (config) {
      API_CONFIG_CACHE.set(provider, config);
    }
    return config;
  },

  getAllowedKeysForProvider(provider: string, env: Env): string[] {
    // Use cached keys if available
    const cacheKey = `${provider}:${env.ALLOWED_ANTHROPIC_KEYS}:${env.ALLOWED_OPENAI_KEYS}:${env.ALLOWED_GOOGLE_KEYS}:${env.ALLOWED_GROQ_KEYS}:${env.ALLOWED_OPENROUTER_KEYS}`;
    
    if (ALLOWED_KEYS_CACHE.has(cacheKey)) {
      return ALLOWED_KEYS_CACHE.get(cacheKey)!;
    }

    let keys: string[] = [];
    
    switch (provider) {
      case 'anthropic':
        keys = env.ALLOWED_ANTHROPIC_KEYS ? env.ALLOWED_ANTHROPIC_KEYS.split(',').map(key => key.trim()).filter(key => key.length > 0) : [];
        break;
      case 'openai':
        keys = env.ALLOWED_OPENAI_KEYS ? env.ALLOWED_OPENAI_KEYS.split(',').map(key => key.trim()).filter(key => key.length > 0) : [];
        break;
      case 'gemini':
        keys = env.ALLOWED_GOOGLE_KEYS ? env.ALLOWED_GOOGLE_KEYS.split(',').map(key => key.trim()).filter(key => key.length > 0) : [];
        break;
      case 'groq':
        keys = env.ALLOWED_GROQ_KEYS ? env.ALLOWED_GROQ_KEYS.split(',').map(key => key.trim()).filter(key => key.length > 0) : [];
        break;
      case 'vertexai':
        keys = env.ALLOWED_GOOGLE_KEYS ? env.ALLOWED_GOOGLE_KEYS.split(',').map(key => key.trim()).filter(key => key.length > 0) : [];
        break;
      case 'openrouter':
        keys = env.ALLOWED_OPENROUTER_KEYS ? env.ALLOWED_OPENROUTER_KEYS.split(',').map(key => key.trim()).filter(key => key.length > 0) : [];
        break;
      default:
        keys = [];
    }

    ALLOWED_KEYS_CACHE.set(cacheKey, keys);
    return keys;
  },
}; 

// Model mapping utility for Claude-Gemini endpoint (optimized)
function mapClaudeModelToGemini(model: string | undefined): string {
  if (!model) return 'gemini-2.5-flash';
  if (model.startsWith('gemini-')) return model;
  
  const m = model.toLowerCase();
  if (m.includes('haiku')) return 'gemini-2.5-flash';
  if (m.includes('sonnet') || m.includes('opus')) return 'gemini-2.5-pro';
  return 'gemini-2.5-flash';
} 