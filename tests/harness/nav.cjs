// Counts server data requests (__data.json) on client-side tab navigation
const src = require("fs").readFileSync(__dirname + "/form.cjs", "utf8").split("// ---- form check")[0];
eval(src.replace('const outDir = process.argv[2];', 'const outDir = "out3";') + `
(async () => {
  const browser = await chromium.launch({ executablePath: EXE });
  const context = await browser.newContext({ viewport: { width: 1366, height: 900 } });
  await mock(context);
  await context.addInitScript(([k, v]) => { try { localStorage.setItem(k, v); localStorage.setItem("checklist_dismissed", "true"); } catch {} }, [STORAGE_KEY, JSON.stringify(session)]);
  const page = await context.newPage();
  await page.goto(BASE + "/", { waitUntil: "networkidle" });
  await page.waitForTimeout(800);
  const hits = [];
  page.on("request", (r) => { if (r.url().includes("__data.json")) hits.push(new URL(r.url()).pathname + new URL(r.url()).search); });
  for (const label of ["Transactions", "Budgets", "Reports", "Dashboard"]) {
    const before = hits.length;
    await page.locator("nav a", { hasText: label }).first().click();
    await page.waitForTimeout(1200);
    console.log(label, "->", page.url().replace(BASE, ""), "server data requests:", hits.length - before, hits.slice(before).join(" "));
  }
  await browser.close();
})();`);
