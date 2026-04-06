/**
 * F152 Phase B B3: Thread workItemRef association tests
 *
 * Tests:
 * 1. Thread creation with explicit workItemRef
 * 2. Thread creation with backlogItemId auto-derives workItemRef
 * 3. linkWorkItemRef on in-memory ThreadStore
 * 4. Thread GET response includes workItemRef
 */

import assert from 'node:assert/strict';
import { afterEach, beforeEach, describe, it } from 'node:test';
import Fastify from 'fastify';

describe('Thread workItemRef (F152 B3)', () => {
  let app;
  let threadStore;

  beforeEach(async () => {
    const { ThreadStore } = await import('../dist/domains/cats/services/stores/ports/ThreadStore.js');
    const { threadsRoutes } = await import('../dist/routes/threads.js');

    threadStore = new ThreadStore();
    app = Fastify();
    await app.register(threadsRoutes, { threadStore });
    await app.ready();
  });

  afterEach(async () => {
    if (app) await app.close();
  });

  it('creates thread with explicit workItemRef', async () => {
    const ref = { methodology: 'napm', projectId: 'novel-tool', kind: 'task', id: 't-001' };
    const res = await app.inject({
      method: 'POST',
      url: '/api/threads',
      payload: { userId: 'alice', title: 'NAPM task', workItemRef: ref },
    });
    assert.equal(res.statusCode, 201);
    const body = JSON.parse(res.body);
    assert.deepStrictEqual(body.workItemRef, ref);
  });

  it('auto-derives workItemRef when backlogItemId provided without explicit ref', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/threads',
      payload: { userId: 'alice', title: 'Backlog thread', backlogItemId: 'BL-042' },
    });
    assert.equal(res.statusCode, 201);
    const body = JSON.parse(res.body);
    assert.ok(body.workItemRef, 'workItemRef should be auto-derived');
    assert.equal(body.workItemRef.methodology, 'cat-cafe');
    assert.equal(body.workItemRef.kind, 'feature');
    assert.equal(body.workItemRef.id, 'BL-042');
  });

  it('explicit workItemRef takes precedence over auto-derivation', async () => {
    const ref = { methodology: 'napm', projectId: 'ext-proj', kind: 'slice', id: 's-007' };
    const res = await app.inject({
      method: 'POST',
      url: '/api/threads',
      payload: { userId: 'alice', title: 'Mixed', backlogItemId: 'BL-042', workItemRef: ref },
    });
    assert.equal(res.statusCode, 201);
    const body = JSON.parse(res.body);
    assert.deepStrictEqual(body.workItemRef, ref);
  });

  it('thread without workItemRef or backlogItemId has no workItemRef', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/threads',
      payload: { userId: 'alice', title: 'Plain thread' },
    });
    assert.equal(res.statusCode, 201);
    const body = JSON.parse(res.body);
    assert.equal(body.workItemRef, undefined);
  });
});

describe('ThreadStore.linkWorkItemRef (in-memory)', () => {
  it('stores and retrieves workItemRef', async () => {
    const { ThreadStore } = await import('../dist/domains/cats/services/stores/ports/ThreadStore.js');
    const store = new ThreadStore();
    const thread = store.create('user-1', 'test');
    assert.equal(thread.workItemRef, undefined);

    const ref = { methodology: 'cat-cafe', projectId: 'f152', kind: 'feature', id: 'bl-001' };
    store.linkWorkItemRef(thread.id, ref);
    const updated = store.get(thread.id);
    assert.deepStrictEqual(updated.workItemRef, ref);
  });
});
