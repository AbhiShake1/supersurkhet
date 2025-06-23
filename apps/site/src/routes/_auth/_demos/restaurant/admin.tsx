import { AutoAdmin } from '@/components/auto-admin'
import { RestaurantLayoutEditor } from '@/components/seat-builder/restaurant-layout-editor'
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useGet } from '@/lib/gun/hooks'
import type { NestedSchemaType } from '@/lib/gun/index'
import { createFileRoute } from '@tanstack/react-router'
import { Layout, Menu, MenuSquare } from 'lucide-react'
import { useState } from 'react'

export const Route = createFileRoute('/_auth/_demos/restaurant/admin')({
  component: RouteComponent,
})

function RouteComponent() {
  return <AutoAdmin tabs={[
    {
      schema: "menuItem",
      title: "Menus",
      slug: "restaurant",
      icon: MenuSquare,
    },
    {
      title: "Orders",
      icon: Menu,
      schema: "order",
      slug: "restaurant",
      groupKey: "orderStatus",
      cardBuilder: (order) => {
        const menuItems = useGet("menuItem", "restaurant")
        const [open, setOpen] = useState(false)
        // @ts-expect-error
        const orderItems = useGet(order.items['#'].toString()) as NestedSchemaType<"order">["items"][string][]

        // const updateOrder = useUpdate("order", "restaurant")
        // const handleCancelOrder = () => {
        //   if (!order?._?.soul) return
        //   updateOrder({ id: order._?.soul, orderStatus: "cancelled" })
        // }

        return (
          <div>
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                  <DialogTitle>Order Details</DialogTitle>
                  <DialogDescription>
                    Detailed information about the order.
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-4 items-center gap-4">
                    <span className="text-right font-semibold">Order ID:</span>
                    <span className="col-span-3">{order._?.soul}</span>
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <span className="text-right font-semibold">Items:</span>
                    <span className="col-span-3">
                      {orderItems.map((item) => {
                        // @ts-expect-error
                        const menuItem = menuItems.find(m => m?._?.soul === item._?.soul)
                        return (
                          // @ts-expect-error
                          <div key={item._?.soul} className="flex justify-between">
                            <span>{item.quantity}x {menuItem?.name}</span>
                            <span>${(item.quantity * item.unitPrice).toFixed(2)}</span>
                          </div>
                        )
                      })}
                    </span>
                  </div>
                  {order.customerId && (
                    <div className="grid grid-cols-4 items-center gap-4">
                      <span className="text-right font-semibold">Customer ID:</span>
                      <span className="col-span-3">{order.customerId}</span>
                    </div>
                  )}
                  <div className="grid grid-cols-4 items-center gap-4">
                    <span className="text-right font-semibold">Subtotal:</span>
                    <span className="col-span-3">${order.subTotal.toFixed(2)}</span>
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <span className="text-right font-semibold">Taxes:</span>
                    <span className="col-span-3">${order.taxes.toFixed(2)}</span>
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <span className="text-right font-semibold">Total:</span>
                    <span className="col-span-3">${order.totalAmount.toFixed(2)}</span>
                  </div>
                  {order.paymentMethod && (
                    <div className="grid grid-cols-4 items-center gap-4">
                      <span className="text-right font-semibold">Payment Method:</span>
                      <span className="col-span-3 capitalize">{order.paymentMethod}</span>
                    </div>
                  )}
                  {order.paymentStatus && (
                    <div className="grid grid-cols-4 items-center gap-4">
                      <span className="text-right font-semibold">Payment Status:</span>
                      <span className="col-span-3 capitalize">{order.paymentStatus}</span>
                    </div>
                  )}
                  {order.estimatedDeliveryTime && (
                    <div className="grid grid-cols-4 items-center gap-4">
                      <span className="text-right font-semibold">Est. Delivery:</span>
                      <span className="col-span-3">{new Date(order.estimatedDeliveryTime).toLocaleTimeString()}</span>
                    </div>
                  )}
                </div>
                <div className="flex justify-end">
                  {/* {order.orderStatus !== "cancelled" && (
                    <AlertDialog>
                      <AlertDialogTrigger>
                        <Button variant="destructive">
                          Cancel Order
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This action cannot be undone. This will mark the order as cancelled.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Nevermind</AlertDialogCancel>
                          <AlertDialogAction onClick={handleCancelOrder}>Continue</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  )} */}
                </div>
              </DialogContent>
            </Dialog>
            <div className="rounded-md border bg-card p-3 shadow-xs flex flex-col gap-2" onClick={() => setOpen(true)}>
              <div className="flex items-center justify-between gap-2">
                <span className="line-clamp-1 font-medium text-sm">
                  {/* @ts-expect-error */}
                  {orderItems.map(i => menuItems.find(m => m?._?.soul === i._?.soul)).map(m => m?.name).join(', ')}
                </span>
                <Badge
                  variant={
                    order.orderStatus === "cancelled"
                      ? "destructive"
                      : order.orderStatus === "pending"
                        ? "default"
                        : "secondary"
                  }
                  className="pointer-events-none h-5 rounded-sm px-1.5 text-[11px] capitalize"
                >
                  {order.orderStatus}
                </Badge>
              </div>
            </div>
          </div>
        )
      }
    },
    {
      title: "Layout",
      icon: Layout,
      children: <RestaurantLayoutEditor />,
    },
  ]} />
}
