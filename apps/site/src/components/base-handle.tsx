import { Handle, type HandleProps } from '@xyflow/react';
import { forwardRef } from 'react';

import { cn } from '@/lib/utils';

export type BaseHandleProps = HandleProps & {
  onDrop?: (event: React.DragEvent) => void;
  onDragOver?: (event: React.DragEvent) => void;
  onDragLeave?: (event: React.DragEvent) => void;
};

export const BaseHandle = forwardRef<HTMLDivElement, BaseHandleProps>(
  ({ className, children, onDrop, onDragOver, onDragLeave, ...props }, ref) => {
    return (
      <Handle
        ref={ref}
        {...props}
        className={cn(
          'h-[11px] w-[11px] rounded-full border border-slate-300 bg-slate-100 transition dark:border-secondary dark:bg-secondary',
          className,
        )}
        onDrop={onDrop}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        {...props}
      >
        {children}
      </Handle>
    );
  },
);

BaseHandle.displayName = 'BaseHandle';
