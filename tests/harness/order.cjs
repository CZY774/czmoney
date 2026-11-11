// Prints dashboard section order (by on-screen top) at a few widths
const src = require("fs").readFileSync(__dirname + "/form.cjs", "utf8").split("// ---- form check")[0];
eval(src.replace('const outDir = process.argv[2];', 'const outDir = "out3";') + `
(async () => {
  const browser = await chromium.launch({ executablePath: EXE });
  for (const [vw, vh, mobile] of [[390, 844, true], [1024, 768, true], [1366, 901, false]]) {
    const context = await browser.newContext({ viewport: { width: vw, height: vh }, isMobile: mobile, hasTouch: mobile });
    await mock(context);
    await context.addInitScript(([k, v]) => { try { localStorage.setItem(k, v); localStorage.setItem("checklist_dismissed", "true"); } catch {} }, [STORAGE_KEY, JSON.stringify(session)]);
    const page = await context.newPage();
    await page.goto(BASE + "/", { waitUntil: "networkidle" });
    await page.waitForTimeout(600);
    const order = await page.evaluate(() => [...document.querySelectorAll("main h2")].map((h) => { const b = h.getBoundingClientRect(); return [h.textContent.trim().slice(0, 12), Math.round(b.left), Math.round(b.top)]; }));
    console.log(vw, JSON.stringify(order));
    await context.close();
  }
  await browser.close();
})();`);
