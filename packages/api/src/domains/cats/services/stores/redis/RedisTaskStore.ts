/**
 * Redis Task Store (毛线球)
 * Redis-backed task storage with same interface as in-memory TaskStore.
 *
 * #320: Unified model — PR tracking merged into Task system.
 *
 * Redis 数据结构:
 *   cat-cafe:task:{taskId}              → Hash (任务详情)
 *   cat-cafe:tasks:thread:{threadId}    → Sorted Set (每线程任务列表, score=createdAt)
 *   cat-cafe:tasks:kind:{kind}          → Sorted Set (按类型索引, score=createdAt)
 *   cat-cafe:tasks:subject:{subjectKey} → String (subject→taskId 唯一映射)
 *
 * TTL: 30 days default. pr_tracking tasks with status!=done have no TTL.
 */

import type { AutomationState, CatId, CreateTaskInput, TaskItem, TaskKind, UpdateTaskInput } from '@cat-cafe/shared';
import type { RedisClient } from '@cat-cafe/shared/utils';
import { generateSortableId } from '../ports/MessageStore.js';
import type { ITaskStore } from '../ports/TaskStore.js';
import { TaskKeys } from '../redis-keys/task-keys.js';

const DEFAULT_TTL = 30 * 24 * 60 * 60; // 30 days

export class RedisTaskStore implements ITaskStore {
  private readonly redis: RedisClient;
  private readonly ttlSeconds: number | null;

  constructor(redis: RedisClient, options?: { ttlSeconds?: number }) {
    this.redis = redis;
    const ttl = options?.ttlSeconds;
    if (ttl === undefined) {
      this.ttlSeconds = DEFAULT_TTL;
    } else if (!Number.isFinite(ttl)) {
      this.ttlSeconds = DEFAULT_TTL;
    } else if (ttl <= 0) {
      this.ttlSeconds = null;
    } else {
      this.ttlSeconds = Math.floor(ttl);
    }
  }

  async create(input: CreateTaskInput): Promise<TaskItem> {
    const now = Date.now();
    const task: TaskItem = {
      id: generateSortableId(now),
      kind: input.kind ?? 'work',
      threadId: input.threadId,
      subjectKey: input.subjectKey ?? null,
      title: input.title,
      ownerCatId: input.ownerCatId ?? null,
      status: 'todo',
      why: input.why,
      createdBy: input.createdBy,
      createdAt: now,
      updatedAt: now,
      automationState: input.automationState,
      userId: input.userId,
    };

    await this.writeTask(task);
    return task;
  }

  async get(taskId: string): Promise<TaskItem | null> {
    const data = await this.redis.hgetall(TaskKeys.detail(taskId));
    if (!data || !data.id) return null;
    return this.hydrateTask(data);
  }

  async getBySubject(subjectKey: string): Promise<TaskItem | null> {
    const taskId = await this.redis.get(TaskKeys.subject(subjectKey));
    if (!taskId) return null;
    return this.get(taskId);
  }

  async upsertBySubject(input: CreateTaskInput): Promise<TaskItem> {
    const sk = input.subjectKey;
    if (!sk) return this.create(input);

    // P1-1 fix: atomic claim via SETNX on subject index key.
    // SETNX returns 1 if set (we own the slot), 0 if already occupied (update path).
    const now = Date.now();
    const newId = generateSortableId(now);
    const claimed = await this.redis.setnx(TaskKeys.subject(sk), newId);

    if (claimed) {
      // Won the race — create task with the pre-claimed ID
      const task: TaskItem = {
        id: newId,
        kind: input.kind ?? 'work',
        threadId: input.threadId,
        subjectKey: sk,
        title: input.title,
        ownerCatId: input.ownerCatId ?? null,
        status: 'todo',
        why: input.why,
        createdBy: input.createdBy,
        createdAt: now,
        updatedAt: now,
        automationState: input.automationState,
        userId: input.userId,
      };
      await this.writeTask(task);
      return task;
    }

    // Subject already claimed — read and update existing
    const existingId = await this.redis.get(TaskKeys.subject(sk));
    if (!existingId) return this.create(input); // deleted between SETNX and GET

    const existing = await this.get(existingId);
    if (!existing) {
      // Orphaned subject key — overwrite and create fresh
      await this.redis.set(TaskKeys.subject(sk), newId);
      const task: TaskItem = {
        id: newId,
        kind: input.kind ?? 'work',
        threadId: input.threadId,
        subjectKey: sk,
        title: input.title,
        ownerCatId: input.ownerCatId ?? null,
        status: 'todo',
        why: input.why,
        createdBy: input.createdBy,
        createdAt: now,
        updatedAt: now,
        automationState: input.automationState,
        userId: input.userId,
      };
      await this.writeTask(task);
      return task;
    }

    const updated: TaskItem = {
      ...existing,
      threadId: input.threadId,
      title: input.title,
      ownerCatId: input.ownerCatId ?? existing.ownerCatId,
      why: input.why,
      userId: input.userId ?? existing.userId,
      automationState: input.automationState ?? existing.automationState,
      updatedAt: now,
    };

    if (existing.threadId !== input.threadId) {
      await this.redis.zrem(TaskKeys.thread(existing.threadId), existing.id);
    }

    await this.writeTask(updated);
    return updated;
  }

  async listByKind(kind: TaskKind): Promise<TaskItem[]> {
    const ids = await this.redis.zrange(TaskKeys.kind(kind), 0, -1);
    if (ids.length === 0) return [];
    return this.fetchTasksByIds(ids);
  }

  async patchAutomationState(taskId: string, patch: Partial<AutomationState>): Promise<TaskItem | null> {
    const existing = await this.get(taskId);
    if (!existing) return null;

    const merged: AutomationState = {
      ...existing.automationState,
      ...patch,
      ci: patch.ci ? { ...existing.automationState?.ci, ...patch.ci } : existing.automationState?.ci,
      conflict: patch.conflict
        ? { ...existing.automationState?.conflict, ...patch.conflict }
        : existing.automationState?.conflict,
      review: patch.review
        ? { ...existing.automationState?.review, ...patch.review }
        : existing.automationState?.review,
    };

    const updated: TaskItem = {
      ...existing,
      automationState: merged,
      updatedAt: Date.now(),
    };

    await this.redis.hset(TaskKeys.detail(taskId), this.serializeTask(updated));
    return updated;
  }

  async update(taskId: string, input: UpdateTaskInput): Promise<TaskItem | null> {
    const existing = await this.get(taskId);
    if (!existing) return null;

    const updated: TaskItem = {
      ...existing,
      ...(input.title !== undefined ? { title: input.title } : {}),
      ...(input.ownerCatId !== undefined ? { ownerCatId: input.ownerCatId } : {}),
      ...(input.status !== undefined ? { status: input.status } : {}),
      ...(input.why !== undefined ? { why: input.why } : {}),
      ...(input.automationState !== undefined ? { automationState: input.automationState } : {}),
      updatedAt: Date.now(),
    };

    await this.redis.hset(TaskKeys.detail(taskId), this.serializeTask(updated));
    // Update TTL based on new status
    await this.applyTtl(updated);
    return updated;
  }

  async listByThread(threadId: string): Promise<TaskItem[]> {
    const ids = await this.redis.zrange(TaskKeys.thread(threadId), 0, -1);
    if (ids.length === 0) return [];
    return this.fetchTasksByIds(ids);
  }

  async delete(taskId: string): Promise<boolean> {
    const data = await this.redis.hgetall(TaskKeys.detail(taskId));
    if (!data || !data.id) return false;

    const task = this.hydrateTask(data);
    const pipeline = this.redis.multi();
    pipeline.del(TaskKeys.detail(taskId));
    if (task.threadId) pipeline.zrem(TaskKeys.thread(task.threadId), taskId);
    if (task.kind) pipeline.zrem(TaskKeys.kind(task.kind), taskId);
    if (task.subjectKey) pipeline.del(TaskKeys.subject(task.subjectKey));
    await pipeline.exec();
    return true;
  }

  async deleteByThread(threadId: string): Promise<number> {
    const key = TaskKeys.thread(threadId);
    const ids = await this.redis.zrange(key, 0, -1);
    if (ids.length === 0) return 0;

    // Fetch all tasks to clean up kind/subject indexes
    const tasks = await this.fetchTasksByIds(ids);
    const pipeline = this.redis.multi();
    for (const task of tasks) {
      pipeline.del(TaskKeys.detail(task.id));
      if (task.kind) pipeline.zrem(TaskKeys.kind(task.kind), task.id);
      if (task.subjectKey) pipeline.del(TaskKeys.subject(task.subjectKey));
    }
    pipeline.del(key);
    await pipeline.exec();

    return ids.length;
  }

  // --- private helpers ---

  private async writeTask(task: TaskItem): Promise<void> {
    const key = TaskKeys.detail(task.id);
    const pipeline = this.redis.multi();
    pipeline.hset(key, this.serializeTask(task));
    pipeline.zadd(TaskKeys.thread(task.threadId), String(task.createdAt), task.id);
    pipeline.zadd(TaskKeys.kind(task.kind), String(task.createdAt), task.id);
    if (task.subjectKey) {
      pipeline.set(TaskKeys.subject(task.subjectKey), task.id);
    }
    await pipeline.exec();
    await this.applyTtl(task);
  }

  /** pr_tracking tasks with status!=done never expire; others get default TTL. */
  private async applyTtl(task: TaskItem): Promise<void> {
    if (this.ttlSeconds === null) return;
    const key = TaskKeys.detail(task.id);

    if (task.kind === 'pr_tracking' && task.status !== 'done') {
      // Active PR tracking tasks don't expire
      await this.redis.persist(key);
    } else {
      await this.redis.expire(key, this.ttlSeconds);
      await this.redis.expire(TaskKeys.thread(task.threadId), this.ttlSeconds);
    }
  }

  private async fetchTasksByIds(ids: string[]): Promise<TaskItem[]> {
    const pipeline = this.redis.multi();
    for (const id of ids) {
      pipeline.hgetall(TaskKeys.detail(id));
    }
    const results = await pipeline.exec();
    if (!results) return [];

    const tasks: TaskItem[] = [];
    for (const [err, data] of results) {
      if (err || !data || typeof data !== 'object') continue;
      const d = data as Record<string, string>;
      if (!d.id) continue;
      tasks.push(this.hydrateTask(d));
    }
    return tasks;
  }

  private serializeTask(task: TaskItem): Record<string, string> {
    const out: Record<string, string> = {
      id: task.id,
      kind: task.kind ?? 'work',
      threadId: task.threadId,
      subjectKey: task.subjectKey ?? '',
      title: task.title,
      ownerCatId: task.ownerCatId ?? '',
      status: task.status,
      why: task.why,
      createdBy: task.createdBy,
      createdAt: String(task.createdAt),
      updatedAt: String(task.updatedAt),
      userId: task.userId ?? '',
    };
    if (task.automationState) {
      out.automationState = JSON.stringify(task.automationState);
    }
    return out;
  }

  private hydrateTask(data: Record<string, string>): TaskItem {
    const base: TaskItem = {
      id: data.id ?? '',
      kind: (data.kind ?? 'work') as TaskKind,
      threadId: data.threadId ?? '',
      subjectKey: data.subjectKey || null,
      title: data.title ?? '',
      ownerCatId: (data.ownerCatId || null) as CatId | null,
      status: (data.status ?? 'todo') as TaskItem['status'],
      why: data.why ?? '',
      createdBy: (data.createdBy ?? 'user') as TaskItem['createdBy'],
      createdAt: parseInt(data.createdAt ?? '0', 10),
      updatedAt: parseInt(data.updatedAt ?? '0', 10),
      userId: data.userId || undefined,
    };
    if (data.automationState) {
      try {
        return { ...base, automationState: JSON.parse(data.automationState) };
      } catch {
        return base;
      }
    }
    return base;
  }
}
