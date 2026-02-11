'use client';

import * as React from 'react';
import { motion } from 'framer-motion';
import { ChevronLeft, ChevronRight, ArrowRight, Tag } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Progress } from '@/components/ui/progress';
import { AspectRatio } from '@/components/ui/aspect-ratio';
import { z } from 'zod';

//Schemas
export const BaseCarouselItem = z.object({
  id: z.union([z.string(), z.number()]),
  imageSrc: z.string().url(),
  href: z.string().url(),
});

export const CarouselFieldRegistry = z
  .object({
    videoSrc: z.string().url().optional(),
    imageAlt: z.string().optional(),
    title: z.string().optional(),
    subtitle: z.string().optional(),
    description: z.string().optional(),
    tag: z.string().optional(),
    tags: z.array(z.string()).optional(),
    category: z.string().optional(),
    categories: z.array(z.string()).optional(),
    brandLogoSrc: z.string().url().optional(),
    brandName: z.string().optional(),
    brandDescription: z.string().optional(),
    promoCode: z.string().optional(),
    discountPercentage: z.number().min(0).max(100).optional(),
    discountAmount: z.number().positive().optional(),
    discountText: z.string().optional(),
    validUntil: z
      .string()
      // .datetime()
      .datetime({ offset: true })
      .optional(),
    rating: z.number().min(0).max(5).optional(),
    reviewCount: z.number().int().nonnegative().optional(),
    isFeatured: z.boolean().optional(),
    isNew: z.boolean().optional(),
    ctaText: z.string().optional(),
    secondaryAction: z
      .object({
        text: z.string(),
        href: z.string().url(),
      })
      .optional(),
    trackingId: z.string().optional(),
    campaignId: z.string().optional(),
    variant: z.enum(['default', 'featured', 'compact', 'expanded']).optional(),
    backgroundColor: z
      .string()
      .regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/)
      .optional(),
    textColor: z
      .string()
      .regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/)
      .optional(),
    priority: z.number().int().optional(),
    sortOrder: z.number().int().optional(),
    dynamicFields: z.record(z.any()).optional(),
  })
  .partial();

export const CarouselItem = BaseCarouselItem.merge(
  CarouselFieldRegistry,
).extend({ videoSrc: z.string().url().optional() });

export type CarouselItemType = z.infer<typeof CarouselItem>;

// Mock Data
export const mockCarouselItems: CarouselItemType[] = [
  {
    id: '1',
    imageSrc: 'https://images.unsplash.com/photo-1602524816861-3f0a9f788d8a',
    imageAlt: 'Wireless Headphones',
    href: 'https://example.com/product/wireless-headphones',
    tag: 'Featured',
    title: 'Wireless Headphones',
    description: 'Experience high-quality sound with noise cancellation.',
    brandLogoSrc:
      'https://images.unsplash.com/photo-1612831663444-2b6d3f91c8df',
    brandName: 'SoundWave',
    promoCode: 'HEADPHONE20',
    rating: 4.5,
    discountPercentage: 20,
  },
  {
    id: '2',
    imageSrc: 'https://images.unsplash.com/photo-1598300054560-cc6f90d7f1b7',
    imageAlt: 'Smart Watch',
    href: 'https://example.com/product/smart-watch',
    tag: 'New',
    title: 'Smart Watch',
    description: 'Track your fitness and notifications on the go.',
    brandName: 'TimeTech',
    promoCode: 'SMART10',
    rating: 4.2,
    discountPercentage: 10,
  },
  {
    id: '3',
    imageSrc: 'https://images.unsplash.com/photo-1602524816861-1a3f7e2d9a2e',
    imageAlt: 'Gaming Laptop',
    href: 'https://example.com/product/gaming-laptop',
    tag: 'Featured',
    title: 'Gaming Laptop',
    description: 'High performance laptop for gaming and productivity.',
    brandLogoSrc:
      'https://images.unsplash.com/photo-1612831663444-2b6d3f91c8df',
    brandName: 'GameMax',
    promoCode: 'GAMER25',
    rating: 4.8,
    discountPercentage: 25,
  },
  {
    id: '4',
    imageSrc: 'https://images.unsplash.com/photo-1546868871-7041f2a55e12',
    imageAlt: 'Smart Speaker',
    href: 'https://example.com/product/smart-speaker',
    tag: 'Popular',
    title: 'Smart Speaker',
    description: 'Voice-controlled speaker with premium sound quality.',
    brandName: 'AudioTech',
    promoCode: 'SPEAKER15',
    rating: 4.3,
    discountPercentage: 15,
  },
  {
    id: '5',
    imageSrc: 'https://images.unsplash.com/photo-1511707171634-5f897ff02aa9',
    imageAlt: 'Smartphone',
    href: 'https://example.com/product/smartphone',
    tag: 'Bestseller',
    title: 'Flagship Smartphone',
    description: 'Latest smartphone with advanced camera and performance.',
    brandLogoSrc:
      'https://images.unsplash.com/photo-1612831663444-2b6d3f91c8df',
    brandName: 'PhoneX',
    promoCode: 'PHONE30',
    rating: 4.7,
    discountPercentage: 30,
  },
];

//Default Item
const defaultItem: CarouselItemType = {
  id: 'default',
  imageSrc: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff',
  href: 'https://example.com/default',
  title: 'Default Item',
  description: 'This is a default item',
  rating: 4.0,
};

//CarouselItemComponent
export interface CarouselItemProps
  extends React.HTMLAttributes<HTMLAnchorElement> {
  item?: CarouselItemType;
  variant?: 'default' | 'compact' | 'expanded';
  children?: React.ReactNode;
  onItemClick?: (item: CarouselItemType) => void;
}

export const CarouselItemComponent = React.forwardRef<
  HTMLAnchorElement,
  CarouselItemProps
>(
  (
    {
      item = defaultItem,
      variant = 'default',
      children,
      onItemClick,
      ...props
    },
    ref,
  ) => {
    const handleClick = (e: React.MouseEvent) => {
      if (onItemClick) {
        e.preventDefault();
        onItemClick(item);
      }
    };

    const cardVariants = {
      default: 'w-[300px] h-[380px]',
      compact: 'w-[250px] h-[320px]',
      expanded: 'w-[350px] h-[450px]',
    };

    const {
      id,
      imageSrc,
      href,
      imageAlt,
      title,
      description,
      tag,
      discountPercentage,
      brandLogoSrc,
      brandName,
      promoCode,
      rating,
    } = item || defaultItem;

    return (
      <TooltipProvider>
        <motion.div
          whileHover={{ y: -8 }}
          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
          className="relative"
          key={id}
        >
          <Card
            className={cn(
              'overflow-hidden group transition-all duration-300 hover:shadow-xl border-border',
              cardVariants[variant],
            )}
          >
            <a
              ref={ref}
              href={href}
              className="block h-full"
              onClick={handleClick}
              {...props}
            >
              <div className="relative h-1/2 overflow-hidden">
                <AspectRatio ratio={16 / 9}>
                  <img
                    src={imageSrc}
                    alt={imageAlt || title || 'Carousel item'}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                    onError={(e) => {
                      e.currentTarget.src = defaultItem.imageSrc;
                    }}
                  />
                </AspectRatio>
                {discountPercentage && (
                  <Badge className="absolute top-3 left-3 bg-red-500 hover:bg-red-600 text-white border-none">
                    -{discountPercentage}%
                  </Badge>
                )}
                {tag && (
                  <div className="absolute bottom-3 left-3">
                    <Badge
                      variant="secondary"
                      className="backdrop-blur-sm bg-background/80"
                    >
                      <Tag className="w-3 h-3 mr-1" />
                      {tag}
                    </Badge>
                  </div>
                )}
              </div>
              <CardContent className="p-6 h-1/2 flex flex-col justify-between">
                {children || (
                  <>
                    <div className="space-y-3">
                      {title && (
                        <h3 className="text-xl font-bold text-foreground leading-tight line-clamp-2">
                          {title}
                        </h3>
                      )}
                      {description && (
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {description}
                        </p>
                      )}
                      {rating && (
                        <div className="flex items-center gap-2">
                          <div className="flex">
                            {[...Array(5)].map((_, i) => (
                              <span
                                key={i}
                                className={cn(
                                  'text-lg',
                                  i < Math.floor(rating)
                                    ? 'text-yellow-500'
                                    : 'text-muted',
                                )}
                              >
                                ★
                              </span>
                            ))}
                          </div>
                          <span className="text-sm text-muted-foreground">
                            ({rating.toFixed(1)})
                          </span>
                        </div>
                      )}
                    </div>
                    {(brandName || brandLogoSrc || promoCode) && (
                      <div className="flex items-center justify-between pt-4 border-t">
                        {(brandName || brandLogoSrc) && (
                          <div className="flex items-center gap-3">
                            {brandLogoSrc && (
                              <div className="relative w-10 h-10 rounded-full overflow-hidden border">
                                <img
                                  src={brandLogoSrc}
                                  alt={`${brandName || 'Brand'} logo`}
                                  className="w-full h-full object-cover"
                                  onError={(e) => {
                                    e.currentTarget.style.display = 'none';
                                  }}
                                />
                              </div>
                            )}
                            <div>
                              {brandName && (
                                <p className="text-sm font-semibold text-foreground">
                                  {brandName}
                                </p>
                              )}
                              {promoCode && (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <p className="text-xs text-muted-foreground cursor-help">
                                      Code: {promoCode}
                                    </p>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>Click to copy promo code</p>
                                  </TooltipContent>
                                </Tooltip>
                              )}
                            </div>
                          </div>
                        )}
                        <Button
                          size="icon"
                          className="rounded-full transition-all duration-300 group-hover:rotate-[-45deg] group-hover:bg-primary"
                          variant="outline"
                        >
                          <ArrowRight className="w-4 h-4" />
                        </Button>
                      </div>
                    )}
                  </>
                )}
              </CardContent>
            </a>
          </Card>
        </motion.div>
      </TooltipProvider>
    );
  },
);
CarouselItemComponent.displayName = 'CarouselItem';

//CarouselCard
export interface CarouselCardProps
  extends React.HTMLAttributes<HTMLAnchorElement> {
  item?: CarouselItemType;
  variant?: 'default' | 'compact' | 'expanded';
  children?: React.ReactNode;
  onItemClick?: (item: CarouselItemType) => void;
}

export const CarouselCard = React.forwardRef<
  HTMLAnchorElement,
  CarouselCardProps
>(({ item, variant = 'default', children, onItemClick, ...props }, ref) => {
  return (
    <CarouselItemComponent
      item={item}
      variant={variant}
      children={children}
      onItemClick={onItemClick}
      ref={ref}
      {...props}
    />
  );
});
CarouselCard.displayName = 'CarouselCard';

// Carousel
export interface CarouselProps extends React.HTMLAttributes<HTMLDivElement> {
  items?: CarouselItemType[];
  children?: React.ReactNode;
  defaultChildren?: boolean | CarouselItemType[];
  showProgress?: boolean;
  autoPlay?: boolean;
  variant?: 'default' | 'compact' | 'expanded';
  title?: string;
  subtitle?: string;
  showNavigation?: boolean;
  onItemClick?: (item: CarouselItemType) => void;
}

export const Carousel = React.forwardRef<HTMLDivElement, CarouselProps>(
  (
    {
      items,
      children,
      defaultChildren = true,
      className,
      showProgress = false,
      autoPlay = false,
      variant = 'default',
      title = 'Featured Items',
      subtitle = 'Discover amazing content',
      showNavigation = true,
      onItemClick,
      ...props
    },
    ref,
  ) => {
    const scrollContainerRef = React.useRef<HTMLDivElement>(null);
    const [scrollProgress, setScrollProgress] = React.useState(0);
    const [currentIndex, setCurrentIndex] = React.useState(0);

    const getItemsToRender = React.useMemo((): CarouselItemType[] => {
      if (items && items.length > 0) return items;
      if (defaultChildren === true) return mockCarouselItems;
      if (Array.isArray(defaultChildren) && defaultChildren.length > 0)
        return defaultChildren;
      return mockCarouselItems;
    }, [items, defaultChildren]);

    const updateScrollProgress = () => {
      if (scrollContainerRef.current) {
        const { scrollLeft, scrollWidth, clientWidth } =
          scrollContainerRef.current;
        const progress = (scrollLeft / (scrollWidth - clientWidth)) * 100;
        setScrollProgress(progress);
        const itemWidth =
          scrollContainerRef.current.scrollWidth / getItemsToRender.length;
        const index = Math.round(scrollLeft / itemWidth);
        setCurrentIndex(index);
      }
    };

    React.useEffect(() => {
      const container = scrollContainerRef.current;
      if (container) {
        container.addEventListener('scroll', updateScrollProgress);
        return () =>
          container.removeEventListener('scroll', updateScrollProgress);
      }
    }, [getItemsToRender.length]);

    const scroll = (direction: 'left' | 'right') => {
      if (scrollContainerRef.current) {
        const { current } = scrollContainerRef;
        const scrollAmount = current.clientWidth * 0.8;
        current.scrollBy({
          left: direction === 'left' ? -scrollAmount : scrollAmount,
          behavior: 'smooth',
        });
      }
    };

    const scrollToIndex = (index: number) => {
      if (scrollContainerRef.current) {
        const container = scrollContainerRef.current;
        const itemWidth = container.scrollWidth / getItemsToRender.length;
        container.scrollTo({ left: itemWidth * index, behavior: 'smooth' });
      }
    };

    React.useEffect(() => {
      if (!autoPlay || !scrollContainerRef.current) return;
      const interval = setInterval(() => {
        if (scrollContainerRef.current) {
          const container = scrollContainerRef.current;
          const { scrollLeft, scrollWidth, clientWidth } = container;
          if (scrollLeft >= scrollWidth - clientWidth)
            container.scrollTo({ left: 0, behavior: 'smooth' });
          else container.scrollBy({ left: clientWidth, behavior: 'smooth' });
        }
      }, 5000);
      return () => clearInterval(interval);
    }, [autoPlay]);

    return (
      <div ref={ref} className={cn('relative w-full', className)} {...props}>
        {(title || subtitle) && (
          <div className="flex justify-between items-center mb-4">
            <div className="space-y-1">
              {title && (
                <h3 className="text-2xl font-bold tracking-tight">{title}</h3>
              )}
              {subtitle && (
                <p className="text-sm text-muted-foreground">{subtitle}</p>
              )}
            </div>
            {showNavigation && getItemsToRender.length > 1 && (
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => scroll('left')}
                  className="rounded-full"
                  disabled={currentIndex === 0}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => scroll('right')}
                  className="rounded-full"
                  disabled={currentIndex === getItemsToRender.length - 1}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}
          </div>
        )}
        <div
          ref={scrollContainerRef}
          className="flex gap-4 overflow-x-auto pb-6 scrollbar-hide snap-x snap-mandatory scroll-smooth"
          onScroll={updateScrollProgress}
          style={{ scrollBehavior: 'smooth' }}
        >
          {children ||
            getItemsToRender.map((item) => (
              <CarouselItemComponent
                key={item.id}
                item={item}
                variant={variant}
                onItemClick={onItemClick}
              />
            ))}
        </div>
        {showProgress && getItemsToRender.length > 1 && (
          <div className="mt-4 space-y-2">
            <Progress value={scrollProgress} className="h-2" />
            <div className="flex justify-center gap-1">
              {getItemsToRender.map((_, index) => (
                <button
                  key={index}
                  onClick={() => scrollToIndex(index)}
                  className={cn(
                    'w-2 h-2 rounded-full transition-all',
                    index === currentIndex
                      ? 'bg-primary w-4'
                      : 'bg-muted hover:bg-muted-foreground/50',
                  )}
                  aria-label={`Go to item ${index + 1}`}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    );
  },
);
Carousel.displayName = 'Carousel';

//EnhancedCarousel
export interface EnhancedCarouselProps extends CarouselProps {
  showFilters?: boolean;
  onFilterChange?: (filters: any) => void;
  filterOptions?: { tags?: string[]; categories?: string[] };
}

export const EnhancedCarousel = React.forwardRef<
  HTMLDivElement,
  EnhancedCarouselProps
>(({ showFilters = false, onFilterChange, filterOptions, ...props }, ref) => {
  const [activeFilter, setActiveFilter] = React.useState<string>('all');

  const handleFilterClick = (filter: string) => {
    setActiveFilter(filter);
    if (onFilterChange) onFilterChange(filter);
  };

  return (
    <div className="w-full">
      {showFilters && filterOptions && (
        <div className="flex gap-3 mb-4">
          {['all', ...(filterOptions.tags || [])].map((tag) => (
            <Button
              key={tag}
              size="sm"
              variant={activeFilter === tag ? 'default' : 'outline'}
              onClick={() => handleFilterClick(tag)}
            >
              {tag}
            </Button>
          ))}
        </div>
      )}
      <Carousel ref={ref} {...props} />
    </div>
  );
});
EnhancedCarousel.displayName = 'EnhancedCarousel';
