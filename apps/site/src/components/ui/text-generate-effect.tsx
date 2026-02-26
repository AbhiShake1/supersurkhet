'use client';
import { motion } from 'motion/react';
import { cn } from '@/lib/utils';

export const TextGenerateEffect = ({
  words,
  className,
  filter = true,
  duration = 0.5,
}: {
  words: string;
  className?: string;
  filter?: boolean;
  duration?: number;
}) => {
  const wordsArray = words.split(' ');

  const renderWords = () => {
    return (
      <motion.div>
        {wordsArray.map((word, idx) => {
          return (
            <motion.span
              // biome-ignore lint/suspicious/noArrayIndexKey: lint debt cleanup
              key={word + idx}
              className="dark:text-white text-black"
              initial={{
                opacity: 0,
                filter: filter ? 'blur(10px)' : 'none',
              }}
              animate={{
                opacity: 1,
                filter: filter ? 'blur(0px)' : 'none',
              }}
              transition={{
                duration: duration || 1,
                delay: idx * 0.2,
              }}
            >
              {word}{' '}
            </motion.span>
          );
        })}
      </motion.div>
    );
  };

  return (
    <div className={cn('font-bold', className)}>
      <div className="mt-4">
        <div className=" dark:text-white text-black text-2xl leading-snug tracking-wide">
          {renderWords()}
        </div>
      </div>
    </div>
  );
};
