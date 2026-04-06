import assert from 'node:assert/strict';
import { describe, test } from 'node:test';

describe('buildHealthReport', () => {
  test('emits queue drift, evidence gap, and stale item findings', async () => {
    const { buildHealthReport } = await import('../dist/domains/cats/services/health-check/health-report.js');

    const now = Date.now();
    const backlogItems = [
      {
        id: 'item-1',
        userId: 'u1',
        title: '[F152] Unified PM',
        summary: 'summary',
        priority: 'p1',
        tags: ['feature:f152'],
        status: 'done',
        createdBy: 'user',
        createdAt: now,
        updatedAt: now,
        audit: [],
      },
      {
        id: 'item-2',
        userId: 'u1',
        title: '[F073] SOP',
        summary: 'summary',
        priority: 'p1',
        tags: ['feature:f073'],
        status: 'dispatched',
        createdBy: 'user',
        createdAt: now,
        updatedAt: now,
        audit: [],
      },
    ];

    const workflowSops = [
      {
        featureId: 'F152',
        backlogItemId: 'item-1',
        stage: 'review',
        batonHolder: 'opus',
        nextSkill: null,
        resumeCapsule: { goal: '', done: [], currentFocus: '' },
        checks: {
          remoteMainSynced: 'unknown',
          qualityGatePassed: 'unknown',
          reviewApproved: 'unknown',
          visionGuardDone: 'unknown',
        },
        version: 1,
        updatedAt: now - 8 * 24 * 60 * 60 * 1000,
        updatedBy: 'opus',
      },
      {
        featureId: 'F073',
        backlogItemId: 'item-2',
        stage: 'impl',
        batonHolder: 'opus',
        nextSkill: null,
        resumeCapsule: { goal: '', done: [], currentFocus: '' },
        checks: {
          remoteMainSynced: 'unknown',
          qualityGatePassed: 'unknown',
          reviewApproved: 'unknown',
          visionGuardDone: 'unknown',
        },
        version: 1,
        updatedAt: now - 2 * 24 * 60 * 60 * 1000,
        updatedBy: 'opus',
      },
    ];

    const featureDocsById = new Map([
      ['F152', '- [x] AC-A1: done without evidence'],
      ['F073', '- [x] AC-A1: done [evidence: commit:abc123]'],
    ]);

    const report = buildHealthReport({ backlogItems, workflowSops, featureDocsById, now });
    assert.equal(report.summary.critical, 1);
    assert.equal(report.summary.warning, 2);
    assert.equal(report.summary.info, 0);
    assert.ok(report.findings.some((f) => f.category === 'evidence-gap' && f.severity === 'critical'));
    assert.ok(report.findings.some((f) => f.category === 'queue-drift' && f.severity === 'warning'));
    assert.ok(report.findings.some((f) => f.category === 'stale-item' && f.severity === 'warning'));
  });
});
