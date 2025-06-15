import { AutoAdmin } from '@/components/auto-admin'
import { RestaurantLayoutEditor } from '@/components/seat-builder/restaurant-layout-editor'
import { createFileRoute } from '@tanstack/react-router'
import { Kanban as KanbanIcon, Layout, Menu, MenuSquare } from 'lucide-react'
import _ from "lodash"

export const Route = createFileRoute('/_auth/_demos/restaurant/admin')({
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
      title: "Orders",
      icon: Menu,
      schema: "order",
    },
    {
      title: "Layout",
      icon: Layout,
      children: <RestaurantLayoutEditor />,
    },
    {
      title: "Kanban",
      icon: KanbanIcon,
      children: <KanbanDynamicOverlayDemo />
    }
  ]} />
}

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import * as Kanban from "@/components/ui/kanban"
import { GripVertical } from "lucide-react"
import * as React from "react"
import { useGet, useUpdate } from '@/lib/gun/hooks'
import { getNestedZodShape, type NestedSchemaType } from '@/lib/gun/index'
import { appSchema } from '@/lib/schema'

type Order = NestedSchemaType<"order">

export function KanbanDynamicOverlayDemo() {
  const orders = useGet("order", "restaurant")
  const update = useUpdate("order", "restaurant")
  const columns = _.groupBy(orders, o => o.orderStatus)
  const orderSchema = appSchema.shape.order

  return (
    <Kanban.Root
      value={columns}
      onValueChange={columns => {
        for (const [status, orders] of Object.entries(columns)) {
          for (const order of orders) {
            if (!order._?.soul) continue
            update({ id: order._?.soul, orderStatus: status as any })
          }
        }
      }}
      getItemValue={(item) => item._?.soul ?? ""}
    >
      <Kanban.Board className="grid auto-rows-fr grid-cols-3">
        {
          Object.keys(orderSchema.shape.orderStatus.Values).map(status => (
            <TaskColumn key={status} value={status} tasks={columns?.[status] ?? []} />
          ))
        }
      </Kanban.Board>
      <Kanban.Overlay>
        {({ value, variant }) => {
          if (variant === "column") {
            const tasks = columns[value] ?? [];

            return <TaskColumn value={value} tasks={tasks} />;
          }

          const task = Object.values(columns)
            .flat()
            .find((task) => task._?.soul === value);

          if (!task) return null;

          return <TaskCard task={task} />;
        }}
      </Kanban.Overlay>
    </Kanban.Root>
  );
}

interface TaskCardProps
  extends Omit<React.ComponentProps<typeof Kanban.Item>, "value"> {
  task: Order;
}

function TaskCard({ task, ...props }: TaskCardProps) {
  const menuItems = useGet("menuItem", "restaurant")
  return (
    <Kanban.Item key={task._?.soul} value={task._?.soul ?? ""} asChild {...props}>
      <div className="rounded-md border bg-card p-3 shadow-xs">
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between gap-2">
            <span className="line-clamp-1 font-medium text-sm">
              {Object.keys(task.items).map(i => menuItems.find(m => m?._?.soul === i)).map(m => m?.name).join(', ')}
            </span>
            <Badge
              variant={
                task.orderStatus === "cancelled"
                  ? "destructive"
                  : task.orderStatus === "pending"
                    ? "default"
                    : "secondary"
              }
              className="pointer-events-none h-5 rounded-sm px-1.5 text-[11px] capitalize"
            >
              {task.orderStatus}
            </Badge>
          </div>
          <div className="flex items-center justify-between text-muted-foreground text-xs">
            {task.paymentMethod && (
              <div className="flex items-center gap-1">
                <div className="size-2 rounded-full bg-primary/20" />
                <span className="line-clamp-1">{task.deliveryFee}</span>
              </div>
            )}
            {task.paymentStatus && (
              <time className="text-[10px] tabular-nums">{task.paymentStatus}</time>
            )}
          </div>
        </div>
      </div>
    </Kanban.Item>
  );
}

interface TaskColumnProps
  extends Omit<React.ComponentProps<typeof Kanban.Column>, "children"> {
  tasks: Order[];
}

function TaskColumn({ value, tasks, ...props }: TaskColumnProps) {
  return (
    <Kanban.Column value={value} {...props}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-sm capitalize">{value}</span>
          <Badge variant="secondary" className="pointer-events-none rounded-sm">
            {tasks.length}
          </Badge>
        </div>
        <Kanban.ColumnHandle asChild>
          <Button variant="ghost" size="icon">
            <GripVertical className="h-4 w-4" />
          </Button>
        </Kanban.ColumnHandle>
      </div>
      <div className="flex flex-col gap-2 p-0.5">
        {tasks.map((task) => (
          <TaskCard key={task._?.soul} task={task} asHandle />
        ))}
      </div>
    </Kanban.Column>
  );
}