import { resolve } from 'node:path';
import { generatePacks } from './generate-test-packs.mjs';

/**
 * Dev serves packs from public/test-packs (gitignored).
 * Production build writes them into dist/test-packs after the bundle,
 * so the Hobby deployment ships static zips and does not commit the binaries.
 */
export function exhibitKitTestPacksPlugin() {
  let outDir = '';
  let command = '';
  return {
    name: 'exhibitkit-test-packs',
    configResolved(config) {
      outDir = resolve(config.root, config.build.outDir);
      command = config.command;
    },
    async configureServer() {
      if (process.env.VITEST) return;
      const dest = resolve(process.cwd(), 'public/test-packs');
      await generatePacks({ outDir: dest });
    },
    async closeBundle() {
      if (process.env.VITEST || command !== 'build') return;
      await generatePacks({ outDir: resolve(outDir, 'test-packs'), force: true });
    },
  };
}
