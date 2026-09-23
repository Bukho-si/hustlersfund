import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";
import { VitePWA } from "vite-plugin-pwa";
import { mcpPlugin } from "@lovable.dev/mcp-js/stacks/supabase/vite";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
  },
  plugins: [
    react(),
    mode === "development" && componentTagger(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.png", "apple-touch-icon.png", "robots.txt"],
      manifest: {
        name: "Hustlers Fund",
        short_name: "HustlersFund",
        description: "Manage your stokvel contributions, loans, and emergencies",
        theme_color: "#0B1220",
        background_color: "#0B1220",
        display: "standalone",
        orientation: "portrait",
        start_url: "/",
        icons: [
          { src: "/favicon.png", sizes: "64x64", type: "image/png" },
          { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
          { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any maskable" },
        ],
      },

      workbox: {
        navigateFallbackDenylist: [/^\/~oauth/, /^\/\.lovable\/oauth/],
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024, // 4 MB
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2}"],
        runtimeCaching: [
          {
            // Never cache Storage objects (payment proofs can be multiple MB
            // each and used to fill up device storage / trigger low-memory
            // warnings). Always go straight to the network.
            urlPattern: /^https:\/\/.*\.supabase\.co\/storage\/.*/i,
            handler: "NetworkOnly",
          },
          {
            // Small JSON API responses only.
            urlPattern: /^https:\/\/.*\.supabase\.co\/(rest|auth)\/.*/i,
            handler: "NetworkFirst",
            options: {
              cacheName: "supabase-cache",
              expiration: {
                maxEntries: 30,
                maxAgeSeconds: 60 * 60, // 1 hour
                purgeOnQuotaError: true,
              },
            },
          },
        ],
      },
    }),
    mcpPlugin(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
