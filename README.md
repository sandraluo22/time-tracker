# Time Tracker

A PWA for tracking daily activities. Works offline, installable on your phone, with optional cloud sync via Supabase.

## Quick Start

```bash
npm install
npm run dev
```

Open `http://localhost:5173` in your browser. On mobile, use "Add to Home Screen" to install it as an app.

## Features

- **Timer** — Big start/stop button with activity labels and category picker
- **Timeline** — Day-by-day view of activities with visual bar and card/list toggle. Tap the pencil icon to edit times, labels, or categories
- **Dashboard** — Pie charts, bar charts, and stats filterable by day/week/month/year
- **CSV Export/Import** — Download all data as CSV or upload a CSV to restore
- **Spreadsheet Import** — Paste tab-separated data from an existing tracker (Date, Wake, Sleep, meal columns)
- **Offline** — All data stored locally in IndexedDB. Works without internet
- **PWA** — Installable on phone/desktop. Service worker caches everything

## Cloud Sync (Optional)

Sync your data across devices using a free [Supabase](https://supabase.com) project.

### 1. Create a Supabase project

Sign up at [supabase.com](https://supabase.com) and create a new project.

### 2. Create the table

Go to **SQL Editor** in your Supabase dashboard and run:

```sql
create table activities (
  id uuid primary key,
  label text not null,
  category text not null,
  start_time bigint not null,
  end_time bigint,
  updated_at bigint not null
);

alter table activities enable row level security;
create policy "allow all"
  on activities for all
  using (true)
  with check (true);
```

### 3. Connect the app

1. In your Supabase dashboard, go to **Settings > API**
2. Copy the **Project URL** and **anon public** key
3. In the app, go to **Settings**, paste both values, and click **Connect**
4. Click **Sync Now** to push/pull data

## Importing Existing Data

### From CSV

Go to **Settings > CSV Data > Import CSV**. Expected columns:

```
id, label, category, start_time (ISO), end_time (ISO), duration_minutes
```

The `id` column is optional — rows without one get a new ID. Matching IDs update existing entries.

### From a Spreadsheet Tracker

If you have a tab-separated spreadsheet with this format:

```
Date    Wake    Sleep    Time    Breakfast    Time    Lunch    Time    Dinner    Time    Snacks
Mon Mar 23    13:30    5:58    ...
```

1. Go to **Settings > Import from Spreadsheet**
2. Set the **year** (dates in the spreadsheet don't include the year)
3. Either paste the data or upload a `.tsv` file
4. Click **Import Spreadsheet Data**

This creates:
- A **Sleep** activity from the Sleep time to the Wake time each day
- **Meal activities** (Breakfast, Lunch, Dinner, Snacks) using the time ranges and descriptions

## Deploy

Build for production:

```bash
npm run build
```

The `dist/` folder can be deployed to any static host (Vercel, Netlify, GitHub Pages, etc.).

### Deploy to Vercel (easiest)

```bash
npx vercel
```

### Deploy to GitHub Pages

1. In `vite.config.ts`, set `base: '/<repo-name>/'`
2. Run `npm run build`
3. Push the `dist/` folder to a `gh-pages` branch

## Tech Stack

- React 18 + TypeScript
- Vite 6
- Tailwind CSS 4
- Dexie (IndexedDB)
- Recharts
- Supabase (optional cloud sync)
- vite-plugin-pwa (service worker + manifest)
