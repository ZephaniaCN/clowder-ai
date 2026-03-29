'use client';

import { useCallback, useEffect, useState } from 'react';
import { apiFetch } from '@/utils/api-client';

interface ToolUsageReport {
  period: { from: string; to: string };
  summary: { totalCalls: number; byCategory: Record<string, number> };
  topTools: Array<{ name: string; category: string; count: number }>;
  daily: Array<{ date: string; native: number; mcp: number; skill: number }>;
  byCat: Record<string, Record<string, number>>;
}

const CAT_LABELS: Record<string, string> = {
  opus: '布偶猫 Opus',
  sonnet: '布偶猫 Sonnet',
  'opus-45': '布偶猫 Opus 4.5',
  codex: '缅因猫 Codex',
  gpt52: '缅因猫 GPT-5.4',
  spark: '缅因猫 Spark',
  gemini: '暹罗猫 Gemini',
  gemini25: '暹罗猫 Gemini 2.5',
  dare: '狸花猫',
  antigravity: '孟加拉猫',
  'antig-opus': '孟加拉猫 Opus',
  opencode: '金渐层',
};

const CATEGORY_COLORS: Record<string, string> = {
  native: '#6366f1',
  mcp: '#f59e0b',
  skill: '#10b981',
};

const CATEGORY_LABELS: Record<string, string> = {
  native: 'Native',
  mcp: 'MCP',
  skill: 'Skill',
};

function catLabel(catId: string): string {
  return CAT_LABELS[catId] ?? catId;
}

export function HubToolUsageTab() {
  const [report, setReport] = useState<ToolUsageReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [days, setDays] = useState(7);

  const fetchData = useCallback(
    async (refresh = false) => {
      setLoading(true);
      setError(null);
      try {
        const url = `/api/usage/tools?days=${days}${refresh ? '&refresh=1' : ''}`;
        const res = await apiFetch(url);
        if (res.ok) {
          setReport((await res.json()) as ToolUsageReport);
        } else {
          setError(`获取失败 (${res.status})`);
        }
      } catch {
        setError('无法连接到服务器');
      } finally {
        setLoading(false);
      }
    },
    [days],
  );

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const total = report?.summary.totalCalls ?? 0;
  const byCat = report?.summary.byCategory ?? { native: 0, mcp: 0, skill: 0 };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-800">工具使用统计</h3>
        <div className="flex items-center gap-2">
          <select
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            className="rounded-md border border-gray-200 bg-white px-2 py-1 text-xs text-gray-700"
          >
            <option value={7}>近 7 天</option>
            <option value={14}>近 14 天</option>
            <option value={30}>近 30 天</option>
            <option value={90}>近 90 天</option>
          </select>
          <button
            type="button"
            onClick={() => fetchData(true)}
            disabled={loading}
            className="rounded-md bg-gray-800 px-3 py-1 text-xs text-white hover:bg-gray-700 disabled:opacity-50"
          >
            {loading ? '加载中...' : '刷新'}
          </button>
        </div>
      </div>

      {error && <div className="rounded bg-red-50 px-2 py-1 text-xs text-red-500">{error}</div>}

      {!error && total === 0 && !loading && (
        <div className="py-8 text-center text-xs text-gray-400">暂无工具使用记录（数据从 Phase A 部署后开始采集）</div>
      )}

      {total > 0 && report && (
        <>
          {/* Summary cards */}
          <SummaryCards total={total} byCategory={byCat} />

          {/* Daily trend */}
          <DailyTrend daily={report.daily} />

          {/* Top tools */}
          <TopToolsTable tools={report.topTools} total={total} />

          {/* By cat */}
          <ByCatSection byCat={report.byCat} />
        </>
      )}
    </div>
  );
}

function SummaryCards({ total, byCategory }: { total: number; byCategory: Record<string, number> }) {
  return (
    <div className="grid grid-cols-4 gap-3">
      <div className="rounded-xl border border-gray-200 bg-white p-3 text-center">
        <div className="text-2xl font-bold text-gray-900">{total.toLocaleString()}</div>
        <div className="text-xs text-gray-500">总调用</div>
      </div>
      {(['native', 'mcp', 'skill'] as const).map((cat) => (
        <div key={cat} className="rounded-xl border border-gray-200 bg-white p-3 text-center">
          <div className="text-2xl font-bold" style={{ color: CATEGORY_COLORS[cat] }}>
            {(byCategory[cat] ?? 0).toLocaleString()}
          </div>
          <div className="text-xs text-gray-500">
            {CATEGORY_LABELS[cat]}
            {total > 0 && (
              <span className="ml-1 text-gray-400">({Math.round(((byCategory[cat] ?? 0) / total) * 100)}%)</span>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function DailyTrend({ daily }: { daily: ToolUsageReport['daily'] }) {
  if (daily.length === 0) return null;
  const maxDay = Math.max(...daily.map((d) => d.native + d.mcp + d.skill), 1);

  return (
    <section className="space-y-2 rounded-xl border border-gray-200 bg-white p-4">
      <h4 className="text-xs font-semibold text-gray-600">每日趋势</h4>
      <div className="flex items-end gap-1" style={{ height: 120 }}>
        {[...daily].reverse().map((day) => {
          const dayTotal = day.native + day.mcp + day.skill;
          const height = (dayTotal / maxDay) * 100;
          return (
            <div key={day.date} className="group relative flex flex-1 flex-col items-center">
              <div className="flex w-full flex-col" style={{ height: 100 }}>
                <div className="flex-1" />
                <div className="flex w-full flex-col rounded-t" style={{ height: `${height}%` }}>
                  {dayTotal > 0 && (
                    <>
                      <div
                        className="w-full rounded-t"
                        style={{
                          height: `${(day.skill / dayTotal) * 100}%`,
                          backgroundColor: CATEGORY_COLORS.skill,
                          minHeight: day.skill > 0 ? 2 : 0,
                        }}
                      />
                      <div
                        className="w-full"
                        style={{
                          height: `${(day.mcp / dayTotal) * 100}%`,
                          backgroundColor: CATEGORY_COLORS.mcp,
                          minHeight: day.mcp > 0 ? 2 : 0,
                        }}
                      />
                      <div
                        className="w-full rounded-b"
                        style={{
                          height: `${(day.native / dayTotal) * 100}%`,
                          backgroundColor: CATEGORY_COLORS.native,
                          minHeight: day.native > 0 ? 2 : 0,
                        }}
                      />
                    </>
                  )}
                </div>
              </div>
              <span className="mt-1 text-[9px] text-gray-400">{day.date.slice(5)}</span>
              {/* Tooltip */}
              <div className="pointer-events-none absolute -top-10 hidden rounded bg-gray-900 px-2 py-1 text-[10px] text-white shadow group-hover:block">
                {day.date}: {dayTotal}
              </div>
            </div>
          );
        })}
      </div>
      {/* Legend */}
      <div className="flex justify-center gap-4 text-[10px] text-gray-500">
        {(['native', 'mcp', 'skill'] as const).map((cat) => (
          <span key={cat} className="flex items-center gap-1">
            <span className="inline-block h-2 w-2 rounded-full" style={{ backgroundColor: CATEGORY_COLORS[cat] }} />
            {CATEGORY_LABELS[cat]}
          </span>
        ))}
      </div>
    </section>
  );
}

function TopToolsTable({ tools, total }: { tools: ToolUsageReport['topTools']; total: number }) {
  if (tools.length === 0) return null;
  const maxCount = tools[0]?.count ?? 1;

  return (
    <section className="space-y-2 rounded-xl border border-gray-200 bg-white p-4">
      <h4 className="text-xs font-semibold text-gray-600">Top 工具排行</h4>
      <div className="space-y-1">
        {tools.map((tool, i) => (
          <div key={`${tool.category}:${tool.name}`} className="flex items-center gap-2 text-xs">
            <span className="w-5 text-right text-gray-400">{i + 1}</span>
            <span
              className="shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium text-white"
              style={{ backgroundColor: CATEGORY_COLORS[tool.category] ?? '#6b7280' }}
            >
              {CATEGORY_LABELS[tool.category] ?? tool.category}
            </span>
            <span className="min-w-0 flex-1 truncate font-medium text-gray-700" title={tool.name}>
              {tool.name}
            </span>
            <div className="flex w-32 items-center gap-1">
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-gray-100">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${(tool.count / maxCount) * 100}%`,
                    backgroundColor: CATEGORY_COLORS[tool.category] ?? '#6b7280',
                  }}
                />
              </div>
            </div>
            <span className="w-12 text-right tabular-nums text-gray-500">
              {tool.count}
              <span className="ml-0.5 text-gray-400">({Math.round((tool.count / total) * 100)}%)</span>
            </span>
          </div>
        ))}
      </div>
    </section>
  );
}

function ByCatSection({ byCat }: { byCat: Record<string, Record<string, number>> }) {
  const entries = Object.entries(byCat).sort(
    (a, b) => Object.values(b[1]).reduce((s, v) => s + v, 0) - Object.values(a[1]).reduce((s, v) => s + v, 0),
  );
  if (entries.length === 0) return null;

  return (
    <section className="space-y-2 rounded-xl border border-gray-200 bg-white p-4">
      <h4 className="text-xs font-semibold text-gray-600">按猫分布</h4>
      <div className="space-y-2">
        {entries.map(([catId, cats]) => {
          const catTotal = Object.values(cats).reduce((s, v) => s + v, 0);
          return (
            <div key={catId} className="flex items-center gap-3 text-xs">
              <span className="w-28 truncate font-medium text-gray-700">{catLabel(catId)}</span>
              <div className="flex h-4 flex-1 overflow-hidden rounded-full bg-gray-100">
                {(['native', 'mcp', 'skill'] as const).map((category) => {
                  const val = cats[category] ?? 0;
                  if (val === 0) return null;
                  return (
                    <div
                      key={category}
                      className="h-full"
                      style={{
                        width: `${(val / catTotal) * 100}%`,
                        backgroundColor: CATEGORY_COLORS[category],
                      }}
                      title={`${CATEGORY_LABELS[category]}: ${val}`}
                    />
                  );
                })}
              </div>
              <span className="w-10 text-right tabular-nums text-gray-500">{catTotal}</span>
            </div>
          );
        })}
      </div>
    </section>
  );
}
