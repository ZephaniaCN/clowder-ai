import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

describe('aggregateWorkItemStats', () => {
  test('aggregates counts across methodologies, owners, and priorities', async () => {
    const { aggregateWorkItemStats } = await import('../dist/domains/cats/services/work-item-stats-aggregator.js');
    const report = aggregateWorkItemStats([
      {
        ref: { methodology: 'cat-cafe', projectId: 'f152', kind: 'feature', id: 'item-1' },
        title: 'F152',
        source: { type: 'roadmap', path: 'docs/ROADMAP.md' },
        owner: 'opus',
        priority: 'P1',
        lifecycleStatus: 'in-progress',
        evidenceRefs: [],
      },
      {
        ref: { methodology: 'napm', projectId: 'ep-demo', kind: 'task', id: 'task-1' },
        title: 'Task 1',
        source: { type: 'pm-next', path: 'pm/next.md' },
        owner: 'codex',
        priority: 'P0',
        lifecycleStatus: 'idea',
        evidenceRefs: [],
      },
    ]);

    assert.equal(report.total, 2);
    assert.deepStrictEqual(report.byMethodology, { 'cat-cafe': 1, napm: 1 });
    assert.deepStrictEqual(report.byOwner, { opus: 1, codex: 1 });
    assert.deepStrictEqual(report.byPriority, { P1: 1, P0: 1 });
    assert.deepStrictEqual(report.byStatus, { 'in-progress': 1, idea: 1 });
  });
});
