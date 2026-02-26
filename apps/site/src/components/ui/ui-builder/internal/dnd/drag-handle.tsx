import { useDraggable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical } from 'lucide-react';
import type React from 'react';
import { useMemo } from 'react';
import { cn } from '@/lib/utils';

interface DragHandleProps {
  layerId: string;
  layerType: string;
  className?: string;
}

export const DragHandle: React.FC<DragHandleProps> = ({
  layerId,
  layerType,
  className,
}) => {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: layerId,
      data: {
        type: 'layer',
        layerId,
        layerType,
      },
    });

  const style = useMemo(() => {
    return {
      transform: CSS.Translate.toString(transform),
    };
  }, [transform]);

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={cn(
        'cursor-grab size-6 flex items-center justify-center active:cursor-grabbing bg-blue-500 text-white hover:bg-white hover:text-black p-1 rounded-lg z-50',
        'opacity-100 transition-opacity duration-200',
        isDragging && 'cursor-grabbing opacity-0',
        className,
      )}
      data-testid={`drag-handle-${layerId}`}
    >
      {!isDragging && <GripVertical className="size-3" />}
    </div>
  );
};
