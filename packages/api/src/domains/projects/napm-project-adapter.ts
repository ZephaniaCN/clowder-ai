import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import type {
  NapmEvidenceEntry,
  NapmEvidenceStatus,
  NapmProjectOverview,
  NapmProjectState,
  WorkItem,
  WorkItemExecutionStage,
  WorkItemLifecycleStatus,
} from '@cat-cafe/shared';
import { parse as parseYaml } from 'yaml';

interface ParsedTask {
  readonly id: string;
  readonly title: string;
  readonly statusRaw: string;
  readonly owner?: string;
  readonly priority?: 'P0' | 'P1' | 'P2' | 'P3';
  readonly scope?: string;
  readonly intent?: string;
  readonly dod?: string;
  readonly verifyCmd?: string;
  readonly risk?: 'high' | 'medium' | 'low';
  readonly decisionStatus?: string;
  readonly contextRefs: readonly string[];
  readonly sourcePath: 'pm/next.md' | 'pm/backlog.md';
  readonly line: number;
}

const TASK_LINE_RE = /^\s*-\s*\[([ xX])\]\s+(.*)$/;
const META_RE = /\[([a-zA-Z_]+):([^\]]*)\]/g;
const SECTION_RE = /^\s*##\s+(.+)\s*$/;
const DETAIL_RE = /^\s*-\s*([a-zA-Z_]+):\s*(.*)$/;
const DATE_HEADING_RE = /^###\s+(\d{4}-\d{2}-\d{2})/;
const MAX_PROGRESS_FILES = 80;

function normalizeStatus(raw: string): string {
  return raw.trim().toLowerCase().replace(/\s+/g, '-');
}

function asPriority(value: string | undefined): 'P0' | 'P1' | 'P2' | 'P3' | undefined {
  if (!value) return undefined;
  const upper = value.trim().toUpperCase();
  return upper === 'P0' || upper === 'P1' || upper === 'P2' || upper === 'P3' ? upper : undefined;
}

function asRisk(value: string | undefined): 'high' | 'medium' | 'low' | undefined {
  if (!value) return undefined;
  const lower = value.trim().toLowerCase();
  return lower === 'high' || lower === 'medium' || lower === 'low' ? lower : undefined;
}

function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64);
}

function mapLifecycleStatus(rawStatus: string): WorkItemLifecycleStatus {
  const normalized = normalizeStatus(rawStatus);
  if (normalized === 'done' || normalized === 'completed' || normalized === 'complete') return 'done';
  if (normalized === 'review' || normalized === 'in-review') return 'review';
  if (normalized === 'obsolete' || normalized === 'archived' || normalized === 'cancelled') return 'obsolete';
  if (
    normalized === 'doing' ||
    normalized === 'in-progress' ||
    normalized === 'in_progress' ||
    normalized === 'blocked'
  ) {
    return 'in-progress';
  }
  if (normalized === 'todo' || normalized === 'pending' || normalized === 'open') return 'idea';
  if (normalized === 'spec') return 'spec';
  return 'spec';
}

function mapItemExecutionStage(task: ParsedTask, lifecycle: WorkItemLifecycleStatus): WorkItemExecutionStage {
  const status = normalizeStatus(task.statusRaw);
  if (lifecycle === 'done') return 'document';
  if (status.includes('verify')) return 'verify';
  if (status.includes('plan') || lifecycle === 'idea' || lifecycle === 'spec') return 'plan';
  if (lifecycle === 'in-progress') {
    if (task.contextRefs.length > 0 && task.verifyCmd) return 'verify';
    return 'execute';
  }
  return 'idle';
}

function parseStage(raw: string | undefined): WorkItemExecutionStage | undefined {
  if (!raw) return undefined;
  const normalized = normalizeStatus(raw);
  if (normalized.includes('plan')) return 'plan';
  if (normalized.includes('verify') || normalized.includes('check')) return 'verify';
  if (normalized.includes('document') || normalized.includes('doc')) return 'document';
  if (normalized.includes('execute') || normalized.includes('doing') || normalized.includes('in-progress'))
    return 'execute';
  if (normalized.includes('idle') || normalized.includes('paused')) return 'idle';
  return undefined;
}

function getString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : undefined;
}

function detectEvidenceStatus(lines: readonly string[]): NapmEvidenceStatus {
  const joined = lines.join('\n');
  if (/❌|\bFAIL\b|\bERROR\b/i.test(joined)) return 'fail';
  if (/✅|\bPASS\b|\bSUCCESS\b/i.test(joined)) return 'pass';
  return 'info';
}

function collectRefs(input: string): string[] {
  const refs = new Set<string>();
  for (const match of input.matchAll(/`([^`]+)`/g)) {
    const ref = match[1]?.trim();
    if (ref) refs.add(ref);
  }
  return [...refs];
}

function parseTasks(markdown: string, sourcePath: 'pm/next.md' | 'pm/backlog.md'): ParsedTask[] {
  const lines = markdown.split(/\r?\n/);
  const tasks: ParsedTask[] = [];
  let section = '';

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i] ?? '';
    const sectionMatch = line.match(SECTION_RE);
    if (sectionMatch?.[1]) {
      section = sectionMatch[1].trim();
      continue;
    }

    const taskMatch = line.match(TASK_LINE_RE);
    if (!taskMatch) continue;

    const metadata: Record<string, string> = {};
    for (const metaMatch of line.matchAll(META_RE)) {
      const key = metaMatch[1]?.trim().toLowerCase();
      const value = metaMatch[2]?.trim() ?? '';
      if (key) metadata[key] = value;
    }

    const cleanedTitle = taskMatch[2].replace(META_RE, '').trim();
    const taskId = metadata.id ?? metadata['task-id'] ?? slugify(cleanedTitle || `task-${i + 1}`);

    const detailMap: Record<string, string> = {};
    const detailRefs = new Set<string>();
    let j = i + 1;
    while (j < lines.length) {
      const next = lines[j] ?? '';
      if (SECTION_RE.test(next) || TASK_LINE_RE.test(next)) break;
      if (/^\s{2,}-/.test(next)) {
        const trimmed = next.trim();
        const detailMatch = trimmed.match(DETAIL_RE);
        if (detailMatch?.[1]) {
          detailMap[detailMatch[1].trim().toLowerCase()] = detailMatch[2].trim();
        }
        for (const ref of collectRefs(trimmed)) detailRefs.add(ref);
      }
      j += 1;
    }
    i = j - 1;

    const contextRefs = new Set<string>();
    const contextRaw = metadata.context_ref;
    if (contextRaw) {
      for (const ref of contextRaw
        .split(',')
        .map((value) => value.trim())
        .filter(Boolean)) {
        contextRefs.add(ref);
      }
    }
    for (const ref of detailRefs) contextRefs.add(ref);

    const statusRaw = metadata.status || (taskMatch[1].toLowerCase() === 'x' ? 'done' : 'todo');
    const inferredIntent = detailMap.intent || (section ? `${section}: ${cleanedTitle}` : undefined);
    const inferredDod = detailMap.dod;
    const inferredVerify = detailMap.verify;

    tasks.push({
      id: taskId,
      title: cleanedTitle || taskId,
      statusRaw,
      owner: metadata.owner,
      priority: asPriority(metadata.priority),
      scope: metadata.scope,
      intent: inferredIntent,
      dod: inferredDod,
      verifyCmd: metadata.verify || inferredVerify,
      risk: asRisk(metadata.risk),
      decisionStatus: metadata.decision_status,
      contextRefs: [...contextRefs],
      sourcePath,
      line: i + 1,
    });
  }

  return tasks;
}

function toWorkItem(projectId: string, task: ParsedTask): WorkItem {
  const lifecycleStatus = mapLifecycleStatus(task.statusRaw);
  return {
    ref: {
      methodology: 'napm',
      projectId,
      kind: 'task',
      id: task.id,
    },
    title: task.title,
    source: {
      type: task.sourcePath === 'pm/next.md' ? 'pm-next' : 'pm-backlog',
      path: task.sourcePath,
      line: task.line,
    },
    ...(task.intent ? { intent: task.intent } : {}),
    ...(task.dod ? { dod: task.dod } : {}),
    ...(task.verifyCmd ? { verifyCmd: task.verifyCmd } : {}),
    ...(task.scope ? { scope: task.scope } : {}),
    ...(task.owner ? { owner: task.owner } : {}),
    ...(task.priority ? { priority: task.priority } : {}),
    ...(task.risk ? { risk: task.risk } : {}),
    ...(task.decisionStatus
      ? {
          gates: {
            design:
              task.decisionStatus === 'approved' ? 'passed' : task.decisionStatus === 'denied' ? 'failed' : 'pending',
          },
        }
      : {}),
    lifecycleStatus,
    executionStage: mapItemExecutionStage(task, lifecycleStatus),
    evidenceRefs: task.contextRefs.map((ref) => ({ type: 'progress', ref })),
  };
}

function dedupeWorkItems(items: readonly WorkItem[]): WorkItem[] {
  const map = new Map<string, WorkItem>();
  for (const item of items) {
    const key = `${item.ref.projectId}:${item.ref.id}`;
    const existing = map.get(key);
    if (!existing || item.source.type === 'pm-next') {
      map.set(key, item);
    }
  }
  return [...map.values()];
}

function deriveCurrentStage(
  items: readonly WorkItem[],
  state: NapmProjectState,
  evidenceCount: number,
): WorkItemExecutionStage {
  const explicit = parseStage(state.phase) ?? parseStage(state.status);
  if (explicit) return explicit;

  const doing = items.filter((item) => item.lifecycleStatus === 'in-progress');
  if (doing.length > 0) {
    if (doing.some((item) => item.executionStage === 'verify')) return 'verify';
    return 'execute';
  }
  if (items.some((item) => item.lifecycleStatus === 'idea' || item.lifecycleStatus === 'spec')) return 'plan';
  if (items.some((item) => item.lifecycleStatus === 'done') || evidenceCount > 0) return 'document';
  return 'idle';
}

export class NapmProjectAdapter {
  constructor(
    private readonly projectPath: string,
    private readonly projectId: string,
  ) {}

  private async readOptional(path: string): Promise<string | null> {
    try {
      return await readFile(path, 'utf-8');
    } catch {
      return null;
    }
  }

  async readNextMd(): Promise<WorkItem[]> {
    const content = await this.readOptional(join(this.projectPath, 'pm/next.md'));
    if (!content) return [];
    return parseTasks(content, 'pm/next.md').map((task) => toWorkItem(this.projectId, task));
  }

  async readBacklogMd(): Promise<WorkItem[]> {
    const content = await this.readOptional(join(this.projectPath, 'pm/backlog.md'));
    if (!content) return [];
    return parseTasks(content, 'pm/backlog.md').map((task) => toWorkItem(this.projectId, task));
  }

  async readStateYaml(): Promise<NapmProjectState> {
    const content = await this.readOptional(join(this.projectPath, 'pm/state.yaml'));
    if (!content) return { status: 'unknown' };

    try {
      const parsed = parseYaml(content) as Record<string, unknown>;
      const project = (parsed.project ?? {}) as Record<string, unknown>;
      return {
        status: getString(parsed.state) ?? getString(project.status) ?? 'unknown',
        phase:
          getString(parsed.phase) ??
          getString(project.phase) ??
          getString((parsed.gate as Record<string, unknown> | undefined)?.next),
        updatedAt: getString(parsed.updatedAt) ?? getString(project.updatedAt),
      };
    } catch {
      return { status: 'unknown' };
    }
  }

  async readEvidence(): Promise<NapmEvidenceEntry[]> {
    const evidencePathRoot = join(this.projectPath, 'EVIDENCE.md');
    const evidencePathLegacy = join(this.projectPath, 'pm/EVIDENCE.md');
    const evidenceContent =
      (await this.readOptional(evidencePathRoot)) ?? (await this.readOptional(evidencePathLegacy));
    const entries: NapmEvidenceEntry[] = [];

    if (evidenceContent) {
      const lines = evidenceContent.split(/\r?\n/);
      let current: { date?: string; title: string; lines: string[] } | null = null;
      const flush = () => {
        if (!current) return;
        entries.push({
          id: `evidence-${entries.length + 1}`,
          title: current.title,
          summary: current.lines.find((line) => line.trim().startsWith('-'))?.replace(/^\s*-\s*/, '') ?? current.title,
          ...(current.date ? { date: current.date } : {}),
          status: detectEvidenceStatus(current.lines),
          sourcePath: 'EVIDENCE.md',
          refs: collectRefs(current.lines.join('\n')),
        });
      };

      for (const line of lines) {
        const dateMatch = line.match(DATE_HEADING_RE);
        if (dateMatch?.[1]) {
          flush();
          current = { date: dateMatch[1], title: dateMatch[1], lines: [] };
          continue;
        }
        if (!current && line.trim().startsWith('## ')) {
          current = { title: line.trim().replace(/^##\s+/, ''), lines: [] };
          continue;
        }
        if (current) current.lines.push(line);
      }
      flush();
    }

    const progressDir = join(this.projectPath, 'pm/progress');
    let files: string[] = [];
    try {
      files = (await readdir(progressDir))
        .filter((file) => file.endsWith('.md'))
        .sort()
        .reverse();
    } catch {
      files = [];
    }

    for (const file of files.slice(0, MAX_PROGRESS_FILES)) {
      const content = await this.readOptional(join(progressDir, file));
      if (!content) continue;
      const lines = content.split(/\r?\n/);
      const heading = lines.find((line) => line.startsWith('# '))?.replace(/^#\s+/, '') ?? file;
      const date = file.match(/^(\d{4}-\d{2}-\d{2})/)?.[1];
      entries.push({
        id: `progress-${file}`,
        title: heading,
        summary: lines.find((line) => line.trim().startsWith('-'))?.replace(/^\s*-\s*/, '') ?? heading,
        ...(date ? { date } : {}),
        status: detectEvidenceStatus(lines),
        sourcePath: `pm/progress/${file}`,
        refs: collectRefs(content),
      });
    }

    return entries;
  }

  async toWorkItems(): Promise<WorkItem[]> {
    const [nextItems, backlogItems] = await Promise.all([this.readNextMd(), this.readBacklogMd()]);
    return dedupeWorkItems([...nextItems, ...backlogItems]);
  }

  async getOverview(): Promise<NapmProjectOverview> {
    const [workItems, state, evidence] = await Promise.all([
      this.toWorkItems(),
      this.readStateYaml(),
      this.readEvidence(),
    ]);
    const summaryCounts = {
      total: workItems.length,
      done: workItems.filter((item) => item.lifecycleStatus === 'done').length,
      doing: workItems.filter((item) => item.lifecycleStatus === 'in-progress').length,
      todo: workItems.filter((item) => item.lifecycleStatus === 'idea' || item.lifecycleStatus === 'spec').length,
    };

    const currentSlice =
      workItems.find((item) => item.lifecycleStatus === 'in-progress')?.title ??
      workItems.find((item) => item.lifecycleStatus === 'idea' || item.lifecycleStatus === 'spec')?.title;

    return {
      methodology: 'napm',
      projectId: this.projectId,
      projectState: state,
      currentExecutionStage: deriveCurrentStage(workItems, state, evidence.length),
      ...(currentSlice ? { currentSlice } : {}),
      summaryCounts,
    };
  }
}
