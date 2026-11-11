// Counts category-trends requests and trend x-axis labels per period button on /reports
const src = require("fs").readFileSync(__dirname + "/form.cjs", "utf8").split("// ---- form check")[0];
eval(src.replace('const outDir = process.argv[2];', 'const outDir = "out3";') + `
(async () => {
  const browser = await chromium.launch({ executablePath: EXE });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  await mock(context);
  await context.addInitScript(([k, v]) => { try { localStorage.setItem(k, v); localStorage.setItem("checklist_dismissed", "true"); } catch {} }, [STORAGE_KEY, JSON.stringify(session)]);
  const page = await context.newPage();
  let trendHits = 0;
  page.on("request", (r) => { if (r.url().includes("category-trends")) trendHits++; });
  await page.goto(BASE + "/reports", { waitUntil: "networkidle" });
  await page.waitForTimeout(2000);
  console.log("initial load category-trends requests:", trendHits);
  trendHits = 0;
  for (const label of ["6 months", "3 months", "12 months"]) {
    await page.locator('button[aria-label="' + label + '"]').first().click();
    await page.waitForTimeout(1000);
    const labels = await page.locator(".chart-container .apexcharts-xaxis-label").count();
    console.log(label, "click -> category-trends requests:", trendHits, "| trend x-axis labels:", labels);
    trendHits = 0;
  }
  await browser.close();
})();`);
