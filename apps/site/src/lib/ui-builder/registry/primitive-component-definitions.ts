import type { ComponentRegistry } from '@/components/ui/ui-builder/types';
import { z } from 'zod';
import { childrenAsTextareaFieldOverrides, classNameFieldOverrides, commonFieldOverrides } from "@/lib/ui-builder/registry/form-field-overrides";
import { divComponentDefinitions } from './div-component-definitions';

export const primitiveComponentDefinitions: ComponentRegistry = {
  'a': {
    schema: z.object({
      className: z.string().optional(),
      children: z.any().optional(),
      href: z.string().optional(),
      target: z.enum(['_blank', '_self', '_parent', '_top']).optional().default('_self'),
      rel: z.enum(['noopener', 'noreferrer', 'nofollow']).optional(),
      title: z.string().optional(),
      download: z.boolean().optional().default(false),
    }),
    fieldOverrides: commonFieldOverrides()
  },
  'img': {
    schema: z.object({
      className: z.string().optional(),
      src: z.string().default("https://placehold.co/200"),
      alt: z.string().optional(),
      width: z.coerce.number().optional(),
      height: z.coerce.number().optional(),
    }),
    fieldOverrides: {
      className: (layer) => classNameFieldOverrides(layer)
    }
  },
  ...divComponentDefinitions,
  'iframe': {
    schema: z.object({
      className: z.string().optional(),
      src: z.string().default("https://www.youtube.com/embed/dQw4w9WgXcQ?si=oc74qTYUBuCsOJwL"),
      title: z.string().optional(),
      width: z.coerce.number().optional(),
      height: z.coerce.number().optional(),
      frameBorder: z.number().optional(),
      allowFullScreen: z.boolean().optional(),
      allow: z.string().optional(),
      referrerPolicy: z.enum(['no-referrer', 'no-referrer-when-downgrade', 'origin', 'origin-when-cross-origin', 'same-origin', 'strict-origin', 'strict-origin-when-cross-origin', 'unsafe-url']).optional(),
    }),
    fieldOverrides: {
      className: (layer) => classNameFieldOverrides(layer)
    }
  },
  'span': {
    schema: z.object({
      className: z.string().optional(),
      children: z.string().optional(),
    }),
    fieldOverrides: {
      className: (layer) => classNameFieldOverrides(layer),
      children: (layer) => childrenAsTextareaFieldOverrides(layer)
    },
    defaultChildren: "Text"
  },
  'h1': {
    schema: z.object({
      className: z.string().optional(),
      children: z.string().optional(),
    }),
    fieldOverrides: {
      ...commonFieldOverrides(),
      children: (layer) => childrenAsTextareaFieldOverrides(layer)
    },
    defaultChildren: "Heading 1"
  },
  'h2': {
    schema: z.object({
      className: z.string().optional(),
      children: z.string().optional(),
    }),
    fieldOverrides: {
      ...commonFieldOverrides(),
      children: (layer) => childrenAsTextareaFieldOverrides(layer)
    },
    defaultChildren: "Heading 2"
  },
  'h3': {
    schema: z.object({
      className: z.string().optional(),
      children: z.string().optional(),
    }),
    fieldOverrides: {
      ...commonFieldOverrides(),
      children: (layer) => childrenAsTextareaFieldOverrides(layer)
    },
    defaultChildren: "Heading 3"
  },
  'p': {
    schema: z.object({
      className: z.string().optional(),
      children: z.string().optional(),
    }),
    fieldOverrides: {
      ...commonFieldOverrides(),
      children: (layer) => childrenAsTextareaFieldOverrides(layer)
    },
    defaultChildren: "Paragraph text"
  },
  'li': {
    schema: z.object({
      className: z.string().optional(),
      children: z.string().optional(),
    }),
    fieldOverrides: {
      ...commonFieldOverrides(),
      children: (layer) => childrenAsTextareaFieldOverrides(layer)
    },
    defaultChildren: "List item"
  },
  'ul': {
    schema: z.object({
      className: z.string().optional(),
      children: z.string().optional(),
    }),
    fieldOverrides: commonFieldOverrides()
  },
  'ol': {
    schema: z.object({
      className: z.string().optional(),
      children: z.string().optional(),
    }),
    fieldOverrides: commonFieldOverrides()
  },
  // SVG primitive components
  'svg': {
    schema: z.object({
      xmlns: z.string().optional().default('http://www.w3.org/2000/svg'),
      version: z.string().optional(),
      width: z.coerce.number().optional(),
      height: z.coerce.number().optional(),
      viewBox: z.string().optional().default('0 0 24 24'),
      fill: z.string().optional().default('none'),
      stroke: z.string().optional(),
      strokeWidth: z.coerce.number().optional(),
      className: z.string().optional(),
      children: z.any().optional(),
    }),
    fieldOverrides: {
      ...commonFieldOverrides(),
      children: (layer) => childrenAsTextareaFieldOverrides(layer)
    },
    defaultChildren: ""
  },
  'g': {
    schema: z.object({
      className: z.string().optional(),
      children: z.any().optional(),
      id: z.string().optional(),
      transform: z.string().optional(),
      fill: z.string().optional(),
      stroke: z.string().optional(),
      strokeWidth: z.coerce.number().optional(),
    }),
    fieldOverrides: {
      ...commonFieldOverrides(),
      children: (layer) => childrenAsTextareaFieldOverrides(layer)
    },
    defaultChildren: ""
  },
  'path': {
    schema: z.object({
      d: z.string().optional(),
      fill: z.string().optional(),
      stroke: z.string().optional(),
      strokeWidth: z.coerce.number().optional(),
      className: z.string().optional(),
      id: z.string().optional(),
    }),
    fieldOverrides: {
      className: (layer) => classNameFieldOverrides(layer)
    }
  },
  'circle': {
    schema: z.object({
      cx: z.string().optional(),
      cy: z.string().optional(),
      r: z.string().optional(),
      fill: z.string().optional(),
      stroke: z.string().optional(),
      strokeWidth: z.coerce.number().optional(),
      className: z.string().optional(),
      id: z.string().optional(),
    }),
    fieldOverrides: {
      className: (layer) => classNameFieldOverrides(layer)
    }
  },
  'rect': {
    schema: z.object({
      x: z.string().optional(),
      y: z.string().optional(),
      width: z.string().optional(),
      height: z.string().optional(),
      rx: z.string().optional(),
      ry: z.string().optional(),
      fill: z.string().optional(),
      stroke: z.string().optional(),
      strokeWidth: z.coerce.number().optional(),
      className: z.string().optional(),
      id: z.string().optional(),
    }),
    fieldOverrides: {
      className: (layer) => classNameFieldOverrides(layer)
    }
  },
  'line': {
    schema: z.object({
      x1: z.string().optional(),
      y1: z.string().optional(),
      x2: z.string().optional(),
      y2: z.string().optional(),
      stroke: z.string().optional(),
      strokeWidth: z.coerce.number().optional(),
      className: z.string().optional(),
      id: z.string().optional(),
    }),
    fieldOverrides: {
      className: (layer) => classNameFieldOverrides(layer)
    }
  },
  'polyline': {
    schema: z.object({
      points: z.string().optional(),
      fill: z.string().optional(),
      stroke: z.string().optional(),
      strokeWidth: z.coerce.number().optional(),
      className: z.string().optional(),
      id: z.string().optional(),
    }),
    fieldOverrides: {
      className: (layer) => classNameFieldOverrides(layer)
    }
  },
  'polygon': {
    schema: z.object({
      points: z.string().optional(),
      fill: z.string().optional(),
      stroke: z.string().optional(),
      strokeWidth: z.coerce.number().optional(),
      className: z.string().optional(),
      id: z.string().optional(),
    }),
    fieldOverrides: {
      className: (layer) => classNameFieldOverrides(layer)
    }
  },
  'ellipse': {
    schema: z.object({
      cx: z.string().optional(),
      cy: z.string().optional(),
      rx: z.string().optional(),
      ry: z.string().optional(),
      fill: z.string().optional(),
      stroke: z.string().optional(),
      strokeWidth: z.coerce.number().optional(),
      className: z.string().optional(),
      id: z.string().optional(),
    }),
    fieldOverrides: {
      className: (layer) => classNameFieldOverrides(layer)
    }
  },
  'text': {
    schema: z.object({
      x: z.string().optional(),
      y: z.string().optional(),
      fill: z.string().optional(),
      fontSize: z.string().optional(),
      fontWeight: z.string().optional(),
      fontFamily: z.string().optional(),
      textAnchor: z.enum(['start', 'middle', 'end']).optional(),
      className: z.string().optional(),
      children: z.string().optional(),
      id: z.string().optional(),
    }),
    fieldOverrides: {
      ...commonFieldOverrides(),
      children: (layer) => childrenAsTextareaFieldOverrides(layer)
    },
    defaultChildren: "Text"
  },
  'textPath': {
    schema: z.object({
      href: z.string().optional(),
      startOffset: z.string().optional(),
      method: z.enum(['align', 'stretch']).optional(),
      spacing: z.enum(['auto', 'exact']).optional(),
      className: z.string().optional(),
      children: z.string().optional(),
      id: z.string().optional(),
    }),
    fieldOverrides: {
      ...commonFieldOverrides(),
      children: (layer) => childrenAsTextareaFieldOverrides(layer)
    },
    defaultChildren: "Text Path"
  },
  'tspan': {
    schema: z.object({
      dx: z.string().optional(),
      dy: z.string().optional(),
      x: z.string().optional(),
      y: z.string().optional(),
      className: z.string().optional(),
      children: z.string().optional(),
      id: z.string().optional(),
    }),
    fieldOverrides: {
      ...commonFieldOverrides(),
      children: (layer) => childrenAsTextareaFieldOverrides(layer)
    },
    defaultChildren: "Tspan"
  },
  'defs': {
    schema: z.object({
      className: z.string().optional(),
      children: z.any().optional(),
    }),
    fieldOverrides: {
      ...commonFieldOverrides(),
      children: (layer) => childrenAsTextareaFieldOverrides(layer)
    },
    defaultChildren: ""
  },
  'clipPath': {
    schema: z.object({
      id: z.string().optional(),
      className: z.string().optional(),
      children: z.any().optional(),
    }),
    fieldOverrides: {
      ...commonFieldOverrides(),
      children: (layer) => childrenAsTextareaFieldOverrides(layer)
    },
    defaultChildren: ""
  },
  'mask': {
    schema: z.object({
      id: z.string().optional(),
      className: z.string().optional(),
      children: z.any().optional(),
    }),
    fieldOverrides: {
      ...commonFieldOverrides(),
      children: (layer) => childrenAsTextareaFieldOverrides(layer)
    },
    defaultChildren: ""
  },
  'linearGradient': {
    schema: z.object({
      id: z.string().optional(),
      x1: z.string().optional().default('0%'),
      y1: z.string().optional().default('0%'),
      x2: z.string().optional().default('100%'),
      y2: z.string().optional().default('0%'),
      className: z.string().optional(),
      children: z.any().optional(),
    }),
    fieldOverrides: {
      ...commonFieldOverrides(),
      children: (layer) => childrenAsTextareaFieldOverrides(layer)
    },
    defaultChildren: ""
  },
  'radialGradient': {
    schema: z.object({
      id: z.string().optional(),
      cx: z.string().optional().default('50%'),
      cy: z.string().optional().default('50%'),
      r: z.string().optional().default('50%'),
      className: z.string().optional(),
      children: z.any().optional(),
    }),
    fieldOverrides: {
      ...commonFieldOverrides(),
      children: (layer) => childrenAsTextareaFieldOverrides(layer)
    },
    defaultChildren: ""
  },
  'stop': {
    schema: z.object({
      offset: z.string().optional().default('0%'),
      stopColor: z.string().optional(),
      stopOpacity: z.coerce.number().optional(),
      className: z.string().optional(),
    }),
    fieldOverrides: {
      className: (layer) => classNameFieldOverrides(layer)
    }
  },
  'pattern': {
    schema: z.object({
      id: z.string().optional(),
      x: z.string().optional(),
      y: z.string().optional(),
      width: z.string().optional(),
      height: z.string().optional(),
      patternUnits: z.enum(['userSpaceOnUse', 'objectBoundingBox']).optional(),
      className: z.string().optional(),
      children: z.any().optional(),
    }),
    fieldOverrides: {
      ...commonFieldOverrides(),
      children: (layer) => childrenAsTextareaFieldOverrides(layer)
    },
    defaultChildren: ""
  },
  'image': {
    schema: z.object({
      href: z.string().optional(),
      x: z.string().optional(),
      y: z.string().optional(),
      width: z.string().optional(),
      height: z.string().optional(),
      preserveAspectRatio: z.string().optional(),
      className: z.string().optional(),
    }),
    fieldOverrides: {
      className: (layer) => classNameFieldOverrides(layer)
    }
  },
  'use': {
    schema: z.object({
      href: z.string().optional(),
      x: z.string().optional(),
      y: z.string().optional(),
      width: z.string().optional(),
      height: z.string().optional(),
      className: z.string().optional(),
    }),
    fieldOverrides: {
      className: (layer) => classNameFieldOverrides(layer)
    }
  },
  'symbol': {
    schema: z.object({
      id: z.string().optional(),
      viewBox: z.string().optional(),
      className: z.string().optional(),
      children: z.any().optional(),
    }),
    fieldOverrides: {
      ...commonFieldOverrides(),
      children: (layer) => childrenAsTextareaFieldOverrides(layer)
    },
    defaultChildren: ""
  },
  'gSymbol': {
    schema: z.object({
      id: z.string().optional(),
      viewBox: z.string().optional(),
      className: z.string().optional(),
      children: z.any().optional(),
    }),
    fieldOverrides: {
      ...commonFieldOverrides(),
      children: (layer) => childrenAsTextareaFieldOverrides(layer)
    },
    defaultChildren: ""
  },
  'marker': {
    schema: z.object({
      id: z.string().optional(),
      viewBox: z.string().optional(),
      refX: z.coerce.number().optional(),
      refY: z.coerce.number().optional(),
      markerWidth: z.coerce.number().optional(),
      markerHeight: z.coerce.number().optional(),
      orient: z.string().optional(),
      className: z.string().optional(),
      children: z.any().optional(),
    }),
    fieldOverrides: {
      ...commonFieldOverrides(),
      children: (layer) => childrenAsTextareaFieldOverrides(layer)
    },
    defaultChildren: ""
  },
  'foreignObject': {
    schema: z.object({
      x: z.string().optional(),
      y: z.string().optional(),
      width: z.string().optional(),
      height: z.string().optional(),
      className: z.string().optional(),
      children: z.any().optional(),
    }),
    fieldOverrides: {
      ...commonFieldOverrides(),
      children: (layer) => childrenAsTextareaFieldOverrides(layer)
    },
    defaultChildren: ""
  }
};
