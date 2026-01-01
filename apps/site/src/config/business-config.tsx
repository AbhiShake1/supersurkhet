import {
  Bed,
  Briefcase,
  Calendar,
  Car,
  Dumbbell,
  Film,
  Fuel,
  GraduationCap,
  Heart,
  Home,
  Layout,
  MapIcon,
  Menu,
  MenuSquare,
  Receipt,
  ShoppingBag,
  Users,
  Wrench,
  ListTodo, DollarSign,
  BarChart3
} from "lucide-react";
import { RestaurantLayoutEditor } from "@/components/seat-builder/restaurant-layout-editor";
import type { BusinessType } from "@/lib/schema";
import type { AutoTableTab } from "@/components/auto-admin";
import { salesItemSchema } from "@/lib/schemas/sales";
import z from "zod";
import { fieldConfig } from "@/components/ui/autoform";
import { api } from "@/lib/api";
import { useMemo } from "react";
import { ReportsPage } from "@/components/reports-page";
import NepaliDate from "nepali-datetime";
import type { UseFormReturn } from "react-hook-form";
import {
  DropdownMenuItem
} from "@/components/ui/dropdown-menu";
import {
  Credenza,
  CredenzaTrigger,
  CredenzaContent
} from "@/components/ui/credenza";
import { ReceiptWrapper } from "@/components/ui/receipt-wrapper";
import { formatCurrency } from "@/lib/intl";

export type BusinessConfigReturn = {
  [B in BusinessType]?: AutoTableTab<any>[];
}

function calculateFiscalYear() {
  const year = new NepaliDate().getYear()
  return `${year.toString().slice(0, 2)}${year.toString().slice(2)}/${(year + 1).toString().slice(2)}`
}

function calculateTotalCost(form: UseFormReturn) {
  const formValues = form.getValues()
  if (!formValues?.items?.length) return
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
  form.setValue("paidAmount", totalCost)
  const paidAmount = form.getValues().paidAmount
  const paymentStatus = getPaymentStatus(paidAmount, totalCost)
  form.setValue("paymentStatus", paymentStatus)
}

export function useStockImportsConfig({ slug }: { slug: string }): AutoTableTab<"stockImport"> {
  const { data: parties = [] } = api.party.useGet({ keys: [slug] })
  const { data: products = [] } = api.product.useGet({ keys: [slug] })
  const { mutate: updateProduct } = api.product.useUpdate({ keys: [slug] })
  const { mutate: createInvoice } = api.invoice.useCreate({ keys: [slug] });
  const productsBySoul = useMemo(() => new Map(
    products
      .filter(p => p?._?.soul)
      .map(p => [p._!.soul!, p])
  ), [products])

  const partiesBySoul = useMemo(() => new Map(
    parties
      .filter(p => p?._?.soul)
      .map(p => [p._!.soul!, p])
  ), [parties])

  function getQuantityDescription() {
    return "Quantity"
  }

  return {
    schema: "stockImport",
    title: "Stock Imports",
    icon: ShoppingBag,
    slug,
    formSchemaTransformer: (schema) => schema.superRefine((stockImport, ctx) => {
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
    },
    fieldOverrides: {
      party: z.string().describe("Party").superRefine(fieldConfig({
        fieldType: "select",
        customData: {
          options: parties.map(p => [p._!.soul!, p.name]),
        },
      })),
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
                options: products.filter(p => !!p?._?.soul)
                  .map(p => [p._!.soul!, p.title]),
                onValueChange: (val, path, form) => {
                  const product = productsBySoul.get(val)
                  if (!product) return
                  const [itemsKey, index] = path
                  form.setValue([itemsKey, index, "unit"].join("."), product.unit)
                  form.setValue([itemsKey, index, "unitPrice"].join("."), product.costPrice)
                  refreshPaidAmount(form)
                }
              },
            })),
          quantity: z.number({ coerce: true }).int().positive().describe(getQuantityDescription()).superRefine(fieldConfig({
            fieldType: "number",
            customData: {
              onValueChange: (_, __, form) => {
                refreshPaidAmount(form)
              },
            }
          })),
          unitPrice: z.number({ coerce: true }).describe("Unit Price").superRefine(fieldConfig({
            fieldType: "number",
            customData: {
              onValueChange: (_, __, form) => {
                refreshPaidAmount(form)
              },
            }
          })),
        })
        .array()
        .min(1, { message: "Please add at least one item." })
        .describe("Items to Import"),
    },
    onCreate(_, variables) {
      const itemsByProductIdWithQuantity = variables.items?.reduce((a, { product, quantity }) => ((a[product] = (a[product] || 0) + quantity), a), {} as Record<string, number>)
      Object.entries(itemsByProductIdWithQuantity ?? {}).forEach(([productId, quantity]) => {
        const product = productsBySoul.get(productId)
        if (!product?._?.soul) return
        updateProduct({ id: product?._?.soul, stockQuantity: product?.stockQuantity + quantity })
      })

      // Create corresponding invoice
      const invoiceItems = Object.fromEntries(
        variables.items?.map((item, index) => [
          `itm_${index}`,
          {
            product: item.product,
            quantity: item.quantity,
            rate: item.unitPrice,
            total: item.quantity * item.unitPrice
          }
        ]) ?? []
      );

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
    onUpdate(_, variables) {
      // const itemsByProductIdWithQuantity = variables.items?.reduce((a, { product, quantity }) => ((a[product] = (a[product] || 0) + quantity), a), {} as Record<string, number>)
      // Object.entries(itemsByProductIdWithQuantity ?? {}).forEach(([productId, quantity]) => {
      //   const product = productsBySoul.get(productId)
      //   if (!product?._?.soul) return
      //   updateProduct({ id: product?._
    }
  }
}

export function useSalesConfig({ slug }: { slug: string }): AutoTableTab<"sale"> {
  const { data: products = [] } = api.product.useGet({
    keys: [slug],
  })
  const { data: parties = [] } = api.party.useGet({ keys: [slug] });
  const { mutate: updateProduct } = api.product.useUpdate({ keys: [slug] })
  const { mutate: createInvoice } = api.invoice.useCreate({ keys: [slug] });
  const productsBySoul = useMemo(() => new Map(
    products
      .filter(p => p?._?.soul)
      .map(p => [p._!.soul!, p])
  ), [products])

  const partiesBySoul = useMemo(() => new Map(
    parties
      .filter(p => p?._?.soul)
      .map(p => [p._!.soul!, p])
  ), [parties])

  return {
    schema: "sale",
    title: "Sales",
    icon: DollarSign,
    group: "Financial",
    slug,
    formSchemaTransformer: (schema) => schema.superRefine((sale, ctx) => {
      if (!sale.paidAmount) return
      const totalCost = sale.items.reduce((sum, item) => sum + (Number(item.quantity || 0) * Number(item.unitPrice || 0)), 0)
      if (sale.paidAmount > totalCost) ctx.addIssue({
        code: "custom",
        message: `Paid amount cannot be greater than total cost (${totalCost})`,
        path: ["paidAmount"],
      })
    }),
    fieldOverrides: {
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
                options: products.filter(p => !!p?._?.soul)
                  .map(p => [p._!.soul!, `${p.title} - Stock: ${p.stockQuantity}`]),
                onValueChange: (val, path, form) => {
                  const product = productsBySoul.get(val)
                  if (!product) return
                  const [itemsKey, index] = path
                  form.setValue([itemsKey, index, "unit"].join("."), product.unit)
                  form.setValue([itemsKey, index, "unitPrice"].join("."), product.sellingPrice)
                  refreshPaidAmount(form)
                }
              },
            })),
          quantity: z.number({ coerce: true }).int().positive()
            .describe("Quantity")
            .superRefine(fieldConfig({
              fieldType: "number",
              customData: {
                onValueChange: (_, __, form) => {
                  refreshPaidAmount(form)
                },
              }
            })),
          unitPrice: z.number({ coerce: true }).describe("Unit Price").superRefine(fieldConfig({
            fieldType: "number",
            customData: {
              onValueChange: (_, __, form) => {
                refreshPaidAmount(form)
              },
            }
          })),
        })
        .array()
        .min(1, { message: "Please add at least one item." })
        .superRefine((items, ctx) => {
          items.forEach((item, index) => {
            const product = productsBySoul.get(item.product)

            if (!product) return

            if (item.quantity > product.stockQuantity) {
              ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: `Only ${product.stockQuantity} items of ${product.title} available in stock`,
                path: [index, "quantity"],
              })
            }
          })
        })
        .describe("Items Sold"),
      // customerName: z.string().optional().describe("Customer Name")
      //   .superRefine(fieldConfig({
      //     fieldType: "select",
      //     customData: {
      //       options: parties.map(p => [p._!.soul!, p.name]),
      //     },
      //   })),
    },
    onCreate(_, variables) {
      // Stock update logic
      const itemsByProductIdWithQuantity = variables.items?.reduce((a, { product, quantity }) =>
        ((a[product] = (a[product] || 0) + quantity), a), {} as Record<string, number>);

      Object.entries(itemsByProductIdWithQuantity ?? {}).forEach(([productId, quantity]) => {
        const product = productsBySoul.get(productId);
        if (!product?._?.soul) return;
        updateProduct({ id: product._.soul, stockQuantity: product.stockQuantity - quantity });
      });

      // Create corresponding invoice
      const invoiceItems = variables.items?.map((item) => ({
        product: item.product,
        quantity: item.quantity,
        rate: item.unitPrice,
        total: item.quantity * item.unitPrice
      })) ?? []

      const totalAmount = variables.items?.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0) ?? 0;

      createInvoice({
        type: "sale",
        partyId: variables.customerName, // Using customerName as partyId
        issuedAt: variables.saleDate,
        items: invoiceItems,
        subTotal: totalAmount,
        tax: 0,
        paidAmount: variables.paidAmount || 0,
        paymentStatus: variables.paymentStatus || "pending" as any,
        fiscalYear: calculateFiscalYear()
      });
    },
    onUpdate(_, variables) {
      // const itemsByProductIdWithQuantity = variables.items?.reduce((a, { product, uantity }) => ((a[product] = (a[product] || 0) + quantity), a), {} as Record<string, number>)
      // Object.entries(itemsByProductIdWithQuantity ?? {}).forEach(([productId, quantity]) => {
      //   const product = productsBySoul.get(productId)
      //   if (!product?._?.soul) return
      //   updateProduct({ id: product?._?.soul, stockQuantity: product?.stockQuantity + quantity })
      // })
    },
  }
}

export function useInvoicesConfig({ slug }: { slug: string }): AutoTableTab<"invoice"> {
  const { data: products = [] } = api.product.useGet({ keys: [slug] })
  const { data: parties = [] } = api.party.useGet({ keys: [slug] })
  const productsBySoul = useMemo(() => new Map(
    products
      .filter(p => p?._?.soul)
      .map(p => [p._!.soul!, p])
  ), [products])
  const partiesBySoul = useMemo(() => new Map(
    parties
      .filter(p => p?._?.soul)
      .map(p => [p._!.soul!, p])
  ), [parties])
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
      const party = partiesBySoul.get(partyId)
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
      partyId: (partyId) => partiesBySoul.get(partyId)?.name ?? "-",
    }
  }
}

export function useBusinessConfig({ slug }: { slug: string }): BusinessConfigReturn {
  const salesConfig = useSalesConfig({ slug });
  const stockImportsConfig = useStockImportsConfig({ slug });
  const invoicesConfig = useInvoicesConfig({ slug });
  return {
    food: [
      {
        schema: "menuItem",
        title: "Menus",
        slug: slug,
        icon: MenuSquare,
      },
      {
        title: "Orders",
        icon: Menu,
        schema: "order",
        slug: slug,
      },
      {
        title: "Layout",
        icon: Layout,
        children: <RestaurantLayoutEditor />,
      },
    ],
    hotel: [
      {
        schema: "hotel",
        title: "Rooms",
        slug: slug,
        icon: Bed,
      },
      {
        schema: "order",
        title: "Bookings",
        slug: slug,
        icon: Menu,
      },
    ],

    petrol_pump: [
      {
        schema: "petrolPump",
        title: "Fuels & Services",
        slug: slug,
        icon: Fuel,
      },
      {
        schema: "order",
        title: "Transactions",
        slug: slug,
        icon: Menu,
      },
    ],

    gym: [
      {
        schema: "gym",
        title: "Equipment & Memberships",
        slug: slug,
        icon: Dumbbell,
      },
      {
        schema: "order",
        title: "Bookings",
        slug: slug,
        icon: Calendar,
      },
    ],

    cinema: [
      {
        schema: "cinema",
        title: "Movies & Showtimes",
        slug: slug,
        icon: Film,
      },
      {
        schema: "order",
        title: "Ticket Sales",
        slug: slug,
        icon: Menu,
      },
    ],

    financial_firm: [
      {
        schema: "financialFirm",
        title: "Services & Advisors",
        slug: slug,
        icon: Briefcase,
      },
      {
        schema: "appointment",
        title: "Appointments",
        slug: slug,
        icon: Calendar,
      },
    ],

    ride_sharing: [
      {
        schema: "rideSharing",
        title: "Vehicles & Drivers",
        slug: slug,
        icon: Car,
      },
      {
        schema: "trip",
        title: "Trips",
        slug: slug,
        icon: MapIcon,
      },
    ],

    service: [
      {
        schema: "service",
        title: "Services & Appointments",
        slug: slug,
        icon: Wrench,
      },
      {
        schema: "appointment",
        title: "Appointments",
        slug: slug,
        icon: Calendar,
      },
    ],

    education: [
      {
        schema: "education",
        title: "Courses & Students",
        slug: slug,
        icon: GraduationCap,
      },
      {
        schema: "studentProfile",
        title: "Student Profiles",
        slug: slug,
        icon: Users,
      },
    ],

    healthcare: [
      {
        schema: "healthcare",
        title: "Patients & Doctors",
        slug: slug,
        icon: Heart,
      },
      {
        schema: "appointment",
        title: "Appointments",
        slug: slug,
        icon: Calendar,
      },
    ],

    real_estate: [
      {
        schema: "realEstate",
        title: "Properties & Listings",
        slug: slug,
        icon: Home,
      },
      {
        schema: "appointment",
        title: "Appointments",
        slug: slug,
        icon: Calendar,
      },
    ],

    cooperative: [
      {
        schema: "cooperative",
        title: "Members & Committees",
        slug: slug,
        icon: Users,
      },
      {
        schema: "appointment",
        title: "Meetings",
        slug: slug,
        icon: Calendar,
      },
    ],

    retail: [
      {
        schema: "party",
        title: "Parties",
        slug,
        icon: Users,
      },
      {
        schema: "product",
        title: "Products",
        slug,
        icon: ShoppingBag,
      },
      stockImportsConfig,
      salesConfig,
      invoicesConfig,
      {
        title: "Reports",
        slug,
        icon: BarChart3,
        children: <ReportsPage slug={slug} />,
        group: "Financial",
      },
      {
        schema: "order",
        title: "Orders",
        slug: slug,
        icon: ListTodo,
      },
    ],
  }
}
