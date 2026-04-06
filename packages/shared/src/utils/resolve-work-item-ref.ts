import type { WorkItemRef, ProjectMethodology, WorkItemKind } from '../types/work-item.js';
import type { WorkflowSop } from '../types/workflow-sop.js';

/**
 * F152 Phase B: resolve a WorkItemRef from a WorkflowSop.
 *
 * Priority:
 * 1. Use sop.workItemRef if present (Phase B+ data)
 * 2. Derive from legacy featureId/backlogItemId (Phase A data)
 *
 * This function is the single point of read-compat logic during
 * the dual-write migration period.
 */
export function resolveWorkItemRef(sop: WorkflowSop): WorkItemRef {
  if (sop.workItemRef) return sop.workItemRef;

  return {
    methodology: 'cat-cafe' as ProjectMethodology,
    projectId: sop.featureId.toLowerCase(),
    kind: 'feature' as WorkItemKind,
    id: sop.backlogItemId,
  };
}
