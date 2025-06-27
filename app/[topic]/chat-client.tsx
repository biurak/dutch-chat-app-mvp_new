'use client';

import { useEffect, useRef, useState, useCallback, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { v4 as uuidv4 } from 'uuid';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Mic, Send } from 'lucide-react';
import { getTopicBySlug, type Topic } from '@/lib/topics';

interface Suggestion {
  dutch: string;
  english: string;
}

interface Correction {
  original: string;
  corrected: string;
  explanation: string;
}

interface Message {
  id: string;
  role: 'user' | 'ai';
  dutch: string;
  english: string;
  showTranslation: boolean;
  isStreaming?: boolean;
  corrections?: Correction[];
  correctedText?: string;
  showCorrections?: boolean;
}

interface ChatApiRequest {
  messages: Array<{
    role: 'user' | 'assistant' | 'system';
    content: string;
  }>;
  topic: string;
  user_input: string;
}

interface ExtendedTopic extends Topic {
  initialAiMessage: {
    dutch: string;
    english: string;
  };
  initialSuggestions: Suggestion[];
}

interface ChatClientProps {
  topicSlug: string;
}

export default function ChatClient({ topicSlug }: ChatClientProps) {
  const router = useRouter();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingAi, setIsLoadingAi] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentSuggestions, setCurrentSuggestions] = useState<Suggestion[]>([]);
  const [currentTopic, setCurrentTopic] = useState<ExtendedTopic | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [inputValue, setInputValue] = useState('');

  // Toggle translation for a message
  const toggleTranslation = useCallback((messageId: string) => {
    setMessages(prevMessages =>
      prevMessages.map(msg =>
        msg.id === messageId
          ? { ...msg, showTranslation: !msg.showTranslation }
          : msg
      )
    );
  }, []);

  // Toggle corrections for a message
  const toggleCorrections = useCallback((messageId: string) => {
    setMessages(prevMessages =>
      prevMessages.map(msg =>
        msg.id === messageId
          ? { ...msg, showCorrections: !msg.showCorrections }
          : msg
      )
    );
  }, []);

  // Check grammar and get corrections for user message
  const checkGrammar = useCallback(async (text: string) => {
    try {
      const response = await fetch('/api/correct', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ text }),
      });
      
      if (!response.ok) {
        throw new Error('Failed to check grammar');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error checking grammar:', error);
      return null;
    }
  }, []);

  // Handle sending a user message and processing the response
  const handleUserMessage = useCallback(async (message: string) => {
    console.log('handleUserMessage called with message:', message);
    if (!message.trim()) {
      console.error('Empty message received');
      return;
    }
    if (!currentTopic) {
      console.error('No current topic set');
      return;
    }

    const userMessageId = uuidv4();
    const aiMessageId = uuidv4();

    // STEP 1: Immediately add user message and AI typing indicator to UI
    setMessages(prev => [
      ...prev,
      {
        id: userMessageId,
        role: 'user',
        dutch: message,
        english: '', // Will be filled later
        showTranslation: false,
        corrections: undefined, // Will be filled later
        correctedText: undefined, // Will be filled later
        showCorrections: false
      },
      {
        id: aiMessageId,
        role: 'ai',
        dutch: '...',
        english: '',
        showTranslation: false,
        isStreaming: true
      }
    ]);

    setIsLoadingAi(true);

    // STEP 2: Start grammar checking in background (non-blocking)
    checkGrammar(message).then(grammarCheck => {
      if (grammarCheck) {
        const hasCorrections = (grammarCheck?.corrections?.length ?? 0) > 0;
        const correctedText = hasCorrections ? grammarCheck?.corrected : undefined;
        const corrections = grammarCheck?.corrections || [];
        const translation = grammarCheck?.translation || '';

        // Update user message with grammar corrections and translation
        setMessages(prev =>
          prev.map(msg =>
            msg.id === userMessageId
              ? {
                  ...msg,
                  english: translation,
                  corrections,
                  correctedText,
                  showCorrections: hasCorrections // Show corrections by default if they exist
                }
              : msg
          )
        );
      }
    }).catch(error => {
      console.error('Error checking grammar:', error);
    });

    // STEP 3: Get AI response (parallel to grammar checking)
    try {
      // Prepare the chat history for the API
      const chatHistory = [
        {
          role: 'system' as const,
          content: `You are a helpful assistant helping someone learn Dutch. The current topic is: ${currentTopic.title}.`
        },
        ...messages
          .filter(msg => msg.role === 'user' || !msg.isStreaming)
          .map(msg => ({
            role: msg.role === 'user' ? 'user' as const : 'assistant' as const,
            content: msg.role === 'user' ? msg.dutch : msg.dutch
          })),
        {
          role: 'user' as const,
          content: message
        }
      ];

      const response = await fetch(`/api/chat/${encodeURIComponent(topicSlug)}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: chatHistory,
          topic: topicSlug,
          user_input: message
        } as ChatApiRequest),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('API response data:', JSON.stringify(data, null, 2));
      
      // STEP 4: Update the AI message with the response
      setMessages(prev =>
        prev.map(msg => {
          if (msg.id === aiMessageId) {
            const aiMessage = {
              ...msg,
              dutch: data.ai_reply || data.dutch || 'Sorry, I could not generate a response.',
              english: data.translation || data.english || '',
              isStreaming: false
            };
            console.log('Updating AI message:', aiMessage);
            return aiMessage;
          }
          return msg;
        })
      );
      
      // STEP 5: Process and update suggestions from the AI response
      const processSuggestions = (suggestions: any) => {
        if (!suggestions || !Array.isArray(suggestions)) {
          console.warn('No valid suggestions array in response');
          return [];
        }
        
        // Ensure each suggestion has the correct format
        return suggestions.map((s: any, i: number) => {
          // Handle both string and object formats
          if (typeof s === 'string') {
            return { dutch: s, english: '' };
          } else if (s && typeof s === 'object') {
            return {
              dutch: s.dutch || s.text || `Suggestion ${i + 1}`,
              english: s.english || ''
            };
          }
          return { dutch: `Invalid suggestion ${i + 1}`, english: '' };
        }).filter(Boolean);
      };
      
      const newSuggestions = processSuggestions(data.suggestions);
      
      if (newSuggestions.length > 0) {
        console.log('Setting new suggestions:', newSuggestions);
        setCurrentSuggestions(newSuggestions);
      } else {
        // Fallback to default suggestions if none provided
        const defaults = [
          { dutch: "Wat bedoel je?", english: "What do you mean?" },
          { dutch: "Kun je dat herhalen?", english: "Can you repeat that?" },
          { dutch: "Kun je dat uitleggen?", english: "Can you explain that?" }
        ];
        console.log('Using default suggestions');
        setCurrentSuggestions(defaults);
      }

    } catch (error) {
      console.error('Error sending message:', error);
      
      // Show error message to the user
      setMessages(prev =>
        prev.map(msg =>
          msg.id === aiMessageId
            ? {
                ...msg,
                dutch: 'Sorry, er is een fout opgetreden bij het verwerken van je bericht.',
                english: 'Sorry, an error occurred while processing your message.',
                isStreaming: false
              }
            : msg
        )
      );
      
      // Set default error suggestions
      setCurrentSuggestions([
        { dutch: "Probeer het opnieuw", english: "Try again" },
        { dutch: "Wat bedoel je?", english: "What do you mean?" },
        { dutch: "Kun je dat uitleggen?", english: "Can you explain that?" }
      ]);
    } finally {
      setIsLoadingAi(false);
    }
  }, [currentTopic, messages, topicSlug, checkGrammar]);

  // Handle clicking on a suggestion - send directly without showing in input
  const handleSuggestionClick = useCallback((suggestion: Suggestion) => {
    console.log('Suggestion clicked:', suggestion);
    if (!suggestion || !suggestion.dutch) {
      console.error('Invalid suggestion object:', suggestion);
      return;
    }
    console.log('Sending suggestion as message:', suggestion.dutch);
    // Send the suggestion directly without updating the input field
    handleUserMessage(suggestion.dutch).catch(error => {
      console.error('Error handling suggestion click:', error);
    });
  }, [handleUserMessage]);

  // Handle form submission
  const handleSubmit = useCallback(async (e: FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || isLoadingAi) return;
    
    const message = inputValue.trim();
    setInputValue('');
    
    try {
      await handleUserMessage(message);
    } catch (error) {
      console.error('Error handling user message:', error);
    }
  }, [inputValue, isLoadingAi, handleUserMessage]);

  // Load topic data
  useEffect(() => {
    const loadTopic = async () => {
      try {
        setIsLoading(true);
        const topic = await getTopicBySlug(topicSlug);
        
        if (!topic) {
          setError('Topic not found');
          return;
        }
        
        // Create the extended topic with defaults
        const extendedTopic = {
          ...topic,
          initialAiMessage: topic.initialAiMessage || {
            dutch: 'Hallo! Hoe kan ik je vandaag helpen?',
            english: 'Hello! How can I help you today?'
          },
          initialSuggestions: topic.initialSuggestions || []
        };
        
        setCurrentTopic(extendedTopic);
        
        // Set initial welcome message
        const welcomeMessage = {
          id: uuidv4(),
          role: 'ai' as const,
          dutch: extendedTopic.initialAiMessage.dutch,
          english: extendedTopic.initialAiMessage.english,
          showTranslation: false
        };
        
        setMessages([welcomeMessage]);
        
        // Set initial suggestions
        if (extendedTopic.initialSuggestions?.length) {
          setCurrentSuggestions(extendedTopic.initialSuggestions);
        } else {
          setCurrentSuggestions([
            { dutch: 'Hoe gaat het?', english: 'How are you?' },
            { dutch: 'Wat is je naam?', english: 'What is your name?' },
            { dutch: 'Waar kom je vandaan?', english: 'Where are you from?' }
          ]);
        }
      } catch (err) {
        console.error('Error loading topic:', err);
        setError('Failed to load chat. Please try again.');
      } finally {
        setIsLoading(false);
      }
    };
    
    loadTopic();
  }, [topicSlug]);
  
  // Scroll to bottom of messages when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-50">
        <p className="text-slate-600">Laden...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-slate-50 p-4">
        <p className="text-red-600 mb-4">{error}</p>
        <Button onClick={() => router.back()}>
          <ArrowLeft className="w-4 h-4 mr-2" /> Terug naar overzicht
        </Button>
      </div>
    );
  }



  return (
    <div className="flex flex-col h-screen bg-slate-50">
      {/* Header */}
      <header className="bg-white shadow-sm p-4 flex items-center sticky top-0 z-10">
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => router.back()}
          className="mr-2"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-lg font-semibold">{currentTopic?.title || 'Loading...'}</h1>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-slate-500">Loading chat...</p>
          </div>
        ) : (
          messages.map((message) => (
            <div 
              key={message.id} 
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div 
                className={`max-w-3xl rounded-lg px-4 py-2 ${
                  message.role === 'user' 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-white border border-slate-200 shadow-sm'
                }`}
              >
                {/* Show corrected text if available and visible */}
                {message.correctedText && message.showCorrections ? (
                  <div className="whitespace-pre-wrap relative">
                    <div className="bg-yellow-50 text-yellow-900 px-2 py-1 rounded mb-1 text-sm">
                      ✏️ Corrected version
                    </div>
                    <p className="whitespace-pre-wrap">{message.correctedText}</p>
                    {message.corrections && message.corrections.length > 0 && (
                      <div className="mt-2 pt-2 border-t border-opacity-20 border-slate-300 text-xs">
                        {message.corrections.map((correction, idx) => (
                          <div key={idx} className="mb-1">
                            <span className="line-through text-red-300">{correction.original}</span>
                            {' → '}
                            <span className="text-green-200">{correction.corrected}</span>
                            <span className="text-blue-100 block">{correction.explanation}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="whitespace-pre-wrap">
                    {message.correctedText || message.dutch}
                    {message.corrections && message.corrections.length > 0 && (
                      <span className="ml-2 text-xs opacity-70">
                        {message.showCorrections 
                          ? 'Hide corrections' 
                          : `✏️ ${message.corrections.length} correction${message.corrections.length > 1 ? 's' : ''} applied`}
                      </span>
                    )}
                  </p>
                )}

                {/* Translation section */}
                {message.showTranslation && message.english && (
                  <div className="mt-1 pt-1 border-t border-opacity-20 border-slate-300 text-sm italic">
                    {message.english}
                  </div>
                )}

                {/* Action buttons - only show if there are corrections or translations */}
                {
                <div className="flex justify-between items-center mt-1 pt-1 border-t border-opacity-20 border-slate-300 text-xs text-slate-300">
                  {/* Toggle corrections button (for user messages with corrections) */}
                  {message.role === 'user' && message.corrections && message.corrections.length > 0 && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleCorrections(message.id);
                      }}
                      className="text-xs hover:underline focus:outline-none"
                    >
                      {message.showCorrections ? 'Hide corrections' : 'Show corrections'}
                    </button>
                  )}
                  
                  {/* Toggle translation button */}
                
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleTranslation(message.id);
                      }}
                      className="text-xs hover:underline focus:outline-none ml-auto disabled:text-slate-400 disabled:no-underline"
                      disabled={!message.english}
                    >
                      {message.showTranslation ? 'Hide translation' : 'Show translation'}
                    </button>
              
                </div>
                }
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Suggestions */}
      {currentSuggestions.length > 0 && (
        <div className="bg-white border-t border-slate-200 p-3 overflow-x-auto shadow-sm">
          <div className="flex flex-wrap gap-2">
            {currentSuggestions.map((suggestion, index) => {
              if (!suggestion || !suggestion.dutch) {
                console.error('Invalid suggestion at index', index, ':', suggestion);
                return null;
              }
              
              return (
                <Button
                  key={`${suggestion.dutch}-${index}`}
                  variant="outline"
                  size="sm"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    console.log('Button click event:', e);
                    handleSuggestionClick(suggestion);
                  }}
                  onMouseDown={(e) => {
                    // Prevent input blur when clicking suggestions
                    e.preventDefault();
                  }}
                  className="whitespace-nowrap text-sm cursor-pointer active:scale-95 transition-transform"
                  title={suggestion.english || ''}
                >
                  {suggestion.dutch}
                </Button>
              );
            })}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="bg-white border-t border-slate-200 p-4 sticky bottom-0">
        <form onSubmit={handleSubmit} className="flex gap-2">
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 border border-slate-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
            disabled={isLoadingAi}
          />
          <Button 
            type="submit" 
            disabled={!inputValue.trim() || isLoadingAi}
            className="bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50"
            size="icon"
          >
            <Send className="w-4 h-4" />
          </Button>
          <Button 
            type="button" 
            variant="outline"
            size="icon"
            onClick={() => {
              // TODO: Implement voice input
              alert('Voice input will be implemented here');
            }}
            disabled={isLoadingAi}
          >
            <Mic className="w-4 h-4" />
          </Button>
        </form>
      </div>
    </div>
  );
}
