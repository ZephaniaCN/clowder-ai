export type ProjectMethodology = 'cat-cafe' | 'napm' | 'minimal';

export type WorkItemKind = 'feature' | 'task' | 'slice';

export type WorkItemLifecycleStatus = 'idea' | 'spec' | 'in-progress' | 'review' | 'done' | 'obsolete';

export type WorkItemExecutionStage = 'plan' | 'execute' | 'verify' | 'document' | 'idle';

export type WorkItemSourceType = 'roadmap' | 'pm-next' | 'pm-backlog';

export type WorkItemPriority = 'P0' | 'P1' | 'P2' | 'P3';

export type WorkItemEvidenceType = 'progress' | 'commit' | 'pr' | 'screenshot' | 'evidence';

export type WorkItemGateState = 'passed' | 'failed' | 'pending' | 'unknown';

export interface WorkItemRef {
  readonly methodology: ProjectMethodology;
  readonly projectId: string;
  readonly kind: WorkItemKind;
  readonly id: string;
}

export interface WorkItemSource {
  readonly type: WorkItemSourceType;
  readonly path: string;
  readonly line?: number;
}

export interface WorkItemEvidenceRef {
  readonly type: WorkItemEvidenceType;
  readonly ref: string;
}

export interface WorkItemGates {
  readonly design?: WorkItemGateState;
  readonly quality?: WorkItemGateState;
  readonly review?: WorkItemGateState;
  readonly visionGuardian?: WorkItemGateState;
}

export interface WorkItem {
  readonly ref: WorkItemRef;
  readonly title: string;
  readonly source: WorkItemSource;
  readonly intent?: string;
  readonly dod?: string;
  readonly verifyCmd?: string;
  readonly scope?: string;
  readonly owner?: string;
  readonly priority?: WorkItemPriority;
  readonly risk?: 'high' | 'medium' | 'low';
  readonly gates?: WorkItemGates;
  readonly lifecycleStatus: WorkItemLifecycleStatus;
  readonly executionStage?: WorkItemExecutionStage;
  readonly currentSlice?: string;
  readonly evidenceRefs: readonly WorkItemEvidenceRef[];
}

export interface NapmProjectState {
  readonly status: string;
  readonly phase?: string;
  readonly updatedAt?: string;
}

export interface NapmProjectSummaryCounts {
  readonly total: number;
  readonly done: number;
  readonly doing: number;
  readonly todo: number;
}

export interface NapmProjectOverview {
  readonly methodology: Extract<ProjectMethodology, 'napm'>;
  readonly projectId: string;
  readonly projectState: NapmProjectState;
  readonly currentExecutionStage: WorkItemExecutionStage;
  readonly currentSlice?: string;
  readonly summaryCounts: NapmProjectSummaryCounts;
}

export type NapmEvidenceStatus = 'pass' | 'fail' | 'info';

export interface NapmEvidenceEntry {
  readonly id: string;
  readonly title: string;
  readonly summary: string;
  readonly date?: string;
  readonly status: NapmEvidenceStatus;
  readonly sourcePath: string;
  readonly refs: readonly string[];
}
