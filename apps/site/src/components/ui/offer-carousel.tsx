import { motion } from 'framer-motion';
import { ArrowRight, ChevronLeft, ChevronRight, Tag } from 'lucide-react';
import * as React from 'react';
import z from 'zod';
import { cn } from '@/lib/utils'; // Your utility for merging Tailwind classes

export const OfferCardSchema = z.object({
  className: z.string().optional(),
  imageClassName: z.string().optional(),
  imageSrc: z.string().optional(),
  imageAlt: z.string().optional(),
  tag: z.string().optional(),
  title: z.string().optional(),
  description: z.string().optional(),
  brandLogoSrc: z.string().optional(),
  brandName: z.string().optional(),
  promoCode: z.string().optional(),
  href: z.string().optional(),
});

export type Offer = z.infer<typeof OfferCardSchema>;

// Props for the OfferCard component
type OfferCardProps = Offer;

// The individual card component with hover animation
const OfferCard = React.forwardRef<HTMLAnchorElement, OfferCardProps>(
  (
    {
      imageSrc = 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?q=80&w=1998&auto=format&fit=crop',
      imageAlt = 'A delicious looking burger',
      tag = 'Discount',
      title = 'Snack more. Save more.',
      description = 'Get ₹75 OFF on purchases of ₹299 or more.',
      brandLogoSrc = 'https://static.twidpay.com/co/mobile_app_images/brand_logos/square/mcdonaldssquare.png?size=40',
      brandName = 'McD',
      promoCode = 'TWID75',
      href = '#',
      className,
      imageClassName,
    },
    ref,
  ) => (
    <div className={cn('flex flex-shrink-0', className)}>
      <motion.a
        ref={ref}
        href={href}
        className={cn(
          'relative flex-shrink-0 rounded-2xl overflow-hidden group snap-start bg-card shadow-lg hover:shadow-xl border border-gray-100/50 transition-all duration-300',
        )}
        whileHover={{ y: -6, boxShadow: '0 12px 28px rgba(0, 0, 0, 0.1)' }}
        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
      >
        <div className={cn('relative h-40 overflow-hidden', imageClassName)}>
          <img
            src={imageSrc}
            alt={imageAlt}
            className={cn(
              'w-full h-full object-cover transition-transform duration-700 group-hover:scale-110',
              imageClassName,
            )}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-black/10"></div>

          <div className="absolute top-3 left-3 flex items-center text-xs font-semibold text-primary-foreground bg-primary/90 px-3 py-1 rounded-full w-fit shadow-md">
            <Tag className="w-3 h-3 mr-1" />
            <span>{tag}</span>
          </div>
        </div>

        {/* Card Content */}
        <div className="p-5 flex flex-col justify-between h-[calc(100%-10rem)]">
          {' '}
          {/* Calculated remaining height */}
          <div className="space-y-2">
            <h3
              className={cn(
                'text-xl font-extrabold text-foreground leading-snug',
                'whitespace-normal',
              )}
            >
              {title}
            </h3>

            <p className="text-sm text-muted-foreground line-clamp-2">
              {description}
            </p>
          </div>
          {/* Footer */}
          <div className="flex items-center justify-between pt-4 border-t border-border/70 mt-auto">
            <div className="flex items-center gap-3">
              {/* Brand Logo */}
              <img
                src={brandLogoSrc}
                alt={`${brandName} logo`}
                className="w-9 h-9 rounded-full bg-muted object-contain border border-gray-100"
              />
              <div>
                <p className="text-sm font-semibold text-foreground">
                  {brandName}
                </p>
                {promoCode && (
                  <p className="text-xs text-primary font-mono bg-primary/10 px-1.5 py-0.5 rounded-md mt-0.5 w-fit select-all tracking-wider">
                    {promoCode}
                  </p>
                )}
              </div>
            </div>

            {/* CTA Arrow Button (Enhanced UE) */}
            <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground transition-all duration-300 transform group-hover:scale-110 group-active:scale-95 shadow-md">
              <ArrowRight className="w-5 h-5 transition-transform duration-300 ease-out group-hover:translate-x-1" />
            </div>
          </div>
        </div>
      </motion.a>
    </div>
  ),
);
OfferCard.displayName = 'OfferCard';

export const OfferCarouselSchema = z.object({
  offers: OfferCardSchema.array().optional(),
  className: z.string().optional(),
  imageClassName: z.string().optional(),
});

// Props for the OfferCarousel component
export type OfferCarouselProps = React.HTMLAttributes<HTMLDivElement> &
  z.infer<typeof OfferCarouselSchema>;

const defaultOffers: Offer[] = [
  {
    imageSrc:
      'https://images.unsplash.com/photo-1523906834658-6e24ef2386f9?q=80&w=1966&auto=format&fit=crop',
    imageAlt: 'International travel landmarks collage',
    tag: 'Discount',
    title: 'Up to ₹3000 OFF',
    description: 'On International Flights.',
    brandLogoSrc:
      'https://static.twidpay.com/co/mobile_app_images/brand_logos/square/easemytripsquare.png?size=40',
    brandName: 'Ease My Trip',
    promoCode: 'EMTWID',
    href: '#',
  },
  {
    imageSrc:
      'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?q=80&w=1998&auto=format&fit=crop',
    imageAlt: 'A delicious looking burger',
    tag: 'Discount',
    title: 'Snack more. Save more.',
    description: 'Get ₹75 OFF on purchases of ₹299 or more.',
    brandLogoSrc:
      'https://static.twidpay.com/co/mobile_app_images/brand_logos/square/mcdonaldssquare.png?size=40',
    brandName: 'McD',
    promoCode: 'TWID75',
    href: '#',
  },
  {
    imageSrc:
      'https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?q=80&w=1974&auto=format&fit=crop',
    imageAlt: 'Logos of popular streaming services',
    tag: 'Discount',
    title: 'Flat ₹550 OFF on Timesprime',
    description: 'Exclusive offer on Times Prime Membership.',
    brandLogoSrc:
      'https://static.twidpay.com/co/mobile_app_images/brand_logos/square/timesprimesquare.png?size=40',
    brandName: 'Timesprime',
    promoCode: 'TWID550',
    href: '#',
  },
  {
    imageSrc:
      'https://plus.unsplash.com/premium_photo-1728889749470-97eb0a2e2028?w=900&auto=format&fit=crop&q=60&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxzZWFyY2h8MXx8Y2FzaGJhY2t8ZW58MHx8MHx8fDA%3D?q=80&w=2070&auto=format&fit=crop',
    imageAlt: 'A person holding a phone with a payment app',
    tag: 'Cashback',
    title: '10% Instant Cashback',
    description: 'On RuPay Credit Card transactions.',
    brandLogoSrc:
      'https://static.twidpay.com/co/mobile_app_images/icons/rupay_rcc.png?size=40',
    brandName: 'Rupay CC',
    promoCode: 'RCC10',
    href: '#',
  },
  {
    imageSrc:
      'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?q=80&w=1974&auto=format&fit=crop',
    imageAlt: 'Gourmet food on a plate',
    tag: 'Offer',
    title: 'Flat 20% OFF',
    description: 'On dining at partner restaurants.',
    brandLogoSrc:
      'https://twidpay.com/assets/new-square-logos/swiggysquare.webp?size=40',
    brandName: 'Dineout',
    promoCode: 'DINE20',
    href: '#',
  },
];

// The main carousel component with scroll functionality
const OfferCarousel = React.forwardRef<HTMLDivElement, OfferCarouselProps>(
  ({ offers, className, imageClassName, ...props }, ref) => {
    if (!offers?.length) offers = defaultOffers;
    const scrollContainerRef = React.useRef<HTMLDivElement>(null);

    const scroll = (direction: 'left' | 'right') => {
      if (scrollContainerRef.current) {
        const { current } = scrollContainerRef;
        const scrollAmount = current.clientWidth * 0.8; // Scroll by 80% of the container width
        current.scrollBy({
          left: direction === 'left' ? -scrollAmount : scrollAmount,
          behavior: 'smooth',
        });
      }
    };

    return (
      <div
        ref={ref}
        className={cn('relative w-full group', className)}
        {...props}
      >
        {/* Left Scroll Button */}
        {/** biome-ignore lint/a11y/useButtonType: lint debt cleanup */}
        <button
          onClick={() => scroll('left')}
          className="absolute top-1/2 -translate-y-1/2 left-0 z-10 w-10 h-10 rounded-full bg-background/50 backdrop-blur-sm border border-border flex items-center justify-center text-foreground opacity-0 group-hover:opacity-100 transition-opacity duration-300 hover:bg-background/80 disabled:opacity-0"
          aria-label="Scroll Left"
        >
          <ChevronLeft className="w-6 h-6" />
        </button>

        {/* Scrollable Container */}
        <div
          ref={scrollContainerRef}
          className="flex space-x-6 overflow-x-auto pb-4 scrollbar-hide snap-x snap-mandatory"
        >
          {offers.map((offer) => (
            <OfferCard
              key={offer?.title}
              {...offer}
              className={cn(offer.className, className)}
              imageClassName={cn(offer.imageClassName, imageClassName)}
            />
          ))}
        </div>

        {/* Right Scroll Button */}
        {/** biome-ignore lint/a11y/useButtonType: lint debt cleanup */}
        <button
          onClick={() => scroll('right')}
          className="absolute top-1/2 -translate-y-1/2 right-0 z-10 w-10 h-10 rounded-full bg-background/50 backdrop-blur-sm border border-border flex items-center justify-center text-foreground opacity-0 group-hover:opacity-100 transition-opacity duration-300 hover:bg-background/80 disabled:opacity-0"
          aria-label="Scroll Right"
        >
          <ChevronRight className="w-6 h-6" />
        </button>
      </div>
    );
  },
);
OfferCarousel.displayName = 'OfferCarousel';

export { OfferCarousel, OfferCard };
