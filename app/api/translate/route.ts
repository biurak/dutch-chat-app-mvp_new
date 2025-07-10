import { NextResponse } from 'next/server';
import { translateWord } from '@/lib/openai-service';
import { LRUCache } from 'lru-cache';

// Rate limiting configuration
const RATE_LIMIT = {
  WINDOW_MS: 60 * 1000, // 1 minute
  MAX_REQUESTS: 30, // Max requests per window
};

// In-memory rate limit store
const rateLimitCache = new LRUCache<string, number[]>({
  max: 1000, // Max number of unique IPs to track
  ttl: RATE_LIMIT.WINDOW_MS,
});

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

export async function POST(request: Request) {
  const clientIp = request.headers.get('x-forwarded-for') || 'unknown';
  const requestId = Math.random().toString(36).substring(2, 9);
  
  console.log(`[${requestId}] [${clientIp}] [translate/route] Received request`);
  
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
          'X-RateLimit-Remaining': Math.max(0, RATE_LIMIT.MAX_REQUESTS - (rateLimitCache.get(clientIp)?.length || 0)).toString(),
        }
      }
    );
  }

  try {
    const { word, context } = await request.json();
    
    if (!word || !context) {
      return NextResponse.json(
        { error: 'Word and context are required' },
        { status: 400 }
      );
    }

    console.log(`[${requestId}] Processing translation request for: "${word}"`);
    
    // Use centralized translation service
    const result = await translateWord(word, context, requestId);
    
    return NextResponse.json({ 
      translation: result.translation,
      ...(result.cached && { cached: true })
    });
    
  } catch (error: unknown) {
    console.error(`[${requestId}] Translation error:`, error);
    
    const errorDetails = error instanceof Error ? {
      message: error.message,
      stack: error.stack,
      name: error.name
    } : {
      message: String(error)
    };
    
    console.error(`[${requestId}] Error details:`, errorDetails);
    
    return NextResponse.json(
      { 
        error: 'Failed to translate word',
        ...(process.env.NODE_ENV === 'development' && { details: errorDetails })
      },
      { status: 500 }
    );
  }
}
