import { join } from 'node:path';
import { findMonorepoRoot } from './monorepo-root.js';

export function resolveStartupCapabilityBootstrapRoot(start = process.cwd()): string {
  return findMonorepoRoot(start);
}

export function buildStartupCapabilityBootstrapPaths(start = process.cwd()) {
  const root = resolveStartupCapabilityBootstrapRoot(start);
  return {
    root,
    discoveryPaths: {
      claudeConfig: join(root, '.mcp.json'),
      codexConfig: join(root, '.codex', 'config.toml'),
      geminiConfig: join(root, '.gemini', 'settings.json'),
      kimiConfig: join(root, '.kimi', 'mcp.json'),
    },
    cliConfigPaths: {
      anthropic: join(root, '.mcp.json'),
      openai: join(root, '.codex', 'config.toml'),
      google: join(root, '.gemini', 'settings.json'),
      kimi: join(root, '.kimi', 'mcp.json'),
    },
  };
}
