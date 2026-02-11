import type {
  ComponentLayer,
  ComponentRegistry,
} from '@/components/ui/ui-builder/types';
import z from 'zod';
import { commonFieldOverrides } from './form-field-overrides';

import {
  Card,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
  CardHeader,
} from '@/components/ui/card';

export const cardComponentDefinitions: ComponentRegistry = {
  Card: {
    component: Card,
    schema: z.object({
      className: z.string().optional(),
      children: z.any().optional(),
    }),
    from: '@/components/ui/card',
    defaultChildren: [
      {
        id: 'card-header',
        type: 'CardHeader',
        name: 'CardHeader',
        props: {},
        children: [
          {
            id: 'card-title',
            type: 'CardTitle',
            name: 'CardTitle',
            props: {},
            children: [
              {
                id: 'card-title-text',
                type: 'span',
                name: 'span',
                props: {},
                children: 'Card Title',
              } satisfies ComponentLayer,
            ],
          },
          {
            id: 'card-description',
            type: 'CardDescription',
            name: 'CardDescription',
            props: {},
            children: [
              {
                id: 'card-description-text',
                type: 'span',
                name: 'span',
                props: {},
                children: 'Card Description',
              } satisfies ComponentLayer,
            ],
          },
        ],
      },
      {
        id: 'card-content',
        type: 'CardContent',
        name: 'CardContent',
        props: {},
        children: [
          {
            id: 'card-content-paragraph',
            type: 'span',
            name: 'span',
            props: {},
            children: 'Card Content',
          } satisfies ComponentLayer,
        ],
      },
      {
        id: 'card-footer',
        type: 'CardFooter',
        name: 'CardFooter',
        props: {},
        children: [
          {
            id: 'card-footer-paragraph',
            type: 'span',
            name: 'span',
            props: {},
            children: 'Card Footer',
          } satisfies ComponentLayer,
        ],
      },
    ],
    fieldOverrides: commonFieldOverrides(),
  },
  CardHeader: {
    component: CardHeader,
    schema: z.object({
      className: z.string().optional(),
      children: z.any().optional(),
    }),
    from: '@/components/ui/card',
    fieldOverrides: commonFieldOverrides(),
  },
  CardFooter: {
    component: CardFooter,
    schema: z.object({
      className: z.string().optional(),
      children: z.any().optional(),
    }),
    from: '@/components/ui/card',
    fieldOverrides: commonFieldOverrides(),
  },
  CardTitle: {
    component: CardTitle,
    schema: z.object({
      className: z.string().optional(),
      children: z.any().optional(),
    }),
    from: '@/components/ui/card',
    fieldOverrides: commonFieldOverrides(),
  },
  CardDescription: {
    component: CardDescription,
    schema: z.object({
      className: z.string().optional(),
      children: z.any().optional(),
    }),
    from: '@/components/ui/card',
    fieldOverrides: commonFieldOverrides(),
  },
  CardContent: {
    component: CardContent,
    schema: z.object({
      className: z.string().optional(),
      children: z.any().optional(),
    }),
    from: '@/components/ui/card',
    fieldOverrides: commonFieldOverrides(),
  },
};
