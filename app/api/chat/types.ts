import { z } from 'zod';

// Constants for configuration
export const REQUEST_TIMEOUT_MS = 30000; // 30 seconds
export const MAX_MESSAGE_LENGTH = 5000; // Increased temporarily for debugging
export const MAX_MESSAGES_COUNT = 50;

// Zod validation schemas
export const MessageSchema = z.object({
  role: z.enum(['user', 'assistant', 'system']),
  content: z.string()
    .min(1, 'Message content cannot be empty')
    .max(MAX_MESSAGE_LENGTH, `Message content cannot exceed ${MAX_MESSAGE_LENGTH} characters`)
});

export const ChatRequestSchema = z.object({
  messages: z.array(MessageSchema)
    .max(MAX_MESSAGES_COUNT, `Cannot exceed ${MAX_MESSAGES_COUNT} messages`)
    .optional()
    .default([]),
  user_input: z.string()
    .max(MAX_MESSAGE_LENGTH, `User input cannot exceed ${MAX_MESSAGE_LENGTH} characters`)
    .optional(),
  topic: z.string().optional() // Allow topic in request body as well
}).passthrough() // Allow additional fields
.refine(
  (data) => {
    // Allow if messages exist OR user_input exists
    const hasMessages = data.messages && data.messages.length > 0;
    const hasUserInput = data.user_input && data.user_input.trim().length > 0;
    console.log('Validation refine check:', { hasMessages, hasUserInput, messagesLength: data.messages?.length });
    return hasMessages || hasUserInput;
  },
  {
    message: 'Either messages or user_input must be provided',
    path: ['messages', 'user_input']
  }
);

export const TopicParamsSchema = z.object({
  topic: z.string().min(1, 'Topic is required')
});

// Types derived from Zod schemas
export type Message = z.infer<typeof MessageSchema>;
export type ChatRequest = z.infer<typeof ChatRequestSchema>;
export type TopicParams = z.infer<typeof TopicParamsSchema>;

// API Response type
export type APIResponse = {
  error?: string;
  details?: string;
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
};
