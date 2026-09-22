import { defineConfig } from 'vite';

import react from '@vitejs/plugin-react';

export default defineConfig({
  base: '/pixel-edit-studio/',
  plugins: [react()],
});
