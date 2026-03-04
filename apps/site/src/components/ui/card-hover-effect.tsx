import { cn } from '@/lib/utils';
import { AnimatePresence, motion } from 'motion/react';

import { useState } from 'react';
export const CardDescription = ({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) => {
  return (
    <p
      className={cn(
        'mt-8 text-zinc-400 tracking-wide leading-relaxed text-sm',
        className,
      )}
    >
      {children}
    </p>
  );
};
