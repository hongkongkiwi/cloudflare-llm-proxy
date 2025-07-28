// Example: Using the Claude Proxy with Client Authentication
// Replace 'your-worker.your-subdomain.workers.dev' with your actual Cloudflare Workers URL

const PROXY_URL = 'https://your-worker.your-subdomain.workers.dev';
const CLIENT_API_KEY = 'your-client-api-key'; // Must be in the ALLOWED_CLIENT_KEYS list

async function sendMessage(message) {
  try {
    const response = await fetch(`${PROXY_URL}/v1/messages`, {
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

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error:', error);
    throw error;
  }
}

// Example usage
async function example() {
  try {
    const result = await sendMessage('Hello, Claude! How are you today?');
    console.log('Claude response:', result);
  } catch (error) {
    console.error('Failed to get response:', error);
  }
}

// Run the example
example(); 