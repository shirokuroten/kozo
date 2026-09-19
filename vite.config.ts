import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  // どのパスに置いても動くよう相対にする（GitHub Pages などのサブディレクトリ配信を想定）
  base: './',
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      // データは端末内にあり、古い版が動き続けても困らない。更新は次に開いたときに自動で入れる
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: '構造',
        short_name: '構造',
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
