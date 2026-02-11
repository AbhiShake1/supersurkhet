import type React from 'react';
import { Button } from '@/components/ui/button';
import { TrashIcon } from 'lucide-react';
import type { ArrayElementWrapperProps } from '../react';

export const ArrayElementWrapper: React.FC<ArrayElementWrapperProps> = ({
  children,
  onRemove,
  testId,
  removeTestId,
}) => {
  return (
    <div className="relative border p-4 rounded-md mt-2" data-testid={testId}>
      <Button
        onClick={onRemove}
        variant="ghost"
        size="sm"
        className="absolute top-2 right-2"
        type="button"
        data-testid={removeTestId}
      >
        <TrashIcon className="h-4 w-4" />
      </Button>
      {children}
    </div>
  );
};
