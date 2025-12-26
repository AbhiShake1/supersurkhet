import type { ComponentRegistry, ComponentLayer } from '@/components/ui/ui-builder/types';
import { z } from 'zod';

import { Button, ButtonSchema } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Flexbox } from '@/components/ui/ui-builder/components/flexbox';
import { Grid } from '@/components/ui/ui-builder/components/grid';
import { CodePanel } from '@/components/ui/ui-builder/components/code-panel';
import { Markdown } from "@/components/ui/ui-builder/components/markdown";
import { Icon, iconNames } from "@/components/ui/ui-builder/components/icon";
import { Input, InputSchema } from "@/components/ui/input";
import { classNameFieldOverrides, childrenFieldOverrides, iconNameFieldOverrides, commonFieldOverrides, childrenAsTipTapFieldOverrides, childrenAsTextareaFieldOverrides } from "@/lib/ui-builder/registry/form-field-overrides";

import { UserAvatarDropdown } from '@/components/user/user-avatar-dropdown';
import { SignedInOnly, SignedInOnlySchema } from '@/components/security/signed-in-only';
import { SignedOutOnly, SignedOutOnlySchema } from '@/components/security/signed-out-only';
import { Link, LinkSchema } from '@/components/ui/navigation/link';

import {
  CarouselCard,
  EnhancedCarousel,
  mockCarouselItems
} from '@/components/imgcarousel/imgcarousel';
import { CarouselItem as CarouselItemSchema } from '@/components/imgcarousel/imgcarousel';

import Rating, { RatingSchema } from '@/components/ui/rating-group.tsx';
import { Slider, sliderSchema } from '@/components/ui/slider-1';
import EstimatedDateBadge, { EstimatedDateBadgeSchema } from '@/components/ui/estimated-arrival';

// New components with schemas added
import Features, { FeaturesSchema } from '@/components/features-1';
import CardBottomImage, { CardBottomImageSchema } from '@/components/shadcn-studio/card/card-04';
import { AnimatedGradientText, AnimatedGradientTextSchema } from '@/components/ui/animated-gradient-text';
import { AnimatedList, AnimatedListItem, AnimatedListSchema, AnimatedListItemSchema } from '@/components/ui/animated-list/animated-list';
import { ShimmerButton, ShimmerButtonSchema } from '@/components/ui/shimmer-button';
import { BentoCard, BentoGrid, BentoCardSchema, BentoGridSchema } from '@/components/ui/bento-grid';
import { AnimatedIcon, AnimatedIconSchema } from '@/components/animate-ui/icons/AnimatedIcon';
import { framerMotionComponentDefinitions } from './framer-motion-component-definitions';
import { RatingInteraction, RatingInteractionSchema } from '@/components/ui/emoji-rating';
import { OfferCard, OfferCardSchema, OfferCarousel, OfferCarouselSchema } from '@/components/ui/offer-carousel';
import { dialogComponentDefinitions } from './dialog-component-definitions';
import { credenzaComponentDefinitions } from './credenza-component-definitions';
import { accordionComponentDefinitions } from './accordion-component-definitions';
import { cardComponentDefinitions } from './card-component-definitions';
import { kokonutuiComponentDefinitions } from '@/components/kokonutui/component-definitions';
import { supersurkhetComponentDefinitions } from '@/components/supersurkhet/component-definitions';
import { carouzelComponentDefinitions } from './carouzel-component-definitions';
import { svgsComponentDefinitions } from '@/components/ui/svgs/component-definition';
import { modalComponentDefinitions } from './modal-component-definitions';
import { magicuiComponentDefinitions } from '@/components/magicui/component-definitions';
import { productOnboardingComponentDefinitions } from './product-onboarding-card-definitions';
import { threeDCardComponentDefinitions } from './3d-card-component-definitions';

export const complexComponentDefinitions: ComponentRegistry = {
  ...framerMotionComponentDefinitions,
  Button: {
    component: Button,
    schema: ButtonSchema,
    from: "@/components/ui/button",
    defaultChildren: [
      {
        id: "button-text",
        type: "span",
        name: "span",
        props: {},
        children: "Button",
      } satisfies ComponentLayer,
    ],
    fieldOverrides: commonFieldOverrides()
  },
  Badge: {
    component: Badge,
    schema: z.object({
      className: z.string().optional(),
      children: z.any().optional(),
      variant: z
        .enum(["default", "secondary", "destructive", "outline"])
        .default("default"),
    }),
    from: "@/components/ui/badge",
    defaultChildren: [
      {
        id: "badge-text",
        type: "span",
        name: "span",
        props: {},
        children: "Badge",
      } satisfies ComponentLayer,
    ],
    fieldOverrides: commonFieldOverrides()
  },
  Flexbox: {
    component: Flexbox,
    schema: z.object({
      className: z.string().optional(),
      children: z.any().optional(),
      direction: z
        .enum(["row", "column", "rowReverse", "columnReverse"])
        .default("row"),
      justify: z
        .enum(["start", "end", "center", "between", "around", "evenly"])
        .default("start"),
      align: z
        .enum(["start", "end", "center", "baseline", "stretch"])
        .default("start"),
      wrap: z.enum(["wrap", "nowrap", "wrapReverse"]).default("nowrap"),
      gap: z
        .preprocess(
          (val) => (typeof val === 'number' ? String(val) : val),
          z.enum(["0", "1", "2", "4", "8"]).default("1")
        )
        .transform(Number),
    }),
    from: "@/components/ui/ui-builder/flexbox",
    fieldOverrides: commonFieldOverrides()
  },
  Grid: {
    component: Grid,
    schema: z.object({
      className: z.string().optional(),
      children: z.any().optional(),
      columns: z
        .enum(["auto", "1", "2", "3", "4", "5", "6", "7", "8"])
        .default("1"),
      autoRows: z.enum(["none", "min", "max", "fr"]).default("none"),
      justify: z
        .enum(["start", "end", "center", "between", "around", "evenly"])
        .default("start"),
      align: z
        .enum(["start", "end", "center", "baseline", "stretch"])
        .default("start"),
      templateRows: z
        .enum(["none", "1", "2", "3", "4", "5", "6"])
        .default("none")
        .transform(val => (val === "none" ? val : Number(val))),
      gap: z
        .preprocess(
          (val) => (typeof val === 'number' ? String(val) : val),
          z.enum(["0", "1", "2", "4", "8"]).default("0")
        )
        .transform(Number),
    }),
    from: "@/components/ui/ui-builder/grid",
    fieldOverrides: commonFieldOverrides()
  },
  CodePanel: {
    component: CodePanel,
    schema: z.object({
      className: z.string().optional(),
    }),
    from: "@/components/ui/ui-builder/code-panel",
    fieldOverrides: {
      className: (layer) => classNameFieldOverrides(layer)
    }
  },
  Markdown: {
    component: Markdown,
    schema: z.object({
      children: z.any().optional(),
    }),
    from: "@/components/ui/ui-builder/markdown",
    defaultChildren: "Hello World from Markdown!",
    fieldOverrides: {
      className: (layer) => classNameFieldOverrides(layer),
      children: (layer) => childrenAsTipTapFieldOverrides(layer)
    }
  },
  Icon: {
    component: Icon,
    schema: z.object({
      className: z.string().optional(),
      iconName: z.enum([...iconNames]).default("Image"),
      size: z.enum(["small", "medium", "large"]).default("medium"),
      color: z
        .enum([
          "accent",
          "accentForeground",
          "primary",
          "primaryForeground",
          "secondary",
          "secondaryForeground",
          "destructive",
          "destructiveForeground",
          "muted",
          "mutedForeground",
          "background",
          "foreground",
        ])
        .default("foreground"),
      rotate: z.enum(["none", "90", "180", "270"]).default("none"),
    }),
    from: "@/components/ui/ui-builder/icon",
    fieldOverrides: {
      className: (layer) => classNameFieldOverrides(layer),
      iconName: (layer) => iconNameFieldOverrides(layer)
    }
  },
  Input: {
    component: Input,
    schema: InputSchema,
    from: "@/components/ui/input",
    fieldOverrides: {
      ...commonFieldOverrides(),
      leadingIcon: (l) => childrenFieldOverrides(l, { optionsFilter: (k) => k.toLowerCase().includes("icon") }),
      trailingIcon: (l) => childrenFieldOverrides(l, { optionsFilter: (k) => k.toLowerCase().includes("icon") }),
    }
  },

  ...dialogComponentDefinitions,

  // Credenza
  ...credenzaComponentDefinitions,

  //Accordion
  ...accordionComponentDefinitions,

  //Card
  ...cardComponentDefinitions,

  UserAvatarDropdown: {
    component: UserAvatarDropdown,
    schema: z.object({
      className: z.string().optional(),
      children: z.any().optional(),
    }),
    from: '@/components/user/user-avatar-dropdown',
    fieldOverrides: commonFieldOverrides()
  },

  ...magicuiComponentDefinitions,

  ...kokonutuiComponentDefinitions,

  // security
  SignedInOnly: {
    component: SignedInOnly,
    schema: SignedInOnlySchema,
    from: '@/components/security/signed-in-only',
    fieldOverrides: commonFieldOverrides()
  },
  SignedOutOnly: {
    component: SignedOutOnly,
    schema: SignedOutOnlySchema,
    from: '@/components/security/signed-out-only',
    fieldOverrides: commonFieldOverrides()
  },

  // navigation
  Link: {
    component: Link,
    schema: LinkSchema,
    from: '@/components/ui/navigation/link',
    fieldOverrides: commonFieldOverrides()
  },

  ...supersurkhetComponentDefinitions,

  ...productOnboardingComponentDefinitions,

  ...threeDCardComponentDefinitions,

  Rating: {
    component: Rating,
    schema: RatingSchema,
    from: "@/components/ui/rating",
    defaultChildren: [
      {
        id: "rating-header",
        type: "span",
        name: "span",
        props: {
          className: "text-lg font-semibold text-gray-900 dark:text-white",
        },
        children: "Product Rating",
      },
      {
        id: "rating-description",
        type: "span",
        name: "span",
        props: {
          className: "text-sm text-gray-600 dark:text-gray-400",
        },
        children: "How would you rate this product?",
      },
      {
        id: "rating-stars",
        type: "RatingGroup",
        name: "RatingGroup",
        props: {
          maxStars: 5,
          value: 0,
          allowHalf: true,
          filledColor: "text-yellow-400",
          emptyColor: "text-gray-300 dark:text-gray-600",
          hoverScale: 1.1,
          starSize: 24,
        },
        children: [],
      },
      {
        id: "rating-feedback",
        type: "span",
        name: "span",
        props: {
          className: "text-sm font-medium text-gray-900 dark:text-white mt-2",
        },
        children: "You rated this 0 stars",
      },
    ],
    fieldOverrides: commonFieldOverrides(),
  },

  Slider: {
    component: Slider,
    schema: sliderSchema,
    from: '@/components/ui/slider-1',
    defaultChildren: [
      {
        id: "slider-track",
        type: "SliderPrimitive.Track",
        name: "SliderTrack",
        props: {},
        children: [
          {
            id: "slider-range",
            type: "SliderPrimitive.Range",
            name: "SliderRange",
            props: {},
            children: [],
          },
        ],
      },
      {
        id: "slider-thumb",
        type: "SliderPrimitive.Thumb",
        name: "SliderThumb",
        props: {},
        children: [],
      },
    ],
    fieldOverrides: commonFieldOverrides()
  },

  Carousel: {
    component: EnhancedCarousel,
    schema: z.object({
      showProgress: z.boolean().default(true),
      autoPlay: z.boolean().default(false),
      variant: z.enum(["default", "compact", "expanded"]).default("default"),
      title: z.string().default("Featured Items"),
      subtitle: z.string().default("Discover amazing content"),
      showNavigation: z.boolean().default(true),
      showFilters: z.boolean().default(false),
    }),
    from: '@/components/imgcarousel/imgcarousel',
    // defaultProps: {
    //   showProgress: true,
    //   autoPlay: false,
    //   variant: "default",
    //   title: "Featured Items",
    //   subtitle: "Discover amazing content",
    //   showNavigation: true,
    //   showFilters: false,
    // },
    fieldOverrides: commonFieldOverrides(),
    defaultChildren: mockCarouselItems.map((item) => ({
      id: item.id,
      type: "CarouselCard",
      name: "CarouselCard",
      props: {
        item,
        variant: "default",
      },
      children: [],
    })) as ComponentLayer[],
  },
  CarouselCard: {
    component: CarouselCard,
    schema: z.object({
      item: CarouselItemSchema,
      variant: z.enum(["default", "compact", "expanded"]).default("default"),
    }),
    from: '@/components/imgcarousel/imgcarousel',
    fieldOverrides: commonFieldOverrides(),
    defaultChildren: [],
  },

  EstimatedArrival: {
    component: EstimatedDateBadge,
    schema: EstimatedDateBadgeSchema,
    from: '@/components/ui/estimated-arrival',
    fieldOverrides: commonFieldOverrides(),
    defaultChildren: [],
  },

  Features: {
    component: Features,
    schema: FeaturesSchema,
    from: '@/components/features-1',
    fieldOverrides: {
      className: (layer) => classNameFieldOverrides(layer),
      features: (layer) => childrenFieldOverrides(layer), // For features array
    },
    defaultChildren: [
      {
        id: "features-content",
        type: "Features",
        name: "Features",
        props: {
          title: "Our Powerful Features",
          subtitle: "Everything you need in a modern solution"
        },
        children: [],
      } satisfies ComponentLayer,
    ],
  },
  CardBottomImage: {
    component: CardBottomImage,
    schema: CardBottomImageSchema,
    from: '@/components/shadcn-studio/card/card-04',
    fieldOverrides: commonFieldOverrides(),
    defaultChildren: [
      {
        id: "card-bottom-image-demo",
        type: "CardBottomImageDemo",
        name: "CardBottomImageDemo",
        props: {
          title: "Premium Experience",
          description: "Discover our premium features designed to elevate your workflow",
          imageUrl: "https://images.unsplash.com/photo-1506744038136-46273834b3fb?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1170&q=80",
          imageAlt: "Mountain landscape"
        },
        children: [],
      } satisfies ComponentLayer,
    ],
  },
  AnimatedGradientText: {
    component: AnimatedGradientText,
    schema: AnimatedGradientTextSchema,
    from: '@/components/ui/animated-gradient-text',
    fieldOverrides: {
      className: (layer) => classNameFieldOverrides(layer),
      children: (layer) => childrenAsTextareaFieldOverrides(layer),
    },
    defaultChildren: "Animated Gradient Text Effect",
  },

  AnimatedList: {
    component: AnimatedList,
    schema: AnimatedListSchema,
    from: '@/components/ui/animated-list/animated-list',
    fieldOverrides: commonFieldOverrides(),
    defaultChildren: [
      {
        id: "animated-list-item-1",
        type: "AnimatedListItem",
        name: "AnimatedListItem",
        props: {},
        children: [
          {
            id: "list-item-content-1",
            type: "div",
            name: "div",
            props: { className: "p-4 bg-blue-100 rounded mb-2" },
            children: "First item",
          } satisfies ComponentLayer,
        ],
      },
      {
        id: "animated-list-item-2",
        type: "AnimatedListItem",
        name: "AnimatedListItem",
        props: {},
        children: [
          {
            id: "list-item-content-2",
            type: "div",
            name: "div",
            props: { className: "p-4 bg-green-100 rounded mb-2" },
            children: "Second item",
          } satisfies ComponentLayer,
        ],
      },
      {
        id: "animated-list-item-3",
        type: "AnimatedListItem",
        name: "AnimatedListItem",
        props: {},
        children: [
          {
            id: "list-item-content-3",
            type: "div",
            name: "div",
            props: { className: "p-4 bg-purple-100 rounded mb-2" },
            children: "Third item",
          } satisfies ComponentLayer,
        ],
      } satisfies ComponentLayer,
    ],
  },
  AnimatedListItem: {
    component: AnimatedListItem,
    schema: AnimatedListItemSchema,
    from: '@/components/ui/animated-list/animated-list',
    fieldOverrides: commonFieldOverrides(),
    defaultChildren: [
      {
        id: "default-animated-list-item",
        type: "div",
        name: "div",
        props: { className: "p-3 bg-gray-100 rounded" },
        children: "List item",
      } satisfies ComponentLayer,
    ],
  },
  ShimmerButton: {
    component: ShimmerButton,
    schema: ShimmerButtonSchema,
    from: '@/components/ui/shimmer-button',
    fieldOverrides: commonFieldOverrides(),
    defaultChildren: [
      {
        id: "shimmer-button-text",
        type: "span",
        name: "span",
        props: {},
        children: "Shimmer Button",
      } satisfies ComponentLayer,
    ],
  },
  BentoGrid: {
    component: BentoGrid,
    schema: BentoGridSchema,
    from: '@/components/ui/bento-grid',
    fieldOverrides: commonFieldOverrides(),
    defaultChildren: [
      {
        id: "bento-card-1",
        type: "BentoCard",
        name: "BentoCard",
        props: {
          name: "Dashboard Analytics",
          className: "md:col-span-2",
          description: "Comprehensive analytics for your business metrics",
          href: "/dashboard",
          cta: "View Dashboard",
          Icon: "BarChart3"
        },
        children: [
          {
            id: "analytics-content",
            type: "div",
            name: "div",
            props: { className: "text-2xl font-bold" },
            children: "35% Growth"
          }
        ],
      } satisfies ComponentLayer,
      {
        id: "bento-card-2",
        type: "BentoCard",
        name: "BentoCard",
        props: {
          name: "Performance Metrics",
          className: "md:col-span-1",
          description: "Track and optimize your performance",
          href: "/metrics",
          cta: "View Metrics",
          Icon: "Activity"
        },
        children: [
          {
            id: "metrics-content",
            type: "div",
            name: "div",
            props: { className: "text-xl font-semibold" },
            children: "Real-time"
          }
        ],
      } satisfies ComponentLayer,
    ],
  },
  BentoCard: {
    component: BentoCard,
    schema: BentoCardSchema,
    from: '@/components/ui/bento-grid',
    fieldOverrides: {
      className: (layer) => classNameFieldOverrides(layer),
      children: (layer) => childrenFieldOverrides(layer),
      Icon: (layer) => iconNameFieldOverrides(layer), // For icon field
    },
    defaultChildren: [
      {
        id: "bento-card-content",
        type: "div",
        name: "div",
        props: { className: "text-xl font-bold" },
        children: "Card Content",
      } satisfies ComponentLayer,
    ],
  },

  ...modalComponentDefinitions,

  AnimatedIcon: {
    component: AnimatedIcon,
    schema: AnimatedIconSchema,
    from: "@/components/animate-ui/icons/AnimatedIcon",
    fieldOverrides: commonFieldOverrides(),
    defaultChildren: [],
  },

  ...svgsComponentDefinitions,

  EmojiRating: {
    component: RatingInteraction,
    schema: RatingInteractionSchema,
    from: '@/components/ui/emoji-rating',
    fieldOverrides: commonFieldOverrides(),
    defaultChildren: [],
  },

  OfferCarousel: {
    component: OfferCarousel,
    schema: OfferCarouselSchema,
    from: '@/components/ui/offer-carousel',
    fieldOverrides: commonFieldOverrides(),
    defaultChildren: []
  },

  OfferCard: {
    component: OfferCard,
    schema: OfferCardSchema,
    from: '@/components/ui/offer-carousel',
    fieldOverrides: commonFieldOverrides(),
    defaultChildren: [],
  },

  // Carousel components
  ...carouzelComponentDefinitions,
}


