import { ComponentPropsWithoutRef } from "react"
import { z } from 'zod';

import { cn } from "@/lib/utils"

export const AnimatedGradientTextSchema = z.object({
  children: z.any().optional(),
  className: z.string().optional(),
  speed: z.number().default(1),
  colorFrom: z.string().default("#ffaa40"),
  colorTo: z.string().default("#9c40ff"),
});

export type AnimatedGradientTextProps = z.infer<typeof AnimatedGradientTextSchema>;

export function AnimatedGradientText({
  children,
  className,
  speed = 1,
  colorFrom = "#ffaa40",
  colorTo = "#9c40ff",
  ...props
}: AnimatedGradientTextProps) {
  return (
    <span
      style={
        {
          "--bg-size": `${speed * 300}%`,
          "--color-from": colorFrom,
          "--color-to": colorTo,
        } as React.CSSProperties
      }
      className={cn(
        `animate-gradient inline bg-gradient-to-r from-[var(--color-from)] via-[var(--color-to)] to-[var(--color-from)] bg-[length:var(--bg-size)_100%] bg-clip-text text-transparent`,
        className
      )}
      {...props}
    >
      {children}
    </span>
  )
}
