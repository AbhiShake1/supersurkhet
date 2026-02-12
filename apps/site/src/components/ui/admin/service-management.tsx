'use client';

import { useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Plus,
  Search,
  Edit,
  Trash2,
  Wrench,
  User,
  Calendar,
  Tag,
  Star,
  Check,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import type { AdminComponent } from '@/components/ui/admin';

interface Service {
  id: string;
  name: string;
  description: string;
  price: number;
  duration: number; // in minutes
  categoryId: string;
  active: boolean;
}

interface ServiceCategory {
  id: string;
  name: string;
  active: boolean;
}

interface ServiceProvider {
  id: string;
  name: string;
  specialization: string;
  experience: string;
  rating: number;
  active: boolean;
}

interface Appointment {
  id: string;
  serviceId: string;
  serviceName: string;
  customerId: string;
  customerName: string;
  providerId: string;
  providerName: string;
  dateTime: string;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
}

const mockServices: Service[] = [
  {
    id: '1',
    name: 'Plumbing Service',
    description: 'Professional plumbing solutions for your home or business',
    price: 500,
    duration: 120,
    categoryId: '1',
    active: true,
  },
  {
    id: '2',
    name: 'Electrical Repair',
    description: 'Expert electrical work and maintenance services',
    price: 600,
    duration: 90,
    categoryId: '1',
    active: true,
  },
  {
    id: '3',
    name: 'AC Maintenance',
    description: 'Complete air conditioning maintenance and repair',
    price: 800,
    duration: 180,
    categoryId: '1',
    active: false,
  },
  {
    id: '4',
    name: 'Business Consulting',
    description: 'Strategic business advice and planning services',
    price: 2000,
    duration: 90,
    categoryId: '2',
    active: true,
  },
];

const mockServiceCategories: ServiceCategory[] = [
  {
    id: '1',
    name: 'Home Services',
    active: true,
  },
  {
    id: '2',
    name: 'Business Services',
    active: true,
  },
  {
    id: '3',
    name: 'Repair Services',
    active: true,
  },
  {
    id: '4',
    name: 'Consulting',
    active: false,
  },
];

const mockServiceProviders: ServiceProvider[] = [
  {
    id: '1',
    name: 'Rajesh K.C.',
    specialization: 'Plumbing & Electrical',
    experience: '10+ years',
    rating: 4.9,
    active: true,
  },
  {
    id: '2',
    name: 'Sunita Thapa',
    specialization: 'AC Specialist',
    experience: '8+ years',
    rating: 4.8,
    active: true,
  },
  {
    id: '3',
    name: 'Amit Shah',
    specialization: 'Business Consultant',
    experience: '12+ years',
    rating: 4.7,
    active: false,
  },
];

const mockAppointments: Appointment[] = [
  {
    id: '1',
    serviceId: '1',
    serviceName: 'Plumbing Service',
    customerId: 'cust1',
    customerName: 'John Doe',
    providerId: '1',
    providerName: 'Rajesh K.C.',
    dateTime: '2025-08-25T10:00:00',
    status: 'confirmed',
  },
  {
    id: '2',
    serviceId: '2',
    serviceName: 'Electrical Repair',
    customerId: 'cust2',
    customerName: 'Jane Smith',
    providerId: '1',
    providerName: 'Rajesh K.C.',
    dateTime: '2025-08-25T14:00:00',
    status: 'pending',
  },
  {
    id: '3',
    serviceId: '4',
    serviceName: 'Business Consulting',
    customerId: 'cust3',
    customerName: 'ABC Corporation',
    providerId: '3',
    providerName: 'Amit Shah',
    dateTime: '2025-08-26T11:00:00',
    status: 'completed',
  },
  {
    id: '4',
    serviceId: '1',
    serviceName: 'Plumbing Service',
    customerId: 'cust4',
    customerName: 'Sita Gurung',
    providerId: '1',
    providerName: 'Rajesh K.C.',
    dateTime: '2025-08-26T16:00:00',
    status: 'cancelled',
  },
];

export const ServiceManagement: AdminComponent = () => {
  return (
    <_ServiceManagement
      services={mockServices}
      categories={mockServiceCategories}
      providers={mockServiceProviders}
      appointments={mockAppointments}
      onAddService={() => {}}
      onAddCategory={() => {}}
      onAddProvider={() => {}}
      onAddAppointment={() => {}}
    />
  );
};

interface ServiceManagementProps {
  onAddService: () => void;
  onAddCategory: () => void;
  onAddProvider: () => void;
  onAddAppointment: () => void;
  services: Service[];
  categories: ServiceCategory[];
  providers: ServiceProvider[];
  appointments: Appointment[];
}

function _ServiceManagement({
  onAddService,
  onAddCategory,
  onAddProvider,
  onAddAppointment,
  services,
  categories,
  providers,
  appointments,
}: ServiceManagementProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTab, setSelectedTab] = useState('services');

  const filteredServices = services.filter((service) => {
    return (
      service.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      service.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      service.id.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  const filteredCategories = categories.filter((category) => {
    return (
      category.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      category.id.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  const filteredProviders = providers.filter((provider) => {
    return (
      provider.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      provider.specialization
        .toLowerCase()
        .includes(searchQuery.toLowerCase()) ||
      provider.id.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  const filteredAppointments = appointments.filter((appointment) => {
    return (
      appointment.serviceName
        .toLowerCase()
        .includes(searchQuery.toLowerCase()) ||
      appointment.customerName
        .toLowerCase()
        .includes(searchQuery.toLowerCase()) ||
      appointment.providerName
        .toLowerCase()
        .includes(searchQuery.toLowerCase()) ||
      appointment.id.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  const toggleServiceActive = (_id: string, active: boolean) => {
    // In a real implementation, this would update the data in GunDB
    toast.success(`Service ${active ? 'activated' : 'deactivated'}`);
  };

  const toggleCategoryActive = (_id: string, active: boolean) => {
    // In a real implementation, this would update the data in GunDB
    toast.success(`Category ${active ? 'activated' : 'deactivated'}`);
  };

  const toggleProviderActive = (_id: string, active: boolean) => {
    // In a real implementation, this would update the data in GunDB
    toast.success(`Provider ${active ? 'activated' : 'deactivated'}`);
  };

  const deleteService = (_id: string) => {
    // In a real implementation, this would delete the service from GunDB
    toast.success('Service removed');
  };

  const deleteCategory = (_id: string) => {
    // In a real implementation, this would delete the category from GunDB
    toast.success('Category removed');
  };

  const deleteProvider = (_id: string) => {
    // In a real implementation, this would delete the provider from GunDB
    toast.success('Provider removed');
  };

  const updateAppointmentStatus = (
    _id: string,
    status: Appointment['status'],
  ) => {
    // In a real implementation, this would update the appointment status in GunDB
    toast.success(`Appointment ${status}`);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Service Management
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Manage your services, categories, providers, and appointments
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={onAddService} className="w-full sm:w-auto">
            <Plus className="w-4 h-4 mr-2" />
            Add Service
          </Button>
          <Button onClick={onAddCategory} className="w-full sm:w-auto">
            <Plus className="w-4 h-4 mr-2" />
            Add Category
          </Button>
          <Button onClick={onAddProvider} className="w-full sm:w-auto">
            <Plus className="w-4 h-4 mr-2" />
            Add Provider
          </Button>
          <Button onClick={onAddAppointment} className="w-full sm:w-auto">
            <Plus className="w-4 h-4 mr-2" />
            Add Appointment
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
              <Wrench className="w-8 h-8 text-gray-400" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Service Categories
                </p>
                <p className="text-2xl font-bold text-green-600">
                  {categories.filter((c) => c.active).length}
                </p>
              </div>
              <Tag className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Active Providers
                </p>
                <p className="text-2xl font-bold text-blue-600">
                  {providers.filter((p) => p.active).length}
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
                  Pending Appointments
                </p>
                <p className="text-2xl font-bold text-purple-600">
                  {appointments.filter((a) => a.status === 'pending').length}
                </p>
              </div>
              <Calendar className="w-8 h-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder="Search services, categories, providers, or appointments..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Tabs for Services, Categories, Providers, and Appointments */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList className="grid w-full grid-cols-4 h-auto">
          <TabsTrigger
            value="services"
            className="flex flex-row items-center gap-1 p-2 text-xs sm:text-sm"
          >
            <Wrench className="w-4 h-4" />
            <span className="truncate">Services</span>
          </TabsTrigger>
          <TabsTrigger
            value="categories"
            className="flex flex-row items-center gap-1 p-2 text-xs sm:text-sm"
          >
            <Tag className="w-4 h-4" />
            <span className="truncate">Categories</span>
          </TabsTrigger>
          <TabsTrigger
            value="providers"
            className="flex flex-row items-center gap-1 p-2 text-xs sm:text-sm"
          >
            <User className="w-4 h-4" />
            <span className="truncate">Providers</span>
          </TabsTrigger>
          <TabsTrigger
            value="appointments"
            className="flex flex-row items-center gap-1 p-2 text-xs sm:text-sm"
          >
            <Calendar className="w-4 h-4" />
            <span className="truncate">Appointments</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="services" className="space-y-4 mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredServices.map((service) => (
              <Card
                key={service.id}
                className={`${!service.active ? 'opacity-60' : ''}`}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                      <div className="min-w-0 flex-1">
                        <CardTitle className="text-base flex items-center gap-2">
                          <Wrench className="w-4 h-4" />
                          {service.name}
                        </CardTitle>
                        <CardDescription className="line-clamp-2">
                          {service.description}
                        </CardDescription>
                        <div className="flex justify-between mt-2">
                          <span className="text-lg font-bold text-green-600">
                            Rs. {service.price}
                          </span>
                          <span className="text-sm text-muted-foreground">
                            {service.duration} mins
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
                        checked={service.active}
                        onCheckedChange={() =>
                          toggleServiceActive(service.id, !service.active)
                        }
                      />
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {service.active ? 'Active' : 'Inactive'}
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
                Add Service
              </Button>
            </div>
          )}
        </TabsContent>

        <TabsContent value="categories" className="space-y-4 mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredCategories.map((category) => (
              <Card
                key={category.id}
                className={`${!category.active ? 'opacity-60' : ''}`}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                      <div className="min-w-0 flex-1">
                        <CardTitle className="text-base flex items-center gap-2">
                          <Tag className="w-4 h-4" />
                          {category.name}
                        </CardTitle>
                      </div>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="pt-0">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={category.active}
                        onCheckedChange={() =>
                          toggleCategoryActive(category.id, !category.active)
                        }
                      />
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {category.active ? 'Active' : 'Inactive'}
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="sm">
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteCategory(category.id)}
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

          {filteredCategories.length === 0 && (
            <div className="text-center py-12">
              <Tag className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                No categories found
              </h3>
              <p className="text-gray-500 dark:text-gray-400 mb-4">
                Try adjusting your search or add a new category
              </p>
              <Button onClick={onAddCategory}>
                <Plus className="w-4 h-4 mr-2" />
                Add Category
              </Button>
            </div>
          )}
        </TabsContent>

        <TabsContent value="providers" className="space-y-4 mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredProviders.map((provider) => (
              <Card
                key={provider.id}
                className={`${!provider.active ? 'opacity-60' : ''}`}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                      <div className="bg-muted rounded-full w-10 h-10 flex items-center justify-center">
                        <User className="w-5 h-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <CardTitle className="text-base">
                          {provider.name}
                        </CardTitle>
                        <CardDescription>
                          {provider.specialization}
                        </CardDescription>
                        <div className="flex items-center gap-1 mt-1">
                          {[...Array(5)].map((_, i) => (
                            <Star
                              // biome-ignore lint/suspicious/noArrayIndexKey: lint debt cleanup
                              key={i}
                              className={`w-3 h-3 ${
                                i < Math.floor(provider.rating)
                                  ? 'fill-yellow-400 text-yellow-400'
                                  : 'text-gray-300'
                              }`}
                            />
                          ))}
                          <span className="text-xs ml-1">
                            {provider.rating}
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          {provider.experience}
                        </p>
                      </div>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="pt-0">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={provider.active}
                        onCheckedChange={() =>
                          toggleProviderActive(provider.id, !provider.active)
                        }
                      />
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {provider.active ? 'Active' : 'Inactive'}
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="sm">
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteProvider(provider.id)}
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

          {filteredProviders.length === 0 && (
            <div className="text-center py-12">
              <User className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                No providers found
              </h3>
              <p className="text-gray-500 dark:text-gray-400 mb-4">
                Try adjusting your search or add a new provider
              </p>
              <Button onClick={onAddProvider}>
                <Plus className="w-4 h-4 mr-2" />
                Add Provider
              </Button>
            </div>
          )}
        </TabsContent>

        <TabsContent value="appointments" className="space-y-4 mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredAppointments.map((appointment) => (
              <Card
                key={appointment.id}
                className={`${appointment.status === 'cancelled' ? 'opacity-60' : ''}`}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                      <div className="min-w-0 flex-1">
                        <CardTitle className="text-base flex items-center gap-2">
                          <Calendar className="w-4 h-4" />
                          {appointment.serviceName}
                        </CardTitle>
                        <CardDescription className="line-clamp-1">
                          {appointment.customerName}
                        </CardDescription>
                        <p className="text-sm text-muted-foreground mt-1">
                          with {appointment.providerName}
                        </p>
                        <p className="text-sm font-medium mt-1">
                          {new Date(appointment.dateTime).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="pt-0">
                  <div className="flex items-center justify-between">
                    <span
                      className={`px-2 py-1 text-xs rounded-full ${
                        appointment.status === 'pending'
                          ? 'bg-yellow-100 text-yellow-800'
                          : appointment.status === 'confirmed'
                            ? 'bg-blue-100 text-blue-800'
                            : appointment.status === 'completed'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {appointment.status.charAt(0).toUpperCase() +
                        appointment.status.slice(1)}
                    </span>

                    <div className="flex items-center gap-1">
                      {appointment.status === 'pending' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            updateAppointmentStatus(appointment.id, 'confirmed')
                          }
                          className="text-green-600 hover:text-green-700"
                        >
                          <Check className="w-4 h-4" />
                        </Button>
                      )}
                      {appointment.status === 'confirmed' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            updateAppointmentStatus(appointment.id, 'completed')
                          }
                          className="text-green-600 hover:text-green-700"
                        >
                          <Check className="w-4 h-4" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          updateAppointmentStatus(appointment.id, 'cancelled')
                        }
                        className="text-red-600 hover:text-red-700"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {filteredAppointments.length === 0 && (
            <div className="text-center py-12">
              <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                No appointments found
              </h3>
              <p className="text-gray-500 dark:text-gray-400 mb-4">
                Try adjusting your search or add a new appointment
              </p>
              <Button onClick={onAddAppointment}>
                <Plus className="w-4 h-4 mr-2" />
                Add Appointment
              </Button>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
