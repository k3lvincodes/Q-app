/**
 * RELIABLE E2E TEST — Suite 1: E2E Basics (Section F)
 *
 * Tests: F1-F5 (checkpoint, gift_credit, deposit_credit, cash_spend, cash_spend clamp)
 * All transactions go through the DB trigger (apply_mode='db').
 * Output → scripts/e2e_suite_1_results.log
 */
import * as path from 'path';
import {
    cleanupTestTxns,
    closeClient,
    disableOldTriggers, enableOldTriggers, ensureWalletTrigger,
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

const LOG_PATH = path.join(__dirname, 'e2e_suite_1_results.log');
const PREFIX = '[E2E-S1]';

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
    logger.header('          RELIABLE E2E TEST — Suite 1: E2E Basics');

    const { id: userId, original } = await pickTestUser();
    logger.log(`Test User ID: ${userId}`);
    logger.log(`Original State (will be restored): ${fmtState(original)}`);
    logger.log('');

    try {
        // Disable old trigger to avoid double-counting
        logger.log('Disabling old trigger_sync_balance...');
        await disableOldTriggers();
        logger.log('Done.');

        logger.log('Ensuring new trg_apply_wallet is enabled...');
        await ensureWalletTrigger();
        logger.log('Done.\n');

        // Clean up any leftover test txns
        await cleanupTestTxns(userId, PREFIX);

        // ── F1: Checkpoint ──────────────────────────────────────────────────
        const checkpoint: WalletState = { balance: 3000, earnings_balance: 1000, boots_count: 300 };
        await setState(userId, checkpoint);

        // Insert checkpoint transaction (for replay)
        await insertTransaction({
            user_id: userId,
            type: 'checkpoint',
            total: 0,
            cash_used: 0,
            boots_used: 0,
            amount: 0,
            description: `${PREFIX} CHECKPOINT B=3000 E=1000 Boots=300`,
            apply_mode: 'db',
            idempotency_key: `e2e-s1-checkpoint-${Date.now()}`,
        });

        let result = await runTestStep(
            'F1', 'Checkpoint: bal=3000, earn=1000, boots=300',
            userId, null, checkpoint, logger
        );
        result ? logger.passed++ : logger.failed++;

        // ── F2: Gift Credit +500 ────────────────────────────────────────────
        result = await runTestStep(
            'F2', 'gift_credit +500',
            userId,
            makeTx(userId, 'gift_credit', 500, 500, 0, `e2e-s1-f2-${Date.now()}`),
            { balance: 3500, earnings_balance: 1500, boots_count: 300 },
            logger
        );
        result ? logger.passed++ : logger.failed++;

        // ── F3: Deposit Credit +700 ─────────────────────────────────────────
        result = await runTestStep(
            'F3', 'deposit_credit +700',
            userId,
            makeTx(userId, 'deposit_credit', 700, 700, 0, `e2e-s1-f3-${Date.now()}`),
            { balance: 4200, earnings_balance: 1500, boots_count: 300 },
            logger
        );
        result ? logger.passed++ : logger.failed++;

        // ── F4: Cash Spend -800 ─────────────────────────────────────────────
        result = await runTestStep(
            'F4', 'cash_spend -800 (deposit-first, earnings unchanged)',
            userId,
            makeTx(userId, 'cash_spend', 800, 800, 0, `e2e-s1-f4-${Date.now()}`),
            { balance: 3400, earnings_balance: 1500, boots_count: 300 },
            logger
        );
        result ? logger.passed++ : logger.failed++;

        // ── F5: Cash Spend -2200 (earnings clamp) ───────────────────────────
        result = await runTestStep(
            'F5', 'cash_spend -2200 (earnings clamped to balance)',
            userId,
            makeTx(userId, 'cash_spend', 2200, 2200, 0, `e2e-s1-f5-${Date.now()}`),
            { balance: 1200, earnings_balance: 1200, boots_count: 300 },
            logger
        );
        result ? logger.passed++ : logger.failed++;

    } finally {
        // Clean up test transactions
        await cleanupTestTxns(userId, PREFIX);
        // Restore original state
        await restoreState(userId, original, logger);
        // Re-enable old trigger
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
