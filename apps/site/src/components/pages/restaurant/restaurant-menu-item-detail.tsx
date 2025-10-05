"use client";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { api } from "@/lib/api";
import { motion } from "framer-motion";
import { ArrowLeft, MinusIcon, PlusIcon, ShoppingCartIcon } from "lucide-react";
import { useState } from "react";
import { useNavigate, useSearch } from "@tanstack/react-router";

interface RestaurantMenuItemDetailProps {
	slug: string;
	onClose: () => void;
}

export function RestaurantMenuItemDetail({ slug, onClose }: RestaurantMenuItemDetailProps) {
	const search = useSearch({ strict: false });
	const itemId = search.item;
	const { data: items = [], isLoading } = api.menuItem.useGet({
		keys: [slug],
	});

	const item = items.find((i: any) => i._?.soul === itemId);
	const [quantity, setQuantity] = useState(1);

	const incrementQuantity = () => {
		setQuantity(quantity + 1);
	};

	const decrementQuantity = () => {
		if (quantity > 1) {
			setQuantity(quantity - 1);
		}
	};

	const navigate = useNavigate();

	const handleClose = () => {
		// Navigate back to the menu without the item parameter
		navigate({
			search: ({ item, ...prev }: any) => {
				const newSearch = { ...prev };
				return newSearch;
			},
		});
		onClose();
	};

	if (isLoading) {
		return (
			<div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm">
				<div className="container mx-auto px-4 py-8">
					<Button
						variant="ghost"
						onClick={handleClose}
						className="mb-6 flex items-center gap-2"
					>
						<ArrowLeft className="h-4 w-4" />
						Back to Menu
					</Button>

					<div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
						<div>
							<Skeleton className="w-full h-96 rounded-xl" />
						</div>
						<div className="space-y-6">
							<Skeleton className="h-8 w-3/4" />
							<Skeleton className="h-4 w-full" />
							<Skeleton className="h-4 w-5/6" />
							<Skeleton className="h-4 w-2/3" />
							<div className="pt-4">
								<Skeleton className="h-10 w-32" />
							</div>
							<div className="flex items-center space-x-4 pt-6">
								<Skeleton className="h-10 w-32" />
								<Skeleton className="h-10 w-40" />
							</div>
						</div>
					</div>
				</div>
			</div>
		);
	}

	if (!item) {
		return (
			<div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm">
				<div className="container mx-auto px-4 py-8 text-center">
					<h2 className="text-2xl font-bold">Item not found</h2>
					<Button
						variant="ghost"
						onClick={handleClose}
						className="mt-4"
					>
						<ArrowLeft className="h-4 w-4 mr-2" />
						Back to Menu
					</Button>
				</div>
			</div>
		);
	}

	return (
		<motion.div
			initial={{ opacity: 0 }}
			animate={{ opacity: 1 }}
			exit={{ opacity: 0 }}
			className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm"
		>
			<div className="container mx-auto px-4 py-8">
				<Button
					variant="ghost"
					onClick={handleClose}
					className="mb-6 flex items-center gap-2"
				>
					<ArrowLeft className="h-4 w-4" />
					Back to Menu
				</Button>

				<div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
					<motion.div
						layoutId={`menu-item-image-${itemId}`}
						initial={{ opacity: 0, scale: 0.9 }}
						animate={{ opacity: 1, scale: 1 }}
						transition={{ duration: 0.5 }}
						className="relative"
					>
						<img
							src={item.imageUrl ?? ""}
							alt={item.title ?? ""}
							className="w-full h-96 object-cover rounded-xl shadow-lg"
						/>
						{item.isSpecial && (
							<motion.div
								layoutId={`menu-item-badge-${itemId}`}
								className="absolute top-4 right-4 bg-primary px-3 py-1 rounded-full text-sm font-bold text-primary-foreground shadow-md"
							>
								Chef's Special
							</motion.div>
						)}
					</motion.div>

					<motion.div
						initial={{ opacity: 0, x: 20 }}
						animate={{ opacity: 1, x: 0 }}
						transition={{ duration: 0.5, delay: 0.2 }}
						className="space-y-6"
					>
						<motion.h1
							layoutId={`menu-item-title-${itemId}`}
							className="text-3xl font-bold text-foreground"
						>
							{item.title}
						</motion.h1>

						{item.price && (
							<motion.p
								layoutId={`menu-item-price-${itemId}`}
								className="text-2xl font-bold text-primary"
							>
								Rs. {item.price.toFixed(2)}
							</motion.p>
						)}

						<motion.p
							layoutId={`menu-item-description-${itemId}`}
							className="text-muted-foreground text-lg"
						>
							{item.description}
						</motion.p>

						<div className="pt-4">
							<h3 className="text-lg font-semibold mb-2">Quantity</h3>
							<div className="flex items-center space-x-4">
								<div className="flex items-center space-x-2">
									<Button
										variant="outline"
										size="icon"
										className="h-10 w-10 rounded-full"
										onClick={decrementQuantity}
									>
										<MinusIcon className="h-4 w-4" />
									</Button>
									<span className="text-lg font-medium w-8 text-center">{quantity}</span>
									<Button
										variant="outline"
										size="icon"
										className="h-10 w-10 rounded-full"
										onClick={incrementQuantity}
									>
										<PlusIcon className="h-4 w-4" />
									</Button>
								</div>
							</div>
						</div>

						<Button className="w-full py-6 text-lg rounded-xl bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 text-primary-foreground transition-all duration-300 transform hover:scale-[1.02] flex items-center gap-2">
							<ShoppingCartIcon className="h-5 w-5" />
							Add to Cart - Rs. {(() => {
								const { price } = item
								if (!price) return "Free";
								return (price * quantity).toFixed(2);
							})()}
						</Button>
					</motion.div>
				</div>
			</div>
		</motion.div>
	);
}