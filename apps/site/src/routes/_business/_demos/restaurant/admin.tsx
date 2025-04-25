import { AutoAdmin } from '@/components/auto-admin'
import { createFileRoute } from '@tanstack/react-router'
import { MenuSquare } from 'lucide-react'

export const Route = createFileRoute('/_business/_demos/restaurant/admin')({
  component: RouteComponent,
})

function RouteComponent() {
  return <AutoAdmin tabs={[
    {
        schema: "menuItem",
        title: "Menus",
        icon: MenuSquare,
    }
  ]}/>
}
