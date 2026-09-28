# Integration Notes for taskmgr

## Overview

**TaskMgr** is a full-stack task management application. Authenticated users create projects and manage personal tasks with a status (`todo` / `in_progress` / `done`), a priority (`low` / `medium` / `high`) and an optional due date.

The repository is a **single-package monorepo-free layout**: one root `package.json` holds both the Next.js frontend and the Express backend. There are no nested `package.json` files and no npm workspaces.

```
  Browser
     │
     │  https://taskmgr.arx-app.com            (Next.js App Router UI)
     ▼
┌──────────────────────┐
│  Next.js frontend    │   app/, components/, lib/
│  static build (.next)│   all data fetching is client-side, at runtime
└──────────┬───────────┘
           │  fetch(NEXT_PUBLIC_API_URL, { credentials: 'include' })
           │  https://taskmgr-api.arx-app.com:4116
           ▼
┌──────────────────────┐
│  Express API         │   server/index.js
│  terminates TLS      │   https.createServer(...) when SSL_ENABLED=true
│  express-session     │   cookie: taskmgr.sid; Domain=.arx-app.com
└──────────┬───────────┘
           │  mysql2/promise pool (no ORM)
           ▼
┌──────────────────────┐
│  MySQL               │   users, projects, tasks, sessions
└──────────────────────┘
```

Key architectural facts to keep in mind while integrating:

- **The API terminates its own TLS.** There is no reverse proxy in front of it in the reference deployment; `server/index.js` reads the certificate files directly from disk.
- **The API never serves Next.js.** `START.sh` and `ecosystem.config.js` only ever launch `server/index.js`.
- **Authentication is session-cookie based only** (no JWT, nothing in `localStorage`). Because the UI and API live on different subdomains, the cookie is issued with `SameSite=None; Secure; Domain=.arx-app.com`.
- **No build-time data fetching.** Every call in `lib/api.js` runs in the browser inside `useEffect`, so `next build` succeeds even when the API and database are offline, and the UI degrades to explicit error/retry states at runtime.
- **One stylesheet.** `app/globals.css` is the single source of styling (design tokens + component classes), imported exactly once from `app/layout.jsx`. No Tailwind, no CSS modules, no inline style objects.

## Prerequisites

| Requirement | Version / notes |
|---|---|
| Node.js | 18.18+ (20 LTS recommended — required by Next.js App Router and `node:fs` TLS usage) |
| npm | 9+ (ships with Node 18/20) |
| MySQL | 8.0+ (or MySQL 5.7.8+ for `utf8mb4` and JSON-safe `MEDIUMTEXT` session storage) |
| PM2 | Optional, for production process management: `npm install -g pm2` |
| TLS certificate | A certificate, private key and (optionally) a CA bundle readable by the process user, e.g. under `/home/arx-app/backends/certs/` |
| DNS | `taskmgr.arx-app.com` → frontend host, `taskmgr-api.arx-app.com` → API host, with port `4116` reachable |

You also need a MySQL user with `CREATE`, `SELECT`, `INSERT`, `UPDATE`, `DELETE` rights on the application database.

## Installation

### 1. Clone and install dependencies

```bash
git clone <your-repo-url> taskmgr
cd taskmgr
npm install
```

`npm install` pulls both halves of the stack from the single root `package.json`: `next`, `react`, `react-dom`, `express`, `cors`, `dotenv`, `mysql2`, `express-session`, `express-mysql-session`, `bcryptjs`, `express-rate-limit`, `cookie-parser`.

For a production host that only runs the API you can skip dev dependencies:

```bash
npm install --omit=dev
```

(`START.sh` does exactly this automatically when `node_modules/` is missing.)

### 2. Create the database and apply the schema

```bash
mysql -h "$DB_HOST" -u root -p -e "CREATE DATABASE taskmgr CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
mysql -h "$DB_HOST" -u root -p -e "CREATE USER 'taskmgr_user'@'%' IDENTIFIED BY 'your-secret-here';"
mysql -h "$DB_HOST" -u root -p -e "GRANT SELECT, INSERT, UPDATE, DELETE ON taskmgr.* TO 'taskmgr_user'@'%'; FLUSH PRIVILEGES;"

mysql -h "$DB_HOST" -u taskmgr_user -p taskmgr < schema.sql
```

`schema.sql` creates `users`, `projects`, `tasks` (with indexes on `(user_id, status)` and `(user_id, due_date)`) and the `sessions` table required by `express-mysql-session`. It ends with **commented-out** seed inserts for a demo user — uncomment them only in non-production environments.

> The session store is configured with `createDatabaseTable: false`, so the `sessions` table **must** exist before the API starts. Applying `schema.sql` is mandatory, not optional.

### 3. Create your environment file

```bash
cp .env.example .env
$EDITOR .env
```

`.env` is git-ignored (see `.gitignore`); `.env.example` contains placeholders only and must never hold real secrets.

### 4. Build the frontend

```bash
npm run build
```

This runs `next build` and emits `.next/`. Because no page fetches data during the build, this step does not require the API or MySQL to be running.

## Environment Variables

All variables are read by `server/index.js` (via `dotenv`) and its config modules, except `NEXT_PUBLIC_API_URL`, which is inlined into the client bundle by Next.js at build time and must therefore be set **before** `npm run build`.

| Variable | Description | Example |
|---|---|---|
| `PORT` | Port the Express API binds to (assigned by the deploy script; 4116 in production). `server/index.js` never hardcodes a port — it reads this value and calls `server.listen(PORT, '0.0.0.0')`. | `4116` |
| `NODE_ENV` | Node environment. Controls error-handler stack-trace suppression, the session cookie `sameSite` value (`none` in production, `lax` otherwise) and whether localhost origins are allowed by CORS. | `production` |
| `SSL_ENABLED` | Set to `'true'` to make the API terminate TLS itself with the certificate files below. Any other value falls back to `http.createServer`. Also drives the session cookie `secure` flag. | `true` |
| `SSL_CERT_PATH` | Absolute path to the TLS certificate file, read synchronously at startup. | `/home/arx-app/backends/certs/certificate.crt` |
| `SSL_KEY_PATH` | Absolute path to the TLS private key file, read synchronously at startup. | `/home/arx-app/backends/certs/private.key` |
| `SSL_CA_PATH` | Optional absolute path to a CA bundle file. When set, it is added as the `ca` option on the HTTPS server. | `/home/arx-app/backends/certs/ca_bundle.crt` |
| `DB_HOST` | MySQL host name used by the `mysql2/promise` pool in `server/config/db.js`. | `db.example.com` |
| `DB_USER` | MySQL user name. | `taskmgr_user` |
| `DB_PASSWORD` | MySQL user password. | `your-secret-here` |
| `DB_NAME` | MySQL database name. | `taskmgr` |
| `SESSION_SECRET` | Secret used to sign the session cookie in `server/config/session.js`. Use a long random string (e.g. `openssl rand -hex 32`). Rotating it invalidates all live sessions. | `change-me-to-a-long-random-string` |
| `COOKIE_DOMAIN` | Domain the session cookie is scoped to so the frontend and API share it. Must be the parent domain with a leading dot for cross-subdomain auth. | `.arx-app.com` |
| `CORS_ORIGINS` | Comma separated list of extra allowed origins in addition to `*.arx-app.com`. Used by the origin callback in `server/config/cors.js`. | `http://localhost:3001` |
| `NEXT_PUBLIC_API_URL` | Public base URL of the backend API used by the browser. Read in `lib/api.js` as `API_BASE`, with a hardcoded fallback of `https://taskmgr-api.arx-app.com:4116`. **Baked into the client bundle at build time.** | `https://taskmgr-api.arx-app.com:4116` |

### Notes on the cookie / CORS pairing

For cross-subdomain sessions to work, **all** of the following must hold:

1. `SSL_ENABLED=true` and `NODE_ENV=production` → cookie is `Secure; SameSite=None`.
2. `COOKIE_DOMAIN=.arx-app.com` → cookie is visible to both `taskmgr.arx-app.com` and `taskmgr-api.arx-app.com`.
3. The API is reached over **HTTPS** (browsers reject `SameSite=None` on insecure origins).
4. CORS responds with `Access-Control-Allow-Credentials: true` and an explicit origin (never `*`) — this is what `server/config/cors.js` does.
5. The client sends `credentials: 'include'` — `lib/api.js` does this on every request.

## Running the Application

### Local development

Set `NODE_ENV=development`, point `NEXT_PUBLIC_API_URL` at your local API (e.g. `http://localhost:4116`), leave `SSL_ENABLED` unset or `false`, and drop `COOKIE_DOMAIN` (so the cookie is host-scoped and `SameSite=lax` works over plain HTTP).

Start the API:

```bash
npm run server
# → node server/index.js
```

Verify it:

```bash
curl -i http://localhost:4116/health
curl -i http://localhost:4116/health/db
```

`/health` returns `{"status":"ok"}` immediately; `/health/db` calls `checkDatabaseConnection()` and returns `503 {"status":"error","database":"unavailable"}` if MySQL is down.

For the UI during development you can run Next.js directly (there is no `dev` script in `package.json` by design — the scripts block is exactly `build`, `start`, `server`):

```bash
npx next dev -p 3001
```

Then add `http://localhost:3001` to `CORS_ORIGINS` so the browser can send credentialed requests.

### Production — script-based

```bash
npm install --omit=dev
npm run build
bash START.sh
```

`START.sh` (`set -e`) loads `.env` if present, runs `npm install --omit=dev` when `node_modules/` is missing, then starts the API detached:

```bash
nohup node server/index.js > logs/api.log 2>&1 &
echo $! > api.pid
```

and echoes the health-check URL `https://taskmgr-api.arx-app.com:4116/health`. Create `logs/` first if it does not exist (`mkdir -p logs`). It **never** starts a Next.js server.

To stop: `kill "$(cat api.pid)"`.

### Production — PM2

```bash
pm2 start ecosystem.config.js
pm2 save
pm2 startup      # print the systemd hook for boot persistence
pm2 logs taskmgr
```

`ecosystem.config.js` declares:

```js
module.exports = {
  apps: [{
    name: 'taskmgr',
    script: 'server/index.js',
    cwd: '/home/arx-app/backends/taskmgr',
    env: { NODE_ENV: 'production', PORT: 4116 }
  }]
};
```

Adjust `cwd` if you deploy elsewhere. Values in the PM2 `env` block take precedence over `.env` for `NODE_ENV` and `PORT`; everything else (DB credentials, TLS paths, session secret) still comes from `.env` via `dotenv`.

### Serving the frontend

`npm start` is `node server/index.js` — it starts the API, not the UI. Serve the Next.js build separately, for example:

```bash
npx next start -p 3000
```

behind your edge/CDN for `https://taskmgr.arx-app.com`. Remember that `next.config.js` deliberately defines **no rewrites or proxying**: the browser calls the API origin directly, which is why CORS and the shared cookie domain matter.

### Smoke test the auth flow

```bash
BASE=https://taskmgr-api.arx-app.com:4116

curl -c jar.txt -X POST "$BASE/api/auth/signup" \
  -H 'Content-Type: application/json' \
  -d '{"name":"Ada","email":"ada@example.com","password":"correct-horse"}'

curl -b jar.txt "$BASE/api/auth/me"
curl -b jar.txt "$BASE/api/tasks/stats"
```

## Project Structure

```
taskmgr/
├── package.json              Single root manifest. Scripts: build | start | server
├── next.config.js            reactStrictMode, poweredByHeader:false, no rewrites
├── ecosystem.config.js       PM2 app definition (name taskmgr, script server/index.js)
├── START.sh                  Bash launcher: .env → npm install → nohup node server/index.js
├── .env.example              Every variable with placeholder values
├── .gitignore                node_modules, .next, .env*, logs/, api.pid, *.log, .DS_Store
├── README.md                 Full docs: architecture, env table, REST reference, design rules
├── schema.sql                utf8mb4/InnoDB DDL + commented seed data
│
├── server/                   Express API (never serves Next.js)
│   ├── index.js              Entry point; cors → json → cookie-parser → session → routes → errors
│   ├── config/
│   │   ├── db.js             mysql2/promise pool (limit 10, keepAlive) + checkDatabaseConnection
│   │   ├── cors.js           Origin callback: *.arx-app.com + CORS_ORIGINS + localhost in dev
│   │   └── session.js        express-session + express-mysql-session store ('sessions' table)
│   ├── middleware/
│   │   ├── auth.js           requireAuth (401 when no req.session.userId), attachUser
│   │   ├── errorHandler.js   notFound, errorHandler, asyncHandler
│   │   └── validate.js       validateSignup / validateLogin / validateTask / validateProject
│   ├── controllers/
│   │   ├── authController.js signup, login, logout, me (bcryptjs, session regenerate)
│   │   ├── taskController.js list/get/create/update/delete/stats — always scoped by user_id
│   │   └── projectController.js list (with open-task count), create, delete
│   └── routes/
│       ├── health.js         GET /health, GET /health/db
│       ├── auth.js           /signup /login (rate-limited 20/15min), /logout, /me
│       ├── tasks.js          requireAuth on all; /, /stats, /:id
│       └── projects.js       requireAuth on all; /, /:id
│
├── app/                      Next.js App Router
│   ├── globals.css           THE single stylesheet: reset → tokens → typography → utilities → components
│   ├── layout.jsx            Server component; imports globals.css ONCE; AuthProvider + AppShell
│   ├── page.jsx              Marketing home (no data fetching)
│   ├── login/page.jsx        'use client' — AuthForm mode='login'
│   ├── signup/page.jsx       'use client' — AuthForm mode='signup'
│   ├── dashboard/page.jsx    'use client' — stat tiles + "Up next"; RequireAuth
│   ├── tasks/page.jsx        'use client' — filters, list, create/edit modal; RequireAuth
│   ├── projects/page.jsx     'use client' — table, inline create, delete confirm; RequireAuth
│   └── not-found.jsx         404 page
│
├── components/
│   ├── layout/AppShell.jsx   Sticky header + nav + main.container + footer, mobile menu
│   ├── auth/RequireAuth.jsx  Loading spinner → redirect to /login → children
│   ├── auth/AuthForm.jsx     Shared login/signup form with inline API-error alert
│   ├── tasks/TaskList.jsx    Gap-spaced card grid with loading/error/empty states
│   ├── tasks/TaskForm.jsx    Modal form: title, description, status, priority, due date, project
│   ├── tasks/TaskFilters.jsx Debounced search + status/priority/project/sort + "New task"
│   └── ui/                   Button, Input (Field/Input/Textarea/Select), Card, Modal (portal),
│                             Table, Badge, Spinner, EmptyState, Toast (provider + portal stack)
│
├── lib/
│   ├── api.js                API_BASE + request() with credentials:'include' and ApiError
│   ├── AuthContext.jsx       'use client' AuthProvider/useAuth; status loading|authenticated|anonymous
│   └── format.js             formatDate, formatRelativeDue, isOverdue, truncate, label maps
│
└── public/favicon.svg        Local inline SVG icon (no hotlinked images)
```

### REST surface at a glance

| Method | Path | Auth |
|---|---|---|
| `GET` | `/health`, `/health/db` | public |
| `POST` | `/api/auth/signup`, `/api/auth/login` | public (rate-limited) |
| `POST` | `/api/auth/logout` | session |
| `GET` | `/api/auth/me` | session |
| `GET` / `POST` | `/api/tasks` | session |
| `GET` | `/api/tasks/stats` | session |
| `GET` / `PATCH` / `DELETE` | `/api/tasks/:id` | session |
| `GET` / `POST` | `/api/projects` | session |
| `DELETE` | `/api/projects/:id` | session |

`GET /api/tasks` accepts `?status`, `?priority`, `?projectId`, `?q` and `?sort=due_date|created_at|priority`.

## Next Steps / Production Considerations

**Secrets and configuration**
- Generate a real `SESSION_SECRET` (`openssl rand -hex 32`) and store it outside the repo — a secrets manager, PM2 `env_file`, or a `.env` with `chmod 600`. Never commit `.env`.
- Remember that changing `NEXT_PUBLIC_API_URL` requires a **rebuild** (`npm run build`), not just a restart, because it is inlined into the client bundle.

**TLS**
- Ensure the process user can read `SSL_CERT_PATH` / `SSL_KEY_PATH`; `server/index.js` uses `fs.readFileSync` at startup and will crash loudly if the files are missing or unreadable.
- Certificates are read **once** at boot. Automate a `pm2 restart taskmgr` (or `kill $(cat api.pid) && bash START.sh`) in your renewal hook so rotated certs are picked up.
- Consider fronting the API with nginx/HAProxy later if you want HTTP/2, OCSP stapling or zero-downtime cert reloads; if you do, set `SSL_ENABLED=false` and keep `app.set('trust proxy', ...)` in place so `Secure` cookies still work.

**Database**
- The pool is sized at `connectionLimit: 10` per process. If you scale to multiple PM2 instances, multiply that against your MySQL `max_connections` budget.
- Take regular backups of `users`, `projects` and `tasks`. The `sessions` table is disposable — losing it just logs everyone out.
- Add a scheduled cleanup for expired sessions if your `express-mysql-session` reaper is disabled: `DELETE FROM sessions WHERE expires < UNIX_TIMESTAMP();`
- All queries are hand-written parameterised SQL through the shared pool (`multipleStatements: false`), which covers SQL injection; keep that discipline when adding endpoints, and always include `WHERE user_id = ?` so tenant isolation holds.

**Security hardening**
- `express-rate-limit` currently guards `/api/auth/signup` and `/api/auth/login` only (20 req / 15 min / IP). Extend it to the write endpoints on `/api/tasks` and `/api/projects` before opening the API to the public.
- Add `helmet` for baseline security headers and a CSP for the frontend; `poweredByHeader: false` in `next.config.js` already removes the `X-Powered-By` leak from Next.
- bcryptjs runs at 10 rounds. Bump to 12 if your hardware tolerates the latency, and consider migrating to native `bcrypt` or `argon2` for throughput.
- Because sessions are cross-site (`SameSite=None`), add CSRF protection (double-submit token or an `Origin` allow-list check on state-changing verbs) before this handles anything sensitive.

**Observability and operations**
- `START.sh` logs to `logs/api.log` with no rotation. Install `pm2-logrotate` (`pm2 install pm2-logrotate`) or a logrotate rule to stop the disk filling.
- Point your uptime monitor at `GET /health` for liveness and `GET /health/db` for readiness — the latter returns `503` when MySQL is unreachable, which is the correct signal for a load balancer.
- Replace `console.error` in `server/middleware/errorHandler.js` with a structured logger (pino/winston) and wire an error tracker so 500s are visible.

**Frontend**
- The UI is intentionally resilient: `lib/AuthContext.jsx` falls back to `status: 'anonymous'` when `getMe()` fails, and every list view has explicit loading / empty / error+retry states. Test this by stopping the API and reloading the dashboard.
- Keep all styling in `app/globals.css`. Adding a component means adding a class there and consuming it — introducing Tailwind, CSS modules or inline style objects would break the single-stylesheet invariant the whole design system relies on.
- Verify at a 360px viewport that nothing scrolls horizontally, and audit focus rings (`:focus-visible`, 2px accent outline) plus the 44px minimum hit areas after any UI change.

**Deployment pipeline**
- A minimal deploy is: `git pull && npm install --omit=dev && npm run build && pm2 restart taskmgr` plus a redeploy of `.next/` to whatever serves the frontend.
- Apply schema migrations by adding new numbered `.sql` files rather than editing `schema.sql` in place, so existing databases can be upgraded deterministically.

## Database Provisioning

A mysql database has been automatically provisioned for this app.

- **Database:** app_taskmgr
- **Host:** testdb.gridiron-app.com
- **Port:** 3306
- **User:** taskmgr
- **Credentials stored in Vault at:** `secret/data/mysql/taskmgr`

Retrieve the password securely from Vault and set it as an environment variable (e.g. `DB_PASSWORD`) in your deployment settings — do not commit it to source control.
