"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight, ArrowRight, Tag } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Progress } from "@/components/ui/progress";
import { AspectRatio } from "@/components/ui/aspect-ratio";
import { z } from "zod";

// TYPES & SCHEMAS
export const BaseCarouselItem = z.object({
  id: z.union([z.string(), z.number()]),
  imageSrc: z.string().url(),
  href: z.string().url(),
});

export const CarouselFieldRegistry = z.object({
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
  validUntil: z.string().datetime().optional(),
  rating: z.number().min(0).max(5).optional(),
  reviewCount: z.number().int().nonnegative().optional(),
  isFeatured: z.boolean().optional(),
  isNew: z.boolean().optional(),
  ctaText: z.string().optional(),
  secondaryAction: z.object({
    text: z.string(),
    href: z.string().url(),
  }).optional(),
  trackingId: z.string().optional(),
  campaignId: z.string().optional(),
  variant: z.enum(["default", "featured", "compact", "expanded"]).optional(),
  backgroundColor: z.string().regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/).optional(),
  textColor: z.string().regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/).optional(),
  priority: z.number().int().optional(),
  sortOrder: z.number().int().optional(),
  dynamicFields: z.record(z.any()).optional(),
}).partial();

export const CarouselItem = BaseCarouselItem.merge(CarouselFieldRegistry).extend({
  videoSrc: z.string().url().optional(),
});

export type CarouselItemType = z.infer<typeof CarouselItem>;

export type CarouselVariant = "default" | "compact" | "expanded";


// Context
interface CarouselContextValue {
  variant: CarouselVariant;
  onItemClick?: (item: CarouselItemType) => void;
  autoPlay: boolean;
  showNavigation: boolean;
}

const CarouselContext = React.createContext<CarouselContextValue>({
  variant: "default",
  autoPlay: false,
  showNavigation: true,
});

const useCarouselContext = () => {
  const context = React.useContext(CarouselContext);
  if (!context) {
    throw new Error("Carousel components must be used within a Carousel");
  }
  return context;
};


// CAROUSEL ITEM COMPONENT
export interface CarouselItemComponentProps extends React.HTMLAttributes<HTMLAnchorElement> {
  item?: CarouselItemType;
  variant?: CarouselVariant;
  children?: React.ReactNode;
  onItemClick?: (item: CarouselItemType) => void;
}

const CarouselItemComponent = React.forwardRef<HTMLAnchorElement, CarouselItemComponentProps>(
  ({ item: propItem, variant: propVariant, children, onItemClick: propOnItemClick, className, style, ...props }, ref) => {
    const context = React.useContext(CarouselContext);
    
    // Priority: prop variant > context variant > default
    const variant = propVariant || context?.variant || "default";
    
    // Priority: prop onItemClick > context onItemClick
    const onItemClick = propOnItemClick || context?.onItemClick;
    
    const defaultItem: CarouselItemType = {
      id: "default",
      imageSrc: "https://images.unsplash.com/photo-1542291026-7eec264c27ff",
      href: "https://example.com/default",
      title: "Default Item",
      description: "This is a default item",
      rating: 4.0,
    };

    const item = propItem || defaultItem;

    const handleClick = (e: React.MouseEvent) => {
      if (onItemClick) {
        e.preventDefault();
        onItemClick(item);
      }
    };

    const cardVariants: Record<CarouselVariant, string> = {
      default: "w-[300px] h-[380px]",
      compact: "w-[250px] h-[320px]",
      expanded: "w-[350px] h-[450px]",
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
      rating 
    } = item;

    return (
      <TooltipProvider>
        <motion.div 
          whileHover={{ y: -8 }} 
          transition={{ type: "spring", stiffness: 300, damping: 20 }} 
          className="relative"
          data-testid="carousel-item"
          data-item-id={id}
          data-variant={variant}
          style={style}
        >
          <Card className={cn(
            "overflow-hidden group transition-all duration-300 hover:shadow-xl border-border",
            cardVariants[variant],
            className
          )}>
            <a 
              ref={ref} 
              href={href} 
              className="block h-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2" 
              onClick={handleClick}
              aria-label={title || "Carousel item"}
              {...props}
            >
              <div className="relative h-1/2 overflow-hidden">
                <AspectRatio ratio={16 / 9}>
                  <img
                    src={imageSrc}
                    alt={imageAlt || title || "Carousel item"}
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                    loading="lazy"
                    onError={(e) => { 
                      e.currentTarget.src = defaultItem.imageSrc;
                      e.currentTarget.alt = "Fallback image";
                    }}
                  />
                </AspectRatio>
                {discountPercentage && (
                  <Badge 
                    className="absolute top-3 left-3 bg-red-500 hover:bg-red-600 text-white border-none"
                    aria-label={`${discountPercentage}% discount`}
                  >
                    -{discountPercentage}%
                  </Badge>
                )}
                {tag && (
                  <div className="absolute bottom-3 left-3">
                    <Badge variant="secondary" className="backdrop-blur-sm bg-background/80">
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
                      {rating !== undefined && (
                        <div className="flex items-center gap-2">
                          <div className="flex" aria-label={`Rating: ${rating.toFixed(1)} out of 5`}>
                            {[...Array(5)].map((_, i) => (
                              <span 
                                key={i} 
                                className={cn(
                                  "text-lg", 
                                  i < Math.floor(rating) ? "text-yellow-500" : "text-muted"
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
                          aria-label="View details"
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
  }
);

CarouselItemComponent.displayName = "CarouselItemComponent";

// CAROUSEL CARD (with automatic parent inheritance
export interface CarouselCardProps extends Omit<CarouselItemComponentProps, 'variant'> {
  variant?: CarouselVariant;
}

const CarouselCard = React.forwardRef<HTMLAnchorElement, CarouselCardProps>(
  ({ variant, style, ...props }, ref) => {
    const context = useCarouselContext();
    
    // Inherit variant from parent Carousel if not explicitly provided
    const inheritedVariant = variant || context.variant;
    
    return (
      <CarouselItemComponent
        ref={ref}
        variant={inheritedVariant}
        style={style}
        {...props}
      />
    );
  }
);

CarouselCard.displayName = "CarouselCard";

// Type helper for element props
type PropsWithStyle<T = {}> = T & {
  style?: React.CSSProperties;
  variant?: CarouselVariant;
  onItemClick?: (item: CarouselItemType) => void;
  [key: string]: any;
};

// CAROUSEL COMPONENT
export interface CarouselProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'children'> {
  items?: CarouselItemType[];
  children?: React.ReactNode;
  defaultChildren?: boolean | CarouselItemType[];
  showProgress?: boolean;
  autoPlay?: boolean;
  variant?: CarouselVariant;
  title?: string;
  subtitle?: string;
  showNavigation?: boolean;
  onItemClick?: (item: CarouselItemType) => void;
  itemsPerView?: number;
  gap?: number;
}

const Carousel = React.forwardRef<HTMLDivElement, CarouselProps>(
  ({
    items,
    children,
    defaultChildren = true,
    className,
    showProgress = false,
    autoPlay = false,
    variant = "default",
    title,
    subtitle,
    showNavigation = true,
    onItemClick,
    itemsPerView = 1,
    gap = 16,
    ...props
  }, ref) => {
    const scrollContainerRef = React.useRef<HTMLDivElement>(null);
    const [scrollProgress, setScrollProgress] = React.useState(0);
    const [currentIndex, setCurrentIndex] = React.useState(0);
    const [isAtStart, setIsAtStart] = React.useState(true);
    const [isAtEnd, setIsAtEnd] = React.useState(false);

    // Default items
    const mockCarouselItems: CarouselItemType[] = [
      {
        id: "1",
        imageSrc: "https://images.unsplash.com/photo-1602524816861-3f0a9f788d8a",
        imageAlt: "Wireless Headphones",
        href: "https://example.com/product/wireless-headphones",
        tag: "Featured",
        title: "Wireless Headphones",
        description: "Experience high-quality sound with noise cancellation.",
        brandLogoSrc: "https://images.unsplash.com/photo-1612831663444-2b6d3f91c8df",
        brandName: "SoundWave",
        promoCode: "HEADPHONE20",
        rating: 4.5,
        discountPercentage: 20,
      },
      {
        id: "2",
        imageSrc: "https://images.unsplash.com/photo-1598300054560-cc6f90d7f1b7",
        imageAlt: "Smart Watch",
        href: "https://example.com/product/smart-watch",
        tag: "New",
        title: "Smart Watch",
        description: "Track your fitness and notifications on the go.",
        brandName: "TimeTech",
        promoCode: "SMART10",
        rating: 4.2,
        discountPercentage: 10,
      },
      {
        id: "3",
        imageSrc: "https://images.unsplash.com/photo-1602524816861-1a3f7e2d9a2e",
        imageAlt: "Gaming Laptop",
        href: "https://example.com/product/gaming-laptop",
        tag: "Featured",
        title: "Gaming Laptop",
        description: "High performance laptop for gaming and productivity.",
        brandLogoSrc: "https://images.unsplash.com/photo-1612831663444-2b6d3f91c8df",
        brandName: "GameMax",
        promoCode: "GAMER25",
        rating: 4.8,
        discountPercentage: 25,
      },
    ];

    const getItemsToRender = React.useMemo((): CarouselItemType[] => {
      if (items && items.length > 0) return items;
      if (defaultChildren === true) return mockCarouselItems;
      if (Array.isArray(defaultChildren) && defaultChildren.length > 0) return defaultChildren;
      return mockCarouselItems;
    }, [items, defaultChildren]);

    const updateScrollState = () => {
      if (!scrollContainerRef.current) return;
      
      const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
      
      // Calculate progress
      const progress = (scrollLeft / (scrollWidth - clientWidth)) * 100;
      setScrollProgress(progress);
      
      // Calculate current index
      const itemWidth = scrollContainerRef.current.scrollWidth / getItemsToRender.length;
      const newIndex = Math.round(scrollLeft / itemWidth);
      setCurrentIndex(Math.min(newIndex, getItemsToRender.length - 1));
      
      // Update start/end states
      setIsAtStart(scrollLeft <= 0);
      setIsAtEnd(scrollLeft >= scrollWidth - clientWidth - 1);
    };

    React.useEffect(() => {
      const container = scrollContainerRef.current;
      if (!container) return;

      const handleScroll = () => updateScrollState();
      container.addEventListener("scroll", handleScroll);
      
      // Initial calculation
      updateScrollState();
      
      return () => container.removeEventListener("scroll", handleScroll);
    }, [getItemsToRender.length]);

    const scroll = (direction: "left" | "right") => {
      if (!scrollContainerRef.current) return;
      
      const container = scrollContainerRef.current;
      const scrollAmount = container.clientWidth * 0.8;
      
      container.scrollBy({ 
        left: direction === "left" ? -scrollAmount : scrollAmount, 
        behavior: "smooth" 
      });
    };

    const scrollToIndex = (index: number) => {
      if (!scrollContainerRef.current) return;
      
      const container = scrollContainerRef.current;
      const itemWidth = container.scrollWidth / getItemsToRender.length;
      
      container.scrollTo({ 
        left: itemWidth * index, 
        behavior: "smooth" 
      });
    };

    // Auto-play effect
    React.useEffect(() => {
      if (!autoPlay || !scrollContainerRef.current || getItemsToRender.length <= 1) return;
      
      const interval = setInterval(() => {
        if (!scrollContainerRef.current) return;
        
        const container = scrollContainerRef.current;
        const { scrollLeft, scrollWidth, clientWidth } = container;
        
        if (scrollLeft >= scrollWidth - clientWidth - 10) {
          // At end, scroll to start
          container.scrollTo({ left: 0, behavior: "smooth" });
        } else {
          // Scroll to next item
          const itemWidth = container.scrollWidth / getItemsToRender.length;
          const nextIndex = Math.floor(scrollLeft / itemWidth) + 1;
          container.scrollTo({ 
            left: itemWidth * nextIndex, 
            behavior: "smooth" 
          });
        }
      }, 5000);
      
      return () => clearInterval(interval);
    }, [autoPlay, getItemsToRender.length]);

    // Calculate container width based on items per view
    const containerWidth = itemsPerView === 1 ? "100%" : `${itemsPerView * 100}%`;
    const itemWidth = itemsPerView === 1 ? "auto" : `calc((100% - ${(itemsPerView - 1) * gap}px) / ${itemsPerView})`;

    const contextValue: CarouselContextValue = {
      variant,
      onItemClick,
      autoPlay,
      showNavigation,
    };

    // Helper to process children with proper typing
    const processChildren = (childrenToProcess: React.ReactNode): React.ReactNode => {
      return React.Children.map(childrenToProcess, (child) => {
        if (!React.isValidElement(child)) return child;

        const element = child as React.ReactElement<PropsWithStyle>;
        
        // Get current props
        const currentProps = element.props || {};
        
        // Create new props object
        const newProps: PropsWithStyle = {
          ...currentProps,
          style: {
            ...currentProps.style,
            flex: itemsPerView > 1 ? `0 0 ${itemWidth}` : currentProps.style?.flex || "0 0 auto",
          },
        };

        // Handle CarouselCard specifically for variant inheritance
        if (
          (element.type as any) === CarouselCard || 
          (element.type as any)?.displayName === 'CarouselCard'
        ) {
          newProps.variant = currentProps.variant || variant;
          newProps.onItemClick = currentProps.onItemClick || onItemClick;
        }

        // Handle CarouselItemComponent for variant inheritance
        if (
          (element.type as any) === CarouselItemComponent || 
          (element.type as any)?.displayName === 'CarouselItemComponent'
        ) {
          newProps.variant = currentProps.variant || variant;
          newProps.onItemClick = currentProps.onItemClick || onItemClick;
        }

        return React.cloneElement(element, newProps);
      });
    };

    const processedChildren = React.useMemo(() => {
      if (!children) return null;
      return processChildren(children);
    }, [children, variant, onItemClick, itemsPerView, itemWidth, gap]);

    return (
      <CarouselContext.Provider value={contextValue}>
        <div 
          ref={ref} 
          className={cn("relative w-full", className)}
          data-testid="carousel"
          {...props}
        >
          {/* Header */}
          {(title || subtitle) && (
            <div className="flex justify-between items-center mb-6">
              <div className="space-y-1">
                {title && (
                  <h2 className="text-2xl font-bold tracking-tight">
                    {title}
                  </h2>
                )}
                {subtitle && (
                  <p className="text-sm text-muted-foreground">
                    {subtitle}
                  </p>
                )}
              </div>
              {showNavigation && getItemsToRender.length > itemsPerView && (
                <div className="flex items-center gap-2">
                  <Button 
                    variant="outline" 
                    size="icon" 
                    onClick={() => scroll("left")} 
                    className="rounded-full"
                    disabled={isAtStart}
                    aria-label="Scroll left"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button 
                    variant="outline" 
                    size="icon" 
                    onClick={() => scroll("right")} 
                    className="rounded-full"
                    disabled={isAtEnd}
                    aria-label="Scroll right"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Carousel Items */}
          <div className="relative">
            <div 
              ref={scrollContainerRef} 
              className="flex overflow-x-auto pb-6 scrollbar-hide snap-x snap-mandatory scroll-smooth"
              style={{ 
                gap: `${gap}px`,
                width: containerWidth,
                maxWidth: "100%",
              }}
              role="list"
              aria-label="Carousel items"
            >
              {processedChildren || getItemsToRender.map((item) => (
                <CarouselCard 
                  key={item.id} 
                  item={item}
                  style={{ 
                    flex: itemsPerView > 1 ? `0 0 ${itemWidth}` : "0 0 auto",
                  }}
                />
              ))}
            </div>

            {/* Navigation Arrows (floating) */}
            {showNavigation && getItemsToRender.length > itemsPerView && !title && (
              <>
                {!isAtStart && (
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => scroll("left")}
                    className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full shadow-lg bg-background/80 backdrop-blur-sm"
                    aria-label="Scroll left"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                )}
                {!isAtEnd && (
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => scroll("right")}
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full shadow-lg bg-background/80 backdrop-blur-sm"
                    aria-label="Scroll right"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                )}
              </>
            )}
          </div>

          {/* Progress Indicators */}
          {showProgress && getItemsToRender.length > itemsPerView && (
            <div className="mt-6 space-y-3">
              <Progress 
                value={scrollProgress} 
                className="h-2" 
                aria-label="Carousel progress"
              />
              <div className="flex justify-center gap-2">
                {Array.from({ length: Math.ceil(getItemsToRender.length / itemsPerView) }).map((_, index) => (
                  <button
                    key={index}
                    onClick={() => scrollToIndex(index * itemsPerView)}
                    className={cn(
                      "w-3 h-3 rounded-full transition-all duration-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      Math.floor(currentIndex / itemsPerView) === index 
                        ? "bg-primary scale-110" 
                        : "bg-muted hover:bg-muted-foreground/50"
                    )}
                    aria-label={`Go to slide ${index + 1}`}
                    aria-current={Math.floor(currentIndex / itemsPerView) === index ? "true" : "false"}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </CarouselContext.Provider>
    );
  }
);

Carousel.displayName = "Carousel";


// ENHANCED CAROUSEL
export interface EnhancedCarouselProps extends CarouselProps {
  showFilters?: boolean;
  onFilterChange?: (filter: string) => void;
  filterOptions?: { 
    tags?: string[]; 
    categories?: string[];
  };
  initialFilter?: string;
}

const EnhancedCarousel = React.forwardRef<HTMLDivElement, EnhancedCarouselProps>(
  ({ 
    showFilters = false, 
    onFilterChange, 
    filterOptions, 
    initialFilter = "all",
    ...props 
  }, ref) => {
    const [activeFilter, setActiveFilter] = React.useState(initialFilter);

    const handleFilterClick = (filter: string) => {
      setActiveFilter(filter);
      if (onFilterChange) {
        onFilterChange(filter);
      }
    };

    return (
      <div className="w-full space-y-4">
        {showFilters && filterOptions && (
          <div className="flex flex-wrap gap-2">
            {["all", ...(filterOptions.tags || []), ...(filterOptions.categories || [])].map((filter) => (
              <Button
                key={filter}
                size="sm"
                variant={activeFilter === filter ? "default" : "outline"}
                onClick={() => handleFilterClick(filter)}
                className="transition-all"
              >
                {filter.charAt(0).toUpperCase() + filter.slice(1)}
              </Button>
            ))}
          </div>
        )}
        <Carousel ref={ref} {...props} />
      </div>
    );
  }
);

EnhancedCarousel.displayName = "EnhancedCarousel";


// EXPORTS
export {
  CarouselItemComponent,
  CarouselCard,
  Carousel,
  EnhancedCarousel,
  useCarouselContext,
};

//Mock Data
export const mockCarouselItems: CarouselItemType[] = [
  {
    id: "1",
    imageSrc: "https://images.unsplash.com/photo-1602524816861-3f0a9f788d8a",
    imageAlt: "Wireless Headphones",
    href: "https://example.com/product/wireless-headphones",
    tag: "Featured",
    title: "Wireless Headphones",
    description: "Experience high-quality sound with noise cancellation.",
    brandLogoSrc: "https://images.unsplash.com/photo-1612831663444-2b6d3f91c8df",
    brandName: "SoundWave",
    promoCode: "HEADPHONE20",
    rating: 4.5,
    discountPercentage: 20,
  },
  {
    id: "2",
    imageSrc: "https://images.unsplash.com/photo-1598300054560-cc6f90d7f1b7",
    imageAlt: "Smart Watch",
    href: "https://example.com/product/smart-watch",
    tag: "New",
    title: "Smart Watch",
    description: "Track your fitness and notifications on the go.",
    brandName: "TimeTech",
    promoCode: "SMART10",
    rating: 4.2,
    discountPercentage: 10,
  },
  {
    id: "3",
    imageSrc: "https://images.unsplash.com/photo-1602524816861-1a3f7e2d9a2e",
    imageAlt: "Gaming Laptop",
    href: "https://example.com/product/gaming-laptop",
    tag: "Featured",
    title: "Gaming Laptop",
    description: "High performance laptop for gaming and productivity.",
    brandLogoSrc: "https://images.unsplash.com/photo-1612831663444-2b6d3f91c8df",
    brandName: "GameMax",
    promoCode: "GAMER25",
    rating: 4.8,
    discountPercentage: 25,
  },
];