# CZmoneY - Personal Finance PWA

A modern, offline-first personal finance manager built with SvelteKit, Supabase, and AI-powered insights.

## Features

- 💰 **Transaction Management**: Track income and expenses with categories
- 🔍 **Smart Search**: Filter by month, category, type, and description
- 📊 **Visual Reports**: Interactive charts and monthly breakdowns with skeleton loaders
- 🤖 **AI Insights**: Get personalized financial advice powered by Google Gemini with smart cache invalidation
- 🎯 **Smart Alerts**: Budget tracking, overspending predictions, savings goals
- 📱 **PWA Support**: Install as mobile/desktop app with offline capability
- 🔄 **Offline Sync**: Work offline, sync automatically when online
- ⚡ **Realtime Updates**: Instant data refresh across all tabs using Supabase Realtime
- 📈 **Budget Management**: Set category budgets with customizable alerts
- 📥 **CSV Export**: Download transaction history
- 🔔 **Toast Notifications**: Professional UI feedback system (no more alerts!)
- 🌙 **Dark Theme**: Sleek, modern dark UI optimized for mobile
- 🔒 **Idempotency**: Prevents duplicate transactions on network retries
- 🚀 **Performance Optimized**: Pagination (50 items/page), centralized realtime subscriptions, batch queries
- ✨ **Perceived Speed**: Optimistic UI, instant feedback, prefetch navigation, lazy-loaded charts
- 🎯 **Smart Validation**: Strict data validation (amount limits, date ranges, description length)
- 🎓 **User Onboarding**: Welcome modal, empty states, and progress checklist for new users
- 🔄 **Auto Updates**: Version check and service worker update detection with user prompts

## Tech Stack

- **Frontend**: SvelteKit 5 + TypeScript + TailwindCSS 4
- **Database & Auth**: Supabase (PostgreSQL with RLS)
- **Charts**: ApexCharts (lazy-loaded)
- **AI**: Google Gemini API (Gemini 2.5 Flash)
- **Offline Storage**: IndexedDB (idb-keyval)
- **Rate Limiting**: Upstash Redis with in-memory fallback
- **Notifications**: Custom toast system with confirmation dialogs
- **Hosting**: Vercel (serverless functions)

## Prerequisites

- Node.js 18+ and npm
- Supabase account (free tier works)
- Google Gemini API key
- Vercel account (for deployment)
- Optional: Upstash Redis (for production rate limiting)

## Setup Instructions

### 1. Clone and Install

```bash
git clone <your-repo-url>
cd czmoney
npm install
```

### 2. Supabase Setup

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to Project Settings → API to get your credentials
3. Run the database setup SQL (contact repo owner for schema)
4. This will create all tables, indexes, RLS policies, triggers, and default categories

### 3. Environment Variables

Create a `.env` file in the root directory:

```bash
# Copy from .env.example
cp .env.example .env
```

Fill in your credentials:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
GEMINI_API_KEY=your-gemini-api-key
PUBLIC_APP_NAME=CZmoneY
PUBLIC_PWA_THEME_COLOR=#0b1221

# Optional: For production rate limiting
UPSTASH_REDIS_REST_URL=your-redis-url
UPSTASH_REDIS_REST_TOKEN=your-redis-token
```

**Important**:

- `VITE_*` variables are exposed to the client
- `SUPABASE_SERVICE_ROLE_KEY` and `GEMINI_API_KEY` are server-only (never expose to client)

### 4. Local Development

```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

### 5. Build for Production

```bash
npm run build
npm run preview  # Test production build locally
```

## Deployment to Vercel

### Option 1: Vercel CLI

```bash
npm install -g vercel
vercel login
vercel
```

### Option 2: GitHub Integration

1. Push your code to GitHub
2. Import project in [Vercel Dashboard](https://vercel.com/new)
3. Add environment variables in Project Settings → Environment Variables
4. Deploy!

### Environment Variables in Vercel

Add these in your Vercel project settings:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` (mark as sensitive)
- `GEMINI_API_KEY` (mark as sensitive)
- `PUBLIC_APP_NAME`
- `PUBLIC_PWA_THEME_COLOR`
- `UPSTASH_REDIS_REST_URL` (optional)
- `UPSTASH_REDIS_REST_TOKEN` (optional)

## Project Structure

```
czmoney/
├── src/
│   ├── lib/
│   │   ├── actions/          # Svelte actions (clickOutside)
│   │   ├── components/       # Reusable Svelte components
│   │   │   ├── ui/           # UI components (buttons, modals, etc.)
│   │   │   ├── Toast.svelte  # Toast notification system
│   │   │   ├── ConfirmDialog.svelte # Confirmation dialogs
│   │   │   └── SmartInsights.svelte # AI-powered insights
│   │   ├── config/           # Constants and configuration
│   │   ├── security/         # Rate limiting, sanitization, XSS protection
│   │   ├── services/         # Supabase, sync, cache, realtime manager
│   │   ├── stores/           # Svelte stores (toast, etc.)
│   │   ├── types/            # TypeScript definitions
│   │   ├── utils/            # Performance utilities, idempotency
│   │   └── utils.ts          # Helper functions
│   ├── routes/
│   │   ├── +layout.svelte    # Main layout with nav
│   │   ├── +page.svelte      # Dashboard with smart insights
│   │   ├── auth/             # Login/register pages
│   │   ├── transactions/     # Transaction management with pagination
│   │   ├── budgets/          # Budget management
│   │   ├── reports/          # Reports & AI summary with skeleton loaders
│   │   ├── settings/         # User settings
│   │   └── api/              # Server endpoints
│   │       ├── transactions/ # Transaction CRUD API
│   │       ├── insights/     # Smart insights API
│   │       └── ai-summary/   # AI-powered summaries with cache
│   └── app.css               # Global styles with mobile-first design
├── static/                   # PWA icons, manifest
└── package.json
```

## Usage

### First Time Setup

1. **Register**: Create an account at `/auth/register`
2. **Welcome Tour**: Complete the 4-step onboarding to learn key features
3. **Setup Checklist**: Follow the dashboard checklist to get started:
   - Add your first transaction
   - Set your monthly income in Settings
   - Create a budget
   - View your first report
4. **Profile**: Set your monthly income and savings target in Settings
5. **Budgets**: Set category budgets at `/budgets` for smart alerts

### User Onboarding

**Welcome Modal**:

- 4-step interactive tour on first login
- Learn about tracking, budgets, AI insights, and offline features
- Skip or complete to dismiss

**Empty States**:

- Dashboard shows helpful prompts when no data exists
- Clear call-to-action buttons guide next steps
- Contextual help throughout the app

**Progress Checklist**:

- Track your setup progress on dashboard
- Gamified completion with visual progress bar
- Dismissible after completion

### Smart Insights Features

**Budget Alerts**:

- Set monthly limits per category
- Get warnings at 80% usage (customizable)
- Critical alerts when exceeded

**Spending Predictions**:

- "You'll overspend by X this month"
- Based on daily spending patterns
- Alerts when approaching income limits

**Savings Goals**:

- Track progress toward monthly targets
- Alerts when falling behind
- Visual progress indicators

### Adding Transactions

- Click the + button (FAB) on dashboard
- Or go to Transactions → Add Transaction
- Select category, type (income/expense), amount, and optional description
- Works offline - syncs automatically when online
- Realtime updates across all open tabs
- Toast notifications for all actions

### Budget Management

1. Go to `/budgets`
2. Select category and set monthly limit
3. Customize alert threshold (default 80%)
4. View budget status on dashboard
5. Get smart alerts when approaching limits

### Searching Transactions

- **Month**: Select any month to view transactions
- **Category**: Filter by specific category
- **Type**: Filter by income or expense
- **Description**: Search by transaction description (debounced for performance)

### Generating AI Insights

1. Go to Reports page
2. Select a month
3. Click "Generate Summary"
4. Get personalized insights about spending patterns and recommendations
5. Streaming response for better UX

### Offline Mode

- App works completely offline
- Transactions are queued locally
- Auto-syncs when connection is restored
- Check sync status in Settings
- Toast notifications for offline actions

## Features in Detail

### Categories

Default categories are automatically created:

- **Income**: Salary, Freelance, Investment
- **Expense**: Food & Drink, Transport, Shopping, Entertainment, Bills & Utilities, Healthcare, Other

You can add custom categories in the database directly.

### Charts

- **Dashboard**: Monthly income vs expense bar chart + category donut chart
- **Reports**: Detailed category breakdown with horizontal bar chart
- **Lazy Loading**: Charts loaded on-demand for better performance

### CSV Export

Export your transaction history:

1. Go to Reports
2. Select month
3. Click "Export CSV"
4. File downloads as `transactions_YYYY-MM.csv`

### PWA Installation

**Mobile (Chrome/Safari)**:

- Visit the app
- Tap "Add to Home Screen" from browser menu
- App installs like a native app

**Desktop (Chrome/Edge)**:

- Visit the app
- Click install icon in address bar
- App opens in standalone window

### Notification System

**Toast Notifications**:

- Success (green) - 5 second duration
- Error (red) - 8 second duration
- Warning (yellow) - 5 second duration
- Info (blue) - 5 second duration
- Dismissible with action buttons

**Confirmation Dialogs**:

- Professional modal dialogs
- Keyboard navigation (ESC to close)
- Proper accessibility support

## Security Best Practices

✅ **Implemented**:

- Row Level Security (RLS) on all tables
- Server-only API keys (never exposed to client)
- Supabase Auth with secure session management
- HTTPS required for PWA features
- **Rate limiting** on all API endpoints (10 req/10s, AI: 3 req/min)
- **Input validation & sanitization** (Zod + xss library)
- **Security headers** (XSS, clickjacking, CSP protection)
- **CSRF protection** (SvelteKit built-in)
- **Idempotency keys** - Prevents duplicate operations
- **Request timeouts** - 10s for deletes, 15s for creates/updates
- **Strict data validation** - Amount limits (0.01-999M), date ranges (2000-next year), description length (500 chars)

⚠️ **Important**:

- Never commit `.env` file to version control
- Use environment secrets in Vercel
- Rotate API keys if exposed
- Set up Upstash Redis for production rate limiting (optional, falls back to in-memory)

## Performance Optimizations

### Perceived Speed Features

**Optimistic UI**:

- Transactions appear instantly before server confirmation
- Immediate feedback on all actions
- Rollback on errors with proper error messages

**Skeleton Loaders**:

- Content placeholders instead of blank screens
- Shows structure while data loads
- Used on dashboard, transactions, reports, and charts

**Realtime Updates**:

- Centralized subscription manager prevents memory leaks
- Instant data refresh across all tabs
- No manual refresh needed

**Instant Feedback**:

- Button press animations (`active:scale-95`)
- Smooth transitions on all interactions
- Loading states with clear messaging
- Toast notifications for immediate feedback

**Prefetch Navigation**:

- Hover/focus preloads next page data
- Near-instant page transitions
- Applied to all navigation links

**Lazy-loaded Charts**:

- ApexCharts imported on-demand
- Reduces initial bundle size

### Technical Optimizations

1. **Pagination**: 50 items per page on transactions (90%+ faster for large datasets)
2. **Batch Queries**: Promise.all for parallel data fetching (50% faster dashboard load)
3. **Redis Caching**: Categories and profiles cached for 1 hour (with memory fallback)
4. **Centralized Realtime**: Single subscription manager prevents duplicate channels (60% less memory)
5. **Smart AI Cache**: Tracks transaction changes, only regenerates when data is stale
6. **Database Triggers**: Auto-update last_transaction_at for intelligent cache invalidation
7. **Debounced Filters**: 300ms debounce on search inputs to reduce API calls
8. **Idempotency**: Prevents duplicate transactions on network retries/double-clicks
9. **Code Splitting**: SvelteKit handles this automatically
10. **Image Optimization**: WebP format for icons

## Idempotency

The app implements idempotency to prevent duplicate transactions:

- **Client-side**: Generates unique `Idempotency-Key` for each create/update request
- **Server-side**: Caches successful responses for 24 hours
- **Offline queue**: Stores idempotency keys with pending transactions
- **Duplicate detection**: Returns cached response if same key is used

This prevents duplicates from:

- Double-clicking submit button
- Network retries
- Offline sync running multiple times

## Troubleshooting

### Build Fails

```bash
# Clear cache and reinstall
rm -rf node_modules .svelte-kit
npm install
npm run build
```

### Supabase Connection Issues

- Verify `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
- Check RLS policies are enabled
- Ensure both SQL scripts ran successfully
- Verify budgets table exists for smart insights

### Gemini API Errors

- Verify API key is correct and has quota
- Check API endpoint in `src/routes/api/ai-summary/+server.ts`
- AI summary is optional - app works without it

### Offline Sync Not Working

- Check browser supports IndexedDB
- Verify service worker is registered
- Check console for sync errors
- Look for toast notifications about offline status

### Smart Insights Not Showing

- Ensure `add-budgets.sql` script was run
- Set budgets in `/budgets` page
- Add transactions to trigger insights
- Check browser console for API errors

## Development

### Code Quality

```bash
npm run lint      # Check code style and linting
npm run check     # TypeScript and Svelte checks
npm run format    # Auto-format code with Prettier
```

### Type Safety

- Full TypeScript coverage
- Supabase database types in `src/lib/types/database.ts`
- Zod schemas for runtime validation
- Proper error handling with typed responses

## Customization

### Change Theme Colors

Edit `src/app.css`:

```css
@theme {
  --color-background: #0b1221; /* Main background */
  --color-card: #0f1b2b; /* Card background */
  --color-primary: #1f8ef1; /* Primary accent */
  /* ... */
}
```

### Modify Categories

Run SQL in Supabase SQL Editor:

```sql
INSERT INTO categories (user_id, name, type, color)
VALUES (
  'user-uuid-here',
  'New Category',
  'expense',
  '#ff6b6b'
);
```

### Add More Currencies

Edit `src/routes/settings/+page.svelte`:

```html
<option value="SGD">SGD (Singapore Dollar)</option>
```

### Customize Smart Insights

Edit `src/routes/api/insights/+server.ts`:

- Adjust alert thresholds
- Add new insight types
- Modify severity levels
- Change calculation logic

## Roadmap

- [x] User onboarding (welcome modal, empty states, checklist)
- [x] Auto-update detection (version check + service worker)
- [x] Toast notifications (replaced all alerts)
- [ ] Recurring transactions
- [ ] Multi-currency with live exchange rates
- [ ] Data import from CSV/bank statements
- [ ] Multi-user household budgets
- [ ] Receipt photo upload with OCR
- [ ] Advanced filtering and search
- [ ] Yearly reports and trends
- [ ] Push notifications for budget alerts
- [ ] Investment tracking
- [ ] Debt payoff calculator
- [ ] Contextual tooltips (just-in-time help)

## Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run `npm run lint` and `npm run check`
5. Test thoroughly
6. Submit a pull request

## License

MIT License - feel free to use for personal or commercial projects.

## Support

For issues or questions:

- Check existing GitHub issues
- Create a new issue with details
- Include error logs and steps to reproduce

## Acknowledgments

- Built with [SvelteKit](https://kit.svelte.dev/)
- Database by [Supabase](https://supabase.com/)
- AI by [Google Gemini](https://ai.google.dev/)
- Charts by [ApexCharts](https://apexcharts.com/)
- Icons from [Heroicons](https://heroicons.com/)
- Rate limiting by [Upstash](https://upstash.com/)

---

**Happy budgeting! 💰**
