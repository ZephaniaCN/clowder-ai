import type { WorkItemRef, WorkflowSop } from '@cat-cafe/shared';
import type { RedisClient } from '@cat-cafe/shared/utils';
import { resolveWorkItemRef } from '@cat-cafe/shared/utils';
import { WorkflowSopKeys } from '../redis-keys/workflow-sop-keys.js';

export type WorkflowSopMigrationSampleStatus =
  | 'existing-work-item-ref'
  | 'derive-work-item-ref'
  | 'invalid-json'
  | 'missing-legacy-fields'
  | 'invalid-work-item-ref';

export interface WorkflowSopMigrationSample {
  readonly key: string;
  readonly backlogItemId?: string;
  readonly featureId?: string;
  readonly status: WorkflowSopMigrationSampleStatus;
  readonly methodology?: string;
  readonly reason?: string;
  readonly workItemRef?: WorkItemRef;
}

export interface WorkflowSopMigrationReport {
  readonly totalRecords: number;
  readonly existingWorkItemRefCount: number;
  readonly pendingDeriveCount: number;
  readonly anomalyCount: number;
  readonly byMethodology: Readonly<Record<string, { existing: number; pending: number; anomalies: number }>>;
  readonly samples: readonly WorkflowSopMigrationSample[];
  readonly anomalies: readonly WorkflowSopMigrationSample[];
}

function isValidWorkItemRef(value: unknown): value is WorkItemRef {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.methodology === 'string' &&
    typeof candidate.projectId === 'string' &&
    typeof candidate.kind === 'string' &&
    typeof candidate.id === 'string' &&
    candidate.methodology.length > 0 &&
    candidate.projectId.length > 0 &&
    candidate.kind.length > 0 &&
    candidate.id.length > 0
  );
}

function isLegacyDerivable(value: unknown): value is Pick<WorkflowSop, 'featureId' | 'backlogItemId'> {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Record<string, unknown>;
  return typeof candidate.featureId === 'string' && candidate.featureId.length > 0 && typeof candidate.backlogItemId === 'string' && candidate.backlogItemId.length > 0;
}

export class WorkflowSopMigrationReporter {
  constructor(private readonly redis: RedisClient) {}

  private get keyPrefix(): string {
    return (this.redis.options as { keyPrefix?: string }).keyPrefix ?? '';
  }

  private stripPrefix(rawKey: string): string {
    const prefix = this.keyPrefix;
    return prefix && rawKey.startsWith(prefix) ? rawKey.slice(prefix.length) : rawKey;
  }

  private bumpMethodology(
    map: Map<string, { existing: number; pending: number; anomalies: number }>,
    methodology: string,
    field: 'existing' | 'pending' | 'anomalies',
  ): void {
    const current = map.get(methodology) ?? { existing: 0, pending: 0, anomalies: 0 };
    current[field] += 1;
    map.set(methodology, current);
  }

  async generateReport(options?: { sampleLimit?: number }): Promise<WorkflowSopMigrationReport> {
    const sampleLimit = Math.max(1, Math.min(options?.sampleLimit ?? 20, 50));
    const scanPattern = `${this.keyPrefix}${WorkflowSopKeys.detail('*')}`;

    const samples: WorkflowSopMigrationSample[] = [];
    const anomalies: WorkflowSopMigrationSample[] = [];
    const byMethodology = new Map<string, { existing: number; pending: number; anomalies: number }>();
    let totalRecords = 0;
    let existingWorkItemRefCount = 0;
    let pendingDeriveCount = 0;
    let anomalyCount = 0;

    let cursor = '0';
    do {
      const [nextCursor, keys] = await this.redis.scan(cursor, 'MATCH', scanPattern, 'COUNT', 200);
      cursor = nextCursor;
      if (keys.length === 0) continue;

      const strippedKeys = keys.map((key) => this.stripPrefix(key));
      const values = await this.redis.mget(...strippedKeys);

      for (let index = 0; index < strippedKeys.length; index += 1) {
        const key = strippedKeys[index]!;
        const raw = values[index];
        totalRecords += 1;

        if (!raw) {
          anomalyCount += 1;
          const sample = { key, status: 'invalid-json', reason: 'Empty Redis value' } satisfies WorkflowSopMigrationSample;
          anomalies.push(sample);
          if (samples.length < sampleLimit) samples.push(sample);
          continue;
        }

        let parsed: unknown;
        try {
          parsed = JSON.parse(raw);
        } catch (error) {
          anomalyCount += 1;
          const sample = {
            key,
            status: 'invalid-json',
            reason: error instanceof Error ? error.message : String(error),
          } satisfies WorkflowSopMigrationSample;
          anomalies.push(sample);
          if (samples.length < sampleLimit) samples.push(sample);
          continue;
        }

        const base = {
          key,
          ...(typeof (parsed as Record<string, unknown>).backlogItemId === 'string'
            ? { backlogItemId: (parsed as Record<string, unknown>).backlogItemId as string }
            : {}),
          ...(typeof (parsed as Record<string, unknown>).featureId === 'string'
            ? { featureId: (parsed as Record<string, unknown>).featureId as string }
            : {}),
        };

        if (isValidWorkItemRef((parsed as Record<string, unknown>).workItemRef)) {
          const workItemRef = (parsed as Record<string, unknown>).workItemRef as WorkItemRef;
          existingWorkItemRefCount += 1;
          this.bumpMethodology(byMethodology, workItemRef.methodology, 'existing');
          if (samples.length < sampleLimit) {
            samples.push({
              ...base,
              status: 'existing-work-item-ref',
              methodology: workItemRef.methodology,
              workItemRef,
            });
          }
          continue;
        }

        if ((parsed as Record<string, unknown>).workItemRef !== undefined) {
          anomalyCount += 1;
          const methodology = typeof ((parsed as Record<string, unknown>).workItemRef as Record<string, unknown>)?.methodology === 'string'
            ? (((parsed as Record<string, unknown>).workItemRef as Record<string, unknown>).methodology as string)
            : 'unknown';
          this.bumpMethodology(byMethodology, methodology, 'anomalies');
          const sample = {
            ...base,
            status: 'invalid-work-item-ref',
            methodology,
            reason: 'workItemRef exists but is malformed',
          } satisfies WorkflowSopMigrationSample;
          anomalies.push(sample);
          if (samples.length < sampleLimit) samples.push(sample);
          continue;
        }

        if (!isLegacyDerivable(parsed)) {
          anomalyCount += 1;
          this.bumpMethodology(byMethodology, 'unknown', 'anomalies');
          const sample = {
            ...base,
            status: 'missing-legacy-fields',
            methodology: 'unknown',
            reason: 'Missing featureId/backlogItemId legacy fields',
          } satisfies WorkflowSopMigrationSample;
          anomalies.push(sample);
          if (samples.length < sampleLimit) samples.push(sample);
          continue;
        }

        const workItemRef = resolveWorkItemRef(parsed as WorkflowSop);
        pendingDeriveCount += 1;
        this.bumpMethodology(byMethodology, workItemRef.methodology, 'pending');
        if (samples.length < sampleLimit) {
          samples.push({
            ...base,
            status: 'derive-work-item-ref',
            methodology: workItemRef.methodology,
            workItemRef,
          });
        }
      }
    } while (cursor !== '0');

    return {
      totalRecords,
      existingWorkItemRefCount,
      pendingDeriveCount,
      anomalyCount,
      byMethodology: Object.fromEntries(byMethodology.entries()),
      samples,
      anomalies,
    };
  }
}
