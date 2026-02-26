import { useSearch } from '@tanstack/react-router';
import _ from 'lodash';
import { BotMessageSquare } from 'lucide-react';
import { lazy, memo, useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import _UIBuilder from '@/components/ui/ui-builder';
import { TemplateMarketplaceSheet } from '@/components/ui/ui-builder/internal/components/template-marketplace-sheet';
import { useProfile } from '@/hooks/use-profile';
import { evaluateAiSurfaceGate } from '@/lib/ai-policy/ai-surface-gates';
import { api } from '@/lib/api';
import type { Business } from '@/lib/schema';
import { ContextDataStore } from '@/lib/ui-builder/context/context-data-store';
import { complexComponentDefinitions } from '@/lib/ui-builder/registry/complex-component-definitions';
import { primitiveComponentDefinitions } from '@/lib/ui-builder/registry/primitive-component-definitions';
import { useLayerStore } from '@/lib/ui-builder/store/layer-store';
import { useAuth } from './auth-provider';
import { NotFound } from './ui/not-found';
import { Spinner } from './ui/spinner';
import type { ComponentLayer, LayerChangeHandler } from './ui/ui-builder/types';

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

function isRecordValue(value: unknown): value is Record<string, unknown> {
  return _.isPlainObject(value);
}

// recursively omit #
function omitMeta(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map((entry) => omitMeta(entry));
  }
  if (!isRecordValue(value)) {
    return value;
  }
  const result: Record<string, unknown> = {};
  for (const [key, entry] of Object.entries(value)) {
    if (key === '#') {
      continue;
    }
    result[key] = omitMeta(entry);
  }
  return result;
}

interface UseContextDataProps {
  business?: Business;
}

function useHasByoAiCredential() {
  const [state, setState] = useState({
    hasCredential: false,
    isLoading: true,
  });

  useEffect(() => {
    let cancelled = false;
    const controller = new AbortController();

    async function loadCredentialState() {
      try {
        const response = await fetch('/v1/auth/providers', {
          method: 'GET',
          credentials: 'include',
          signal: controller.signal,
        });
        if (!response.ok) {
          if (!cancelled) {
            setState({
              hasCredential: false,
              isLoading: false,
            });
          }
          return;
        }

        const payload = (await response.json()) as {
          data?: Array<unknown>;
        };
        if (cancelled) return;
        setState({
          hasCredential: Array.isArray(payload.data) && payload.data.length > 0,
          isLoading: false,
        });
      } catch {
        if (cancelled) return;
        setState({
          hasCredential: false,
          isLoading: false,
        });
      }
    }

    void loadCredentialState();
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, []);

  return state;
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
  const { mutate: upsert } = api.business.useUpdate();
  const { data: _data, isLoading } = api.business.useGet({
    keys: [slug],
    single: true,
  });
  const { user, isAuthenticated } = useAuth();
  const { hasCredential, isLoading: isCredentialLoading } =
    useHasByoAiCredential();
  const data = omitMeta(_data?.[0]) as Business | undefined;
  const pages = useLayerStore((state) => state.pages);
  const initializeLayers = useLayerStore((state) => state.initialize);

  const currentLayers = data?.uiBuilder?.layers;
  const businessNamespace =
    data?.basePath?.trim() || data?.id?.trim() || slug.trim();
  const actorUserId = user?._?.soul ?? user?.pub ?? '';
  const actorRole =
    data?.members?.[actorUserId]?.role === 'owner'
      ? 'owner'
      : user?.role === 'admin'
        ? 'admin'
        : 'staff';

  const handleOpenGlobalAssistant = useCallback(() => {
    const decision = evaluateAiSurfaceGate({
      actionId: 'global-assistant.open',
      surface: 'global_assistant',
      isAuthenticated,
      hasByoAiCredential: hasCredential,
      at: Date.now(),
    });
    if (!decision.allowed) {
      toast.error(decision.message);
      return;
    }
    window.open('/_business/chat', '_blank', 'noopener,noreferrer');
  }, [hasCredential, isAuthenticated]);

  const handleLayersChange: LayerChangeHandler = (newLayers) => {
    if (isLoading) return;
    upsert({ id: slug, uiBuilder: { layers: JSON.stringify(newLayers) } });
  };

  const handleTemplateApplied = (nextLayers: typeof pages) => {
    initializeLayers(nextLayers, nextLayers[0]?.id, nextLayers[0]?.id);
    upsert({ id: slug, uiBuilder: { layers: JSON.stringify(nextLayers) } });
  };

  // biome-ignore lint/correctness/useExhaustiveDependencies: lint debt cleanup
  const createNew = useMemo(() => {
    return !isLoading && !currentLayers?.length;
  }, [isLoading, data]);

  // Create dynamic context data based on actual business data if available
  const { contextData } = useContextData({ business: data });

  return (
    <ContextDataStore contextData={contextData}>
      <UIBuilder
        componentRegistry={componentRegistry}
        isLoading={isLoading}
        enableFocusMode
        persistLayerStore={false}
        onChange={handleLayersChange}
        initialLayers={currentLayers ? JSON.parse(currentLayers) : undefined}
        createNew={createNew}
        panelConfig={{
          navBarActions: (
            <div className="flex items-center gap-2">
              {actorUserId ? (
                <TemplateMarketplaceSheet
                  businessId={businessNamespace}
                  actorUserId={actorUserId}
                  actorRole={actorRole}
                  layers={pages}
                  onInstallApplied={handleTemplateApplied}
                />
              ) : null}
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={isCredentialLoading}
                onClick={handleOpenGlobalAssistant}
              >
                <BotMessageSquare className="size-4" />
                Assistant
              </Button>
            </div>
          ),
        }}
      />
    </ContextDataStore>
  );
}

export function CustomUiRendererPage({
  slug,
  pageName,
  layersOverride,
}: {
  slug: string;
  pageName?: string;
  layersOverride?: ComponentLayer[];
}) {
  'use memo';
  const search = useSearch({ from: '__root__' });
  const page = pageName ?? search?.p;
  const { data: _business, isLoading } = api.business.useGet({
    keys: [slug],
    single: true,
  });

  const business = _business?.[0];

  function getPage() {
    const layers =
      layersOverride ??
      (business?.uiBuilder?.layers
        ? (JSON.parse(business?.uiBuilder?.layers) as ComponentLayer[])
        : undefined);
    const fallback = layers?.[0];
    if (!page) return fallback;
    const pageIndex = Number(page);
    const isNumber = Number.isInteger(pageIndex);
    if (isNumber) return layers?.[pageIndex] ?? fallback;
    const pageByName = layers?.find(
      (layer) => layer.name?.toLowerCase() === page.toLowerCase(),
    );
    return pageByName ?? fallback;
  }

  // Create context data for rendering - using business data if available
  const { contextData, isLoading: _isLoading } = useContextData({ business });

  if (isLoading || _isLoading) return <Spinner />;

  if (!layersOverride && !business?.uiBuilder?.layers) return <NotFound />;
  if (layersOverride && layersOverride.length === 0) return <NotFound />;
  const pageLayer = getPage();
  if (!pageLayer) return <NotFound />;

  return (
    <ContextDataStore contextData={contextData}>
      <LayerRenderer componentRegistry={componentRegistry} page={pageLayer} />
    </ContextDataStore>
  );
}
