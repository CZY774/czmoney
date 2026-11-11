// Tile screenshots side by side into one image. Usage: node sheet.cjs out.png maxHeight img1 img2 ...
const { chromium } = require(process.env.PLAYWRIGHT_CORE || "/home/czy/tamara/node_modules/playwright-core");
const path = require("path");
const EXE =
  process.env.CHROME_EXE || "/home/czy/.cache/ms-playwright/chromium_headless_shell-1234/chrome-headless-shell-linux64/chrome-headless-shell";
const [out, maxH, ...imgs] = process.argv.slice(2);
(async () => {
  const browser = await chromium.launch({ executablePath: EXE });
  const page = await browser.newPage({ viewport: { width: 800, height: 600 } });
  const cells = imgs
    .map((f) => `<figure><figcaption>${path.basename(f, ".png")}</figcaption><div style="max-height:${maxH}px;overflow:hidden"><img src="file://${path.resolve(f)}"></div></figure>`)
    .join("");
  const html = path.resolve(out + ".html");
  require("fs").writeFileSync(
    html,
    `<style>body{margin:0;background:#444;display:flex;gap:12px;align-items:flex-start;padding:8px;width:max-content}figure{margin:0}figcaption{color:#ff0;font:bold 16px monospace;padding:2px}img{display:block}</style>${cells}`,
  );
  await page.goto(`file://${html}`, { waitUntil: "load" });
  await page.screenshot({ path: out, fullPage: true });
  await browser.close();
})();
