// @ts-check
/**
 * F152 Phase C C4a: SelfClaimPolicy per-methodology overrides
 */
import assert from 'node:assert/strict';
import { describe, it, before, beforeEach } from 'node:test';

/** @type {typeof import('../src/config/cat-config-loader.js')} */
let loader;

/** @returns {import('@cat-cafe/shared').CatCafeConfig} */
function makeConfig(missionHub) {
  return /** @type {any} */ ({
    version: 2,
    breeds: [
      {
        id: 'ragdoll',
        catId: 'opus',
        name: '布偶猫',
        displayName: '布偶猫',
        avatar: '/avatars/ragdoll.png',
        color: { primary: '#6366f1', secondary: '#818cf8' },
        mentionPatterns: ['@opus'],
        roleDescription: 'Lead architect',
        defaultVariantId: 'opus-4.6',
        variants: [{ id: 'opus-4.6', provider: 'anthropic', defaultModel: 'opus-4.6', mcpSupport: true, cli: { command: 'claude', outputFormat: 'stream-json' } }],
        features: { missionHub },
      },
    ],
    roster: {},
    reviewPolicy: { requireDifferentFamily: true, preferActiveInThread: true, preferLead: true, excludeUnavailable: true },
  });
}

before(async () => {
  loader = await import('../dist/config/cat-config-loader.js');
});

describe('F152 C4: SelfClaimPolicy per-methodology overrides', () => {
  beforeEach(() => loader._resetCachedConfig());

  it('returns default scope when no methodology override exists', () => {
    const config = makeConfig({ selfClaimScope: 'thread' });
    const scope = loader.getMissionHubSelfClaimScope('opus', undefined, config);
    assert.equal(scope, 'thread');
  });

  it('returns default scope when methodology is provided but no byMethodology configured', () => {
    const config = makeConfig({ selfClaimScope: 'global' });
    const scope = loader.getMissionHubSelfClaimScope('opus', 'napm', config);
    assert.equal(scope, 'global');
  });

  it('returns methodology-specific scope when override exists', () => {
    const config = makeConfig({
      selfClaimScope: 'thread',
      selfClaimByMethodology: {
        napm: { scope: 'once', requireVerified: true },
      },
    });
    const scope = loader.getMissionHubSelfClaimScope('opus', 'napm', config);
    assert.equal(scope, 'once');
  });

  it('falls back to default scope for non-matching methodology', () => {
    const config = makeConfig({
      selfClaimScope: 'global',
      selfClaimByMethodology: {
        napm: { scope: 'once' },
      },
    });
    const scope = loader.getMissionHubSelfClaimScope('opus', 'cat-cafe', config);
    assert.equal(scope, 'global');
  });

  it('returns disabled when no missionHub configured', () => {
    const config = makeConfig(undefined);
    const scope = loader.getMissionHubSelfClaimScope('opus', 'napm', config);
    assert.equal(scope, 'disabled');
  });

  it('returns disabled for unknown catId', () => {
    const config = makeConfig({ selfClaimScope: 'global' });
    const scope = loader.getMissionHubSelfClaimScope('unknown-cat', 'napm', config);
    assert.equal(scope, 'disabled');
  });

  it('backward compat: (catId, config) two-arg form still works', () => {
    const config = makeConfig({ selfClaimScope: 'once' });
    const scope = loader.getMissionHubSelfClaimScope('opus', config);
    assert.equal(scope, 'once');
  });
});

describe('getSelfClaimMethodologyOverride (F152 C4)', () => {
  beforeEach(() => loader._resetCachedConfig());

  it('returns full override with requireVerified', () => {
    const config = makeConfig({
      selfClaimScope: 'thread',
      selfClaimByMethodology: {
        napm: { scope: 'once', requireVerified: true },
      },
    });
    const override = loader.getSelfClaimMethodologyOverride('opus', 'napm', config);
    assert.deepEqual(override, { scope: 'once', requireVerified: true });
  });

  it('returns undefined when no override for methodology', () => {
    const config = makeConfig({
      selfClaimScope: 'thread',
      selfClaimByMethodology: {
        napm: { scope: 'once' },
      },
    });
    const override = loader.getSelfClaimMethodologyOverride('opus', 'cat-cafe', config);
    assert.equal(override, undefined);
  });

  it('returns undefined when no byMethodology configured', () => {
    const config = makeConfig({ selfClaimScope: 'global' });
    const override = loader.getSelfClaimMethodologyOverride('opus', 'napm', config);
    assert.equal(override, undefined);
  });

  it('returns undefined for unknown catId', () => {
    const config = makeConfig({
      selfClaimByMethodology: { napm: { scope: 'once' } },
    });
    const override = loader.getSelfClaimMethodologyOverride('unknown', 'napm', config);
    assert.equal(override, undefined);
  });
});
