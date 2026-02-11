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
  Home,
  Building,
  Landmark,
  Ruler,
  User,
  Users,
  DollarSign,
  MapPin,
  Filter,
  Star,
  Check,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import type { AdminComponent } from '@/components/ui/admin';

interface Property {
  id: string;
  title: string;
  description: string;
  type: 'residential' | 'commercial' | 'industrial' | 'land';
  status: 'available' | 'sold' | 'leased' | 'under_contract';
  price: number;
  area: number;
  bedrooms?: number;
  bathrooms?: number;
  parkingSpaces?: number;
  yearBuilt?: number;
  features: string[];
  location: {
    address: string;
    city: string;
    state: string;
    zipCode: string;
  };
  agentId: string;
  agentName: string;
  active: boolean;
}

interface Agent {
  id: string;
  name: string;
  phone: string;
  email: string;
  experience: string;
  rating: number;
  active: boolean;
}

interface Client {
  id: string;
  name: string;
  phone: string;
  email: string;
  interestedProperties: string[];
  status: 'prospect' | 'buyer' | 'seller' | 'past_client';
  active: boolean;
}

interface Transaction {
  id: string;
  propertyId: string;
  propertyName: string;
  clientId: string;
  clientName: string;
  agentId: string;
  agentName: string;
  type: 'sale' | 'lease' | 'rental';
  price: number;
  date: string;
  status: 'pending' | 'completed' | 'cancelled';
  active: boolean;
}

const mockProperties: Property[] = [
  {
    id: '1',
    title: 'Modern Family Home',
    description:
      'Beautiful 3-bedroom family home with spacious backyard and modern amenities',
    type: 'residential',
    status: 'available',
    price: 4500000,
    area: 2500,
    bedrooms: 3,
    bathrooms: 2,
    parkingSpaces: 2,
    yearBuilt: 2018,
    features: ['Garden', 'Garage', 'Central AC', 'Security System'],
    location: {
      address: 'Peaceful Lane 123',
      city: 'Birendranagar',
      state: 'Surkhet',
      zipCode: '21900',
    },
    agentId: '1',
    agentName: 'Rajesh K.C.',
    active: true,
  },
  {
    id: '2',
    title: 'Downtown Commercial Space',
    description:
      'Prime commercial space in downtown area with high foot traffic and excellent visibility',
    type: 'commercial',
    status: 'available',
    price: 8500000,
    area: 4200,
    parkingSpaces: 15,
    yearBuilt: 2015,
    features: ['High Visibility', 'Parking', 'Elevator', 'Security'],
    location: {
      address: 'Main Street 456',
      city: 'Birendranagar',
      state: 'Surkhet',
      zipCode: '21900',
    },
    agentId: '2',
    agentName: 'Sunita Thapa',
    active: true,
  },
  {
    id: '3',
    title: 'Industrial Warehouse',
    description:
      'Large industrial warehouse with loading dock and high ceilings, perfect for manufacturing',
    type: 'industrial',
    status: 'leased',
    price: 12000000,
    area: 15000,
    parkingSpaces: 25,
    yearBuilt: 2010,
    features: ['Loading Dock', 'High Ceilings', 'Security', 'HVAC'],
    location: {
      address: 'Industrial Zone 789',
      city: 'Birendranagar',
      state: 'Surkhet',
      zipCode: '21900',
    },
    agentId: '3',
    agentName: 'Amit Shah',
    active: false,
  },
  {
    id: '4',
    title: 'Scenic Land Parcel',
    description:
      'Large scenic land parcel perfect for development or agricultural use',
    type: 'land',
    status: 'available',
    price: 3200000,
    area: 12000,
    features: ['Scenic Views', 'Water Access', 'Utilities', 'Road Access'],
    location: {
      address: 'Mountain View Road',
      city: 'Birendranagar',
      state: 'Surkhet',
      zipCode: '21900',
    },
    agentId: '4',
    agentName: 'Priya Gurung',
    active: true,
  },
];

const mockAgents: Agent[] = [
  {
    id: '1',
    name: 'Rajesh K.C.',
    phone: '+977-98XXXXXXXX',
    email: 'rajesh@surkhetvalleyrealty.com.np',
    experience: '12+ years',
    rating: 4.9,
    active: true,
  },
  {
    id: '2',
    name: 'Sunita Thapa',
    phone: '+977-98XXXXXXXX',
    email: 'sunita@surkhetvalleyrealty.com.np',
    experience: '10+ years',
    rating: 4.8,
    active: true,
  },
  {
    id: '3',
    name: 'Amit Shah',
    phone: '+977-98XXXXXXXX',
    email: 'amit@surkhetvalleyrealty.com.np',
    experience: '8+ years',
    rating: 4.7,
    active: false,
  },
  {
    id: '4',
    name: 'Priya Gurung',
    phone: '+977-98XXXXXXXX',
    email: 'priya@surkhetvalleyrealty.com.np',
    experience: '6+ years',
    rating: 4.6,
    active: true,
  },
];

const mockClients: Client[] = [
  {
    id: '1',
    name: 'Ram Bahadur Thapa',
    phone: '+977-98XXXXXXXX',
    email: 'ram@example.com',
    interestedProperties: ['1', '3'],
    status: 'prospect',
    active: true,
  },
  {
    id: '2',
    name: 'Sita Kumari Shah',
    phone: '+977-98XXXXXXXX',
    email: 'sita@example.com',
    interestedProperties: ['2'],
    status: 'buyer',
    active: true,
  },
  {
    id: '3',
    name: 'Hari Prasad',
    phone: '+977-98XXXXXXXX',
    email: 'hari@example.com',
    interestedProperties: ['4'],
    status: 'seller',
    active: false,
  },
  {
    id: '4',
    name: 'Gita Devi',
    phone: '+977-98XXXXXXXX',
    email: 'gita@example.com',
    interestedProperties: [],
    status: 'past_client',
    active: true,
  },
];

const mockTransactions: Transaction[] = [
  {
    id: '1',
    propertyId: '1',
    propertyName: 'Modern Family Home',
    clientId: '2',
    clientName: 'Sita Kumari Shah',
    agentId: '1',
    agentName: 'Rajesh K.C.',
    type: 'sale',
    price: 4500000,
    date: '2025-08-15',
    status: 'completed',
    active: true,
  },
  {
    id: '2',
    propertyId: '2',
    propertyName: 'Downtown Commercial Space',
    clientId: '1',
    clientName: 'Ram Bahadur Thapa',
    agentId: '2',
    agentName: 'Sunita Thapa',
    type: 'lease',
    price: 8500000,
    date: '2025-08-20',
    status: 'pending',
    active: true,
  },
  {
    id: '3',
    propertyId: '3',
    propertyName: 'Industrial Warehouse',
    clientId: '3',
    clientName: 'Hari Prasad',
    agentId: '3',
    agentName: 'Amit Shah',
    type: 'rental',
    price: 12000000,
    date: '2025-07-22',
    status: 'completed',
    active: false,
  },
  {
    id: '4',
    propertyId: '4',
    propertyName: 'Scenic Land Parcel',
    clientId: '4',
    clientName: 'Gita Devi',
    agentId: '4',
    agentName: 'Priya Gurung',
    type: 'sale',
    price: 3200000,
    date: '2025-08-18',
    status: 'cancelled',
    active: true,
  },
];

export const RealEstateManagement: AdminComponent = () => {
  return (
    <_RealEstateManagement
      properties={mockProperties}
      agents={mockAgents}
      clients={mockClients}
      transactions={mockTransactions}
      onAddProperty={() => {}}
      onAddAgent={() => {}}
      onAddClient={() => {}}
      onAddTransaction={() => {}}
    />
  );
};

interface RealEstateManagementProps {
  onAddProperty: () => void;
  onAddAgent: () => void;
  onAddClient: () => void;
  onAddTransaction: () => void;
  properties: Property[];
  agents: Agent[];
  clients: Client[];
  transactions: Transaction[];
}

function _RealEstateManagement({
  onAddProperty,
  onAddAgent,
  onAddClient,
  onAddTransaction,
  properties,
  agents,
  clients,
  transactions,
}: RealEstateManagementProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTab, setSelectedTab] = useState('properties');

  const filteredProperties = properties.filter((property) => {
    return (
      property.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      property.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      property.location.address
        .toLowerCase()
        .includes(searchQuery.toLowerCase()) ||
      property.location.city
        .toLowerCase()
        .includes(searchQuery.toLowerCase()) ||
      property.agentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      property.id.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  const filteredAgents = agents.filter((agent) => {
    return (
      agent.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      agent.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      agent.phone.includes(searchQuery) ||
      agent.id.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  const filteredClients = clients.filter((client) => {
    return (
      client.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      client.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      client.phone.includes(searchQuery) ||
      client.id.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  const filteredTransactions = transactions.filter((transaction) => {
    return (
      transaction.propertyName
        .toLowerCase()
        .includes(searchQuery.toLowerCase()) ||
      transaction.clientName
        .toLowerCase()
        .includes(searchQuery.toLowerCase()) ||
      transaction.agentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      transaction.id.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  const togglePropertyActive = (_id: string, active: boolean) => {
    // In a real implementation, this would update the data in GunDB
    toast.success(`Property ${active ? 'activated' : 'deactivated'}`);
  };

  const toggleAgentActive = (_id: string, active: boolean) => {
    // In a real implementation, this would update the data in GunDB
    toast.success(`Agent ${active ? 'activated' : 'deactivated'}`);
  };

  const toggleClientActive = (_id: string, active: boolean) => {
    // In a real implementation, this would update the data in GunDB
    toast.success(`Client ${active ? 'activated' : 'deactivated'}`);
  };

  const deleteProperty = (g) => {
    // In a real implementation, this would delete the property from GunDB
    toast.success('Property removed');
  };

  const deleteAgent = (g) => {
    // In a real implementation, this would delete the agent from GunDB
    toast.success('Agent removed');
  };

  const deleteClient = (g) => {
    // In a real implementation, this would delete the client from GunDB
    toast.success('Client removed');
  };

  const updateTransactionStatus = (
    _id: string,
    status: Transaction['status'],
  ) => {
    // In a real implementation, this would update the transaction status in GunDB
    toast.success(`Transaction ${status}`);
  };

  const getPropertyIcon = (type: Property['type']) => {
    switch (type) {
      case 'residential':
        return Home;
      case 'commercial':
        return Building;
      case 'industrial':
        return Landmark;
      case 'land':
        return Ruler;
      default:
        return Home;
    }
  };

  const getClientStatusColor = (status: Client['status']) => {
    switch (status) {
      case 'prospect':
        return 'bg-yellow-100 text-yellow-800';
      case 'buyer':
        return 'bg-green-100 text-green-800';
      case 'seller':
        return 'bg-blue-100 text-blue-800';
      case 'past_client':
        return 'bg-purple-100 text-purple-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Real Estate Management
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Manage your properties, agents, clients, and transactions
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={onAddProperty} className="w-full sm:w-auto">
            <Plus className="w-4 h-4 mr-2" />
            Add Property
          </Button>
          <Button onClick={onAddAgent} className="w-full sm:w-auto">
            <Plus className="w-4 h-4 mr-2" />
            Add Agent
          </Button>
          <Button onClick={onAddClient} className="w-full sm:w-auto">
            <Plus className="w-4 h-4 mr-2" />
            Add Client
          </Button>
          <Button onClick={onAddTransaction} className="w-full sm:w-auto">
            <Plus className="w-4 h-4 mr-2" />
            Add Transaction
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
                  Active Properties
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {properties.filter((p) => p.active).length}
                </p>
              </div>
              <Home className="w-8 h-8 text-gray-400" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Active Agents
                </p>
                <p className="text-2xl font-bold text-green-600">
                  {agents.filter((a) => a.active).length}
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
                  Active Clients
                </p>
                <p className="text-2xl font-bold text-blue-600">
                  {clients.filter((c) => c.active).length}
                </p>
              </div>
              <Users className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Pending Transactions
                </p>
                <p className="text-2xl font-bold text-purple-600">
                  {transactions.filter((t) => t.status === 'pending').length}
                </p>
              </div>
              <DollarSign className="w-8 h-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder="Search properties, agents, clients, or transactions..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button variant="outline">
          <Filter className="w-4 h-4 mr-2" />
          Filters
        </Button>
      </div>

      {/* Tabs for Properties, Agents, Clients, and Transactions */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList className="grid w-full grid-cols-4 h-auto">
          <TabsTrigger
            value="properties"
            className="flex flex-row items-center gap-1 p-2 text-xs sm:text-sm"
          >
            <Home className="w-4 h-4" />
            <span className="truncate">Properties</span>
          </TabsTrigger>
          <TabsTrigger
            value="agents"
            className="flex flex-row items-center gap-1 p-2 text-xs sm:text-sm"
          >
            <User className="w-4 h-4" />
            <span className="truncate">Agents</span>
          </TabsTrigger>
          <TabsTrigger
            value="clients"
            className="flex flex-row items-center gap-1 p-2 text-xs sm:text-sm"
          >
            <Users className="w-4 h-4" />
            <span className="truncate">Clients</span>
          </TabsTrigger>
          <TabsTrigger
            value="transactions"
            className="flex flex-row items-center gap-1 p-2 text-xs sm:text-sm"
          >
            <DollarSign className="w-4 h-4" />
            <span className="truncate">Transactions</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="properties" className="space-y-4 mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredProperties.map((property) => {
              const PropertyIcon = getPropertyIcon(property.type);
              return (
                <Card
                  key={property.id}
                  className={`${!property.active ? 'opacity-60' : ''}`}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3 min-w-0 flex-1">
                        <div className="min-w-0 flex-1">
                          <CardTitle className="text-base flex items-center gap-2">
                            <PropertyIcon className="w-4 h-4" />
                            {property.title}
                          </CardTitle>
                          <CardDescription className="line-clamp-2">
                            {property.description}
                          </CardDescription>
                          <div className="flex justify-between mt-2">
                            <span className="text-lg font-bold text-primary">
                              Rs. {property.price.toLocaleString()}
                            </span>
                            <span className="text-sm text-muted-foreground">
                              {property.area} sq.ft.
                            </span>
                          </div>
                          <div className="flex items-center text-sm mt-1">
                            <MapPin className="w-4 h-4 mr-1" />
                            <span>
                              {property.location.city},{' '}
                              {property.location.state}
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
                          checked={property.active}
                          onCheckedChange={() =>
                            togglePropertyActive(property.id, !property.active)
                          }
                        />
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                          {property.active ? 'Active' : 'Inactive'}
                        </span>
                      </div>

                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="sm">
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteProperty(property.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {filteredProperties.length === 0 && (
            <div className="text-center py-12">
              <Home className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                No properties found
              </h3>
              <p className="text-gray-500 dark:text-gray-400 mb-4">
                Try adjusting your search or add a new property
              </p>
              <Button onClick={onAddProperty}>
                <Plus className="w-4 h-4 mr-2" />
                Add Property
              </Button>
            </div>
          )}
        </TabsContent>

        <TabsContent value="agents" className="space-y-4 mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredAgents.map((agent) => (
              <Card
                key={agent.id}
                className={`${!agent.active ? 'opacity-60' : ''}`}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                      <div className="bg-muted rounded-full w-10 h-10 flex items-center justify-center">
                        <User className="w-5 h-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <CardTitle className="text-base">
                          {agent.name}
                        </CardTitle>
                        <CardDescription>{agent.email}</CardDescription>
                        <div className="flex items-center gap-1 mt-1">
                          {[...Array(5)].map((_, i) => (
                            <Star
                              key={i}
                              className={`w-3 h-3 ${
                                i < Math.floor(agent.rating)
                                  ? 'fill-yellow-400 text-yellow-400'
                                  : 'text-gray-300'
                              }`}
                            />
                          ))}
                          <span className="text-xs ml-1">{agent.rating}</span>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          {agent.experience} experience
                        </p>
                      </div>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="pt-0">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={agent.active}
                        onCheckedChange={() =>
                          toggleAgentActive(agent.id, !agent.active)
                        }
                      />
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {agent.active ? 'Active' : 'Inactive'}
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="sm">
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteAgent(agent.id)}
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

          {filteredAgents.length === 0 && (
            <div className="text-center py-12">
              <User className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                No agents found
              </h3>
              <p className="text-gray-500 dark:text-gray-400 mb-4">
                Try adjusting your search or add a new agent
              </p>
              <Button onClick={onAddAgent}>
                <Plus className="w-4 h-4 mr-2" />
                Add Agent
              </Button>
            </div>
          )}
        </TabsContent>

        <TabsContent value="clients" className="space-y-4 mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredClients.map((client) => (
              <Card
                key={client.id}
                className={`${!client.active ? 'opacity-60' : ''}`}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                      <div className="bg-muted rounded-full w-10 h-10 flex items-center justify-center">
                        <Users className="w-5 h-5" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <CardTitle className="text-base">
                          {client.name}
                        </CardTitle>
                        <CardDescription>{client.email}</CardDescription>
                        <p className="text-sm text-muted-foreground mt-1">
                          {client.phone}
                        </p>
                        <span
                          className={`inline-block px-2 py-1 text-xs rounded-full mt-2 ${getClientStatusColor(
                            client.status,
                          )}`}
                        >
                          {client.status.charAt(0).toUpperCase() +
                            client.status.slice(1).replace('_', ' ')}
                        </span>
                      </div>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="pt-0">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={client.active}
                        onCheckedChange={() =>
                          toggleClientActive(client.id, !client.active)
                        }
                      />
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {client.active ? 'Active' : 'Inactive'}
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="sm">
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteClient(client.id)}
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

          {filteredClients.length === 0 && (
            <div className="text-center py-12">
              <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                No clients found
              </h3>
              <p className="text-gray-500 dark:text-gray-400 mb-4">
                Try adjusting your search or add a new client
              </p>
              <Button onClick={onAddClient}>
                <Plus className="w-4 h-4 mr-2" />
                Add Client
              </Button>
            </div>
          )}
        </TabsContent>

        <TabsContent value="transactions" className="space-y-4 mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredTransactions.map((transaction) => (
              <Card
                key={transaction.id}
                className={`${!transaction.active ? 'opacity-60' : ''}`}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                      <div className="min-w-0 flex-1">
                        <CardTitle className="text-base flex items-center gap-2">
                          <DollarSign className="w-4 h-4" />
                          {transaction.propertyName}
                        </CardTitle>
                        <CardDescription className="line-clamp-1">
                          {transaction.clientName}
                        </CardDescription>
                        <p className="text-sm text-muted-foreground mt-1">
                          Agent: {transaction.agentName}
                        </p>
                        <div className="flex justify-between mt-2">
                          <span className="text-lg font-bold text-green-600">
                            Rs. {transaction.price.toLocaleString()}
                          </span>
                          <span className="text-sm text-muted-foreground">
                            {new Date(transaction.date).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="pt-0">
                  <div className="flex items-center justify-between">
                    <span
                      className={`px-2 py-1 text-xs rounded-full ${
                        transaction.status === 'pending'
                          ? 'bg-yellow-100 text-yellow-800'
                          : transaction.status === 'completed'
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                      }`}
                    >
                      {transaction.status.charAt(0).toUpperCase() +
                        transaction.status.slice(1)}
                    </span>

                    <div className="flex items-center gap-1">
                      {transaction.status === 'pending' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            updateTransactionStatus(transaction.id, 'completed')
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
                          updateTransactionStatus(transaction.id, 'cancelled')
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

          {filteredTransactions.length === 0 && (
            <div className="text-center py-12">
              <DollarSign className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                No transactions found
              </h3>
              <p className="text-gray-500 dark:text-gray-400 mb-4">
                Try adjusting your search or add a new transaction
              </p>
              <Button onClick={onAddTransaction}>
                <Plus className="w-4 h-4 mr-2" />
                Add Transaction
              </Button>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
