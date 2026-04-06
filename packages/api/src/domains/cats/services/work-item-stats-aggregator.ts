import type { BacklogItem, ProjectMethodology, WorkItem, WorkItemLifecycleStatus, WorkItemStats } from '@cat-cafe/shared';

function bump(map: Record<string, number>, key: string | undefined): void {
  if (!key) return;
  map[key] = (map[key] ?? 0) + 1;
}

export function backlogItemToWorkItem(item: BacklogItem): WorkItem {
  const featureTag = item.tags.find((tag) => tag.startsWith('feature:'));
  const featureId = featureTag?.slice('feature:'.length) ?? item.id;
  const lifecycleStatus: WorkItemLifecycleStatus =
    item.status === 'done' ? 'done' : item.status === 'dispatched' ? 'in-progress' : 'idea';

  return {
    ref: {
      methodology: 'cat-cafe',
      projectId: featureId.toLowerCase(),
      kind: 'feature',
      id: item.id,
    },
    title: item.title,
    source: { type: 'roadmap', path: 'docs/ROADMAP.md' },
    owner: item.suggestion?.catId,
    priority: item.priority.toUpperCase() as WorkItem['priority'],
    lifecycleStatus,
    evidenceRefs: [],
  };
}

export function aggregateWorkItemStats(workItems: readonly WorkItem[]): WorkItemStats {
  const byStatus: Record<string, number> = {};
  const byMethodology: Record<string, number> = {};
  const byOwner: Record<string, number> = {};
  const byPriority: Record<string, number> = {};

  for (const item of workItems) {
    bump(byStatus, item.lifecycleStatus);
    bump(byMethodology, item.ref.methodology);
    bump(byOwner, item.owner ?? 'unassigned');
    bump(byPriority, item.priority ?? 'unset');
  }

  return {
    total: workItems.length,
    byStatus,
    byMethodology,
    byOwner,
    byPriority,
  };
}

export function filterWorkItemsByMethodology(
  workItems: readonly WorkItem[],
  methodology?: ProjectMethodology,
): WorkItem[] {
  if (!methodology) return [...workItems];
  return workItems.filter((item) => item.ref.methodology === methodology);
}
