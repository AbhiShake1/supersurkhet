import type { ComponentRegistry } from '@/components/ui/ui-builder/types';
import { commonFieldOverrides } from '@/lib/ui-builder/registry/form-field-overrides';
import { SvgIcon, SvgIconSchema } from '../SvgIcon';

export const svgsComponentDefinitions: ComponentRegistry = {
  SvgIcon: {
    component: SvgIcon,
    schema: SvgIconSchema,
    from: '@/components/ui/svgs/SvgIcon',
    fieldOverrides: commonFieldOverrides(),
    defaultChildren: [],
  },
};
