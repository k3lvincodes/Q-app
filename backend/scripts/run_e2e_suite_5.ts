/**
 * RELIABLE E2E TEST — Suite 5: Concurrency (Section J)
 *
 * Uses raw pg Pool for true concurrent queries.
 * Tests that parallel double-spends are handled atomically.
 * Output → scripts/e2e_suite_5_results.log
 */
import dotenv from 'dotenv';
import * as path from 'path';
import { Pool } from 'pg';
dotenv.config();

import {
    assertInvariants,
    closeClient,
    disableOldTriggers, enableOldTriggers,
    fmtState,
    getState,
    pickTestUser,
    restoreState,
    setState,
    TestLogger
} from './e2e_helpers';

const LOG_PATH = path.join(__dirname, 'e2e_suite_5_results.log');
const PREFIX = '[E2E-S5]';

async function insertTxRaw(pool: Pool, tx: {
    userId: string; type: string; total: number; cashUsed: number;
    bootsUsed: number; key: string; desc: string;
}): Promise<{ success: boolean; error?: string }> {
    const client = await pool.connect();
    try {
        await client.query(
            `INSERT INTO transactions (user_id, type, total, cash_used, boots_used, amount, description, apply_mode, idempotency_key)
             VALUES ($1, $2, $3, $4, $5, $6, $7, 'db', $8)`,
            [tx.userId, tx.type, tx.total, tx.cashUsed, tx.bootsUsed, tx.total, tx.desc, tx.key]
        );
        return { success: true };
    } catch (err: any) {
        return { success: false, error: err.message };
    } finally {
        client.release();
    }
}

async function cleanupTestTxnsPg(pool: Pool, userId: string): Promise<void> {
    const client = await pool.connect();
    try {
        await client.query(
            `DELETE FROM transactions WHERE user_id = $1 AND description LIKE $2`,
            [userId, `${PREFIX}%`]
        );
    } finally {
        client.release();
    }
}

async function main() {
    const logger = new TestLogger();
    logger.header('          RELIABLE E2E TEST — Suite 5: Concurrency');

    const { id: userId, original } = await pickTestUser();
    logger.log(`Test User ID: ${userId}`);
    logger.log(`Original State (will be restored): ${fmtState(original)}`);
    logger.log('');

    const connStr = (process.env.DATABASE_URL || '').replace(':6543/', ':5432/');
    const pool = new Pool({
        connectionString: connStr,
        ssl: { rejectUnauthorized: false },
        max: 10,
    });

    try {
        logger.log('Disabling old trigger_sync_balance...');
        await disableOldTriggers();
        logger.log('Done.\n');

        await cleanupTestTxnsPg(pool, userId);

        // ══════════════════════════════════════════════════════════════════════
        // J1: Parallel double cash spend
        // ══════════════════════════════════════════════════════════════════════
        logger.separator();
        logger.log('J1: Parallel double cash spend');
        logger.log('  Setup: balance=1000, earnings=0, boots=0');

        await setState(userId, { balance: 1000, earnings_balance: 0, boots_count: 0 });

        const pre1 = await getState(userId);
        logger.log(`  Pre-state:  ${fmtState(pre1)}`);

        const ts1 = Date.now();

        // Fire two 700-spend transactions concurrently
        const [resultA, resultB] = await Promise.all([
            insertTxRaw(pool, {
                userId, type: 'cash_spend', total: 700, cashUsed: 700, bootsUsed: 0,
                key: `e2e-s5-j1a-${ts1}`, desc: `${PREFIX} cash_spend -700 (A)`,
            }),
            insertTxRaw(pool, {
                userId, type: 'cash_spend', total: 700, cashUsed: 700, bootsUsed: 0,
                key: `e2e-s5-j1b-${ts1}`, desc: `${PREFIX} cash_spend -700 (B)`,
            }),
        ]);

        await new Promise(r => setTimeout(r, 300));

        const post1 = await getState(userId);
        logger.log(`  Result A: ${resultA.success ? 'SUCCESS' : `REJECTED (${resultA.error})`}`);
        logger.log(`  Result B: ${resultB.success ? 'SUCCESS' : `REJECTED (${resultB.error})`}`);
        logger.log(`  Post-state: ${fmtState(post1)}`);

        // Exactly one should succeed
        const oneSucceeded = (resultA.success && !resultB.success) || (!resultA.success && resultB.success);
        const balanceCorrect = post1.balance === 300;
        const neverNegative = post1.balance >= 0;

        logger.log(`  One succeeded, one failed: ${oneSucceeded ? 'YES' : 'NO'}`);
        logger.log(`  Balance = 300: ${balanceCorrect ? 'YES' : `NO (got ${post1.balance})`}`);
        logger.log(`  Balance >= 0 (never negative): ${neverNegative ? 'YES' : 'NO'}`);

        const j1Pass = oneSucceeded && balanceCorrect && neverNegative;

        // Also check: if both succeeded, was the balance double-decremented?
        if (resultA.success && resultB.success) {
            logger.log('  ** WARNING ** Both succeeded — checking for double-decrement...');
            if (post1.balance < 0) {
                logger.log('  ** FAIL ** Balance went negative — no atomic protection!');
            } else if (post1.balance === 300) {
                logger.log('  ** ISSUE ** Both claimed success but only 700 was deducted (phantom success?)');
            }
        }

        assertInvariants(post1, logger);
        logger.log(`  >> J1 Result: ${j1Pass ? 'PASS' : 'FAIL'}`);
        j1Pass ? logger.passed++ : logger.failed++;

        // Clean up J1 txns
        await cleanupTestTxnsPg(pool, userId);

        // ══════════════════════════════════════════════════════════════════════
        // J2: Parallel mixed purchase
        // ══════════════════════════════════════════════════════════════════════
        logger.separator();
        logger.log('J2: Parallel mixed purchase');
        logger.log('  Setup: balance=300, earnings=0, boots=300');

        await setState(userId, { balance: 300, earnings_balance: 0, boots_count: 300 });

        const pre2 = await getState(userId);
        logger.log(`  Pre-state:  ${fmtState(pre2)}`);

        const ts2 = Date.now();

        // Fire two purchase(total=400, cash=200, boots=200) concurrently
        const [resultC, resultD] = await Promise.all([
            insertTxRaw(pool, {
                userId, type: 'purchase', total: 400, cashUsed: 200, bootsUsed: 200,
                key: `e2e-s5-j2a-${ts2}`, desc: `${PREFIX} purchase (C)`,
            }),
            insertTxRaw(pool, {
                userId, type: 'purchase', total: 400, cashUsed: 200, bootsUsed: 200,
                key: `e2e-s5-j2b-${ts2}`, desc: `${PREFIX} purchase (D)`,
            }),
        ]);

        await new Promise(r => setTimeout(r, 300));

        const post2 = await getState(userId);
        logger.log(`  Result C: ${resultC.success ? 'SUCCESS' : `REJECTED (${resultC.error})`}`);
        logger.log(`  Result D: ${resultD.success ? 'SUCCESS' : `REJECTED (${resultD.error})`}`);
        logger.log(`  Post-state: ${fmtState(post2)}`);

        const oneSucceeded2 = (resultC.success && !resultD.success) || (!resultC.success && resultD.success);
        const neverNeg2 = post2.balance >= 0 && post2.boots_count >= 0;

        logger.log(`  One succeeded, one failed: ${oneSucceeded2 ? 'YES' : 'NO'}`);
        logger.log(`  Never negative: ${neverNeg2 ? 'YES' : 'NO'}`);

        if (resultC.success && resultD.success) {
            logger.log('  ** WARNING ** Both purchases succeeded — checking for over-spend...');
        }

        assertInvariants(post2, logger);

        const j2Pass = oneSucceeded2 && neverNeg2;
        logger.log(`  >> J2 Result: ${j2Pass ? 'PASS' : 'FAIL'}`);
        j2Pass ? logger.passed++ : logger.failed++;

    } finally {
        await cleanupTestTxnsPg(pool, userId);
        await restoreState(userId, original, logger);
        logger.log('Re-enabling old trigger_sync_balance...');
        await enableOldTriggers();
        logger.log('Done.');
        await pool.end();
    }

    logger.writeLog(LOG_PATH);
    await closeClient();
}

main().catch(err => {
    console.error('FATAL:', err.message);
    process.exit(1);
});
