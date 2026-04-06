import type { WorkItemRef } from './work-item.js';

export type HealthCheckSeverity = 'critical' | 'warning' | 'info';
export type HealthCheckCategory = 'queue-drift' | 'evidence-gap' | 'stale-item';

export interface HealthCheckFinding {
  readonly severity: HealthCheckSeverity;
  readonly category: HealthCheckCategory;
  readonly workItemRef?: WorkItemRef;
  readonly message: string;
  readonly suggestion?: string;
}

export interface HealthChecker<TInput = void> {
  check(input: TInput): Promise<readonly HealthCheckFinding[]> | readonly HealthCheckFinding[];
}

export interface HealthReport {
  readonly checkedAt: number;
  readonly findings: readonly HealthCheckFinding[];
  readonly summary: {
    readonly critical: number;
    readonly warning: number;
    readonly info: number;
  };
}
