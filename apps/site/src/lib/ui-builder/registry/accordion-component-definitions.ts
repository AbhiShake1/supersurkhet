import type {
  ComponentLayer,
  ComponentRegistry,
} from '@/components/ui/ui-builder/types';
import z from 'zod';
import { commonFieldOverrides } from './form-field-overrides';

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';

export const accordionComponentDefinitions: ComponentRegistry = {
  Accordion: {
    component: Accordion,
    schema: z.object({
      className: z.string().optional(),
      children: z.any().optional(),
      type: z.enum(['single', 'multiple']).default('single'),
      collapsible: z.boolean().optional(),
    }),
    from: '@/components/ui/accordion',
    defaultChildren: [
      {
        id: 'acc-item-1',
        type: 'AccordionItem',
        name: 'AccordionItem',
        props: {
          value: 'item-1',
        },
        children: [
          {
            id: 'acc-trigger-1',
            type: 'AccordionTrigger',
            name: 'AccordionTrigger',
            props: {},
            children: [
              {
                id: 'WEz8Yku',
                type: 'span',
                name: 'span',
                props: {},
                children: 'Accordion Item #1',
              } satisfies ComponentLayer,
            ],
          },
          {
            id: 'acc-content-1',
            type: 'AccordionContent',
            name: 'AccordionContent',
            props: {},
            children: [
              {
                id: 'acc-content-1-text-1',
                type: 'span',
                name: 'span',
                props: {},
                children: 'Accordion Content Text',
              } satisfies ComponentLayer,
            ],
          },
        ],
      },
      {
        id: 'acc-item-2',
        type: 'AccordionItem',
        name: 'AccordionItem',
        props: {
          value: 'item-2',
        },
        children: [
          {
            id: 'acc-trigger-2',
            type: 'AccordionTrigger',
            name: 'AccordionTrigger',
            props: {},
            children: [
              {
                id: 'acc-trigger-2-text-1',
                type: 'span',
                name: 'span',
                props: {},
                children: 'Accordion Item #2',
              } satisfies ComponentLayer,
            ],
          },
          {
            id: 'acc-content-2',
            type: 'AccordionContent',
            name: 'AccordionContent (Copy)',
            props: {},
            children: [
              {
                id: 'acc-content-2-text-1',
                type: 'span',
                name: 'span',
                props: {},
                children: 'Accordion Content Text',
              } satisfies ComponentLayer,
            ],
          },
        ],
      },
    ],
    fieldOverrides: commonFieldOverrides(),
  },
  AccordionItem: {
    component: AccordionItem,
    schema: z.object({
      className: z.string().optional(),
      children: z.any().optional(),
      value: z.string(),
    }),
    from: '@/components/ui/accordion',
    defaultChildren: [
      {
        id: 'acc-trigger-1',
        type: 'AccordionTrigger',
        name: 'AccordionTrigger',
        props: {},
        children: [
          {
            id: 'WEz8Yku',
            type: 'span',
            name: 'span',
            props: {},
            children: 'Accordion Item #1',
          } satisfies ComponentLayer,
        ],
      },
      {
        id: 'acc-content-1',
        type: 'AccordionContent',
        name: 'AccordionContent',
        props: {},
        children: [
          {
            id: 'acc-content-1-text-1',
            type: 'span',
            name: 'span',
            props: {},
            children: 'Accordion Content Text',
          } satisfies ComponentLayer,
        ],
      },
    ],
    fieldOverrides: commonFieldOverrides(),
  },
  AccordionTrigger: {
    component: AccordionTrigger,
    schema: z.object({
      className: z.string().optional(),
      children: z.any().optional(),
    }),
    from: '@/components/ui/accordion',
    fieldOverrides: commonFieldOverrides(),
  },
  AccordionContent: {
    component: AccordionContent,
    schema: z.object({
      className: z.string().optional(),
      children: z.any().optional(),
    }),
    from: '@/components/ui/accordion',
    fieldOverrides: commonFieldOverrides(),
  },
};
