# TaskMgr

**Plan, track and finish your work.**

TaskMgr is a full-stack task management application with session-based user authentication. Users sign up, log in, and manage personal tasks organised into projects, each with a status (`todo`, `in_progress`, `done`), a priority (`low`, `medium`, `high`) and an optional due date.

- **Frontend:** Next.js (App Router) served at `https://taskmgr.arx-app.com`
- **Backend:** Express REST API at `https://taskmgr-api.arx-app.com:4116` (terminates TLS itself)
- **Database:** MySQL accessed with `mysql2/promise` (no ORM, parameterised SQL only)

---

## Table of contents

1. [Architecture](#architecture)
2. [Prerequisites](#prerequisites)
3. [Database setup](#database-setup)
4. [Environment variables](#environment-variables)
5. [Running locally](#running-locally)
6. [Production deployment (PM2)](#production-deployment-pm2)
7. [REST API reference](#rest-api-reference)
8. [Authentication & cross-subdomain cookies](#authentication--cross-subdomain-cookies)
9. [Design system rules](#design-system-rules)
10. [Project structure](#project-structure)
11. [Troubleshooting](#troubleshooting)

---

## Architecture

```
                    ┌──────────────────────────────────────────┐
                    │              Browser (user)              │
                    └───────────────┬──────────────────────────┘
                                    │
             HTML/JS bundle         │          fetch(..., credentials: 'include')
        ┌───────────────────────────┘                     │
        │                                                 │
        ▼                                                 ▼
┌───────────────────────────────┐          ┌──────────────────────────────────────┐
│  Next.js frontend (App Router)│          │  Express API (HTTPS, self-terminated) │
│  https://taskmgr.arx-app.com  │          │  https://taskmgr-api.arx-app.com:4116 │
│                               │          │                                      │
│  app/            pages        │          │  server/index.js      entry point    │
│  components/     primitives   │          │  server/routes/*      routers        │
│  lib/api.js      API client   │          │  server/controllers/* handlers       │
│  app/globals.css design system│          │  server/middleware/*  auth/errors    │
└───────────────────────────────┘          └───────────────┬──────────────────────┘
                                                           │ mysql2/promise pool
                                                           ▼
                                            ┌──────────────────────────────────┐
                                            │            MySQL 8               │
                                            │  users · projects · tasks        │
                                            │  sessions (express-mysql-session)│
                                            └──────────────────────────────────┘
```

Key points:

- The browser calls the API **directly** — there is no Next.js rewrite/proxy layer.
- All data fetching happens **client-side at runtime** (inside `useEffect`), never during `next build`, so the UI builds and degrades gracefully when the API is unavailable.
- Sessions are stored server-side in MySQL; the browser only holds a signed `taskmgr.sid` cookie. No JWTs, no tokens in `localStorage`.
- The repository has **one** `package.json` at the root declaring both frontend and backend dependencies.

---

## Prerequisites

| Requirement | Version / notes |
| --- | --- |
| Node.js | 18 LTS or newer (native `fetch`, App Router support) |
| npm | 9 or newer |
| MySQL | 8.0 or newer (5.7 works; `utf8mb4` required) |
| TLS certificate | Only when `SSL_ENABLED=true` — cert, key and optional CA bundle readable by the API process |

---

## Database setup

1. Create the database and a dedicated user:

   ```sql
   CREATE DATABASE taskmgr CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
   CREATE USER 'taskmgr'@'localhost' IDENTIFIED BY 'change-me';
   GRANT ALL PRIVILEGES ON taskmgr.* TO 'taskmgr'@'localhost';
   FLUSH PRIVILEGES;
   ```

2. Apply the schema:

   ```bash
   mysql -u taskmgr -p taskmgr < schema.sql
   ```

`schema.sql` creates (InnoDB, `utf8mb4`):

| Table | Purpose |
| --- | --- |
| `users` | `id`, `email` (unique), `name`, `password_hash` (bcrypt), `created_at` |
| `projects` | `id`, `user_id` → `users` (ON DELETE CASCADE), `name`, `color`, `created_at` |
| `tasks` | `id`, `user_id` (CASCADE), `project_id` → `projects` (ON DELETE SET NULL), `title`, `description`, `status` enum, `priority` enum, `due_date`, `created_at`, `updated_at`; indexed on `(user_id, status)` and `(user_id, due_date)` |
| `sessions` | `session_id` PK, `expires`, `data` — required by `express-mysql-session` (the app runs with `createDatabaseTable: false`, so this table **must** exist before boot) |

The file ends with commented-out seed `INSERT` statements for a demo user's projects and tasks — uncomment them if you want sample data.

---

## Environment variables

Copy `.env.example` to `.env` and fill in real values. Never commit `.env`.

```bash
cp .env.example .env
```

| Variable | Required | Example / default | Description |
| --- | --- | --- | --- |
| `PORT` | yes | `4116` | Port the Express API binds to (assigned by the deploy script). Never hardcoded in source. |
| `NODE_ENV` | yes | `production` | Node environment. Affects cookie `sameSite`, CORS localhost allowance and error verbosity. |
| `SSL_ENABLED` | yes | `true` | When `'true'` the API creates an `https` server itself using the cert/key below; otherwise plain `http`. |
| `SSL_CERT_PATH` | when TLS | `/home/arx-app/backends/certs/certificate.crt` | Absolute path to the TLS certificate. |
| `SSL_KEY_PATH` | when TLS | `/home/arx-app/backends/certs/private.key` | Absolute path to the TLS private key. |
| `SSL_CA_PATH` | no | `/home/arx-app/backends/certs/ca_bundle.crt` | Optional CA bundle appended to the TLS options. |
| `DB_HOST` | yes | `localhost` | MySQL host name. |
| `DB_USER` | yes | `taskmgr` | MySQL user name. |
| `DB_PASSWORD` | yes | `your-db-password` | MySQL user password. |
| `DB_NAME` | yes | `taskmgr` | MySQL database name. |
| `SESSION_SECRET` | yes | `replace-with-a-long-random-string` | Secret used to sign the `taskmgr.sid` session cookie. |
| `COOKIE_DOMAIN` | yes (prod) | `.arx-app.com` | Domain the session cookie is scoped to so `taskmgr.arx-app.com` and `taskmgr-api.arx-app.com` share it. |
| `CORS_ORIGINS` | no | `https://taskmgr.arx-app.com` | Comma-separated extra allowed origins in addition to any `*.arx-app.com` host. |
| `NEXT_PUBLIC_API_URL` | yes | `https://taskmgr-api.arx-app.com:4116` | Public API base URL baked into the browser bundle and used by `lib/api.js`. |

---

## Running locally

```bash
# 1. Install all dependencies (frontend + backend, single root package.json)
npm install

# 2. Configure environment
cp .env.example .env
$EDITOR .env

# 3. Create the database and apply the schema (see above)
mysql -u taskmgr -p taskmgr < schema.sql

# 4. Build the Next.js frontend
npm run build

# 5. Start the Express API (serves the REST endpoints only)
npm start
```

The available scripts are exactly:

```json
{
  "build": "next build",
  "start": "node server/index.js",
  "server": "node server/index.js"
}
```

### Using `START.sh`

`START.sh` is the deployment entry point. It loads `.env` if present, runs `npm install --omit=dev` when `node_modules` is missing, then launches the API as a background process:

```bash
bash START.sh
```

It writes logs to `logs/api.log`, the process id to `api.pid`, and echoes the health-check URL:

```
https://taskmgr-api.arx-app.com:4116/health
```

`START.sh` never starts a Next.js server — the built frontend is served by the platform's static/Next hosting layer.

### Local development without TLS

Set `SSL_ENABLED=false`, `COOKIE_DOMAIN=` (empty) and `NEXT_PUBLIC_API_URL=http://localhost:4116` in `.env`. The CORS middleware allows `localhost` origins when `NODE_ENV` is not `production`, and the session cookie falls back to `sameSite: 'lax'` with `secure: false`.

---

## Production deployment (PM2)

`ecosystem.config.js`:

```js
module.exports = {
  apps: [
    {
      name: 'taskmgr',
      script: 'server/index.js',
      cwd: '/home/arx-app/backends/taskmgr',
      env: { NODE_ENV: 'production', PORT: 4116 }
    }
  ]
};
```

Deploy:

```bash
cd /home/arx-app/backends/taskmgr
npm install --omit=dev
npm run build
pm2 start ecosystem.config.js
pm2 save
pm2 logs taskmgr
```

Verify:

```bash
curl -k https://taskmgr-api.arx-app.com:4116/health
# {"status":"ok"}

curl -k https://taskmgr-api.arx-app.com:4116/health/db
# {"status":"ok","database":"connected"}
```

---

## REST API reference

Base URL: `https://taskmgr-api.arx-app.com:4116`

All request and response bodies are JSON. Every authenticated request must be sent with credentials (`fetch(..., { credentials: 'include' })`) so the `taskmgr.sid` cookie travels with it. Errors are returned as `{ "error": "message" }` with an appropriate HTTP status code.

### Health

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| `GET` | `/health` | no | Liveness probe → `200 { "status": "ok" }` |
| `GET` | `/health/db` | no | Pings the MySQL pool → `200 { "status": "ok", "database": "connected" }` or `503 { "status": "error", "database": "unavailable" }` |

### Authentication — `/api/auth`

Rate limited to 20 requests per 15 minutes per IP on `/signup` and `/login`.

#### `POST /api/auth/signup`

```json
{ "name": "Ada Lovelace", "email": "ada@example.com", "password": "analyticalengine" }
```

- `201` → `{ "user": { "id": 1, "name": "Ada Lovelace", "email": "ada@example.com" } }`
- `400` → `{ "error": "Password must be at least 8 characters" }`
- `409` → `{ "error": "An account with that email already exists" }`

#### `POST /api/auth/login`

```json
{ "email": "ada@example.com", "password": "analyticalengine" }
```

- `200` → `{ "user": { "id": 1, "name": "Ada Lovelace", "email": "ada@example.com" } }`
- `401` → `{ "error": "Invalid email or password" }` (never reveals which field was wrong)

#### `POST /api/auth/logout`

Destroys the session and clears the `taskmgr.sid` cookie.

- `200` → `{ "ok": true }`

#### `GET /api/auth/me`

Requires an active session.

- `200` → `{ "user": { "id": 1, "name": "Ada Lovelace", "email": "ada@example.com" } }`
- `401` → `{ "error": "Not authenticated" }`

### Tasks — `/api/tasks` (all routes require authentication)

#### `GET /api/tasks`

Query parameters (all optional, combinable):

| Param | Values | Description |
| --- | --- | --- |
| `status` | `todo` \| `in_progress` \| `done` | Filter by status |
| `priority` | `low` \| `medium` \| `high` | Filter by priority |
| `projectId` | integer | Filter by project |
| `q` | string | Case-insensitive search over title and description |
| `sort` | `due_date` \| `created_at` \| `priority` | Sort order (default `created_at` descending) |

- `200` → `{ "tasks": [ { "id": 7, "title": "Draft Q3 roadmap", "description": "...", "status": "todo", "priority": "high", "due_date": "2025-03-12", "project_id": 2, "project_name": "Planning", "created_at": "...", "updated_at": "..." } ] }`

#### `GET /api/tasks/stats`

- `200` → `{ "stats": { "todo": 4, "in_progress": 2, "done": 11, "overdue": 1, "total": 17 } }`

#### `POST /api/tasks`

```json
{
  "title": "Draft Q3 roadmap",
  "description": "Outline themes and milestones",
  "status": "todo",
  "priority": "high",
  "due_date": "2025-03-12",
  "project_id": 2
}
```

- `201` → `{ "task": { ... } }`
- `400` → `{ "error": "Title is required" }`

#### `GET /api/tasks/:id`

- `200` → `{ "task": { ... } }`
- `404` → `{ "error": "Task not found" }` (also returned when the task belongs to another user)

#### `PATCH /api/tasks/:id`

Partial update — send only the fields you want to change (`title`, `description`, `status`, `priority`, `due_date`, `project_id`).

```json
{ "status": "done" }
```

- `200` → `{ "task": { ... } }`
- `400` / `404` as above

#### `DELETE /api/tasks/:id`

- `200` → `{ "ok": true }`
- `404` → `{ "error": "Task not found" }`

### Projects — `/api/projects` (all routes require authentication)

#### `GET /api/projects`

- `200` → `{ "projects": [ { "id": 2, "name": "Planning", "color": "accent", "open_tasks": 3, "created_at": "..." } ] }`

#### `POST /api/projects`

```json
{ "name": "Planning", "color": "accent" }
```

- `201` → `{ "project": { "id": 2, "name": "Planning", "color": "accent", "open_tasks": 0 } }`
- `400` → `{ "error": "Project name is required" }`

#### `DELETE /api/projects/:id`

Deletes the project; its tasks are kept and their `project_id` becomes `NULL` (`ON DELETE SET NULL`).

- `200` → `{ "ok": true }`
- `404` → `{ "error": "Project not found" }`

### Unknown routes

Any unmatched path returns `404 { "error": "Route not found" }` from the shared `notFound` middleware.

---

## Authentication & cross-subdomain cookies

- Authentication is **session-based only**. `express-session` signs a cookie named `taskmgr.sid`; the session payload lives in the MySQL `sessions` table via `express-mysql-session` (`createDatabaseTable: false`, so `schema.sql` owns the table).
- Passwords are hashed with `bcryptjs` at 10 rounds. Plaintext passwords are never stored or logged.
- The session id is regenerated on signup and login to prevent fixation.
- Because the UI (`taskmgr.arx-app.com`) and the API (`taskmgr-api.arx-app.com`) are different hosts, the cookie is issued with:

  ```
  Set-Cookie: taskmgr.sid=...; Path=/; HttpOnly; Secure; SameSite=None; Domain=.arx-app.com; Max-Age=604800
  ```

  - `SameSite=None` is required for cross-site XHR and **only works together with `Secure`**, which is why `SSL_ENABLED=true` in production.
  - `Domain=.arx-app.com` comes from `COOKIE_DOMAIN` and scopes the cookie to both subdomains.
  - In development (`NODE_ENV !== 'production'`) the cookie falls back to `SameSite=Lax` and `Secure=false`.
- CORS is configured with `credentials: true` and an origin callback that allows requests with no `Origin` header, any hostname ending in `.arx-app.com`, anything listed in `CORS_ORIGINS`, and `localhost` in development. Allowed methods: `GET, POST, PATCH, PUT, DELETE, OPTIONS`.
- Every frontend request uses `credentials: 'include'` (see `lib/api.js`).
- Every task/project query is parameterised **and** scoped by `user_id`, so one user can never read or mutate another user's rows.

---

## Design system rules

- **One stylesheet.** `app/globals.css` is the single source of styling for the entire project. It is imported exactly once, from `app/layout.jsx`. There is no Tailwind, no CSS modules, no CSS-in-JS and no inline style objects anywhere in the codebase.
- **Tokens first.** `:root` defines colour roles, a 4px spacing scale (`--space-1` … `--space-16` → 4/8/12/16/24/32/48/64), a type scale with paired line-heights, radii, three elevations and z-index tokens (`--z-dropdown` 100 → `--z-toast` 500). No hardcoded hex colours, magic pixel values or ad-hoc z-indexes outside the token block.
- **Rhythm via `gap`.** Layout helpers (`.stack`, `.cluster`, `.grid`, `.container`) space children with `gap` only — never child margins, `<br>` tags or spacer divs. Headings carry a larger top margin than bottom margin so sections breathe consistently.
- **Shared primitives.** All UI is composed from `components/ui/*`: `Button`, `Input` (`Field`/`Input`/`Textarea`/`Select`), `Card`, `Modal`, `Table`, `Badge`, `Spinner`, `EmptyState`, `Toast`. There are no one-off restyled elements.
- **Interaction states.** Every interactive element defines `:hover`, `:focus-visible` (a visible 2px accent outline with offset — `outline: none` is never used without a replacement), `:active` and `:disabled`, with a minimum 44px hit area.
- **Async states.** Every list/panel renders explicit loading (fixed-height skeletons that reserve space), empty (`EmptyState`), error (with a Retry button) and success states, so panels never reflow on load.
- **Text safety.** User-supplied text containers use `overflow-wrap: break-word` and `min-width: 0` on flex children; single-line truncation uses `text-overflow: ellipsis`.
- **Responsive & accessible.** Mobile-first with `min-width` media queries at 640/768/1024px; everything works at 360px with no horizontal scroll. Transitions target specific properties, stay under 200ms and are disabled inside `@media (prefers-reduced-motion: reduce)`.

---

## Project structure

```
.
├── app/
│   ├── globals.css              # THE single global stylesheet (tokens + components)
│   ├── layout.jsx               # Root layout: metadata, font, AuthProvider, AppShell
│   ├── page.jsx                 # Marketing landing page
│   ├── not-found.jsx            # 404 page
│   ├── login/page.jsx           # Login page ('use client')
│   ├── signup/page.jsx          # Signup page ('use client')
│   ├── dashboard/page.jsx       # Stats + "Up next" (RequireAuth)
│   ├── tasks/page.jsx           # Task CRUD, filters, modal form (RequireAuth)
│   └── projects/page.jsx        # Project list/create/delete (RequireAuth)
├── components/
│   ├── layout/AppShell.jsx      # Sticky header, container main, footer, mobile nav
│   ├── auth/
│   │   ├── AuthForm.jsx         # Shared login/signup form
│   │   └── RequireAuth.jsx      # Client-side auth gate
│   ├── tasks/
│   │   ├── TaskList.jsx         # Task card grid with loading/empty/error states
│   │   ├── TaskForm.jsx         # Create/edit form rendered inside Modal
│   │   └── TaskFilters.jsx      # Search, status/priority/project, sort toolbar
│   └── ui/
│       ├── Button.jsx  Input.jsx  Card.jsx  Modal.jsx
│       ├── Table.jsx   Badge.jsx  Spinner.jsx
│       ├── EmptyState.jsx        Toast.jsx
├── lib/
│   ├── api.js                   # fetch client (credentials: 'include', ApiError)
│   ├── AuthContext.jsx          # AuthProvider + useAuth()
│   └── format.js                # Date/label helpers and enum label maps
├── public/
│   └── favicon.svg              # Local inline SVG favicon
├── server/
│   ├── index.js                 # Express entry point (http/https by SSL_ENABLED)
│   ├── config/
│   │   ├── db.js                # mysql2/promise pool + checkDatabaseConnection
│   │   ├── cors.js              # Configured cors middleware
│   │   └── session.js           # express-session + express-mysql-session store
│   ├── middleware/
│   │   ├── auth.js              # requireAuth, attachUser
│   │   ├── errorHandler.js      # notFound, errorHandler, asyncHandler
│   │   └── validate.js          # validateSignup/Login/Task/Project
│   ├── controllers/
│   │   ├── authController.js    # signup, login, logout, me
│   │   ├── taskController.js    # list, get, create, update, delete, stats
│   │   └── projectController.js # list, create, delete
│   └── routes/
│       ├── health.js  auth.js  tasks.js  projects.js
├── schema.sql                   # MySQL schema + commented seed data
├── ecosystem.config.js          # PM2 process definition
├── START.sh                     # Background API launcher + health URL
├── next.config.js               # reactStrictMode, poweredByHeader: false
├── .env.example                 # Documented placeholder environment file
├── .gitignore
└── package.json                 # Single root manifest (frontend + backend)
```

---

## Troubleshooting

| Symptom | Likely cause / fix |
| --- | --- |
| `GET /api/auth/me` always returns 401 in the browser | The cookie is not being sent cross-site. Confirm `SSL_ENABLED=true`, `COOKIE_DOMAIN=.arx-app.com`, and that the frontend origin ends with `.arx-app.com`. |
| CORS error in the console | Add the origin to `CORS_ORIGINS` (comma separated) and restart the API. |
| `Table 'taskmgr.sessions' doesn't exist` | Run `mysql -u … taskmgr < schema.sql`; the store runs with `createDatabaseTable: false`. |
| API exits at boot with `ENOENT` on a `.crt`/`.key` | `SSL_CERT_PATH` / `SSL_KEY_PATH` are wrong or unreadable by the process user. Set `SSL_ENABLED=false` for local HTTP. |
| `/health` ok but `/health/db` returns 503 | MySQL credentials/host are wrong or the server is down — check `DB_*` variables and `logs/api.log`. |
| UI shows "We couldn't reach the server." | The API is not running, or `NEXT_PUBLIC_API_URL` is wrong. Note this value is read at build time for the browser bundle — rebuild after changing it. |
| Port already in use | Another process holds `PORT`. Check `api.pid` / `pm2 list` and stop the old instance. |