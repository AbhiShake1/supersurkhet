import { Star } from 'lucide-react';
import type React from 'react';
import { cn } from '@/lib/utils';
import type { AutoFormFieldProps } from '../react';

function toRatingValue(value: unknown) {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return 0;
}

export const RatingField: React.FC<AutoFormFieldProps> = ({
  inputProps,
  value,
}) => {
  const { key, onChange, name, disabled } = inputProps;
  void key;

  const max = 5;
  const currentRating = Math.max(0, Math.min(max, toRatingValue(value)));

  const setRating = (rating: number) => {
    if (disabled) return;
    const eventLike = {
      target: {
        name,
        value: rating,
      },
    };
    onChange?.(
      eventLike as unknown as Parameters<NonNullable<typeof onChange>>[0],
    );
  };

  return (
    <div className="flex items-center gap-2">
      <div className="flex" role="radiogroup" aria-label="Rating">
        {Array.from({ length: max }, (_, index) => {
          const starValue = index + 1;
          const isFilled = starValue <= currentRating;
          return (
            <button
              key={starValue}
              type="button"
              className="p-1 focus:outline-none"
              onClick={() => setRating(starValue)}
              aria-label={`Rate ${starValue} out of ${max} stars`}
              disabled={disabled}
            >
              <Star
                className={cn(
                  'h-6 w-6 transition-colors',
                  isFilled
                    ? 'fill-yellow-400 text-yellow-400'
                    : 'fill-muted text-muted',
                  !disabled && 'cursor-pointer hover:fill-yellow-300',
                )}
              />
            </button>
          );
        })}
      </div>
      <span className="text-sm font-medium text-muted-foreground">
        {currentRating.toFixed(0)}
      </span>
    </div>
  );
};
