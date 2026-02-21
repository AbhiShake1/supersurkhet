import { createFileRoute } from '@tanstack/react-router';
import { CreateBusinessPageFlow } from '@/components/create-business';

export const Route = createFileRoute('/create-business')({
  component: CreateBusinessRoute,
});

function CreateBusinessRoute() {
  return <CreateBusinessPageFlow />;
}
