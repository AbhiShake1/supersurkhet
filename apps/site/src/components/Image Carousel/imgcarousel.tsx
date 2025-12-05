// import * as React from "react";
// import { motion } from "framer-motion";
// import { ChevronLeft, ChevronRight, ArrowRight, Tag } from "lucide-react";
// import { cn } from "@/lib/utils"; 
// import { Button } from "@/components/ui/button";
// import { Card, CardContent } from "@/components/ui/card";
// import { Badge } from "@/components/ui/badge";
// import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
// import { Progress } from "@/components/ui/progress";
// import { AspectRatio } from "@/components/ui/aspect-ratio";



// import { z } from "zod";





// const mockOffers: Offer[] = [
//   {
//     id: "1",
//     imageSrc: "https://images.unsplash.com/photo-1602524816861-3f0a9f788d8a",
//     imageAlt: "Wireless Headphones",
//     tag: "Featured",
//     title: "Wireless Headphones",
//     description: "Experience high-quality sound with noise cancellation.",
//     brandLogoSrc: "https://images.unsplash.com/photo-1612831663444-2b6d3f91c8df",
//     brandName: "SoundWave",
//     promoCode: "HEADPHONE20",
//     href: "https://example.com/product/wireless-headphones",
//     rating: 4.5,
//     discountPercentage: 20,
//   },
//   {
//     id: "2",
//     imageSrc: "https://images.unsplash.com/photo-1598300054560-cc6f90d7f1b7",
//     imageAlt: "Smart Watch",
//     tag: "New",
//     title: "Smart Watch",
//     description: "Track your fitness and notifications on the go.",
//     brandLogoSrc: "https://images.unsplash.com/photo-1612831663444-2b6d3f91c8df",
//     brandName: "TimeTech",
//     promoCode: "SMART10",
//     href: "https://example.com/product/smart-watch",
//     rating: 4.2,
//     discountPercentage: 10,
//   },
//   {
//     id: "3",
//     imageSrc: "https://images.unsplash.com/photo-1602524816861-1a3f7e2d9a2e",
//     imageAlt: "Gaming Laptop",
//     tag: "Featured",
//     title: "Gaming Laptop",
//     description: "High performance laptop for gaming and productivity.",
//     brandLogoSrc: "https://images.unsplash.com/photo-1612831663444-2b6d3f91c8df",
//     brandName: "GameMax",
//     promoCode: "GAMER25",
//     href: "https://example.com/product/gaming-laptop",
//     rating: 4.8,
//     discountPercentage: 25,
//   },
// ];




// export const BaseCarouselItem = z.object({
//   id: z.union([z.string(), z.number()]).describe("Unique identifier for the item"),
//   imageSrc: z.string().url().describe("Main image URL"),
//   href: z.string().url().describe("Link destination"),
// });

// // Fields
// export const CarouselFieldRegistry = z.object({
//   // Media
//   imageSrc: z.string().url(),
//   videoSrc: z.string().url().optional(),
//   imageAlt: z.string().optional(),
  
//   // Content
//   title: z.string().optional(),
//   subtitle: z.string().optional(),
//   description: z.string().optional(),
//   longDescription: z.string().optional(),
  
//   // Metadata
//   tag: z.string().optional(),
//   tags: z.array(z.string()).optional(),
//   category: z.string().optional(),
//   categories: z.array(z.string()).optional(),
  
//   // Branding
//   brandLogoSrc: z.string().url().optional(),
//   brandName: z.string().optional(),
//   brandDescription: z.string().optional(),
  
//   // Promotions
//   promoCode: z.string().optional(),
//   discountPercentage: z.number().min(0).max(100).optional(),
//   discountAmount: z.number().positive().optional(),
//   discountText: z.string().optional(),
//   validUntil: z.string().datetime().optional(),
  
//   // Ratings & Reviews
//   rating: z.number().min(0).max(5).optional(),
//   reviewCount: z.number().int().nonnegative().optional(),
//   isFeatured: z.boolean().optional(),
//   isNew: z.boolean().optional(),
  
//   // Actions
//   ctaText: z.string().optional(),
//   secondaryAction: z.object({
//     text: z.string(),
//     href: z.string().url(),
//   }).optional(),
  
//   // Analytics & Tracking
//   trackingId: z.string().optional(),
//   campaignId: z.string().optional(),
  
//   // Layout & Styling Hints
//   variant: z.enum(["default", "featured", "compact", "expanded"]).optional(),
//   backgroundColor: z.string().regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/).optional(),
//   textColor: z.string().regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/).optional(),
  
//   // Priority & Ordering
//   priority: z.number().int().optional(),
//   sortOrder: z.number().int().optional(),
  
//   // Dynamic Content
//   dynamicFields: z.record(z.any()).optional(),
// }).partial(); 

// export const CarouselItem = BaseCarouselItem
//   .merge(CarouselFieldRegistry)
//   .extend({
//     videoSrc: z.string().url().optional(),
//   });

// // Carousel configuration with presets
// export const CarouselLayout = z.object({
//   variant: z.enum([
//     "default", 
//     "grid", 
//     "slider", 
//     "featured-first",
//     "compact",
//     "expanded"
//   ]).default("default"),
  
//   columns: z.number().min(1).max(6).optional(),
//   itemsPerView: z.object({
//     mobile: z.number().min(1).optional(),
//     tablet: z.number().min(1).optional(),
//     desktop: z.number().min(1).optional(),
//   }).optional(),
  
//   autoScroll: z.boolean().default(false),
//   autoScrollInterval: z.number().min(1000).default(5000),
  
//   showNavigation: z.boolean().default(true),
//   navigationPosition: z.enum(["inside", "outside", "overlay"]).default("outside"),
  
//   showPagination: z.boolean().default(false),
//   paginationType: z.enum(["dots", "numbers", "progress"]).optional(),
  
//   scrollBehavior: z.enum(["smooth", "instant"]).default("smooth"),
//   scrollSnap: z.boolean().default(true),
  
//   // Responsive breakpoints
//   breakpoints: z.record(z.object({
//     columns: z.number(),
//     gap: z.string(),
//   })).optional(),
// });

// export const CarouselConfig = z.object({
//   id: z.string().optional(),
//   title: z.string().optional(),
//   subtitle: z.string().optional(),
//   description: z.string().optional(),
  
//   items: z.array(CarouselItem),
//   layout: CarouselLayout.default({}),
  
//   // Content filtering
//   filters: z.object({
//     categories: z.array(z.string()).optional(),
//     tags: z.array(z.string()).optional(),
//     featuredOnly: z.boolean().optional(),
//     excludeIds: z.array(z.union([z.string(), z.number()])).optional(),
//   }).optional(),
  
//   // Sorting
//   sortBy: z.enum([
//     "priority",
//     "newest",
//     "oldest",
//     "alphabetical",
//     "rating",
//     "featured",
//   ]).optional(),
//   sortDirection: z.enum(["asc", "desc"]).optional(),
  
//   // Content limits
//   limit: z.number().positive().optional(),
//   offset: z.number().nonnegative().optional(),
  
//   // Styling overrides
//   theme: z.object({
//     primaryColor: z.string().optional(),
//     backgroundColor: z.string().optional(),
//     borderRadius: z.string().optional(),
//     fontFamily: z.string().optional(),
//   }).optional(),
  
//   // Callbacks (for runtime)
//   callbacks: z.object({
//     onItemClick: z.function().args(CarouselItem).returns(z.void()).optional(),
//     onLoadMore: z.function().returns(z.promise(z.any())).optional(),
//     onError: z.function().args(z.any()).returns(z.void()).optional(),
//   }).optional(),

//   autoplayLoop: z.boolean().default(true),
//   showIndicators: z.boolean().default(true),
  
//   // Metadata
//   version: z.string().default("1.0.0"),
//   lastUpdated: z.string().datetime().optional(),
  
//   // Extensions
//   extensions: z.record(z.any()).optional(),
// }).strict();


// export type CarouselItemType = z.infer<typeof CarouselItem>;
// export type CarouselConfigType = z.infer<typeof CarouselConfig>;
// export type CarouselLayoutType = z.infer<typeof CarouselLayout>;














// // export interface Offer {
// //   id: string | number;
// //   imageSrc: string;
// //   imageAlt: string;
// //   tag: string;
// //   title: string;
// //   description: string;
// //   brandLogoSrc: string;
// //   brandName: string;
// //   promoCode?: string;
// //   href: string;
// //   rating?: number;
// //   discountPercentage?: number;
// // }

// // // Props for the OfferCard component
// // interface OfferCardProps {
// //   offer: Offer;
// //   variant?: "default" | "compact" | "expanded";
// // }

// // The individual card component with shadcn integration
// const OfferCard = React.forwardRef<HTMLAnchorElement, OfferCardProps>(
//   ({ offer, variant = "default" }, ref) => {
//     const cardVariants = {
//       default: "w-[300px] h-[380px]",
//       compact: "w-[250px] h-[320px]",
//       expanded: "w-[350px] h-[450px]",
//     };

//     return (
//       <TooltipProvider>
//         <motion.div
//           whileHover={{ y: -8 }}
//           transition={{ type: "spring", stiffness: 300, damping: 20 }}
//           className="relative"
//         >
//           <Card className={cn(
//             "overflow-hidden group transition-all duration-300 hover:shadow-xl border-border",
//             cardVariants[variant]
//           )}>
//             <a ref={ref} href={offer.href} className="block h-full">
//               {/* Image Section with AspectRatio */}
//               <div className="relative h-1/2 overflow-hidden">
//                 <AspectRatio ratio={16/9}>
//                   <img
//                     src={offer.imageSrc}
//                     alt={offer.imageAlt}
//                     className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
//                   />
//                 </AspectRatio>
                
//                 {/* Discount Badge */}
//                 {offer.discountPercentage && (
//                   <Badge className="absolute top-3 left-3 bg-red-500 hover:bg-red-600 text-white border-none">
//                     -{offer.discountPercentage}%
//                   </Badge>
//                 )}
                
//                 {/* Tag Badge */}
//                 <div className="absolute bottom-3 left-3">
//                   <Badge variant="secondary" className="backdrop-blur-sm bg-background/80">
//                     <Tag className="w-3 h-3 mr-1" />
//                     {offer.tag}
//                   </Badge>
//                 </div>
//               </div>

//               {/* Content Section */}
//               <CardContent className="p-6 h-1/2 flex flex-col justify-between">
//                 <div className="space-y-3">
//                   {/* Title */}
//                   <h3 className="text-xl font-bold text-foreground leading-tight line-clamp-2">
//                     {offer.title}
//                   </h3>
                  
//                   {/* Description */}
//                   <p className="text-sm text-muted-foreground line-clamp-2">
//                     {offer.description}
//                   </p>
                  
//                   {/* Rating (if available) */}
//                   {offer.rating && (
//                     <div className="flex items-center gap-2">
//                       <div className="flex">
//                         {[...Array(5)].map((_, i) => (
//                           <span
//                             key={i}
//                             className={cn(
//                               "text-lg",
//                               i < Math.floor(offer.rating!) ? "text-yellow-500" : "text-muted"
//                             )}
//                           >
//                             ★
//                           </span>
//                         ))}
//                       </div>
//                       <span className="text-sm text-muted-foreground">
//                         ({offer.rating.toFixed(1)})
//                       </span>
//                     </div>
//                   )}
//                 </div>

//                 {/* Footer */}
//                 <div className="flex items-center justify-between pt-4 border-t">
//                   <div className="flex items-center gap-3">
//                     <div className="relative w-10 h-10 rounded-full overflow-hidden border">
//                       <img
//                         src={offer.brandLogoSrc}
//                         alt={`${offer.brandName} logo`}
//                         className="w-full h-full object-cover"
//                       />
//                     </div>
//                     <div>
//                       <p className="text-sm font-semibold text-foreground">
//                         {offer.brandName}
//                       </p>
//                       {offer.promoCode && (
//                         <Tooltip>
//                           <TooltipTrigger asChild>
//                             <p className="text-xs text-muted-foreground cursor-help">
//                               Code: {offer.promoCode}
//                             </p>
//                           </TooltipTrigger>
//                           <TooltipContent>
//                             <p>Click to copy promo code</p>
//                           </TooltipContent>
//                         </Tooltip>
//                       )}
//                     </div>
//                   </div>
                  
//                   {/* CTA Button */}
//                   <Button
//                     size="icon"
//                     className="rounded-full transition-all duration-300 group-hover:rotate-[-45deg] group-hover:bg-primary"
//                     variant="outline"
//                   >
//                     <ArrowRight className="w-4 h-4" />
//                   </Button>
//                 </div>
//               </CardContent>
//             </a>
//           </Card>
//         </motion.div>
//       </TooltipProvider>
//     );
//   }
// );
// OfferCard.displayName = "OfferCard";

// // Props for the OfferCarousel component
// export interface OfferCarouselProps extends React.HTMLAttributes<HTMLDivElement> {
//   offers: Offer[];
//   showProgress?: boolean;
//   autoPlay?: boolean;
//   variant?: "default" | "compact" | "expanded";
// }

// // The main carousel component with shadcn integration
// const OfferCarousel = React.forwardRef<HTMLDivElement, OfferCarouselProps>(
//   ({ offers, className, showProgress = false, autoPlay = false, variant = "default", ...props }, ref) => {
//     const scrollContainerRef = React.useRef<HTMLDivElement>(null);
//     const [scrollProgress, setScrollProgress] = React.useState(0);
//     const [currentIndex, setCurrentIndex] = React.useState(0);

//     const updateScrollProgress = () => {
//       if (scrollContainerRef.current) {
//         const { scrollLeft, scrollWidth, clientWidth } = scrollContainerRef.current;
//         const progress = (scrollLeft / (scrollWidth - clientWidth)) * 100;
//         setScrollProgress(progress);
        
//         // Calculate current index
//         const itemWidth = scrollContainerRef.current.scrollWidth / offers.length;
//         const index = Math.round(scrollLeft / itemWidth);
//         setCurrentIndex(index);
//       }
//     };

//     React.useEffect(() => {
//       const container = scrollContainerRef.current;
//       if (container) {
//         container.addEventListener("scroll", updateScrollProgress);
//         return () => container.removeEventListener("scroll", updateScrollProgress);
//       }
//     }, []);

//     const scroll = (direction: "left" | "right") => {
//       if (scrollContainerRef.current) {
//         const { current } = scrollContainerRef;
//         const scrollAmount = current.clientWidth * 0.8;
//         current.scrollBy({
//           left: direction === "left" ? -scrollAmount : scrollAmount,
//           behavior: "smooth",
//         });
//       }
//     };

//     const scrollToIndex = (index: number) => {
//       if (scrollContainerRef.current) {
//         const container = scrollContainerRef.current;
//         const itemWidth = container.scrollWidth / offers.length;
//         container.scrollTo({
//           left: itemWidth * index,
//           behavior: "smooth",
//         });
//       }
//     };

//     return (
//       <div ref={ref} className={cn("relative w-full", className)} {...props}>
//         {/* Navigation Buttons */}
//         <div className="flex justify-between items-center mb-4">
//           <div className="space-y-1">
//             <h3 className="text-2xl font-bold tracking-tight">Featured Offers</h3>
//             <p className="text-sm text-muted-foreground">
//               Discover amazing deals and discounts
//             </p>
//           </div>
          
//           <div className="flex items-center gap-2">
//             <Button
//               variant="outline"
//               size="icon"
//               onClick={() => scroll("left")}
//               className="rounded-full"
//               disabled={currentIndex === 0}
//             >
//               <ChevronLeft className="h-4 w-4" />
//             </Button>
//             <Button
//               variant="outline"
//               size="icon"
//               onClick={() => scroll("right")}
//               className="rounded-full"
//               disabled={currentIndex === offers.length - 1}
//             >
//               <ChevronRight className="h-4 w-4" />
//             </Button>
//           </div>
//         </div>

//         {/* Scrollable Container */}
//         <div
//           ref={scrollContainerRef}
//           className="flex gap-4 overflow-x-auto pb-6 scrollbar-hide snap-x snap-mandatory scroll-smooth"
//           onScroll={updateScrollProgress}
//         >
//           {offers.map((offer) => (
//             <OfferCard key={offer.id} offer={offer} variant={variant} />
//           ))}
//         </div>

//         {/* Progress Indicator */}
//         {showProgress && (
//           <div className="mt-4 space-y-2">
//             <Progress value={scrollProgress} className="h-2" />
//             <div className="flex justify-center gap-1">
//               {offers.map((_, index) => (
//                 <button
//                   key={index}
//                   onClick={() => scrollToIndex(index)}
//                   className={cn(
//                     "w-2 h-2 rounded-full transition-all",
//                     index === currentIndex
//                       ? "bg-primary w-4"
//                       : "bg-muted hover:bg-muted-foreground/50"
//                   )}
//                   aria-label={`Go to offer ${index + 1}`}
//                 />
//               ))}
//             </div>
//           </div>
//         )}
//       </div>
//     );
//   }
// );
// OfferCarousel.displayName = "OfferCarousel";

// // Extended version with more shadcn features
// export interface EnhancedOfferCarouselProps extends OfferCarouselProps {
//   showFilters?: boolean;
//   onFilterChange?: (filters: any) => void;
// }

// const EnhancedOfferCarousel = React.forwardRef<HTMLDivElement, EnhancedOfferCarouselProps>(
//   ({ showFilters = false, onFilterChange, ...props }, ref) => {
//     // You can add filter components like Select, Tabs, etc. here
//     return (
//       <div className="space-y-4">
//         {showFilters && (
//           <div className="flex items-center justify-between p-4 border rounded-lg bg-card">
//             <div className="flex items-center gap-4">
//               <Badge variant="outline" className="cursor-pointer">
//                 All Offers
//               </Badge>
//               <Badge variant="secondary" className="cursor-pointer">
//                 Featured
//               </Badge>
//               <Badge variant="secondary" className="cursor-pointer">
//                 New
//               </Badge>
//             </div>
//             <Button variant="ghost" size="sm">
//               View All
//             </Button>
//           </div>
//         )}
//         <OfferCarousel ref={ref} {...props} />
//       </div>
//     );
//   }
// );
// EnhancedOfferCarousel.displayName = "EnhancedOfferCarousel";





// export { OfferCarousel, EnhancedOfferCarousel, OfferCard, mockOffers };