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
  ListTodo,
  ShoppingCart,
  DollarSign,
} from "lucide-react";
import { RestaurantLayoutEditor } from "@/components/seat-builder/restaurant-layout-editor";
import type { BusinessType } from "@/lib/schema";
import type { AutoTableTab } from "@/components/auto-admin";
import { salesItemSchema } from "@/lib/schemas/sales";
import z from "zod";
import { fieldConfig } from "@/components/ui/autoform";
import { api } from "@/lib/api";
import { useMemo } from "react";

export type BusinessConfigReturn = {
  [B in BusinessType]?: AutoTableTab<any>[];
}

export function useStockImportsConfig({ slug }: { slug: string }): AutoTableTab<"stockImport"> {
  const { data: parties = [] } = api.party.useGet({ keys: [slug] })
  const { data: products = [] } = api.product.useGet({ keys: [slug] })
  const { mutate: updateProduct } = api.product.useUpdate({ keys: [slug] })
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
    schema: "stockImport",
    title: "Stock Imports",
    icon: ShoppingBag,
    slug,
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
                  form.setValue([itemsKey, index, "unitPrice"].join("."), product.costPrice)
                }
              },
            })),
          quantity: z.number({ coerce: true }).int().positive().describe("Quantity"),
        })
        .array()
        .min(1, { message: "Please add at least one item." })
        .describe("Items Sold"),
    },
    onCreate(_, variables) {
      const itemsByProductIdWithQuantity = variables.items?.reduce((a, { product, quantity }) => ((a[product] = (a[product] || 0) + quantity), a), {} as Record<string, number>)
      Object.entries(itemsByProductIdWithQuantity ?? {}).forEach(([productId, quantity]) => {
        const product = productsBySoul.get(productId)
        if (!product?._?.soul) return
        updateProduct({ id: product?._?.soul, stockQuantity: product?.stockQuantity + quantity })
      })
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
  const { mutate: updateProduct } = api.product.useUpdate({ keys: [slug] })
  const productsBySoul = useMemo(() => new Map(
    products
      .filter(p => p?._?.soul)
      .map(p => [p._!.soul!, p])
  ), [products])
  return {
    schema: "sale",
    title: "Sales",
    icon: DollarSign,
    slug,
    fieldOverrides: {
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
                  form.setValue([itemsKey, index, "unitPrice"].join("."), product.sellingPrice)
                }
              },
            })),
          quantity: z.number({ coerce: true }).int().positive().describe("Quantity"),
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
    },
    onCreate(_, variables) {
      const itemsByProductIdWithQuantity = variables.items?.reduce((a, { product, quantity }) => ((a[product] = (a[product] || 0) + quantity), a), {} as Record<string, number>)
      Object.entries(itemsByProductIdWithQuantity ?? {}).forEach(([productId, quantity]) => {
        const product = productsBySoul.get(productId)
        if (!product?._?.soul) return
        updateProduct({ id: product?._?.soul, stockQuantity: product?.stockQuantity - quantity })
      })
    },
    onUpdate(_, variables) {
      // const itemsByProductIdWithQuantity = variables.items?.reduce((a, { product, quantity }) => ((a[product] = (a[product] || 0) + quantity), a), {} as Record<string, number>)
      // Object.entries(itemsByProductIdWithQuantity ?? {}).forEach(([productId, quantity]) => {
      //   const product = productsBySoul.get(productId)
      //   if (!product?._?.soul) return
      //   updateProduct({ id: product?._?.soul, stockQuantity: product?.stockQuantity + quantity })
      // })
    },
  }
}

export function useBusinessConfig({ slug }: { slug: string }): BusinessConfigReturn {
  const salesConfig = useSalesConfig({ slug });
  const stockImportsConfig = useStockImportsConfig({ slug });
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
      // {
      //   title: "Sales",
      //   icon: ChartLine,
      //   slug,
      //   children: <SalesPage slug={slug} />,
      // },
      {
        schema: "invoice",
        title: "Invoices",
        slug: slug,
        icon: Receipt,
      },
      // {
      //   schema: "transaction",
      //   title: "Transactions",
      //   slug: slug,
      //   icon: Banknote,
      // },
      // {
      //   schema: "inventoryLedger",
      //   title: "Inventory Ledger",
      //   slug: slug,
      //   icon: Logs,
      // },
      {
        schema: "order",
        title: "Orders",
        slug: slug,
        icon: ListTodo,
      },
    ],
  }
}
