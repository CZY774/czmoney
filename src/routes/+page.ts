import type { PageLoad } from "./$types";

// Universal load: static data, so client-side navigation to / needs no server
// request. A +page.server.ts load costs a __data.json round trip per visit.
export const load: PageLoad = () => ({
  seo: {
    title: "CZmoneY - Personal Finance Manager with AI Insights",
    description:
      "Aplikasi manajemen keuangan pribadi dengan AI. Lacak pengeluaran, kelola budget, dan dapatkan insight keuangan cerdas. Gratis, offline-first, dan aman.",
    keywords:
      "aplikasi keuangan, manajemen keuangan pribadi, budget tracker, expense tracker, AI finance, keuangan Indonesia",
    canonical: "https://czmoney.vercel.app/",
    ogImage: "https://czmoney.vercel.app/icon-512.png",
  },
});
