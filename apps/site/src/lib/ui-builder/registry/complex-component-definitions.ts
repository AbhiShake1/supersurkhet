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
import { Input, InputSchema } from "@/components/ui/input";
import { classNameFieldOverrides, childrenFieldOverrides, iconNameFieldOverrides, commonFieldOverrides, childrenAsTipTapFieldOverrides, childrenAsTextareaFieldOverrides, tablePickerFieldOverrides } from "@/lib/ui-builder/registry/form-field-overrides";

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
import { SignedInOnly, SignedInOnlySchema } from '@/components/security/signed-in-only';
import { SignedOutOnly, SignedOutOnlySchema } from '@/components/security/signed-out-only';
import { Link, LinkSchema } from '@/components/ui/navigation/link';
import {
  ProductList,
  ProductListSchema,
  SingleProduct,
  ProductSchema,
  ProductImage,
  ProductImageSchema,
  ProductTitle,
  ProductTitleSchema,
  ProductDescription,
  ProductDescriptionSchema,
  ProductPrice,
  ProductPriceSchema,
  ProductActions,
  ProductActionsSchema,
  ProductBadge,
  ProductBadgeSchema,
  ProductDetail,
  ProductDetailSchema,
} from '@/components/supersurkhet/products';
import { Dialog, DialogContent, DialogFooter, DialogHeader } from '@/components/ui/dialog';
import { Credenza, CredenzaBody, CredenzaFooter, CredenzaHeader, CredenzaTrigger } from '@/components/ui/credenza';

import {
  CarouselCard,
  EnhancedCarousel,
  mockCarouselItems
} from '@/components/imgcarousel/imgcarousel';
import { CarouselItem as CarouselItemSchema } from '@/components/imgcarousel/imgcarousel';

import Rating, { RatingSchema } from '@/components/ui/rating-group.tsx';
import { ProductOnboardingCard } from '@/components/onboarding/product-definition';
import { ProductOnboardingCardSchema } from '@/components/onboarding/product-definition';
import { Slider, sliderSchema } from '@/components/ui/slider-1';
import EstimatedDateBadge, { EstimatedDateBadgeSchema } from '@/components/ui/estimated-arrival';

// Data components from supersurkhet
import {
  DataList,
  DataListSchema,
  SingleData,
  DataSchema,
  DataDetail,
  DataDetailSchema,
} from '@/components/supersurkhet/data';

// New components with schemas added
import Features, { FeaturesSchema } from '@/components/features-1';
import CardBottomImageDemo, { CardBottomImageDemoSchema } from '@/components/shadcn-studio/card/card-04';
import { AnimatedGradientText, AnimatedGradientTextSchema } from '@/components/ui/animated-gradient-text';
import { CardContainer, CardBody, CardItem, CardContainerSchema, CardBodySchema, CardItemSchema } from '@/components/ui/3d-card';
import { AnimatedList, AnimatedListItem, AnimatedListSchema, AnimatedListItemSchema } from '@/components/ui/animated-list/animated-list';
import { ShimmerButton, ShimmerButtonSchema } from '@/components/ui/shimmer-button';
import { BentoCard, BentoGrid, BentoCardSchema, BentoGridSchema } from '@/components/ui/bento-grid';
import { Modal, ModalTrigger, ModalBody, ModalContent, ModalFooter, ModalSchema, ModalTriggerSchema, ModalBodySchema, ModalContentSchema, ModalFooterSchema } from '@/components/ui/animated-modal';
import { AnimatedIcon, AnimatedIconSchema } from '@/components/animate-ui/icons/AnimatedIcon';
import { SvgIcon, SvgIconSchema } from '@/components/ui/svgs/SvgIcon';
import { framerMotionComponentDefinitions } from './framer-motion-component-definitions';
import { RatingInteraction, RatingInteractionSchema } from '@/components/ui/emoji-rating';
import { OfferCard, OfferCardSchema, OfferCarousel, OfferCarouselSchema } from '@/components/ui/offer-carousel';
import {
  Carouzel,
  CarouzelContent,
  CarouzelSchema,
  CarouzelContentSchema,
  CarouzelNavigationSchema,
  CarouzelNavigation,
  CarouzelItem,
  CarouzelItemShema,
} from '@/components/ui/carouzel';

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
        .optional(),
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

  // Dialog
  Dialog: {
    component: Dialog,
    schema: z.object({
      className: z.string().optional(),
      children: z.any().optional(),
    }),
    from: "@/components/ui/dialog",
    fieldOverrides: commonFieldOverrides(),
    defaultChildren: [
      {
        id: "dialog-header",
        type: "DialogHeader",
        name: "DialogHeader",
        props: {},
        children: [
          {
            id: "dialog-header-text",
            type: "span",
            name: "span",
            props: {},
            children: "Dialog Header",
          } satisfies ComponentLayer,
        ],
      },
      {
        id: "dialog-body",
        type: "DialogContent",
        name: "DialogContent",
        props: {},
        children: [
          {
            id: "dialog-body-text",
            type: "span",
            name: "span",
            props: {},
            children: "Dialog Body",
          } satisfies ComponentLayer,
        ],
      },
      {
        id: "dialog-footer",
        type: "DialogFooter",
        name: "DialogFooter",
        props: {},
        children: [
          {
            id: "dialog-footer-text",
            type: "span",
            name: "span",
            props: {},
            children: "Dialog Footer",
          } satisfies ComponentLayer,
        ],
      },
    ],
  },
  DialogHeader: {
    component: DialogHeader,
    schema: z.object({
      className: z.string().optional(),
      children: z.any().optional(),
    }),
    from: "@/components/ui/dialog",
    fieldOverrides: commonFieldOverrides(),
  },
  DialogContent: {
    component: DialogContent,
    schema: z.object({
      className: z.string().optional(),
      children: z.any().optional(),
    }),
    from: "@/components/ui/dialog",
    fieldOverrides: commonFieldOverrides(),
  },
  DialogFooter: {
    component: DialogFooter,
    schema: z.object({
      className: z.string().optional(),
      children: z.any().optional(),
    }),
    from: "@/components/ui/dialog",
    fieldOverrides: commonFieldOverrides(),
  },

  // Credenza
  Credenza: {
    component: Credenza,
    schema: z.object({
      className: z.string().optional(),
      children: z.any().optional(),
    }),
    from: "@/components/ui/credenza",
    fieldOverrides: commonFieldOverrides(),
    defaultChildren: [
      {
        id: "credenza-trigger",
        type: "CredenzaTrigger",
        name: "CredenzaTrigger",
        props: {},
        children: [
          {
            id: "credenza-trigger-text",
            type: "span",
            name: "span",
            props: {},
            children: "Credenza Trigger",
          } satisfies ComponentLayer,
        ],
      },
      {
        id: "credenza-content",
        type: "CredenzaContent",
        name: "CredenzaContent",
        props: {},
        children: [
          {
            id: "credenza-content-text",
            type: "span",
            name: "span",
            props: {},
            children: "Credenza Content",
          } satisfies ComponentLayer,
        ],
      },
    ],
  },
  CredenzaTrigger: {
    component: CredenzaTrigger,
    schema: z.object({
      className: z.string().optional(),
      children: z.any().optional(),
      asChild: z.boolean().optional(),
    }),
    from: "@/components/ui/credenza",
    fieldOverrides: commonFieldOverrides(),
  },
  CredenzaHeader: {
    component: CredenzaHeader,
    schema: z.object({
      className: z.string().optional(),
      children: z.any().optional(),
    }),
    from: "@/components/ui/credenza",
    fieldOverrides: commonFieldOverrides(),
  },
  CredenzaBody: {
    component: CredenzaBody,
    schema: z.object({
      className: z.string().optional(),
      children: z.any().optional(),
    }),
    from: "@/components/ui/credenza",
    fieldOverrides: commonFieldOverrides(),
  },
  CredenzaFooter: {
    component: CredenzaFooter,
    schema: z.object({
      className: z.string().optional(),
      children: z.any().optional(),
    }),
    from: "@/components/ui/credenza",
    fieldOverrides: commonFieldOverrides(),
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
  ProductDetail: {
    component: ProductDetail,
    schema: ProductDetailSchema,
    from: '@/components/supersurkhet/products',
    fieldOverrides: commonFieldOverrides(),
    defaultChildren: [
      {
        id: "product-detail-image",
        type: "ProductImage",
        name: "ProductImage",
        props: {},
        children: [
          {
            id: "product-detail-image-image",
            type: "img",
            name: "img",
            props: {},
            children: "Product Image",
          } satisfies ComponentLayer,
        ],
      },
      {
        id: "product-detail-title",
        type: "ProductTitle",
        name: "ProductTitle",
        props: {},
        children: [
          {
            id: "product-detail-title-text",
            type: "span",
            name: "span",
            props: {},
            children: "Product Title",
          } satisfies ComponentLayer,
        ],
      },
      {
        id: "product-detail-description",
        type: "ProductDescription",
        name: "ProductDescription",
        props: {},
        children: [
          {
            id: "product-detail-description-text",
            type: "span",
            name: "span",
            props: {},
            children: "Product Description",
          } satisfies ComponentLayer,
        ],
      },
      {
        id: "product-detail-price",
        type: "ProductPrice",
        name: "ProductPrice",
        props: {},
        children: [
          {
            id: "product-detail-price-text",
            type: "span",
            name: "span",
            props: {},
            children: "$100",
          } satisfies ComponentLayer,
        ],
      },
    ],
  },
  ProductList: {
    component: ProductList,
    schema: ProductListSchema,
    from: '@/components/supersurkhet/products',
    fieldOverrides: commonFieldOverrides(),
    defaultChildren: [
      {
        id: "product-1",
        type: "SingleProduct",
        name: "SingleProduct",
        props: {},
        children: [
          {
            id: "product-image",
            type: "ProductImage",
            name: "ProductImage",
            props: {},
            children: [
              {
                id: "product-image-image",
                type: "img",
                name: "img",
                props: {},
                children: "Product Image",
              } satisfies ComponentLayer,
            ],
          },
          {
            id: "product-title",
            type: "ProductTitle",
            name: "ProductTitle",
            props: {},
            children: [
              {
                id: "product-title-text",
                type: "span",
                name: "span",
                props: {},
                children: "Product Title",
              } satisfies ComponentLayer,
            ],
          },
          {
            id: "product-description",
            type: "ProductDescription",
            name: "ProductDescription",
            props: {},
            children: [
              {
                id: "product-description-text",
                type: "span",
                name: "span",
                props: {},
                children: "Product Description",
              } satisfies ComponentLayer,
            ],
          },
          {
            id: "product-price",
            type: "ProductPrice",
            name: "ProductPrice",
            props: {},
            children: [
              {
                id: "product-price-text",
                type: "span",
                name: "span",
                props: {},
                children: "$100",
              } satisfies ComponentLayer,
            ],
          },
        ],
      },
    ]
  },

  // products
  SingleProduct: {
    component: SingleProduct,
    schema: ProductSchema,
    from: '@/components/supersurkhet/products',
    fieldOverrides: commonFieldOverrides()
  },
  ProductTitle: {
    component: ProductTitle,
    schema: ProductTitleSchema,
    from: '@/components/supersurkhet/products',
    fieldOverrides: commonFieldOverrides(),
  },
  ProductDescription: {
    component: ProductDescription,
    schema: ProductDescriptionSchema,
    from: '@/components/supersurkhet/products',
    fieldOverrides: commonFieldOverrides(),
  },
  ProductPrice: {
    component: ProductPrice,
    schema: ProductPriceSchema,
    from: '@/components/supersurkhet/products',
    fieldOverrides: commonFieldOverrides(),
  },
  ProductActions: {
    component: ProductActions,
    schema: ProductActionsSchema,
    from: '@/components/supersurkhet/products',
    fieldOverrides: commonFieldOverrides(),
  },
  ProductBadge: {
    component: ProductBadge,
    schema: ProductBadgeSchema,
    from: '@/components/supersurkhet/products',
    fieldOverrides: commonFieldOverrides(),
  },
  ProductImage: {
    component: ProductImage,
    schema: ProductImageSchema,
    from: '@/components/supersurkhet/products',
    fieldOverrides: commonFieldOverrides(),
  },

  ProductOnboardingCard: {
    component: ProductOnboardingCard,
    schema: ProductOnboardingCardSchema,
    from: "@/components/onboarding/product-definition",
    fieldOverrides: commonFieldOverrides(),
    // props: {
    //   mainIcon: {
    //     iconName: "Sparkles",
    //     size: "large",
    //     className: "text-white",
    //   },
    // },
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
      },
      {
        id: "onboarding-title",
        type: "span",
        name: "span",
        props: { className: "text-3xl font-bold" },
        children: "Welcome to Our Product",
      },
      {
        id: "onboarding-description",
        type: "span",
        name: "span",
        props: { className: "text-muted-foreground" },
        children: "Get started with our amazing features",
      },
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
                props: { iconName: "CheckCircle", size: "medium" },
                children: [],
              },
              {
                id: "card-header-label",
                type: "span",
                name: "span",
                props: {
                  className:
                    "text-xs font-semibold uppercase tracking-wider text-muted-foreground",
                },
                children: "FEATURE",
              },
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
              },
              {
                id: "card-description",
                type: "CardDescription",
                name: "CardDescription",
                props: {},
                children: "Complete these initial tasks to get started",
              },
            ],
          },
        ],
      },
      {
        id: "onboarding-button",
        type: "Button",
        name: "Button",
        props: { className: "w-full max-w-xs", variant: "default" },
        children: "Get Started",
      },
    ] satisfies ComponentLayer[],
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

  // New components with schemas
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
  CardBottomImageDemo: {
    component: CardBottomImageDemo,
    schema: CardBottomImageDemoSchema,
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
  CardBody: {
    component: CardBody,
    schema: CardBodySchema,
    from: '@/components/ui/3d-card',
    fieldOverrides: commonFieldOverrides(),
    defaultChildren: [
      {
        id: "example-card-body-standalone",
        type: "CardBody",
        name: "CardBody",
        props: {
          className: "bg-gray-50 relative group/card dark:hover:shadow-2xl dark:hover:shadow-emerald-500/[0.1] dark:bg-black dark:border-white/[0.2] border-black/[0.1] w-auto sm:w-[25rem] h-auto rounded-xl p-6 border"
        },
        children: [
          {
            id: "standalone-card-title",
            type: "CardItem",
            name: "CardItem",
            props: {
              translateZ: "50",
              className: "text-xl font-bold text-neutral-600 dark:text-white"
            },
            children: "3D Card Component"
          },
          {
            id: "standalone-card-description",
            type: "CardItem",
            name: "CardItem",
            props: {
              as: "p",
              translateZ: "60",
              className: "text-neutral-500 text-sm max-w-sm mt-2 dark:text-neutral-300"
            },
            children: "This is a standalone 3D card body with interactive effects"
          },
          {
            id: "standalone-card-image",
            type: "CardItem",
            name: "CardItem",
            props: {
              translateZ: "100",
              className: "w-full mt-4"
            },
            children: [
              {
                id: "standalone-image",
                type: "img",
                name: "img",
                props: {
                  src: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=600&q=80",
                  width: "1000",
                  height: "1000",
                  className: "h-40 w-full object-cover rounded-xl group-hover/card:shadow-xl",
                  alt: "Portrait"
                },
                children: []
              }
            ]
          },
          {
            id: "standalone-card-button",
            type: "CardItem",
            name: "CardItem",
            props: {
              translateZ: "20",
              as: "button",
              className: "px-4 py-2 rounded-xl bg-black dark:bg-white dark:text-black text-white text-xs font-bold mt-4"
            },
            children: "View Details"
          }
        ],
      } satisfies ComponentLayer,
    ],
  },
  CardItem: {
    component: CardItem,
    schema: CardItemSchema,
    from: '@/components/ui/3d-card',
    fieldOverrides: commonFieldOverrides(),
    defaultChildren: [
      {
        id: "default-card-item-interactive",
        type: "CardItem",
        name: "CardItem",
        props: {
          translateZ: "60",
          className: "text-lg font-medium text-gray-700 dark:text-gray-200"
        },
        children: [
          {
            id: "card-item-content",
            type: "span",
            name: "span",
            props: {},
            children: "Hover-interactive element",
          } satisfies ComponentLayer,
        ],
      },
    ],
  },
  CardContainer: {
    component: CardContainer,
    schema: CardContainerSchema,
    from: '@/components/ui/3d-card',
    fieldOverrides: commonFieldOverrides(),
    defaultChildren: [
      {
        id: "example-card-body",
        type: "CardBody",
        name: "CardBody",
        props: {
          className: "bg-gray-50 relative group/card dark:hover:shadow-2xl dark:hover:shadow-emerald-500/[0.1] dark:bg-black dark:border-white/[0.2] border-black/[0.1] w-auto sm:w-[30rem] h-auto rounded-xl p-6 border"
        },
        children: [
          {
            id: "card-title-item",
            type: "CardItem",
            name: "CardItem",
            props: {
              translateZ: "50",
              className: "text-xl font-bold text-neutral-600 dark:text-white"
            },
            children: "Interactive 3D Card"
          },
          {
            id: "card-description-item",
            type: "CardItem",
            name: "CardItem",
            props: {
              as: "p",
              translateZ: "60",
              className: "text-neutral-500 text-sm max-w-sm mt-2 dark:text-neutral-300"
            },
            children: "Hover over this card to see the 3D effect in action"
          },
          {
            id: "card-image-item",
            type: "CardItem",
            name: "CardItem",
            props: {
              translateZ: "100",
              className: "w-full mt-4"
            },
            children: [
              {
                id: "card-image",
                type: "img",
                name: "img",
                props: {
                  src: "https://images.unsplash.com/photo-1506744038136-46273834b3fb?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1170&q=80",
                  width: "1000",
                  height: "1000",
                  className: "h-60 w-full object-cover rounded-xl group-hover/card:shadow-xl",
                  alt: "Nature scene"
                },
                children: []
              }
            ]
          },
          {
            id: "card-actions-container",
            type: "div",
            name: "div",
            props: {
              className: "flex justify-between items-center mt-6"
            },
            children: [
              {
                id: "card-link-item",
                type: "CardItem",
                name: "CardItem",
                props: {
                  translateZ: "20",
                  as: "a",
                  href: "#",
                  className: "px-4 py-2 rounded-xl text-xs font-normal dark:text-white"
                },
                children: "Learn more →"
              },
              {
                id: "card-button-item",
                type: "CardItem",
                name: "CardItem",
                props: {
                  translateZ: "20",
                  as: "button",
                  className: "px-4 py-2 rounded-xl bg-black dark:bg-white dark:text-black text-white text-xs font-bold"
                },
                children: "Get Started"
              }
            ]
          }
        ],
      } satisfies ComponentLayer,
    ],
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
      background: (layer) => childrenFieldOverrides(layer),
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
  Modal: {
    component: Modal,
    schema: ModalSchema,
    from: '@/components/ui/animated-modal',
    fieldOverrides: commonFieldOverrides(),
    defaultChildren: [
      {
        id: "modal-trigger",
        type: "ModalTrigger",
        name: "ModalTrigger",
        props: { className: "px-4 py-2 rounded-md bg-blue-500 text-white" },
        children: [
          {
            id: "trigger-text",
            type: "span",
            name: "span",
            props: {},
            children: "Open Modal",
          } satisfies ComponentLayer,
        ],
      },
      {
        id: "modal-body",
        type: "ModalBody",
        name: "ModalBody",
        props: {},
        children: [
          {
            id: "modal-content",
            type: "ModalContent",
            name: "ModalContent",
            props: { className: "p-6" },
            children: [
              {
                id: "modal-title",
                type: "h2",
                name: "h2",
                props: { className: "text-xl font-bold mb-2" },
                children: "Modal Title",
              },
              {
                id: "modal-description",
                type: "p",
                name: "p",
                props: { className: "text-gray-600 mb-4" },
                children: "This is an animated modal with 3D effects",
              }
            ],
          },
          {
            id: "modal-footer",
            type: "ModalFooter",
            name: "ModalFooter",
            props: { className: "p-4 bg-gray-100" },
            children: [
              {
                id: "footer-button",
                type: "Button",
                name: "Button",
                props: { variant: "default", className: "mr-2" },
                children: "Confirm",
              },
              {
                id: "cancel-button",
                type: "Button",
                name: "Button",
                props: { variant: "outline" },
                children: "Cancel",
              }
            ],
          }
        ],
      } satisfies ComponentLayer,
    ],
  },
  ModalTrigger: {
    component: ModalTrigger,
    schema: ModalTriggerSchema,
    from: '@/components/ui/animated-modal',
    fieldOverrides: commonFieldOverrides(),
    defaultChildren: [
      {
        id: "default-modal-trigger",
        type: "span",
        name: "span",
        props: {},
        children: "Open Modal",
      } satisfies ComponentLayer,
    ],
  },
  ModalBody: {
    component: ModalBody,
    schema: ModalBodySchema,
    from: '@/components/ui/animated-modal',
    fieldOverrides: commonFieldOverrides(),
    defaultChildren: [
      {
        id: "modal-content-wrapper",
        type: "ModalContent",
        name: "ModalContent",
        props: {},
        children: [
          {
            id: "modal-body-title",
            type: "h3",
            name: "h3",
            props: { className: "text-lg font-semibold" },
            children: "Modal Content"
          },
          {
            id: "modal-body-content",
            type: "p",
            name: "p",
            props: {},
            children: "This is the modal body content"
          }
        ],
      } satisfies ComponentLayer,
    ],
  },
  ModalContent: {
    component: ModalContent,
    schema: ModalContentSchema,
    from: '@/components/ui/animated-modal',
    fieldOverrides: commonFieldOverrides(),
    defaultChildren: [
      {
        id: "default-modal-content",
        type: "p",
        name: "p",
        props: {},
        children: "Modal content goes here",
      } satisfies ComponentLayer,
    ],
  },
  ModalFooter: {
    component: ModalFooter,
    schema: ModalFooterSchema,
    from: '@/components/ui/animated-modal',
    fieldOverrides: commonFieldOverrides(),
    defaultChildren: [
      {
        id: "default-modal-footer",
        type: "Button",
        name: "Button",
        props: { variant: "default" },
        children: "OK",
      } satisfies ComponentLayer,
    ],
  },

  AnimatedIcon: {
    component: AnimatedIcon,
    schema: AnimatedIconSchema,
    from: "@/components/animate-ui/icons/AnimatedIcon",
    fieldOverrides: commonFieldOverrides(),
    defaultChildren: [],
  },

  SvgIcon: {
    component: SvgIcon,
    schema: SvgIconSchema,
    from: "@/components/ui/svgs/SvgIcon",
    fieldOverrides: commonFieldOverrides(),
    defaultChildren: [],
  },

  EmojiRating: {
    component: RatingInteraction,
    schema: RatingInteractionSchema,
    from: '@/components/ui/emoji-rating',
    fieldOverrides: commonFieldOverrides(),
    defaultChildren: [],
  },

  // SuperSurkhet Data Components
  DataList: {
    component: DataList,
    schema: DataListSchema,
    from: '@/components/supersurkhet/data',
    fieldOverrides: {
      className: (layer) => classNameFieldOverrides(layer),
      children: (layer) => childrenFieldOverrides(layer),
      table: (layer) => tablePickerFieldOverrides(layer),
    },
    defaultChildren: [
      {
        id: "data-item-1",
        type: "SingleData",
        name: "SingleData",
        props: {},
        children: [
          {
            id: "data-content-1",
            type: "div",
            name: "div",
            props: { className: "p-4" },
            children: "Data Item Content",
          } satisfies ComponentLayer,
        ],
      },
    ],
  },
  SingleData: {
    component: SingleData,
    schema: DataSchema,
    from: '@/components/supersurkhet/data',
    fieldOverrides: commonFieldOverrides(),
    defaultChildren: [
      {
        id: "single-data-content",
        type: "div",
        name: "div",
        props: { className: "p-4" },
        children: "Single Data Content",
      } satisfies ComponentLayer,
    ],
  },
  DataDetail: {
    component: DataDetail,
    schema: DataDetailSchema,
    from: '@/components/supersurkhet/data',
    fieldOverrides: {
      className: (layer) => classNameFieldOverrides(layer),
      children: (layer) => childrenFieldOverrides(layer),
      table: (layer) => tablePickerFieldOverrides(layer),
    },
    defaultChildren: [
      {
        id: "data-detail-content",
        type: "div",
        name: "div",
        props: { className: "p-4" },
        children: "Data Detail Content",
      } satisfies ComponentLayer,
    ],
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
  Carouzel: {
    component: Carouzel,
    schema: CarouzelSchema,
    from: '@/components/ui/carouzel',
    fieldOverrides: commonFieldOverrides(),
    defaultChildren: [
      {
        id: "carouzel-content",
        type: "CarouzelContent",
        name: "CarouzelContent",
        props: {
          className: "mb-2"
        },
        children: [
          {
            id: "carouzel-item-1",
            type: "CarouzelItem",
            name: "CarouzelItem",
            props: {},
            children: [
              {
                id: "carouzel-item-content-1",
                type: "div",
                name: "div",
                props: { className: "flex items-center justify-center p-6" },
                children: "Slide 1",
              } satisfies ComponentLayer,
            ],
          },
          {
            id: "carousel-item-2",
            type: "CarouzelItem",
            name: "CarouzelItem",
            props: {},
            children: [
              {
                id: "carousel-item-content-2",
                type: "div",
                name: "div",
                props: { className: "flex items-center justify-center p-6" },
                children: "Slide 2",
              } satisfies ComponentLayer,
            ],
          },
        ],
      },
      {
        id: "carouzel-navigation",
        type: "CarouzelNavigation",
        name: "CarouzelNavigation",
        props: {
          alwaysShow: true,
          className: "absolute -bottom-12 right-0 left-auto top-auto w-fit justify-end gap-2",
          classNameButton: "bg-zinc-800 *:stroke-zinc-50 dark:bg-zinc-200 dark:*:stroke-zinc-800"
        },
        children: [],
      },

    ],
  },
  CarouzelContent: {
    component: CarouzelContent,
    schema: CarouzelContentSchema,
    from: '@/components/ui/carouzel',
    fieldOverrides: commonFieldOverrides(),
    defaultChildren: [

    ]
  },
  CarouzelNavigation: {
    component: CarouzelNavigation,
    schema: CarouzelNavigationSchema,
    from: '@/components/ui/carouzel',
    fieldOverrides: {
      ...commonFieldOverrides(),
      classNameButton: classNameFieldOverrides,
    }
  },
  CarouzelItem: {
    component: CarouzelItem,
    schema: CarouzelItemShema,
    from: '@/components/ui/carouzel',
    fieldOverrides: commonFieldOverrides(),
  },

}


