import { useState, useRef, useCallback, useEffect } from 'react';

// SpeechRecognition API types - using any for better browser compatibility
// The actual types are defined in types/speech.d.ts but we use any to avoid conflicts

interface VoiceRecordingConfig {
  language: 'nl-NL' | 'en-US';
  continuous: boolean;
  interimResults: boolean;
}

interface VoiceRecordingReturn {
  isRecording: boolean;
  transcript: string;
  confidence: number;
  error: string | null;
  isSupported: boolean;
  startRecording: () => void;
  stopRecording: () => void;
  clearTranscript: () => void;
}

export function useVoiceRecording(config?: Partial<VoiceRecordingConfig>): VoiceRecordingReturn {
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [confidence, setConfidence] = useState(0);
  const [error, setError] = useState<string | null>(null);
  // Using any for SpeechRecognition to avoid type conflicts between browser implementations
  const recognitionRef = useRef<any>(null);
  
  // Default configuration
  const fullConfig: VoiceRecordingConfig = {
    language: 'nl-NL',
    continuous: false,
    interimResults: true,
    ...config
  };

  // Check browser support and secure context
  const isSecureContext = typeof window !== 'undefined' && 
    (window.location.protocol === 'https:' || 
     window.location.hostname === 'localhost' || 
     window.location.hostname === '127.0.0.1');
     
  const isSupported = typeof window !== 'undefined' && 
    isSecureContext &&
    ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);

  // Set up recognition event handlers
  const setupRecognitionHandlers = useCallback((recognition: any) => {
    if (!recognition) return;
    
    recognition.onstart = () => {
      console.log('Speech recognition started');
      setIsRecording(true);
      setError(null);
    };

    recognition.onresult = (event: any) => {
      let finalTranscript = '';
      let interimTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const alternative = result[0];
        
        if (result.isFinal) {
          finalTranscript += alternative.transcript;
          setConfidence(alternative.confidence);
        } else {
          interimTranscript += alternative.transcript;
        }
      }

      if (finalTranscript) {
        setTranscript(finalTranscript.trim());
      } else if (fullConfig.interimResults && interimTranscript) {
        setTranscript(interimTranscript.trim());
      }
    };

    recognition.onend = () => {
      console.log('Speech recognition ended');
      setIsRecording(false);
    };
    
    recognition.onaudiostart = () => {
      console.log('Audio capture started');
    };
    
    recognition.onaudioend = () => {
      console.log('Audio capture ended');
    };
    
    recognition.onsoundstart = () => {
      console.log('Sound detected');
    };
    
    recognition.onsoundend = () => {
      console.log('Sound ended');
    };
    
    recognition.onspeechstart = () => {
      console.log('Speech detected');
    };
    
    recognition.onspeechend = () => {
      console.log('Speech ended');
    };

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error:', event.error, event);
      setIsRecording(false);
      
      const errorMessages: Record<string, string> = {
        'no-speech': 'No speech detected. Please try again.',
        'audio-capture': 'Microphone access denied or not available.',
        'not-allowed': 'Microphone permission denied. Please check your browser settings.',
        'network': 'Network error. Please check your internet connection.',
        'network-update': 'Network error. Please refresh the page and try again.',
        'aborted': 'Recording was stopped.',
        'language-not-supported': 'Dutch language not supported for speech recognition in this browser.',
        'service-not-allowed': 'Speech recognition service not allowed. Check browser settings.',
        'bad-grammar': 'There was an error with the speech recognition grammar.',
        'not-found': 'Speech recognition service not available.'
      };
      
      // Provide more specific error messages when possible
      let errorMessage = errorMessages[event.error] || 'An error occurred during voice recording.';
      
      // Additional guidance for common issues
      if (event.error === 'network' && !navigator.onLine) {
        errorMessage = 'You appear to be offline. Please check your internet connection.';
      } else if (event.error === 'not-allowed') {
        errorMessage = 'Microphone access was denied. Please allow microphone access in your browser settings to use voice recording.';
      } else if (event.error === 'network') {
        errorMessage = 'Could not connect to the speech recognition service. Please check your internet connection and try again.';
      }
      
      setError(errorMessage);
      
      // Log additional debug info
      console.log('Speech recognition error details:', {
        error: event.error,
        message: event.message,
        browser: navigator.userAgent,
        secureContext: window.isSecureContext,
        protocol: window.location.protocol,
        hostname: window.location.hostname
      });
    };
  }, [fullConfig.interimResults]);

  // Initialize speech recognition with proper TypeScript types
  useEffect(() => {
    if (!isSupported) return;

    // Add a small delay to ensure the component is fully mounted
    const initTimeout = setTimeout(() => {
      try {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        const recognition = new SpeechRecognition();
        
        // Set recognition properties
        recognition.continuous = fullConfig.continuous;
        recognition.interimResults = fullConfig.interimResults;
        recognition.lang = fullConfig.language;
        recognition.maxAlternatives = 1;

        // Set up event handlers
        setupRecognitionHandlers(recognition);
        
        recognitionRef.current = recognition;
      } catch (err) {
        console.error('Failed to initialize speech recognition:', err);
        setError('Failed to initialize voice recognition. Please refresh the page.');
      }
    }, 100);

    return () => {
      clearTimeout(initTimeout);
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, [fullConfig.language, fullConfig.continuous, fullConfig.interimResults, isSupported, setupRecognitionHandlers]);

  const startRecording = useCallback(async () => {
    console.log('Starting voice recording...');
    
    try {
      if (typeof window === 'undefined') {
        throw new Error('Voice recording is only available in the browser');
      }

      if (!isSecureContext) {
        throw new Error('Voice recording requires a secure context (HTTPS or localhost)');
      }

      if (!isSupported) {
        throw new Error('Voice recognition is not supported in this browser. Try using Chrome, Edge, or Safari.');
      }

      // Check if recognition is initialized
      if (!recognitionRef.current) {
        console.log('Initializing speech recognition...');
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        recognitionRef.current = new SpeechRecognition();
        setupRecognitionHandlers(recognitionRef.current);
      }

      // Request microphone permission explicitly
      console.log('Requesting microphone access...');
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Stop all tracks to release the microphone
      stream.getTracks().forEach(track => track.stop());
      
      // Small delay to ensure the microphone is properly released
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Start recognition
      console.log('Starting speech recognition...');
      setError(null);
      setTranscript('');
      setConfidence(0);
      
      // Add error handling for the start method
      try {
        if (recognitionRef.current) {
          recognitionRef.current.start();
        } else {
          throw new Error('Speech recognition not properly initialized');
        }
      } catch (startError) {
        console.error('Error starting recognition:', startError);
        throw new Error('Failed to start voice recognition. Please try again.');
      }
      
    } catch (error) {
      const err = error as Error;
      console.error('Error in startRecording:', err);
      setError(err.message || 'Failed to start voice recording. Please try again.');
      setIsRecording(false);
      
      // Log additional debug info
      console.log('Recording error details:', {
        error: err.message,
        browser: navigator?.userAgent,
        secureContext: window?.isSecureContext,
        protocol: window?.location?.protocol,
        hostname: window?.location?.hostname,
        isSupported,
        isSecureContext
      });
    }
  }, [isSupported, isSecureContext, setupRecognitionHandlers]);

  const stopRecording = useCallback(() => {
    if (recognitionRef.current && isRecording) {
      recognitionRef.current.stop();
    }
  }, [isRecording]);

  const clearTranscript = useCallback(() => {
    setTranscript('');
    setConfidence(0);
    setError(null);
  }, []);

  return {
    isRecording,
    transcript,
    confidence,
    error,
    isSupported,
    startRecording,
    stopRecording,
    clearTranscript
  };
}
