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
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Plus,
  Search,
  Edit,
  Trash2, Car,
  User,
  Map,
  CreditCard,
  TrendingUp,
  Star
} from "lucide-react";
import { toast } from "sonner";
import type { AdminComponent } from "@/components/ui/admin";

interface VehicleType {
  id: string;
  name: string;
  baseFare: number;
  perKmRate: number;
  active: boolean;
}

interface Driver {
  id: string;
  name: string;
  vehicle: string;
  license: string;
  rating: number;
  trips: number;
  active: boolean;
}

interface PricingRule {
  id: string;
  name: string;
  distanceFrom: number;
  distanceTo: number;
  ratePerKm: number;
  active: boolean;
}

interface ServiceArea {
  id: string;
  name: string;
  active: boolean;
}

const mockVehicleTypes: VehicleType[] = [
  {
    id: "1",
    name: "Economy",
    baseFare: 50,
    perKmRate: 15,
    active: true,
  },
  {
    id: "2",
    name: "Comfort",
    baseFare: 75,
    perKmRate: 20,
    active: true,
  },
  {
    id: "3",
    name: "Premium",
    baseFare: 100,
    perKmRate: 25,
    active: false,
  },
];

const mockDrivers: Driver[] = [
  {
    id: "1",
    name: "Rajesh K.C.",
    vehicle: "Toyota Corolla - BA 2 KHA 1234",
    license: "DL-2020-12345",
    rating: 4.9,
    trips: 1240,
    active: true,
  },
  {
    id: "2",
    name: "Sunita Thapa",
    vehicle: "Honda City - BA 3 CHA 5678",
    license: "DL-2021-67890",
    rating: 4.8,
    trips: 980,
    active: true,
  },
  {
    id: "3",
    name: "Amit Shah",
    vehicle: "Hyundai Elantra - BA 5 DHA 9012",
    license: "DL-2019-54321",
    rating: 4.7,
    trips: 756,
    active: false,
  },
];

const mockPricingRules: PricingRule[] = [
  {
    id: "1",
    name: "Short Distance (0-5 km)",
    distanceFrom: 0,
    distanceTo: 5,
    ratePerKm: 15,
    active: true,
  },
  {
    id: "2",
    name: "Medium Distance (5-15 km)",
    distanceFrom: 5,
    distanceTo: 15,
    ratePerKm: 12,
    active: true,
  },
  {
    id: "3",
    name: "Long Distance (15+ km)",
    distanceFrom: 15,
    distanceTo: 100,
    ratePerKm: 10,
    active: true,
  },
];

const mockServiceAreas: ServiceArea[] = [
  {
    id: "1",
    name: "Birendranagar Central",
    active: true,
  },
  {
    id: "2",
    name: "District Hospital Area",
    active: true,
  },
  {
    id: "3",
    name: "Airport Road",
    active: true,
  },
  {
    id: "4",
    name: "Surkhet Valley",
    active: false,
  },
];

export const RideSharingManagement: AdminComponent = () => {
  return (
    <_RideSharingManagement
      vehicleTypes={mockVehicleTypes}
      drivers={mockDrivers}
      pricingRules={mockPricingRules}
      serviceAreas={mockServiceAreas}
      onAddVehicleType={() => { }}
      onAddDriver={() => { }}
      onAddPricingRule={() => { }}
      onAddServiceArea={() => { }}
    />
  );
};

interface RideSharingManagementProps {
  onAddVehicleType: () => void;
  onAddDriver: () => void;
  onAddPricingRule: () => void;
  onAddServiceArea: () => void;
  vehicleTypes: VehicleType[];
  drivers: Driver[];
  pricingRules: PricingRule[];
  serviceAreas: ServiceArea[];
}

function _RideSharingManagement({
  onAddVehicleType,
  onAddDriver,
  onAddPricingRule,
  onAddServiceArea,
  vehicleTypes,
  drivers,
  pricingRules,
  serviceAreas,
}: RideSharingManagementProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTab, setSelectedTab] = useState("vehicles");

  const filteredVehicleTypes = vehicleTypes.filter((vehicle) => {
    return (
      vehicle.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      vehicle.id.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  const filteredDrivers = drivers.filter((driver) => {
    return (
      driver.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      driver.vehicle.toLowerCase().includes(searchQuery.toLowerCase()) ||
      driver.id.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  const filteredPricingRules = pricingRules.filter((rule) => {
    return (
      rule.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      rule.id.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  const filteredServiceAreas = serviceAreas.filter((area) => {
    return (
      area.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      area.id.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  const toggleVehicleTypeActive = (id: string, active: boolean) => {
    // In a real implementation, this would update the data in GunDB
    toast.success(`Vehicle type ${active ? "activated" : "deactivated"}`);
  };

  const toggleDriverActive = (id: string, active: boolean) => {
    // In a real implementation, this would update the data in GunDB
    toast.success(`Driver ${active ? "activated" : "deactivated"}`);
  };

  const togglePricingRuleActive = (id: string, active: boolean) => {
    // In a real implementation, this would update the data in GunDB
    toast.success(`Pricing rule ${active ? "activated" : "deactivated"}`);
  };

  const toggleServiceAreaActive = (id: string, active: boolean) => {
    // In a real implementation, this would update the data in GunDB
    toast.success(`Service area ${active ? "activated" : "deactivated"}`);
  };

  const deleteVehicleType = (id: string) => {
    // In a real implementation, this would delete the vehicle type from GunDB
    toast.success("Vehicle type removed");
  };

  const deleteDriver = (id: string) => {
    // In a real implementation, this would delete the driver from GunDB
    toast.success("Driver removed");
  };

  const deletePricingRule = (id: string) => {
    // In a real implementation, this would delete the pricing rule from GunDB
    toast.success("Pricing rule removed");
  };

  const deleteServiceArea = (id: string) => {
    // In a real implementation, this would delete the service area from GunDB
    toast.success("Service area removed");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Ride Sharing Management
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Manage your vehicles, drivers, pricing, and service areas
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={onAddVehicleType} className="w-full sm:w-auto">
            <Plus className="w-4 h-4 mr-2" />
            Add Vehicle Type
          </Button>
          <Button onClick={onAddDriver} className="w-full sm:w-auto">
            <Plus className="w-4 h-4 mr-2" />
            Add Driver
          </Button>
          <Button onClick={onAddPricingRule} className="w-full sm:w-auto">
            <Plus className="w-4 h-4 mr-2" />
            Add Pricing Rule
          </Button>
          <Button onClick={onAddServiceArea} className="w-full sm:w-auto">
            <Plus className="w-4 h-4 mr-2" />
            Add Service Area
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
                  Active Vehicles
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {vehicleTypes.filter((v) => v.active).length}
                </p>
              </div>
              <Car className="w-8 h-8 text-gray-400" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Active Drivers
                </p>
                <p className="text-2xl font-bold text-green-600">
                  {drivers.filter((d) => d.active).length}
                </p>
              </div>
              <User className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Service Areas
                </p>
                <p className="text-2xl font-bold text-blue-600">
                  {serviceAreas.filter((a) => a.active).length}
                </p>
              </div>
              <Map className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Total Trips
                </p>
                <p className="text-2xl font-bold text-purple-600">
                  {drivers.reduce((sum, driver) => sum + driver.trips, 0)}
                </p>
              </div>
              <TrendingUp className="w-8 h-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder="Search vehicles, drivers, pricing, or areas..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Tabs for Vehicles, Drivers, Pricing, and Service Areas */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList className="grid w-full grid-cols-4 h-auto">
          <TabsTrigger
            value="vehicles"
            className="flex flex-row items-center gap-1 p-2 text-xs sm:text-sm"
          >
            <Car className="w-4 h-4" />
            <span className="truncate">Vehicles</span>
          </TabsTrigger>
          <TabsTrigger
            value="drivers"
            className="flex flex-row items-center gap-1 p-2 text-xs sm:text-sm"
          >
            <User className="w-4 h-4" />
            <span className="truncate">Drivers</span>
          </TabsTrigger>
          <TabsTrigger
            value="pricing"
            className="flex flex-row items-center gap-1 p-2 text-xs sm:text-sm"
          >
            <CreditCard className="w-4 h-4" />
            <span className="truncate">Pricing</span>
          </TabsTrigger>
          <TabsTrigger
            value="areas"
            className="flex flex-row items-center gap-1 p-2 text-xs sm:text-sm"
          >
            <Map className="w-4 h-4" />
            <span className="truncate">Areas</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="vehicles" className="space-y-4 mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredVehicleTypes.map((vehicle) => (
              <Card
                key={vehicle.id}
                className={`${!vehicle.active ? "opacity-60" : ""}`}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                      <div className="min-w-0 flex-1">
                        <CardTitle className="text-base flex items-center gap-2">
                          <Car className="w-4 h-4" />
                          {vehicle.name}
                        </CardTitle>
                        <div className="flex justify-between mt-2">
                          <span className="text-sm">
                            Base: Rs. {vehicle.baseFare}
                          </span>
                          <span className="text-sm">
                            Per Km: Rs. {vehicle.perKmRate}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="pt-0">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={vehicle.active}
                        onCheckedChange={() =>
                          toggleVehicleTypeActive(vehicle.id, !vehicle.active)
                        }
                      />
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {vehicle.active ? "Active" : "Inactive"}
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="sm">
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteVehicleType(vehicle.id)}
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

          {filteredVehicleTypes.length === 0 && (
            <div className="text-center py-12">
              <Car className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                No vehicle types found
              </h3>
              <p className="text-gray-500 dark:text-gray-400 mb-4">
                Try adjusting your search or add a new vehicle type
              </p>
              <Button onClick={onAddVehicleType}>
                <Plus className="w-4 h-4 mr-2" />
                Add Vehicle Type
              </Button>
            </div>
          )}
        </TabsContent>

        <TabsContent value="drivers" className="space-y-4 mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredDrivers.map((driver) => (
              <Card
                key={driver.id}
                className={`${!driver.active ? "opacity-60" : ""}`}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                      <div className="bg-muted rounded-full w-10 h-10 flex items-center justify-center">
                        <User className="w-5 h-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <CardTitle className="text-base">
                          {driver.name}
                        </CardTitle>
                        <CardDescription className="text-sm line-clamp-1">
                          {driver.vehicle}
                        </CardDescription>
                        <div className="flex items-center gap-1 mt-1">
                          {[...Array(5)].map((_, i) => (
                            <Star
                              key={i}
                              className={`w-3 h-3 ${i < Math.floor(driver.rating)
                                ? "fill-yellow-400 text-yellow-400"
                                : "text-gray-300"
                                }`}
                            />
                          ))}
                          <span className="text-xs ml-1">{driver.rating}</span>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          {driver.trips} trips
                        </p>
                      </div>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="pt-0">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={driver.active}
                        onCheckedChange={() =>
                          toggleDriverActive(driver.id, !driver.active)
                        }
                      />
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {driver.active ? "Active" : "Inactive"}
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="sm">
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteDriver(driver.id)}
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

          {filteredDrivers.length === 0 && (
            <div className="text-center py-12">
              <User className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                No drivers found
              </h3>
              <p className="text-gray-500 dark:text-gray-400 mb-4">
                Try adjusting your search or add a new driver
              </p>
              <Button onClick={onAddDriver}>
                <Plus className="w-4 h-4 mr-2" />
                Add Driver
              </Button>
            </div>
          )}
        </TabsContent>

        <TabsContent value="pricing" className="space-y-4 mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredPricingRules.map((rule) => (
              <Card
                key={rule.id}
                className={`${!rule.active ? "opacity-60" : ""}`}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                      <div className="min-w-0 flex-1">
                        <CardTitle className="text-base flex items-center gap-2">
                          <CreditCard className="w-4 h-4" />
                          {rule.name}
                        </CardTitle>
                        <CardDescription className="mt-1">
                          {rule.distanceFrom} - {rule.distanceTo} km
                        </CardDescription>
                        <p className="text-lg font-bold text-green-600 mt-1">
                          Rs. {rule.ratePerKm}/km
                        </p>
                      </div>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="pt-0">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={rule.active}
                        onCheckedChange={() =>
                          togglePricingRuleActive(rule.id, !rule.active)
                        }
                      />
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {rule.active ? "Active" : "Inactive"}
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="sm">
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deletePricingRule(rule.id)}
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

          {filteredPricingRules.length === 0 && (
            <div className="text-center py-12">
              <CreditCard className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                No pricing rules found
              </h3>
              <p className="text-gray-500 dark:text-gray-400 mb-4">
                Try adjusting your search or add a new pricing rule
              </p>
              <Button onClick={onAddPricingRule}>
                <Plus className="w-4 h-4 mr-2" />
                Add Pricing Rule
              </Button>
            </div>
          )}
        </TabsContent>

        <TabsContent value="areas" className="space-y-4 mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredServiceAreas.map((area) => (
              <Card
                key={area.id}
                className={`${!area.active ? "opacity-60" : ""}`}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                      <div className="min-w-0 flex-1">
                        <CardTitle className="text-base flex items-center gap-2">
                          <Map className="w-4 h-4" />
                          {area.name}
                        </CardTitle>
                      </div>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="pt-0">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={area.active}
                        onCheckedChange={() =>
                          toggleServiceAreaActive(area.id, !area.active)
                        }
                      />
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {area.active ? "Active" : "Inactive"}
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="sm">
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteServiceArea(area.id)}
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

          {filteredServiceAreas.length === 0 && (
            <div className="text-center py-12">
              <Map className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                No service areas found
              </h3>
              <p className="text-gray-500 dark:text-gray-400 mb-4">
                Try adjusting your search or add a new service area
              </p>
              <Button onClick={onAddServiceArea}>
                <Plus className="w-4 h-4 mr-2" />
                Add Service Area
              </Button>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
