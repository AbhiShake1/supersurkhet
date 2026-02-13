import { createFileRoute } from '@tanstack/react-router';
import { LucideBriefcaseBusiness } from 'lucide-react';
import { useEffect } from 'react';
import { useAuth } from '@/components/auth-provider';
import { AutoAdmin, type PossibleTabConfig } from '@/components/auto-admin';
import { useLoginPrompt } from '@/components/login-prompt-provider';
import { Unauthorized } from '@/components/ui/unauthorized';
import { api } from '@/lib/api';
import { appSchema } from '@/lib/schema';
import type { SchemaKeys } from '@gta/react-hooks';
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

function isLucideIcon(value: unknown): value is typeof LucideBriefcaseBusiness {
  return typeof value === 'function';
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
    .map(([schemaKey, schemaConfig]) => {
      const transformer = (rows: any[]): any[] => {
        if (rows.length === 0) return rows;
        const first = rows[0];
        if ('timestamp' in first) return rows;

        const flattened = rows
          .flatMap((row) => {
            const business = row._?.soul;
            return Object.values(row).map((value) =>
              !value || typeof value !== 'object'
                ? null
                : { ...value, business },
            );
          })
          .filter(
            (value) =>
              !!value && typeof value === 'object' && !('soul' in value),
          );

        return flattened.length ? flattened : rows;
      };

      return {
        schema: schemaKey,
        title: schemaKey[0].toUpperCase() + schemaKey.slice(1),
        icon: isLucideIcon(schemaConfig.icon)
          ? schemaConfig.icon
          : LucideBriefcaseBusiness,
        group: schemaConfig.group,
        slug: '',
        transformer,
      } satisfies PossibleTabConfig;
    });

  return <AutoAdmin tabs={tabs} />;
}
