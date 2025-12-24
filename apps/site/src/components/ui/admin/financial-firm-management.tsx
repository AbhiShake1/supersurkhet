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
  Trash2, Briefcase,
  User, TrendingUp,
  Star
} from "lucide-react";
import { toast } from "sonner";
import type { AdminComponent } from "@/components/ui/admin";

interface Service {
  id: string;
  name: string;
  description: string;
  active: boolean;
}

interface Product {
  id: string;
  name: string;
  description: string;
  riskLevel: "Low" | "Medium" | "High";
  active: boolean;
}

interface Advisor {
  id: string;
  name: string;
  specialization: string;
  experience: string;
  rating: number;
  active: boolean;
}

const mockServices: Service[] = [
  {
    id: "1",
    name: "Investment Advisory",
    description:
      "Personalized investment strategies tailored to your financial goals",
    active: true,
  },
  {
    id: "2",
    name: "Insurance Planning",
    description:
      "Comprehensive insurance solutions to protect your assets and family",
    active: true,
  },
  {
    id: "3",
    name: "Retirement Planning",
    description: "Strategic planning for a secure and comfortable retirement",
    active: false,
  },
];

const mockProducts: Product[] = [
  {
    id: "1",
    name: "Mutual Funds",
    description:
      "Diversified investment options with professional fund management",
    riskLevel: "Medium",
    active: true,
  },
  {
    id: "2",
    name: "Fixed Deposits",
    description: "Secure investment with guaranteed returns",
    riskLevel: "Low",
    active: true,
  },
  {
    id: "3",
    name: "Life Insurance",
    description: "Comprehensive life coverage for you and your family",
    riskLevel: "Low",
    active: true,
  },
  {
    id: "4",
    name: "Stock Portfolio",
    description: "High-growth potential with active portfolio management",
    riskLevel: "High",
    active: false,
  },
];

const mockAdvisors: Advisor[] = [
  {
    id: "1",
    name: "Rajesh K.C.",
    specialization: "Investment Advisory",
    experience: "10+ years",
    rating: 4.9,
    active: true,
  },
  {
    id: "2",
    name: "Sunita Thapa",
    specialization: "Insurance Planning",
    experience: "8+ years",
    rating: 4.8,
    active: true,
  },
  {
    id: "3",
    name: "Amit Shah",
    specialization: "Retirement Planning",
    experience: "12+ years",
    rating: 5.0,
    active: false,
  },
];

export const FinancialFirmManagement: AdminComponent = () => {
  return (
    <_FinancialFirmManagement
      services={mockServices}
      products={mockProducts}
      advisors={mockAdvisors}
      onAddService={() => { }}
      onAddProduct={() => { }}
      onAddAdvisor={() => { }}
    />
  );
};

interface FinancialFirmManagementProps {
  onAddService: () => void;
  onAddProduct: () => void;
  onAddAdvisor: () => void;
  services: Service[];
  products: Product[];
  advisors: Advisor[];
}

function _FinancialFirmManagement({
  onAddService,
  onAddProduct,
  onAddAdvisor,
  services,
  products,
  advisors,
}: FinancialFirmManagementProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedTab, setSelectedTab] = useState("services");

  const filteredServices = services.filter((service) => {
    return (
      service.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      service.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      service.id.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  const filteredProducts = products.filter((product) => {
    return (
      product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.id.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  const filteredAdvisors = advisors.filter((advisor) => {
    return (
      advisor.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      advisor.specialization
        .toLowerCase()
        .includes(searchQuery.toLowerCase()) ||
      advisor.id.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  const toggleServiceActive = (id: string, active: boolean) => {
    // In a real implementation, this would update the data in GunDB
    toast.success(`Service ${active ? "activated" : "deactivated"}`);
  };

  const toggleProductActive = (id: string, active: boolean) => {
    // In a real implementation, this would update the data in GunDB
    toast.success(`Product ${active ? "activated" : "deactivated"}`);
  };

  const toggleAdvisorActive = (id: string, active: boolean) => {
    // In a real implementation, this would update the data in GunDB
    toast.success(`Advisor ${active ? "activated" : "deactivated"}`);
  };

  const deleteService = (id: string) => {
    // In a real implementation, this would delete the service from GunDB
    toast.success("Service removed");
  };

  const deleteProduct = (id: string) => {
    // In a real implementation, this would delete the product from GunDB
    toast.success("Product removed");
  };

  const deleteAdvisor = (id: string) => {
    // In a real implementation, this would delete the advisor from GunDB
    toast.success("Advisor removed");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Financial Firm Management
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Manage your financial services, products, and advisors
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={onAddService} className="w-full sm:w-auto">
            <Plus className="w-4 h-4 mr-2" />
            Add Service
          </Button>
          <Button onClick={onAddProduct} className="w-full sm:w-auto">
            <Plus className="w-4 h-4 mr-2" />
            Add Product
          </Button>
          <Button onClick={onAddAdvisor} className="w-full sm:w-auto">
            <Plus className="w-4 h-4 mr-2" />
            Add Advisor
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
                  Active Services
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {services.filter((s) => s.active).length}
                </p>
              </div>
              <Briefcase className="w-8 h-8 text-gray-400" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Active Products
                </p>
                <p className="text-2xl font-bold text-green-600">
                  {products.filter((p) => p.active).length}
                </p>
              </div>
              <TrendingUp className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Active Advisors
                </p>
                <p className="text-2xl font-bold text-blue-600">
                  {advisors.filter((a) => a.active).length}
                </p>
              </div>
              <User className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Avg. Advisor Rating
                </p>
                <p className="text-2xl font-bold text-purple-600">
                  {(
                    advisors.reduce((sum, advisor) => sum + advisor.rating, 0) /
                    advisors.length || 0
                  ).toFixed(1)}
                </p>
              </div>
              <Star className="w-8 h-8 text-purple-500 fill-current" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder="Search services, products, or advisors..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Tabs for Services, Products, and Advisors */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList className="grid w-full grid-cols-3 h-auto">
          <TabsTrigger
            value="services"
            className="flex flex-row items-center gap-1 p-2 text-xs sm:text-sm"
          >
            <Briefcase className="w-4 h-4" />
            <span className="truncate">Services</span>
          </TabsTrigger>
          <TabsTrigger
            value="products"
            className="flex flex-row items-center gap-1 p-2 text-xs sm:text-sm"
          >
            <TrendingUp className="w-4 h-4" />
            <span className="truncate">Products</span>
          </TabsTrigger>
          <TabsTrigger
            value="advisors"
            className="flex flex-row items-center gap-1 p-2 text-xs sm:text-sm"
          >
            <User className="w-4 h-4" />
            <span className="truncate">Advisors</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="services" className="space-y-4 mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredServices.map((service) => (
              <Card
                key={service.id}
                className={`${!service.active ? "opacity-60" : ""}`}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                      <div className="min-w-0 flex-1">
                        <CardTitle className="text-base flex items-center gap-2">
                          <Briefcase className="w-4 h-4" />
                          {service.name}
                        </CardTitle>
                        <CardDescription className="line-clamp-2">
                          {service.description}
                        </CardDescription>
                      </div>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="pt-0">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={service.active}
                        onCheckedChange={() =>
                          toggleServiceActive(service.id, !service.active)
                        }
                      />
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {service.active ? "Active" : "Inactive"}
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
              <Briefcase className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                No services found
              </h3>
              <p className="text-gray-500 dark:text-gray-400 mb-4">
                Try adjusting your search or add a new service
              </p>
              <Button onClick={onAddService}>
                <Plus className="w-4 h-4 mr-2" />
                Add Service
              </Button>
            </div>
          )}
        </TabsContent>

        <TabsContent value="products" className="space-y-4 mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredProducts.map((product) => (
              <Card
                key={product.id}
                className={`${!product.active ? "opacity-60" : ""}`}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                      <div className="min-w-0 flex-1">
                        <CardTitle className="text-base flex items-center gap-2">
                          <TrendingUp className="w-4 h-4" />
                          {product.name}
                        </CardTitle>
                        <CardDescription className="line-clamp-2">
                          {product.description}
                        </CardDescription>
                        <span
                          className={`inline-block px-2 py-1 text-xs rounded-full mt-2 ${product.riskLevel === "Low"
                            ? "bg-green-100 text-green-800"
                            : product.riskLevel === "Medium"
                              ? "bg-yellow-100 text-yellow-800"
                              : "bg-red-100 text-red-800"
                            }`}
                        >
                          {product.riskLevel} Risk
                        </span>
                      </div>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="pt-0">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={product.active}
                        onCheckedChange={() =>
                          toggleProductActive(product.id, !product.active)
                        }
                      />
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {product.active ? "Active" : "Inactive"}
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="sm">
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteProduct(product.id)}
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

          {filteredProducts.length === 0 && (
            <div className="text-center py-12">
              <TrendingUp className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                No products found
              </h3>
              <p className="text-gray-500 dark:text-gray-400 mb-4">
                Try adjusting your search or add a new product
              </p>
              <Button onClick={onAddProduct}>
                <Plus className="w-4 h-4 mr-2" />
                Add Product
              </Button>
            </div>
          )}
        </TabsContent>

        <TabsContent value="advisors" className="space-y-4 mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredAdvisors.map((advisor) => (
              <Card
                key={advisor.id}
                className={`${!advisor.active ? "opacity-60" : ""}`}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                      <div className="bg-muted rounded-full w-10 h-10 flex items-center justify-center">
                        <User className="w-5 h-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <CardTitle className="text-base">
                          {advisor.name}
                        </CardTitle>
                        <CardDescription>
                          {advisor.specialization}
                        </CardDescription>
                        <div className="flex items-center gap-1 mt-1">
                          {[...Array(5)].map((_, i) => (
                            <Star
                              key={i}
                              className={`w-3 h-3 ${i < Math.floor(advisor.rating)
                                ? "fill-yellow-400 text-yellow-400"
                                : "text-gray-300"
                                }`}
                            />
                          ))}
                          <span className="text-xs ml-1">{advisor.rating}</span>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          {advisor.experience}
                        </p>
                      </div>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="pt-0">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={advisor.active}
                        onCheckedChange={() =>
                          toggleAdvisorActive(advisor.id, !advisor.active)
                        }
                      />
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {advisor.active ? "Active" : "Inactive"}
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="sm">
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteAdvisor(advisor.id)}
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

          {filteredAdvisors.length === 0 && (
            <div className="text-center py-12">
              <User className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                No advisors found
              </h3>
              <p className="text-gray-500 dark:text-gray-400 mb-4">
                Try adjusting your search or add a new advisor
              </p>
              <Button onClick={onAddAdvisor}>
                <Plus className="w-4 h-4 mr-2" />
                Add Advisor
              </Button>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
