const fs = require('fs');
const path = require('path');
const yaml = require('yaml');
const OpenAI = require('openai');

// Load environment variables from .env.local
const envPath = path.join(__dirname, '../.env.local');
if (fs.existsSync(envPath)) {
  const envFile = fs.readFileSync(envPath, 'utf8');
  envFile.split('\n').forEach(line => {
    const match = line.match(/^([^=]+)="?(.*?)"?$/);
    if (match) {
      process.env[match[1]] = match[2];
    }
  });
}

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

if (!process.env.OPENAI_API_KEY) {
  console.error('Error: OPENAI_API_KEY is not set in .env.local');
  process.exit(1);
}

// Load the landlord prompt
const promptPath = path.join(__dirname, '../prompt/talking-landlord.yaml');
const promptConfig = yaml.parse(fs.readFileSync(promptPath, 'utf8'));

// Test conversation
async function testLandlordPrompt() {
  // Prepare the system message with JSON instruction
  const systemMessage = {
    role: 'system',
    content: `${promptConfig.template}\n\nIMPORTANT: You must respond with a valid JSON object that includes the following fields: ai_reply, translation, correction (with correctedDutch and explanation), and suggestions (array of objects with dutch and english fields).`
  };

  const conversationHistory = [
    systemMessage,
    { role: 'user', content: 'Hoi, ik heb een probleem met mijn verwarming.' },
  ];
  
  console.log('System message prepared with JSON instruction');

  try {
    console.log('Sending request to OpenAI...');
    console.log('Prompt template:', promptConfig.template.substring(0, 200) + '...');
    
    const completion = await openai.chat.completions.create({
      model: 'gpt-4-1106-preview',
      messages: conversationHistory,
      temperature: 0.7,
      response_format: { type: 'json_object' },
    });

    console.log('Received response from OpenAI');
    const response = completion.choices[0].message.content;
    console.log('Raw response:', response);
    
    let parsedResponse;
    try {
      parsedResponse = typeof response === 'string' ? JSON.parse(response) : response;
      console.log('AI Reply:', parsedResponse.ai_reply || 'No reply');
      console.log('Translation:', parsedResponse.translation || 'No translation');
      console.log('Correction:', parsedResponse.correction || 'No correction');
      console.log('Suggestions:', parsedResponse.suggestions || 'No suggestions');
    } catch (parseError) {
      console.error('Error parsing response:', parseError);
      console.log('Raw response content:', response);
    }
  } catch (error) {
    console.error('Error testing landlord prompt:', error);
  }
}

testLandlordPrompt();
