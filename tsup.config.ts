import { defineConfig } from 'tsup'

export default defineConfig({
  entry: {
    'index': 'src/index.ts',
    'react/index': 'src/react/index.ts',
    'next/index': 'src/next/index.ts',
  },
  format: ['esm', 'cjs'],
  dts: true,
  splitting: true,
  clean: true,
  external: ['react', 'react-dom', 'next', 'next/navigation', 'next/server', 'zustand', 'zustand/vanilla', 'zustand/middleware'],
  treeshake: true,
  sourcemap: true,
})
