import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import Fastify from 'fastify';

describe('health-check routes', () => {
  test('returns 501 when workflowSopStore does not support listAll', async () => {
    const { healthCheckRoutes } = await import('../dist/routes/health-check.js');
    const app = Fastify();
    await app.register(healthCheckRoutes, {
      backlogStore: {
        listByUser() {
          return [];
        },
      },
    });
    await app.ready();

    const res = await app.inject({
      method: 'GET',
      url: '/api/health-check/report',
      headers: { 'x-cat-cafe-user': 'u1' },
    });
    assert.equal(res.statusCode, 501);
    await app.close();
  });

  test('returns 401 without identity header', async () => {
    const { healthCheckRoutes } = await import('../dist/routes/health-check.js');
    const app = Fastify();
    await app.register(healthCheckRoutes, {
      backlogStore: {
        listByUser() {
          return [];
        },
      },
      workflowSopStore: {
        async listAll() {
          return [];
        },
      },
      async loadFeatureDocsByFeatureId() {
        return new Map();
      },
    });
    await app.ready();

    const res = await app.inject({ method: 'GET', url: '/api/health-check/report' });
    assert.equal(res.statusCode, 401);
    await app.close();
  });

  test('returns health report for scoped user backlog items', async () => {
    const { healthCheckRoutes } = await import('../dist/routes/health-check.js');
    const now = Date.now();
    const app = Fastify();
    await app.register(healthCheckRoutes, {
      backlogStore: {
        listByUser(userId) {
          assert.equal(userId, 'u1');
          return [
            {
              id: 'item-1',
              userId,
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
          ];
        },
      },
      workflowSopStore: {
        async listAll() {
          return [
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
          ];
        },
      },
      async loadFeatureDocsByFeatureId(featureIds) {
        assert.deepStrictEqual(featureIds, ['F152']);
        return new Map([['F152', '- [x] AC-A1: done without evidence']]);
      },
    });
    await app.ready();

    const res = await app.inject({
      method: 'GET',
      url: '/api/health-check/report',
      headers: { 'x-cat-cafe-user': 'u1' },
    });
    assert.equal(res.statusCode, 200);
    const body = res.json();
    assert.equal(body.summary.critical, 1);
    assert.equal(body.summary.warning, 2);
    await app.close();
  });
});
