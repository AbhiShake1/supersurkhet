import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/$businessName/admin/invitation')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/$businessName/admin/invitation"!</div>
}
