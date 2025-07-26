import { UseFormReturn } from "react-hook-form";
import { z } from "zod";
import { businessSchema, featureSchema } from "@/lib/schema";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardHeader, CardTitle } from "./ui/card";
import { cn } from "@/lib/utils";
import { CheckCircle } from "lucide-react";

const businessCreationSchema = businessSchema.pick({
  name: true,
  businessType: true,
  features: true,
});

type BusinessCreationValues = z.infer<typeof businessCreationSchema>;

const featureKeys = Object.keys(featureSchema.shape) as (keyof typeof featureSchema.shape)[];

const recommendedFeatures: Record<
  z.infer<typeof businessSchema.shape.businessType>,
  (keyof typeof featureSchema.shape)[]
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
};

interface BusinessCreationFormProps {
  step: number;
  form: UseFormReturn<BusinessCreationValues>;
  setStep: (step: number) => void;
  createdBusiness: z.infer<typeof businessSchema> | null;
  isSubmitting: boolean;
}

export function BusinessCreationForm({ step, form, isSubmitting, createdBusiness }: BusinessCreationFormProps) {

  if (step === 3) {
    return (
      <div className="text-center py-8">
        <h2 className="text-2xl font-bold">Business Created!</h2>
        {createdBusiness && (
          <div className="mt-4 space-y-2">
            <p className="text-lg font-semibold">{createdBusiness.name}</p>
            <p className="text-muted-foreground">Your admin dashboard is at:</p>
            <p className="text-primary font-mono text-sm">{`/${createdBusiness.basePath}/admin`}</p>
          </div>
        )}
      </div>
    )
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
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 pt-2">
                  {businessSchema.shape.businessType.options.map((type) => {
                    const isSelected = field.value === type;
                    return (
                      <Card
                        key={type}
                        className={cn(
                          "relative cursor-pointer",
                          isSelected
                            ? "border-primary shadow-sm"
                            : "border-input",
                          "flex flex-col items-center justify-center p-6 text-center h-full"
                        )}
                        onClick={() => {
                          field.onChange(type);
                          const recommended = recommendedFeatures[type];
                          const newFeatures: Record<string, boolean> = {};
                          featureKeys.forEach(key => {
                            newFeatures[key] = recommended.includes(key);
                          });
                          form.setValue("features", newFeatures);
                        }}
                      >
                        <CardHeader className="p-0 flex-grow flex items-center justify-center">
                          <CardTitle className="capitalize text-lg font-semibold">
                            {type.replace("_", " ")}
                          </CardTitle>
                        </CardHeader>
                        {isSelected && (
                          <div className="absolute top-2 right-2 text-primary">
                            <CheckCircle className="h-5 w-5" />
                          </div>
                        )}
                      </Card>
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
        <div>
          <FormField
            control={form.control}
            name="features"
            render={() => (
              <FormItem className="mt-6 grid grid-cols-2 md:grid-cols-3 gap-4">
                {featureKeys.map((item) => (
                  <FormField
                    key={item}
                    control={form.control}
                    name={`features.${item}`}
                    render={({ field }) => (
                      <FormItem className={cn("flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4 cursor-pointer",
                        isSubmitting && "opacity-50 pointer-events-none"
                      )}
                        onClick={() => field.onChange(!field.value)}
                      >
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <span className="capitalize text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                            {item.replace(/([A-Z])/g, ' $1').replace(/Schema/i, '').trim()}
                          </span>
                        </div>
                      </FormItem>
                    )}
                  />
                ))}
              </FormItem>
            )}
          />
        </div>
      )}
    </div>
  );
}
