import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { Star } from 'lucide-react';
import type { FieldWrapperProps } from './FieldWrapper';
import { useState } from 'react';

export interface RatingFieldProps extends FieldWrapperProps {
  max?: number;
  className?: string;
  allowHalf?: boolean;
}

export function RatingField({
  field,
  label,
  description,
  error,
  className,
  max = 5,
  allowHalf = false,
  // biome-ignore lint/correctness/noUnusedFunctionParameters: lint debt cleanup
  ...props
}: RatingFieldProps) {
  const [hoverRating, setHoverRating] = useState(0);
  const [currentRating, setCurrentRating] = useState(Number(field.value) || 0);

  const handleMouseEnter = (rating: number) => {
    setHoverRating(rating);
  };

  const handleMouseLeave = () => {
    setHoverRating(0);
  };

  const handleClick = (rating: number) => {
    const newRating = currentRating === rating ? 0 : rating;
    setCurrentRating(newRating);
    field.onChange(newRating);
  };

  const renderStars = () => {
    const displayRating = hoverRating || currentRating;

    return Array.from({ length: max }, (_, index) => {
      const starValue = index + 1;
      const isFilled = starValue <= displayRating;
      const isHalfFilled =
        allowHalf &&
        starValue - 0.5 <= displayRating &&
        displayRating < starValue;

      return (
        <button
          key={starValue}
          type="button"
          className="p-1 focus:outline-none"
          onMouseEnter={() => handleMouseEnter(starValue)}
          onMouseLeave={handleMouseLeave}
          onClick={() => handleClick(starValue)}
          aria-label={`Rate ${starValue} out of ${max} stars`}
        >
          <Star
            className={cn(
              'h-6 w-6 transition-colors',
              isFilled
                ? 'fill-yellow-400 text-yellow-400'
                : isHalfFilled
                  ? 'fill-yellow-400 text-yellow-400 opacity-50'
                  : 'fill-muted stroke-muted-foreground text-muted',
              !field.disabled &&
                'cursor-pointer hover:fill-yellow-300 hover:text-yellow-300',
            )}
          />
        </button>
      );
    });
  };

  return (
    <div className={cn('space-y-2', className)}>
      {label && (
        <Label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
          {label}
        </Label>
      )}

      <div className="flex items-center">
        <div className="flex" role="radiogroup" aria-label={label}>
          {renderStars()}
        </div>
        <span className="ml-2 text-sm font-medium text-muted-foreground">
          {currentRating.toFixed(allowHalf ? 1 : 0)}
        </span>
      </div>

      {description && (
        <p className="text-sm text-muted-foreground">{description}</p>
      )}
      {error && (
        <p className="text-sm font-medium text-destructive">{error.message}</p>
      )}
    </div>
  );
}
