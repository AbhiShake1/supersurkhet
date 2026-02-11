import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/s3test')({
  component: RouteComponent,
});

function RouteComponent() {
  return <div>Hello "/s3test"!</div>;
}
