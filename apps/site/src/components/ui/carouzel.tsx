import { ChevronLeft, ChevronRight } from 'lucide-react';
import { motion, type Transition, useMotionValue } from 'motion/react';
import {
  Children,
  createContext,
  type ReactNode,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import z from 'zod';
import { cn } from '@/lib/utils';

export const CarouzelContextSchema = z.object({
  index: z.number(),
  setIndex: z.function().args(z.number()).returns(z.void()),

  itemsCount: z.number(),
  setItemsCount: z.function().args(z.number()).returns(z.void()),

  disableDrag: z.boolean(),
});

export type CarouzelContextType = z.infer<typeof CarouzelContextSchema>;

const CarouzelContext = createContext<CarouzelContextType | undefined>(
  undefined,
);

function useCarouzel() {
  const context = useContext(CarouzelContext);
  if (!context) {
    throw new Error('useCarouzel must be used within an CarouselProvider');
  }
  return context;
}

export const CarouzelProviderSchema = z.object({
  children: z.custom<ReactNode>(),
  initialIndex: z.number().optional(),
  onIndexChange: z.function().args(z.number()).returns(z.void()).optional(),
  disableDrag: z.boolean().optional(),
});

export type CarouzelProviderProps = z.infer<typeof CarouzelProviderSchema>;

function CarouzelProvider({
  children,
  initialIndex = 0,
  onIndexChange,
  disableDrag = false,
}: CarouzelProviderProps) {
  const [index, setIndex] = useState<number>(initialIndex);
  const [itemsCount, setItemsCount] = useState<number>(0);

  const handleSetIndex = (newIndex: number) => {
    setIndex(newIndex);
    onIndexChange?.(newIndex);
  };

  useEffect(() => {
    setIndex(initialIndex);
  }, [initialIndex]);

  return (
    <CarouzelContext.Provider
      value={{
        index,
        setIndex: handleSetIndex,
        itemsCount,
        setItemsCount,
        disableDrag,
      }}
    >
      {children}
    </CarouzelContext.Provider>
  );
}

export const CarouzelSchema = z.object({
  children: z.custom<ReactNode>(),
  className: z.string().optional(),
  initialIndex: z.number().optional(),
  index: z.number().optional(),
  onIndexChange: z.function().args(z.number()).returns(z.void()).optional(),
  disableDrag: z.boolean().optional(),
});

export type CarouzelProps = z.infer<typeof CarouzelSchema>;

function Carouzel({
  children,
  className,
  initialIndex = 0,
  index: externalIndex,
  onIndexChange,
  disableDrag = false,
}: CarouzelProps) {
  const [internalIndex, setInternalIndex] = useState<number>(initialIndex);
  const isControlled = externalIndex !== undefined;
  const currentIndex = isControlled ? externalIndex : internalIndex;

  const handleIndexChange = (newIndex: number) => {
    if (!isControlled) {
      setInternalIndex(newIndex);
    }
    onIndexChange?.(newIndex);
  };

  return (
    <CarouzelProvider
      initialIndex={currentIndex}
      onIndexChange={handleIndexChange}
      disableDrag={disableDrag}
    >
      <div
        className={cn(
          'group/hover relative w-min min-w-0 max-w-full',
          className,
        )}
      >
        <div className="overflow-hidden">{children}</div>
      </div>
    </CarouzelProvider>
  );
}

export const CarouzelNavigationSchema = z.object({
  className: z.string().optional(),
  classNameButton: z.string().optional(),
  alwaysShow: z.boolean().optional(),
});

export type CarouzelNavigationProps = z.infer<typeof CarouzelNavigationSchema>;

function CarouzelNavigation({
  className,
  classNameButton,
  alwaysShow,
}: CarouzelNavigationProps) {
  const { index, setIndex, itemsCount } = useCarouzel();

  return (
    <div
      className={cn(
        'pointer-events-none absolute top-1/2 flex -translate-y-1/2 justify-between px-2',
        className,
      )}
    >
      <button
        type="button"
        aria-label="Previous slide"
        className={cn(
          'pointer-events-auto h-fit w-fit rounded-full bg-zinc-50 p-2 transition-opacity duration-300 dark:bg-zinc-950',
          alwaysShow
            ? 'opacity-100'
            : 'opacity-0 group-hover/hover:opacity-100',
          alwaysShow
            ? 'disabled:opacity-40'
            : 'group-hover/hover:disabled:opacity-40',
          classNameButton,
        )}
        disabled={index === 0}
        onClick={() => {
          if (index > 0) {
            setIndex(index - 1);
          }
        }}
      >
        <ChevronLeft
          className="stroke-zinc-600 dark:stroke-zinc-50"
          size={16}
        />
      </button>
      <button
        type="button"
        className={cn(
          'pointer-events-auto h-fit w-fit rounded-full bg-zinc-50 p-2 transition-opacity duration-300 dark:bg-zinc-950',
          alwaysShow
            ? 'opacity-100'
            : 'opacity-0 group-hover/hover:opacity-100',
          alwaysShow
            ? 'disabled:opacity-40'
            : 'group-hover/hover:disabled:opacity-40',
          classNameButton,
        )}
        aria-label="Next slide"
        disabled={index + 1 === itemsCount}
        onClick={() => {
          if (index < itemsCount - 1) {
            setIndex(index + 1);
          }
        }}
      >
        <ChevronRight
          className="stroke-zinc-600 dark:stroke-zinc-50"
          size={16}
        />
      </button>{' '}
    </div>
  );
}

export const CarouzelIndicatorSchema = z.object({
  className: z.string().optional(),
  classNameButton: z.string().optional(),
});

export type CarouzelIndicatorProps = z.infer<typeof CarouzelIndicatorSchema>;

function CarouzelIndicator({
  className,
  classNameButton,
}: CarouzelIndicatorProps) {
  const { index, itemsCount, setIndex } = useCarouzel();

  return (
    <div
      className={cn(
        'absolute bottom-0 z-10 flex w-full items-center justify-center',
        className,
      )}
    >
      <div className="flex space-x-2">
        {Array.from({ length: itemsCount }, (_, i) => (
          <button
            // biome-ignore lint/suspicious/noArrayIndexKey: lint debt cleanup
            key={i}
            type="button"
            aria-label={`Go to slide ${i + 1}`}
            onClick={() => setIndex(i)}
            className={cn(
              'h-2 w-2 rounded-full transition-opacity duration-300',
              index === i
                ? 'bg-zinc-950 dark:bg-zinc-50'
                : 'bg-zinc-900/50 dark:bg-zinc-100/50',
              classNameButton,
            )}
          />
        ))}
      </div>{' '}
    </div>
  );
}

export const CarouzelContentSchema = z.object({
  children: z.custom<ReactNode>(),
  className: z.string().optional(),
  transition: z.custom<Transition>().optional(),
});

export type CarouzelContentProps = z.infer<typeof CarouzelContentSchema>;

function CarouzelContent({
  children,
  className,
  transition,
}: CarouzelContentProps) {
  const { index, setIndex, setItemsCount, disableDrag } = useCarouzel();
  const [visibleItemsCount, setVisibleItemsCount] = useState(1);
  const dragX = useMotionValue(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const itemsLength = Children.count(children);

  useEffect(() => {
    if (!containerRef.current) {
      return;
    }

    const options = {
      root: containerRef.current,
      threshold: 0.5,
    };

    const observer = new IntersectionObserver((entries) => {
      const visibleCount = entries.filter(
        (entry) => entry.isIntersecting,
      ).length;
      setVisibleItemsCount(visibleCount);
    }, options);

    const childNodes = containerRef.current.children;
    // biome-ignore lint/suspicious/useIterableCallbackReturn: lint debt cleanup
    Array.from(childNodes).forEach((child) => observer.observe(child));

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!itemsLength) {
      return;
    }

    setItemsCount(itemsLength);
  }, [itemsLength, setItemsCount]);

  const onDragEnd = () => {
    const x = dragX.get();

    if (x <= -10 && index < itemsLength - 1) {
      setIndex(index + 1);
    } else if (x >= 10 && index > 0) {
      setIndex(index - 1);
    }
  };

  return (
    <motion.div
      drag={disableDrag ? false : 'x'}
      dragConstraints={
        disableDrag
          ? undefined
          : {
              left: 0,
              right: 0,
            }
      }
      dragMomentum={disableDrag ? undefined : false}
      style={{
        x: disableDrag ? undefined : dragX,
      }}
      animate={{
        translateX: `-${index * (100 / visibleItemsCount)}%`,
      }}
      onDragEnd={disableDrag ? undefined : onDragEnd}
      transition={
        transition || {
          damping: 18,
          stiffness: 90,
          type: 'spring',
          duration: 0.2,
        }
      }
      className={cn(
        'flex items-center gap-4 pt-4',
        !disableDrag && 'cursor-grab active:cursor-grabbing',
        className,
      )}
      ref={containerRef}
    >
      {children}
    </motion.div>
  );
}

export const CarouzelItemShema = z.object({
  children: z.custom<ReactNode>(),
  className: z.string().optional(),
  innerClassName: z.string().optional(),
});

export type CarouzelItemProps = z.infer<typeof CarouzelItemShema>;

function CarouzelItem({ children, className }: CarouzelItemProps) {
  return (
    <motion.div
      className={cn(
        'w-full flex border border-zinc-200 dark:border-gray-500',
        className,
      )}
    >
      {children}
    </motion.div>
  );
}

export {
  Carouzel,
  CarouzelContent,
  CarouzelNavigation,
  CarouzelIndicator,
  CarouzelItem,
  useCarouzel,
  CarouzelProvider,
};
