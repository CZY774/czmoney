# Browser harness

Node scripts that drive czmoney in headless Chromium against the local dev
server. Supabase and `/api` are mocked inside the browser, so no account, key
or real data is involved: the user is "Pengguna Uji" (`uji@example.com`) and
the fixtures are at the top of `shoot.cjs`.

Recovered on 2026-11-11 from session transcripts, after the copies in `/tmp`
were wiped by a WSL restart.

## Running

```sh
npm run dev            # from the repo root, serves http://localhost:5173
cd tests/harness
node nav.cjs
```

Run the scripts from this folder. Output folders (`out/`, `out3/`) are relative
to the working directory, and `out*/` is gitignored here.

Two paths default to this machine and can be overridden:

- `PLAYWRIGHT_CORE`: defaults to `/home/czy/tamara/node_modules/playwright-core`
  (1.62.1). There is no copy in this repo's `node_modules`.
- `CHROME_EXE`: defaults to the `chromium_headless_shell-1234` build in
  `~/.cache/ms-playwright`, which matches that playwright-core version.

## Scripts

| Script | Checks | Passing result (2026-11-11) |
| --- | --- | --- |
| `shoot.cjs <outDir> [widths] [tags]` | Screenshot of each page at each width; horizontal overflow, clipped text and page errors. Tags are `in_` (signed in) or `out_` plus the path, e.g. `in_home,in_reports,out_auth_login` | every line `off=0 clip=0 err=0` |
| `form.cjs <outDir>` | "+" opens the add form on four device sizes, Cancel closes it, it reopens on the same page | `closedAfterCancel true`, `reopenedOnSamePage true`, `errors []` |
| `nav.cjs` | `__data.json` requests per tab click | 0 on all four tabs |
| `period.cjs` | Trends requests and x-axis labels per period button on Reports | 1 request on load, 0 per click, 6, 3 and 12 labels |
| `revisit.cjs` | Supabase and `/api` delayed 2000ms on a revisit; content 300ms after the click; a name typed into Settings survives the refresh | `ALL OK: true` |
| `order.cjs` | Dashboard section order at 390, 1024 and 1366 wide | Balance, Targets, Insights, Spending by category, Recent transactions |
| `active.cjs` | After each tab click at 390, 1024 and 1440: `aria-current` and text color of every tab; sidebar Settings at 1440; the mobile header close button on /settings, after an in-app visit and after a direct open | `tab highlight checks all ok: true`, both closes land on `/` |
| `info.cjs` | The info buttons on "Expense this year" and "4% rule target": open, note text, close, row height at 280, 344, 390 and 1440 | notes open and close; rows 23px from 344 up. At 280 the amount wraps under the label (43px), accepted |
| `sheet.cjs <out.png> <maxHeight> <img...>` | Utility: tiles screenshots side by side into one image | writes the image |

## How the files depend on each other

`form.cjs` starts with a copy of the first 196 lines of `shoot.cjs` (browser
setup, fixtures and mocks), then adds the form check after the
`// ---- form check` marker. `nav`, `order`, `period`, `revisit`, `active`
and `info` read `form.cjs`, keep everything above that marker, and `eval` it
with their own check appended. A change to fixtures or mocks has to go into both `shoot.cjs`
and `form.cjs`.

The folder is excluded from `npm run lint` (`.prettierignore` and the
`ignores` entry in `eslint.config.js`). The scripts use `require()` and are
kept as recovered rather than reformatted.
