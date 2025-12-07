"use client"

import * as React from "react"
import * as SliderPrimitive from "@radix-ui/react-slider"

import { cn } from "@/lib/utils"
import { z } from "zod"

// Helper for numeric fields that might come as strings from forms
const numericField = (defaultValue: number = 0) =>
  z.preprocess(
    (val) => {
      if (val === undefined || val === null) return defaultValue
      const num = Number(val)
      return isNaN(num) ? defaultValue : num
    },
    z.number().optional().default(defaultValue)
  )

// Helper for value/defaultValue fields that can be number or array
const sliderValueField = () =>
  z.preprocess(
    (val) => {
      if (val === undefined || val === null) return undefined
      
      // If it's already an array of numbers
      if (Array.isArray(val)) {
        return val.map(v => {
          const num = Number(v)
          return isNaN(num) ? 0 : num
        })
      }
      
      // If it's a string that looks like an array (e.g., "[50]")
      if (typeof val === 'string' && val.startsWith('[') && val.endsWith(']')) {
        try {
          const parsed = JSON.parse(val)
          if (Array.isArray(parsed)) {
            return parsed.map(v => {
              const num = Number(v)
              return isNaN(num) ? 0 : num
            })
          }
        } catch {
          // If parsing fails, try to convert the string directly
          const num = Number(val)
          return isNaN(num) ? undefined : [num]
        }
      }
      
      // If it's a single value
      const num = Number(val)
      return isNaN(num) ? undefined : [num]
    },
    z.union([z.number(), z.array(z.number())]).optional()
  )



//Schema
export const sliderSchema = z.object({
  className: z.string().optional(),
  min: numericField(0),
  max: numericField(100),
  step: numericField(1),
  value: sliderValueField(),
  defaultValue: sliderValueField(),
  disabled: z.boolean().optional().default(false),
  onValueChange: z
    .function()
    .args(z.union([z.number(), z.array(z.number())]))
    .returns(z.void())
    .optional(),
}).catchall(z.unknown())

export type SliderProps = z.infer<typeof sliderSchema>


const validateSliderProps = (props: any): SliderPrimitive.SliderProps => {
  try {
    const validated = sliderSchema.parse(props)
    return validated as SliderPrimitive.SliderProps
  } catch (error) {
    console.warn("Slider props validation failed:", error)
    
    return {
      min: 0,
      max: 100,
      step: 1,
      ...props
    }
  }
}

const Slider = React.forwardRef<
  React.ElementRef<typeof SliderPrimitive.Root>,
  SliderProps
>((props, ref) => {
  
  const validatedProps = validateSliderProps(props)
  
  return (
    <SliderPrimitive.Root
      ref={ref}
      className={cn(
        "relative flex w-full touch-none select-none items-center",
        validatedProps.className,
      )}
      {...validatedProps}
    >
      <SliderPrimitive.Track className="relative h-2 w-full grow overflow-hidden rounded-full bg-secondary">
        <SliderPrimitive.Range className="absolute h-full bg-primary" />
      </SliderPrimitive.Track>
      <SliderPrimitive.Thumb className="block h-5 w-5 rounded-full border-2 border-primary bg-background ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50" />
    </SliderPrimitive.Root>
  )
})
Slider.displayName = SliderPrimitive.Root.displayName

export { Slider }