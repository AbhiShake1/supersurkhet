import { Link } from '@tanstack/react-router';
import { Search, Shield, XCircle } from 'lucide-react';
import { useState } from 'react';
import { resolveInstallDrivenSubdomains } from '@/config/business-config-resolver';
import { api } from '@/lib/api';
import { mergeMarketplaceReleasesWithSeed } from '@/lib/plugins/marketplace-seed';
import type {
  BusinessPluginInstallDoc,
  PluginReleaseDoc,
} from '@/lib/plugins/types';
import type { Business } from '@/lib/schema';
import { BusinessAccessGate } from './permission-gate/business-access-gate';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from './ui/card';
import { Input } from './ui/input';
import { ScrollArea } from './ui/scroll-area';
import { Skeleton } from './ui/skeleton';

export interface BusinessListProps
  extends React.ComponentPropsWithoutRef<typeof ScrollArea> {}

export function BusinessList(props: BusinessListProps) {
  const { data: allBusinesses = [], isLoading } = api.business.useGet();
  const { data: installRows = [] } = api.businessPluginInstall.useGet();
  const { data: releaseRows = [] } = api.pluginRelease.useGet();
  const [searchTerm, setSearchTerm] = useState('');
  const installs = installRows as BusinessPluginInstallDoc[];
  const releases = mergeMarketplaceReleasesWithSeed(
    releaseRows as PluginReleaseDoc[],
  );

  const filteredBusinesses = allBusinesses.filter((business: Business) => {
    const lowerCaseSearchTerm = searchTerm?.toLowerCase();
    if (!lowerCaseSearchTerm?.length) return true;
    return business.name?.toLowerCase().includes(lowerCaseSearchTerm);
  });

  return (
    <div className="space-y-6">
      <Input
        placeholder="Search businesses by name..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className="pl-9"
        leadingIcon={<Search className="h-4 w-4" />}
      />

      <ScrollArea {...props}>
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {Array.from({ length: 10 }).map((_, i) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: lint debt cleanup
              <Skeleton key={i} className="w-full h-32" />
            ))}
          </div>
        ) : filteredBusinesses.length === 0 ? (
          <div className="text-center py-10 text-muted-foreground">
            <p>No businesses found matching your search.</p>
            {searchTerm && (
              <div className="mt-4">
                <Button variant="ghost" onClick={() => setSearchTerm('')}>
                  <XCircle className="h-4 w-4 mr-2" />
                  Clear Search
                </Button>
              </div>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {filteredBusinesses.map(
              (business: Business) =>
                business?.basePath && (
                  <Card
                    key={business._?.soul}
                    className="relative flex flex-col"
                  >
                    <CardHeader className="pb-2">
                      <CardTitle>{business.name}</CardTitle>
                      <CardDescription className="text-sm text-muted-foreground">
                        {business.basePath}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="flex-grow flex flex-col gap-2 justify-end pt-0">
                      <Button asChild className="w-full">
                        <Link
                          to="/$businessName"
                          params={{ businessName: business.basePath ?? '' }}
                        >
                          Visit
                        </Link>
                      </Button>
                      <BusinessAccessGate business={business}>
                        <Button asChild className="w-full">
                          <a
                            className="flex gap-2"
                            href={`/${encodeURIComponent(business.basePath ?? '')}/admin`}
                          >
                            <Shield className="h-4 w-4" />
                            Go to Admin
                          </a>
                        </Button>
                      </BusinessAccessGate>
                      <div className="pt-2">
                        <p className="mb-2 text-xs uppercase tracking-[0.08em] text-muted-foreground">
                          Subdomains
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {resolveInstallDrivenSubdomains({
                            businessId:
                              business.basePath ??
                              business.id ??
                              business._?.soul ??
                              '',
                            installs,
                            releases,
                          }).map((subdomain) =>
                            subdomain === 'index' ? (
                              <Button
                                key={`${business._?.soul ?? business.basePath}-index`}
                                variant="outline"
                                size="sm"
                                asChild
                              >
                                <Link
                                  to="/$businessName"
                                  params={{
                                    businessName: business.basePath ?? '',
                                  }}
                                >
                                  Root
                                </Link>
                              </Button>
                            ) : subdomain === 'admin' ? (
                              <BusinessAccessGate
                                key={`${business._?.soul ?? business.basePath}-admin`}
                                business={business}
                              >
                                <Button variant="outline" size="sm" asChild>
                                  <a
                                    href={`/${encodeURIComponent(
                                      business.basePath ?? '',
                                    )}/admin`}
                                  >
                                    Admin
                                  </a>
                                </Button>
                              </BusinessAccessGate>
                            ) : (
                              <Button
                                key={`${business._?.soul ?? business.basePath}-${subdomain}`}
                                variant="outline"
                                size="sm"
                                asChild
                              >
                                <Link
                                  to="/$businessName/$subdomain"
                                  params={{
                                    businessName: business.basePath ?? '',
                                    subdomain,
                                  }}
                                >
                                  {subdomain}
                                </Link>
                              </Button>
                            ),
                          )}
                        </div>
                        <Badge variant="secondary" className="mt-2 text-[10px]">
                          Desktop domains enabled
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                ),
            )}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
