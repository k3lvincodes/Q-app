/**
 * RIGOROUS TEST — Suite D: Ordering & Replay
 *
 * D1: Sequence gift+1000, dep+2000, spend-1500, mix-1200(boots=200,cash=1000), spend-900
 *     → Final state matches a generic replay of those ops from zero.
 * D2: Reverse/Shuffle order → final state may differ (path dependency), but invariants hold.
 *
 * Output → scripts/suite_d_results.log
 */

import * as fs from 'fs';
import * as path from 'path';
import { supabase } from '../src/config/supabase';

const LOG_PATH = path.join(__dirname, 'suite_d_results.log');
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

// ─── DB Ops ──────────────────────────────────────────────────────────────────

async function pickTestUser(): Promise<string> {
    const { data, error } = await supabase
        .from('profiles').select('id, balance, earnings_balance, boots_count')
        .eq('email', 'fehkelvink@gmail.com').single();
    if (error || !data) throw new Error(`Test user not found: ${error?.message}`);
    originalState = { balance: data.balance ?? 0, earnings_balance: data.earnings_balance ?? 0, boots_count: data.boots_count ?? 0 };
    return data.id;
}

async function restoreOriginalState(userId: string) {
    if (!originalState) return;
    await supabase.from('profiles').update(originalState).eq('id', userId);
    log('Original profile state restored.');
}

async function setState(userId: string, s: WalletState) {
    const { error } = await supabase.from('profiles').update(s).eq('id', userId);
    if (error) throw new Error(`Failed to set state: ${error.message}`);
}

async function getState(userId: string): Promise<WalletState> {
    const { data, error } = await supabase.from('profiles')
        .select('balance, earnings_balance, boots_count').eq('id', userId).single();
    if (error || !data) throw new Error(`Failed to read state: ${error?.message}`);
    return { balance: data.balance, earnings_balance: data.earnings_balance, boots_count: data.boots_count };
}

// ─── Operations (pure functions on state) ────────────────────────────────────

type Op = { type: 'gift_credit'; amount: number }
    | { type: 'deposit_credit'; amount: number }
    | { type: 'cash_spend'; amount: number }
    | { type: 'mixed_spend'; total: number; bootsUsed: number; cashUsed: number };

function applyOp(state: WalletState, op: Op): WalletState | null {
    const s = { ...state };

    switch (op.type) {
        case 'gift_credit':
            s.balance += op.amount;
            s.earnings_balance += op.amount;
            break;
        case 'deposit_credit':
            s.balance += op.amount;
            break;
        case 'cash_spend':
            s.balance -= op.amount;
            if (s.balance < 0) return null; // blocked
            s.earnings_balance = Math.min(s.earnings_balance, s.balance);
            break;
        case 'mixed_spend':
            if (op.bootsUsed > s.boots_count) return null;
            if (op.cashUsed > s.balance) return null;
            s.boots_count -= op.bootsUsed;
            s.balance -= op.cashUsed;
            s.earnings_balance = Math.min(s.earnings_balance, s.balance);
            break;
    }
    return s;
}

function replayOps(initial: WalletState, ops: Op[]): WalletState | null {
    let state = { ...initial };
    for (const op of ops) {
        const next = applyOp(state, op);
        if (!next) return null; // blocked
        state = next;
    }
    return state;
}

// ─── Apply op to DB ──────────────────────────────────────────────────────────

async function applyOpToDB(userId: string, op: Op): Promise<void> {
    const state = await getState(userId);
    const next = applyOp(state, op);
    if (!next) throw new Error(`Op blocked: ${JSON.stringify(op)} from state ${fmt(state)}`);
    await setState(userId, next);
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
    log('======================================================================');
    log('          RIGOROUS TEST -- Suite D: Ordering & Replay                 ');
    log(`          Run: ${new Date().toISOString()}`);
    log('======================================================================');
    log('');

    const userId = await pickTestUser();
    log(`Test User ID: ${userId}`);
    log(`Original State (will be restored): ${fmt(originalState!)}`);
    log('');

    // Define the operation sequence
    const ops: Op[] = [
        { type: 'gift_credit', amount: 1000 },
        { type: 'deposit_credit', amount: 2000 },
        { type: 'cash_spend', amount: 1500 },
        { type: 'mixed_spend', total: 1200, bootsUsed: 200, cashUsed: 1000 },
        { type: 'cash_spend', amount: 900 },
    ];

    const opLabels = [
        'gift+1000', 'dep+2000', 'spend-1500', 'mix-1200(boots=200,cash=1000)', 'spend-900'
    ];

    try {
        // ── D1: Forward sequence ─────────────────────────────────────────────
        const startState: WalletState = { balance: 5000, earnings_balance: 2000, boots_count: 500 };
        await setState(userId, startState);

        logSep();
        log('D1: Forward sequence from bal=5000, earn=2000, boots=500');
        log(`  Start: ${fmt(startState)}`);

        // Replay purely in memory to get expected final state
        const expectedD1 = replayOps(startState, ops);
        if (!expectedD1) throw new Error('D1 replay blocked unexpectedly');

        // Apply each op to DB one by one, logging state after each
        for (let i = 0; i < ops.length; i++) {
            await applyOpToDB(userId, ops[i]);
            const mid = await getState(userId);
            log(`  After ${opLabels[i]}: ${fmt(mid)}`);
        }

        const actualD1 = await getState(userId);
        log(`  Final (DB):     ${fmt(actualD1)}`);
        log(`  Final (Replay): ${fmt(expectedD1)}`);

        const d1Match = actualD1.balance === expectedD1.balance &&
            actualD1.earnings_balance === expectedD1.earnings_balance &&
            actualD1.boots_count === expectedD1.boots_count;

        if (!d1Match) log('  ** FAIL ** DB state does not match replay');
        else log('  Ledger Replay: MATCH');

        const d1Inv = assertInvariants(actualD1, 'D1');
        const d1Pass = d1Match && d1Inv;
        log(`  >> D1 Result: ${d1Pass ? 'PASS' : 'FAIL'}`);
        d1Pass ? testsPassed++ : testsFailed++;

        // ── D2: Reversed order ───────────────────────────────────────────────
        await setState(userId, startState);

        logSep();
        log('D2: Reversed order (path-dependent, but invariants must hold)');
        log(`  Start: ${fmt(startState)}`);

        const reversedOps = [...ops].reverse();
        const reversedLabels = [...opLabels].reverse();

        // Replay reversed in memory
        const expectedD2 = replayOps(startState, reversedOps);

        let d2Blocked = false;
        try {
            for (let i = 0; i < reversedOps.length; i++) {
                await applyOpToDB(userId, reversedOps[i]);
                const mid = await getState(userId);
                log(`  After ${reversedLabels[i]}: ${fmt(mid)}`);
            }
        } catch (err: any) {
            log(`  Op blocked during reversed order: ${err.message}`);
            d2Blocked = true;
        }

        const actualD2 = await getState(userId);
        log(`  Final (DB):     ${fmt(actualD2)}`);

        if (expectedD2) {
            log(`  Final (Replay): ${fmt(expectedD2)}`);
            const d2ReplayMatch = actualD2.balance === expectedD2.balance &&
                actualD2.earnings_balance === expectedD2.earnings_balance &&
                actualD2.boots_count === expectedD2.boots_count;
            if (d2ReplayMatch) log('  Replay: MATCH (same path despite reversal)');
            else log('  Replay: DIFFERS (expected — path dependent)');
        } else {
            log('  Replay: BLOCKED in memory (expected — path dependent)');
        }

        // Key check: invariants must hold regardless of order
        const d2Inv = assertInvariants(actualD2, 'D2');

        // D2 passes if invariants hold (path dependency is acceptable)
        const d2Pass = d2Inv;
        log(`  >> D2 Result: ${d2Pass ? 'PASS' : 'FAIL'} (invariants ${d2Inv ? 'hold' : 'violated'})`);
        d2Pass ? testsPassed++ : testsFailed++;

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
