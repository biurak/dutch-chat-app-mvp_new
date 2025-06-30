import { useState, useRef, useCallback, useEffect } from 'react';

// Simplified type for speech recognition result
type SpeechRecognitionResult = {
  isFinal: boolean;
  [0]: { transcript: string; confidence: number };
};

// Minimal type for the recognition instance
type SpeechRecognitionType = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  onresult: (event: { results: SpeechRecognitionResult[] }) => void;
  onerror: (event: { error: string; message: string }) => void;
  onend: () => void;
  start: () => void;
  stop: () => void;
  abort: () => void;
};

declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognitionType;
    webkitSpeechRecognition: new () => SpeechRecognitionType;
  }
}

interface SpeechRecognitionOptions {
  continuous?: boolean;
  interimResults?: boolean;
  lang?: string;
  onResult: (transcript: string, isFinal: boolean) => void;
  onError?: (error: string) => void;
}

export function useSpeechRecognition() {
  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);

  const startListening = useCallback(({
    continuous = false,
    interimResults = true,
    lang = 'nl-NL',
    onResult,
    onError
  }: SpeechRecognitionOptions) => {
    try {
      // Clear any previous errors
      setError(null);
      
      // Check for browser support
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SpeechRecognition) {
        throw new Error('Speech recognition is not supported in this browser');
      }

      // Create a new recognition instance
      const recognition = new SpeechRecognition();
      recognition.continuous = continuous;
      recognition.interimResults = interimResults;
      recognition.lang = lang;

      // Set up event handlers
      recognition.onresult = (event: any) => {
        let finalTranscript = '';
        let interimTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcript = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcript;
          } else {
            interimTranscript += transcript;
          }
        }

        if (finalTranscript) {
          onResult(finalTranscript, true);
        } else if (interimTranscript) {
          onResult(interimTranscript, false);
        }
      };

      recognition.onerror = (event: any) => {
        console.error('Speech recognition error:', event.error);
        let errorMessage = 'Error occurred in speech recognition';
        
        switch (event.error) {
          case 'not-allowed':
            errorMessage = 'Microphone access was denied. Please allow microphone access to use voice commands.';
            break;
          case 'audio-capture':
            errorMessage = 'No microphone was found. Please ensure a microphone is connected.';
            break;
          case 'network':
            errorMessage = 'Network error occurred while trying to access the speech recognition service.';
            break;
          default:
            errorMessage = `Speech recognition error: ${event.error}`;
        }
        
        setError(errorMessage);
        onError?.(errorMessage);
        stopListening();
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      // Start recognition
      recognition.start();
      setIsListening(true);
      recognitionRef.current = recognition;
      
      return true;
    } catch (err) {
      const error = err as Error;
      console.error('Error initializing speech recognition:', error);
      setError(`Failed to initialize speech recognition: ${error.message}`);
      onError?.(`Failed to initialize speech recognition: ${error.message}`);
      return false;
    }
  }, []);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
      setIsListening(false);
    }
  }, []);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  return {
    isListening,
    error,
    startListening,
    stopListening,
    isSupported: typeof window !== 'undefined' && (window.SpeechRecognition || window.webkitSpeechRecognition)
  };
}
