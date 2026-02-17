/**
 * RELIABLE E2E TEST — Suite 2: Boots E2E (Section G)
 *
 * Tests: G1-G3 (mixed purchase, boots negative, insufficient funds)
 * Output → scripts/e2e_suite_2_results.log
 */
import * as path from 'path';
import {
    cleanupTestTxns,
    closeClient,
    disableOldTriggers, enableOldTriggers,
    fmtState,
    insertTransaction,
    pickTestUser,
    restoreState,
    runTestStep,
    setState,
    TestLogger,
    TxInsert,
    WalletState
} from './e2e_helpers';

const LOG_PATH = path.join(__dirname, 'e2e_suite_2_results.log');
const PREFIX = '[E2E-S2]';

function makeTx(userId: string, type: string, total: number, cashUsed: number, bootsUsed: number, key: string): TxInsert {
    return {
        user_id: userId,
        type,
        total,
        cash_used: cashUsed,
        boots_used: bootsUsed,
        amount: total,
        description: `${PREFIX} ${type} total=${total}`,
        apply_mode: 'db',
        idempotency_key: key,
    };
}

async function main() {
    const logger = new TestLogger();
    logger.header('          RELIABLE E2E TEST — Suite 2: Boots E2E');

    const { id: userId, original } = await pickTestUser();
    logger.log(`Test User ID: ${userId}`);
    logger.log(`Original State (will be restored): ${fmtState(original)}`);
    logger.log('');

    try {
        logger.log('Disabling old trigger_sync_balance...');
        await disableOldTriggers();
        logger.log('Done.\n');

        await cleanupTestTxns(userId, PREFIX);

        // ── Set up starting state from Suite 1 end (F5 result) ──────────────
        // But per spec, let's start fresh with known state for boots testing
        const checkpoint: WalletState = { balance: 1200, earnings_balance: 1200, boots_count: 300 };
        await setState(userId, checkpoint);

        // Insert checkpoint
        await insertTransaction({
            user_id: userId, type: 'checkpoint', total: 0, cash_used: 0, boots_used: 0,
            amount: 0, description: `${PREFIX} CHECKPOINT B=1200 E=1200 Boots=300`,
            apply_mode: 'db', idempotency_key: `e2e-s2-cp-${Date.now()}`,
        });

        // ── G1: Mixed Purchase (total 200, boots 100, cash 100) ─────────────
        // Expected: balance -= 100 (1200 → 1100), boots -= 100 (300 → 200)
        // earnings = min(1200, 1100) = 1100
        let result = await runTestStep(
            'G1', 'purchase: total=200, boots=100, cash=100',
            userId,
            makeTx(userId, 'purchase', 200, 100, 100, `e2e-s2-g1-${Date.now()}`),
            { balance: 1100, earnings_balance: 1100, boots_count: 200 },
            logger
        );
        result ? logger.passed++ : logger.failed++;

        // ── G2: Boots cannot go negative ────────────────────────────────────
        // Attempt to use 300 boots when only 200 remain
        result = await runTestStep(
            'G2', 'purchase with boots_used > boots_count (should reject)',
            userId,
            makeTx(userId, 'purchase', 400, 100, 300, `e2e-s2-g2-${Date.now()}`),
            { balance: 1100, earnings_balance: 1100, boots_count: 200 }, // unchanged
            logger,
            { expectReject: true }
        );
        result ? logger.passed++ : logger.failed++;

        // ── G3: Insufficient combined funds ─────────────────────────────────
        // Attempt cash_used=2000 when balance=1100
        result = await runTestStep(
            'G3', 'purchase with cash_used > balance (should reject)',
            userId,
            makeTx(userId, 'purchase', 2100, 2000, 100, `e2e-s2-g3-${Date.now()}`),
            { balance: 1100, earnings_balance: 1100, boots_count: 200 }, // unchanged
            logger,
            { expectReject: true }
        );
        result ? logger.passed++ : logger.failed++;

    } finally {
        await cleanupTestTxns(userId, PREFIX);
        await restoreState(userId, original, logger);
        logger.log('Re-enabling old trigger_sync_balance...');
        await enableOldTriggers();
        logger.log('Done.');
    }

    logger.writeLog(LOG_PATH);
    await closeClient();
}

main().catch(err => {
    console.error('FATAL:', err.message);
    process.exit(1);
});
