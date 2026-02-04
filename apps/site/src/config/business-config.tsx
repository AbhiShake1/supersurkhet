import type { AutoTableTab } from "@/components/auto-admin";
import { AutoFormSubmit } from "@/components/ui/auto-form";
import { AutoForm, fieldConfig } from "@/components/ui/autoform";
import { Button } from "@/components/ui/button";
import {
  Credenza,
  CredenzaContent,
  CredenzaTrigger
} from "@/components/ui/credenza";
import {
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { ReceiptWrapper } from "@/components/ui/receipt-wrapper";
import { useDialog } from "@/contexts/dialog-context";
import { api } from "@/lib/api";
import { formatCurrency } from "@/lib/intl";
import type { BusinessType } from "@/lib/schema";
import { salesItemSchema, type Sale, type SalesItem, type StockImport } from "@/lib/schemas/sales";
import type { SchemaKeys } from "@gta/react-hooks";
import {
  Car,
  DollarSign,
  MapIcon,
  Receipt,
  ShoppingBag,
  ShoppingCart,
  Users,
  Users2
} from "lucide-react";
import NepaliDate from "nepali-datetime";
import { useEffect, useState } from "react";
import type { UseFormReturn } from "react-hook-form";
import z from "zod";

type AnyAutoTableTab = {
  [K in SchemaKeys]: AutoTableTab<K>
}[SchemaKeys];

export type BusinessConfigReturn = {
  [B in BusinessType]?: AnyAutoTableTab[];
}

function calculateFiscalYear() {
  const year = new NepaliDate().getYear()
  return `${year.toString().slice(0, 2)}${year.toString().slice(2)}/${(year + 1).toString().slice(2)}`
}

export type TransactionForm = UseFormReturn<StockImport | Sale>

function calculateTotalCost(form: UseFormReturn) {
  const formValues = form.getValues()
  if (!formValues?.items?.length) return 0

  return formValues.items.reduce((sum: number, item: any) => sum + (Number(item.quantity || 0) * Number(item.unitPrice || 0)), 0)
}

function getPaymentStatus(paidAmount: number, totalCost: number) {
  if (paidAmount === totalCost) return "paid"
  if (paidAmount === 0) return "pending"
  if (paidAmount > totalCost) return "overpaid (invalid)"
  return `partial (${formatCurrency(totalCost - paidAmount)} to pay)`
}

function refreshPaidAmount(form: UseFormReturn) {
  const totalCost = calculateTotalCost(form)
  // const [,a] = formValues
  if (!totalCost) return
  form.setValue("paidAmount", totalCost)
  const formValues = form.getValues()
  const paidAmount = formValues.paidAmount
  const paymentStatus = getPaymentStatus(paidAmount, totalCost)
  form.setValue("paymentStatus", paymentStatus)
}

function calculateTotalAmountForItem(items: any[], itemsKey: string, index: number, form: UseFormReturn) {
  if (items && items[index]) {
    const quantity = Number(items[index].quantity) || 0;
    const unitPrice = Number(items[index].unitPrice) || 0;
    const totalAmount = quantity * unitPrice;

    form.setValue([itemsKey, index, "totalAmount"].join("."), totalAmount);
  }
}

export function useStockImportsConfig({ slug }: { slug: string }): AutoTableTab<"stockImport"> {
  "use memo"
  const { data: parties = [] } = api.party.useGet({ keys: [slug] })
  const { data: products = [] } = api.product.useGet({ keys: [slug] })
  const { mutate: updateProduct } = api.product.useUpdate({ keys: [slug] })
  const { mutate: createInvoice } = api.invoice.useCreate({ keys: [slug] });
  const productsBySoul = new Map(
    products
      .filter(p => p?._?.soul)
      .map(p => [p._!.soul!, p])
  )

  const partiesBySoul = new Map(
    parties
      .filter(p => p?._?.soul)
      .map(p => [p._!.soul!, p])
  )

  function getDefaultUnitField() {
    return z.string().optional().describe("Unit").superRefine(fieldConfig({
      inputProps: {
        disabled: true,
        placeholder: "Select product for unit",
        className: "border-none"
      }
    }))
  }

  const [unitField, setUnitField] = useState<z.ZodType<any>>(getDefaultUnitField)

  useEffect(() => {
    return () => setUnitField(getDefaultUnitField())
  }, [])

  function getQuantityDescription() {
    return "Quantity"
  }

  return {
    schema: "stockImport",
    title: "Stock Imports",
    icon: ShoppingBag,
    slug,
    group: "Inventory",
    extender: (schema) => schema
      .extend({
        paidAmount: z.number({ coerce: true }).describe("Paid Amount").superRefine(fieldConfig({
          fieldType: "number",
          customData: {
            onValueChange: (paidAmount, __, form) => {
              const totalCost = calculateTotalCost(form)
              if (!totalCost) return
              form.setValue("paymentStatus", getPaymentStatus(Number(paidAmount), totalCost))
            },
          }
        })),
        items: salesItemSchema
          .extend({
            unit: unitField,
            product: z.string().describe("Product")
              .superRefine(fieldConfig({
                fieldType: "select",
                customData: {
                  sources: [{
                    table: "product",
                    displayKey: "title"
                  }],
                  onValueChange: (val, path, form) => {
                    const product = productsBySoul.get(val)
                    if (!product) return
                    const [itemsKey, index] = path

                    form.setValue([itemsKey, index, "unitPrice"].join("."), product.costPrice)
                    if (product.unit) {
                      const [unitType, piecesPerUnit] = product.unit.split(':');
                      if (piecesPerUnit) {
                        setUnitField(z.string().describe("Unit").superRefine(fieldConfig({
                          fieldType: "unit",
                          customData: {
                            onlyAllow: [unitType, "piece"],
                            configDisabled: true,
                            onValueChange(value, path, form) {
                              const [, productQuantityPerUnit] = product.unit?.split(':') ?? []
                              const [, quantityPerUnit] = value?.split(':') ?? []
                              const [itemsKey, index] = path

                              // if quantity exists in the unit, we dont want to use it as its the compound unit
                              if (quantityPerUnit) {
                                if (product.costPrice)
                                  form.setValue([itemsKey, index, "unitPrice"].join("."), product.costPrice)
                              } else {
                                if (productQuantityPerUnit && product.costPrice && productQuantityPerUnit && !isNaN(Number(productQuantityPerUnit))) {
                                  form.setValue([itemsKey, index, "unitPrice"].join("."), product.costPrice / Number(productQuantityPerUnit))
                                }
                              }
                            },
                          },
                        })))
                      } else {
                        setUnitField(z.string().describe("Unit").superRefine(fieldConfig({
                          fieldType: "unit",
                          customData: {
                            onlyAllow: [unitType],
                          },
                        })))
                      }
                      form.setValue([itemsKey, index, "unit"].join("."), product.unit)
                    }
                    refreshPaidAmount(form)
                  }
                },
              })),
            quantity: z.number({ coerce: true }).int().positive().describe(getQuantityDescription()).superRefine(fieldConfig({
              fieldType: "number",
              customData: {
                onValueChange: (value, path, form) => {
                  const [itemsKey, index] = path
                  const items = form.getValues("items")

                  // Calculate total for this item
                  calculateTotalAmountForItem(items, itemsKey, index, form)
                  refreshPaidAmount(form)
                },
              }
            })),
            unitPrice: z.number({ coerce: true }).describe("Unit Price").superRefine(fieldConfig({
              fieldType: "number",
              customData: {
                onValueChange: (value, path, form) => {
                  const [itemsKey, index] = path
                  const items = form.getValues("items")

                  // Calculate total for this item
                  calculateTotalAmountForItem(items, itemsKey, index, form)
                  refreshPaidAmount(form)
                },
              }
            })),
          })
          .array()
          .min(1, { message: "Please add at least one item." })
          .describe("Items to Import"),
      })
      .superRefine((stockImport, ctx) => {
        if (!stockImport.paidAmount) return
        const totalCost = stockImport.items.reduce((sum, item) => sum + (Number(item.quantity || 0) * Number(item.unitPrice || 0)), 0)
        if (stockImport.paidAmount > totalCost) ctx.addIssue({
          code: "custom",
          message: `Paid amount cannot be greater than total cost (${totalCost})`,
          path: ["paidAmount"],
        })
      }),
    previewOverrides: {
      party: (partyId) => partiesBySoul.get(partyId)?.name ?? "-",
      items: (items) => {
        const mapped = items?.map((item: SalesItem) => ({
          ...item,
          product: productsBySoul.get(item.product)?.title ?? "-",
        }))
        if (!mapped) return
        mapped["#"] = items?.["#"]
        return mapped
      },
    },
    onCreate(_, variables) {
      // Stock update logic with unit conversion
      const itemsByProductIdWithQuantity = variables.items?.reduce((a, { product, quantity, unit }) => {
        // Check if the product unit has pieces info (e.g., "cartoon:10")
        const productInfo = productsBySoul.get(product);
        if (!productInfo) return a;

        let adjustedQuantity = quantity;
        if (productInfo.unit && productInfo.unit.includes(':')) {
          const [unitType, piecesPerUnit] = productInfo.unit.split(':');

          // If the import unit matches the product's base unit type, convert to pieces
          if (unit === unitType) {
            adjustedQuantity = quantity * parseInt(piecesPerUnit, 10);
          }
        }

        a[product] = (a[product] || 0) + adjustedQuantity;
        return a;
      }, {} as Record<string, number>);

      Object.entries(itemsByProductIdWithQuantity ?? {}).forEach(([productId, quantity]) => {
        const product = productsBySoul.get(productId)
        if (!product?._?.soul) return
        updateProduct({ id: product?._?.soul, stockQuantity: product?.stockQuantity + quantity })
      })

      // Create corresponding invoice
      const invoiceItems = variables.items?.map((item) => {
        // Adjust quantity for invoice based on unit conversion
        const productInfo = productsBySoul.get(item.product);
        let adjustedQuantity = item.quantity;

        if (productInfo?.unit && productInfo.unit.includes(':')) {
          const [unitType, piecesPerUnit] = productInfo.unit.split(':');

          // If the import unit matches the product's base unit type, convert to pieces for inventory tracking
          if (item.unit === unitType) {
            adjustedQuantity = item.quantity * parseInt(piecesPerUnit, 10);
          }
        }

        return {
          product: item.product,
          quantity: adjustedQuantity,
          rate: item.unitPrice,
          total: item.quantity * item.unitPrice
        };
      }) ?? [];

      const totalAmount = variables.items?.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0) ?? 0;

      createInvoice({
        type: "purchase",
        partyId: variables.party,
        issuedAt: variables.importDate,
        items: invoiceItems,
        subTotal: totalAmount,
        tax: 0,
        paidAmount: variables.paidAmount || 0,
        paymentStatus: variables.paymentStatus || "pending" as any,
        fiscalYear: calculateFiscalYear()
      });
    },
    // onUpdate(_, variables) {
    //   // const itemsByProductIdWithQuantity = variables.items?.reduce((a, { product, quantity }) => ((a[product] = (a[product] || 0) + quantity), a), {} as Record<string, number>)
    //   // Object.entries(itemsByProductIdWithQuantity ?? {}).forEach(([productId, quantity]) => {
    //   //   const product = productsBySoul.get(productId)
    //   //   if (!product?._?.soul) return
    //   //   updateProduct({ id: product?._
    // }
  }
}

export function useCustomerConfig({ slug }: { slug: string }): AutoTableTab<"customer"> {
  "use memo"
  const { openDialog, closeDialog } = useDialog()
  const { data: invoices = [] } = api.invoice.useGet({ keys: [slug] });
  const { mutate: deleteInvoice } = api.invoice.useDelete({ keys: [slug] });
  const { data: sales = [] } = api.sale.useGet({ keys: [slug] });
  const { mutate: deleteSale } = api.sale.useDelete({ keys: [slug] });

  function deleteInvoiceByCustomerId(id: string) {
    for (const sale of sales) {
      if (sale.customerId === id && !!sale._?.soul) {
        deleteSale(sale._.soul)
      }
    }
    for (const invoice of invoices) {
      if (invoice.partyId === id && !!invoice._?.soul) {
        deleteInvoice(invoice._.soul)
      }
    }
    closeDialog()
  }
  return {
    schema: "customer",
    title: "Customers",
    slug,
    icon: Users,
    group: "Party",
    onDelete(_, id) {
      if (!invoices.length) return
      if (!invoices.some(invoice => invoice.partyId === id)) return
      openDialog({
        title: "Delete Invoices",
        description: "The customer has been deleted. Do you want to delete all associated invoices?",
        children: <div className="flex gap-2 items-center">
          <Button variant="outline" size="sm" onClick={() => closeDialog()}>Cancel</Button>
          <Button variant="destructive" size="sm" onClick={() => deleteInvoiceByCustomerId(id)}>Delete</Button>
        </div>
      })
    }
  }
}

export function usePartyConfig({ slug }: { slug: string }): AutoTableTab<"party"> {
  "use memo"
  const { openDialog, closeDialog } = useDialog()
  const { data: invoices = [] } = api.invoice.useGet({ keys: [slug] });
  const { mutate: deleteInvoice } = api.invoice.useDelete({ keys: [slug] });
  const { data: stockImports = [] } = api.stockImport.useGet({ keys: [slug] });
  const { mutate: deleteStockImport } = api.stockImport.useDelete({ keys: [slug] });
  function deleteInvoiceByPartyId(id: string) {
    for (const stockImport of stockImports) {
      if (stockImport.party === id && !!stockImport._?.soul) {
        deleteStockImport(stockImport._.soul)
      }
    }
    for (const invoice of invoices) {
      if (invoice.partyId === id && !!invoice._?.soul) {
        deleteInvoice(invoice._.soul)
      }
    }
    closeDialog()
  }
  return {
    schema: "party",
    title: "Purchase Parties",
    slug,
    icon: Users2,
    group: "Party",
    onDelete(_, id) {
      if (!invoices.length) return
      if (!invoices.some(invoice => invoice.partyId === id)) return
      openDialog({
        title: "Delete Invoices",
        description: "The party has been deleted. Do you want to delete all associated invoices?",
        children: <div className="flex gap-2 items-center">
          <Button variant="outline" size="sm" onClick={() => closeDialog()}>Cancel</Button>
          <Button variant="destructive" size="sm" onClick={() => deleteInvoiceByPartyId(id)}>Delete</Button>
        </div>
      })
    }
  }
}

export function useSalesConfig({ slug }: { slug: string }): AutoTableTab<"sale"> {
  "use memo"
  const { data: products = [] } = api.product.useGet({
    keys: [slug],
  })
  const { mutate: updateProduct } = api.product.useUpdate({ keys: [slug] })
  const { mutate: createInvoice } = api.invoice.useCreate({ keys: [slug] });
  const { data: customers = [] } = api.customer.useGet({ keys: [slug] });
  const { data: orders = [] } = api.order.useGet({ keys: [slug] });
  const productsBySoul = new Map(
    products
      .filter(p => p?._?.soul)
      .map(p => [p._!.soul!, p])
  )

  const customersBySoul = new Map(
    customers
      .filter(p => p?._?.soul)
      .map(p => [p._!.soul!, p])
  )

  const ordersBySoul = new Map(
    orders
      .filter(p => p?._?.soul)
      .map(p => [p._!.soul!, p])
  )

  function getDefaultUnitField() {
    return z.string().optional().describe("Unit").superRefine(fieldConfig({
      inputProps: {
        disabled: true,
        placeholder: "Select product for unit",
        className: "border-none"
      }
    }))
  }

  const [unitField, setUnitField] = useState<z.ZodType<any>>(getDefaultUnitField)

  return {
    schema: "sale",
    title: "Sales",
    icon: DollarSign,
    group: "Inventory",
    slug,
    previewOverrides: {
      customerId: (customerId) => customersBySoul.get(customerId)?.name ?? "-",
      items: (items) => {
        const mapped = items?.map((item: SalesItem) => ({
          ...item,
          product: productsBySoul.get(item.product)?.title ?? "-",
          totalAmount: (Number(item.quantity || 0) * Number(item.unitPrice || 0))
        }))
        if (!mapped) return
        mapped["#"] = items?.["#"]
        return mapped
      },
    },
    extender: (schema) => schema
      .extend({
        paidAmount: z.number({ coerce: true }).describe("Paid Amount").superRefine(fieldConfig({
          fieldType: "number",
          customData: {
            onValueChange: (_paidAmount, __, form) => {
              const paidAmount = Number(_paidAmount)
              const totalCost = calculateTotalCost(form)
              form.setValue("paymentStatus", getPaymentStatus(paidAmount, totalCost))
            },
          }
        })),
        items: salesItemSchema
          .extend({
            product: z.string().describe("Product")
              .superRefine(fieldConfig({
                fieldType: "select",
                customData: {
                  sources: [{
                    table: "product",
                    displayKeys: ["title", "stockQuantity"],
                    separator: " - Stock: "
                  }],
                  onValueChange: (val, path, form) => {
                    const product = productsBySoul.get(val)
                    if (!product) return
                    const [itemsKey, index] = path

                    form.setValue([itemsKey, index, "unitPrice"].join("."), product.sellingPrice)

                    if (product.unit) {
                      const [unitType, piecesPerUnit] = product.unit.split(':');
                      if (piecesPerUnit) {
                        setUnitField(z.string().describe("Unit").superRefine(fieldConfig({
                          fieldType: "unit",
                          customData: {
                            onlyAllow: [unitType, "piece"],
                            configDisabled: true
                          },
                        })))
                      } else {
                        setUnitField(z.string().describe("Unit").superRefine(fieldConfig({
                          fieldType: "unit",
                          customData: {
                            onlyAllow: [unitType],
                          },
                        })))
                      }
                      form.setValue([itemsKey, index, "unit"].join("."), product.unit)
                    }

                    refreshPaidAmount(form)
                  }
                },
              })),
            unit: unitField,
            quantity: z.number({ coerce: true }).int().positive()
              .describe("Quantity")
              .superRefine(fieldConfig({
                fieldType: "number",
                customData: {
                  onValueChange: ((value: string, path: string[], form: UseFormReturn) => {
                    refreshPaidAmount(form);
                    const items = form.getValues('items');
                    const [itemsKey, index] = path;
                    calculateTotalAmountForItem(items, itemsKey, Number(index), form);

                    return value;
                  }) as any,
                }
              })),
            unitPrice: z.number({ coerce: true }).describe("Unit Price").superRefine(fieldConfig({
              fieldType: "number",
              customData: {
                onValueChange: ((value: string, path: string[], form: UseFormReturn) => {
                  refreshPaidAmount(form);
                  const items = form.getValues('items');
                  const [itemsKey, index] = path;
                  calculateTotalAmountForItem(items, itemsKey, Number(index), form);

                  return value;
                }) as any,
              }
            })),
          })
          .array()
          .min(1, { message: "Please add at least one item." })
          .superRefine((items, ctx) => {
            items.forEach((item, index) => {
              const product = productsBySoul.get(item.product)

              if (!product) return

              // Handle stock checking based on unit configuration
              let availableStock = product.stockQuantity;

              // If product unit has pieces info (e.g., "cartoon:10"), adjust stock calculation
              if (product.unit && product.unit.includes(':')) {
                const [unitType, piecesPerUnit] = product.unit.split(':');

                // If the sale unit matches the product's base unit type, convert stock to pieces for comparison
                if (item.unit === unitType) {
                  availableStock = product.stockQuantity * parseInt(piecesPerUnit, 10);
                }
              }

              if (item.quantity > availableStock) {
                ctx.addIssue({
                  code: z.ZodIssueCode.custom,
                  message: `Only ${availableStock} items of ${product.title} available in stock`,
                  path: [index, "quantity"],
                })
              }
            })
          })
          .describe("Items Sold"),
      })
      .superRefine((sale, ctx) => {
        if (!sale.paidAmount) return
        const totalCost = sale.items.reduce((sum, item) => sum + (Number(item.quantity || 0) * Number(item.unitPrice || 0)), 0)
        if (sale.paidAmount > totalCost) ctx.addIssue({
          code: "custom",
          message: `Paid amount cannot be greater than total cost (${totalCost})`,
          path: ["paidAmount"],
        })
      }),
    onCreate(_, variables) {
      // Stock update logic with unit conversion
      const itemsByProductIdWithQuantity = variables.items?.reduce((a, { product, quantity, unit }) => {
        // Check if the product unit has pieces info (e.g., "cartoon:10")
        const productInfo = productsBySoul.get(product);
        if (!productInfo) return a;

        let adjustedQuantity = quantity;
        if (productInfo.unit && productInfo.unit.includes(':')) {
          const [unitType, piecesPerUnit] = productInfo.unit.split(':');

          // If the sale unit matches the product's base unit type, convert to pieces
          if (unit === unitType) {
            adjustedQuantity = quantity * parseInt(piecesPerUnit, 10);
          }
        }

        a[product] = (a[product] || 0) + adjustedQuantity;
        return a;
      }, {} as Record<string, number>);

      Object.entries(itemsByProductIdWithQuantity ?? {}).forEach(([productId, quantity]) => {
        const product = productsBySoul.get(productId);
        if (!product?._?.soul) return;
        updateProduct({ id: product._.soul, stockQuantity: product.stockQuantity - quantity });
      });

      // Create corresponding invoice
      const invoiceItems = variables.items?.map((item) => {
        // Adjust quantity for invoice based on unit conversion
        const productInfo = productsBySoul.get(item.product);
        let adjustedQuantity = item.quantity;

        if (productInfo?.unit && productInfo.unit.includes(':')) {
          const [unitType, piecesPerUnit] = productInfo.unit.split(':');

          // If the sale unit matches the product's base unit type, convert to pieces for inventory tracking
          if (item.unit === unitType) {
            adjustedQuantity = item.quantity * parseInt(piecesPerUnit, 10);
          }
        }

        return {
          product: item.product,
          quantity: adjustedQuantity,
          rate: item.unitPrice,
          total: item.quantity * item.unitPrice
        };
      }) ?? []

      const totalAmount = variables.items?.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0) ?? 0;

      createInvoice({
        type: "sale",
        partyId: variables.customerId,
        issuedAt: variables.saleDate,
        items: invoiceItems,
        subTotal: totalAmount,
        tax: 0,
        paidAmount: variables.paidAmount || 0,
        paymentStatus: variables.paymentStatus || "pending" as any,
        fiscalYear: calculateFiscalYear()
      });
    },
    onUpdate(_) {
      // const itemsByProductIdWithQuantity = variables.items?.reduce((a, { product, uantity }) => ((a[product] = (a[product] || 0) + quantity), a), {} as Record<string, number>)
      // Object.entries(itemsByProductIdWithQuantity ?? {}).forEach(([productId, quantity]) => {
      //   const product = productsBySoul.get(productId)
      //   if (!product?._?.soul) return
      //   updateProduct({ id: product?._?.soul, stockQuantity: product?.stockQuantity + quantity })
      // })
    },
  }
}

export function useOrderConfig({ slug }: { slug: string }): AutoTableTab<"order"> {
  "use memo"
  const { data: products = [] } = api.product.useGet({
    keys: [slug],
  })
  const { mutate: updateProduct } = api.product.useUpdate({ keys: [slug] })
  const { mutate: createInvoice } = api.invoice.useCreate({ keys: [slug] });
  const { data: customers = [] } = api.customer.useGet({ keys: [slug] });

  const productsBySoul = new Map(
    products
      .filter(p => p?._?.soul)
      .map(p => [p._!.soul!, p])
  )

  const customersBySoul = new Map(
    customers
      .filter(p => p?._?.soul)
      .map(p => [p._!.soul!, p])
  )

  function getDefaultUnitField() {
    return z.string().optional().describe("Unit").superRefine(fieldConfig({
      inputProps: {
        disabled: true,
        placeholder: "Select product for unit",
        className: "border-none"
      }
    }))
  }

  const [unitField, setUnitField] = useState<z.ZodType<any>>(getDefaultUnitField)

  return {
    schema: "order",
    title: "Orders",
    icon: ShoppingCart,
    group: "Inventory",
    slug,
    previewOverrides: {
      customerId: (customerId) => customersBySoul.get(customerId)?.name ?? "-",
      items: (items) => {
        const mapped = items?.map((item: SalesItem) => ({
          ...item,
          product: productsBySoul.get(item.product)?.title ?? "-",
        }))
        if (!mapped) return
        mapped["#"] = items?.["#"]
        return mapped
      },
    },

    extender: (schema) => schema
      .extend({
        paidAmount: z.number({ coerce: true }).describe("Paid Amount").superRefine(fieldConfig({
          fieldType: "number",
          customData: {
            onValueChange: (_paidAmount, __, form) => {
              const paidAmount = Number(_paidAmount)
              const totalCost = calculateTotalCost(form)
              form.setValue("paymentStatus", getPaymentStatus(paidAmount, totalCost))
            },
          }
        })),
        items: salesItemSchema
          .extend({
            product: z.string().describe("Product")
              .superRefine(fieldConfig({
                fieldType: "select",
                customData: {
                  sources: [{
                    table: "product",
                    displayKeys: ["title", "stockQuantity"],
                    separator: " - Stock: "
                  }],
                  onValueChange: (val, path, form) => {
                    const product = productsBySoul.get(val)

                    if (!product) return
                    const [itemsKey, index] = path

                    form.setValue([itemsKey, index, "unitPrice"].join("."), product.sellingPrice)

                    if (product.unit) {
                      const [unitType, piecesPerUnit] = product.unit.split(':');
                      if (piecesPerUnit) {
                        setUnitField(z.string().describe("Unit").superRefine(fieldConfig({
                          fieldType: "unit",
                          customData: {
                            onlyAllow: [unitType, "piece"],
                            configDisabled: true
                          },
                        })))
                      } else {
                        setUnitField(z.string().describe("Unit").superRefine(fieldConfig({
                          fieldType: "unit",
                          customData: {
                            onlyAllow: [unitType],
                          },
                        })))
                      }
                      form.setValue([itemsKey, index, "unit"].join("."), product.unit)
                    }

                    refreshPaidAmount(form)
                  }
                },
              })),
            unit: unitField,
            quantity: z.number({ coerce: true }).int().positive()
              .describe("Quantity")
              .superRefine(fieldConfig({
                fieldType: "number",
                customData: {
                  onValueChange: ((value: string, path: string[], form: UseFormReturn) => {
                    refreshPaidAmount(form);
                    const items = form.getValues('items');
                    const [itemsKey, index] = path;
                    calculateTotalAmountForItem(items, itemsKey, Number(index), form);

                    return value;
                  }) as any,
                }
              })),
            unitPrice: z.number({ coerce: true }).describe("Unit Price").superRefine(fieldConfig({
              fieldType: "number",
              customData: {
                onValueChange: ((value: string, path: string[], form: UseFormReturn) => {
                  refreshPaidAmount(form);
                  const items = form.getValues('items');
                  const [itemsKey, index] = path;
                  calculateTotalAmountForItem(items, itemsKey, Number(index), form);

                  return value;
                }) as any,
              }
            })),
            totalAmount: z.number({ coerce: true }).describe("Total Amount").superRefine(fieldConfig({
              inputProps: {
                readOnly: true,
              }
            })),
          })
          .array()
          .min(1, { message: "Please add at least one item." })
          .superRefine((items, ctx) => {
            items.forEach((item, index) => {
              const product = productsBySoul.get(item.product)

              if (!product) return

              // Handle stock checking based on unit configuration
              let availableStock = product.stockQuantity;

              // If product unit has pieces info (e.g., "cartoon:10"), adjust stock calculation
              if (product.unit && product.unit.includes(':')) {
                const [unitType, piecesPerUnit] = product.unit.split(':');

                // If the sale unit matches the product's base unit type, convert stock to pieces for comparison
                if (item.unit === unitType) {
                  availableStock = product.stockQuantity * parseInt(piecesPerUnit, 10);
                }
              }

              if (item.quantity > availableStock) {
                ctx.addIssue({
                  code: z.ZodIssueCode.custom,
                  message: `Only ${availableStock} items of ${product.title} available in stock`,
                  path: [index, "quantity"],
                })
              }
            })
          })
          .describe("Items Ordered"),
        orderStatus: z.enum(["pending", "done", "cancelled"]).describe("Order Status").superRefine(fieldConfig({
          fieldType: "select",
          customData: {
            options: [
              ["pending", "Pending"],
              ["done", "Done"],
              ["cancelled", "Cancelled"],
            ],
            disableWhenValueIn: ["done", "cancelled"],
          }
        })).default("pending"),
      })
      .superRefine((order, ctx) => {
        if (!order.paidAmount) return
        const totalCost = order.items.reduce((sum, item) => sum + (Number(item.quantity || 0) * Number(item.unitPrice || 0)), 0)
        if (order.paidAmount > totalCost) ctx.addIssue({
          code: "custom",
          message: `Paid amount cannot be greater than total cost (${totalCost})`,
          path: ["paidAmount"],
        })
      }),
    onCreate(_, variables) {
      // ONLY create invoice if the order status is 'done'
      if (variables.orderStatus === "done") {
        const itemsByProductIdWithQuantity = variables.items?.reduce((a, item) => {
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
        }, {} as Record<string, number>);

        Object.entries(itemsByProductIdWithQuantity ?? {}).forEach(([productId, quantity]) => {
          const product = productsBySoul.get(productId);
          if (!product?._?.soul) return;
          updateProduct({ id: product._.soul, stockQuantity: product.stockQuantity - quantity });
        });

        const invoiceItems = variables.items?.map((item) => {
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
            total: item.quantity * item.unitPrice
          };
        }) ?? []

        const totalAmount = variables.items?.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0) ?? 0;

        createInvoice({
          type: "sale",
          partyId: variables.customerId,
          issuedAt: new Date().toISOString(),
          items: invoiceItems,
          subTotal: totalAmount,
          tax: 0,
          paidAmount: variables.paidAmount || 0,
          paymentStatus: variables.paymentStatus || "pending" as any,
          fiscalYear: calculateFiscalYear()
        });
      }
    },
    onUpdate(_, variables) {
      if (variables.orderStatus !== "done") return;
      const currentOrder = ordersBySoul.get(variables.id);
      const order = { ...currentOrder, ...variables } as any;
      if (!order?.items?.length || !order?.customerId) return;

      const itemsByProductIdWithQuantity = order.items?.reduce((a: Record<string, number>, item: any) => {
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
      }, {} as Record<string, number>);

      Object.entries(itemsByProductIdWithQuantity ?? {}).forEach(([productId, quantity]) => {
        const product = productsBySoul.get(productId);
        if (!product?._?.soul) return;
        updateProduct({ id: product._.soul, stockQuantity: product.stockQuantity - quantity });
      });

      const invoiceItems = order.items?.map((item: any) => {
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
          total: item.quantity * item.unitPrice
        };
      }) ?? [];

      const totalAmount = order.items?.reduce(
        (sum: number, item: any) => sum + (item.quantity * item.unitPrice),
        0
      ) ?? 0;

      createInvoice({
        type: "sale",
        partyId: order.customerId,
        issuedAt: new Date().toISOString(),
        items: invoiceItems,
        subTotal: totalAmount,
        tax: 0,
        paidAmount: order.paidAmount || 0,
        paymentStatus: order.paymentStatus || "pending" as any,
        fiscalYear: calculateFiscalYear()
      });
    },
  }
}

export function useInvoicesConfig({ slug }: { slug: string }): AutoTableTab<"invoice"> {
  "use memo"
  const { data: products = [] } = api.product.useGet({ keys: [slug] });
  const { data: trips = [] } = api.trip.useGet({ keys: [slug] });
  const { data: parties = [] } = api.party.useGet({ keys: [slug] });
  const { data: customers = [] } = api.customer.useGet({ keys: [slug] });
  const { data: vehicles = [] } = api.vehicle.useGet({ keys: [slug] });

  const vehiclesBySoul = new Map(
    vehicles
      .filter(v => v?._?.soul)
      .map(v => [v._!.soul!, v])
  )

  const tripsBySoul = new Map(
    trips
      .filter(v => v?._?.soul)
      .map(v => [v._!.soul!, v])
  )

  const productsBySoul = new Map(
    products
      .filter(p => p?._?.soul)
      .map(p => [p._!.soul!, p])
  )

  const partiesBySoul = new Map(
    parties
      .filter(p => p?._?.soul)
      .map(p => [p._!.soul!, p])
  )
  const customersBySoul = new Map(
    customers
      .filter(p => p?._?.soul)
      .map(p => [p._!.soul!, p])
  )

  return {
    schema: "invoice",
    title: "Invoices",
    group: "Financial",
    readOnly: true,
    slug,
    icon: Receipt,
    actions: ({ row }) => {
      const partyId = row.original.partyId
      if (!partyId) return null
      const party = partiesBySoul.get(partyId) || customersBySoul.get(partyId) || vehiclesBySoul.get(partyId);
      if (!party) return null
      return (
        <DropdownMenuItem onSelect={e => e.preventDefault()}>
          <Credenza>
            <CredenzaTrigger >
              View Receipt
            </CredenzaTrigger>
            <CredenzaContent>
              <ReceiptWrapper
                invoice={row.original}
                party={party}
                productsById={productsBySoul}
              />
            </CredenzaContent>
          </Credenza>
        </DropdownMenuItem>
      );
    },
    previewOverrides: {
      partyId: (id) => partiesBySoul.get(id)?.name || customersBySoul.get(id)?.name || "-",
      vehicleId: (id) => vehiclesBySoul.get(id)?.name || "-",
      tripId: (id) => {
        const trip = tripsBySoul.get(id)
        if (!trip) return "-"
        return [trip.destination, [trip.dispatchTime, trip.returnTime].filter(Boolean).join(' - ')].join(' | ')
      },
      issuedAt: (date) => date ? new Date(date).toLocaleString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      }) : "-",
      dueDate: (date) => date ? new Date(date).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric"
      }) : "-",
      items: (items) => {
        const mapped = items?.map((item: SalesItem) => ({
          ...item,
          product: productsBySoul.get(item.product)?.title ?? "-",
        }))
        if (!mapped) return
        mapped["#"] = items?.["#"]
        return mapped
      },
    },
  }
}

export function useVehicleConfig({ slug }: { slug: string }): AutoTableTab<"vehicle"> {
  "use memo"
  return {
    schema: "vehicle",
    title: "Vehicles",
    slug,
    icon: Car,
    group: "Logistics",
  }
}

function useReturnProductsSchema({ slug }: { slug: string }) {
  const { data: products = [] } = api.product.useGet({ keys: [slug] });

  const productsBySoul = new Map(
    products
      .filter(p => p?._?.soul)
      .map(p => [p._!.soul!, p])
  )

  function getDefaultUnitField() {
    return z.string().optional().describe("Unit").superRefine(fieldConfig({
      inputProps: {
        disabled: true,
        placeholder: "Select product for unit",
        className: "border-none"
      }
    }))
  }

  const [unitField, setUnitField] = useState<z.ZodType<any>>(getDefaultUnitField)

  useEffect(() => {
    return () => setUnitField(getDefaultUnitField())
  }, [])

  return salesItemSchema
    .extend({
      product: z.string().describe("Product")
        .superRefine(fieldConfig({
          fieldType: "select",
          customData: {
            sources: [{
              table: "product",
              displayKey: "title"
            }],
            onValueChange: (val, path, form) => {
              const product = productsBySoul.get(val)
              if (!product) return
              const [itemsKey, index] = path

              form.setValue([itemsKey, index, "unitPrice"].join("."), product.sellingPrice)

              if (product.unit) {
                const [unitType, piecesPerUnit] = product.unit.split(':');
                if (piecesPerUnit) {
                  setUnitField(z.string().describe("Unit").superRefine(fieldConfig({
                    fieldType: "unit",
                    customData: {
                      onlyAllow: [unitType, "piece"],
                      configDisabled: true,
                      onValueChange(value, path, form) {
                        const [, productQuantityPerUnit] = product.unit?.split(':') ?? []
                        const [, quantityPerUnit] = value?.split(':') ?? []
                        const [itemsKey, index] = path

                        // if quantity exists in the unit, we dont want to use it as its the compound unit
                        if (quantityPerUnit) {
                          if (product.sellingPrice)
                            form.setValue([itemsKey, index, "unitPrice"].join("."), product.sellingPrice)
                        } else {
                          if (productQuantityPerUnit && product.sellingPrice && productQuantityPerUnit && !isNaN(Number(productQuantityPerUnit))) {
                            form.setValue([itemsKey, index, "unitPrice"].join("."), product.sellingPrice / Number(productQuantityPerUnit))
                          }
                        }
                      },
                    },
                  })))
                } else {
                  setUnitField(z.string().describe("Unit").superRefine(fieldConfig({
                    fieldType: "unit",
                    customData: {
                      onlyAllow: [unitType],
                    },
                  })))
                }
                form.setValue([itemsKey, index, "unit"].join("."), product.unit)
              }
              refreshPaidAmount(form)
            }
          },
        })),
      unit: unitField,
      quantity: z.number({ coerce: true }).int().nonnegative()
        .describe("Quantity Returned")
        .superRefine(fieldConfig({
          fieldType: "number",
          customData: {
            onValueChange: ((value: string, path: string[], form: UseFormReturn) => {

              const items = form.getValues('returnedProducts');
              const [itemsKey, index] = path;
              calculateTotalAmountForItem(items, itemsKey, Number(index), form);

              return value;
            }) as any,
          }
        })),
      unitPrice: z.number({ coerce: true }).describe("Unit Price").superRefine(fieldConfig({
        fieldType: "number",
        customData: {
          onValueChange: ((value: string, path: string[], form: UseFormReturn) => {

            const items = form.getValues('returnedProducts');
            const [itemsKey, index] = path;
            calculateTotalAmountForItem(items, itemsKey, Number(index), form);

            return value;
          }) as any,
        }
      })),
      totalAmount: z.number({ coerce: true }).describe("Total Amount").superRefine(fieldConfig({
        inputProps: {
          readOnly: true,
        }
      }))
    })
    .array()
    .optional()
    .describe("Products Returned from Trip")
}

export function useTripConfig({ slug }: { slug: string }): AutoTableTab<"trip"> {
  "use memo"
  const { data: vehicles = [] } = api.vehicle.useGet({ keys: [slug] });
  const { data: products = [] } = api.product.useGet({ keys: [slug] });
  const { mutate: updateTrip } = api.trip.useUpdate({ keys: [slug] });
  const { mutate: createInvoice } = api.invoice.useCreate({ keys: [slug] });
  const { mutate: updateProduct } = api.product.useUpdate({ keys: [slug] });
  const returnedProductsSchema = useReturnProductsSchema({ slug });

  const vehiclesBySoul = new Map(
    vehicles
      .filter(v => v?._?.soul)
      .map(v => [v._!.soul!, v])
  )

  const productsBySoul = new Map(
    products
      .filter(p => p?._?.soul)
      .map(p => [p._!.soul!, p])
  )

  function getDefaultUnitField() {
    return z.string().optional().describe("Unit").superRefine(fieldConfig({
      inputProps: {
        disabled: true,
        placeholder: "Select product for unit",
        className: "border-none"
      }
    }))
  }

  const { openDialog, closeDialog } = useDialog()

  const [unitField, setUnitField] = useState<z.ZodType<any>>(getDefaultUnitField)

  useEffect(() => {
    return () => setUnitField(getDefaultUnitField())
  }, [])

  return {
    schema: "trip",
    title: "Trips",
    slug,
    icon: MapIcon,
    group: "Logistics",
    previewOverrides: {
      vehicleId: (vehicleId) => vehiclesBySoul.get(vehicleId)?.name ?? "-",
      products: (items) => {
        const mapped = items?.map((item: SalesItem) => ({
          ...item,
          product: productsBySoul.get(item.product)?.title ?? "-",
          totalAmount: (Number(item.quantity || 0) * Number(item.unitPrice || 0))
        }))
        if (!mapped) return
        mapped["#"] = items?.["#"]
        return mapped
      },
      returnedProducts: (items) => {
        const mapped = items?.map((item: SalesItem) => ({
          ...item,
          product: productsBySoul.get(item.product)?.title ?? "-",
          totalAmount: (Number(item.quantity || 0) * Number(item.unitPrice || 0))
        }))
        if (!mapped) return
        mapped["#"] = items?.["#"]
        return mapped
      },
    },
    extender: (schema) => schema.extend({
      products: salesItemSchema
        .extend({
          product: z.string().describe("Product")
            .superRefine(fieldConfig({
              fieldType: "select",
              customData: {
                sources: [{
                  table: "product",
                  displayKeys: ["title", "stockQuantity"],
                  separator: " - Stock: "
                }],
                onValueChange: (val, path, form) => {
                  const product = productsBySoul.get(val)
                  if (!product) return
                  const [itemsKey, index] = path

                  form.setValue([itemsKey, index, "unitPrice"].join("."), product.sellingPrice)

                  if (product.unit) {
                    const [unitType, piecesPerUnit] = product.unit.split(':');
                    if (piecesPerUnit) {
                      setUnitField(z.string().describe("Unit").superRefine(fieldConfig({
                        fieldType: "unit",
                        customData: {
                          onlyAllow: [unitType, "piece"],
                          configDisabled: true,
                          onValueChange(value, path, form) {
                            const [, productQuantityPerUnit] = product.unit?.split(':') ?? []
                            const [, quantityPerUnit] = value?.split(':') ?? []
                            const [itemsKey, index] = path

                            // if quantity exists in the unit, we dont want to use it as its the compound unit
                            if (quantityPerUnit) {
                              if (product.sellingPrice)
                                form.setValue([itemsKey, index, "unitPrice"].join("."), product.sellingPrice)
                            } else {
                              if (productQuantityPerUnit && product.sellingPrice && productQuantityPerUnit && !isNaN(Number(productQuantityPerUnit))) {
                                form.setValue([itemsKey, index, "unitPrice"].join("."), product.sellingPrice / Number(productQuantityPerUnit))
                              }
                            }
                          },
                        },
                      })))
                    } else {
                      setUnitField(z.string().describe("Unit").superRefine(fieldConfig({
                        fieldType: "unit",
                        customData: {
                          onlyAllow: [unitType],
                        },
                      })))
                    }
                    form.setValue([itemsKey, index, "unit"].join("."), product.unit)
                  }
                  refreshPaidAmount(form)
                }
              },
            })),
          unit: unitField,
          quantity: z.number({ coerce: true }).int().positive()
            .describe("Quantity Sent")
            .superRefine(fieldConfig({
              fieldType: "number",
              customData: {
                onValueChange: ((value: string, path: string[], form: UseFormReturn) => {
                  refreshPaidAmount(form);
                  const items = form.getValues('products');
                  const [itemsKey, index] = path;
                  calculateTotalAmountForItem(items, itemsKey, Number(index), form);

                  return value;
                }) as any,
              }
            })),
          unitPrice: z.number({ coerce: true }).describe("Unit Price").superRefine(fieldConfig({
            fieldType: "number",
            customData: {
              onValueChange: ((value: string, path: string[], form: UseFormReturn) => {
                refreshPaidAmount(form);
                const items = form.getValues('products');
                const [itemsKey, index] = path;
                calculateTotalAmountForItem(items, itemsKey, Number(index), form);

                return value;
              }) as any,
            }
          })),
          totalAmount: z.number({ coerce: true }).describe("Total Amount").superRefine(fieldConfig({
            inputProps: {
              readOnly: true,
            }
          }))
        })
        .array()
        .min(1, { message: "Please add at least one product." })
        .superRefine((items, ctx) => {
          items.forEach((item, index) => {
            const product = productsBySoul.get(item.product);

            if (!product) return;

            // Handle stock checking based on unit configuration
            let availableStock = product.stockQuantity;

            // If product unit has pieces info (e.g., "cartoon:10"), adjust stock calculation
            if (product.unit && product.unit.includes(':')) {
              const [unitType, piecesPerUnit] = product.unit.split(':');

              // If the trip unit matches the product's base unit type, convert stock to pieces for comparison
              if (item.unit === unitType) {
                availableStock = product.stockQuantity * parseInt(piecesPerUnit, 10);
              }
            }

            if (item.quantity > availableStock) {
              ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: `Only ${availableStock} items of ${product.title} available in stock`,
                path: [index, "quantity"],
              })
            }
          })
        })
        .describe("Products Sent on Trip"),
      returnedProducts: returnedProductsSchema,
    }),
    onCreate(_, variables) {

      // Stock update logic with unit conversion for products sent on trip
      const itemsByProductIdWithQuantity = variables.products?.reduce((a, { product, quantity, unit }) => {
        // Check if the product unit has pieces info (e.g., "cartoon:10")
        const productInfo = productsBySoul.get(product);
        if (!productInfo) return a;

        let adjustedQuantity = quantity;
        if (productInfo.unit && productInfo.unit.includes(':')) {
          const [unitType, piecesPerUnit] = productInfo.unit.split(':');

          // If the trip unit matches the product's base unit type, convert to pieces
          if (unit === unitType) {
            adjustedQuantity = quantity * parseInt(piecesPerUnit, 10);
          }
        }

        a[product] = (a[product] || 0) + adjustedQuantity;
        return a;
      }, {} as Record<string, number>);

      Object.entries(itemsByProductIdWithQuantity ?? {}).forEach(([productId, quantity]) => {
        const product = productsBySoul.get(productId);
        if (!product?._?.soul) return;
        updateProduct({ id: product._.soul, stockQuantity: product.stockQuantity - quantity });
      });

      // Create corresponding invoice for trip products
      // const invoiceItems = Object.fromEntries(
      //   variables.products?.map((item, index) => [
      //     `itm_${index}`,
      //     {
      //       product: item.product,
      //       quantity: item.quantity,
      //       rate: item.unitPrice,
      //       total: item.quantity * item.unitPrice
      //     }
      //   ]) ?? []
      // );
      //
      // const totalAmount = variables.products?.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0) ?? 0;
      //
      // createInvoice({
      //   type: "trip-dispatch",
      //   partyId: variables.customerId,
      //   issuedAt: variables.startTime,
      //   items: invoiceItems,
      //   subTotal: totalAmount,
      //   tax: 0,
      //   paidAmount: totalAmount,
      //   paymentStatus: "pending" as any,
      //   fiscalYear: calculateFiscalYear()
      // });
    },
    onUpdate(_) {
      // Stock update logic for updates - we need to handle the difference between old and new quantities
      // For now, we'll just log that this functionality would need to be implemented based on the specific use case
      console.log("Trip update functionality would handle stock adjustments here");
    },
    actions: ({ row }) => {
      // Only show the action button if the trip hasn't returned yet
      if (row.original.returnTime) return null;

      return (
        <>
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={e => e.preventDefault()}>
            <button className="w-full" onClick={() => openDialog({
              title: "Mark Return for Trip",
              className: "max-h-[80vh] overflow-y-auto",
              children: (
                <div className="p-6">
                  <div className="mb-6">
                    <h4 className="font-medium mb-2">Products Dispatched:</h4>
                    <div className="grid grid-cols-3 gap-2 text-sm font-medium mb-2">
                      <div>Product</div>
                      <div className="text-center">Sent</div>
                      <div className="text-center">Returned</div>
                    </div>
                    {row.original.products?.map((product, idx: number) => {
                      const prod = productsBySoul.get(product?._?.soul ?? "");
                      return (
                        <div key={idx} className="grid grid-cols-3 gap-2 text-sm">
                          <div>{prod?.title || "Unknown Product"}</div>
                          <div className="text-center">{product.quantity}</div>
                          <div className="text-center">0</div>
                        </div>
                      );
                    })}
                  </div>

                  <AutoForm
                    values={{
                      returnedProducts: (row.original.products ?? []).map(p => ({
                        ...p,
                        totalAmount: (p.quantity ?? 0) * (p.unitPrice ?? 0)
                      }))
                    }}
                    schema={z.object({
                      returnedProducts: returnedProductsSchema
                    })}
                    onSubmit={(data) => {
                      // Calculate sold products (dispatched - returned)
                      const soldProducts = row.original.products.map((dispatchedProduct) => {
                        const returnedProduct = data.returnedProducts?.find(
                          (rp) => rp.product === dispatchedProduct.product
                        );
                        const returnedQty = returnedProduct ? returnedProduct.quantity : 0;
                        const soldQty = dispatchedProduct.quantity - returnedQty;

                        return {
                          productId: dispatchedProduct.product,
                          quantity: Math.max(0, soldQty), // Ensure non-negative
                        };
                      }).filter((sp: any) => sp.quantity > 0); // Only include products that were actually sold

                      // Update the trip with return time and returned products
                      updateTrip({
                        id: row.original._?.soul ?? "",
                        returnTime: new Date().toISOString(),
                        returnedProducts: data.returnedProducts,
                      });

                      //  RESTORE STOCK FOR RETURNED PRODUCTS
                      data.returnedProducts?.forEach((returnedProduct: any) => {
                        const product = productsBySoul.get(returnedProduct.product);
                        if (!product?._?.soul) return;

                        let adjustedQuantity = returnedProduct.quantity;

                        // unit conversion (same logic you use everywhere)
                        if (product.unit && product.unit.includes(':')) {
                          const [unitType, piecesPerUnit] = product.unit.split(':');
                          if (returnedProduct.unit === unitType) {
                            adjustedQuantity = returnedProduct.quantity * parseInt(piecesPerUnit, 10);
                          }
                        }

                        updateProduct({
                          id: product._.soul,
                          stockQuantity: product.stockQuantity + adjustedQuantity,
                        });
                      });
                      // Create a sale record for the sold products
                      if (soldProducts.length > 0) {
                        // Create corresponding invoice for sold products
                        const invoiceItems = soldProducts.map((item) => ({
                          product: item.productId,
                          quantity: item.quantity,
                          rate: productsBySoul.get(item.productId)?.sellingPrice || 0,
                          total: item.quantity * (productsBySoul.get(item.productId)?.sellingPrice || 0),
                          vehicleId: row.original.vehicleId,
                        }))

                        const totalAmount = soldProducts.reduce(
                          (sum: number, item: any) => sum + (item.quantity * (productsBySoul.get(item.productId)?.sellingPrice || 0)),
                          0
                        );

                        const vehicle = vehiclesBySoul.get(row.original.vehicleId)

                        createInvoice({
                          type: "sale",
                          partyId: "trip-sale", // Could be linked to a specific customer
                          issuedAt: new Date().toISOString(),
                          items: invoiceItems,
                          subTotal: totalAmount,
                          tax: 0,
                          paidAmount: totalAmount,
                          paymentStatus: "paid" as any,
                          fiscalYear: calculateFiscalYear(),
                          vehicleId: row.original.vehicleId,
                          tripId: row.original._?.soul,
                          description: `Sale from trip ${row.original._?.soul} by ${vehicle?.name || 'vehicle'}`
                        });

                        // Update product stock quantities
                        soldProducts.forEach((soldProduct: any) => {
                          const product = productsBySoul.get(soldProduct.productId);
                          if (product && product._?.soul) {
                            api.product.useUpdate({ keys: [slug] }).mutate({
                              id: product._.soul,
                              stockQuantity: product.stockQuantity - soldProduct.quantity
                            });
                          }
                        });
                      }

                      // Close the dialog
                      const closeBtn = document.querySelector('[data-state="open"] [data-dismiss]');
                      if (closeBtn) (closeBtn as HTMLElement).click();
                    }}
                  >
                    <AutoFormSubmit className="w-full">Mark Return</AutoFormSubmit>
                  </AutoForm>
                </div>
              )
            })}>Mark Return</button>
          </DropdownMenuItem >
        </>
      );
    },
  }
}

export function useRetailConfig({ slug }: { slug: string }): BusinessConfigReturn["retail"] {
  "use memo"
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
      schema: "product",
      title: "Products",
      slug,
      icon: ShoppingBag,
      group: "Inventory"
    },
    partyConfig,
    customerConfig,
    stockImportsConfig,
    salesConfig,
    invoicesConfig,
    orderConfig,
    vehicleConfig,
    tripConfig,
  ]
}

export function useBusinessConfig({ slug }: { slug: string }): BusinessConfigReturn {
  "use memo"
  const retail = useRetailConfig({ slug });
  return {
    retail,
  }
}
