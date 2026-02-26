import { useEffect, useMemo, useState } from 'react';
import z from 'zod';
import { cn } from '@/lib/utils';

export const GridSchema = z.object({
  rows: z.number().min(1).max(16),
  cols: z.number().min(1).max(16),
});

type Grid = z.infer<typeof GridSchema>;

const gridValues = ['6x4', '8x8', '8x3', '4x6', '3x8'] as const;

const DEFAULT_GRIDS: Record<(typeof gridValues)[number], Grid> = {
  '6x4': { rows: 4, cols: 6 },
  '8x8': { rows: 8, cols: 8 },
  '8x3': { rows: 3, cols: 8 },
  '4x6': { rows: 6, cols: 4 },
  '3x8': { rows: 8, cols: 3 },
} as const;

export const PixelImageSchema = z.object({
  src: z.string().optional(),
  width: z.number({ coerce: true }).default(256).optional(),
  height: z.number({ coerce: true }).default(256).optional(),
  grid: z.enum(gridValues).default('6x4'),
  customGrid: GridSchema.optional(),
  grayscaleAnimation: z.boolean().default(true),
  pixelFadeInDuration: z.number().min(0).default(1000),
  maxAnimationDelay: z.number().min(0).default(1200),
  colorRevealDelay: z.number().min(0).default(1300),
  className: z.string().optional(),
});

export type PixelImageProps = z.infer<typeof PixelImageSchema>;

export const PixelImage = ({
  src = 'https://cdn.pixabay.com/photo/2013/07/25/13/01/stones-167089_1280.jpg',
  grid = '6x4',
  grayscaleAnimation = true,
  pixelFadeInDuration = 1000,
  maxAnimationDelay = 1200,
  colorRevealDelay = 1300,
  width = 256,
  height = 256,
  className,
  customGrid,
}: PixelImageProps) => {
  const [isVisible, setIsVisible] = useState(false);
  const [showColor, setShowColor] = useState(false);

  const MIN_GRID = 1;
  const MAX_GRID = 16;

  const { rows, cols } = useMemo(() => {
    const isValidGrid = (grid?: Grid) => {
      if (!grid) return false;
      const { rows, cols } = grid;
      return (
        Number.isInteger(rows) &&
        Number.isInteger(cols) &&
        rows >= MIN_GRID &&
        cols >= MIN_GRID &&
        rows <= MAX_GRID &&
        cols <= MAX_GRID
      );
    };

    // biome-ignore lint/style/noNonNullAssertion: lint debt cleanup
    return isValidGrid(customGrid) ? customGrid! : DEFAULT_GRIDS[grid];
  }, [customGrid, grid]);

  useEffect(() => {
    setIsVisible(true);
    const colorTimeout = setTimeout(() => {
      setShowColor(true);
    }, colorRevealDelay);
    return () => clearTimeout(colorTimeout);
  }, [colorRevealDelay]);

  const pieces = useMemo(() => {
    const total = rows * cols;
    return Array.from({ length: total }, (_, index) => {
      const row = Math.floor(index / cols);
      const col = index % cols;

      const clipPath = `polygon(
        ${col * (100 / cols)}% ${row * (100 / rows)}%,
        ${(col + 1) * (100 / cols)}% ${row * (100 / rows)}%,
        ${(col + 1) * (100 / cols)}% ${(row + 1) * (100 / rows)}%,
        ${col * (100 / cols)}% ${(row + 1) * (100 / rows)}%
      )`;

      const delay = Math.random() * maxAnimationDelay;
      return {
        clipPath,
        delay,
      };
    });
  }, [rows, cols, maxAnimationDelay]);

  return (
    <div>
      <div
        style={{
          width,
          height,
        }}
        className={cn('relative select-none')}
      >
        {pieces.map((piece, index) => (
          <div
            // biome-ignore lint/suspicious/noArrayIndexKey: lint debt cleanup
            key={index}
            className={cn(
              'absolute inset-0 transition-all ease-out',
              isVisible ? 'opacity-100' : 'opacity-0',
            )}
            style={{
              clipPath: piece.clipPath,
              transitionDelay: `${piece.delay}ms`,
              transitionDuration: `${pixelFadeInDuration}ms`,
            }}
          >
            <img
              src={src}
              // biome-ignore lint/a11y/noRedundantAlt: lint debt cleanup
              alt={`Pixel image piece ${index + 1}`}
              className={cn(
                'z-1 rounded-[2.5rem] object-cover',
                grayscaleAnimation && (showColor ? 'grayscale-0' : 'grayscale'),
                className,
              )}
              style={{
                transition: grayscaleAnimation
                  ? `filter ${pixelFadeInDuration}ms cubic-bezier(0.4, 0, 0.2, 1)`
                  : 'none',
              }}
              width={width}
              height={height}
              draggable={false}
            />
          </div>
        ))}
      </div>
    </div>
  );
};
