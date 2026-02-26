'use client';

import { RatingGroup } from '@ark-ui/react/rating-group';
import { AnimatePresence, motion } from 'framer-motion';
import { Heart, Sparkles, Star, ThumbsUp, Zap } from 'lucide-react';
import { useId, useState } from 'react';
import { z } from 'zod';

// Safe number helper
// biome-ignore lint/suspicious/noExplicitAny: lint debt cleanup
const safeNumber = (v: any, defaultValue: number) =>
  Number.isNaN(Number(v)) ? defaultValue : Number(v);

//Schema
export const RatingSchema = z.object({
  className: z.string().optional(),
  maxStars: z.preprocess(
    (v) => safeNumber(v, 5),
    z.number().int().min(1).max(10).default(5),
  ),
  value: z.preprocess((v) => safeNumber(v, 0), z.number().min(0).optional()),
  allowHalf: z.boolean().default(true),
  readOnly: z.boolean().default(false),
  disabled: z.boolean().default(false),

  // Visual customization
  variant: z
    .enum(['stars', 'hearts', 'thumbs', 'zap', 'custom'])
    .default('stars'),
  size: z.enum(['xs', 'sm', 'md', 'lg', 'xl']).default('md'),
  filledColor: z.string().default('text-yellow-400'),
  emptyColor: z.string().default('text-gray-300 dark:text-gray-600'),
  highlightColor: z.string().optional(),
  animation: z
    .enum(['none', 'bounce', 'pulse', 'scale', 'float'])
    .default('scale'),
  glowEffect: z.boolean().default(true),

  // Layout
  layout: z.enum(['vertical', 'horizontal', 'compact']).default('vertical'),
  align: z.enum(['start', 'center', 'end']).default('center'),
  gap: z.preprocess(
    (v) => safeNumber(v, 4),
    z.number().min(0).max(12).default(4),
  ),
  spacing: z.enum(['tight', 'normal', 'loose']).default('normal'),

  // Labels & Text
  labels: z.array(z.string()).optional(),
  showLabels: z.boolean().default(true),
  showValue: z.boolean().default(true),
  showMax: z.boolean().default(false),
  headerText: z.string().default('Product Rating'),
  descriptionText: z.string().default('How would you rate this product?'),
  successText: z.string().default('Thanks for your rating!'),
  errorText: z.string().default('Please select a rating'),

  // Review section
  showReview: z.boolean().default(true),
  reviewPlaceholder: z.string().default('Share your thoughts...'),
  reviewRequired: z.boolean().default(false),
  minReviewLength: z.preprocess((v) => safeNumber(v, 0), z.number().default(0)),
  maxReviewLength: z.preprocess(
    (v) => safeNumber(v, 500),
    z.number().default(500),
  ),

  // Validation & State
  required: z.boolean().default(false),
  showValidation: z.boolean().default(true),

  // Custom icons
  customFilledIcon: z.string().optional(),
  customEmptyIcon: z.string().optional(),
});

export type RatingProps = z.infer<typeof RatingSchema>;

interface Props extends Partial<RatingProps> {}

const sizeMap = {
  xs: { icon: 16, text: 'text-xs' },
  sm: { icon: 20, text: 'text-sm' },
  md: { icon: 24, text: 'text-base' },
  lg: { icon: 32, text: 'text-lg' },
  xl: { icon: 40, text: 'text-xl' },
};

const spacingMap = {
  tight: 'gap-1',
  normal: 'gap-2',
  loose: 'gap-3',
};

const animationVariants = {
  bounce: { scale: [1, 1.2, 1], transition: { duration: 0.3 } },
  pulse: { scale: [1, 1.1, 1], transition: { duration: 0.5 } },
  scale: { scale: 1.15, transition: { duration: 0.2 } },
  float: { y: [0, -2, 0], transition: { duration: 0.3 } },
  none: {},
};

const getIconComponent = (variant: string, filled: boolean) => {
  const baseProps = {
    className: 'transition-all duration-200',
    fill: filled ? 'currentColor' : 'none',
  };

  switch (variant) {
    case 'hearts':
      return <Heart {...baseProps} />;
    case 'thumbs':
      return <ThumbsUp {...baseProps} />;
    case 'zap':
      return <Zap {...baseProps} />;
    case 'custom':
      return <Sparkles {...baseProps} />;
    default:
      return filled ? <Star {...baseProps} /> : <Star {...baseProps} />;
  }
};

export default function EnhancedRating(props: Props) {
  const config = RatingSchema.parse(props);
  const id = useId();

  const [rating, setRating] = useState(config.value || 0);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [review, setReview] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const size = sizeMap[config.size];
  const spacingClass = spacingMap[config.spacing];

  const handleRatingChange = (value: number) => {
    setRating(value);
    setError('');
  };

  const handleSubmit = () => {
    if (config.required && rating === 0) {
      setError(config.errorText);
      return;
    }

    if (
      config.showReview &&
      config.reviewRequired &&
      review.length < config.minReviewLength
    ) {
      setError(`Please write at least ${config.minReviewLength} characters`);
      return;
    }

    setSubmitted(true);
    // In a real app, you would submit to an API here
    console.log({ rating, review });
  };

  const getVariantColor = () => {
    if (config.highlightColor) return config.highlightColor;

    switch (config.variant) {
      case 'hearts':
        return 'text-pink-500 dark:text-pink-400';
      case 'thumbs':
        return 'text-blue-500 dark:text-blue-400';
      case 'zap':
        return 'text-purple-500 dark:text-purple-400';
      case 'custom':
        return 'text-amber-500 dark:text-amber-400';
      default:
        return 'text-yellow-500 dark:text-yellow-400';
    }
  };

  const filledColor = getVariantColor();

  const renderLabels = () => {
    if (!config.showLabels) return null;

    const labels =
      config.labels ||
      ['Poor', 'Fair', 'Good', 'Very Good', 'Excellent'].slice(
        0,
        config.maxStars,
      );

    return (
      <div
        className={`flex justify-between mt-2 ${size.text} text-gray-600 dark:text-gray-400`}
      >
        {labels.map((label, index) => (
          <span
            // biome-ignore lint/suspicious/noArrayIndexKey: lint debt cleanup
            key={index}
            className={`transition-opacity duration-200 ${
              hoveredIndex !== null
                ? index <= hoveredIndex
                  ? 'opacity-100 font-medium text-gray-900 dark:text-white'
                  : 'opacity-50'
                : index < Math.floor(rating)
                  ? 'opacity-100 font-medium text-gray-900 dark:text-white'
                  : 'opacity-50'
            }`}
          >
            {label}
          </span>
        ))}
      </div>
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={`
        w-full max-w-md mx-auto
        bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-900
        rounded-2xl shadow-lg dark:shadow-2xl
        border border-gray-200 dark:border-gray-700
        overflow-hidden
        ${config.className || ''}
      `}
    >
      <div className="p-6 md:p-8">
        <div
          className={`flex flex-col ${config.layout === 'horizontal' ? 'md:flex-row md:items-center' : ''} gap-6`}
        >
          {/* Header Section */}
          <div className="flex-1 space-y-3">
            {config.headerText && (
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                {config.headerText}
              </h3>
            )}
            {config.descriptionText && (
              <p className="text-gray-600 dark:text-gray-400">
                {config.descriptionText}
              </p>
            )}
          </div>

          {/* Rating Section */}
          <div className="flex-1">
            <RatingGroup.Root
              count={config.maxStars}
              value={rating}
              onValueChange={(details) => handleRatingChange(details.value)}
              allowHalf={config.allowHalf}
              readOnly={config.readOnly}
              disabled={config.disabled}
              onHoverChange={(details) => setHoveredIndex(details.hoveredValue)}
            >
              <RatingGroup.Control
                className={`flex ${spacingClass} justify-${config.align} flex-wrap`}
              >
                <RatingGroup.Context>
                  {({ items }) =>
                    items.map((item) => (
                      <RatingGroup.Item
                        key={item}
                        index={item}
                        className={`
                          relative
                          ${config.disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}
                          transition-all duration-200
                          ${config.glowEffect && 'hover:drop-shadow-lg'}
                          focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-current rounded-full
                        `}
                      >
                        <RatingGroup.ItemContext>
                          {({ half, highlighted }) => {
                            const isActive =
                              highlighted ||
                              (hoveredIndex !== null && item <= hoveredIndex);
                            const isFilled = half || isActive;

                            return (
                              <motion.div
                                animate={
                                  isActive && config.animation !== 'none'
                                    ? animationVariants[config.animation]
                                    : {}
                                }
                                className="relative"
                              >
                                {/* Empty State */}
                                <div
                                  className={`absolute ${config.emptyColor}`}
                                >
                                  {getIconComponent(config.variant, false)}
                                </div>

                                {/* Filled State */}
                                <div
                                  className={`
                                    ${isFilled ? 'opacity-100' : 'opacity-0'}
                                    transition-all duration-300
                                    ${filledColor}
                                    ${config.glowEffect && isFilled ? 'filter drop-shadow' : ''}
                                  `}
                                  style={{
                                    clipPath: half
                                      ? 'inset(0 50% 0 0)'
                                      : 'inset(0 0 0 0)',
                                  }}
                                >
                                  {getIconComponent(config.variant, true)}
                                </div>

                                {/* Highlight overlay */}
                                {isActive && config.highlightColor && (
                                  <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 0.2 }}
                                    className={`absolute inset-0 ${config.highlightColor} blur-sm`}
                                  />
                                )}
                              </motion.div>
                            );
                          }}
                        </RatingGroup.ItemContext>
                      </RatingGroup.Item>
                    ))
                  }
                </RatingGroup.Context>
              </RatingGroup.Control>

              {config.showValue && rating > 0 && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className={`mt-4 text-center ${size.text}`}
                >
                  <span className="font-bold text-gray-900 dark:text-white">
                    {rating.toFixed(config.allowHalf ? 1 : 0)}
                  </span>
                  {config.showMax && (
                    <span className="text-gray-500 dark:text-gray-400">
                      /{config.maxStars}
                    </span>
                  )}
                </motion.div>
              )}

              {renderLabels()}
            </RatingGroup.Root>

            {/* Error Message */}
            <AnimatePresence>
              {error && (
                <motion.p
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mt-2 text-sm text-red-500 dark:text-red-400"
                >
                  {error}
                </motion.p>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Review Section */}
        <AnimatePresence>
          {config.showReview && rating > 0 && !submitted && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700"
            >
              <label
                htmlFor={`review-${id}`}
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2"
              >
                Optional Review
                {config.reviewRequired && (
                  <span className="text-red-500 ml-1">*</span>
                )}
              </label>
              <div className="relative">
                <textarea
                  id={`review-${id}`}
                  value={review}
                  onChange={(e) => setReview(e.target.value)}
                  placeholder={config.reviewPlaceholder}
                  maxLength={config.maxReviewLength}
                  className={`
                    w-full px-4 py-3
                    bg-white dark:bg-gray-800
                    border border-gray-300 dark:border-gray-600
                    rounded-xl
                    focus:ring-2 focus:ring-current focus:border-transparent
                    focus:outline-none
                    resize-none
                    transition-all duration-200
                    ${error ? 'border-red-300 dark:border-red-500' : ''}
                  `}
                  rows={3}
                />
                <div className="flex justify-between items-center mt-2">
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {review.length}/{config.maxReviewLength} characters
                  </span>
                  {config.minReviewLength > 0 && (
                    <span
                      className={`text-xs ${
                        review.length >= config.minReviewLength
                          ? 'text-green-500'
                          : 'text-amber-500'
                      }`}
                    >
                      Min {config.minReviewLength}
                    </span>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Submit Button */}
        <AnimatePresence>
          {!submitted && rating > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mt-6"
            >
              {/** biome-ignore lint/a11y/useButtonType: lint debt cleanup */}
              <button
                onClick={handleSubmit}
                disabled={config.disabled}
                className={`
                  w-full py-3 px-6
                  bg-gradient-to-r ${filledColor.replace('text-', 'from-')} ${filledColor.replace('text-', 'to-').replace('400', '600')}
                  text-white font-semibold
                  rounded-xl
                  shadow-lg
                  hover:shadow-xl
                  transform hover:-translate-y-0.5
                  active:translate-y-0
                  disabled:opacity-50 disabled:cursor-not-allowed
                  transition-all duration-200
                  flex items-center justify-center gap-2
                `}
              >
                <Sparkles size={16} />
                Submit Rating
                <Sparkles size={16} />
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Success Message */}
        <AnimatePresence>
          {submitted && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="mt-6 p-4 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-xl border border-green-200 dark:border-green-800"
            >
              <div className="flex items-center gap-3">
                <div className="flex-shrink-0 w-10 h-10 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <h4 className="font-semibold text-green-800 dark:text-green-300">
                    {config.successText}
                  </h4>
                  <p className="text-sm text-green-600 dark:text-green-400 mt-1">
                    You rated this {rating} star{rating !== 1 ? 's' : ''}
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
