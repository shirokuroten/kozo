import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  // Relative, so the app works under any path (serving from a subdirectory such as GitHub Pages is expected)
  base: './',
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      // The data lives on the device, so an old version that keeps running does no harm. Updates are applied automatically the next time the app is opened
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'Outline Recall',
        // The label under a home screen icon is cut off at around 12 characters, so the short name is a single word
        short_name: 'Recall',
        description: '知識を木として書き、上から展開して再現する',
        lang: 'ja',
        display: 'standalone',
        start_url: '.',
        scope: '.',
        background_color: '#FAFBF9',
        theme_color: '#FAFBF9',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
    }),
  ],
  test: {
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
  },
});
