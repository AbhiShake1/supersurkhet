import * as React from "react";
import { Check, ChevronsUpDown } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

interface ComboboxOption {
  value: string;
  label: string;
}

interface ComboboxProps {
  options: ComboboxOption[];
  value: string | undefined;
  onValueChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export function Combobox({
  options: _options,
  value,
  onValueChange,
  placeholder = "Select an option...",
  className,
  disabled = false,
}: ComboboxProps) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");

  const options = React.useMemo(() => {
    if (!search) return _options;
    return _options.filter((option) => option.label.toLowerCase().includes(search.toLowerCase()))
  }, [_options, search])

  return (
    <Popover
      open={disabled ? false : open}
      onOpenChange={(nextOpen) => {
        if (disabled) return;
        setOpen(nextOpen);
      }}
      modal
    >
      <PopoverTrigger asChild>
        <span
          className="w-full"
          aria-disabled={disabled}
          onPointerDown={(event) => {
            if (disabled) {
              event.preventDefault();
              event.stopPropagation();
            }
          }}
        >
          <Button
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className={cn("w-full justify-between", className)}
            disabled={disabled}
          >
            <span className="truncate">
              {value
                ? options.find((option) => option.value === value)?.label
                : placeholder}
            </span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </span>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0 z-50 pointer-events-auto" portal={false}>
        <Command>
          <CommandInput
            placeholder="Search options..."
            value={search}
            onValueChange={(v) => {
              setSearch(v)
            }}
          />
          <CommandList>
            <CommandEmpty>No option found.</CommandEmpty>
            <CommandGroup>
              {options.map((option) => (
                <CommandItem
                  key={option.value}
                  value={option.label}
                  onSelect={(currentLabel) => {
                    const currentValue = options.find(o => o.label === currentLabel)?.value
                    onValueChange(currentValue === value ? "" : currentValue ?? "");
                    setOpen(false);
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === option.value ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {option.label}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
