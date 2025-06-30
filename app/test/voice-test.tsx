'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Mic, Volume2, VolumeX } from 'lucide-react';
import { useSpeechRecognitionFallback } from '@/hooks/use-speech-recognition-fallback';
import { useTextToSpeech } from '@/hooks/use-text-to-speech';

export default function VoiceTestPage() {
  const [testText, setTestText] = useState('Hallo, dit is een test voor spraakherkenning en tekst-naar-spraak.');
  const [isPlaying, setIsPlaying] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [recognitionError, setRecognitionError] = useState<string | null>(null);
  
  const { startListening, stopListening, error, isSupported } = useSpeechRecognitionFallback();
  const textToSpeech = useTextToSpeech();

  const handleResult = useCallback((transcript: string, isFinal: boolean) => {
    if (isFinal) {
      setTestText(transcript);
      setRecognitionError(null);
    }
  }, []);

  const handleError = useCallback((error: string) => {
    console.error('Speech recognition error:', error);
    setRecognitionError(error);
  }, []);

  const toggleRecording = useCallback(() => {
    if (isListening) {
      stopListening();
      setIsListening(false);
    } else {
      setRecognitionError(null);
      startListening({
        lang: 'nl-NL',
        continuous: true,
        interimResults: true,
        onResult: handleResult,
        onError: handleError
      });
      setIsListening(true);
    }
  }, [isListening, startListening, stopListening, handleResult, handleError]);

  const handlePlayAudio = (text: string, language: 'nl-NL' | 'en-US' = 'nl-NL') => {
    if (isPlaying) {
      textToSpeech.stop();
      setIsPlaying(false);
    } else {
      setIsPlaying(true);
      textToSpeech.speak(text, language);
    }
  };

  // Handle TTS events
  useEffect(() => {
    if (!textToSpeech.isPlaying && isPlaying) {
      setIsPlaying(false);
    }
  }, [textToSpeech.isPlaying, isPlaying]);

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-8 text-center">Voice Chat Test</h1>
        
        {/* Browser Support Check */}
        <div className="bg-white rounded-lg p-6 mb-6 shadow-sm">
          <h2 className="text-xl font-semibold mb-4">Browser Support</h2>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className={`w-3 h-3 rounded-full ${isSupported ? 'bg-green-500' : 'bg-red-500'}`}></div>
              <span>Speech Recognition: {isSupported ? 'Supported' : 'Not Supported'}</span>
            </div>
            {!isSupported && (
              <p className="text-sm text-yellow-700 bg-yellow-50 p-2 rounded">
                Your browser doesn't support speech recognition. Try using Chrome, Edge, or Safari.
              </p>
            )}
            {(error || recognitionError) && (
              <div className="mt-2 p-2 bg-red-50 text-red-700 text-sm rounded">
                <p className="font-medium">Error:</p>
                <p className="whitespace-pre-wrap">{error || recognitionError}</p>
                <p className="mt-2 text-xs">
                  Note: Speech recognition requires internet access. Please check your connection and try again.
                </p>
              </div>
            )}
            <div className="flex items-center gap-2">
              <span className={`w-3 h-3 rounded-full ${textToSpeech.isSupported ? 'bg-green-500' : 'bg-red-500'}`}></span>
              <span>Text-to-Speech: {textToSpeech.isSupported ? 'Supported' : 'Not Supported'}</span>
            </div>
            <div className="text-sm text-slate-600 mt-2">
              Available voices: {textToSpeech.voices.length}
            </div>
          </div>
        </div>

        {/* Voice Recording Test */}
        <div className="bg-white rounded-lg p-6 mb-6 shadow-sm">
          <h2 className="text-xl font-semibold mb-4">Voice Recording Test</h2>
          <div className="mt-6">
            <Button
              onClick={toggleRecording}
              variant={isListening ? 'destructive' : 'default'}
              className="flex items-center gap-2"
              disabled={!isSupported}
            >
              <Mic className="h-4 w-4" />
              {isListening ? 'Stop Recording' : 'Start Recording'}
            </Button>
            {isListening && (
              <div className="mt-2 flex items-center gap-2 text-sm text-gray-600">
                <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
                <span>Listening...</span>
              </div>
            )}
          </div>
          <div className="space-y-2">
            <div>
              <strong>Live Transcript:</strong>
              <div className="mt-1 p-2 bg-slate-100 rounded min-h-[40px]">
                {testText || 'Start recording to see transcript here...'}
              </div>
            </div>
          </div>
        </div>

        {/* Text-to-Speech Test */}
        <div className="bg-white rounded-lg p-6 mb-6 shadow-sm">
          <h2 className="text-xl font-semibold mb-4">Text-to-Speech Test</h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Test Text:</label>
              <textarea
                value={testText}
                onChange={(e) => setTestText(e.target.value)}
                className="w-full p-3 border border-slate-300 rounded-lg resize-none"
                rows={3}
                placeholder="Enter text to speak..."
              />
            </div>
            
            <div className="flex gap-4">
              <Button
                onClick={() => handlePlayAudio(testText, 'nl-NL')}
                disabled={!textToSpeech.isSupported || !testText.trim()}
                variant="outline"
              >
                {isPlaying ? <VolumeX className="w-4 h-4 mr-2" /> : <Volume2 className="w-4 h-4 mr-2" />}
                {isPlaying ? 'Stop' : 'Play Dutch'}
              </Button>
              
              <Button
                onClick={() => handlePlayAudio(testText, 'en-US')}
                disabled={!textToSpeech.isSupported || !testText.trim()}
                variant="outline"
              >
                {isPlaying ? <VolumeX className="w-4 h-4 mr-2" /> : <Volume2 className="w-4 h-4 mr-2" />}
                {isPlaying ? 'Stop' : 'Play English'}
              </Button>
            </div>
            
            {textToSpeech.isPlaying && (
              <div className="text-blue-600">🔊 Playing audio...</div>
            )}
          </div>
        </div>

        {/* Instructions */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-2 text-blue-900">Instructions</h3>
          <ul className="list-disc list-inside space-y-1 text-blue-800">
            <li>Click "Start Recording" and speak in Dutch to test speech recognition</li>
            <li>Edit the text and click "Play Dutch" or "Play English" to test text-to-speech</li>
            <li>Make sure your microphone is enabled and you're using a supported browser (Chrome/Edge recommended)</li>
            <li>For best results, speak clearly and avoid background noise</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
