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
	Fuel,
	Wrench,
	DollarSign,
} from "lucide-react";
import { toast } from "sonner";
import type { AdminComponent } from "@/components/ui/admin";

interface FuelType {
	id: string;
	name: string;
	price: number;
	available: boolean;
}

interface Service {
	id: string;
	name: string;
	price?: number;
	available: boolean;
}

const mockFuelTypes: FuelType[] = [
	{
		id: "1",
		name: "Petrol",
		price: 120.0,
		available: true,
	},
	{
		id: "2",
		name: "Diesel",
		price: 105.0,
		available: true,
	},
	{
		id: "3",
		name: "CNG",
		price: 80.0,
		available: true,
	},
	{
		id: "4",
		name: "Premium Petrol",
		price: 140.0,
		available: false,
	},
];

const mockServices: Service[] = [
	{
		id: "1",
		name: "Car Wash",
		price: 300,
		available: true,
	},
	{
		id: "2",
		name: "Oil Change",
		price: 800,
		available: true,
	},
	{
		id: "3",
		name: "Tire Pressure Check",
		price: 0,
		available: true,
	},
	{
		id: "4",
		name: "Air Filter Replacement",
		price: 500,
		available: false,
	},
];

export const PetrolPumpManagement: AdminComponent = () => {
	return (
		<_PetrolPumpManagement
			fuelTypes={mockFuelTypes}
			services={mockServices}
			onAddFuelType={() => {}}
			onAddService={() => {}}
		/>
	);
};

interface PetrolPumpManagementProps {
	onAddFuelType: () => void;
	onAddService: () => void;
	fuelTypes: FuelType[];
	services: Service[];
}

function _PetrolPumpManagement({
	onAddFuelType,
	onAddService,
	fuelTypes,
	services,
}: PetrolPumpManagementProps) {
	const [searchQuery, setSearchQuery] = useState("");
	const [selectedTab, setSelectedTab] = useState("fuels");

	const filteredFuelTypes = fuelTypes.filter((fuelType) => {
		return (
			fuelType.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
			fuelType.id.toLowerCase().includes(searchQuery.toLowerCase())
		);
	});

	const filteredServices = services.filter((service) => {
		return (
			service.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
			service.id.toLowerCase().includes(searchQuery.toLowerCase())
		);
	});

	const toggleFuelAvailability = (fuelId: string, available: boolean) => {
		// In a real implementation, this would update the data in GunDB
		toast.success(`Fuel type ${available ? "enabled" : "disabled"}`);
	};

	const toggleServiceAvailability = (serviceId: string, available: boolean) => {
		// In a real implementation, this would update the data in GunDB
		toast.success(`Service ${available ? "enabled" : "disabled"}`);
	};

	const deleteFuelType = (fuelId: string) => {
		// In a real implementation, this would delete the fuel type from GunDB
		toast.success("Fuel type removed");
	};

	const deleteService = (serviceId: string) => {
		// In a real implementation, this would delete the service from GunDB
		toast.success("Service removed");
	};

	return (
		<div className="space-y-6">
			{/* Header */}
			<div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
				<div>
					<h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
						Petrol Pump Management
					</h2>
					<p className="text-gray-600 dark:text-gray-400">
						Manage your fuel prices and services
					</p>
				</div>
				<div className="flex gap-2">
					<Button onClick={onAddFuelType} className="w-full sm:w-auto">
						<Plus className="w-4 h-4 mr-2" />
						Add Fuel Type
					</Button>
					<Button onClick={onAddService} className="w-full sm:w-auto">
						<Plus className="w-4 h-4 mr-2" />
						Add Service
					</Button>
				</div>
			</div>

			{/* Stats */}
			<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
				<Card>
					<CardContent className="p-4">
						<div className="flex items-center justify-between">
							<div>
								<p className="text-sm text-gray-600 dark:text-gray-400">
									Fuel Types
								</p>
								<p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
									{fuelTypes.length}
								</p>
							</div>
							<Fuel className="w-8 h-8 text-gray-400" />
						</div>
					</CardContent>
				</Card>

				<Card>
					<CardContent className="p-4">
						<div className="flex items-center justify-between">
							<div>
								<p className="text-sm text-gray-600 dark:text-gray-400">
									Available Fuels
								</p>
								<p className="text-2xl font-bold text-green-600">
									{fuelTypes.filter((f) => f.available).length}
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
									Services
								</p>
								<p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
									{services.length}
								</p>
							</div>
							<Wrench className="w-8 h-8 text-gray-400" />
						</div>
					</CardContent>
				</Card>

				<Card>
					<CardContent className="p-4">
						<div className="flex items-center justify-between">
							<div>
								<p className="text-sm text-gray-600 dark:text-gray-400">
									Avg. Fuel Price
								</p>
								<p className="text-2xl font-bold text-blue-600">
									Rs.{" "}
									{(
										fuelTypes.reduce((sum, fuel) => sum + fuel.price, 0) /
											fuelTypes.length || 0
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
						placeholder="Search fuels or services..."
						value={searchQuery}
						onChange={(e) => setSearchQuery(e.target.value)}
						className="pl-10"
					/>
				</div>
			</div>

			{/* Tabs for Fuels and Services */}
			<Tabs value={selectedTab} onValueChange={setSelectedTab}>
				<TabsList className="grid w-full grid-cols-2 h-auto">
					<TabsTrigger
						value="fuels"
						className="flex flex-row items-center gap-1 p-2 text-xs sm:text-sm"
					>
						<Fuel className="w-4 h-4" />
						<span className="truncate">Fuel Types</span>
					</TabsTrigger>
					<TabsTrigger
						value="services"
						className="flex flex-row items-center gap-1 p-2 text-xs sm:text-sm"
					>
						<Wrench className="w-4 h-4" />
						<span className="truncate">Services</span>
					</TabsTrigger>
				</TabsList>

				<TabsContent value="fuels" className="space-y-4 mt-6">
					<div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
						{filteredFuelTypes.map((fuelType) => (
							<Card
								key={fuelType.id}
								className={`${!fuelType.available ? "opacity-60" : ""}`}
							>
								<CardHeader className="pb-3">
									<div className="flex items-start justify-between">
										<div className="flex items-start gap-3 min-w-0 flex-1">
											<div className="min-w-0 flex-1">
												<CardTitle className="text-base flex items-center gap-2">
													<Fuel className="w-4 h-4" />
													{fuelType.name}
												</CardTitle>
												<p className="text-lg font-bold text-green-600 mt-1">
													Rs. {fuelType.price.toFixed(2)}/liter
												</p>
											</div>
										</div>
									</div>
								</CardHeader>

								<CardContent className="pt-0">
									<div className="flex items-center justify-between">
										<div className="flex items-center gap-2">
											<Switch
												checked={fuelType.available}
												onCheckedChange={() =>
													toggleFuelAvailability(
														fuelType.id,
														!fuelType.available,
													)
												}
											/>
											<span className="text-sm text-gray-600 dark:text-gray-400">
												{fuelType.available ? "Available" : "Unavailable"}
											</span>
										</div>

										<div className="flex items-center gap-1">
											<Button variant="ghost" size="sm">
												<Edit className="w-4 h-4" />
											</Button>
											<Button
												variant="ghost"
												size="sm"
												onClick={() => deleteFuelType(fuelType.id)}
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

					{filteredFuelTypes.length === 0 && (
						<div className="text-center py-12">
							<Fuel className="w-12 h-12 text-gray-400 mx-auto mb-4" />
							<h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
								No fuel types found
							</h3>
							<p className="text-gray-500 dark:text-gray-400 mb-4">
								Try adjusting your search or add a new fuel type
							</p>
							<Button onClick={onAddFuelType}>
								<Plus className="w-4 h-4 mr-2" />
								Add First Fuel Type
							</Button>
						</div>
					)}
				</TabsContent>

				<TabsContent value="services" className="space-y-4 mt-6">
					<div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
						{filteredServices.map((service) => (
							<Card
								key={service.id}
								className={`${!service.available ? "opacity-60" : ""}`}
							>
								<CardHeader className="pb-3">
									<div className="flex items-start justify-between">
										<div className="flex items-start gap-3 min-w-0 flex-1">
											<div className="min-w-0 flex-1">
												<CardTitle className="text-base flex items-center gap-2">
													<Wrench className="w-4 h-4" />
													{service.name}
												</CardTitle>
												{service.price !== undefined && service.price > 0 ? (
													<p className="text-lg font-bold text-green-600 mt-1">
														Rs. {service.price}
													</p>
												) : (
													<p className="text-lg font-bold text-green-600 mt-1">
														Free
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
												checked={service.available}
												onCheckedChange={() =>
													toggleServiceAvailability(
														service.id,
														!service.available,
													)
												}
											/>
											<span className="text-sm text-gray-600 dark:text-gray-400">
												{service.available ? "Available" : "Unavailable"}
											</span>
										</div>

										<div className="flex items-center gap-1">
											<Button variant="ghost" size="sm">
												<Edit className="w-4 h-4" />
											</Button>
											<Button
												variant="ghost"
												size="sm"
												onClick={() => deleteService(service.id)}
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

					{filteredServices.length === 0 && (
						<div className="text-center py-12">
							<Wrench className="w-12 h-12 text-gray-400 mx-auto mb-4" />
							<h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
								No services found
							</h3>
							<p className="text-gray-500 dark:text-gray-400 mb-4">
								Try adjusting your search or add a new service
							</p>
							<Button onClick={onAddService}>
								<Plus className="w-4 h-4 mr-2" />
								Add First Service
							</Button>
						</div>
					)}
				</TabsContent>
			</Tabs>
		</div>
	);
}
