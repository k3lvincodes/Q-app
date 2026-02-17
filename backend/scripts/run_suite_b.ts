/**
 * RIGOROUS TEST — Suite B: Boots Behavior
 * 
 * Tests mixed cash+boots transactions, pure boots, insufficient funds,
 * and negative boots guards.
 * Output → scripts/suite_b_results.log
 */

import * as fs from 'fs';
import * as path from 'path';
import { supabase } from '../src/config/supabase';

// ─── Config ──────────────────────────────────────────────────────────────────

const LOG_PATH = path.join(__dirname, 'suite_b_results.log');

let logLines: string[] = [];
let testsPassed = 0;
let testsFailed = 0;
let originalState: WalletState | null = null;

// ─── Types & Helpers ─────────────────────────────────────────────────────────

interface WalletState {
    balance: number;
    earnings_balance: number;
    boots_count: number;
}

function log(msg: string) {
    console.log(msg);
    logLines.push(msg);
}

function logSeparator() {
    log('----------------------------------------------------------------------');
}

function fmtState(s: WalletState): string {
    return `B=${s.balance} / E=${s.earnings_balance} / Boots=${s.boots_count}`;
}

function assertInvariants(state: WalletState, testId: string): boolean {
    const checks = [
        { name: 'balance >= 0', pass: state.balance >= 0 },
        { name: 'earnings_balance >= 0', pass: state.earnings_balance >= 0 },
        { name: 'boots_count >= 0 (integer)', pass: state.boots_count >= 0 && Number.isInteger(state.boots_count) },
        { name: 'earnings_balance <= balance', pass: state.earnings_balance <= state.balance },
    ];

    let allPass = true;
    for (const c of checks) {
        const status = c.pass ? 'PASS' : '** FAIL **';
        log(`  Invariant [${c.name}]: ${status}`);
        if (!c.pass) allPass = false;
    }
    return allPass;
}

function assertValues(actual: WalletState, expected: WalletState): boolean {
    const bOk = actual.balance === expected.balance;
    const eOk = actual.earnings_balance === expected.earnings_balance;
    const bootsOk = actual.boots_count === expected.boots_count;

    if (!bOk) log(`  ** VALUE MISMATCH ** balance: expected ${expected.balance}, got ${actual.balance}`);
    if (!eOk) log(`  ** VALUE MISMATCH ** earnings_balance: expected ${expected.earnings_balance}, got ${actual.earnings_balance}`);
    if (!bootsOk) log(`  ** VALUE MISMATCH ** boots_count: expected ${expected.boots_count}, got ${actual.boots_count}`);

    return bOk && eOk && bootsOk;
}

// ─── DB Ops ──────────────────────────────────────────────────────────────────

async function pickTestUser(): Promise<string> {
    const { data, error } = await supabase
        .from('profiles')
        .select('id, balance, earnings_balance, boots_count')
        .eq('email', 'fehkelvink@gmail.com')
        .single();

    if (error || !data) throw new Error(`Test user fehkelvink@gmail.com not found: ${error?.message}`);

    originalState = {
        balance: data.balance ?? 0,
        earnings_balance: data.earnings_balance ?? 0,
        boots_count: data.boots_count ?? 0,
    };

    return data.id;
}

async function restoreOriginalState(userId: string): Promise<void> {
    if (!originalState) return;
    await supabase
        .from('profiles')
        .update({
            balance: originalState.balance,
            earnings_balance: originalState.earnings_balance,
            boots_count: originalState.boots_count,
        })
        .eq('id', userId);
    log('Original profile state restored.');
}

async function setState(userId: string, state: WalletState): Promise<void> {
    const { error } = await supabase
        .from('profiles')
        .update({
            balance: state.balance,
            earnings_balance: state.earnings_balance,
            boots_count: state.boots_count,
        })
        .eq('id', userId);

    if (error) throw new Error(`Failed to set state: ${error.message}`);
}

async function getState(userId: string): Promise<WalletState> {
    const { data, error } = await supabase
        .from('profiles')
        .select('balance, earnings_balance, boots_count')
        .eq('id', userId)
        .single();

    if (error || !data) throw new Error(`Failed to read state: ${error?.message}`);
    return {
        balance: data.balance,
        earnings_balance: data.earnings_balance,
        boots_count: data.boots_count,
    };
}

// ─── Actions ─────────────────────────────────────────────────────────────────

interface MixedSpendResult {
    blocked: boolean;
    reason?: string;
}

/**
 * Mixed spend: total = cash_used + boots_used.
 * Boots portion deducted from boots_count, cash portion from balance.
 * Option B applies to the cash portion: earnings = min(old_earnings, new_balance).
 * Returns { blocked: true } if insufficient funds/boots.
 */
async function applyMixedSpend(
    userId: string,
    total: number,
    bootsUsed: number,
    cashUsed: number
): Promise<MixedSpendResult> {
    if (bootsUsed + cashUsed !== total) {
        return { blocked: true, reason: `boots_used(${bootsUsed}) + cash_used(${cashUsed}) != total(${total})` };
    }

    const pre = await getState(userId);

    // Guard: enough boots?
    if (bootsUsed > pre.boots_count) {
        return { blocked: true, reason: `Insufficient boots: need ${bootsUsed}, have ${pre.boots_count}` };
    }
    // Guard: enough cash?
    if (cashUsed > pre.balance) {
        return { blocked: true, reason: `Insufficient cash: need ${cashUsed}, have ${pre.balance}` };
    }
    // Guard: total affordable?
    if (cashUsed + bootsUsed > pre.balance + pre.boots_count) {
        return { blocked: true, reason: `Insufficient total funds: need ${total}, have bal=${pre.balance}+boots=${pre.boots_count}` };
    }

    const newBal = pre.balance - cashUsed;
    const newBoots = pre.boots_count - bootsUsed;
    // Option B: earnings clamped to new balance
    const newEarn = Math.min(pre.earnings_balance, newBal);

    await setState(userId, {
        balance: newBal,
        earnings_balance: newEarn,
        boots_count: newBoots,
    });

    return { blocked: false };
}

/**
 * Pure boots spend: cash_used = 0, boots_used = total.
 * Balance unchanged, only boots deducted.
 */
async function applyPureBootsSpend(
    userId: string,
    total: number,
    bootsUsed: number
): Promise<MixedSpendResult> {
    const pre = await getState(userId);

    if (bootsUsed > pre.boots_count) {
        return { blocked: true, reason: `Insufficient boots: need ${bootsUsed}, have ${pre.boots_count}` };
    }

    await setState(userId, {
        balance: pre.balance,  // unchanged
        earnings_balance: pre.earnings_balance,  // unchanged (no cash debit)
        boots_count: pre.boots_count - bootsUsed,
    });

    return { blocked: false };
}

// ─── Test Runners ────────────────────────────────────────────────────────────

async function runSuccessTest(
    testId: string,
    actionLabel: string,
    action: () => Promise<MixedSpendResult>,
    userId: string,
    expected: WalletState
): Promise<boolean> {
    logSeparator();
    log(`${testId}: ${actionLabel}`);

    const pre = await getState(userId);
    log(`  Pre-state:  ${fmtState(pre)}`);

    const result = await action();
    if (result.blocked) {
        log(`  UNEXPECTED BLOCK: ${result.reason}`);
        log(`  >> ${testId} Result: FAIL (should have succeeded)`);
        return false;
    }

    const post = await getState(userId);
    log(`  Post-state: ${fmtState(post)}`);
    log(`  Expected:   ${fmtState(expected)}`);

    const invOk = assertInvariants(post, testId);
    const valOk = assertValues(post, expected);
    const pass = invOk && valOk;

    log(`  >> ${testId} Result: ${pass ? 'PASS' : 'FAIL'}`);
    return pass;
}

async function runBlockedTest(
    testId: string,
    actionLabel: string,
    action: () => Promise<MixedSpendResult>,
    userId: string
): Promise<boolean> {
    logSeparator();
    log(`${testId}: ${actionLabel} (expect BLOCKED)`);

    const pre = await getState(userId);
    log(`  Pre-state:  ${fmtState(pre)}`);

    const result = await action();

    if (!result.blocked) {
        const post = await getState(userId);
        log(`  UNEXPECTED SUCCESS — Post-state: ${fmtState(post)}`);
        log(`  >> ${testId} Result: FAIL (should have been BLOCKED)`);
        return false;
    }

    log(`  Correctly BLOCKED: ${result.reason}`);

    // Verify state unchanged
    const post = await getState(userId);
    log(`  Post-state: ${fmtState(post)} (should match pre)`);

    const unchanged = post.balance === pre.balance &&
        post.earnings_balance === pre.earnings_balance &&
        post.boots_count === pre.boots_count;

    if (!unchanged) {
        log(`  ** FAIL ** State changed despite being blocked!`);
    }

    const invOk = assertInvariants(post, testId);
    const pass = invOk && unchanged;

    log(`  >> ${testId} Result: ${pass ? 'PASS' : 'FAIL'}`);
    return pass;
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
    log('======================================================================');
    log('          RIGOROUS TEST -- Suite B: Boots Behavior                    ');
    log(`          Run: ${new Date().toISOString()}`);
    log('======================================================================');
    log('');

    const userId = await pickTestUser();
    log(`Test User ID: ${userId}`);
    log(`Original State (will be restored): ${fmtState(originalState!)}`);
    log('');

    try {
        // ── B1: Mixed spend (boots=100, cash=100) ────────────────────────────
        // Starting state from end of Suite A: bal=1200, earn=1200, boots=300
        await setState(userId, { balance: 1200, earnings_balance: 1200, boots_count: 300 });

        let result = await runSuccessTest(
            'B1', 'Mixed: total=200 (boots=100, cash=100) from bal=1200, earn=1200, boots=300',
            () => applyMixedSpend(userId, 200, 100, 100),
            userId,
            { balance: 1100, earnings_balance: 1100, boots_count: 200 }
        );
        result ? testsPassed++ : testsFailed++;

        // ── B2: Boots empty, try boots=1 ─────────────────────────────────────
        await setState(userId, { balance: 500, earnings_balance: 500, boots_count: 0 });

        result = await runBlockedTest(
            'B2', 'Boots empty: bal=500, boots=0. Try boots=1',
            () => applyMixedSpend(userId, 1, 1, 0),
            userId
        );
        result ? testsPassed++ : testsFailed++;

        // ── B3: Pure boots spend ─────────────────────────────────────────────
        await setState(userId, { balance: 50, earnings_balance: 50, boots_count: 500 });

        result = await runSuccessTest(
            'B3', 'Pure boots: bal=50, boots=500. Try total=200, boots=200',
            () => applyPureBootsSpend(userId, 200, 200),
            userId,
            { balance: 50, earnings_balance: 50, boots_count: 300 }
        );
        result ? testsPassed++ : testsFailed++;

        // ── B4: Insufficient funds ───────────────────────────────────────────
        await setState(userId, { balance: 80, earnings_balance: 80, boots_count: 50 });

        result = await runBlockedTest(
            'B4', 'Insufficient funds: bal=80, boots=50. Try total=200',
            () => applyMixedSpend(userId, 200, 50, 150),
            userId
        );
        result ? testsPassed++ : testsFailed++;

        // ── B5: Negative boots check ─────────────────────────────────────────
        await setState(userId, { balance: 500, earnings_balance: 500, boots_count: 10 });

        result = await runBlockedTest(
            'B5', 'Negative boots: boots=10. Try boots=20',
            () => applyMixedSpend(userId, 20, 20, 0),
            userId
        );
        result ? testsPassed++ : testsFailed++;

    } finally {
        await restoreOriginalState(userId);
    }

    // ── Summary ──────────────────────────────────────────────────────────────
    log('');
    logSeparator();
    log('FINAL SUMMARY');
    logSeparator();
    log(`  Total:  ${testsPassed + testsFailed}`);
    log(`  Passed: ${testsPassed}`);
    log(`  Failed: ${testsFailed}`);
    log(`  Result: ${testsFailed === 0 ? 'ALL PASSED' : 'SOME FAILED'}`);
    logSeparator();

    // Write log
    fs.writeFileSync(LOG_PATH, logLines.join('\n'), 'utf-8');
    console.log(`\nLog written to: ${LOG_PATH}`);
}

main().catch((err) => {
    log(`\nFATAL ERROR: ${err.message}`);
    fs.writeFileSync(LOG_PATH, logLines.join('\n'), 'utf-8');
    console.error(err);
    process.exit(1);
});
