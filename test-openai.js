// Simple test script to verify OpenAI API connection
require('dotenv').config({ path: '.env.local' });
const OpenAI = require('openai');

console.log('Loading OpenAI with API key:', process.env.OPENAI_API_KEY ? 'Key found' + (process.env.OPENAI_API_KEY.startsWith('sk-') ? ' (starts with sk-)' : ' (invalid format)') : 'No key found');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

async function testOpenAI() {
  try {
    console.log('Testing OpenAI API connection...');
    
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'You are a helpful assistant.' },
        { role: 'user', content: 'Say hello in Dutch' }
      ],
      max_tokens: 50,
    });

    console.log('API Response:', JSON.stringify(response, null, 2));
    console.log('Success! OpenAI API is working correctly.');
    console.log('Response:', response.choices[0]?.message?.content);
  } catch (error) {
    console.error('Error testing OpenAI API:');
    console.error(error.message);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    }
    process.exit(1);
  }
}

testOpenAI();
