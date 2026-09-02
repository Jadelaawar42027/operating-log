# Operating Log

A personal habit-tracking web app: a dark "operator's log" dashboard backed by a
REST API, designed so a separate SMS bot can read/write the same data.

## Stack

- **Backend**: Node.js + Express + TypeScript
- **Database**: PostgreSQL via Prisma
- **Frontend**: plain HTML/CSS/vanilla JS served as static files from Express (no build step)
- **Auth**: a single shared API key checked on every `/api/*` route

## Data model

- **Habit** — a tracked habit: `label`, `type` (`check` or `number`), `target` (for number habits), `sortOrder`, `active`
- **HabitLog** — one habit's result on one day: `completed` (check habits) or `value` (number habits), unique per (habit, date)
- **Week** — per-week side quest state: `sidequestDone`, `sidequestNote`, keyed by the Monday of that week
- **MonthReview** — monthly reflection: `win`, `miss`, `income`, `networth`, `nextFocus`
- **MonthCategoryScore** — one 0–10 score + notes per month per category (People, Travel, Experiences, Health, Wealth, Work)

Seven default habits are seeded automatically the first time the app runs against an empty database.

## Auth

Every route under `/api/*` (except `/api/health`) requires an `x-api-key` header
matching the `API_KEY` environment variable. There's no per-user auth — this is
a single-operator app. The web dashboard asks for the key once on first load
and stores it in `localStorage`, then sends it as `x-api-key` on every request.
The same header is what the future SMS bot will send.

## API endpoints

All under `/api`, JSON in/out, all require `x-api-key` except `/api/health`.

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/habits` | List habits (`?active=true` to filter) |
| POST | `/api/habits` | Create a habit: `{ label, type, target?, sortOrder?, active? }` |
| PATCH | `/api/habits/:id` | Update any habit fields |
| DELETE | `/api/habits/:id` | Delete a habit (and its logs) |
| GET | `/api/days/:date` | One day's active habits + logs (`date` = `YYYY-MM-DD`) |
| PUT | `/api/days/:date/habits/:habitId` | Upsert `{ completed }` or `{ value }` for one habit on one day. Idempotent — safe to retry. |
| GET | `/api/weeks/:weekStart` | A week's 7 days of logs joined with habits, plus side quest state. `weekStart` is normalized to that week's Monday. |
| PUT | `/api/weeks/:weekStart` | Update `{ sidequestDone?, sidequestNote? }` |
| GET | `/api/months/:month` | Review fields + all 6 category scores (`month` = `YYYY-MM`) |
| PUT | `/api/months/:month` | Update `{ win?, miss?, income?, networth?, nextFocus? }` |
| PUT | `/api/months/:month/categories/:category` | Update `{ score?, notes? }` for one category |
| GET | `/api/streak` | `{ streak }` — consecutive fully-complete days, ending today or yesterday |
| GET | `/api/summary/today` | Bot-friendly digest — see below |
| GET | `/api/health` | Plain `200 OK`, no auth. Used for Railway's healthcheck. |

### `/api/summary/today` — the bot endpoint

This is what the companion SMS bot calls (e.g. every evening) to build its
"did you complete..." message. It bundles everything in one call:

```json
{
  "date": "2026-09-02",
  "habits": [
    {
      "id": "clx...",
      "label": "Workout done",
      "type": "check",
      "target": null,
      "completed": true,
      "value": null,
      "status": "done"
    },
    {
      "id": "clx...",
      "label": "Deep work hours",
      "type": "number",
      "target": 4,
      "completed": null,
      "value": 2.5,
      "status": "value-so-far"
    }
  ],
  "streak": 6
}
```

`status` is one of `done`, `pending`, or `value-so-far` (a number habit with a
logged value that hasn't hit its target yet). A bot can render this directly
into a message without doing any of its own completion logic — it's the same
logic the dashboard uses.

To log a value from the bot side (e.g. after a reply like "yes" or "3.5
hours"), `PUT /api/days/:date/habits/:habitId` with `{ completed: true }` or
`{ value: 3.5 }`. The upsert is idempotent, so retries from a flaky SMS
webhook are safe.

## Running locally

Requires Node 18+ and a Postgres database (a local one, Docker, or a Railway one).

```bash
npm install
cp .env.example .env   # then fill in DATABASE_URL and API_KEY
npx prisma migrate dev # creates tables (dev use — see below for deploy)
npm run dev            # ts-node-dev, auto-reload
```

The dashboard is served at `http://localhost:3000/`. On first load it'll ask
for the API key you set in `.env`.

For a production-style run:

```bash
npm run build           # prisma generate + tsc
npx prisma migrate deploy
npm start
```

## Deployment (Railway)

- `railway.json` configures the build (`npm run build`) and start command,
  which runs `prisma migrate deploy` before starting the server so schema
  changes apply automatically on every deploy.
- Railway's Postgres plugin populates `DATABASE_URL` automatically when
  attached to this service.
- `API_KEY` must be set as a Railway variable — the dashboard and the SMS bot
  both need this value in their `x-api-key` header.
- `/api/health` is unauthenticated and returns `200 OK` for Railway's
  healthcheck.
