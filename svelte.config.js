import adapter from "@sveltejs/adapter-vercel";
import { vitePreprocess } from "@sveltejs/vite-plugin-svelte";

/** @type {import('@sveltejs/kit').Config} */
const config = {
  preprocess: vitePreprocess(),
  kit: {
    adapter: adapter({
      runtime: "nodejs22.x",
      // Next to Supabase in Singapore. The default, iad1 (Washington DC), put
      // every database query on a Virginia to Singapore round trip.
      regions: ["sin1"],
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
