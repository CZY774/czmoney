// Checks the active nav highlight at three widths, the mobile Settings close button and page errors
const src = require("fs").readFileSync(__dirname + "/form.cjs", "utf8").split("// ---- form check")[0];
eval(src + `
(async () => {
  const VIEWPORTS = [
    { name: "390x844", width: 390, height: 844, opts: { isMobile: true, hasTouch: true } },
    { name: "1024x768", width: 1024, height: 768, opts: { isMobile: true } },
    { name: "1440x900", width: 1440, height: 900, opts: {} },
  ];
  const TABS = ["Dashboard", "Transactions", "Budgets", "Reports"];
  const CLICKS = ["Transactions", "Budgets", "Reports", "Dashboard"];
  const pageErrors = [];
  const results = [];
  const browser = await chromium.launch({ executablePath: EXE });

  async function newPage(vp) {
    const context = await browser.newContext({ viewport: { width: vp.width, height: vp.height }, ...vp.opts });
    await mock(context);
    await context.addInitScript(([k, v]) => { try { localStorage.setItem(k, v); localStorage.setItem("checklist_dismissed", "true"); } catch {} }, [STORAGE_KEY, JSON.stringify(session)]);
    const page = await context.newPage();
    page.on("pageerror", (e) => pageErrors.push(vp.name + " " + e.message));
    return { context, page };
  }

  async function tabState(page) {
    const rows = [];
    for (const label of TABS) {
      const link = page.locator("nav a", { hasText: label }).first();
      rows.push({
        label,
        current: await link.getAttribute("aria-current"),
        color: await link.evaluate((el) => getComputedStyle(el).color),
      });
    }
    return rows;
  }

  function printTabs(rows) {
    for (const r of rows) console.log("  " + r.label + " aria-current=" + r.current + " color=" + r.color);
    const cur = rows.filter((r) => r.current === "page");
    const others = rows.filter((r) => r.current !== "page");
    const ok = cur.length === 1 && others.every((o) => o.color !== cur[0].color);
    console.log("  current: " + (cur.map((r) => r.label).join(",") || "none") + " exactly one and distinct color: " + ok);
    return ok;
  }

  for (const vp of VIEWPORTS) {
    console.log("== " + vp.name);
    const { context, page } = await newPage(vp);
    await page.goto(BASE + "/", { waitUntil: "networkidle" });
    await page.waitForTimeout(800);
    for (const label of CLICKS) {
      await page.locator("nav a", { hasText: label }).first().click();
      await page.waitForTimeout(800);
      console.log(" after click " + label + " url=" + page.url().replace(BASE, ""));
      results.push(printTabs(await tabState(page)));
    }

    if (vp.name === "1440x900") {
      await page.locator('nav a[href="/settings"]').first().click();
      await page.waitForTimeout(800);
      const s = page.locator('nav a[href="/settings"]').first();
      console.log(" sidebar Settings url=" + page.url().replace(BASE, "") + " aria-current=" + (await s.getAttribute("aria-current")) + " color=" + (await s.evaluate((el) => getComputedStyle(el).color)));
    }

    if (vp.name === "390x844") {
      await page.locator('header a[aria-label="Settings"]').click();
      await page.waitForTimeout(800);
      console.log(" header Settings click url=" + page.url().replace(BASE, ""));
      const closeBtn = page.locator('header button[aria-label="Close settings"]');
      console.log(" Close settings visible=" + (await closeBtn.isVisible()));
      await closeBtn.click();
      await page.waitForTimeout(800);
      console.log(" Close after in-app navigation url=" + page.url().replace(BASE, ""));

      await page.goto(BASE + "/settings", { waitUntil: "networkidle" });
      await page.waitForTimeout(800);
      console.log(" direct open url=" + page.url().replace(BASE, "") + " Close settings visible=" + (await page.locator('header button[aria-label="Close settings"]').isVisible()));
      await page.locator('header button[aria-label="Close settings"]').click();
      await page.waitForTimeout(800);
      console.log(" Close after direct open url=" + page.url().replace(BASE, ""));
    }

    await context.close();
  }

  await browser.close();
  console.log("tab highlight checks all ok: " + results.every(Boolean));
  console.log("pageerrors: " + (pageErrors.length ? pageErrors.join(" | ") : "none"));
})();`);
