import NumberFlow from "@number-flow/react"
import clsx from "clsx"
import { Minus, Plus } from "lucide-react"
import * as React from "react"
import { z } from "zod"

//Schema
export const InputPropsSchema = z.object({
  value: z.number()
    .int()
    .optional()
    .describe("Current numeric value (must be integer)"),
  
  min: z.number()
    .int()
    .optional()
    .describe("Minimum allowed value (default: -Infinity)"),
  
  max: z.number()
    .int()
    .optional()
    .describe("Maximum allowed value (default: Infinity)"),
  
  onChange: z.function()
    .args(z.number())
    .returns(z.void())
    .optional()
    .describe("Callback when value changes"),
})
.refine((data) => {
  if (data.min !== undefined && data.max !== undefined) {
    return data.min <= data.max
  }
  return true
}, {
  message: "min cannot be greater than max",
  path: ["min"],
})
.refine((data) => {
  const min = data.min ?? -Infinity
  const max = data.max ?? Infinity
  return data.value === undefined || (data.value >= min && data.value <= max)
}, {
  message: "value must be between min and max",
  path: ["value"],
})

export type InputProps = z.infer<typeof InputPropsSchema>

// Validation utility
export function validateInputProps(props: unknown): 
  { success: true; data: InputProps } | { success: false; error: z.ZodError } {
  const result = InputPropsSchema.safeParse(props)
  if (result.success) {
    return { success: true, data: result.data }
  }
  return { success: false, error: result.error }
}

// Props factory with validation and defaults
export function createInputProps(partialProps: Partial<InputProps> = {}): InputProps {
  const props = {
    value: partialProps.value,
    min: partialProps.min,
    max: partialProps.max,
    onChange: partialProps.onChange,
  }
  
  const validation = validateInputProps(props)
  
  if (!validation.success) {
    console.warn("Invalid Input props:", validation.error.errors)
    // Return safe defaults
    return {
      value: partialProps.value ?? 0,
      min: partialProps.min,
      max: partialProps.max,
      onChange: partialProps.onChange,
    }
  }
  
  return validation.data
}

// Main component - FIXED VERSION
export function Input(props: InputProps) {
  // Destructure with defaults
  const { 
    value = 0, 
    min = -Infinity, 
    max = Infinity, 
    onChange 
  } = props
  
  // Use local state to manage the displayed value
  const [internalValue, setInternalValue] = React.useState(value)
  
  // Sync with external value changes
  React.useEffect(() => {
    setInternalValue(value)
  }, [value])
  
  const defaultValue = React.useRef(value)
  const inputRef = React.useRef<HTMLInputElement>(null)
  const [animated, setAnimated] = React.useState(true)
  const [showCaret, setShowCaret] = React.useState(true)
  
  const handleInput: React.ChangeEventHandler<HTMLInputElement> = ({
    currentTarget: el,
  }) => {
    setAnimated(false)
    if (el.value === "") {
      onChange?.(defaultValue.current)
      setInternalValue(defaultValue.current)
      return
    }
    const num = parseInt(el.value)
    if (
      isNaN(num) ||
      (min != null && num < min) ||
      (max != null && num > max)
    ) {
      // Revert input's value:
      el.value = String(internalValue)
    } else {
      // Update both internal state and call onChange
      setInternalValue(num)
      onChange?.(num)
    }
  }
  
  const handlePointerDown =
    (diff: number) => (event: React.PointerEvent<HTMLButtonElement>) => {
      setAnimated(true)
      if (event.pointerType === "mouse") {
        event?.preventDefault()
        inputRef.current?.focus()
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
        disabled={min != null && internalValue <= min}
        onPointerDown={handlePointerDown(-1)}
      >
        <Minus className="size-4" absoluteStrokeWidth strokeWidth={3.5} />
      </button>
      <div className="relative grid items-center justify-items-center text-center [grid-template-areas:'overlap'] *:[grid-area:overlap]">
        <input
          ref={inputRef}
          className={clsx(
            showCaret ? "caret-primary" : "caret-transparent",
            "spin-hide w-[1.5em] bg-transparent py-2 text-center font-[inherit] text-transparent outline-none",
          )}
          // Make sure to disable kerning, to match NumberFlow:
          style={{ fontKerning: "none" }}
          type="number"
          min={min}
          step={1}
          autoComplete="off"
          inputMode="numeric"
          max={max}
          value={internalValue}
          onInput={handleInput}
          onChange={(e) => {
            // Handle direct input changes
            const num = parseInt(e.target.value)
            if (!isNaN(num)) {
              setInternalValue(num)
              onChange?.(num)
            }
          }}
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
        disabled={max != null && internalValue >= max}
        onPointerDown={handlePointerDown(1)}
      >
        <Plus className="size-4" absoluteStrokeWidth strokeWidth={3.5} />
      </button>
    </div>
  )
}


export default { 
  Input,
  InputPropsSchema,
  validateInputProps,
  createInputProps,
}