import {
  createActionRegistry,
  definePlugin,
  defineSchemaDoc,
  defineWorkflowDoc,
} from 'supersurkhet-sdk';

export const restaurantActionRegistry = createActionRegistry()
  .defineAction({
    id: 'restaurant.stock.adjust',
    description: 'Adjusts stock quantity for one item',
    capabilities: ['inventory:write'],
    handler: async (
      _input: { productId: string; delta: number },
    ): Promise<{ success: true }> => ({ success: true }),
  })
  .defineAction({
    id: 'restaurant.invoice.set-status',
    description: 'Updates invoice payment status',
    capabilities: ['invoice:write'],
    handler: async (
      _input: {
        invoiceId: string;
        status: 'pending' | 'paid' | 'overdue';
      },
    ): Promise<{ success: true }> => ({ success: true }),
  })
  .defineAction({
    id: 'restaurant.order.finalize',
    description: 'Finalizes completed order bookkeeping',
    capabilities: ['order:write'],
    handler: async (_input: { orderId: string }): Promise<{ success: true }> =>
      ({ success: true }),
  })
  .defineAction({
    id: 'restaurant.trip.reconcile',
    description: 'Reconciles trip stock and sales artifacts',
    capabilities: ['trip:write'],
    handler: async (_input: { tripId: string }): Promise<{ success: true }> => ({
      success: true,
    }),
  });

export const restaurantSchemaDocs = [
  defineSchemaDoc({
    schemaId: 'restaurantIngredient',
    title: 'Restaurant Ingredient',
    fields: [
      { key: 'name', type: 'string', description: 'Ingredient name' },
      {
        key: 'sku',
        type: 'string',
        description: 'Ingredient SKU',
        optional: true,
      },
      {
        key: 'stockQuantity',
        type: 'number',
        description: 'Current stock quantity',
        rules: [{ kind: 'nonnegative' }],
        defaultValue: 0,
      },
      {
        key: 'reorderLevel',
        type: 'number',
        description: 'Reorder trigger quantity',
        rules: [{ kind: 'nonnegative' }],
        defaultValue: 0,
      },
    ],
  }),
  defineSchemaDoc({
    schemaId: 'restaurantOrder',
    title: 'Restaurant Order',
    fields: [
      { key: 'customerName', type: 'string', description: 'Customer name' },
      {
        key: 'status',
        type: 'enum',
        enumValues: ['pending', 'done', 'cancelled'],
        defaultValue: 'pending',
      },
      {
        key: 'items',
        type: 'array',
        itemType: {
          type: 'object',
          fields: [
            { key: 'title', type: 'string' },
            {
              key: 'quantity',
              type: 'number',
              rules: [{ kind: 'nonnegative' }],
            },
          ],
        },
      },
    ],
  }),
];

export const restaurantWorkflowDocs = [
  defineWorkflowDoc({
    workflowId: 'restaurant.stock.on-import',
    title: 'Stock Import Reconciliation',
    table: 'stockImport',
    hook: 'afterCreate',
    nodes: [
      {
        nodeId: 'stock-adjust',
        type: 'action',
        actionId: 'restaurant.stock.adjust',
      },
    ],
    edges: [],
  }),
  defineWorkflowDoc({
    workflowId: 'restaurant.invoice.on-create',
    title: 'Invoice Status Updater',
    table: 'invoice',
    hook: 'afterCreate',
    nodes: [
      {
        nodeId: 'invoice-status',
        type: 'action',
        actionId: 'restaurant.invoice.set-status',
      },
    ],
    edges: [],
  }),
  defineWorkflowDoc({
    workflowId: 'restaurant.order.on-update',
    title: 'Order Finalization',
    table: 'order',
    hook: 'afterUpdate',
    nodes: [
      {
        nodeId: 'order-finalize',
        type: 'action',
        actionId: 'restaurant.order.finalize',
      },
    ],
    edges: [],
  }),
  defineWorkflowDoc({
    workflowId: 'restaurant.trip.on-update',
    title: 'Trip Reconciliation',
    table: 'trip',
    hook: 'afterUpdate',
    nodes: [
      {
        nodeId: 'trip-reconcile',
        type: 'action',
        actionId: 'restaurant.trip.reconcile',
      },
    ],
    edges: [],
  }),
];

export const restaurantWorkerHandlers = {
  'restaurant.stock.adjust': async () => ({ success: true }),
  'restaurant.invoice.set-status': async () => ({ success: true }),
  'restaurant.order.finalize': async () => ({ success: true }),
  'restaurant.trip.reconcile': async () => ({ success: true }),
};

export const restaurantAdminPlugin = definePlugin({
  pluginId: 'supersurkhet.plugin.restaurant-admin',
  version: '1.0.0',
  docs: {
    title: 'Restaurant Admin',
    description:
      'Restaurant admin plugin with stock, invoice, order, and trip flows',
  },
  actions: restaurantActionRegistry,
  schemaDocs: restaurantSchemaDocs,
  workflows: restaurantWorkflowDocs,
  adminTabs: [
    { schema: 'product', title: 'Inventory' },
    { schema: 'stockImport', title: 'Stock Imports' },
    { schema: 'invoice', title: 'Invoices' },
    { schema: 'order', title: 'Orders' },
    { schema: 'trip', title: 'Trips' },
  ],
});
