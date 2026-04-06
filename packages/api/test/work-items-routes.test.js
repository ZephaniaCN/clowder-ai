import assert from 'node:assert/strict';
import { afterEach, describe, test } from 'node:test';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import Fastify from 'fastify';

describe('work-items stats route', () => {
  const tempDirs = [];

  afterEach(() => {
    while (tempDirs.length > 0) {
      const dir = tempDirs.pop();
      if (dir) rmSync(dir, { recursive: true, force: true });
    }
  });

  test('returns aggregated stats across cat-cafe and napm work items', async () => {
    const { workItemsRoutes } = await import('../dist/routes/work-items.js');
    const { ExternalProjectStore } = await import('../dist/domains/projects/external-project-store.js');

    const root = join(tmpdir(), `napm-stats-${Date.now()}`);
    tempDirs.push(root);
    mkdirSync(join(root, 'pm'), { recursive: true });
    writeFileSync(
      join(root, 'pm/backlog.md'),
      ['# Project Backlog', '', '## Epic: Demo', '- [ ] [owner:codex] [priority:P0] [status:todo] task-one'].join('\n'),
      'utf-8',
    );
    writeFileSync(join(root, 'pm/next.md'), '- [ ] [owner:codex] [priority:P0] [status:doing] task-one\n', 'utf-8');
    writeFileSync(join(root, 'pm/state.yaml'), "state: in_progress\n", 'utf-8');
    writeFileSync(join(root, 'EVIDENCE.md'), '# EVIDENCE\n', 'utf-8');

    const externalProjectStore = new ExternalProjectStore();
    externalProjectStore.create('u1', {
      name: 'napm-demo',
      description: '',
      sourcePath: root,
      methodology: 'napm',
    });

    const app = Fastify();
    await app.register(workItemsRoutes, {
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
              status: 'dispatched',
              createdBy: 'user',
              createdAt: Date.now(),
              updatedAt: Date.now(),
              audit: [],
            },
          ];
        },
      },
      externalProjectStore,
    });
    await app.ready();

    const res = await app.inject({
      method: 'GET',
      url: '/api/work-items/stats',
      headers: { 'x-cat-cafe-user': 'u1' },
    });
    assert.equal(res.statusCode, 200);
    const body = res.json();
    assert.equal(body.total, 2);
    assert.equal(body.byMethodology['cat-cafe'], 1);
    assert.equal(body.byMethodology.napm, 1);
    await app.close();
  });
});
