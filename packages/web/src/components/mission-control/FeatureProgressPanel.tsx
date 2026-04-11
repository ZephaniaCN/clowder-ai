'use client';

import type { FeatureDocDetail, FeatureDocPhase } from '@cat-cafe/shared';
import { useState } from 'react';

interface FeatureProgressPanelProps {
  detail: FeatureDocDetail;
}

export function FeatureProgressPanel({ detail }: FeatureProgressPanelProps) {
  const [expandedPhase, setExpandedPhase] = useState<string | null>(null);

  if (detail.phases.length === 0) {
    return (
      <p className="text-[11px] text-[#B5A48E]" data-testid="mc-progress-empty">
        Feature doc 中暂无 Phase 结构
      </p>
    );
  }

  return (
    <div className="space-y-3" data-testid="mc-progress-panel">
      <p className="text-[11px] font-bold uppercase tracking-wider text-[#9A866F]">Phase 进度</p>
      {detail.phases.map((phase) => (
        <PhaseRow
          key={phase.id}
          phase={phase}
          expanded={expandedPhase === phase.id}
          onToggle={() => setExpandedPhase(expandedPhase === phase.id ? null : phase.id)}
        />
      ))}
      {detail.risks.length > 0 && (
        <div className="mt-2">
          <p className="mb-1 text-[11px] font-bold uppercase tracking-wider text-[#9A866F]">风险</p>
          <div className="space-y-1">
            {detail.risks.map((r, i) => (
              <div key={`risk-${i}`} className="flex gap-2 text-[11px]">
                <span className="text-[#B45A5A]">• {r.risk}</span>
                <span className="text-[#9A866F]">→ {r.mitigation}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function PhaseRow({ phase, expanded, onToggle }: { phase: FeatureDocPhase; expanded: boolean; onToggle: () => void }) {
  const total = phase.acs.length;
  const done = phase.acs.filter((ac) => ac.done).length;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  const barColor = pct === 100 ? 'bg-[#7CB87C]' : pct > 0 ? 'bg-[#5B9BD5]' : 'bg-[#C4B5A0]';
  const pctColor = pct === 100 ? 'text-[#7CB87C]' : pct > 0 ? 'text-[#5B9BD5]' : 'text-[#C4B5A0]';

  return (
    <div data-testid={`mc-phase-${phase.id}`}>
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center gap-2 text-left"
        data-testid={`mc-phase-toggle-${phase.id}`}
      >
        <span className="w-[60px] shrink-0 text-[11px] font-medium text-[#6E5A46]">Phase {phase.id}</span>
        <div className="h-[6px] flex-1 overflow-hidden rounded-full bg-[#E7DAC7]">
          <div className={`h-full rounded-full ${barColor} transition-all`} style={{ width: `${pct}%` }} />
        </div>
        <span className={`w-[36px] shrink-0 text-right font-mono text-[11px] font-medium ${pctColor}`}>
          {total > 0 ? `${pct}%` : '—'}
        </span>
        <span className="shrink-0 text-[10px] text-[#C4B5A0]">{expanded ? '▼' : '▸'}</span>
      </button>
      {expanded && total > 0 && (
        <div className="ml-[68px] mt-1 space-y-1" data-testid={`mc-phase-acs-${phase.id}`}>
          <p className="mb-1 text-[10px] font-medium text-[#8B7864]">{phase.name}</p>
          {phase.acs.map((ac) => (
            <div key={ac.id} className="text-[11px]">
              <div className="flex items-start gap-1.5">
                {ac.done ? (
                  <svg
                    className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#7CB87C]"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                    <polyline points="22 4 12 14.01 9 11.01" />
                  </svg>
                ) : (
                  <span className="mt-0.5 h-3.5 w-3.5 shrink-0 rounded-full border-[1.5px] border-[#C4B5A0]" />
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <span className={ac.done ? 'text-[#9A866F] line-through' : 'text-[#4B3A2A]'}>
                      {ac.id}: {ac.text}
                    </span>
                    {/* C1c: Verify/Evidence badges */}
                    {ac.verifyCmd && (
                      <span
                        className="inline-flex items-center gap-0.5 rounded bg-sky-50 px-1 py-0 text-[9px] font-medium text-sky-700"
                        title={`验证: ${ac.verifyCmd}`}
                      >
                        <svg className="h-2.5 w-2.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="4 17 10 11 4 5" />
                          <line x1="12" x2="20" y1="19" y2="19" />
                        </svg>
                      </span>
                    )}
                    {ac.evidenceRef && (
                      <span
                        className="inline-flex items-center gap-0.5 rounded bg-green-50 px-1 py-0 text-[9px] font-medium text-green-700"
                        title={`证据: ${ac.evidenceRef}`}
                      >
                        <svg className="h-2.5 w-2.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                          <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                        </svg>
                      </span>
                    )}
                  </div>
                  {/* Show verify command inline for visibility */}
                  {ac.verifyCmd && (
                    <p className="mt-0.5 text-[9px] text-sky-600">
                      {ac.verifyCmd}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
