/**
 * RELIABLE E2E TEST — Suite 4: Idempotency (Section I)
 *
 * Tests that duplicate inserts with the same idempotency_key
 * do NOT apply wallet changes twice.
 * Output → scripts/e2e_suite_4_results.log
 */
import * as path from 'path';
import {
    assertInvariants, assertValues,
    cleanupTestTxns,
    closeClient,
    disableOldTriggers, enableOldTriggers,
    fmtState,
    getState,
    insertTransaction,
    pickTestUser,
    restoreState,
    setState,
    TestLogger,
    WalletState
} from './e2e_helpers';

const LOG_PATH = path.join(__dirname, 'e2e_suite_4_results.log');
const PREFIX = '[E2E-S4]';

async function main() {
    const logger = new TestLogger();
    logger.header('          RELIABLE E2E TEST — Suite 4: Idempotency');

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
            apply_mode: 'db', idempotency_key: `e2e-s4-cp-${Date.now()}`,
        });

        logger.separator();
        logger.log('I0: Checkpoint set: B=5000, E=2000, Boots=500');
        logger.log(`  >> I0 Result: PASS`);
        logger.passed++;

        // ── I1: First insert with key K1 (should apply) ────────────────────
        const idemKey = `e2e-s4-idem-${Date.now()}`;

        logger.separator();
        logger.log(`I1: First insert with idempotency_key="${idemKey}"`);

        const pre1 = await getState(userId);
        logger.log(`  Pre-state:  ${fmtState(pre1)}`);

        await insertTransaction({
            user_id: userId, type: 'cash_spend', total: 500, cash_used: 500, boots_used: 0,
            amount: 500, description: `${PREFIX} cash_spend -500 (first)`,
            apply_mode: 'db', idempotency_key: idemKey,
        });
        await new Promise(r => setTimeout(r, 200));

        const post1 = await getState(userId);
        const expected1: WalletState = { balance: 4500, earnings_balance: 2000, boots_count: 500 };
        logger.log(`  Post-state: ${fmtState(post1)}`);
        logger.log(`  Expected:   ${fmtState(expected1)}`);

        const inv1 = assertInvariants(post1, logger);
        const val1 = assertValues(post1, expected1, logger);
        const pass1 = inv1 && val1;
        logger.log(`  >> I1 Result: ${pass1 ? 'PASS' : 'FAIL'}`);
        pass1 ? logger.passed++ : logger.failed++;

        // ── I2: Duplicate insert with same key K1 (must NOT apply) ──────────
        logger.separator();
        logger.log(`I2: Duplicate insert with same idempotency_key="${idemKey}"`);

        const pre2 = await getState(userId);
        logger.log(`  Pre-state:  ${fmtState(pre2)}`);

        let duplicateRejected = false;
        try {
            await insertTransaction({
                user_id: userId, type: 'cash_spend', total: 500, cash_used: 500, boots_used: 0,
                amount: 500, description: `${PREFIX} cash_spend -500 (duplicate)`,
                apply_mode: 'db', idempotency_key: idemKey, // SAME KEY
            });
            // If we get here, the duplicate was NOT rejected - check if wallet changed
            await new Promise(r => setTimeout(r, 200));
        } catch (err: any) {
            duplicateRejected = true;
            logger.log(`  Duplicate correctly rejected: ${err.message}`);
        }

        const post2 = await getState(userId);
        logger.log(`  Post-state: ${fmtState(post2)}`);

        // Wallet should still be at 4500 (not 4000)
        const expected2: WalletState = { balance: 4500, earnings_balance: 2000, boots_count: 500 };
        logger.log(`  Expected:   ${fmtState(expected2)} (unchanged from I1)`);

        const inv2 = assertInvariants(post2, logger);
        const val2 = assertValues(post2, expected2, logger);

        if (!duplicateRejected && val2) {
            logger.log('  Note: Duplicate was silently accepted but wallet unchanged (acceptable)');
        }

        const pass2 = inv2 && val2;
        logger.log(`  Idempotency enforced: ${duplicateRejected ? 'YES (DB rejected)' : (val2 ? 'YES (wallet unchanged)' : 'NO - DOUBLE APPLIED!')}`);
        logger.log(`  >> I2 Result: ${pass2 ? 'PASS' : 'FAIL'}`);
        pass2 ? logger.passed++ : logger.failed++;

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
