# Voice Chat Technical Implementation Specification

## Overview
Technical specification for implementing voice chat features in the Dutch Chat App MVP. This document provides implementation-ready details for LLM-assisted development.

## Current Architecture Analysis

### Existing Components
- **ChatClient**: Main chat component (`app/[topic]/chat-client.tsx`)
- **Message Interface**: `components/chat/chat-message.interface.ts`
- **API Endpoints**: `/api/chat/[topic]` and `/api/correct`
- **State Management**: React hooks with useState/useCallback
- **UI Framework**: Tailwind CSS + shadcn/ui components

### Current Message Flow
1. User types message → `handleUserMessage()`
2. Grammar check via `/api/correct` (parallel)
3. AI response via `/api/chat/[topic]`
4. Update messages state with corrections/translations
5. Display suggestions from AI response

## Implementation Requirements

### 1. Voice Recording Hook (`useVoiceRecording`)

```typescript
// File: hooks/use-voice-recording.ts
import { useState, useRef, useCallback } from 'react';

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
  const recognitionRef = useRef<SpeechRecognition | null>(null);

  // Check browser support
  const isSupported = typeof window !== 'undefined' && 
    ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);

  const startRecording = useCallback(() => {
    if (!isSupported) {
      setError('Speech recognition not supported');
      return;
    }

    try {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      
      recognition.lang = config?.language || 'nl-NL';
      recognition.continuous = config?.continuous || false;
      recognition.interimResults = config?.interimResults || true;

      recognition.onstart = () => {
        setIsRecording(true);
        setError(null);
      };

      recognition.onresult = (event) => {
        let finalTranscript = '';
        let interimTranscript = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          if (result.isFinal) {
            finalTranscript += result[0].transcript;
            setConfidence(result[0].confidence);
          } else {
            interimTranscript += result[0].transcript;
          }
        }

        setTranscript(finalTranscript || interimTranscript);
      };

      recognition.onerror = (event) => {
        setError(event.error);
        setIsRecording(false);
      };

      recognition.onend = () => {
        setIsRecording(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      setError('Failed to start recording');
      setIsRecording(false);
    }
  }, [config, isSupported]);

  const stopRecording = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
  }, []);

  const clearTranscript = useCallback(() => {
    setTranscript('');
    setConfidence(0);
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
```

### 2. Text-to-Speech Hook (`useTextToSpeech`)

```typescript
// File: hooks/use-text-to-speech.ts
import { useState, useRef, useCallback, useEffect } from 'react';

interface TTSConfig {
  rate: number; // 0.1 to 10
  pitch: number; // 0 to 2
  volume: number; // 0 to 1
  voice: SpeechSynthesisVoice | null;
}

interface TTSReturn {
  isPlaying: boolean;
  isPaused: boolean;
  isSupported: boolean;
  voices: SpeechSynthesisVoice[];
  speak: (text: string, language?: 'nl-NL' | 'en-US') => void;
  pause: () => void;
  resume: () => void;
  stop: () => void;
  setConfig: (config: Partial<TTSConfig>) => void;
}

export function useTextToSpeech(initialConfig?: Partial<TTSConfig>): TTSReturn {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [config, setConfigState] = useState<TTSConfig>({
    rate: 1,
    pitch: 1,
    volume: 1,
    voice: null,
    ...initialConfig
  });
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  const isSupported = typeof window !== 'undefined' && 'speechSynthesis' in window;

  // Load available voices
  useEffect(() => {
    if (!isSupported) return;

    const loadVoices = () => {
      const availableVoices = speechSynthesis.getVoices();
      setVoices(availableVoices);
    };

    loadVoices();
    speechSynthesis.addEventListener('voiceschanged', loadVoices);

    return () => {
      speechSynthesis.removeEventListener('voiceschanged', loadVoices);
    };
  }, [isSupported]);

  const speak = useCallback((text: string, language: 'nl-NL' | 'en-US' = 'nl-NL') => {
    if (!isSupported || !text.trim()) return;

    // Stop any current speech
    speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = config.rate;
    utterance.pitch = config.pitch;
    utterance.volume = config.volume;
    utterance.lang = language;

    // Find appropriate voice for language
    const appropriateVoice = voices.find(voice => 
      voice.lang.startsWith(language.split('-')[0])
    ) || config.voice;

    if (appropriateVoice) {
      utterance.voice = appropriateVoice;
    }

    utterance.onstart = () => {
      setIsPlaying(true);
      setIsPaused(false);
    };

    utterance.onend = () => {
      setIsPlaying(false);
      setIsPaused(false);
    };

    utterance.onerror = () => {
      setIsPlaying(false);
      setIsPaused(false);
    };

    utterance.onpause = () => {
      setIsPaused(true);
    };

    utterance.onresume = () => {
      setIsPaused(false);
    };

    utteranceRef.current = utterance;
    speechSynthesis.speak(utterance);
  }, [config, voices, isSupported]);

  const pause = useCallback(() => {
    if (isSupported && isPlaying) {
      speechSynthesis.pause();
    }
  }, [isSupported, isPlaying]);

  const resume = useCallback(() => {
    if (isSupported && isPaused) {
      speechSynthesis.resume();
    }
  }, [isSupported, isPaused]);

  const stop = useCallback(() => {
    if (isSupported) {
      speechSynthesis.cancel();
      setIsPlaying(false);
      setIsPaused(false);
    }
  }, [isSupported]);

  const setConfig = useCallback((newConfig: Partial<TTSConfig>) => {
    setConfigState(prev => ({ ...prev, ...newConfig }));
  }, []);

  return {
    isPlaying,
    isPaused,
    isSupported,
    voices,
    speak,
    pause,
    resume,
    stop,
    setConfig
  };
}
```

### 3. ChatClient Component Updates

#### 3.1 State Management Updates

```typescript
// Add to existing ChatClient state
const [isRecording, setIsRecording] = useState(false);
const [voiceTranscript, setVoiceTranscript] = useState('');
const [audioPlaying, setAudioPlaying] = useState<string | null>(null);
const [speechSettings, setSpeechSettings] = useState({
  rate: 1,
  pitch: 1,
  volume: 1,
  autoPlay: false
});

// Import hooks
const voiceRecording = useVoiceRecording({ language: 'nl-NL' });
const textToSpeech = useTextToSpeech({
  rate: speechSettings.rate,
  pitch: speechSettings.pitch,
  volume: speechSettings.volume
});
```

#### 3.2 Voice Input Integration

```typescript
// Replace existing mic button onClick handler
const handleVoiceInput = useCallback(() => {
  if (!voiceRecording.isSupported) {
    alert('Voice input not supported in this browser');
    return;
  }

  if (voiceRecording.isRecording) {
    voiceRecording.stopRecording();
  } else {
    voiceRecording.startRecording();
  }
}, [voiceRecording]);

// Handle voice transcript
useEffect(() => {
  if (voiceRecording.transcript && !voiceRecording.isRecording) {
    setInputValue(voiceRecording.transcript);
    voiceRecording.clearTranscript();
  }
}, [voiceRecording.transcript, voiceRecording.isRecording]);
```

#### 3.3 Voice Output Integration

```typescript
// Add speaker button handlers
const handlePlayAudio = useCallback((messageId: string, text: string, language: 'nl-NL' | 'en-US' = 'nl-NL') => {
  if (audioPlaying === messageId) {
    textToSpeech.stop();
    setAudioPlaying(null);
  } else {
    setAudioPlaying(messageId);
    textToSpeech.speak(text, language);
  }
}, [audioPlaying, textToSpeech]);

// Handle TTS events
useEffect(() => {
  if (!textToSpeech.isPlaying && audioPlaying) {
    setAudioPlaying(null);
  }
}, [textToSpeech.isPlaying, audioPlaying]);
```

### 4. UI Component Updates

#### 4.1 Voice Input Button

```typescript
// Update mic button in input section
<Button 
  type="button" 
  variant={voiceRecording.isRecording ? "default" : "outline"}
  size="icon"
  onClick={handleVoiceInput}
  disabled={isLoadingAi || !voiceRecording.isSupported}
  className={`${voiceRecording.isRecording ? 'bg-red-600 hover:bg-red-700 animate-pulse' : ''}`}
>
  <Mic className={`w-4 h-4 ${voiceRecording.isRecording ? 'text-white' : ''}`} />
</Button>

{/* Recording indicator */}
{voiceRecording.isRecording && (
  <div className="absolute top-2 left-2 bg-red-600 text-white px-2 py-1 rounded text-xs">
    Recording... {/* Add timer here */}
  </div>
)}
```

#### 4.2 Speaker Buttons for Messages

```typescript
// Add to message bubble component
import { Volume2, VolumeX } from 'lucide-react';

// In message rendering section, add speaker buttons
<div className="flex justify-between items-center mt-1 pt-1 border-t border-opacity-20 border-slate-300 text-xs text-slate-300">
  {/* Existing correction/translation buttons */}
  
  {/* Speaker button for Dutch text */}
  <button
    onClick={(e) => {
      e.stopPropagation();
      const textToPlay = message.showCorrections && message.correctedText 
        ? message.correctedText 
        : message.dutch;
      handlePlayAudio(message.id, textToPlay, 'nl-NL');
    }}
    className="text-xs hover:underline focus:outline-none ml-2"
    disabled={!textToSpeech.isSupported}
  >
    {audioPlaying === message.id ? (
      <VolumeX className="w-3 h-3 inline" />
    ) : (
      <Volume2 className="w-3 h-3 inline" />
    )}
    {audioPlaying === message.id ? ' Stop' : ' Play Dutch'}
  </button>

  {/* Speaker button for English translation */}
  {message.english && (
    <button
      onClick={(e) => {
        e.stopPropagation();
        handlePlayAudio(`${message.id}-en`, message.english, 'en-US');
      }}
      className="text-xs hover:underline focus:outline-none ml-2"
      disabled={!textToSpeech.isSupported}
    >
      {audioPlaying === `${message.id}-en` ? (
        <VolumeX className="w-3 h-3 inline" />
      ) : (
        <Volume2 className="w-3 h-3 inline" />
      )}
      {audioPlaying === `${message.id}-en` ? ' Stop' : ' Play English'}
    </button>
  )}
</div>
```

### 5. TypeScript Declarations

```typescript
// File: types/speech.d.ts
declare global {
  interface Window {
    SpeechRecognition: typeof SpeechRecognition;
    webkitSpeechRecognition: typeof SpeechRecognition;
  }
}

interface SpeechRecognition extends EventTarget {
  continuous: boolean;
  grammars: SpeechGrammarList;
  interimResults: boolean;
  lang: string;
  maxAlternatives: number;
  serviceURI: string;
  
  start(): void;
  stop(): void;
  abort(): void;
  
  onaudiostart: ((this: SpeechRecognition, ev: Event) => any) | null;
  onaudioend: ((this: SpeechRecognition, ev: Event) => any) | null;
  onend: ((this: SpeechRecognition, ev: Event) => any) | null;
  onerror: ((this: SpeechRecognition, ev: SpeechRecognitionErrorEvent) => any) | null;
  onnomatch: ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => any) | null;
  onresult: ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => any) | null;
  onsoundstart: ((this: SpeechRecognition, ev: Event) => any) | null;
  onsoundend: ((this: SpeechRecognition, ev: Event) => any) | null;
  onspeechstart: ((this: SpeechRecognition, ev: Event) => any) | null;
  onspeechend: ((this: SpeechRecognition, ev: Event) => any) | null;
  onstart: ((this: SpeechRecognition, ev: Event) => any) | null;
}

declare var SpeechRecognition: {
  prototype: SpeechRecognition;
  new(): SpeechRecognition;
};

interface SpeechRecognitionEvent extends Event {
  readonly resultIndex: number;
  readonly results: SpeechRecognitionResultList;
}

interface SpeechRecognitionErrorEvent extends Event {
  readonly error: string;
  readonly message: string;
}
```

### 6. Error Handling & Fallbacks

```typescript
// Error handling utilities
export const VoiceErrorHandler = {
  handleRecordingError: (error: string) => {
    const errorMessages: Record<string, string> = {
      'not-allowed': 'Microphone access denied. Please allow microphone access and try again.',
      'no-speech': 'No speech detected. Please try speaking closer to the microphone.',
      'audio-capture': 'Microphone not found. Please check your microphone connection.',
      'network': 'Network error. Please check your connection and try again.',
      'not-supported': 'Speech recognition is not supported in this browser.'
    };
    
    return errorMessages[error] || 'An error occurred during voice recording. Please try again.';
  },

  handlePlaybackError: (error: string) => {
    console.error('TTS Error:', error);
    return 'Audio playback failed. Please try again.';
  }
};

// Browser compatibility check
export const checkVoiceSupport = () => {
  return {
    speechRecognition: typeof window !== 'undefined' && 
      ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window),
    speechSynthesis: typeof window !== 'undefined' && 'speechSynthesis' in window,
    getUserMedia: typeof navigator !== 'undefined' && 'mediaDevices' in navigator
  };
};
```

### 7. Implementation Steps

#### Step 1: Create Hooks
1. Create `hooks/use-voice-recording.ts`
2. Create `hooks/use-text-to-speech.ts`
3. Add TypeScript declarations in `types/speech.d.ts`

#### Step 2: Update ChatClient
1. Import new hooks
2. Add voice-related state variables
3. Implement voice input handler
4. Implement voice output handlers
5. Add useEffect for handling voice events

#### Step 3: Update UI Components
1. Modify mic button functionality
2. Add speaker buttons to message bubbles
3. Add recording indicators
4. Add visual feedback for audio playback

#### Step 4: Error Handling
1. Add error boundaries for voice features
2. Implement graceful fallbacks
3. Add user feedback for errors

#### Step 5: Testing
1. Test in different browsers
2. Test on mobile devices
3. Test with different Dutch accents
4. Test error scenarios

### 8. Browser Compatibility Notes

```typescript
// Browser detection utility
export const getBrowserVoiceCapabilities = () => {
  const isChrome = /Chrome/.test(navigator.userAgent);
  const isFirefox = /Firefox/.test(navigator.userAgent);
  const isSafari = /Safari/.test(navigator.userAgent) && !/Chrome/.test(navigator.userAgent);
  const isEdge = /Edg/.test(navigator.userAgent);

  return {
    speechRecognition: {
      supported: isChrome || isEdge || (isSafari && 'SpeechRecognition' in window),
      quality: isChrome || isEdge ? 'high' : 'medium'
    },
    speechSynthesis: {
      supported: true, // Most browsers support this
      quality: isChrome || isEdge ? 'high' : isSafari ? 'medium' : 'low'
    }
  };
};
```

This technical specification provides all the implementation details needed for an LLM to implement the voice chat feature while maintaining compatibility with the existing codebase architecture.
