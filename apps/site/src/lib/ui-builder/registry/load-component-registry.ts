import type { ComponentRegistry } from '@/components/ui/ui-builder/types';

let componentRegistryPromise: Promise<ComponentRegistry> | null = null;

export async function loadComponentRegistry(): Promise<ComponentRegistry> {
  if (componentRegistryPromise) return componentRegistryPromise;

  componentRegistryPromise = Promise.all([
    import('@/lib/ui-builder/registry/primitive-component-definitions'),
    import('@/lib/ui-builder/registry/complex-component-definitions'),
  ]).then(
    ([{ primitiveComponentDefinitions }, { complexComponentDefinitions }]) => ({
      ...primitiveComponentDefinitions,
      ...complexComponentDefinitions,
    }),
  );

  return componentRegistryPromise;
}
