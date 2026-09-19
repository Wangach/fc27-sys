# Loser-Pay Draw Resolution Update

This update adds the requested draw workflow for **LOSER_PAY** matches.

## Behaviour

### Normal loser-pay result
- The original configured loser fee applies to the losing player.
- Default: **KES 30**.

### Draw → Half-Half
- A modal appears when a loser-pay result is a draw.
- Choosing **Half-Half** splits one normal game fee between the two players.
- With the default KES 30 fee: Player 1 = KES 15, Player 2 = KES 15.
- Both charges are normal `GameCharge` records and therefore appear in each customer's game debt and invoice.

### Draw → Super-looser
- Choosing **Super-looser** opens two new score inputs.
- The tiebreak must be decisive; another draw is rejected by both the frontend and backend.
- The tiebreak loser receives **2 × the configured normal loser fee**.
- With the default KES 30 fee: tiebreak loser = KES 60.
- The original match remains a draw for ranking/statistics. The Super-looser score is stored separately and is used only to determine the payer.

## Backend enforcement

The server does not trust the browser to provide an amount. It reads the configured `MatchType.loserFee` and calculates KES 15/KES 15 or KES 60 itself.

New service:
- `server/src/services/matchBilling.js`

Updated route:
- `server/src/routes/matches.js`

## Database change

`Match` now has:
- `drawResolution` (`HALF_HALF` or `SUPER_LOSER`)
- `superLoserPlayerOneScore`
- `superLoserPlayerTwoScore`

Existing installations need one migration:

```bash
cd server
npm install
npm run prisma:migrate:draw
npm run prisma:generate
```

The migration is additive. Existing match rows remain valid and receive `NULL` in the new fields.

## UI changes

Updated:
- `client/src/pages/GamesPage.jsx`
- `client/src/pages/customer/MyGamesPage.jsx`

The staff match history displays how a draw was resolved and who was charged. The customer match history displays their Half-Half share or Super-looser charge when applicable.

## Invoice/account changes

`server/src/services/accountService.js` now labels draw-related game charges clearly, and invoice item descriptions preserve that label.
