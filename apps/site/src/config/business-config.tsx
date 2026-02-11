import type { AutoTableTab } from '@/components/auto-admin';
import { AutoFormSubmit } from '@/components/ui/auto-form';
import { AutoForm, fieldConfig } from '@/components/ui/autoform';
import { Button } from '@/components/ui/button';
import {
  Credenza,
  CredenzaContent,
  CredenzaTrigger,
} from '@/components/ui/credenza';
import {
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { ReceiptWrapper } from '@/components/ui/receipt-wrapper';
import { useDialog } from '@/contexts/dialog-context';
import { formatCurrency } from '@/lib/intl';
import type { BusinessType } from '@/lib/schema';
import { db } from '@/lib/ssr/api';
import { type SalesItem, salesItemSchema } from '@/lib/schemas/sales';
import type { SchemaKeys } from '@gta/react-hooks';
import {
  Car,
  DollarSign,
  MapIcon,
  Receipt,
  ShoppingBag,
  ShoppingCart,
  Users,
  Users2,
} from 'lucide-react';
import NepaliDate from 'nepali-datetime';
import { useState } from 'react';
import type { UseFormReturn } from 'react-hook-form';
import z from 'zod';

type AnyAutoTableTab = {
  [K in SchemaKeys]: AutoTableTab<K>;
}[SchemaKeys];

export type BusinessConfigReturn = {
  [B in BusinessType]?: AnyAutoTableTab[];
};

function calculateFiscalYear() {
  const year = new NepaliDate().getYear();
  return `${year.toString().slice(0, 2)}${year
    .toString()
    .slice(2)}/${(year + 1).toString().slice(2)}`;
}

function calculateTotalCost(form: UseFormReturn) {
  const formValues = form.getValues();
  if (!formValues?.items?.length) return 0;

  return formValues.items.reduce(
    (sum: number, item: any) =>
      sum + Number(item.quantity || 0) * Number(item.unitPrice || 0),
    0,
  );
}

function getPaymentStatus(paidAmount: number, totalCost: number) {
  if (paidAmount === totalCost) return 'paid';
  if (paidAmount === 0) return 'pending';
  if (paidAmount > totalCost) return 'overpaid (invalid)';
  return `partial (${formatCurrency(totalCost - paidAmount)} to pay)`;
}

function refreshPaidAmount(form: UseFormReturn) {
  const totalCost = calculateTotalCost(form);
  if (!totalCost) return;
  form.setValue('paidAmount', totalCost);
  const formValues = form.getValues();
  const paidAmount = formValues.paidAmount;
  const paymentStatus = getPaymentStatus(paidAmount, totalCost);
  form.setValue('paymentStatus', paymentStatus);
}

function calculateTotalAmountForItem(
  items: any[],
  itemsKey: string,
  index: number,
  form: UseFormReturn,
) {
  if (items && items[index]) {
    const quantity = Number(items[index].quantity) || 0;
    const unitPrice = Number(items[index].unitPrice) || 0;
    const totalAmount = quantity * unitPrice;

    form.setValue([itemsKey, index, 'totalAmount'].join('.'), totalAmount);
  }
}

export function useStockImportsConfig({
  slug,
}: {
  slug: string;
}): AutoTableTab<'stockImport'> {
  'use memo';

  function getDefaultUnitField() {
    return z
      .string()
      .optional()
      .describe('Unit')
      .superRefine(
        fieldConfig({
          inputProps: {
            disabled: true,
            placeholder: 'Select product for unit',
            className: 'border-none',
          },
        }),
      );
  }

  const [unitField, setUnitField] = useState < z.ZodType >> getDefaultUnitField;

  function getQuantityDescription() {
    return 'Quantity';
  }

  return {
    schema: 'stockImport',
    title: 'Stock Imports',
    icon: ShoppingBag,
    slug,
    group: 'Inventory',
    extender: (schema) =>
      schema
        .extend({
          paidAmount: z
            .number({ coerce: true })
            .describe('Paid Amount')
            .superRefine(
              fieldConfig({
                fieldType: 'number',
                customData: {
                  onValueChange: (paidAmount, __, form) => {
                    const totalCost = calculateTotalCost(form);
                    if (!totalCost) return;
                    form.setValue(
                      'paymentStatus',
                      getPaymentStatus(Number(paidAmount), totalCost),
                    );
                  },
                },
              }),
            ),
          items: salesItemSchema
            .extend({
              unit: unitField,
              product: z
                .string()
                .describe('Product')
                .superRefine(
                  fieldConfig({
                    fieldType: 'select',
                    customData: {
                      sources: [
                        {
                          table: 'product',
                          displayKey: 'title',
                        },
                      ],
                      onValueChange: async (val, path, form) => {
                        const products = await db.product.get({
                          keys: [slug],
                        });
                        const product = products.find(
                          (item) => item?._?.soul === val,
                        );
                        if (!product) return;
                        const [itemsKey, index] = path;

                        form.setValue(
                          [itemsKey, index, 'unitPrice'].join('.'),
                          product.costPrice,
                        );
                        if (product.unit) {
                          const [unitType, piecesPerUnit] =
                            product.unit.split(':');
                          if (piecesPerUnit) {
                            setUnitField(
                              z
                                .string()
                                .describe('Unit')
                                .superRefine(
                                  fieldConfig({
                                    fieldType: 'unit',
                                    customData: {
                                      onlyAllow: [unitType, 'piece'],
                                      configDisabled: true,
                                      onValueChange(value, path, form) {
                                        const [, productQuantityPerUnit] =
                                          product.unit?.split(':') ?? [];
                                        const [, quantityPerUnit] =
                                          value?.split(':') ?? [];
                                        const [itemsKey, index] = path;

                                        if (quantityPerUnit) {
                                          if (product.costPrice)
                                            form.setValue(
                                              [
                                                itemsKey,
                                                index,
                                                'unitPrice',
                                              ].join('.'),
                                              product.costPrice,
                                            );
                                        } else {
                                          if (
                                            productQuantityPerUnit &&
                                            product.costPrice &&
                                            productQuantityPerUnit &&
                                            !isNaN(
                                              Number(productQuantityPerUnit),
                                            )
                                          ) {
                                            form.setValue(
                                              [
                                                itemsKey,
                                                index,
                                                'unitPrice',
                                              ].join('.'),
                                              product.costPrice /
                                                Number(productQuantityPerUnit),
                                            );
                                          }
                                        }
                                      },
                                    },
                                  }),
                                ),
                            );
                          } else {
                            setUnitField(
                              z
                                .string()
                                .describe('Unit')
                                .superRefine(
                                  fieldConfig({
                                    fieldType: 'unit',
                                    customData: {
                                      onlyAllow: [unitType],
                                    },
                                  }),
                                ),
                            );
                          }
                          form.setValue(
                            [itemsKey, index, 'unit'].join('.'),
                            product.unit,
                          );
                        }
                        refreshPaidAmount(form);
                      },
                    },
                  }),
                ),
              quantity: z
                .number({ coerce: true })
                .int()
                .positive()
                .describe(getQuantityDescription())
                .superRefine(
                  fieldConfig({
                    fieldType: 'number',
                    customData: {
                      onValueChange: (value, path, form) => {
                        const [itemsKey, index] = path;
                        const items = form.getValues('items');

                        calculateTotalAmountForItem(
                          items,
                          itemsKey,
                          Number(index),
                          form,
                        );
                        refreshPaidAmount(form);
                      },
                    },
                  }),
                ),
              unitPrice: z
                .number({ coerce: true })
                .describe('Unit Price')
                .superRefine(
                  fieldConfig({
                    fieldType: 'number',
                    customData: {
                      onValueChange: (value, path, form) => {
                        const [itemsKey, index] = path;
                        const items = form.getValues('items');

                        calculateTotalAmountForItem(
                          items,
                          itemsKey,
                          Number(index),
                          form,
                        );
                        refreshPaidAmount(form);
                      },
                    },
                  }),
                ),
            })
            .array()
            .min(1, { message: 'Please add at least one item.' })
            .describe('Items to Import'),
        })
        .superRefine((stockImport, ctx) => {
          if (!stockImport.paidAmount) return;
          const totalCost = stockImport.items.reduce(
            (sum, item) =>
              sum + Number(item.quantity || 0) * Number(item.unitPrice || 0),
            0,
          );
          if (stockImport.paidAmount > totalCost)
            ctx.addIssue({
              code: 'custom',
              message: `Paid amount cannot be greater than total cost (${totalCost})`,
              path: ['paidAmount'],
            });
        }),
    async onCreate(_, variables) {
      const products = await db.product.get({ keys: [slug] });
      const productsBySoul = new Map(
        products
          .filter((item) => item?._?.soul)
          .map((item) => [item._!.soul!, item]),
      );
      const itemsByProductIdWithQuantity = variables.items?.reduce(
        (a, { product, quantity, unit }) => {
          const productInfo = productsBySoul.get(product);
          if (!productInfo) return a;

          let adjustedQuantity = quantity;
          if (productInfo.unit && productInfo.unit.includes(':')) {
            const [unitType, piecesPerUnit] = productInfo.unit.split(':');

            if (unit === unitType) {
              adjustedQuantity = quantity * parseInt(piecesPerUnit, 10);
            }
          }

          a[product] = (a[product] || 0) + adjustedQuantity;
          return a;
        },
        {} as Record<string, number>,
      );

      Object.entries(itemsByProductIdWithQuantity ?? {}).forEach(
        ([productId, quantity]) => {
          const product = productsBySoul.get(productId);
          if (!product?._?.soul) return;
          void db.product.update(slug)({
            id: product?._?.soul,
            stockQuantity: product?.stockQuantity + quantity,
          });
        },
      );

      const invoiceItems =
        variables.items?.map((item) => {
          const productInfo = productsBySoul.get(item.product);
          let adjustedQuantity = item.quantity;

          if (productInfo?.unit && productInfo.unit.includes(':')) {
            const [unitType, piecesPerUnit] = productInfo.unit.split(':');

            if (item.unit === unitType) {
              adjustedQuantity = item.quantity * parseInt(piecesPerUnit, 10);
            }
          }

          return {
            product: item.product,
            quantity: adjustedQuantity,
            rate: item.unitPrice,
            total: item.quantity * item.unitPrice,
          };
        }) ?? [];

      const totalAmount =
        variables.items?.reduce(
          (sum, item) => sum + item.quantity * item.unitPrice,
          0,
        ) ?? 0;

      void db.invoice.create(slug)({
        type: 'purchase',
        partyId: variables.party,
        issuedAt: variables.importDate,
        items: invoiceItems,
        subTotal: totalAmount,
        tax: 0,
        paidAmount: variables.paidAmount || 0,
        paymentStatus: (variables.paymentStatus || 'pending') as any,
        fiscalYear: calculateFiscalYear(),
      });
    },
  };
}

export function useCustomerConfig({
  slug,
}: {
  slug: string;
}): AutoTableTab<'customer'> {
  'use memo';
  const { openDialog, closeDialog } = useDialog();

  async function deleteInvoiceByCustomerId(id: string) {
    const invoices = await db.invoice.get({ keys: [slug] });
    const sales = await db.sale.get({ keys: [slug] });
    for (const sale of sales) {
      if (sale.customerId === id && !!sale._?.soul) {
        void db.sale.remove(slug)(sale._.soul);
      }
    }
    for (const invoice of invoices) {
      if (invoice.partyId === id && !!invoice._?.soul) {
        void db.invoice.remove(slug)(invoice._.soul);
      }
    }
    closeDialog();
  }

  return {
    schema: 'customer',
    title: 'Customers',
    slug,
    icon: Users,
    group: 'Party',
    async onDelete(_, id) {
      const invoices = await db.invoice.get({ keys: [slug] });
      if (!invoices.length) return;
      if (!invoices.some((invoice) => invoice.partyId === id)) return;
      openDialog({
        title: 'Delete Invoices',
        description:
          'The customer has been deleted. Do you want to delete all associated invoices?',
        children: (
          <div className="flex gap-2 items-center">
            <Button variant="outline" size="sm" onClick={() => closeDialog()}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => deleteInvoiceByCustomerId(id)}
            >
              Delete
            </Button>
          </div>
        ),
      });
    },
  };
}

export function usePartyConfig({
  slug,
}: {
  slug: string;
}): AutoTableTab<'party'> {
  'use memo';
  const { openDialog, closeDialog } = useDialog();

  async function deleteInvoiceByPartyId(id: string) {
    const invoices = await db.invoice.get({ keys: [slug] });
    const stockImports = await db.stockImport.get({ keys: [slug] });
    for (const stockImport of stockImports) {
      if (stockImport.party === id && !!stockImport._?.soul) {
        void db.stockImport.remove(slug)(stockImport._.soul);
      }
    }
    for (const invoice of invoices) {
      if (invoice.partyId === id && !!invoice._?.soul) {
        void db.invoice.remove(slug)(invoice._.soul);
      }
    }
    closeDialog();
  }
  return {
    schema: 'party',
    title: 'Purchase Parties',
    slug,
    icon: Users2,
    group: 'Party',
    async onDelete(_, id) {
      const invoices = await db.invoice.get({ keys: [slug] });
      if (!invoices.length) return;
      if (!invoices.some((invoice) => invoice.partyId === id)) return;
      openDialog({
        title: 'Delete Invoices',
        description:
          'The party has been deleted. Do you want to delete all associated invoices?',
        children: (
          <div className="flex gap-2 items-center">
            <Button variant="outline" size="sm" onClick={() => closeDialog()}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={() => deleteInvoiceByPartyId(id)}
            >
              Delete
            </Button>
          </div>
        ),
      });
    },
  };
}

export function useSalesConfig({
  slug,
}: {
  slug: string;
}): AutoTableTab<'sale'> {
  'use memo';
  function getDefaultUnitField() {
    return z
      .string()
      .optional()
      .describe('Unit')
      .superRefine(
        fieldConfig({
          inputProps: {
            disabled: true,
            placeholder: 'Select product for unit',
            className: 'border-none',
          },
        }),
      );
  }

  const [unitField, setUnitField] = useState < z.ZodType >> getDefaultUnitField;

  return {
    schema: 'sale',
    title: 'Sales',
    icon: DollarSign,
    group: 'Inventory',
    slug,
    extender: (schema) =>
      schema
        .extend({
          paidAmount: z
            .number({ coerce: true })
            .describe('Paid Amount')
            .superRefine(
              fieldConfig({
                fieldType: 'number',
                customData: {
                  onValueChange: (_paidAmount, __, form) => {
                    const paidAmount = Number(_paidAmount);
                    const totalCost = calculateTotalCost(form);
                    form.setValue(
                      'paymentStatus',
                      getPaymentStatus(paidAmount, totalCost),
                    );
                  },
                },
              }),
            ),
          items: salesItemSchema
            .extend({
              product: z
                .string()
                .describe('Product')
                .superRefine(
                  fieldConfig({
                    fieldType: 'select',
                    customData: {
                      sources: [
                        {
                          table: 'product',
                          displayKeys: ['title', 'stockQuantity'],
                          separator: ' - Stock: ',
                        },
                      ],
                      onValueChange: async (val, path, form) => {
                        const products = await db.product.get({
                          keys: [slug],
                        });
                        const product = products.find(
                          (item) => item?._?.soul === val,
                        );
                        if (!product) return;
                        const [itemsKey, index] = path;

                        form.setValue(
                          [itemsKey, index, 'unitPrice'].join('.'),
                          product.sellingPrice,
                        );

                        if (product.unit) {
                          const [unitType, piecesPerUnit] =
                            product.unit.split(':');
                          setUnitField(
                            z
                              .string()
                              .describe('Unit')
                              .superRefine(
                                fieldConfig({
                                  fieldType: 'unit',
                                  customData: {
                                    onlyAllow: [
                                      unitType,
                                      piecesPerUnit ? 'piece' : undefined,
                                    ].filter(Boolean),
                                    configDisabled: true,
                                  },
                                }),
                              ),
                          );
                          form.setValue(
                            [itemsKey, index, 'unit'].join('.'),
                            product.unit,
                          );
                        }

                        refreshPaidAmount(form);
                      },
                    },
                  }),
                ),
              unit: unitField,
              quantity: z
                .number({ coerce: true })
                .int()
                .positive()
                .describe('Quantity')
                .superRefine(
                  fieldConfig({
                    fieldType: 'number',
                    customData: {
                      onValueChange: ((value: string, path: string[], form) => {
                        refreshPaidAmount(form);
                        const items = form.getValues('items');
                        const [itemsKey, index] = path;
                        calculateTotalAmountForItem(
                          items,
                          itemsKey,
                          Number(index),
                          form,
                        );

                        return value;
                      }) as any,
                    },
                  }),
                ),
              unitPrice: z
                .number({ coerce: true })
                .describe('Unit Price')
                .superRefine(
                  fieldConfig({
                    fieldType: 'number',
                    customData: {
                      onValueChange: (value, path, form) => {
                        refreshPaidAmount(form);
                        const items = form.getValues('items');
                        const [itemsKey, index] = path;
                        calculateTotalAmountForItem(
                          items,
                          itemsKey,
                          Number(index),
                          form,
                        );

                        return value;
                      },
                    },
                  }),
                ),
            })
            .array()
            .min(1, { message: 'Please add at least one item.' })
            .describe('Items Sold'),
        })
        .superRefine((sale, ctx) => {
          if (!sale.paidAmount) return;
          const totalCost = sale.items.reduce(
            (sum, item) =>
              sum + Number(item.quantity || 0) * Number(item.unitPrice || 0),
            0,
          );
          if (sale.paidAmount > totalCost)
            ctx.addIssue({
              code: 'custom',
              message: `Paid amount cannot be greater than total cost (${totalCost})`,
              path: ['paidAmount'],
            });
        }),
    async onCreate(_, variables) {
      const products = await db.product.get({ keys: [slug] });
      const productsBySoul = new Map(
        products
          .filter((item) => item?._?.soul)
          .map((item) => [item._!.soul!, item]),
      );
      const itemsByProductIdWithQuantity = variables.items?.reduce(
        (a, { product, quantity, unit }) => {
          const productInfo = productsBySoul.get(product);
          if (!productInfo) return a;

          let adjustedQuantity = quantity;
          if (productInfo.unit && productInfo.unit.includes(':')) {
            const [unitType, piecesPerUnit] = productInfo.unit.split(':');

            if (unit === unitType) {
              adjustedQuantity = quantity * parseInt(piecesPerUnit, 10);
            }
          }

          a[product] = (a[product] || 0) + adjustedQuantity;
          return a;
        },
        {} as Record<string, number>,
      );

      Object.entries(itemsByProductIdWithQuantity ?? {}).forEach(
        ([productId, quantity]) => {
          const product = productsBySoul.get(productId);
          if (!product?._?.soul) return;
          void db.product.update(slug)({
            id: product._.soul,
            stockQuantity: product.stockQuantity - quantity,
          });
        },
      );

      const invoiceItems =
        variables.items?.map((item) => {
          const productInfo = productsBySoul.get(item.product);
          let adjustedQuantity = item.quantity;

          if (productInfo?.unit && productInfo.unit.includes(':')) {
            const [unitType, piecesPerUnit] = productInfo.unit.split(':');

            if (item.unit === unitType) {
              adjustedQuantity = item.quantity * parseInt(piecesPerUnit, 10);
            }
          }

          return {
            product: item.product,
            quantity: adjustedQuantity,
            rate: item.unitPrice,
            total: item.quantity * item.unitPrice,
          };
        }) ?? [];

      const totalAmount =
        variables.items?.reduce(
          (sum, item) => sum + item.quantity * item.unitPrice,
          0,
        ) ?? 0;

      void db.invoice.create(slug)({
        type: 'sale',
        partyId: variables.customerId,
        issuedAt: variables.saleDate,
        items: invoiceItems,
        subTotal: totalAmount,
        tax: 0,
        paidAmount: variables.paidAmount || 0,
        paymentStatus: (variables.paymentStatus || 'pending') as any,
        fiscalYear: calculateFiscalYear(),
      });
    },
    onUpdate(_) {
      return;
    },
  };
}

export function useOrderConfig({
  slug,
}: {
  slug: string;
}): AutoTableTab<'order'> {
  'use memo';

  function getDefaultUnitField() {
    return z
      .string()
      .optional()
      .describe('Unit')
      .superRefine(
        fieldConfig({
          inputProps: {
            disabled: true,
            placeholder: 'Select product for unit',
            className: 'border-none',
          },
        }),
      );
  }

  const [unitField, setUnitField] = useState < z.ZodType >> getDefaultUnitField;

  return {
    schema: 'order',
    title: 'Orders',
    icon: ShoppingCart,
    group: 'Inventory',
    slug,
    extender: (schema) =>
      schema
        .extend({
          paidAmount: z
            .number({ coerce: true })
            .describe('Paid Amount')
            .superRefine(
              fieldConfig({
                fieldType: 'number',
                customData: {
                  onValueChange: (_paidAmount, __, form) => {
                    const paidAmount = Number(_paidAmount);
                    const totalCost = calculateTotalCost(form);
                    form.setValue(
                      'paymentStatus',
                      getPaymentStatus(paidAmount, totalCost),
                    );
                  },
                },
              }),
            ),
          items: salesItemSchema
            .extend({
              product: z
                .string()
                .describe('Product')
                .superRefine(
                  fieldConfig({
                    fieldType: 'select',
                    customData: {
                      sources: [
                        {
                          table: 'product',
                          displayKeys: ['title', 'stockQuantity'],
                          separator: ' - Stock: ',
                        },
                      ],
                      onValueChange: async (val, path, form) => {
                        const products = await db.product.get({
                          keys: [slug],
                        });
                        const product = products.find(
                          (item) => item?._?.soul === val,
                        );

                        if (!product) return;
                        const [itemsKey, index] = path;

                        form.setValue(
                          [itemsKey, index, 'unitPrice'].join('.'),
                          product.sellingPrice,
                        );

                        if (product.unit) {
                          const [unitType, piecesPerUnit] =
                            product.unit.split(':');
                          if (piecesPerUnit) {
                            setUnitField(
                              z
                                .string()
                                .describe('Unit')
                                .superRefine(
                                  fieldConfig({
                                    fieldType: 'unit',
                                    customData: {
                                      onlyAllow: [unitType, 'piece'],
                                      configDisabled: true,
                                    },
                                  }),
                                ),
                            );
                          } else {
                            setUnitField(
                              z
                                .string()
                                .describe('Unit')
                                .superRefine(
                                  fieldConfig({
                                    fieldType: 'unit',
                                    customData: {
                                      onlyAllow: [unitType],
                                    },
                                  }),
                                ),
                            );
                          }
                          form.setValue(
                            [itemsKey, index, 'unit'].join('.'),
                            product.unit,
                          );
                        }

                        refreshPaidAmount(form);
                      },
                    },
                  }),
                ),
              unit: unitField,
              quantity: z
                .number({ coerce: true })
                .int()
                .positive()
                .describe('Quantity')
                .superRefine(
                  fieldConfig({
                    fieldType: 'number',
                    customData: {
                      onValueChange: ((value: string, path: string[], form) => {
                        refreshPaidAmount(form);
                        const items = form.getValues('items');
                        const [itemsKey, index] = path;
                        calculateTotalAmountForItem(
                          items,
                          itemsKey,
                          Number(index),
                          form,
                        );

                        return value;
                      }) as any,
                    },
                  }),
                ),
              unitPrice: z
                .number({ coerce: true })
                .describe('Unit Price')
                .superRefine(
                  fieldConfig({
                    fieldType: 'number',
                    customData: {
                      onValueChange: ((value: string, path: string[], form) => {
                        refreshPaidAmount(form);
                        const items = form.getValues('items');
                        const [itemsKey, index] = path;
                        calculateTotalAmountForItem(
                          items,
                          itemsKey,
                          Number(index),
                          form,
                        );

                        return value;
                      }) as any,
                    },
                  }),
                ),
              totalAmount: z
                .number({ coerce: true })
                .describe('Total Amount')
                .superRefine(
                  fieldConfig({
                    inputProps: {
                      readOnly: true,
                    },
                  }),
                ),
            })
            .array()
            .min(1, { message: 'Please add at least one item.' })
            .describe('Items Ordered'),
          orderStatus: z
            .enum(['pending', 'done', 'cancelled'])
            .describe('Order Status')
            .superRefine(
              fieldConfig({
                fieldType: 'select',
                customData: {
                  options: [
                    ['pending', 'Pending'],
                    ['done', 'Done'],
                    ['cancelled', 'Cancelled'],
                  ],
                  onValueChange: async (newStatus, _, form) => {
                    if (newStatus === 'done') {
                      const order = form.getValues();
                      if (order.items) {
                        for (const item of order.items) {
                          const products = await db.product.get({
                            keys: [slug],
                          });
                          const product = products.find(
                            (entry) => entry?._?.soul === item.product,
                          );
                          if (product && product._?.soul) {
                            let adjustedQuantity = item.quantity;
                            if (product.unit && product.unit.includes(':')) {
                              const [unitType, piecesPerUnit] =
                                product.unit.split(':');
                              if (item.unit === unitType) {
                                adjustedQuantity =
                                  item.quantity * parseInt(piecesPerUnit, 10);
                              }
                            }
                            void db.product.update(slug)({
                              id: product._.soul,
                              stockQuantity:
                                product.stockQuantity - adjustedQuantity,
                            });
                          }
                        }
                      }
                    }
                  },
                },
              }),
            ),
        })
        .superRefine((order, ctx) => {
          if (!order.paidAmount) return;
          const totalCost = order.items.reduce(
            (sum, item) =>
              sum + Number(item.quantity || 0) * Number(item.unitPrice || 0),
            0,
          );
          if (order.paidAmount > totalCost)
            ctx.addIssue({
              code: 'custom',
              message: `Paid amount cannot be greater than total cost (${totalCost})`,
              path: ['paidAmount'],
            });
        }),
    async onCreate(_, variables) {
      const products = await db.product.get({ keys: [slug] });
      const productsBySoul = new Map(
        products
          .filter((item) => item?._?.soul)
          .map((item) => [item._!.soul!, item]),
      );
      if (variables.orderStatus === 'done') {
        const itemsByProductIdWithQuantity = variables.items?.reduce(
          (a, item) => {
            const product = productsBySoul.get(item.product);
            let adjustedQuantity = item.quantity;
            if (product?.unit && product.unit.includes(':')) {
              const [unitType, piecesPerUnit] = product.unit.split(':');
              if (item.unit === unitType) {
                adjustedQuantity = item.quantity * parseInt(piecesPerUnit, 10);
              }
            }
            a[item.product] = (a[item.product] || 0) + adjustedQuantity;
            return a;
          },
          {} as Record<string, number>,
        );

        Object.entries(itemsByProductIdWithQuantity ?? {}).forEach(
          ([productId, quantity]) => {
            const product = productsBySoul.get(productId);
            if (!product?._?.soul) return;
            db.product.update(slug)({
              id: product._.soul,
              stockQuantity: product.stockQuantity - quantity,
            });
          },
        );

        const invoiceItems =
          variables.items?.map((item) => {
            const productInfo = productsBySoul.get(item.product);
            let adjustedQuantity = item.quantity;

            if (productInfo?.unit && productInfo.unit.includes(':')) {
              const [unitType, piecesPerUnit] = productInfo.unit.split(':');
              if (item.unit === unitType) {
                adjustedQuantity = item.quantity * parseInt(piecesPerUnit, 10);
              }
            }

            return {
              product: item.product,
              quantity: adjustedQuantity,
              rate: item.unitPrice,
              total: item.quantity * item.unitPrice,
            };
          }) ?? [];

        const totalAmount =
          variables.items?.reduce(
            (sum, item) => sum + item.quantity * item.unitPrice,
            0,
          ) ?? 0;

        void db.invoice.create(slug)({
          type: 'sale',
          partyId: variables.customerId,
          issuedAt: new Date().toISOString(),
          items: invoiceItems,
          subTotal: totalAmount,
          tax: 0,
          paidAmount: variables.paidAmount || 0,
          paymentStatus: (variables.paymentStatus || 'pending') as any,
          fiscalYear: calculateFiscalYear(),
        });
      }
    },
    onUpdate(_, variables) {
      if (variables.orderStatus !== 'done') return;
      const currentOrder = ordersBySoul.get(variables.id);
      const order = { ...currentOrder, ...variables } as any;
      if (!order?.items?.length || !order?.customerId) return;

      const itemsByProductIdWithQuantity = order.items?.reduce(
        (a: Record<string, number>, item: any) => {
          const product = productsBySoul.get(item.product);
          let adjustedQuantity = item.quantity;
          if (product?.unit && product.unit.includes(':')) {
            const [unitType, piecesPerUnit] = product.unit.split(':');
            if (item.unit === unitType) {
              adjustedQuantity = item.quantity * parseInt(piecesPerUnit, 10);
            }
          }
          a[item.product] = (a[item.product] || 0) + adjustedQuantity;
          return a;
        },
        {} as Record<string, number>,
      );

      Object.entries(itemsByProductIdWithQuantity ?? {}).forEach(
        ([productId, quantity]) => {
          const product = productsBySoul.get(productId);
          if (!product?._?.soul) return;
          db.product.update(slug)({
            id: product._.soul,
            stockQuantity: product.stockQuantity - quantity,
          });
        },
      );

      const invoiceItems =
        order.items?.map((item: any) => {
          const productInfo = productsBySoul.get(item.product);
          let adjustedQuantity = item.quantity;

          if (productInfo?.unit && productInfo.unit.includes(':')) {
            const [unitType, piecesPerUnit] = productInfo.unit.split(':');
            if (item.unit === unitType) {
              adjustedQuantity = item.quantity * parseInt(piecesPerUnit, 10);
            }
          }

          return {
            product: item.product,
            quantity: adjustedQuantity,
            rate: item.unitPrice,
            total: item.quantity * item.unitPrice,
          };
        }) ?? [];

      const totalAmount =
        order.items?.reduce(
          (sum: number, item: any) => sum + item.quantity * item.unitPrice,
          0,
        ) ?? 0;

      db.invoice.create(slug)({
        type: 'sale',
        partyId: order.customerId,
        issuedAt: new Date().toISOString(),
        items: invoiceItems,
        subTotal: totalAmount,
        tax: 0,
        paidAmount: order.paidAmount || 0,
        paymentStatus: order.paymentStatus || ('pending' as any),
        fiscalYear: calculateFiscalYear(),
      });
    },
  };
}

export function useInvoicesConfig({
  slug,
}: {
  slug: string;
}): AutoTableTab<'invoice'> {
  'use memo';

  const { data: parties } = api.party.useGet({ keys: [slug] });

  return {
    schema: 'invoice',
    title: 'Invoices',
    group: 'Financial',
    slug,
    icon: Receipt,
    readOnly: true,
    actions: ({ row }) => {
      const partyId = row.original.partyId;
      if (!partyId) return null;
      const party = parties?.find((p) => p?._?.soul === partyId);
      if (!party) return null;
      return (
        <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
          <Credenza>
            <CredenzaTrigger>View Receipt</CredenzaTrigger>
            <CredenzaContent>
              <ReceiptWrapper
                invoice={row.original}
                party={party}
                productsById={new Map()}
              />
            </CredenzaContent>
          </Credenza>
        </DropdownMenuItem>
      );
    },
    previewOverrides: {
      partyId: (id) =>
        partiesBySoul.get(id)?.name || customersBySoul.get(id)?.name || '-',
      vehicleId: (id) => vehiclesBySoul.get(id)?.name || '-',
      tripId: (id) => {
        const trip = tripsBySoul.get(id);
        if (!trip) return '-';
        return [
          trip.destination,
          [trip.dispatchTime, trip.returnTime].filter(Boolean).join(' - '),
        ].join(' | ');
      },
      issuedAt: (date) =>
        date
          ? new Date(date).toLocaleString('en-US', {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })
          : '-',
      dueDate: (date) =>
        date
          ? new Date(date).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
            })
          : '-',
      items: (items) => {
        const mapped = items?.map((item: SalesItem) => ({
          ...item,
          product: item.product ?? '-',
        }));
        if (!mapped) return;
        mapped['#'] = items?.['#'];
        return mapped;
      },
    },
  };
}

export function useVehicleConfig({
  slug,
}: {
  slug: string;
}): AutoTableTab<'vehicle'> {
  'use memo';
  return {
    schema: 'vehicle',
    title: 'Vehicles',
    slug,
    icon: Car,
    group: 'Logistics',
  };
}

export function useTripConfig({
  slug,
}: {
  slug: string;
}): AutoTableTab<'trip'> {
  'use memo';
  const { openDialog } = useDialog();

  function getDefaultUnitField() {
    return z
      .string()
      .optional()
      .describe('Unit')
      .superRefine(
        fieldConfig({
          inputProps: {
            disabled: true,
            placeholder: 'Select product for unit',
            className: 'border-none',
          },
        }),
      );
  }

  const [unitField, setUnitField] = useState < z.ZodType >> getDefaultUnitField;

  const [returnedUnitField, setReturnedUnitField] =
    useState < z.ZodType >> getDefaultUnitField;

  const returnedProductsSchema = salesItemSchema
    .extend({
      product: z
        .string()
        .describe('Product')
        .superRefine(
          fieldConfig({
            fieldType: 'select',
            customData: {
              sources: [
                {
                  table: 'product',
                  displayKey: 'title',
                },
              ],
              onValueChange: async (val, path, form) => {
                const products = await db.product.get({ keys: [slug] });
                const product = products.find((item) => item?._?.soul === val);
                if (!product) return;
                const [itemsKey, index] = path;

                form.setValue(
                  [itemsKey, index, 'unitPrice'].join('.'),
                  product.sellingPrice,
                );

                if (product.unit) {
                  const [unitType, piecesPerUnit] = product.unit.split(':');
                  if (piecesPerUnit) {
                    setReturnedUnitField(
                      z
                        .string()
                        .describe('Unit')
                        .superRefine(
                          fieldConfig({
                            fieldType: 'unit',
                            customData: {
                              onlyAllow: [unitType, 'piece'],
                              configDisabled: true,
                              onValueChange(value, path, form) {
                                const [, productQuantityPerUnit] =
                                  product.unit?.split(':') ?? [];
                                const [, quantityPerUnit] =
                                  value?.split(':') ?? [];
                                const [itemsKey, index] = path;

                                if (quantityPerUnit) {
                                  if (product.sellingPrice)
                                    form.setValue(
                                      [itemsKey, index, 'unitPrice'].join('.'),
                                      product.sellingPrice,
                                    );
                                } else {
                                  if (
                                    productQuantityPerUnit &&
                                    product.sellingPrice &&
                                    productQuantityPerUnit &&
                                    !isNaN(Number(productQuantityPerUnit))
                                  ) {
                                    form.setValue(
                                      [itemsKey, index, 'unitPrice'].join('.'),
                                      product.sellingPrice /
                                        Number(productQuantityPerUnit),
                                    );
                                  }
                                }
                              },
                            },
                          }),
                        ),
                    );
                  } else {
                    setReturnedUnitField(
                      z
                        .string()
                        .describe('Unit')
                        .superRefine(
                          fieldConfig({
                            fieldType: 'unit',
                            customData: {
                              onlyAllow: [unitType],
                            },
                          }),
                        ),
                    );
                  }
                  form.setValue(
                    [itemsKey, index, 'unit'].join('.'),
                    product.unit,
                  );
                }
                refreshPaidAmount(form);
              },
            },
          }),
        ),
      unit: returnedUnitField,
      quantity: z
        .number({ coerce: true })
        .int()
        .nonnegative()
        .describe('Quantity Returned')
        .superRefine(
          fieldConfig({
            fieldType: 'number',
            customData: {
              onValueChange: ((value: string, path: string[], form) => {
                const items = form.getValues('returnedProducts');
                const [itemsKey, index] = path;
                calculateTotalAmountForItem(
                  items,
                  itemsKey,
                  Number(index),
                  form,
                );

                return value;
              }) as any,
            },
          }),
        ),
      unitPrice: z
        .number({ coerce: true })
        .describe('Unit Price')
        .superRefine(
          fieldConfig({
            fieldType: 'number',
            customData: {
              onValueChange: ((value: string, path: string[], form) => {
                const items = form.getValues('returnedProducts');
                const [itemsKey, index] = path;
                calculateTotalAmountForItem(
                  items,
                  itemsKey,
                  Number(index),
                  form,
                );

                return value;
              }) as any,
            },
          }),
        ),
      totalAmount: z
        .number({ coerce: true })
        .describe('Total Amount')
        .superRefine(
          fieldConfig({
            inputProps: {
              readOnly: true,
            },
          }),
        ),
    })
    .array()
    .optional()
    .describe('Products Returned from Trip');

  return {
    schema: 'trip',
    title: 'Trips',
    slug,
    icon: MapIcon,
    group: 'Logistics',
    previewOverrides: {
      vehicleId: (vehicleId) => vehicleId ?? '-',
      products: (items) => {
        const mapped = items?.map((item: SalesItem) => ({
          ...item,
          product: item.product ?? '-',
          totalAmount: Number(item.quantity || 0) * Number(item.unitPrice || 0),
        }));
        if (!mapped) return;
        mapped['#'] = items?.['#'];
        return mapped;
      },
      returnedProducts: (items) => {
        const mapped = items?.map((item: SalesItem) => ({
          ...item,
          product: item.product ?? '-',
          totalAmount: Number(item.quantity || 0) * Number(item.unitPrice || 0),
        }));
        if (!mapped) return;
        mapped['#'] = items?.['#'];
        return mapped;
      },
    },
    extender: (schema) =>
      schema.extend({
        products: salesItemSchema
          .extend({
            product: z
              .string()
              .describe('Product')
              .superRefine(
                fieldConfig({
                  fieldType: 'select',
                  customData: {
                    sources: [
                      {
                        table: 'product',
                        displayKeys: ['title', 'stockQuantity'],
                        separator: ' - Stock: ',
                      },
                    ],
                    onValueChange: async (val, path, form) => {
                      const products = await db.product.get({ keys: [slug] });
                      const product = products.find(
                        (item) => item?._?.soul === val,
                      );
                      if (!product) return;
                      const [itemsKey, index] = path;

                      form.setValue(
                        [itemsKey, index, 'unitPrice'].join('.'),
                        product.sellingPrice,
                      );

                      if (product.unit) {
                        const [unitType, piecesPerUnit] =
                          product.unit.split(':');
                        if (piecesPerUnit) {
                          setUnitField(
                            z
                              .string()
                              .describe('Unit')
                              .superRefine(
                                fieldConfig({
                                  fieldType: 'unit',
                                  customData: {
                                    onlyAllow: [unitType, 'piece'],
                                    configDisabled: true,
                                    onValueChange(value, path, form) {
                                      const [, productQuantityPerUnit] =
                                        product.unit?.split(':') ?? [];
                                      const [, quantityPerUnit] =
                                        value?.split(':') ?? [];
                                      const [itemsKey, index] = path;

                                      if (quantityPerUnit) {
                                        if (product.sellingPrice)
                                          form.setValue(
                                            [itemsKey, index, 'unitPrice'].join(
                                              '.',
                                            ),
                                            product.sellingPrice,
                                          );
                                      } else {
                                        if (
                                          productQuantityPerUnit &&
                                          product.sellingPrice &&
                                          productQuantityPerUnit &&
                                          !isNaN(Number(productQuantityPerUnit))
                                        ) {
                                          form.setValue(
                                            [itemsKey, index, 'unitPrice'].join(
                                              '.',
                                            ),
                                            product.sellingPrice /
                                              Number(productQuantityPerUnit),
                                          );
                                        }
                                      }
                                    },
                                  },
                                }),
                              ),
                          );
                        } else {
                          setUnitField(
                            z
                              .string()
                              .describe('Unit')
                              .superRefine(
                                fieldConfig({
                                  fieldType: 'unit',
                                  customData: {
                                    onlyAllow: [unitType],
                                  },
                                }),
                              ),
                          );
                        }
                        form.setValue(
                          [itemsKey, index, 'unit'].join('.'),
                          product.unit,
                        );
                      }
                      refreshPaidAmount(form);
                    },
                  },
                }),
              ),
            unit: unitField,
            quantity: z
              .number({ coerce: true })
              .int()
              .positive()
              .describe('Quantity Sent')
              .superRefine(
                fieldConfig({
                  fieldType: 'number',
                  customData: {
                    onValueChange: ((value: string, path: string[], form) => {
                      refreshPaidAmount(form);
                      const items = form.getValues('products');
                      const [itemsKey, index] = path;
                      calculateTotalAmountForItem(
                        items,
                        itemsKey,
                        Number(index),
                        form,
                      );

                      return value;
                    }) as any,
                  },
                }),
              ),
            unitPrice: z
              .number({ coerce: true })
              .describe('Unit Price')
              .superRefine(
                fieldConfig({
                  fieldType: 'number',
                  customData: {
                    onValueChange: ((value: string, path: string[], form) => {
                      refreshPaidAmount(form);
                      const items = form.getValues('products');
                      const [itemsKey, index] = path;
                      calculateTotalAmountForItem(
                        items,
                        itemsKey,
                        Number(index),
                        form,
                      );

                      return value;
                    }) as any,
                  },
                }),
              ),
            totalAmount: z
              .number({ coerce: true })
              .describe('Total Amount')
              .superRefine(
                fieldConfig({
                  inputProps: {
                    readOnly: true,
                  },
                }),
              ),
          })
          .array()
          .min(1, { message: 'Please add at least one product.' })
          .describe('Products Sent on Trip'),
        returnedProducts: returnedProductsSchema,
      }),
    async onCreate(_, variables) {
      const products = await db.product.get({ keys: [slug] });
      const productsBySoul = new Map(
        products
          .filter((item) => item?._?.soul)
          .map((item) => [item._!.soul!, item]),
      );

      const itemsByProductIdWithQuantity = variables.products?.reduce(
        (a, { product, quantity, unit }) => {
          const productInfo = productsBySoul.get(product);
          if (!productInfo) return a;

          let adjustedQuantity = quantity;
          if (productInfo.unit && productInfo.unit.includes(':')) {
            const [unitType, piecesPerUnit] = productInfo.unit.split(':');

            if (unit === unitType) {
              adjustedQuantity = quantity * parseInt(piecesPerUnit, 10);
            }
          }

          a[product] = (a[product] || 0) + adjustedQuantity;
          return a;
        },
        {} as Record<string, number>,
      );

      Object.entries(itemsByProductIdWithQuantity ?? {}).forEach(
        ([productId, quantity]) => {
          const product = productsBySoul.get(productId);
          if (!product?._?.soul) return;
          void db.product.update(slug)({
            id: product._.soul,
            stockQuantity: product.stockQuantity - quantity,
          });
        },
      );
    },
    onUpdate(_) {
      console.log(
        'Trip update functionality would handle stock adjustments here',
      );
    },
    actions: ({ row }) => {
      if (row.original.returnTime) return null;

      return (
        <>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
            <button
              className="w-full"
              onClick={() =>
                openDialog({
                  title: 'Mark Return for Trip',
                  className: 'max-h-[80vh] overflow-y-auto',
                  children: (
                    <div className="p-6">
                      <div className="mb-6">
                        <h4 className="font-medium mb-2">
                          Products Dispatched:
                        </h4>
                        <div className="grid grid-cols-3 gap-2 text-sm font-medium mb-2">
                          <div>Product</div>
                          <div className="text-center">Sent</div>
                          <div className="text-center">Returned</div>
                        </div>
                        {row.original.products?.map((product, idx: number) => {
                          return (
                            <div
                              key={idx}
                              className="grid grid-cols-3 gap-2 text-sm"
                            >
                              <div>{product?.title || 'Unknown Product'}</div>
                              <div className="text-center">
                                {product.quantity}
                              </div>
                              <div className="text-center">0</div>
                            </div>
                          );
                        })}
                      </div>

                      <AutoForm
                        values={{
                          returnedProducts: (row.original.products ?? []).map(
                            (p) => ({
                              ...p,
                              totalAmount:
                                (p.quantity ?? 0) * (p.unitPrice ?? 0),
                            }),
                          ),
                        }}
                        schema={z.object({
                          returnedProducts: returnedProductsSchema,
                        })}
                        onSubmit={async (data) => {
                          const soldProducts = row.original.products
                            .map((dispatchedProduct) => {
                              const returnedProduct =
                                data.returnedProducts?.find(
                                  (rp) =>
                                    rp.product === dispatchedProduct.product,
                                );
                              const returnedQty = returnedProduct
                                ? returnedProduct.quantity
                                : 0;
                              const soldQty =
                                dispatchedProduct.quantity - returnedQty;

                              return {
                                productId: dispatchedProduct.product,
                                quantity: Math.max(0, soldQty),
                              };
                            })
                            .filter((sp: any) => sp.quantity > 0);

                          void db.trip.update(slug)({
                            id: row.original._?.soul ?? '',
                            returnTime: new Date().toISOString(),
                            returnedProducts: data.returnedProducts,
                          });

                          for (const returnedProduct of data.returnedProducts ??
                            []) {
                            const products = await db.product.get({
                              keys: [slug],
                            });
                            const product = products.find(
                              (item) =>
                                item?._?.soul === returnedProduct.product,
                            );
                            if (!product?._?.soul) return;

                            let adjustedQuantity = returnedProduct.quantity;

                            if (product.unit && product.unit.includes(':')) {
                              const [unitType, piecesPerUnit] =
                                product.unit.split(':');
                              if (returnedProduct.unit === unitType) {
                                adjustedQuantity =
                                  returnedProduct.quantity *
                                  parseInt(piecesPerUnit, 10);
                              }
                            }

                            void db.product.update(slug)({
                              id: product._.soul,
                              stockQuantity:
                                product.stockQuantity + adjustedQuantity,
                            });
                          }
                          if (soldProducts.length > 0) {
                            const products = await db.product.get({
                              keys: [slug],
                            });
                            const productsBySoul = new Map(
                              products
                                .filter((item) => item?._?.soul)
                                .map((item) => [item._!.soul!, item]),
                            );
                            const invoiceItems = soldProducts.map((item) => ({
                              product: item.productId,
                              quantity: item.quantity,
                              rate:
                                productsBySoul.get(item.productId)
                                  ?.sellingPrice || 0,
                              total:
                                item.quantity *
                                (productsBySoul.get(item.productId)
                                  ?.sellingPrice || 0),
                              vehicleId: row.original.vehicleId,
                            }));

                            const totalAmount = soldProducts.reduce(
                              (sum: number, item: any) =>
                                sum +
                                item.quantity *
                                  (productsBySoul.get(item.productId)
                                    ?.sellingPrice || 0),
                              0,
                            );

                            const vehicles = await db.vehicle.get({
                              keys: [slug],
                            });
                            const vehicle = vehicles.find(
                              (item) =>
                                item?._?.soul === row.original.vehicleId,
                            );

                            void db.invoice.create(slug)({
                              type: 'sale',
                              partyId: 'trip-sale',
                              issuedAt: new Date().toISOString(),
                              items: invoiceItems,
                              subTotal: totalAmount,
                              tax: 0,
                              paidAmount: totalAmount,
                              paymentStatus: 'paid' as any,
                              fiscalYear: calculateFiscalYear(),
                              vehicleId: row.original.vehicleId,
                              tripId: row.original._?.soul,
                              description: `Sale from trip ${row.original._?.soul} by ${vehicle?.name || 'vehicle'}`,
                            });

                            soldProducts.forEach((soldProduct: any) => {
                              const product = productsBySoul.get(
                                soldProduct.productId,
                              );
                              if (product && product._?.soul) {
                                void db.product.update(slug)({
                                  id: product._.soul,
                                  stockQuantity:
                                    product.stockQuantity -
                                    soldProduct.quantity,
                                });
                              }
                            });
                          }

                          const closeBtn = document.querySelector(
                            '[data-state="open"] [data-dismiss]',
                          );
                          if (closeBtn) (closeBtn as HTMLElement).click();
                        }}
                      >
                        <AutoFormSubmit className="w-full">
                          Mark Return
                        </AutoFormSubmit>
                      </AutoForm>
                    </div>
                  ),
                })
              }
            >
              Mark Return
            </button>
          </DropdownMenuItem>
        </>
      );
    },
  };
}

export function useRetailConfig({
  slug,
}: {
  slug: string;
}): BusinessConfigReturn['retail'] {
  'use memo';
  const salesConfig = useSalesConfig({ slug });
  const stockImportsConfig = useStockImportsConfig({ slug });
  const invoicesConfig = useInvoicesConfig({ slug });
  const partyConfig = usePartyConfig({ slug });
  const customerConfig = useCustomerConfig({ slug });
  const orderConfig = useOrderConfig({ slug });
  const vehicleConfig = useVehicleConfig({ slug });
  const tripConfig = useTripConfig({ slug });

  return [
    {
      schema: 'product',
      title: 'Products',
      slug,
      icon: ShoppingBag,
      group: 'Inventory',
    },
    partyConfig,
    customerConfig,
    stockImportsConfig,
    salesConfig,
    invoicesConfig,
    orderConfig,
    vehicleConfig,
    tripConfig,
  ];
}

export function useBusinessConfig({
  slug,
}: {
  slug: string;
}): BusinessConfigReturn {
  'use memo';
  const retail = useRetailConfig({ slug });
  return {
    retail,
  };
}
