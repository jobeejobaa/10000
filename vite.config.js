import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon-32.png', 'apple-touch-icon.png'],
      manifest: {
        name: 'Le 10 000 — jeu de dés',
        short_name: 'Le 10 000',
        description:
          "Jeu de dés du 10 000, version 5 dés, jusqu'à 4 joueurs. Secoue ton téléphone pour lancer les dés.",
        lang: 'fr',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#102b1f',
        theme_color: '#1b4332',
        icons: [
          {
            src: '/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: '/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: '/icon-512-maskable.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        // précache tout l'app shell (JS/CSS/HTML/icônes) pour un jeu jouable hors-ligne
        globPatterns: ['**/*.{js,css,html,png,svg,ico}'],
      },
    }),
  ],
});
