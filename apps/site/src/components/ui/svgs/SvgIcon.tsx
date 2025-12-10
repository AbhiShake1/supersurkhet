import type { SVGProps } from "react";
import { z } from "zod";
import {
  Angular,
  Docker,
  Firebase,
  FirebaseWordmark,
  GithubDark,
  GithubLight,
  GithubWordmarkDark,
  GithubWordmarkLight,
  Gitlab,
  Google,
  GoogleWordmark,
  Javascript,
  Kubernetes,
  Netlify,
  Nodejs,
  Paypal,
  PaypalWordmark,
  ReactDark,
  ReactLight,
  ReactWordmarkDark,
  ReactWordmarkLight,
  Stripe,
  Typescript,
  Vercel,
  VercelDark,
  VercelWordmark,
  VercelWordmarkDark,
  Vue,
} from ".";

const icons = {
  angular: Angular,
  docker: Docker,
  firebase: Firebase,
  firebaseWordmark: FirebaseWordmark,
  githubDark: GithubDark,
  githubLight: GithubLight,
  githubWordmarkDark: GithubWordmarkDark,
  githubWordmarkLight: GithubWordmarkLight,
  gitlab: Gitlab,
  google: Google,
  googleWordmark: GoogleWordmark,
  javascript: Javascript,
  kubernetes: Kubernetes,
  netlify: Netlify,
  nodejs: Nodejs,
  paypal: Paypal,
  paypalWordmark: PaypalWordmark,
  reactDark: ReactDark,
  reactLight: ReactLight,
  reactWordmarkDark: ReactWordmarkDark,
  reactWordmarkLight: ReactWordmarkLight,
  stripe: Stripe,
  typescript: Typescript,
  vercel: Vercel,
  vercelDark: VercelDark,
  vercelWordmark: VercelWordmark,
  vercelWordmarkDark: VercelWordmarkDark,
  vue: Vue,
} as const;

type IconName = keyof typeof icons;

function keys<T extends Record<string, any>>(obj: T): Array<keyof T> {
  return Object.keys(obj) as Array<keyof T>;
}

const iconNames = keys(icons) as [IconName, ...IconName[]];

// Define size classes for different icon sizes
const sizeClasses = {
  small: 'h-4 w-4',
  medium: 'h-6 w-6',
  large: 'h-8 w-8',
};

// Define color classes for different icon colors
const colorClasses = {
  accent: 'text-accent',
  accentForeground: 'text-accent-foreground',
  primary: 'text-primary',
  primaryForeground: 'text-primary-foreground',
  secondary: 'text-secondary',
  secondaryForeground: 'text-secondary-foreground',
  destructive: 'text-destructive',
  destructiveForeground: 'text-destructive-foreground',
  muted: 'text-muted',
  mutedForeground: 'text-muted-foreground',
  background: 'text-background',
  foreground: 'text-foreground',
};

type Size = keyof typeof sizeClasses;
type Color = keyof typeof colorClasses;

type IconProps = {
  name: IconName;
  size?: Size;
  color?: Color;
  className?: string;
} & SVGProps<SVGSVGElement>;

const SvgIcon = ({ name, size = 'medium', color, className = '', ...props }: IconProps) => {
  const IconComponent = icons[name];

  if (!IconComponent) {
    console.error(`Icon with name "${name}" not found`);
    return null;
  }

  const sizeClass = sizeClasses[size];
  const colorClass = color ? colorClasses[color] : '';
  const combinedClassName = [
    sizeClass,
    colorClass,
    className
  ].filter(Boolean).join(' ');

  return <IconComponent {...props} className={combinedClassName} />;
};

const SvgIconSchema = z.object({
  name: z.enum(iconNames).default("firebase"),
  className: z.string().optional(),
  width: z.union([z.number(), z.string()]).optional(),
  height: z.union([z.number(), z.string()]).optional(),
  fill: z.string().optional(),
  stroke: z.string().optional(),
  strokeWidth: z.union([z.number(), z.string()]).optional(),
  viewBox: z.string().optional(),
  size: z.enum(['small', 'medium', 'large']).default('medium'),
  color: z.enum([
    'accent',
    'accentForeground',
    'primary',
    'primaryForeground',
    'secondary',
    'secondaryForeground',
    'destructive',
    'destructiveForeground',
    'muted',
    'mutedForeground',
    'background',
    'foreground',
  ]).optional(),
});

export { SvgIcon, type IconName, SvgIconSchema };
export type { IconProps };
