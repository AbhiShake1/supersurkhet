import {
  ProductOnboardingCard,
  ProductOnboardingCardSchema,
} from '@/components/onboarding/product-definition';
import type {
  ComponentLayer,
  ComponentRegistry,
} from '@/components/ui/ui-builder/types';
import { commonFieldOverrides } from './form-field-overrides';

export const productOnboardingComponentDefinitions: ComponentRegistry = {
  ProductOnboardingCard: {
    component: ProductOnboardingCard,
    schema: ProductOnboardingCardSchema,
    from: '@/components/onboarding/product-definition',
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
        id: 'onboarding-main-icon',
        type: 'Icon',
        name: 'Icon',
        props: {
          iconName: 'Sparkles',
          size: 'large',
          className: 'text-white',
        },
        children: [],
      },
      {
        id: 'onboarding-title',
        type: 'span',
        name: 'span',
        props: { className: 'text-3xl font-bold' },
        children: 'Welcome to Our Product',
      },
      {
        id: 'onboarding-description',
        type: 'span',
        name: 'span',
        props: { className: 'text-muted-foreground' },
        children: 'Get started with our amazing features',
      },
      {
        id: 'onboarding-card-content',
        type: 'Card',
        name: 'Card',
        props: {},
        children: [
          {
            id: 'onboarding-card-header',
            type: 'CardHeader',
            name: 'CardHeader',
            props: {},
            children: [
              {
                id: 'card-icon',
                type: 'Icon',
                name: 'Icon',
                props: { iconName: 'CheckCircle', size: 'medium' },
                children: [],
              },
              {
                id: 'card-header-label',
                type: 'span',
                name: 'span',
                props: {
                  className:
                    'text-xs font-semibold uppercase tracking-wider text-muted-foreground',
                },
                children: 'FEATURE',
              },
            ],
          },
          {
            id: 'onboarding-card-body',
            type: 'CardContent',
            name: 'CardContent',
            props: {},
            children: [
              {
                id: 'card-title',
                type: 'CardTitle',
                name: 'CardTitle',
                props: {},
                children: 'First Steps',
              },
              {
                id: 'card-description',
                type: 'CardDescription',
                name: 'CardDescription',
                props: {},
                children: 'Complete these initial tasks to get started',
              },
            ],
          },
        ],
      },
      {
        id: 'onboarding-button',
        type: 'Button',
        name: 'Button',
        props: { className: 'w-full max-w-xs', variant: 'default' },
        children: 'Get Started',
      },
    ] satisfies ComponentLayer[],
  },
};
