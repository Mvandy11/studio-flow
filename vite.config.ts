import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

export default defineConfig({
  plugins: [react()],

  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },

  server: {
    host: "0.0.0.0",
    port: 5173,

    // ⭐ Fix for Replit preview blocking
    // Allows ANY *.replit.dev host so you never have to update this again.
    allowedHosts: [".replit.dev"],
  },
});
