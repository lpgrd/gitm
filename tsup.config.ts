import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/cli.ts'],
  format: ['esm'],
  target: 'node14',
  clean: true,
  shims: true,
  minify: false,
  sourcemap: true,
  dts: false,
  esbuildOptions(options) {
    options.alias = {
      '@': './src',
      '@types': './src/types',
      '@utils': './src/utils',
      '@lib': './src/lib',
      '@commands': './src/commands',
      '@config': './src/config'
    };
  }
});