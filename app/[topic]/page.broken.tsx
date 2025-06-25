'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState, useCallback, FormEvent } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Mic, Send } from 'lucide-react';
import { getTopicBySlug, type Topic } from '@/lib/topics';

// Define our data structures
interface Suggestion {
  dutch: string;
  english: string;
}

interface Message {
  id: string;
  role: 'user' | 'ai';
  dutch: string;
  english: string;
  showTranslation: boolean;
  isStreaming?: boolean;
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
  welcomeMessage: {
    dutch: string;
    english: string;
  };
  suggestions: Suggestion[];
}

interface ChatPageProps {
  params: {
    topic: string;
  };
}

export default function ChatPage({ params }: ChatPageProps) {
  const router = useRouter();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  
  // State management
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

  // Handle clicking on a suggestion
  const handleSuggestionClick = useCallback((suggestion: Suggestion) => {
    setInputValue(suggestion.dutch);
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  // Handle form submission
  const handleSubmit = useCallback((e: FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || isLoadingAi) return;
    
    const message = inputValue.trim();
    setInputValue('');
    handleUserMessage(message);
  }, [inputValue, isLoadingAi, handleUserMessage]);

  // Handle sending a user message and processing the streaming response
  const handleUserMessage = useCallback(async (message: string) => {
    if (!message.trim() || !currentTopic) return;

    const userMessageId = uuidv4();
    const aiMessageId = uuidv4();

    // Add user message to chat
    setMessages(prev => [
      ...prev,
      {
        id: userMessageId,
        role: 'user',
        dutch: message,
        english: '',
        showTranslation: false
      },
      {
        id: aiMessageId,
        role: 'ai',
        dutch: '',
        english: '',
        showTranslation: false,
        isStreaming: true
      }
    ]);

    setIsLoadingAi(true);

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

      const response = await fetch(`/api/chat/${encodeURIComponent(params.topic)}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: chatHistory,
          topic: params.topic,
          user_input: message
        } as ChatApiRequest),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      if (!response.body) {
        throw new Error('No response body');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let done = false;
      let fullResponse = '';
      let fullTranslation = '';

      while (!done) {
        const { value, done: doneReading } = await reader.read();
        done = doneReading;

        if (done) {
          // Final update with isStreaming set to false
          setMessages(prev =>
            prev.map(msg =>
              msg.id === aiMessageId
                ? {
                    ...msg,
                    dutch: fullResponse,
                    english: fullTranslation,
                    isStreaming: false
                  }
                : msg
            )
          );
          break;
        }

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n').filter(line => line.trim() !== '');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.substring(6)); // Remove 'data: ' prefix

              if (data.chunk) {
                fullResponse += data.chunk;
              }

              if (data.translation) {
                fullTranslation = data.translation;
              }

              // Update the message with the latest chunk
              setMessages(prev =>
                prev.map(msg =>
                  msg.id === aiMessageId
                    ? {
                        ...msg,
                        dutch: fullResponse,
                        english: fullTranslation,
                        isStreaming: true
                      }
                    : msg
                )
              );
            } catch (e) {
              console.error('Error parsing chunk:', e);
            }
          }
        }
      }
      // Clear suggestions after user sends a message
      setCurrentSuggestions([]);

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
    } finally {
      setIsLoadingAi(false);
    }
  }, [currentTopic, messages, params.topic]);

  // Extract topic slug from URL
  const topicSlug = Array.isArray(params.topic) ? params.topic[0] : params.topic;

  // Scroll to bottom of messages when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Load topic data
  useEffect(() => {
    const loadTopic = async () => {
      if (!topicSlug) return;

      try {
        setIsLoading(true);
        const topic = await getTopicBySlug(topicSlug);

        if (topic) {
          const extendedTopic = topic as unknown as ExtendedTopic;
          setCurrentTopic(extendedTopic);
          setMessages([{
            id: uuidv4(),
            role: 'ai',
            dutch: extendedTopic.welcomeMessage?.dutch || 'Hallo! Hoe kan ik je vandaag helpen?',
            english: extendedTopic.welcomeMessage?.english || 'Hello! How can I help you today?',
            showTranslation: false
          }]);
          setCurrentSuggestions(extendedTopic.suggestions || []);
        } else {
          setError('Onderwerp niet gevonden');
        }
      } catch (err) {
        console.error('Error loading topic:', err);
        setError('Er is een fout opgetreden bij het laden van het onderwerp');
      } finally {
        setIsLoading(false);
      }
    };

    loadTopic();
  }, [topicSlug]);

  // Toggle translation for a specific message
  const toggleTranslation = useCallback((messageId: string) => {
    setMessages(prevMessages =>
      prevMessages.map(msg =>
        msg.id === messageId
          ? { ...msg, showTranslation: !msg.showTranslation }
          : msg
      )
    );
  }, []);

  // Handle clicking on a suggestion
  const handleSuggestionClick = useCallback((suggestion: Suggestion) => {
    handleUserMessage(suggestion.dutch);
  }, [handleUserMessage]);

  // Handle sending a user message and processing the streaming response
  const handleUserMessage = useCallback(async (message: string) => {
    if (!message.trim() || !currentTopic) return;
    
    const userMessageId = uuidv4();
    const aiMessageId = uuidv4();
    
    // Add user message to chat
    setMessages(prev => [
      ...prev,
      {
        id: userMessageId,
        role: 'user',
        dutch: message,
        english: '',
        showTranslation: false
      },
      {
        id: aiMessageId,
        role: 'ai',
        dutch: '',
        english: '',
        showTranslation: false,
        isStreaming: true
      }
    ]);
    
    setIsLoadingAi(true);
    
    try {
      // Prepare the chat history for the API
      const chatHistory = [
        {
          role: 'system' as const,
          content: `You are a helpful assistant helping someone learn Dutch. The current topic is: ${currentTopic.name}.`
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
      
      const response = await fetch(`/api/chat/${topicSlug}`, {
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
      
      if (!response.body) {
        throw new Error('No response body');
      }
      
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let done = false;
      let fullResponse = '';
      let fullTranslation = '';
      
      while (!done) {
        const { value, done: doneReading } = await reader.read();
        done = doneReading;
        
        if (done) {
          // Final update with isStreaming set to false
          setMessages(prev =>
            prev.map(msg =>
              msg.id === aiMessageId
                ? {
                    ...msg,
                    dutch: fullResponse,
                    english: fullTranslation,
                    isStreaming: false
                  }
                : msg
            )
          );
          break;
        }
        
        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n').filter(line => line.trim() !== '');
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.substring(6)); // Remove 'data: ' prefix
              
              if (data.chunk) {
                fullResponse += data.chunk;
              }
              
              if (data.translation) {
                fullTranslation = data.translation;
              }
              
              // Update the message with the latest chunk
              setMessages(prev =>
                prev.map(msg =>
                  msg.id === aiMessageId
                    ? {
                        ...msg,
                        dutch: fullResponse,
                        english: fullTranslation,
                        isStreaming: true
                      }
                    : msg
                )
              );
            } catch (e) {
              console.error('Error parsing chunk:', e);
            }
          }
        }
      }
      
      // Update suggestions if any
      if (fullResponse) {
        try {
          const lastMessage = fullResponse.trim();
          // Here you could extract suggestions from the AI response if provided
          // For now, we'll just keep the current suggestions
        } catch (e) {
          console.error('Error processing suggestions:', e);
        }
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
    } finally {
      setIsLoadingAi(false);
    }
  }, [currentTopic, messages, topicSlug]);
  
  // Render loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-100">
        <p className="text-slate-600">Laden...</p>
      </div>
    );
  }
  
  // Render error state
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-slate-100 p-4">
        <p className="text-red-600 mb-4">{error}</p>
        <Button onClick={() => router.back()}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Terug
        </Button>
      </div>
    );
  }
  
  // Main chat interface
  return (
    <div className="flex flex-col h-screen bg-slate-100">
      {/* Header */}
      <header className="bg-white shadow-sm p-4">
        <div className="container mx-auto flex items-center">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.back()}
            className="mr-4"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-xl font-semibold">
            {currentTopic?.name || 'Chat'}
          </h1>
        </div>
      </header>
      
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div
            key={message.id}
            className={`flex ${
              message.role === 'user' ? 'justify-end' : 'justify-start'
            }`}
          >
            <div
              className={`max-w-[80%] rounded-lg p-4 ${
                message.role === 'user'
                  ? 'bg-blue-500 text-white'
                  : 'bg-white text-slate-800'
              }`}
            >
              <div className="whitespace-pre-wrap">
                {message.dutch}
                {message.isStreaming && (
                  <span className="ml-1 inline-block h-2 w-2 animate-pulse rounded-full bg-current align-middle"></span>
                )}
              </div>
              
              {message.showTranslation && message.english && (
                <div className="mt-2 pt-2 border-t border-opacity-20 text-sm opacity-80">
                  {message.english}
                </div>
              )}
              
              {message.english && !message.showTranslation && message.role === 'ai' && (
                <button
                  onClick={() => toggleTranslation(message.id)}
                  className="mt-1 text-xs text-blue-300 hover:text-blue-100"
                >
                  Toon vertaling
                </button>
              )}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
      
      {/* Suggestions */}
      {currentSuggestions.length > 0 && (
        <div className="bg-white border-t p-4 space-y-2">
          <p className="text-sm text-slate-500">Suggesties:</p>
          <div className="flex flex-wrap gap-2">
            {currentSuggestions.map((suggestion, index) => (
              <Button
                key={index}
                variant="outline"
                size="sm"
                onClick={() => handleSuggestionClick(suggestion)}
                className="text-sm"
                disabled={isLoadingAi}
              >
                {suggestion.dutch}
              </Button>
            ))}
          </div>
        </div>
      )}
      
      {/* Input */}
      <div className="bg-white border-t p-4">
        <div className="container mx-auto flex items-center space-x-2">
          <input
            type="text"
            placeholder="Typ je bericht..."
            className="flex-1 rounded-lg border border-slate-300 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                const input = e.currentTarget;
                const message = input.value.trim();
                if (message) {
                  handleUserMessage(message);
                  input.value = '';
                }
              }
            }}
            disabled={isLoadingAi}
          />
          <Button
            variant="ghost"
            size="icon"
            onClick={() => {
              // Handle microphone click
            }}
            disabled={isLoadingAi}
          >
            <Mic className="h-5 w-5" />
          </Button>
          <Button
            onClick={() => {
              const input = document.querySelector('input[type="text"]') as HTMLInputElement;
              const message = input?.value.trim();
              if (message) {
                handleUserMessage(message);
                if (input) input.value = '';
              }
            }}
            disabled={isLoadingAi}
          >
            Verstuur
          </Button>
        </div>
      </div>
    </div>
  );
    
    // Create IDs for the message thread
    const userMessageId = uuidv4();
    const aiMessageId = uuidv4();
    
    // Add user message to chat
    const userMessage: Message = {
      id: userMessageId,
      role: 'user',
      dutch: message,
      english: '',
      showTranslation: false,
      isStreaming: false
    };
    
    // Add loading message for AI response
    const aiLoadingMessage: Message = {
      id: aiMessageId,
      role: 'ai',
      dutch: '...',
      english: '',
      showTranslation: false,
      isStreaming: true
    };
    
    // Update state with both messages
    setMessages(prev => [...prev, userMessage, aiLoadingMessage]);
    setIsLoadingAi(true);
    
    try {
      // Prepare the chat history for the API
      const chatHistory = messages
        .filter(msg => msg.role !== 'ai' || !msg.isStreaming) // Exclude any existing loading messages
        .map(msg => ({
          role: msg.role === 'user' ? 'user' as const : 'assistant' as const,
          content: msg.dutch
        }));
      
      // Call the API endpoint
      const response = await fetch(`/api/chat/${topicSlug}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: chatHistory,
          user_input: message
        })
      });
      
      if (!response.ok) {
        throw new Error(`API request failed with status ${response.status}`);
      }
      
      // Process the streaming response
      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response body reader available');
      }
      
      const decoder = new TextDecoder();
      let responseText = '';
      
      // Process each chunk of the stream
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        // Decode the chunk and append to response
        const chunk = decoder.decode(value, { stream: true });
        responseText += chunk;
        
        // Update the AI message with the current response
        setMessages(prev => {
          const updated = [...prev];
          const aiMessageIndex = updated.findIndex(msg => msg.id === aiMessageId);
          
          if (aiMessageIndex !== -1) {
            updated[aiMessageIndex] = {
              ...updated[aiMessageIndex],
              dutch: responseText,
              isStreaming: true
            };
          }
          
          return updated;
        });
      }
      
      // Once done, try to parse the final response
      try {
        const finalResponse = JSON.parse(responseText) as {
          ai_reply: string;
          translation: string;
          suggestions?: Suggestion[];
        };
        
        // Update the final message with the complete response
        setMessages(prev => {
          const updated = [...prev];
          const aiMessageIndex = updated.findIndex(msg => msg.id === aiMessageId);
          
          if (aiMessageIndex !== -1) {
            updated[aiMessageIndex] = {
              ...updated[aiMessageIndex],
              dutch: finalResponse.ai_reply || responseText,
              english: finalResponse.translation || '',
              isStreaming: false
            };
          }
          
          return updated;
        });
        
        // Update suggestions if available
        if (finalResponse.suggestions && Array.isArray(finalResponse.suggestions)) {
          setCurrentSuggestions(finalResponse.suggestions);
        }
      } catch (e) {
        console.error('Error parsing final response:', e);
        // If parsing fails, just show the raw text
        setMessages(prev => {
          const updated = [...prev];
          const aiMessageIndex = updated.findIndex(msg => msg.id === aiMessageId);
          
          if (aiMessageIndex !== -1) {
            updated[aiMessageIndex] = {
              ...updated[aiMessageIndex],
              dutch: responseText,
              isStreaming: false
            };
          }
          
          return updated;
        });
      }
    } catch (error) {
      console.error('Error sending message:', error);
      
      // Show error message to the user
      const errorMessage: Message = {
        id: uuidv4(),
        role: 'ai',
        dutch: 'Sorry, er is een fout opgetreden. Probeer het opnieuw.',
        english: 'Sorry, an error occurred. Please try again.',
        showTranslation: false,
        isStreaming: false
      };
      
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoadingAi(false);
    }
  }, [currentTopic, messages, topicSlug]);
  
  // Toggle translation for a specific message
  const toggleTranslation = useCallback((messageId: string) => {
    setMessages(prev => 
      prev.map(msg => 
        msg.id === messageId 
          ? { ...msg, showTranslation: !msg.showTranslation } 
          : msg
      )
    );
  }, []);
  
  // Handle when a user clicks on a suggestion
  const handleSuggestionClick = useCallback((suggestion: Suggestion) => {
    handleUserMessage(suggestion.dutch);
  }, [handleUserMessage]);

  // Render loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-100">
        <p className="text-slate-600">Laden...</p>
      </div>
    );
  }
  
  // Render error state
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-slate-100 p-4">
        <p className="text-red-500 mb-4">{error}</p>
        <Button onClick={() => router.push('/')}>
          Terug naar start
        </Button>
      </div>
    );
  }
  
  // Render chat interface
  return (
    <div className="flex flex-col h-screen bg-slate-100">
      {/* Header */}
      <header className="bg-white shadow-sm p-4 flex items-center">
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => router.back()}
          className="mr-2"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-lg font-semibold">
          {currentTopic?.title || 'Chat'}
        </h1>
      </header>
      
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div 
            key={message.id} 
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div 
              className={`max-w-[80%] p-3 rounded-lg ${
                message.role === 'user' 
                  ? 'bg-blue-500 text-white rounded-br-none' 
                  : 'bg-white text-gray-800 rounded-bl-none shadow'
              }`}
            >
              <p className="whitespace-pre-wrap">
                {message.isStreaming ? message.dutch || '...' : message.dutch}
              </p>
              {message.english && message.showTranslation && (
                <div className="mt-2 pt-2 border-t border-opacity-20">
                  <p className="text-sm opacity-80">{message.english}</p>
                </div>
              )}
              {message.english && !message.isStreaming && (
                <button
                  onClick={() => toggleTranslation(message.id)}
                  className="text-xs mt-1 opacity-70 hover:opacity-100"
                >
                  {message.showTranslation ? 'Verberg vertaling' : 'Toon vertaling'}
                </button>
              )}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>
      
      {/* Suggestions */}
      {currentSuggestions.length > 0 && !isLoadingAi && (
        <div className="p-4 border-t bg-white">
          <div className="flex flex-wrap gap-2">
            {currentSuggestions.map((suggestion, index) => (
              <Button
                key={index}
                variant="outline"
                size="sm"
                onClick={() => handleSuggestionClick(suggestion)}
                className="text-sm"
              >
                {suggestion.dutch}
              </Button>
            ))}
          </div>
        </div>
      )}
      
      {/* Input area */}
      <div className="p-4 border-t bg-white">
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="icon"
            onClick={() => {
              // Simulate voice input for now
              handleUserMessage('Hallo, ik wil graag iets bestellen');
            }}
            disabled={isLoadingAi}
          >
            <Mic className="h-5 w-5" />
          </Button>
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="Typ een bericht..."
              className="w-full p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && e.currentTarget.value.trim()) {
                  handleUserMessage(e.currentTarget.value);
                  e.currentTarget.value = '';
                }
              }}
              disabled={isLoadingAi}
            />
          </div>
          <Button 
            onClick={() => {
              const input = document.querySelector('input[type="text"]') as HTMLInputElement;
              if (input?.value.trim()) {
                handleUserMessage(input.value);
                input.value = '';
              }
            }}
            disabled={isLoadingAi}
          >
            Verstuur
          </Button>
        </div>
      </div>
    </div>
  );
}

  // Initialize chat with topic data
  useEffect(() => {
    const initializeChat = async () => {
      try {
        const topicData = getTopicBySlug(topicSlug)
        if (!topicData) {
          console.error(`Topic not found: ${topicSlug}`)
          router.push("/")
          return
        }

        setCurrentTopic(topicData)
        
        // Only set initial message if chat is empty
        setMessages(prevMessages => {
          if (prevMessages.length === 0) {
            return [{
              id: uuidv4(),
              role: "ai",
              dutch: topicData.initialAiMessage.dutch,
              english: topicData.initialAiMessage.english,
              showTranslation: false,
              isStreaming: false
            }]
          }
          return prevMessages
        })

        // Set initial suggestions
        if (topicData.initialSuggestions) {
          setCurrentSuggestions(topicData.initialSuggestions)
        }

        console.log(`Chat initialized for topic: ${topicData.title}`)
      } catch (error) {
        console.error("Error initializing chat:", error)
        router.push("/")
      } finally {
        setIsInitialized(true)
      }
    }

    if (topicSlug) {
      initializeChat()
    }
  }, [topicSlug, router])

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (messages.length > 0) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
    }
  }, [messages])

  // Handle sending a user message
  const handleUserMessage = useCallback(async (message: string) => {
    if (!message.trim() || !currentTopic) return

    // Create a unique ID for this message thread
    const threadId = uuidv4()
    const userMessageId = uuidv4()
    const aiMessageId = uuidv4()

    // Add user message to chat
    const userMessage: Message = {
      id: userMessageId,
      role: "user",
      dutch: message,
      english: "",
      showTranslation: false,
      isStreaming: false
    }

    // Add AI loading message
    const aiLoadingMessage: Message = {
      id: aiMessageId,
      role: "ai",
      dutch: "...",
      english: "...",
      showTranslation: false,
      isStreaming: true
    }

    // Update state with both messages
    setMessages(prev => [...prev, userMessage, aiLoadingMessage])
    setIsLoadingAi(true)

    try {
      // Prepare the chat history for the API
      const chatHistory = [
        {
          role: "system" as const,
          content: `You are a helpful assistant for learning Dutch. The current topic is: ${currentTopic.title}. ${currentTopic.description}`
        },
        ...messages
          .filter(msg => msg.role === "user" || msg.role === "ai")
          .map(msg => ({
            role: msg.role === "user" ? "user" as const : "assistant" as const,
            content: msg.dutch
          }))
      ]

      // Call the API endpoint
      const response = await fetch(`/api/chat/${topicSlug}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: chatHistory,
          user_input: message,
          thread_id: threadId
        } as ChatApiRequest & { thread_id: string })
      })

          messages: messages.map(msg => ({
            role: msg.role,
            content: msg.dutch
          })),
          user_input: message
        })
      });
      
      if (!response.ok) {
        throw new Error(`API request failed with status ${response.status}`);
      }
      
      // Process the stream
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let responseText = '';
      
      // Create a placeholder for the AI message
      const aiMessageId = Date.now().toString() + '-ai';
      const newAiMessage: Message = {
        id: aiMessageId,
        role: 'ai',
        dutch: '',
        english: '',
        correction: { correctedDutch: '', explanation: '' },
        showTranslation: false,
        isStreaming: true
      };
      
      // Add the placeholder AI message to the chat
      setMessages(prev => [...prev, newAiMessage]);
      
      if (!reader) {
        throw new Error('No reader available');
      }
      
      // Process the stream
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        // Decode the chunk and append to response
        const chunk = decoder.decode(value, { stream: true });
        responseText += chunk;
        
        // Update the message with the current response
        setMessages(prev => {
          const updated = [...prev];
          const aiMessageIndex = updated.findIndex(msg => msg.id === aiMessageId);
          
          if (aiMessageIndex !== -1) {
            updated[aiMessageIndex] = {
              ...updated[aiMessageIndex],
              dutch: responseText,
              isStreaming: true
            };
          }
          
          return updated;
        });
      }
      
      // Once done, try to parse the final response
      try {
        const finalResponse = JSON.parse(responseText);
        
        // Update the final message with the complete response
        setMessages(prev => {
          const updated = [...prev];
          const aiMessageIndex = updated.findIndex(msg => msg.id === aiMessageId);
          
          if (aiMessageIndex !== -1) {
            updated[aiMessageIndex] = {
              ...updated[aiMessageIndex],
              dutch: finalResponse.ai_reply || responseText,
              english: finalResponse.translation || '',
              correction: finalResponse.correction || { correctedDutch: '', explanation: '' },
              isStreaming: false
            };
          }
          
          return updated;
        });
        
        // Update suggestions if available
        if (finalResponse.suggestions && Array.isArray(finalResponse.suggestions)) {
          setCurrentSuggestions(finalResponse.suggestions);
        } else {
          // Default suggestions
          setCurrentSuggestions([
            {
              dutch: "Ik wil graag een koffie bestellen.",
              english: "I would like to order a coffee.",
            },
            {
              dutch: "Heeft u ook plantaardige melk?",
              english: "Do you have plant-based milk?",
            },
            {
              dutch: "Wat is de speciale koffie van vandaag?",
              english: "What is today's special coffee?",
            },
          ]);
        }
      } catch (e) {
        console.error('Error parsing final response:', e);
        
        // If parsing fails, just show the raw text
        setMessages(prev => {
          const updated = [...prev];
          const aiMessageIndex = updated.findIndex(msg => msg.id === aiMessageId);
          
          if (aiMessageIndex !== -1) {
            updated[aiMessageIndex] = {
              ...updated[aiMessageIndex],
              dutch: responseText,
              isStreaming: false
            };
          }
          
          return updated;
        });
      }
    } catch (error) {
      console.error('Error sending message:', error);
      
      // Show error message to the user
      const errorMessage: Message = {
        id: Date.now().toString(),
        role: 'ai',
        dutch: 'Sorry, er is een fout opgetreden. Probeer het opnieuw.',
        english: 'Sorry, an error occurred. Please try again.',
        showTranslation: false,
        isStreaming: false
      };
      
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoadingAi(false);
    }
  }, [messages, topicSlug]);

  // Toggle translation for a specific message
  const toggleTranslation = useCallback((messageId: string) => {
    setMessages(prevMessages =>
      prevMessages.map(msg =>
        msg.id === messageId
          ? { ...msg, showTranslation: !msg.showTranslation }
          : msg
      )
    )
  }, [])

  // Handle when a user clicks on a suggestion
  const handleSuggestionClick = useCallback((suggestion: Suggestion) => {
    handleUserMessage(suggestion.dutch)
  }, [handleUserMessage])
        })
      );
      setMessages(updatedMessages);
      console.log(`Toggled translation for message ID: ${messageId}`);
    } catch (error) {
      console.error('Error toggling translation:', error);
    }
  }, [messages, simulateFetchTranslation]);

  const handleUserMessage = useCallback((
    userInputDutch: string,
    userInputEnglish?: string,
    type: "voice" | "suggestion" = "suggestion",
  ) => {
    async function processMessage() {
      if (isLoadingAi) return;

      console.log(`User (${type}) said (Dutch): "${userInputDutch}"`);
      const newUserMessageId = uuidv4();
      const newUserMessage: Message = {
        id: newUserMessageId,
        role: "user",
            ]);
          }
        } catch (e) {
          console.error('Error parsing final response:', e);
          
          // If parsing fails, just show the raw text
          setMessages(prev => {
            const updated = [...prev];
            const aiMessageIndex = updated.findIndex(msg => msg.id === aiMessageId);
            
            if (aiMessageIndex !== -1) {
              updated[aiMessageIndex] = {
                ...updated[aiMessageIndex],
                dutch: responseText,
                isStreaming: false
              };
            }
            
            return updated;
          });
        }
              } catch (e) {
                console.error('Error parsing chunk:', e);
              }
            }
          }
        }


        // Update the final message state
        setMessages(prev => {
          const updated = [...prev];
          const aiMessageIndex = updated.findIndex(msg => msg.id === aiMessageId);
          
          if (aiMessageIndex !== -1) {
            updated[aiMessageIndex] = {
              ...updated[aiMessageIndex],
              isStreaming: false
            };
          }
          
          return updated;
        });

        // Update suggestions from the final result
        if (result.suggestions && Array.isArray(result.suggestions)) {
          setCurrentSuggestions(result.suggestions);
        } else {
          // Default suggestions if none provided
          setCurrentSuggestions([
            {
              dutch: "Ik wil graag een koffie bestellen.",
              english: "I would like to order a coffee.",
            },
            {
              dutch: "Heeft u ook plantaardige melk?",
              english: "Do you have plant-based milk?",
            },
            {
              dutch: "Wat is de speciale koffie van vandaag?",
              english: "What is today's special coffee?",
            },
          ]);
        }
      } catch (error) {
        console.error('Error getting AI response:', error);
        // Fallback to a default message if the API call fails
        const errorMessage: Message = {
          id: uuidv4(),
          role: "ai",
          dutch: "Sorry, er is een fout opgetreden bij het verwerken van je bericht.",
          english: "Sorry, an error occurred while processing your message.",
          showTranslation: false,
        };
        setMessages(prev => [...prev, errorMessage]);
      } finally {
        setIsLoadingAi(false);
      }
    }
    
    // Call the async function
    processMessage();
  }, [isLoadingAi, messages, topicSlug]);

  const handleMicClick = () => {
    if (isLoadingAi) return
    console.log("Mic button clicked")
    const simulatedVoiceInputDutch = "Ik willen een broodje kaas, alstublieft." // I want (incorrect) a cheese sandwich, please.
    const simulatedVoiceInputEnglish = "I want (incorrect) a cheese sandwich, please."
    handleUserMessage(simulatedVoiceInputDutch, simulatedVoiceInputEnglish, "voice")
  }

  if (!currentTopic) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-100">
        <p className="text-slate-600">Laden...</p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-screen bg-slate-100">
      <header className="flex items-center justify-between p-3 border-b bg-white shadow-sm sticky top-0 z-10">
        <Button variant="ghost" size="icon" onClick={() => router.push("/")} aria-label="Back to topics">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-lg font-semibold text-slate-700 truncate px-2">{currentTopic.title}</h1>
        <div className="w-10"></div> {/* Spacer */}
      </header>

      <ScrollArea className="flex-grow">
        <div className="p-4 space-y-1 pb-48">
          {messages.map((msg) => (
            <ChatBubble key={msg.id} message={msg} onToggleTranslate={toggleTranslation} />
          ))}
          {isLoadingAi && (
            <div className="flex justify-start mb-4">
              <div className="max-w-[75%] p-3 rounded-xl shadow-md bg-muted text-muted-foreground rounded-bl-none">
                <p className="whitespace-pre-wrap text-sm italic">AI typt...</p>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      <footer className="fixed bottom-0 left-0 right-0 bg-white border-t p-3 shadow-top-md z-10">
        <div className="flex flex-col items-center gap-3 max-w-2xl mx-auto">
          {currentSuggestions.length > 0 && !isLoadingAi && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 w-full">
              {currentSuggestions.map((suggestion, index) => (
                <Button
                  key={index}
                  variant="outline"
                  className="text-sm h-auto py-2 whitespace-normal text-center bg-slate-100 text-slate-700 border-slate-300 hover:bg-slate-200 hover:text-slate-800"
                  onClick={() => handleUserMessage(suggestion.dutch, suggestion.english, "suggestion")}
                  disabled={isLoadingAi}
                >
                  {suggestion.dutch}
                </Button>
              ))}
            </div>
          )}
          <Button
            size="lg"
            className="rounded-full w-16 h-16 shadow-lg bg-primary hover:bg-primary/90"
            onClick={handleMicClick}
            disabled={isLoadingAi}
            aria-label="Record voice message"
          >
            <Mic className="w-7 h-7 text-primary-foreground" />
          </Button>
        </div>
      </footer>
    </div>
  )
}
