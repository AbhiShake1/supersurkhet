import { AutoKanban } from "@/components/auto-admin";
import type { AdminComponent } from ".";
import type { Order } from "@/lib/schema";
import { api } from "@/lib/api";
import { useState } from "react";
import { cn, recordToList } from "@/lib/utils";
import {
	Credenza,
	CredenzaBody,
	CredenzaContent,
	CredenzaDescription,
	CredenzaHeader,
	CredenzaTitle,
} from "../credenza";

export const OrderKanban: AdminComponent = ({ slug }) => {
	return (
		<AutoKanban
			slug={slug}
			cardBuilder={(order) => <OrderCard order={order} slug={slug} />}
			groupKey="orderStatus"
			schema="order"
		/>
	);
};

function OrderCard({ order, slug }: { order: Order; slug: string }) {
	const { data: menuItems = [] } = api.menuItem.useGet({ keys: [slug] });
	const [open, setOpen] = useState(false);
	if (!order?.items) return null;
	const orderItems = recordToList(order.items);

	function getBackgroundProps() {
		switch (order.orderStatus) {
			case "pending":
				return {
					className:
						"bg-yellow-50 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-300",
				};
			case "preparing":
				return {
					className:
						"bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
				};
			case "ready":
				return {
					className:
						"bg-purple-50 text-purple-700 dark:bg-purple-950 dark:text-purple-300",
				};
			case "served":
				return {
					className:
						"bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300",
				};
			case "cancelled":
				return {
					className: "bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300",
				};
			case "confirmed":
				return {
					className:
						"bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300",
				};
		}
	}

	const { className } = getBackgroundProps();

	return (
		<div>
			<Credenza open={open} onOpenChange={setOpen}>
				<CredenzaContent>
					<CredenzaHeader>
						<CredenzaTitle>Order Details</CredenzaTitle>
						<CredenzaDescription>
							Detailed information about the order.
						</CredenzaDescription>
					</CredenzaHeader>
					<CredenzaBody>
						<div className="grid gap-4 py-4">
							<div className="grid grid-cols-4 items-center gap-4">
								<span className="text-right font-semibold">Order ID:</span>
								<span className="col-span-3">{order._?.soul}</span>
							</div>
							<div className="grid grid-cols-4 items-center gap-4">
								<span className="text-right font-semibold">Items:</span>
								<span className="col-span-3">
									{orderItems.map((item) => {
										const menuItem = menuItems.find(
											(m) => m?._?.soul === item._?.soul,
										);
										return (
											<div key={item._?.soul} className="flex justify-between">
												<span>
													<span className="font-bold">{item.quantity}x</span>{" "}
													{menuItem?.name}
												</span>
												<span className="font-bold">
													${(item.quantity * item.unitPrice)?.toFixed(2)}
												</span>
											</div>
										);
									})}
								</span>
							</div>
							{order.customerId && (
								<div className="grid grid-cols-4 items-center gap-4">
									<span className="text-right font-semibold">Customer ID:</span>
									<span className="col-span-3">{order.customerId}</span>
								</div>
							)}
							{order.subTotal && (
								<div className="grid grid-cols-4 items-center gap-4">
									<span className="text-right font-semibold">Subtotal:</span>
									<span className="col-span-3">
										Ra. {order.subTotal.toFixed(2)}
									</span>
								</div>
							)}
							{order.taxes && (
								<div className="grid grid-cols-4 items-center gap-4">
									<span className="text-right font-semibold">Taxes:</span>
									<span className="col-span-3">
										Rs. {order.taxes.toFixed(2)}
									</span>
								</div>
							)}
							{order.totalAmount && (
								<div className="grid grid-cols-4 items-center gap-4">
									<span className="text-right font-semibold">Total:</span>
									<span className="col-span-3">
										Rs. {order.totalAmount.toFixed(2)}
									</span>
								</div>
							)}
							{order.paymentMethod && (
								<div className="grid grid-cols-4 items-center gap-4">
									<span className="text-right font-semibold">
										Payment Method:
									</span>
									<span className="col-span-3 capitalize">
										{order.paymentMethod}
									</span>
								</div>
							)}
							{order.paymentStatus && (
								<div className="grid grid-cols-4 items-center gap-4">
									<span className="text-right font-semibold">
										Payment Status:
									</span>
									<span className="col-span-3 capitalize">
										{order.paymentStatus}
									</span>
								</div>
							)}
							{order.estimatedDeliveryTime && (
								<div className="grid grid-cols-4 items-center gap-4">
									<span className="text-right font-semibold">
										Est. Delivery:
									</span>
									<span className="col-span-3">
										{new Date(order.estimatedDeliveryTime).toLocaleTimeString()}
									</span>
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
					</CredenzaBody>
				</CredenzaContent>
			</Credenza>
			<div
				className={cn(
					className,
					"rounded-md border bg-card p-3 shadow-xs flex flex-col gap-2",
				)}
				onClick={() => setOpen(true)}
			>
				<div className={cn("flex items-center justify-between gap-2")}>
					<span className="line-clamp-1 font-medium text-sm">
						{orderItems
							.map((i) => menuItems.find((m) => m?._?.soul === i._?.soul))
							.map((m) => m?.name)
							.filter((m) => !!m)
							.join(", ")}
					</span>
				</div>
			</div>
		</div>
	);
}
