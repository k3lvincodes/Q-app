/**
 * RELIABLE E2E TEST — Suite 3: Replay Validation (Section H)
 *
 * Runs a full sequence of mixed transactions, then replays
 * the entire ledger from checkpoint and asserts exact match.
 * Output → scripts/e2e_suite_3_results.log
 */
import * as path from 'path';
import {
    assertInvariants,
    cleanupTestTxns,
    closeClient,
    disableOldTriggers, enableOldTriggers,
    fmtState,
    getState,
    insertTransaction,
    pickTestUser,
    replayCheck,
    restoreState,
    setState,
    TestLogger,
    WalletState
} from './e2e_helpers';

const LOG_PATH = path.join(__dirname, 'e2e_suite_3_results.log');
const PREFIX = '[E2E-S3]';

async function main() {
    const logger = new TestLogger();
    logger.header('          RELIABLE E2E TEST — Suite 3: Replay Validation');

    const { id: userId, original } = await pickTestUser();
    logger.log(`Test User ID: ${userId}`);
    logger.log(`Original State (will be restored): ${fmtState(original)}`);
    logger.log('');

    try {
        logger.log('Disabling old trigger_sync_balance...');
        await disableOldTriggers();
        logger.log('Done.\n');

        await cleanupTestTxns(userId, PREFIX);

        // ── Checkpoint ──────────────────────────────────────────────────────
        const checkpoint: WalletState = { balance: 5000, earnings_balance: 2000, boots_count: 500 };
        await setState(userId, checkpoint);

        await insertTransaction({
            user_id: userId, type: 'checkpoint', total: 0, cash_used: 0, boots_used: 0,
            amount: 0, description: `${PREFIX} CHECKPOINT B=5000 E=2000 Boots=500`,
            apply_mode: 'db', idempotency_key: `e2e-s3-cp-${Date.now()}`,
        });

        logger.separator();
        logger.log('H1: Checkpoint set: B=5000, E=2000, Boots=500');
        const invOk = assertInvariants(checkpoint, logger);
        logger.log(`  >> H1 Result: ${invOk ? 'PASS' : 'FAIL'}`);
        invOk ? logger.passed++ : logger.failed++;

        // ── Execute a sequence of mixed transactions ────────────────────────
        const steps: { id: string; type: string; total: number; cash: number; boots: number }[] = [
            { id: 'H2', type: 'gift_credit', total: 1000, cash: 1000, boots: 0 },
            { id: 'H3', type: 'deposit_credit', total: 500, cash: 500, boots: 0 },
            { id: 'H4', type: 'cash_spend', total: 800, cash: 800, boots: 0 },
            { id: 'H5', type: 'purchase', total: 300, cash: 100, boots: 200 },
            { id: 'H6', type: 'gift_credit', total: 200, cash: 200, boots: 0 },
            { id: 'H7', type: 'cash_spend', total: 3000, cash: 3000, boots: 0 },
            { id: 'H8', type: 'deposit_credit', total: 1500, cash: 1500, boots: 0 },
            { id: 'H9', type: 'purchase', total: 400, cash: 200, boots: 200 },
        ];

        // Expected replay (manual trace):
        // Start: B=5000, E=2000, Boots=500
        // H2: gift_credit +1000  → B=6000, E=3000, Boots=500
        // H3: deposit_credit +500 → B=6500, E=3000, Boots=500
        // H4: cash_spend -800    → B=5700, E=min(3000,5700)=3000, Boots=500
        // H5: purchase c=100,b=200 → B=5600, E=min(3000,5600)=3000, Boots=300
        // H6: gift_credit +200   → B=5800, E=3200, Boots=300
        // H7: cash_spend -3000   → B=2800, E=min(3200,2800)=2800, Boots=300
        // H8: deposit_credit +1500 → B=4300, E=2800, Boots=300
        // H9: purchase c=200,b=200 → B=4100, E=min(2800,4100)=2800, Boots=100

        for (const step of steps) {
            logger.separator();
            logger.log(`${step.id}: ${step.type} total=${step.total}, cash=${step.cash}, boots=${step.boots}`);

            const pre = await getState(userId);
            logger.log(`  Pre-state:  ${fmtState(pre)}`);

            await insertTransaction({
                user_id: userId, type: step.type, total: step.total,
                cash_used: step.cash, boots_used: step.boots, amount: step.total,
                description: `${PREFIX} ${step.type} total=${step.total}`,
                apply_mode: 'db',
                idempotency_key: `e2e-s3-${step.id}-${Date.now()}`,
            });

            await new Promise(r => setTimeout(r, 200));

            const post = await getState(userId);
            logger.log(`  Post-state: ${fmtState(post)}`);
            const stepInvOk = assertInvariants(post, logger);
            logger.log(`  >> ${step.id} Invariants: ${stepInvOk ? 'PASS' : 'FAIL'}`);
            stepInvOk ? logger.passed++ : logger.failed++;
        }

        // ── FINAL REPLAY CHECK ──────────────────────────────────────────────
        logger.separator();
        logger.log('H-FINAL: Full Replay Validation');

        const expectedFinal: WalletState = { balance: 4100, earnings_balance: 2800, boots_count: 100 };
        const actual = await getState(userId);

        logger.log(`  Expected: ${fmtState(expectedFinal)}`);
        logger.log(`  Actual:   ${fmtState(actual)}`);

        const valMatch = actual.balance === expectedFinal.balance &&
            actual.earnings_balance === expectedFinal.earnings_balance &&
            actual.boots_count === expectedFinal.boots_count;

        if (!valMatch) {
            logger.log('  ** VALUE MISMATCH in final state **');
        }

        const replayOk = await replayCheck(userId, logger);
        const finalPass = valMatch && replayOk;
        logger.log(`  >> H-FINAL Result: ${finalPass ? 'PASS' : 'FAIL'}`);
        finalPass ? logger.passed++ : logger.failed++;

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
