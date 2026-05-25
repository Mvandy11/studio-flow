import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],

  // ⭐ Ensure Vite copies everything from /public into dist/public
  publicDir: "public",

  build: {
    // ⭐ Your build output is going to dist/public — keep this consistent
    outDir: "dist/public",
    emptyOutDir: true,
  },

  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
});

