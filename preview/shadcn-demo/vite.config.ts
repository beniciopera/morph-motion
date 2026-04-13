import path from "path"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "morph-motion": path.resolve(
        __dirname,
        "../../packages/morph-motion/src/index.ts"
      ),
    },
    dedupe: ["react", "react-dom", "@gsap/react", "gsap"],
  },
  server: {
    fs: {
      allow: [path.resolve(__dirname, "../..")],
    },
  },
  optimizeDeps: {
    exclude: ["morph-motion"],
  },
})
