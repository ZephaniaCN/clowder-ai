/**
 * F152 Phase B: WorkItemRef dual-write + read-compat tests
 *
 * Tests:
 * 1. resolveWorkItemRef() utility
 * 2. Route: upsert with explicit workItemRef
 * 3. Route: upsert without workItemRef → auto-derived
 * 4. Route: update preserves existing workItemRef
 * 5. Callback route: workItemRef passthrough
 */

import assert from 'node:assert/strict';
import { before, describe, it } from 'node:test';

// ---------- resolveWorkItemRef unit tests ----------

describe('resolveWorkItemRef()', () => {
  let resolveWorkItemRef;

  before(async () => {
    const mod = await import('../../shared/dist/utils/resolve-work-item-ref.js');
    resolveWorkItemRef = mod.resolveWorkItemRef;
  });

  it('returns sop.workItemRef when present', () => {
    const ref = { methodology: 'napm', projectId: 'novel-tool', kind: 'task', id: 't-001' };
    const sop = { featureId: 'f152', backlogItemId: 'bl-1', workItemRef: ref };
    assert.deepStrictEqual(resolveWorkItemRef(sop), ref);
  });

  it('derives from legacy fields when workItemRef is absent', () => {
    const sop = { featureId: 'F152', backlogItemId: 'bl-abc' };
    const result = resolveWorkItemRef(sop);
    assert.deepStrictEqual(result, {
      methodology: 'cat-cafe',
      projectId: 'f152',
      kind: 'feature',
      id: 'bl-abc',
    });
  });

  it('lowercases featureId for projectId derivation', () => {
    const sop = { featureId: 'F073', backlogItemId: 'item-x' };
    assert.equal(resolveWorkItemRef(sop).projectId, 'f073');
  });
});

// ---------- Route integration: workItemRef in PUT ----------

describe('WorkflowSop routes — workItemRef (F152 Phase B)', () => {
  let app;
  const USER_HEADERS = { 'x-cat-cafe-user': 'test-user' };

  // Minimal in-memory stores matching RedisWorkflowSopStore dual-write behavior
  function createStubBacklogStore() {
    const items = new Map();
    return {
      items,
      get(itemId, userId) {
        const item = items.get(itemId) ?? null;
        if (item && userId && item.userId !== userId) return null;
        return item;
      },
      create() { throw new Error('not implemented'); },
      refreshMetadata() { throw new Error('not implemented'); },
      listByUser() { return []; },
      suggestClaim() { throw new Error('not implemented'); },
      decideClaim() { throw new Error('not implemented'); },
      updateDispatchProgress() { throw new Error('not implemented'); },
      markDispatched() { throw new Error('not implemented'); },
      markDone() { throw new Error('not implemented'); },
      acquireLease() { throw new Error('not implemented'); },
      heartbeatLease() { throw new Error('not implemented'); },
      releaseLease() { throw new Error('not implemented'); },
      reclaimExpiredLease() { throw new Error('not implemented'); },
    };
  }

  function createInMemoryWorkflowSopStore() {
    const store = new Map();
    const DEFAULT_CHECKS = {
      remoteMainSynced: 'unknown',
      qualityGatePassed: 'unknown',
      reviewApproved: 'unknown',
      visionGuardDone: 'unknown',
    };
    return {
      store,
      async get(backlogItemId) { return store.get(backlogItemId) ?? null; },
      async upsert(backlogItemId, featureId, input, updatedBy) {
        const existing = store.get(backlogItemId);
        if (existing && input.expectedVersion !== undefined && existing.version !== input.expectedVersion) {
          const { VersionConflictError } = await import('../dist/domains/cats/services/stores/ports/WorkflowSopStore.js');
          throw new VersionConflictError(existing);
        }
        const now = Date.now();
        const workItemRef = input.workItemRef ?? existing?.workItemRef ?? {
          methodology: 'cat-cafe',
          projectId: featureId.toLowerCase(),
          kind: 'feature',
          id: backlogItemId,
        };
        const sop = existing
          ? {
              ...existing,
              workItemRef: input.workItemRef ?? existing.workItemRef ?? workItemRef,
              stage: input.stage ?? existing.stage,
              batonHolder: input.batonHolder ?? existing.batonHolder,
              version: existing.version + 1,
              updatedAt: now,
              updatedBy,
            }
          : {
              featureId,
              backlogItemId,
              workItemRef,
              stage: input.stage ?? 'kickoff',
              batonHolder: input.batonHolder ?? updatedBy,
              nextSkill: null,
              resumeCapsule: { goal: '', done: [], currentFocus: '' },
              checks: { ...DEFAULT_CHECKS },
              version: 1,
              updatedAt: now,
              updatedBy,
            };
        store.set(backlogItemId, sop);
        return sop;
      },
      async delete(backlogItemId) { return store.delete(backlogItemId); },
    };
  }

  before(async () => {
    const Fastify = (await import('fastify')).default;
    const routeModule = await import('../dist/routes/workflow-sop.js');

    const backlogStore = createStubBacklogStore();
    const workflowSopStore = createInMemoryWorkflowSopStore();

    backlogStore.items.set('item-1', {
      id: 'item-1',
      userId: 'test-user',
      title: 'F152 Test',
      summary: 'Test item',
      priority: 'p1',
      tags: ['f152'],
      status: 'open',
      createdBy: 'user',
    });
    backlogStore.items.set('item-2', {
      id: 'item-2',
      userId: 'test-user',
      title: 'F073 Test',
      summary: 'Test item 2',
      priority: 'p1',
      tags: ['f073'],
      status: 'open',
      createdBy: 'user',
    });

    app = Fastify();
    await app.register(routeModule.workflowSopRoutes, { workflowSopStore, backlogStore });
    await app.ready();
  });

  it('creates SOP with explicit workItemRef', async () => {
    const ref = { methodology: 'napm', projectId: 'novel-tool', kind: 'task', id: 't-001' };
    const res = await app.inject({
      method: 'PUT',
      url: '/api/backlog/item-1/workflow-sop',
      headers: USER_HEADERS,
      payload: { featureId: 'f152', stage: 'kickoff', workItemRef: ref },
    });
    assert.equal(res.statusCode, 200);
    const body = res.json();
    assert.deepStrictEqual(body.workItemRef, ref);
    assert.equal(body.featureId, 'f152');
    assert.equal(body.backlogItemId, 'item-1');
  });

  it('creates SOP with auto-derived workItemRef when not provided', async () => {
    // Use item-2 (fresh, no prior workItemRef)
    const res = await app.inject({
      method: 'PUT',
      url: '/api/backlog/item-2/workflow-sop',
      headers: USER_HEADERS,
      payload: { featureId: 'F073', stage: 'kickoff' },
    });
    assert.equal(res.statusCode, 200);
    const body = res.json();
    // Auto-derived: methodology=cat-cafe, projectId from featureId lowercased
    assert.equal(body.workItemRef.methodology, 'cat-cafe');
    assert.equal(body.workItemRef.projectId, 'f073');
    assert.equal(body.workItemRef.kind, 'feature');
    assert.equal(body.workItemRef.id, 'item-2');
  });

  it('update preserves existing workItemRef when not re-supplied', async () => {
    // Create with explicit ref
    const ref = { methodology: 'napm', projectId: 'proj-x', kind: 'slice', id: 's-1' };
    await app.inject({
      method: 'PUT',
      url: '/api/backlog/item-1/workflow-sop',
      headers: USER_HEADERS,
      payload: { featureId: 'f152', stage: 'kickoff', workItemRef: ref },
    });

    // Update without re-supplying workItemRef
    const res = await app.inject({
      method: 'PUT',
      url: '/api/backlog/item-1/workflow-sop',
      headers: USER_HEADERS,
      payload: { featureId: 'f152', stage: 'impl' },
    });
    assert.equal(res.statusCode, 200);
    const body = res.json();
    assert.equal(body.stage, 'impl');
    assert.deepStrictEqual(body.workItemRef, ref, 'workItemRef should be preserved from previous upsert');
  });

  it('update can override workItemRef', async () => {
    const newRef = { methodology: 'minimal', projectId: 'quick', kind: 'task', id: 'q-1' };
    const res = await app.inject({
      method: 'PUT',
      url: '/api/backlog/item-1/workflow-sop',
      headers: USER_HEADERS,
      payload: { featureId: 'f152', workItemRef: newRef },
    });
    assert.equal(res.statusCode, 200);
    assert.deepStrictEqual(res.json().workItemRef, newRef);
  });

  it('rejects invalid workItemRef methodology', async () => {
    const res = await app.inject({
      method: 'PUT',
      url: '/api/backlog/item-1/workflow-sop',
      headers: USER_HEADERS,
      payload: { featureId: 'f152', workItemRef: { methodology: 'invalid', projectId: 'x', kind: 'task', id: '1' } },
    });
    assert.equal(res.statusCode, 400);
  });

  it('rejects workItemRef with missing fields', async () => {
    const res = await app.inject({
      method: 'PUT',
      url: '/api/backlog/item-1/workflow-sop',
      headers: USER_HEADERS,
      payload: { featureId: 'f152', workItemRef: { methodology: 'napm' } },
    });
    assert.equal(res.statusCode, 400);
  });
});
