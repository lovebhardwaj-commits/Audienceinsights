@AGENTS.md

# Ads Reach — Meta Advertising Intelligence Platform (v2 branch)

Deployed at ads-reach.vercel.app (see Vercel note below on the actual project name for this branch). Shows merchants meaningful metrics beyond ROAS — things Ads Manager hides. Not anti-ROAS; surfaces what ROAS can't see.

**This document describes the `v2` branch only.** A separate `CLAUDE.md` on `main` describes that branch, which has two features this branch deliberately does NOT have: a temporary email/password gate in front of Meta OAuth, and an internal activity log at `/logs`. Both were stripped out when this branch was created so it could be handed to a different audience without exposing internal-team tooling. This branch also carries a distinct visual identity (see Design System) that `main` does not have.

## GitHub

- Repo: `lovebhardwaj-commits/Audienceinsights` — https://github.com/lovebhardwaj-commits/Audienceinsights
- `v2` is an **orphan branch** — it shares no git history with `main` (`git merge-base main v2` returns nothing). It was originally populated by force-pushing a curated copy of `main`'s tree (with the auth-gate/activity-log features removed), then later redesigned in place. Don't expect `git merge`/`git log --all` to show a common ancestor with `main`; syncing content between the two branches is a deliberate, manual, per-change decision, not an automatic merge.
- **Security note**: local git remote URLs can end up with a personal access token embedded in plaintext (`https://<user>:<token>@github.com/...`). Never print, log, or commit such a value — flag it and recommend revoking at https://github.com/settings/tokens.

## Vercel

- This branch is understood to be tracked by a separate Vercel project, **`ads-reach-v2`**, distinct from `main`'s `ads-reach` project (each with its own env vars).
- **Caveat, verified directly against the repo**: the `.vercel/project.json` committed on this branch (`orgId: uoybemk8qqdfne3q9q2Enyd8`, `projectId: prj_ZFXMT4MLM1q9cOuPfQdlUJJvzORt`) is **byte-identical to `main`'s** — i.e. it still points at the `ads-reach` project, not a distinct `ads-reach-v2` one. This file only matters for the `vercel` CLI's local link; a GitHub-integration deployment (auto-deploy on push) is configured independently in the Vercel dashboard and doesn't have to match it. Given the identical file, don't trust it as proof of which Vercel project this branch actually deploys to — confirm in the Vercel dashboard (Project Settings → Git) before relying on this for anything deployment-related.
- `app/api/reports/[type]/route.ts` sets `export const maxDuration = 120` — same Vercel serverless timeout constraint as `main`.

## Stack

- **Next.js 16** (App Router) + React 19 + TypeScript 5
- **Tailwind CSS v4** (PostCSS plugin, inline `@theme` in globals.css)
- **Recharts 3** for all charts
- **iron-session** for encrypted cookie sessions (no database) — used only for the Meta OAuth token here, unlike `main` which also stores an email-gate flag in the same session
- **Meta Graph API v25.0** — all data comes from Meta's Ads Insights API

`package.json` name: `ads-reach` (unchanged from `main` — this branch was never renamed at the npm-package level, only at the Vercel-project level per the note above). Same dependency versions as `main`: `next@16.2.10`, `react`/`react-dom@19.2.4`, `iron-session@^8.0.4`, `recharts@^3.9.2`, `tailwindcss@^4`, `typescript@^5`.

## Environment Variables

Reference by name only — never write actual values into docs, commits, or chat. See `.env.local.example` for the authoritative list. Notably **shorter than `main`'s** — no `AUTH_USERS` (no email gate on this branch) and no `ACTIVITY_LOG_WEBHOOK_URL` (no activity log on this branch).

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
  page.tsx                          # Meta-connect landing (server component) — redirects to /dashboard if already connected/demo. No email/password gate on this branch — this IS the first screen.
  layout.tsx                        # Root layout — Plus Jakarta Sans + Poppins (logo) + Geist Mono, inline theme-init script, suppressHydrationWarning
  globals.css                       # Tailwind v4 theme — light/dark tokens, @custom-variant dark, brand/severity CSS vars (see Design System)
  (app)/
    layout.tsx                      # Auth guard → AccountProvider → DateRangeProvider → AppShell
    dashboard/page.tsx              # Snapshot KPI band (7D/30D) + findings feed + all-reports grid
    reports/
      net-new-reach/page.tsx        # Expanding + sliding window reach
      campaign-overlap/page.tsx     # Entity overlap with NOT_IN queries
      conversion-windows/page.tsx   # 1d/7d/28d attribution comparison
      audience-segments/page.tsx    # user_segment_key breakdown
      frequency/page.tsx            # Campaign × week heatmap
      creative-churn/page.tsx       # Cohort spend over time
      creative-segments/page.tsx    # Per-entity segment split
      partnership-ads/page.tsx      # Creator vs normal ads
  api/
    auth/login/route.ts             # GET only — OAuth redirect to Meta (no POST/email-gate handler on this branch)
    auth/callback/route.ts          # Token exchange + session creation
    auth/logout/route.ts            # Session destroy (there's no separate logout-email route — nothing to separate it from)
    auth/demo/route.ts              # Sets session.demo = true, redirects to /dashboard — no Meta token needed
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
    Sidebar.tsx                      # Nav links (NAV_SLUGS array controls visibility); LogoMark/Logo branding
    TopBar.tsx                       # Account selector + ThemeToggle + single "Log out" button + token warning (no AccountMenu dropdown — that's a main-only concept tied to the email gate)
    AccountSelector.tsx              # Ad account dropdown
    Logo.tsx                         # `Logo` (full wordmark) + `LogoMark` (icon-only) — exact SVG paths from the fastrr Ads brand asset, text fill="currentColor"
    ThemeToggle.tsx                  # Sun/moon icon button, calls useTheme()
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
  session.ts                        # iron-session config + requireSession(); SessionData has no userEmail field on this branch — accessToken/demo only
  stream.ts                         # NDJSON streaming response wrapper (no onSettled param — no activity log to feed on this branch)
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
    useReportRange.ts                # Per-report default date range, backed by lib/session-ranges.ts
    useTheme.ts                      # Reads/writes data-theme attribute + localStorage("theme")
  reports/
    shared.ts                        # fetchCampaignList, fetchAccountTotals, fetchSingleBreakdown
    net-new-reach.ts                 # Sliding window: isolated vs baseline vs combined reach
    rolling-reach.ts                 # Expanding cumulative reach month-by-month
    campaign-overlap.ts              # Per-entity NOT_IN filtering (streaming, 1 query per entity)
    audience-segments.ts             # user_segment_key breakdown (weekly + overall)
    creative-segments.ts             # Per-entity segment split at campaign/adset/ad level
    conversion-windows.ts            # 1d/7d/28d click + 1d view attribution, time_increment=7
    frequency.ts                     # Campaign × week matrix (time_increment=7, limit=2000)
    creative-churn.ts                # Ad creation cohorts × weekly spend (time_increment=7)
    partnership-ads.ts               # Branded content detection, creator resolution, incremental reach
    pulse.ts                         # Account-level monthly reach/spend/frequency/purchases (`pulse` API type) — wired into the route + demo fixtures, but no page currently renders it; the dashboard's "Snapshot" band is built directly from the audience-segments/conversion-windows/frequency reports instead
```

## Auth Flow

**This is the only gate on this branch** — unlike `main`, there is no email/password step in front of it and no `middleware.ts` at all.

1. User clicks "Continue with Facebook" (landing page, `app/page.tsx`) → `GET /api/auth/login` generates CSRF state, optionally stashes a `returnTo` path, redirects to Meta OAuth
2. Meta redirects back → `GET /api/auth/callback` exchanges code for short-lived token, then long-lived token (60-day)
3. Token stored in iron-session cookie (`ads_reach_session`, 60-day maxAge) — `SessionData` here has `accessToken`/`tokenExpiresAt`/`demo` only, no `userEmail`
4. `(app)/layout.tsx` server component calls `requireSession()` — redirects to `/` if no token
5. TopBar shows amber warning + "Re-authenticate" link when the token expires within `TOKEN_EXPIRY_WARNING_DAYS` (7) days
6. **Signing out**: TopBar's single "Log out" button → `POST /api/auth/logout`, destroys the session, redirects to `/`. There's no separate "sign out but keep Meta connected" action on this branch (that distinction only exists on `main`, where it's needed to separate the email gate from the Meta connection).
7. **Demo mode**: `GET /api/auth/demo` sets `session.demo = true`, redirects to `/dashboard` — report routes serve `lib/demo-fixtures.ts` instead of calling Meta.

Scopes requested from Meta: `ads_read, pages_show_list, pages_read_engagement`

## Screenshots

### Dashboard
![Dashboard](docs/screenshots/dashboard.png)
*(Screenshot predates both the Snapshot/findings layout below and the v2 redesign's indigo/dark-mode-capable visual identity — it still shows the old blue, light-only design.)*
Shows connected ad account, currency, and account ID. A "Snapshot" band (7D/30D toggle) with 5 KPI tiles built from the audience-segments report (Spend, Reach, New Reach, Purchases, New User Purchases). A "What needs your attention" findings feed (ranked verdicts from the conversion-windows and frequency reports, via `lib/findings.ts`) links into the relevant report. Below that, an "All reports" grid mapping the `REPORTS` array (`lib/constants.ts`) directly — the same 7 reports as the sidebar.

### New Reach
![New Reach](docs/screenshots/net-new-reach.png)
Two modes: Expanding Window (cumulative) and Sliding Window (configurable lookback). KPI cards: Latest Window Reach, Total Spend, Latest Net New %, Avg Cost/1K Net New. DualAxisChart with stacked bars (net new vs reached previously) + % net new line. A second DualAxisChart below it ("Cost per 1K net new reach": spend bar + cost/1K line) passes `shareOfTotal={false}` — those two series don't share a unit, so a "% of total" tooltip reading would be meaningless. DataTable with monthly breakdown.

### Campaign Overlap
![Campaign Overlap](docs/screenshots/campaign-overlap.png)
Level selector (Campaign/Adset/Ad), Top N input. KPI cards: Total Account Reach, Sum of All Reaches (with overlap gap %), Total Spend, Entity Count. HorizontalBar chart (blue = unique, orange = overlap) with % labels at bar ends. Sorted by total reach. DataTable with Unique % color-coded (green >60%, amber, red <10%).

### Conversion Windows
![Conversion Windows](docs/screenshots/conversion-windows.png)
*(Screenshot predates the 1-day-view addition below — KPI row and chart have since changed.)*
KPI cards (6): Total Purchases (7DC+1DV), 28DC Purchases, 1DC Purchases, 1DV Purchases, Uplift Ratio, Cost Per Purchase. DualAxisChart with grouped (non-stacked) bars — Total/1DV/1DC/7DC/28DC purchase counts side-by-side per week, since they overlap conceptually rather than summing to a whole — plus Uplift Ratio as the only line; Spend isn't in the chart (too large a scale next to purchase counts), only the table. DataTable columns: Week, Spend, Total Purchases, 1DV Purchases, 1DC Purchases, 7DC Purchases, 28DC Purchases, Uplift Ratio, % Same-Day.

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
| Overlap | `campaign-overlap` | NOT_IN filtering per entity (streams bar-by-bar via `partial` events) | Yes (NDJSON) |
| Conversion Windows | `conversion-windows` | `action_attribution_windows: [1d_click, 7d_click, 28d_click, 1d_view]` | No |
| User Segments | `audience-segments` | `breakdowns=user_segment_key` | No |
| Partnership Ads | `partnership-ads` | `facebook_branded_content` / `instagram_branded_content` | No |
| Frequency | `frequency` | Campaign × week matrix (`time_increment=7`) | No |
| Creative Churn | `creative-churn` | Launch-cohort spend, always weekly | Yes (NDJSON) |

Frequency and Creative Churn are **active in nav** (7 reports total). Frequency was un-hidden in Phase 0 (7.6); Creative Churn was rescued in Phase 5 (7.7) and later hardened: it's always weekly (`time_increment=7`, no Daily toggle) NDJSON streaming, chunked into week-aligned windows (`weeklyAlignedWindows` in `lib/dates.ts`) fetched in parallel to stay under Vercel's 120s limit and avoid Meta silently truncating wide ranges. Every launch-month with spend gets its own cohort/color — no top-N cap, no "Other" bucket (a 12-month range shows 13 cohorts: 12 months + 1 "Pre-&lt;month&gt;" bucket for ads launched before the window). Defaults to a 1-month range (`useReportRange("creative-churn", 1)`). Its chart (`CohortAreaChart.tsx`) keys the `<AreaChart>` on the exact cohort-key sequence (`series.map(s=>s.key).join("|")`) — without it, widening the date range (growing the cohort set on an already-mounted chart) can leave React's keyed-list reconciliation pinning an existing `<Area>` at its old stack position instead of moving it, silently corrupting SVG paint order (no z-index escape hatch for SVG).

**Conversion Windows** was extended with **1-day view-through (`1d_view`)** attribution alongside the click windows. Two non-obvious Meta API facts, confirmed against Meta's own Insights API docs (don't re-derive or assume otherwise): (1) `1d_view` is real and currently supported — Meta permanently removed `7d_view`/`28d_view` in Jan 2026, but `1d_view` remains; (2) the unwindowed `actions[].value` field is **not** the ad account's actual configured attribution setting — whenever `action_attribution_windows` is explicitly specified in the request, `value` is pinned to `7d_click` regardless. So "Total Purchases" (`purchasesTotal` in `lib/reports/conversion-windows.ts`) is an explicit `purchases7dc + purchases1dv` sum approximating Meta's "7-day click or 1-day view" attribution preset — not a single combined action key (Meta doesn't expose one), and not additive-safe against double-counting a purchase that had both a qualifying view and a later click.

### Hidden (accessible via direct URL only)

| Report | Slug | Why Hidden |
|--------|------|------------|
| Creative Segments | `creative-segments` | Not in sidebar (drill-down target for User Segments) |

### Post-overhaul systems (added across Phases 0–5)

- **Error taxonomy** (`lib/meta-api.ts` `MetaErrorCode`): every failure is `META_AUTH | META_RATE_LIMIT | TIMEOUT | UNKNOWN`, carried through routes → `stream.ts` → hooks → `ErrorBanner`. Only Meta code 190 is auth; 504/timeout/AbortError → TIMEOUT with a "Retry with 1 month" action. 90s per-request server timeout + 110s client abort.
- **Findings engine** (`lib/findings.ts`): structured verdicts (`severity`, `headline`, `detail`, `action`, `moneyAtStake`) per report, ranked by money. Rendered by `components/ui/FindingsStrip.tsx` above each report chart and as the Overview findings feed.
- **Design tokens** (`globals.css`): `--surface-app`/`--surface-card`/`--border-hairline`/`--ink`-scale, severity + metric-identity palettes exposed as Tailwind colors (`bg-surface-card`, `border-hairline`, `text-ink`, `bg-sev-*`). On `main` these are fixed warm off-white values; **on this branch they're mode-aware** (light: `--surface-app #f6f6fa`, `--surface-card #ffffff`, `--border-hairline #ececf2`, `--ink #140f29`; dark: `--surface-app #0a0a14`, `--surface-card #13121f`, `--border-hairline #232234`, `--ink #ffffff`) — see the Theme section below for the full light/dark token system. Cards are hairline + zero shadow; KPI values are Geist Mono; severity is the only source of card borders.
- **Label engine** (`lib/format.ts` `formatEntityLabels`): strips the common name prefix once, middle-ellipsizes the rest (D5). Used by Frequency + Overlap.
- **Chart system** (`components/charts/*`): axis titles with units, shared `ChartTooltipContent` (totals, share-of-total, partial tag), auto-brush > 12 points, reference lines, partial-period fade, auto-annotation (`lib/chart-annotations.ts`). `DualAxisChart` takes `shareOfTotal` (default `true` — turn off when bars/lines mix unrelated units, e.g. spend vs. a cost-per-unit line, where "% of total" is meaningless) and `stacked` (default `true` — turn off for grouped/side-by-side bars when series overlap conceptually instead of summing to a whole, e.g. Conversion Windows' Total/1DV/1DC/7DC/28DC purchase counts).
- **D-cache** (`lib/report-cache.ts`): client-side cache keyed by exact URL — **no TTL**, kept until the user picks a different range or storage fills up. Every report page's data-fetching `useEffect` calls `run(url)` directly with **no eviction** — `run()` (in `useJsonReport`/`useStreamingReport`) checks the cache itself and renders a hit instantly with no network call, so the last-generated report for the current account/range/params opens immediately on mount or when switching ranges. Only the explicit "Refresh" button evicts: `handleRefresh()` calls `evictCached(currentUrlRef.current)` then `run(currentUrlRef.current)` again, forcing a live re-fetch. (An earlier version of this pattern called `evictCached(url)` unconditionally inside the mount/range-change effect too — that defeated the cache entirely, since every page visit silently re-hit Meta. Fixed across all 8 report pages.) Known follow-up risk: because there's no TTL and eviction is now only ever explicit, a *response shape change* (adding a field to a report) can still serve an old cached object missing that field indefinitely for a previously-visited account/range, until the user hits Refresh — watch for `formatNumber(undefined)` rendering as literal "NaN" if you change a report's shape; there's no automatic cache-busting for that yet.
- **Per-report default range**: each report page owns its own default via `useReportRange(slug, defaultMonths)` (`lib/hooks/useReportRange.ts`), restored from an in-memory per-route map (`lib/session-ranges.ts` — survives SPA navigation, resets on a full page reload) or falling back to `lastNMonths(defaultMonths)`. Current defaults: **1 month for every report except New Reach, which defaults to 3.** (`MIN_USEFUL_MONTHS`/`DateRangeProvider.applyInitialMonths()` in `constants.ts`/`DateRangeProvider.tsx` are dead code — nothing calls them; don't use them as a source of truth.)
- **Demo mode**: `GET /api/auth/demo` sets `session.demo`; report/accounts routes serve `lib/demo-fixtures.ts` with no Meta token. Landing page has a "View live demo" link.

## Meta API Patterns

- **Client**: `lib/meta-api.ts` — all requests go through `metaGet` / `metaInsights`
- **Retry**: Up to 3 retries with exponential backoff for error codes 4 (rate limit) and 17 (user request limit)
- **Throttle**: Reads `x-fb-ads-insights-throttle` header, pauses 2s when utilization > 75%
- **Pagination**: `metaGetAllPages` follows `paging.next` links
- **Auth errors**: Code 190 → `isAuthError = true` → UI shows re-authenticate prompt
- **Streaming**: Heavy reports use NDJSON via `ndjsonResponse()` — progress events, then a done/error event (no `onSettled` param on this branch, since there's no activity log to feed)
- **time_increment=7**: Weekly granularity used everywhere, including creative churn (switched from daily to weekly to cut row volume ~7x and stay under Meta's rate limit)
- **`campaign-list` report type**: `app/api/reports/[type]/route.ts` also serves `case "campaign-list"` (→ `fetchCampaignList` in `lib/reports/shared.ts`), but no frontend code currently calls `/api/reports/campaign-list` — verified via grep, no page/component references it. Treat it as dead/unused.

## Design System

**This branch (v2) carries a distinct visual identity from `main`** — restyled to the Ads product
design system, with the `fastrr Ads` logo (`components/layout/Logo.tsx` / `LogoMark`), Plus Jakarta
Sans (`app/layout.tsx`, replacing Geist Sans; Poppins is loaded separately for the logo wordmark
only), and a light/dark theme toggle. Nothing here touches `main`.

### Theme (light/dark)

- `data-theme="light"|"dark"` on `<html>`, toggled by `components/layout/ThemeToggle.tsx` /
  `lib/hooks/useTheme.ts`, persisted to `localStorage("theme")`. An inline script in
  `app/layout.tsx` stamps the attribute before hydration (reads localStorage, falls back to
  `prefers-color-scheme`) so there's no flash-of-wrong-theme; `<html>` carries
  `suppressHydrationWarning` because of the resulting expected server/client attribute mismatch.
  `@custom-variant dark` in `app/globals.css` binds Tailwind's `dark:` variant to this attribute,
  not the OS preference, so the in-app toggle always wins.
- **Accent**: solid indigo `#6F57E9` (`brand-500/600/700`), same value in both themes — this is
  what `bg-brand-600` etc. now resolve to everywhere (was blue). `brand-50`/`brand-100` (soft
  washes: chips, hover states, icon backgrounds) DO need a dark equivalent and are mode-aware via
  `--brand-50`/`--brand-100` custom properties.
- **CTA gradient** `#AF46FD → #D93BC2 → #F4349D` — reserved for genuine primary actions (creator
  pattern setup's Next/Preview/Confirm); not applied to every `bg-brand-600` button, and
  deliberately NOT applied to the Facebook OAuth button, which keeps Facebook's own blue regardless
  of theme.
- **Semantic surface/ink tokens** (`--surface-app`, `--surface-card`, `--border-hairline`, `--ink`,
  `--ink-secondary`, `--ink-tertiary`, `--accent-tint`) are defined under `:root` (light) and
  `:root[data-theme="dark"]` (dark) in `app/globals.css`, exposed as Tailwind colors
  (`bg-surface-app`, `text-ink`, etc.) via `@theme inline`.
- **Load-bearing trick for dark mode coverage**: Tailwind v4 emits every default palette shade
  (slate, blue, red, green, amber, orange — whichever the app actually uses) as its own
  `--color-<name>-<shade>` CSS variable, and utilities read it via `var()`. `app/globals.css`
  overrides those variables under `:root[data-theme="dark"]`, which re-themes every existing
  `bg-slate-50`, `text-blue-800`, etc. across the whole app *without editing each component* — the
  ramp direction inverts by design (e.g. slate-50 = "subtle surface" in both themes, not "very
  light" specifically). The severity-banner backgrounds (`--sev-*-bg`) follow the same
  light/dark-custom-property pattern rather than being fixed hex.
- **This does NOT cover**: raw literal colors that never went through a Tailwind palette variable —
  `bg-white`, hardcoded hex strings in inline `style={{ backgroundColor: "#..." }}`, or hardcoded
  hex passed to SVG props. Two categories of these existed and were fixed explicitly rather than
  by the blanket override: (1) `bg-white` used as a *surface* (cards, dropdowns, sticky table
  columns) — swapped to `bg-surface-card`; (2) a few `bg-slate-900 text-white` "selected tab pill"
  instances (level-selector tabs across several report pages, the 7D/30D toggle) — these used
  slate-900 as a deliberate dark BACKGROUND for a selected state, which broke once slate-900 got
  inverted to near-white for dark mode (making the pill invisible, white-on-white); fixed to
  `bg-ink text-surface-card`, which correctly inverts together in both themes. `DataTable`'s sticky
  first column specifically needs an *opaque* background (a translucent zebra tint bleeds content
  through during horizontal scroll) computed via inline `style`, not a class — that now reads
  `var(--surface-card)` / `var(--color-slate-100)` instead of hardcoded hex, so it stays
  theme-aware. When adding new UI: prefer semantic tokens or standard palette utilities over
  `bg-white` or literal hex so this dark-mode coverage doesn't regress.

### Colors

Defined in `lib/chart-theme.ts`:
- **Categorical palette**: 8 colors for data series (blue, aqua, yellow, green, violet, red, magenta, orange)
- **Segment colors**: Prospecting=#2563EB, Engaged=#F59E0B, Existing=#10B981
- **Overlap**: Unique=#2563EB, Shared=#EA580C
- **Status**: Good=#0ca30c, Warning=#fab219, Serious=#ec835a, Critical=#d03b3b
- **Frequency heatmap**: 6-step ramp from light blue (healthy) through amber to dark red (overexposed)

These chart-specific colors are unaffected by the light/dark theme toggle above (charts aren't
themed in this pass). Brand colors (Tailwind theme in globals.css): brand-50 through brand-900,
now an indigo ramp (see Theme section above) — was a plain blue ramp before this branch.

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

- **Default date range is 1 month for every report except New Reach (3 months)** — see `useReportRange` note above. Users can opt into longer ranges manually, up to 24 months back (`DateRangePicker.tsx` `MONTH_OPTIONS` — Meta's Insights API supports reach lookback well beyond a year, confirmed directly against the Graph API; this used to be capped at 13 on an incorrect assumption).
- **Date range persists per report for the session** (`lib/session-ranges.ts`, in-memory, survives SPA navigation, resets on full page reload) — not "always starts fresh."
- **`DateRangePicker`'s custom range never allows a future date** — both the native `<input>` `max` in the calendar's day-cell disabling and a defensive clamp in `applyCustom()`/day-click logic keep `until` capped at today. Nothing server-side validates this independently, so don't remove the client-side guard without adding one.
- **Campaign overlap is O(N)** in API calls — one `NOT_IN` query per entity, cannot be batched. Use topN to limit.
- **Creative churn fetches are chunked and parallelized** (`weeklyAlignedWindows` + `Promise.all` in `lib/reports/creative-churn.ts`) — a single wide-range Meta Insights request silently truncates to the most recent window, and sequential chunk fetching risks the Vercel 120s timeout. Still the heaviest report on very long ranges.
- **Partnership ad detection** relies on `facebook_branded_content.sponsor_page_id` or `instagram_branded_content` in ad creative fields. Creator name extraction uses a per-account user-configured prefix/suffix pattern (`components/CreatorPatternSetup.tsx`, saved to `localStorage` keyed `creator-pattern:{accountId}`) — there is no default/guessed pattern; until a user configures one, creators are unclassified ("Unknown").
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
