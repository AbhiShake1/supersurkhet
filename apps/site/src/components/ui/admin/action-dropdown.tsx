'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
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
import { ChevronDown, Plus } from 'lucide-react';

interface ActionType {
  value: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

interface ActionDropdownProps extends React.HTMLAttributes<HTMLDivElement> {
  actionTypes: ActionType[];
  onActionSelect: (actionType: string) => void;
  placeholder?: string;
  triggerText?: string;
  triggerClassName?: string;
  align?: 'start' | 'center' | 'end';
  variant?: 'default' | 'add' | 'select';
}

const ActionDropdown = React.forwardRef<HTMLDivElement, ActionDropdownProps>(
  (
    {
      className,
      actionTypes,
      onActionSelect,
      placeholder = 'Search actions...',
      triggerText = 'Select Action',
      triggerClassName,
      align = 'center',
      variant = 'default',
      ...props
    },
    ref,
  ) => {
    const [open, setOpen] = React.useState(false);

    const getTriggerContent = () => {
      switch (variant) {
        case 'add':
          return (
            <>
              <Plus className="mr-2 h-4 w-4" />
              {triggerText}
            </>
          );
        case 'select':
          return (
            <>
              {triggerText}
              <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
            </>
          );
        default:
          return triggerText;
      }
    };

    const getTriggerVariant = () => {
      switch (variant) {
        case 'add':
          return 'default';
        case 'select':
          return 'outline';
        default:
          return 'default';
      }
    };

    return (
      <div
        ref={ref}
        className={cn('flex justify-center', className)}
        {...props}
      >
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant={getTriggerVariant()}
              role="combobox"
              aria-expanded={open}
              className={cn(
                'justify-between transition-all duration-200 hover:shadow-md',
                variant === 'add' && 'w-auto',
                variant === 'select' && 'w-full',
                triggerClassName,
              )}
            >
              {getTriggerContent()}
            </Button>
          </PopoverTrigger>
          <PopoverContent
            className="w-[280px] p-0 transition-all duration-200"
            align={align}
          >
            <Command>
              <CommandInput placeholder={placeholder} />
              <CommandList>
                <CommandEmpty className="py-6 text-center text-sm text-muted-foreground">
                  No action found
                </CommandEmpty>
                <CommandGroup className="p-1">
                  {actionTypes.map((actionType) => {
                    const Icon = actionType.icon;
                    return (
                      <CommandItem
                        key={actionType.value}
                        value={actionType.value}
                        onSelect={(currentValue) => {
                          onActionSelect(currentValue);
                          setOpen(false);
                        }}
                        className="flex items-center gap-3 rounded-md px-3 py-2.5 text-sm transition-colors hover:bg-accent hover:text-accent-foreground cursor-pointer"
                      >
                        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-muted text-muted-foreground">
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="flex flex-col">
                          <span className="font-medium">
                            {actionType.label}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {actionType.value.replace('_', ' ')}
                          </span>
                        </div>
                      </CommandItem>
                    );
                  })}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      </div>
    );
  },
);

ActionDropdown.displayName = 'ActionDropdown';

export { ActionDropdown, type ActionDropdownProps, type ActionType };
