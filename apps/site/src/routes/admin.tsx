import type { SchemaKeys } from '@gta/react-hooks';
import { createFileRoute } from '@tanstack/react-router';
import { useEffect } from 'react';
import { useAuth } from '@/components/auth-provider';
import { AutoAdmin, type AutoAdminTabInput } from '@/components/auto-admin';
import { useLoginPrompt } from '@/components/login-prompt-provider';
import { Unauthorized } from '@/components/ui/unauthorized';
import { api } from '@/lib/api';
import { appSchema } from '@/lib/schema';
import type { GTAAppConfig } from '@/lib/schemas/core/types';

export const Route = createFileRoute('/admin')({
  component: RouteComponent,
});

type RawShapeConfig = GTAAppConfig['schema'][SchemaKeys];

function toRawShapeEntries(
  rawShape: typeof appSchema.rawShape,
): Array<[SchemaKeys, RawShapeConfig]> {
  return Object.entries(rawShape) as Array<[SchemaKeys, RawShapeConfig]>;
}

function createAdminTab(schema: SchemaKeys) {
  return {
    schema,
    slug: '',
  } as unknown as AutoAdminTabInput;
}

function RouteComponent() {
  const { promptLogin, closeLoginPrompt } = useLoginPrompt();
  const { isAuthenticated, user } = useAuth();
  const { isLoading } = api.business.useGet();

  useEffect(() => {
    if (!isAuthenticated && !isLoading)
      promptLogin({ dismissible: false, showBackgroundContent: false });
    else closeLoginPrompt();
  }, [isAuthenticated, isLoading, promptLogin, closeLoginPrompt]);

  if (!isLoading && isAuthenticated && user && user?.role !== 'admin') {
    return <Unauthorized />;
  }

  if (!user) return null;

  const entries = toRawShapeEntries(appSchema.rawShape);

  const tabs = entries
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([schemaKey]) => createAdminTab(schemaKey));

  return <AutoAdmin tabs={tabs} />;
}
