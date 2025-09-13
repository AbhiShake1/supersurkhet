"use client"

import * as React from "react"
import { Check, ChevronDown, Plus } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Command, CommandGroup, CommandItem, CommandList } from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Input } from "@/components/ui/input"

interface CustomSelectProps {
  value?: string
  onValueChange?: (value: string) => void
  placeholder?: string
  options: string[]
  allowCustom?: boolean
  className?: string
}

export function CustomSelect({
  value,
  onValueChange,
  placeholder = "Select option...",
  options,
  allowCustom = true,
  className,
}: CustomSelectProps) {
  const [open, setOpen] = React.useState(false)
  const [customValue, setCustomValue] = React.useState("")
  const [showCustomInput, setShowCustomInput] = React.useState(false)

  const handleSelect = (selectedValue: string) => {
    onValueChange?.(selectedValue)
    setOpen(false)
    setShowCustomInput(false)
    setCustomValue("")
  }

  const handleCustomSubmit = () => {
    if (customValue.trim()) {
      handleSelect(customValue.trim())
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault()
      handleCustomSubmit()
    }
  }

  const isCustomValue = value && !options.includes(value)

  return (
    <Popover open={open} onOpenChange={setOpen} modal>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          aria-expanded={open}
          className={cn("w-full justify-between", className)}
        >
          {value ? <span className="truncate">{isCustomValue ? `"${value}"` : value}</span> : placeholder}
          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0" align="start">
        <Command>
          <CommandList>
            <CommandGroup>
              {options.map((option) => (
                <CommandItem key={option} value={option} onSelect={() => handleSelect(option)}>
                  <Check className={cn("mr-2 h-4 w-4", value === option ? "opacity-100" : "opacity-0")} />
                  {option}
                </CommandItem>
              ))}
              {allowCustom && (
                <>
                  {isCustomValue && (
                    <CommandItem value={value} onSelect={() => handleSelect(value)}>
                      <Check className="mr-2 h-4 w-4 opacity-100" />"{value}"
                    </CommandItem>
                  )}
                  <CommandItem onSelect={() => setShowCustomInput(true)} className="text-muted-foreground">
                    <Plus className="mr-2 h-4 w-4" />
                    Add custom option...
                  </CommandItem>
                </>
              )}
            </CommandGroup>
            {showCustomInput && (
              <div className="p-2 border-t">
                <Input
                  placeholder="Enter custom option..."
                  value={customValue}
                  onChange={(e) => setCustomValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                  autoFocus
                />
                <div className="flex gap-2 mt-2">
                  <Button size="sm" onClick={handleCustomSubmit} disabled={!customValue.trim()}>
                    Add
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setShowCustomInput(false)
                      setCustomValue("")
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
