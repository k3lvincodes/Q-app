# RIGOROUS TEST SPECIFICATION

## Definitions (Enforced)

- **balance**: cash wallet (₦). Does not include boots.
- **earnings_balance**: portion of balance that came from gifts/earnings and is still available.
- **boots_count**: integer boots. Never negative. 1 boot = ₦1 only for covering a transaction.

### Option B Rule (Deposit-first)
Spending reduces deposits portion first. `earnings_balance` only decreases when cash spending pushes `balance` below `earnings_balance`.
**Invariant**: `earnings_balance <= balance` always.
 **Update logic**: After any cash-debit: `earnings_balance = min(previous_earnings_balance, new_balance)`.

### Global Invariants (Assert after EVERY operation)
1. `balance >= 0`
2. `earnings_balance >= 0`
3. `boots_count >= 0` (and integer)
4. `earnings_balance <= balance`
5. **Ledger Replay**: Recomputing from transaction history yields the same values as stored.
6. **Transaction Record**: `cash_used + boots_used = total`.
   - Pure cash: `boots_used = 0`
   - Pure boots: `cash_used = 0` (only if `boots_count` sufficient)
7. **Idempotency**: Repeated submission with same `idempotency_key` must not double-apply.

---

## Test Suites

### Suite A: Basic Credits/Debits

| Test ID | Action | Expected Outcome |
| :--- | :--- | :--- |
| **A1** | Checkpoint: `bal=3000, earn=1000, boots=300` | Invariants hold. |
| **A2** | `gift_credit +500` | `bal=3500, earn=1500, boots=300` |
| **A3** | `deposit_credit +700` | `bal=4200, earn=1500` (earnings unchanged) |
| **A4** | `cash_spend -800` (from A3 checkpt logic) | `bal=3400, earn=1500` (earnings unchanged) |
| **A5** | `cash_spend -2200` (from `bal=3400, earn=1500`) | `bal=1200, earn=1200` (clamped) |

### Suite B: Boots Behavior

| Test ID | Action | Expected Outcome |
| :--- | :--- | :--- |
| **B1** | Mixed: `trans=200` (`boots=100, cash=100`) from `bal=1200, earn=1200, boots=300` | `bal=1100, boots=200, earn=1100` (clamped) |
| **B2** | Boots empty: `bal=500, boots=0`. Try `boots=1` | **BLOCKED** |
| **B3** | Pure boots: `bal=50, boots=500`. Try `total=200, boots=200` | `bal=50, boots=300` |
| **B4** | Insufficient funds: `bal=80, boots=50`. Try `total=200` | **BLOCKED** |
| **B5** | Negative boots check: `boots=10`. Try `boots=20` | **BLOCKED** |

### Suite C: Edge Values & Rounding

| Test ID | Action | Expected Outcome |
| :--- | :--- | :--- |
| **C1** | Zero amount (`+0`, `-0`) | No-op, state unchanged, replay safe. |
| **C2** | Fractional (`0.5`) | **BLOCKED** (integers only) |
| **C3** | Large numbers (`2B`) | No overflow, correct sums. |

### Suite D: Ordering & Replay

| Test ID | Action | Expected Outcome |
| :--- | :--- | :--- |
| **D1** | Sequence: `gift+1000`, `dep+2000`, `spend-1500`, `mix-1200`, `spend-900` | Final state matches generic replay. |
| **D2** | Reverse/Shuffle order | Final state may differ (path dependency), but valid invariants. |

### Suite E: Idempotency & Concurrency

| Test ID | Action | Expected Outcome |
| :--- | :--- | :--- |
| **E1** | Repeat `idempotency_key` | First applies, second returns "already processed". |
| **E2** | Concurrent double-spend | Only one succeeds. No negative balance. |
| **E3** | Concurrent mixed boots | Only one succeeds. No negative boots. |

### Suite F: Option B Policy Validation

| Test ID | Action | Expected Outcome |
| :--- | :--- | :--- |
| **F1** | Spend within deposits | Earnings UNCHANGED. |
| **F2** | Spend crossing deposits | Earnings CLAMPED (`min(earning, balance)`). |

---

## Output Requirements

Runner must print to `.log` file:
1. **Action Summary**: e.g., "A2: Gift Credit +500"
2. **Pre-state**: `B/E/Boots`
3. **Post-state**: `B/E/Boots`
4. **Txn Record**: details
5. **Pass/Fail**: for each invariant.
6. **Final Summary**: Full replay comparison & Concurrency results.
