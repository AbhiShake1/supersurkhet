import {
  AnimatedList,
  AnimatedListItem,
  AnimatedListItemSchema,
  AnimatedListSchema,
} from '@/components/ui/animated-list/animated-list';
import type {
  ComponentLayer,
  ComponentRegistry,
} from '@/components/ui/ui-builder/types';
import { commonFieldOverrides } from '@/lib/ui-builder/registry/form-field-overrides';

export const animatedListComponentDefinitions: ComponentRegistry = {
  AnimatedList: {
    component: AnimatedList,
    schema: AnimatedListSchema,
    from: '@/components/ui/animated-list/animated-list',
    fieldOverrides: commonFieldOverrides(),
    defaultChildren: [
      {
        id: 'animated-list-item-1',
        type: 'AnimatedListItem',
        name: 'AnimatedListItem',
        props: {},
        children: [
          {
            id: 'list-item-content-1',
            type: 'div',
            name: 'div',
            props: { className: 'p-4 bg-blue-100 rounded mb-2' },
            children: 'First item',
          } satisfies ComponentLayer,
        ],
      },
      {
        id: 'animated-list-item-2',
        type: 'AnimatedListItem',
        name: 'AnimatedListItem',
        props: {},
        children: [
          {
            id: 'list-item-content-2',
            type: 'div',
            name: 'div',
            props: { className: 'p-4 bg-green-100 rounded mb-2' },
            children: 'Second item',
          } satisfies ComponentLayer,
        ],
      },
      {
        id: 'animated-list-item-3',
        type: 'AnimatedListItem',
        name: 'AnimatedListItem',
        props: {},
        children: [
          {
            id: 'list-item-content-3',
            type: 'div',
            name: 'div',
            props: { className: 'p-4 bg-purple-100 rounded mb-2' },
            children: 'Third item',
          } satisfies ComponentLayer,
        ],
      } satisfies ComponentLayer,
    ],
  },
  AnimatedListItem: {
    component: AnimatedListItem,
    schema: AnimatedListItemSchema,
    from: '@/components/ui/animated-list/animated-list',
    fieldOverrides: commonFieldOverrides(),
    defaultChildren: [
      {
        id: 'default-animated-list-item',
        type: 'div',
        name: 'div',
        props: { className: 'p-3 bg-gray-100 rounded' },
        children: 'List item',
      } satisfies ComponentLayer,
    ],
  },
};
