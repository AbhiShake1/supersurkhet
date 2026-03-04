import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import type { LucideIcon } from 'lucide-react';
import type { Business } from './schema';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function isNonNullable<T>(v: T): v is NonNullable<T> {
  return Boolean(v);
}

// biome-ignore lint/suspicious/noExplicitAny: lint debt cleanup

export function soulToId(soul?: string | null) {
  if (!soul) return '';
  return soul.split('/').pop() ?? '';
}

export function getSoulFromUnknown(value: unknown): string | undefined {
  if (!value || typeof value !== 'object') return undefined;
  if (!('_' in value)) return undefined;

  const meta = value._;
  if (!meta || typeof meta !== 'object') return undefined;
  if (!('soul' in meta)) return undefined;

  const soul = meta.soul;
  return typeof soul === 'string' ? soul : undefined;
}

// Function to get app icon from business data
// Returns base64 image if available, otherwise returns a default icon based on business type
export function getAppIcon(business: Business): string | null {
  if (business.icon) {
    const icon = business.icon.trim();
    if (icon.startsWith('data:')) {
      return icon;
    }
    // If the business has an icon, return it as a data URL
    return `data:image/png;base64,${icon}`;
  }

  // If no icon exists, return null and let the component use a fallback
  return null;
}

// Function to get Lucide icon based on business type
