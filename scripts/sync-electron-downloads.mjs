import { createHash } from 'node:crypto';
import { promises as fs } from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const releaseDir = path.join(root, 'apps/electron/release');
const outputDir = path.join(root, 'apps/site/public/downloads');
const electronPackagePath = path.join(root, 'apps/electron/package.json');

const platformOrder = ['windows', 'macos', 'linux'];

const platformConfig = {
  windows: {
    choose: [/(setup|installer).*\.exe$/i, /\.exe$/i],
    formatName: (version, original) =>
      `SuperSurkhet-${version}-windows-x64-${original.toLowerCase().includes('portable') ? 'portable' : 'setup'}.exe`,
    label: 'Windows x64 (Installer)',
    notes: 'Unsigned NSIS installer',
  },
  macos: {
    choose: [/\.dmg$/i, /\.zip$/i],
    formatName: (version, original) => {
      const ext = path.extname(original).toLowerCase();
      const arch = original.toLowerCase().includes('arm64')
        ? 'arm64'
        : original.toLowerCase().includes('x64')
          ? 'x64'
          : 'universal';
      return `SuperSurkhet-${version}-macos-${arch}${ext}`;
    },
    label: 'macOS (DMG/ZIP)',
    notes: 'Unsigned macOS build',
  },
  linux: {
    choose: [/\.deb$/i, /\.AppImage$/i, /\.rpm$/i, /\.snap$/i],
    formatName: (version, original) => {
      const ext = path.extname(original).toLowerCase();
      const type = ext === '.appimage' ? 'appimage' : ext.slice(1);
      return `SuperSurkhet-${version}-linux-x64.${type}`;
    },
    label: 'Linux (AppImage/DEB/RPM/SNAP)',
    notes: 'Unsigned Linux build',
  },
};

async function fileExists(targetPath) {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
}

function detectPlatformFromFile(fileName) {
  const lower = fileName.toLowerCase();
  if (lower.endsWith('.exe')) return 'windows';
  if (lower.endsWith('.dmg') || lower.endsWith('.zip')) return 'macos';
  if (
    lower.endsWith('.appimage') ||
    lower.endsWith('.deb') ||
    lower.endsWith('.rpm') ||
    lower.endsWith('.snap')
  ) {
    return 'linux';
  }
  return null;
}

async function listReleaseFiles() {
  if (!(await fileExists(releaseDir))) {
    throw new Error(`Release directory not found: ${releaseDir}`);
  }

  const dirents = await fs.readdir(releaseDir, { withFileTypes: true });
  return dirents
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name)
    .filter((name) => !name.endsWith('.blockmap') && !name.endsWith('.yml'));
}

function pickArtifact(files, platform) {
  const config = platformConfig[platform];
  const candidates = files.filter((file) => detectPlatformFromFile(file) === platform);

  for (const pattern of config.choose) {
    const match = candidates.find((file) => pattern.test(file));
    if (match) return match;
  }

  return null;
}

async function sha256For(filePath) {
  const data = await fs.readFile(filePath);
  return createHash('sha256').update(data).digest('hex');
}

async function cleanOutputDirectory() {
  await fs.mkdir(outputDir, { recursive: true });
  const existing = await fs.readdir(outputDir, { withFileTypes: true });

  for (const entry of existing) {
    if (!entry.isFile()) continue;
    if (entry.name === 'manifest.json') continue;
    await fs.unlink(path.join(outputDir, entry.name));
  }
}

async function placeArtifact(srcPath, destPath) {
  await fs.rm(destPath, { force: true });
  try {
    await fs.link(srcPath, destPath);
  } catch {
    await fs.copyFile(srcPath, destPath);
  }
}

async function main() {
  const electronPackage = JSON.parse(await fs.readFile(electronPackagePath, 'utf8'));
  const version = electronPackage.version ?? '0.0.0';

  const releaseFiles = await listReleaseFiles();
  await cleanOutputDirectory();

  const targets = [];

  for (const platform of platformOrder) {
    const selected = pickArtifact(releaseFiles, platform);

    if (!selected) {
      targets.push({
        available: false,
        fileName: '',
        label: platformConfig[platform].label,
        notes: 'Build and sync pending',
        platform,
        sha256: '',
        sizeBytes: 0,
        updatedAt: new Date().toISOString(),
        url: '',
      });
      continue;
    }

    const srcPath = path.join(releaseDir, selected);
    const canonicalName = platformConfig[platform].formatName(version, selected);
    const destPath = path.join(outputDir, canonicalName);

    await placeArtifact(srcPath, destPath);
    const stat = await fs.stat(destPath);
    const sha256 = await sha256For(destPath);

    targets.push({
      available: true,
      fileName: canonicalName,
      label: platformConfig[platform].label,
      notes: platformConfig[platform].notes,
      platform,
      sha256,
      sizeBytes: stat.size,
      updatedAt: stat.mtime.toISOString(),
      url: `/downloads/${canonicalName}`,
    });
  }

  const manifest = {
    generatedAt: new Date().toISOString(),
    product: electronPackage.productName ?? 'SuperSurkhet',
    releaseDir: '/downloads',
    sourceVersion: version,
    targets,
  };

  await fs.writeFile(
    path.join(outputDir, 'manifest.json'),
    `${JSON.stringify(manifest, null, 2)}\n`,
    'utf8',
  );

  const availableCount = targets.filter((item) => item.available).length;
  console.log(`Synced ${availableCount}/${targets.length} platform artifact(s) to ${outputDir}`);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
