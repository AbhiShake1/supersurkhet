import { AppWindow, Download, HardDriveDownload, Laptop } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { cn } from '@/lib/utils';

type PlatformId = 'windows' | 'macos' | 'linux';

type DownloadAsset = {
  available: boolean;
  fileName: string;
  label: string;
  notes: string;
  platform: PlatformId;
  sha256?: string;
  sizeBytes: number;
  updatedAt: string;
  url: string;
};

type DownloadManifest = {
  generatedAt: string;
  product: string;
  releaseDir: string;
  sourceVersion: string;
  targets: DownloadAsset[];
};

const fallbackManifest: DownloadManifest = {
  generatedAt: new Date().toISOString(),
  product: 'SuperSurkhet',
  releaseDir: '/downloads',
  sourceVersion: 'latest',
  targets: [
    {
      available: true,
      fileName: 'SuperSurkhet-1.0.1-windows-x64-setup.exe',
      label: 'Windows x64 (Installer)',
      notes: 'Unsigned build',
      platform: 'windows',
      sizeBytes: 0,
      updatedAt: new Date().toISOString(),
      url: '/downloads/SuperSurkhet-1.0.1-windows-x64-setup.exe',
    },
    {
      available: false,
      fileName: '',
      label: 'macOS (DMG/ZIP)',
      notes: 'Build and sync pending',
      platform: 'macos',
      sizeBytes: 0,
      updatedAt: new Date().toISOString(),
      url: '',
    },
    {
      available: false,
      fileName: '',
      label: 'Linux (AppImage/DEB/RPM)',
      notes: 'Build and sync pending',
      platform: 'linux',
      sizeBytes: 0,
      updatedAt: new Date().toISOString(),
      url: '',
    },
  ],
};

const platformMeta: Record<
  PlatformId,
  {
    accent: string;
    icon: typeof AppWindow;
    subtitle: string;
    title: string;
  }
> = {
  windows: {
    accent: 'from-sky-500/14 to-cyan-500/8',
    icon: Laptop,
    subtitle: 'Business and retail workstation support',
    title: 'Windows',
  },
  macos: {
    accent: 'from-emerald-500/14 to-teal-500/8',
    icon: AppWindow,
    subtitle: 'Apple Silicon and Intel compatibility',
    title: 'macOS',
  },
  linux: {
    accent: 'from-amber-500/14 to-orange-500/8',
    icon: HardDriveDownload,
    subtitle: 'AppImage package for fast install',
    title: 'Linux',
  },
};

const platformOrder: PlatformId[] = ['windows', 'macos', 'linux'];

function detectPlatform(): PlatformId | null {
  if (typeof window === 'undefined') return null;

  const nav = navigator as Navigator & {
    userAgentData?: {
      platform?: string;
    };
  };

  const ua =
    `${nav.userAgentData?.platform ?? ''} ${navigator.userAgent}`.toLowerCase();

  if (ua.includes('win')) return 'windows';
  if (ua.includes('mac')) return 'macos';
  if (ua.includes('linux') || ua.includes('x11')) return 'linux';

  return null;
}

function formatDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return 'Unknown';
  return date.toLocaleDateString(undefined, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export default function DownloadSection() {
  const [manifest, setManifest] = useState<DownloadManifest>(fallbackManifest);
  const [currentPlatform, setCurrentPlatform] = useState<PlatformId | null>(
    null,
  );

  useEffect(() => {
    setCurrentPlatform(detectPlatform());

    let cancelled = false;
    fetch('/downloads/manifest.json', { cache: 'no-store' })
      .then((response) => {
        if (!response.ok) {
          throw new Error(`Could not load manifest (${response.status})`);
        }
        return response.json() as Promise<DownloadManifest>;
      })
      .then((nextManifest) => {
        if (!cancelled && nextManifest?.targets?.length) {
          setManifest(nextManifest);
        }
      })
      .catch(() => {
        // Fallback keeps download UI functional before first sync.
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const availableTargets = useMemo(
    () => manifest.targets.filter((target) => target.available),
    [manifest.targets],
  );

  const recommendedDownload = useMemo(() => {
    if (!currentPlatform) return availableTargets[0] ?? null;

    return (
      availableTargets.find((target) => target.platform === currentPlatform) ??
      availableTargets[0] ??
      null
    );
  }, [availableTargets, currentPlatform]);

  return (
    // biome-ignore lint/correctness/useUniqueElementIds: homepage hash navigation target
    <section id="downloads" className="relative overflow-hidden py-32">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_18%_14%,rgba(14,165,233,0.14),transparent_42%),radial-gradient(circle_at_80%_24%,rgba(16,185,129,0.12),transparent_45%),radial-gradient(circle_at_50%_92%,rgba(245,158,11,0.09),transparent_45%)]" />
      <div className="mx-auto max-w-6xl px-6">
        <div className="mb-14 text-center">
          <p className="mb-3 font-medium font-mono text-[11px] tracking-[0.22em] text-muted-foreground uppercase">
            SuperSurkhet Desktop
          </p>
          <h2 className="font-serif text-5xl leading-none tracking-tight sm:text-6xl md:text-7xl">
            Downloads
          </h2>
          <p className="mx-auto mt-5 max-w-2xl text-pretty text-base text-muted-foreground md:text-lg">
            Direct installers for Windows, macOS, and Linux. We auto-detect your
            platform and prioritize the best download.
          </p>
          <p className="mt-3 font-medium text-sm text-muted-foreground">
            Current release: v{manifest.sourceVersion}
          </p>
        </div>

        {recommendedDownload && (
          <div className="mb-10 flex flex-col items-center gap-5 text-center">
            <Badge className="border-emerald-400/35 bg-emerald-500/15 text-emerald-100">
              Recommended for your device
            </Badge>
            <div className="space-y-2">
              <h3 className="font-semibold text-2xl md:text-3xl">
                {recommendedDownload.label}
              </h3>
              <p className="text-sm text-muted-foreground md:text-base">
                {recommendedDownload.notes}
              </p>
            </div>
            <Button asChild size="lg" className="h-12 rounded-lg px-6">
              <a href={recommendedDownload.url} download>
                <Download className="mr-2 h-4 w-4" />
                Download for {platformMeta[recommendedDownload.platform].title}
              </a>
            </Button>
          </div>
        )}

        <div className="grid gap-5 md:grid-cols-3">
          {platformOrder.map((platformId) => {
            const item = manifest.targets.find(
              (target) => target.platform === platformId,
            );
            const visual = platformMeta[platformId];
            const Icon = visual.icon;
            const isDetected = currentPlatform === platformId;

            return (
              <Card
                key={platformId}
                className={cn(
                  'relative overflow-hidden border-border/70 bg-card/65',
                  isDetected && 'ring-1 ring-cyan-300/50',
                )}
              >
                <div
                  className={cn(
                    'pointer-events-none absolute inset-x-0 top-0 h-24 bg-gradient-to-b',
                    visual.accent,
                  )}
                />
                <CardHeader className="relative gap-4 pb-0">
                  <div className="flex items-center justify-between gap-3">
                    <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-border/80 bg-background/80">
                      <Icon className="h-5 w-5" />
                    </span>
                    {isDetected && (
                      <Badge className="border-cyan-300/35 bg-cyan-500/15 text-cyan-100">
                        Detected
                      </Badge>
                    )}
                  </div>
                  <div className="space-y-1">
                    <CardTitle className="text-2xl">{visual.title}</CardTitle>
                    <p className="text-sm text-muted-foreground">
                      {visual.subtitle}
                    </p>
                  </div>
                </CardHeader>

                <CardContent className="space-y-3 pt-6 text-sm">
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-muted-foreground">Package</span>
                    <span className="text-right font-medium">
                      {item?.available ? item.label : 'Not uploaded yet'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <span className="text-muted-foreground">Updated</span>
                    <span className="font-medium">
                      {formatDate(item?.updatedAt ?? '')}
                    </span>
                  </div>
                </CardContent>

                <CardFooter>
                  {item?.available ? (
                    <Button
                      asChild
                      className="h-11 w-full rounded-lg"
                      variant="secondary"
                    >
                      <a href={item.url} download>
                        <Download className="mr-2 h-4 w-4" />
                        Download {visual.title}
                      </a>
                    </Button>
                  ) : (
                    <Button
                      disabled
                      className="h-11 w-full rounded-lg"
                      variant="secondary"
                    >
                      Coming soon
                    </Button>
                  )}
                </CardFooter>
              </Card>
            );
          })}
        </div>
      </div>
    </section>
  );
}
