# Deployment Guide

This guide explains how to deploy Claude Proxy both locally and to Cloudflare Workers.

## Local Development

### Prerequisites

- Node.js 18+ 
- pnpm (recommended) or npm
- API keys for the services you want to use (stored by clients, not the proxy)

### Setup

1. **Clone and install dependencies**:
   ```bash
   git clone <repository-url>
   cd claude-proxy
   pnpm install
   ```

2. **Configure environment variables**:
   ```bash
   # Copy the example environment file
   cp env.example .env
   
   # Edit .env with your allowed client keys
   nano .env
   ```

3. **Start the local server**:
   ```bash
   pnpm dev:local
   ```

   The server will start on `http://localhost:3000`

### Testing Local Deployment

1. **Test with curl** (using your actual API key):
   ```bash
   curl -X POST http://localhost:3000/openai/v1/chat/completions \
     -H "Content-Type: application/json" \
     -H "X-API-Key: sk-your-actual-openai-key" \
     -d '{"model":"gpt-3.5-turbo","messages":[{"role":"user","content":"Hello"}]}'
   ```

2. **Run the example script**:
   ```bash
   pnpm example:local
   ```

## Cloudflare Workers Deployment

### Prerequisites

- Cloudflare account
- Wrangler CLI installed: `pnpm add -g wrangler`
- Allowed client keys configured

### Setup

1. **Login to Cloudflare**:
   ```bash
   wrangler login
   ```

2. **Configure environment variables**:
   Edit `wrangler.toml` and add your allowed client keys:
   ```toml
   [env.production.vars]
   ALLOWED_ANTHROPIC_KEYS = "client-key-1,client-key-2,client-key-3"
   ALLOWED_OPENAI_KEYS = "client-key-1,client-key-2,client-key-3"
   ALLOWED_GOOGLE_KEYS = "client-key-1,client-key-2,client-key-3"
   ALLOWED_GROQ_KEYS = "client-key-1,client-key-2,client-key-3"
   ```

3. **Deploy to production**:
   ```bash
   pnpm deploy
   ```

4. **Deploy to staging** (optional):
   ```bash
   pnpm deploy:staging
   ```

### Testing Cloudflare Deployment

1. **Get your worker URL**:
   After deployment, you'll get a URL like:
   `https://claude-proxy.your-subdomain.workers.dev`

2. **Test with curl** (using your actual API key):
   ```bash
   curl -X POST https://claude-proxy.your-subdomain.workers.dev/openai/v1/chat/completions \
     -H "Content-Type: application/json" \
     -H "X-API-Key: sk-your-actual-openai-key" \
     -d '{"model":"gpt-3.5-turbo","messages":[{"role":"user","content":"Hello"}]}'
   ```

## Environment Variables

### Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `ALLOWED_ANTHROPIC_KEYS` | Comma-separated list of allowed client keys for Anthropic | `key1,key2,key3` |
| `ALLOWED_OPENAI_KEYS` | Comma-separated list of allowed client keys for OpenAI | `key1,key2,key3` |
| `ALLOWED_GOOGLE_KEYS` | Comma-separated list of allowed client keys for Google APIs | `key1,key2,key3` |
| `ALLOWED_GROQ_KEYS` | Comma-separated list of allowed client keys for Groq | `key1,key2,key3` |

### Optional Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Local development port | `3000` |
| `PROXY_URL` | HTTPS proxy URL for all outgoing requests | `undefined` |

## Proxy Configuration

### Overview

The proxy supports routing all outgoing requests through an HTTPS proxy. This is useful for:

- **Network Restrictions**: When your deployment environment has restricted outbound access
- **Corporate Networks**: When requests must go through a corporate proxy
- **Geographic Routing**: When you need to route requests through specific regions

### Local Development

Add to your `.env` file:
```env
PROXY_URL=https://proxy.example.com:8080
```

### Cloudflare Workers

Add to your `wrangler.toml`:
```toml
[env.production.vars]
PROXY_URL = "https://proxy.example.com:8080"
```

### How It Works

When `PROXY_URL` is set, all requests to AI providers are routed through the specified proxy:

1. The proxy receives the request with the target URL in the `X-Target-URL` header
2. The proxy forwards the request to the target AI provider
3. The response is returned through the proxy back to the client

**Note**: The proxy must support HTTPS and be able to handle the `X-Target-URL` header format.

## Security Considerations

### API Key Management

- **No API Key Storage**: The proxy never stores actual API keys
- **Client Responsibility**: Clients manage their own API keys
- **Whitelist Security**: Only pre-approved client keys can access each provider
- **Provider Isolation**: Each API provider has its own whitelist

### Client Authentication

- Use strong, unique client keys for whitelists
- Regularly rotate client keys
- Monitor usage patterns
- Consider implementing rate limiting

### CORS Configuration

The proxy includes CORS headers for web applications:
```
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS
Access-Control-Allow-Headers: Content-Type, Authorization, X-API-Key, anthropic-version, openai-version, x-goog-api-key
```

## Troubleshooting

### Common Issues

1. **"API key is required"**:
   - Make sure you're including `X-API-Key` or `Authorization` header
   - Verify the client key is in the appropriate provider whitelist

2. **"Invalid API key provided for this provider"**:
   - Check that your client key is in the correct provider whitelist
   - Verify the environment variable is set correctly for that provider

3. **"Unsupported API provider"**:
   - Check the URL path matches supported providers
   - Supported: `anthropic`, `openai`, `gemini`, `groq`, `vertexai`

4. **"Unauthorized" from target API**:
   - Verify you're using your actual API key (not the whitelist key)
   - Check that your API key is valid for the target service

### Debugging

1. **Local development**:
   ```bash
   # Run with debug logging
   DEBUG=* pnpm dev:local
   ```

2. **Cloudflare Workers**:
   ```bash
   # View logs
   wrangler tail
   ```

3. **Test individual endpoints**:
   ```bash
   # Test authentication
   curl -X GET http://localhost:3000/openai/v1/models \
     -H "X-API-Key: sk-your-actual-openai-key"
   
   # Test CORS
   curl -X OPTIONS http://localhost:3000/openai/v1/chat/completions \
     -H "Origin: http://localhost:3001" -v
   ```

## Performance Optimization

### Local Development

- Use `tsx` for fast TypeScript compilation
- Consider using `nodemon` for auto-restart during development

### Cloudflare Workers

- The worker automatically optimizes for the edge
- Consider using Cloudflare's caching features
- Monitor usage and adjust limits as needed

## Monitoring

### Local Development

- Check console output for errors
- Use browser dev tools for network requests
- Monitor system resources

### Cloudflare Workers

- Use Cloudflare Analytics
- Monitor error rates in Cloudflare dashboard
- Set up alerts for high error rates
- Track API usage and costs 