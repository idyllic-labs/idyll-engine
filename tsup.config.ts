import { defineConfig } from 'tsup';

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  dts: {
    resolve: true,
    entry: './src/index.ts',
    compilerOptions: {
      composite: false,
    },
  },
  sourcemap: true,
  clean: true,
  minify: false,
  splitting: false,
  external: ['ai'],
  tsconfig: './tsconfig.json',
  esbuildOptions(options) {
    options.platform = 'node';
  },
});