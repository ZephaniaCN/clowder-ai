import type { HealthReport } from '@cat-cafe/shared';
import type { FastifyPluginAsync } from 'fastify';
import type { IBacklogStore } from '../domains/cats/services/stores/ports/BacklogStore.js';
import type { IWorkflowSopStore } from '../domains/cats/services/stores/ports/WorkflowSopStore.js';
import { buildHealthReport } from '../domains/cats/services/health-check/health-report.js';
import { gitListFeatureDocs, readFeatureDocContent } from './git-doc-reader.js';
import { resolveHeaderUserId } from '../utils/request-identity.js';

export interface HealthCheckRoutesOptions {
  backlogStore: IBacklogStore;
  workflowSopStore?: IWorkflowSopStore;
  loadFeatureDocsByFeatureId?: (featureIds: string[]) => Promise<Map<string, string>>;
}

async function defaultLoadFeatureDocsByFeatureId(featureIds: string[]): Promise<Map<string, string>> {
  const wanted = new Set(featureIds.map((id) => id.toUpperCase()));
  const docs = await gitListFeatureDocs();
  const entries = new Map<string, string>();
  for (const docFile of docs) {
    const matched = [...wanted].find((id) => docFile.toUpperCase().startsWith(id));
    if (!matched) continue;
    const content = await readFeatureDocContent(docFile);
    if (content) entries.set(matched, content);
  }
  return entries;
}

function getFeatureIdFromTags(tags: readonly string[]): string | null {
  for (const tag of tags) {
    if (tag.startsWith('feature:')) return tag.slice('feature:'.length).toUpperCase();
  }
  return null;
}

export const healthCheckRoutes: FastifyPluginAsync<HealthCheckRoutesOptions> = async (app, opts) => {
  app.get('/api/health-check/report', async (request, reply) => {
    if (typeof opts.workflowSopStore?.listAll !== 'function') {
      return reply.status(501).send({
        error: 'Health check requires Redis-backed workflow SOP store (listAll not available)',
      });
    }

    const userId = resolveHeaderUserId(request);
    if (!userId) {
      return reply.status(401).send({ error: 'Missing X-Cat-Cafe-User header' });
    }

    const backlogItems = await opts.backlogStore.listByUser(userId);
    const relevantBacklogIds = new Set(backlogItems.map((item) => item.id));
    const featureIds = [...new Set(backlogItems.map((item) => getFeatureIdFromTags(item.tags)).filter(Boolean))] as string[];
    const [workflowSops, featureDocsById] = await Promise.all([
      opts.workflowSopStore.listAll().then((rows) => rows.filter((row) => relevantBacklogIds.has(row.backlogItemId))),
      (opts.loadFeatureDocsByFeatureId ?? defaultLoadFeatureDocsByFeatureId)(featureIds),
    ]);

    const report: HealthReport = buildHealthReport({
      backlogItems,
      workflowSops,
      featureDocsById,
    });

    return report;
  });
};
