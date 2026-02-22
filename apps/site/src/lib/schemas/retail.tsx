import type z from 'zod';
import { compileSchemaDocs } from '@/lib/plugins/schema-compiler';
import type { SchemaDoc } from '@/lib/plugins/types';
import {
  customerSchema as legacyCustomerSchema,
  invoiceSchema as legacyInvoiceSchema,
  orderSchema as legacyOrderSchema,
  partySchema as legacyPartySchema,
  saleSchema as legacySaleSchema,
  salesItemSchema as legacySalesItemSchema,
  stockImportSchema as legacyStockImportSchema,
  tripSchema as legacyTripSchema,
} from './retail-legacy-zod';

export const retailSchemaDocs: SchemaDoc[] = [
  {
    schemaId: 'salesItem',
    title: 'Sales Item',
    fields: [],
    tokens: {
      schemaBuilderToken: 'legacy.retail.salesItem',
    },
  },
  {
    schemaId: 'sale',
    title: 'Sale',
    fields: [],
    tokens: {
      schemaBuilderToken: 'legacy.retail.sale',
    },
  },
  {
    schemaId: 'order',
    title: 'Order',
    fields: [],
    tokens: {
      schemaBuilderToken: 'legacy.retail.order',
    },
  },
  {
    schemaId: 'stockImport',
    title: 'Stock Import',
    fields: [],
    tokens: {
      schemaBuilderToken: 'legacy.retail.stockImport',
    },
  },
  {
    schemaId: 'party',
    title: 'Party',
    fields: [],
    tokens: {
      schemaBuilderToken: 'legacy.retail.party',
    },
  },
  {
    schemaId: 'customer',
    title: 'Customer',
    fields: [],
    tokens: {
      schemaBuilderToken: 'legacy.retail.customer',
    },
  },
  {
    schemaId: 'invoice',
    title: 'Invoice',
    fields: [],
    tokens: {
      schemaBuilderToken: 'legacy.retail.invoice',
    },
  },
  {
    schemaId: 'trip',
    title: 'Trip',
    fields: [],
    tokens: {
      schemaBuilderToken: 'legacy.retail.trip',
    },
  },
];

const compiledSchemas = compileSchemaDocs(retailSchemaDocs, {
  schemaTokenHandlers: {
    'legacy.retail.salesItem': () => legacySalesItemSchema,
    'legacy.retail.sale': () => legacySaleSchema,
    'legacy.retail.order': () => legacyOrderSchema,
    'legacy.retail.stockImport': () => legacyStockImportSchema,
    'legacy.retail.party': () => legacyPartySchema,
    'legacy.retail.customer': () => legacyCustomerSchema,
    'legacy.retail.invoice': () => legacyInvoiceSchema,
    'legacy.retail.trip': () => legacyTripSchema,
  },
});

function getCompiledSchema(schemaId: string) {
  const schema = compiledSchemas[schemaId];
  if (!schema) {
    throw new Error(`Missing compiled retail schema for "${schemaId}"`);
  }
  return schema;
}

export const salesItemSchema = getCompiledSchema('salesItem');
export const saleSchema = getCompiledSchema('sale');
export type Sale = z.infer<typeof saleSchema>;
export type SalesItem = z.infer<typeof salesItemSchema>;
export const orderSchema = getCompiledSchema('order');
export const stockImportSchema = getCompiledSchema('stockImport');
export type StockImport = z.infer<typeof stockImportSchema>;
export const partySchema = getCompiledSchema('party');
export const customerSchema = getCompiledSchema('customer');
export const invoiceSchema = getCompiledSchema('invoice');
export const tripSchema = getCompiledSchema('trip');
