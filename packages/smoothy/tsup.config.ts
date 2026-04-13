import { defineConfig } from "tsup";

export default defineConfig({
  entry: { index: "src/index.ts" },
  format: ["esm", "cjs"],
  dts: true,
  sourcemap: true,
  clean: true,
  treeshake: true,
  target: "es2022",
  external: [
    "react",
    "react-dom",
    "gsap",
    "gsap/Flip",
    "gsap/dist/Flip",
    "@gsap/react",
  ],
  banner: { js: '"use client";' },
  outExtension({ format }) {
    return { js: format === "esm" ? ".mjs" : ".cjs" };
  },
});
