'use client';

import { format } from 'date-fns';
import {
  AlertCircle,
  Building,
  CreditCard,
  Loader2,
  Phone,
  Search,
  User,
  UserPlus,
  Users,
} from 'lucide-react';
import { useState } from 'react';
import { AutoTable } from '@/components/auto-table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { api } from '@/lib/api';
import type { Party } from '@/lib/schema';
import type { AdminComponent } from '.';

interface PartyManagementProps {
  slug: string;
}

export const PartyManagement: AdminComponent = ({ slug }) => {
  return <_PartyManagement slug={slug} />;
};
export default PartyManagement;

function _PartyManagement({ slug }: PartyManagementProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const {
    data: parties = [],
    isLoading,
    error,
  } = api.party.useGet({
    keys: [slug],
  });

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center">
        <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-1">
          Error loading parties
        </h3>
        <p className="text-gray-500">{error.message}</p>
      </div>
    );
  }

  const filteredParties = parties.filter((party) => {
    const matchesSearch =
      party.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      party.phone?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      party.panNumber?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  const getPartyTypeBadgeVariant = (type: string) => {
    switch (type) {
      case 'supplier':
        return 'secondary';
      case 'customer':
        return 'default';
      case 'both':
        return 'destructive';
      default:
        return 'outline';
    }
  };

  const PartyCard = ({
    party,
  }: {
    party: Party & { _?: { soul: string } };
  }) => {
    return (
      <div className="rounded-md border bg-card p-4 shadow-xs flex flex-col gap-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-3">
            <div className="bg-gray-100 dark:bg-gray-800 p-2 rounded-lg">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-sm">{party.name}</h3>
              <Badge
                variant={getPartyTypeBadgeVariant(party.type)}
                className="mt-1 text-xs"
              >
                {party.type}
              </Badge>
            </div>
          </div>
        </div>

        <div className="space-y-2 text-sm">
          {party.phone && (
            <div className="flex items-center gap-2">
              <Phone className="w-4 h-4 text-gray-500" />
              <span>{party.phone}</span>
            </div>
          )}
          {party.panNumber && (
            <div className="flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-gray-500" />
              <span>PAN: {party.panNumber}</span>
            </div>
          )}
          {party.createdAt && (
            <div className="text-xs text-gray-500">
              Created: {format(new Date(party.createdAt), 'MMM dd, yyyy')}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Party Management
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Manage suppliers, customers, and other business parties
          </p>
        </div>
        <Button
          className="w-full sm:w-auto"
          onClick={() => {
            // Add party functionality would go here
          }}
        >
          <UserPlus className="w-4 h-4 mr-2" />
          Add Party
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Total Parties
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {parties.length}
                </p>
              </div>
              <Users className="w-8 h-8 text-gray-400" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Suppliers
                </p>
                <p className="text-2xl font-bold text-blue-600">
                  {parties.filter((p) => p.type === 'supplier').length}
                </p>
              </div>
              <Building className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Customers
                </p>
                <p className="text-2xl font-bold text-green-600">
                  {parties.filter((p) => p.type === 'customer').length}
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
                <p className="text-sm text-gray-600 dark:text-gray-400">Both</p>
                <p className="text-2xl font-bold text-purple-600">
                  {parties.filter((p) => p.type === 'both').length}
                </p>
              </div>
              <UserPlus className="w-8 h-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
        <Input
          placeholder="Search parties by name, phone, or PAN..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Views */}
      <Tabs defaultValue="table" className="space-y-4">
        <TabsList>
          <TabsTrigger value="table">Table View</TabsTrigger>
          <TabsTrigger value="cards">Cards View</TabsTrigger>
          <TabsTrigger value="summary">Summary</TabsTrigger>
        </TabsList>

        <TabsContent value="table" className="space-y-4">
          <AutoTable schema="party" slug={slug} />
        </TabsContent>

        <TabsContent value="cards" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredParties.map((party) => (
              <PartyCard key={party._?.soul} party={party} />
            ))}
          </div>
          {filteredParties.length === 0 && !isLoading && (
            <div className="text-center py-12">
              <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                No parties found
              </h3>
              <p className="text-gray-500 dark:text-gray-400 mb-4">
                Try adjusting your search or add a new party
              </p>
              <Button>
                <UserPlus className="w-4 h-4 mr-2" />
                Add First Party
              </Button>
            </div>
          )}
        </TabsContent>

        <TabsContent value="summary" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Party Summary</CardTitle>
              <CardDescription>
                Overview of parties and their types
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-semibold mb-3">Party Types</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span>Suppliers</span>
                      <span className="font-medium">
                        {parties.filter((p) => p.type === 'supplier').length}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Customers</span>
                      <span className="font-medium">
                        {parties.filter((p) => p.type === 'customer').length}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Both</span>
                      <span className="font-medium">
                        {parties.filter((p) => p.type === 'both').length}
                      </span>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold mb-3">Recent Activity</h3>
                  <div className="space-y-2">
                    {[...parties]
                      .sort(
                        (a, b) =>
                          new Date(b.createdAt || '').getTime() -
                          new Date(a.createdAt || '').getTime(),
                      )
                      .slice(0, 5)
                      .map((party) => (
                        <div
                          key={party._?.soul}
                          className="flex justify-between text-sm"
                        >
                          <span className="truncate max-w-[120px]">
                            {party.name}
                          </span>
                          <span className="capitalize">{party.type}</span>
                        </div>
                      ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
