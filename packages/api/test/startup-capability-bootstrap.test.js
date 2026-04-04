import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, it } from 'node:test';

const { buildStartupCapabilityBootstrapPaths } = await import('../dist/utils/startup-capability-bootstrap.js');

describe('buildStartupCapabilityBootstrapPaths', () => {
  it('resolves config writes to monorepo root when API starts from packages/api', () => {
    const repoRoot = mkdtempSync(join(tmpdir(), 'startup-bootstrap-'));
    const apiDir = join(repoRoot, 'packages', 'api');
    mkdirSync(apiDir, { recursive: true });
    writeFileSync(join(repoRoot, 'pnpm-workspace.yaml'), 'packages:\n  - "packages/*"\n');

    const paths = buildStartupCapabilityBootstrapPaths(apiDir);

    assert.equal(paths.root, repoRoot);
    assert.equal(paths.discoveryPaths.claudeConfig, join(repoRoot, '.mcp.json'));
    assert.equal(paths.cliConfigPaths.anthropic, join(repoRoot, '.mcp.json'));
    assert.equal(paths.discoveryPaths.codexConfig, join(repoRoot, '.codex', 'config.toml'));
    assert.equal(paths.discoveryPaths.geminiConfig, join(repoRoot, '.gemini', 'settings.json'));
    assert.equal(paths.discoveryPaths.kimiConfig, join(repoRoot, '.kimi', 'mcp.json'));
  });
});
