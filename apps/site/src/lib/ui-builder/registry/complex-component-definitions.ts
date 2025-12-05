import type { ComponentRegistry, ComponentLayer } from '@/components/ui/ui-builder/types';
import { z } from 'zod';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Flexbox } from '@/components/ui/ui-builder/components/flexbox';
import { Grid } from '@/components/ui/ui-builder/components/grid';
import { CodePanel } from '@/components/ui/ui-builder/components/code-panel';
import { Markdown } from "@/components/ui/ui-builder/components/markdown";
import { Icon, iconNames } from "@/components/ui/ui-builder/components/icon";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { classNameFieldOverrides, childrenFieldOverrides, iconNameFieldOverrides, commonFieldOverrides, childrenAsTipTapFieldOverrides } from "@/lib/ui-builder/registry/form-field-overrides";

import { UserAvatarDropdown } from '@/components/user/user-avatar-dropdown';
import { ThemeToggle } from '@/components/theme/theme-toggle';
import { ThemePresetSelector } from '@/components/theme/theme-preset-selector';
import { DivSchema } from './primitive-component-definitions';
import { ThemeEditor } from '@/components/theme/theme-editor';
import { Confetti } from '@/components/magicui/confetti';
import { RainbowButton } from '@/components/magicui/rainbow-button';
import ShapeHero from '@/components/kokonutui/shape-hero';
import TweetCard, { TweetCardSchema } from '@/components/kokonutui/tweet-card';
import ScrollText, { ScrollTextSchema } from '@/components/kokonutui/scroll-text';
import TypewriterTitle, { TypewriterTitleSchema } from '@/components/kokonutui/type-writer';
import MatrixText, { MatrixTextSchema } from '@/components/kokonutui/matrix-text';
import DynamicText, { DynamicTextSchema } from '@/components/kokonutui/dynamic-text';
import ShimmerText, { ShimmerTextSchema } from '@/components/kokonutui/shimmer-text';
import SlicedText, { SlicedTextSchema } from '@/components/kokonutui/sliced-text';
import SwooshText, { SwooshTextSchema } from '@/components/kokonutui/swoosh-text';
import SocialButton from '@/components/kokonutui/social-button';
import { PixelImage, PixelImageSchema } from '@/components/magicui/pixel-image';

// import { 
//   OfferCard, 
//   OfferCarousel, 
//   EnhancedOfferCarousel, 
//   mockOffers 
// } from '@/components/Image Carousel/imgcarousel';

import Rating, { RatingSchema } from '@/components/ui/rating-group.tsx'



import { ProductOnboardingCard } from '@/components/onboarding/product-definition';
import { ProductOnboardingCardSchema } from '@/components/onboarding/product-definition';






const ButtonSchema = z.object({
  className: z.string().optional(),
  children: z.any().optional(),
  asChild: z.boolean().optional(),
  variant: z
    .enum([
      "default",
      "destructive",
      "outline",
      "secondary",
      "ghost",
      "link",
    ])
    .default("default"),
  size: z.enum(["default", "sm", "lg", "icon"]).default("default"),
})

export const complexComponentDefinitions: ComponentRegistry = {
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
      className: z.string().optional(),
      children: z.any().optional(),
    }),
    from: "@/components/ui/ui-builder/markdown",
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
        .optional(),
      rotate: z.enum(["none", "90", "180", "270"]).default("none"),
    }),
    from: "@/components/ui/ui-builder/icon",
    fieldOverrides: {
      className: (layer) => classNameFieldOverrides(layer),
      iconName: (layer) => iconNameFieldOverrides(layer)
    }
  },

  //Accordion
  Accordion: {
    component: Accordion,
    schema: z.object({
      className: z.string().optional(),
      children: z.any().optional(),
      type: z.enum(["single", "multiple"]).default("single"),
      collapsible: z.boolean().optional(),
    }),
    from: "@/components/ui/accordion",
    defaultChildren: [
      {
        id: "acc-item-1",
        type: "AccordionItem",
        name: "AccordionItem",
        props: {
          value: "item-1",
        },
        children: [
          {
            id: "acc-trigger-1",
            type: "AccordionTrigger",
            name: "AccordionTrigger",
            props: {},
            children: [
              {
                id: "WEz8Yku",
                type: "span",
                name: "span",
                props: {},
                children: "Accordion Item #1",
              } satisfies ComponentLayer,
            ],
          },
          {
            id: "acc-content-1",
            type: "AccordionContent",
            name: "AccordionContent",
            props: {},
            children: [
              {
                id: "acc-content-1-text-1",
                type: "span",
                name: "span",
                props: {},
                children: "Accordion Content Text",
              } satisfies ComponentLayer,
            ],
          },
        ],
      },
      {
        id: "acc-item-2",
        type: "AccordionItem",
        name: "AccordionItem",
        props: {
          value: "item-2",
        },
        children: [
          {
            id: "acc-trigger-2",
            type: "AccordionTrigger",
            name: "AccordionTrigger",
            props: {},
            children: [
              {
                id: "acc-trigger-2-text-1",
                type: "span",
                name: "span",
                props: {},
                children: "Accordion Item #2",
              } satisfies ComponentLayer,
            ],
          },
          {
            id: "acc-content-2",
            type: "AccordionContent",
            name: "AccordionContent (Copy)",
            props: {},
            children: [
              {
                id: "acc-content-2-text-1",
                type: "span",
                name: "span",
                props: {},
                children: "Accordion Content Text",
              } satisfies ComponentLayer,
            ],
          },
        ],
      },
    ],
    fieldOverrides: commonFieldOverrides()
  },
  AccordionItem: {
    component: AccordionItem,
    schema: z.object({
      className: z.string().optional(),
      children: z.any().optional(),
      value: z.string(),
    }),
    from: "@/components/ui/accordion",
    defaultChildren: [
      {
        id: "acc-trigger-1",
        type: "AccordionTrigger",
        name: "AccordionTrigger",
        props: {},
        children: [
          {
            id: "WEz8Yku",
            type: "span",
            name: "span",
            props: {},
            children: "Accordion Item #1",
          } satisfies ComponentLayer,
        ],
      },
      {
        id: "acc-content-1",
        type: "AccordionContent",
        name: "AccordionContent",
        props: {},
        children: [
          {
            id: "acc-content-1-text-1",
            type: "span",
            name: "span",
            props: {},
            children: "Accordion Content Text",
          } satisfies ComponentLayer,
        ],
      },
    ],
    fieldOverrides: commonFieldOverrides()
  },
  AccordionTrigger: {
    component: AccordionTrigger,
    schema: z.object({
      className: z.string().optional(),
      children: z.any().optional(),
    }),
    from: "@/components/ui/accordion",
    fieldOverrides: {
      className: (layer) => classNameFieldOverrides(layer),
      children: (layer) => childrenFieldOverrides(layer)
    }
  },
  AccordionContent: {
    component: AccordionContent,
    schema: z.object({
      className: z.string().optional(),
      children: z.any().optional(),
    }),
    from: "@/components/ui/accordion",
    fieldOverrides: commonFieldOverrides()
  },

  //Card
  Card: {
    component: Card,
    schema: z.object({
      className: z.string().optional(),
      children: z.any().optional(),
    }),
    from: '@/components/ui/card',
    defaultChildren: [
      {
        id: "card-header",
        type: "CardHeader",
        name: "CardHeader",
        props: {},
        children: [
          {
            id: "card-title",
            type: "CardTitle",
            name: "CardTitle",
            props: {},
            children: [
              {
                id: "card-title-text",
                type: "span",
                name: "span",
                props: {},
                children: "Card Title",
              } satisfies ComponentLayer,
            ],
          },
          {
            id: "card-description",
            type: "CardDescription",
            name: "CardDescription",
            props: {},
            children: [
              {
                id: "card-description-text",
                type: "span",
                name: "span",
                props: {},
                children: "Card Description",
              } satisfies ComponentLayer,
            ],
          },
        ],
      },
      {
        id: "card-content",
        type: "CardContent",
        name: "CardContent",
        props: {},
        children: [
          {
            id: "card-content-paragraph",
            type: "span",
            name: "span",
            props: {},
            children: "Card Content",
          } satisfies ComponentLayer,
        ],
      },
      {
        id: "card-footer",
        type: "CardFooter",
        name: "CardFooter",
        props: {},
        children: [
          {
            id: "card-footer-paragraph",
            type: "span",
            name: "span",
            props: {},
            children: "Card Footer",
          } satisfies ComponentLayer,
        ],
      },
    ],
    fieldOverrides: commonFieldOverrides()
  },
  CardHeader: {
    component: CardHeader,
    schema: z.object({
      className: z.string().optional(),
      children: z.any().optional(),
    }),
    from: '@/components/ui/card',
    fieldOverrides: commonFieldOverrides()
  },
  CardFooter: {
    component: CardFooter,
    schema: z.object({
      className: z.string().optional(),
      children: z.any().optional(),
    }),
    from: '@/components/ui/card',
    fieldOverrides: commonFieldOverrides()
  },
  CardTitle: {
    component: CardTitle,
    schema: z.object({
      className: z.string().optional(),
      children: z.any().optional(),
    }),
    from: '@/components/ui/card',
    fieldOverrides: commonFieldOverrides()
  },
  CardDescription: {
    component: CardDescription,
    schema: z.object({
      className: z.string().optional(),
      children: z.any().optional(),
    }),
    from: '@/components/ui/card',
    fieldOverrides: commonFieldOverrides()
  },
  CardContent: {
    component: CardContent,
    schema: z.object({
      className: z.string().optional(),
      children: z.any().optional(),
    }),
    from: '@/components/ui/card',
    fieldOverrides: commonFieldOverrides()
  },

  UserAvatarDropdown: {
    component: UserAvatarDropdown,
    schema: z.object({
      className: z.string().optional(),
      children: z.any().optional(),
    }),
    from: '@/components/user/user-avatar-dropdown',
    fieldOverrides: commonFieldOverrides()
  },

  ThemeToggle: {
    component: ThemeToggle,
    schema: ButtonSchema,
    from: '@/components/theme/theme-toggle',
    fieldOverrides: commonFieldOverrides()
  },
  ThemePresetSelector: {
    component: ThemePresetSelector,
    schema: DivSchema,
    from: '@/components/theme/theme-preset-selector',
    fieldOverrides: commonFieldOverrides()
  },
  ThemeEditor: {
    component: ThemeEditor,
    schema: z.object({
      className: z.string().optional(),
      compact: z.boolean().optional(),
    }),
    from: '@/components/theme/theme-editor',
    fieldOverrides: commonFieldOverrides()
  },

  PixelImage: {
    component: PixelImage,
    schema: PixelImageSchema,
    from: '@/components/magicui/pixel-image',
    fieldOverrides: commonFieldOverrides()
  },
  Confetti: {
    component: Confetti,
    schema: z.object({
      className: z.string().optional(),
      options: z.object({
        angle: z.number().optional(),
        colors: z.array(z.string()).optional(),
        decay: z.number().optional(),
        disableForReducedMotion: z.boolean().optional(),
        drift: z.number().optional(),
        flat: z.boolean().optional(),
        gravity: z.number().optional(),
        particleCount: z.number().optional(),
        scalar: z.number().optional(),
        spread: z.number().optional(),
        startVelocity: z.number().optional(),
        ticks: z.number().optional(),
        zIndex: z.number().optional(),
        // shapes: z.array(z.object({})).optional(),
        origin: z.object({
          x: z.number().optional(),
          y: z.number().optional(),
        }).optional()
      }).optional(),
      globalOptions: z.object({
        disableForReducedMotion: z.boolean().optional(),
        resize: z.boolean().optional(),
        useWorker: z.boolean().optional(),
      }).optional(),
      manualstart: z.boolean().optional(),
      children: z.any().optional(),
    }),
    from: '@/components/magicui/confetti',
    fieldOverrides: commonFieldOverrides()
  },
  RainbowButton: {
    component: RainbowButton,
    schema: ButtonSchema,
    from: '@/components/magicui/rainbow-button',
    fieldOverrides: commonFieldOverrides()
  },

  ShapeHero: {
    component: ShapeHero,
    schema: z.object({
      title1: z.string().optional(),
      title2: z.string().optional(),
      description: z.string().optional(),
    }),
    from: '@/components/kokonutui/shape-hero',
    fieldOverrides: commonFieldOverrides()
  },
  TweetCard: {
    component: TweetCard,
    schema: TweetCardSchema,
    from: '@/components/kokonutui/tweet-card',
    fieldOverrides: commonFieldOverrides()
  },
  ScrollText: {
    component: ScrollText,
    schema: ScrollTextSchema,
    from: '@/components/kokonutui/scroll-text',
    fieldOverrides: commonFieldOverrides()
  },
  TypingText: {
    component: TypewriterTitle,
    schema: TypewriterTitleSchema,
    from: '@/components/kokonutui/type-writer',
    fieldOverrides: commonFieldOverrides()
  },
  MatrixText: {
    component: MatrixText,
    schema: MatrixTextSchema,
    from: '@/components/kokonutui/matrix-text',
    fieldOverrides: commonFieldOverrides()
  },
  DynamicText: {
    component: DynamicText,
    schema: DynamicTextSchema,
    from: '@/components/kokonutui/dynamic-text',
    fieldOverrides: commonFieldOverrides()
  },
  ShimmerText: {
    component: ShimmerText,
    schema: ShimmerTextSchema,
    from: '@/components/kokonutui/shimmer-text',
    fieldOverrides: commonFieldOverrides()
  },
  SlicedText: {
    component: SlicedText,
    schema: SlicedTextSchema,
    from: '@/components/kokonutui/sliced-text',
    fieldOverrides: commonFieldOverrides()
  },
  SwooshText: {
    component: SwooshText,
    schema: SwooshTextSchema,
    from: '@/components/kokonutui/swoosh-text',
    fieldOverrides: commonFieldOverrides()
  },
  SocialButton: {
    component: SocialButton,
    schema: ButtonSchema,
    from: '@/components/kokonutui/social-button',
    fieldOverrides: commonFieldOverrides()
  },












  
  ProductOnboardingCard: {
  component: ProductOnboardingCard,
  schema: ProductOnboardingCardSchema,
  from: "@/components/onboarding/product-definition",
  fieldOverrides: commonFieldOverrides(),
  defaultChildren: [
    {
      id: "onboarding-main-icon",
      type: "Icon",
      name: "Icon",
      props: {
        iconName: "Sparkles",
        size: "large",
        className: "text-white",
      },
      children: [],
    } satisfies ComponentLayer,
    {
      id: "onboarding-title",
      type: "span",
      name: "span",
      props: {
        className: "text-3xl font-bold",
      },
      children: "Welcome to Our Product",
    } satisfies ComponentLayer,
    {
      id: "onboarding-description",
      type: "span",
      name: "span",
      props: {
        className: "text-muted-foreground",
      },
      children: "Get started with our amazing features",
    } satisfies ComponentLayer,
    {
      id: "onboarding-card-content",
      type: "Card",
      name: "Card",
      props: {},
      children: [
        {
          id: "onboarding-card-header",
          type: "CardHeader",
          name: "CardHeader",
          props: {},
          children: [
            {
              id: "card-icon",
              type: "Icon",
              name: "Icon",
              props: {
                iconName: "CheckCircle",
                size: "medium",
              },
              children: [],
            },
            {
              id: "card-header-label",
              type: "span",
              name: "span",
              props: {
                className: "text-xs font-semibold uppercase tracking-wider text-muted-foreground",
              },
              children: "FEATURE",
            } satisfies ComponentLayer,
          ],
        },
        {
          id: "onboarding-card-body",
          type: "CardContent",
          name: "CardContent",
          props: {},
          children: [
            {
              id: "card-title",
              type: "CardTitle",
              name: "CardTitle",
              props: {},
              children: "First Steps",
            } satisfies ComponentLayer,
            {
              id: "card-description",
              type: "CardDescription",
              name: "CardDescription",
              props: {},
              children: "Complete these initial tasks to get started",
            } satisfies ComponentLayer,
          ],
        },
      ],
    },
    {
      id: "onboarding-button",
      type: "Button",
      name: "Button",
      props: {
        className: "w-full max-w-xs",
        variant: "default",
      },
      children: "Get Started",
    } satisfies ComponentLayer,
  ],
},









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
        children: ["Product Rating"], 
      },
      {
        id: "rating-description",
        type: "span",
        name: "span",
        props: {
          className: "text-sm text-gray-600 dark:text-gray-400",
        },
        children: ["How would you rate this product?"],
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
        children: ["You rated this 0 stars"],
      },
    ],
    fieldOverrides: commonFieldOverrides(),
  },



















  // OfferCard: {
  //   component: OfferCard,
  //   schema: z.object({
  //     offer: z.object({
  //       id: z.union([z.string(), z.number()]),
  //       imageSrc: z.string().url(),
  //       imageAlt: z.string(),
  //       tag: z.string(),
  //       title: z.string(),
  //       description: z.string(),
  //       brandLogoSrc: z.string().url(),
  //       brandName: z.string(),
  //       promoCode: z.string().optional(),
  //       href: z.string().url(),
  //       rating: z.number().min(0).max(5).optional(),
  //       discountPercentage: z.number().min(0).max(100).optional(),
  //     }),
  //     variant: z.enum(["default","compact","expanded"]).optional(),
  //   }),
  //   defaultProps: { variant: "default", offer: mockOffers[0] },
  // },

  // OfferCarousel: {
  //   component: OfferCarousel,
  //   schema: z.object({
  //     offers: z.array(z.any()),
  //     showProgress: z.boolean().optional(),
  //     autoPlay: z.boolean().optional(),
  //     variant: z.enum(["default","compact","expanded"]).optional(),
  //   }),
  //   defaultProps: { offers: mockOffers, showProgress: true, autoPlay: false, variant: "default" },
  // },

  // EnhancedOfferCarousel: {
  //   component: EnhancedOfferCarousel,
  //   schema: z.object({
  //     offers: z.array(z.any()),
  //     showProgress: z.boolean().optional(),
  //     autoPlay: z.boolean().optional(),
  //     variant: z.enum(["default","compact","expanded"]).optional(),
  //     showFilters: z.boolean().optional(),
  //     onFilterChange: z.function().args(z.any()).returns(z.void()).optional(),
  //   }),
  //   defaultProps: { offers: mockOffers, showProgress: true, autoPlay: false, variant: "default", showFilters: false },
  // },
};