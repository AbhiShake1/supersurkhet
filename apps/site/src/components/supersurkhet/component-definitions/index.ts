import type { ComponentLayer, ComponentRegistry } from "@/components/ui/ui-builder/types";
import { childrenFieldOverrides, classNameFieldOverrides, commonFieldOverrides, tablePickerFieldOverrides } from "@/lib/ui-builder/registry/form-field-overrides";

import {
  ProductList,
  ProductListSchema,
  SingleProduct,
  ProductSchema,
  ProductImage,
  ProductImageSchema,
  ProductTitle,
  ProductTitleSchema,
  ProductDescription,
  ProductDescriptionSchema,
  ProductPrice,
  ProductPriceSchema,
  ProductActions,
  ProductActionsSchema,
  ProductBadge,
  ProductBadgeSchema,
  ProductDetail,
  ProductDetailSchema,
} from '@/components/supersurkhet/products';

import {
  DataList,
  DataListSchema,
  SingleData,
  DataSchema,
  DataDetail,
  DataDetailSchema,
} from '@/components/supersurkhet/data';

export const supersurkhetComponentDefinitions: ComponentRegistry = {
  DataList: {
    component: DataList,
    schema: DataListSchema,
    from: '@/components/supersurkhet/data',
    fieldOverrides: {
      className: (layer) => classNameFieldOverrides(layer),
      children: (layer) => childrenFieldOverrides(layer),
      table: (layer) => tablePickerFieldOverrides(layer),
    },
    defaultChildren: [
      {
        id: "data-item-1",
        type: "SingleData",
        name: "SingleData",
        props: {},
        children: [
          {
            id: "data-content-1",
            type: "div",
            name: "div",
            props: { className: "p-4" },
            children: "Data Item Content",
          } satisfies ComponentLayer,
        ],
      },
    ],
  },
  SingleData: {
    component: SingleData,
    schema: DataSchema,
    from: '@/components/supersurkhet/data',
    fieldOverrides: commonFieldOverrides(),
    defaultChildren: [
      {
        id: "single-data-content",
        type: "div",
        name: "div",
        props: { className: "p-4" },
        children: "Single Data Content",
      } satisfies ComponentLayer,
    ],
  },
  DataDetail: {
    component: DataDetail,
    schema: DataDetailSchema,
    from: '@/components/supersurkhet/data',
    fieldOverrides: {
      className: (layer) => classNameFieldOverrides(layer),
      children: (layer) => childrenFieldOverrides(layer),
      table: (layer) => tablePickerFieldOverrides(layer),
    },
    defaultChildren: [
      {
        id: "data-detail-content",
        type: "div",
        name: "div",
        props: { className: "p-4" },
        children: "Data Detail Content",
      } satisfies ComponentLayer,
    ],
  },

  ProductList: {
    component: ProductList,
    schema: ProductListSchema,
    from: '@/components/supersurkhet/products',
    fieldOverrides: commonFieldOverrides(),
    defaultChildren: [
      {
        id: "product-1",
        type: "SingleProduct",
        name: "SingleProduct",
        props: {},
        children: [
          {
            id: "product-image",
            type: "ProductImage",
            name: "ProductImage",
            props: {},
            children: [
              {
                id: "product-image-image",
                type: "img",
                name: "img",
                props: {},
                children: "Product Image",
              } satisfies ComponentLayer,
            ],
          },
          {
            id: "product-title",
            type: "ProductTitle",
            name: "ProductTitle",
            props: {},
            children: [
              {
                id: "product-title-text",
                type: "span",
                name: "span",
                props: {},
                children: "Product Title",
              } satisfies ComponentLayer,
            ],
          },
          {
            id: "product-description",
            type: "ProductDescription",
            name: "ProductDescription",
            props: {},
            children: [
              {
                id: "product-description-text",
                type: "span",
                name: "span",
                props: {},
                children: "Product Description",
              } satisfies ComponentLayer,
            ],
          },
          {
            id: "product-price",
            type: "ProductPrice",
            name: "ProductPrice",
            props: {},
            children: [
              {
                id: "product-price-text",
                type: "span",
                name: "span",
                props: {},
                children: "$100",
              } satisfies ComponentLayer,
            ],
          },
        ],
      },
    ]
  },
  ProductDetail: {
    component: ProductDetail,
    schema: ProductDetailSchema,
    from: '@/components/supersurkhet/products',
    fieldOverrides: commonFieldOverrides(),
    defaultChildren: [
      {
        id: "product-detail-image",
        type: "ProductImage",
        name: "ProductImage",
        props: {},
        children: [
          {
            id: "product-detail-image-image",
            type: "img",
            name: "img",
            props: {},
            children: "Product Image",
          } satisfies ComponentLayer,
        ],
      },
      {
        id: "product-detail-title",
        type: "ProductTitle",
        name: "ProductTitle",
        props: {},
        children: [
          {
            id: "product-detail-title-text",
            type: "span",
            name: "span",
            props: {},
            children: "Product Title",
          } satisfies ComponentLayer,
        ],
      },
      {
        id: "product-detail-description",
        type: "ProductDescription",
        name: "ProductDescription",
        props: {},
        children: [
          {
            id: "product-detail-description-text",
            type: "span",
            name: "span",
            props: {},
            children: "Product Description",
          } satisfies ComponentLayer,
        ],
      },
      {
        id: "product-detail-price",
        type: "ProductPrice",
        name: "ProductPrice",
        props: {},
        children: [
          {
            id: "product-detail-price-text",
            type: "span",
            name: "span",
            props: {},
            children: "$100",
          } satisfies ComponentLayer,
        ],
      },
    ],
  },
  SingleProduct: {
    component: SingleProduct,
    schema: ProductSchema,
    from: '@/components/supersurkhet/products',
    fieldOverrides: commonFieldOverrides()
  },
  ProductTitle: {
    component: ProductTitle,
    schema: ProductTitleSchema,
    from: '@/components/supersurkhet/products',
    fieldOverrides: commonFieldOverrides(),
  },
  ProductDescription: {
    component: ProductDescription,
    schema: ProductDescriptionSchema,
    from: '@/components/supersurkhet/products',
    fieldOverrides: commonFieldOverrides(),
  },
  ProductPrice: {
    component: ProductPrice,
    schema: ProductPriceSchema,
    from: '@/components/supersurkhet/products',
    fieldOverrides: commonFieldOverrides(),
  },
  ProductActions: {
    component: ProductActions,
    schema: ProductActionsSchema,
    from: '@/components/supersurkhet/products',
    fieldOverrides: commonFieldOverrides(),
  },
  ProductBadge: {
    component: ProductBadge,
    schema: ProductBadgeSchema,
    from: '@/components/supersurkhet/products',
    fieldOverrides: commonFieldOverrides(),
  },
  ProductImage: {
    component: ProductImage,
    schema: ProductImageSchema,
    from: '@/components/supersurkhet/products',
    fieldOverrides: commonFieldOverrides(),
  },
}
