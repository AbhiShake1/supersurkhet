import type {
  ComponentRegistry,
} from '@/components/ui/ui-builder/types';
import { commonFieldOverrides } from './form-field-overrides';
import Rating, { RatingSchema } from '@/components/ui/rating-group.tsx';

export const ratingComponentDefinitions: ComponentRegistry = {
  Rating: {
    component: Rating,
    schema: RatingSchema,
    from: '@/components/ui/rating',
    defaultChildren: [
      {
        id: 'rating-header',
        type: 'span',
        name: 'span',
        props: {
          className: 'text-lg font-semibold text-gray-900 dark:text-white',
        },
        children: 'Product Rating',
      },
      {
        id: 'rating-description',
        type: 'span',
        name: 'span',
        props: {
          className: 'text-sm text-gray-600 dark:text-gray-400',
        },
        children: 'How would you rate this product?',
      },
      {
        id: 'rating-stars',
        type: 'RatingGroup',
        name: 'RatingGroup',
        props: {
          maxStars: 5,
          value: 0,
          allowHalf: true,
          filledColor: 'text-yellow-400',
          emptyColor: 'text-gray-300 dark:text-gray-600',
          hoverScale: 1.1,
          starSize: 24,
        },
        children: [],
      },
      {
        id: 'rating-feedback',
        type: 'span',
        name: 'span',
        props: {
          className: 'text-sm font-medium text-gray-900 dark:text-white mt-2',
        },
        children: 'You rated this 0 stars',
      },
    ],
    fieldOverrides: commonFieldOverrides(),
  },
};
