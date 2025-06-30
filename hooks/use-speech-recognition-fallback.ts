import { useState, useRef, useEffect, useCallback } from 'react';

interface SpeechRecognitionOptions {
  lang?: string;
  continuous?: boolean;
  interimResults?: boolean;
  onResult: (transcript: string, isFinal: boolean) => void;
  onError: (error: string) => void;
}

export function useSpeechRecognitionFallback() {
  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);
  const fallbackTimeoutRef = useRef<NodeJS.Timeout>();
  const isUnmounted = useRef(false);

  const startListening = useCallback((options: SpeechRecognitionOptions) => {
    if (isUnmounted.current) return;
    
    const {
      lang = 'nl-NL',
      continuous = false,
      interimResults = true,
      onResult,
      onError
    } = options;

    const handleError = (errorMessage: string) => {
      if (isUnmounted.current) return;
      console.error('Speech recognition error:', errorMessage);
      setError(errorMessage);
      onError(errorMessage);
      setIsListening(false);
    };

    const cleanup = () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
          recognitionRef.current = null;
        } catch (e) {
          console.warn('Error cleaning up recognition:', e);
        }
      }
      clearTimeout(fallbackTimeoutRef.current);
    };

    const tryNativeRecognition = () => {
      if (isUnmounted.current) return;
      
      try {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SpeechRecognition) {
          throw new Error('Speech recognition not supported');
        }

        const recognition = new SpeechRecognition();
        recognition.continuous = continuous;
        recognition.interimResults = interimResults;
        recognition.lang = lang;

        recognition.onresult = (event: any) => {
          if (isUnmounted.current) return;
          const transcript = Array.from(event.results)
            .map((result: any) => result[0]?.transcript || '')
            .join('');
          const isFinal = event.results[event.results.length - 1]?.isFinal;
          onResult(transcript, isFinal);
        };

        recognition.onerror = (event: any) => {
          if (isUnmounted.current) return;
          console.error('Native recognition error:', event);
          // Don't throw here, we'll try the fallback
          throw new Error('Native recognition failed');
        };

        recognition.onend = () => {
          if (isUnmounted.current) return;
          if (isListening) {
            // If we're still supposed to be listening, restart
            try {
              recognition.start();
            } catch (e) {
              handleError('Failed to restart recognition');
            }
          }
        };

        // Start recognition
        recognition.start();
        recognitionRef.current = recognition;
        setIsListening(true);
        setError(null);
        
        // Set a timeout to detect if recognition fails to start
        fallbackTimeoutRef.current = setTimeout(() => {
          if (isListening && recognitionRef.current) {
            console.log('Recognition seems stuck, cleaning up...');
            cleanup();
            throw new Error('Recognition start timeout');
          }
        }, 3000);

      } catch (err) {
        console.error('Native recognition failed, trying fallback...', err);
        throw err; // Will be caught by the outer catch
      }
    };

    // First try with a clean state
    cleanup();
    
    // Request microphone access first
    navigator.mediaDevices.getUserMedia({ audio: true })
      .then(stream => {
        // Stop all tracks to release the microphone
        stream.getTracks().forEach(track => track.stop());
        
        // Small delay to ensure the microphone is properly released
        return new Promise(resolve => setTimeout(resolve, 100));
      })
      .then(() => {
        if (isUnmounted.current) return;
        try {
          tryNativeRecognition();
        } catch (nativeError) {
          console.warn('Native recognition failed, trying fallback...', nativeError);
          // Fallback to a different approach
          handleError('Speech recognition is not available. Please try again later or use text input.');
        }
      })
      .catch(err => {
        console.error('Microphone access denied or not available:', err);
        handleError('Microphone access is required for voice input. Please allow microphone access and try again.');
      });

    return cleanup;
  }, [isListening]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {
        console.warn('Error stopping recognition:', e);
      }
      recognitionRef.current = null;
    }
    clearTimeout(fallbackTimeoutRef.current);
    setIsListening(false);
  }, []);

  useEffect(() => {
    return () => {
      isUnmounted.current = true;
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {
          console.warn('Error cleaning up recognition on unmount:', e);
        }
      }
      clearTimeout(fallbackTimeoutRef.current);
    };
  }, []);

  return {
    isListening,
    error,
    isSupported: typeof window !== 'undefined' && 
                 (window.SpeechRecognition || window.webkitSpeechRecognition),
    startListening,
    stopListening,
  };
}
