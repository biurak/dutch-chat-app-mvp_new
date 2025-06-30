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

// Load the groceries prompt
const promptPath = path.join(__dirname, '../prompt/buying-groceries.yaml');
const promptConfig = yaml.parse(fs.readFileSync(promptPath, 'utf8'));

// Helper function to run a single test case
async function runTest(userInput, systemMessage) {
  console.log('\n=== Test Case ===');
  console.log(`User: ${userInput}`);
  
  const conversationHistory = [
    systemMessage,
    { role: 'user', content: userInput },
  ];

  try {
    const completion = await openai.chat.completions.create({
      model: 'gpt-4-1106-preview',
      messages: conversationHistory,
      temperature: 0.7,
      response_format: { type: 'json_object' },
    });

    const response = completion.choices[0].message.content;
    const parsedResponse = typeof response === 'string' ? JSON.parse(response) : response;
    
    console.log('\nAI Reply:', parsedResponse.ai_reply);
    console.log('Translation:', parsedResponse.translation);
    
    if (parsedResponse.correction && Object.keys(parsedResponse.correction).length > 0) {
      console.log('\nCorrection:');
      console.log('- Original:', userInput);
      console.log('- Corrected:', parsedResponse.correction.correctedDutch);
      console.log('- Explanation:', parsedResponse.correction.explanation);
    }
    
    console.log('\nSuggestions:');
    (parsedResponse.suggestions || []).forEach((s, i) => {
      console.log(`${i + 1}. NL: ${s.dutch}`);
      console.log(`   EN: ${s.english}`);
    });
    
    return parsedResponse;
  } catch (error) {
    console.error('Error in test:', error);
    return null;
  }
}

// Main test function
async function testGroceriesPrompt() {
  // Prepare the system message with JSON instruction
  const systemMessage = {
    role: 'system',
    content: `${promptConfig.template}\n\nIMPORTANT: You must respond with a valid JSON object that includes the following fields: ai_reply, translation, correction (with correctedDutch and explanation), and suggestions (array of objects with dutch and english fields).`
  };

  // Test case 1: Asking for product location
  await runTest('Waar kan ik de melk vinden?', systemMessage);
  
  // Test case 2: Asking about product availability
  await runTest('Heeft u verse aardbeien?', systemMessage);
  
  // Test case 3: Checking out
  await runTest('Ik wil graag afrekenen', systemMessage);
  
  // Test case 4: With a grammatical error to test correction
  await runTest('Waar is de brood', systemMessage);
  
  // Test case 5: Asking about prices
  await runTest('Hoeveel kost de kaas?', systemMessage);
}

testGroceriesPrompt();
