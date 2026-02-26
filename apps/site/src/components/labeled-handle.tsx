import { forwardRef } from 'react';
import { BaseHandle, type BaseHandleProps } from '@/components/base-handle';
import { cn } from '@/lib/utils';

const flexDirections = {
  top: 'flex-col',
  right: 'flex-row-reverse justify-end',
  bottom: 'flex-col-reverse justify-end',
  left: 'flex-row',
};

type LabeledHandleProps = BaseHandleProps & {
  title: string;
  handleClassName?: string;
  labelClassName?: string;
  className?: string;
};

export const LabeledHandle = forwardRef<HTMLDivElement, LabeledHandleProps>(
  (
    { className, labelClassName, handleClassName, title, position, ...props },
    ref,
  ) => (
    <div
      ref={ref}
      title={title}
      className={cn(
        'relative flex items-center',
        flexDirections[position],
        className,
      )}
    >
      <BaseHandle position={position} className={handleClassName} {...props} />
      {/** biome-ignore lint/a11y/noLabelWithoutControl: lint debt cleanup */}
      <label className={cn('px-3 text-foreground', labelClassName)}>
        {title}
      </label>
    </div>
  ),
);

LabeledHandle.displayName = 'LabeledHandle';
