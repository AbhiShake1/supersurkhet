import { useSearch } from '@tanstack/react-router';
import _ from 'lodash';
import { lazy, memo, useMemo } from 'react';
import _UIBuilder from '@/components/ui/ui-builder';
import { useProfile } from '@/hooks/use-profile';
import { api } from '@/lib/api';
import type { Business } from '@/lib/schema';
import { ContextDataStore } from '@/lib/ui-builder/context/context-data-store';
import { complexComponentDefinitions } from '@/lib/ui-builder/registry/complex-component-definitions';
import { primitiveComponentDefinitions } from '@/lib/ui-builder/registry/primitive-component-definitions';
import { useAuth } from './auth-provider';
import { useFeaturePermissions } from './permission-gate/use-feature-permissions';
import { NotFound } from './ui/not-found';
import { Spinner } from './ui/spinner';
import type { LayerChangeHandler } from './ui/ui-builder/types';
import { Unauthorized } from './ui/unauthorized';

const LayerRenderer = lazy(
  () => import('@/components/ui/ui-builder/layer-renderer'),
);

const UIBuilder = memo(_UIBuilder, (prevProps, nextProps) => {
  return (
    _.isEqual(prevProps.componentRegistry, nextProps.componentRegistry) &&
    prevProps.isLoading === nextProps.isLoading &&
    prevProps.createNew === nextProps.createNew
  );
  //   && _.isEqual(prevProps.initialLayers, nextProps.initialLayers)
});

const componentRegistry = {
  ...primitiveComponentDefinitions, // div, span, img, etc.
  ...complexComponentDefinitions, // Button, Badge, Card, etc.
};

// recursively omit #
function omitMeta<T>(obj: T): T {
  if (!obj) return obj;
  return _.transform(obj, (result, value, key) => {
    if (key === '#') return; // skip this key
    if (_.isArray(value)) {
      result[key] = value.map(omitMeta);
    } else if (_.isPlainObject(value)) {
      result[key] = omitMeta(value);
    } else {
      result[key] = value;
    }
  });
}

interface UseContextDataProps {
  business?: Business;
}

function useContextData({ business }: UseContextDataProps) {
  const search = useSearch({ from: '__root__' });
  const user = useProfile();
  const { isLoading: isUserLoading } = useAuth();
  // biome-ignore lint/correctness/useExhaustiveDependencies: lint debt cleanup
  const context = useMemo(() => {
    return {
      business,
      user: _.pick(user, ['name', 'email', 'avatar', 'isActive', 'role']),
      search,
      date: {
        currentTime: new Date().toISOString(),
        locale: 'en-US',
        timezone: 'Asia/Kathmandu',
      },
    };
  }, [business, user]);

  const isLoading = isUserLoading;

  return {
    contextData: context,
    isLoading,
  };
}

export function CustomUiBuilderPage({ slug }: { slug: string }) {
  const permissions = useFeaturePermissions('business');
  const canRead = permissions.canRead;
  const canEdit =
    permissions.canCreate || permissions.canUpdate || permissions.canDelete;

  const { mutate: upsert } = api.business.useUpdate();
  const { data: _data, isLoading } = api.business.useGet({
    keys: [slug],
    single: true,
  });
  const data = omitMeta(_data?.[0]);

  const currentLayers = data?.uiBuilder?.layers;

  const handleLayersChange: LayerChangeHandler = (newLayers) => {
    if (isLoading) return;
    upsert({ id: slug, uiBuilder: { layers: JSON.stringify(newLayers) } });
  };

  // biome-ignore lint/correctness/useExhaustiveDependencies: lint debt cleanup
  const createNew = useMemo(() => {
    return !isLoading && !currentLayers?.length;
  }, [isLoading, data]);

  // Create dynamic context data based on actual business data if available
  const { contextData } = useContextData({ business: data });

  if (!canRead) {
    return (
      <Unauthorized description="You do not have permission to access UI builder." />
    );
  }

  if (!canEdit) {
    return <CustomUiRendererPage slug={slug} />;
  }

  return (
    <ContextDataStore contextData={contextData}>
      <UIBuilder
        componentRegistry={componentRegistry}
        isLoading={isLoading}
        persistLayerStore={false}
        onChange={handleLayersChange}
        initialLayers={currentLayers ? JSON.parse(currentLayers) : undefined}
        createNew={createNew}
      />
    </ContextDataStore>
  );
}

export function CustomUiRendererPage({ slug }: { slug: string }) {
  'use memo';
  const search = useSearch({ from: '__root__' });
  const page = search?.p;
  const { data: _business, isLoading } = api.business.useGet({
    keys: [slug],
    single: true,
  });

  const business = _business?.[0];

  function getPage() {
    const layers = business?.uiBuilder?.layers
      ? JSON.parse(business?.uiBuilder?.layers)
      : undefined;
    const fallback = layers?.[0];
    if (!page) return fallback;
    const isNumber = Number.isInteger(Number(page));
    if (isNumber) return layers?.[page] ?? fallback;
    const pageByName = layers?.find(
      (layer) => layer.name.toLowerCase() === page.toLowerCase(),
    );
    return pageByName ?? fallback;
  }

  // Create context data for rendering - using business data if available
  const { contextData, isLoading: _isLoading } = useContextData({ business });

  if (isLoading || _isLoading) return <Spinner />;

  if (!business?.uiBuilder?.layers) return <NotFound />;

  return (
    <ContextDataStore contextData={contextData}>
      <LayerRenderer componentRegistry={componentRegistry} page={getPage()} />
    </ContextDataStore>
  );
}
