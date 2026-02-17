// Wrapper to run suite_a and capture errors to a file
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

try {
    const out = execSync('npx ts-node scripts/run_suite_f.ts', {
        cwd: path.resolve(__dirname, '..'),
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'pipe'],
        timeout: 120000,
    });
    fs.writeFileSync(path.join(__dirname, 'wrapper_stdout.txt'), out, 'utf-8');
    console.log('SUCCESS');
} catch (err) {
    const combined = `STDOUT:\n${err.stdout || '(none)'}\n\nSTDERR:\n${err.stderr || '(none)'}\n\nMESSAGE:\n${err.message || '(none)'}`;
    fs.writeFileSync(path.join(__dirname, 'wrapper_error.txt'), combined, 'utf-8');
    console.log('FAILED - see scripts/wrapper_error.txt');
}
