@AGENTS.md

# Ads Reach — Meta Advertising Intelligence Platform

Deployed at ads-reach.vercel.app. Shows merchants meaningful metrics beyond ROAS — things Ads Manager hides. Not anti-ROAS; surfaces what ROAS can't see.

GitHub: lovebhardwaj-commits/Audienceinsights (auto-deploys to Vercel on push to main).

## Stack

- **Next.js 16** (App Router) + React 19 + TypeScript 5
- **Tailwind CSS v4** (PostCSS plugin, inline `@theme` in globals.css)
- **Recharts 3** for all charts
- **iron-session** for encrypted cookie sessions (no database)
- **Meta Graph API v25.0** — all data comes from Meta's Ads Insights API

## Environment Variables

| Variable | Purpose |
|----------|---------|
| `META_APP_ID` | Facebook App ID |
| `META_APP_SECRET` | Facebook App Secret |
| `META_API_VERSION` | Graph API version (default `v25.0`) |
| `NEXTAUTH_URL` | Base URL for OAuth redirect |
| `SESSION_SECRET` | 32+ char string for iron-session encryption |

## Directory Layout

```
app/
  page.tsx                          # Login/landing (server component)
  layout.tsx                        # Root layout (Geist fonts)
  globals.css                       # Tailwind v4 theme, animations
  (app)/
    layout.tsx                      # Auth guard → AccountProvider → DateRangeProvider → AppShell
    dashboard/page.tsx              # Report card grid
    reports/
      net-new-reach/page.tsx        # Expanding + sliding window reach
      campaign-overlap/page.tsx     # Entity overlap with NOT_IN queries
      conversion-windows/page.tsx   # 1d/7d/28d attribution comparison
      audience-segments/page.tsx    # user_segment_key breakdown
      frequency/page.tsx            # Campaign × week heatmap
      creative-churn/page.tsx       # Cohort spend over time (hidden from nav)
      creative-segments/page.tsx    # Per-entity segment split
      partnership-ads/page.tsx      # Creator vs normal ads
  api/
    auth/login/route.ts             # OAuth redirect to Meta
    auth/callback/route.ts          # Token exchange + session creation
    auth/logout/route.ts            # Session destroy
    accounts/route.ts               # List ad accounts
    reports/[type]/route.ts         # Dynamic report endpoint (maxDuration=120)

components/
  charts/                           # Recharts wrappers (all respect prefers-reduced-motion)
    ChartTooltip.tsx                 # Shared tooltip + axis formatters
    DualAxisChart.tsx                # Bars (left axis) + lines (right axis)
    HorizontalBar.tsx                # Horizontal stacked/grouped bars
    LineChart.tsx                    # Lines with optional bar overlay
    StackedBar.tsx                   # Stacked bar or area + optional Brush
    CohortAreaChart.tsx              # Stacked area with Brush (creative churn)
  layout/
    AppShell.tsx                     # Sidebar + TopBar + content
    Sidebar.tsx                      # Nav links (NAV_SLUGS array controls visibility)
    TopBar.tsx                       # Account selector + logout + token warning
    AccountSelector.tsx              # Ad account dropdown
    icons.tsx                        # SVG icons + REPORT_ICONS map
  providers/
    AccountProvider.tsx              # Fetches accounts, stores selectedAccountId in localStorage
    DateRangeProvider.tsx            # Global date range, defaults to lastNMonths(1)
  ui/                                # Shared UI primitives
    DataTable.tsx                    # Sortable, searchable, paginated table with CSV export
    DateRangePicker.tsx              # Month presets + custom range
    SummaryCard.tsx                  # KPI card with accent border + trend badge
    EmptyState.tsx, ErrorBanner.tsx, FetchingState.tsx
    HowToRead.tsx                    # Collapsible metric explainer
    InfoTooltip.tsx                  # Portal-rendered tooltip on hover/click
    ProgressIndicator.tsx            # Progress bar for streaming reports
    ReportSummary.tsx                # Auto-generated insight bullets

lib/
  meta-api.ts                       # Graph API client (retry, throttle, pagination)
  session.ts                        # iron-session config + requireSession()
  stream.ts                         # NDJSON streaming response wrapper
  constants.ts                      # API version, segment keys/labels/colors, REPORTS array
  chart-theme.ts                    # Color tokens (categorical, status, reach, overlap, spend)
  types.ts                          # SegmentKey, DateRange, InsightRow, MetaAdAccount, etc.
  format.ts                         # Currency-aware formatters (INR uses lakh/crore grouping)
  dates.ts                          # ISO date math, month/week windowing, lastNMonths/lastNDays
  calculations.ts                   # CPMR, CPP, overlap %, findAction, extractPurchases
  insights.ts                       # Auto-generated plain-text insights per report
  glossary.ts                       # 30+ metric definitions for InfoTooltips
  hooks/
    useJsonReport.ts                 # Fetch + parse JSON, holds previous data during refetch
    useStreamingReport.ts            # NDJSON stream consumer with progress + cancel
    useReducedMotion.ts              # prefers-reduced-motion media query hook
  reports/
    shared.ts                        # fetchCampaignList, fetchAccountTotals, fetchSingleBreakdown
    net-new-reach.ts                 # Sliding window: isolated vs baseline vs combined reach
    rolling-reach.ts                 # Expanding cumulative reach month-by-month
    campaign-overlap.ts              # Per-entity NOT_IN filtering (streaming, 1 query per entity)
    audience-segments.ts             # user_segment_key breakdown (weekly + overall)
    creative-segments.ts             # Per-entity segment split at campaign/adset/ad level
    conversion-windows.ts            # 3 attribution windows with time_increment=7
    frequency.ts                     # Campaign × week matrix (time_increment=7, limit=2000)
    creative-churn.ts                # Ad creation cohorts × daily spend (time_increment=1)
    partnership-ads.ts               # Branded content detection, creator resolution, incremental reach
```

## Auth Flow

1. User clicks "Continue with Facebook" → `GET /api/auth/login` generates CSRF state, redirects to Meta OAuth
2. Meta redirects back → `GET /api/auth/callback` exchanges code for short-lived token, then long-lived token (60-day)
3. Token stored in iron-session cookie (`ads_reach_session`, 60-day maxAge)
4. `(app)/layout.tsx` server component calls `requireSession()` — redirects to `/` if no token
5. TopBar shows amber warning when token expires within 7 days

Scopes: `ads_read, pages_show_list, pages_read_engagement`

## Screenshots

### Dashboard
![Dashboard](docs/screenshots/dashboard.png)
Report card grid with 5 active reports. Shows connected ad account, currency, and account ID.

### New Reach
![New Reach](docs/screenshots/net-new-reach.png)
Two modes: Expanding Window (cumulative) and Sliding Window (configurable lookback). KPI cards: Latest Window Reach, Total Spend, Latest Net New %, Avg Cost/1K Net New. DualAxisChart with stacked bars (net new vs reached previously) + % net new line. DataTable with monthly breakdown.

### Campaign Overlap
![Campaign Overlap](docs/screenshots/campaign-overlap.png)
Level selector (Campaign/Adset/Ad), Top N input. KPI cards: Total Account Reach, Sum of All Reaches (with overlap gap %), Total Spend, Entity Count. HorizontalBar chart (blue = unique, orange = overlap) with % labels at bar ends. Sorted by total reach. DataTable with Unique % color-coded (green >60%, amber, red <10%).

### Conversion Windows
![Conversion Windows](docs/screenshots/conversion-windows.png)
KPI cards: 28DC Purchases, 1DC Purchases, Uplift Ratio. StackedBar chart showing purchase share by attribution window (within 1 day / day 2-7 / day 8-28) with uplift ratio chips above each bar. DataTable with weekly breakdown.

### User Segments
![User Segments](docs/screenshots/audience-segments.png)
View level tabs: Account / Campaign / Adset / Ad. At account level: KPI cards (Total Reach, Spend, Purchases, New Audience %), StackedBar (spend by segment), LineChart (CPMR trend). At entity level: best/worst prospecting cards, HorizontalBar (100% stacked by segment), DataTable with New Reach % color coding.

### Partnership Ads
![Partnership Ads](docs/screenshots/partnership-ads.png)
![Partnership Ads - continued](docs/screenshots/partnership-ads2.png)
Head-to-head comparison cards (Partnership vs Normal). Sections: insight banner, incremental reach card, audience composition bars (reach + purchases), weekly trend chart (partnership vs normal new %), creator leaderboard table, expandable all-ads table.

## Reports

### Active (in sidebar + dashboard)

| Report | Slug | Data Source | Streaming |
|--------|------|-------------|-----------|
| New Reach | `net-new-reach` | Sliding/expanding window reach comparison | Yes (NDJSON) |
| Overlap | `campaign-overlap` | NOT_IN filtering per entity | Yes (NDJSON) |
| Conversion Windows | `conversion-windows` | `action_attribution_windows: [1d_click, 7d_click, 28d_click]` | No |
| User Segments | `audience-segments` | `breakdowns=user_segment_key` | No |
| Partnership Ads | `partnership-ads` | `facebook_branded_content` / `instagram_branded_content` | No |

### Hidden (accessible via direct URL only)

| Report | Slug | Why Hidden |
|--------|------|------------|
| Frequency Heatmap | `frequency` | Removed from sidebar + dashboard; has actionable overexposure alerts when campaigns hit 5×+ |
| Creative Churn | `creative-churn` | Timeouts on 5-6 month ranges (daily granularity, full ad list) |
| Creative Segments | `creative-segments` | Not in sidebar |

## Meta API Patterns

- **Client**: `lib/meta-api.ts` — all requests go through `metaGet` / `metaInsights`
- **Retry**: Up to 3 retries with exponential backoff for error codes 4 (rate limit) and 17 (user request limit)
- **Throttle**: Reads `x-fb-ads-insights-throttle` header, pauses 2s when utilization > 75%
- **Pagination**: `metaGetAllPages` follows `paging.next` links
- **Auth errors**: Code 190 → `isAuthError = true` → UI shows re-authenticate prompt
- **Streaming**: Heavy reports use NDJSON via `ndjsonResponse()` — progress events, then a done/error event
- **time_increment=7**: Weekly granularity used everywhere except creative churn (daily) to keep row counts manageable

## Design System

### Colors

Defined in `lib/chart-theme.ts`:
- **Categorical palette**: 8 colors for data series (blue, aqua, yellow, green, violet, red, magenta, orange)
- **Segment colors**: Prospecting=#2563EB, Engaged=#F59E0B, Existing=#10B981
- **Overlap**: Unique=#2563EB, Shared=#EA580C
- **Status**: Good=#0ca30c, Warning=#fab219, Serious=#ec835a, Critical=#d03b3b
- **Frequency heatmap**: 6-step ramp from light blue (healthy) through amber to dark red (overexposed)

Brand colors (Tailwind theme in globals.css): blue-50 through blue-900.

### Currency

`lib/format.ts` — module-level currency state set by `setCurrency(code)` when account changes. INR uses `en-IN` locale for lakh/crore grouping. Supports 30+ currencies.

### UI Conventions

- Every report page follows the same structure: header + DateRangePicker → HowToRead accordion → KPI SummaryCards → ReportSummary insights → chart → DataTable
- `SummaryCard` has left accent border color + icon
- `ReportSummary` has built-in `mt-4` spacing — no wrapper needed
- `ErrorBanner` interprets error strings (rate limit, auth, generic) and shows contextual hints
- `FetchingState` shows rotating messages while loading
- All charts gate `isAnimationActive` on `useReducedMotion()`
- `DataTable`: sticky first column, zebra striping, CSV export, search, pagination (50/page). Numeric columns use `width: 1%` + `nowrap` to shrink-to-fit; first column expands to fill. First column intercepts `onCopy` to write full (untruncated) name to clipboard.
- `HorizontalBar`: supports `percentOfTotal` prop to show % labels at bar ends (used in overlap chart)
- Frequency heatmap has actionable overexposure alerts: lists which campaigns are at 5×+, how many weeks, and concrete recommendations (frequency caps, audience broadening, creative rotation)

## Key Constraints

- **Default date range is 1 month** — 3-month auto-fetch trips Meta rate limits on heavy reports (overlap, partnership). Users can opt into longer ranges manually.
- **No localStorage for date range** — always starts fresh at 1 month.
- **Campaign overlap is O(N)** in API calls — one `NOT_IN` query per entity, cannot be batched. Use topN to limit.
- **Creative churn uses time_increment=1** (daily) — heaviest report, timeouts on long ranges. Hidden from nav.
- **Partnership ad detection** relies on `facebook_branded_content.sponsor_page_id` or `instagram_branded_content` in ad creative fields. Creator name extraction falls back to regex `ifs_{name}_ife` in ad name.
- **Vercel maxDuration=120** on the reports API route.
- **No database** — all data is fetched live from Meta on each request.

## Common Tasks

### Adding a new report

1. Create `lib/reports/<name>.ts` with data-fetching function
2. Add case to `app/api/reports/[type]/route.ts` (streaming → `ndjsonResponse`, JSON → standard response)
3. Create `app/(app)/reports/<slug>/page.tsx` (use `useDateRange()`, `useJsonReport` or `useStreamingReport`)
4. Add to `REPORTS` array in `lib/constants.ts`
5. Add slug to `NAV_SLUGS` in `components/layout/Sidebar.tsx`
6. Add icon to `REPORT_ICONS` in `components/layout/icons.tsx`

### Hiding a report from nav + dashboard

Remove its slug from `NAV_SLUGS` in `Sidebar.tsx` AND from the `REPORTS` array in `lib/constants.ts`. The page remains accessible via direct URL.

### Changing default date range

Edit `DEFAULT_RANGE_MONTHS` (currently not a named constant — the value `1` is passed directly to `lastNMonths()` in `DateRangeProvider.tsx`).

## Dev Setup

```bash
cp .env.local.example .env.local   # fill in META_APP_ID, META_APP_SECRET, SESSION_SECRET
npm install
npm run dev                        # http://localhost:3000
```
