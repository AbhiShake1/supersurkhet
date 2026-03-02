import { createFileRoute } from '@tanstack/react-router';

type PlatformId = 'windows' | 'macos' | 'linux';

type DownloadAsset = {
  available: boolean;
  fileName: string;
  label: string;
  notes: string;
  platform: PlatformId;
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

type GithubReleaseAsset = {
  browser_download_url: string;
  name: string;
  size: number;
  updated_at: string;
};

type GithubRelease = {
  assets: GithubReleaseAsset[];
  name: string | null;
  tag_name: string;
};

const OWNER = 'AbhiShake1';
const REPO = 'supersurkhet';
const RELEASES_LATEST_URL = `https://github.com/${OWNER}/${REPO}/releases/latest`;
const GITHUB_LATEST_API = `https://api.github.com/repos/${OWNER}/${REPO}/releases/latest`;

function nowIso(): string {
  return new Date().toISOString();
}

function fallbackManifest(): DownloadManifest {
  return {
    generatedAt: nowIso(),
    product: 'SuperSurkhet',
    releaseDir: RELEASES_LATEST_URL,
    sourceVersion: 'latest',
    targets: [
      {
        available: true,
        fileName: 'SuperSurkhet-windows-x64-setup.exe',
        label: 'Windows x64 (Installer)',
        notes: 'Unsigned NSIS installer',
        platform: 'windows',
        sizeBytes: 0,
        updatedAt: nowIso(),
        url: `${RELEASES_LATEST_URL}/download/SuperSurkhet-windows-x64-setup.exe`,
      },
      {
        available: true,
        fileName: 'SuperSurkhet-macos-arm64.dmg',
        label: 'macOS (DMG)',
        notes: 'Unsigned macOS build',
        platform: 'macos',
        sizeBytes: 0,
        updatedAt: nowIso(),
        url: `${RELEASES_LATEST_URL}/download/SuperSurkhet-macos-arm64.dmg`,
      },
      {
        available: true,
        fileName: 'SuperSurkhet-linux-x64.deb',
        label: 'Linux (DEB)',
        notes: 'Unsigned Linux build',
        platform: 'linux',
        sizeBytes: 0,
        updatedAt: nowIso(),
        url: `${RELEASES_LATEST_URL}/download/SuperSurkhet-linux-x64.deb`,
      },
    ],
  };
}

function pickAsset(
  assets: GithubReleaseAsset[],
  patterns: RegExp[],
): GithubReleaseAsset | null {
  for (const pattern of patterns) {
    const match = assets.find((asset) => pattern.test(asset.name));
    if (match) return match;
  }
  return null;
}

function mapAsset(
  asset: GithubReleaseAsset | null,
  platform: PlatformId,
  label: string,
  notes: string,
): DownloadAsset {
  if (!asset) {
    return {
      available: false,
      fileName: '',
      label,
      notes: 'Asset not published in latest release yet',
      platform,
      sizeBytes: 0,
      updatedAt: nowIso(),
      url: '',
    };
  }

  return {
    available: true,
    fileName: asset.name,
    label,
    notes,
    platform,
    sizeBytes: asset.size,
    updatedAt: asset.updated_at,
    url: asset.browser_download_url,
  };
}

async function fetchLatestReleaseManifest(): Promise<DownloadManifest> {
  const response = await fetch(GITHUB_LATEST_API, {
    headers: {
      Accept: 'application/vnd.github+json',
    },
  });

  if (!response.ok) {
    throw new Error(`GitHub latest release API failed (${response.status})`);
  }

  const release = (await response.json()) as GithubRelease;
  const assets = release.assets ?? [];

  const windowsAsset = pickAsset(assets, [
    /supersurkhet-windows-x64-setup\.exe$/i,
    /windows.*setup.*\.exe$/i,
    /setup.*\.exe$/i,
  ]);

  const macAsset = pickAsset(assets, [
    /supersurkhet-macos-arm64\.dmg$/i,
    /supersurkhet-macos-x64\.dmg$/i,
    /macos.*\.dmg$/i,
    /\.dmg$/i,
  ]);

  const linuxAsset = pickAsset(assets, [
    /supersurkhet-linux-x64\.deb$/i,
    /linux.*\.deb$/i,
    /\.deb$/i,
    /\.AppImage$/i,
  ]);

  return {
    generatedAt: nowIso(),
    product: 'SuperSurkhet',
    releaseDir: RELEASES_LATEST_URL,
    sourceVersion: release.tag_name
      .replace(/^desktop-v/i, '')
      .replace(/^v/i, ''),
    targets: [
      mapAsset(
        windowsAsset,
        'windows',
        'Windows x64 (Installer)',
        'Unsigned NSIS installer',
      ),
      mapAsset(macAsset, 'macos', 'macOS (DMG)', 'Unsigned macOS build'),
      mapAsset(
        linuxAsset,
        'linux',
        'Linux (DEB/AppImage)',
        'Unsigned Linux build',
      ),
    ],
  };
}

export const Route = createFileRoute('/downloads-manifest')({
  server: {
    handlers: {
      GET: async () => {
        try {
          const manifest = await fetchLatestReleaseManifest();
          return Response.json(manifest, {
            headers: {
              'Cache-Control':
                'public, max-age=300, s-maxage=300, stale-while-revalidate=600',
            },
          });
        } catch {
          return Response.json(fallbackManifest(), {
            headers: {
              'Cache-Control': 'public, max-age=60, s-maxage=60',
            },
          });
        }
      },
    },
  },
});
