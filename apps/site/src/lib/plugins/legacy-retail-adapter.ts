import type { SchemaKeys } from '@gta/react-hooks';
import type { AutoAdminTabInput } from '@/components/auto-admin';

const legacyRetailSchemas: readonly SchemaKeys[] = [
  'product',
  'party',
  'customer',
  'stockImport',
  'sale',
  'invoice',
  'order',
  'vehicle',
  'trip',
];

type AnyAutoTableTab = {
  [K in SchemaKeys]: AutoAdminTabInput;
}[SchemaKeys];

export function getLegacyRetailTabs(slug: string): AnyAutoTableTab[] {
  return legacyRetailSchemas.map((schema) => ({
    schema,
    slug,
  }));
}
