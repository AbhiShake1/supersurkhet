import { AddComponentsPopover } from '@/components/ui/ui-builder/internal/components/add-component-popover';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';

type DividerControlProps = {
  className?: string;
  addPosition?: number;
  parentLayerId: string;
};

export function DividerControl({
  className,
  addPosition,
  parentLayerId,
}: DividerControlProps) {
  return (
    <div className={cn('relative py-0', className)}>
      <div className="absolute inset-0 flex items-center" aria-hidden="true">
        <div className="w-full border-t border-primary border-dashed" />
      </div>
      <Tooltip>
        <AddComponentsPopover
          addPosition={addPosition}
          parentLayerId={parentLayerId}
        >
          <TooltipTrigger asChild>
            <Button
              variant="outline"
              className="group flex items-center rounded-full bg-secondary h-min p-2 text-sm font-semibold text-secondar-foreground shadow-sm ring-1 ring-inset ring-secondary transition-all duration-200 ease-in-out gap-0"
            >
              <PlusCircle className="h-5 w-5 text-secondary-foreground" />
            </Button>
          </TooltipTrigger>
        </AddComponentsPopover>
        <TooltipContent>Add component</TooltipContent>
      </Tooltip>
    </div>
  );
}
