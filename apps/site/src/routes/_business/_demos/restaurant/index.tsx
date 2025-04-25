import { useGet } from '@/lib/gun/hooks'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_business/_demos/restaurant/')({
  component: RouteComponent,
})

function RouteComponent() {
  const menuItems = useGet("menuItem", "restaurant")
  return <>
    TODO (AbhiShake1): Implement menu list
    {JSON.stringify(menuItems)}
  </>
}
