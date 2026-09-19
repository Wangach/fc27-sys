# Development football-team data

`football-teams.json` is a cleaned development dataset generated from the OpenFootball `clubs-master.zip` supplied for this project.

It contains only canonical club names plus country, and excludes alias lines, explicit reserve/second-team markers, and obvious historical clubs whose names include a lifespan such as `(1928-1932)`.

After adding the Prisma migration, import the teams from the `server/` directory:

```bash
npm run teams:import
```

The importer is idempotent because the database has a unique constraint on `(name, country)` and uses `skipDuplicates`.

If you later want to refresh from a newer OpenFootball download, you can extract it to:

```text
server/data/clubs-master/
```

and temporarily remove/rename `football-teams.json`; the importer can parse the raw `*.clubs.txt` files directly.
