"use client";

import { useState } from "react";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
	Plus,
	Search,
	Edit,
	Trash2,
	Eye,
	DollarSign,
	Package,
	Star,
} from "lucide-react";
import { toast } from "sonner";
import type { AdminComponent } from ".";
import { api } from "@/lib/api";
import _ from "lodash";

interface MenuManagementProps {
	onAddItem: () => void;
}

export const MenuManagement: AdminComponent = () => {
	return <_MenuManagement onAddItem={() => { }} />;
};

function _MenuManagement({ onAddItem }: MenuManagementProps) {
	const [searchQuery, setSearchQuery] = useState("");
	const [selectedCategory, setSelectedCategory] = useState("all");
	const { data: items = [] } = api.menuItem.useGet({ keys: [] });
	const { mutate: update } = api.menuItem.useUpdate({ keys: [] });

	const groups = _.groupBy(items, "category");

	const categories = [
		{ id: "all", name: "All Items", count: items.length },
		...Object.values(groups).map((group) => ({
			id: group[0].category ?? "Others",
			name: group[0].category ?? "Others",
			count: group.length,
		})),
	];

	const filteredItems = items.filter((item) => {
		const matchesSearch =
			item.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
			item.description?.toLowerCase().includes(searchQuery.toLowerCase());
		const matchesCategory =
			selectedCategory === "all" || (item.category ?? "Others") === (selectedCategory ?? "Others");
		return matchesSearch && matchesCategory;
	});

	const toggleAvailability = (itemId: string, isActive: boolean) => {
		update({ id: itemId, isActive });
		// setItems((prev) => prev.map((item) => (item.id === itemId ? { ...item, available: !item.available } : item)))
		const item = items.find((i) => i._?.soul === itemId);
		toast.success(`${item?.name} ${item?.isActive ? "disabled" : "enabled"}`);
	};

	const deleteItem = (itemId: string) => {
		const item = items.find((i) => i._?.soul === itemId);
		// setItems((prev) => prev.filter((item) => item.id !== itemId))
		toast.success(`${item?.name} removed from menu`);
	};

	return (
		<div className="space-y-6">
			{/* Header */}
			<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
				<div>
					<h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
						Menu Management
					</h2>
					<p className="text-gray-600 dark:text-gray-400">
						Manage your restaurant's menu items and categories
					</p>
				</div>
				<Button onClick={onAddItem} className="w-full sm:w-auto">
					<Plus className="w-4 h-4 mr-2" />
					Add Menu Item
				</Button>
			</div>

			{/* Stats */}
			<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
				<Card>
					<CardContent className="p-4">
						<div className="flex items-center justify-between">
							<div>
								<p className="text-sm text-gray-600 dark:text-gray-400">
									Total Items
								</p>
								<p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
									{items.length}
								</p>
							</div>
							<Package className="w-8 h-8 text-gray-400" />
						</div>
					</CardContent>
				</Card>

				<Card>
					<CardContent className="p-4">
						<div className="flex items-center justify-between">
							<div>
								<p className="text-sm text-gray-600 dark:text-gray-400">
									Available
								</p>
								<p className="text-2xl font-bold text-green-600">
									{items.filter((i) => i.isActive).length}
								</p>
							</div>
							<Eye className="w-8 h-8 text-green-500" />
						</div>
					</CardContent>
				</Card>

				<Card>
					<CardContent className="p-4">
						<div className="flex items-center justify-between">
							<div>
								<p className="text-sm text-gray-600 dark:text-gray-400">
									Popular Items
								</p>
								<p className="text-2xl font-bold text-yellow-600">
									{items.filter((i) => i.isFeatured).length}
								</p>
							</div>
							<Star className="w-8 h-8 text-yellow-500" />
						</div>
					</CardContent>
				</Card>

				<Card>
					<CardContent className="p-4">
						<div className="flex items-center justify-between">
							<div>
								<p className="text-sm text-gray-600 dark:text-gray-400">
									Avg. Price
								</p>
								<p className="text-2xl font-bold text-blue-600">
									Rs.{" "}
									{(
										items.reduce((sum, item) => sum + item.price, 0) /
										items.length || 0
									).toFixed(2)}
								</p>
							</div>
							<DollarSign className="w-8 h-8 text-blue-500" />
						</div>
					</CardContent>
				</Card>
			</div>

			{/* Search and Filters */}
			<div className="flex flex-col sm:flex-row gap-4">
				<div className="relative flex-1">
					<Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
					<Input
						placeholder="Search menu items..."
						value={searchQuery}
						onChange={(e) => setSearchQuery(e.target.value)}
						className="pl-10"
					/>
				</div>
			</div>

			{/* Categories and Items */}
			<Tabs value={selectedCategory} onValueChange={setSelectedCategory}>
				<TabsList className="grid w-full grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 h-auto">
					{categories.map((category) => (
						<TabsTrigger
							key={category.id}
							value={category.id}
							className="flex flex-row items-center gap-1 p-2 text-xs sm:text-sm"
						>
							<span className="truncate">{category.name}</span>
							<Badge variant="secondary" className="text-xs px-1 py-0">
								{category.count}
							</Badge>
						</TabsTrigger>
					))}
				</TabsList>

				{categories.map((category) => (
					<TabsContent
						key={category.id}
						value={category.id}
						className="space-y-4 mt-6"
					>
						<div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
							{filteredItems.map((item) => (
								<Card
									key={item._?.soul}
									className={`${!item.isActive ? "opacity-60" : ""}`}
								>
									<CardHeader className="pb-3">
										<div className="flex items-start justify-between">
											<div className="flex items-start gap-3 min-w-0 flex-1">
												<img
													src={item.imageUrl || "/placeholder.svg"}
													alt={item.name}
													className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
												/>
												<div className="min-w-0 flex-1">
													<CardTitle className="text-base flex items-center gap-2">
														{item.name}
														{item.isFeatured && (
															<Star className="w-4 h-4 text-yellow-500 fill-current" />
														)}
													</CardTitle>
													<CardDescription className="text-sm line-clamp-2">
														{item.description}
													</CardDescription>
													{item.price && (
														<p className="text-lg font-bold text-green-600 mt-1">
															${item.price.toFixed(2)}
														</p>
													)}
												</div>
											</div>
										</div>
									</CardHeader>

									<CardContent className="pt-0">
										<div className="flex items-center justify-between">
											<div className="flex items-center gap-2">
												<Switch
													checked={item.isActive}
													onCheckedChange={() =>
														toggleAvailability(
															item._?.soul ?? "",
															!item.isActive,
														)
													}
												/>
												<span className="text-sm text-gray-600 dark:text-gray-400">
													{item.isActive ? "Available" : "Unavailable"}
												</span>
											</div>

											<div className="flex items-center gap-1">
												<Button variant="ghost" size="sm">
													<Edit className="w-4 h-4" />
												</Button>
												<Button
													variant="ghost"
													size="sm"
													onClick={() => deleteItem(item._?.soul ?? "")}
													className="text-red-600 hover:text-red-700"
												>
													<Trash2 className="w-4 h-4" />
												</Button>
											</div>
										</div>
									</CardContent>
								</Card>
							))}
						</div>

						{filteredItems.length === 0 && (
							<div className="text-center py-12">
								<Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
								<h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
									No menu items found
								</h3>
								<p className="text-gray-500 dark:text-gray-400 mb-4">
									Try adjusting your search or add a new menu item
								</p>
								<Button onClick={onAddItem}>
									<Plus className="w-4 h-4 mr-2" />
									Add First Item
								</Button>
							</div>
						)}
					</TabsContent>
				))}
			</Tabs>
		</div>
	);
}
