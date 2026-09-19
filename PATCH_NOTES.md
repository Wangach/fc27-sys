# Patch notes — Co-admin account creation

## Fixed

- Fixed `Validation failed` when an ADMIN creates a `CO_ADMIN` or `ADMIN` account.
- The React User Management form now sends customer profile fields only when the selected role is `CUSTOMER`.
- The Node/Zod validator now normalizes blank optional profile strings to `undefined`, so hidden/blank customer-only fields cannot invalidate staff account creation.
- Validation errors shown in User Management now include the failing field/message when available.

## Root cause

The frontend previously posted this shape for every role:

```json
{
  "username": "staff",
  "password": "...",
  "role": "CO_ADMIN",
  "displayName": "",
  "email": "",
  "phone": "",
  "favoriteTeam": ""
}
```

`displayName` was optional in the API, but an explicitly supplied empty string failed `z.string().min(2)`. Staff creation now sends only `username`, `password`, and `role`.
