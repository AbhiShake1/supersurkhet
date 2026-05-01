import { createFileRoute } from '@tanstack/react-router';
import { BoyaiChat } from '@/components/boyai-chat';

export const Route = createFileRoute('/boyai-chat')({
  component: () => (
    <div className="container py-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-8">AI Playground</h1>
      <BoyaiChat />
    </div>
  ),
});