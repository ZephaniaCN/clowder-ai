import { inferBuiltinClientFromProfile } from './hub-provider-client-inference';
import type { BuiltinAccountClient, ProfileItem } from './hub-provider-profiles.types';

const FALLBACK_BUILTIN_PROFILE_SPECS: Array<{
  client: BuiltinAccountClient;
  id: string;
  displayName: string;
  models: string[];
}> = [
  { client: 'anthropic', id: 'claude', displayName: 'Claude (OAuth)', models: [] },
  { client: 'openai', id: 'codex', displayName: 'Codex (OAuth)', models: [] },
  { client: 'google', id: 'gemini', displayName: 'Gemini (OAuth)', models: [] },
  { client: 'kimi', id: 'kimi', displayName: 'Kimi (OAuth)', models: [] },
  { client: 'dare', id: 'dare', displayName: 'Dare (client-auth)', models: [] },
  { client: 'opencode', id: 'opencode', displayName: 'OpenCode (client-auth)', models: [] },
];

export function ensureBuiltinProviderProfiles(profiles: ProfileItem[]): ProfileItem[] {
  const normalized = profiles.map((profile) => {
    if (!profile.builtin) return profile;
    const client = inferBuiltinClientFromProfile(profile);
    return client ? { ...profile, client } : profile;
  });

  const seenBuiltinClients = new Set(
    normalized
      .filter((profile) => profile.builtin)
      .map((profile) => inferBuiltinClientFromProfile(profile))
      .filter(Boolean) as BuiltinAccountClient[],
  );

  for (const spec of FALLBACK_BUILTIN_PROFILE_SPECS) {
    if (seenBuiltinClients.has(spec.client)) continue;
    normalized.push({
      id: spec.id,
      provider: spec.id,
      displayName: spec.displayName,
      name: spec.displayName,
      authType: 'oauth',
      kind: 'builtin',
      builtin: true,
      mode: 'subscription',
      client: spec.client,
      models: spec.models,
      hasApiKey: false,
      createdAt: '',
      updatedAt: '',
      ...(spec.client === 'dare' || spec.client === 'opencode' ? { oauthLikeClient: spec.client } : {}),
    });
  }

  return normalized;
}

export function builtinClientLabel(client?: BuiltinAccountClient): string {
  switch (client) {
    case 'anthropic':
      return 'Claude';
    case 'openai':
      return 'Codex';
    case 'google':
      return 'Gemini';
    case 'kimi':
      return 'Kimi';
    case 'dare':
      return 'Dare';
    case 'opencode':
      return 'OpenCode';
    default:
      return 'Builtin';
  }
}

export function accountTone(profile: ProfileItem): 'purple' | 'green' | 'orange' {
  if (profile.builtin) return 'orange';
  if (profile.baseUrl?.toLowerCase().includes('google')) return 'green';
  return 'purple';
}

export function resolveAccountActionId(profile: ProfileItem): string {
  return profile.id;
}
