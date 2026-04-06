import type { ProjectMethodology, WorkItem, WorkItemStats } from '@cat-cafe/shared';
import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import type { IBacklogStore } from '../domains/cats/services/stores/ports/BacklogStore.js';
import { aggregateWorkItemStats, backlogItemToWorkItem, filterWorkItemsByMethodology } from '../domains/cats/services/work-item-stats-aggregator.js';
import type { ExternalProjectStore } from '../domains/projects/external-project-store.js';
import { NapmProjectAdapter } from '../domains/projects/napm-project-adapter.js';
import { resolveHeaderUserId } from '../utils/request-identity.js';

const statsQuerySchema = z.object({
  methodology: z.enum(['cat-cafe', 'napm', 'minimal']).optional(),
  projectId: z.string().min(1).optional(),
});

export interface WorkItemsRoutesOptions {
  backlogStore: IBacklogStore;
  externalProjectStore: ExternalProjectStore;
}

export const workItemsRoutes: FastifyPluginAsync<WorkItemsRoutesOptions> = async (app, opts) => {
  app.get('/api/work-items/stats', async (request, reply) => {
    const userId = resolveHeaderUserId(request);
    if (!userId) {
      return reply.status(401).send({ error: 'Missing X-Cat-Cafe-User header' });
    }

    const parsed = statsQuerySchema.safeParse(request.query);
    if (!parsed.success) {
      return reply.status(400).send({ error: 'Invalid request query', details: parsed.error.issues });
    }

    const { methodology, projectId } = parsed.data;
    const workItems: WorkItem[] = [];

    if (!methodology || methodology === 'cat-cafe') {
      const backlogItems = await opts.backlogStore.listByUser(userId);
      workItems.push(...backlogItems.map(backlogItemToWorkItem));
    }

    if (!methodology || methodology === 'napm') {
      const projects = projectId
        ? [opts.externalProjectStore.getById(projectId)].filter(
            (project): project is NonNullable<typeof project> => Boolean(project && project.userId === userId && project.methodology === 'napm'),
          )
        : opts.externalProjectStore.listByUser(userId).filter((project) => project.methodology === 'napm');

      for (const project of projects) {
        const adapter = new NapmProjectAdapter(project.sourcePath, project.id);
        workItems.push(...(await adapter.toWorkItems()));
      }
    }

    const filtered = filterWorkItemsByMethodology(workItems, methodology as ProjectMethodology | undefined);
    const stats: WorkItemStats = aggregateWorkItemStats(filtered);
    return stats;
  });
};
