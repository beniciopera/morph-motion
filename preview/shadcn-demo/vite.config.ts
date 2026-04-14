import path from "path"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@/components/morph-motion/card": path.resolve(
        __dirname,
        "../../registry/components/morph-motion/card.tsx"
      ),
      "@/hooks": path.resolve(__dirname, "../../registry/hooks"),
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ["react", "react-dom", "@gsap/react", "gsap"],
  },
  server: {
    fs: {
      allow: [path.resolve(__dirname, "../..")],
    },
  },
})
