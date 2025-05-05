import { AutoAdmin } from '@/components/auto-admin'
import { RestaurantLayoutEditor } from '@/components/seat-builder/restaurant-layout-editor'
import { createFileRoute } from '@tanstack/react-router'
import { Layout, MenuSquare } from 'lucide-react'

export const Route = createFileRoute('/_business/_demos/restaurant/admin')({
  component: RouteComponent,
})

function RouteComponent() {
  return <AutoAdmin tabs={[
    {
        schema: "menuItem",
        title: "Menus",
        icon: MenuSquare,
    },
    {
        title: "Layout",
        icon: Layout,
        children: <RestaurantLayoutEditor />,
    },
  ]}/>
}
