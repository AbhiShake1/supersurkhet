import { z } from 'zod';
import {
  AnimatedIcon,
  AnimatedIconSchema,
} from '@/components/animate-ui/icons/AnimatedIcon';
import { AutoAdminResolved } from '@/components/auto-admin/auto-admin-resolved';
import Features, { FeaturesSchema } from '@/components/features-1';
import { imgCarouselComponentDefinitions } from '@/components/imgcarousel/component-definitions';
import { kokonutuiComponentDefinitions } from '@/components/kokonutui/component-definitions';
import { magicuiComponentDefinitions } from '@/components/magicui/component-definitions';
import {
  SignedInOnly,
  SignedInOnlySchema,
} from '@/components/security/signed-in-only';
import {
  SignedOutOnly,
  SignedOutOnlySchema,
} from '@/components/security/signed-out-only';
import CardBottomImage, {
  CardBottomImageSchema,
} from '@/components/shadcn-studio/card/card-04';
import { supersurkhetComponentDefinitions } from '@/components/supersurkhet/component-definitions';
import {
  AnimatedGradientText,
  AnimatedGradientTextSchema,
} from '@/components/ui/animated-gradient-text';
import { animatedListComponentDefinitions } from '@/components/ui/animated-list/component-definitions';
import { Badge } from '@/components/ui/badge';
import { Button, ButtonSchema } from '@/components/ui/button';
import {
  RatingInteraction,
  RatingInteractionSchema,
} from '@/components/ui/emoji-rating';
import EstimatedDateBadge, {
  EstimatedDateBadgeSchema,
} from '@/components/ui/estimated-arrival';
import { Input, InputSchema } from '@/components/ui/input';
import { Link, LinkSchema } from '@/components/ui/navigation/link';
import {
  ShimmerButton,
  ShimmerButtonSchema,
} from '@/components/ui/shimmer-button';
import { Slider, sliderSchema } from '@/components/ui/slider-1';
import { svgsComponentDefinitions } from '@/components/ui/svgs/component-definition';
import { CodePanel } from '@/components/ui/ui-builder/components/code-panel';
import { Flexbox } from '@/components/ui/ui-builder/components/flexbox';
import { Grid } from '@/components/ui/ui-builder/components/grid';
import { Icon, iconNames } from '@/components/ui/ui-builder/components/icon';
import { Markdown } from '@/components/ui/ui-builder/components/markdown';
import type {
  ComponentLayer,
  ComponentRegistry,
} from '@/components/ui/ui-builder/types';
import { UserAvatarDropdown } from '@/components/user/user-avatar-dropdown';
import {
  childrenAsTextareaFieldOverrides,
  childrenAsTipTapFieldOverrides,
  childrenFieldOverrides,
  classNameFieldOverrides,
  commonFieldOverrides,
  iconNameFieldOverrides,
} from '@/lib/ui-builder/registry/form-field-overrides';
import { threeDCardComponentDefinitions } from './3d-card-component-definitions';
import { accordionComponentDefinitions } from './accordion-component-definitions';
import { bentoComponentDefinitions } from './bento-component-definitions';
import { cardComponentDefinitions } from './card-component-definitions';
import { carouzelComponentDefinitions } from './carouzel-component-definitions';
import { credenzaComponentDefinitions } from './credenza-component-definitions';
import { dialogComponentDefinitions } from './dialog-component-definitions';
import { framerMotionComponentDefinitions } from './framer-motion-component-definitions';
import { modalComponentDefinitions } from './modal-component-definitions';
import { offerComponentDefinitions } from './offer-component-definitions';
import { productOnboardingComponentDefinitions } from './product-onboarding-card-definitions';
import { ratingComponentDefinitions } from './rating-component-definitions';

export const complexComponentDefinitions: ComponentRegistry = {
  ...framerMotionComponentDefinitions,
  Button: {
    component: Button,
    schema: ButtonSchema,
    from: '@/components/ui/button',
    defaultChildren: [
      {
        id: 'button-text',
        type: 'span',
        name: 'span',
        props: {},
        children: 'Button',
      } satisfies ComponentLayer,
    ],
    fieldOverrides: commonFieldOverrides(),
  },
  Badge: {
    component: Badge,
    schema: z.object({
      className: z.string().optional(),
      children: z.any().optional(),
      variant: z
        .enum(['default', 'secondary', 'destructive', 'outline'])
        .default('default'),
    }),
    from: '@/components/ui/badge',
    defaultChildren: [
      {
        id: 'badge-text',
        type: 'span',
        name: 'span',
        props: {},
        children: 'Badge',
      } satisfies ComponentLayer,
    ],
    fieldOverrides: commonFieldOverrides(),
  },
  Flexbox: {
    component: Flexbox,
    schema: z.object({
      className: z.string().optional(),
      children: z.any().optional(),
      direction: z
        .enum(['row', 'column', 'rowReverse', 'columnReverse'])
        .default('row'),
      justify: z
        .enum(['start', 'end', 'center', 'between', 'around', 'evenly'])
        .default('start'),
      align: z
        .enum(['start', 'end', 'center', 'baseline', 'stretch'])
        .default('start'),
      wrap: z.enum(['wrap', 'nowrap', 'wrapReverse']).default('nowrap'),
      gap: z
        .preprocess(
          (val) => (typeof val === 'number' ? String(val) : val),
          z.enum(['0', '1', '2', '4', '8']).default('1'),
        )
        .transform(Number),
    }),
    from: '@/components/ui/ui-builder/flexbox',
    fieldOverrides: commonFieldOverrides(),
  },
  Grid: {
    component: Grid,
    schema: z.object({
      className: z.string().optional(),
      children: z.any().optional(),
      columns: z
        .enum(['auto', '1', '2', '3', '4', '5', '6', '7', '8'])
        .default('1'),
      autoRows: z.enum(['none', 'min', 'max', 'fr']).default('none'),
      justify: z
        .enum(['start', 'end', 'center', 'between', 'around', 'evenly'])
        .default('start'),
      align: z
        .enum(['start', 'end', 'center', 'baseline', 'stretch'])
        .default('start'),
      templateRows: z
        .enum(['none', '1', '2', '3', '4', '5', '6'])
        .default('none')
        .transform((val) => (val === 'none' ? val : Number(val))),
      gap: z
        .preprocess(
          (val) => (typeof val === 'number' ? String(val) : val),
          z.enum(['0', '1', '2', '4', '8']).default('0'),
        )
        .transform(Number),
    }),
    from: '@/components/ui/ui-builder/grid',
    fieldOverrides: commonFieldOverrides(),
  },
  CodePanel: {
    component: CodePanel,
    schema: z.object({
      className: z.string().optional(),
    }),
    from: '@/components/ui/ui-builder/code-panel',
    fieldOverrides: {
      className: (layer) => classNameFieldOverrides(layer),
    },
  },
  Markdown: {
    component: Markdown,
    schema: z.object({
      children: z.any().optional(),
    }),
    from: '@/components/ui/ui-builder/markdown',
    defaultChildren: 'Hello World from Markdown!',
    fieldOverrides: {
      className: (layer) => classNameFieldOverrides(layer),
      children: (layer) => childrenAsTipTapFieldOverrides(layer),
    },
  },
  Icon: {
    component: Icon,
    schema: z.object({
      className: z.string().optional(),
      iconName: z.enum([...iconNames]).default('Image'),
      size: z.enum(['small', 'medium', 'large']).default('medium'),
      color: z
        .enum([
          'accent',
          'accentForeground',
          'primary',
          'primaryForeground',
          'secondary',
          'secondaryForeground',
          'destructive',
          'destructiveForeground',
          'muted',
          'mutedForeground',
          'background',
          'foreground',
        ])
        .default('foreground'),
      rotate: z.enum(['none', '90', '180', '270']).default('none'),
    }),
    from: '@/components/ui/ui-builder/icon',
    fieldOverrides: {
      className: (layer) => classNameFieldOverrides(layer),
      iconName: (layer) => iconNameFieldOverrides(layer),
    },
  },
  Input: {
    component: Input,
    schema: InputSchema,
    from: '@/components/ui/input',
    fieldOverrides: {
      ...commonFieldOverrides(),
      leadingIcon: (l) =>
        childrenFieldOverrides(l, {
          optionsFilter: (k) => k.toLowerCase().includes('icon'),
        }),
      trailingIcon: (l) =>
        childrenFieldOverrides(l, {
          optionsFilter: (k) => k.toLowerCase().includes('icon'),
        }),
    },
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
    fieldOverrides: commonFieldOverrides(),
  },

  ...magicuiComponentDefinitions,

  ...kokonutuiComponentDefinitions,

  // security
  SignedInOnly: {
    component: SignedInOnly,
    schema: SignedInOnlySchema,
    from: '@/components/security/signed-in-only',
    fieldOverrides: commonFieldOverrides(),
  },
  SignedOutOnly: {
    component: SignedOutOnly,
    schema: SignedOutOnlySchema,
    from: '@/components/security/signed-out-only',
    fieldOverrides: commonFieldOverrides(),
  },

  // navigation
  Link: {
    component: Link,
    schema: LinkSchema,
    from: '@/components/ui/navigation/link',
    fieldOverrides: commonFieldOverrides(),
  },
  AutoAdmin: {
    component: AutoAdminResolved,
    schema: z.object({}),
    from: '@/components/auto-admin/auto-admin-resolved',
  },
  ...supersurkhetComponentDefinitions,

  ...productOnboardingComponentDefinitions,

  ...threeDCardComponentDefinitions,

  ...ratingComponentDefinitions,

  Slider: {
    component: Slider,
    schema: sliderSchema,
    from: '@/components/ui/slider-1',
    defaultChildren: [
      {
        id: 'slider-track',
        type: 'SliderPrimitive.Track',
        name: 'SliderTrack',
        props: {},
        children: [
          {
            id: 'slider-range',
            type: 'SliderPrimitive.Range',
            name: 'SliderRange',
            props: {},
            children: [],
          },
        ],
      },
      {
        id: 'slider-thumb',
        type: 'SliderPrimitive.Thumb',
        name: 'SliderThumb',
        props: {},
        children: [],
      },
    ],
    fieldOverrides: commonFieldOverrides(),
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
        id: 'features-content',
        type: 'Features',
        name: 'Features',
        props: {
          title: 'Our Powerful Features',
          subtitle: 'Everything you need in a modern solution',
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
        id: 'card-bottom-image-demo',
        type: 'CardBottomImageDemo',
        name: 'CardBottomImageDemo',
        props: {
          title: 'Premium Experience',
          description:
            'Discover our premium features designed to elevate your workflow',
          imageUrl:
            'https://images.unsplash.com/photo-1506744038136-46273834b3fb?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1170&q=80',
          imageAlt: 'Mountain landscape',
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
    defaultChildren: 'Animated Gradient Text Effect',
  },

  ShimmerButton: {
    component: ShimmerButton,
    schema: ShimmerButtonSchema,
    from: '@/components/ui/shimmer-button',
    fieldOverrides: commonFieldOverrides(),
    defaultChildren: [
      {
        id: 'shimmer-button-text',
        type: 'span',
        name: 'span',
        props: {},
        children: 'Shimmer Button',
      } satisfies ComponentLayer,
    ],
  },

  ...imgCarouselComponentDefinitions,

  ...animatedListComponentDefinitions,

  ...bentoComponentDefinitions,

  ...modalComponentDefinitions,

  AnimatedIcon: {
    component: AnimatedIcon,
    schema: AnimatedIconSchema,
    from: '@/components/animate-ui/icons/AnimatedIcon',
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

  ...offerComponentDefinitions,

  // Carousel components
  ...carouzelComponentDefinitions,
};
