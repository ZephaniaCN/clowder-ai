'use client';

import type { ExternalProject, NapmEvidenceEntry, NapmProjectOverview, WorkItem, WorkItemRef } from '@cat-cafe/shared';
import { useEffect, useMemo, useState } from 'react';
import { apiFetch } from '@/utils/api-client';

interface NapmProjectTabProps {
  project: ExternalProject;
}

// --- Helper Functions and Components ---

function getStageStatus(currentStage: string, stage: string): 'completed' | 'active' | 'upcoming' {
  const stages = ['plan', 'execute', 'verify', 'document'];
  const currentIndex = stages.indexOf(currentStage);
  const stageIndex = stages.indexOf(stage);
  if (stageIndex < currentIndex) return 'completed';
  if (stageIndex === currentIndex) return 'active';
  return 'upcoming';
}

function StepperCheckIcon() {
  return (
    <svg className="h-4 w-4 text-white" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
      <path
        fillRule="evenodd"
        d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function Stepper({ currentStage }: { currentStage: string }) {
  const stages = [
    { id: 'plan', name: 'Plan' },
    { id: 'execute', name: 'Execute' },
    { id: 'verify', name: 'Verify' },
    { id: 'document', name: 'Document' },
  ];

  return (
    <nav aria-label="Progress">
      <ol className="flex items-center space-x-2">
        {stages.map((stage, stageIdx) => {
          const status = getStageStatus(currentStage, stage.id);
          return (
            <li key={stage.name} className="relative flex-1">
              {stageIdx !== stages.length - 1 && (
                <div
                  className={`absolute left-0 top-1/2 -ml-px h-0.5 w-full ${
                    status === 'completed' ? 'bg-sky-600' : 'bg-gray-300'
                  }`}
                  aria-hidden="true"
                />
              )}
              <div className="relative flex items-center justify-start">
                <span className="flex h-9 items-center">
                  <span
                    className={`relative z-10 flex h-6 w-6 items-center justify-center rounded-full ${
                      status === 'completed'
                        ? 'bg-sky-600'
                        : status === 'active'
                          ? 'border-2 border-sky-600 bg-white'
                          : 'border-2 border-gray-300 bg-white'
                    }`}
                  >
                    {status === 'completed' && <StepperCheckIcon />}
                    {status === 'active' && <span className="h-2.5 w-2.5 rounded-full bg-sky-600" />}
                  </span>
                </span>
                <span className="ml-2 text-xs font-medium text-gray-500">{stage.name}</span>
              </div>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

function formatWorkItemRef(ref: WorkItemRef): string {
  return `${ref.methodology}/${ref.projectId}/${ref.kind}/${ref.id}`;
}

const EVIDENCE_STATUS_STYLES: Record<NapmEvidenceEntry['status'], { symbol: string; color: string }> = {
  pass: { symbol: '\u2705', color: 'text-green-600' },
  fail: { symbol: '\u274C', color: 'text-red-600' },
  info: { symbol: '\u2139\uFE0F', color: 'text-gray-500' },
};

function EvidenceIcon({ status }: { status: NapmEvidenceEntry['status'] }) {
  const style = EVIDENCE_STATUS_STYLES[status] ?? EVIDENCE_STATUS_STYLES.info;
  return <span className={`text-base ${style.color}`}>{style.symbol}</span>;
}

// --- Main Component ---

export function NapmProjectTab({ project }: NapmProjectTabProps) {
  const [overview, setOverview] = useState<NapmProjectOverview | null>(null);
  const [workItems, setWorkItems] = useState<WorkItem[]>([]);
  const [evidence, setEvidence] = useState<NapmEvidenceEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);

    const loadData = async () => {
      const [overviewRes, itemsRes, evidenceRes] = await Promise.allSettled([
        apiFetch(`/api/external-projects/${project.id}/napm/overview`),
        apiFetch(`/api/external-projects/${project.id}/napm/work-items`),
        apiFetch(`/api/external-projects/${project.id}/napm/evidence`),
      ]);

      if (cancelled) return;

      if (overviewRes.status === 'fulfilled' && overviewRes.value.ok) {
        const body = (await overviewRes.value.json()) as { overview: NapmProjectOverview };
        if (!cancelled) setOverview(body.overview);
      }
      if (itemsRes.status === 'fulfilled' && itemsRes.value.ok) {
        const body = (await itemsRes.value.json()) as { items: WorkItem[] };
        if (!cancelled) setWorkItems(body.items);
      }
      if (evidenceRes.status === 'fulfilled' && evidenceRes.value.ok) {
        const body = (await evidenceRes.value.json()) as { evidence: NapmEvidenceEntry[] };
        if (!cancelled) setEvidence(body.evidence);
      }

      if (!cancelled) setIsLoading(false);
    };

    void loadData();

    return () => {
      cancelled = true;
    };
  }, [project.id]);

  const stageLabel = useMemo(() => {
    if (!overview) return 'Loading...';
    const stage = overview.currentExecutionStage;
    return `Stage: ${stage.charAt(0).toUpperCase() + stage.slice(1)}`;
  }, [overview]);

  const currentSliceTitle = useMemo(() => {
    if (!overview?.currentSlice) return 'No active slice';
    return `Current Slice: ${overview.currentSlice}`;
  }, [overview]);

  if (isLoading) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <div className="text-gray-500">Loading project data...</div>
      </div>
    );
  }

  if (!overview) {
    return (
      <div className="flex h-full items-center justify-center p-6">
        <div className="text-center text-red-500">
          <p>Failed to load project overview.</p>
          <p className="text-xs">Check API connectivity and project configuration.</p>
        </div>
      </div>
    );
  }

  const hasWorkItems = workItems.length > 0;
  const hasEvidence = evidence.length > 0;

  return (
    <div className="flex h-full min-h-0 overflow-hidden bg-gray-100/50">
      {/* Vision Track (Left Panel) */}
      <aside className="w-[400px] flex-shrink-0 overflow-auto border-r border-gray-200 bg-white p-4">
        <h2 className="mb-4 text-lg font-bold text-gray-800">Vision Track</h2>
        {hasWorkItems ? (
          <div className="space-y-3">
            {workItems.map((item) => (
              <div key={formatWorkItemRef(item.ref)} className="rounded-lg border border-gray-200 bg-white p-3">
                <p className="font-semibold text-gray-900">{item.title}</p>
                <p className="truncate text-xs text-gray-500">{formatWorkItemRef(item.ref)}</p>
                <div className="mt-2">
                  <span className="inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800">
                    {item.lifecycleStatus}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex h-64 items-center justify-center rounded-lg border-2 border-dashed border-gray-300 text-center">
            <div className="text-gray-500">
              <p className="text-3xl">📋</p>
              <h3 className="mt-2 text-sm font-medium">No work items</h3>
              <p className="mt-1 text-xs">The backlog for this project is empty.</p>
            </div>
          </div>
        )}
      </aside>

      {/* Execution Track (Right Panel) */}
      <main className="min-h-0 flex-1 overflow-auto p-6">
        <div className="mx-auto max-w-4xl">
          <header className="mb-6 flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-gray-900">{currentSliceTitle}</h1>
              <div className="mt-1 flex items-center gap-2">
                <span className="rounded-md bg-gray-100 px-2 py-1 text-xs font-medium text-gray-600">
                  📋 {overview.methodology}
                </span>
                <span className="rounded-md bg-amber-100 px-2 py-1 text-xs font-medium text-amber-800">
                  {stageLabel}
                </span>
              </div>
            </div>
          </header>

          <div className="mb-8">
            <Stepper currentStage={overview.currentExecutionStage} />
          </div>

          <div>
            <h2 className="mb-4 text-lg font-bold text-gray-800">Evidence Timeline</h2>
            {hasEvidence ? (
              <div className="space-y-4">
                {evidence.map((entry) => (
                  <div key={entry.id} className="flex items-start gap-4">
                    <div className="mt-1">
                      <EvidenceIcon status={entry.status} />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-gray-800">{entry.summary}</p>
                      <p className="text-xs text-gray-500">{entry.sourcePath}</p>
                      {entry.refs.length > 0 && (
                        <p className="mt-1 text-xs text-sky-600">
                          {entry.refs.length} reference{entry.refs.length > 1 ? 's' : ''}
                        </p>
                      )}
                    </div>
                    {entry.date && <time className="flex-shrink-0 text-xs text-gray-500">{entry.date}</time>}
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 py-12 text-center">
                <p className="text-3xl">📭</p>
                <h3 className="mt-2 text-sm font-medium text-gray-900">No evidence yet</h3>
                <p className="mt-1 text-sm text-gray-500">Execute a slice to generate the first evidence entry.</p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
