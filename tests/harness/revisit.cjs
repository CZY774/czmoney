// Revisit check: each page shows cached data at once while Supabase and /api are slow (2000ms).
const src = require("fs").readFileSync(__dirname + "/form.cjs", "utf8").split("// ---- form check")[0];
eval(src.replace('const outDir = process.argv[2];', 'const outDir = "out3";') + `
(async () => {
  const browser = await chromium.launch({ executablePath: EXE });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await mock(context);
  await context.addInitScript(([k, v]) => { try { localStorage.setItem(k, v); localStorage.setItem("checklist_dismissed", "true"); } catch {} }, [STORAGE_KEY, JSON.stringify(session)]);
  const page = await context.newPage();
  const nav = (label) => page.locator("nav a:visible", { hasText: label }).first();

  // 1. Fill the cache: one normal visit to each page
  await page.goto(BASE + "/", { waitUntil: "networkidle" });
  for (const label of ["Transactions", "Budgets", "Reports", "Settings"]) {
    await nav(label).click();
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1000);
  }

  // 2. Delay Supabase and /api responses by 2000ms (the mocks still answer, just late)
  const delay = async (route) => { await new Promise((r) => setTimeout(r, 2000)); return route.fallback(); };
  await context.route(SUPA + "/**", delay);
  await context.route(BASE + "/api/**", delay);

  // 3. Revisit each page; read state 300ms after the click
  const checks = {
    Transactions: { content: 'text=Gaji bulanan >> visible=true' },
    Budgets: { content: 'button:visible >> text=Delete' },
    Reports: { content: '.apexcharts-canvas:visible' },
    Settings: { content: 'h2:visible >> text=Invested assets' },
  };
  const results = [];
  for (const label of ["Transactions", "Budgets", "Reports", "Settings"]) {
    await nav(label).click();
    await page.waitForTimeout(300);
    const loadingText = await page.locator("p:visible").filter({ hasText: /^Loading$/ }).count();
    const pulse = await page.locator(".animate-pulse:visible").count();
    const content = await page.locator(checks[label].content).count();
    const deleteBtns = await page.locator("button:visible", { hasText: "Delete" }).count();
    const ok = loadingText === 0 && pulse === 0 && content > 0;
    results.push(ok);
    console.log(label.padEnd(13), "| loadingText:", loadingText, "| pulse:", pulse, "| content:", content, "| delete buttons:", deleteBtns, "|", ok ? "OK" : "FAIL");
    await page.waitForTimeout(2500);
  }

  // 4. Typing during the delay is not overwritten when the profile response arrives
  await nav("Dashboard").click();
  await page.waitForTimeout(300);
  await nav("Settings").click();
  const input = page.locator("#full-name");
  await input.waitFor({ state: "visible" });
  await input.fill("Typed by test");
  await page.waitForTimeout(2500);
  const value = await input.inputValue();
  console.log("Settings typed name kept:", value === "Typed by test", "| value:", JSON.stringify(value));
  await browser.close();
  console.log("ALL OK:", results.every(Boolean) && value === "Typed by test");
})();`);
