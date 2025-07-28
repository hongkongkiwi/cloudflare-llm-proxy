# LLM Endpoints Documentation

This document provides comprehensive documentation for all LLM endpoints supported by the Cloudflare LLM Proxy.

## Overview

The Cloudflare LLM Proxy supports multiple AI providers through a unified API interface. Each provider has its own endpoint prefix and maintains compatibility with their respective API formats.

## Authentication

All endpoints require authentication using one of these methods:
- `X-API-Key: your-actual-api-key`
- `Authorization: Bearer your-actual-api-key`

**Important**: Use your actual API keys from the respective providers, not the whitelist keys configured in the proxy.

## Supported Providers

| Provider | Base URL | API Key Header | Default Version |
|----------|----------|----------------|-----------------|
| Anthropic | `https://api.anthropic.com` | `x-api-key` | `2023-06-01` |
| OpenAI | `https://api.openai.com` | `Authorization` | `2024-01-01` |
| Google Gemini | `https://generativelanguage.googleapis.com` | `x-goog-api-key` | `2024-01-01` |
| Groq | `https://api.groq.com` | `Authorization` | `2024-01-01` |
| Vertex AI | `https://us-central1-aiplatform.googleapis.com` | `Authorization` | `2024-01-01` |
| OpenRouter | `https://openrouter.ai` | `Authorization` | N/A |

---

## 1. Anthropic Claude API

### Base Path: `/anthropic`

#### Endpoints

##### POST `/anthropic/v1/messages`
**Description**: Send messages to Claude models

**Headers**:
- `Content-Type: application/json`
- `X-API-Key: sk-ant-your-anthropic-key`
- `anthropic-version: 2023-06-01` (optional, defaults to 2023-06-01)

**Request Body**:
```json
{
  "model": "claude-3-sonnet-20240229",
  "max_tokens": 1024,
  "messages": [
    {
      "role": "user",
      "content": "Hello, Claude!"
    }
  ],
  "system": "You are a helpful assistant." // optional
}
```

**Response**:
```json
{
  "id": "msg_1234567890",
  "type": "message",
  "role": "assistant",
  "content": [
    {
      "type": "text",
      "text": "Hello! I'm Claude, an AI assistant created by Anthropic."
    }
  ],
  "model": "claude-3-sonnet-20240229",
  "usage": {
    "input_tokens": 10,
    "output_tokens": 15
  }
}
```

**Example**:
```bash
curl -X POST https://your-proxy.workers.dev/anthropic/v1/messages \
  -H "Content-Type: application/json" \
  -H "X-API-Key: sk-ant-your-anthropic-key" \
  -d '{
    "model": "claude-3-sonnet-20240229",
    "max_tokens": 100,
    "messages": [
      {"role": "user", "content": "Hello"}
    ]
  }'
```

---

## 2. OpenAI API

### Base Path: `/openai`

#### Endpoints

##### POST `/openai/v1/chat/completions`
**Description**: Generate chat completions using OpenAI models

**Headers**:
- `Content-Type: application/json`
- `X-API-Key: sk-your-openai-key`
- `openai-version: 2024-01-01` (optional, defaults to 2024-01-01)

**Request Body**:
```json
{
  "model": "gpt-4",
  "messages": [
    {
      "role": "user",
      "content": "Hello, GPT!"
    }
  ],
  "max_tokens": 100,
  "temperature": 0.7,
  "stream": false
}
```

**Response**:
```json
{
  "id": "chatcmpl-1234567890",
  "object": "chat.completion",
  "created": 1677652288,
  "model": "gpt-4",
  "choices": [
    {
      "index": 0,
      "message": {
        "role": "assistant",
        "content": "Hello! I'm GPT-4, an AI assistant."
      },
      "finish_reason": "stop"
    }
  ],
  "usage": {
    "prompt_tokens": 10,
    "completion_tokens": 15,
    "total_tokens": 25
  }
}
```

**Example**:
```bash
curl -X POST https://your-proxy.workers.dev/openai/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "X-API-Key: sk-your-openai-key" \
  -d '{
    "model": "gpt-4",
    "messages": [
      {"role": "user", "content": "Hello"}
    ],
    "max_tokens": 100
  }'
```

##### GET `/openai/v1/models`
**Description**: List available OpenAI models

**Headers**:
- `X-API-Key: sk-your-openai-key`

**Response**:
```json
{
  "object": "list",
  "data": [
    {
      "id": "gpt-4",
      "object": "model",
      "created": 1677610602,
      "owned_by": "openai"
    }
  ]
}
```

**Example**:
```bash
curl -X GET https://your-proxy.workers.dev/openai/v1/models \
  -H "X-API-Key: sk-your-openai-key"
```

---

## 3. Google Gemini API

### Base Path: `/gemini`

#### Endpoints

##### POST `/gemini/v1/chat/completions`
**Description**: Generate chat completions using Google Gemini models

**Headers**:
- `Content-Type: application/json`
- `X-API-Key: AIza-your-google-key`

**Request Body**:
```json
{
  "model": "gemini-pro",
  "messages": [
    {
      "role": "user",
      "content": "Hello, Gemini!"
    }
  ],
  "max_tokens": 100,
  "temperature": 0.7
}
```

**Response**:
```json
{
  "id": "gemini-1234567890",
  "model": "gemini-pro",
  "choices": [
    {
      "index": 0,
      "message": {
        "role": "assistant",
        "content": "Hello! I'm Gemini, an AI assistant."
      },
      "finish_reason": "stop"
    }
  ],
  "usage": {
    "prompt_tokens": 10,
    "completion_tokens": 15,
    "total_tokens": 25
  }
}
```

**Example**:
```bash
curl -X POST https://your-proxy.workers.dev/gemini/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "X-API-Key: AIza-your-google-key" \
  -d '{
    "model": "gemini-pro",
    "messages": [
      {"role": "user", "content": "Hello"}
    ],
    "max_tokens": 100
  }'
```

---

## 4. Groq API

### Base Path: `/groq`

#### Endpoints

##### POST `/groq/v1/chat/completions`
**Description**: Generate chat completions using Groq models

**Headers**:
- `Content-Type: application/json`
- `X-API-Key: gsk-your-groq-key`

**Request Body**:
```json
{
  "model": "llama3-8b-8192",
  "messages": [
    {
      "role": "user",
      "content": "Hello, Groq!"
    }
  ],
  "max_tokens": 100,
  "temperature": 0.7
}
```

**Response**:
```json
{
  "id": "groq-1234567890",
  "model": "llama3-8b-8192",
  "choices": [
    {
      "index": 0,
      "message": {
        "role": "assistant",
        "content": "Hello! I'm running on Groq's infrastructure."
      },
      "finish_reason": "stop"
    }
  ],
  "usage": {
    "prompt_tokens": 10,
    "completion_tokens": 15,
    "total_tokens": 25
  }
}
```

**Example**:
```bash
curl -X POST https://your-proxy.workers.dev/groq/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "X-API-Key: gsk-your-groq-key" \
  -d '{
    "model": "llama3-8b-8192",
    "messages": [
      {"role": "user", "content": "Hello"}
    ],
    "max_tokens": 100
  }'
```

---

## 5. Google Vertex AI API

### Base Path: `/vertexai`

#### Endpoints

##### POST `/vertexai/v1/predict`
**Description**: Generate predictions using Vertex AI models

**Headers**:
- `Content-Type: application/json`
- `X-API-Key: Bearer your-google-token`

**Request Body**:
```json
{
  "model": "gemini-pro",
  "messages": [
    {
      "role": "user",
      "content": "Hello, Vertex AI!"
    }
  ],
  "max_tokens": 100
}
```

**Response**:
```json
{
  "predictions": [
    {
      "candidates": [
        {
          "content": {
            "parts": [
              {
                "text": "Hello! I'm running on Google Vertex AI."
              }
            ]
          }
        }
      ]
    }
  ]
}
```

**Example**:
```bash
curl -X POST https://your-proxy.workers.dev/vertexai/v1/predict \
  -H "Content-Type: application/json" \
  -H "X-API-Key: Bearer your-google-token" \
  -d '{
    "model": "gemini-pro",
    "messages": [
      {"role": "user", "content": "Hello"}
    ],
    "max_tokens": 100
  }'
```

##### GET `/vertexai/v1/models`
**Description**: List available Vertex AI models

**Headers**:
- `X-API-Key: Bearer your-google-token`

**Response**:
```json
{
  "models": [
    {
      "name": "projects/123456789/locations/us-central1/models/gemini-pro",
      "displayName": "Gemini Pro"
    }
  ]
}
```

**Example**:
```bash
curl -X GET https://your-proxy.workers.dev/vertexai/v1/models \
  -H "X-API-Key: Bearer your-google-token"
```

---

## 6. OpenRouter API

### Base Path: `/openrouter`

#### Endpoints

##### POST `/openrouter/v1/chat/completions`
**Description**: Generate chat completions using OpenRouter (OpenAI-compatible)

**Headers**:
- `Content-Type: application/json`
- `X-API-Key: sk-or-your-openrouter-key`

**Request Body**:
```json
{
  "model": "openai/gpt-3.5-turbo",
  "messages": [
    {
      "role": "user",
      "content": "Hello, OpenRouter!"
    }
  ],
  "max_tokens": 100,
  "temperature": 0.7
}
```

**Response**:
```json
{
  "id": "openrouter-1234567890",
  "model": "openai/gpt-3.5-turbo",
  "choices": [
    {
      "index": 0,
      "message": {
        "role": "assistant",
        "content": "Hello! I'm running through OpenRouter."
      },
      "finish_reason": "stop"
    }
  ],
  "usage": {
    "prompt_tokens": 10,
    "completion_tokens": 15,
    "total_tokens": 25
  }
}
```

**Example**:
```bash
curl -X POST https://your-proxy.workers.dev/openrouter/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "X-API-Key: sk-or-your-openrouter-key" \
  -d '{
    "model": "openai/gpt-3.5-turbo",
    "messages": [
      {"role": "user", "content": "Hello"}
    ],
    "max_tokens": 100
  }'
```

##### GET `/openrouter/v1/models`
**Description**: List available OpenRouter models

**Headers**:
- `X-API-Key: sk-or-your-openrouter-key`

**Response**:
```json
{
  "object": "list",
  "data": [
    {
      "id": "openai/gpt-3.5-turbo",
      "object": "model",
      "created": 1677610602,
      "owned_by": "openai"
    }
  ]
}
```

**Example**:
```bash
curl -X GET https://your-proxy.workers.dev/openrouter/v1/models \
  -H "X-API-Key: sk-or-your-openrouter-key"
```

---

## 7. Claude-Gemini Translation API

### Base Path: `/claude-gemini`

#### Endpoints

##### POST `/claude-gemini/v1/messages`
**Description**: Use Claude API format to interact with Gemini models

**Headers**:
- `Content-Type: application/json`
- `X-API-Key: AIza-your-google-key` (Gemini API key)

**Request Body**:
```json
{
  "model": "claude-3-sonnet-20240229",
  "messages": [
    {
      "role": "user",
      "content": "Hello, Gemini via Claude format!"
    }
  ],
  "max_tokens": 100
}
```

**Model Mapping**:
- `claude-3-haiku-20240307` → `gemini-2.5-flash`
- `claude-3-sonnet-20240229` → `gemini-2.5-pro`
- `claude-3-opus-20240229` → `gemini-2.5-pro`
- Models starting with `gemini-` are used as-is
- Default: `gemini-2.5-flash`

**Response**:
```json
{
  "id": "msg_1234567890",
  "type": "message",
  "role": "assistant",
  "content": [
    {
      "type": "text",
      "text": "Hello! I'm Gemini responding in Claude format."
    }
  ],
  "model": "gemini-2.5-pro",
  "usage": {
    "input_tokens": 10,
    "output_tokens": 15
  }
}
```

**Example**:
```bash
curl -X POST https://your-proxy.workers.dev/claude-gemini/v1/messages \
  -H "Content-Type: application/json" \
  -H "X-API-Key: AIza-your-google-key" \
  -d '{
    "model": "claude-3-sonnet-20240229",
    "messages": [
      {"role": "user", "content": "Hello"}
    ],
    "max_tokens": 100
  }'
```

---

## Streaming Support

All chat completion endpoints support streaming responses. To enable streaming:

1. Add `"stream": true` to your request body
2. Handle the response as a stream of Server-Sent Events (SSE)

**Example (OpenAI)**:
```bash
curl -X POST https://your-proxy.workers.dev/openai/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "X-API-Key: sk-your-openai-key" \
  -d '{
    "model": "gpt-4",
    "messages": [
      {"role": "user", "content": "Write a story"}
    ],
    "stream": true
  }'
```

**Streaming Response Format**:
```
data: {"id":"chatcmpl-123","object":"chat.completion.chunk","choices":[{"index":0,"delta":{"content":"Hello"},"finish_reason":null}]}

data: {"id":"chatcmpl-123","object":"chat.completion.chunk","choices":[{"index":0,"delta":{"content":" world"},"finish_reason":null}]}

data: [DONE]
```

---

## Error Handling

All endpoints return standard HTTP status codes:

- `200 OK`: Successful request
- `400 Bad Request`: Invalid request format
- `401 Unauthorized`: Missing or invalid API key
- `403 Forbidden`: API key not in whitelist
- `500 Internal Server Error`: Server error

**Error Response Format**:
```json
{
  "error": "Error type",
  "message": "Detailed error message",
  "details": "Additional error details (if available)"
}
```

---

## CORS Support

All endpoints include CORS headers for web applications:

- `Access-Control-Allow-Origin: *`
- `Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS`
- `Access-Control-Allow-Headers: Content-Type, Authorization, X-API-Key, anthropic-version, openai-version, x-goog-api-key`

---

## Security Features

### IP Masking
The proxy automatically masks client IP addresses and location information by removing headers such as:
- `X-Forwarded-For`
- `X-Real-IP`
- `CF-Connecting-IP`
- `CF-IPCountry`

### Whitelist Authentication
Each provider has its own whitelist of allowed API keys configured in the environment variables:
- `ALLOWED_ANTHROPIC_KEYS`
- `ALLOWED_OPENAI_KEYS`
- `ALLOWED_GOOGLE_KEYS`
- `ALLOWED_GROQ_KEYS`
- `ALLOWED_OPENROUTER_KEYS`

---

## Rate Limiting

The proxy forwards rate limits from the underlying APIs. Check the respective provider documentation for rate limit details.

---

## SDK Compatibility

The proxy is designed to be compatible with official SDKs:

- **Anthropic**: `@anthropic-ai/sdk`
- **OpenAI**: `openai` package
- **Google**: `@google/genai`
- **Groq**: `groq-sdk`

See the `test/sdk/` directory for SDK compatibility tests.

---

## Local Development

For local development, the proxy runs on `http://localhost:3000` by default. All endpoints work the same way as in production.

**Start local server**:
```bash
pnpm dev:local
```

**Test endpoints locally**:
```bash
curl -X POST http://localhost:3000/openai/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "X-API-Key: your-openai-key" \
  -d '{"model":"gpt-3.5-turbo","messages":[{"role":"user","content":"Hello"}]}'
``` 