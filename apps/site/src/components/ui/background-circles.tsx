import clsx from 'clsx';

interface BackgroundCirclesProps {
  title?: string;
  description?: string;
  className?: string;
  variant?: keyof typeof COLOR_VARIANTS;
}

const COLOR_VARIANTS = {
  default: {
    border: ['border-primary/60', 'border-primary/50', 'border-primary/30'],
    gradient: 'from-primary/30',
  },
  primary: {
    border: [
      'border-emerald-500/60',
      'border-cyan-400/50',
      'border-slate-600/30',
    ],
    gradient: 'from-emerald-500/30',
  },
  secondary: {
    border: [
      'border-violet-500/60',
      'border-fuchsia-400/50',
      'border-slate-600/30',
    ],
    gradient: 'from-violet-500/30',
  },
  tertiary: {
    border: [
      'border-orange-500/60',
      'border-yellow-400/50',
      'border-slate-600/30',
    ],
    gradient: 'from-orange-500/30',
  },
  quaternary: {
    border: [
      'border-purple-500/60',
      'border-pink-400/50',
      'border-slate-600/30',
    ],
    gradient: 'from-purple-500/30',
  },
  quinary: {
    border: ['border-red-500/60', 'border-rose-400/50', 'border-slate-600/30'],
    gradient: 'from-red-500/30',
  },
  senary: {
    border: ['border-blue-500/60', 'border-sky-400/50', 'border-slate-600/30'],
    gradient: 'from-blue-500/30',
  },
  septenary: {
    border: ['border-gray-500/60', 'border-gray-400/50', 'border-slate-600/30'],
    gradient: 'from-gray-500/30',
  },
  octonary: {
    border: ['border-red-500/60', 'border-rose-400/50', 'border-slate-600/30'],
    gradient: 'from-red-500/30',
  },
} as const;

const AnimatedGrid = () => (
  <div
    className="absolute inset-0 [mask-image:radial-gradient(ellipse_at_center,transparent_30%,black)]"
    style={{
      animation: 'moveBg 40s linear infinite',
      backgroundPosition: '0% 0%',
    }}
  >
    <div className="h-full w-full [background-image:repeating-linear-gradient(100deg,#64748B_0%,#64748B_1px,transparent_1px,transparent_4%)] opacity-20" />
    <style>{`
      @keyframes moveBg {
        0% { background-position: 0% 0%; }
        100% { background-position: 100% 100%; }
      }
    `}</style>
  </div>
);

export function BackgroundCircles({
  title = 'Background Circles',
  description = 'Optional Description',
  className,
  variant = 'default',
}: BackgroundCirclesProps) {
  const variantStyles = COLOR_VARIANTS[variant];

  return (
    <div
      className={clsx(
        'relative flex h-screen w-full items-center justify-center overflow-hidden',
        'bg-white dark:bg-black/5',
        className,
      )}
    >
      <AnimatedGrid />
      <div className="absolute h-[480px] w-[480px]">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className={clsx(
              'absolute inset-0 rounded-full border-2 bg-gradient-to-br to-transparent',
              variantStyles.border[i],
              variantStyles.gradient,
            )}
            style={{
              animation: `
                rotate360 5s linear infinite,
                pulseScale 5s ease-in-out infinite
              `,
            }}
          >
            <div
              className={clsx(
                'absolute inset-0 rounded-full mix-blend-screen',
                `bg-[radial-gradient(ellipse_at_center,${variantStyles.gradient.replace(
                  'from-',
                  '',
                )}/10%,transparent_70%)]`,
              )}
            />
            <style>{`
              @keyframes rotate360 {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
              }
              @keyframes pulseScale {
                0%,100% { transform: scale(1); opacity: 0.8; }
                50% { transform: scale(${1 + 0.05 + i * 0.05}); opacity: 1; }
              }
            `}</style>
          </div>
        ))}
      </div>

      <div
        className="relative z-10 text-center"
        style={{
          animation: 'fadeInUp 0.8s ease-out forwards',
        }}
      >
        <h1
          className={clsx(
            'text-5xl font-bold tracking-tight md:text-7xl',
            'bg-gradient-to-b from-slate-950 to-slate-700 dark:from-slate-100 dark:to-slate-300 bg-clip-text text-transparent',
            'drop-shadow-[0_0_32px_rgba(94,234,212,0.4)]',
          )}
        >
          {title}
        </h1>

        <p
          className="mt-6 text-lg md:text-xl dark:text-white text-slate-950"
          style={{
            animation: 'fadeIn 0.8s ease-out forwards',
            animationDelay: '0.2s',
          }}
        >
          {description}
        </p>
        <style>{`
          @keyframes fadeInUp {
            0% { opacity: 0; transform: translateY(20px); }
            100% { opacity: 1; transform: translateY(0); }
          }
          @keyframes fadeIn {
            0% { opacity: 0; }
            100% { opacity: 1; }
          }
        `}</style>
      </div>

      <div className="absolute inset-0 [mask-image:radial-gradient(90%_60%_at_50%_50%,#000_40%,transparent)]">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,#0F766E/30%,transparent_70%)] blur-[120px]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,#2DD4BF/15%,transparent)] blur-[80px]" />
      </div>
    </div>
  );
}
