import { createFileRoute } from '@tanstack/react-router';
import { BoyaiSettings } from '@/components/boyai-settings';

export const Route = createFileRoute('/boyai-settings')({
  component: () => (
    <div className="container py-8 max-w-4xl mx-auto flex justify-center">
      <BoyaiSettings />
    </div>
  ),
});