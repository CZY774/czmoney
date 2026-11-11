// Offline queue checks: offline toast, failed sends kept in the queue, retry, discard and startup sync
const src = require("fs").readFileSync(__dirname + "/form.cjs", "utf8").split("// ---- form check")[0];
eval(src + `
(async () => {
  const browser = await chromium.launch({ executablePath: EXE });
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 1, reducedMotion: "reduce" });
  await mock(context);
  await context.addInitScript(([k, v]) => { try { localStorage.setItem(k, v); localStorage.setItem("checklist_dismissed", "true"); } catch {} }, [STORAGE_KEY, JSON.stringify(session)]);

  let apiMode = "ok";
  let apiCalls = 0;
  let postCalls = 0;
  const events = [];
  let postInFlight = 0;
  let maxPostInFlight = 0;
  await context.route(BASE + "/api/transactions", async (route) => {
    apiCalls++;
    const isPost = route.request().method() === "POST";
    if (isPost) {
      postCalls++;
      events.push("POST");
      postInFlight++;
      maxPostInFlight = Math.max(maxPostInFlight, postInFlight);
    }
    try {
      // slowfail answers 500 after 1500ms, so a run stays in flight long enough to race
      if (apiMode === "slowfail") {
        await new Promise((r) => setTimeout(r, 1500));
        return json(route, { error: "test" }, 500);
      }
      if (apiMode === "fail") return json(route, { error: "test" }, 500);
      return json(route, { success: true, data: {} }, 200);
    } finally {
      if (isPost) postInFlight--;
    }
  });

  const page = await context.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e.message).slice(0, 160)));
  page.on("framenavigated", (f) => { if (f === page.mainFrame()) events.push("nav"); });

  const results = [];
  const check = (name, ok, extra = "") => { results.push(!!ok); console.log(\`\${ok ? "PASS" : "FAIL"} \${name}\${extra ? " " + extra : ""}\`); };
  const sleep = (ms) => page.waitForTimeout(ms);
  const header = async () => (await page.locator("header").first().innerText()).replace(/\\s+/g, " ").trim();
  const seen = async (text, timeout = 6000, exact = false) => {
    try { await page.getByText(text, { exact }).first().waitFor({ state: "visible", timeout }); return true; } catch { return false; }
  };
  const gone = async (text) => (await page.getByText(text).count()) === 0;
  // Dev-server route chunks and page data cannot load offline, so the form is
  // opened while online and the submit happens after going offline.
  const addOffline = async (description) => {
    await context.setOffline(false);
    await sleep(500);
    await page.locator('a[aria-label="Add transaction"]').first().click();
    await page.locator("#txn-amount").waitFor({ state: "visible", timeout: 10000 });
    await context.setOffline(true);
    await sleep(800);
    await page.locator("#txn-amount").fill("12345");
    await page.locator("#txn-description").fill(description);
    await page.locator("form:has(#txn-amount) button[type=submit]").click();
    return seen("saved offline", 8000);
  };

  // 1
  await page.goto(BASE + "/", { waitUntil: "networkidle" });
  await sleep(800);
  const h1 = await header();
  check("1 header has no sync label when synced", !/Synced|Syncing|Offline|not synced/.test(h1), JSON.stringify(h1));

  // 2
  await context.setOffline(true);
  await sleep(1000);
  await context.setOffline(false);
  await sleep(3500);
  check("2 flap: no offline toast", (await page.getByText("You're offline").count()) === 0);

  // 3
  await context.setOffline(true);
  await sleep(3500);
  const h3 = await header();
  const toast3 = await seen("You're offline", 1000);
  check("3 offline label and toast", h3.includes("Offline") && toast3, JSON.stringify(h3));

  // 4
  const saved = await addOffline("Harness offline item");
  check("4 saved offline toast", saved);

  // 5
  apiMode = "fail";
  await context.setOffline(false);
  const err5 = await seen("1 transaction could not be synced", 10000);
  const h5 = await header();
  check("5 error toast after failed send", err5);
  check("5 header shows 1 not synced", h5.includes("1 not synced"), JSON.stringify(h5));

  // 6
  for (let i = 1; i <= 3; i++) {
    await context.setOffline(true);
    await sleep(3500);
    await context.setOffline(false);
    await sleep(3500);
    const h = await header();
    check(\`6.\${i} item still queued after retry cycle\`, h.includes("1 not synced"), JSON.stringify(h));
  }

  // 7
  await page.locator('a[aria-label="Settings"]').first().click();
  await page.getByRole("heading", { name: "Offline sync" }).waitFor({ timeout: 10000 });
  const row7 = await seen("Harness offline item", 6000);
  const amountOk = (await page.getByText(/Rp\\s12\\.345/).count()) > 0;
  const failedLine = await page.getByText(/Failed \\d+ times?/).first().innerText().catch(() => "");
  check("7 settings row with amount", row7 && amountOk);
  console.log("   failed line:", JSON.stringify(failedLine));

  // 8
  apiMode = "ok";
  await page.getByRole("button", { name: "Retry", exact: true }).first().click();
  const synced8 = await seen("Transaction synced", 6000, true);
  await sleep(800);
  const row8Gone = await gone("Harness offline item");
  const h8 = await header();
  check("8 retry success toast", synced8);
  check("8 row gone and header label gone", row8Gone && !/not synced/.test(h8), JSON.stringify(h8));

  // 9
  await context.setOffline(true);
  await sleep(3500);
  const saved9 = await addOffline("Harness item two");
  check("9a saved offline toast", saved9);
  apiMode = "fail";
  await context.setOffline(false);
  const err9 = await seen("1 transaction could not be synced", 10000);
  check("9b error toast", err9);
  await page.locator('a[aria-label="Settings"]').first().click();
  await page.getByRole("heading", { name: "Offline sync" }).waitFor({ timeout: 10000 });
  await seen("Harness item two", 6000);
  await page.getByRole("button", { name: "Discard", exact: true }).first().click();
  await page.getByRole("dialog").getByRole("button", { name: "Discard", exact: true }).click();
  await sleep(800);
  const h9 = await header();
  check("9c discard: row gone and header label gone", (await gone("Harness item two")) && !/not synced/.test(h9), JSON.stringify(h9));

  // 10
  await context.setOffline(true);
  await sleep(3500);
  const saved10 = await addOffline("Harness item three");
  check("10a saved offline toast", saved10);
  apiMode = "ok";
  await context.setOffline(false);
  events.push("reload");
  await page.reload({ waitUntil: "domcontentloaded" });
  const synced10 = await seen("1 transaction synced", 5000);
  await sleep(800);
  const h10 = await header();
  // The online event can send the queue from the old page before the reload commits; its toast then dies with the page
  const tail = events.slice(events.lastIndexOf("reload"));
  const oldPageSent = tail.indexOf("POST") !== -1 && tail.indexOf("POST") < tail.indexOf("nav");
  const winner = synced10 ? "startup on reloaded page" : oldPageSent ? "online event on old page (toast lost in reload)" : "neither";
  check("10b startup sync toast within 5s (or the online sync won the race)", synced10 || oldPageSent, winner);
  check("10c header label gone", !/not synced/.test(h10), JSON.stringify(h10));
  console.log("   event order:", events.join(" > "));

  // 10d: startup sync alone. The old page is closed first so no online event can send the queue.
  await context.setOffline(true);
  await sleep(3500);
  const saved10d = await addOffline("Harness item four");
  check("10d saved offline toast", saved10d);
  apiMode = "ok";
  await page.close();
  await context.setOffline(false);
  const page2 = await context.newPage();
  page2.on("pageerror", (e) => errors.push(String(e.message).slice(0, 160)));
  await page2.goto(BASE + "/", { waitUntil: "domcontentloaded" });
  const synced10d = await page2.getByText("1 transaction synced").first().waitFor({ state: "visible", timeout: 5000 }).then(() => true, () => false);
  await page2.waitForTimeout(800);
  const h10d = (await page2.locator("header").first().innerText()).replace(/\s+/g, " ").trim();
  check("10e fresh page startup sync toast within 5s", synced10d && !/not synced/.test(h10d), JSON.stringify(h10d));

  // 12: races. The module is imported inside the page, so it is the instance the app uses.
  const MOD = "/src/lib/services/sync.ts";
  // 12a: a discard during an in-flight send must not bring the item back
  apiMode = "slowfail";
  const r12a = await page2.evaluate(async () => {
    const m = await import("/src/lib/services/sync.ts");
    const wait = (ms) => new Promise((r) => setTimeout(r, ms));
    const id = await m.queueTransaction("create", { txn_date: "2026-11-11", type: "expense", amount: 777, description: "Race item" });
    await wait(300);
    const headerNow = document.querySelector("header").innerText.replace(/\\s+/g, " ").trim();
    const run = m.syncPendingTransactions();
    await wait(300);
    await m.discardPendingTransaction(id);
    await run;
    return { headerNow, left: (await m.listPendingTransactions()).length };
  });
  check("12a same module instance: header shows 1 not synced", r12a.headerNow.includes("1 not synced"), JSON.stringify(r12a.headerNow));
  check("12a discarded item not resurrected by failed send", r12a.left === 0, "left=" + r12a.left);

  // 12b: Retry during a run must not send the item concurrently with the run
  maxPostInFlight = 0;
  const post12bBefore = postCalls;
  const r12b = await page2.evaluate(async () => {
    const m = await import("/src/lib/services/sync.ts");
    const id = await m.queueTransaction("create", { txn_date: "2026-11-11", type: "expense", amount: 778, description: "Race retry item" });
    const run = m.syncPendingTransactions();
    const retry = m.retryPendingTransaction(id);
    const [runResult, retryOk] = await Promise.all([run, retry]);
    await m.discardPendingTransaction(id);
    return { runResult, retryOk, left: (await m.listPendingTransactions()).length };
  });
  const post12b = postCalls - post12bBefore;
  // The run fails (slowfail), so the retry legitimately sends again after it. The check is that the two never overlap.
  check("12b retry waits for the run (no concurrent POST for the item)", maxPostInFlight === 1, "POST calls=" + post12b + " maxConcurrent=" + maxPostInFlight + " runResult=" + JSON.stringify(r12b.runResult) + " retryOk=" + r12b.retryOk + " left=" + r12b.left);

  // 12c: when the run succeeds, Retry must not send the item a second time
  apiMode = "ok";
  const post12cBefore = postCalls;
  const r12c = await page2.evaluate(async () => {
    const m = await import("/src/lib/services/sync.ts");
    const id = await m.queueTransaction("create", { txn_date: "2026-11-11", type: "expense", amount: 779, description: "Race ok item" });
    const run = m.syncPendingTransactions();
    const retry = m.retryPendingTransaction(id);
    const [runResult, retryOk] = await Promise.all([run, retry]);
    return { runResult, retryOk, left: (await m.listPendingTransactions()).length };
  });
  const post12c = postCalls - post12cBefore;
  check("12c run succeeds, retry returns true without a second POST", post12c === 1 && r12c.retryOk === true && r12c.left === 0, "POST calls=" + post12c + " runResult=" + JSON.stringify(r12c.runResult) + " retryOk=" + r12c.retryOk + " left=" + r12c.left);
  apiMode = "ok";

  // 11
  console.log("POST /api/transactions calls total:", postCalls, "(all methods:", apiCalls + ")");
  console.log("pageerrors:", JSON.stringify(errors));
  console.log("ALL OK:", results.every(Boolean) && errors.length === 0);
  await browser.close();
})();`);
