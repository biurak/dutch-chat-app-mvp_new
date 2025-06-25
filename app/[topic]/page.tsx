import { Suspense } from 'react';
import ChatClient from './chat-client';
import { getTopicBySlug } from '@/lib/topics';

interface ChatPageProps {
  params: {
    topic: string;
  };
}

export default async function ChatPage({ params }: ChatPageProps) {
  // Get the topic slug
  const topicSlug = Array.isArray(params.topic) ? params.topic[0] : params.topic;
  
  try {
    // Fetch the topic data on the server
    const topic = await getTopicBySlug(topicSlug);

    if (!topic) {
      return (
        <div className="flex flex-col items-center justify-center h-screen bg-slate-100 p-4">
          <p className="text-red-600 mb-4">Onderwerp niet gevonden</p>
          <a href="/" className="text-blue-500 hover:underline">
            Terug naar overzicht
          </a>
        </div>
      );
    }

    return (
      <Suspense fallback={
        <div className="flex items-center justify-center h-screen bg-slate-100">
          <p className="text-slate-600">Laden...</p>
        </div>
      }>
        <ChatClient topicSlug={topicSlug} />
      </Suspense>
    );
  } catch (error) {
    console.error('Error loading chat:', error);
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-slate-100 p-4">
        <p className="text-red-600 mb-4">Er is een fout opgetreden bij het laden van de chat</p>
        <a href="/" className="text-blue-500 hover:underline">
          Terug naar overzicht
        </a>
      </div>
    );
  }
}
