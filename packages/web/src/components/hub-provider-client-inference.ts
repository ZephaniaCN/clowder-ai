import type { BuiltinAccountClient, ProfileItem } from './hub-provider-profiles.types';

const BUILTIN_CLIENT_HINTS: Record<BuiltinAccountClient, string[]> = {
  anthropic: ['claude'],
  openai: ['codex'],
  google: ['gemini'],
  kimi: ['kimi', 'moonshot'],
  dare: ['dare'],
  opencode: ['opencode'],
};

export function inferBuiltinClientFromProfile(profile: ProfileItem): BuiltinAccountClient | undefined {
  if (profile.client) return profile.client;
  if (profile.oauthLikeClient === 'dare' || profile.oauthLikeClient === 'opencode') return profile.oauthLikeClient;

  const normalized = `${profile.id} ${profile.provider ?? ''} ${profile.displayName} ${profile.name}`.toLowerCase();
  const matched = (Object.entries(BUILTIN_CLIENT_HINTS) as Array<[BuiltinAccountClient, string[]]>).find(([, hints]) =>
    hints.some((hint) => normalized.includes(hint)),
  );
  if (matched) return matched[0];

  switch (profile.protocol) {
    case 'anthropic':
      return 'anthropic';
    case 'openai':
      return 'openai';
    case 'google':
      return 'google';
    case 'kimi':
      return 'kimi';
    default:
      return undefined;
  }
}
