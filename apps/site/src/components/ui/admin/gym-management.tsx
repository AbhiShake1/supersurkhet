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
  Dumbbell,
  Calendar,
  User,
  CreditCard,
  Clock,
} from 'lucide-react';
import { toast } from 'sonner';
import type { AdminComponent } from '@/components/ui/admin';

interface Equipment {
  id: string;
  name: string;
  quantity: number;
  available: boolean;
}

interface MembershipPlan {
  id: string;
  name: string;
  price: number;
  duration: string;
  active: boolean;
}

interface ClassSchedule {
  id: string;
  name: string;
  trainer: string;
  time: string;
  duration: string;
  level: string;
  maxSpots: number;
  active: boolean;
}

const mockEquipment: Equipment[] = [
  {
    id: '1',
    name: 'Treadmills',
    quantity: 10,
    available: true,
  },
  {
    id: '2',
    name: 'Ellipticals',
    quantity: 5,
    available: true,
  },
  {
    id: '3',
    name: 'Weight Machines',
    quantity: 20,
    available: true,
  },
  {
    id: '4',
    name: 'Free Weights',
    quantity: 15,
    available: true,
  },
];

const mockMembershipPlans: MembershipPlan[] = [
  {
    id: '1',
    name: 'Basic',
    price: 1500,
    duration: '1 Month',
    active: true,
  },
  {
    id: '2',
    name: 'Premium',
    price: 3500,
    duration: '1 Month',
    active: true,
  },
  {
    id: '3',
    name: 'Elite',
    price: 6000,
    duration: '1 Month',
    active: false,
  },
];

const mockClassSchedules: ClassSchedule[] = [
  {
    id: '1',
    name: 'Morning Yoga',
    trainer: 'Sunita Thapa',
    time: '6:00 AM',
    duration: '60 mins',
    level: 'Beginner',
    maxSpots: 15,
    active: true,
  },
  {
    id: '2',
    name: 'HIIT Workout',
    trainer: 'Rajesh KC',
    time: '7:00 AM',
    duration: '45 mins',
    level: 'Intermediate',
    maxSpots: 10,
    active: true,
  },
  {
    id: '3',
    name: 'Strength Training',
    trainer: 'Amit Shah',
    time: '5:00 PM',
    duration: '90 mins',
    level: 'Advanced',
    maxSpots: 8,
    active: true,
  },
  {
    id: '4',
    name: 'Evening Zumba',
    trainer: 'Priya Gurung',
    time: '6:30 PM',
    duration: '60 mins',
    level: 'All Levels',
    maxSpots: 15,
    active: false,
  },
];

export const GymManagement: AdminComponent = () => {
  return (
    <_GymManagement
      equipment={mockEquipment}
      membershipPlans={mockMembershipPlans}
      classSchedules={mockClassSchedules}
      onAddEquipment={() => {}}
      onAddMembershipPlan={() => {}}
      onAddClassSchedule={() => {}}
    />
  );
};

interface GymManagementProps {
  onAddEquipment: () => void;
  onAddMembershipPlan: () => void;
  onAddClassSchedule: () => void;
  equipment: Equipment[];
  membershipPlans: MembershipPlan[];
  classSchedules: ClassSchedule[];
}

function _GymManagement({
  onAddEquipment,
  onAddMembershipPlan,
  onAddClassSchedule,
  equipment,
  membershipPlans,
  classSchedules,
}: GymManagementProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTab, setSelectedTab] = useState('equipment');

  const filteredEquipment = equipment.filter((item) => {
    return (
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.id.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  const filteredMembershipPlans = membershipPlans.filter((plan) => {
    return (
      plan.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      plan.id.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  const filteredClassSchedules = classSchedules.filter((schedule) => {
    return (
      schedule.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      schedule.trainer.toLowerCase().includes(searchQuery.toLowerCase()) ||
      schedule.id.toLowerCase().includes(searchQuery.toLowerCase())
    );
  });

  const toggleEquipmentAvailability = (_id: string, available: boolean) => {
    // In a real implementation, this would update the data in GunDB
    toast.success(`Equipment ${available ? 'enabled' : 'disabled'}`);
  };

  const toggleMembershipPlanActive = (_id: string, active: boolean) => {
    // In a real implementation, this would update the data in GunDB
    toast.success(`Membership plan ${active ? 'activated' : 'deactivated'}`);
  };

  const toggleClassScheduleActive = (_id: string, active: boolean) => {
    // In a real implementation, this would update the data in GunDB
    toast.success(`Class schedule ${active ? 'activated' : 'deactivated'}`);
  };

  const deleteEquipment = (g) => {
    // In a real implementation, this would delete the equipment from GunDB
    toast.success('Equipment removed');
  };

  const deleteMembershipPlan = (g) => {
    // In a real implementation, this would delete the membership plan from GunDB
    toast.success('Membership plan removed');
  };

  const deleteClassSchedule = (g) => {
    // In a real implementation, this would delete the class schedule from GunDB
    toast.success('Class schedule removed');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Gym Management
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Manage your gym equipment, membership plans, and class schedules
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={onAddEquipment} className="w-full sm:w-auto">
            <Plus className="w-4 h-4 mr-2" />
            Add Equipment
          </Button>
          <Button onClick={onAddMembershipPlan} className="w-full sm:w-auto">
            <Plus className="w-4 h-4 mr-2" />
            Add Membership
          </Button>
          <Button onClick={onAddClassSchedule} className="w-full sm:w-auto">
            <Plus className="w-4 h-4 mr-2" />
            Add Class
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
                  Equipment Types
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {equipment.length}
                </p>
              </div>
              <Dumbbell className="w-8 h-8 text-gray-400" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Active Memberships
                </p>
                <p className="text-2xl font-bold text-green-600">
                  {membershipPlans.filter((p) => p.active).length}
                </p>
              </div>
              <CreditCard className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Active Classes
                </p>
                <p className="text-2xl font-bold text-blue-600">
                  {classSchedules.filter((c) => c.active).length}
                </p>
              </div>
              <Calendar className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Total Equipment
                </p>
                <p className="text-2xl font-bold text-purple-600">
                  {equipment.reduce((sum, item) => sum + item.quantity, 0)}
                </p>
              </div>
              <User className="w-8 h-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder="Search equipment, memberships, or classes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Tabs for Equipment, Memberships, and Classes */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList className="grid w-full grid-cols-3 h-auto">
          <TabsTrigger
            value="equipment"
            className="flex flex-row items-center gap-1 p-2 text-xs sm:text-sm"
          >
            <Dumbbell className="w-4 h-4" />
            <span className="truncate">Equipment</span>
          </TabsTrigger>
          <TabsTrigger
            value="memberships"
            className="flex flex-row items-center gap-1 p-2 text-xs sm:text-sm"
          >
            <CreditCard className="w-4 h-4" />
            <span className="truncate">Memberships</span>
          </TabsTrigger>
          <TabsTrigger
            value="classes"
            className="flex flex-row items-center gap-1 p-2 text-xs sm:text-sm"
          >
            <Calendar className="w-4 h-4" />
            <span className="truncate">Classes</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="equipment" className="space-y-4 mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredEquipment.map((item) => (
              <Card
                key={item.id}
                className={`${!item.available ? 'opacity-60' : ''}`}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                      <div className="min-w-0 flex-1">
                        <CardTitle className="text-base flex items-center gap-2">
                          <Dumbbell className="w-4 h-4" />
                          {item.name}
                        </CardTitle>
                        <p className="text-lg font-bold text-green-600 mt-1">
                          {item.quantity} units
                        </p>
                      </div>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="pt-0">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={item.available}
                        onCheckedChange={() =>
                          toggleEquipmentAvailability(item.id, !item.available)
                        }
                      />
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {item.available ? 'Available' : 'Unavailable'}
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="sm">
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteEquipment(item.id)}
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

          {filteredEquipment.length === 0 && (
            <div className="text-center py-12">
              <Dumbbell className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                No equipment found
              </h3>
              <p className="text-gray-500 dark:text-gray-400 mb-4">
                Try adjusting your search or add new equipment
              </p>
              <Button onClick={onAddEquipment}>
                <Plus className="w-4 h-4 mr-2" />
                Add Equipment
              </Button>
            </div>
          )}
        </TabsContent>

        <TabsContent value="memberships" className="space-y-4 mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredMembershipPlans.map((plan) => (
              <Card
                key={plan.id}
                className={`${!plan.active ? 'opacity-60' : ''}`}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                      <div className="min-w-0 flex-1">
                        <CardTitle className="text-base">{plan.name}</CardTitle>
                        <CardDescription>{plan.duration}</CardDescription>
                        <p className="text-lg font-bold text-green-600 mt-1">
                          Rs. {plan.price}
                        </p>
                      </div>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="pt-0">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={plan.active}
                        onCheckedChange={() =>
                          toggleMembershipPlanActive(plan.id, !plan.active)
                        }
                      />
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {plan.active ? 'Active' : 'Inactive'}
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="sm">
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteMembershipPlan(plan.id)}
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

          {filteredMembershipPlans.length === 0 && (
            <div className="text-center py-12">
              <CreditCard className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                No membership plans found
              </h3>
              <p className="text-gray-500 dark:text-gray-400 mb-4">
                Try adjusting your search or add a new membership plan
              </p>
              <Button onClick={onAddMembershipPlan}>
                <Plus className="w-4 h-4 mr-2" />
                Add Membership Plan
              </Button>
            </div>
          )}
        </TabsContent>

        <TabsContent value="classes" className="space-y-4 mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {filteredClassSchedules.map((schedule) => (
              <Card
                key={schedule.id}
                className={`${!schedule.active ? 'opacity-60' : ''}`}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                      <div className="min-w-0 flex-1">
                        <CardTitle className="text-base">
                          {schedule.name}
                        </CardTitle>
                        <CardDescription>
                          with {schedule.trainer}
                        </CardDescription>
                        <div className="flex items-center gap-2 mt-1">
                          <Clock className="w-4 h-4 text-muted-foreground" />
                          <span className="text-sm">
                            {schedule.time} ({schedule.duration})
                          </span>
                        </div>
                        <span
                          className={`inline-block px-2 py-1 text-xs rounded-full mt-1 ${
                            schedule.level === 'Beginner'
                              ? 'bg-green-100 text-green-800'
                              : schedule.level === 'Intermediate'
                                ? 'bg-yellow-100 text-yellow-800'
                                : schedule.level === 'Advanced'
                                  ? 'bg-red-100 text-red-800'
                                  : 'bg-blue-100 text-blue-800'
                          }`}
                        >
                          {schedule.level}
                        </span>
                      </div>
                    </div>
                  </div>
                </CardHeader>

                <CardContent className="pt-0">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={schedule.active}
                        onCheckedChange={() =>
                          toggleClassScheduleActive(
                            schedule.id,
                            !schedule.active,
                          )
                        }
                      />
                      <span className="text-sm text-gray-600 dark:text-gray-400">
                        {schedule.active ? 'Active' : 'Inactive'}
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="sm">
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deleteClassSchedule(schedule.id)}
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

          {filteredClassSchedules.length === 0 && (
            <div className="text-center py-12">
              <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                No class schedules found
              </h3>
              <p className="text-gray-500 dark:text-gray-400 mb-4">
                Try adjusting your search or add a new class schedule
              </p>
              <Button onClick={onAddClassSchedule}>
                <Plus className="w-4 h-4 mr-2" />
                Add Class Schedule
              </Button>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
