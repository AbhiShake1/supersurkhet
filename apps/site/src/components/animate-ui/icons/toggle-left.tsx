'use client';

import { motion, type Variants } from 'motion/react';

import {
  getVariants,
  type IconProps,
  IconWrapper,
  useAnimateIconContext,
} from '@/components/animate-ui/icons/icon';

type ToggleLeftProps = IconProps<keyof typeof animations>;

const animations = {
  default: {
    rect: {},
    circle: {
      initial: {
        x: 0,
      },
      animate: {
        x: [0, 7, 6],
        transition: {
          duration: 0.5,
          ease: 'easeInOut',
        },
      },
    },
  } satisfies Record<string, Variants>,
  'default-loop': {
    rect: {},
    circle: {
      initial: {
        x: 0,
      },
      animate: {
        x: [0, 7, 6, -1, 0],
        transition: {
          duration: 1,
          ease: 'easeInOut',
        },
      },
    },
  } satisfies Record<string, Variants>,
} as const;

function IconComponent({ size, ...props }: ToggleLeftProps) {
  const { controls } = useAnimateIconContext();
  const variants = getVariants(animations);

  return (
    // biome-ignore lint/a11y/noSvgWithoutTitle: lint debt cleanup
    <motion.svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <motion.rect
        width={20}
        height={14}
        x={2}
        y={5}
        rx={7}
        variants={variants.rect}
        initial="initial"
        animate={controls}
      />
      <motion.circle
        cx={9}
        cy={12}
        r={3}
        variants={variants.circle}
        initial="initial"
        animate={controls}
      />
    </motion.svg>
  );
}

function ToggleLeft(props: ToggleLeftProps) {
  return <IconWrapper icon={IconComponent} {...props} />;
}

export {
  animations,
  ToggleLeft,
  ToggleLeft as ToggleLeftIcon,
  type ToggleLeftProps,
  type ToggleLeftProps as ToggleLeftIconProps,
};
