import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

type Message = {
  role: 'system' | 'user' | 'assistant';
  content: string;
};

export interface AIResponse {
  ai_reply: string;
  translation: string;
  correction: {
    correctedDutch: string;
    explanation: string;
  };
  suggestions: Array<{
    dutch: string;
    english: string;
  }>;
}

export async function* generateAIResponseStream(
  messages: Message[],
  promptConfig: any
): AsyncGenerator<string> {
  console.log('Starting generateAIResponseStream with config:', {
    hasApiKey: !!process.env.OPENAI_API_KEY,
    messageCount: messages.length,
    promptConfig: promptConfig ? 'present' : 'missing'
  });

  try {
    const systemPrompt = `You are a friendly Dutch language assistant helping someone learn Dutch. 
    Always respond in the following JSON format:
    {
      "ai_reply": "Your response in Dutch",
      "translation": "English translation of your response",
      "correction": {
        "correctedDutch": "Corrected Dutch sentence if user made a mistake (empty string if no correction needed)",
        "explanation": "Brief explanation of the correction in English (empty string if no correction needed)"
      },
      "suggestions": [
        {"dutch": "Suggestion 1 in Dutch", "english": "English translation"},
        {"dutch": "Suggestion 2 in Dutch", "english": "English translation"},
        {"dutch": "Suggestion 3 in Dutch", "english": "English translation"}
      ]
    }
    
    Keep your responses natural, friendly, and helpful for a Dutch language learner. 
    Correct any Dutch mistakes the user makes in a gentle, educational way.
    
    For the suggestions:
    1. These are potential NEXT MESSAGES from the USER (the customer), not from you (the waiter/assistant)
    2. Make them relevant to the current conversation context and role (customer)
    3. Keep them simple and useful for a language learner
    4. Include natural follow-up questions or responses a customer might say
    5. Use first-person perspective (e.g., "Ik wil graag..." not "De klant wil graag...")
    6. Make them specific to the current topic (e.g., ordering coffee, asking about menu items)
    7. Include a mix of simple and slightly more complex phrases for learning`;

    const stream = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages.map(msg => ({
          role: msg.role,
          content: msg.role === 'system' ? msg.content : String(msg.content)
        }))
      ],
      stream: true,
      temperature: 0.7,
    });

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content || '';
      if (content) {
        yield content;
      }
    }
  } catch (error) {
    console.error('Error in generateAIResponseStream:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    yield JSON.stringify({
      ai_reply: `Sorry, I encountered an error: ${errorMessage}. Please try again.`,
      translation: `Sorry, er is een fout opgetreden: ${errorMessage}. Probeer het alstublieft opnieuw.`,
      correction: { correctedDutch: '', explanation: '' },
      suggestions: [
        { dutch: "Kunt u dat herhalen alstublieft?", english: "Can you repeat that please?" },
        { dutch: "Ik begrijp het niet helemaal.", english: "I don't quite understand." },
        { dutch: "Kunt u het op een andere manier uitleggen?", english: "Can you explain it differently?" }
      ]
    });
  }
}

export async function generateAIResponse(
  messages: Message[],
  promptConfig: any
): Promise<AIResponse> {
  console.log('Starting generateAIResponse with config:', {
    hasApiKey: !!process.env.OPENAI_API_KEY,
    messageCount: messages.length,
    promptConfig: promptConfig ? 'present' : 'missing'
  });

  try {
    const systemPrompt = `You are a friendly Dutch language assistant helping someone learn Dutch. 
    Always respond in the following JSON format:
    {
      "ai_reply": "Your response in Dutch",
      "translation": "English translation of your response",
      "correction": {
        "correctedDutch": "Corrected Dutch sentence if user made a mistake (empty string if no correction needed)",
        "explanation": "Brief explanation of the correction in English (empty string if no correction needed)"
      },
      "suggestions": [
        {"dutch": "Suggestion 1 in Dutch", "english": "English translation"},
        {"dutch": "Suggestion 2 in Dutch", "english": "English translation"},
        {"dutch": "Suggestion 3 in Dutch", "english": "English translation"}
      ]
    }
    
    Keep your responses natural, friendly, and helpful for a Dutch language learner. 
    Correct any Dutch mistakes the user makes in a gentle, educational way.
    
    For the suggestions:
    1. These are potential NEXT MESSAGES from the USER (the customer), not from you (the waiter/assistant)
    2. Make them relevant to the current conversation context and role (customer)
    3. Keep them simple and useful for a language learner
    4. Include natural follow-up questions or responses a customer might say
    5. Use first-person perspective (e.g., "Ik wil graag..." not "De klant wil graag...")
    6. Make them specific to the current topic (e.g., ordering coffee, asking about menu items)
    7. Include a mix of simple and slightly more complex phrases for learning
    
    Example for a café scenario:
    - "Mag ik een cappuccino bestellen?" (Can I order a cappuccino?)
    - "Hoeveel kost een espresso?" (How much does an espresso cost?)
    - "Heeft u ook plantaardige melk?" (Do you have plant-based milk?)
    - "Wat is de speciale koffie van vandaag?" (What is today's special coffee?)
    - "Ik wil graag afrekenen, alstublieft." (I would like to pay, please.)
    
    Current topic context: ${JSON.stringify(promptConfig?.topic || 'general conversation')}
    `;

    console.log('Sending request to OpenAI with messages:', 
      messages.map(m => `${m.role}: ${m.content.substring(0, 100)}${m.content.length > 100 ? '...' : ''}`)
    );

    const response = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages.map(msg => ({
          role: msg.role,
          content: msg.role === 'system' ? msg.content : String(msg.content)
        }))
      ],
      response_format: { type: 'json_object' },
      temperature: 0.7,
    }).catch(error => {
      console.error('OpenAI API call failed:', {
        status: error.status,
        code: error.code,
        message: error.message,
        response: error.response?.data
      });
      throw error;
    });

    console.log('Received response from OpenAI:', {
      id: response.id,
      model: response.model,
      usage: response.usage,
      finish_reason: response.choices[0]?.finish_reason
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      throw new Error('No content in AI response');
    }

    let result;
    try {
      result = JSON.parse(content);
      console.log('Parsed AI response:', result);
    } catch (error) {
      const parseError = error as Error;
      console.error('Failed to parse AI response:', {
        content,
        error: parseError.message
      });
      throw new Error(`Failed to parse AI response: ${parseError.message}`);
    }

    // Default suggestions if none provided
    const defaultSuggestions = [
      { dutch: "Kunt u dat herhalen alstublieft?", english: "Can you repeat that please?" },
      { dutch: "Ik begrijp het niet helemaal.", english: "I don't quite understand." },
      { dutch: "Kunt u langzamer praten?", english: "Can you speak more slowly?" }
    ];

    return {
      ai_reply: result.ai_reply || 'Sorry, I could not generate a response.',
      translation: result.translation || '',
      correction: result.correction || { correctedDutch: '', explanation: '' },
      suggestions: result.suggestions || defaultSuggestions
    };
  } catch (err) {
    const error = err as Error & { response?: { data?: any } };
    const errorMessage = error.message || 'Unknown error';
    console.error('Error in generateAIResponse:', {
      error: errorMessage,
      stack: error.stack,
      response: error.response?.data
    });
    
    // Default error suggestions
    const errorSuggestions = [
      { dutch: "Kunt u dat herhalen alstublieft?", english: "Can you repeat that please?" },
      { dutch: "Ik begrijp het niet helemaal.", english: "I don't quite understand." },
      { dutch: "Kunt u het op een andere manier uitleggen?", english: "Can you explain it differently?" }
    ];

    return {
      ai_reply: `Sorry, I encountered an error: ${errorMessage}. Please try again.`,
      translation: `Sorry, er is een fout opgetreden: ${errorMessage}. Probeer het alstublieft opnieuw.`,
      correction: { correctedDutch: '', explanation: '' },
      suggestions: errorSuggestions
    };
  }
}
