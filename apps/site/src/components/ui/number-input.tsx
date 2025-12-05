"use client"

import NumberFlow from "@number-flow/react"
import clsx from "clsx"
import { Minus, Plus } from "lucide-react"
import * as React from "react"
import { z } from "zod"


// Schema
export const NumberInputPropsSchema = z.object({
  value: z.number().int().optional().describe("Current numeric value (must be integer)"),
  min: z.number().int().optional().describe("Minimum allowed value (default: -Infinity)"),
  max: z.number().int().optional().describe("Maximum allowed value (default: Infinity)"),
  onChange: z.function().args(z.number()).returns(z.void()).optional().describe("Callback when value changes"),
})
.refine((data) => {
  if (data.min !== undefined && data.max !== undefined) return data.min <= data.max
  return true
}, { message: "min cannot be greater than max", path: ["min"] })
.refine((data) => {
  const min = data.min ?? -Infinity
  const max = data.max ?? Infinity
  return data.value === undefined || (data.value >= min && data.value <= max)
}, { message: "value must be between min and max", path: ["value"] })

export type NumberInputProps = z.infer<typeof NumberInputPropsSchema>


// Validation utility
export function validateNumberInputProps(
  props: unknown
): { success: true; data: NumberInputProps } | { success: false; error: z.ZodError } {
  const result = NumberInputPropsSchema.safeParse(props)
  if (result.success) return { success: true, data: result.data }
  return { success: false, error: result.error }
}


// Props factory
export function createNumberInputProps(partialProps: Partial<NumberInputProps> = {}): NumberInputProps {
  const props = {
    value: partialProps.value,
    min: partialProps.min,
    max: partialProps.max,
    onChange: partialProps.onChange,
  }

  const validation = validateNumberInputProps(props)
  if (!validation.success) {
    console.warn("Invalid NumberInput props:", validation.error.errors)
    return {
      value: partialProps.value ?? 0,
      min: partialProps.min,
      max: partialProps.max,
      onChange: partialProps.onChange,
    }
  }
  return validation.data
}


// Input field (forwardRef)
const NumberInputField = React.forwardRef<HTMLInputElement, NumberInputProps>(
  ({ value = 0, min = -Infinity, max = Infinity, onChange }, ref) => {
    return (
      <input
        ref={ref}
        type="number"
        value={value}
        min={min}
        max={max}
        step={1}
        autoComplete="off"
        onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
          const num = parseInt(e.target.value)
          if (!isNaN(num)) onChange?.(num)
        }}
        className="w-[1.5em] bg-transparent py-2 text-center font-[inherit] text-transparent outline-none"
        style={{ fontKerning: "none" }}
      />
    )
  }
)
NumberInputField.displayName = "NumberInputField"


// Main component
export function NumberInput(props: NumberInputProps) {
  const { value = 0, min = -Infinity, max = Infinity, onChange } = props

  const [internalValue, setInternalValue] = React.useState(value)
  const NumberInputRef = React.useRef<HTMLInputElement>(null)
  const [animated, setAnimated] = React.useState(true)
  const [showCaret, setShowCaret] = React.useState(true)

  // Sync with external changes
  React.useEffect(() => setInternalValue(value), [value])

  // Handle direct input
  const handleNumberInput = (num: number) => {
    if (num < min || num > max) {
      // revert to internalValue if out of bounds
      NumberInputRef.current!.value = String(internalValue)
      return
    }
    setInternalValue(num)
    onChange?.(num)
  }

  // Stepper buttons
  const handlePointerDown =
    (diff: number) => (event: React.PointerEvent<HTMLButtonElement>) => {
      setAnimated(true)
      if (event.pointerType === "mouse") {
        event.preventDefault()
        NumberInputRef.current?.focus()
      }
      const newVal = Math.min(Math.max(internalValue + diff, min), max)
      setInternalValue(newVal)
      onChange?.(newVal)
    }

  return (
    <div className="group flex items-stretch rounded-md text-3xl font-semibold ring ring-zinc-200 transition-[box-shadow] focus-within:ring-2 focus-within:ring-blue-500 dark:ring-zinc-800">
      <button
        aria-hidden
        tabIndex={-1}
        className="flex items-center pl-[.5em] pr-[.325em] hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        disabled={internalValue <= min}
        onPointerDown={handlePointerDown(-1)}
      >
        <Minus className="size-4" absoluteStrokeWidth strokeWidth={3.5} />
      </button>

      <div className="relative grid items-center justify-items-center text-center [grid-template-areas:'overlap'] *:[grid-area:overlap]">
        <NumberInputField
          ref={NumberInputRef}
          value={internalValue}
          min={min}
          max={max}
          onChange={handleNumberInput}
        />
        <NumberFlow
          value={internalValue}
          format={{ useGrouping: false }}
          aria-hidden
          animated={animated}
          onAnimationsStart={() => setShowCaret(false)}
          onAnimationsFinish={() => setShowCaret(true)}
          className="pointer-events-none"
          willChange
        />
      </div>

      <button
        aria-hidden
        tabIndex={-1}
        className="flex items-center pl-[.325em] pr-[.5em] hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        disabled={internalValue >= max}
        onPointerDown={handlePointerDown(1)}
      >
        <Plus className="size-4" absoluteStrokeWidth strokeWidth={3.5} />
      </button>
    </div>
  )
}



export default {
  NumberInput,
  NumberInputPropsSchema,
  validateNumberInputProps,
  createNumberInputProps,
}
