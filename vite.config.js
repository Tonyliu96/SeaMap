import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          "map-vendor": ["leaflet", "react-leaflet", "esri-leaflet"]
        }
      }
    }
  }
});
