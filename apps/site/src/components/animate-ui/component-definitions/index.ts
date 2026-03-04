import type { ComponentType } from 'react';
import { z } from 'zod';
import type { ComponentRegistry } from '@/components/ui/ui-builder/types';
import * as animateUiIcons from '@/components/animate-ui/icons';
import {
  AnimatedIcon,
  AnimatedIconSchema,
  animatedIconNames,
} from '@/components/animate-ui/icons/AnimatedIcon';
import { AnimateIcon } from '@/components/animate-ui/icons/icon';
import {
  classNameFieldOverrides,
  iconNameFieldOverrides,
} from '@/lib/ui-builder/registry/form-field-overrides';

const animateUiIconSchema = z.object({
  className: z.string().optional(),
  size: z.coerce.number().default(24),
  strokeWidth: z.coerce.number().default(2),
  animation: z.string().default('default'),
  animate: z.boolean().optional().default(false),
  animateOnHover: z.boolean().optional().default(true),
  animateOnTap: z.boolean().optional().default(false),
  animateOnView: z.boolean().optional().default(false),
  loop: z.boolean().optional().default(false),
  loopDelay: z.coerce.number().optional().default(0),
  delay: z.coerce.number().optional().default(0),
  initialOnAnimateEnd: z.boolean().optional().default(false),
  completeOnStop: z.boolean().optional().default(false),
  persistOnAnimateEnd: z.boolean().optional().default(false),
});

const animateIconWrapperSchema = animateUiIconSchema.extend({
  asChild: z.boolean().optional().default(false),
  children: z.any().optional(),
});

const animateUiIconFieldOverrides = {
  className: classNameFieldOverrides,
};

const animateUiIconComponentDefinitions = Object.fromEntries(
  Object.entries(animateUiIcons).map(([iconName, iconComponent]) => [
    `Animate${iconName}`,
    {
      component: iconComponent as ComponentType<Record<string, unknown>>,
      schema: animateUiIconSchema,
      from: '@/components/animate-ui/icons',
      fieldOverrides: animateUiIconFieldOverrides,
      defaultChildren: [],
    },
  ]),
) as ComponentRegistry;

export const animateUiComponentDefinitions: ComponentRegistry = {
  AnimatedIcon: {
    component: AnimatedIcon,
    schema: AnimatedIconSchema,
    from: '@/components/animate-ui/icons/AnimatedIcon',
    fieldOverrides: {
      className: classNameFieldOverrides,
      name: (layer) =>
        iconNameFieldOverrides(layer, {
          propName: 'name',
          iconOptions: animatedIconNames,
        }),
    },
    defaultChildren: [],
  },
  AnimateIcon: {
    component: AnimateIcon,
    schema: animateIconWrapperSchema,
    from: '@/components/animate-ui/icons/icon',
    fieldOverrides: {
      className: classNameFieldOverrides,
    },
    defaultChildren: [],
  },
  ...animateUiIconComponentDefinitions,
};
