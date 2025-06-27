'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Mic, Volume2, VolumeX } from 'lucide-react';
import { useVoiceRecording } from '@/hooks/use-voice-recording';
import { useTextToSpeech } from '@/hooks/use-text-to-speech';

export default function VoiceTestPage() {
  const [testText, setTestText] = useState('Hallo, dit is een test voor spraakherkenning en tekst-naar-spraak.');
  const [isPlaying, setIsPlaying] = useState(false);
  
  const voiceRecording = useVoiceRecording({ language: 'nl-NL' });
  const textToSpeech = useTextToSpeech();

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

  // Handle voice transcript
  useEffect(() => {
    if (voiceRecording.transcript && !voiceRecording.isRecording) {
      setTestText(voiceRecording.transcript);
      voiceRecording.clearTranscript();
    }
  }, [voiceRecording.transcript, voiceRecording.isRecording, voiceRecording]);

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-2xl mx-auto">
        <h1 className="text-3xl font-bold mb-8 text-center">Voice Chat Test</h1>
        
        {/* Browser Support Check */}
        <div className="bg-white rounded-lg p-6 mb-6 shadow-sm">
          <h2 className="text-xl font-semibold mb-4">Browser Support</h2>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className={`w-3 h-3 rounded-full ${voiceRecording.isSupported ? 'bg-green-500' : 'bg-red-500'}`}></span>
              <span>Speech Recognition: {voiceRecording.isSupported ? 'Supported' : 'Not Supported'}</span>
            </div>
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
          
          {voiceRecording.error && (
            <div className="mb-4 p-3 bg-red-100 border border-red-300 text-red-700 rounded">
              {voiceRecording.error}
            </div>
          )}
          
          <div className="flex items-center gap-4 mb-4">
            <Button 
              variant={voiceRecording.isRecording ? "default" : "outline"}
              onClick={() => {
                if (voiceRecording.isRecording) {
                  voiceRecording.stopRecording();
                } else {
                  voiceRecording.startRecording();
                }
              }}
              disabled={!voiceRecording.isSupported}
              className={`${voiceRecording.isRecording ? 'bg-red-600 hover:bg-red-700 animate-pulse' : ''}`}
            >
              <Mic className={`w-4 h-4 mr-2 ${voiceRecording.isRecording ? 'text-white' : ''}`} />
              {voiceRecording.isRecording ? 'Stop Recording' : 'Start Recording'}
            </Button>
            
            {voiceRecording.isRecording && (
              <span className="text-red-600 animate-pulse">🎤 Recording...</span>
            )}
          </div>
          
          <div className="space-y-2">
            <div>
              <strong>Live Transcript:</strong>
              <div className="mt-1 p-2 bg-slate-100 rounded min-h-[40px]">
                {voiceRecording.transcript || 'Start recording to see transcript here...'}
              </div>
            </div>
            
            {voiceRecording.confidence > 0 && (
              <div>
                <strong>Confidence:</strong> {Math.round(voiceRecording.confidence * 100)}%
              </div>
            )}
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
