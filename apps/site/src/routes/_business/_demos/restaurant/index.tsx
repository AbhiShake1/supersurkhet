import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_business/_demos/restaurant/')({
  component: RouteComponent,
})

function RouteComponent() {
  return <div>Hello "/_demos/restaurant/"!</div>
}
