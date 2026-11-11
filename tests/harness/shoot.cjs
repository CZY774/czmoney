// Responsive check for czmoney with mocked Supabase and API responses.
// Usage: node shoot.cjs <outDir> [widths,comma] [pages,comma]
const { chromium } = require(process.env.PLAYWRIGHT_CORE || "/home/czy/tamara/node_modules/playwright-core");
const fs = require("fs");
const path = require("path");

const BASE = "http://localhost:5173";
const SUPA = "https://vtrbewfceeihzhmuwxeh.supabase.co";
const STORAGE_KEY = "sb-vtrbewfceeihzhmuwxeh-auth-token";
const EXE =
  process.env.CHROME_EXE || "/home/czy/.cache/ms-playwright/chromium_headless_shell-1234/chrome-headless-shell-linux64/chrome-headless-shell";

const outDir = process.argv[2];
const DEVICES = {
  280: [280, 653, true], // Galaxy Fold cover (1st gen)
  320: [320, 568, true], // iPhone SE 1st gen
  344: [344, 882, true], // Galaxy Z Fold5 cover
  360: [360, 800, true],
  390: [390, 844, true],
  430: [430, 932, true],
  600: [600, 960, true],
  673: [673, 841, true], // Z Fold inner, portrait
  768: [768, 1024, true],
  820: [820, 1180, true],
  841: [841, 701, true], // Pixel Fold inner, landscape
  1024: [1024, 768, true],
  1119: [1119, 800, false],
  1120: [1120, 800, false],
  1280: [1280, 800, false],
  1440: [1440, 900, false],
  1920: [1920, 1080, false],
};
const widths = (process.argv[3] || Object.keys(DEVICES).join(",")).split(",").map(Number);
const AUTH_PAGES = ["/", "/transactions", "/budgets", "/reports", "/settings"];
const ANON_PAGES = ["/", "/auth/login", "/auth/register", "/auth/forgot-password"];
const pageFilter = process.argv[4] ? process.argv[4].split(",") : null;

// ---- fixtures ----
const now = new Date();
const ym = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
const thisMonth = ym(now);
const day = (n) => `${thisMonth}-${String(n).padStart(2, "0")}`;
const UID = "00000000-0000-4000-8000-000000000001";
const cats = [
  ["c1", "Salary", "income"], ["c2", "Freelance", "income"],
  ["c3", "Food & Drink", "expense"], ["c4", "Transport", "expense"],
  ["c5", "Shopping", "expense"], ["c6", "Bills & Utilities", "expense"],
  ["c7", "Entertainment", "expense"], ["c8", "Healthcare", "expense"],
  ["c9", "Personal Care", "expense"], ["c10", "Education", "expense"],
  ["c11", "Other", "expense"],
].map(([id, name, type]) => ({ id, user_id: UID, name, type, color: null, created_at: "2026-01-01" }));
const catName = Object.fromEntries(cats.map((c) => [c.id, c.name]));
const txSpec = [
  [22, "c1", "income", 12500000, "Gaji bulanan PT Contoh Sejahtera Abadi"],
  [21, "c3", "expense", 87500, "Makan siang nasi padang"],
  [21, "c4", "expense", 25000, "Gojek ke kampus"],
  [20, "c6", "expense", 1250000, "Pembayaran langganan internet rumah bulan Oktober plus biaya pemasangan ulang router"],
  [19, "c5", "expense", 459000, "Sepatu"],
  [18, "c2", "income", 3250000, "Proyek landing page klien"],
  [17, "c7", "expense", 150000, "Bioskop"],
  [16, "c8", "expense", 320000, "Obat dan konsultasi dokter"],
  [15, "c9", "expense", 20000, "Potong rambut"],
  [14, "c11", "expense", 52500, "Parkir dan lain-lain"],
  [12, "c3", "expense", 1234567, "Belanja bulanan supermarket"],
  [10, "c10", "expense", 2750000, "Buku dan kursus online"],
  [8, "c4", "expense", 400000, "Bensin"],
  [5, "c3", "expense", 64000, "Kopi"],
  [2, null, "expense", 15000, "Tanpa kategori"],
];
const transactions = txSpec.map(([d, cid, type, amount, description], i) => ({
  id: `t${i + 1}`, user_id: UID, txn_date: day(Math.min(d, now.getDate())), category_id: cid,
  type, amount, description, created_at: `${day(Math.min(d, now.getDate()))}T10:00:00Z`,
  categories: cid ? { name: catName[cid] } : null,
}));
const budgets = [
  ["b1", "c3", 2500000], ["b2", "c4", 750000], ["b3", "c6", 1500000], ["b4", "c5", 1000000],
].map(([id, category_id, monthly_limit]) => ({
  id, user_id: UID, category_id, monthly_limit, alert_threshold: 80, created_at: "2026-01-01",
  categories: { name: catName[category_id] },
}));
const profile = {
  id: UID, full_name: "Pengguna Uji Dengan Nama Yang Cukup Panjang", preferred_currency: "IDR",
  monthly_income: 15750000, savings_target: 3000000, created_at: "2026-01-01",
  last_transaction_at: null, onboarding_completed: true,
};
const snapshots = [
  { id: "s1", user_id: UID, as_of: "2026-09-03", amount: 230000000, created_at: "2026-09-03" },
  { id: "s2", user_id: UID, as_of: "2026-06-01", amount: 198500000, created_at: "2026-06-01" },
  { id: "s3", user_id: UID, as_of: "2026-03-01", amount: 175250000, created_at: "2026-03-01" },
];
function trends(period) {
  const months = [];
  for (let i = period - 1; i >= 0; i--) months.push(ym(new Date(now.getFullYear(), now.getMonth() - i, 1)));
  const base = {
    "Food & Drink": 1400000, Transport: 450000, Shopping: 600000, "Bills & Utilities": 1250000,
    Entertainment: 200000, Healthcare: 150000, "Personal Care": 60000, Education: 300000, Other: 50000,
  };
  return {
    months,
    categories: Object.entries(base).map(([name, v], ci) => ({
      name,
      amounts: months.map((m, i) =>
        name === "Education" && m.endsWith("-03") ? 13000000 : Math.round(v * (0.7 + ((i * 7 + ci * 3) % 6) / 10)),
      ),
    })),
  };
}

const json = (route, body, status = 200, headers = {}) =>
  route.fulfill({ status, contentType: "application/json", headers: { "access-control-allow-origin": "*", "access-control-expose-headers": "content-range", ...headers }, body: JSON.stringify(body) });

async function mock(context) {
  await context.route(`${SUPA}/**`, async (route) => {
    const req = route.request();
    const url = new URL(req.url());
    const method = req.method();
    if (method === "OPTIONS") return route.fulfill({ status: 204, headers: { "access-control-allow-origin": "*", "access-control-allow-headers": "*", "access-control-allow-methods": "*" } });
    const single = (req.headers()["accept"] || "").includes("vnd.pgrst.object");
    const p = url.pathname;
    if (p.startsWith("/auth/v1/user")) return json(route, session.user);
    if (p.startsWith("/auth/v1/")) return json(route, session);
    if (p === "/rest/v1/rpc/expense_total") {
      const body = JSON.parse(req.postData() || "{}");
      const y = now.getFullYear();
      if (body.p_from === `${y}-01-01`) return json(route, 51900724);
      if (body.p_from === `${y - 1}-01-01`) return json(route, 30703956);
      return json(route, 59694016);
    }
    if (method !== "GET" && method !== "HEAD") return json(route, single ? {} : [], 201);
    const table = p.replace("/rest/v1/", "");
    let rows = { transactions, categories: cats, budgets, profiles: [profile], investment_snapshots: snapshots }[table] || [];
    if (table === "categories" && url.searchParams.get("type") === "eq.expense") rows = rows.filter((c) => c.type === "expense");
    if (table === "budgets" && url.searchParams.get("select") === "id") rows = rows.slice(0, 1);
    if (method === "HEAD") return route.fulfill({ status: 200, headers: { "content-range": `0-${rows.length - 1}/${rows.length}`, "access-control-allow-origin": "*", "access-control-expose-headers": "content-range" } });
    const limit = Number(url.searchParams.get("limit") || 0);
    if (limit) rows = rows.slice(0, limit);
    if (single) return json(route, rows[0] ?? null);
    return json(route, rows, 200, { "content-range": `0-${rows.length - 1}/${rows.length}` });
  });
  await context.route(`${BASE}/api/**`, async (route) => {
    const url = new URL(route.request().url());
    const p = url.pathname;
    if (p === "/api/reports/category-trends") return json(route, { success: true, data: trends(Number(url.searchParams.get("period") || 3)) });
    if (p === "/api/insights") return json(route, { insights: [
      { severity: "high", title: "Food & Drink is 34% above your usual month", message: "You spent Rp 1.386.067 on food so far, against Rp 1.034.000 on average for the same days in the last three months." },
      { severity: "low", title: "Transport is steady", message: "Within 5% of last month." },
    ] });
    if (p === "/api/ai-summary") return json(route, { summary: "Pengeluaran bulan ini didominasi Bills & Utilities dan Education. Food & Drink naik dibanding rata-rata tiga bulan terakhir, terutama dari belanja bulanan.", generated_at: now.toISOString(), is_stale: false });
    return route.continue();
  });
  if (context.routeWebSocket) await context.routeWebSocket(/supabase\.co/, () => {});
}

const b64 = (o) => Buffer.from(JSON.stringify(o)).toString("base64url");
const exp = Math.floor(Date.now() / 1000) + 86400;
const session = {
  access_token: `${b64({ alg: "HS256", typ: "JWT" })}.${b64({ sub: UID, exp, role: "authenticated", aud: "authenticated", email: "uji@example.com" })}.sig`,
  refresh_token: "fake-refresh", token_type: "bearer", expires_in: 86400, expires_at: exp,
  user: { id: UID, aud: "authenticated", role: "authenticated", email: "uji@example.com", app_metadata: { provider: "email" }, user_metadata: {}, created_at: "2026-01-01T00:00:00Z" },
};

async function overflowReport(page) {
  return page.evaluate(() => {
    const vw = document.documentElement.clientWidth;
    const sw = document.documentElement.scrollWidth;
    const offenders = [];
    for (const el of document.querySelectorAll("body *")) {
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) continue;
      const cs = getComputedStyle(el);
      if (cs.position === "fixed" && r.right <= vw + 1) continue;
      // skip things clipped by a scrolling/hidden ancestor
      let clipped = false;
      for (let a = el.parentElement; a && a !== document.body; a = a.parentElement) {
        const ox = getComputedStyle(a).overflowX;
        if (ox !== "visible") { const ar = a.getBoundingClientRect(); if (ar.right <= vw + 1) clipped = true; break; }
      }
      if (clipped) continue;
      if (r.right > vw + 1 || r.left < -1) {
        const id = el.id ? `#${el.id}` : "";
        const cls = (el.getAttribute("class") || "").split(/\s+/).slice(0, 4).join(".");
        offenders.push(`${el.tagName.toLowerCase()}${id}${cls ? "." + cls : ""} [${Math.round(r.left)}..${Math.round(r.right)}] "${(el.textContent || "").trim().slice(0, 40)}"`);
      }
    }
    // also: text clipped inside its own box (scrollWidth > clientWidth with overflow hidden)
    const clippedText = [];
    for (const el of document.querySelectorAll("body *")) {
      const cs = getComputedStyle(el);
      if ((cs.overflowX === "hidden" || cs.overflow === "hidden") && el.scrollWidth > el.clientWidth + 1 && el.children.length === 0 && cs.textOverflow !== "ellipsis" && el.clientWidth > 1) {
        clippedText.push(`${el.tagName.toLowerCase()} "${(el.textContent || "").trim().slice(0, 40)}"`);
      }
    }
    return { vw, sw, horizontalScroll: sw > vw, offenders: offenders.slice(0, 12), offenderCount: offenders.length, clippedText: clippedText.slice(0, 8) };
  });
}

(async () => {
  fs.mkdirSync(outDir, { recursive: true });
  const browser = await chromium.launch({ executablePath: EXE });
  const results = [];
  for (const auth of [true, false]) {
    for (const pagePath of auth ? AUTH_PAGES : ANON_PAGES) {
      const tag = `${auth ? "in" : "out"}${pagePath === "/" ? "_home" : pagePath.replace(/\//g, "_")}`;
      if (pageFilter && !pageFilter.includes(tag)) continue;
      for (const w of widths) {
        const [vw, vh, mobile] = DEVICES[w] || [w, 900, w < 1024];
        const context = await browser.newContext({ viewport: { width: vw, height: vh }, isMobile: mobile, hasTouch: mobile, deviceScaleFactor: 1, reducedMotion: "reduce" });
        await mock(context);
        if (auth) {
          await context.addInitScript(([k, v]) => {
            try {
              localStorage.setItem(k, v);
              localStorage.setItem("checklist_dismissed", "true");
            } catch {}
          }, [STORAGE_KEY, JSON.stringify(session)]);
        }
        const page = await context.newPage();
        const errors = [];
        page.on("pageerror", (e) => errors.push(String(e.message).slice(0, 160)));
        page.on("console", (m) => { if (m.type() === "error") errors.push(m.text().slice(0, 160)); });
        try {
          await page.goto(BASE + pagePath, { waitUntil: "networkidle", timeout: 30000 });
        } catch (e) { errors.push("goto: " + e.message.slice(0, 120)); }
        await page.waitForTimeout(pagePath === "/reports" ? 1800 : 700);
        const rep = await overflowReport(page);
        const file = path.join(outDir, `${tag}_${w}.png`);
        await page.screenshot({ path: file, fullPage: true });
        results.push({ page: tag, w, url: page.url().replace(BASE, ""), ...rep, errors: errors.filter((e) => !/WebSocket|realtime|favicon|ERR_|Failed to load resource|vercel-scripts/i.test(e)).slice(0, 5) });
        await context.close();
      }
    }
  }
  await browser.close();
  fs.writeFileSync(path.join(outDir, "report.json"), JSON.stringify(results, null, 1));
  for (const r of results) {
    const flag = r.horizontalScroll || r.offenderCount || r.errors.length || r.clippedText.length ? "!!" : "ok";
    console.log(`${flag} ${r.page} ${r.w} url=${r.url} sw=${r.sw}/${r.vw} off=${r.offenderCount} clip=${r.clippedText.length} err=${r.errors.length}`);
  }
})();
