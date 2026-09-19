# Patch: Last 4 Transactions on Invoices

## What changed

Invoices now display the customer's four most recent payment transactions that existed at the time the invoice was generated.

Each transaction shows:

- Transaction/payment date
- Payment number
- Purpose (Game Debt, Purchase Debt, or General Credit)
- Amount
- Payment method
- External reference, when available
- Status (including REVERSED when applicable)

## Historical behavior

The query is bounded by the invoice `createdAt` timestamp. This means an invoice generated on an earlier date will not later start showing transactions that occurred after that invoice was created.

## API

`GET /api/invoices/:id` now includes:

```json
{
  "invoice": {
    "recentTransactions": []
  }
}
```

with a maximum of four records, newest first.

The invoice-creation response also includes the same `recentTransactions` field.

## PDF

`GET /api/invoices/:id/pdf` now includes a **RECENT TRANSACTIONS** section before the final Total Amount Due.

## Migration

No Prisma or PostgreSQL migration is required for this patch.
