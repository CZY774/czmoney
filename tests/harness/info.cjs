// Checks the Balance explanation toggles (Expense this year, 4% rule target) open, close and stay on one line at 390 and 1440 wide
const src = require("fs").readFileSync(__dirname + "/form.cjs", "utf8").split("// ---- form check")[0];
eval(src + `
(async () => {
  const browser = await chromium.launch({ executablePath: EXE });
  const errors = [];
  const sizes = [
    ["280", { viewport: { width: 280, height: 653 }, isMobile: true, hasTouch: true }],
    ["344", { viewport: { width: 344, height: 882 }, isMobile: true, hasTouch: true }],
    ["390", { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }],
    ["1440", { viewport: { width: 1440, height: 900 } }],
  ];
  const notes = [
    ["How expense this year is counted", "ytd-note"],
    ["What the 4% rule target means", "four-percent-note"],
  ];
  fs.mkdirSync("out", { recursive: true });
  for (const [width, opts] of sizes) {
    const context = await browser.newContext(opts);
    await mock(context);
    await context.addInitScript(([k, v]) => { try { localStorage.setItem(k, v); localStorage.setItem("checklist_dismissed", "true"); } catch {} }, [STORAGE_KEY, JSON.stringify(session)]);
    const page = await context.newPage();
    page.on("pageerror", (e) => errors.push(width + " " + e.message));
    await page.goto(BASE + "/", { waitUntil: "networkidle" });
    const balance = page.locator('section[aria-labelledby="h-balance"]');
    await balance.waitFor();
    console.log("== " + width + "px");
    await page.locator('section[aria-labelledby="h-balance"] dl > div').first().waitFor();
    const rowHeights = await page.locator('section[aria-labelledby="h-balance"] dl > div').evaluateAll((rows) =>
      rows.map((r) => ({ label: r.querySelector("dt").textContent.trim(), height: Math.round(r.getBoundingClientRect().height) })),
    );
    for (const r of rowHeights) console.log("  row height before open:", r.label, r.height + "px");
    for (const [label, id] of notes) {
      const btn = page.locator('button[aria-label="' + label + '"]');
      await btn.waitFor();
      console.log(label, "| aria-expanded before:", await btn.getAttribute("aria-expanded"));
      await btn.click();
      await page.waitForTimeout(300);
      const noteCount = await page.locator("#" + id).count();
      const noteText = noteCount ? (await page.locator("#" + id).textContent()).trim() : "(missing)";
      const sameLine = await btn.evaluate((b) => {
        const dt = b.closest("dt");
        const dd = dt.nextElementSibling.nextElementSibling;
        return Math.abs(dt.getBoundingClientRect().top - dd.getBoundingClientRect().top) <= 4;
      });
      console.log("  aria-expanded after:", await btn.getAttribute("aria-expanded"));
      console.log("  note:", noteText);
      console.log("  label and amount on same line:", sameLine);
    }
    await balance.screenshot({ path: "out/info_" + width + ".png" });
    console.log("  screenshot: out/info_" + width + ".png (both open)");
    for (const [label, id] of notes) {
      const btn = page.locator('button[aria-label="' + label + '"]');
      await btn.click();
      await page.waitForTimeout(300);
      const gone = (await page.locator("#" + id).count()) === 0;
      console.log("closed again:", label, "| aria-expanded:", await btn.getAttribute("aria-expanded"), "| note gone:", gone);
    }
    await context.close();
  }
  console.log("pageerrors:", JSON.stringify(errors));
  await browser.close();
})();`);
