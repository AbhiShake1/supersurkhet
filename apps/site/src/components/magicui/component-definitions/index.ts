import type {
  ComponentLayer,
  ComponentRegistry,
} from '@/components/ui/ui-builder/types';
import { commonFieldOverrides } from '@/lib/ui-builder/registry/form-field-overrides';

import { Confetti } from '@/components/magicui/confetti';
import { PixelImage, PixelImageSchema } from '@/components/magicui/pixel-image';
import { RainbowButton } from '@/components/magicui/rainbow-button';
import z from 'zod';
import { ButtonSchema } from '@/components/ui/button';

export const magicuiComponentDefinitions: ComponentRegistry = {
  PixelImage: {
    component: PixelImage,
    schema: PixelImageSchema,
    from: '@/components/magicui/pixel-image',
    fieldOverrides: commonFieldOverrides(),
  },
  Confetti: {
    component: Confetti,
    schema: z.object({
      className: z.string().optional(),
      options: z
        .object({
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
          origin: z
            .object({
              x: z.number().optional(),
              y: z.number().optional(),
            })
            .optional(),
        })
        .optional(),
      globalOptions: z
        .object({
          disableForReducedMotion: z.boolean().optional(),
          resize: z.boolean().optional(),
          useWorker: z.boolean().optional(),
        })
        .optional(),
      manualstart: z.boolean().optional(),
      children: z.any().optional(),
    }),
    from: '@/components/magicui/confetti',
    fieldOverrides: commonFieldOverrides(),
  },
  RainbowButton: {
    component: RainbowButton,
    schema: ButtonSchema,
    from: '@/components/magicui/rainbow-button',
    fieldOverrides: commonFieldOverrides(),
  },
};
