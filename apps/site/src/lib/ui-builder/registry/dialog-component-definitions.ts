import type {
  ComponentLayer,
  ComponentRegistry,
} from '@/components/ui/ui-builder/types';
import z from 'zod';
import { commonFieldOverrides } from './form-field-overrides';

import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
} from '@/components/ui/dialog';

export const dialogComponentDefinitions: ComponentRegistry = {
  Dialog: {
    component: Dialog,
    schema: z.object({
      className: z.string().optional(),
      children: z.any().optional(),
    }),
    from: '@/components/ui/dialog',
    fieldOverrides: commonFieldOverrides(),
    defaultChildren: [
      {
        id: 'dialog-header',
        type: 'DialogHeader',
        name: 'DialogHeader',
        props: {},
        children: [
          {
            id: 'dialog-header-text',
            type: 'span',
            name: 'span',
            props: {},
            children: 'Dialog Header',
          } satisfies ComponentLayer,
        ],
      },
      {
        id: 'dialog-body',
        type: 'DialogContent',
        name: 'DialogContent',
        props: {},
        children: [
          {
            id: 'dialog-body-text',
            type: 'span',
            name: 'span',
            props: {},
            children: 'Dialog Body',
          } satisfies ComponentLayer,
        ],
      },
      {
        id: 'dialog-footer',
        type: 'DialogFooter',
        name: 'DialogFooter',
        props: {},
        children: [
          {
            id: 'dialog-footer-text',
            type: 'span',
            name: 'span',
            props: {},
            children: 'Dialog Footer',
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
    from: '@/components/ui/dialog',
    fieldOverrides: commonFieldOverrides(),
  },
  DialogContent: {
    component: DialogContent,
    schema: z.object({
      className: z.string().optional(),
      children: z.any().optional(),
    }),
    from: '@/components/ui/dialog',
    fieldOverrides: commonFieldOverrides(),
  },
  DialogFooter: {
    component: DialogFooter,
    schema: z.object({
      className: z.string().optional(),
      children: z.any().optional(),
    }),
    from: '@/components/ui/dialog',
    fieldOverrides: commonFieldOverrides(),
  },
};
