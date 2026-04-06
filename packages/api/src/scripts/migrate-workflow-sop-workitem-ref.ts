/**
 * F152 Phase B: WorkflowSop workItemRef migration dry-run CLI
 *
 * Usage:
 *   pnpm --filter @cat-cafe/api build
 *   node dist/scripts/migrate-workflow-sop-workitem-ref.js --dry-run --json
 */

import { createRedisClient } from '@cat-cafe/shared/utils';
import { fileURLToPath } from 'node:url';
import { WorkflowSopMigrationReporter } from '../domains/cats/services/stores/redis/workflow-sop-migration-report.js';
import { createModuleLogger } from '../infrastructure/logger.js';

const log = createModuleLogger('workflow-sop-migration-dry-run');

interface CliArgs {
  readonly dryRun: boolean;
  readonly json: boolean;
  readonly sampleLimit: number;
  readonly redisUrl?: string | undefined;
}

function parseArgs(argv: string[]): CliArgs {
  let json = false;
  let sampleLimit = 20;
  let redisUrl: string | undefined;

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (!arg) continue;
    if (arg === '--json') {
      json = true;
      continue;
    }
    if (arg === '--sample-limit') {
      const next = argv[index + 1];
      if (!next) throw new Error('--sample-limit requires a value');
      const parsed = Number.parseInt(next, 10);
      if (!Number.isFinite(parsed) || parsed <= 0) throw new Error(`Invalid --sample-limit: ${next}`);
      sampleLimit = parsed;
      index += 1;
      continue;
    }
    if (arg === '--redis-url') {
      const next = argv[index + 1];
      if (!next) throw new Error('--redis-url requires a value');
      redisUrl = next;
      index += 1;
      continue;
    }
    if (arg === '--apply') {
      throw new Error('Apply mode is intentionally not implemented in this phase. Use --dry-run only.');
    }
    if (arg !== '--dry-run') {
      throw new Error(`Unknown argument: ${arg}`);
    }
  }

  return { dryRun: true, json, sampleLimit, ...(redisUrl ? { redisUrl } : {}) };
}

function printTextReport(report: Awaited<ReturnType<WorkflowSopMigrationReporter['generateReport']>>): void {
  console.log('WorkflowSop workItemRef migration dry-run');
  console.log(`total: ${report.totalRecords}`);
  console.log(`existing: ${report.existingWorkItemRefCount}`);
  console.log(`pending: ${report.pendingDeriveCount}`);
  console.log(`anomalies: ${report.anomalyCount}`);
  console.log('');
  console.log('byMethodology:');
  for (const [methodology, counts] of Object.entries(report.byMethodology)) {
    console.log(`- ${methodology}: existing=${counts.existing} pending=${counts.pending} anomalies=${counts.anomalies}`);
  }
  console.log('');
  console.log('samples:');
  for (const sample of report.samples) {
    const ref = sample.workItemRef
      ? `${sample.workItemRef.methodology}/${sample.workItemRef.projectId}/${sample.workItemRef.kind}/${sample.workItemRef.id}`
      : '-';
    console.log(`- [${sample.status}] ${sample.key} ref=${ref}${sample.reason ? ` reason=${sample.reason}` : ''}`);
  }
  if (report.anomalies.length > 0) {
    console.log('');
    console.log('anomalies:');
    for (const sample of report.anomalies) {
      console.log(`- [${sample.status}] ${sample.key}${sample.reason ? ` reason=${sample.reason}` : ''}`);
    }
  }
}

export async function runWorkflowSopMigrationDryRunCli(argv: string[] = process.argv.slice(2)): Promise<void> {
  const args = parseArgs(argv);
  const redisUrl = args.redisUrl ?? process.env.REDIS_URL;
  if (!redisUrl) throw new Error('REDIS_URL is required (env or --redis-url)');

  const redis = createRedisClient({ url: redisUrl });
  try {
    try {
      await redis.ping();
    } catch (error) {
      throw new Error(`Unable to connect to Redis at ${redisUrl}: ${error instanceof Error ? error.message : String(error)}`);
    }
    const reporter = new WorkflowSopMigrationReporter(redis);
    const report = await reporter.generateReport({ sampleLimit: args.sampleLimit });

    if (args.json) {
      console.log(JSON.stringify({ dryRun: args.dryRun, report }, null, 2));
      return;
    }

    log.info(
      {
        total: report.totalRecords,
        existing: report.existingWorkItemRefCount,
        pending: report.pendingDeriveCount,
        anomalies: report.anomalyCount,
      },
      'WorkflowSop migration dry-run completed',
    );
    printTextReport(report);
  } finally {
    redis.disconnect();
  }
}

const entryPath = process.argv[1];
if (entryPath && entryPath === fileURLToPath(import.meta.url)) {
  runWorkflowSopMigrationDryRunCli().catch((error) => {
    log.error({ error }, 'WorkflowSop migration dry-run failed');
    process.exitCode = 1;
  });
}
