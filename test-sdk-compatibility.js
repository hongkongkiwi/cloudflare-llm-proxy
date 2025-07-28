#!/usr/bin/env node

const { OpenAI } = require('openai');
const Anthropic = require('@anthropic-ai/sdk');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const Groq = require('groq-sdk');

const BASE_URL = 'http://localhost:3001';

async function testOpenAI() {
  console.log('🧪 Testing OpenAI SDK...');
  
  const openai = new OpenAI({
    apiKey: 'client-key-1',
    baseURL: `${BASE_URL}/openai`,
  });

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: 'Say hello!' }],
      max_tokens: 50
    });
    
    console.log('✅ OpenAI SDK test passed');
    console.log('Response:', completion.choices[0].message.content);
  } catch (error) {
    console.log('❌ OpenAI SDK test failed:', error.message);
  }
}

async function testAnthropic() {
  console.log('\n🧪 Testing Anthropic SDK...');
  
  const anthropic = new Anthropic({
    apiKey: 'client-key-1',
    baseURL: `${BASE_URL}/anthropic`,
  });

  try {
    const message = await anthropic.messages.create({
      model: 'claude-3-sonnet-20240229',
      max_tokens: 50,
      messages: [{ role: 'user', content: 'Say hello!' }]
    });
    
    console.log('✅ Anthropic SDK test passed');
    console.log('Response:', message.content[0].text);
  } catch (error) {
    console.log('❌ Anthropic SDK test failed:', error.message);
  }
}

async function testGroq() {
  console.log('\n🧪 Testing Groq SDK...');
  
  const groq = new Groq({
    apiKey: 'client-key-1',
    baseURL: `${BASE_URL}/groq`,
  });

  try {
    const completion = await groq.chat.completions.create({
      model: 'llama3-8b-8192',
      messages: [{ role: 'user', content: 'Say hello!' }],
      max_tokens: 50
    });
    
    console.log('✅ Groq SDK test passed');
    console.log('Response:', completion.choices[0].message.content);
  } catch (error) {
    console.log('❌ Groq SDK test failed:', error.message);
  }
}

async function testGemini() {
  console.log('\n🧪 Testing Google Generative AI SDK...');
  
  const genAI = new GoogleGenerativeAI('client-key-1');
  
  try {
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
    const result = await model.generateContent('Say hello!');
    
    console.log('✅ Google Generative AI SDK test passed');
    console.log('Response:', result.response.text());
  } catch (error) {
    console.log('❌ Google Generative AI SDK test failed:', error.message);
  }
}

async function runAllTests() {
  console.log('🚀 Starting SDK Compatibility Tests...\n');
  
  await testOpenAI();
  await testAnthropic();
  await testGroq();
  await testGemini();
  
  console.log('\n✨ SDK compatibility tests completed!');
}

// Wait for server to start
setTimeout(runAllTests, 2000); 