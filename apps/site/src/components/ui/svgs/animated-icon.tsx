import React from "react";
import type { SVGProps } from "react";

// Import all the SVG components
import { Angular } from "./angular";
import { Docker } from "./docker";
import { GithubDark } from "./githubDark";
import { GithubLight } from "./githubLight";
import { GithubWordmarkDark } from "./githubWordmarkDark";
import { GithubWordmarkLight } from "./githubWordmarkLight";
import { Gitlab } from "./gitlab";
import { Google } from "./google";
import { GoogleWordmark } from "./googleWordmark";
import { Javascript } from "./javascript";
import { Kubernetes } from "./kubernetes";
import { Netlify } from "./netlify";
import { Nodejs } from "./nodejs";
import { Paypal } from "./paypal";
import { PaypalWordmark } from "./paypalWordmark";
import { ReactDark } from "./reactDark";
import { ReactLight } from "./reactLight";
import { ReactWordmarkDark } from "./reactWordmarkDark";
import { ReactWordmarkLight } from "./reactWordmarkLight";
import { Stripe } from "./stripe";
import { Typescript } from "./typescript";
import { Vercel } from "./vercel";
import { VercelDark } from "./vercelDark";
import { VercelWordmark } from "./vercelWordmark";
import { VercelWordmarkDark } from "./vercelWordmarkDark";
import { Vue } from "./vue";

// Define a type for the supported icon names
type AnimatedIconName =
  | 'Angular'
  | 'Docker'
  | 'GithubDark'
  | 'GithubLight'
  | 'GithubWordmarkDark'
  | 'GithubWordmarkLight'
  | 'Gitlab'
  | 'Google'
  | 'GoogleWordmark'
  | 'Javascript'
  | 'Kubernetes'
  | 'Netlify'
  | 'Nodejs'
  | 'Paypal'
  | 'PaypalWordmark'
  | 'ReactDark'
  | 'ReactLight'
  | 'ReactWordmarkDark'
  | 'ReactWordmarkLight'
  | 'Stripe'
  | 'Typescript'
  | 'Vercel'
  | 'VercelDark'
  | 'VercelWordmark'
  | 'VercelWordmarkDark'
  | 'Vue';

// Create a mapping from icon names to their components
const iconComponents: Record<AnimatedIconName, React.FC<SVGProps<SVGSVGElement>>> = {
  Angular,
  Docker,
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
};

// Define a schema for zod validation
import { z } from 'zod';
export const AnimatedIconSchema = z.object({
  className: z.string().optional(),
  iconName: z.enum([
    'Angular',
    'Docker',
    'GithubDark',
    'GithubLight',
    'GithubWordmarkDark',
    'GithubWordmarkLight',
    'Gitlab',
    'Google',
    'GoogleWordmark',
    'Javascript',
    'Kubernetes',
    'Netlify',
    'Nodejs',
    'Paypal',
    'PaypalWordmark',
    'ReactDark',
    'ReactLight',
    'ReactWordmarkDark',
    'ReactWordmarkLight',
    'Stripe',
    'Typescript',
    'Vercel',
    'VercelDark',
    'VercelWordmark',
    'VercelWordmarkDark',
    'Vue',
  ]).default('ReactDark'),
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
  animate: z.boolean().default(false),
  animationType: z.enum(['spin', 'pulse', 'bounce', 'fade', 'none']).default('none'),
});

export type AnimatedIconProps = z.infer<typeof AnimatedIconSchema> & SVGProps<SVGSVGElement>;

const sizeClasses = {
  small: 'h-4 w-4',
  medium: 'h-6 w-6',
  large: 'h-8 w-8',
};

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

const animationClasses = {
  spin: 'animate-spin',
  pulse: 'animate-pulse',
  bounce: 'animate-bounce',
  fade: 'animate-fade-in',
  none: '',
};

/**
 * AnimatedIcon Component
 * Displays animated SVG icons with customizable properties
 */
export const AnimatedIcon: React.FC<AnimatedIconProps> = ({
  iconName = 'ReactDark',
  size = 'medium',
  color,
  animate = false,
  animationType = 'none',
  className = '',
  ...props
}) => {
  const IconComponent = iconComponents[iconName];

  if (!IconComponent) {
    console.error(`Icon "${iconName}" not found`);
    return null;
  }

  const sizeClass = sizeClasses[size];
  const colorClass = color ? colorClasses[color] : '';
  const animationClass = animate ? animationClasses[animationType] : '';

  const combinedClassName = [
    sizeClass,
    colorClass,
    animationClass,
    className
  ].filter(Boolean).join(' ');

  return (
    <IconComponent
      {...props}
      className={combinedClassName}
    />
  );
};

export { iconComponents };
