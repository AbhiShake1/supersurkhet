import { Checkbox } from "@/components/ui/checkbox";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { api } from "@/lib/api";
import { businessSchema, featureSchema } from "@/lib/schema";
import { cn } from "@/lib/utils";
import type { SchemaKeys } from "@gta/react-hooks";
import { Link } from "@tanstack/react-router";
import {
  Building,
  Car,
  CheckCircle,
  CreditCard,
  Dumbbell,
  Film,
  Fuel,
  Heart,
  Home,
  Hotel,
  School,
  Store,
  Users,
  Utensils,
} from "lucide-react";
import { useLayoutEffect, useMemo } from "react";
import type { UseFormReturn } from "react-hook-form";
import { z } from "zod";
import { Button } from "./ui/button";
import { Card, CardHeader, CardTitle } from "./ui/card";

const businessCreationSchema = businessSchema
  .pick({
    name: true,
    businessType: true,
    features: true,
  })
  .extend({
    prepopulateData: z.record(z.string(), z.boolean()).optional(),
  });

type BusinessCreationValues = z.infer<typeof businessCreationSchema>;

// Define types for pre-population data
interface PrePopulateItem {
  "#": string;
  title: string;
  price: number;
  category?: string;
  description?: string;
  isActive?: boolean;
}

const featureKeys = Object.keys(
  featureSchema.rawShape,
) as (keyof typeof featureSchema.rawShape)[];

const businessTypeIcons = {
  retail: Store,
};

const businessTypeGroups = {
  "Retail & Commerce": ["retail"],
  "Food & Hospitality": ["food", "hotel"],
  "Transportation & Logistics": ["logistics", "ride_sharing"],
  "Real Estate": ["real_estate"],
  Education: ["education"],
  Healthcare: ["healthcare"],
  "Financial Services": ["financial_firm"],
  "Fitness & Recreation": ["gym", "cinema"],
  "Energy & Utilities": ["petrol_pump"],
  "Community & Cooperatives": ["cooperative"],
  "Professional Services": ["service"],
  Other: ["other"],
};

const recommendedFeatures: Record<
  z.infer<typeof businessSchema.shape.businessType>,
  (keyof typeof featureSchema.rawShape)[]
> = {
  retail: ["product", "order", "expense"],
  food: ["menuItem", "order", "appointment", "expense"],
  service: ["service", "appointment", "expense"],
  logistics: ["driverProfile", "trip", "expense"],
  education: ["studentProfile", "expense"],
  healthcare: ["service", "appointment", "expense"],
  real_estate: ["propertyListing", "expense"],
  cooperative: ["coOpMemberProfile", "expense"],
  other: ["expense"],
  hotel: ["hotel", "order", "expense"],
  petrol_pump: ["petrolPump", "expense"],
  gym: ["gym", "appointment", "expense"],
  cinema: ["cinema", "order", "expense"],
  financial_firm: ["financialFirm", "appointment", "expense"],
  ride_sharing: ["rideSharing", "driverProfile", "trip", "expense"],
};

interface BusinessCreationFormProps {
  step: number;
  form: UseFormReturn<BusinessCreationValues>;
  setStep: (step: number) => void;
  createdBusiness: z.infer<typeof businessSchema> | undefined;
  isSubmitting: boolean;
}

export function BusinessCreationForm({
  step,
  form,
  isSubmitting,
  createdBusiness,
}: BusinessCreationFormProps) {
  if (step === 3) {
    return (
      <div className="text-center py-8">
        <h2 className="text-2xl font-bold">Business Created!</h2>
        {createdBusiness && (
          <div className="mt-4 space-y-4">
            <p className="text-lg font-semibold">
              Your business{" "}
              <span className="text-primary">{createdBusiness.name}</span> is
              now online!
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button asChild>
                <Link
                  to="/$businessName"
                  params={{ businessName: createdBusiness.basePath ?? "" }}
                >
                  Go to Public Site
                </Link>
              </Button>
              <Button asChild variant="outline">
                <Link
                  to="/$businessName/admin"
                  params={{ businessName: createdBusiness.basePath ?? "" }}
                >
                  Go to Admin Dashboard
                </Link>
              </Button>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {step === 1 && (
        <div className="space-y-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Business Name</FormLabel>
                <FormControl>
                  <Input placeholder="e.g., Aangan Restaurant" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="businessType"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Business Type</FormLabel>
                <div className="space-y-6 pt-2">
                  {Object.entries(businessTypeGroups).map(([group, types]) => {
                    const groupTypes = types.filter((type) =>
                      businessSchema.shape.businessType.options.includes(
                        type as z.infer<
                          typeof businessSchema.shape.businessType
                        >,
                      ),
                    );

                    if (groupTypes.length === 0) return null;

                    return (
                      <div key={group} className="space-y-3">
                        <h3 className="text-sm font-medium text-muted-foreground">
                          {group}
                        </h3>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                          {groupTypes.map((type) => {
                            const isSelected = field.value === type;
                            const Icon =
                              businessTypeIcons[
                              type as keyof typeof businessTypeIcons
                              ] || Building;
                            return (
                              <Card
                                key={type}
                                className={cn(
                                  "relative cursor-pointer",
                                  isSelected
                                    ? "border-primary shadow-sm"
                                    : "border-input",
                                  "flex flex-col items-center justify-center p-4 text-center h-full",
                                )}
                                onClick={() => {
                                  field.onChange(type);
                                  const businessType =
                                    type as keyof typeof recommendedFeatures;
                                  const recommended =
                                    recommendedFeatures[businessType] || [];
                                  const newFeatures: Record<string, boolean> =
                                    {};
                                  for (const key of featureKeys) {
                                    newFeatures[key] =
                                      recommended.includes(key);
                                  }
                                  form.setValue("features", newFeatures);
                                }}
                              >
                                <CardHeader className="p-0 flex-grow flex flex-col items-center justify-center gap-2">
                                  <Icon className="h-6 w-6 text-muted-foreground" />
                                  <CardTitle className="capitalize text-sm font-semibold">
                                    {type.replace("_", " ")}
                                  </CardTitle>
                                </CardHeader>
                                {isSelected && (
                                  <div className="absolute top-1 right-1 text-primary">
                                    <CheckCircle className="h-4 w-4" />
                                  </div>
                                )}
                              </Card>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      )}

      {step === 2 && (
        <DataPrepopulateForm form={form} key="prepopulate-form" />
      )}
    </div>
  );
}

interface DataPrepopulateFormProps {
  form: UseFormReturn<BusinessCreationValues>;
}

function DataPrepopulateForm({ form }: DataPrepopulateFormProps) {
  const businessType = form.watch("businessType");

  const { data: allItems = [], isLoading } = useBusinessTypeData(businessType);
  const { data: allBusinesses = [] } = api.business.useGet()

  // Transform data as specified in the requirements
  const transformedData = useMemo(() => allItems.flatMap(d => {
    const business = d._?.soul;
    return Object.values(d).map(d =>
      !d || typeof d !== "object" ? null : ({ ...d, business })
    );
  }).filter(d => !!d && typeof d === "object" && !("soul" in d)), [allItems]);

  // Filter to items and calculate occurrence percentage
  const similarItems = useMemo(() => {
    const businessesOfType = allBusinesses.filter(b => b.businessType === businessType)

    // Group items by title and calculate occurrence percentage for similar business types
    const itemsByTitle: Record<string, { count: number; items: PrePopulateItem[]; businesses: string[] }> = {};

    for (const d of transformedData) {
      const title = d?.title?.toLowerCase();
      if (!title) continue

      if (!itemsByTitle[title]) {
        itemsByTitle[title] = { count: 0, items: [], businesses: [] };
      }
      itemsByTitle[title].count++;
      if (!itemsByTitle[title].businesses.includes(d.business)) {
        itemsByTitle[title].businesses.push(d.business);
      }
      if (!businessesOfType.includes(d.business)) {
        businessesOfType.push(d.business)
      }
      // Use the first occurrence of the item to preserve its properties
      itemsByTitle[title].items.push(d);
    }

    const totalBusinesses = businessesOfType.length

    return Object.values(itemsByTitle)
      .map((data) => {
        // Use the first occurrence of the item as the base to show in the UI
        const commonItem = data.items[0];
        const occurrencePercentage = (data.businesses.length / totalBusinesses) * 100;
        return {
          ...commonItem,
          occurrencePercentage,
          isPreselected: occurrencePercentage >= 40,
        };
      })
      .sort((a, b) => b.occurrencePercentage - a.occurrencePercentage) // Sort by most common first
      .filter(item => item.title)
  }, [transformedData, allBusinesses, businessType]);

  const newSimilarItemsValue = useMemo(() => similarItems.reduce((acc, item) => ({
    ...acc,
    [item["#"]]: item.isPreselected,
  }), {} as Record<string, boolean>), [similarItems])

  useLayoutEffect(() => {
    for (const [key, val] of Object.entries(newSimilarItemsValue)) {
      form.setValue(`prepopulateData.${key}`, val, {
        shouldDirty: true,
        shouldTouch: true,
        shouldValidate: true,
      })
    }
  }, [newSimilarItemsValue])

  if (isLoading) {
    return <div>Loading pre-population data...</div>;
  }

  if (!similarItems.length) {
    return <div>No similar data found for pre-population.</div>;
  }

  return (
    <div
      className="grid grid-cols-1 md:grid-cols-2 gap-3"
      key={`${businessType}-similar-items`}
    >
      {similarItems.map((item) => (
        item["#"] &&
        <FormField
          key={item["#"]}
          control={form.control}
          name={`prepopulateData.${item["#"]}`}
          render={({ field }) => {
            const value = field.value;

            return (
              <FormItem
                className={cn(
                  "flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4 cursor-pointer transition-colors",
                  value && "border-primary/50 bg-primary/5"
                )}
                onClick={(e) => {
                  if (!(e.target as HTMLElement).closest('input[type="checkbox"]')) {
                    field.onChange(!value);
                  }
                }}
              >
                <FormControl>
                  <Checkbox
                    checked={value}
                    onCheckedChange={(checked) => field.onChange(!!checked)}
                  />
                </FormControl>

                <div className="space-y-1 leading-none flex-1">
                  <span className="capitalize text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                    {item.title}
                  </span>

                  {item.description && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {item.description}
                    </p>
                  )}

                  <p className="text-xs text-muted-foreground mt-1">
                    Available at <span className="font-semibold text-md">{item.occurrencePercentage.toFixed(0)}%</span> of similar businesses
                  </p>

                  {item.isPreselected && (
                    <span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary mt-1">
                      Recommended
                    </span>
                  )}
                </div>
              </FormItem>
            );
          }}
        />
      ))}
    </div>
  );
}

export function getBusinessTypeDataField(businessType: string | undefined): SchemaKeys {
  switch (businessType) {
    case 'food':
    case 'hotel':
      return "menuItem";
    case 'retail':
      return "product";
    case 'service':
    case 'healthcare':
      return "service";
    case 'education':
      return "studentProfile";
    case 'logistics':
    case 'ride_sharing':
      return "driverProfile";
    case 'real_estate':
      return "propertyListing";
    case 'cooperative':
      return "coOpMemberProfile";
    case 'petrol_pump':
      return "petrolPump";
    default:
      return "menuItem";
  }
}

// Custom hook to fetch data based on business type
function useBusinessTypeData(businessType: string | undefined) {
  const field = getBusinessTypeDataField(businessType);
  return api[field].useGet();
}
