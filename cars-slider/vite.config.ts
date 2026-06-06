import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// Builds the slider into a single self-mounting IIFE bundle that the static
// site loads via <script src="assets/cars-slider/spot-cars-slider.js">.
export default defineConfig({
  plugins: [react()],
  define: { 'process.env.NODE_ENV': '"production"' },
  build: {
    outDir: '../assets/cars-slider',
    emptyOutDir: true,
    target: 'es2018',
    cssCodeSplit: false,
    lib: {
      entry: 'src/main.tsx',
      name: 'SpotCarsSlider',
      formats: ['iife'],
      fileName: () => 'spot-cars-slider.js',
    },
    rollupOptions: {
      output: { inlineDynamicImports: true },
    },
  },
});
