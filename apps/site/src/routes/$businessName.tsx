import { NotFound } from '@/components/ui/not-found'
import { createFileRoute, Outlet } from '@tanstack/react-router'

export const Route = createFileRoute('/$businessName')({
  component: RouteComponent,
  // TODO: replace with business picker
  notFoundComponent: () => <NotFound />,
})

function RouteComponent() {
  return <Outlet />
}
