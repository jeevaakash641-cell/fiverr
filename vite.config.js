import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  base: '/', // Ensure correct base path for Netlify
  plugins: [
    react(),
    // Temporarily disabled PWA to fix plugin error
    // VitePWA({
    //   registerType: 'autoUpdate',
    //   includeAssets: ['vite.svg'],
    //   manifest: {
    //     name: 'EduLearn - Educational Platform',
    //     short_name: 'EduLearn',
    //     description: 'AI-Powered Educational Platform for Classes 1-12',
    //     theme_color: '#4F46E5',
    //     background_color: '#ffffff',
    //     display: 'standalone',
    //     orientation: 'portrait',
    //     scope: '/',
    //     start_url: '/',
    //     icons: [
    //       {
    //         src: '/vite.svg',
    //         sizes: '192x192',
    //         type: 'image/svg+xml',
    //         purpose: 'any maskable'
    //       },
    //       {
    //         src: '/vite.svg',
    //         sizes: '512x512',
    //         type: 'image/svg+xml',
    //         purpose: 'any maskable'
    //       }
    //     ]
    //   },
    //   workbox: {
    //     globPatterns: ['**/*.{js,css,html,ico,png,svg,json}'],
    //     // Force update on new version
    //     cleanupOutdatedCaches: true,
    //     skipWaiting: true,
    //     clientsClaim: true,
    //     // Disable caching for JS files during development
    //     navigateFallback: null,
    //     runtimeCaching: [
    //       {
    //         urlPattern: /^https:\/\/api\./i,
    //         handler: 'NetworkFirst',
    //         options: {
    //           cacheName: 'api-cache',
    //           expiration: {
    //             maxEntries: 50,
    //             maxAgeSeconds: 60 * 60 * 24 // 24 hours
    //           }
    //         }
    //       },
    //       {
    //         // Always fetch JS files from network
    //         urlPattern: /\.js$/,
    //         handler: 'NetworkFirst',
    //         options: {
    //           cacheName: 'js-cache',
    //           networkTimeoutSeconds: 3,
    //           expiration: {
    //             maxEntries: 50,
    //             maxAgeSeconds: 60 * 5 // 5 minutes only
    //           }
    //         }
    //       }
    //     ]
    //   }
    // })
  ],
  server: {
    port: 5173,
    host: true,
    allowedHosts: [
      'nonmonistic-eisegetical-flavia.ngrok-free.dev',
      '.ngrok-free.dev',
      '.ngrok.io',
      'localhost'
    ]
  },
  build: {
    // Exclude PDF files from build to reduce APK size
    rollupOptions: {
      external: [/\.pdf$/],
      output: {
        // Add hash to filenames for cache busting
        entryFileNames: 'assets/[name].[hash].js',
        chunkFileNames: 'assets/[name].[hash].js',
        assetFileNames: 'assets/[name].[hash].[ext]'
      }
    }
  },
  publicDir: 'public',
  // Copy only necessary files, exclude books folder
  assetsInclude: ['**/*.svg', '**/*.png', '**/*.jpg', '**/*.jpeg', '**/*.gif']
})
