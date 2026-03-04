import { Check, ChevronsUpDown, Pencil, Plus } from 'lucide-react';
import * as React from 'react';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';

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
  testId?: string;
  createOptionLabel?: string;
  editOptionLabel?: string;
  canCreateOption?: boolean;
  canEditOptions?: boolean;
  onCreateOption?: () => void;
  onEditOption?: (value: string) => void;
}

export function Combobox({
  options: _options,
  value,
  onValueChange,
  placeholder = 'Select an option...',
  className,
  disabled = false,
  testId,
  createOptionLabel = 'Add New',
  editOptionLabel = 'Edit',
  canCreateOption = false,
  canEditOptions = false,
  onCreateOption,
  onEditOption,
}: ComboboxProps) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState('');

  const options = React.useMemo(() => {
    if (!search) return _options;
    return _options.filter((option) =>
      option.label.toLowerCase().includes(search.toLowerCase()),
    );
  }, [_options, search]);

  return (
    <Popover
      open={disabled ? false : open}
      onOpenChange={(nextOpen) => {
        if (disabled) return;
        setOpen(nextOpen);
      }}
      modal={false}
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
            className={cn('w-full justify-between', className)}
            disabled={disabled}
            data-testid={testId}
          >
            <span className="truncate">
              {value
                ? _options.find((option) => option.value === value)?.label
                : placeholder}
            </span>
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </span>
      </PopoverTrigger>
      <PopoverContent
        className="w-full p-0 z-50 pointer-events-auto"
        portal={false}
      >
        <Command>
          <CommandInput
            placeholder="Search options..."
            value={search}
            onValueChange={(v) => {
              setSearch(v);
            }}
          />
          <div className="max-h-64 overflow-y-auto">
            <CommandList className="max-h-none overflow-visible">
              <CommandEmpty>No option found.</CommandEmpty>
              <CommandGroup>
                {options.map((option) => (
                  <CommandItem
                    key={option.value}
                    value={option.label}
                    onSelect={() => {
                      onValueChange(option.value === value ? '' : option.value);
                      setOpen(false);
                    }}
                  >
                    <Check
                      className={cn(
                        'mr-2 h-4 w-4',
                        value === option.value ? 'opacity-100' : 'opacity-0',
                      )}
                    />
                    <span className="truncate">{option.label}</span>
                    {canEditOptions && onEditOption ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="ml-auto size-7 shrink-0"
                        onMouseDown={(event) => {
                          event.preventDefault();
                          event.stopPropagation();
                        }}
                        onClick={(event) => {
                          event.preventDefault();
                          event.stopPropagation();
                          setOpen(false);
                          onEditOption(option.value);
                        }}
                        aria-label={`${editOptionLabel} ${option.label}`}
                      >
                        <Pencil className="size-3.5" />
                      </Button>
                    ) : null}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </div>
          {canCreateOption && onCreateOption ? (
            <div className="border-t p-1">
              <Button
                type="button"
                variant="ghost"
                className="w-full justify-start gap-2"
                onMouseDown={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                }}
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  setOpen(false);
                  onCreateOption();
                }}
              >
                <Plus className="size-4" />
                {createOptionLabel}
              </Button>
            </div>
          ) : null}
        </Command>
      </PopoverContent>
    </Popover>
  );
}
