# FC Arena — Modern Club Operations System

A full-stack rebuild of the original system using React, Tailwind CSS, Font Awesome, Node.js/Express, Prisma and PostgreSQL. The UI is **football-game inspired** (dark, angular, high-contrast, electric-lime accents) without copying EA trademarks, logos or proprietary assets.

## Included roles

### Admin
- Add, edit, deactivate/reactivate Admin, Co-admin and Customer accounts
- Record loser-pay and fair-pay games
- Record payments/transactions
- Record purchase debts
- Generate combined customer invoices and open printable PDFs
- Reverse payments
- Cancel matches/debts where audit-safe
- Review/respond to customer tickets
- View leaderboard
- View audit log
- Configure match fees on the server
- Search players and open full player metadata in a new tab
- Compare any two players head-to-head, including direct goals/results and an explainable matchup estimate

### Co-admin
- View customers and open player metadata profiles
- Record games
- Record payments/transactions
- Record purchase debts
- Generate invoices
- Review/respond to tickets
- View leaderboard

### Customer
- Player dashboard/card
- Ranking and league points
- Games played, wins, draws, losses and historical win rate
- Favourite team
- Match history
- Transaction history
- Separate game debt and purchase debt views
- Combined total amount due
- Invoice history/PDFs
- Complaints/suggestions with threaded replies
- Password change

## Player insights and head-to-head analysis

Staff can search players from the dashboard or Players page. Clicking a player opens a separate metadata tab with overall games/wins/losses/draws, historical win rate, ranking/goals, the latest five payment transactions and latest five matches.

Admins also have a dedicated **Head-to-Head** page. It compares any two active players using direct meetings, wins, draws, goals scored against one another, direct win rates, overall records and the latest five meetings. The displayed matchup estimate is an explainable statistical indicator: direct history is weighted most heavily (up to 75%), while overall records provide supporting context or a fallback when the players have not met. If neither player has match history, the system reports that there is not enough data rather than inventing a prediction.

No additional database migration is required for these features.

## Debt design

### Game debt
Loser-pay is seeded at **KES 30**. The React form never supplies the authoritative charge amount. The Node backend reads the configured `MatchType.loserFee`, derives the loser from the submitted score, and creates a `GameCharge`.

If a loser-pay match ends in a draw, the recorder must resolve the payment in a modal:

- **Half-Half** — one normal game cost is split between both players. With the default KES 30 fee, each player receives a KES 15 game charge.
- **Super-looser** — a separate decisive tiebreak score is entered. The tiebreak loser receives **double** the normal game charge (KES 60 with the default fee). The original drawn score remains the official result for ranking/statistics; the tiebreak is stored only as the debt-resolution record.

```text
Game debt = SUM(active game charges) - SUM(active payment allocations to game charges)
```

Game-debt payments are allocated oldest charge first. Fair-pay has a separate `perPlayerFee`; it is seeded at KES 0 because its exact pricing rule was not specified. An Admin can configure it in Settings without changing frontend code.

### Purchase debt
Each non-game purchase debt gets its own unique `debtCode` and status:

- `UNPAID`
- `PARTIALLY_PAID`
- `PAID`
- `CANCELLED`

```text
Purchase debt = SUM(outstanding balance of non-cancelled purchase-debt records)
```

A payment can target one purchase debt or automatically settle oldest outstanding purchase debts first. Partial payments are preserved rather than incorrectly marking the full debt paid.

### Combined invoice

```text
Total amount due = Game debt + Purchase debt
```

The invoice snapshots both categories and stores itemized outstanding records for historical integrity.

## Security choices

- Argon2id password hashing
- Secure/HttpOnly authentication cookie
- SameSite=Strict cookie policy
- JWT contains user identity/role but is never stored in browser JavaScript
- Backend role-based authorization on every sensitive route
- Zod request validation
- Prisma parameterized DB access
- Helmet security headers
- CORS allow-list
- Request-origin check on state-changing browser requests
- Login rate limiting
- React output escaping (no raw customer HTML injection)
- Audit logs for important actions
- Customer “removal” is account deactivation so financial/match history stays explainable
- Financial records are reversed/voided instead of silently deleted

## Project structure

```text
fc27-club-system/
├─ client/                    React + Vite + Tailwind + Font Awesome
│  └─ src/
│     ├─ api/
│     ├─ components/
│     ├─ context/
│     ├─ layouts/
│     └─ pages/
├─ server/                    Node.js + Express
│  ├─ prisma/
│  │  ├─ schema.prisma
│  │  └─ seed.js
│  └─ src/
│     ├─ middleware/
│     ├─ routes/
│     ├─ services/
│     └─ utils/
├─ docker-compose.yml         Local PostgreSQL 18.6 (Alpine)
└─ README.md
```

## Prerequisites

- Node.js 20+ (Node 22 LTS recommended)
- npm
- PostgreSQL, **or Docker Desktop** for the included PostgreSQL container

## Quick start with Docker PostgreSQL

### 1. Start PostgreSQL

From the project root:

```bash
docker compose pull postgres
docker compose up -d postgres
```

> **PostgreSQL 18 Docker note:** PostgreSQL 18 changed the official image data layout. The included Compose file mounts the named volume at `/var/lib/postgresql` (not the PostgreSQL 17-and-earlier `/var/lib/postgresql/data` path).

### 2. Configure the backend

Windows PowerShell:

```powershell
Copy-Item server/.env.example server/.env
```

macOS/Linux:

```bash
cp server/.env.example server/.env
```

Edit `server/.env` and replace `JWT_SECRET` with a long random value. Also change the seed admin password before production use.

### 3. Configure the frontend

Windows PowerShell:

```powershell
Copy-Item client/.env.example client/.env
```

macOS/Linux:

```bash
cp client/.env.example client/.env
```

### 4. Install dependencies

```bash
npm install
npm run install:all
```

### 5. Create the database schema and seed core data

```bash
npm run db:migrate
npm run db:seed
```

The seed creates:

- `LOSER_PAY` with KES 30 loser fee
- `FAIR_PAY` with KES 0 per-player fee (configure it in Admin Settings)
- the initial Admin account from `server/.env`

### 6. Run both applications

```bash
npm run dev
```

Open:

```text
http://localhost:5173
```

API health check:

```text
http://localhost:5000/api/health
```

## Run apps separately

Backend:

```bash
cd server
npm install
npm run dev
```

Frontend:

```bash
cd client
npm install
npm run dev
```

## Useful database commands

Prisma Studio:

```bash
cd server
npm run prisma:studio
```

Create/apply development migrations:

```bash
cd server
npm run prisma:migrate
```

Generate Prisma Client:

```bash
cd server
npm run prisma:generate
```


## Updating an existing installation for draw resolution

This version adds three fields to `Match` and the `DrawResolution` enum. If you already created the database with an earlier FC Arena build, apply the schema change before starting the updated server:

```bash
cd server
npm install
npm run prisma:migrate:draw
npm run prisma:generate
```

For a brand-new database, the normal `npm run db:migrate` from the project root creates the complete schema directly, including these fields.

The update is additive: existing matches remain valid and their new draw-resolution fields are simply `NULL`.

## Main API groups

```text
/api/auth       login, logout, current user, password change
/api/users      Admin account management
/api/customers  staff customer list and customer self-dashboard
/api/matches    game types, game recording, match history, cancellation
/api/finance    purchase debts, payments, account summaries, reversals
/api/invoices   invoice snapshots and PDF generation
/api/tickets    complaints/suggestions and replies
/api/stats      dashboard totals and leaderboard
/api/settings   Admin-configurable match/business rules
/api/audit      Admin audit trail
```

## Important production notes

Before production deployment:

1. Replace all example secrets/passwords.
2. Use a managed PostgreSQL instance with automated encrypted backups.
3. Serve the frontend/API over HTTPS.
4. Set `NODE_ENV=production` so the auth cookie requires HTTPS.
5. Restrict `CLIENT_ORIGIN` to the exact production frontend origin.
6. Create a PostgreSQL application user with only the privileges the app needs; never use the PostgreSQL superuser/root-equivalent.
7. Configure log retention and backup restore testing.
8. Add email/WhatsApp delivery only through properly protected server-side integrations.

## Fair-pay rule

The system intentionally does **not** invent a financial rule for fair-pay. `FAIR_PAY.perPlayerFee` starts at KES 0. If the intended rule is, for example, KES 15 per player, Admin can set `perPlayerFee = 15` in Settings and every future fair-pay match will automatically create a KES 15 game charge for each participant.

## Historical win rate vs predicted probability

The player dashboard shows a historical **Win Rate**:

```text
wins / games played × 100
```

This is deliberately not presented as a predictive probability. A future predictive model could incorporate opponent rating, recent form, head-to-head history and team selection.

## Invoice recent-transactions section

Generated invoices include the customer's latest four payment transactions as of the invoice generation timestamp. The PDF displays the payment date, payment number, purpose, amount, method/reference and status. Transactions created after an invoice was generated are excluded from that historical invoice. No database migration is required for this feature.


## Development: football team database

The project now includes a `FootballTeam` Prisma model and a cleaned football-team dataset derived from the supplied OpenFootball clubs archive. The cleaned file is:

```text
server/data/football-teams.json
```

It contains 3,284 canonical club names with country metadata. Aliases are not inserted as separate teams.

For an existing development database, run:

```bash
cd server
npm install
npm run prisma:migrate:teams
npm run prisma:generate
npm run teams:import
```

Verify the import with:

```bash
npm run prisma:studio
```

or query PostgreSQL:

```sql
SELECT COUNT(*) FROM football_teams;
SELECT id, name, country FROM football_teams WHERE name ILIKE '%Arsenal%';
```

The staff **Games** page now loads football teams from `GET /api/football-teams` and uses the database list as searchable suggestions for Player 1 Team and Player 2 Team. Match records continue to store the selected team name, so existing match history remains compatible.

## Fair Pay fee configuration

In **Admin → System Settings**, Fair Pay has one financial field: **Fee per player**. When a Fair Pay match is recorded, the server reads `MatchType.perPlayerFee` and creates a game charge of that amount for each participant. Loser Pay uses its separate **Loser fee** setting.

A Fair Pay fee of `0` means Fair Pay matches are recorded without creating game charges. Changes are persisted immediately in PostgreSQL; no schema migration is needed for the Fair Pay settings fix.
