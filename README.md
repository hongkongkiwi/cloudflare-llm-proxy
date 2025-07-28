# Claude Proxy

A secure API proxy for multiple AI providers (Anthropic, OpenAI, Google Gemini, Groq, Vertex AI) that can run both locally and as a Cloudflare Worker. The proxy acts as a secure gateway that validates client API keys against whitelists and forwards requests directly to the target APIs.

## Features

- **Multi-Provider Support**: Proxy requests to Anthropic, OpenAI, Google Gemini, Groq, and Vertex AI
- **Client Authentication**: Whitelist-based authentication for each API provider
- **Pass-Through Design**: Client API keys are forwarded directly to target APIs
- **CORS Support**: Built-in CORS headers for web applications
- **Flexible Deployment**: Run locally for development or deploy to Cloudflare Workers
- **Request Transformation**: Automatic request/response transformation between different API formats

## How It Works

The proxy validates client API keys against provider-specific whitelists and forwards requests directly to the target APIs. This means:

1. **No API Key Storage**: The proxy doesn't store your actual API keys
2. **Client Control**: Clients use their own API keys directly
3. **Whitelist Security**: Only pre-approved client keys can access each provider
4. **Direct Forwarding**: Requests are forwarded with the client's original API key

## Supported APIs

| Provider | Endpoints | Base URL |
|----------|-----------|----------|
| Anthropic | `/anthropic/v1/messages` | `https://api.anthropic.com` |
| OpenAI | `/openai/v1/chat/completions`, `/openai/v1/models` | `https://api.openai.com` |
| Google Gemini | `/gemini/v1/chat/completions` | `https://generativelanguage.googleapis.com` |
| Groq | `/groq/v1/chat/completions` | `https://api.groq.com` |
| Vertex AI | `/vertexai/v1/predict`, `/vertexai/v1/models` | `https://us-central1-aiplatform.googleapis.com` |
| Claude-Gemini (Translation) | `/claude-gemini/v1/messages` | (translates Claude API to Gemini) |
| OpenRouter | `/openrouter/v1/chat/completions`, `/openrouter/v1/models` | `https://openrouter.ai/api/v1` |

📖 **For detailed endpoint documentation, see [ENDPOINTS.md](ENDPOINTS.md)**

## Quick Start

### Local Development

1. **Install dependencies**:
   ```bash
   pnpm install
   ```

2. **Set up environment variables**:
   Create a `.env` file in the root directory:
   ```bash
   # Copy the example and fill in your allowed client keys
   cp env.example .env
   ```

   Add your allowed client keys to `.env`:
   ```env
   ALLOWED_ANTHROPIC_KEYS=client-key-1,client-key-2,client-key-3
   ALLOWED_OPENAI_KEYS=client-key-1,client-key-2,client-key-3
   ALLOWED_GOOGLE_KEYS=client-key-1,client-key-2,client-key-3
   ALLOWED_GROQ_KEYS=client-key-1,client-key-2,client-key-3
   PORT=3000
   ```

3. **Run locally**:
   ```bash
   # Using Node.js with tsx
   pnpm dev:local
   
   # Or using the start script
   pnpm start
   ```

   The server will start on `http://localhost:3000`

### Cloudflare Workers

1. **Install Wrangler CLI** (if not already installed):
   ```bash
   pnpm add -g wrangler
   ```

2. **Configure environment variables**:
   Edit `wrangler.toml` and add your allowed client keys to the `[env.production.vars]` section:
   ```toml
   [env.production.vars]
   ALLOWED_ANTHROPIC_KEYS = "client-key-1,client-key-2,client-key-3"
   ALLOWED_OPENAI_KEYS = "client-key-1,client-key-2,client-key-3"
   ALLOWED_GOOGLE_KEYS = "client-key-1,client-key-2,client-key-3"
   ALLOWED_GROQ_KEYS = "client-key-1,client-key-2,client-key-3"
   ```

3. **Deploy to Cloudflare Workers**:
   ```bash
   # Deploy to production
   pnpm deploy
   
   # Deploy to staging
   pnpm deploy:staging
   ```

## Usage

### Authentication

All requests must include an API key in one of these formats:
- `X-API-Key: your-actual-api-key`
- `Authorization: Bearer your-actual-api-key`

**Important**: Use your actual API keys from the respective providers (Anthropic, OpenAI, Google, Groq), not the whitelist keys.

### Example Requests

#### OpenAI Chat Completions
```bash
curl -X POST http://localhost:3000/openai/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "X-API-Key: sk-your-actual-openai-key" \
  -d '{
    "model": "gpt-3.5-turbo",
    "messages": [
      {"role": "user", "content": "Hello"}
    ],
    "max_tokens": 100
  }'
```

#### Anthropic Messages
```bash
curl -X POST http://localhost:3000/anthropic/v1/messages \
  -H "Content-Type: application/json" \
  -H "X-API-Key: sk-ant-your-actual-anthropic-key" \
  -d '{
    "model": "claude-3-sonnet-20240229",
    "max_tokens": 100,
    "messages": [
      {"role": "user", "content": "Hello"}
    ]
  }'
```

#### Google Gemini
```bash
curl -X POST http://localhost:3000/gemini/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "X-API-Key: AIza-your-actual-google-key" \
  -d '{
    "model": "gemini-pro",
    "messages": [
      {"role": "user", "content": "Hello"}
    ],
    "max_tokens": 100
  }'
```

## Claude-Gemini Translation Endpoint

This endpoint allows you to use Anthropic Claude-style requests and receive Claude-style responses, but the request is actually fulfilled by Google Gemini. It is useful for clients/tools that expect the Claude API format but want to use Gemini models.

**Endpoint:**

```
POST /claude-gemini/v1/messages
```

**How it works:**
- Accepts requests in Anthropic Claude's `/v1/messages` format
- Translates the request to Gemini's API format (with model mapping)
- Forwards to Gemini using your Gemini API key (from `X-API-Key`)
- Translates the Gemini response back to Claude's format

**Model Mapping:**
- `haiku` → `gemini-2.5-flash`
- `sonnet`/`opus` → `gemini-2.5-pro`
- If the model starts with `gemini-`, uses as-is
- Otherwise, defaults to `gemini-2.5-flash`

**Request Example:**

```
curl -X POST http://localhost:3000/claude-gemini/v1/messages \
  -H "Content-Type: application/json" \
  -H "X-API-Key: <your-gemini-api-key>" \
  -d '{
    "model": "claude-3-sonnet-20240229",
    "messages": [{"role": "user", "content": "Hello, Gemini!"}],
    "max_tokens": 100
  }'
```

**Response Example:**

```
{
  "id": "msg_xxxxx",
  "type": "message",
  "role": "assistant",
  "content": [{"type": "text", "text": "Hello!"}],
  "model": "gemini-2.5-pro"
}
```

**Note:** The API key must be whitelisted in `ALLOWED_GOOGLE_KEYS`.

## OpenRouter Support

You can use OpenRouter as a drop-in OpenAI-compatible API provider. The proxy will forward requests to OpenRouter if you use the `/openrouter` prefix.

**Endpoints:**

- `/openrouter/v1/chat/completions`
- `/openrouter/v1/models`

**Authentication:**
- Use your OpenRouter API key in the `Authorization` header (as `Bearer <key>`) or in the `X-API-Key` header.
- The key must be whitelisted in `ALLOWED_OPENROUTER_KEYS`.

**Example:**

```
curl -X POST http://localhost:3000/openrouter/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "X-API-Key: <your-openrouter-key>" \
  -d '{
    "model": "openai/gpt-3.5-turbo",
    "messages": [{"role": "user", "content": "Hello, OpenRouter!"}]
  }'
```

**Note:**
- The proxy will forward all request/response data as-is to OpenRouter.
- You can use any model supported by OpenRouter (see their docs for model names).

## SDK Compatibility Tests

The project includes comprehensive SDK compatibility tests to ensure the proxy works correctly with official client libraries:

### Available SDK Tests

- **Anthropic SDK** (`test/sdk/anthropic-sdk.test.ts`): Tests compatibility with `@anthropic-ai/sdk`
- **OpenAI SDK** (`test/sdk/openai-sdk.test.ts`): Tests compatibility with `openai` package
- **Google Generative AI SDK** (`test/sdk/gemini-sdk.test.ts`): Tests compatibility with `@google/genai` (new SDK)
- **Groq SDK** (`test/sdk/groq-sdk.test.ts`): Tests compatibility with `groq-sdk`

### Running SDK Tests

```bash
# Run all SDK tests
pnpm test:sdks

# Run specific SDK tests
pnpm test test/sdk/anthropic-sdk.test.ts
pnpm test test/sdk/openai-sdk.test.ts
pnpm test test/sdk/gemini-sdk.test.ts
pnpm test test/sdk/groq-sdk.test.ts
```

### What SDK Tests Cover

Each SDK test suite includes:

1. **Basic Integration**: Tests that the SDK can successfully make requests through the proxy
2. **Streaming Support**: Tests streaming responses work correctly
3. **Error Handling**: Tests that errors from the underlying APIs are properly propagated
4. **Authentication**: Tests that invalid API keys are properly rejected
5. **Model Support**: Tests different models and endpoints for each provider

### SDK Dependencies

The following SDKs are installed as dev dependencies for testing:

```json
{
  "@anthropic-ai/sdk": "^0.57.0",
  "@google/genai": "^1.11.0",
  "groq-sdk": "^0.29.0",
  "openai": "^5.10.2"
}
```

These are only used for testing and are not included in the production deployment.

## Performance Optimizations

## Development

### Running Tests
```bash
# Run all tests
pnpm test

# Run tests in watch mode
pnpm test:watch

# Run tests with coverage
pnpm test:coverage
```

### Local Development with Wrangler
```