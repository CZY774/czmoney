# CZmoneY - Personal Finance PWA

A modern, offline-first personal finance manager built with SvelteKit, Supabase, and AI-powered insights.

## Features

- 💰 **Transaction Management**: Track income and expenses with categories
- 📊 **Visual Reports**: Interactive charts and monthly breakdowns
- 🤖 **AI Insights**: Get personalized financial advice powered by Google Gemini
- 📱 **PWA Support**: Install as mobile/desktop app with offline capability
- 🔄 **Offline Sync**: Work offline, sync automatically when online
- 📈 **Savings Tracker**: Set and monitor monthly savings targets
- 📥 **CSV Export**: Download transaction history
- 🔔 **Reminders**: Optional notifications for expense tracking
- 🌙 **Dark Theme**: Sleek, modern dark UI optimized for mobile

## Tech Stack

- **Frontend**: SvelteKit + TailwindCSS
- **Database & Auth**: Supabase (PostgreSQL)
- **Charts**: ApexCharts
- **AI**: Google Gemini API (Gemini Pro)
- **Offline Storage**: IndexedDB (idb-keyval)
- **Hosting**: Vercel (recommended)

## Prerequisites

- Node.js 18+ and npm
- Supabase account (free tier works)
- Google Gemini API key
- Vercel account (for deployment)

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
3. Run the SQL script in `scripts/supabase-init.sql` in the Supabase SQL Editor
4. This will create all tables, indexes, RLS policies, and default categories

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

## Project Structure

```
czmoney/
├── src/
│   ├── lib/
│   │   ├── components/       # Reusable Svelte components
│   │   ├── services/         # Supabase, sync, utils
│   │   └── utils.js          # Helper functions
│   ├── routes/
│   │   ├── +layout.svelte    # Main layout with nav
│   │   ├── +page.svelte      # Dashboard
│   │   ├── auth/             # Login/register pages
│   │   ├── transactions/     # Transaction management
│   │   ├── reports/          # Reports & AI summary
│   │   ├── settings/         # User settings
│   │   └── api/              # Server endpoints
│   └── app.css               # Global styles
├── static/                   # PWA icons, manifest
├── scripts/
│   └── supabase-init.sql     # Database schema
└── package.json
```

## Usage

### First Time Setup

1. **Register**: Create an account at `/auth/register`
2. **Profile**: Set your monthly income and savings target in Settings
3. **Add Transactions**: Use the FAB button or Transactions page
4. **View Reports**: Check Reports page for insights and AI summary

### Adding Transactions

- Click the + button (FAB) on dashboard
- Or go to Transactions → Add Transaction
- Select category, type (income/expense), amount, and optional description
- Works offline - syncs automatically when online

### Generating AI Insights

1. Go to Reports page
2. Select a month
3. Click "Generate Summary"
4. Get personalized insights about spending patterns and recommendations

### Offline Mode

- App works completely offline
- Transactions are queued locally
- Auto-syncs when connection is restored
- Check sync status in Settings 

## Features in Detail

### Categories

Default categories are automatically created:
- **Income**: Salary, Freelance, Investment
- **Expense**: Food & Drink, Transport, Shopping, Entertainment, Bills & Utilities, Healthcare, Other, Apart

You can add custom categories in the database directly.

### Charts

- **Dashboard**: Monthly income vs expense bar chart + category donut chart
- **Reports**: Detailed category breakdown with horizontal bar chart

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

## Security Best Practices

✅ **Implemented**:
- Row Level Security (RLS) on all tables
- Server-only API keys (never exposed to client)
- Supabase Auth with secure session management
- HTTPS required for PWA features

⚠️ **Important**:
- Never commit `.env` file to version control
- Use environment secrets in Vercel
- Rotate API keys if exposed

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
- Ensure SQL script ran successfully

### Gemini API Errors

- Verify API key is correct and has quota
- Check API endpoint in `src/routes/api/ai-summary/+server.ts`
- AI summary is optional - app works without it

### Offline Sync Not Working

- Check browser supports IndexedDB
- Verify service worker is registered
- Check console for sync errors

## Performance Tips

1. **Image Optimization**: Use WebP format for icons
2. **Code Splitting**: SvelteKit handles this automatically
3. **Caching**: Service worker caches static assets
4. **Database**: Indexes created for common queries

## Customization

### Change Theme Colors

Edit `tailwind.config.js`:

```js
colors: {
  background: '#0b1221',  // Main background
  card: '#0f1b2b',        // Card background
  accent: '#1f8ef1',      // Primary accent
  // ...
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

## Roadmap

- [ ] Budget alerts per category
- [ ] Multi-currency with live exchange rates
- [ ] Recurring transactions
- [ ] Data import from CSV/bank statements
- [ ] Multi-user household budgets
- [ ] Receipt photo upload
- [ ] Advanced filtering and search
- [ ] Yearly reports and trends

## Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

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

---

**Happy budgeting! 💰**