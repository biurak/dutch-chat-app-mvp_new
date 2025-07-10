import { NextResponse } from 'next/server';
import { checkGrammar } from '@/lib/openai-service';
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

// Initialize OpenAI client - REMOVED: Now using centralized service
// This logic has been moved to lib/openai-service.ts

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
  
  // Use centralized OpenAI service
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

    console.log(`[${requestId}] Using centralized grammar checking service`);
    
    // Use the centralized grammar checking service
    const result = await checkGrammar(text, context);
    
    // Record success
    recordSuccess();
    
    return NextResponse.json(result);
    
  } catch (error: any) {
    console.error(`[${requestId}] Grammar check error:`, error);
    recordFailure();
    
    // Handle specific error types
    if (error.message?.includes('quota exceeded')) {
      return NextResponse.json(
        { 
          error: 'Service temporarily unavailable',
          details: 'API quota exceeded. Please try again later.',
          requestId,
        },
        { status: 503 }
      );
    }
    
    return NextResponse.json(
      { 
        error: 'Error processing your request',
        details: 'The language service is currently unavailable. Please try again later.',
        requestId,
      },
      { status: 503 }
    );
  }
}
