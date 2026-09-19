# Fair Pay fee configuration fix

This patch fixes and clarifies the Admin **System Settings → Fair Pay** pricing workflow.

## Problem

The previous screen showed both `loserFee` and `perPlayerFee` for every match type. However, the billing engine only uses:

- `LOSER_PAY.loserFee` for Loser Pay matches.
- `FAIR_PAY.perPlayerFee` for Fair Pay matches.

That made it possible to enter an amount into Fair Pay's irrelevant `loserFee` field and then see no Fair Pay charge when a game was recorded.

The settings screen also immediately reloaded settings after PATCH, which made save confirmation unclear and could allow a cached GET response to visually restore an older value.

## Changes

- Fair Pay now shows only **Fee per player**.
- Loser Pay now shows only **Loser fee**.
- The PATCH endpoint only accepts the fee field that is valid for that match type.
- Prisma Decimal fee values are serialized as normal JSON numbers.
- Settings and match-type GET responses use `Cache-Control: no-store`.
- The Settings screen updates from the PATCH response rather than relying on an immediate reload.
- A clear success/error message is displayed after saving.
- The Fair Pay billing engine continues to charge the configured `perPlayerFee` to **each player** when a Fair Pay match is recorded.

## Database migration

No database migration is required. The existing `MatchType.perPlayerFee` column is used.
