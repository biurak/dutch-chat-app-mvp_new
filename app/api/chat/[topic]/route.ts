import { NextResponse } from 'next/server';
import { loadPromptConfig } from '@/lib/prompt-loader';
import { generateAIResponse } from '@/lib/openai-service';

type Message = {
  role: 'user' | 'assistant' | 'system';
  content: string;
};

interface ChatRequest {
  messages: Message[];
  user_input?: string;
}

interface ChatRequest {
  messages: Array<{
    role: 'user' | 'assistant' | 'system';
    content: string;
  }>;
  user_input?: string;
}

export async function POST(
  request: Request,
  { params }: { params: { topic: string } }
) {
  // Extract topic from params
  const topic = params.topic;
  console.log('Received request for topic:', topic);
  
  if (!topic) {
    return new Response(
      JSON.stringify({ error: 'Topic is required' }), 
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }
  
  // Parse the request body
  let messages: Message[] = [];
  let user_input = '';
  
  try {
    const requestBody = await request.json();
    messages = requestBody.messages || [];
    user_input = requestBody.user_input || '';
  } catch (e) {
    const error = e as Error;
    console.error('Error parsing request body:', error);
    return NextResponse.json(
      { 
        error: 'Failed to generate response',
        ai_reply: 'Sorry, I encountered an error while generating a response.',
        translation: 'Het spijt me, er is een fout opgetreden bij het genereren van een antwoord.',
        correction: { correctedDutch: '', explanation: '' },
        suggestions: [
          { dutch: "Kunt u dat herhalen alstublieft?", english: "Can you repeat that please?" },
          { dutch: "Ik begrijp het niet helemaal.", english: "I don't quite understand." },
          { dutch: "Kunt u langzamer praten?", english: "Can you speak more slowly?" }
        ]
      },
      { status: 400 }
    );
  }
  
  // Ensure we have at least one message or user input
  if (messages.length === 0 && !user_input) {
    console.error('No messages or user input provided');
    return NextResponse.json(
      { 
        error: 'No messages or user input provided',
        ai_reply: 'Please provide a message to continue the conversation.',
        translation: 'Geef alstublieft een bericht op om het gesprek voort te zetten.',
        correction: { correctedDutch: '', explanation: '' },
        suggestions: [
          { dutch: "Hallo, hoe gaat het?", english: "Hello, how are you?" },
          { dutch: "Wat is het weer vandaag?", english: "What's the weather like today?" },
          { dutch: "Kunt u me helpen?", english: "Can you help me?" }
        ]
      },
      { status: 400 }
    );
  }
    
  try {
    // Debug: Log environment info
    console.log('Environment Info:', {
      nodeEnv: process.env.NODE_ENV,
      openaiKey: process.env.OPENAI_API_KEY ? '***' + process.env.OPENAI_API_KEY.slice(-4) : 'Not set',
      openaiBaseUrl: process.env.OPENAI_API_BASE || 'default',
      topic: topic
    });

    // Load the prompt configuration for the topic
    console.log('Loading prompt config for topic:', topic);
    // Normalize the topic name to match file naming (convert underscores to hyphens)
    const normalizedTopic = topic.toLowerCase().replace(/_/g, '-');
    console.log('Normalized topic for file lookup:', normalizedTopic);
    
    let promptConfig;
    try {
      promptConfig = await loadPromptConfig(normalizedTopic);
      console.log('Successfully loaded prompt config');
    } catch (error) {
      console.error('Error loading prompt config:', error);
      return NextResponse.json(
        { 
          error: 'Failed to load prompt configuration',
          ai_reply: 'Sorry, I encountered an error loading the conversation topic.',
          translation: 'Het spijt me, er is een fout opgetreden bij het laden van het gespreksonderwerp.',
          correction: { correctedDutch: '', explanation: '' },
          suggestions: [
            { dutch: "Probeer een ander onderwerp", english: "Try a different topic" },
            { dutch: "Ga terug naar het hoofdmenu", english: "Go back to the main menu" },
            { dutch: "Neem contact op met ondersteuning", english: "Contact support" }
          ]
        },
        { status: 404 }
      );
    }
    
    // Prepare conversation history
    const conversationHistory: Message[] = [
      // Start with system message if needed
      {
        role: 'system',
        content: `You are a friendly Dutch language assistant helping someone learn Dutch. 
        Always respond in the following JSON format:
        {
          "ai_reply": "Your response in Dutch",
          "translation": "English translation of your response",
          "correction": {
            "correctedDutch": "Corrected Dutch sentence if user made a mistake (empty string if no correction needed)",
            "explanation": "Brief explanation of the correction in English (empty string if no correction needed)"
          }
        }`
      },
      // Add existing messages
      ...messages,
      // Add user input if provided
      ...(user_input ? [{ role: 'user' as const, content: user_input }] : [])
    ];
    
    console.log('Generating AI response with messages:', JSON.stringify(conversationHistory, null, 2));
    
    try {
      // Generate AI response using OpenAI (non-streaming)
      const response = await generateAIResponse(conversationHistory, promptConfig);
      
      // Return the complete response
      return NextResponse.json(response);
      
    } catch (error) {
      console.error('Error generating AI response:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      return NextResponse.json({
        error: errorMessage,
        ai_reply: 'Sorry, an error occurred while generating the response.',
        translation: 'Sorry, er is een fout opgetreden bij het genereren van het antwoord.',
        correction: { correctedDutch: '', explanation: '' },
        suggestions: [
          { dutch: "Kunt u dat herhalen alstublieft?", english: "Can you repeat that please?" },
          { dutch: "Ik begrijp het niet helemaal.", english: "I don't quite understand." },
          { dutch: "Kunt u het op een andere manier uitleggen?", english: "Can you explain it differently?" }
        ]
      }, { status: 500 });
    }
      
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error in AI response generation:', error);
    return NextResponse.json(
      { 
        error: 'Error generating response', 
        details: errorMessage,
        ai_reply: 'Sorry, I encountered an error. Could you please try again?',
        translation: 'Excuses, er is een fout opgetreden. Kunt u het alstublieft opnieuw proberen?',
        correction: { correctedDutch: '', explanation: '' }
      },
      { status: 500 }
    );
  }

}
