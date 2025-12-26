import type { ComponentLayer, ComponentRegistry } from "@/components/ui/ui-builder/types";
import { classNameFieldOverrides, commonFieldOverrides } from "./form-field-overrides";

import {
  Carouzel,
  CarouzelContent,
  CarouzelSchema,
  CarouzelContentSchema,
  CarouzelNavigationSchema,
  CarouzelNavigation,
  CarouzelItem,
  CarouzelItemShema,
} from '@/components/ui/carouzel';

export const carouzelComponentDefinitions: ComponentRegistry = {
  Carouzel: {
    component: Carouzel,
    schema: CarouzelSchema,
    from: '@/components/ui/carouzel',
    fieldOverrides: commonFieldOverrides(),
    defaultChildren: [
      {
        id: "carouzel-content",
        type: "CarouzelContent",
        name: "CarouzelContent",
        props: {
          className: "mb-2"
        },
        children: [
          {
            id: "carouzel-item-1",
            type: "CarouzelItem",
            name: "CarouzelItem",
            props: {},
            children: [
              {
                id: "carouzel-item-content-1",
                type: "div",
                name: "div",
                props: { className: "flex items-center justify-center p-6" },
                children: "Slide 1",
              } satisfies ComponentLayer,
            ],
          },
          {
            id: "carousel-item-2",
            type: "CarouzelItem",
            name: "CarouzelItem",
            props: {},
            children: [
              {
                id: "carousel-item-content-2",
                type: "div",
                name: "div",
                props: { className: "flex items-center justify-center p-6" },
                children: "Slide 2",
              } satisfies ComponentLayer,
            ],
          },
        ],
      },
      {
        id: "carouzel-navigation",
        type: "CarouzelNavigation",
        name: "CarouzelNavigation",
        props: {
          alwaysShow: true,
          className: "absolute -bottom-12 right-0 left-auto top-auto w-fit justify-end gap-2",
          classNameButton: "bg-zinc-800 *:stroke-zinc-50 dark:bg-zinc-200 dark:*:stroke-zinc-800"
        },
        children: [],
      },

    ],
  },
  CarouzelContent: {
    component: CarouzelContent,
    schema: CarouzelContentSchema,
    from: '@/components/ui/carouzel',
    fieldOverrides: commonFieldOverrides(),
    defaultChildren: [

    ]
  },
  CarouzelNavigation: {
    component: CarouzelNavigation,
    schema: CarouzelNavigationSchema,
    from: '@/components/ui/carouzel',
    fieldOverrides: {
      ...commonFieldOverrides(),
      classNameButton: classNameFieldOverrides,
    }
  },
  CarouzelItem: {
    component: CarouzelItem,
    schema: CarouzelItemShema,
    from: '@/components/ui/carouzel',
    fieldOverrides: commonFieldOverrides(),
  },
}
