import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import type { CatConfig } from '@cat-cafe/shared';
import { builtinAccountIdForClient, resolveBuiltinClientForProvider } from './account-resolver.js';
import { readCatCatalog } from './cat-catalog-store.js';
import { loadCatConfig, toAllCatConfigs } from './cat-config-loader.js';
import { resolveProjectTemplatePath } from './project-template-path.js';

type LegacyAwareCatConfig = CatConfig & { providerProfileId?: string };

function trimBinding(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

export function isSeedCat(projectRoot: string, catId: string): boolean {
  try {
    const seedCats = toAllCatConfigs(loadCatConfig(resolveProjectTemplatePath(projectRoot)));
    return Object.hasOwn(seedCats, catId);
  } catch {
    return false;
  }
}

function resolveRuntimeCatConfig(projectRoot: string, catId: string): LegacyAwareCatConfig | undefined {
  try {
    const catalog = readCatCatalog(projectRoot);
    if (!catalog) return undefined;
    return toAllCatConfigs(catalog)[catId] as LegacyAwareCatConfig | undefined;
  } catch {
    return undefined;
  }
}

export function resolveBoundAccountRefForCat(
  projectRoot: string,
  catId: string,
  catConfig: LegacyAwareCatConfig | null | undefined,
): string | undefined {
  const runtimeCatalogExists = existsSync(resolve(projectRoot, '.cat-cafe', 'cat-catalog.json'));
  const runtimeCatConfig = runtimeCatalogExists ? resolveRuntimeCatConfig(projectRoot, catId) : undefined;
  const effectiveCatConfig = runtimeCatConfig ?? catConfig ?? undefined;
  if (!effectiveCatConfig) return undefined;

  const explicitProviderProfileId = trimBinding(effectiveCatConfig.providerProfileId);
  if (explicitProviderProfileId) return explicitProviderProfileId;

  const explicitAccountRef = trimBinding(effectiveCatConfig.accountRef);
  if (!explicitAccountRef) return undefined;

  const builtinClient = resolveBuiltinClientForProvider(effectiveCatConfig.provider);
  const inheritedTemplateDefaultBinding =
    !runtimeCatalogExists && !!builtinClient && explicitAccountRef === builtinAccountIdForClient(builtinClient);
  if (inheritedTemplateDefaultBinding) {
    return undefined;
  }

  if (runtimeCatalogExists) {
    if (!runtimeCatConfig && builtinClient && explicitAccountRef === builtinAccountIdForClient(builtinClient)) {
      return undefined;
    }
    if (runtimeCatConfig && isSeedCat(projectRoot, catId)) {
      return undefined;
    }
  }

  return explicitAccountRef;
}
