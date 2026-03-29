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

/* Cozy Swiss palette — warm tones aligned with Cat Café design language */
const CATEGORY_STYLE: Record<string, { color: string; bg: string; label: string; icon: string }> = {
  native: { color: '#7C6CA8', bg: '#F3F0FA', label: '原生工具', icon: '🔧' },
  mcp: { color: '#D4915A', bg: '#FDF3EB', label: 'MCP 桥接', icon: '🌉' },
  skill: { color: '#6BA589', bg: '#EDF7F2', label: '技能调用', icon: '✨' },
};

const CATEGORIES = ['native', 'mcp', 'skill'] as const;

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
      {/* Header — cafe menu style */}
      <div className="flex items-center justify-between rounded-xl bg-[#FDF8F3] px-4 py-3">
        <div>
          <h3 className="text-sm font-semibold text-[#5C4A3A]">工具使用日志</h3>
          <p className="text-[11px] text-[#A08A76]">猫猫们的每日工具箱使用记录</p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            className="rounded-lg border border-[#E8DDD2] bg-white px-2 py-1 text-xs text-[#5C4A3A]"
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
            className="rounded-lg bg-[#5C4A3A] px-3 py-1 text-xs text-white hover:bg-[#7A6555] disabled:opacity-50"
          >
            {loading ? '冲泡中...' : '刷新'}
          </button>
        </div>
      </div>

      {error && <div className="rounded-lg bg-red-50 px-3 py-2 text-xs text-red-600">{error}</div>}

      {!error && total === 0 && !loading && (
        <div className="rounded-xl border border-dashed border-[#E8DDD2] bg-[#FDF8F3] py-10 text-center">
          <div className="text-2xl">☕</div>
          <p className="mt-2 text-xs text-[#A08A76]">还没有工具使用记录</p>
          <p className="text-[11px] text-[#C4B5A4]">猫猫们开始工作后，数据会自动出现在这里</p>
        </div>
      )}

      {total > 0 && report && (
        <>
          <SummaryCards total={total} byCategory={byCat} />
          <DailyTrend daily={report.daily} />
          <TopToolsTable tools={report.topTools} total={total} />
          <ByCatSection byCat={report.byCat} />
        </>
      )}
    </div>
  );
}

/* ── Summary: 3 category cards + total ── */
function SummaryCards({ total, byCategory }: { total: number; byCategory: Record<string, number> }) {
  return (
    <div className="grid grid-cols-4 gap-3">
      <div className="rounded-xl border border-[#E8DDD2] bg-[#FDF8F3] p-3 text-center">
        <div className="text-2xl font-bold text-[#5C4A3A]">{total.toLocaleString()}</div>
        <div className="text-[11px] text-[#A08A76]">总调用</div>
      </div>
      {CATEGORIES.map((cat) => {
        const style = CATEGORY_STYLE[cat];
        const count = byCategory[cat] ?? 0;
        return (
          <div
            key={cat}
            className="rounded-xl border border-gray-100 p-3 text-center"
            style={{ backgroundColor: style.bg }}
          >
            <div className="text-lg">{style.icon}</div>
            <div className="text-xl font-bold" style={{ color: style.color }}>
              {count.toLocaleString()}
            </div>
            <div className="text-[11px]" style={{ color: style.color }}>
              {style.label}
              {total > 0 && <span className="ml-1 opacity-60">({Math.round((count / total) * 100)}%)</span>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ── Daily trend: stacked bars ── */
function DailyTrend({ daily }: { daily: ToolUsageReport['daily'] }) {
  if (daily.length === 0) return null;
  const maxDay = Math.max(...daily.map((d) => d.native + d.mcp + d.skill), 1);

  return (
    <section className="space-y-3 rounded-xl border border-[#E8DDD2] bg-[#FDF8F3] p-4">
      <h4 className="text-xs font-semibold text-[#5C4A3A]">每日使用趋势</h4>
      <div className="flex items-end gap-1" style={{ height: 120 }}>
        {[...daily].reverse().map((day) => {
          const dayTotal = day.native + day.mcp + day.skill;
          const height = (dayTotal / maxDay) * 100;
          return (
            <div key={day.date} className="group relative flex flex-1 flex-col items-center">
              <div className="flex w-full flex-col" style={{ height: 100 }}>
                <div className="flex-1" />
                <div className="flex w-full flex-col overflow-hidden rounded-t-md" style={{ height: `${height}%` }}>
                  {dayTotal > 0 && (
                    <>
                      {day.skill > 0 && (
                        <div
                          className="w-full"
                          style={{
                            height: `${(day.skill / dayTotal) * 100}%`,
                            backgroundColor: CATEGORY_STYLE.skill.color,
                            minHeight: 2,
                          }}
                        />
                      )}
                      {day.mcp > 0 && (
                        <div
                          className="w-full"
                          style={{
                            height: `${(day.mcp / dayTotal) * 100}%`,
                            backgroundColor: CATEGORY_STYLE.mcp.color,
                            minHeight: 2,
                          }}
                        />
                      )}
                      {day.native > 0 && (
                        <div
                          className="w-full"
                          style={{
                            height: `${(day.native / dayTotal) * 100}%`,
                            backgroundColor: CATEGORY_STYLE.native.color,
                            minHeight: 2,
                          }}
                        />
                      )}
                    </>
                  )}
                </div>
              </div>
              <span className="mt-1 text-[9px] text-[#A08A76]">{day.date.slice(5)}</span>
              {/* Tooltip */}
              <div className="pointer-events-none absolute -top-12 z-10 hidden whitespace-nowrap rounded-lg bg-[#5C4A3A] px-2.5 py-1.5 text-[10px] text-white shadow-md group-hover:block">
                <div className="font-medium">{day.date}</div>
                <div className="opacity-80">{dayTotal} 次调用</div>
              </div>
            </div>
          );
        })}
      </div>
      {/* Legend */}
      <div className="flex justify-center gap-5 text-[10px]">
        {CATEGORIES.map((cat) => {
          const style = CATEGORY_STYLE[cat];
          return (
            <span key={cat} className="flex items-center gap-1.5" style={{ color: style.color }}>
              <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ backgroundColor: style.color }} />
              {style.label}
            </span>
          );
        })}
      </div>
    </section>
  );
}

/* ── Top tools leaderboard ── */
function TopToolsTable({ tools, total }: { tools: ToolUsageReport['topTools']; total: number }) {
  if (tools.length === 0) return null;
  const maxCount = tools[0]?.count ?? 1;

  return (
    <section className="space-y-3 rounded-xl border border-[#E8DDD2] bg-white p-4">
      <h4 className="text-xs font-semibold text-[#5C4A3A]">工具热度排行</h4>
      <div className="space-y-1.5">
        {tools.map((tool, i) => {
          const style = CATEGORY_STYLE[tool.category] ?? { color: '#6b7280', bg: '#f3f4f6', label: tool.category };
          return (
            <div key={`${tool.category}:${tool.name}`} className="flex items-center gap-2 text-xs">
              <span className="w-5 text-right text-[11px] font-medium text-[#A08A76]">{i + 1}</span>
              <span
                className="shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-medium"
                style={{ backgroundColor: style.bg, color: style.color }}
              >
                {style.label}
              </span>
              <span className="min-w-0 flex-1 truncate font-medium text-[#5C4A3A]" title={tool.name}>
                {tool.name}
              </span>
              <div className="flex w-28 items-center">
                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-gray-100">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${(tool.count / maxCount) * 100}%`,
                      backgroundColor: style.color,
                      opacity: 0.7,
                    }}
                  />
                </div>
              </div>
              <span className="w-14 text-right tabular-nums text-[#5C4A3A]">
                {tool.count}
                <span className="ml-0.5 text-[10px] text-[#A08A76]">({Math.round((tool.count / total) * 100)}%)</span>
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}

/* ── Per-cat distribution ── */
function ByCatSection({ byCat }: { byCat: Record<string, Record<string, number>> }) {
  const entries = Object.entries(byCat).sort(
    (a, b) => Object.values(b[1]).reduce((s, v) => s + v, 0) - Object.values(a[1]).reduce((s, v) => s + v, 0),
  );
  if (entries.length === 0) return null;

  return (
    <section className="space-y-3 rounded-xl border border-[#E8DDD2] bg-white p-4">
      <h4 className="text-xs font-semibold text-[#5C4A3A]">猫猫工具使用分布</h4>
      <div className="space-y-2">
        {entries.map(([catId, cats]) => {
          const catTotal = Object.values(cats).reduce((s, v) => s + v, 0);
          return (
            <div key={catId} className="flex items-center gap-3 text-xs">
              <span className="w-28 truncate font-medium text-[#5C4A3A]">{catLabel(catId)}</span>
              <div className="flex h-5 flex-1 overflow-hidden rounded-full bg-[#F5F0EB]">
                {CATEGORIES.map((category) => {
                  const val = cats[category] ?? 0;
                  if (val === 0) return null;
                  return (
                    <div
                      key={category}
                      className="h-full transition-all"
                      style={{
                        width: `${(val / catTotal) * 100}%`,
                        backgroundColor: CATEGORY_STYLE[category].color,
                        opacity: 0.75,
                      }}
                      title={`${CATEGORY_STYLE[category].label}: ${val}`}
                    />
                  );
                })}
              </div>
              <span className="w-10 text-right tabular-nums text-[#A08A76]">{catTotal}</span>
            </div>
          );
        })}
      </div>
    </section>
  );
}
