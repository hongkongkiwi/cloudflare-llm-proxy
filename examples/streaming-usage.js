// Example: Using the Claude Proxy with Streaming and Client Authentication
// Replace 'your-worker.your-subdomain.workers.dev' with your actual Cloudflare Workers URL

const PROXY_URL = 'https://your-worker.your-subdomain.workers.dev';
const CLIENT_API_KEY = 'your-client-api-key'; // Must be in the ALLOWED_CLIENT_KEYS list

async function streamMessage(message) {
  try {
    const response = await fetch(`${PROXY_URL}/v1/messages/stream`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'anthropic-version': '2023-06-01',
        'X-API-Key': CLIENT_API_KEY, // Must match one in ALLOWED_CLIENT_KEYS
      },
      body: JSON.stringify({
        model: 'claude-3-sonnet-20240229',
        max_tokens: 1024,
        messages: [
          {
            role: 'user',
            content: message
          }
        ]
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`HTTP error! status: ${response.status}, message: ${errorData.message || 'Unknown error'}`);
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      
      if (done) {
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
            if (parsed.type === 'content_block_delta' && parsed.delta?.text) {
              process.stdout.write(parsed.delta.text);
            }
          } catch (e) {
            // Ignore parsing errors for incomplete JSON
          }
        }
      }
    }
  } catch (error) {
    console.error('Error:', error);
    throw error;
  }
}

// Example usage
async function example() {
  try {
    console.log('Starting streaming response...\n');
    await streamMessage('Write a short story about a robot learning to paint.');
  } catch (error) {
    console.error('Failed to get streaming response:', error);
  }
}

// Run the example
example(); 