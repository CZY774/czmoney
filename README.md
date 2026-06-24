# CZmoneY

Personal finance PWA built with SvelteKit, Supabase, and Google Gemini API.

Live app: https://czmoney.vercel.app

This repository is intentionally documented conservatively. Do not claim financial accuracy, production-grade security, audited compliance, guaranteed uptime, or benchmarked performance unless there is dated evidence that can be shown during review.

## Stack

- SvelteKit 5
- TypeScript
- Tailwind CSS 4
- Supabase Auth and PostgreSQL
- ApexCharts
- Google Gemini API
- IndexedDB through `idb-keyval`
- Upstash Redis for optional server-side rate limiting and idempotency cache
- Vercel

## Features

- User authentication through Supabase.
- Dashboard for monthly income, expense, balance, recent transactions, and category charts.
- Transaction create, update, delete, filtering, search, and pagination.
- Budget management by expense category.
- Smart insights endpoint for budget alerts, spending projection, and savings target checks.
- AI monthly summary using Google Gemini, with cached summaries and stale-data indication.
- Reports page with CSV and PDF export.
- Supabase Realtime subscriptions for transaction refresh.
- Basic PWA support through a SvelteKit service worker, web manifest, and app icons.
- Offline viewing for previously cached dashboard and transaction data.
- Offline queue for transaction create and update operations.
- Toast notifications, confirmation dialogs, onboarding modal, empty states, and setup checklist.

## Limits

- This is a personal finance tracker, not financial advice.
- The database schema is managed outside this repository. Keep `src/lib/types/database.ts` synchronized with the actual Supabase schema.
- Some client-side flows call Supabase directly and rely on Row Level Security. Server API hardening does not cover every user action.
- The AI cache currently uses transaction count as a staleness signal, so edits that do not change the transaction count may require manual refresh.
- Offline support is limited to cached views and queued transaction create/update actions. Initial authentication and fresh data loading require internet access.
- There is no committed automated test suite yet.

## Project Structure

```text
src/
  lib/
    components/        App UI components
    config/            Validation, timeout, and cache constants
    middleware/        Server-side auth helper
    security/          Rate limiting and validation helpers
    services/          Supabase, sync, realtime, PDF, update, and error services
    stores/            Toast store
    types/             App and database TypeScript types
    utils/             Idempotency, performance, and idle logout helpers
  routes/
    +layout.svelte     App shell, navigation, auth state, onboarding, updates
    +page.svelte       Dashboard and public landing screen
    auth/              Login, register, forgot password, reset password
    budgets/           Budget management
    reports/           Reports, AI summary, CSV/PDF export
    settings/          Profile and offline sync controls
    transactions/      Transaction management
    api/               Server endpoints for transactions, insights, AI summary, trends, version
static/
  icon.svg
  icon-192.png
  icon-512.png
  favicon.ico
  manifest.json
  robots.txt
  sitemap.xml
```

## Environment Variables

Create `.env` from `.env.example`.

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
GEMINI_API_KEY=your-gemini-key
PUBLIC_APP_NAME=CZmoneY
PUBLIC_PWA_THEME_COLOR=#0b1221
UPSTASH_REDIS_REST_URL=https://your-redis.upstash.io
UPSTASH_REDIS_REST_TOKEN=your-redis-token
```

`VITE_*` variables are exposed to the browser. `SUPABASE_SERVICE_ROLE_KEY`, `GEMINI_API_KEY`, and Upstash credentials must stay server-side.

## Local Development

Install dependencies:

```bash
npm install
```

Run the development server:

```bash
npm run dev
```

Check before deployment:

```bash
npm run check
npm run lint
npm run build
```

## Deployment

The intended target is Vercel. Configure environment variables in Vercel before deploying.

If `npm run build` behaves differently on Windows/WSL, verify the same commit in Vercel or a clean native Node environment before treating it as a source-code failure.

## Security Notes

- Server endpoints authenticate bearer tokens before accessing protected data.
- Transaction and AI summary endpoints use Zod validation.
- Transaction descriptions and string fields are sanitized server-side for API writes.
- Transaction API requests use rate limiting with Upstash Redis when configured, with in-memory fallback for development.
- Transaction create/update requests support idempotency keys.
- Browser-accessible Supabase operations must be protected by the Supabase RLS policies in the deployed database.

## Known Review Items

- Add automated tests for transaction API behavior, offline sync, and AI summary cache invalidation.
- Review bundle size after each large dependency addition.
- Recheck `npm audit` output before deployment.
- Keep README claims aligned with implementation.

## License

Personal project. Add a formal license only if this repository is intended for reuse.
