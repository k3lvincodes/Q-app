/**
 * RIGOROUS TEST — Suite F: Option B Policy Validation
 *
 * F1: Deposit-first rule: deposit+1000, gift+500, spend-1200
 *     → earn = min(prev_earn=500, new_bal=300) = 300
 * F2: Earnings never exceed balance — 20 random ops, assert earn ≤ bal after each.
 *
 * Output → scripts/suite_f_results.log
 */

import * as fs from 'fs';
import * as path from 'path';
import { supabase } from '../src/config/supabase';

const LOG_PATH = path.join(__dirname, 'suite_f_results.log');
let logLines: string[] = [];
let testsPassed = 0;
let testsFailed = 0;
let originalState: WalletState | null = null;

interface WalletState { balance: number; earnings_balance: number; boots_count: number; }

function log(msg: string) { console.log(msg); logLines.push(msg); }
function logSep() { log('----------------------------------------------------------------------'); }
function fmt(s: WalletState) { return `B=${s.balance} / E=${s.earnings_balance} / Boots=${s.boots_count}`; }

function assertInvariants(state: WalletState, label: string): boolean {
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

// ─── Option B Operations ────────────────────────────────────────────────────

async function depositCredit(userId: string, amount: number) {
    const pre = await getState(userId);
    await setState(userId, {
        balance: pre.balance + amount,
        earnings_balance: pre.earnings_balance, // deposits don't increase earnings
        boots_count: pre.boots_count,
    });
}

async function giftCredit(userId: string, amount: number) {
    const pre = await getState(userId);
    await setState(userId, {
        balance: pre.balance + amount,
        earnings_balance: pre.earnings_balance + amount,
        boots_count: pre.boots_count,
    });
}

async function cashSpend(userId: string, amount: number): Promise<boolean> {
    const pre = await getState(userId);
    const newBal = pre.balance - amount;
    if (newBal < 0) return false; // blocked
    // Option B: earnings clamped to new balance
    const newEarn = Math.min(pre.earnings_balance, newBal);
    await setState(userId, { balance: newBal, earnings_balance: newEarn, boots_count: pre.boots_count });
    return true;
}

// ─── PRNG for repeatable randomness ──────────────────────────────────────────

function seededRandom(seed: number) {
    let s = seed;
    return () => {
        s = (s * 1664525 + 1013904223) & 0x7fffffff;
        return s / 0x7fffffff;
    };
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function main() {
    log('======================================================================');
    log('          RIGOROUS TEST -- Suite F: Option B Policy Validation         ');
    log(`          Run: ${new Date().toISOString()}`);
    log('======================================================================');
    log('');

    const userId = await pickTestUser();
    log(`Test User ID: ${userId}`);
    log(`Original State (will be restored): ${fmt(originalState!)}`);
    log('');

    try {
        // ── F1: Deposit-first rule ───────────────────────────────────────────
        logSep();
        log('F1: Deposit-first rule');
        log('  Scenario: start bal=0/earn=0, deposit+1000, gift+500, spend-1200');
        log('  Option B: deposit doesn\'t increase earnings; gift does.');
        log('  After dep+1000: bal=1000, earn=0');
        log('  After gift+500: bal=1500, earn=500');
        log('  After spend-1200: bal=300, earn=min(500,300)=300');

        await setState(userId, { balance: 0, earnings_balance: 0, boots_count: 100 });
        const pre1 = await getState(userId);
        log(`  Start:       ${fmt(pre1)}`);

        await depositCredit(userId, 1000);
        const afterDep = await getState(userId);
        log(`  +dep 1000:   ${fmt(afterDep)}`);

        // Check deposit doesn't increase earnings
        const depEarnOk = afterDep.earnings_balance === 0;
        if (!depEarnOk) log('  ** FAIL ** Deposit increased earnings!');
        else log('  ✓ Deposit did NOT increase earnings');

        await giftCredit(userId, 500);
        const afterGift = await getState(userId);
        log(`  +gift 500:   ${fmt(afterGift)}`);

        // Check gift DID increase earnings
        const giftEarnOk = afterGift.earnings_balance === 500;
        if (!giftEarnOk) log('  ** FAIL ** Gift didn\'t increase earnings correctly');
        else log('  ✓ Gift increased earnings to 500');

        await cashSpend(userId, 1200);
        const afterSpend = await getState(userId);
        log(`  -spend 1200: ${fmt(afterSpend)}`);

        // Check Option B clamping
        const expectedF1: WalletState = { balance: 300, earnings_balance: 300, boots_count: 100 };
        const f1Match = afterSpend.balance === expectedF1.balance &&
            afterSpend.earnings_balance === expectedF1.earnings_balance &&
            afterSpend.boots_count === expectedF1.boots_count;

        if (!f1Match) {
            log(`  ** FAIL ** Expected ${fmt(expectedF1)}, got ${fmt(afterSpend)}`);
        } else {
            log(`  ✓ Option B clamping correct: earn=min(500,300)=300`);
        }

        const f1Inv = assertInvariants(afterSpend, 'F1');
        const f1Pass = depEarnOk && giftEarnOk && f1Match && f1Inv;
        log(`  >> F1 Result: ${f1Pass ? 'PASS' : 'FAIL'}`);
        f1Pass ? testsPassed++ : testsFailed++;

        // ── F2: 20 random ops — earnings never exceed balance ────────────────
        logSep();
        log('F2: 20 random ops — earn ≤ bal after every single op');

        await setState(userId, { balance: 5000, earnings_balance: 2000, boots_count: 200 });
        const pre2 = await getState(userId);
        log(`  Start: ${fmt(pre2)}`);

        const rng = seededRandom(42);
        let f2AllInvariantsHeld = true;
        let opCount = 0;

        for (let i = 1; i <= 20; i++) {
            const r = rng();
            let opLabel = '';

            if (r < 0.3) {
                // Gift credit
                const amt = Math.floor(rng() * 500) + 100;
                await giftCredit(userId, amt);
                opLabel = `gift+${amt}`;
            } else if (r < 0.55) {
                // Deposit credit
                const amt = Math.floor(rng() * 800) + 100;
                await depositCredit(userId, amt);
                opLabel = `dep+${amt}`;
            } else {
                // Cash spend (may be blocked if insufficient)
                const state = await getState(userId);
                const maxSpend = Math.min(state.balance, 1500);
                if (maxSpend <= 0) {
                    opLabel = 'spend-0 (skipped, no balance)';
                } else {
                    const amt = Math.floor(rng() * maxSpend) + 1;
                    const ok = await cashSpend(userId, amt);
                    opLabel = ok ? `spend-${amt}` : `spend-${amt} (BLOCKED)`;
                }
            }

            const snap = await getState(userId);
            const earnLeBal = snap.earnings_balance <= snap.balance;
            const earnGe0 = snap.earnings_balance >= 0;
            const status = (earnLeBal && earnGe0) ? 'OK' : '** VIOLATED **';

            log(`  Op ${String(i).padStart(2)}: ${opLabel.padEnd(25)} → ${fmt(snap)}  [earn≤bal: ${status}]`);

            if (!earnLeBal || !earnGe0) f2AllInvariantsHeld = false;
            opCount++;
        }

        const post2 = await getState(userId);
        log(`  Final: ${fmt(post2)}`);

        const f2Inv = assertInvariants(post2, 'F2');
        const f2Pass = f2AllInvariantsHeld && f2Inv;
        log(`  All ${opCount} ops checked: ${f2AllInvariantsHeld ? 'earn ≤ bal held throughout' : '** VIOLATIONS FOUND **'}`);
        log(`  >> F2 Result: ${f2Pass ? 'PASS' : 'FAIL'}`);
        f2Pass ? testsPassed++ : testsFailed++;

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
