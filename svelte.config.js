import adapter from "@sveltejs/adapter-vercel";
import { vitePreprocess } from "@sveltejs/vite-plugin-svelte";

/** @type {import('@sveltejs/kit').Config} */
const config = {
  preprocess: vitePreprocess(),
  kit: {
    adapter: adapter({
      runtime: "nodejs20.x",
    }),
    csp: {
      mode: "auto",
      directives: {
        "default-src": ["self"],
        "script-src": ["self", "unsafe-inline", "unsafe-eval"],
        "style-src": ["self", "unsafe-inline"],
        "img-src": ["self", "data:", "https:"],
        "font-src": ["self", "data:"],
        "connect-src": [
          "self",
          "https://*.supabase.co",
          "wss://*.supabase.co",
          "https://generativelanguage.googleapis.com",
        ],
        "frame-ancestors": ["none"],
      },
    },
  },
};

export default config;
