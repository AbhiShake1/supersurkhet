import type {
  ComponentLayer,
  ComponentRegistry,
} from '@/components/ui/ui-builder/types';
import {
  commonFieldOverrides,
  iconNameFieldOverrides,
} from './form-field-overrides';
import {
  BentoCard,
  BentoGrid,
  BentoCardSchema,
  BentoGridSchema,
} from '@/components/ui/bento-grid';

export const bentoComponentDefinitions: ComponentRegistry = {
  BentoGrid: {
    component: BentoGrid,
    schema: BentoGridSchema,
    from: '@/components/ui/bento-grid',
    fieldOverrides: commonFieldOverrides(),
    defaultChildren: [
      {
        id: 'bento-card-1',
        type: 'BentoCard',
        name: 'BentoCard',
        props: {
          name: 'Dashboard Analytics',
          className: 'md:col-span-2',
          description: 'Comprehensive analytics for your business metrics',
          href: '/dashboard',
          cta: 'View Dashboard',
          Icon: 'BarChart3',
        },
        children: [
          {
            id: 'analytics-content',
            type: 'div',
            name: 'div',
            props: { className: 'text-2xl font-bold' },
            children: '35% Growth',
          },
        ],
      } satisfies ComponentLayer,
      {
        id: 'bento-card-2',
        type: 'BentoCard',
        name: 'BentoCard',
        props: {
          name: 'Performance Metrics',
          className: 'md:col-span-1',
          description: 'Track and optimize your performance',
          href: '/metrics',
          cta: 'View Metrics',
          Icon: 'Activity',
        },
        children: [
          {
            id: 'metrics-content',
            type: 'div',
            name: 'div',
            props: { className: 'text-xl font-semibold' },
            children: 'Real-time',
          },
        ],
      } satisfies ComponentLayer,
    ],
  },
  BentoCard: {
    component: BentoCard,
    schema: BentoCardSchema,
    from: '@/components/ui/bento-grid',
    fieldOverrides: {
      ...commonFieldOverrides(),
      Icon: (layer) => iconNameFieldOverrides(layer, { propName: 'Icon' }), // For icon field
    },
    defaultChildren: [
      {
        id: 'bento-card-content',
        type: 'div',
        name: 'div',
        props: { className: 'text-xl font-bold' },
        children: 'Card Content',
      } satisfies ComponentLayer,
    ],
  },
};
