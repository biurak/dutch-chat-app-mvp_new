/**
 * Performance monitoring utilities for Solution 3
 * Tracks API calls, response times, and word processing efficiency
 */

interface PerformanceMetrics {
  timestamp: string;
  sessionId: string;
  messageId: string;
  apiCalls: number;
  responseTime: number;
  wordsProcessed: number;
  wordsFromAI: number;
  fallbackUsed: boolean;
  errors: string[];
}

class PerformanceMonitor {
  private metrics: PerformanceMetrics[] = [];
  private sessionId: string;

  constructor() {
    this.sessionId = this.generateSessionId();
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  startMessage(messageId: string): MessageTracker {
    return new MessageTracker(messageId, this);
  }

  recordMetrics(metrics: PerformanceMetrics): void {
    this.metrics.push(metrics);
    
    // Log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.log('📊 Performance Metrics:', {
        messageId: metrics.messageId,
        apiCalls: metrics.apiCalls,
        responseTime: `${metrics.responseTime}ms`,
        wordsFromAI: metrics.wordsFromAI,
        fallbackUsed: metrics.fallbackUsed
      });
    }
  }

  getSessionMetrics(): {
    totalMessages: number;
    totalApiCalls: number;
    averageResponseTime: number;
    totalWordsProcessed: number;
    fallbackUsageRate: number;
    errorRate: number;
  } {
    if (this.metrics.length === 0) {
      return {
        totalMessages: 0,
        totalApiCalls: 0,
        averageResponseTime: 0,
        totalWordsProcessed: 0,
        fallbackUsageRate: 0,
        errorRate: 0
      };
    }

    const totalMessages = this.metrics.length;
    const totalApiCalls = this.metrics.reduce((sum, m) => sum + m.apiCalls, 0);
    const totalResponseTime = this.metrics.reduce((sum, m) => sum + m.responseTime, 0);
    const totalWordsProcessed = this.metrics.reduce((sum, m) => sum + m.wordsProcessed, 0);
    const fallbackCount = this.metrics.filter(m => m.fallbackUsed).length;
    const errorCount = this.metrics.filter(m => m.errors.length > 0).length;

    return {
      totalMessages,
      totalApiCalls,
      averageResponseTime: Math.round(totalResponseTime / totalMessages),
      totalWordsProcessed,
      fallbackUsageRate: Math.round((fallbackCount / totalMessages) * 100),
      errorRate: Math.round((errorCount / totalMessages) * 100)
    };
  }

  exportMetrics(): string {
    return JSON.stringify({
      sessionId: this.sessionId,
      summary: this.getSessionMetrics(),
      details: this.metrics
    }, null, 2);
  }
}

class MessageTracker {
  private startTime: number;
  private messageId: string;
  private monitor: PerformanceMonitor;
  private apiCalls: number = 0;
  private wordsProcessed: number = 0;
  private wordsFromAI: number = 0;
  private fallbackUsed: boolean = false;
  private errors: string[] = [];

  constructor(messageId: string, monitor: PerformanceMonitor) {
    this.messageId = messageId;
    this.monitor = monitor;
    this.startTime = Date.now();
  }

  recordApiCall(): void {
    this.apiCalls++;
  }

  recordWordsFromAI(count: number): void {
    this.wordsFromAI = count;
    this.wordsProcessed += count;
  }

  recordFallbackUsed(wordCount: number): void {
    this.fallbackUsed = true;
    this.wordsProcessed += wordCount;
  }

  recordError(error: string): void {
    this.errors.push(error);
  }

  finish(): void {
    const responseTime = Date.now() - this.startTime;
    
    this.monitor.recordMetrics({
      timestamp: new Date().toISOString(),
      sessionId: this.monitor['sessionId'],
      messageId: this.messageId,
      apiCalls: this.apiCalls,
      responseTime,
      wordsProcessed: this.wordsProcessed,
      wordsFromAI: this.wordsFromAI,
      fallbackUsed: this.fallbackUsed,
      errors: this.errors
    });
  }
}

// Global instance
export const performanceMonitor = new PerformanceMonitor();

// React hook for monitoring
export function usePerformanceMonitoring() {
  return {
    startMessage: (messageId: string) => performanceMonitor.startMessage(messageId),
    getSessionMetrics: () => performanceMonitor.getSessionMetrics(),
    exportMetrics: () => performanceMonitor.exportMetrics()
  };
}
