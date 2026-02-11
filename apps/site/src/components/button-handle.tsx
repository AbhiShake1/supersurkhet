import { Position, type HandleProps } from '@xyflow/react';
import { BaseHandle } from '@/components/base-handle';
import { useState, useRef } from 'react';

const wrapperClassNames: Record<Position, string> = {
  [Position.Top]:
    'flex-col-reverse left-1/2 -translate-y-full -translate-x-1/2',
  [Position.Bottom]: 'flex-col left-1/2 translate-y-[10px] -translate-x-1/2',
  [Position.Left]:
    'flex-row-reverse top-1/2 -translate-x-full -translate-y-1/2',
  [Position.Right]: 'top-1/2 -translate-y-1/2 translate-x-[10px]',
};

export const ButtonHandle = ({
  showButton = true,
  position = Position.Bottom,
  children,
  onDrop,
  onDragOver,
  onDragLeave,
  ...props
}: HandleProps & {
  showButton?: boolean;
  onDrop?: (event: React.DragEvent) => void;
  onDragOver?: (event: React.DragEvent) => void;
  onDragLeave?: (event: React.DragEvent) => void;
}) => {
  const wrapperClassName = wrapperClassNames[position || Position.Bottom];
  const vertical = position === Position.Top || position === Position.Bottom;
  const [isDragOver, setIsDragOver] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Handle drop events
  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
    setIsDragOver(false);
    onDrop?.(event);
  };

  // Handle drag over events
  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault();
    event.stopPropagation();
    event.dataTransfer.dropEffect = 'move';
    setIsDragOver(true);
    onDragOver?.(event);
  };

  // Handle drag leave events
  const handleDragLeave = (event: React.DragEvent) => {
    // Check if we're actually leaving the handle or just moving to a child element
    if (
      wrapperRef.current &&
      !wrapperRef.current.contains(event.relatedTarget as Node)
    ) {
      setIsDragOver(false);
      onDragLeave?.(event);
    }
  };

  return (
    <BaseHandle position={position} id={props.id} {...props} className="">
      {showButton && (
        // biome-ignore lint/a11y/noStaticElementInteractions: lint debt cleanup
        <div
          ref={wrapperRef}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          className={`absolute flex items-center ${wrapperClassName} pointer-events-auto ${isDragOver ? 'ring-2 ring-accent border-accent rounded-full' : ''}`}
        >
          <div
            className={`bg-gray-300 ${vertical ? 'h-10 w-[1px]' : 'h-[1px] w-10'}`}
          />
          <div className="nodrag nopan pointer-events-auto">{children}</div>
        </div>
      )}
    </BaseHandle>
  );
};
