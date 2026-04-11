'use client';

import type { HealthCheckFinding, HealthCheckSeverity, HealthReport } from '@cat-cafe/shared';
import { useEffect, useState } from 'react';
import { apiFetch } from '@/utils/api-client';

// --- Icons (Inline SVG, zero dependencies) ---

function AlertCircleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" x2="12" y1="8" y2="12" />
      <line x1="12" x2="12.01" y1="16" y2="16" />
    </svg>
  );
}

function AlertTriangleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
      <path d="M12 9v4" />
      <path d="M12 17h.01" />
    </svg>
  );
}

function InfoIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" x2="12" y1="16" y2="12" />
      <line x1="12" x2="12.01" y1="8" y2="8" />
    </svg>
  );
}

function RefreshIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
      <path d="M21 3v5h-5" />
      <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
      <path d="M3 21v-5h5" />
    </svg>
  );
}

function ChevronDownIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m6 9 6 6 6-6" />
    </svg>
  );
}

function ChevronRightIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m9 18 6-6-6-6" />
    </svg>
  );
}

// --- Styles by severity ---

const SEVERITY_STYLES: Record<HealthCheckSeverity, { icon: typeof AlertCircleIcon; iconBg: string; iconColor: string; badgeBg: string; badgeText: string; border: string }> = {
  critical: {
    icon: AlertCircleIcon,
    iconBg: 'bg-red-100',
    iconColor: 'text-red-600',
    badgeBg: 'bg-red-100',
    badgeText: 'text-red-700',
    border: 'border-red-200',
  },
  warning: {
    icon: AlertTriangleIcon,
    iconBg: 'bg-amber-100',
    iconColor: 'text-amber-600',
    badgeBg: 'bg-amber-100',
    badgeText: 'text-amber-700',
    border: 'border-amber-200',
  },
  info: {
    icon: InfoIcon,
    iconBg: 'bg-blue-100',
    iconColor: 'text-blue-600',
    badgeBg: 'bg-blue-100',
    badgeText: 'text-blue-700',
    border: 'border-blue-200',
  },
};

const CATEGORY_LABELS: Record<HealthCheckFinding['category'], string> = {
  'queue-drift': '队列漂移',
  'evidence-gap': '证据缺失',
  'stale-item': '停滞项',
};

// --- Components ---

interface HealthCheckPanelProps {
  className?: string;
}

export function HealthCheckPanel({ className }: HealthCheckPanelProps) {
  const [report, setReport] = useState<HealthReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(true);

  const loadReport = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiFetch('/api/health-check/report');
      if (!response.ok) {
        if (response.status === 501) {
          throw new Error('健康检查在此环境中不可用');
        }
        throw new Error(`加载失败: ${response.status}`);
      }
      const data = (await response.json()) as HealthReport;
      setReport(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : '未知错误');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadReport();
  }, []);

  const hasIssues = report && (report.summary.critical > 0 || report.summary.warning > 0);

  return (
    <div className={`rounded-xl border border-[#E7DAC7] bg-[#FFFDF8] ${className}`} data-testid="health-check-panel">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5">
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="flex items-center gap-2 text-left"
        >
          {expanded ? (
            <ChevronDownIcon className="h-4 w-4 text-[#9A866F]" />
          ) : (
            <ChevronRightIcon className="h-4 w-4 text-[#9A866F]" />
          )}
          <span className="text-sm font-semibold text-[#2B2118]">健康检查</span>
          {report && (
            <div className="ml-2 flex items-center gap-1.5">
              {report.summary.critical > 0 && (
                <span className="inline-flex items-center rounded-full bg-red-100 px-1.5 py-0.5 text-[10px] font-semibold text-red-700">
                  {report.summary.critical} 严重
                </span>
              )}
              {report.summary.warning > 0 && (
                <span className="inline-flex items-center rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700">
                  {report.summary.warning} 警告
                </span>
              )}
              {report.summary.info > 0 && (
                <span className="inline-flex items-center rounded-full bg-blue-100 px-1.5 py-0.5 text-[10px] font-semibold text-blue-700">
                  {report.summary.info} 信息
                </span>
              )}
              {!hasIssues && (
                <span className="inline-flex items-center rounded-full bg-green-100 px-1.5 py-0.5 text-[10px] font-semibold text-green-700">
                  ✓ 健康
                </span>
              )}
            </div>
          )}
        </button>
        <div className="flex items-center gap-2">
          {report?.checkedAt && (
            <span className="text-[10px] text-[#9A866F]">
              检查于 {new Date(report.checkedAt).toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
          <button
            type="button"
            onClick={() => void loadReport()}
            disabled={loading}
            className="inline-flex items-center rounded-lg p-1 text-[#9A866F] transition-colors hover:bg-[#F0E8DA] hover:text-[#6E5A46] disabled:opacity-50"
            title="刷新"
          >
            <RefreshIcon className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Content */}
      {expanded && (
        <div className="border-t border-[#E7DAC7]">
          {loading && (
            <div className="px-4 py-3">
              <div className="flex items-center gap-2 text-[11px] text-[#8B7864]">
                <span className="h-3 w-3 animate-spin rounded-full border-2 border-[#D8C6AD] border-t-[#8B6F47]" />
                检查中...
              </div>
            </div>
          )}

          {error && (
            <div className="px-4 py-3">
              <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[11px] text-red-700">
                {error}
              </div>
            </div>
          )}

          {!loading && !error && report && (
            <div className="max-h-[300px] overflow-auto">
              {report.findings.length === 0 ? (
                <div className="flex flex-col items-center justify-center px-4 py-6 text-center">
                  <div className="rounded-full bg-green-100 p-2">
                    <svg className="h-5 w-5 text-green-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                      <polyline points="22 4 12 14.01 9 11.01" />
                    </svg>
                  </div>
                  <p className="mt-2 text-[12px] font-medium text-[#6E5A46]">项目状态健康</p>
                  <p className="text-[11px] text-[#9A866F]">未检测到问题</p>
                </div>
              ) : (
                <div className="divide-y divide-[#F0E8DA]">
                  {report.findings.map((finding, index) => (
                    <FindingRow key={index} finding={finding} />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function FindingRow({ finding }: { finding: HealthCheckFinding }) {
  const [showSuggestion, setShowSuggestion] = useState(false);
  const styles = SEVERITY_STYLES[finding.severity];
  const Icon = styles.icon;

  return (
    <div className={`px-4 py-2.5 ${styles.border} border-l-4 bg-[#FFFDF8]`}>
      <button
        type="button"
        onClick={() => setShowSuggestion(!showSuggestion)}
        className="flex w-full items-start gap-2 text-left"
      >
        <div className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${styles.iconBg}`}>
          <Icon className={`h-3 w-3 ${styles.iconColor}`} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className={`inline-flex shrink-0 items-center rounded px-1 py-0 text-[9px] font-semibold uppercase ${styles.badgeBg} ${styles.badgeText}`}>
              {CATEGORY_LABELS[finding.category]}
            </span>
            {finding.workItemRef && (
              <span className="truncate text-[10px] text-[#9A866F]">
                {finding.workItemRef.kind}/{finding.workItemRef.id}
              </span>
            )}
          </div>
          <p className="mt-0.5 text-[12px] text-[#4B3A2A]">{finding.message}</p>
        </div>
        {finding.suggestion && (
          <span className="shrink-0 text-[10px] text-[#9A866F]">
            {showSuggestion ? '▼' : '▸'}
          </span>
        )}
      </button>
      {showSuggestion && finding.suggestion && (
        <div className="mt-1.5 ml-7 rounded-md bg-[#F7F4EF] px-2.5 py-1.5">
          <p className="text-[11px] text-[#7B6956]">
            <span className="font-medium">建议：</span>
            {finding.suggestion}
          </p>
        </div>
      )}
    </div>
  );
}
