# Football-team database update

This development update adds:

- `FootballTeam` Prisma model backed by PostgreSQL table `football_teams`.
- Cleaned `server/data/football-teams.json` generated from the supplied OpenFootball clubs archive.
- `npm run teams:import` importer (safe to rerun; duplicates are skipped).
- `GET /api/football-teams` authenticated endpoint.
- Database-backed team suggestions in the Admin/Co-admin Record Game form.
- Country is retained only to help distinguish clubs with the same/similar name; no logos, fixtures, players, or live external API are used.

## Development setup

```bash
cd server
npm run prisma:migrate:teams
npm run prisma:generate
npm run teams:import
```

Then restart the API and client development servers.

Expected imported dataset size from the supplied archive: 3,284 canonical team-name rows before database duplicate handling.
