import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';
import { Home } from '@/components/blocks/chat-template';
import { SidebarProvider } from '@/components/blocks/sidebar';

export const Route = createFileRoute('/_business/chat')({
  component: RouteComponent,
  validateSearch: z.object({
    prompt: z.string().optional(),
  }),
});

function RouteComponent() {
  const { prompt } = Route.useSearch();

  return (
    <SidebarProvider defaultOpen={false}>
      <Home initialPrompt={prompt} />
    </SidebarProvider>
  );
}
