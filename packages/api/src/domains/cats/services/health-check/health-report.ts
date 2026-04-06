import type { BacklogItem, HealthCheckFinding, HealthReport, WorkItemRef, WorkflowSop } from '@cat-cafe/shared';
import { parseFeatureACs, resolveWorkItemRef } from '@cat-cafe/shared/utils';

export interface BuildHealthReportInput {
  readonly backlogItems: readonly BacklogItem[];
  readonly workflowSops: readonly WorkflowSop[];
  readonly featureDocsById: ReadonlyMap<string, string>;
  readonly now?: number;
  readonly staleInfoMs?: number;
  readonly staleWarningMs?: number;
}

const DEFAULT_STALE_INFO_MS = 3 * 24 * 60 * 60 * 1000;
const DEFAULT_STALE_WARNING_MS = 7 * 24 * 60 * 60 * 1000;

function getFeatureIdFromTags(tags: readonly string[]): string | null {
  for (const tag of tags) {
    if (tag.startsWith('feature:')) return tag.slice('feature:'.length).toUpperCase();
  }
  return null;
}

function buildCatCafeFeatureRef(featureId: string, backlogItemId: string): WorkItemRef {
  return {
    methodology: 'cat-cafe',
    projectId: featureId.toLowerCase(),
    kind: 'feature',
    id: backlogItemId,
  };
}

function expectedSopStages(status: BacklogItem['status']): readonly string[] {
  switch (status) {
    case 'done':
      return ['completion'];
    case 'dispatched':
      return ['impl', 'quality_gate', 'review', 'merge'];
    default:
      return ['kickoff'];
  }
}

export function buildHealthReport(input: BuildHealthReportInput): HealthReport {
  const now = input.now ?? Date.now();
  const staleInfoMs = input.staleInfoMs ?? DEFAULT_STALE_INFO_MS;
  const staleWarningMs = input.staleWarningMs ?? DEFAULT_STALE_WARNING_MS;
  const findings: HealthCheckFinding[] = [];
  const workflowSopByBacklogId = new Map(input.workflowSops.map((sop) => [sop.backlogItemId, sop] as const));

  for (const item of input.backlogItems) {
    const featureId = getFeatureIdFromTags(item.tags);
    const sop = workflowSopByBacklogId.get(item.id);
    const expectedStages = expectedSopStages(item.status);

    if (sop) {
      if (!expectedStages.includes(sop.stage)) {
        findings.push({
          severity: 'warning',
          category: 'queue-drift',
          workItemRef: resolveWorkItemRef(sop),
          message: `Backlog 状态 ${item.status} 与 SOP 阶段 ${sop.stage} 不一致`,
          suggestion: `期望阶段之一: ${expectedStages.join(', ')}`,
        });
      }
    } else if (item.status === 'dispatched' || item.status === 'done') {
      findings.push({
        severity: 'warning',
        category: 'queue-drift',
        ...(featureId ? { workItemRef: buildCatCafeFeatureRef(featureId, item.id) } : {}),
        message: `Backlog 状态 ${item.status} 但缺少 WorkflowSop 记录`,
        suggestion: '补建 SOP 告示牌或核对 backlog 状态',
      });
    }

    if (item.status === 'done' && featureId) {
      const markdown = input.featureDocsById.get(featureId);
      if (markdown) {
        const acs = parseFeatureACs(markdown);
        if (acs.length > 0 && acs.every((ac) => !ac.evidenceRef)) {
          findings.push({
            severity: 'critical',
            category: 'evidence-gap',
            workItemRef: buildCatCafeFeatureRef(featureId, item.id),
            message: `Feature ${featureId} 已完成，但 AC 缺少 evidence 引用`,
            suggestion: '为已验收 AC 补充 [evidence: ...] 引用',
          });
        }
      }
    }
  }

  for (const sop of input.workflowSops) {
    if (sop.stage === 'completion') continue;
    const ageMs = now - sop.updatedAt;
    if (ageMs < staleInfoMs) continue;
    const severity = ageMs >= staleWarningMs ? 'warning' : 'info';
    const ageDays = Math.floor(ageMs / (24 * 60 * 60 * 1000));
    findings.push({
      severity,
      category: 'stale-item',
      workItemRef: resolveWorkItemRef(sop),
      message: `SOP 阶段 ${sop.stage} 已停留 ${ageDays} 天`,
      suggestion: '检查是否需要推进阶段、回收 backlog 状态或补充最新进展',
    });
  }

  return {
    checkedAt: now,
    findings,
    summary: {
      critical: findings.filter((f) => f.severity === 'critical').length,
      warning: findings.filter((f) => f.severity === 'warning').length,
      info: findings.filter((f) => f.severity === 'info').length,
    },
  };
}
