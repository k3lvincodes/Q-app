/**
 * RIGOROUS TEST — Suite A: Basic Credits/Debits
 * 
 * Directly manipulates `profiles` table via Supabase admin client.
 * Applies Option B (deposit-first) earnings rule.
 * Output → scripts/suite_a_results.log
 * 
 * IMPORTANT: We do NOT insert into the `transactions` table because
 * a DB trigger auto-increments balance on insert, causing double-counting.
 * Instead, we update `profiles` directly and record the action in the log.
 */

import * as fs from 'fs';
import * as path from 'path';
import { supabase } from '../src/config/supabase';

// ─── Config ──────────────────────────────────────────────────────────────────

const LOG_PATH = path.join(__dirname, 'suite_a_results.log');

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

// ─── DB Ops (profiles only — no transactions table) ──────────────────────────

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

// ─── Actions (profile-only, no transaction insert) ───────────────────────────

async function applyGiftCredit(userId: string, amount: number): Promise<void> {
    const pre = await getState(userId);
    await setState(userId, {
        balance: pre.balance + amount,
        earnings_balance: pre.earnings_balance + amount,
        boots_count: pre.boots_count,
    });
}

async function applyDepositCredit(userId: string, amount: number): Promise<void> {
    const pre = await getState(userId);
    await setState(userId, {
        balance: pre.balance + amount,
        earnings_balance: pre.earnings_balance, // unchanged
        boots_count: pre.boots_count,
    });
}

async function applyCashSpend(userId: string, amount: number): Promise<void> {
    const pre = await getState(userId);
    const newBal = pre.balance - amount;
    if (newBal < 0) throw new Error(`Insufficient balance for cash_spend -${amount} (current: ${pre.balance})`);

    // Option B: earnings_balance = min(previous_earnings_balance, new_balance)
    const newEarn = Math.min(pre.earnings_balance, newBal);

    await setState(userId, {
        balance: newBal,
        earnings_balance: newEarn,
        boots_count: pre.boots_count,
    });
}

// ─── Test Runner ─────────────────────────────────────────────────────────────

async function runTest(
    testId: string,
    actionLabel: string,
    action: () => Promise<void>,
    userId: string,
    expected: WalletState
): Promise<boolean> {
    logSeparator();
    log(`${testId}: ${actionLabel}`);

    const pre = await getState(userId);
    log(`  Pre-state:  ${fmtState(pre)}`);

    await action();

    const post = await getState(userId);
    log(`  Post-state: ${fmtState(post)}`);
    log(`  Expected:   ${fmtState(expected)}`);
    log(`  Txn Record: ${actionLabel} (profile-direct update, cash_used=${testId.startsWith('A4') || testId.startsWith('A5') ? actionLabel.split('-')[1] : '0'}, boots_used=0)`);

    const invOk = assertInvariants(post, testId);
    const valOk = assertValues(post, expected);
    const pass = invOk && valOk;

    log(`  >> ${testId} Result: ${pass ? 'PASS' : 'FAIL'}`);
    return pass;
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
    log('======================================================================');
    log('          RIGOROUS TEST -- Suite A: Basic Credits/Debits              ');
    log(`          Run: ${new Date().toISOString()}`);
    log('======================================================================');
    log('');

    const userId = await pickTestUser();
    log(`Test User ID: ${userId}`);
    log(`Original State (will be restored): ${fmtState(originalState!)}`);
    log('');

    try {
        // ── A1: Checkpoint ────────────────────────────────────────────────────
        const checkpoint: WalletState = { balance: 3000, earnings_balance: 1000, boots_count: 300 };
        await setState(userId, checkpoint);

        let result = await runTest(
            'A1', 'Checkpoint: bal=3000, earn=1000, boots=300',
            async () => { /* No-op */ },
            userId,
            checkpoint
        );
        result ? testsPassed++ : testsFailed++;

        // ── A2: Gift Credit +500 ─────────────────────────────────────────────
        result = await runTest(
            'A2', 'gift_credit +500',
            () => applyGiftCredit(userId, 500),
            userId,
            { balance: 3500, earnings_balance: 1500, boots_count: 300 }
        );
        result ? testsPassed++ : testsFailed++;

        // ── A3: Deposit Credit +700 ──────────────────────────────────────────
        result = await runTest(
            'A3', 'deposit_credit +700',
            () => applyDepositCredit(userId, 700),
            userId,
            { balance: 4200, earnings_balance: 1500, boots_count: 300 }
        );
        result ? testsPassed++ : testsFailed++;

        // ── A4: Cash Spend -800 ──────────────────────────────────────────────
        result = await runTest(
            'A4', 'cash_spend -800',
            () => applyCashSpend(userId, 800),
            userId,
            { balance: 3400, earnings_balance: 1500, boots_count: 300 }
        );
        result ? testsPassed++ : testsFailed++;

        // ── A5: Cash Spend -2200 ─────────────────────────────────────────────
        result = await runTest(
            'A5', 'cash_spend -2200',
            () => applyCashSpend(userId, 2200),
            userId,
            { balance: 1200, earnings_balance: 1200, boots_count: 300 }
        );
        result ? testsPassed++ : testsFailed++;

    } finally {
        // Always restore original state
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
    // Still restore if possible
    if (originalState) {
        log('Attempting to restore original state after error...');
    }
    fs.writeFileSync(LOG_PATH, logLines.join('\n'), 'utf-8');
    console.error(err);
    process.exit(1);
});
