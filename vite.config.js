import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
// base './' makes the built site work on GitHub Pages (https://<user>.github.io/<repo>/) and anywhere else.
export default defineConfig({ plugins: [react()], base: "./" });
