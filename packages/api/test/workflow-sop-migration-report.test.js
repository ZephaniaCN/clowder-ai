import assert from 'node:assert/strict';
import { before, describe, it } from 'node:test';

describe('WorkflowSopMigrationReporter', () => {
  let WorkflowSopMigrationReporter;

  before(async () => {
    const mod = await import('../dist/domains/cats/services/stores/redis/workflow-sop-migration-report.js');
    WorkflowSopMigrationReporter = mod.WorkflowSopMigrationReporter;
  });

  function createRedisStub(entries, keyPrefix = 'cat-cafe:') {
    const store = new Map(entries);
    return {
      options: { keyPrefix },
      async scan(cursor, _matchKeyword, matchPattern, _countKeyword, _count) {
        assert.equal(cursor, '0');
        const pattern = String(matchPattern).replace('*', '');
        const keys = [...store.keys()].filter((key) => key.startsWith(pattern));
        return ['0', keys];
      },
      async mget(...keys) {
        return keys.map((key) => store.get(`${keyPrefix}${key}`) ?? null);
      },
    };
  }

  it('reports existing refs, derivable legacy records, and anomalies', async () => {
    const redis = createRedisStub([
      [
        'cat-cafe:workflow:sop:item-1',
        JSON.stringify({
          featureId: 'F152',
          backlogItemId: 'item-1',
          workItemRef: { methodology: 'napm', projectId: 'ep-demo', kind: 'task', id: 'task-a' },
          stage: 'impl',
        }),
      ],
      [
        'cat-cafe:workflow:sop:item-2',
        JSON.stringify({
          featureId: 'F073',
          backlogItemId: 'item-2',
          stage: 'review',
        }),
      ],
      ['cat-cafe:workflow:sop:item-3', '{bad json'],
      [
        'cat-cafe:workflow:sop:item-4',
        JSON.stringify({
          backlogItemId: 'item-4',
          stage: 'kickoff',
        }),
      ],
      [
        'cat-cafe:workflow:sop:item-5',
        JSON.stringify({
          featureId: 'F200',
          backlogItemId: 'item-5',
          workItemRef: { methodology: 'napm' },
          stage: 'kickoff',
        }),
      ],
    ]);

    const reporter = new WorkflowSopMigrationReporter(redis);
    const report = await reporter.generateReport({ sampleLimit: 10 });

    assert.equal(report.totalRecords, 5);
    assert.equal(report.existingWorkItemRefCount, 1);
    assert.equal(report.pendingDeriveCount, 1);
    assert.equal(report.anomalyCount, 3);
    assert.deepStrictEqual(report.byMethodology, {
      napm: { existing: 1, pending: 0, anomalies: 1 },
      'cat-cafe': { existing: 0, pending: 1, anomalies: 0 },
      unknown: { existing: 0, pending: 0, anomalies: 1 },
    });
    assert.ok(report.samples.some((sample) => sample.status === 'existing-work-item-ref'));
    assert.ok(report.samples.some((sample) => sample.status === 'derive-work-item-ref'));
    assert.ok(report.anomalies.some((sample) => sample.status === 'invalid-json'));
    assert.ok(report.anomalies.some((sample) => sample.status === 'missing-legacy-fields'));
    assert.ok(report.anomalies.some((sample) => sample.status === 'invalid-work-item-ref'));
  });

  it('respects sample limit and strips key prefix for reporting', async () => {
    const redis = createRedisStub([
      [
        'cc:workflow:sop:item-1',
        JSON.stringify({ featureId: 'F001', backlogItemId: 'item-1', stage: 'kickoff' }),
      ],
      [
        'cc:workflow:sop:item-2',
        JSON.stringify({ featureId: 'F002', backlogItemId: 'item-2', stage: 'kickoff' }),
      ],
    ], 'cc:');

    const reporter = new WorkflowSopMigrationReporter(redis);
    const report = await reporter.generateReport({ sampleLimit: 1 });

    assert.equal(report.samples.length, 1);
    assert.equal(report.samples[0].key, 'workflow:sop:item-1');
  });
});
