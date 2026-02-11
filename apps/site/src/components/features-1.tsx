import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Settings2, Sparkles, Zap } from 'lucide-react';
import React, { type ReactNode } from 'react';
import { z } from 'zod';

const FeatureItemSchema = z.object({
  title: z.string().default('Feature Title'),
  description: z.string().default('Feature description goes here'),
  icon: z.string().default('Zap'), // Using string instead of React.ElementType for UI builder compatibility
});

// biome-ignore lint/correctness/noUnusedVariables: lint debt cleanup
interface FeatureItem extends z.infer<typeof FeatureItemSchema> {
  icon: React.ElementType; // Original type
}

export const FeaturesSchema = z.object({
  title: z.string().default('Built to cover your needs'),
  subtitle: z
    .string()
    .default(
      'Libero sapiente aliquam quibusdam aspernatur, praesentium iusto repellendus.',
    ),
  features: z.array(FeatureItemSchema).default([
    {
      title: 'Customizable',
      description:
        'Extensive customization options, allowing you to tailor every aspect to meet your specific needs.',
      icon: 'Zap',
    },
    {
      title: 'You have full control',
      description:
        'From design elements to functionality, you have complete control to create a unique and personalized experience.',
      icon: 'Settings2',
    },
    {
      title: 'Powered By AI',
      description:
        'Elements to functionality, you have complete control to create a unique experience.',
      icon: 'Sparkles',
    },
  ]),
  className: z.string().optional(),
});

export type FeaturesProps = z.infer<typeof FeaturesSchema>;

// Map icon names to components
const iconMap: Record<string, React.ElementType> = {
  Zap,
  Settings2,
  Sparkles,
};

export default function Features({
  title = 'Built to cover your needs',
  subtitle = 'Libero sapiente aliquam quibusdam aspernatur, praesentium iusto repellendus.',
  features = [
    {
      title: 'Customizable',
      description:
        'Extensive customization options, allowing you to tailor every aspect to meet your specific needs.',
      icon: 'Zap',
    },
    {
      title: 'You have full control',
      description:
        'From design elements to functionality, you have complete control to create a unique and personalized experience.',
      icon: 'Settings2',
    },
    {
      title: 'Powered By AI',
      description:
        'Elements to functionality, you have complete control to create a unique experience.',
      icon: 'Sparkles',
    },
  ],
  className = '',
}: FeaturesProps) {
  return (
    <section
      className={`bg-zinc-50 py-16 md:py-32 dark:bg-transparent ${className}`}
    >
      <div className="@container mx-auto max-w-5xl px-6">
        <div className="text-center">
          <h2 className="text-balance text-4xl font-semibold lg:text-5xl">
            {title}
          </h2>
          <p className="mt-4">{subtitle}</p>
        </div>
        <div className="@min-4xl:max-w-full @min-4xl:grid-cols-3 mx-auto mt-8 grid max-w-sm gap-6 *:text-center md:mt-16">
          {features.map((feature, index) => (
            // biome-ignore lint/suspicious/noArrayIndexKey: lint debt cleanup
<Card key={index} className="group shadow-zinc-950/5">
              <CardHeader className="pb-3">
                <CardDecorator>
                  {React.createElement(
                    iconMap[feature.icon as keyof typeof iconMap] || Zap,
                    {
                      className: 'size-6',
                      'aria-hidden': true,
                    },
                  )}
                </CardDecorator>

                <h3 className="mt-6 font-medium">{feature.title}</h3>
              </CardHeader>

              <CardContent>
                <p className="text-sm">{feature.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}

const CardDecorator = ({ children }: { children: ReactNode }) => (
  <div className="mask-radial-from-40% mask-radial-to-60% relative mx-auto size-36 duration-200 [--color-border:color-mix(in_oklab,var(--color-zinc-950)10%,transparent)] group-hover:[--color-border:color-mix(in_oklab,var(--color-zinc-950)20%,transparent)] dark:[--color-border:color-mix(in_oklab,var(--color-white)15%,transparent)] dark:group-hover:[--color-border:color-mix(in_oklab,var(--color-white)20%,transparent)]">
    <div
      aria-hidden
      className="absolute inset-0 bg-[linear-gradient(to_right,var(--color-border)_1px,transparent_1px),linear-gradient(to_bottom,var(--color-border)_1px,transparent_1px)] bg-[size:24px_24px] dark:opacity-50"
    />

    <div className="bg-background absolute inset-0 m-auto flex size-12 items-center justify-center border-l border-t">
      {children}
    </div>
  </div>
);
