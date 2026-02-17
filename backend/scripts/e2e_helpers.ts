/**
 * Shared helpers for Reliable E2E Wallet Tests
 * Uses a SINGLE dedicated pg Client for all DB operations.
 */
import dotenv from 'dotenv';
dotenv.config();

import * as fs from 'fs';
import { Client } from 'pg';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface WalletState {
    balance: number;
    earnings_balance: number;
    boots_count: number;
}

export interface TxInsert {
    user_id: string;
    type: string;
    total: number;
    cash_used: number;
    boots_used: number;
    amount: number;
    description: string;
    apply_mode: string;
    idempotency_key?: string;
}

// ─── Shared Client ───────────────────────────────────────────────────────────

let _client: Client | null = null;

function getConnStr(): string {
    let connStr = process.env.DATABASE_URL || '';
    // Use direct Postgres port, not PgBouncer
    connStr = connStr.replace(':6543/', ':5432/');
    return connStr;
}

export async function getClient(): Promise<Client> {
    if (!_client) {
        _client = new Client({
            connectionString: getConnStr(),
            ssl: { rejectUnauthorized: false },
        });
        await _client.connect();
    }
    return _client;
}

export async function closeClient(): Promise<void> {
    if (_client) {
        await _client.end();
        _client = null;
    }
}

// ─── Logger ──────────────────────────────────────────────────────────────────

export class TestLogger {
    lines: string[] = [];
    passed = 0;
    failed = 0;

    log(msg: string) {
        console.log(msg);
        this.lines.push(msg);
    }

    separator() {
        this.log('----------------------------------------------------------------------');
    }

    header(title: string) {
        this.log('======================================================================');
        this.log(title);
        this.log(`Run: ${new Date().toISOString()}`);
        this.log('======================================================================');
        this.log('');
    }

    writeLog(filePath: string) {
        this.log('');
        this.separator();
        this.log('FINAL SUMMARY');
        this.separator();
        this.log(`  Total:  ${this.passed + this.failed}`);
        this.log(`  Passed: ${this.passed}`);
        this.log(`  Failed: ${this.failed}`);
        this.log(`  Result: ${this.failed === 0 ? 'ALL PASSED ✓' : 'SOME FAILED ✗'}`);
        this.separator();
        fs.writeFileSync(filePath, this.lines.join('\n'), 'utf-8');
        console.log(`\nLog written to: ${filePath}`);
    }
}

// ─── Formatting ──────────────────────────────────────────────────────────────

export function fmtState(s: WalletState): string {
    return `B=${s.balance} / E=${s.earnings_balance} / Boots=${s.boots_count}`;
}

// ─── Invariant Checks ────────────────────────────────────────────────────────

export function assertInvariants(state: WalletState, logger: TestLogger): boolean {
    const checks = [
        { name: 'balance >= 0', pass: state.balance >= 0 },
        { name: 'earnings_balance >= 0', pass: state.earnings_balance >= 0 },
        { name: 'boots_count >= 0 (integer)', pass: state.boots_count >= 0 && Number.isInteger(state.boots_count) },
        { name: 'earnings_balance <= balance', pass: state.earnings_balance <= state.balance },
    ];

    let allPass = true;
    for (const c of checks) {
        const status = c.pass ? 'PASS' : '** FAIL **';
        logger.log(`  Invariant [${c.name}]: ${status}`);
        if (!c.pass) allPass = false;
    }
    return allPass;
}

export function assertValues(actual: WalletState, expected: WalletState, logger: TestLogger): boolean {
    const bOk = actual.balance === expected.balance;
    const eOk = actual.earnings_balance === expected.earnings_balance;
    const bootsOk = actual.boots_count === expected.boots_count;

    if (!bOk) logger.log(`  ** VALUE MISMATCH ** balance: expected ${expected.balance}, got ${actual.balance}`);
    if (!eOk) logger.log(`  ** VALUE MISMATCH ** earnings_balance: expected ${expected.earnings_balance}, got ${actual.earnings_balance}`);
    if (!bootsOk) logger.log(`  ** VALUE MISMATCH ** boots_count: expected ${expected.boots_count}, got ${actual.boots_count}`);

    return bOk && eOk && bootsOk;
}

// ─── DB Operations (all via shared pg Client) ────────────────────────────────

export const TEST_USER_EMAIL = 'fehkelvink@gmail.com';

export async function pickTestUser(): Promise<{ id: string; original: WalletState }> {
    const client = await getClient();
    const { rows } = await client.query(
        `SELECT id, balance, earnings_balance, boots_count FROM profiles WHERE email = $1`,
        [TEST_USER_EMAIL]
    );
    if (!rows[0]) throw new Error(`Test user ${TEST_USER_EMAIL} not found`);
    return {
        id: rows[0].id,
        original: {
            balance: parseFloat(rows[0].balance),
            earnings_balance: parseFloat(rows[0].earnings_balance),
            boots_count: parseInt(rows[0].boots_count),
        },
    };
}

export async function getState(userId: string): Promise<WalletState> {
    const client = await getClient();
    const { rows } = await client.query(
        `SELECT balance, earnings_balance, boots_count FROM profiles WHERE id = $1`,
        [userId]
    );
    if (!rows[0]) throw new Error(`User ${userId} not found`);
    return {
        balance: parseFloat(rows[0].balance),
        earnings_balance: parseFloat(rows[0].earnings_balance),
        boots_count: parseInt(rows[0].boots_count),
    };
}

export async function setState(userId: string, state: WalletState): Promise<void> {
    const client = await getClient();
    const result = await client.query(
        `UPDATE profiles SET balance = $1, earnings_balance = $2, boots_count = $3 WHERE id = $4`,
        [state.balance, state.earnings_balance, state.boots_count, userId]
    );
    if (result.rowCount === 0) throw new Error(`Failed to set state: no rows updated for ${userId}`);
}

export async function restoreState(userId: string, state: WalletState, logger: TestLogger): Promise<void> {
    await setState(userId, state);
    logger.log(`Original profile state restored: ${fmtState(state)}`);
}

/**
 * Insert a transaction row via pg. The trigger fires within the same connection.
 */
export async function insertTransaction(tx: TxInsert): Promise<any> {
    const client = await getClient();
    const { rows } = await client.query(
        `INSERT INTO transactions (user_id, type, total, cash_used, boots_used, amount, description, apply_mode, idempotency_key)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
         RETURNING *`,
        [tx.user_id, tx.type, tx.total, tx.cash_used, tx.boots_used, tx.amount, tx.description, tx.apply_mode, tx.idempotency_key || null]
    );
    return rows[0];
}

/**
 * Delete test transactions (cleanup). Deletes by description prefix.
 */
export async function cleanupTestTxns(userId: string, prefix: string): Promise<void> {
    const client = await getClient();
    await client.query(
        `DELETE FROM transactions WHERE user_id = $1 AND description LIKE $2`,
        [userId, `${prefix}%`]
    );
}

// ─── Trigger Management ─────────────────────────────────────────────────────

const OLD_TRIGGERS = ['trigger_sync_balance', 'trigger_check_funds', 'trigger_deduct_boots'];

export async function disableOldTriggers(): Promise<void> {
    const client = await getClient();
    for (const trig of OLD_TRIGGERS) {
        try {
            await client.query(`ALTER TABLE transactions DISABLE TRIGGER ${trig};`);
        } catch (e: any) {
            if (!e.message.includes('does not exist')) throw e;
        }
    }
}

export async function enableOldTriggers(): Promise<void> {
    const client = await getClient();
    for (const trig of OLD_TRIGGERS) {
        try {
            await client.query(`ALTER TABLE transactions ENABLE TRIGGER ${trig};`);
        } catch (e: any) {
            if (!e.message.includes('does not exist')) throw e;
        }
    }
}

export async function ensureWalletTrigger(): Promise<void> {
    const client = await getClient();
    try {
        await client.query(`ALTER TABLE transactions ENABLE TRIGGER trg_apply_wallet;`);
    } catch (e: any) {
        // Create if missing? Or just log?Ideally it should exist.
        if (e.message.includes('does not exist')) {
            console.log('WARNING: trg_apply_wallet missing in DB, creation attempt...');
            // Use DO block for safety
            await client.query(`
                DO $$
                BEGIN
                    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_apply_wallet') THEN
                        CREATE TRIGGER trg_apply_wallet
                        AFTER INSERT ON public.transactions
                        FOR EACH ROW
                        EXECUTE FUNCTION public.apply_wallet_on_transaction();
                    END IF;
                END $$;
             `);
        } else {
            throw e;
        }
    }
}

// ─── Replay Check (Section H) ───────────────────────────────────────────────

export async function replayCheck(userId: string, logger: TestLogger): Promise<boolean> {
    const client = await getClient();

    const { rows: cpRows } = await client.query(
        `SELECT * FROM transactions WHERE user_id = $1 AND type = 'checkpoint' AND apply_mode = 'db'
         ORDER BY created_at DESC LIMIT 1`,
        [userId]
    );

    if (!cpRows[0]) {
        logger.log('  Replay: No checkpoint found, skipping replay');
        return true;
    }

    const checkpointTx = cpRows[0];
    const cpMatch = checkpointTx.description.match(/CHECKPOINT B=(\d+) E=(\d+) Boots=(\d+)/);
    if (!cpMatch) {
        logger.log('  Replay: Could not parse checkpoint description, skipping');
        return true;
    }

    let rBal = parseFloat(cpMatch[1]);
    let rEarn = parseFloat(cpMatch[2]);
    let rBoots = parseInt(cpMatch[3]);

    const { rows: txns } = await client.query(
        `SELECT * FROM transactions
         WHERE user_id = $1 AND apply_mode = 'db' AND type != 'checkpoint' AND created_at > $2
         ORDER BY created_at ASC`,
        [userId, checkpointTx.created_at]
    );

    for (const tx of txns) {
        switch (tx.type) {
            case 'gift_credit':
                rBal += parseFloat(tx.total);
                rEarn += parseFloat(tx.total);
                break;
            case 'deposit_credit':
                rBal += parseFloat(tx.total);
                break;
            case 'cash_spend':
                rBal -= parseFloat(tx.cash_used);
                rEarn = Math.min(rEarn, rBal);
                break;
            case 'purchase':
                rBoots -= parseInt(tx.boots_used);
                rBal -= parseFloat(tx.cash_used);
                rEarn = Math.min(rEarn, rBal);
                break;
        }
    }

    const actual = await getState(userId);
    const balOk = actual.balance === rBal;
    const earnOk = actual.earnings_balance === rEarn;
    const bootsOk = actual.boots_count === rBoots;

    logger.log(`  Replay: computed ${fmtState({ balance: rBal, earnings_balance: rEarn, boots_count: rBoots })}`);
    logger.log(`  Replay: actual  ${fmtState(actual)}`);

    if (balOk && earnOk && bootsOk) {
        logger.log('  Replay: MATCH ✓');
        return true;
    } else {
        if (!balOk) logger.log(`  Replay: ** MISMATCH ** balance: replay=${rBal}, actual=${actual.balance}`);
        if (!earnOk) logger.log(`  Replay: ** MISMATCH ** earnings: replay=${rEarn}, actual=${actual.earnings_balance}`);
        if (!bootsOk) logger.log(`  Replay: ** MISMATCH ** boots: replay=${rBoots}, actual=${actual.boots_count}`);
        return false;
    }
}

// ─── Test Step Runner ────────────────────────────────────────────────────────

export async function runTestStep(
    testId: string,
    label: string,
    userId: string,
    txData: TxInsert | null,
    expected: WalletState,
    logger: TestLogger,
    opts?: { expectReject?: boolean }
): Promise<boolean> {
    logger.separator();
    logger.log(`${testId}: ${label}`);

    const pre = await getState(userId);
    logger.log(`  Pre-state:  ${fmtState(pre)}`);

    if (txData) {
        try {
            const row = await insertTransaction(txData);

            if (opts?.expectReject) {
                logger.log(`  ** FAIL ** Expected rejection but insert succeeded`);
                logger.log(`  >> ${testId} Result: FAIL`);
                return false;
            }

            logger.log(`  Txn: type=${txData.type}, total=${txData.total}, cash_used=${txData.cash_used}, boots_used=${txData.boots_used}, key=${txData.idempotency_key || 'none'}, apply_mode=${txData.apply_mode}`);
        } catch (err: any) {
            if (opts?.expectReject) {
                logger.log(`  Txn rejected as expected: ${err.message || err.detail}`);
                const post = await getState(userId);
                logger.log(`  Post-state: ${fmtState(post)} (unchanged)`);

                const valOk = assertValues(post, expected, logger);
                const invOk = assertInvariants(post, logger);
                const pass = valOk && invOk;
                logger.log(`  >> ${testId} Result: ${pass ? 'PASS' : 'FAIL'}`);
                return pass;
            }
            logger.log(`  ** INSERT ERROR ** ${err.message || err.detail}`);
            logger.log(`  >> ${testId} Result: FAIL`);
            return false;
        }
    }

    const post = await getState(userId);
    logger.log(`  Post-state: ${fmtState(post)}`);
    logger.log(`  Expected:   ${fmtState(expected)}`);

    const invOk = assertInvariants(post, logger);
    const valOk = assertValues(post, expected, logger);

    const replayOk = await replayCheck(userId, logger);

    const pass = invOk && valOk && replayOk;
    logger.log(`  >> ${testId} Result: ${pass ? 'PASS' : 'FAIL'}`);
    return pass;
}
