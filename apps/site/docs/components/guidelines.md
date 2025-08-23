# Component Guidelines

This document outlines the design principles and implementation guidelines for all UI components in the SuperSurkhet ecosystem.

## Design Principles

1. **Consistency** - All components should follow a consistent design language
2. **Accessibility** - All components must be accessible by default
3. **Responsive** - All components should work beautifully on all screen sizes
4. **Performance** - All components should be optimized for performance
5. **Dark Mode** - All components should support dark mode

## Component Structure

All components should follow this structure:

```tsx
import * as React from "react"
import { cn } from "@/lib/utils"

interface ComponentNameProps extends React.HTMLAttributes<HTMLDivElement> {
  // Props specific to this component
}

const ComponentName = React.forwardRef<HTMLDivElement, ComponentNameProps>(
  ({ className, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "base-styles",
          className
        )}
        {...props}
      />
    )
  }
)
ComponentName.displayName = "ComponentName"

export { ComponentName }
```

## Styling Guidelines

1. Use `cn()` utility for conditional class names
2. Use Tailwind classes for styling
3. Follow the project's color palette
4. Use consistent spacing (padding/margin) with Tailwind's spacing scale
5. Use consistent border radius values
6. Use consistent font sizes and weights

## Accessibility Guidelines

1. Use semantic HTML elements
2. Provide proper ARIA attributes when needed
3. Ensure proper keyboard navigation
4. Use proper contrast ratios for text
5. Provide labels for form elements

## Dark Mode Support

All components should support dark mode by using Tailwind's dark: prefix:

```tsx
<div className="bg-white dark:bg-gray-900 text-gray-900 dark:text-white" />
```

## Component Variants

Use the `cva` library for defining component variants:

```tsx
import { cva } from "class-variance-authority"

const buttonVariants = cva(
  "inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none ring-offset-background",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline: "border border-input hover:bg-accent hover:text-accent-foreground",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "underline-offset-4 hover:underline text-primary",
      },
      size: {
        default: "h-10 py-2 px-4",
        sm: "h-9 px-3 rounded-md",
        lg: "h-11 px-8 rounded-md",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)
```

## Component Documentation

Each component should have a corresponding documentation file in the `docs/components` directory with:

1. Component description
2. Props documentation
3. Usage examples
4. Do's and Don'ts
5. Accessibility considerations