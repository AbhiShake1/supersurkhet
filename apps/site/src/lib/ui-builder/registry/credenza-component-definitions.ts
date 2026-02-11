import type {
  ComponentLayer,
  ComponentRegistry,
} from '@/components/ui/ui-builder/types';
import z from 'zod';
import { commonFieldOverrides } from './form-field-overrides';
import {
  Credenza,
  CredenzaBody,
  CredenzaFooter,
  CredenzaHeader,
  CredenzaTrigger,
} from '@/components/ui/credenza';

export const credenzaComponentDefinitions: ComponentRegistry = {
  Credenza: {
    component: Credenza,
    schema: z.object({
      className: z.string().optional(),
      children: z.any().optional(),
    }),
    from: '@/components/ui/credenza',
    fieldOverrides: commonFieldOverrides(),
    defaultChildren: [
      {
        id: 'credenza-trigger',
        type: 'CredenzaTrigger',
        name: 'CredenzaTrigger',
        props: {},
        children: [
          {
            id: 'credenza-trigger-text',
            type: 'span',
            name: 'span',
            props: {},
            children: 'Credenza Trigger',
          } satisfies ComponentLayer,
        ],
      },
      {
        id: 'credenza-content',
        type: 'CredenzaContent',
        name: 'CredenzaContent',
        props: {},
        children: [
          {
            id: 'credenza-content-text',
            type: 'span',
            name: 'span',
            props: {},
            children: 'Credenza Content',
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
    from: '@/components/ui/credenza',
    fieldOverrides: commonFieldOverrides(),
  },
  CredenzaHeader: {
    component: CredenzaHeader,
    schema: z.object({
      className: z.string().optional(),
      children: z.any().optional(),
    }),
    from: '@/components/ui/credenza',
    fieldOverrides: commonFieldOverrides(),
  },
  CredenzaBody: {
    component: CredenzaBody,
    schema: z.object({
      className: z.string().optional(),
      children: z.any().optional(),
    }),
    from: '@/components/ui/credenza',
    fieldOverrides: commonFieldOverrides(),
  },
  CredenzaFooter: {
    component: CredenzaFooter,
    schema: z.object({
      className: z.string().optional(),
      children: z.any().optional(),
    }),
    from: '@/components/ui/credenza',
    fieldOverrides: commonFieldOverrides(),
  },
};
