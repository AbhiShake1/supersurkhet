'use client';

/**
 * @author: @dorian_baffier
 * @description: Sliced Text
 * @version: 1.0.0
 * @date: 2025-06-26
 * @license: MIT
 * @website: https://kokonutui.com
 * @github: https://github.com/kokonut-labs/kokonutui
 */

import { motion } from 'motion/react';
import z from 'zod';
import { cn } from '@/lib/utils';

export const SlicedTextSchema = z.object({
  text: z.string().optional(),
  className: z.string().optional(),
  containerClassName: z.string().optional(),
  splitSpacing: z.number().optional(),
});

export type SlicedTextProps = z.infer<typeof SlicedTextSchema>;

const SlicedText: React.FC<SlicedTextProps> = ({
  text = 'Sliced Text',
  className = '',
  containerClassName = '',
  splitSpacing = 2,
}) => {
  return (
    <motion.div
      className={cn(
        'w-full text-center relative inline-block',
        containerClassName,
      )}
      whileHover="hover"
      initial="default"
    >
      <motion.div
        className={cn('absolute w-full text-4xl -ml-0.5', className)}
        variants={{
          default: {
            clipPath: 'inset(0 0 50% 0)',
            y: -splitSpacing / 2,
            opacity: 1,
          },
          hover: {
            clipPath: 'inset(0 0 0 0)',
            y: 0,
            opacity: 0,
          },
        }}
        transition={{ duration: 0.1 }}
      >
        {text}
      </motion.div>
      <motion.div
        className={cn('absolute w-full text-4xl', className)}
        variants={{
          default: {
            clipPath: 'inset(50% 0 0 0)',
            y: splitSpacing / 2,
            opacity: 1,
          },
          hover: {
            clipPath: 'inset(0 0 0 0)',
            y: 0,
            opacity: 1,
          },
        }}
        transition={{ duration: 0.1 }}
      >
        {text}
      </motion.div>

      <div className={cn('invisible text-4xl', className)}>{text}</div>
    </motion.div>
  );
};

export default SlicedText;
