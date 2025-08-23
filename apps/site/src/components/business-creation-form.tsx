import { Checkbox } from "@/components/ui/checkbox";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { businessSchema, featureSchema } from "@/lib/schema";
import { cn } from "@/lib/utils";
import { Link } from "@tanstack/react-router";
import { CheckCircle, Store, Utensils, Car, Home, School, Heart, Building, Users, Dumbbell, Film, CreditCard, Fuel, Hotel } from "lucide-react";
import type { UseFormReturn } from "react-hook-form";
import type { z } from "zod";
import { Button } from "./ui/button";
import { Card, CardHeader, CardTitle } from "./ui/card";

const businessCreationSchema = businessSchema.pick({
	name: true,
	businessType: true,
	features: true,
});

type BusinessCreationValues = z.infer<typeof businessCreationSchema>;

const featureKeys = Object.keys(
	featureSchema.rawShape,
) as (keyof typeof featureSchema.rawShape)[];

const businessTypeIcons = {
	retail: Store,
	food: Utensils,
	logistics: Car,
	real_estate: Home,
	education: School,
	healthcare: Heart,
	service: Building,
	cooperative: Users,
	other: Building,
	hotel: Hotel,
	petrol_pump: Fuel,
	gym: Dumbbell,
	cinema: Film,
	financial_firm: CreditCard,
	ride_sharing: Car,
};

const businessTypeGroups = {
	"Retail & Commerce": ["retail"],
	"Food & Hospitality": ["food", "hotel"],
	"Transportation & Logistics": ["logistics", "ride_sharing"],
	"Real Estate": ["real_estate"],
	"Education": ["education"],
	"Healthcare": ["healthcare"],
	"Financial Services": ["financial_firm"],
	"Fitness & Recreation": ["gym", "cinema"],
	"Energy & Utilities": ["petrol_pump"],
	"Community & Cooperatives": ["cooperative"],
	"Professional Services": ["service"],
	"Other": ["other"],
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
										const groupTypes = types.filter(type => 
											businessSchema.shape.businessType.options.includes(type as z.infer<typeof businessSchema.shape.businessType>)
										);
										
										if (groupTypes.length === 0) return null;
										
										return (
											<div key={group} className="space-y-3">
												<h3 className="text-sm font-medium text-muted-foreground">{group}</h3>
												<div className="grid grid-cols-2 md:grid-cols-3 gap-3">
													{groupTypes.map((type) => {
														const isSelected = field.value === type;
														const Icon = businessTypeIcons[type as keyof typeof businessTypeIcons] || Building;
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
								const businessType = type as keyof typeof recommendedFeatures;
								const recommended = recommendedFeatures[businessType] || [];
								const newFeatures: Record<string, boolean> = {};
								for (const key of featureKeys) {
									newFeatures[key] = recommended.includes(key);
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
				<div>
					<div className="mb-4">
						<h3 className="text-lg font-medium">Select Features</h3>
						<p className="text-sm text-muted-foreground">
							Choose the features you want to enable for your business. Recommended features based on your business type are pre-selected.
						</p>
					</div>
					<FormField
						control={form.control}
						name="features"
						render={() => (
							<FormItem className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
								{featureKeys.map((item) => {
									// Get description from schema if available
									const schema = featureSchema.rawShape[item]?.schema;
									const description = schema?._def?.description || 
										(item === "product" && "Manage products and inventory") ||
										(item === "menuItem" && "Manage food menu items") ||
										(item === "service" && "Manage services offered") ||
										(item === "order" && "Process customer orders") ||
										(item === "appointment" && "Schedule appointments") ||
										(item === "expense" && "Track business expenses") ||
										(item === "driverProfile" && "Manage driver information") ||
										(item === "studentProfile" && "Manage student information") ||
										(item === "coOpMemberProfile" && "Manage cooperative member information") ||
										(item === "propertyListing" && "Manage property listings") ||
										(item === "trip" && "Manage trips and rides") ||
										(item === "chat" && "Enable customer messaging") ||
										(item === "hotel" && "Manage hotel rooms and bookings") ||
										(item === "petrolPump" && "Manage fuel prices and services") ||
										(item === "gym" && "Manage gym memberships and classes") ||
										(item === "cinema" && "Manage movies and showtimes") ||
										(item === "financialFirm" && "Manage financial products and services") ||
										(item === "rideSharing" && "Manage ride sharing services") ||
										"";
									
									return (
										<FormField
											key={item}
											control={form.control}
											name={`features.${item}`}
											render={({ field }) => {
												const isRecommended = recommendedFeatures[form.watch("businessType") as keyof typeof recommendedFeatures]?.includes(item);
												return (
													<FormItem
														className={cn(
															"flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4 cursor-pointer transition-colors",
															isSubmitting && "opacity-50 pointer-events-none",
															isRecommended && "border-primary/50 bg-primary/5",
														)}
														onClick={() => field.onChange(!field.value)}
													>
														<FormControl>
															<Checkbox checked={field.value} />
														</FormControl>
														<div className="space-y-1 leading-none">
															<span className="capitalize text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
																{item
																	.replace(/([A-Z])/g, " $1")
																	.replace(/Schema/i, "")
																	.trim()}
															</span>
															{description && (
																<p className="text-xs text-muted-foreground mt-1">
																	{description}
																</p>
															)}
															{isRecommended && (
																<span className="inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary mt-1">
																	Recommended
																</span>
															)}
														</div>
													</FormItem>
												);
											}}
										/>
									);
								})}
							</FormItem>
						)}
					/>
				</div>
			)}
		</div>
	);
}
