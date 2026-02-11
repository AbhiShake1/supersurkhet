import type {
  ComponentRegistry,
} from '@/components/ui/ui-builder/types';
import z from 'zod';
import { commonFieldOverrides } from './form-field-overrides';

export const DivSchema = z.object({
  className: z.string().optional(),
  children: z.any().optional(),
});

export const divComponentDefinitions: ComponentRegistry = {
  div: {
    schema: DivSchema,
    fieldOverrides: commonFieldOverrides(),
  },
};
