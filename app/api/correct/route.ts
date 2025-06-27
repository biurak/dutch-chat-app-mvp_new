import { NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: Request) {
  try {
    const { text } = await request.json();

    if (!text) {
      return NextResponse.json(
        { error: 'Text is required' },
        { status: 400 }
      );
    }

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-2024-08-06',
      messages: [
        {
          role: 'system',
          content: `You are a helpful Dutch language tutor. Your tasks are:
          1. Correct any grammar or spelling mistakes in the given Dutch text.
          2. Provide an English translation of the corrected text.
          
          Return a JSON object with:
          - original: the original text
          - corrected: the corrected text in Dutch
          - translation: the English translation of the corrected text
          - explanation: a brief explanation of the corrections (1-2 sentences max)
          - corrections: an array of objects with:
            - original: the original text that was corrected
            - corrected: the corrected text
            - explanation: why it was corrected (1 sentence max)`
        },
        {
          role: 'user',
          content: `Please correct and translate this Dutch text: "${text}"`
        }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.2,
    });

    const result = response.choices[0]?.message?.content;
    if (!result) {
      throw new Error('No response from AI');
    }

    return NextResponse.json(JSON.parse(result));
  } catch (error) {
    console.error('Error in grammar correction:', error);
    return NextResponse.json(
      { error: 'Failed to process grammar correction' },
      { status: 500 }
    );
  }
}
