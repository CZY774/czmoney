// Checks the Log out button beside the Settings title at 280, 390 and 1440 wide, then that clicking it signs out
const src = require("fs").readFileSync(__dirname + "/form.cjs", "utf8").split("// ---- form check")[0];
eval(src + `
(async () => {
  const sizes = [
    { width: 280, height: 653, mobile: true },
    { width: 390, height: 844, mobile: true },
    { width: 1440, height: 900, mobile: false },
  ];
  const pageErrors = [];
  const browser = await chromium.launch({ executablePath: EXE });
  for (const s of sizes) {
    const context = await browser.newContext({
      viewport: { width: s.width, height: s.height },
      isMobile: s.mobile,
      hasTouch: s.mobile,
    });
    await mock(context);
    await context.addInitScript(([k, v]) => { try { localStorage.setItem(k, v); localStorage.setItem("checklist_dismissed", "true"); } catch {} }, [STORAGE_KEY, JSON.stringify(session)]);
    const page = await context.newPage();
    page.on("pageerror", (e) => pageErrors.push(s.width + ": " + e.message));
    await page.goto(BASE + "/settings", { waitUntil: "networkidle" });
    await page.waitForSelector("h1");
    await page.waitForTimeout(500);
    const info = await page.evaluate(() => {
      const btns = [...document.querySelectorAll("button")].filter((b) => b.textContent.trim() === "Log out");
      const btn = btns[0];
      const h1 = document.querySelector("h1").getBoundingClientRect();
      const r = btn ? btn.getBoundingClientRect() : null;
      const visible = !!r && r.bottom <= window.innerHeight && r.top >= 0;
      const overlap = r ? Math.min(r.bottom, h1.bottom) - Math.max(r.top, h1.top) : 0;
      return {
        visible,
        top: r ? Math.round(r.top) : null,
        bottom: r ? Math.round(r.bottom) : null,
        h1Top: Math.round(h1.top),
        h1Bottom: Math.round(h1.bottom),
        sameRow: overlap > 0,
        overlapPx: Math.round(overlap),
        count: btns.length,
        scrollWidth: document.documentElement.scrollWidth,
        innerWidth: window.innerWidth,
      };
    });
    await page.getByRole("button", { name: "Log out", exact: true }).click();
    await page.waitForTimeout(1000);
    const after = page.url().replace(BASE, "");
    console.log(
      s.width + "x" + s.height +
      " visibleWithoutScroll=" + info.visible +
      " top=" + info.top + " bottom=" + info.bottom +
      " h1=" + info.h1Top + ".." + info.h1Bottom +
      " sameRow=" + info.sameRow + " overlapPx=" + info.overlapPx +
      " logoutButtons=" + info.count +
      " scrollWidth=" + info.scrollWidth + " innerWidth=" + info.innerWidth +
      " noHorizontalScroll=" + (info.scrollWidth <= info.innerWidth) +
      " urlAfterClick=" + after
    );
    await context.close();
  }
  await browser.close();
  console.log("pageerrors " + JSON.stringify(pageErrors));
})();`);
