'use client';

/**
 * @author: @dorian_baffier
 * @description: Scroll Text
 * @version: 1.0.0
 * @date: 2025-06-26
 * @license: MIT
 * @website: https://kokonutui.com
 * @github: https://github.com/kokonut-labs/kokonutui
 */

import { motion, type Variants } from 'motion/react';
import { useEffect, useRef, useState } from 'react';
import z from 'zod';
import { cn } from '@/lib/utils';

export const ScrollTextSchema = z.object({
  texts: z.string().array().optional(),
  className: z.string().optional(),
});

export type ScrollTextProps = z.infer<typeof ScrollTextSchema>;

export default function ScrollText({
  texts = [
    'TailwindCSS',
    'Kokonut UI',
    'shadcn/ui',
    'Next.js',
    'Vercel',
    'Motion',
    'React',
    'Resend',
    'TypeScript',
    'Fumadocs',
    'Supabase',
    'Vercel',
  ],
  className,
}: ScrollTextProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const itemsRef = useRef<(HTMLDivElement | null)[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  // Scroll to top on mount
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = 0;
    }
  }, []);

  const handleIntersection = (entries: IntersectionObserverEntry[]) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        const target =
          entry.target instanceof HTMLDivElement ? entry.target : null;
        const index = target ? itemsRef.current.indexOf(target) : -1;
        setActiveIndex(index);
      }
    });
  };

  // Setup intersection observer
  const setupObserver = (element: HTMLDivElement | null, index: number) => {
    if (element && !itemsRef.current[index]) {
      itemsRef.current[index] = element;

      if (!observerRef.current) {
        observerRef.current = new IntersectionObserver(handleIntersection, {
          threshold: 0.7,
          root: containerRef.current,
          rootMargin: '-45% 0px -45% 0px',
        });
      }

      observerRef.current.observe(element);
    }
  };

  // Animation variants for the reveal effect
  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants: Variants = {
    hidden: (index: number) => ({
      opacity: 0,
      x: index % 2 === 0 ? -100 : 100,
      rotate: index % 2 === 0 ? -10 : 10,
    }),
    visible: {
      opacity: 1,
      x: 0,
      rotate: 0,
      transition: {
        type: 'spring',
        stiffness: 100,
        damping: 15,
        duration: 0.5,
      },
    },
  };

  return (
    <div className={cn('w-full max-w-3xl mx-auto', className)}>
      <div
        ref={containerRef}
        className={cn(
          'h-[300px] overflow-y-auto scrollbar-none',
          'relative flex flex-col items-center',
          '[&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]',
        )}
      >
        <div className="h-[150px]" />
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="flex flex-col items-center w-full"
        >
          {texts.map((text, index) => (
            <motion.div
              key={text}
              ref={(el) => setupObserver(el, index)}
              custom={index}
              variants={itemVariants}
              initial="hidden"
              whileInView="visible"
              viewport={{
                once: false,
                margin: '-20% 0px -20% 0px',
              }}
              className={cn(
                'text-5xl font-bold py-8 px-4 whitespace-nowrap',
                'transition-colors duration-300',
                activeIndex === index
                  ? 'text-black dark:text-white'
                  : 'text-neutral-500/50 dark:text-neutral-600',
              )}
            >
              {text}
            </motion.div>
          ))}
        </motion.div>
        <div className="h-[150px]" />
      </div>
    </div>
  );
}
