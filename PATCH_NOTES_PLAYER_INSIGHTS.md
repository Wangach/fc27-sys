# Player Insights & Head-to-Head Update

## Added

### Clickable player metadata
- Added a Player Search section to the staff dashboard.
- Player names in the Players page are now clickable.
- Player links open `/staff/players/:id` in a new browser tab.
- The player metadata page shows:
  - games played
  - games won
  - games lost
  - games drawn
  - historical win probability / win rate
  - rank, points, goals for/against and goal difference
  - latest 5 transactions, including status/reference/method
  - latest 5 games, including opponent, score, teams, result and match type

### Admin Head-to-Head comparison
- Added an Admin-only `Head-to-Head` navigation item and page at `/admin/head-to-head`.
- Admin can search and select any two active customers.
- The comparison shows:
  - direct meetings
  - wins for each player
  - draws
  - goals scored against one another
  - direct head-to-head win rate
  - each player's overall record and overall win rate
  - latest 5 direct meetings
  - matchup win/draw probabilities
  - an estimated likely outcome

## Prediction method
The matchup estimate is deliberately transparent and is not presented as certainty.

- Direct head-to-head history receives the highest weight when it exists.
- Overall win/draw records provide supporting context and act as the fallback when two players have never met.
- As more direct meetings are recorded, their weight rises up to a capped 75%.
- Probabilities are normalized across Player One win / Draw / Player Two win.
- If the top two outcomes are within 5 percentage points, the UI reports `Too close to call`.
- If neither player has any match history, no prediction is produced.

## API additions
- `GET /api/customers/:id/insights` — Admin/Co-admin player metadata.
- `GET /api/stats/head-to-head?playerOneId=...&playerTwoId=...` — Admin-only comparison.

## Database
No Prisma migration is required. The update reads from the existing CustomerProfile, Match, MatchParticipant and Payment records.
