# Ledger — Personal Budget Planner (PRD)

## Original Problem Statement
Build a premium personal budget planner for single-user personal use. Manual entry only — no bank/UPI/card/payment gateway integrations. Currency ₹ (INR). Clean, minimal, Apple/Linear/Notion-inspired UI. Every budget, expense, payment, reminder entered manually. Track fixed/variable/savings categories with due dates, reminders, priorities, recurring toggles. Flexible spending = Budget − Fixed − Savings. Mark-as-paid flow deducts from balance. Calendar with color-coded events, monthly reports, analytics, dashboard with utilization ring/donut/trend/weekly graph. Light/dark mode. Responsive.

## User Choices (2026-02-11)
- Data storage: **localStorage in browser** (no backend, no login)
- Currency: **₹ (INR)**
- Theme: **Dark mode default + follow system preference + light toggle**
- Notifications: **In-app (Sonner toasts) + Browser push (Notification API)**
- AI insights: **Deferred**

## Architecture
- **Frontend only**: React 19 + Craco + Tailwind + shadcn/ui + Recharts + Sonner + Framer utilities
- **State**: Single React Context (`BudgetContext`) synced to `localStorage` key `budget-planner:v1`
- **No backend**, no API calls
- **Routes**: `/`, `/planned`, `/calendar`, `/history`, `/reports`, `/settings`

## Design System
- Typography: Cabinet Grotesk (display) · Manrope (body) · JetBrains Mono (numbers)
- Monochrome foundation, semantic accents (success/warning/danger)
- Bento grid dashboard, generous padding, subtle grain texture
- Lucide icons (stroke-width 1.5), pill buttons, underlined inputs

## Implemented (2026-02-11)
- Dashboard: hero remaining balance, mini-stats (spent/savings/days left/suggested daily), utilization ring, flexible spending progress (80%/100% tone shifts), expense donut, weekly bar, 6-month trend line, upcoming payments, today's reminders, recently paid
- Planned Budget: 3 tabs (Fixed/Variable/Savings); category panels with add/edit/delete planned items (name, amount, due date, reminder date+time, notes, priority, recurring); Mark-paid → transaction; Undo; ManageCategoriesDialog to add/delete custom categories
- Calendar: month grid, color-coded event dots (green/orange/red), day-detail dialog with pay action, prev/next nav
- History: search, month filter, category filter, sort (date/amount asc/desc), add/edit/delete transactions
- Reports & Analytics: 8 KPIs, category donut + top 5 progress bars, savings envelopes, spent vs saved trend (6mo), daily timeline line chart, budget vs actual bar chart
- Settings: active month picker, browser notification permission toggle, JSON export/import backup, reset-all destructive action
- Theme: dark by default with system fallback, persists via `theme` localStorage key
- Reminders: on load, alerts for today's non-paid reminderDate items via toast + browser Notification
- Responsive: sidebar → bottom nav on mobile
- All data auto-saves to localStorage on every change

## Testing
- Frontend smoke test 12/12 PASS (see `/app/test_reports/iteration_1.json`)

## P1 Backlog (Next Actions)
- Roll recurring planned items forward to next month automatically
- PIN lock / biometric lock
- CSV/PDF export for expense history & reports
- Yearly budget planning view
- Budget forecasting from historical trend
- AI-powered spending insights (Claude Sonnet 4.5)
- Import from CSV
- Multiple budget templates
