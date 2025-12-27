import type { PossibleTabConfig } from "@/components/auto-admin";

export interface PermissionAction {
  feature: string;
  action: string;
}

export function generatePermissions(tabs: PossibleTabConfig[]) {
  const schemaNames = tabs
    .filter(tab => 'schema' in tab)
    .map(tab => tab.schema as string);

  const perms: PermissionAction[] = [];
  for (const schemaName of schemaNames) {
    perms.push({ feature: schemaName, action: "read" });
    perms.push({ feature: schemaName, action: "create" });
    perms.push({ feature: schemaName, action: "update" });
    perms.push({ feature: schemaName, action: "delete" });
  }

  return perms.reduce((acc, perm) => {
    if (!acc[perm.feature]) {
      acc[perm.feature] = [];
    }
    acc[perm.feature].push(perm.action);
    return acc;
  }, {} as Record<string, string[]>);
}
