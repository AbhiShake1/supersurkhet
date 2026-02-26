import * as PopoverPrimitive from '@radix-ui/react-popover';
import * as React from 'react';
import { cn } from '@/lib/utils';

const HoverablePopoverContext = React.createContext<{
  open: boolean;
  setOpen: (open: boolean) => void;
}>({
  open: false,
  setOpen: () => {},
});

const HoverablePopover = ({
  children,
  ...props
}: React.ComponentPropsWithoutRef<typeof PopoverPrimitive.Root>) => {
  const [open, setOpen] = React.useState(false);

  return (
    <PopoverPrimitive.Root {...props} open={open} onOpenChange={setOpen}>
      <HoverablePopoverContext.Provider value={{ open, setOpen }}>
        {children}
      </HoverablePopoverContext.Provider>
    </PopoverPrimitive.Root>
  );
};

const HoverablePopoverTrigger = React.forwardRef<
  React.ElementRef<typeof PopoverPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof PopoverPrimitive.Trigger>
>(({ children, ...props }, ref) => {
  const { setOpen } = React.useContext(HoverablePopoverContext);

  return (
    <PopoverPrimitive.Trigger
      ref={ref}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => {}}
      onFocus={() => setOpen(true)}
      onBlur={() => {}}
      {...props}
    >
      {children}
    </PopoverPrimitive.Trigger>
  );
});
HoverablePopoverTrigger.displayName = 'HoverablePopoverTrigger';

const HoverablePopoverContent = React.forwardRef<
  React.ElementRef<typeof PopoverPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof PopoverPrimitive.Content>
>(({ className, align = 'center', sideOffset = 4, ...props }, ref) => {
  const { setOpen } = React.useContext(HoverablePopoverContext);

  return (
    <PopoverPrimitive.Portal>
      <PopoverPrimitive.Content
        ref={ref}
        align={align}
        sideOffset={sideOffset}
        className={cn(
          'bg-popover text-popover-foreground data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 z-[1302] w-72 rounded-md border p-4 shadow-md outline-hidden',
          className,
        )}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        {...props}
      />
    </PopoverPrimitive.Portal>
  );
});
HoverablePopoverContent.displayName = 'HoverablePopoverContent';

export { HoverablePopover, HoverablePopoverTrigger, HoverablePopoverContent };
