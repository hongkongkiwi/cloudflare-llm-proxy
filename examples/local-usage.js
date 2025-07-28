#!/usr/bin/env node

/**
 * Example usage of Claude Proxy running locally
 * 
 * Make sure the server is running with: pnpm dev:local
 */

const PROXY_URL = 'http://localhost:3000';
const CLIENT_API_KEY = 'client-key-1';

async function testOpenAI() {
  console.log('🤖 Testing OpenAI...');
  
  try {
    const response = await fetch(`${PROXY_URL}/openai/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': CLIENT_API_KEY,
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'user', content: 'Hello! What is 2+2?' }
        ],
        max_tokens: 100,
      }),
    });

    if (response.ok) {
      const data = await response.json();
      console.log('✅ OpenAI Response:', data.choices[0].message.content);
    } else {
      console.error('❌ OpenAI Error:', response.status, await response.text());
    }
  } catch (error) {
    console.error('❌ OpenAI Request failed:', error.message);
  }
}

async function testAnthropic() {
  console.log('\n🤖 Testing Anthropic...');
  
  try {
    const response = await fetch(`${PROXY_URL}/anthropic/v1/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': CLIENT_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-3-sonnet-20240229',
        max_tokens: 100,
        messages: [
          { role: 'user', content: 'Hello! What is 2+2?' }
        ],
      }),
    });

    if (response.ok) {
      const data = await response.json();
      console.log('✅ Anthropic Response:', data.content[0].text);
    } else {
      console.error('❌ Anthropic Error:', response.status, await response.text());
    }
  } catch (error) {
    console.error('❌ Anthropic Request failed:', error.message);
  }
}

async function testGemini() {
  console.log('\n🤖 Testing Google Gemini...');
  
  try {
    const response = await fetch(`${PROXY_URL}/gemini/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': CLIENT_API_KEY,
      },
      body: JSON.stringify({
        model: 'gemini-pro',
        messages: [
          { role: 'user', content: 'Hello! What is 2+2?' }
        ],
        max_tokens: 100,
      }),
    });

    if (response.ok) {
      const data = await response.json();
      console.log('✅ Gemini Response:', data.candidates[0].content.parts[0].text);
    } else {
      console.error('❌ Gemini Error:', response.status, await response.text());
    }
  } catch (error) {
    console.error('❌ Gemini Request failed:', error.message);
  }
}

async function testGroq() {
  console.log('\n🤖 Testing Groq...');
  
  try {
    const response = await fetch(`${PROXY_URL}/groq/v1/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': CLIENT_API_KEY,
      },
      body: JSON.stringify({
        model: 'llama3-8b-8192',
        messages: [
          { role: 'user', content: 'Hello! What is 2+2?' }
        ],
        max_tokens: 100,
      }),
    });

    if (response.ok) {
      const data = await response.json();
      console.log('✅ Groq Response:', data.choices[0].message.content);
    } else {
      console.error('❌ Groq Error:', response.status, await response.text());
    }
  } catch (error) {
    console.error('❌ Groq Request failed:', error.message);
  }
}

async function testModels() {
  console.log('\n📋 Testing Models Endpoints...');
  
  try {
    // Test OpenAI models
    const openaiResponse = await fetch(`${PROXY_URL}/openai/v1/models`, {
      headers: {
        'X-API-Key': CLIENT_API_KEY,
      },
    });
    
    if (openaiResponse.ok) {
      const data = await openaiResponse.json();
      console.log('✅ OpenAI Models:', data.data.length, 'models available');
    } else {
      console.error('❌ OpenAI Models Error:', openaiResponse.status);
    }
  } catch (error) {
    console.error('❌ Models Request failed:', error.message);
  }
}

async function runAllTests() {
  console.log('🚀 Starting Claude Proxy Tests...\n');
  
  await testOpenAI();
  await testAnthropic();
  await testGemini();
  await testGroq();
  await testModels();
  
  console.log('\n✨ All tests completed!');
}

// Run the tests
runAllTests().catch(console.error); 