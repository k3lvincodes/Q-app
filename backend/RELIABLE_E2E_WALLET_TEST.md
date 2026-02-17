# Reliable E2E Wallet Test

## Goal

Validate the wallet system end-to-end (transactions → wallet update → replay matches), not just arithmetic. Tests must catch:

- trigger/app double counting
- missing/incorrect transaction fields (cash_used, boots_used, total)
- replay mismatch
- idempotency failures
- concurrency double-spends

---

## A) Required system behavior (must be true before tests)

### A1. Single source of truth for applying wallet deltas

Pick ONE and enforce in code:

**Mode 1 (DB-driven apply)**
- The app inserts into `transactions`.
- A DB trigger/RPC applies the change to `profiles`.
- App **never** updates `profiles.balance`/`earnings_balance`/`boots_count` directly.

**OR Mode 2 (App-driven apply)**
- The app updates wallet via a single atomic DB function.
- Trigger must NOT change profiles on transaction insert.

> ✅ For these tests, use **Mode 1 (DB-driven apply)** unless you already built Mode 2.

---

## B) Add a safe "apply mode" switch to avoid double counting

### B1. Add ONE of these fields to `transactions` (choose 1)

**Option B1a (recommended):**
- `apply_mode TEXT NOT NULL DEFAULT 'db'` with allowed values: `db` | `none`
- Trigger applies wallet updates only if `apply_mode='db'`

**Option B1b:**
- `skip_wallet_apply BOOLEAN NOT NULL DEFAULT FALSE`
- Trigger exits early if `skip_wallet_apply=TRUE`

**Option B1c:**
- `source TEXT NOT NULL DEFAULT 'app'` and trigger applies only for `source='app'`
  (less explicit than apply_mode but works)

**Hard rule:** When wallet is applied by trigger, the app must NOT also update profiles.

---

## C) Ledger record requirements (must be stored per transaction)

Each transaction row must store (or deterministically imply):

| Field | Description |
|---|---|
| `type` | `gift_credit`, `deposit_credit`, `cash_spend`, `purchase_mixed`, etc. |
| `amount` OR `total` | |
| `cash_used` | >= 0 |
| `boots_used` | >= 0 integer |
| `total` | `cash_used + boots_used` |
| `idempotency_key` | unique per user + action |
| `timestamps`, `user_id` | |

**Constraint:** `cash_used + boots_used = total`

---

## D) Invariants (assert after EVERY transaction)

- `balance >= 0`
- `earnings_balance >= 0`
- `boots_count >= 0 AND integer`
- `earnings_balance <= balance`
- **Replay correctness:** recompute wallet from transaction history starting at checkpoint → equals stored profiles.
- **Idempotency:** same `idempotency_key` must not change state twice.
- **Atomicity:** under concurrency, wallet never goes negative and no double spend.

---

## E) Test execution rules (how the harness must run)

- Use a dedicated test user.
- Start from a known checkpoint (reset wallet + clear test txns).
- Every test step must:
  1. Read `profiles` pre-state
  2. Insert `transactions` row with `apply_mode='db'` (or skip flag false)
  3. Wait for DB apply (read-after-write)
  4. Read `profiles` post-state
  5. Assert invariants + expected values
  6. Run ledger replay and compare

---

## F) Test Suite 1 — End-to-End Basics (like your Suite A, but real)

### F1. Checkpoint reset

Set profiles to:
- `balance=3000`
- `earnings_balance=1000`
- `boots_count=300`

Clear test transactions (or mark previous runs ignored).
Create a CHECKPOINT transaction if your replay needs it.

**Expect:** invariants pass.

### F2. Gift credit (+500)

Insert transaction:
- `type: gift_credit`
- `total=500, cash_used=500, boots_used=0`

**Expected:**
- `balance=3500`
- `earnings_balance=1500`
- `boots=300`

### F3. Deposit credit (+700)

Transaction:
- `type: deposit_credit`
- `total=700, cash_used=700, boots_used=0`

**Expected:**
- `balance=4200`
- `earnings_balance=1500`
- `boots=300`

### F4. Cash spend (-800) (Option B deposit-first)

Transaction:
- `type: cash_spend`
- `total=800, cash_used=800, boots_used=0`

**Expected:**
- `balance=3400`
- `earnings_balance=1500` (unchanged)
- `boots=300`

### F5. Cash spend crossing clamp (-2200)

Transaction:
- `type: cash_spend`
- `total=2200, cash_used=2200, boots_used=0`

**Expected:**
- `balance=1200`
- `earnings_balance=1200` (clamped)
- `boots=300`

**After each:** run `ReplayCheck()`.

---

## G) Test Suite 2 — Boots E2E (real mixed payments)

### G1. Mixed purchase (total 200, boots 100, cash 100)

Transaction:
- `type: purchase`
- `total=200, boots_used=100, cash_used=100`

**Expected:**
- balance decreases by 100
- boots decreases by 100
- `earnings_balance` clamps if needed: `min(prev_earnings, new_balance)`

### G2. Boots cannot go negative

Attempt:
- `boots_used > boots_count`

**Expected:** transaction rejected, wallet unchanged.

### G3. Insufficient combined funds

Attempt:
- `cash_used > balance` OR `(cash_used+boots_used) > (balance+boots_count)`

**Expected:** rejected, unchanged.

---

## H) Test Suite 3 — Replay validation (the big one)

Implement `ReplayCheck(userId)`:

### Replay algorithm (Option B):

Start from checkpoint snapshot state.
For each txn ordered by `created_at`:

- **gift_credit:**
  - `balance += total`
  - `earnings += total`

- **deposit_credit:**
  - `balance += total`

- **cash_spend:**
  - `balance -= total`
  - `earnings = min(earnings, balance)`

- **purchase (mixed):**
  - `boots -= boots_used`
  - `balance -= cash_used`
  - `earnings = min(earnings, balance)`

Assert final replay state == profiles state **exactly**.

**Fail test if mismatch.**

---

## I) Test Suite 4 — Idempotency (must pass)

### I1. Duplicate insert with same idempotency_key

- Insert purchase txn with key `K1` (should apply).
- Insert same again with key `K1` (must not apply).

**Expected:** wallet changes only once.
**Assert:** only one txn is "applied" or second is rejected.

---

## J) Test Suite 5 — Concurrency (must pass)

### J1. Parallel double cash spend

Checkpoint:
- `balance=1000, earnings=0, boots=0`

Fire concurrently:
- spend 700 (key A)
- spend 700 (key B)

**Expected:**
- one succeeds, one fails insufficient funds
- balance ends at 300
- never negative

### J2. Parallel mixed purchase

Checkpoint:
- `balance=300, boots=300`

Fire concurrently:
- purchase total 400 boots 200 cash 200 (key A)
- purchase total 400 boots 200 cash 200 (key B)

**Expected:**
- only one succeeds
- never negative

**Hard requirement:** these must be enforced by DB atomic operation (trigger function / RPC) using row locks.

---

## Output requirements

Your test runner must log per step:

- pre-state + post-state
- inserted transaction row (`type`, `total`, `cash_used`, `boots_used`, `idempotency_key`, `apply_mode`)
- pass/fail for each invariant
- replay comparison result
- for concurrency: which request succeeded/failed
