// @ts-check
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, mkdirSync, rmSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { execFileSync } from 'node:child_process';

/**
 * Regression tests for fix(#185): console.* → Pino redaction + coverage.
 *
 * Spawns a child process that imports the logger with a temp LOG_DIR,
 * exercises console methods, then asserts on the rolled log file.
 */

const API_DIR = resolve(import.meta.dirname, '..');
const TEST_LOG_DIR = resolve(API_DIR, '.test-log-dir-185');

/** Read all rolled log files in the test dir and return concatenated content. */
function readAllLogs() {
  const files = readdirSync(TEST_LOG_DIR).filter((f) => f.startsWith('api.'));
  return files.map((f) => readFileSync(join(TEST_LOG_DIR, f), 'utf-8')).join('\n');
}

/** Spawn child process that imports logger, runs snippet, waits for flush. */
function runLoggerScript(snippet) {
  const script = `
    process.env.LOG_DIR = ${JSON.stringify(TEST_LOG_DIR)};
    process.env.LOG_LEVEL = 'debug';
    const mod = await import('./dist/infrastructure/logger.js');
    ${snippet}
    await new Promise(r => setTimeout(r, 1500));
  `;
  execFileSync('node', ['--input-type=module', '-e', script], {
    cwd: API_DIR,
    timeout: 10000,
    stdio: ['pipe', 'pipe', 'pipe'],
  });
}

function resetLogDir() {
  rmSync(TEST_LOG_DIR, { recursive: true, force: true });
  mkdirSync(TEST_LOG_DIR, { recursive: true });
}

describe('fix(#185): console→Pino patch', () => {
  before(() => mkdirSync(TEST_LOG_DIR, { recursive: true }));
  after(() => rmSync(TEST_LOG_DIR, { recursive: true, force: true }));

  it('console.log({ token }) is redacted in log file (P1 security)', () => {
    resetLogDir();
    runLoggerScript(`console.log({ token: 'secret-token-xyz' });`);
    const content = readAllLogs();
    assert.ok(content.includes('[REDACTED]'), 'token should be redacted');
    assert.ok(!content.includes('secret-token-xyz'), 'raw token must not appear');
  });

  it('console.info and console.debug write to log file (P1 coverage)', () => {
    resetLogDir();
    runLoggerScript(`
      console.info('info-marker-185');
      console.debug('debug-marker-185');
    `);
    const content = readAllLogs();
    assert.ok(content.includes('info-marker-185'), 'console.info should appear in log file');
    assert.ok(content.includes('debug-marker-185'), 'console.debug should appear in log file');
  });

  it('LOG_DIR env var controls log file location', () => {
    resetLogDir();
    runLoggerScript(`mod.logger.info('logdir-marker-185');`);
    const content = readAllLogs();
    assert.ok(content.includes('logdir-marker-185'), 'log should be written to LOG_DIR path');
  });

  it('mixed args: objects get redacted, strings become msg', () => {
    resetLogDir();
    runLoggerScript(`console.log('User action:', { apiKey: 'sk-secret-key' });`);
    const content = readAllLogs();
    assert.ok(content.includes('[REDACTED]'), 'apiKey should be redacted');
    assert.ok(!content.includes('sk-secret-key'), 'raw apiKey must not appear');
    assert.ok(content.includes('User action:'), 'string part should appear as msg');
  });
});
