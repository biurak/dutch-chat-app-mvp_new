import { Metadata } from 'next';
import { getTopicBySlug } from '@/lib/topics';

interface PageProps {
  params: { topic: string };
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const topicSlug = decodeURIComponent(params.topic);
  const topic = await getTopicBySlug(topicSlug);
  
  if (!topic) {
    return {
      title: 'Topic not found',
      description: 'The requested topic could not be found.',
    };
  }
  
  return {
    title: topic.title,
    description: `Chat about: ${topic.title}`,
  };
}
