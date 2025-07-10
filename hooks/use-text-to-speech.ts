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

  const startSpeech = useCallback((text: string, language: 'nl-NL' | 'en-US' = 'nl-NL') => {
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

    utterance.onerror = (event) => {
      // Handle different types of errors
      if (event.error === 'interrupted') {
        console.log('Speech synthesis was interrupted - this is normal when starting new speech');
      } else {
        console.error('Speech synthesis error:', event);
      }
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
  }, [config, voices]);

  const speak = useCallback((text: string, language: 'nl-NL' | 'en-US' = 'nl-NL') => {
    if (!isSupported || !text.trim()) return;

    // Stop any current speech and wait a bit for cleanup
    if (speechSynthesis.speaking) {
      speechSynthesis.cancel();
      // Small delay to ensure the cancellation is processed
      setTimeout(() => {
        startSpeech(text, language);
      }, 100);
    } else {
      startSpeech(text, language);
    }
  }, [isSupported, startSpeech]);

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
