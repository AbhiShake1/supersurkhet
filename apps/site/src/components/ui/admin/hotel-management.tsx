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
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
	Plus,
	Search,
	Edit,
	Trash2,
	Eye,
	DollarSign,
	Bed,
	Star,
} from "lucide-react";
import { toast } from "sonner";
import type { AdminComponent } from "@/components/ui/admin";

interface RoomType {
	id: string;
	name: string;
	description: string;
	price: number;
	available: boolean;
	imageUrl: string;
}

const mockRoomTypes: RoomType[] = [
	{
		id: "1",
		name: "Deluxe Room",
		description: "Spacious room with mountain view and premium amenities",
		price: 4500,
		available: true,
		imageUrl: "/placeholder.svg?height=100&width=100",
	},
	{
		id: "2",
		name: "Executive Suite",
		description:
			"Luxurious suite with separate living area and panoramic views",
		price: 7500,
		available: true,
		imageUrl: "/placeholder.svg?height=100&width=100",
	},
	{
		id: "3",
		name: "Family Room",
		description: "Perfect for families with extra space and connecting rooms",
		price: 6000,
		available: false,
		imageUrl: "/placeholder.svg?height=100&width=100",
	},
];

export const HotelManagement: AdminComponent = () => {
	return (
		<_HotelManagement roomTypes={mockRoomTypes} onAddRoomType={() => {}} />
	);
};

interface HotelManagementProps {
	onAddRoomType: () => void;
	roomTypes: RoomType[];
}

function _HotelManagement({ onAddRoomType, roomTypes }: HotelManagementProps) {
	const [searchQuery, setSearchQuery] = useState("");
	const [selectedCategory, setSelectedCategory] = useState("all");

	const filteredRoomTypes = roomTypes.filter((roomType) => {
		const matchesSearch =
			roomType.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
			roomType.description.toLowerCase().includes(searchQuery.toLowerCase());
		return matchesSearch;
	});

	const toggleAvailability = (roomId: string, available: boolean) => {
		// In a real implementation, this would update the data in GunDB
		toast.success(`Room type ${available ? "enabled" : "disabled"}`);
	};

	const deleteRoomType = (roomId: string) => {
		// In a real implementation, this would delete the room type from GunDB
		toast.success("Room type removed");
	};

	return (
		<div className="space-y-6">
			{/* Header */}
			<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
				<div>
					<h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
						Hotel Management
					</h2>
					<p className="text-gray-600 dark:text-gray-400">
						Manage your hotel's room types and availability
					</p>
				</div>
				<Button onClick={onAddRoomType} className="w-full sm:w-auto">
					<Plus className="w-4 h-4 mr-2" />
					Add Room Type
				</Button>
			</div>

			{/* Stats */}
			<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
				<Card>
					<CardContent className="p-4">
						<div className="flex items-center justify-between">
							<div>
								<p className="text-sm text-gray-600 dark:text-gray-400">
									Total Room Types
								</p>
								<p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
									{roomTypes.length}
								</p>
							</div>
							<Bed className="w-8 h-8 text-gray-400" />
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
									{roomTypes.filter((r) => r.available).length}
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
									Avg. Price
								</p>
								<p className="text-2xl font-bold text-blue-600">
									Rs.{" "}
									{(
										roomTypes.reduce((sum, room) => sum + room.price, 0) /
											roomTypes.length || 0
									).toFixed(2)}
								</p>
							</div>
							<DollarSign className="w-8 h-8 text-blue-500" />
						</div>
					</CardContent>
				</Card>

				<Card>
					<CardContent className="p-4">
						<div className="flex items-center justify-between">
							<div>
								<p className="text-sm text-gray-600 dark:text-gray-400">
									Occupancy Rate
								</p>
								<p className="text-2xl font-bold text-purple-600">78%</p>
							</div>
							<Star className="w-8 h-8 text-purple-500" />
						</div>
					</CardContent>
				</Card>
			</div>

			{/* Search and Filters */}
			<div className="flex flex-col sm:flex-row gap-4">
				<div className="relative flex-1">
					<Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
					<Input
						placeholder="Search room types..."
						value={searchQuery}
						onChange={(e) => setSearchQuery(e.target.value)}
						className="pl-10"
					/>
				</div>
			</div>

			{/* Room Types */}
			<Tabs value={selectedCategory} onValueChange={setSelectedCategory}>
				<TabsList className="grid w-full grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 h-auto">
					<TabsTrigger
						value="all"
						className="flex flex-row items-center gap-1 p-2 text-xs sm:text-sm"
					>
						<span className="truncate">All Rooms</span>
					</TabsTrigger>
					<TabsTrigger
						value="available"
						className="flex flex-row items-center gap-1 p-2 text-xs sm:text-sm"
					>
						<span className="truncate">Available</span>
					</TabsTrigger>
					<TabsTrigger
						value="unavailable"
						className="flex flex-row items-center gap-1 p-2 text-xs sm:text-sm"
					>
						<span className="truncate">Unavailable</span>
					</TabsTrigger>
				</TabsList>

				<TabsContent value="all" className="space-y-4 mt-6">
					<div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
						{filteredRoomTypes.map((roomType) => (
							<Card
								key={roomType.id}
								className={`${!roomType.available ? "opacity-60" : ""}`}
							>
								<CardHeader className="pb-3">
									<div className="flex items-start justify-between">
										<div className="flex items-start gap-3 min-w-0 flex-1">
											<img
												src={roomType.imageUrl || "/placeholder.svg"}
												alt={roomType.name}
												className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
											/>
											<div className="min-w-0 flex-1">
												<CardTitle className="text-base">
													{roomType.name}
												</CardTitle>
												<CardDescription className="text-sm line-clamp-2">
													{roomType.description}
												</CardDescription>
												<p className="text-lg font-bold text-green-600 mt-1">
													Rs. {roomType.price.toFixed(2)}/night
												</p>
											</div>
										</div>
									</div>
								</CardHeader>

								<CardContent className="pt-0">
									<div className="flex items-center justify-between">
										<div className="flex items-center gap-2">
											<Switch
												checked={roomType.available}
												onCheckedChange={() =>
													toggleAvailability(roomType.id, !roomType.available)
												}
											/>
											<span className="text-sm text-gray-600 dark:text-gray-400">
												{roomType.available ? "Available" : "Unavailable"}
											</span>
										</div>

										<div className="flex items-center gap-1">
											<Button variant="ghost" size="sm">
												<Edit className="w-4 h-4" />
											</Button>
											<Button
												variant="ghost"
												size="sm"
												onClick={() => deleteRoomType(roomType.id)}
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

					{filteredRoomTypes.length === 0 && (
						<div className="text-center py-12">
							<Bed className="w-12 h-12 text-gray-400 mx-auto mb-4" />
							<h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
								No room types found
							</h3>
							<p className="text-gray-500 dark:text-gray-400 mb-4">
								Try adjusting your search or add a new room type
							</p>
							<Button onClick={onAddRoomType}>
								<Plus className="w-4 h-4 mr-2" />
								Add First Room Type
							</Button>
						</div>
					)}
				</TabsContent>
			</Tabs>
		</div>
	);
}
