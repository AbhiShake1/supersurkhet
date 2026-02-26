'use client';

import { motion } from 'motion/react';
import { cn } from '@/lib/utils';

export const TypewriterEffect = ({
  words,
  className,
  cursorClassName,
}: {
  words: {
    text: string;
    className?: string;
  }[];
  className?: string;
  cursorClassName?: string;
}) => {
  // split text inside of words into array of characters
  const wordsArray = words.map((word) => {
    return {
      ...word,
      text: word.text.split(''),
    };
  });

  const renderWords = () => {
    return (
      <motion.div
        className="inline"
        initial="hidden"
        whileInView="visible"
        viewport={{ amount: 0.4, once: true }}
        variants={{
          hidden: {},
          visible: {
            transition: {
              staggerChildren: 0.1,
            },
          },
        }}
      >
        {wordsArray.map((word, idx) => {
          return (
            <div
              key={`word-${
                // biome-ignore lint/suspicious/noArrayIndexKey: lint debt cleanup
                idx
              }`}
              className="inline-block"
            >
              {word.text.map((char, index) => (
                <motion.span
                  initial={{
                    display: 'none',
                    opacity: 0,
                    width: 0,
                  }}
                  variants={{
                    visible: {
                      display: 'inline-block',
                      opacity: 1,
                      width: 'fit-content',
                      transition: {
                        duration: 0.3,
                        ease: 'easeInOut',
                      },
                    },
                  }}
                  key={`char-${
                    // biome-ignore lint/suspicious/noArrayIndexKey: lint debt cleanup
                    index
                  }`}
                  className={cn(
                    `dark:text-white text-black opacity-0 hidden`,
                    word.className,
                  )}
                >
                  {char}
                </motion.span>
              ))}
              &nbsp;
            </div>
          );
        })}
      </motion.div>
    );
  };
  return (
    <div
      className={cn(
        'text-base sm:text-xl md:text-3xl lg:text-5xl font-bold text-center',
        className,
      )}
    >
      {renderWords()}
      <motion.span
        initial={{
          opacity: 0,
        }}
        animate={{
          opacity: 1,
        }}
        transition={{
          duration: 0.8,
          repeat: Number.POSITIVE_INFINITY,
          repeatType: 'reverse',
        }}
        className={cn(
          'inline-block rounded-sm w-[4px] h-4 md:h-6 lg:h-10 bg-blue-500',
          cursorClassName,
        )}
      ></motion.span>
    </div>
  );
};

export const TypewriterEffectSmooth = ({
  words,
  className,
  cursorClassName,
}: {
  words: {
    text: string;
    className?: string;
  }[];
  className?: string;
  cursorClassName?: string;
}) => {
  // split text inside of words into array of characters
  const wordsArray = words.map((word) => {
    return {
      ...word,
      text: word.text.split(''),
    };
  });
  const renderWords = () => {
    return (
      <div>
        {wordsArray.map((word, idx) => {
          return (
            <div
              key={`word-${
                // biome-ignore lint/suspicious/noArrayIndexKey: lint debt cleanup
                idx
              }`}
              className="inline-block"
            >
              {word.text.map((char, index) => (
                <span
                  key={`char-${
                    // biome-ignore lint/suspicious/noArrayIndexKey: lint debt cleanup
                    index
                  }`}
                  className={cn(`dark:text-white text-black `, word.className)}
                >
                  {char}
                </span>
              ))}
              &nbsp;
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className={cn('flex space-x-1 my-6', className)}>
      <motion.div
        className="overflow-hidden pb-2"
        initial={{
          width: '0%',
        }}
        whileInView={{
          width: 'fit-content',
        }}
        transition={{
          duration: 2,
          ease: 'linear',
          delay: 1,
        }}
      >
        <div
          className="text-xs sm:text-base md:text-xl lg:text:3xl xl:text-5xl font-bold"
          style={{
            whiteSpace: 'nowrap',
          }}
        >
          {renderWords()}{' '}
        </div>{' '}
      </motion.div>
      <motion.span
        initial={{
          opacity: 0,
        }}
        animate={{
          opacity: 1,
        }}
        transition={{
          duration: 0.8,

          repeat: Number.POSITIVE_INFINITY,
          repeatType: 'reverse',
        }}
        className={cn(
          'block rounded-sm w-[4px]  h-4 sm:h-6 xl:h-12 bg-blue-500',
          cursorClassName,
        )}
      ></motion.span>
    </div>
  );
};
