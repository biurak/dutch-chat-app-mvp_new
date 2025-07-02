import { NextResponse } from 'next/server';
import OpenAI from 'openai';
import { LRUCache } from 'lru-cache';

// Rate limiting configuration
const RATE_LIMIT = {
  WINDOW_MS: 60 * 1000, // 1 minute
  MAX_REQUESTS: 10, // Max requests per window
};

// Circuit breaker configuration
const CIRCUIT_BREAKER = {
  FAILURE_THRESHOLD: 5, // Number of failures before opening the circuit
  RESET_TIMEOUT: 30 * 1000, // Time before attempting to close the circuit (30s)
};

// In-memory stores
const rateLimitCache = new LRUCache<string, number[]>({
  max: 1000, // Max number of unique IPs to track
  ttl: RATE_LIMIT.WINDOW_MS,
});

let circuitState = {
  isOpen: false,
  lastFailure: 0,
  failureCount: 0,
};

// Initialize OpenAI client with error handling
let openai: OpenAI | null = null;

try {
  if (!process.env.OPENAI_API_KEY) {
    console.error('OPENAI_API_KEY is not set in environment variables');
  } else {
    openai = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      timeout: 10000, // 10 second timeout
      maxRetries: 1, // Only retry once on failure
    });
  }
} catch (error) {
  console.error('Failed to initialize OpenAI client:', error);
}

// Helper function to check rate limit
function checkRateLimit(ip: string): { isRateLimited: boolean; retryAfter: number } {
  const now = Date.now();
  const windowStart = now - RATE_LIMIT.WINDOW_MS;
  
  const requestTimestamps = rateLimitCache.get(ip) || [];
  const recentRequests = requestTimestamps.filter(timestamp => timestamp > windowStart);
  
  // Add current request
  recentRequests.push(now);
  rateLimitCache.set(ip, recentRequests);
  
  const isRateLimited = recentRequests.length > RATE_LIMIT.MAX_REQUESTS;
  
  return {
    isRateLimited,
    retryAfter: isRateLimited ? Math.ceil((recentRequests[0] + RATE_LIMIT.WINDOW_MS - now) / 1000) : 0,
  };
}

// Helper function to check circuit breaker
function checkCircuitBreaker() {
  const now = Date.now();
  
  // If circuit is open but reset timeout has passed, try to close it
  if (circuitState.isOpen && now - circuitState.lastFailure > CIRCUIT_BREAKER.RESET_TIMEOUT) {
    console.log('Attempting to close circuit breaker');
    circuitState = {
      isOpen: false,
      lastFailure: circuitState.lastFailure,
      failureCount: 0,
    };
  }
  
  return circuitState.isOpen;
}

// Helper function to record failure
function recordFailure() {
  const now = Date.now();
  circuitState.failureCount++;
  circuitState.lastFailure = now;
  
  if (circuitState.failureCount >= CIRCUIT_BREAKER.FAILURE_THRESHOLD) {
    console.error(`Circuit breaker tripped at ${new Date(now).toISOString()}`);
    circuitState.isOpen = true;
    
    // Schedule a reset attempt
    setTimeout(() => {
      console.log('Attempting to reset circuit breaker');
      circuitState = {
        isOpen: false,
        lastFailure: 0,
        failureCount: 0,
      };
    }, CIRCUIT_BREAKER.RESET_TIMEOUT);
  }
}

// Helper function to record success
function recordSuccess() {
  circuitState.failureCount = Math.max(0, circuitState.failureCount - 1);
}

// Common sample messages that shouldn't trigger corrections
const SAMPLE_MESSAGES = [
  "Hoe gaat het met je?",
  "Wat is je naam?",
  "Waar kom je vandaan?",
  "Hoe heet je?",
  "Waar woon je?",
  "Hoe oud ben je?",
  "Wat doe je in je vrije tijd?",
  "Wat is je favoriete eten?",
  "Spreek je Engels?",
  "Kun je dat herhalen?",
  "Ik begrijp het niet.",
  "Kun je het langzamer zeggen?",
  "Kun je dat uitleggen?",
  "Hoe zeg je ... in het Nederlands?",
  "Wat betekent ...?",
  "Kun je me helpen?",
  "Ik heb een vraag.",
  "Ik wil graag oefenen.",
  "Kun je wat langzamer praten?",
  "Kun je dat opschrijven?",
  "Kun je dat spellen?",
  "Ik weet het niet.",
  "Ik begrijp het nu.",
  "Kun je een voorbeeld geven?",
  "Kun je dat nog een keer zeggen?",
];

// Function to check if text is a direct sample message
function isSampleMessage(text: string): boolean {
  const normalizedText = text.trim().toLowerCase();
  return SAMPLE_MESSAGES.some(
    sample => sample.toLowerCase() === normalizedText
  );
}

export async function POST(request: Request) {
  const clientIp = request.headers.get('x-forwarded-for') || 'unknown';
  const requestId = Math.random().toString(36).substring(2, 9);
  
  console.log(`[${requestId}] [${clientIp}] [correct/route] Received request`);
  
  // Check rate limit
  const rateLimit = checkRateLimit(clientIp);
  if (rateLimit.isRateLimited) {
    console.warn(`[${requestId}] Rate limit exceeded for IP: ${clientIp}`);
    return NextResponse.json(
      { 
        error: 'Too many requests',
        details: `Please try again in ${rateLimit.retryAfter} seconds`,
        retryAfter: rateLimit.retryAfter,
      },
      { 
        status: 429,
        headers: {
          'Retry-After': rateLimit.retryAfter.toString(),
          'X-RateLimit-Limit': RATE_LIMIT.MAX_REQUESTS.toString(),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': (Math.floor(Date.now() / 1000) + rateLimit.retryAfter).toString(),
        }
      }
    );
  }
  
  // Check circuit breaker
  if (checkCircuitBreaker()) {
    const retryAfter = Math.ceil((circuitState.lastFailure + CIRCUIT_BREAKER.RESET_TIMEOUT - Date.now()) / 1000);
    console.error(`[${requestId}] Circuit breaker is open. Retry after ${retryAfter} seconds`);
    
    return NextResponse.json(
      { 
        error: 'Service temporarily unavailable',
        details: 'The service is currently experiencing issues. Please try again later.',
        retryAfter,
      },
      { 
        status: 503,
        headers: {
          'Retry-After': retryAfter.toString(),
        }
      }
    );
  }
  
  // Check if OpenAI client is properly initialized
  if (!openai) {
    console.error(`[${requestId}] OpenAI client is not initialized`);
    recordFailure();
    
    return NextResponse.json(
      { 
        error: 'Server configuration error',
        details: 'Translation service is not available',
      },
      { status: 503 }
    );
  }

  try {
    const { text, context } = await request.json();

    if (!text) {
      return NextResponse.json(
        { error: 'Text is required' },
        { status: 400 }
      );
    }

    // Skip correction for sample messages
    if (isSampleMessage(text)) {
      return NextResponse.json({
        original: text,
        corrected: text,
        translation: '',
        explanation: 'No corrections needed for common phrases',
        corrections: []
      });
    }

    const model = process.env.OPENAI_MODEL || 'gpt-3.5-turbo';
    console.log(`[correct/route] Using model: ${model}`);
    
    let response;
    try {
      console.log(`[${requestId}] Sending request to OpenAI`);
      
      response = await openai.chat.completions.create({
        model,
        messages: [
          {
            role: 'system',
            content: `You are a helpful Dutch language tutor. Your tasks are:
            1. Analyze the given Dutch text for errors.
            2. Only correct the text if there are:
               - Spelling mistakes
               - Grammar errors
               - Inappropriate content for the context
            3. Do NOT correct or comment on:
               - Punctuation (.,!?;:)
               - Capitalization (unless it's a proper noun)
               - Style or word choice if the meaning is clear
            
            Return a JSON object with:
            - original: the original text
            - corrected: the corrected text in Dutch (same as original if no corrections)
            - translation: the English translation of the corrected text
            - explanation: a brief explanation of the corrections (1-2 sentences max, empty if no corrections)
            - corrections: an array of objects with (empty if no corrections):
              - original: the original text that was corrected
              - corrected: the corrected text
              - explanation: why it was corrected (1 sentence max, focus on learning value)
              - type: either 'spelling', 'grammar', or 'context'
            
            IMPORTANT: Your response MUST be valid JSON. Do not include any text outside the JSON object.`
          },
          {
            role: 'user',
            content: `Context: ${context || 'No additional context provided'}
                    
            Please analyze this Dutch text: "${text}"

            Only provide corrections for actual errors, not for style or personal preference.`
          }
        ],
        response_format: { type: 'json_object' },
        temperature: 0.1, // Lower temperature for more consistent corrections
        max_tokens: 1000, // Limit response size
      });
      
      // Record success if we got this far
      recordSuccess();
      
    } catch (error) {
      console.error(`[${requestId}] OpenAI API error:`, error);
      recordFailure();
      
      return NextResponse.json(
        { 
          error: 'Error processing your request',
          details: 'The language service is currently unavailable. Please try again later.',
          requestId,
        },
        { status: 503 }
      );
    }

    const result = response.choices[0]?.message?.content;
    console.log(`[${requestId}] Raw AI response:`, result ? 'Received response' : 'No content');
    
    if (!result) {
      console.error(`[${requestId}] No content in AI response`);
      recordFailure();
      
      return NextResponse.json(
        { 
          error: 'Invalid response from language service',
          details: 'The service returned an empty response',
          requestId,
        },
        { status: 502 }
      );
    }

    let parsed;
    try {
      // Clean the response in case there's any markdown code block
      let cleanResult = result.trim();
      if (cleanResult.startsWith('```json')) {
        cleanResult = cleanResult.replace(/^```json\s*|```$/g, '');
      }
      
      parsed = JSON.parse(cleanResult);
      console.log(`[${requestId}] Successfully parsed AI response`);
    } catch (parseError) {
      console.error(`[${requestId}] Failed to parse AI response:`, parseError);
      console.error(`[${requestId}] Raw response that failed to parse:`, result);
      
      // Don't record failure for parse errors as they might be due to malformed responses
      // rather than service unavailability
      
      return NextResponse.json(
        { 
          error: 'Error processing response',
          details: 'The service returned an invalid response format',
          requestId,
        },
        { status: 502 }
      );
    }
    
    // If no corrections were needed, ensure we return the original text
    if (!parsed.corrections || parsed.corrections.length === 0) {
      return NextResponse.json({
        original: text,
        corrected: text,
        translation: parsed.translation || '',
        explanation: '',
        corrections: []
      });
    }

    // Filter out any corrections that are only punctuation or case changes
    const validCorrections = parsed.corrections.filter((correction: any) => {
      // Skip if it's just punctuation or case changes
      if (!correction.original || !correction.corrected) return false;
      
      const orig = correction.original.trim();
      const corr = correction.corrected.trim();
      
      // Skip if it's just a punctuation mark
      if (/^[.,!?;:]+$/.test(orig) || /^[.,!?;:]+$/.test(corr)) {
        return false;
      }
      
      // Skip if it's just a case change (but not for proper nouns)
      if (orig.toLowerCase() === corr.toLowerCase() && 
          !(orig[0] === orig[0].toUpperCase() && corr[0] === corr[0].toUpperCase())) {
        return false;
      }
      
      return true;
    });
    
    // If no valid corrections after filtering, return original
    if (validCorrections.length === 0) {
      return NextResponse.json({
        original: text,
        corrected: text,
        translation: parsed.translation || '',
        explanation: '',
        corrections: []
      });
    }
    
    // Otherwise return with filtered corrections
    return NextResponse.json({
      ...parsed,
      corrections: validCorrections
    });
  } catch (error: unknown) {
    console.error('[correct/route] Error in grammar correction:', error);
    
    // Prepare error details for response
    const errorDetails = error instanceof Error 
      ? { 
          message: error.message,
          stack: error.stack,
          name: error.name 
        } 
      : { message: String(error) };
    
    // Log full error details
    console.error('[correct/route] Error details:', JSON.stringify(errorDetails, null, 2));
    
    // Return appropriate error response
    return NextResponse.json(
      { 
        error: 'Failed to process grammar correction',
        ...(process.env.NODE_ENV === 'development' && { details: errorDetails })
      },
      { status: 500 }
    );
  }
}
