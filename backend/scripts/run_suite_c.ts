/**
 * RIGOROUS TEST — Suite C: Edge Values & Rounding
 *
 * C1: Zero amount (+0, -0) → no-op, state unchanged
 * C2: Fractional (0.5)     → BLOCKED (integers only)
 * C3: Large numbers (2B)   → no overflow, correct sums
 *
 * Output → scripts/suite_c_results.log
 */

import * as fs from 'fs';
import * as path from 'path';
import { supabase } from '../src/config/supabase';

const LOG_PATH = path.join(__dirname, 'suite_c_results.log');
let logLines: string[] = [];
let testsPassed = 0;
let testsFailed = 0;
let originalState: WalletState | null = null;

interface WalletState { balance: number; earnings_balance: number; boots_count: number; }

function log(msg: string) { console.log(msg); logLines.push(msg); }
function logSep() { log('----------------------------------------------------------------------'); }
function fmt(s: WalletState) { return `B=${s.balance} / E=${s.earnings_balance} / Boots=${s.boots_count}`; }

function assertInvariants(state: WalletState, testId: string): boolean {
    const checks = [
        { name: 'balance >= 0', pass: state.balance >= 0 },
        { name: 'earnings_balance >= 0', pass: state.earnings_balance >= 0 },
        { name: 'boots_count >= 0 (integer)', pass: state.boots_count >= 0 && Number.isInteger(state.boots_count) },
        { name: 'earnings_balance <= balance', pass: state.earnings_balance <= state.balance },
    ];
    let ok = true;
    for (const c of checks) {
        log(`  Invariant [${c.name}]: ${c.pass ? 'PASS' : '** FAIL **'}`);
        if (!c.pass) ok = false;
    }
    return ok;
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
    if (error || !data) throw new Error(`Test user not found: ${error?.message}`);
    originalState = { balance: data.balance ?? 0, earnings_balance: data.earnings_balance ?? 0, boots_count: data.boots_count ?? 0 };
    return data.id;
}

async function restoreOriginalState(userId: string) {
    if (!originalState) return;
    await supabase.from('profiles').update({ balance: originalState.balance, earnings_balance: originalState.earnings_balance, boots_count: originalState.boots_count }).eq('id', userId);
    log('Original profile state restored.');
}

async function setState(userId: string, state: WalletState) {
    const { error } = await supabase.from('profiles').update({ balance: state.balance, earnings_balance: state.earnings_balance, boots_count: state.boots_count }).eq('id', userId);
    if (error) throw new Error(`Failed to set state: ${error.message}`);
}

async function getState(userId: string): Promise<WalletState> {
    const { data, error } = await supabase.from('profiles').select('balance, earnings_balance, boots_count').eq('id', userId).single();
    if (error || !data) throw new Error(`Failed to read state: ${error?.message}`);
    return { balance: data.balance, earnings_balance: data.earnings_balance, boots_count: data.boots_count };
}

// ─── Actions ─────────────────────────────────────────────────────────────────

interface ActionResult { blocked: boolean; reason?: string; }

function validateAmount(amount: number): ActionResult {
    if (!Number.isInteger(amount)) {
        return { blocked: true, reason: `Fractional amount rejected: ${amount} (integers only)` };
    }
    return { blocked: false };
}

async function applyCredit(userId: string, amount: number, isGift: boolean): Promise<ActionResult> {
    const v = validateAmount(amount);
    if (v.blocked) return v;

    const pre = await getState(userId);
    await setState(userId, {
        balance: pre.balance + amount,
        earnings_balance: isGift ? pre.earnings_balance + amount : pre.earnings_balance,
        boots_count: pre.boots_count,
    });
    return { blocked: false };
}

async function applyDebit(userId: string, amount: number): Promise<ActionResult> {
    const v = validateAmount(amount);
    if (v.blocked) return v;

    const pre = await getState(userId);
    const newBal = pre.balance - amount;
    if (newBal < 0) return { blocked: true, reason: `Insufficient balance: need ${amount}, have ${pre.balance}` };
    const newEarn = Math.min(pre.earnings_balance, newBal);
    await setState(userId, { balance: newBal, earnings_balance: newEarn, boots_count: pre.boots_count });
    return { blocked: false };
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
    log('======================================================================');
    log('          RIGOROUS TEST -- Suite C: Edge Values & Rounding            ');
    log(`          Run: ${new Date().toISOString()}`);
    log('======================================================================');
    log('');

    const userId = await pickTestUser();
    log(`Test User ID: ${userId}`);
    log(`Original State (will be restored): ${fmt(originalState!)}`);
    log('');

    try {
        // ── C1: Zero amounts (+0, -0) → no-op ───────────────────────────────
        const baseState: WalletState = { balance: 5000, earnings_balance: 2000, boots_count: 100 };
        await setState(userId, baseState);

        logSep();
        log('C1: Zero amount (+0, -0) — expect no-op, state unchanged');
        const pre = await getState(userId);
        log(`  Pre-state:  ${fmt(pre)}`);

        // Apply +0 credit
        let r = await applyCredit(userId, 0, true);
        log(`  +0 gift_credit: ${r.blocked ? 'BLOCKED: ' + r.reason : 'applied'}`);

        // Apply -0 debit
        r = await applyDebit(userId, 0);
        log(`  -0 cash_spend:  ${r.blocked ? 'BLOCKED: ' + r.reason : 'applied'}`);

        const postC1 = await getState(userId);
        log(`  Post-state: ${fmt(postC1)}`);
        log(`  Expected:   ${fmt(baseState)}`);

        const invC1 = assertInvariants(postC1, 'C1');
        const valC1 = assertValues(postC1, baseState);
        const passC1 = invC1 && valC1;
        log(`  >> C1 Result: ${passC1 ? 'PASS' : 'FAIL'}`);
        passC1 ? testsPassed++ : testsFailed++;

        // ── C2: Fractional (0.5) → BLOCKED ──────────────────────────────────
        await setState(userId, baseState);

        logSep();
        log('C2: Fractional amount (0.5) — expect BLOCKED');
        const preC2 = await getState(userId);
        log(`  Pre-state:  ${fmt(preC2)}`);

        const rCredit = await applyCredit(userId, 0.5, true);
        log(`  +0.5 credit: ${rCredit.blocked ? 'BLOCKED: ' + rCredit.reason : 'UNEXPECTEDLY applied'}`);

        const rDebit = await applyDebit(userId, 0.5);
        log(`  -0.5 debit:  ${rDebit.blocked ? 'BLOCKED: ' + rDebit.reason : 'UNEXPECTEDLY applied'}`);

        const postC2 = await getState(userId);
        log(`  Post-state: ${fmt(postC2)}`);

        const blockedOk = rCredit.blocked && rDebit.blocked;
        const unchangedC2 = postC2.balance === preC2.balance &&
            postC2.earnings_balance === preC2.earnings_balance &&
            postC2.boots_count === preC2.boots_count;

        if (!blockedOk) log('  ** FAIL ** Fractional amounts should be BLOCKED');
        if (!unchangedC2) log('  ** FAIL ** State changed despite being blocked');

        const invC2 = assertInvariants(postC2, 'C2');
        const passC2 = blockedOk && unchangedC2 && invC2;
        log(`  >> C2 Result: ${passC2 ? 'PASS' : 'FAIL'}`);
        passC2 ? testsPassed++ : testsFailed++;

        // ── C3: Large numbers (2 billion) ────────────────────────────────────
        const largeVal = 2_000_000_000;
        await setState(userId, { balance: largeVal, earnings_balance: 1_000_000_000, boots_count: 100 });

        logSep();
        log('C3: Large numbers (2B) — no overflow, correct sums');
        const preC3 = await getState(userId);
        log(`  Pre-state:  ${fmt(preC3)}`);

        // Credit another 500M
        await applyCredit(userId, 500_000_000, false);
        const midC3 = await getState(userId);
        log(`  After +500M deposit: ${fmt(midC3)}`);

        const expectedMid: WalletState = { balance: 2_500_000_000, earnings_balance: 1_000_000_000, boots_count: 100 };
        const midOk = assertValues(midC3, expectedMid);

        // Spend 1B
        await applyDebit(userId, 1_000_000_000);
        const postC3 = await getState(userId);
        log(`  After -1B spend:     ${fmt(postC3)}`);

        const expectedPost: WalletState = { balance: 1_500_000_000, earnings_balance: 1_000_000_000, boots_count: 100 };
        const postOk = assertValues(postC3, expectedPost);

        const invC3 = assertInvariants(postC3, 'C3');
        const passC3 = midOk && postOk && invC3;
        log(`  >> C3 Result: ${passC3 ? 'PASS' : 'FAIL'}`);
        passC3 ? testsPassed++ : testsFailed++;

    } finally {
        await restoreOriginalState(userId);
    }

    log('');
    logSep();
    log('FINAL SUMMARY');
    logSep();
    log(`  Total:  ${testsPassed + testsFailed}`);
    log(`  Passed: ${testsPassed}`);
    log(`  Failed: ${testsFailed}`);
    log(`  Result: ${testsFailed === 0 ? 'ALL PASSED' : 'SOME FAILED'}`);
    logSep();

    fs.writeFileSync(LOG_PATH, logLines.join('\n'), 'utf-8');
    console.log(`\nLog written to: ${LOG_PATH}`);
}

main().catch((err) => {
    log(`\nFATAL ERROR: ${err.message}`);
    fs.writeFileSync(LOG_PATH, logLines.join('\n'), 'utf-8');
    console.error(err);
    process.exit(1);
});
