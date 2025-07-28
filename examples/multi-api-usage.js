// Multi-AI API Proxy Usage Examples
// Replace 'your-worker.your-subdomain.workers.dev' with your actual Cloudflare Workers URL

const PROXY_URL = 'https://your-worker.your-subdomain.workers.dev';
const CLIENT_API_KEY = 'your-client-api-key'; // Must be in the ALLOWED_CLIENT_KEYS list

// Helper function to make API requests
async function makeApiRequest(provider, endpoint, options = {}) {
  const url = `${PROXY_URL}/${provider}${endpoint}`;
  const response = await fetch(url, {
    method: options.method || 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': CLIENT_API_KEY,
      ...options.headers,
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`API request failed: ${error.message || response.statusText}`);
  }

  return response.json();
}

// 1. Anthropic Claude API
async function anthropicExample() {
  console.log('🤖 Using Anthropic Claude API...');
  
  const response = await makeApiRequest('anthropic', '/v1/messages', {
    headers: {
      'anthropic-version': '2023-06-01',
    },
    body: {
      model: 'claude-3-sonnet-20240229',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: 'Hello, Claude! What can you help me with?'
        }
      ]
    }
  });

  console.log('Claude response:', response);
  return response;
}

// 2. OpenAI API
async function openaiExample() {
  console.log('🤖 Using OpenAI API...');
  
  const response = await makeApiRequest('openai', '/v1/chat/completions', {
    headers: {
      'openai-version': '2024-01-01',
    },
    body: {
      model: 'gpt-4',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: 'Hello, GPT! What can you help me with?'
        }
      ]
    }
  });

  console.log('OpenAI response:', response);
  return response;
}

// 3. Google Gemini API
async function geminiExample() {
  console.log('🤖 Using Google Gemini API...');
  
  const response = await makeApiRequest('gemini', '/v1/chat/completions', {
    body: {
      model: 'gemini-pro',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: 'Hello, Gemini! What can you help me with?'
        }
      ]
    }
  });

  console.log('Gemini response:', response);
  return response;
}

// 4. Groq API
async function groqExample() {
  console.log('🤖 Using Groq API...');
  
  const response = await makeApiRequest('groq', '/v1/chat/completions', {
    body: {
      model: 'llama3-8b-8192',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: 'Hello, Groq! What can you help me with?'
        }
      ]
    }
  });

  console.log('Groq response:', response);
  return response;
}

// 5. Google Vertex AI API
async function vertexAiExample() {
  console.log('🤖 Using Google Vertex AI API...');
  
  const response = await makeApiRequest('vertexai', '/v1/chat/completions', {
    body: {
      model: 'gemini-pro',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: 'Hello, Vertex AI! What can you help me with?'
        }
      ]
    }
  });

  console.log('Vertex AI response:', response);
  return response;
}

// 6. List available models for each provider
async function listModels() {
  console.log('📋 Listing available models...');
  
  const providers = ['anthropic', 'openai', 'groq'];
  
  for (const provider of providers) {
    try {
      const models = await makeApiRequest(provider, '/v1/models', {
        method: 'GET',
        headers: {
          'anthropic-version': '2023-06-01',
          'openai-version': '2024-01-01',
        },
      });
      
      console.log(`${provider.toUpperCase()} models:`, models);
    } catch (error) {
      console.log(`${provider.toUpperCase()} models: Error - ${error.message}`);
    }
  }
}

// 7. Streaming example with OpenAI
async function streamingExample() {
  console.log('🌊 Using OpenAI streaming...');
  
  const response = await fetch(`${PROXY_URL}/openai/v1/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': CLIENT_API_KEY,
      'openai-version': '2024-01-01',
    },
    body: JSON.stringify({
      model: 'gpt-4',
      max_tokens: 1024,
      stream: true,
      messages: [
        {
          role: 'user',
          content: 'Write a short story about a robot learning to paint.'
        }
      ]
    })
  });

  if (!response.ok) {
    throw new Error(`Streaming request failed: ${response.statusText}`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();

  console.log('Streaming response:');
  while (true) {
    const { done, value } = await reader.read();
    
    if (done) {
      console.log('\n--- Stream complete ---');
      break;
    }

    const chunk = decoder.decode(value);
    const lines = chunk.split('\n');

    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const data = line.slice(6);
        
        if (data === '[DONE]') {
          console.log('\n--- Stream complete ---');
          return;
        }

        try {
          const parsed = JSON.parse(data);
          if (parsed.choices?.[0]?.delta?.content) {
            process.stdout.write(parsed.choices[0].delta.content);
          }
        } catch (e) {
          // Ignore parsing errors for incomplete JSON
        }
      }
    }
  }
}

// 8. Error handling example
async function errorHandlingExample() {
  console.log('⚠️ Testing error handling...');
  
  try {
    // Test with invalid API key
    const response = await fetch(`${PROXY_URL}/anthropic/v1/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': 'invalid-key',
      },
      body: JSON.stringify({
        model: 'claude-3-sonnet-20240229',
        max_tokens: 100,
        messages: [{ role: 'user', content: 'Hello' }],
      })
    });

    if (!response.ok) {
      const error = await response.json();
      console.log('Expected error:', error);
    }
  } catch (error) {
    console.log('Error caught:', error.message);
  }
}

// 9. IP masking test
async function ipMaskingTest() {
  console.log('🔒 Testing IP masking...');
  
  // This request would normally include client IP headers
  // The proxy should mask these before forwarding to the API
  const response = await fetch(`${PROXY_URL}/anthropic/v1/messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': CLIENT_API_KEY,
      'X-Forwarded-For': '192.168.1.100',
      'X-Real-IP': '192.168.1.100',
      'CF-Connecting-IP': '192.168.1.100',
      'CF-IPCountry': 'US',
      'User-Agent': 'Test-Browser/1.0',
    },
    body: JSON.stringify({
      model: 'claude-3-sonnet-20240229',
      max_tokens: 100,
      messages: [{ role: 'user', content: 'Test IP masking' }],
    })
  });

  console.log('IP masking test completed');
  return response;
}

// Run examples
async function runExamples() {
  try {
    console.log('🚀 Multi-AI API Proxy Examples\n');
    
    // Test IP masking
    await ipMaskingTest();
    console.log('\n' + '='.repeat(50) + '\n');
    
    // List available models
    await listModels();
    console.log('\n' + '='.repeat(50) + '\n');
    
    // Test each API provider
    await anthropicExample();
    console.log('\n' + '='.repeat(50) + '\n');
    
    await openaiExample();
    console.log('\n' + '='.repeat(50) + '\n');
    
    await groqExample();
    console.log('\n' + '='.repeat(50) + '\n');
    
    // Note: Gemini and Vertex AI examples may need adjustments based on actual API format
    // await geminiExample();
    // await vertexAiExample();
    
    // Error handling example
    await errorHandlingExample();
    console.log('\n' + '='.repeat(50) + '\n');
    
    // Streaming example
    await streamingExample();
    
  } catch (error) {
    console.error('❌ Example failed:', error.message);
  }
}

// Run the examples
runExamples(); 