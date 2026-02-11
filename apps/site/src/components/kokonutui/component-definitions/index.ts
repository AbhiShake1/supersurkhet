import type {
  ComponentRegistry,
} from '@/components/ui/ui-builder/types';
import z from 'zod';
import { commonFieldOverrides } from '@/lib/ui-builder/registry/form-field-overrides';

import ShapeHero from '@/components/kokonutui/shape-hero';
import TweetCard, { TweetCardSchema } from '@/components/kokonutui/tweet-card';
import ScrollText, {
  ScrollTextSchema,
} from '@/components/kokonutui/scroll-text';
import TypewriterTitle, {
  TypewriterTitleSchema,
} from '@/components/kokonutui/type-writer';
import MatrixText, {
  MatrixTextSchema,
} from '@/components/kokonutui/matrix-text';
import DynamicText, {
  DynamicTextSchema,
} from '@/components/kokonutui/dynamic-text';
import ShimmerText, {
  ShimmerTextSchema,
} from '@/components/kokonutui/shimmer-text';
import SlicedText, {
  SlicedTextSchema,
} from '@/components/kokonutui/sliced-text';
import SwooshText, {
  SwooshTextSchema,
} from '@/components/kokonutui/swoosh-text';
import SocialButton from '@/components/kokonutui/social-button';
import { ButtonSchema } from '@/components/ui/button';

export const kokonutuiComponentDefinitions: ComponentRegistry = {
  ShapeHero: {
    component: ShapeHero,
    schema: z.object({
      title1: z.string().optional(),
      title2: z.string().optional(),
      description: z.string().optional(),
    }),
    from: '@/components/kokonutui/shape-hero',
    fieldOverrides: commonFieldOverrides(),
  },
  TweetCard: {
    component: TweetCard,
    schema: TweetCardSchema,
    from: '@/components/kokonutui/tweet-card',
    fieldOverrides: commonFieldOverrides(),
  },
  ScrollText: {
    component: ScrollText,
    schema: ScrollTextSchema,
    from: '@/components/kokonutui/scroll-text',
    fieldOverrides: commonFieldOverrides(),
  },
  TypingText: {
    component: TypewriterTitle,
    schema: TypewriterTitleSchema,
    from: '@/components/kokonutui/type-writer',
    fieldOverrides: commonFieldOverrides(),
  },
  MatrixText: {
    component: MatrixText,
    schema: MatrixTextSchema,
    from: '@/components/kokonutui/matrix-text',
    fieldOverrides: commonFieldOverrides(),
  },
  DynamicText: {
    component: DynamicText,
    schema: DynamicTextSchema,
    from: '@/components/kokonutui/dynamic-text',
    fieldOverrides: commonFieldOverrides(),
  },
  ShimmerText: {
    component: ShimmerText,
    schema: ShimmerTextSchema,
    from: '@/components/kokonutui/shimmer-text',
    fieldOverrides: commonFieldOverrides(),
  },
  SlicedText: {
    component: SlicedText,
    schema: SlicedTextSchema,
    from: '@/components/kokonutui/sliced-text',
    fieldOverrides: commonFieldOverrides(),
  },
  SwooshText: {
    component: SwooshText,
    schema: SwooshTextSchema,
    from: '@/components/kokonutui/swoosh-text',
    fieldOverrides: commonFieldOverrides(),
  },
  SocialButton: {
    component: SocialButton,
    schema: ButtonSchema,
    from: '@/components/kokonutui/social-button',
    fieldOverrides: commonFieldOverrides(),
  },
};
