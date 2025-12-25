import type { ComponentLayer, ComponentRegistry } from "@/components/ui/ui-builder/types";
import { commonFieldOverrides } from "./form-field-overrides";

import { Modal, ModalTrigger, ModalBody, ModalContent, ModalFooter, ModalSchema, ModalTriggerSchema, ModalBodySchema, ModalContentSchema, ModalFooterSchema } from '@/components/ui/animated-modal';

export const modalComponentDefinitions: ComponentRegistry = {
  Modal: {
    component: Modal,
    schema: ModalSchema,
    from: '@/components/ui/animated-modal',
    fieldOverrides: commonFieldOverrides(),
    defaultChildren: [
      {
        id: "modal-trigger",
        type: "ModalTrigger",
        name: "ModalTrigger",
        props: { className: "px-4 py-2 rounded-md bg-blue-500 text-white" },
        children: [
          {
            id: "trigger-text",
            type: "span",
            name: "span",
            props: {},
            children: "Open Modal",
          } satisfies ComponentLayer,
        ],
      },
      {
        id: "modal-body",
        type: "ModalBody",
        name: "ModalBody",
        props: {},
        children: [
          {
            id: "modal-content",
            type: "ModalContent",
            name: "ModalContent",
            props: { className: "p-6" },
            children: [
              {
                id: "modal-title",
                type: "h2",
                name: "h2",
                props: { className: "text-xl font-bold mb-2" },
                children: "Modal Title",
              },
              {
                id: "modal-description",
                type: "p",
                name: "p",
                props: { className: "text-gray-600 mb-4" },
                children: "This is an animated modal with 3D effects",
              }
            ],
          },
          {
            id: "modal-footer",
            type: "ModalFooter",
            name: "ModalFooter",
            props: { className: "p-4 bg-gray-100" },
            children: [
              {
                id: "footer-button",
                type: "Button",
                name: "Button",
                props: { variant: "default", className: "mr-2" },
                children: "Confirm",
              },
              {
                id: "cancel-button",
                type: "Button",
                name: "Button",
                props: { variant: "outline" },
                children: "Cancel",
              }
            ],
          }
        ],
      } satisfies ComponentLayer,
    ],
  },
  ModalTrigger: {
    component: ModalTrigger,
    schema: ModalTriggerSchema,
    from: '@/components/ui/animated-modal',
    fieldOverrides: commonFieldOverrides(),
    defaultChildren: [
      {
        id: "default-modal-trigger",
        type: "span",
        name: "span",
        props: {},
        children: "Open Modal",
      } satisfies ComponentLayer,
    ],
  },
  ModalBody: {
    component: ModalBody,
    schema: ModalBodySchema,
    from: '@/components/ui/animated-modal',
    fieldOverrides: commonFieldOverrides(),
    defaultChildren: [
      {
        id: "modal-content-wrapper",
        type: "ModalContent",
        name: "ModalContent",
        props: {},
        children: [
          {
            id: "modal-body-title",
            type: "h3",
            name: "h3",
            props: { className: "text-lg font-semibold" },
            children: "Modal Content"
          },
          {
            id: "modal-body-content",
            type: "p",
            name: "p",
            props: {},
            children: "This is the modal body content"
          }
        ],
      } satisfies ComponentLayer,
    ],
  },
  ModalContent: {
    component: ModalContent,
    schema: ModalContentSchema,
    from: '@/components/ui/animated-modal',
    fieldOverrides: commonFieldOverrides(),
    defaultChildren: [
      {
        id: "default-modal-content",
        type: "p",
        name: "p",
        props: {},
        children: "Modal content goes here",
      } satisfies ComponentLayer,
    ],
  },
  ModalFooter: {
    component: ModalFooter,
    schema: ModalFooterSchema,
    from: '@/components/ui/animated-modal',
    fieldOverrides: commonFieldOverrides(),
    defaultChildren: [
      {
        id: "default-modal-footer",
        type: "Button",
        name: "Button",
        props: { variant: "default" },
        children: "OK",
      } satisfies ComponentLayer,
    ],
  },
}
