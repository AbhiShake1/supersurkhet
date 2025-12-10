"use client";

import React from "react";
import { z } from "zod";


// Zod schema
export const SpinnerPropsSchema = z.object({
  size: z
    .coerce
    .number()
    .int()
    .positive()
    .max(500)
    .optional()
    .default(20)
    .describe("Spinner size in pixels. Must be a positive integer."),


  color: z
    .string()
    .transform((val) => {      
      val = val.toLowerCase().trim();            
      if (!val) return "#8f8f8f";           
      if (/^#[0-9a-f]{3}$/.test(val)) {
        const r = val[1];
        const g = val[2];
        const b = val[3];
        return `#${r}${r}${g}${g}${b}${b}`;
      }    
      
      if (/^#[0-9a-f]{6}$/.test(val)) {
        return val;
      }
      
      // Handle named colors
      const colorMap: Record<string, string> = {
        'red': '#ef4444',
        'blue': '#3b82f6',
        'green': '#22c55e',
        'yellow': '#eab308',
        'purple': '#a855f7',
        'pink': '#ec4899',
        'gray': '#6b7280',
        'black': '#000000',
        'white': '#ffffff',
        'orange': '#f97316',
        'teal': '#14b8a6',
        'indigo': '#6366f1',
      };
      
      return colorMap[val] || "#8f8f8f";
    })
    .refine((val) => /^#[0-9a-f]{6}$/.test(val), {
      message: "Must be a valid hex color code (e.g., #8f8f8f, #ff0000, red, blue)",
    })
    .optional()
    .default("#8f8f8f")
    .describe("Spinner color in hex format (e.g., #8f8f8f) or named color (red, blue, green)"),
});


export type SpinnerProps = z.infer<typeof SpinnerPropsSchema>;


// Component
const bars = [
  { animationDelay: "-1.2s", transform: "rotate(.0001deg) translate(146%)" },
  { animationDelay: "-1.1s", transform: "rotate(30deg) translate(146%)" },
  { animationDelay: "-1.0s", transform: "rotate(60deg) translate(146%)" },
  { animationDelay: "-0.9s", transform: "rotate(90deg) translate(146%)" },
  { animationDelay: "-0.8s", transform: "rotate(120deg) translate(146%)" },
  { animationDelay: "-0.7s", transform: "rotate(150deg) translate(146%)" },
  { animationDelay: "-0.6s", transform: "rotate(180deg) translate(146%)" },
  { animationDelay: "-0.5s", transform: "rotate(210deg) translate(146%)" },
  { animationDelay: "-0.4s", transform: "rotate(240deg) translate(146%)" },
  { animationDelay: "-0.3s", transform: "rotate(270deg) translate(146%)" },
  { animationDelay: "-0.2s", transform: "rotate(300deg) translate(146%)" },
  { animationDelay: "-0.1s", transform: "rotate(330deg) translate(146%)" },
];

export const Spinner: React.FC<SpinnerProps> = (props) => {
  // Validate props with Zod schema
  const { size, color } = SpinnerPropsSchema.parse(props);

  return (
    <div style={{ width: size, height: size }} className="relative">
      {/* Spinner bars */}
      {bars.map((item) => (
        <div
          key={item.transform}
          className="absolute h-[8%] w-[24%] -left-[10%] -top-[3.9%] rounded-[5px] animate-spin-opacity"
          style={{
            backgroundColor: color,
            animationDelay: item.animationDelay,
            transform: item.transform,
            animationDuration: "1.2s",
          }}
        />
      ))}
      {/* Tailwind-style animation using custom CSS class */}
      <style>
        {`
          @keyframes spin-opacity {
            0% { opacity: 0.15; }
            100% { opacity: 1; }
          }
          .animate-spin-opacity {
            animation-name: spin-opacity;
            animation-timing-function: linear;
            animation-iteration-count: infinite;
          }
        `}
      </style>
    </div>
  );
};
