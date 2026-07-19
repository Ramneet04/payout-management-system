# User Payout Management System

Backend for handling affiliate payouts — advance payout, reconciliation, final payout, withdrawals, and failed payout recovery.

## Stack
Node.js, Express, MongoDB (Mongoose), node-cron

---

## How it works (LLD)

- A sale starts as `pending`.
- A cron job (also triggerable manually) scans pending sales and pays 10% advance. Once paid, `advancePaid` flag flips so it never gets paid again even if the job re-runs.
- Admin reconciles a sale → approved or rejected. Final payout = `earning - advance` if approved, `-advance` if rejected.
- Withdrawals are capped at 1 per 24 hours per user.
- If a withdrawal fails/cancels, the amount goes back to the user's balance and they can withdraw again right away (Question 2).

## Schema

**User**: `userId`, `withdrawableBalance`, `lastWithdrawalAt`

**Sale**: `userId`, `brand`, `earning`, status `(pending/approved/rejected)`, `advancePaid`, `advanceAmount`, `reconciledAt`

**Transaction** (ledger/history - every money movement gets logged here instead of just mutating balance directly): `userId`, `saleId`, `type (advance/final_adjustment/withdrawal)`, `amount (+/-)`, `status (pending/success/failed/cancelled)`

Relations: User → many Sales, User → many Transactions, Sale → many Transactions.

Indexes: `userId` and `status` on Sale (plus a compound `{status, advancePaid}` index, since that's the exact filter the advance job runs on every time) — these are the fields actually queried on often, so they're indexed instead of indexing everything blindly.

## Why no classes
Went with plain functions + Mongoose schemas instead of OOP classes. The data here doesn't really have behavior of its own — it just gets read and updated by external rules (the cron job, the reconcile endpoint), so functions felt more natural than wrapping everything in classes for no reason. Also this whole system is `data driven`. Schemas basically act as the `class design` here.

## APIs

```
- POST   /api/users
- GET    /api/users/:userId/balance
- GET    /api/users/:userId/transactions
- POST   /api/sales
- GET    /api/sales
- POST   /api/sales/:id/reconcile      { status: approved | rejected }
- POST   /api/jobs/run-advance-payout
- POST   /api/withdrawals              { userId, amount }
- POST   /api/withdrawals/:id/resolve  { outcome: success | failed | cancelled }
```

## Design decisions / trade-offs

- **Ledger instead of just a balance field** — every payout/withdrawal is its own Transaction row, so balance can always be double-checked by summing transactions, and reversing a failed withdrawal is just adding a new row instead of undoing history.
- **Atomic updates + sessions** — advance payout, reconcile, and withdrawal all touch multiple documents (transaction + balance + status). Wrapped these in Mongo sessions so a crash mid-way doesn't leave things half-updated.
- **Race conditions** — instead of "read balance → check in code → save," the check is folded directly into `findOneAndUpdate` (e.g. `withdrawableBalance: {$gte: amount}`), so two simultaneous requests can't both pass a stale check. Same idea used for reconciliation and the advance job, so nothing gets double-paid/double-reconciled even under overlapping requests.
- **Singelton Pattern for Database instance** — Used SOLID design principle pattern, Singleton pattern which sayas that create only single instance and re use it if available. So returning the previously created instance if exist rather than making ne instance.
- **Manual trigger for the advance job** — cron runs it nightly, but also exposed as an endpoint so idempotency (running it twice = no double pay) can be tested without waiting for midnight.

## Edge cases handled
- Job run multiple times → no double advance payout
- Reconciling an already-reconciled sale → rejected
- Withdrawing twice within 24h → rejected
- Withdrawing more than balance → rejected
- Failed/cancelled withdrawal → balance refunded, 24h lock cleared
- Bad IDs / invalid amounts → clean 400s instead of crashing