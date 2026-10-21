import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  // Relative asset paths, so the built site works from a GitHub Pages subfolder.
  base: './',
  plugins: [react()],
});
