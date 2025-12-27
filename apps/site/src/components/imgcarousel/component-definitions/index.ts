import type { ComponentLayer, ComponentRegistry } from "@/components/ui/ui-builder/types";
import { z } from "zod";
import { commonFieldOverrides } from "@/lib/ui-builder/registry/form-field-overrides";
import {
  CarouselCard,
  EnhancedCarousel,
  mockCarouselItems
} from '@/components/imgcarousel/imgcarousel';
import { CarouselItem as CarouselItemSchema } from '@/components/imgcarousel/imgcarousel';

export const imgCarouselComponentDefinitions: ComponentRegistry = {
  Carousel: {
    component: EnhancedCarousel,
    schema: z.object({
      showProgress: z.boolean().default(true),
      autoPlay: z.boolean().default(false),
      variant: z.enum(["default", "compact", "expanded"]).default("default"),
      title: z.string().default("Featured Items"),
      subtitle: z.string().default("Discover amazing content"),
      showNavigation: z.boolean().default(true),
      showFilters: z.boolean().default(false),
    }),
    from: '@/components/imgcarousel/imgcarousel',
    // defaultProps: {
    //   showProgress: true,
    //   autoPlay: false,
    //   variant: "default",
    //   title: "Featured Items",
    //   subtitle: "Discover amazing content",
    //   showNavigation: true,
    //   showFilters: false,
    // },
    fieldOverrides: commonFieldOverrides(),
    defaultChildren: mockCarouselItems.map((item) => ({
      id: item.id,
      type: "CarouselCard",
      name: "CarouselCard",
      props: {
        item,
        variant: "default",
      },
      children: [],
    })) as ComponentLayer[],
  },
  CarouselCard: {
    component: CarouselCard,
    schema: z.object({
      item: CarouselItemSchema,
      variant: z.enum(["default", "compact", "expanded"]).default("default"),
    }),
    from: '@/components/imgcarousel/imgcarousel',
    fieldOverrides: commonFieldOverrides(),
    defaultChildren: [],
  },
}

