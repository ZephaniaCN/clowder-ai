/**
 * F152 Phase C C1a: parseFeatureACs unit tests
 */

import assert from 'node:assert/strict';
import { describe, it, before } from 'node:test';

describe('parseFeatureACs (F152 C1a)', () => {
  let parseFeatureACs;

  before(async () => {
    const mod = await import('../../shared/dist/utils/parse-feature-acs.js');
    parseFeatureACs = mod.parseFeatureACs;
  });

  it('parses basic unchecked AC', () => {
    const md = '- [ ] AC-A1: WorkItem 类型定义并通过 TypeScript 编译';
    const result = parseFeatureACs(md);
    assert.equal(result.length, 1);
    assert.equal(result[0].id, 'AC-A1');
    assert.equal(result[0].checked, false);
    assert.equal(result[0].description, 'WorkItem 类型定义并通过 TypeScript 编译');
    assert.equal(result[0].verifyCmd, undefined);
    assert.equal(result[0].evidenceRef, undefined);
  });

  it('parses checked AC', () => {
    const md = '- [x] AC-B2: Thread 关联支持 feature/task/slice 三种类型';
    const result = parseFeatureACs(md);
    assert.equal(result.length, 1);
    assert.equal(result[0].id, 'AC-B2');
    assert.equal(result[0].checked, true);
  });

  it('parses AC with verify extension', () => {
    const md = '- [ ] AC-C1: Feature Doc AC 支持扩展格式 [verify: pnpm --filter @cat-cafe/shared build]';
    const result = parseFeatureACs(md);
    assert.equal(result.length, 1);
    assert.equal(result[0].id, 'AC-C1');
    assert.equal(result[0].verifyCmd, 'pnpm --filter @cat-cafe/shared build');
    assert.equal(result[0].description, 'Feature Doc AC 支持扩展格式');
  });

  it('parses AC with evidence extension', () => {
    const md = '- [x] AC-A3: API 接口可用 [evidence: commit:abc123]';
    const result = parseFeatureACs(md);
    assert.equal(result.length, 1);
    assert.equal(result[0].evidenceRef, 'commit:abc123');
    assert.equal(result[0].description, 'API 接口可用');
  });

  it('parses AC with both verify and evidence', () => {
    const md = '- [x] AC-D1: vision 字段支持 [verify: napm check --target vision] [evidence: pr:142]';
    const result = parseFeatureACs(md);
    assert.equal(result.length, 1);
    assert.equal(result[0].verifyCmd, 'napm check --target vision');
    assert.equal(result[0].evidenceRef, 'pr:142');
    assert.equal(result[0].description, 'vision 字段支持');
  });

  it('parses multiple ACs from a document', () => {
    const md = `## Acceptance Criteria

- [ ] AC-A1: First criterion
- [x] AC-A2: Second criterion [verify: pnpm test]
- [ ] AC-B1: Third criterion [evidence: commit:def456]

Some other text here.
`;
    const result = parseFeatureACs(md);
    assert.equal(result.length, 3);
    assert.equal(result[0].id, 'AC-A1');
    assert.equal(result[1].id, 'AC-A2');
    assert.equal(result[1].verifyCmd, 'pnpm test');
    assert.equal(result[2].id, 'AC-B1');
    assert.equal(result[2].evidenceRef, 'commit:def456');
  });

  it('skips non-AC lines', () => {
    const md = `# Feature Doc

Some description here.

- [ ] This is a regular checkbox, not an AC
- Regular bullet point
- [ ] AC-1: Simple numeric ID works too
`;
    const result = parseFeatureACs(md);
    assert.equal(result.length, 1);
    assert.equal(result[0].id, 'AC-1');
  });

  it('handles empty input', () => {
    assert.deepEqual(parseFeatureACs(''), []);
  });

  it('handles indented AC lines', () => {
    const md = '  - [ ] AC-A1: Indented line';
    const result = parseFeatureACs(md);
    assert.equal(result.length, 1);
    assert.equal(result[0].id, 'AC-A1');
  });
});
