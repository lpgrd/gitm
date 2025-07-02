import { defineConfig } from 'tsup';
import { readFileSync } from 'fs';
import { join } from 'path';

// Read package.json to get version
const packageJson = JSON.parse(
  readFileSync(join(__dirname, 'package.json'), 'utf-8')
);

export default defineConfig({
  entry: ['src/cli.ts'],
  format: ['esm'],
  target: 'node14',
  clean: true,
  shims: true,
  minify: true,
  sourcemap: false,
  dts: false,
  treeshake: true,
  splitting: false,
  bundle: true,
  external: [
    'fs',
    'path',
    'os',
    'child_process',
    'crypto',
    'util',
    'events',
    'stream',
    'buffer',
    'url',
    'http',
    'https',
    'net',
    'tls',
    'readline',
    'tty'
  ],
  esbuildOptions(options) {
    options.alias = {
      '@': './src',
      '@types': './src/types',
      '@utils': './src/utils',
      '@lib': './src/lib',
      '@commands': './src/commands',
      '@config': './src/config'
    };
    options.treeShaking = true;
    options.minifyWhitespace = true;
    options.minifyIdentifiers = true;
    options.minifySyntax = true;
    // Define constants to be replaced at build time
    options.define = {
      '__APP_VERSION__': JSON.stringify(packageJson.version),
      '__APP_NAME__': JSON.stringify(packageJson.name)
    };
  }
});