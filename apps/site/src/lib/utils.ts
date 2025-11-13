import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { LucideIcon } from "lucide-react";
import type { Business } from "./schema";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function recordToList<R extends Record<string, any>>(record: R) {
  return Object.entries(record)
    .filter(([, v]) => typeof v !== "string")
    .map(([soul, v]) => ({ ...v, _: { ...v._, soul } })) as Array<
      R[string] & { _: { soul: string } }
    >;
}

// Function to get app icon from business data
// Returns base64 image if available, otherwise returns a default icon based on business type
export function getAppIcon(business: Business): string | null {
  if (business.icon) {
    const icon = business.icon.trim();
    if (icon.startsWith("data:")) {
      return icon;
    }
    // If the business has an icon, return it as a data URL
    return `data:image/png;base64,${icon}`;
  }

  // If no icon exists, return null and let the component use a fallback
  return null;
}

// Function to get Lucide icon based on business type
export function getBusinessTypeIcon(businessType: string): LucideIcon | null {
  // For now, return null - we can implement specific icons later
  // This would map business types to specific Lucide icons
  return null;
}

