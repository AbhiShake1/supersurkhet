import type { ComponentLayer, ComponentRegistry } from "@/components/ui/ui-builder/types";
import { commonFieldOverrides } from "./form-field-overrides";
import { OfferCard, OfferCardSchema, OfferCarousel, OfferCarouselSchema } from '@/components/ui/offer-carousel';

export const offerComponentDefinitions: ComponentRegistry = {
  OfferCarousel: {
    component: OfferCarousel,
    schema: OfferCarouselSchema,
    from: '@/components/ui/offer-carousel',
    fieldOverrides: commonFieldOverrides(),
    defaultChildren: []
  },

  OfferCard: {
    component: OfferCard,
    schema: OfferCardSchema,
    from: '@/components/ui/offer-carousel',
    fieldOverrides: commonFieldOverrides(),
    defaultChildren: [],
  },
}
