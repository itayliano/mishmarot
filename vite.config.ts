import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// Browser-only app for now. Backend can be added later behind /api.
// On build we serve from the GitHub Pages project subpath; dev stays at root.
export default defineConfig(({ command }) => ({
  base: command === "build" ? "/mishmarot/" : "/",
  plugins: [react()],
  // pdfjs-dist ships a worker we import as a URL; keep it out of pre-bundling.
  optimizeDeps: {
    exclude: ["pdfjs-dist"],
  },
}));
