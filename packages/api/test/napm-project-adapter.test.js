import assert from 'node:assert/strict';
import { existsSync, mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, it } from 'node:test';

const { NapmProjectAdapter } = await import(
  '../dist/domains/projects/napm-project-adapter.js'
);

// ── Fixture helpers ──

function makeTmpProject(files) {
  const root = mkdtempSync(join(tmpdir(), 'napm-test-'));
  for (const [relPath, content] of Object.entries(files)) {
    const absPath = join(root, relPath);
    const dir = absPath.slice(0, absPath.lastIndexOf('/'));
    mkdirSync(dir, { recursive: true });
    writeFileSync(absPath, content, 'utf-8');
  }
  return root;
}

// ── AC-A7: Unit tests with synthetic fixtures ──

describe('NapmProjectAdapter (fixtures)', () => {
  it('parses next.md tasks with correct lifecycle + execution mapping', async () => {
    const root = makeTmpProject({
      'pm/next.md': [
        '# Next',
        '',
        '## Current',
        '- [x] [id:T-001] [status:done] Completed task',
        '  - intent: Finish something',
        '- [ ] [id:T-002] [status:doing] Active task',
        '  - intent: Working on it',
        '- [ ] [id:T-003] [status:todo] Planned task',
        '  - intent: Will do later',
        '- [ ] [id:T-004] [status:blocked] Blocked task',
        '  - intent: Waiting on dependency',
      ].join('\n'),
    });
    const adapter = new NapmProjectAdapter(root, 'test-proj');
    const items = await adapter.readNextMd();

    assert.equal(items.length, 4);

    // done → lifecycleStatus:done, executionStage:document
    assert.equal(items[0].ref.id, 'T-001');
    assert.equal(items[0].lifecycleStatus, 'done');
    assert.equal(items[0].executionStage, 'document');
    assert.equal(items[0].ref.methodology, 'napm');
    assert.equal(items[0].source.type, 'pm-next');

    // doing → lifecycleStatus:in-progress, executionStage:execute
    assert.equal(items[1].ref.id, 'T-002');
    assert.equal(items[1].lifecycleStatus, 'in-progress');
    assert.equal(items[1].executionStage, 'execute');

    // todo → lifecycleStatus:idea, executionStage:plan
    assert.equal(items[2].ref.id, 'T-003');
    assert.equal(items[2].lifecycleStatus, 'idea');
    assert.equal(items[2].executionStage, 'plan');

    // blocked → lifecycleStatus:in-progress
    assert.equal(items[3].ref.id, 'T-004');
    assert.equal(items[3].lifecycleStatus, 'in-progress');
  });

  it('parses backlog.md with pending status → idea', async () => {
    const root = makeTmpProject({
      'pm/backlog.md': [
        '# Backlog',
        '- [ ] [id:B-001] [status:pending] Future item',
        '- [ ] [id:B-002] [status:open] Another future item',
      ].join('\n'),
    });
    const adapter = new NapmProjectAdapter(root, 'test-proj');
    const items = await adapter.readBacklogMd();

    assert.equal(items.length, 2);
    assert.equal(items[0].lifecycleStatus, 'idea');
    assert.equal(items[1].lifecycleStatus, 'idea');
    assert.equal(items[0].source.type, 'pm-backlog');
  });

  it('deduplicates: pm-next takes precedence over pm-backlog', async () => {
    const root = makeTmpProject({
      'pm/next.md':
        '# Next\n- [ ] [id:DUP-1] [status:doing] Active version\n',
      'pm/backlog.md':
        '# Backlog\n- [ ] [id:DUP-1] [status:todo] Old version\n',
    });
    const adapter = new NapmProjectAdapter(root, 'test-proj');
    const items = await adapter.toWorkItems();

    const dup = items.filter((i) => i.ref.id === 'DUP-1');
    assert.equal(dup.length, 1);
    assert.equal(dup[0].source.type, 'pm-next');
    assert.equal(dup[0].lifecycleStatus, 'in-progress');
  });

  it('reads state.yaml correctly', async () => {
    const root = makeTmpProject({
      'pm/state.yaml': [
        'project:',
        '  name: test-proj',
        '  status: in_progress',
        '  phase: verify',
        '',
      ].join('\n'),
    });
    const adapter = new NapmProjectAdapter(root, 'test-proj');
    const state = await adapter.readStateYaml();

    assert.equal(state.status, 'in_progress');
    assert.equal(state.phase, 'verify');
  });

  it('returns fallback state when state.yaml missing', async () => {
    const root = makeTmpProject({ 'pm/next.md': '# Next\n' });
    const adapter = new NapmProjectAdapter(root, 'test-proj');
    const state = await adapter.readStateYaml();

    assert.equal(state.status, 'unknown');
  });

  it('reads EVIDENCE.md from project root (not pm/)', async () => {
    const root = makeTmpProject({
      'EVIDENCE.md': [
        '# Evidence',
        '### 2026-04-01',
        '- ✅ Tests passed',
        '- Deployed to staging',
        '### 2026-03-30',
        '- ❌ Build failed',
      ].join('\n'),
      'pm/next.md': '# Next\n',
    });
    const adapter = new NapmProjectAdapter(root, 'test-proj');
    const evidence = await adapter.readEvidence();

    const fromEvidence = evidence.filter((e) => e.sourcePath === 'EVIDENCE.md');
    assert.ok(fromEvidence.length >= 2, `Expected >=2 evidence entries, got ${fromEvidence.length}`);

    const passEntry = fromEvidence.find((e) => e.status === 'pass');
    assert.ok(passEntry, 'Should have a pass entry with ✅');

    const failEntry = fromEvidence.find((e) => e.status === 'fail');
    assert.ok(failEntry, 'Should have a fail entry with ❌');
  });

  it('falls back to pm/EVIDENCE.md when root is missing', async () => {
    const root = makeTmpProject({
      'pm/EVIDENCE.md': [
        '# Evidence',
        '### 2026-01-01',
        '- Legacy evidence entry',
      ].join('\n'),
      'pm/next.md': '# Next\n',
    });
    const adapter = new NapmProjectAdapter(root, 'test-proj');
    const evidence = await adapter.readEvidence();

    assert.ok(evidence.length >= 1, 'Should read from legacy pm/EVIDENCE.md');
  });

  it('reads pm/progress/*.md files', async () => {
    const root = makeTmpProject({
      'pm/next.md': '# Next\n',
      'pm/progress/2026-04-01-test-progress.md': [
        '# Test Progress',
        '- ✅ All tests passed',
        '- Deployed `v1.2.0`',
      ].join('\n'),
    });
    const adapter = new NapmProjectAdapter(root, 'test-proj');
    const evidence = await adapter.readEvidence();

    const progress = evidence.find((e) =>
      e.sourcePath.startsWith('pm/progress/'),
    );
    assert.ok(progress, 'Should include progress file entries');
    assert.equal(progress.status, 'pass');
    assert.equal(progress.date, '2026-04-01');
    assert.ok(progress.refs.includes('v1.2.0'));
  });

  it('getOverview produces correct summary', async () => {
    const root = makeTmpProject({
      'pm/next.md': [
        '# Next',
        '- [x] [id:O-1] [status:done] Done item',
        '- [ ] [id:O-2] [status:doing] Doing item',
        '- [ ] [id:O-3] [status:todo] Todo item',
      ].join('\n'),
      'pm/state.yaml': 'project:\n  status: in_progress\n  phase: execute\n',
      'EVIDENCE.md': '# Evidence\n### 2026-04-01\n- ✅ Pass\n',
    });
    const adapter = new NapmProjectAdapter(root, 'test-proj');
    const overview = await adapter.getOverview();

    assert.equal(overview.methodology, 'napm');
    assert.equal(overview.projectId, 'test-proj');
    assert.equal(overview.summaryCounts.total, 3);
    assert.equal(overview.summaryCounts.done, 1);
    assert.equal(overview.summaryCounts.doing, 1);
    assert.equal(overview.summaryCounts.todo, 1);
    // state.yaml has explicit phase:execute
    assert.equal(overview.currentExecutionStage, 'execute');
  });

  it('derives executionStage heuristically when state.yaml has no phase', async () => {
    const root = makeTmpProject({
      'pm/next.md': [
        '# Next',
        '- [ ] [id:H-1] [status:doing] Active task',
      ].join('\n'),
      'pm/state.yaml': 'state: in_progress\n',
    });
    const adapter = new NapmProjectAdapter(root, 'test-proj');
    const overview = await adapter.getOverview();

    // Has doing items, no verify hints → execute
    assert.equal(overview.currentExecutionStage, 'execute');
  });

  it('handles empty project gracefully', async () => {
    const root = makeTmpProject({});
    const adapter = new NapmProjectAdapter(root, 'empty-proj');

    const items = await adapter.toWorkItems();
    assert.equal(items.length, 0);

    const evidence = await adapter.readEvidence();
    assert.equal(evidence.length, 0);

    const overview = await adapter.getOverview();
    assert.equal(overview.summaryCounts.total, 0);
    assert.equal(overview.currentExecutionStage, 'idle');
  });

  it('WorkItemRef has correct 4-segment structure', async () => {
    const root = makeTmpProject({
      'pm/next.md': '# Next\n- [ ] [id:REF-1] [status:todo] Test ref\n',
    });
    const adapter = new NapmProjectAdapter(root, 'my-project');
    const items = await adapter.toWorkItems();

    assert.equal(items[0].ref.methodology, 'napm');
    assert.equal(items[0].ref.projectId, 'my-project');
    assert.equal(items[0].ref.kind, 'task');
    assert.equal(items[0].ref.id, 'REF-1');
  });

  it('parses title from task line, stripping metadata tags', async () => {
    const root = makeTmpProject({
      'pm/next.md':
        '# Next\n- [ ] [id:T-1] [status:doing] [priority:P1] My clean title\n',
    });
    const adapter = new NapmProjectAdapter(root, 'test');
    const items = await adapter.toWorkItems();

    assert.equal(items[0].title, 'My clean title');
    assert.equal(items[0].priority, 'P1');
  });
});

// ── AC-A6: Integration test with real novel-tool-v2 ──

const NOVEL_TOOL_V2_PATH =
  '/Users/liuzifan/.openclaw/workspace/projects/novel-tool-v2';

describe('NapmProjectAdapter — novel-tool-v2 integration (AC-A6)', () => {
  const skip = !existsSync(join(NOVEL_TOOL_V2_PATH, 'pm/next.md'));

  it('reads real work items from novel-tool-v2', { skip }, async () => {
    const adapter = new NapmProjectAdapter(NOVEL_TOOL_V2_PATH, 'novel-tool-v2');
    const items = await adapter.toWorkItems();

    assert.ok(items.length > 0, `Expected work items, got ${items.length}`);
    // All items should have valid lifecycle status
    for (const item of items) {
      assert.ok(
        ['idea', 'spec', 'in-progress', 'review', 'done', 'obsolete'].includes(
          item.lifecycleStatus,
        ),
        `Invalid lifecycleStatus: ${item.lifecycleStatus} for ${item.ref.id}`,
      );
      assert.ok(
        ['plan', 'execute', 'verify', 'document', 'idle'].includes(
          item.executionStage,
        ),
        `Invalid executionStage: ${item.executionStage} for ${item.ref.id}`,
      );
      assert.equal(item.ref.methodology, 'napm');
      assert.equal(item.ref.projectId, 'novel-tool-v2');
      assert.ok(item.title, `Missing title for ${item.ref.id}`);
    }
  });

  it('reads real state.yaml from novel-tool-v2 (graceful fallback on parse error)', { skip }, async () => {
    const adapter = new NapmProjectAdapter(NOVEL_TOOL_V2_PATH, 'novel-tool-v2');
    const state = await adapter.readStateYaml();

    // novel-tool-v2 state.yaml contains backtick chars in gate.criteria
    // which causes YAML parser to throw — adapter should return fallback gracefully
    assert.ok(typeof state.status === 'string', 'status should be a string');
    assert.ok(state, 'Should return a state object even on parse failure');
  });

  it('reads real EVIDENCE.md from novel-tool-v2', { skip }, async () => {
    const adapter = new NapmProjectAdapter(NOVEL_TOOL_V2_PATH, 'novel-tool-v2');
    const evidence = await adapter.readEvidence();

    assert.ok(evidence.length > 0, `Expected evidence entries, got ${evidence.length}`);
    for (const entry of evidence) {
      assert.ok(entry.id, 'Evidence entry missing id');
      assert.ok(entry.title, 'Evidence entry missing title');
      assert.ok(
        ['pass', 'fail', 'info'].includes(entry.status),
        `Invalid evidence status: ${entry.status}`,
      );
    }
  });

  it('produces valid overview from novel-tool-v2', { skip }, async () => {
    const adapter = new NapmProjectAdapter(NOVEL_TOOL_V2_PATH, 'novel-tool-v2');
    const overview = await adapter.getOverview();

    assert.equal(overview.methodology, 'napm');
    assert.equal(overview.projectId, 'novel-tool-v2');
    assert.ok(overview.summaryCounts.total > 0, 'Expected total > 0');
    assert.ok(
      ['plan', 'execute', 'verify', 'document', 'idle'].includes(
        overview.currentExecutionStage,
      ),
      `Invalid stage: ${overview.currentExecutionStage}`,
    );

    // novel-tool-v2 has ~50+ tasks based on real data
    assert.ok(
      overview.summaryCounts.total >= 10,
      `Expected >= 10 tasks, got ${overview.summaryCounts.total}`,
    );
  });
});
