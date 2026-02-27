#!/usr/bin/env node
import { createInterface } from 'node:readline/promises';
import { stdin, stdout } from 'node:process';
import { getInstallPreview, opinionatedArtifacts } from './index.js';

async function run() {
  const rl = createInterface({ input: stdin, output: stdout });

  const opinionated =
    (await rl.question(
      'Use opinionated package (admin, table, permission, kanban, and other starter artifacts)? [y/N] ',
    ))
      .trim()
      .toLowerCase() === 'y';

  const useVitePlugin =
    (await rl.question(
      'Install optional @supersurkhet/zod-typegen-vite plugin for db.d.ts generation? [Y/n] ',
    ))
      .trim()
      .toLowerCase() !== 'n';

  rl.close();

  const preview = getInstallPreview(opinionated);
  console.log(`Install registry block: ${preview.package}`);

  if (opinionated) {
    console.log(
      `This will download opinionated files into your project: ${opinionatedArtifacts.join(', ')}`,
    );
  }

  if (useVitePlugin) {
    console.log('Also install: @supersurkhet/zod-typegen-vite');
  }
}

run();
