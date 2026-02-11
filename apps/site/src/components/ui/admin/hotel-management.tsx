'use client';

import type { AdminComponent } from '@/components/ui/admin';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Bed,
  Calendar,
  DollarSign,
  Edit,
  Eye,
  FileText,
  Image,
  MapPin,
  Percent,
  Plus,
  Search,
  Star,
  Trash2,
  TrendingUp,
  Users,
} from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

interface RoomType {
  id: string;
  name: string;
  description: string;
  price: number;
  available: boolean;
  imageUrl: string;
  amenities: string[];
  maxOccupancy: number;
}

const mockRoomTypes: RoomType[] = [
  {
    id: '1',
    name: 'Deluxe Room',
    description: 'Spacious room with mountain view and premium amenities',
    price: 4500,
    available: true,
    imageUrl:
      'https://images.unsplash.com/photo-1611892440504-42a792e24d32?w=400',
    amenities: ['WiFi', 'AC', 'TV', 'Mini Bar'],
    maxOccupancy: 2,
  },
  {
    id: '2',
    name: 'Executive Suite',
    description:
      'Luxurious suite with separate living area and panoramic views',
    price: 7500,
    available: true,
    imageUrl:
      'https://images.unsplash.com/photo-1566665797739-1674de7a421a?w=400',
    amenities: ['WiFi', 'AC', 'TV', 'Mini Bar', 'Jacuzzi'],
    maxOccupancy: 4,
  },
  {
    id: '3',
    name: 'Family Room',
    description: 'Perfect for families with extra space and connecting rooms',
    price: 6000,
    available: false,
    imageUrl:
      'https://images.unsplash.com/photo-1582719508461-905c673771fd?w=400',
    amenities: ['WiFi', 'AC', 'TV', 'Mini Bar', 'Kitchenette'],
    maxOccupancy: 6,
  },
  {
    id: '4',
    name: 'Garden View Room',
    description: 'Beautiful room with garden views and modern amenities',
    price: 5200,
    available: true,
    imageUrl:
      'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=400',
    amenities: ['WiFi', 'AC', 'TV', 'Balcony', 'Garden View'],
    maxOccupancy: 3,
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
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  const filteredRoomTypes = roomTypes.filter((roomType) => {
    const matchesSearch =
      roomType.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      roomType.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  const toggleAvailability = (roomId: string, available: boolean) => {
    // In a real implementation, this would update the data in GunDB
    toast.success(`Room type ${available ? 'enabled' : 'disabled'}`);
  };

  const deleteRoomType = (roomId: string) => {
    // In a real implementation, this would delete the room type from GunDB
    toast.success('Room type removed');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center">
            <Bed className="mr-2 h-6 w-6" />
            Hotel Management
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Manage your hotel's room types, availability, and pricing
          </p>
        </div>
        <Button onClick={onAddRoomType} className="w-full sm:w-auto">
          <Plus className="w-4 h-4 mr-2" />
          Add Room Type
        </Button>
      </div>

      {/* Enhanced Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="border-primary/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400 flex items-center">
                  <Bed className="w-4 h-4 mr-1" />
                  Total Rooms
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {roomTypes.length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-green-500/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400 flex items-center">
                  <Eye className="w-4 h-4 mr-1" />
                  Available
                </p>
                <p className="text-2xl font-bold text-green-600">
                  {roomTypes.filter((r) => r.available).length}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {roomTypes.length > 0
                    ? `${Math.round((roomTypes.filter((r) => r.available).length / roomTypes.length) * 100)}% occupancy`
                    : '0% occupancy'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-blue-500/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400 flex items-center">
                  <DollarSign className="w-4 h-4 mr-1" />
                  Avg. Price
                </p>
                <p className="text-2xl font-bold text-blue-600">
                  Rs.{' '}
                  {roomTypes.length > 0
                    ? (
                        roomTypes.reduce((sum, room) => sum + room.price, 0) /
                        roomTypes.length
                      ).toFixed(2)
                    : '0.00'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-purple-500/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400 flex items-center">
                  <Users className="w-4 h-4 mr-1" />
                  Total Capacity
                </p>
                <p className="text-2xl font-bold text-purple-600">
                  {roomTypes.reduce((sum, room) => sum + room.maxOccupancy, 0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-yellow-500/20">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400 flex items-center">
                  <Star className="w-4 h-4 mr-1" />
                  Rating
                </p>
                <p className="text-2xl font-bold text-yellow-600">4.8</p>
              </div>
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
        <Button variant="outline" className="flex items-center">
          <FileText className="w-4 h-4 mr-2" />
          Export Report
        </Button>
      </div>

      {/* Room Types */}
      <Tabs value={selectedCategory} onValueChange={setSelectedCategory}>
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 h-auto">
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
          <TabsTrigger
            value="featured"
            className="flex flex-row items-center gap-1 p-2 text-xs sm:text-sm"
          >
            <span className="truncate">Featured</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4 mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredRoomTypes.map((roomType) => (
              <Card
                key={roomType.id}
                className={`overflow-hidden transition-all hover:shadow-lg ${!roomType.available ? 'opacity-60' : ''}`}
              >
                <div className="relative">
                  <img
                    src={roomType.imageUrl || '/placeholder.svg'}
                    alt={roomType.name}
                    className="w-full h-40 object-cover"
                  />
                  <div className="absolute top-2 right-2 bg-primary text-primary-foreground px-2 py-1 rounded-full text-xs font-bold">
                    Rs. {roomType.price}/night
                  </div>
                  {!roomType.available && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                      <span className="text-white font-bold text-lg">
                        Unavailable
                      </span>
                    </div>
                  )}
                </div>
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <CardTitle className="text-lg">{roomType.name}</CardTitle>
                    <div className="flex items-center text-sm text-muted-foreground">
                      <Users className="w-4 h-4 mr-1" />
                      {roomType.maxOccupancy}
                    </div>
                  </div>
                  <CardDescription className="text-sm line-clamp-2">
                    {roomType.description}
                  </CardDescription>
                </CardHeader>

                <CardContent className="pb-3">
                  <div className="flex flex-wrap gap-1 mb-3">
                    {roomType.amenities.slice(0, 3).map((amenity) => (
                      <span
                        key={amenity}
                        className="px-2 py-1 bg-secondary text-secondary-foreground text-xs rounded-full"
                      >
                        {amenity}
                      </span>
                    ))}
                    {roomType.amenities.length > 3 && (
                      <span className="px-2 py-1 bg-secondary text-secondary-foreground text-xs rounded-full">
                        +{roomType.amenities.length - 3} more
                      </span>
                    )}
                  </div>
                </CardContent>

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
                        {roomType.available ? 'Available' : 'Unavailable'}
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

      {/* Additional Management Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pricing Management */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <DollarSign className="mr-2 h-5 w-5" />
              Pricing Management
            </CardTitle>
            <CardDescription>
              Adjust pricing based on demand and seasons
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span>Dynamic Pricing</span>
                <Switch />
              </div>
              <div className="flex justify-between items-center">
                <span>Weekend Premium</span>
                <span className="font-bold">+15%</span>
              </div>
              <div className="flex justify-between items-center">
                <span>Holiday Markup</span>
                <span className="font-bold">+25%</span>
              </div>
              <Button className="w-full" variant="outline">
                Configure Pricing Rules
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Amenities Management */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Image className="mr-2 h-5 w-5" />
              Hotel Amenities
            </CardTitle>
            <CardDescription>
              Manage hotel-wide amenities and services
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span>Swimming Pool</span>
                <Switch defaultChecked />
              </div>
              <div className="flex items-center justify-between">
                <span>Fitness Center</span>
                <Switch defaultChecked />
              </div>
              <div className="flex items-center justify-between">
                <span>Restaurant</span>
                <Switch defaultChecked />
              </div>
              <div className="flex items-center justify-between">
                <span>Spa Services</span>
                <Switch />
              </div>
              <Button className="w-full" variant="outline">
                Manage Amenities
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
