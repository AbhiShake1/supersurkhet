import type { ComponentLayer, ComponentRegistry } from "@/components/ui/ui-builder/types";
import { commonFieldOverrides } from "./form-field-overrides";
import { CardContainer, CardBody, CardItem, CardContainerSchema, CardBodySchema, CardItemSchema } from '@/components/ui/3d-card';

export const threeDCardComponentDefinitions: ComponentRegistry = {
  CardBody3D: {
    component: CardBody,
    schema: CardBodySchema,
    from: '@/components/ui/3d-card',
    fieldOverrides: commonFieldOverrides(),
    defaultChildren: [
      {
        id: "example-card-body-standalone",
        type: "CardBody3D",
        name: "CardBody3D",
        props: {
          className: "bg-gray-50 relative group/card dark:hover:shadow-2xl dark:hover:shadow-emerald-500/[0.1] dark:bg-black dark:border-white/[0.2] border-black/[0.1] w-auto sm:w-[25rem] h-auto rounded-xl p-6 border"
        },
        children: [
          {
            id: "standalone-card-title",
            type: "CardItem3D",
            name: "CardItem3D",
            props: {
              translateZ: "50",
              className: "text-xl font-bold text-neutral-600 dark:text-white"
            },
            children: "3D Card Component"
          },
          {
            id: "standalone-card-description",
            type: "CardItem3D",
            name: "CardItem3D",
            props: {
              as: "p",
              translateZ: "60",
              className: "text-neutral-500 text-sm max-w-sm mt-2 dark:text-neutral-300"
            },
            children: "This is a standalone 3D card body with interactive effects"
          },
          {
            id: "standalone-card-image",
            type: "CardItem3D",
            name: "CardItem3D",
            props: {
              translateZ: "100",
              className: "w-full mt-4"
            },
            children: [
              {
                id: "standalone-image",
                type: "img",
                name: "img",
                props: {
                  src: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=600&q=80",
                  width: "1000",
                  height: "1000",
                  className: "h-40 w-full object-cover rounded-xl group-hover/card:shadow-xl",
                  alt: "Portrait"
                },
                children: []
              }
            ]
          },
          {
            id: "standalone-card-button",
            type: "CardItem3D",
            name: "CardItem3D",
            props: {
              translateZ: "20",
              as: "button",
              className: "px-4 py-2 rounded-xl bg-black dark:bg-white dark:text-black text-white text-xs font-bold mt-4"
            },
            children: "View Details"
          }
        ],
      } satisfies ComponentLayer,
    ],
  },
  CardItem3D: {
    component: CardItem,
    schema: CardItemSchema,
    from: '@/components/ui/3d-card',
    fieldOverrides: commonFieldOverrides(),
    defaultChildren: [
      {
        id: "default-card-item-interactive",
        type: "CardItem3D",
        name: "CardItem3D",
        props: {
          translateZ: "60",
          className: "text-lg font-medium text-gray-700 dark:text-gray-200"
        },
        children: [
          {
            id: "card-item-content",
            type: "span",
            name: "span",
            props: {},
            children: "Hover-interactive element",
          } satisfies ComponentLayer,
        ],
      },
    ],
  },
  CardContainer3D: {
    component: CardContainer,
    schema: CardContainerSchema,
    from: '@/components/ui/3d-card',
    fieldOverrides: commonFieldOverrides(),
    defaultChildren: [
      {
        id: "example-card-body",
        type: "CardBody3D",
        name: "CardBody3D",
        props: {
          className: "bg-gray-50 relative group/card dark:hover:shadow-2xl dark:hover:shadow-emerald-500/[0.1] dark:bg-black dark:border-white/[0.2] border-black/[0.1] w-auto sm:w-[30rem] h-auto rounded-xl p-6 border"
        },
        children: [
          {
            id: "card-title-item",
            type: "CardItem3D",
            name: "CardItem3D",
            props: {
              translateZ: "50",
              className: "text-xl font-bold text-neutral-600 dark:text-white"
            },
            children: "Interactive 3D Card"
          },
          {
            id: "card-description-item",
            type: "CardItem3D",
            name: "CardItem3D",
            props: {
              as: "p",
              translateZ: "60",
              className: "text-neutral-500 text-sm max-w-sm mt-2 dark:text-neutral-300"
            },
            children: "Hover over this card to see the 3D effect in action"
          },
          {
            id: "card-image-item",
            type: "CardItem3D",
            name: "CardItem3D",
            props: {
              translateZ: "100",
              className: "w-full mt-4"
            },
            children: [
              {
                id: "card-image",
                type: "img",
                name: "img",
                props: {
                  src: "https://images.unsplash.com/photo-1506744038136-46273834b3fb?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1170&q=80",
                  width: "1000",
                  height: "1000",
                  className: "h-60 w-full object-cover rounded-xl group-hover/card:shadow-xl",
                  alt: "Nature scene"
                },
                children: []
              }
            ]
          },
          {
            id: "card-actions-container",
            type: "div",
            name: "div",
            props: {
              className: "flex justify-between items-center mt-6"
            },
            children: [
              {
                id: "card-link-item",
                type: "CardItem3D",
                name: "CardItem3D",
                props: {
                  translateZ: "20",
                  as: "a",
                  href: "#",
                  className: "px-4 py-2 rounded-xl text-xs font-normal dark:text-white"
                },
                children: "Learn more →"
              },
              {
                id: "card-button-item",
                type: "CardItem3D",
                name: "CardItem3D",
                props: {
                  translateZ: "20",
                  as: "button",
                  className: "px-4 py-2 rounded-xl bg-black dark:bg-white dark:text-black text-white text-xs font-bold"
                },
                children: "Get Started"
              }
            ]
          }
        ],
      } satisfies ComponentLayer,
    ],
  },
}
