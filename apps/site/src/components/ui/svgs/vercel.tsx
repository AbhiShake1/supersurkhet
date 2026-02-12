import type { SVGProps } from 'react';

const Vercel = (props: SVGProps<SVGSVGElement>) => (
  // biome-ignore lint/a11y/noSvgWithoutTitle: lint debt cleanup
  <svg {...props} viewBox="0 0 256 222" preserveAspectRatio="xMidYMid">
    <path d="m128 0 128 221.705H0z" />
  </svg>
);

export { Vercel };
