import type { PossibleTabConfig } from '@/components/auto-admin';

interface PermissionAction {
  feature: string;
  action: string;
}

interface GeneratePermissionsOptions {
  additionalFeatures?: Array<{
    feature: string;
    actions?: string[];
  }>;
}

export function generatePermissions(
  tabs: PossibleTabConfig[],
  options: GeneratePermissionsOptions = {},
) {
  const schemaNames = tabs
    .filter((tab) => 'schema' in tab)
    .map((tab) => String(tab.schema));

  const perms: PermissionAction[] = [];
  for (const schemaName of schemaNames) {
    perms.push({ feature: schemaName, action: 'read' });
    perms.push({ feature: schemaName, action: 'create' });
    perms.push({ feature: schemaName, action: 'update' });
    perms.push({ feature: schemaName, action: 'delete' });
  }

  for (const tab of tabs) {
    for (const permissionFeature of tab.permissionFeatures ?? []) {
      const actions = permissionFeature.actions ?? [
        'read',
        'create',
        'update',
        'delete',
      ];
      for (const action of actions) {
        perms.push({ feature: permissionFeature.feature, action });
      }
    }
  }

  for (const feature of options.additionalFeatures ?? []) {
    const actions = feature.actions ?? ['read', 'create', 'update', 'delete'];
    for (const action of actions) {
      perms.push({ feature: feature.feature, action });
    }
  }

  return perms.reduce(
    (acc, perm) => {
      if (!acc[perm.feature]) {
        acc[perm.feature] = [];
      }
      if (!acc[perm.feature].includes(perm.action)) {
        acc[perm.feature].push(perm.action);
      }
      return acc;
    },
    {} as Record<string, string[]>,
  );
}
