# GigTask — Freelance Micro-Jobs Marketplace

**CS6.302 Software System Development · Project 5 — GigTask · Assignment 1a (Database) + 1b (Front End) · Team 27**

| | |
|---|---|
| GitHub repository | https://github.com/srilathakanchamreddy/GigTask-P5 |
| Final commit hash | b2d4abb422bf49929b9a4b3225c932c638f27b95 |
| Demo video (≤ 5 min) | [Watch on Google Drive](https://drive.google.com/file/d/1H0iJtxA9rK7a6YSUPASw_LNFHb35jJ1q/view?usp=sharing) |

GigTask is a marketplace where **clients** fund small physical jobs from an escrow wallet and **freelancers** are matched to job sites by distance. The project was built in two stages:

- **Assignment 1a: database.** PostgreSQL holds money and contracts (escrow balances, an audit trigger, a stored procedure, a partial unique index, a materialized view and window analytics). MongoDB holds flexible and location data (worker GPS pings with geospatial and TTL indexes, reviews and portfolios).
- **Assignment 1b: front end.** A thin Node.js API and a browser dashboard let a user run all four database workflows by clicking, instead of running scripts by hand. The database still does the real work; the API only calls it.

Our team inherited the 1a database from Team 9 (Anuj Sharma, Nisarg Bhojani, Srilatha Kanchamreddy, Vishwanth Beereddy) and built 1b on top of it, keeping their commit history.

**What the system demonstrates**

| Concern | How it is handled |
|---|---|
| Money never goes negative | `CHECK (escrow_balance >= 0)` + `fund_gig` checks funds under a row lock |
| Every balance change is traceable | `AFTER UPDATE` trigger writes an audit row; a second trigger makes the audit log read-only |
| A freelancer can't be double-booked | Partial unique index on `IN_PROGRESS` contracts |
| Fast reporting | Materialized view `freelancer_earnings`, refreshed `CONCURRENTLY` |
| Trend and ranking analytics | CTE + window functions (7-day moving average, `DENSE_RANK()`) |
| Find the nearest worker | MongoDB `2dsphere` index + `$geoNear` within 5 km |
| Review insights in one query | MongoDB `$facet` (rating distribution, top skills, average) |
| All of the above usable by a person | Express API + browser dashboard with clear success and error messages |

---

## Repository structure

```text
27_a1b/
├── README.md                      # this file
├── docker-compose.yaml            # PostgreSQL + MongoDB + Mongo Express
├── .env.example                   # environment variables (copy to .env and api/.env)
├── docs/
│   ├── handover_note.md           # what worked / what didn't / what we changed
│   ├── api_endpoints.md           # every API route with inputs and outputs
│   ├── relational_erd.png         # PostgreSQL ERD
│   └── design/
│       ├── users.md               # who the users are, look & feel, components
│       ├── wireframes.html        # all wireframes on one page (source of the PNGs)
│       └── 00_…07_*.png           # one wireframe image per screen
├── sql/                           # schema, indexes, triggers, procedure, MV, window analytics   (1a)
├── mongo/                         # collections + indexes, $geoNear, $facet                     (1a)
├── data_generation/               # seeders + requirements.txt                                  (1a)
├── performance/                   # EXPLAIN ANALYZE + executionStats output                     (1a)
├── api/                           # Express server: server.js, db.js, package.json, .env.example (1b)
└── web/                           # front end: index.html, app.js, style.css                    (1b)
```

---

## Contents

1. [Team & contributions](#1-team--contributions)
2. [Setup and run](#2-setup-and-run)
3. [Architecture & tech choices](#3-architecture--tech-choices)
4. [Data model](#4-data-model)
5. [The workflows, end to end](#5-the-workflows-end-to-end)
6. [Users & design](#6-users--design)
7. [API endpoints](#7-api-endpoints)
8. [Performance proof](#8-performance-proof)
9. [Demo walkthrough](#9-demo-walkthrough)
10. [Tests](#10-tests)
11. [Changes made to the inherited project](#11-changes-made-to-the-inherited-project)
12. [Assumptions](#12-assumptions)
13. [Known limitations](#13-known-limitations)
14. [Screenshots](#14-screenshots)

---

## 1. Team & contributions

| Member | Roll no. | Area | Design | Code | Other |
|---|---|---|---|---|---|
| Srilatha Kanchamreddy | 2026201049 | Backend | API sketch: endpoint list with inputs and outputs | Database connections, browse endpoints (clients, freelancers, contracts), Fund a Gig and audit-trail endpoints | Handover note, API documentation |
| Bankapalli Karthik | 2026201037 | Backend | Wireframes for all screens | Analytics endpoints (moving average, rankings, summary, refresh), MongoDB endpoints (nearby workers, reviews, portfolios), contract-status endpoint with partial-index error handling | README, setup instructions, environment configuration |
| Fahad Ur Rehman | 2026201020 | Front end | Look & feel: colours, fonts, reusable components | Dashboard layout, tab navigation, actor switcher, browse and detail screens, Fund a Gig and Audit Trail screens | Screenshots, demo video |
| Akash Kumar | 2026201050 | Front end | User descriptions: who the users are and what each needs | Analytics charts, Nearby Workers map, Reviews & Portfolios screen, loading/empty/error states | API and workflow tests |

All four members contributed equally to Assignment 1b.

---

## 2. Setup and run

### 2.1 Requirements

| Tool | Version | Check |
|---|---|---|
| Docker + Docker Compose | any recent | `docker --version`, `docker compose version` |
| Node.js + npm | 20 or newer | `node --version` |
| Python | 3.10 or newer | `python --version` |
| mongosh | any recent | `mongosh --version` |
| Git | any | `git --version` |

### 2.2 Ports used

| Service | Host port | Notes |
|---|---|---|
| PostgreSQL 18 | `5433` | user `postgres`, password `postgres`, database `GigTask` |
| MongoDB 7 | `27018` | user `root`, password `example`, database `GigTask` |
| Mongo Express | `8081` | browser UI for Mongo, login `mongoexpressuser` / `mongoexpresspass` |
| API | `3000` | Express |
| Web | `5500` | static files |

### 2.3 Get the code and start the databases

```bash
git clone https://github.com/srilathakanchamreddy/GigTask-P5.git
cd GigTask-P5
docker compose up -d
docker compose ps            # postgres, mongo, mongo-express should be "running"
```

> If you ran Docker for this project before, when `POSTGRES_DB` was still `mydb`, the old volume has no `GigTask` database. Run `docker compose down -v` once and start again.

### 2.4 Environment variables

Create **two** files with the same content: `.env` in the repo root (read by the Python seeders) and `api/.env` (read by the API).

```env
# PostgreSQL
PGHOST=localhost
PGPORT=5433
PGUSER=postgres
PGPASSWORD=postgres
PGDATABASE=GigTask

# MongoDB
MONGO_URI=mongodb://root:example@localhost:27018/?authSource=admin
MONGO_DATABASE=GigTask

# API
PORT=3000
```

```bash
cp .env.example .env
cp .env.example api/.env
```

(Windows: `copy .env.example .env` and `copy .env.example api\.env`.)

### 2.5 Create the PostgreSQL schema (in order)

```bash
docker exec -i postgres psql -U postgres -d GigTask < sql/01_schema_ddl.sql
docker exec -i postgres psql -U postgres -d GigTask < sql/02_indexes.sql
docker exec -i postgres psql -U postgres -d GigTask < sql/03_triggers_and_audits.sql
docker exec -i postgres psql -U postgres -d GigTask < sql/04_stored_procedures.sql
docker exec -i postgres psql -U postgres -d GigTask < sql/05_materialized_views.sql
docker exec -i postgres psql -U postgres -d GigTask < sql/06_window_analytics.sql
```

On **Windows PowerShell**, `<` does not work. Use this instead:

```powershell
Get-ChildItem sql\0*.sql | ForEach-Object { Get-Content $_ -Raw | docker exec -i postgres psql -U postgres -d GigTask }
```

### 2.6 Create the MongoDB collections and indexes

```bash
mongosh "mongodb://root:example@localhost:27018/GigTask?authSource=admin" mongo/01_collections_and_indexes.js
```

### 2.7 Seed the data

```bash
python -m venv data_generation/venv
source data_generation/venv/bin/activate          # Windows: data_generation\venv\Scripts\activate
pip install -r data_generation/requirements.txt

python data_generation/postgres_seeder.py          # 50k clients, 50k freelancers, 100k contracts, 100k audit rows
python data_generation/mongo_seeder.py             # 510k WorkerLocations pings
python data_generation/gigreviews_seeder.py        # 110k GigReviews

# build the materialized view with the new data
docker exec -i postgres psql -U postgres -d GigTask -c "REFRESH MATERIALIZED VIEW freelancer_earnings;"
```

> ⚠️ `WorkerLocations` has a 2-hour TTL index, so pings disappear 2 hours after seeding. Re-run `mongo_seeder.py` shortly before a demo.

### 2.8 Start the API

```bash
cd api
npm install
npm start                    # or: npm run dev   (auto-restart with nodemon)
```

Open http://localhost:3000/api/health — expected: `{"status":"ok","postgres":"connected","mongodb":"connected"}`.

### 2.9 Start the front end

In a second terminal, from the repo root:

```bash
npx serve web -l 5500
```

Open http://localhost:5500. (Opening `web/index.html` directly also works.) The page calls the API at `http://localhost:3000`.

### 2.10 Run the database workflow scripts directly (optional)

```bash
# Workflow 2 – window analytics
docker exec -i postgres psql -U postgres -d GigTask < sql/06_window_analytics.sql
# Workflow 3 – $geoNear, Workflow 4 – $facet (print results + executionStats)
mongosh "mongodb://root:example@localhost:27018/GigTask?authSource=admin" mongo/02_workflow3_geonear.js
mongosh "mongodb://root:example@localhost:27018/GigTask?authSource=admin" mongo/03_workflow4_facet.js
```

### 2.11 Stop everything

```bash
docker compose down          # add -v to also delete the data volumes
```

---

## 3. Architecture & tech choices

```text
Browser                         API                                 Databases
web/index.html + app.js  ──►  api/server.js (Express, :3000)  ──►  PostgreSQL 18 (:5433)  clients, freelancers, contracts, audit
   (Chart.js, Leaflet)          thin: calls DB objects only    └──►  MongoDB 7     (:27018)  WorkerLocations, GigReviews, Portfolios
```

Business rules live in the database (the `CHECK`, triggers, stored procedure, partial index, view and pipelines). The API passes requests through and turns database errors into readable messages. The browser only displays results.

| Layer | Choice | Why |
|---|---|---|
| Relational DB | PostgreSQL 18 | Transactions, `CHECK` constraints, triggers, PL/pgSQL, partial indexes, materialized views and window functions — everything the money side needs. |
| Document DB | MongoDB 7 | Flexible documents (portfolios), fast GPS writes, `2dsphere` + TTL indexes and `$geoNear` / `$facet` pipelines. |
| Data generation | Python + Faker | Realistic mock data at 100k–500k scale, inserted in batches. |
| API | Node.js + Express 5, `pg`, `mongodb` | Small and well known; `pg` returns PostgreSQL error codes we can map to friendly messages. |
| Front end | Plain HTML, CSS, vanilla JavaScript | No build step and no framework to learn; anyone in the team can open and edit one file. |
| Charts / map | Chart.js, Leaflet 1.9.4 (CDN, Esri tiles) | Few lines of code, free, no API keys. |
| Config / run | `dotenv`, Docker Compose | Credentials stay out of the code; one command starts both databases. |

---

## 4. Data model

ERD: [`docs/relational_erd.png`](docs/relational_erd.png)

### 4.1 PostgreSQL (`sql/`)

| Table | Key columns | Rules |
|---|---|---|
| `clients` | `id` UUID, `name`, `escrow_balance` | `CHECK (escrow_balance >= 0.00)` |
| `freelancers` | `id` UUID, `name`, `latitude`, `longitude`, `is_available` | |
| `contracts` | `id`, `client_id` → clients, `freelancer_id` → freelancers, `budget`, `status`, `created_at` | `status` ∈ `FUNDED`, `IN_PROGRESS`, `COMPLETED` |
| `wallet_audit_logs` | `id`, `client_id` → clients, `amount_changed`, `action_type` (CREDIT/DEBIT), `balance_after`, `timestamp` | Written only by the trigger; cannot be updated or deleted |

| Script | Database object | Purpose |
|---|---|---|
| `01_schema_ddl.sql` | Tables and enum types above | Schema with keys and `CHECK` constraints |
| `02_indexes.sql` | `idx_active_contract_freelancer` | One `IN_PROGRESS` contract per freelancer |
| `03_triggers_and_audits.sql` | `trg_escrow_audit`, `trg_prevent_audit_modification` | Automatic, immutable audit trail |
| `04_stored_procedures.sql` | `fund_gig(client, freelancer, budget)` | Workflow 1 |
| `05_materialized_views.sql` | `freelancer_earnings` + `refresh_freelancer_earnings()` | Precomputed earnings per freelancer |
| `06_window_analytics.sql` | Moving-average and ranking queries + `idx_contracts_completed_analytics` | Workflow 2 |

```sql
-- 02_indexes.sql: a freelancer can have only one active contract
CREATE UNIQUE INDEX idx_active_contract_freelancer
ON contracts (freelancer_id)
WHERE status = 'IN_PROGRESS';
```

### 4.2 MongoDB (`mongo/`, database `GigTask`)

| Collection | Document shape | Indexes |
|---|---|---|
| `WorkerLocations` | `worker_id`, `location` (GeoJSON `Point`, `[lng, lat]`), `is_available`, `created_at` | `location_2dsphere`; TTL on `created_at` (7200 s = 2 h) |
| `GigReviews` | `freelancer_id`, `rating` 1–5, `skill_tags[]`, `created_at` | `rating_created_at_idx` |
| `Portfolios` | `freelancer_id`, `skills[]`, `certifications[]`, any extra fields | — |

### 4.3 Data volume (from `data_generation/`)

| Data | Rows / documents | Seeder |
|---|---|---|
| `clients`, `freelancers` | 50,000 each | `postgres_seeder.py` |
| `contracts` | 100,000 (56,310 COMPLETED · 24,266 FUNDED · 19,424 IN_PROGRESS) | `postgres_seeder.py` |
| `wallet_audit_logs` | 100,000 | `postgres_seeder.py` |
| `WorkerLocations` | 510,000 pings around Chennai | `mongo_seeder.py` |
| `GigReviews` | 110,000 | `gigreviews_seeder.py` |

---

## 5. The workflows, end to end

Each workflow is shown from the database object (1a) through the API route to the screen (1b).

### Workflow 1 — Fund a gig (atomic transaction)

| Layer | What happens |
|---|---|
| **Database** | `fund_gig(client, freelancer, budget)` rejects a budget ≤ 0, locks the client row with `SELECT … FOR UPDATE`, raises *"Insufficient escrow balance. Available: X, Required: Y"* if funds are short, otherwise deducts the budget and inserts a `FUNDED` contract. The balance update fires `trg_escrow_audit`, which writes a `DEBIT` audit row. Any error rolls the whole thing back. |
| **API** | `POST /api/fund-gig` with `{ clientId, freelancerId, budget }`. Checks both IDs exist, reads the balance before, calls `CALL fund_gig(...)`, then returns `balanceBefore`, `balanceAfter`, the new contract and the new audit row. |
| **Screen** | **Fund a Gig** tab. The client comes from the actor switcher; the user pastes a freelancer UUID and a budget. Success shows the balance before → after and the audit row (action, amount, log ID) to prove the trigger fired. Failures show the reason in red. The button is disabled while the request runs. |

### Workflow 2 — Revenue analytics (CTE + window functions + materialized view)

| Layer | What happens |
|---|---|
| **Database** | Daily revenue per freelancer from `COMPLETED` contracts (CTE), then `AVG(...) OVER (PARTITION BY freelancer_id ORDER BY date ROWS BETWEEN 6 PRECEDING AND CURRENT ROW)` for the 7-day moving average. `DENSE_RANK() OVER (ORDER BY total_earnings DESC)` over the `freelancer_earnings` materialized view for the ranking. |
| **API** | `GET /api/analytics/moving-average`, `GET /api/analytics/rankings` (top 100), `GET /api/analytics/summary`, and `POST /api/analytics/refresh`, which runs `REFRESH MATERIALIZED VIEW CONCURRENTLY freelancer_earnings` and records the time. |
| **Screen** | **Analytics** tab: total earnings and completed contracts with a "Last Refreshed" time and a **Refresh View** button; a "Top Freelancers" table (rank, name, earnings — tied earnings share a rank); a 7-day moving-average line chart. |

### Workflow 3 — Nearest available worker (`$geoNear`)

| Layer | What happens |
|---|---|
| **Database** | `$geoNear` on `WorkerLocations` using the `2dsphere` index, `maxDistance: 5000` metres, `query: { is_available: true }`, adding `distanceMeters` and returning nearest first. The TTL index removes pings older than 2 hours. |
| **API** | `GET /api/workers/nearby?lat=&lng=` validates the coordinates and returns up to 100 workers with their distance. |
| **Screen** | **Nearby Workers** tab: latitude/longitude inputs (default Chennai Central `13.0827, 80.2707`), a Leaflet map with the job site and a marker per worker, and a list sorted by distance in metres. Press **Search Area** to load new pings without reloading the page. |

### Workflow 4 — Review analytics (`$facet`) + flexible catalog

| Layer | What happens |
|---|---|
| **Database** | One `$facet` pipeline on `GigReviews` returns three results: `rating_distribution` (count per star), `skill_tag_frequency` (`$unwind` → `$group`, top 10) and `overall_average_rating`. `Portfolios` documents have no fixed shape. |
| **API** | `GET /api/reviews/analytics` (the `$facet` result), `GET /api/reviews` (latest 50 reviews), `GET /api/portfolios/:freelancerId`. |
| **Screen** | **Reviews & Portfolios** tab: overall average, rating-distribution bar chart, top-skills pie chart, a portfolio lookup that shows skills and certifications as lists, and the latest reviews as cards. |

### Supporting features

| Feature | Database | API | Screen |
|---|---|---|---|
| **Browse** | `clients`, `freelancers`, `contracts` with `LIMIT/OFFSET` and `ILIKE` search | `GET /api/clients`, `/freelancers`, `/contracts` with `page`, `limit` (max 100), `search`, `status` | Clients / Freelancers / Contracts tabs: 10 cards per page, search on Enter, Previous/Next with total count, click a card for details |
| **Contract status** | Partial unique index blocks a second `IN_PROGRESS` contract for a freelancer | `PATCH /api/contracts/:id/status` allows only `FUNDED → IN_PROGRESS → COMPLETED`, locks the row and updates `freelancers.is_available` | Contract detail: **Start Gig** / **Finish Gig** buttons; a blocked change shows *"This change conflicts with an existing active contract."* |
| **Audit trail** | `wallet_audit_logs` + `SUM(amount_changed) OVER (PARTITION BY client_id ORDER BY timestamp)` for the running total | `GET /api/clients/:id/audit?from=&to=&page=` | Audit Trail tab: date filter, CREDIT (green) / DEBIT (red), balance after, running net change; read-only |

Every list and chart has a **loading** message, an **empty** message and an **error** message with a **Retry** button, so no screen is ever blank.

---

## 6. Users & design

| User | What they want to do | Tabs they use |
|---|---|---|
| **Client** (business posting gigs) | Find a nearby freelancer, fund a gig from escrow, check where the money went | Nearby Workers, Fund a Gig, Audit Trail, Browse |
| **Freelancer** | Start and finish contracts, see reviews and their portfolio | Contracts → detail, Reviews & Portfolios |
| **Platform admin / analyst** | Watch revenue trends, rank top earners, refresh the earnings view, check review health | Analytics, Reviews & Portfolios, Browse |

Real login is not required, so an **actor switcher** (top-right dropdown) picks which client you are acting as.

**Design documents** in [`docs/design/`](docs/design/): user descriptions and look & feel in [`users.md`](docs/design/users.md), and one wireframe per screen (`00_app_shell.png` … `07_states_and_mobile.png`, all together in `wireframes.html`).

| Element | Choice |
|---|---|
| Layout | Title + actor switcher on top, a tab bar, then one module card per screen |
| Primary colour | `#0369a1` blue for headings, card top borders and button text |
| Buttons | `#e0f2fe` light-blue background with blue text; disabled while busy |
| Page / cards | `#f0f2f5` background, white cards with a 4 px blue top border |
| Status badges | `.badge-funded`, `.badge-inprogress`, `.badge-completed`, same on every screen |
| CREDIT / DEBIT | Green / red |
| Font | Segoe UI (system font) |
| Reusable pieces | `.card`, `.nav-btn`, `getStatusBadge()`, `showLoading()` / `showEmpty()` / `showError()` (`.screen-message`) |
| Phone | Tab bar and cards use `flex-wrap`, so they stack on a narrow screen |

---

## 7. API endpoints

Full inputs, outputs and examples: [`docs/api_endpoints.md`](docs/api_endpoints.md).

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/health` | Checks both database connections |
| GET | `/api/clients?page=&limit=&search=` | Paginated, searchable clients |
| GET | `/api/freelancers?page=&limit=&search=` | Paginated, searchable freelancers |
| GET | `/api/contracts?page=&limit=&search=&status=` | Paginated contracts, optional status filter |
| POST | `/api/fund-gig` | **Workflow 1** — `{ clientId, freelancerId, budget }` |
| PATCH | `/api/contracts/:id/status` | `{ status }`; forward moves only |
| GET | `/api/clients/:id/audit?from=&to=&page=` | Audit log with running net change |
| GET | `/api/analytics/moving-average` | **Workflow 2** — 7-day moving average per freelancer |
| GET | `/api/analytics/rankings` | **Workflow 2** — `DENSE_RANK()` top 100 |
| GET | `/api/analytics/summary` | Totals from `freelancer_earnings` + last refresh time |
| POST | `/api/analytics/refresh` | `REFRESH MATERIALIZED VIEW CONCURRENTLY` |
| GET | `/api/workers/nearby?lat=&lng=` | **Workflow 3** — `$geoNear`, 5 km |
| GET | `/api/reviews/analytics` | **Workflow 4** — `$facet` |
| GET | `/api/reviews` | Latest 50 reviews |
| GET | `/api/portfolios/:freelancerId` | Portfolio document(s) |

**How database errors reach the user** (`handleError` in `api/server.js`):

| Database error | HTTP | Message shown |
|---|---|---|
| `23505` unique violation (partial index) | 409 | "This change conflicts with an existing active contract." |
| `23503` foreign key | 400 | "A referenced client, freelancer, or record does not exist." |
| `P0001` raised by `fund_gig` | 400 | The procedure's message, e.g. *Insufficient escrow balance. Available: …, Required: …* |
| `22P02` bad UUID / value | 400 | "An ID or value has an invalid format." |

---

## 8. Performance proof

Measured on the full seeded data (section 4.3). Raw output: [`performance/postgres_explain_analyzes.txt`](performance/postgres_explain_analyzes.txt) and [`performance/mongo_execution_stats.json`](performance/mongo_execution_stats.json).

**PostgreSQL — `EXPLAIN (ANALYZE)`**

| Query | Plan | Time |
|---|---|---|
| A. Daily revenue + 7-day moving average (Workflow 2) | Seq Scan — 56% of rows are `COMPLETED`, so one pass is cheaper than 56k index lookups | 34–42 ms |
| B. Freelancer ranking with `DENSE_RANK()` (Workflow 2) | Seq Scan + Hash Join — a global ranking must read every completed contract | 150–160 ms |
| C. One freelancer's completed contracts | **Index Scan** on `idx_contracts_completed_analytics` | ~5 ms |

```text
Index Scan using idx_contracts_completed_analytics on contracts
  (cost=0.41..2061.41 rows=2 width=30) (actual time=3.326..4.537 rows=2 loops=1)
  Index Cond: (freelancer_id = 'b88b7b0f-7575-4110-b3ec-bee1a6066209'::uuid)
Planning Time: 2.740 ms
Execution Time: 5.219 ms
```

The planner correctly skips the index for A and B (they read most of the table) and uses it for the selective lookup C.

**MongoDB — `explain("executionStats")`**

| Workflow | Winning stage | Index | Keys examined | Docs examined | Time |
|---|---|---|---|---|---|
| 3 · `$geoNear` | `GEO_NEAR_2DSPHERE` | `location_2dsphere` | 288 | 283 of 510,000 | 12 ms |
| 4 · `$facet` | `IXSCAN` | `rating_created_at_idx` | 110,000 | 110,000 | 825 ms |

Neither query does a collection scan.

---

## 9. Demo walkthrough

The order used in the demo video and the live viva:

1. **Browse:** open Contracts, search a name, move between pages and open one contract.
2. **Workflow 1:** choose a client in the switcher, copy a freelancer UUID, fund a gig, then point out the balance before and after and the new audit row.
3. **Failure:** fund a budget larger than the balance and show the "Insufficient escrow balance" message.
4. **Partial index:** fund two gigs for the **same** freelancer, start the first one (`IN_PROGRESS`), then try to start the second and show the 409 message.
5. **Audit Trail:** filter by today's date and show the new DEBIT row.
6. **Workflow 2:** press Refresh View, then show the ranking table and the moving-average chart.
7. **Workflow 3:** search around `13.0827, 80.2707` and show the markers and the distance list.
8. **Workflow 4:** show the charts, look up portfolio `2`, and scroll the review cards.

---

## 10. Tests

```bash
cd api
npm test
```

| Test | What it checks |
|---|---|
| Fund gig — invalid UUID | Verifies that an invalid client or freelancer UUID is rejected with HTTP 400 |
| Fund gig — zero budget | Verifies that a budget of `0` is rejected with HTTP 400 |
| Fund gig — negative budget | Verifies that a negative budget is rejected with HTTP 400 |

---

## 11. Changes made to the inherited project

Details in [`docs/handover_note.md`](docs/handover_note.md).

| # | Area | Change | Why |
|---|---|---|---|
| 1 | `docker-compose.yaml` | `POSTGRES_DB` changed from `mydb` to `GigTask`; host ports changed to `5433` (Postgres) and `27018` (Mongo) | The 1a compose file created `mydb` but every script expects `GigTask`. New ports avoid clashing with databases already installed on our laptops. |
| 2 | Workflow 2 (in the API) | Moving average uses `PARTITION BY freelancer_id` | The 1a query averaged the whole platform; the brief asks for it **per freelancer**. |
| 3 | Rankings (in the API) | `DENSE_RANK()` reads from `freelancer_earnings` | Reuses the materialized view instead of re-aggregating 100k contracts on every request. |
| 4 | Refresh (in the API) | `REFRESH … CONCURRENTLY` sent as a single statement | `CONCURRENTLY` cannot run inside a transaction block. |
| 5 | Contract status (new) | `PATCH /api/contracts/:id/status` with forward-only moves and `is_available` sync | Lets the partial unique index be demonstrated from the UI. |
| 6 | `.env.example`, `api/.env.example` | Correct host, ports and database name | The old values (`host`, `5432`, `27017`) did not match Docker; `api/.env.example` was empty. |
| 7 | `.gitignore` | Added `api/.env`, `api/node_modules/`, `data_generation/venv/` | Keeps secrets and dependencies out of the repo and the ZIP. |
|

---

## 12. Assumptions

1. No real authentication. The actor switcher picks which **client** you act as. It lists the clients on the Clients page currently loaded (10 at a time), so open the Clients tab or search to change the list.
2. The default job site is Chennai Central (`13.0827, 80.2707`) because the seeded pings are around Chennai.
3. Contracts only move forward: `FUNDED → IN_PROGRESS → COMPLETED`. Cancelling and refunds are out of scope.
4. Only `COMPLETED` contracts count as revenue.
5. MongoDB `worker_id` / `freelancer_id` are integers while PostgreSQL uses UUIDs; they are shown as separate IDs, and the portfolio lookup uses the Mongo integer ID.
6. Money is shown in `$` with two decimals.
7. The front end calls the API at `http://localhost:3000`.

---

## 13. Known limitations

- Fund a Gig needs the freelancer's UUID pasted in (copy it from the Freelancers tab).
- The moving-average chart plots the first 30 rows returned by the API, which are ordered by date across all freelancers, so it is not yet filtered to one freelancer.
- The map does not refresh on its own yet and does not draw the 5 km circle; press **Search Area** again to see new pings.
- MongoDB and PostgreSQL IDs are not linked, so a review cannot be tied to a PostgreSQL freelancer record.
- Map pings expire 2 hours after seeding because of the TTL index (see 2.7).

---

## 14. Screenshots

| Analytics | Audit Trail |
|---|---|
| ![Analytics](screenshots/Analytics.png) | ![Audit Trail](screenshots/AuditTrail.png) |
| **Clients** | **Freelancers** |
| ![Clients](screenshots/Clients.png) | ![Freelancers](screenshots/Freelancers.png) |
| **Contracts** | **Fund a Gig** |
| ![Contracts](screenshots/contracts.png) | ![Fund a Gig](screenshots/FundGig.png) |
| **Nearby Workers** | **Reviews & Portfolios (1)** |
| ![Nearby Workers](screenshots/NearByWorkers.png) | ![Reviews and Portfolios](screenshots/reviewsAndPortfolio1.png) |
| **Reviews & Portfolios (2)** | |
| ![Reviews and Portfolios](screenshots/reviewsAndPortfolio2.png) | |
